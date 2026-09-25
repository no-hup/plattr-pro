// Guard tests for the till bill-screen QA findings (moonshot/reviews/2026-09-25-qa-bill-screen.md, QB-n).
// Fix plan: moonshot/reviews/2026-09-25-qa-fix-plan.md. Each open finding is `knownBug` = `test.failing` (TESTING.md
// "A known bug is marked"): green while the bug is there, red the day it is fixed. Then swap it to `test`.
//
// Runs against the compiled app layer (`npm run build` first; lib/ is gitignored). Fake ports, no emulator.
// Money in minor units. Food block exclusive CGST 2.5 % + SGST 2.5 %, no charges unless a test adds them,
// roundTo 100 (whole rupees). The dishes and prices are the QA run's, at Meghana:
//   Chicken 65 28000, Coastal Crab Roast 62000, Butter Naan 6000; the order offer is FLAT ₹100 (10000),
//   ORDER-scoped, so it ships no `targets` (TD-016's clamp needs them).
const { ApprovalError, cancel, issue, preview, settingsFrom } = require('../../../lib/app/billing');

const knownBug = (title, fn) => test.failing(`[known bug] ${title}`, fn);

const RID = 'res_qa';
const FOOD = { label: 'GST', mode: 'exclusive', collect: true, parts: [{ label: 'CGST', rateBps: 250 }, { label: 'SGST', rateBps: 250 }] };
// The guest's sitting is `sit_12`; the cashier's login is `login_till`. Never the same id (TESTING.md).
const line = (lineId, name, list, draftId, extra = {}) => ({
  lineId, cid: 'o1', orderId: 'o1', cartId: 'k1', cartItemId: lineId, tableId: 't12', sessionId: 'sit_12', placedAt: 1, placedBy: 'guest',
  menuItemId: 'mi_' + lineId, name, qty: 1, listPrice: list, sent: true, v: 0, countsTowardTotal: true, draftId, billId: null,
  components: [{ id: lineId + '_item', kind: 'item', name, unitListPrice: list, taxBlockId: 'food', taxCode: '9963' }],
  taxBlocks: { food: FOOD }, offer: null, ...extra,
});
const ORDER_OFFER = { id: 'offer_flat_100', name: '₹100 off above ₹499', amount: 10000 };   // no targets: ORDER scope

function fakePorts({ lines = [], role = 'MANAGER', offer = null, charges = [], tables = {} } = {}) {
  const store = new Map(lines.map(l => [l.lineId, l]));
  const bills = new Map();
  const audits = new Map();
  let ids = 0;
  const staff = { staffId: 'stf_till', role, status: 'active' };
  const settings = settingsFrom({ billing: { charges }, seller: { name: 'Meghana', taxId: 'GSTIN1' } }, { address: 'Road' });
  const ports = {
    lines: store, bills, audits,
    now: () => Date.parse('2026-09-25T15:30:00Z'),
    log: () => {},
    staff: { bySession: async (_r, sid) => { if (sid !== 'login_till') throw new ApprovalError('unauthenticated', 'bad session'); return staff; } },
    config: { billing: async () => settings },
    linesOfDraft: async (_r, d) => [...store.values()].filter(l => l.draftId === d),
    orderOffer: async () => offer,
    getBill: async (_r, id) => bills.get(id) ?? null,
    tables: async (_r, tids) => tids.map(tableId => ({ tableId, charges: tables[tableId] ?? null })),
    // ST's door, faked the way app/billing.test.ts fakes it: role, reason, PIN 1234, then the audit row.
    approve: async req => {
      if (!['MANAGER', 'ADMIN'].includes(staff.role)) throw new ApprovalError('permission-denied', 'Not allowed for your role');
      if (!req.reason) throw new ApprovalError('invalid-argument', 'reason required');
      if (req.pin === undefined) throw new ApprovalError('permission-denied', 'PIN required', { requires: 'pin' });
      if (req.pin !== '1234') throw new ApprovalError('permission-denied', 'Wrong PIN', { requires: 'pin' });
      const id = `${req.cid}_${req.action}`;
      audits.set(id, { action: req.action, sev: 'P0', amount: req.amountMinor, reason: req.reason, note: req.note });
      return { auditId: id };
    },
    transact: async (_r, fn) => {
      const pl = new Map(), pb = new Map(), pu = new Map(), pa = new Map();
      const t = {
        getLines: async lids => lids.map(i => store.get(i)).filter(Boolean),
        setLine: (id, patch) => { pl.set(id, patch); },
        getBill: async id => bills.get(id) ?? null,
        setBill: (id, b) => { pb.set(id, b); },
        updateBill: (id, patch) => { pu.set(id, patch); },
        getCounter: async () => ({ next: 417 + ids }),
        setCounter: () => {},
        createAudit: (id, row) => { pa.set(id, row); },
        newBillId: () => `bill_${++ids}`,
        enqueuePrint: () => {},
        tableLabel: async tids => tids.join('+'),
      };
      const out = await fn(t);
      for (const [k, v] of pl) store.set(k, { ...store.get(k), ...v });
      for (const [k, v] of pb) bills.set(k, v);
      for (const [k, v] of pu) bills.set(k, { ...bills.get(k), ...v });
      for (const [k, v] of pa) audits.set(k, v);
      return out;
    },
  };
  return ports;
}

const req = draftId => ({ restaurantId: RID, sessionId: 'login_till', draftId });
const versions = (p, draftId) => Object.fromEntries([...p.lines.values()].filter(l => l.draftId === draftId && !l.billId).map(l => [l.lineId, l.v]));
const issueDraft = (p, draftId, extra = {}) => issue(p, { ...req(draftId), cid: `cid_${draftId}`, expectedV: versions(p, draftId), ...extra });

describe('QA bill screen findings (2026-09-25)', () => {
  // The fake is right before anything is claimed against it: the unsplit offer table the QA run
  // saw at ₹882 with a service charge reads here, with no charge, 90000 − 10000 = 80000 + 5 % tax 4000 = 84000.
  test('baseline: chicken 65 + crab roast with the ₹100 order offer previews at 84000', async () => {
    const p = fakePorts({ offer: ORDER_OFFER, lines: [line('chicken', 'Chicken 65', 28000, 'sit_12'), line('crab', 'Coastal Crab Roast', 62000, 'sit_12')] });
    expect((await preview(p, req('sit_12'))).payable).toBe(84000);
  });

  // QB-1 · P0. Split the crab onto its own draft. Today each half takes the whole ₹100:
  //   A 28000 − 10000 = 18000 + 900 = 18900;  B 62000 − 10000 = 52000 + 2600 = 54600;  sum 73500, ₹105 short.
  // Under any reading of the spec (drop it: 29400 + 65100 = 94500; apportion it: 84000) the halves are never
  // less than the unsplit 84000. BL-S12 "any bill discount is recomputed per draft"; D 2026-09-15.
  knownBug('QB-1 BL-S12: a split never gives the order offer twice — the halves add up to at least the unsplit 84000', async () => {
    const p = fakePorts({ offer: ORDER_OFFER, lines: [line('chicken', 'Chicken 65', 28000, 'sit_12'), line('crab', 'Coastal Crab Roast', 62000, 'sit_12_b')] });
    const a = await preview(p, req('sit_12'));
    const b = await preview(p, req('sit_12_b'));
    expect(a.payable + b.payable).toBeGreaterThanOrEqual(84000);
  });

  // QB-6 · P1. The ₹60 naan split off an offer order cannot absorb ₹100 off, and preview refuses
  // "discount exceeds bill", so the half can never be billed. D 2026-09-15 (split drops the discount):
  // naan alone 6000 + 300 tax = 6300. Apportioned (R1) it would be less; either way it previews.
  knownBug('QB-6 BL-S12: a cheap dish split off an offer order can still be previewed and billed', async () => {
    const p = fakePorts({ offer: ORDER_OFFER, lines: [
      line('chicken', 'Chicken 65', 28000, 'sit_12'), line('crab', 'Coastal Crab Roast', 62000, 'sit_12'), line('naan', 'Butter Naan', 6000, 'sit_12_b'),
    ] });
    const r = await preview(p, req('sit_12_b'));
    expect(r.payable).toBeGreaterThan(0);
    expect(r.payable).toBeLessThanOrEqual(6300);
  });

  // QB-2 · P0. Naan 6000 + 300 tax → bill 6300. The guest pays 3100 cash (floorstate's half: floor(6300/200)×100).
  // BL "Who can do what": cancel is for an issued, UNPAID bill; PY-S14 "before anyone paid". The refusal comes
  // before the PIN box, the way a paid bill's does, and the bill keeps its money.
  knownBug('QB-2 BL: a bill with money on it cannot be cancelled', async () => {
    const p = fakePorts({ lines: [line('naan', 'Butter Naan', 6000, 'sit_11', { tableId: 't11', sessionId: 'sit_11' })] });
    const bill = await issueDraft(p, 'sit_11');
    expect(bill.payable).toBe(6300);
    p.bills.set(bill.billId, { ...p.bills.get(bill.billId), paidTotal: 3100 });   // what payments-take writes
    await expect(cancel(p, { ...req('sit_11'), cid: 'cid_cancel', billId: bill.billId, reason: 'other', pin: '1234' }))
      .rejects.toMatchObject({ code: 'failed-precondition' });
    expect(p.bills.get(bill.billId).status).toBe('issued');
    expect(p.audits.size).toBe(0);
  });

  // QB-3 (refusal half) and QB-9 · BL-S7: the refusal names the number on the paper, "already issued 0417",
  // never the document id. Bill 0417 is the first number the fake counter gives.
  knownBug('QB-3 BL-S7: "already issued" names the bill number the cashier holds, 0417', async () => {
    const p = fakePorts({ lines: [line('naan', 'Butter Naan', 6000, 'sit_10')] });
    const first = await issueDraft(p, 'sit_10');
    expect(first.number).toBe('0417');
    p.lines.set('dessert', line('dessert', 'Butter Naan', 6000, 'sit_10'));   // dessert after the bill (FL-S20)
    const err = await issueDraft(p, 'sit_10').then(() => null, e => e);
    expect(err).toMatchObject({ code: 'failed-precondition' });
    expect(err.message).toContain('0417');
    expect(err.message).not.toContain(first.billId);
  });

  // QB-4 · P1. The comp on the dessert draft is refused by the transaction ("already issued"), but ST's door
  // ran first and wrote a P0 billDiscount row for ₹60 that was never given. D 2026-09-15: no P0 row for a
  // thing that did not happen.
  knownBug('QB-4 ST: a comp refused after the PIN writes no audit row', async () => {
    const p = fakePorts({ lines: [line('naan', 'Butter Naan', 6000, 'sit_10')] });
    await issueDraft(p, 'sit_10');
    p.lines.set('dessert', line('dessert', 'Butter Naan', 6000, 'sit_10'));
    const comp = { amount: 6000, pct: 100, source: { reason: 'complaint', note: '', approverId: 'stf_till' } };
    await expect(issueDraft(p, 'sit_10', { discount: comp, pin: '1234' })).rejects.toMatchObject({ code: 'failed-precondition' });
    expect([...p.audits.values()].filter(a => a.action === 'billDiscount')).toEqual([]);
  });

  // QB-5 · P1. A parcel: naan 6000 + packing ₹20 flat (2000, food block), comped in full. BL-S22 "every line
  // taxable 0, tax 0, payable 0.00". Today the packing survives the comp: 2000 + 100 tax = 2100 due.
  knownBug('QB-5 BL-S22: a whole-bill comp on a parcel leaves nothing to pay, packing included', async () => {
    const p = fakePorts({
      lines: [line('naan', 'Butter Naan', 6000, 'sit_p1', { tableId: 'tp1', sessionId: 'sit_p1' })],
      charges: [{ type: 'PACKING', pctBps: 0, amount: 2000, taxBlockId: 'food', optIn: true }],
      tables: { tp1: ['PACKING'] },
    });
    expect((await preview(p, req('sit_p1'))).payable).toBe(8400);   // 6000 + 2000 = 8000 + 400 tax: the QA run's ₹84.00
    const r = await preview(p, { ...req('sit_p1'), discount: { amount: 6000, pct: 100, source: { reason: 'complaint', note: '', approverId: 'stf_till' } } });
    expect(r.payable).toBe(0);
  });

  // QB-7 · P1. BL "Who can do what": dropping the service charge before issue is allowed, audit P1. BL-S10
  // "Audit P1, no PIN". Naan 6000, service charge 5 % (300) dropped → bill 6300, and one row saying so.
  knownBug('QB-7 BL-S10: removing the service charge writes one P1 audit row naming it', async () => {
    const p = fakePorts({ lines: [line('naan', 'Butter Naan', 6000, 'sit_6')], charges: [{ type: 'SERVICE_CHARGE', pctBps: 500, taxBlockId: 'food' }] });
    const bill = await issueDraft(p, 'sit_6', { dropCharges: ['SERVICE_CHARGE'] });
    expect(bill.payable).toBe(6300);
    const rows = [...p.audits.values()];
    expect(rows).toHaveLength(1);
    expect(JSON.stringify(rows[0])).toContain('SERVICE_CHARGE');
  });

  // QB-13 · P3. BL "Who can do what": dropping the service charge is SERVER "–". A captain's preview without
  // it tells the guest ₹63 for a ₹66 bill. The backend refuses the drop for the role, as it refuses issue.
  knownBug('QB-13 BL: a SERVER login cannot take the service charge off, even on a preview', async () => {
    const p = fakePorts({ role: 'SERVER', lines: [line('naan', 'Butter Naan', 6000, 'sit_6')], charges: [{ type: 'SERVICE_CHARGE', pctBps: 500, taxBlockId: 'food' }] });
    expect((await preview(p, req('sit_6'))).payable).toBe(6600);   // 6000 + 300 = 6300 + 315 tax = 6615 → 6600: may look
    await expect(preview(p, { ...req('sit_6'), dropCharges: ['SERVICE_CHARGE'] })).rejects.toMatchObject({ code: 'permission-denied' });
  });
});

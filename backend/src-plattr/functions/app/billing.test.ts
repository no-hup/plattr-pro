// BL app layer with fake ports and a fake clock. No emulator. Money in minor units; pizza 50000 + coke 8000 → 60900.
import { ApprovalError, Ports, Tx, cancel, creditNote, edit, get, issue, preview, settingsFrom, split, walkOutDraft } from './billing';
import { Bill } from '../domain/billing';
import { Line, TaxBlock } from '../domain/line';
import { Staff } from './approvals';

const RID = 'r1';
const REASONS = ['placard', 'regular', 'complaint', 'birthday', 'guest left', 'staff meal', 'complimentary', 'other'];
const FOOD: TaxBlock = { label: 'GST', mode: 'exclusive', collect: true, parts: [{ label: 'CGST', rateBps: 250 }, { label: 'SGST', rateBps: 250 }] };
const line = (lineId: string, list: number, block: TaxBlock | null = FOOD, extra: Partial<Line> = {}): Line => ({
  lineId, cid: 'o1', orderId: 'o1', cartId: 'k1', cartItemId: '1', tableId: 't7', sessionId: 's1', placedAt: 1, placedBy: 'g',
  menuItemId: 'mi', name: lineId, qty: 1, listPrice: list, sent: true, v: 0, countsTowardTotal: true, draftId: 's1', billId: null,
  components: [{ id: lineId + '_item', kind: 'item', name: lineId, unitListPrice: list, taxBlockId: block ? 'food' : null, taxCode: '9963' }],
  taxBlocks: block ? { food: block } : {}, offer: null, ...extra,
});

function fakePorts(opts: { role?: string; offer?: { id: string; name: string; amount: number } | null; configThrows?: boolean; charges?: { type: string; pctBps: number; amount?: number; taxBlockId: string; optIn?: boolean }[]; tables?: Record<string, string[] | null> } = {}) {
  const lines = new Map<string, Line>([['pizza', line('pizza', 50000)], ['coke', line('coke', 8000)]]);
  const bills = new Map<string, Bill>();
  const counters = new Map<string, { next: number }>([['A_2026-27', { next: 417 }]]);
  const printed: import('../domain/print').Job[] = [];
  const audits = new Map<string, object>();
  const logs: object[] = [];
  let ids = 0;
  const staff: Staff = { staffId: 'm1', role: opts.role ?? 'MANAGER', status: 'active' };
  const settings = settingsFrom({ billing: { charges: opts.charges ?? [] }, seller: { name: 'S', taxId: 'GSTIN1' } }, { address: 'Road' });
  const ports: Ports & { lines: typeof lines; bills: typeof bills; counters: typeof counters; audits: typeof audits; logs: typeof logs } = {
    lines, bills, counters, audits, logs,
    now: () => Date.parse('2026-09-15T15:00:00Z'),
    log: l => logs.push(l),
    staff: { bySession: async (_r, sid) => { if (sid !== 'st1') throw new ApprovalError('unauthenticated', 'bad session'); return staff; } },
    config: { billing: async () => { if (opts.configThrows) throw new Error('firestore down'); return settings; } },
    linesOfDraft: async (_r, d) => [...lines.values()].filter(l => l.draftId === d),
    linesOfOrder: async (_r, o) => [...lines.values()].filter(l => l.orderId === o),
    orderOffer: async () => opts.offer ?? null,
    getBill: async (_r, id) => bills.get(id) ?? null,
    tables: async (_r, ids) => ids.map(tableId => ({ tableId, charges: opts.tables?.[tableId] ?? null })),
    // ST's door, faked: no pin → the challenge; wrong pin → wrong; else a P0 audit row like ST writes.
    approve: async req => {
      if (staff.role !== 'MANAGER' && staff.role !== 'ADMIN') throw new ApprovalError('permission-denied', 'Not allowed for your role');
      if (typeof req.reason !== 'string' || !req.reason) throw new ApprovalError('invalid-argument', 'reason required');
      if (!REASONS.includes(req.reason)) throw new ApprovalError('invalid-argument', 'reason not on the list');
      // ST decides. A bill discount follows the same rule as a line discount: over
      // `discountPinAbovePercent` (10) it is a PIN and P0, under it is applied at once and P1.
      // A bill-level reversal (cancel, credit note) is always a PIN.
      const over = req.action === 'billDiscount'
        ? Number(req.amountMinor ?? 0) * 100 > Number(req.baseMinor ?? 0) * 10
        : true;
      if (over) {
        if (req.pin === undefined) throw new ApprovalError('permission-denied', 'PIN required', { requires: 'pin', action: req.action, sev: 'P0' });
        if (req.pin !== '1234') throw new ApprovalError('permission-denied', 'Wrong PIN', { requires: 'pin', wrong: true });
      }
      const id = `${req.cid}_${req.action}_${ports.now()}`;
      audits.set(id, { action: req.action, sev: over ? 'P0' : 'P1', reason: req.reason, note: req.note, staffId: staff.staffId, amountMinor: req.amountMinor });
      return { auditId: id };
    },
    transact: async (_r, fn) => {
      const pl = new Map<string, Partial<Line>>(), pb = new Map<string, Bill>(), pu = new Map<string, Partial<Bill>>(), pc = new Map<string, { next: number }>(), pa = new Map<string, object>();
      const t: Tx = {
        getLines: async ids => ids.map(i => lines.get(i)).filter((l): l is Line => !!l),
        setLine: (id, patch) => { pl.set(id, patch); },
        getBill: async id => bills.get(id) ?? null,
        setBill: (id, b) => { if (bills.has(id)) throw new Error('exists'); pb.set(id, b); },
        updateBill: (id, patch) => { pu.set(id, patch); },
        getCounter: async k => counters.get(k) ?? null,
        setCounter: (k, c) => { pc.set(k, c); },
        createAudit: (id, row) => { pa.set(id, row); },
        newBillId: () => `bill_${++ids}`,
        enqueuePrint: job => { printed.push(job); },
        tableLabel: async tableIds => tableIds.map(x => x.replace('table_', '')).join('+'),
      };
      const out = await fn(t);
      for (const [k, v] of pl) lines.set(k, { ...lines.get(k)!, ...v });
      for (const [k, v] of pb) bills.set(k, v);
      for (const [k, v] of pu) bills.set(k, { ...bills.get(k)!, ...v });
      for (const [k, v] of pc) counters.set(k, v);
      for (const [k, v] of pa) audits.set(k, v);
      return out;
    },
  };
  (ports as unknown as { printed: typeof printed }).printed = printed;
  return ports;
}
// The cashier's login (`st1`) and the guest's sitting (`s1`) are different ids on purpose. When they were
// both `s1`, a bill that copied the login into its sitting field passed every test here (sanity run 1).
const base = { restaurantId: RID, sessionId: 'st1', draftId: 's1', cid: 'o1' };
// TD-040: what the cashier's preview showed — both seeded lines at v0. A test that changes the draft says what it saw.
const issueReq = (extra = {}) => ({ ...base, tableIds: ['t7'], expectedV: { pizza: 0, coke: 0 } as Record<string, number>, ...extra });
const code = async (p: Promise<unknown>) => { try { await p; return 'ok'; } catch (e) { return (e as ApprovalError).code; } };

describe('app/billing preview', () => {
  it('BL-S1 computes, never writes: 60900, no number, nothing in bills or counters', async () => {
    const p = fakePorts();
    const r = await preview(p, base);
    expect(r).toMatchObject({ payable: 60900, taxTotal: 2900, flagged: [], offer: null });
    expect(p.bills.size).toBe(0); expect(p.counters.get('A_2026-27')).toEqual({ next: 417 });
  });
  it('BL-S24 the order offer as evaluated at placement is the bill discount: 20 % pizza offer 10000 → 420.00 on the pizza alone', async () => {
    const p = fakePorts({ offer: { id: 'happy', name: 'Happy hour', amount: 10000 } });
    p.lines.delete('coke');
    const r = await preview(p, base);
    expect(r).toMatchObject({ payable: 42000, discount: { amount: 10000, source: { reason: 'Happy hour', approverId: 'offer' } } });
  });
  it('BL-S14 a line with no block → failed-precondition naming it, flagged in details', async () => {
    const p = fakePorts(); p.lines.set('dal', line('dal', 20000, null));
    await expect(preview(p, base)).rejects.toMatchObject({ code: 'failed-precondition', details: { flagged: ['dal'] } });
  });
  it('BL-S10 dropCharges removes the service charge row before issue; BL-S21 base is the block net', async () => {
    const p = fakePorts({ charges: [{ type: 'SERVICE_CHARGE', pctBps: 1000, taxBlockId: 'food' }] });
    expect((await preview(p, base)).charges[0]).toMatchObject({ base: 58000, amount: 5800 });
    expect((await preview(p, { ...base, dropCharges: ['SERVICE_CHARGE'] })).charges).toEqual([]);
  });
  it('BT-P4 a table naming its charges takes exactly those rows; one naming none takes every row', async () => {
    const charges = [{ type: 'SERVICE_CHARGE', pctBps: 1000, taxBlockId: 'food' }, { type: 'PACKING', pctBps: 0, amount: 2000, taxBlockId: 'food', optIn: true }];   // config-doc shape: `amount` minor units
    // t7 (the fixture's table) is a counter ticket: packing only, no service charge.
    const parcel = await preview(fakePorts({ charges, tables: { t7: ['PACKING'] } }), base);
    expect(parcel.charges.map(c => [c.type, c.amount])).toEqual([['PACKING', 2000]]);
    // No table names anything → every row that is not optIn: the service charge, never packing.
    const dinein = await preview(fakePorts({ charges }), base);
    expect(dinein.charges.map(c => [c.type, c.amount])).toEqual([['SERVICE_CHARGE', 5800]]);
    // dropCharges still applies on top of the table's list.
    expect((await preview(fakePorts({ charges, tables: { t7: ['PACKING'] } }), { ...base, dropCharges: ['PACKING'] })).charges).toEqual([]);
  });
  it('R12 a config read failure refuses, never defaults', async () => {
    await expect(preview(fakePorts({ configThrows: true }), base)).rejects.toThrow('firestore down');
  });
  it('a bad session is unauthenticated; a captain may preview', async () => {
    expect(await code(preview(fakePorts(), { ...base, sessionId: 'x' }))).toBe('unauthenticated');
    expect(await code(preview(fakePorts({ role: 'SERVER' }), base))).toBe('ok');
  });
});

describe('app/billing issue', () => {
  it('BL-S7 number 0417 from the counter, counter → 418, lines stamped, bill frozen with the seller, one log line with cid', async () => {
    const p = fakePorts();
    const b = await issue(p, issueReq());
    expect(b).toMatchObject({ number: '0417', series: 'A', fiscalYear: '2026-27', status: 'issued', payable: 60900, seller: { name: 'S', taxId: 'GSTIN1', address: 'Road' }, issuedBy: 'm1' });
    expect(p.counters.get('A_2026-27')).toEqual({ next: 418 });
    expect([...p.lines.values()].every(l => l.billId === b.billId)).toBe(true);
    expect(p.logs).toEqual([expect.objectContaining({ cid: 'o1', from: 'draft', to: 'issued', number: '0417' })]);
  });

  // Sanity run 1 (2026-09-22): a real bill carried the cashier's login as its sitting and no tables,
  // so the floor never found it and the printed bill named no table. The bill's lines already know both.
  describe('the bill takes its sitting and its tables from its own lines', () => {
    it('sitting s1 and table t7 come from the lines; the cashier login st1 is nowhere on the bill; paper says 7', async () => {
      const p = fakePorts();
      const b = await issue(p, issueReq({ tableIds: [] }));   // what the till actually sent
      expect(b).toMatchObject({ sittingId: 's1', tableIds: ['t7'], issuedBy: 'm1' });
      expect(JSON.stringify(b)).not.toContain('st1');
      expect((p as unknown as { printed: { tableLabel: string }[] }).printed[0].tableLabel).toBe('t7');
    });
    it('a merged sitting billed across tables 7 and 8 names both, once each, in the order the lines came', async () => {
      const p = fakePorts();
      p.lines.set('naan', line('naan', 6000, FOOD, { tableId: 't8' }));
      p.lines.set('dal', line('dal', 20000, FOOD, { tableId: 't8' }));
      const b = await issue(p, issueReq({ expectedV: { pizza: 0, coke: 0, naan: 0, dal: 0 } }));
      expect(b.tableIds).toEqual(['t7', 't8']);
    });
    it('a draft holding lines of two sittings is refused, nothing written', async () => {
      const p = fakePorts();
      p.lines.set('coke', line('coke', 8000, FOOD, { sessionId: 's2' }));
      await expect(issue(p, issueReq())).rejects.toMatchObject({ code: 'failed-precondition', message: expect.stringContaining('two sittings') });
      expect(p.bills.size).toBe(0);
    });
    it('a line with no sitting is refused rather than billed to an empty one', async () => {
      const p = fakePorts();
      p.lines.set('coke', line('coke', 8000, FOOD, { sessionId: '' }));
      await expect(issue(p, issueReq())).rejects.toMatchObject({ code: 'failed-precondition' });
      expect(p.bills.size).toBe(0);
    });
  });
  it('BL-S7 a second issue on the same lines → failed-precondition "already issued", counter stays 418', async () => {
    const p = fakePorts();
    await issue(p, issueReq());
    await expect(issue(p, issueReq())).rejects.toMatchObject({ code: 'failed-precondition', message: expect.stringContaining('already issued') });
    expect(p.counters.get('A_2026-27')).toEqual({ next: 418 });
  });
  it('BL-S7 a corrupt counter ({} with no next) refuses the issue: failed-precondition, no bill, counter untouched', async () => {
    const p = fakePorts();
    p.counters.set('A_2026-27', {} as never);
    await expect(issue(p, issueReq())).rejects.toMatchObject({ code: 'failed-precondition', message: expect.stringContaining('A_2026-27') });
    expect(p.bills.size).toBe(0); expect(p.counters.get('A_2026-27')).toEqual({});
  });
  it('BL-S11 a corrupt credit-note counter refuses the note the same way', async () => {
    const p = fakePorts();
    const b = await issue(p, issueReq());
    p.bills.set(b.billId, { ...p.bills.get(b.billId)!, status: 'paid' });
    p.counters.set('CN_2026-27', { next: 'x' } as never);
    await expect(creditNote(p, { ...base, billId: b.billId, reason: 'complaint', pin: '1234', credits: [{ lineId: 'coke', qty: 1 }] })).rejects.toMatchObject({ code: 'failed-precondition' });
  });
  it('BL-S7 a line that changed since preview (v) → failed-precondition, nothing written', async () => {
    const p = fakePorts();
    await expect(issue(p, issueReq({ expectedV: { pizza: 3 } }))).rejects.toMatchObject({ code: 'failed-precondition' });
    expect(p.bills.size).toBe(0);
  });
  it('TD-040 a dish added after the preview → failed-precondition naming it, no number taken', async () => {
    const p = fakePorts(); p.lines.set('naan', line('naan', 6000));
    await expect(issue(p, issueReq())).rejects.toMatchObject({ code: 'failed-precondition', message: expect.stringContaining('preview again'), details: { lineId: 'naan' } });
    expect(p.bills.size).toBe(0); expect(p.counters.get('A_2026-27')).toEqual({ next: 417 });
  });
  it('TD-040 a dish voided after the preview (v 0 → 1) → failed-precondition: the preview read ₹609.00, the bill would be ₹529.00', async () => {
    const p = fakePorts(); p.lines.set('coke', line('coke', 8000, FOOD, { v: 1, countsTowardTotal: false }));
    await expect(issue(p, issueReq())).rejects.toMatchObject({ code: 'failed-precondition', details: { lineId: 'coke' } });
  });
  it('TD-040 a dish split away after the preview → failed-precondition', async () => {
    const p = fakePorts(); p.lines.set('coke', line('coke', 8000, FOOD, { draftId: 's2' }));
    await expect(issue(p, issueReq())).rejects.toMatchObject({ code: 'failed-precondition', details: { lineId: 'coke' } });
  });
  it('TD-040 {} is no longer a way round the guard: the draft has lines, so it is refused', async () => {
    const p = fakePorts();
    await expect(issue(p, issueReq({ expectedV: {} }))).rejects.toMatchObject({ code: 'failed-precondition' });
    expect(p.bills.size).toBe(0);
  });
  it('BL-S7 a missing expectedV is a bad request, not a crash: invalid-argument, nothing written', async () => {
    const p = fakePorts();
    const { expectedV, ...noVersions } = issueReq();
    await expect(issue(p, noVersions as never)).rejects.toMatchObject({ code: 'invalid-argument' });
    await expect(issue(p, issueReq({ expectedV: 'all of them' }) as never)).rejects.toMatchObject({ code: 'invalid-argument' });
    expect(p.bills.size).toBe(0);
  });
  it('D7 client money is ignored: the request carries no amounts and the bill is 60900 regardless', async () => {
    const b = await issue(fakePorts(), issueReq({ payable: 1, lines: [] } as never));
    expect(b.payable).toBe(60900);
  });
  it('a captain cannot issue; an empty draft cannot issue', async () => {
    expect(await code(issue(fakePorts({ role: 'SERVER' }), issueReq()))).toBe('permission-denied');
    const p = fakePorts(); p.lines.clear();
    expect(await code(issue(p, issueReq()))).toBe('failed-precondition');
  });
  it('BL-S22 a 100 % bill discount still takes a number — with the PIN', async () => {
    const comp = { amount: 58000, pct: 100, source: { reason: 'guest left', note: '', approverId: 'm1' } };
    const b = await issue(fakePorts(), issueReq({ discount: comp, pin: '1234' }));
    expect(b).toMatchObject({ number: '0417', payable: 0, status: 'paid' });   // PY-S8
  });

  // ── TD-019. A bill-level discount is a person giving money away, and until 2026-09-16 it went
  // onto the bill straight from the request body: no PIN, no audit row, and an approverId the
  // caller typed. DC-S25 then pushed cashiers down exactly this path, because the fastest way past
  // a close blocked by an unbilled table is a silent ₹0 bill.
  describe('TD-019 a bill discount goes through ST`s one door', () => {
    const comp = (over: Record<string, unknown> = {}) => ({ amount: 58000, pct: 100, source: { reason: 'guest left', note: '', approverId: 'm1' }, ...over });

    it('a 100 % comp with no PIN is refused, and NOTHING is written: no bill, no number taken', async () => {
      const p = fakePorts();
      await expect(issue(p, issueReq({ discount: comp() }))).rejects.toMatchObject({ code: 'permission-denied', details: { requires: 'pin' } });
      expect(p.bills.size).toBe(0);
      expect(p.counters.get('A_2026-27')).toEqual({ next: 417 });   // the invoice number is not burned
    });

    it('a wrong PIN is refused the same way', async () => {
      const p = fakePorts();
      await expect(issue(p, issueReq({ discount: comp(), pin: '9999' }))).rejects.toMatchObject({ details: { wrong: true } });
      expect(p.bills.size).toBe(0);
    });

    it('with the PIN it goes through and leaves a P0 audit row naming the amount and the reason', async () => {
      const p = fakePorts();
      await issue(p, issueReq({ discount: comp(), pin: '1234' }));
      const row = [...p.audits.values()][0] as Record<string, unknown>;
      expect(row).toMatchObject({ action: 'billDiscount', sev: 'P0', reason: 'guest left', staffId: 'm1', amountMinor: 58000 });
    });

    it('a SMALL discount needs no PIN but still writes an audit row — audit is never optional', async () => {
      const p = fakePorts();
      const b = await issue(p, issueReq({ discount: { amount: 2000, pct: 0, source: { reason: 'regular', note: '', approverId: 'm1' } } }));
      expect(b.payable).toBe(58800);            // 58000 − 2000 = 56000 + 5 % tax 2800
      expect([...p.audits.values()][0]).toMatchObject({ action: 'billDiscount', sev: 'P1', reason: 'regular' });
    });

    it('a reason that is not on the configured list is refused', async () => {
      const p = fakePorts();
      await expect(issue(p, issueReq({ discount: comp({ source: { reason: 'because', note: '', approverId: 'm1' } }), pin: '1234' })))
        .rejects.toMatchObject({ code: 'invalid-argument' });
      expect(p.bills.size).toBe(0);
    });

    it('BL-S24 the OFFER`s own discount is never gated: no PIN, no audit row, the guest just gets their offer', async () => {
      const p = fakePorts({ offer: { id: 'happy', name: 'Happy hour', amount: 10000 } });
      p.lines.delete('coke');
      const b = await issue(p, issueReq({ expectedV: { pizza: 0 } }));        // no discount in the body, no pin
      expect(b).toMatchObject({ number: '0417', payable: 42000 });
      expect(p.audits.size).toBe(0);
    });

    it('a bill with no discount at all is untouched by any of this: no PIN, no audit row', async () => {
      const p = fakePorts();
      const b = await issue(p, issueReq());
      expect(b).toMatchObject({ number: '0417', payable: 60900 });
      expect(p.audits.size).toBe(0);
    });

    it('a SERVER is refused on the role, before any PIN box is shown', async () => {
      const p = fakePorts({ role: 'SERVER' });
      await expect(issue(p, issueReq({ discount: comp(), pin: '1234' }))).rejects.toMatchObject({ code: 'permission-denied' });
      expect(p.bills.size).toBe(0);
    });
  });
});

describe('app/billing cancel / creditNote / split / get', () => {
  it('BL-S9 cancel: status cancelled, number kept, lines freed, P0 audit row with the payable', async () => {
    const p = fakePorts();
    const b = await issue(p, issueReq());
    const ask = await code(cancel(p, { ...base, billId: b.billId, reason: 'other', note: 'service charge removed' }));
    expect(ask).toBe('permission-denied');   // requires pin, from ST
    expect(p.bills.get(b.billId)!.status).toBe('issued');
    const c = await cancel(p, { ...base, billId: b.billId, reason: 'other', note: 'service charge removed', pin: '1234' });
    expect(c).toMatchObject({ status: 'cancelled', number: '0417', cancelled: { by: 'm1', reason: 'other' } });
    expect([...p.lines.values()].every(l => l.billId === null)).toBe(true);
    expect([...p.audits.values()][0]).toMatchObject({ action: 'cancelBill', sev: 'P0', reason: 'other', note: expect.stringContaining('bill 0417 ₹60900') });
    expect((await issue(p, issueReq())).number).toBe('0418');
  });
  it('BL-S9 cancel needs a reason (ST rule) and refuses a paid bill before asking for a PIN', async () => {
    const p = fakePorts();
    const b = await issue(p, issueReq());
    expect(await code(cancel(p, { ...base, billId: b.billId, reason: '', pin: '1234' }))).toBe('invalid-argument');
    p.bills.set(b.billId, { ...b, status: 'paid' });
    expect(await code(cancel(p, { ...base, billId: b.billId, reason: 'other' }))).toBe('failed-precondition');   // no pin needed to learn that
  });
  // D3: A-0417 is ₹609.00. A second till takes ₹200 cash while the first cashier is typing the PIN. The check before the
  // PIN saw no money; the transaction re-reads the bill, sees paidTotal 20000 and refuses. Nothing moves: bill issued, lines billed.
  it('D3 a payment landing between the pre-check and the cancel transaction is caught inside it: "₹200 already paid on A-0417"', async () => {
    const p = fakePorts();
    const b = await issue(p, issueReq());
    const door = p.approve;
    p.approve = async req => { const r = await door(req); p.bills.set(b.billId, { ...p.bills.get(b.billId)!, paidTotal: 20000 }); return r; };
    await expect(cancel(p, { ...base, billId: b.billId, reason: 'other', pin: '1234' }))
      .rejects.toMatchObject({ code: 'failed-precondition', message: '₹200 already paid on A-0417 — take the rest first' });
    expect(p.bills.get(b.billId)!.status).toBe('issued');
    expect([...p.lines.values()].every(l => l.billId === b.billId)).toBe(true);
  });
  // D2 / BL-S9. A-0417 (pizza 50000 + coke 8000 = 60900) is printed; the table orders more. Edit: no PIN, number kept,
  // status cancelled with reason `edited`, one P1 row keyed on the bill with the old payable, dishes back on draft s1.
  it('D2 BL-S9 Edit cancels A-0417 as "edited" with no PIN, one P1 bill.edit row, and 0418 says it replaces A-0417', async () => {
    const p = fakePorts();
    const b = await issue(p, issueReq());
    const e = await edit(p, { restaurantId: RID, sessionId: 'st1', cid: 'till_s1', billId: b.billId });
    expect(e).toMatchObject({ status: 'cancelled', number: '0417', cancelled: { by: 'm1', reason: 'edited' } });
    expect(p.audits.get(`${b.billId}_edit`)).toMatchObject({ action: 'bill.edit', sev: 'P1', amount: 60900, reason: 'edited', staffId: 'm1' });
    expect(p.audits.size).toBe(1);
    expect([...p.lines.values()].map(l => [l.billId, l.lastBillId])).toEqual([[null, b.billId], [null, b.billId]]);
    const next = await issue(p, issueReq());
    expect(next).toMatchObject({ number: '0418', payable: 60900, replaces: [{ billId: b.billId, number: 'A-0417' }] });
    expect(p.bills.get(b.billId)!.replacedBy).toEqual([{ billId: next.billId, number: 'A-0418' }]);
    expect([...p.lines.values()].every(l => l.billId === next.billId && l.lastBillId === null)).toBe(true);
  });
  it('D2 Edit is the cashier\'s: a SERVER is refused, and so is a bill with money on it (D3), before anything moves', async () => {
    const s = fakePorts({ role: 'SERVER' });
    s.bills.set('b9', { billId: 'b9', status: 'issued', series: 'A', number: '0417', payable: 60900, lines: [] } as unknown as Bill);
    expect(await code(edit(s, { restaurantId: RID, sessionId: 'st1', cid: 'c', billId: 'b9' }))).toBe('permission-denied');
    const p = fakePorts();
    const b = await issue(p, issueReq());
    p.bills.set(b.billId, { ...p.bills.get(b.billId)!, paidTotal: 50000 });
    await expect(edit(p, { restaurantId: RID, sessionId: 'st1', cid: 'c', billId: b.billId })).rejects.toMatchObject({ message: '₹500 already paid on A-0417 — take the rest first' });
    expect(p.bills.get(b.billId)!.status).toBe('issued');
    expect(p.audits.size).toBe(0);
  });
  // Review P0: a till that sends its own per-line shares with a ₹0.01 discount must get ₹0.01 off, not ₹500. The share
  // fields are the server's. ₹0.01 by net share lands on the pizza: 49999 + 2500 tax, coke 8000 + 400 = 60899 → 60900.
  it('D2 a client-sent byLine or targets on a bill discount is ignored: {amount: 1, byLine: {pizza: 50000}} takes 1 off, not 50000', async () => {
    const p = fakePorts();
    const d = { amount: 1, pct: 0, source: { reason: 'regular', note: '', approverId: 'm1' }, byLine: { pizza: 50000, ghost: 999999 }, targets: { '1': 50000 } };
    const r = await preview(p, { ...base, discount: d as never });
    expect([r.discount!.amount, r.payable]).toEqual([1, 60900]);
    expect(r.discount).not.toHaveProperty('byLine');
  });
  // D1 / Q1-1, Q1-2: table 7's A-0417 (pizza + coke, 60900) is printed; they order a ₹200 dessert (same draft s1) and walk
  // out. The dessert is issued on its own as A-0418 (20000 + 1000 tax = 21000), no paper; A-0417 is untouched.
  it('D1 walkOutDraft bills the unbilled dessert on its own numbered bill, with no print job, leaving A-0417 as it was', async () => {
    const p = fakePorts();
    const first = await issue(p, issueReq());
    const printed = (p as unknown as { printed: unknown[] }).printed;
    const before = printed.length;
    p.lines.set('jamun', line('jamun', 20000));
    await expect(walkOutDraft(p, { restaurantId: RID, sessionId: 'st1', draftId: 's1', cid: 'wo_7', payable: 20000 }))
      .rejects.toMatchObject({ message: 'the amount on this table changed, try again' });   // the PIN approved 20000; it bills at 21000
    const b = await walkOutDraft(p, { restaurantId: RID, sessionId: 'st1', draftId: 's1', cid: 'wo_7', payable: 21000 });
    expect(b).toMatchObject({ number: '0418', payable: 21000, status: 'issued', cid: 'wo_7' });
    expect(b.lines.map(l => l.lineId)).toEqual(['jamun']);
    expect(printed.length).toBe(before);
    expect(p.bills.get(first.billId)!.status).toBe('issued');
    expect(p.lines.get('jamun')!.billId).toBe(b.billId);
  });
  // Q2-4: A-0417 edited and split: the coke goes to draft s1_b. Both new bills replace A-0417; A-0417 lists both.
  it('D2 BL-S25 Edit then split: 0418 and 0419 both say "Replaces A-0417", and A-0417 lists both', async () => {
    const p = fakePorts();
    const b = await issue(p, issueReq());
    await edit(p, { restaurantId: RID, sessionId: 'st1', cid: 'c', billId: b.billId });
    await split(p, { ...base, moves: [{ lineId: 'coke', toDraftId: 's1_b' }] });
    const food = await issue(p, issueReq({ expectedV: { pizza: 0 } }));
    const drink = await issue(p, issueReq({ draftId: 's1_b', expectedV: { coke: 0 } }));
    expect([food.payable, drink.payable]).toEqual([52500, 8400]);   // 50000 + 2500 tax; 8000 + 400
    expect([food.replaces, drink.replaces]).toEqual([[{ billId: b.billId, number: 'A-0417' }], [{ billId: b.billId, number: 'A-0417' }]]);
    expect(p.bills.get(b.billId)!.replacedBy!.map(r => r.number)).toEqual(['A-0418', 'A-0419']);
  });
  // Q2-2 / QB-10. 10 % service charge: 58000 + 5800 = 63800 + 3190 tax = 66990 → 67000; without it 60900. The cashier drops
  // it, prints A-0417 at 60900 (one P1 dropCharge row, 5800), then edits: the draft previews at 60900 with no list sent,
  // and says what it kept off. Sending an empty list is how the cashier adds it back: 67000.
  it('D2 Q2-2 a service charge dropped before an Edit stays dropped on the next preview and bill, unless the cashier adds it back', async () => {
    const p = fakePorts({ charges: [{ type: 'SERVICE_CHARGE', pctBps: 1000, taxBlockId: 'food' }] });
    const b = await issue(p, issueReq({ dropCharges: ['SERVICE_CHARGE'] }));
    expect([b.payable, b.dropped]).toEqual([60900, ['SERVICE_CHARGE']]);
    expect(p.audits.get(`${b.billId}_drop_SERVICE_CHARGE`)).toMatchObject({ action: 'dropCharge', sev: 'P1', amount: 5800 });
    await edit(p, { restaurantId: RID, sessionId: 'st1', cid: 'c', billId: b.billId });
    const again = await preview(p, base);
    expect([again.payable, again.dropped]).toEqual([60900, ['SERVICE_CHARGE']]);
    expect((await preview(p, { ...base, dropCharges: [] })).payable).toBe(67000);
    expect((await issue(p, issueReq())).payable).toBe(60900);
  });
  it('BL-S11 credit note: CN series 0001, original keeps paid and gains creditNotes[], credited qty moves, audit amount 8400', async () => {
    const p = fakePorts();
    const b = await issue(p, issueReq());
    p.bills.set(b.billId, { ...b, status: 'paid' });
    expect(await code(creditNote(p, { ...base, billId: b.billId, reason: 'complaint', credits: [{ lineId: 'coke', qty: 1 }] }))).toBe('permission-denied');   // requires pin
    const n = await creditNote(p, { ...base, billId: b.billId, reason: 'complaint', note: 'coke not served', pin: '1234', credits: [{ lineId: 'coke', qty: 1 }] });
    expect(n).toMatchObject({ series: 'CN', number: '0001', payable: -8400, creditNoteOf: { billId: b.billId, number: '0417' } });
    expect(n).toMatchObject({ sittingId: 's1', tableIds: ['t7'] });   // the parent's sitting; payable is negative, so the floor never reads it as owed
    const o = p.bills.get(b.billId)!;
    expect(o.status).toBe('paid'); expect(o.creditNotes).toEqual([{ billId: n.billId, number: '0001', at: p.now() }]);
    expect(o.lines.find(l => l.lineId === 'coke')!.credited).toEqual({ qty: 1 });
    expect(p.counters.get('CN_2026-27')).toEqual({ next: 2 });
    expect([...p.audits.values()].find(a => (a as { action: string }).action === 'creditNote')).toMatchObject({ sev: 'P0', reason: 'complaint', note: expect.stringContaining('coke×1') });
    expect(await code(creditNote(p, { ...base, billId: b.billId, reason: 'complaint', pin: '1234', credits: [{ lineId: 'coke', qty: 1 }] }))).toBe('failed-precondition');
  });
  it('BL-S11 a note on an unpaid bill is refused before any counter moves', async () => {
    const p = fakePorts();
    const b = await issue(p, issueReq());
    expect(await code(creditNote(p, { ...base, billId: b.billId, reason: 'complaint', pin: '1234', credits: [{ lineId: 'coke', qty: 1 }] }))).toBe('failed-precondition');
    expect(p.counters.has('CN_2026-27')).toBe(false);
    expect(p.audits.size).toBe(0);   // refused before the door, so no P0 row for a thing that did not happen
  });
  it('BL-S12 split moves lines to a second draft; each draft issues its own number; an issued line cannot move', async () => {
    const p = fakePorts();
    expect(await split(p, { ...base, moves: [{ lineId: 'coke', toDraftId: 'd2' }] })).toEqual({ moved: 1 });
    const a = await issue(p, issueReq({ expectedV: { pizza: 0 } }));
    const b = await issue(p, issueReq({ draftId: 'd2', expectedV: { coke: 0 } }));
    expect([a.number, a.payable, b.number, b.payable]).toEqual(['0417', 52500, '0418', 8400]);
    expect(await code(split(p, { ...base, moves: [{ lineId: 'coke', toDraftId: 's1' }] }))).toBe('failed-precondition');
  });
  it('get returns the bill, not-found otherwise', async () => {
    const p = fakePorts();
    const b = await issue(p, issueReq());
    expect((await get(p, { restaurantId: RID, sessionId: 'st1', billId: b.billId })).number).toBe('0417');
    expect(await code(get(p, { restaurantId: RID, sessionId: 'st1', billId: 'nope' }))).toBe('not-found');
  });
});

describe('app/billing settingsFrom', () => {
  it('the old charges key stays a percent: percentage 5 → pctBps 500, block food; pctBps wins when present; seller falls back to the info doc', () => {
    const s = settingsFrom({ billing: { charges: [{ type: 'SERVICE_CHARGE', percentage: 5 }, { type: 'X', pctBps: 250, taxBlockId: 'liquor' }] } }, { name: 'Meghana Foods', address: 'Residency Road' });
    expect(s.billing.charges).toEqual([{ type: 'SERVICE_CHARGE', pctBps: 500, flat: 0, taxBlockId: 'food' }, { type: 'X', pctBps: 250, flat: 0, taxBlockId: 'liquor' }]);
    // BT: a flat row is `amount` in minor units on the config doc; a percentage-only row reads flat 0.
    expect(settingsFrom({ billing: { charges: [{ type: 'PACKING', amount: 2000, taxBlockId: 'food', optIn: true }] } }, undefined).billing.charges).toEqual([{ type: 'PACKING', pctBps: 0, flat: 2000, taxBlockId: 'food', optIn: true }]);
    expect(s.seller).toMatchObject({ name: 'Meghana Foods', address: 'Residency Road', taxId: '' });
    expect(s.invoice).toMatchObject({ series: 'A', width: 4, timezone: 'Asia/Kolkata' });
  });
  it('missing config → defaults, no charges', () => {
    expect(settingsFrom(undefined, undefined).billing).toEqual({ partRounding: 'independent', roundTo: 100, charges: [] });
  });
});

describe('KT: paper is queued in the issuing transaction (KT-S6, KT-S15)', () => {
  it('KT-S6 issue → one bill:<billId> job for the counter, ticketNo = the bill number, tableLabel from the table numbers', async () => {
    const ports = fakePorts();
    const bill = await issue(ports, issueReq());
    const jobs = (ports as unknown as { printed: import('../domain/print').Job[] }).printed;
    expect(jobs.map(j => [j.jobId, j.kind, j.ticketNo, j.state])).toEqual([[`bill:${bill.billId}`, 'bill', bill.number, 'queued']]);
  });
});

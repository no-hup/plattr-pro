// BL app layer with fake ports and a fake clock. No emulator. Money in minor units; pizza 50000 + coke 8000 → 60900.
import { ApprovalError, Ports, Tx, cancel, creditNote, get, issue, preview, settingsFrom, split } from './billing';
import { Bill } from '../domain/billing';
import { Line, TaxBlock } from '../domain/line';
import { Staff } from './approvals';

const RID = 'r1';
const FOOD: TaxBlock = { label: 'GST', mode: 'exclusive', collect: true, parts: [{ label: 'CGST', rateBps: 250 }, { label: 'SGST', rateBps: 250 }] };
const line = (lineId: string, list: number, block: TaxBlock | null = FOOD, extra: Partial<Line> = {}): Line => ({
  lineId, cid: 'o1', orderId: 'o1', cartId: 'k1', cartItemId: '1', tableId: 't7', sessionId: 's1', placedAt: 1, placedBy: 'g',
  menuItemId: 'mi', name: lineId, qty: 1, listPrice: list, sent: true, v: 0, countsTowardTotal: true, draftId: 's1', billId: null,
  components: [{ id: lineId + '_item', kind: 'item', name: lineId, unitListPrice: list, taxBlockId: block ? 'food' : null, taxCode: '9963' }],
  taxBlocks: block ? { food: block } : {}, offer: null, ...extra,
});

function fakePorts(opts: { role?: string; offer?: { id: string; name: string; amount: number } | null; configThrows?: boolean; charges?: { type: string; pctBps: number; taxBlockId: string }[] } = {}) {
  const lines = new Map<string, Line>([['pizza', line('pizza', 50000)], ['coke', line('coke', 8000)]]);
  const bills = new Map<string, Bill>();
  const counters = new Map<string, { next: number }>([['A_2026-27', { next: 417 }]]);
  const audits = new Map<string, object>();
  const logs: object[] = [];
  let ids = 0;
  const staff: Staff = { staffId: 'm1', role: opts.role ?? 'MANAGER', status: 'active' };
  const settings = settingsFrom({ billing: { charges: opts.charges ?? [] }, seller: { name: 'S', taxId: 'GSTIN1' } }, { address: 'Road' });
  const ports: Ports & { lines: typeof lines; bills: typeof bills; counters: typeof counters; audits: typeof audits; logs: typeof logs } = {
    lines, bills, counters, audits, logs,
    now: () => Date.parse('2026-09-15T15:00:00Z'),
    log: l => logs.push(l),
    staff: { bySession: async (_r, sid) => { if (sid !== 's1') throw new ApprovalError('unauthenticated', 'bad session'); return staff; } },
    config: { billing: async () => { if (opts.configThrows) throw new Error('firestore down'); return settings; } },
    linesOfDraft: async (_r, d) => [...lines.values()].filter(l => l.draftId === d),
    orderOffer: async () => opts.offer ?? null,
    getBill: async (_r, id) => bills.get(id) ?? null,
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
  return ports;
}
const base = { restaurantId: RID, sessionId: 's1', draftId: 's1', cid: 'o1' };
const issueReq = (extra = {}) => ({ ...base, tableIds: ['t7'], expectedV: {}, ...extra });
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
  it('BL-S7 a second issue on the same lines → failed-precondition "already issued", counter stays 418', async () => {
    const p = fakePorts();
    await issue(p, issueReq());
    await expect(issue(p, issueReq())).rejects.toMatchObject({ code: 'failed-precondition', message: expect.stringContaining('already issued') });
    expect(p.counters.get('A_2026-27')).toEqual({ next: 418 });
  });
  it('BL-S7 a line that changed since preview (v) → failed-precondition, nothing written', async () => {
    const p = fakePorts();
    await expect(issue(p, issueReq({ expectedV: { pizza: 3 } }))).rejects.toMatchObject({ code: 'failed-precondition' });
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
  it('BL-S22 a 100 % bill discount still takes a number', async () => {
    const b = await issue(fakePorts(), issueReq({ discount: { amount: 58000, pct: 100, source: { reason: 'comp', note: '', approverId: 'm1' } } }));
    expect(b).toMatchObject({ number: '0417', payable: 0 });
  });
});

describe('app/billing cancel / creditNote / split / get', () => {
  it('BL-S9 cancel: status cancelled, number kept, lines freed, P0 audit row with the payable', async () => {
    const p = fakePorts();
    const b = await issue(p, issueReq());
    const c = await cancel(p, { ...base, billId: b.billId, reason: 'service charge removed' });
    expect(c).toMatchObject({ status: 'cancelled', number: '0417', cancelled: { by: 'm1', reason: 'service charge removed' } });
    expect([...p.lines.values()].every(l => l.billId === null)).toBe(true);
    expect([...p.audits.values()][0]).toMatchObject({ action: 'cancelBill', sev: 'P0', amount: 60900, billId: b.billId });
    expect((await issue(p, issueReq())).number).toBe('0418');
  });
  it('BL-S9 cancel needs a reason and refuses a paid bill', async () => {
    const p = fakePorts();
    const b = await issue(p, issueReq());
    expect(await code(cancel(p, { ...base, billId: b.billId, reason: ' ' }))).toBe('invalid-argument');
    p.bills.set(b.billId, { ...b, status: 'paid' });
    expect(await code(cancel(p, { ...base, billId: b.billId, reason: 'x' }))).toBe('failed-precondition');
  });
  it('BL-S11 credit note: CN series 0001, original keeps paid and gains creditNotes[], credited qty moves, audit amount 8400', async () => {
    const p = fakePorts();
    const b = await issue(p, issueReq());
    p.bills.set(b.billId, { ...b, status: 'paid' });
    const n = await creditNote(p, { ...base, billId: b.billId, reason: 'coke not served', credits: [{ lineId: 'coke', qty: 1 }] });
    expect(n).toMatchObject({ series: 'CN', number: '0001', payable: -8400, creditNoteOf: { billId: b.billId, number: '0417' } });
    const o = p.bills.get(b.billId)!;
    expect(o.status).toBe('paid'); expect(o.creditNotes).toEqual([{ billId: n.billId, number: '0001', at: p.now() }]);
    expect(o.lines.find(l => l.lineId === 'coke')!.credited).toEqual({ qty: 1 });
    expect(p.counters.get('CN_2026-27')).toEqual({ next: 2 });
    expect([...p.audits.values()].find(a => (a as { action: string }).action === 'creditNote')).toMatchObject({ amount: 8400, sev: 'P0' });
    expect(await code(creditNote(p, { ...base, billId: b.billId, reason: 'again', credits: [{ lineId: 'coke', qty: 1 }] }))).toBe('failed-precondition');
  });
  it('BL-S11 a note on an unpaid bill is refused before any counter moves', async () => {
    const p = fakePorts();
    const b = await issue(p, issueReq());
    expect(await code(creditNote(p, { ...base, billId: b.billId, reason: 'x', credits: [{ lineId: 'coke', qty: 1 }] }))).toBe('failed-precondition');
    expect(p.counters.has('CN_2026-27')).toBe(false);
  });
  it('BL-S12 split moves lines to a second draft; each draft issues its own number; an issued line cannot move', async () => {
    const p = fakePorts();
    expect(await split(p, { ...base, moves: [{ lineId: 'coke', toDraftId: 'd2' }] })).toEqual({ moved: 1 });
    const a = await issue(p, issueReq());
    const b = await issue(p, issueReq({ draftId: 'd2' }));
    expect([a.number, a.payable, b.number, b.payable]).toEqual(['0417', 52500, '0418', 8400]);
    expect(await code(split(p, { ...base, moves: [{ lineId: 'coke', toDraftId: 's1' }] }))).toBe('failed-precondition');
  });
  it('get returns the bill, not-found otherwise', async () => {
    const p = fakePorts();
    const b = await issue(p, issueReq());
    expect((await get(p, { restaurantId: RID, sessionId: 's1', billId: b.billId })).number).toBe('0417');
    expect(await code(get(p, { restaurantId: RID, sessionId: 's1', billId: 'nope' }))).toBe('not-found');
  });
});

describe('app/billing settingsFrom', () => {
  it('the old charges key stays a percent: percentage 5 → pctBps 500, block food; pctBps wins when present; seller falls back to the info doc', () => {
    const s = settingsFrom({ billing: { charges: [{ type: 'SERVICE_CHARGE', percentage: 5 }, { type: 'X', pctBps: 250, taxBlockId: 'liquor' }] } }, { name: 'Meghana Foods', address: 'Residency Road' });
    expect(s.billing.charges).toEqual([{ type: 'SERVICE_CHARGE', pctBps: 500, taxBlockId: 'food' }, { type: 'X', pctBps: 250, taxBlockId: 'liquor' }]);
    expect(s.seller).toMatchObject({ name: 'Meghana Foods', address: 'Residency Road', taxId: '' });
    expect(s.invoice).toMatchObject({ series: 'A', width: 4, timezone: 'Asia/Kolkata' });
  });
  it('missing config → defaults, no charges', () => {
    expect(settingsFrom(undefined, undefined).billing).toEqual({ partRounding: 'independent', roundTo: 100, charges: [] });
  });
});

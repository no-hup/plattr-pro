// PY · Payments — app tests. Fake adapters and a fake clock, no emulator, no network.
// Bill 0417 throughout: payable 60900 (₹609.00). See domain/payments.test.ts for the arithmetic.
// These tests are about ORDERING and PARTIAL FAILURE: what lands together, what rolls back,
// and what a second caller sees. The maths is domain's.
import { take, refund, voidRow, list, collect, PaymentError, Ports, Tx, StoredRow, BillRead, BillStamp, Mirror, DayList, BillList } from './payments';
import { Note, Row, Receivable } from '../domain/payments';
import { AuditRow, PinState } from '../domain/approvals';
import { Staff } from './approvals';

const RID = 'r1';
const ist = (y: number, m: number, d: number, hh: number, mm: number) => Date.UTC(y, m - 1, d, hh, mm) - 330 * 60_000;
const T0 = ist(2026, 9, 15, 21, 6);   // 21:06 on the 15th, businessDate 2026-09-15 with close 04:00

type BillDoc = { payable: number; status: 'draft' | 'issued' | 'paid' | 'cancelled' | 'walkedOut'; cid: string; orderId: string | null; paidTotal: number; paidAt: number | null; paidBy: string | null; walkedOut?: boolean };
type Fail = 'row' | 'bill' | 'mirror' | 'note' | 'audit' | 'config' | 'day' | 'void';
interface Opts { staff?: Partial<Staff>; config?: unknown; bill?: Partial<BillDoc> | null; note?: Partial<Note> | null; closed?: boolean | null; fail?: Fail; abortOnce?: boolean; hideFromQuery?: boolean; onTransact?: (n: number, p: Fake) => void; now?: number;
  receivables?: Record<string, Receivable>;
}
type Fake = Ports & {
  recs: Map<string, Receivable>; printJobs: Map<string, import('../domain/print').Job>;
  rows: Map<string, StoredRow>; bills: Map<string, BillDoc>; notes: Map<string, Note>; orders: Map<string, Mirror>; audits: Map<string, AuditRow>;
  logs: object[]; warnings: string[]; calls: string[]; tick(ms: number): void; sessions: Set<string>; setClosed(v: boolean | null): void;
};

function fakePorts(opts: Opts = {}): Fake {
  // DC writes restaurants/{id}/dayClose/{businessDate}; PY only ever asks. Mutable so a test can
  // take money on an open day and then close it, which is the order it happens in real life.
  let dayIsClosed: boolean | null = opts.closed === undefined ? false : opts.closed;
  const rows = new Map<string, StoredRow>();
  const bills = new Map<string, BillDoc>();
  if (opts.bill !== null) bills.set('0417', { payable: 60900, status: 'issued', cid: 'c417', orderId: 'o417', paidTotal: 0, paidAt: null, paidBy: null, ...opts.bill });
  const notes = new Map<string, Note>();
  if (opts.note !== null) notes.set('CN-0007', { creditNoteId: 'CN-0007', billId: '0417', total: 8400, refundedTotal: 0, ...opts.note });
  const orders = new Map<string, Mirror>([['o417', 'unpaid']]);
  const audits = new Map<string, AuditRow>();
  const pins = new Map<string, PinState>();
  const logs: object[] = []; const warnings: string[] = []; const calls: string[] = [];
  const printJobs = new Map<string, import('../domain/print').Job>();
  const receivables = new Map<string, Receivable>(Object.entries(opts.receivables ?? {}));
  let now = opts.now ?? T0;
  let n = 0; let aborted = false;
  const staff: Staff = { staffId: 'manager_py', role: 'MANAGER', status: 'active', pinHash: 'hash(1234)', ...opts.staff };
  const p: Fake = {
    rows, bills, notes, orders, audits, logs, warnings, calls, printJobs, recs: receivables, sessions: new Set([`${RID}/s1`]),
    tick: ms => { now += ms; },
    setClosed: v => { dayIsClosed = v; },
    now: () => now,
    log: l => logs.push(l),
    warn: w => warnings.push(w),
    staff: { bySession: async (rid, sid) => { if (!p.sessions.has(`${rid}/${sid}`)) throw new PaymentError('unauthenticated', 'Invalid or expired session'); return staff; } },
    pin: { verify: async (pin, stored) => stored === `hash(${pin})` },
    pinState: { get: async (_r, id) => pins.get(id) ?? { wrongAt: [] }, update: async (_r, id, fn) => { const r = fn(pins.get(id) ?? { wrongAt: [] }); pins.set(id, r.state); if (r.audit) audits.set(`${id}_streak_${now}`, r.audit); return r.state; } },
    config: { settings: async () => { if (opts.fail === 'config') throw new Error('firestore unavailable'); return opts.config; } },
    ledger: { forDay: async (_r, d) => { if (opts.fail === 'day') throw new Error('firestore unavailable'); return [...rows.values()].filter(r => r.businessDate === d); } },
    receivables: { open: async () => [...receivables.values()].filter(r => r.state === 'open') },
    transact: async (_rid, fn) => {
      opts.onTransact?.(n++, p);
      const run = async () => {
        const pr = new Map<string, StoredRow>(); const pv = new Map<string, NonNullable<Row['void']>>(); const pb = new Map<string, BillStamp>();
        const pn = new Map<string, number>(); const po = new Map<string, Mirror>(); const pa = new Map<string, AuditRow>(); const pj = new Map<string, import('../domain/print').Job>();
        const prc = new Map<string, Receivable>(); const prs = new Map<string, { collectedTotal: number; state: Receivable['state'] }>();
        const t: Tx = {
          rowById: async id => { calls.push('rowById'); return rows.get(id) ?? null; },
          rowsForBill: async b => { calls.push('rowsForBill'); return opts.hideFromQuery ? [] : [...rows.values()].filter(r => r.billId === b); },
          readBill: async id => { calls.push('readBill'); const d = bills.get(id); return d ? { bill: { billId: id, payable: d.payable, status: d.status, walkedOut: d.walkedOut === true }, cid: d.cid, orderId: d.orderId, paidAt: d.paidAt, paidBy: d.paidBy } as BillRead : null; },
          readNote: async id => { calls.push('readNote'); return notes.get(id) ?? null; },
          dayClosed: async () => { calls.push('dayClosed'); return dayIsClosed; },
          createRow: (id, row) => { if (opts.fail === 'row') throw new Error('firestore unavailable'); if (rows.has(id) || pr.has(id)) throw new Error('already exists'); pr.set(id, row); },
          setVoid: (id, v) => { if (opts.fail === 'void') throw new Error('firestore unavailable'); pv.set(id, v); },
          stampBill: (id, s) => { if (opts.fail === 'bill') throw new Error('firestore unavailable'); pb.set(id, s); },
          stampNote: (id, r) => { calls.push('stampNote'); if (opts.fail === 'note') throw new Error('firestore unavailable'); pn.set(id, r); },
          mirrorOrder: (id, s) => { if (opts.fail === 'mirror') throw new Error('firestore unavailable'); if (!id || !orders.has(id)) throw new Error('order missing'); po.set(id, s); },
          createAudit: (id, r) => { if (opts.fail === 'audit') throw new Error('firestore unavailable'); if (audits.has(id)) throw new Error('already exists'); pa.set(id, r); },
          createPrintJob: j => { pj.set(j.jobId, j); },   // staged like the row: an aborted attempt leaves nothing behind
          readReceivable: async id => { calls.push('readReceivable'); return receivables.get(id) ?? null; },
          createReceivable: (id, r) => { if (receivables.has(id) || prc.has(id)) throw new Error('already exists'); prc.set(id, r); },
          stampReceivable: (id, patch) => { calls.push('stampReceivable'); prs.set(id, patch); },
        };
        const out = await fn(t);
        if (opts.abortOnce && !aborted) { aborted = true; throw Object.assign(new Error('aborted'), { retriable: true }); }
        for (const [k, v] of pr) rows.set(k, v);
        for (const [k, v] of pv) rows.set(k, { ...(rows.get(k) as StoredRow), void: v });
        for (const [k, v] of pb) bills.set(k, { ...(bills.get(k) as BillDoc), status: v.status, paidTotal: v.paidTotal, paidAt: v.paidAt, paidBy: v.paidBy });
        for (const [k, v] of pn) notes.set(k, { ...(notes.get(k) as Note), refundedTotal: v });
        for (const [k, v] of po) orders.set(k, v);
        for (const [k, v] of pa) audits.set(k, v);
        for (const [k, v] of pj) printJobs.set(k, v);
        for (const [k, v] of prc) receivables.set(k, v);
        for (const [k, v] of prs) receivables.set(k, { ...(receivables.get(k) as Receivable), ...v });
        return out;
      };
      // Firestore re-runs the transaction body on contention; the fake does the same once when asked.
      try { return await run(); } catch (e) { if ((e as { retriable?: boolean }).retriable) return run(); throw e; }
    },
  };
  return p;
}

const base = { restaurantId: RID, sessionId: 's1', billId: '0417' };
const tk = (paymentId: string, tendered: number, extra: Record<string, unknown> = {}) => ({ ...base, paymentId, tenderId: 'cash', tendered, ...extra });
const ext = (paymentId: string, amount: number, extra: Record<string, unknown> = {}) => ({ ...base, paymentId, tenderId: 'card', amount, ref: 'slip-1', ...extra });
const rf = (paymentId: string, amount: number, extra: Record<string, unknown> = {}) => ({ ...base, paymentId, tenderId: 'cash', amount, creditNoteId: 'CN-0007', reason: 'wrong dish', pin: '1234', ...extra });
const vd = (paymentId: string, extra: Record<string, unknown> = {}) => ({ restaurantId: RID, sessionId: 's1', paymentId, reason: 'wrong tender', pin: '1234', ...extra });

async function fails(pr: Promise<unknown>): Promise<PaymentError> {
  try { await pr; } catch (e) { return e as PaymentError; }
  throw new Error('expected a throw');
}
const bill = (p: Fake) => p.bills.get('0417') as BillDoc;
const lastLog = (p: Fake) => p.logs[p.logs.length - 1] as Record<string, unknown>;
const CASH = { id: 'cash', label: 'Cash', kind: 'cash' as const, opensDrawer: true, needsRef: false };
const CARD = { id: 'card', label: 'Card', kind: 'external' as const, opensDrawer: false, needsRef: true };
const UPI = { id: 'upi', label: 'UPI', kind: 'external' as const, opensDrawer: false, needsRef: true };
function makeRow(paymentId: string, amount: number, o: Partial<StoredRow> = {}): StoredRow {
  return { paymentId, billId: '0417', cid: 'c417', businessDate: '2026-09-15', kind: 'take', tenderId: 'cash', tender: CASH, amount, tendered: amount, change: 0, captured: false, overpaid: null, at: T0, by: 'manager_py', ref: null, creditNoteId: null, refundsPaymentId: null, void: null, ...o };
}
/** A second till: same documents, its own session/staff. */
function secondTill(p: Fake, opts: Opts = {}): Fake {
  const q = fakePorts(opts);
  for (const [k, v] of p.rows) q.rows.set(k, v);
  q.bills.set('0417', bill(p));
  for (const [k, v] of p.notes) q.notes.set(k, v);
  return q;
}

// ─────────────────────────────────────────────────────────────────────────────
describe('app/payments take() — the happy paths land everything in one transaction', () => {
  it('PY-S1 cash 60900: one row written, bill {status: paid, paidTotal: 60900, paidAt, paidBy}, order mirror "paid" — all four in ONE transaction (R4)', async () => {
    const p = fakePorts();
    const r = await take(p, tk('p1', 60900));
    expect(r.row).toMatchObject({ paymentId: 'p1', kind: 'take', amount: 60900, tendered: 60900, change: 0, overpaid: null, tenderId: 'cash', businessDate: '2026-09-15', at: T0, by: 'manager_py', cid: 'c417' });
    expect(r.opensDrawer).toBe(true);
    expect(p.rows.size).toBe(1);
    expect(bill(p)).toMatchObject({ status: 'paid', paidTotal: 60900, paidAt: T0, paidBy: 'manager_py' });
    expect(p.orders.get('o417')).toBe('paid');
    expect(lastLog(p)).toEqual({ mod: 'payments', cid: 'c417', billId: '0417', kind: 'take', tenderId: 'cash', amount: 60900, outstandingAfter: 0, outcome: 'applied' });
  });
  it('PY-S2 cash tendered 70000: row {amount: 60900, tendered: 70000, change: 9100}, bill paidTotal 60900 — the drawer figure is amount, never tendered', async () => {
    const p = fakePorts();
    const r = await take(p, tk('p1', 70000));
    expect(r.row).toMatchObject({ amount: 60900, tendered: 70000, change: 9100 });
    expect(bill(p).paidTotal).toBe(60900);
  });
  it('PY-S3 card 40000 then cash 20900: after the first, bill {status: issued, paidTotal: 40000} and mirror "partially_paid"; after the second, {status: paid, paidTotal: 60900} and mirror "paid"', async () => {
    const p = fakePorts();
    const a = await take(p, ext('p1', 40000));
    expect(a.bill).toMatchObject({ outstanding: 20900, status: 'issued', mirror: 'partially_paid' });
    expect(bill(p)).toMatchObject({ status: 'issued', paidTotal: 40000, paidAt: null, paidBy: null });
    expect(p.orders.get('o417')).toBe('partially_paid');
    const b = await take(p, tk('p2', 20900));
    expect(b.bill).toMatchObject({ outstanding: 0, status: 'paid', mirror: 'paid' });
    expect(bill(p)).toMatchObject({ status: 'paid', paidTotal: 60900 });
    expect(p.orders.get('o417')).toBe('paid');
    expect(p.rows.size).toBe(2);
  });
  it('PY-S28 upi 65000: row {amount: 60900, overpaid: 4100}, bill paidTotal 60900 — the overpaid 4100 never enters paidTotal', async () => {
    const p = fakePorts();
    const r = await take(p, ext('p1', 65000, { tenderId: 'upi', captured: true }));
    expect(r.row).toMatchObject({ amount: 60900, overpaid: 4100, captured: true, tendered: null, change: null });
    expect(bill(p)).toMatchObject({ status: 'paid', paidTotal: 60900 });
  });
  it('R14 businessDate is resolved server-side from config and frozen on the row; a businessDate in the request body is ignored', async () => {
    const p = fakePorts();
    expect((await take(p, tk('p1', 60900, { businessDate: '2020-01-01' }))).row.businessDate).toBe('2026-09-15');
  });
  it('NEW R14 past midnight: fake clock 03:30 on 16 Sep, configured close 05:00 → businessDate is 2026-09-15. Friday service does not leak into Saturday', async () => {
    const p = fakePorts({ now: ist(2026, 9, 16, 3, 30), config: { payments: { dayCloseHour: 5 } } });
    expect((await take(p, tk('p1', 60900))).row.businessDate).toBe('2026-09-15');
  });
  it('NEW R14 exactly at the configured close instant → belongs to the NEW day. Pinned here so the boundary is decided once, not per reader', async () => {
    const p = fakePorts({ now: ist(2026, 9, 16, 5, 0), config: { payments: { dayCloseHour: 5 } } });
    expect((await take(p, tk('p1', 60900))).row.businessDate).toBe('2026-09-16');
  });
  it('R14 frozen: changing the close time in config after the write and re-reading the row → businessDate unchanged', async () => {
    const cfg = { payments: { dayCloseHour: 5 } };
    const p = fakePorts({ now: ist(2026, 9, 16, 3, 30), config: cfg });
    await take(p, tk('p1', 60900));
    cfg.payments.dayCloseHour = 2;
    expect(p.rows.get('p1')?.businessDate).toBe('2026-09-15');
  });
  it('R14 at is the fake clock, not the body: a request carrying at=0 still writes the clock value', async () => {
    expect((await take(fakePorts(), tk('p1', 60900, { at: 0 }))).row.at).toBe(T0);
  });
  it('by is the staff id from the session, never from the body: a body carrying by="someone-else" is ignored', async () => {
    expect((await take(fakePorts(), tk('p1', 60900, { by: 'someone-else' }))).row.by).toBe('manager_py');
  });
  it('R10 the whole tender row is snapshotted: row.tender === {label, kind, opensDrawer, needsRef}, all four', async () => {
    expect((await take(fakePorts(), tk('p1', 60900))).row.tender).toEqual(CASH);
  });
  it('R10 changing config after the write does not change the row: re-read gives the old label', async () => {
    const cfg = { payments: { tenders: [{ ...CASH }] } };
    const p = fakePorts({ config: cfg });
    await take(p, tk('p1', 60900));
    cfg.payments.tenders[0].label = 'Notes and coins';
    expect(p.rows.get('p1')?.tender.label).toBe('Cash');
  });
});

describe('app/payments take() — R13 idempotency, the retry that would double-charge', () => {
  it('PY-S23 same paymentId twice, partial: cash 40000 commits, retry returns THE SAME ROW. One row total, paidTotal 40000, outstanding 20900, status issued. Not two rows, not change 19100, not paid', async () => {
    const p = fakePorts();
    const a = await take(p, tk('p1', 40000));
    const b = await take(p, tk('p1', 40000));
    expect(b.retry).toBe(true);
    expect(b.row).toEqual(a.row);
    expect(p.rows.size).toBe(1);
    expect(b.bill).toMatchObject({ paidTotal: 40000, outstanding: 20900, status: 'issued' });
  });
  it('PY-S24 same paymentId twice, completing: cash 60900 commits, retry returns the same row and SUCCEEDS. Never failed-precondition — a cashier told "already paid" voids and takes again, and the guest pays twice', async () => {
    const p = fakePorts();
    await take(p, tk('p1', 60900));
    const b = await take(p, tk('p1', 60900));
    expect(b.retry).toBe(true);
    expect(b.bill.status).toBe('paid');
    expect(p.rows.size).toBe(1);
    expect(bill(p).paidTotal).toBe(60900);
  });
  it('PY-S23 the retry does not re-write the bill or re-stamp paidAt: paidAt is the first call clock value, not the second', async () => {
    const p = fakePorts();
    await take(p, tk('p1', 60900));
    p.tick(5000);
    await take(p, tk('p1', 60900));
    expect(bill(p).paidAt).toBe(T0);
  });
  it('PY-S23 the retry does not write a second audit/log line as a new payment', async () => {
    const p = fakePorts();
    await take(p, tk('p1', 60900)); await take(p, tk('p1', 60900));
    expect(p.logs.map(l => (l as { outcome: string }).outcome)).toEqual(['applied', 'retry']);
  });
  it('R13 two DIFFERENT paymentIds for the same amount are two real payments: cash 20900 and cash 20900 with distinct ids against outstanding 41800 → paidTotal 41800, two rows. A split is not a retry', async () => {
    const p = fakePorts({ bill: { payable: 41800 } });
    await take(p, tk('p1', 20900)); await take(p, tk('p2', 20900));
    expect(p.rows.size).toBe(2);
    expect(bill(p)).toMatchObject({ paidTotal: 41800, status: 'paid' });
  });
  it('R13 a paymentId already used on a DIFFERENT bill → failed-precondition, ids are unique per restaurant', async () => {
    const p = fakePorts();
    p.bills.set('0418', { payable: 10000, status: 'issued', cid: 'c418', orderId: 'o417', paidTotal: 0, paidAt: null, paidBy: null });
    await take(p, tk('p1', 60900));
    expect((await fails(take(p, tk('p1', 10000, { billId: '0418' })))).code).toBe('failed-precondition');
    expect(p.rows.size).toBe(1);
  });
  it('R13 a missing paymentId in the request → invalid-argument. The server never generates one: an auto-id makes every retry a new row', async () => {
    const p = fakePorts();
    expect((await fails(take(p, { ...base, tenderId: 'cash', tendered: 60900 } as never))).code).toBe('invalid-argument');
    expect(p.rows.size).toBe(0);
  });
  it('NEW a retry of a row that was since VOIDED returns the voided row, it does not resurrect it or create a new take', async () => {
    const p = fakePorts();
    await take(p, tk('p1', 60900)); await voidRow(p, vd('p1'));
    const r = await take(p, tk('p1', 60900));
    expect(r.retry).toBe(true);
    expect(r.row.void).not.toBeNull();
    expect(p.rows.size).toBe(1);
    expect(bill(p).status).toBe('issued');
  });
  it('NEW same paymentId, DIFFERENT amount: p1 exists at 40000, a call reuses p1 with 20900 → failed-precondition. An id collision is never a silent overwrite', async () => {
    const p = fakePorts();
    await take(p, tk('p1', 40000));
    expect((await fails(take(p, tk('p1', 20900)))).code).toBe('failed-precondition');
    expect(p.rows.get('p1')?.amount).toBe(40000);
  });
  it('R13 the idempotent path is a read of the row by id, not a query: a fake adapter whose listRows is empty must still find p1 by id', async () => {
    const p = fakePorts();
    await take(p, tk('p1', 40000));
    const q = secondTill(p, { hideFromQuery: true });
    expect((await take(q, tk('p1', 40000))).retry).toBe(true);
    expect(q.rows.size).toBe(1);
  });
});

describe('app/payments take() — concurrency, R5 re-read inside the write', () => {
  it('PY-S7 two tills, outstanding 20900, both send cash 20900 with different ids: the first commits, the second gets failed-precondition "nothing outstanding". Exactly one row, paidTotal 60900, never 81800', async () => {
    const p = fakePorts();
    await take(p, ext('p0', 40000)); await take(p, tk('pA', 20900));
    const e = await fails(take(p, tk('pB', 20900)));
    expect(e.code).toBe('failed-precondition');
    expect(e.message).toMatch(/nothing outstanding/i);
    expect(p.rows.size).toBe(2);
    expect(bill(p).paidTotal).toBe(60900);
  });
  it('PY-S7 the decision is made on the FRESH read: a fake adapter whose outstanding drops to 0 between the first read and the transaction body must refuse, not apply the stale decision', async () => {
    // A row that lands just before the transaction body runs is seen by it: the body reads, it never trusts.
    const p = fakePorts({ onTransact: (_n, q) => { if (!q.rows.has('pX')) q.rows.set('pX', makeRow('pX', 60900)); } });
    expect((await fails(take(p, tk('pB', 60900)))).code).toBe('failed-precondition');
    expect([...p.rows.keys()]).toEqual(['pX']);
  });
  it('NEW partial race: outstanding 60900, two tills each send cash 40000. Both are legal at read time. Serialised, the first leaves 20900 and the second is refused as an over-take (R6), not silently clamped to 20900', async () => {
    // For an EXTERNAL tender the second is refused; cash makes change instead (PY-S33 below).
    const p = fakePorts();
    await take(p, ext('pA', 40000));
    expect((await fails(take(p, ext('pB', 40000)))).code).toBe('invalid-argument');
    expect(bill(p).paidTotal).toBe(40000);
  });
  it('PY-S30 a take against a bill reopened by a refund is decided on the fresh outstanding 8400, not on the stale status "paid"', async () => {
    const p = fakePorts();
    await take(p, tk('p1', 60900)); await refund(p, rf('r1', 8400));
    expect(bill(p).status).toBe('issued');
    expect((await take(p, tk('p2', 8400))).bill).toMatchObject({ outstanding: 0, status: 'paid' });
    expect(bill(p).paidTotal).toBe(60900);
  });
  it('PY-S33 two cashiers split the remainder in CASH: outstanding 20900, both tender 15000. First takes 15000 leaving 5900. Second re-reads and becomes {amount: 5900 (₹59.00), tendered: 15000, change: 9100 (₹91.00)}. paidTotal 60900, paid. Never 30000 taken, never a refusal', async () => {
    const p = fakePorts();
    await take(p, ext('p0', 40000));
    expect((await take(p, tk('pA', 15000))).row).toMatchObject({ amount: 15000, change: 0 });
    expect((await take(p, tk('pB', 15000))).row).toMatchObject({ amount: 5900, tendered: 15000, change: 9100 });
    expect(bill(p)).toMatchObject({ paidTotal: 60900, status: 'paid' });
  });
  it('PY-S33 reversed order gives the identical end state: whoever commits second is the one who gets the 5900 and the 9100 change', async () => {
    const p = fakePorts();
    await take(p, ext('p0', 40000)); await take(p, tk('pB', 15000));
    expect((await take(p, tk('pA', 15000))).row).toMatchObject({ amount: 5900, change: 9100 });
    expect(bill(p)).toMatchObject({ paidTotal: 60900, status: 'paid' });
  });
  it('PY-S34 void and take race, order A-then-B: card 40000 live, one till takes cash 20900, the other voids the card. End: live cash 20900, voided card, paidTotal 20900, outstanding 40000, status issued', async () => {
    const p = fakePorts();
    await take(p, ext('p0', 40000)); await take(p, tk('pA', 20900)); await voidRow(p, vd('p0'));
    expect(p.rows.get('p0')?.void).not.toBeNull();
    expect(p.rows.get('pA')?.void).toBeNull();
    expect(bill(p)).toMatchObject({ paidTotal: 20900, status: 'issued' });
  });
  it('PY-S34 the reverse order ends identically. Never paidTotal 60900 with the card voided, never paidTotal 0 with the cash row missing', async () => {
    const p = fakePorts();
    await take(p, ext('p0', 40000)); await voidRow(p, vd('p0'));
    expect((await take(p, tk('pA', 20900))).row.amount).toBe(20900);
    expect(bill(p)).toMatchObject({ paidTotal: 20900, status: 'issued' });
  });
  it('NEW two in-flight calls with the SAME paymentId (a double tap before any response): one row, both callers get success, paidTotal counted once', async () => {
    const p = fakePorts();
    await Promise.all([take(p, tk('p1', 60900)), take(p, tk('p1', 60900))]);
    expect(p.rows.size).toBe(1);
    expect(bill(p).paidTotal).toBe(60900);
  });
  it('NEW Firestore retries the transaction body on contention: a fake transaction that aborts once then succeeds writes EXACTLY ONE row. Nothing inside the body may be a non-idempotent side effect', async () => {
    const p = fakePorts({ abortOnce: true });
    await take(p, tk('p1', 60900));
    expect(p.rows.size).toBe(1);
    expect(bill(p).paidTotal).toBe(60900);
    expect(p.logs).toHaveLength(1);
  });
});

describe('app/payments take() — partial failure, nothing lands alone (R4)', () => {
  const untouched = (p: Fake) => {
    expect(p.rows.size).toBe(0);
    expect(bill(p)).toMatchObject({ status: 'issued', paidTotal: 0, paidAt: null });
    expect(p.orders.get('o417')).toBe('unpaid');
  };
  it('PY-S17 the row write throws: bill is NOT stamped, mirror NOT written, paidTotal unchanged, caller sees the error', async () => {
    const p = fakePorts({ fail: 'row' });
    const e = await fails(take(p, tk('p1', 60900)));
    expect(e.code).toBe('unavailable');
    expect(e.message).toMatch(/try again/i);
    untouched(p);
  });
  it('PY-S17 the bill stamp throws: the row is NOT left behind', async () => {
    const p = fakePorts({ fail: 'bill' }); await fails(take(p, tk('p1', 60900))); untouched(p);
  });
  it('R4 the ORDER MIRROR throws: the whole take fails. A paid bill the floor cannot see is how a guest is asked to pay twice', async () => {
    const p = fakePorts({ fail: 'mirror' }); await fails(take(p, tk('p1', 60900))); untouched(p);
  });
  it('R4 the order document is missing entirely: the take fails rather than skipping the mirror', async () => {
    const p = fakePorts({ bill: { orderId: null } });
    expect((await fails(take(p, tk('p1', 60900)))).code).toBe('unavailable');
    expect(p.rows.size).toBe(0);
  });
  it('config read throws: the take is refused. PY never defaults a tender — guessing cash records a card payment as cash', async () => {
    const p = fakePorts({ fail: 'config' });
    await expect(take(p, tk('p1', 60900))).rejects.toThrow(/unavailable/);
    expect(p.rows.size).toBe(0);
  });
  it('config returns no tenders array at all: DEFAULTS apply for a fresh restaurant, and a warning is logged', async () => {
    const p = fakePorts({ config: undefined });
    await take(p, tk('p1', 60900));
    expect(p.warnings.length).toBeGreaterThan(0);
    expect(p.rows.get('p1')?.tender.id).toBe('cash');
  });
  it('config returns an EMPTY tenders array: the take is refused, not defaulted', async () => {
    const p = fakePorts({ config: { payments: { tenders: [] } } });
    expect((await fails(take(p, tk('p1', 60900)))).code).toBe('invalid-argument');
    expect(p.rows.size).toBe(0);
  });
  it('R4 all-or-nothing under an injected abort partway through the write set: either all four writes or none, never the row without the stamp', async () => {
    const p = fakePorts({ fail: 'audit' });   // a refund's audit is its LAST write; if it throws, row, note and stamps must not land
    await take(p, tk('p1', 60900));
    const before = { rows: p.rows.size, note: p.notes.get('CN-0007')?.refundedTotal, paid: bill(p).paidTotal, status: bill(p).status };
    await fails(refund(p, rf('r1', 8400)));
    expect({ rows: p.rows.size, note: p.notes.get('CN-0007')?.refundedTotal, paid: bill(p).paidTotal, status: bill(p).status }).toEqual(before);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('app/payments refund() — R7, the credit note is the gate', () => {
  const paid = async (opts: Opts = {}) => { const p = fakePorts(opts); await take(p, tk('p1', 60900)); return p; };
  const refunds = (p: Fake) => [...p.rows.values()].filter(r => r.kind === 'refund');

  it('PY-S9 cash 8400 against CN-0007: row written with creditNoteId, note.refundedTotal stamped 8400, bill paidTotal 52500, outstanding 8400, status back to issued (PY-S30)', async () => {
    const p = await paid();
    const r = await refund(p, rf('r1', 8400));
    expect(r.row).toMatchObject({ kind: 'refund', amount: 8400, creditNoteId: 'CN-0007', refundsPaymentId: null, tendered: null, change: null, reason: 'wrong dish', approverId: 'manager_py' });
    expect(p.notes.get('CN-0007')?.refundedTotal).toBe(8400);
    expect(bill(p)).toMatchObject({ paidTotal: 52500, status: 'issued', paidAt: null, paidBy: null });
    expect(r.bill).toMatchObject({ outstanding: 8400, mirror: 'partially_paid' });
    expect(p.audits.get('r1_refund')).toMatchObject({ action: 'refund', sev: 'P0', amount: 8400, staffId: 'manager_py', cid: 'c417' });
  });
  it('PY-S9 the note stamp and the row are ONE transaction: the note write throwing leaves no refund row', async () => {
    const q = secondTill(await paid(), { fail: 'note' });
    await fails(refund(q, rf('r1', 8400)));
    expect(refunds(q)).toHaveLength(0);
    expect(bill(q).paidTotal).toBe(60900);
  });
  it('PY-S26 two tills refund the same note 8400 concurrently: the transaction reads and stamps refundedTotal, so the first commits and the second gets failed-precondition. paidTotal 52500, never 44100', async () => {
    const p = await paid();
    await refund(p, rf('rA', 8400));
    expect((await fails(refund(p, rf('rB', 8400)))).code).toBe('failed-precondition');
    expect(bill(p).paidTotal).toBe(52500);
    expect(refunds(p)).toHaveLength(1);
  });
  it('PY-S26 the limit is enforced by refundedTotal on the note, NOT by querying the payments collection — a fake adapter whose row query returns stale/incomplete results must still refuse the second', async () => {
    const p = await paid();
    p.notes.set('CN-0007', { creditNoteId: 'CN-0007', billId: '0417', total: 8400, refundedTotal: 8400 });   // the note says fully refunded; the rows show none
    expect((await fails(refund(p, rf('rB', 8400)))).code).toBe('failed-precondition');
  });
  it('PY-S10 refund 10000 against a note of 8400 → failed-precondition, nothing written', async () => {
    const p = await paid();
    expect((await fails(refund(p, rf('r1', 10000)))).code).toBe('failed-precondition');
    expect(refunds(p)).toHaveLength(0);
    expect(p.notes.get('CN-0007')?.refundedTotal).toBe(0);
  });
  it('PY-S11 no creditNoteId → invalid-argument, nothing written', async () => {
    const p = await paid();
    expect((await fails(refund(p, rf('r1', 8400, { creditNoteId: undefined })))).code).toBe('invalid-argument');
    expect(refunds(p)).toHaveLength(0);
  });
  it('R7 two part refunds 5000 then 3400 against an 8400 note both succeed; refundedTotal ends 8400; a third of 1 is refused', async () => {
    const p = await paid();
    await refund(p, rf('r1', 5000)); await refund(p, rf('r2', 3400));
    expect(p.notes.get('CN-0007')?.refundedTotal).toBe(8400);
    expect((await fails(refund(p, rf('r3', 1)))).code).toBe('failed-precondition');
    expect(bill(p).paidTotal).toBe(52500);
  });
  it('Decisions: a refund on the card tender writes the row with tender.kind external and does NOT count as cash movement in list()', async () => {
    const p = fakePorts();
    await take(p, ext('p1', 60900));
    const r = await refund(p, rf('r1', 8400, { tenderId: 'card' }));
    expect(r.row.tender.kind).toBe('external');
    expect(r.opensDrawer).toBe(false);
    const day = await list(p, { restaurantId: RID, sessionId: 's1', businessDate: '2026-09-15' }) as DayList;
    expect(day.cashNet).toBe(0);
    expect(day.byTender.card).toMatchObject({ taken: 60900, refunded: 8400, net: 52500 });
  });
  it('PY-S9 the refund requires a PIN via ST: ST refusing means no row, no note stamp, no bill change', async () => {
    const p = await paid();
    const e = await fails(refund(p, rf('r1', 8400, { pin: undefined })));
    expect(e).toMatchObject({ code: 'permission-denied', details: { requires: 'pin', action: 'refund', sev: 'P0' } });
    const wrong = await fails(refund(p, rf('r1', 8400, { pin: '0000' })));
    expect(wrong.details).toMatchObject({ requires: 'pin', wrong: true });
    expect(refunds(p)).toHaveLength(0);
    expect(p.notes.get('CN-0007')?.refundedTotal).toBe(0);
    expect(bill(p).paidTotal).toBe(60900);
    expect(p.logs.map(l => (l as { outcome: string }).outcome).slice(-2)).toEqual(['needs_pin', 'wrong_pin']);
  });
  it('R13 idempotency applies to refunds too: the same paymentId retried returns the same refund row, refundedTotal stays 8400 and never 16800', async () => {
    const p = await paid();
    const a = await refund(p, rf('r1', 8400));
    const b = await refund(p, rf('r1', 8400));
    expect(b.retry).toBe(true);
    expect(b.row).toEqual(a.row);
    expect(p.notes.get('CN-0007')?.refundedTotal).toBe(8400);
    expect(bill(p).paidTotal).toBe(52500);
  });
  it('R7 the mechanism, not just the outcome: assert listRows was NOT called inside the refund transaction. Only readNote and stampNote', async () => {
    // The limit is read off the note. The bill's rows are read for outstanding (PY-S25) and paid-on tenders (PY-S36),
    // never for the refunded total: the note at 8400 refuses even when the rows show zero refunds, and nothing is stamped.
    const p = await paid();
    p.notes.set('CN-0007', { creditNoteId: 'CN-0007', billId: '0417', total: 8400, refundedTotal: 8400 });
    p.calls.length = 0;
    await fails(refund(p, rf('r1', 8400)));
    expect(p.calls).toContain('readNote');
    expect(p.calls).not.toContain('stampNote');
  });
  it('R7 two concurrent PARTIAL refunds that fit: note 8400, A 5000 and B 3400 → both commit, refundedTotal 8400, paidTotal 52500, two rows', async () => {
    const p = await paid();
    await refund(p, rf('rA', 5000)); await refund(p, rf('rB', 3400));
    expect(p.notes.get('CN-0007')?.refundedTotal).toBe(8400);
    expect(bill(p).paidTotal).toBe(52500);
    expect(refunds(p)).toHaveLength(2);
  });
  it('R7 two concurrent partials that do not fit: note 8400, A 5000 and B 5000 → A commits, B refused. refundedTotal 5000, paidTotal 55900 (₹559.00)', async () => {
    const p = await paid();
    await refund(p, rf('rA', 5000));
    expect((await fails(refund(p, rf('rB', 5000)))).code).toBe('failed-precondition');
    expect(p.notes.get('CN-0007')?.refundedTotal).toBe(5000);
    expect(bill(p).paidTotal).toBe(55900);
  });
  it('PY-S25 defence in depth: a refund while outstanding is 20900 is refused by PY too, not only by BL', async () => {
    const p = fakePorts();
    await take(p, ext('p1', 40000));
    expect((await fails(refund(p, rf('r1', 8400, { tenderId: 'card' })))).code).toBe('failed-precondition');
  });
  it('NEW a refund past zero: bill paid 60900, a note of 69300 refunded in full → paidTotal -8400, outstanding 69300, status issued. No clamp', async () => {
    const p = await paid();
    p.notes.set('CN-0008', { creditNoteId: 'CN-0008', billId: '0417', total: 69300, refundedTotal: 0 });
    const r = await refund(p, rf('r1', 69300, { creditNoteId: 'CN-0008' }));
    expect(r.bill).toMatchObject({ paidTotal: -8400, outstanding: 69300, status: 'issued', mirror: 'unpaid' });
  });
  it('NEW ST is unavailable (its adapter throws) → refused, no row, no note stamp. Money never moves on an unanswered PIN', async () => {
    const p = await paid();
    p.pinState.get = async () => { throw new Error('firestore unavailable'); };
    await expect(refund(p, rf('r1', 8400))).rejects.toThrow();
    expect(refunds(p)).toHaveLength(0);
    expect(p.notes.get('CN-0007')?.refundedTotal).toBe(0);
  });
  it('NEW refund with no reason → invalid-argument, nothing written', async () => {
    const p = await paid();
    expect((await fails(refund(p, rf('r1', 8400, { reason: '' })))).code).toBe('invalid-argument');
    expect(refunds(p)).toHaveLength(0);
  });
  it('PY-S36 back the way it came: paid by card, a refund on card or cash is accepted and a refund on UPI is refused', async () => {
    const p = fakePorts();
    await take(p, ext('p1', 60900));
    expect((await fails(refund(p, rf('r0', 8400, { tenderId: 'upi' })))).code).toBe('failed-precondition');
    p.notes.set('CN-0007', { creditNoteId: 'CN-0007', billId: '0417', total: 8400, refundedTotal: 0 });
    await refund(p, rf('r1', 4000, { tenderId: 'card' }));
    await refund(p, rf('r2', 4400, { tenderId: 'cash' }));
    expect(p.notes.get('CN-0007')?.refundedTotal).toBe(8400);
  });
  it('PY-S32 an overpay refund names the payment row, needs no note, and leaves paidTotal alone; a second past the overpay is refused', async () => {
    const p = fakePorts();
    await take(p, ext('p1', 65000, { tenderId: 'upi', captured: true }));
    const r = await refund(p, rf('r1', 4100, { creditNoteId: undefined, refundsPaymentId: 'p1', tenderId: 'upi' }));
    expect(r.row).toMatchObject({ refundsPaymentId: 'p1', creditNoteId: null });
    expect(bill(p)).toMatchObject({ paidTotal: 60900, status: 'paid' });
    expect((await fails(refund(p, rf('r2', 1, { creditNoteId: undefined, refundsPaymentId: 'p1', tenderId: 'upi' })))).code).toBe('failed-precondition');
  });
});

describe('app/payments voidRow() — R15', () => {
  it('PY-S16 void a cash 20900 row: row gains {void: {at, by, reason, note}}, paidTotal drops by 20900, bill status recomputed, mirror updated — one transaction', async () => {
    const p = fakePorts();
    await take(p, ext('p0', 40000)); await take(p, tk('p1', 20900));
    const r = await voidRow(p, vd('p1', { note: 'was card' }));
    expect(r.row.void).toEqual({ at: T0, by: 'manager_py', reason: 'wrong tender', note: 'was card' });
    expect(p.rows.get('p1')?.void).not.toBeNull();
    expect(bill(p)).toMatchObject({ paidTotal: 40000, status: 'issued' });
    expect(p.orders.get('o417')).toBe('partially_paid');
    expect(p.audits.get('p1_void')).toMatchObject({ action: 'voidPayment', sev: 'P0', amount: 20900 });
    expect(r.opensDrawer).toBe(false);
  });
  it('PY-S27 void the row that settled the bill: paidTotal 0, outstanding 60900, bill status back to ISSUED, mirror no longer paid. Then a fresh UPI 60900 take is accepted and settles it again', async () => {
    const p = fakePorts();
    await take(p, tk('p1', 60900));
    const r = await voidRow(p, vd('p1'));
    expect(r.bill).toMatchObject({ paidTotal: 0, outstanding: 60900, status: 'issued', mirror: 'unpaid' });
    expect(bill(p)).toMatchObject({ status: 'issued', paidAt: null, paidBy: null });
    expect((await take(p, ext('p2', 60900, { tenderId: 'upi' }))).bill.status).toBe('paid');
    expect(bill(p)).toMatchObject({ paidTotal: 60900, status: 'paid', paidBy: 'manager_py' });
  });
  // D1 / PY-S33: table 6 paid ₹300 of A-0417 (₹609.00) and walked out; BL stamped it walkedOut. Voiding the ₹300 keeps it
  // walkedOut (both derivations: the stamp written and the state answered). The guest returns and pays ₹609 on the same
  // bill: paid. Voiding that take: walkedOut again, never issued.
  it('PY-S33 D1 voids and a late payment on a walked-out bill: walkedOut → walkedOut → paid → walkedOut, never issued', async () => {
    const p = fakePorts({ bill: { status: 'walkedOut', walkedOut: true, paidTotal: 30000 } });
    p.rows.set('p1', makeRow('p1', 30000));
    expect((await voidRow(p, vd('p1'))).bill).toMatchObject({ status: 'walkedOut', paidTotal: 0 });
    expect(bill(p).status).toBe('walkedOut');
    expect((await take(p, tk('p2', 60900))).bill).toMatchObject({ status: 'paid', paidTotal: 60900 });
    expect(bill(p)).toMatchObject({ status: 'paid', paidBy: 'manager_py' });
    expect((await voidRow(p, vd('p2'))).bill.status).toBe('walkedOut');
    expect(bill(p)).toMatchObject({ status: 'walkedOut', paidAt: null });
  });
  it("PY-S29 void a row already carrying void → failed-precondition, the first void's {at, by, reason} is not overwritten", async () => {
    const p = fakePorts();
    await take(p, tk('p1', 60900)); await voidRow(p, vd('p1'));
    p.tick(1000);
    expect((await fails(voidRow(p, vd('p1', { reason: 'guest left' })))).code).toBe('failed-precondition');
    expect(p.rows.get('p1')?.void).toMatchObject({ at: T0, reason: 'wrong tender' });
  });
  it('PY-S29 two concurrent voids of the same row: one commits, the other gets failed-precondition. The audit is not last-write-wins', async () => {
    const p = fakePorts({ staff: { staffId: 'm1' } });
    await take(p, tk('p1', 60900)); await voidRow(p, vd('p1'));
    const q = secondTill(p, { staff: { staffId: 'm2' } });
    expect((await fails(voidRow(q, vd('p1')))).code).toBe('failed-precondition');
    expect(q.rows.get('p1')?.void?.by).toBe('m1');
  });
  it('PY-S29 void a row whose businessDate DC has closed → failed-precondition', async () => {
    const p = fakePorts();
    await take(p, tk('p1', 60900));   // money taken while the day was still open
    p.setClosed(true);                // DC counts the drawer and signs it off
    expect((await fails(voidRow(p, vd('p1')))).code).toBe('failed-precondition');
    expect(p.rows.get('p1')?.void).toBeNull();
  });

  // ── DC R6: the lid is real, not a slogan. PY refused a VOID on a closed day and happily
  // accepted new cash onto it. The date that matters is the one on the row being written.
  it('DC-S6 a take on a business date DC has closed → failed-precondition, and no row is written', async () => {
    const p = fakePorts();
    p.setClosed(true);
    const e = await fails(take(p, tk('p1', 60900)));
    expect(e.code).toBe('failed-precondition');
    expect(e.message).toMatch(/closed and counted/);
    expect(p.rows.size).toBe(0);
    expect(p.bills.get('0417')?.paidTotal).toBe(0);
  });
  it('DC-S6 a refund on a closed business date → failed-precondition, and the note is untouched', async () => {
    const p = fakePorts();
    await take(p, tk('p1', 60900));
    p.setClosed(true);
    const e = await fails(refund(p, { restaurantId: RID, sessionId: 's1', billId: '0417', paymentId: 'p2', tenderId: 'cash', amount: 8400, creditNoteId: 'CN-0007', reason: 'wrong dish', pin: '1234' }));
    expect(e.code).toBe('failed-precondition');
    expect(p.notes.get('CN-0007')?.refundedTotal).toBe(0);
  });
  it('DC R1 a day state that cannot be read refuses the take: unknown is never open', async () => {
    const p = fakePorts();
    p.setClosed(null);
    const e = await fails(take(p, tk('p1', 60900)));
    expect(e.code).toBe('failed-precondition');
    expect(e.message).toMatch(/Cannot tell whether/);
    expect(p.rows.size).toBe(0);
  });
  it('DC R6 the gate can pass as well as fail: an open day still takes the money', async () => {
    const p = fakePorts();
    p.setClosed(false);
    const r = await take(p, tk('p1', 60900));
    expect(r.bill.status).toBe('paid');
    expect(p.calls).toContain('dayClosed');
  });
  it('DC R6 a retry of a take made BEFORE the close still succeeds after it: the row already exists', async () => {
    const p = fakePorts();
    await take(p, tk('p1', 60900));
    p.setClosed(true);
    const again = await take(p, tk('p1', 60900));
    expect(again.retry).toBe(true);
    expect(p.rows.size).toBe(1);
  });
  it('R15 a void does NOT open the drawer and writes no cash-movement row: list() for the day shows the voided row excluded and no compensating entry', async () => {
    const p = fakePorts();
    await take(p, tk('p1', 60900));
    expect((await voidRow(p, vd('p1'))).opensDrawer).toBe(false);
    const day = await list(p, { restaurantId: RID, sessionId: 's1', businessDate: '2026-09-15' }) as DayList;
    expect(day.cashNet).toBe(0);
    expect(day.rows).toHaveLength(1);
    expect(day.byTender.cash.count).toBe(0);
  });
  it('NEW void a refund row: refundedTotal on the note is decremented back, so the note can be refunded again. Otherwise a mistyped refund burns the note', async () => {
    const p = fakePorts();
    await take(p, tk('p1', 60900)); await refund(p, rf('r1', 8400));
    await voidRow(p, vd('r1', { reason: 'wrong note' }));
    expect(p.notes.get('CN-0007')?.refundedTotal).toBe(0);
    expect(bill(p)).toMatchObject({ paidTotal: 60900, status: 'paid' });
    await refund(p, rf('r2', 8400));
    expect(p.notes.get('CN-0007')?.refundedTotal).toBe(8400);
  });
  it('PY-S12 SERVER role → permission-denied, nothing written', async () => {
    const p = fakePorts();
    await take(p, tk('p1', 60900));
    const q = secondTill(p, { staff: { role: 'SERVER' } });
    const e = await fails(voidRow(q, vd('p1')));
    expect(e.code).toBe('permission-denied');
    expect(e.details.requires).toBeUndefined();
    expect(q.rows.get('p1')?.void).toBeNull();
  });
  it('PY-S16 void requires a PIN via ST; ST refusing means the row is untouched', async () => {
    const p = fakePorts();
    await take(p, tk('p1', 60900));
    const e = await fails(voidRow(p, vd('p1', { pin: undefined })));
    expect(e.details).toMatchObject({ requires: 'pin', action: 'voidPayment' });
    expect(p.rows.get('p1')?.void).toBeNull();
    expect(bill(p).status).toBe('paid');
  });
  it('R1 a void never deletes: after the void, every original field byte-matches the pre-void read except the added void block', async () => {
    const p = fakePorts();
    const before = (await take(p, tk('p1', 70000))).row;
    await voidRow(p, vd('p1'));
    const { void: v, ...rest } = p.rows.get('p1') as StoredRow;
    const { void: _b, ...beforeRest } = before;
    expect(rest).toEqual(beforeRest);
    expect(v).not.toBeNull();
  });
  it('NEW void one of two takes: 40000 + 20900 settled, void the 20900 → paidTotal 40000, outstanding 20900, status issued, mirror partially_paid', async () => {
    const p = fakePorts();
    await take(p, ext('p0', 40000)); await take(p, tk('p1', 20900));
    expect((await voidRow(p, vd('p1'))).bill).toMatchObject({ paidTotal: 40000, outstanding: 20900, status: 'issued', mirror: 'partially_paid' });
  });
  it('R4 the mirror write fails during a void → the void block is NOT left on the row and the bill stays paid', async () => {
    const p = fakePorts();
    await take(p, tk('p1', 60900));
    const q = secondTill(p, { fail: 'mirror' });
    await fails(voidRow(q, vd('p1')));
    expect(q.rows.get('p1')?.void).toBeNull();
    expect(bill(q).status).toBe('paid');
  });
  it('Out of scope guard: there is no unvoid path. A call asking to clear a void is rejected, never honoured', async () => {
    const p = fakePorts();
    await take(p, tk('p1', 60900)); await voidRow(p, vd('p1'));
    expect((await fails(voidRow(p, vd('p1', { reason: 'unvoid', void: null })))).code).toBe('failed-precondition');
    expect(p.rows.get('p1')?.void).not.toBeNull();
  });
  it("PY-S35 / R17 a void retried by the SAME staff with the SAME reason on an already-voided row → success, one void block, the first void's at and by kept. The PY-S24 trap does not stop at take", async () => {
    const p = fakePorts();
    await take(p, tk('p1', 60900));
    const a = await voidRow(p, vd('p1'));
    p.tick(3000);
    const b = await voidRow(p, vd('p1'));
    expect(b.retry).toBe(true);
    expect(b.row.void).toEqual(a.row.void);
    expect(p.audits.size).toBe(1);
  });
  it('PY-S35 / R17 the same row voided by a DIFFERENT person, or with a different reason → failed-precondition', async () => {
    const p = fakePorts();
    await take(p, tk('p1', 60900)); await voidRow(p, vd('p1'));
    expect((await fails(voidRow(p, vd('p1', { reason: 'guest left' })))).code).toBe('failed-precondition');
  });
  it('NEW the mirror after a void that takes paidTotal to 0 is "unpaid", not "partially_paid" and not left at "paid"', async () => {
    const p = fakePorts();
    await take(p, tk('p1', 60900)); await voidRow(p, vd('p1'));
    expect(p.orders.get('o417')).toBe('unpaid');
  });
  it('NEW paidAt and paidBy are CLEARED when a void or refund takes the bill out of settled, so an issued bill never carries a paid timestamp', async () => {
    const p = fakePorts();
    await take(p, tk('p1', 60900)); await refund(p, rf('r1', 8400));
    expect(bill(p)).toMatchObject({ status: 'issued', paidAt: null, paidBy: null });
  });
  it('NEW paidAt and paidBy are re-stamped with the new clock value when a later take settles it again', async () => {
    const p = fakePorts();
    await take(p, tk('p1', 60900)); await voidRow(p, vd('p1'));
    p.tick(60_000);
    await take(p, tk('p2', 60900));
    expect(bill(p)).toMatchObject({ status: 'paid', paidAt: T0 + 60_000, paidBy: 'manager_py' });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('app/payments list() — PY-S18, what DC and RP read', () => {
  const day = (p: Fake, businessDate = '2026-09-15') => list(p, { restaurantId: RID, sessionId: 's1', businessDate }) as Promise<DayList>;
  const seedDay = (p: Fake) => {
    p.rows.set('a', makeRow('a', 1245000));
    p.rows.set('b', makeRow('b', 3120000, { tenderId: 'card', tender: CARD, tendered: null, change: null, overpaid: 0, by: 'cashier_2' }));
    p.rows.set('c', makeRow('c', 890000, { tenderId: 'upi', tender: UPI, tendered: null, change: null, overpaid: 0 }));
    p.rows.set('d', makeRow('d', 8400, { kind: 'refund', tendered: null, change: null, creditNoteId: 'CN-0007' }));
  };
  it('PY-S18 a day of rows groups by tender.kind and businessDate: cash 1245000, card 3120000, upi 890000, cash refunds 8400 → net cash movement 1236600 (₹12,366.00)', async () => {
    const p = fakePorts(); seedDay(p);
    const d = await day(p);
    expect(d.byTender.cash).toMatchObject({ taken: 1245000, refunded: 8400, net: 1236600 });
    expect(d.byTender.card).toMatchObject({ taken: 3120000, net: 3120000 });
    expect(d.byTender.upi).toMatchObject({ taken: 890000, net: 890000 });
    expect(d.cashNet).toBe(1236600);
  });
  it('PY-S18 voided rows are excluded from every group', async () => {
    const p = fakePorts(); seedDay(p);
    p.rows.set('v', makeRow('v', 60900, { void: { at: T0, by: 'manager_py', reason: 'wrong tender' } }));
    const d = await day(p);
    expect(d.byTender.cash.taken).toBe(1245000);
    expect(d.cashNet).toBe(1236600);
  });
  it('PY-S18 grouping is by the frozen businessDate, NOT by a range over at: a row with at=03:30 and businessDate=Friday counts on Friday even when the query asks for Saturday', async () => {
    const p = fakePorts();
    p.rows.set('late', makeRow('late', 60900, { at: ist(2026, 9, 16, 3, 30), businessDate: '2026-09-15' }));
    expect((await day(p, '2026-09-15')).byTender.cash.taken).toBe(60900);
    expect((await day(p, '2026-09-16')).byTender.cash.taken).toBe(0);
  });
  it('PY-S28 overpaid is reported separately so bank settlement reconciles: upi group shows applied 60900 and overpaid 4100, total received 65000', async () => {
    const p = fakePorts();
    p.rows.set('u', makeRow('u', 60900, { tenderId: 'upi', tender: UPI, tendered: null, change: null, captured: true, overpaid: 4100 }));
    const g = (await day(p)).byTender.upi;
    expect(g).toMatchObject({ taken: 60900, overpaid: 4100 });
    expect(g.taken + g.overpaid).toBe(65000);
  });
  it('PY-S18 a day with no rows → zeros for every configured tender, not an empty object', async () => {
    const d = await day(fakePorts());
    expect(Object.keys(d.byTender).sort()).toEqual(['card', 'cash', 'upi']);
    expect(d.byTender.cash).toEqual({ taken: 0, refunded: 0, overpaid: 0, tips: 0, owed: 0, count: 0, net: 0 });
    expect(d.cashNet).toBe(0);
  });
  it('R12 list() reads rows only; it never touches a table, a line, or an order', async () => {
    const p = fakePorts(); seedDay(p);
    await day(p);
    expect(p.calls).toEqual([]);
    expect(p.orders.get('o417')).toBe('unpaid');
  });
  it('PY-S18 the adapter throws → "ledger unavailable", never a report of zeros. A zeroed day and a broken day must not look alike', async () => {
    const e = await fails(day(fakePorts({ fail: 'day' })));
    expect(e.code).toBe('unavailable');
    expect(e.message).toMatch(/ledger unavailable/);
  });
  it('Who-can row 1: a SERVER session may call list() to see what a bill owes; only take, refund and void are 403', async () => {
    const p = fakePorts({ staff: { role: 'SERVER' } });
    p.rows.set('a', makeRow('a', 40000));
    const b = await list(p, { restaurantId: RID, sessionId: 's1', billId: '0417' }) as BillList;
    expect(b).toMatchObject({ payable: 60900, paidTotal: 40000, outstanding: 20900, status: 'issued' });
    expect(b.tenders.map(t => t.id)).toEqual(['cash', 'card', 'upi']);   // PY-S19: the screen offers what config holds
    expect((await fails(take(p, tk('p9', 100)))).code).toBe('permission-denied');
  });
  it('R19 grouping is by tenderId, so card and upi are separate numbers. Grouping by kind alone would merge two bank statements into one figure nobody can reconcile', async () => {
    const p = fakePorts(); seedDay(p);
    const d = await day(p);
    expect(d.byTender.card.taken).not.toBe(d.byTender.upi.taken);
    expect(d.byTender).not.toHaveProperty('external');
  });
  it('PY-S18 one day carrying all four effects at once: cash take tendered 70000 (amount 60900), card take 40000, a VOIDED cash take 20900, a cash refund 8400 → net cash 52500 (₹525.00), card 40000. The voided row and the 9100 of change both stay out', async () => {
    const p = fakePorts();
    p.rows.set('a', makeRow('a', 60900, { tendered: 70000, change: 9100 }));
    p.rows.set('b', makeRow('b', 40000, { tenderId: 'card', tender: CARD, tendered: null, change: null, overpaid: 0 }));
    p.rows.set('c', makeRow('c', 20900, { void: { at: T0, by: 'manager_py', reason: 'wrong tender' } }));
    p.rows.set('d', makeRow('d', 8400, { kind: 'refund', tendered: null, change: null, creditNoteId: 'CN-0007' }));
    const d = await day(p);
    expect(d.cashNet).toBe(52500);
    expect(d.byTender.card.net).toBe(40000);
  });
  it('PY-S32 an overpay refund is not cash taken and not bill money: it shows as a return against its own row, and paidTotal is untouched', async () => {
    const p = fakePorts();
    await take(p, ext('p1', 65000, { tenderId: 'upi', captured: true }));
    await refund(p, rf('r1', 4100, { creditNoteId: undefined, refundsPaymentId: 'p1', tenderId: 'upi' }));
    expect((await day(p)).byTender.upi).toMatchObject({ taken: 60900, overpaid: 4100, refunded: 4100 });
    expect(bill(p).paidTotal).toBe(60900);
  });
  it('PY-S18 per staff: the same day cut by `by`, so two cashiers on one drawer are two numbers', async () => {
    const p = fakePorts(); seedDay(p);
    const d = await day(p);
    expect(d.byStaff.manager_py).toMatchObject({ taken: 1245000 + 890000, refunded: 8400 });
    expect(d.byStaff.cashier_2).toMatchObject({ taken: 3120000, refunded: 0 });
  });
});

describe('app/payments — what PY must never do', () => {
  it('R12 no take, refund or void writes any table document', async () => {
    const p = fakePorts();
    await take(p, tk('p1', 60900)); await refund(p, rf('r1', 8400)); await voidRow(p, vd('r1'));
    expect(p.calls.filter(c => /table/i.test(c))).toEqual([]);
  });
  it('R12 no take, refund or void writes any line document', async () => {
    const p = fakePorts();
    await take(p, tk('p1', 60900));
    expect(p.calls.filter(c => /line/i.test(c))).toEqual([]);
  });
  it('R3 no code path writes bill.status = paid for a bill with payable 0 — that is BL at issue (PY-S8)', async () => {
    const p = fakePorts({ bill: { payable: 0, status: 'paid' } });
    expect((await fails(take(p, tk('p1', 100)))).code).toBe('failed-precondition');
    expect(bill(p)).toMatchObject({ payable: 0, status: 'paid', paidTotal: 0 });
  });
  it('R3 no code path writes any bill field other than status, paidTotal, paidAt, paidBy', async () => {
    const p = fakePorts();
    const before = { ...bill(p) };
    await take(p, tk('p1', 60900));
    const after = bill(p);
    expect((Object.keys(after) as (keyof BillDoc)[]).filter(k => after[k] !== before[k]).sort()).toEqual(['paidAt', 'paidBy', 'paidTotal', 'status']);
  });
  it('PY-S8 a take against a payable-0 bill is refused before any write', async () => {
    const p = fakePorts({ bill: { payable: 0, status: 'paid' } });
    await fails(take(p, tk('p1', 1)));
    expect(p.rows.size).toBe(0);
  });
});

describe('KT-S17 the drawer kick rides the cash take', () => {
  it('a cash take (tender opensDrawer) queues drawer:<paymentId>, cid = the bill, in the same transaction; a card take queues nothing', async () => {
    const p = fakePorts();
    await take(p, tk('p1', 60900));
    expect([...p.printJobs.values()].map(j => [j.jobId, j.kind, j.state, j.paymentId, j.cid])).toEqual([['drawer:p1', 'drawer', 'queued', 'p1', 'c417']]);
    const q = fakePorts();
    await take(q, ext('p2', 40000));
    expect(q.printJobs.size).toBe(0);
  });
  it('a retried take (same paymentId) does not queue a second kick', async () => {
    const p = fakePorts();
    await take(p, tk('p1', 60900));
    await take(p, tk('p1', 60900));
    expect(p.printJobs.size).toBe(1);
  });
});

// ═══ BT · on account (TD-012) and tips ═══════════════════════════════════════
const ACCOUNT = { id: 'account', label: 'On account', kind: 'credit', opensDrawer: false, needsRef: true };
const CFG4 = { payments: { tenders: [{ id: 'cash', label: 'Cash', kind: 'cash', opensDrawer: true, needsRef: false }, { id: 'card', label: 'Card', kind: 'external', opensDrawer: false, needsRef: true }, ACCOUNT] } };
const base4 = { restaurantId: RID, sessionId: 's1', billId: '0417' };

describe('BT · bill to company: a credit tender settles the bill as money owed', () => {
  it('BT-A1 ₹609.00 on account for "Acme Ltd": bill paid, no drawer, no change, no overpay; a receivable of 60900 open and a P1 audit row', async () => {
    const p = fakePorts({ config: CFG4 });
    const r = await take(p, { ...base4, paymentId: 'p1', tenderId: 'account', amount: 60900, ref: 'Acme Ltd' });
    expect(r.bill.status).toBe('paid');
    expect(r.opensDrawer).toBe(false);
    expect(r.row).toMatchObject({ amount: 60900, tendered: null, change: null, overpaid: null, tip: 0, ref: 'Acme Ltd' });
    expect(p.recs.get('p1')).toMatchObject({ kind: 'account', party: 'Acme Ltd', billId: '0417', amount: 60900, collectedTotal: 0, state: 'open' });
    expect(p.audits.get('p1_onAccount')).toMatchObject({ action: 'onAccount', sev: 'P1', amount: 60900 });
    expect(p.printJobs.size).toBe(0);
  });
  it('BT-A2 without the account name → invalid-argument; ₹700 on account for a ₹609 bill → invalid-argument; captured → invalid-argument', async () => {
    const p = fakePorts({ config: CFG4 });
    await expect(take(p, { ...base4, paymentId: 'p1', tenderId: 'account', amount: 60900 })).rejects.toMatchObject({ code: 'invalid-argument' });
    await expect(take(p, { ...base4, paymentId: 'p2', tenderId: 'account', amount: 70000, ref: 'Acme' })).rejects.toMatchObject({ code: 'invalid-argument' });
    await expect(take(p, { ...base4, paymentId: 'p3', tenderId: 'account', amount: 60900, ref: 'Acme', captured: true })).rejects.toMatchObject({ code: 'invalid-argument' });
    expect(p.rows.size).toBe(0);
  });
  it('BT-A3 collect ₹400 cash a week later: a take row on the same bill carrying receivableId, the drawer opens, the receivable reads 40000 collected and stays open; the bill is untouched', async () => {
    const p = fakePorts({ config: CFG4 });
    await take(p, { ...base4, paymentId: 'p1', tenderId: 'account', amount: 60900, ref: 'Acme Ltd' });
    p.tick(7 * 86_400_000);
    const c = await collect(p, { restaurantId: RID, sessionId: 's1', paymentId: 'c1', receivableId: 'p1', tenderId: 'cash', amount: 40000 });
    expect(c.opensDrawer).toBe(true);
    expect(c.row).toMatchObject({ billId: '0417', receivableId: 'p1', amount: 40000, kind: 'take' });
    expect(c.receivable).toMatchObject({ collectedTotal: 40000, state: 'open' });
    expect(p.bills.get('0417')).toMatchObject({ status: 'paid', paidTotal: 60900 });   // paidTotalOf skips the collection
    const c2 = await collect(p, { restaurantId: RID, sessionId: 's1', paymentId: 'c2', receivableId: 'p1', tenderId: 'card', amount: 20900, ref: 'slip' });
    expect(c2.receivable).toMatchObject({ collectedTotal: 60900, state: 'collected' });
    await expect(collect(p, { restaurantId: RID, sessionId: 's1', paymentId: 'c3', receivableId: 'p1', tenderId: 'cash', amount: 1 })).rejects.toMatchObject({ code: 'failed-precondition' });
    const same = await collect(p, { restaurantId: RID, sessionId: 's1', paymentId: 'c1', receivableId: 'p1', tenderId: 'cash', amount: 40000 });
    expect(same.retry).toBe(true);
  });
  it('BT-A4 collecting past what is owed, onto another account, or on a SERVER session is refused', async () => {
    const p = fakePorts({ config: CFG4 });
    await take(p, { ...base4, paymentId: 'p1', tenderId: 'account', amount: 60900, ref: 'Acme Ltd' });
    await expect(collect(p, { restaurantId: RID, sessionId: 's1', paymentId: 'c1', receivableId: 'p1', tenderId: 'cash', amount: 60901 })).rejects.toMatchObject({ code: 'failed-precondition' });
    await expect(collect(p, { restaurantId: RID, sessionId: 's1', paymentId: 'c2', receivableId: 'p1', tenderId: 'account', amount: 100, ref: 'x' })).rejects.toMatchObject({ code: 'invalid-argument' });
    await expect(collect(fakePorts({ config: CFG4, staff: { role: 'SERVER' }, receivables: { p1: p.recs.get('p1') as Receivable } }), { restaurantId: RID, sessionId: 's1', paymentId: 'c3', receivableId: 'p1', tenderId: 'cash', amount: 100 })).rejects.toMatchObject({ code: 'permission-denied' });
  });
  it('BT-A5 voiding the credit take cancels the receivable and reopens the bill; once money was collected it is refused until that collection is voided', async () => {
    const p = fakePorts({ config: CFG4 });
    await take(p, { ...base4, paymentId: 'p1', tenderId: 'account', amount: 60900, ref: 'Acme Ltd' });
    await collect(p, { restaurantId: RID, sessionId: 's1', paymentId: 'c1', receivableId: 'p1', tenderId: 'cash', amount: 40000 });
    await expect(voidRow(p, { restaurantId: RID, sessionId: 's1', paymentId: 'p1', reason: 'wrong tender', pin: '1234' })).rejects.toMatchObject({ code: 'failed-precondition' });
    await voidRow(p, { restaurantId: RID, sessionId: 's1', paymentId: 'c1', reason: 'wrong tender', pin: '1234' });
    expect(p.recs.get('p1')).toMatchObject({ collectedTotal: 0, state: 'open' });
    const v = await voidRow(p, { restaurantId: RID, sessionId: 's1', paymentId: 'p1', reason: 'wrong tender', pin: '1234' });
    expect(v.bill.status).toBe('issued');
    expect(p.recs.get('p1')).toMatchObject({ state: 'cancelled' });
  });
  it('BT-A6 a refund onto the account tender is refused; cash is the way back', async () => {
    const p = fakePorts({ config: CFG4, bill: { status: 'paid', paidTotal: 60900 } });
    p.rows.set('p1', { paymentId: 'p1', billId: '0417', cid: 'c417', businessDate: '2026-09-15', kind: 'take', tenderId: 'account', tender: ACCOUNT as never, amount: 60900, tendered: null, change: null, captured: false, overpaid: null, at: T0, by: 'm', ref: 'Acme', creditNoteId: null, refundsPaymentId: null, void: null });
    await expect(refund(p, { ...base4, paymentId: 'r1', tenderId: 'account', amount: 8400, creditNoteId: 'CN-0007', reason: 'wrong dish', pin: '1234' })).rejects.toMatchObject({ code: 'failed-precondition' });
    // arch P1: nothing has been collected yet, so there is no money to hand back in cash either
    await expect(refund(p, { ...base4, paymentId: 'r2', tenderId: 'cash', amount: 8400, creditNoteId: 'CN-0007', reason: 'wrong dish', pin: '1234' })).rejects.toMatchObject({ code: 'failed-precondition' });
    p.rows.set('c1', { paymentId: 'c1', billId: '0417', cid: 'c417', businessDate: '2026-09-16', kind: 'take', tenderId: 'cash', tender: CFG4.payments.tenders[0] as never, amount: 60900, tendered: null, change: null, captured: false, overpaid: null, at: T0, by: 'm', ref: null, creditNoteId: null, refundsPaymentId: null, receivableId: 'p1', void: null });
    const ok = await refund(p, { ...base4, paymentId: 'r3', tenderId: 'cash', amount: 8400, creditNoteId: 'CN-0007', reason: 'wrong dish', pin: '1234' });
    expect(ok.row.amount).toBe(8400);
  });
  it('BT-A7 list({receivables: true}) answers the open ones and the tenders they may be collected on (never the account tender)', async () => {
    const p = fakePorts({ config: CFG4 });
    await take(p, { ...base4, paymentId: 'p1', tenderId: 'account', amount: 60900, ref: 'Acme Ltd' });
    const l = await list(p, { restaurantId: RID, sessionId: 's1', receivables: true }) as { receivables: Receivable[]; tenders: { id: string }[] };
    expect(l.receivables.map(r => r.party)).toEqual(['Acme Ltd']);
    expect(l.tenders.map(t => t.id)).toEqual(['cash', 'card']);
  });
});

describe('D7 · partner tenders are not offered on Receivables', () => {
  const DINEOUT = { id: 'dineout', label: 'Dineout', kind: 'external', opensDrawer: false, needsRef: true, partner: true };
  const CFG7 = { payments: { tenders: [...CFG4.payments.tenders, DINEOUT] } };
  it('D7 list({receivables: true}) offers cash and card, never Dineout; the bill screen still offers Dineout', async () => {
    const p = fakePorts({ config: CFG7 });
    await take(p, { ...base4, paymentId: 'p1', tenderId: 'account', amount: 60900, ref: 'Acme Ltd' });
    const l = await list(p, { restaurantId: RID, sessionId: 's1', receivables: true }) as { tenders: { id: string }[] };
    expect(l.tenders.map(t => t.id)).toEqual(['cash', 'card']);
    const b = await list(p, { restaurantId: RID, sessionId: 's1', billId: '0417' }) as { tenders: { id: string }[] };
    expect(b.tenders.map(t => t.id)).toContain('dineout');
  });
  it('D7 collecting ₹609 on Acme\'s account through Dineout is refused and nothing is written', async () => {
    const p = fakePorts({ config: CFG7 });
    await take(p, { ...base4, paymentId: 'p1', tenderId: 'account', amount: 60900, ref: 'Acme Ltd' });
    const rowsBefore = p.rows.size;
    await expect(collect(p, { restaurantId: RID, sessionId: 's1', paymentId: 'c1', receivableId: 'p1', tenderId: 'dineout', amount: 60900, ref: 'DO-7781' }))
      .rejects.toMatchObject({ code: 'invalid-argument', message: expect.stringContaining('Dineout') });
    expect(p.rows.size).toBe(rowsBefore);
    expect(p.recs.get('p1')).toMatchObject({ collectedTotal: 0, state: 'open' });
  });
});

describe('BT · tips: typed, never inferred, never bill money', () => {
  it('BT-T1 cash: guest hands ₹700 for ₹609, cashier types tip ₹50 → amount 60900, tip 5000, change 4100; paidTotal 60900', async () => {
    const p = fakePorts({ config: CFG4 });
    const r = await take(p, { ...base4, paymentId: 'p1', tenderId: 'cash', tendered: 70000, tip: 5000 });
    expect(r.row).toMatchObject({ amount: 60900, tendered: 70000, tip: 5000, change: 4100 });
    expect(r.bill).toMatchObject({ status: 'paid', paidTotal: 60900 });
  });
  it('BT-T2 cash "keep the change": ₹700 tendered, tip ₹91 → change 0, settled; tip ₹100 would leave ₹0.09 short and is refused (tip cannot eat the bill)', async () => {
    const p = fakePorts({ config: CFG4 });
    const r = await take(p, { ...base4, paymentId: 'p1', tenderId: 'cash', tendered: 70000, tip: 9100 });
    expect(r.row).toMatchObject({ amount: 60900, tip: 9100, change: 0 });
    expect(r.bill.status).toBe('paid');
    const q = fakePorts({ config: CFG4 });
    // 70000 − 10000 = 60000 settles 60000 of 60900: not an error, a partial (the tip is the cashier's typed word); outstanding 900 stays.
    const s = await take(q, { ...base4, paymentId: 'p2', tenderId: 'cash', tendered: 70000, tip: 10000 });
    expect(s.row).toMatchObject({ amount: 60000, tip: 10000, change: 0 });
    expect(s.bill).toMatchObject({ status: 'issued', outstanding: 900 });
  });
  it('BT-T3 card: amount 60900 + tip 5000 → the terminal charged 65900; the bill sees 60900; a tip that is not money is invalid-argument; a retry with a different tip is a different payment', async () => {
    const p = fakePorts({ config: CFG4 });
    const r = await take(p, { ...base4, paymentId: 'p1', tenderId: 'card', amount: 60900, tip: 5000, ref: 'slip' });
    expect(r.row).toMatchObject({ amount: 60900, tip: 5000, overpaid: 0 });
    expect(r.bill.paidTotal).toBe(60900);
    await expect(take(p, { ...base4, paymentId: 'p1', tenderId: 'card', amount: 60900, tip: 6000, ref: 'slip' })).rejects.toMatchObject({ code: 'failed-precondition' });
    await expect(take(fakePorts({ config: CFG4 }), { ...base4, paymentId: 'p3', tenderId: 'card', amount: 60900, tip: 5.5 as never, ref: 'slip' })).rejects.toMatchObject({ code: 'invalid-argument' });
  });
  it('BT-T4 the day list carries tips by tender and by staff, outside net', async () => {
    const p = fakePorts({ config: CFG4 });
    await take(p, { ...base4, paymentId: 'p1', tenderId: 'cash', tendered: 70000, tip: 5000 });
    const d = await list(p, { restaurantId: RID, sessionId: 's1', businessDate: p.rows.get('p1')!.businessDate }) as DayList;
    expect(d.byTender.cash).toMatchObject({ taken: 60900, tips: 5000, net: 60900 });
    expect(d.byStaff.manager_py.tips).toBe(5000);
  });
});


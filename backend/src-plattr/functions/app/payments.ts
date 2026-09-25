// PY · take() / refund() / voidRow() / list(). Role → config → domain → ONE transaction
// (row + bill stamp + note stamp + order mirror + audit). No Firestore here; ports only.
// See moonshot/SPEC_PY_payments.md. Money is integer minor units on every field.
import { Job as PrintJob, ids as printIds, newJob as newPrintJob } from '../domain/print';
import {
  Bill, Note, Row, Tender, PaymentsConfig, Receivable, businessDateFor, canCollect, canRefund, canTake, canVoid, changeFor,
  outstanding, overpaidFor, paidTotalOf, isSettled, statusFor, tenderById, tipOf,
} from '../domain/payments';
import { ApprovalError, Staff, PinPorts, pinGate, pinOutcome } from './approvals';
import { AuditRow, auditRow } from '../domain/approvals';
import { loadApprovalsConfig, loadPaymentsConfig } from './config';

export { ApprovalError as PaymentError };   // one error door for the api layer (moonshot/CLAUDE.md "one door")

export interface StoredRow extends Row {
  paymentId: string; billId: string; cid: string; businessDate: string; tenderId: string;
  at: number; by: string; ref: string | null; reason?: string; note?: string; approverId?: string;
}
export interface BillRead { bill: Bill; cid: string; orderId: string | null; paidAt?: number | null; paidBy?: string | null }
export interface BillStamp { status: Bill['status']; paidTotal: number; paidAt: number | null; paidBy: string | null }
export type Mirror = 'unpaid' | 'partially_paid' | 'paid';

export interface Tx {
  rowById(paymentId: string): Promise<StoredRow | null>;
  rowsForBill(billId: string): Promise<StoredRow[]>;
  readBill(billId: string): Promise<BillRead | null>;
  readNote(noteId: string): Promise<Note | null>;
  dayClosed(businessDate: string): Promise<boolean | null>;   // null = unknown (R15: refuse)
  createRow(paymentId: string, row: StoredRow): void;         // must fail if the id exists
  setVoid(paymentId: string, v: NonNullable<Row['void']>): void;
  stampBill(billId: string, stamp: BillStamp): void;
  stampNote(noteId: string, refundedTotal: number): void;
  mirrorOrder(orderId: string | null, status: Mirror): void;  // must throw on a null id (R4)
  createAudit(id: string, row: AuditRow): void;
  createPrintJob(job: PrintJob): void;                        // KT-S17: the drawer kick, queued with the take
  // BT / TD-012: the receivable born with a credit take, paid down by collect, cancelled by voiding the take.
  readReceivable(id: string): Promise<Receivable | null>;
  createReceivable(id: string, r: Receivable): void;         // must fail if the id exists
  stampReceivable(id: string, patch: { collectedTotal: number; state: Receivable['state'] }): void;
}
export interface Ports extends PinPorts {
  log(line: object): void;
  warn(msg: string): void;
  staff: { bySession(restaurantId: string, sessionId: string): Promise<Staff> };   // throws unauthenticated
  config: { settings(restaurantId: string): Promise<unknown> };                    // the whole settings doc; throws refuse
  ledger: { forDay(restaurantId: string, businessDate: string): Promise<StoredRow[]> };
  receivables: { open(restaurantId: string): Promise<Receivable[]> };   // BT: what is owed, for the till's collect screen
  transact<T>(restaurantId: string, fn: (t: Tx) => Promise<T>): Promise<T>;
}

interface Base { restaurantId: string; sessionId: string; billId: string; [k: string]: unknown }
export interface TakeReq extends Base { paymentId: string; tenderId: string; amount?: number; tendered?: number; captured?: boolean; ref?: string; tip?: number }
export interface CollectReq { restaurantId: string; sessionId: string; paymentId: string; receivableId: string; tenderId: string; amount: number; ref?: string; [k: string]: unknown }
export interface RefundReq extends Base { paymentId: string; tenderId: string; amount: number; creditNoteId?: string; refundsPaymentId?: string; reason: string; note?: string; pin?: unknown }
export interface VoidReq { restaurantId: string; sessionId: string; paymentId: string; reason: string; note?: string; pin?: unknown; [k: string]: unknown }
export interface ListReq { restaurantId: string; sessionId: string; billId?: string; businessDate?: string; receivables?: boolean }

export interface BillState { billId: string; payable: number; paidTotal: number; outstanding: number; status: Bill['status']; mirror: Mirror }
export interface WriteResult { row: StoredRow; bill: BillState; retry: boolean; opensDrawer: boolean }

const str = (v: unknown): v is string => typeof v === 'string' && v !== '';
const need = (ok: boolean, message: string): void => { if (!ok) throw new ApprovalError('invalid-argument', message); };
const refuse = (v: { ok: true } | { ok: false; code: string; message: string }): void => { if (!v.ok) throw new ApprovalError(v.code, v.message); };

const mirrorFor = (bill: Bill, paidTotal: number, cfg: PaymentsConfig): Mirror =>
  paidTotal <= 0 ? 'unpaid' : isSettled(bill.payable, paidTotal, cfg.settleWithin) ? 'paid' : 'partially_paid';

const state = (b: BillRead, rows: Row[], cfg: PaymentsConfig): BillState => {
  const paidTotal = paidTotalOf(rows);
  // DECISION(D1, 2026-09-25): A walked-out bill stays walked out when a part payment on it is voided. See moonshot/reviews/2026-09-25-decisions-for-shaurya.md. If you change this, ask Shaurya first.
  // One derivation, domain's, so the stamp written and the state answered can never disagree about a walk-out.
  const status = statusFor(b.bill, rows, cfg);
  return { billId: b.bill.billId, payable: b.bill.payable, paidTotal, outstanding: b.bill.payable - paidTotal, status, mirror: mirrorFor(b.bill, paidTotal, cfg) };
};


/**
 * R6 (DC): nothing may be written to a day whose drawer has been counted and signed off.
 * The date that matters is the one on the ROW being written, not the one on the bill behind it —
 * so last night's meal refunded at 12:30 today is fine (a new row, today's date), and only a void,
 * which rewrites a row already counted, is judged on the original row's date (that is canVoid).
 * Read INSIDE the write transaction on purpose: Firestore tracks a read of a document that does not
 * exist, so this read is what makes DC's `create` and this payment contend instead of both winning.
 */
async function dayOpenOrThrow(t: Tx, businessDate: string): Promise<void> {
  const closed = await t.dayClosed(businessDate);
  if (closed === false) return;
  throw new ApprovalError('failed-precondition', closed === null
    ? `Cannot tell whether ${businessDate} has been closed, so no money can be taken on it`
    : `${businessDate} has been closed and counted; money cannot be added to it`);
}

/** R2, R4: status follows the rows both ways; bill stamp and order mirror land with the row or not at all. */
function stamp(t: Tx, b: BillRead, rows: Row[], at: number, by: string, cfg: PaymentsConfig): BillState {
  const s = state(b, rows, cfg);
  // paidAt/paidBy: stamped on the transition INTO settled, kept while it stays there, cleared on the way out.
  const stays = b.bill.status === 'paid' && s.status === 'paid';
  const paidAt = s.status !== 'paid' ? null : stays ? (b.paidAt ?? at) : at;
  const paidBy = s.status !== 'paid' ? null : stays ? (b.paidBy ?? by) : by;
  t.stampBill(b.bill.billId, { status: s.status, paidTotal: s.paidTotal, paidAt, paidBy });
  t.mirrorOrder(b.orderId, s.mirror);
  return s;
}

async function staffFor(ports: Ports, req: { restaurantId: unknown; sessionId: unknown }): Promise<Staff> {
  need(str(req.restaurantId) && str(req.sessionId), 'restaurantId and sessionId required');
  const staff = await ports.staff.bySession(req.restaurantId as string, req.sessionId as string);
  if (staff.status !== 'active') throw new ApprovalError('permission-denied', 'Staff account is not active');
  return staff;
}
const cfgFor = (ports: Ports, rid: string) => loadPaymentsConfig(ports.config.settings, ports.warn, rid);
const approvalsCfgFor = (ports: Ports, rid: string) =>
  loadApprovalsConfig(async r => ((await ports.config.settings(r)) as { approvals?: unknown } | undefined)?.approvals, ports.warn, rid);

const logLine = (ports: Ports, l: { cid: string; billId: string; kind: string; tenderId: string | null; amount: number; outstandingAfter: number | null; outcome: string }) =>
  ports.log({ mod: 'payments', ...l });

// ─────────────────────────────────────────────────────────────────────────────
export async function take(ports: Ports, req: TakeReq): Promise<WriteResult> {
  const staff = await staffFor(ports, req);
  need(str(req.billId) && str(req.paymentId), 'billId and paymentId required');
  const { restaurantId: rid, billId, paymentId } = req;
  const cfg = await cfgFor(ports, rid);
  const at = ports.now();
  const businessDate = businessDateFor(at, cfg);
  const fail = (code: string, message: string, cid = '', out: number | null = null): never => {
    logLine(ports, { cid, billId, kind: 'take', tenderId: str(req.tenderId) ? req.tenderId : null, amount: 0, outstandingAfter: out, outcome: code });
    throw new ApprovalError(code, message);
  };

  let cid = '';
  try {
    const out = await ports.transact(rid, async t => {
      // R13: a retry is the same row, a success, never a duplicate and never "nothing outstanding".
      const existing = await t.rowById(paymentId);
      const b = await t.readBill(billId);
      const rows = await t.rowsForBill(billId);
      if (existing) {
        const same = existing.kind === 'take' && existing.billId === billId && existing.tenderId === req.tenderId && (existing.tip ?? 0) === tipOf(req)
          && (existing.tender.kind === 'cash' ? existing.tendered === req.tendered : existing.amount + (existing.overpaid ?? 0) === req.amount);
        if (!same) throw new ApprovalError('failed-precondition', 'paymentId already used for a different payment');
        if (!b) throw new ApprovalError('failed-precondition', 'No bill');
        return { row: existing, bill: state(b, rows, cfg), retry: true, opensDrawer: false };
      }
      await dayOpenOrThrow(t, businessDate);
      refuse(canTake(b?.bill ?? null, rows, { ...req, role: staff.role }, cfg));
      const bill = b as BillRead;
      cid = bill.cid;
      const tender = tenderById(cfg, req.tenderId) as Tender;
      const out = outstanding(bill.bill, rows);
      const tip = tipOf(req);   // BT: typed at the till, never inferred; cash settles with tendered − tip
      const money = tender.kind === 'cash'
        ? { ...changeFor(tender, (req.tendered as number) - tip, out), tendered: req.tendered as number, overpaid: null as number | null }
        : tender.kind === 'external'
          ? { ...overpaidFor(tender, req.amount as number, out), tendered: null as number | null, change: null as number | null }
          // credit: canTake refused an overshoot, so the amount is the amount; nothing moved, nothing to give back.
          : { amount: req.amount as number, tendered: null as number | null, change: null as number | null, overpaid: null as number | null };
      const row: StoredRow = {
        paymentId, billId, cid, businessDate, kind: 'take', tenderId: tender.id, tender: { ...tender },
        amount: money.amount, tendered: money.tendered, change: money.change, captured: tender.kind === 'external' ? req.captured === true : false,
        overpaid: money.overpaid, at, by: staff.staffId, ref: str(req.ref) ? req.ref : null, creditNoteId: null, refundsPaymentId: null, void: null,
        tip, receivableId: null,
      };
      t.createRow(paymentId, row);
      if (tender.kind === 'credit') {
        // BT / TD-012: the bill closes as money OWED. One receivable per credit take, same id, same transaction,
        // and a P1 audit row: money left the till's control on someone's word, which is exactly what the
        // morning read is for (catch it, don't cage it).
        t.createReceivable(paymentId, { receivableId: paymentId, kind: 'account', party: row.ref as string, billId, cid, businessDate, amount: money.amount + tip, collectedTotal: 0, state: 'open', at, by: staff.staffId });
        t.createAudit(`${paymentId}_onAccount`, auditRow({ ts: at, cid, action: 'onAccount', staffId: staff.staffId, sev: 'P1', amount: money.amount + tip, reason: 'on account', note: `${row.ref} bill ${billId}`.slice(0, 200), lineId: null, before: null, after: null }));
      }
      const s = stamp(t, bill, [...rows, row], at, staff.staffId, cfg);
      // KT-S17: a tender that opens the drawer queues one kick, keyed on the payment so a retry never kicks twice.
      // The counter tablet's next poll fires it; past print.drawerStaleSeconds it is dropped, never fired late.
      if (tender.opensDrawer) t.createPrintJob(newPrintJob({ jobId: printIds.drawer(paymentId), cid, kind: 'drawer', ticketNo: billId, tableLabel: '', billId, paymentId, by: staff.staffId, now: at }));
      return { row, bill: s, retry: false, opensDrawer: tender.opensDrawer };
    });
    logLine(ports, { cid: out.row.cid, billId, kind: 'take', tenderId: out.row.tenderId, amount: out.row.amount, outstandingAfter: out.bill.outstanding, outcome: out.retry ? 'retry' : 'applied' });
    return out;
  } catch (e) {
    if (e instanceof ApprovalError) fail(e.code, e.message, cid);
    fail('unavailable', 'Could not record the payment, try again', cid);
    throw e; // unreachable
  }
}

// ─────────────────────────────────────────────────────────────────────────────
export async function refund(ports: Ports, req: RefundReq): Promise<WriteResult> {
  const staff = await staffFor(ports, req);
  need(str(req.billId) && str(req.paymentId), 'billId and paymentId required');
  const { restaurantId: rid, billId, paymentId } = req;
  const cfg = await cfgFor(ports, rid);
  const at = ports.now();
  const businessDate = businessDateFor(at, cfg);
  const tenderId = str(req.tenderId) ? req.tenderId : null;
  const fail = (code: string, message: string, cid: string, details: Record<string, unknown> = {}, outcome = code): never => {
    logLine(ports, { cid, billId, kind: 'refund', tenderId, amount: 0, outstandingAfter: null, outcome });
    throw new ApprovalError(code, message, details);
  };

  // Decide on a read, then the PIN (every time, Decisions), then decide again inside the write.
  const head = await ports.transact(rid, async t => ({ existing: await t.rowById(paymentId), b: await t.readBill(billId), rows: await t.rowsForBill(billId) }));
  const cid = head.b?.cid ?? '';
  if (!head.existing) {
    const noteId = str(req.creditNoteId) ? req.creditNoteId : null;
    const target = str(req.refundsPaymentId) ? head.rows.find(r => r.paymentId === req.refundsPaymentId) ?? null : null;
    const note = noteId ? await ports.transact(rid, t => t.readNote(noteId)) : null;
    const v = canRefund(head.b?.bill ?? null, head.rows, note, target, { ...req, role: staff.role }, cfg);
    if (!v.ok) fail(v.code, v.message, cid);
    try { await pinGate(ports, await approvalsCfgFor(ports, rid), rid, staff, req.pin, cid, 'refund', 'P0'); }
    catch (e) { if (e instanceof ApprovalError) fail(e.code, e.message, cid, e.details, pinOutcome(e)); throw e; }
  }

  try {
    const out = await ports.transact(rid, async t => {
      const existing = await t.rowById(paymentId);
      const b = await t.readBill(billId);
      const rows = await t.rowsForBill(billId);
      if (existing) {
        const same = existing.kind === 'refund' && existing.billId === billId && existing.amount === req.amount && existing.tenderId === req.tenderId;
        if (!same) throw new ApprovalError('failed-precondition', 'paymentId already used for a different payment');
        if (!b) throw new ApprovalError('failed-precondition', 'No bill');
        return { row: existing, bill: state(b, rows, cfg), retry: true, opensDrawer: false };
      }
      await dayOpenOrThrow(t, businessDate);
      const noteId = str(req.creditNoteId) ? req.creditNoteId : null;
      const target = str(req.refundsPaymentId) ? rows.find(r => r.paymentId === req.refundsPaymentId) ?? null : null;
      const note = noteId ? await t.readNote(noteId) : null;   // R7: the note is read inside, never the collection queried for its total
      refuse(canRefund(b?.bill ?? null, rows, note, target, { ...req, role: staff.role }, cfg));
      const bill = b as BillRead;
      const tender = tenderById(cfg, req.tenderId) as Tender;
      const row: StoredRow = {
        paymentId, billId, cid: bill.cid, businessDate, kind: 'refund', tenderId: tender.id, tender: { ...tender },
        amount: req.amount, tendered: null, change: null, captured: false, overpaid: null, at, by: staff.staffId, ref: null,
        creditNoteId: noteId, refundsPaymentId: target ? target.paymentId : null,
        reason: req.reason, note: typeof req.note === 'string' ? req.note : '', approverId: staff.staffId, void: null,
      };
      t.createRow(paymentId, row);
      if (note) t.stampNote(note.creditNoteId, note.refundedTotal + req.amount);
      const s = stamp(t, bill, [...rows, row], at, staff.staffId, cfg);
      t.createAudit(`${paymentId}_refund`, auditRow({ ts: at, cid: bill.cid, action: 'refund', staffId: staff.staffId, sev: 'P0', amount: req.amount, reason: req.reason, note: row.note as string, lineId: null, before: null, after: null }));
      return { row, bill: s, retry: false, opensDrawer: tender.opensDrawer };
    });
    logLine(ports, { cid: out.row.cid, billId, kind: 'refund', tenderId: out.row.tenderId, amount: out.row.amount, outstandingAfter: out.bill.outstanding, outcome: out.retry ? 'retry' : 'applied' });
    return out;
  } catch (e) {
    if (e instanceof ApprovalError) fail(e.code, e.message, cid, e.details);
    fail('unavailable', 'Could not record the refund, try again', cid);
    throw e;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
export async function voidRow(ports: Ports, req: VoidReq): Promise<WriteResult> {
  const staff = await staffFor(ports, req);
  need(str(req.paymentId), 'paymentId required');
  const { restaurantId: rid, paymentId } = req;
  const cfg = await cfgFor(ports, rid);
  const at = ports.now();
  const fail = (code: string, message: string, cid: string, billId: string, details: Record<string, unknown> = {}, outcome = code): never => {
    logLine(ports, { cid, billId, kind: 'void', tenderId: null, amount: 0, outstandingAfter: null, outcome });
    throw new ApprovalError(code, message, details);
  };

  const head = await ports.transact(rid, async t => {
    const row = await t.rowById(paymentId);
    return { row, closed: row ? await t.dayClosed(row.businessDate) : null };
  });
  const cid = head.row?.cid ?? '', billId = head.row?.billId ?? '';
  const v = canVoid(head.row, head.closed, { role: staff.role, by: staff.staffId, reason: req.reason });
  if (!v.ok) fail(v.code, v.message, cid, billId);
  if (!('retry' in v)) {
    try { await pinGate(ports, await approvalsCfgFor(ports, rid), rid, staff, req.pin, cid, 'voidPayment', 'P0'); }
    catch (e) { if (e instanceof ApprovalError) fail(e.code, e.message, cid, billId, e.details, pinOutcome(e)); throw e; }
  }

  try {
    const out = await ports.transact(rid, async t => {
      const row = await t.rowById(paymentId);
      const closed = row ? await t.dayClosed(row.businessDate) : null;
      const v2 = canVoid(row, closed, { role: staff.role, by: staff.staffId, reason: req.reason });
      if (!v2.ok) throw new ApprovalError(v2.code, v2.message);
      const r = row as StoredRow;
      const b = await t.readBill(r.billId);
      if (!b) throw new ApprovalError('failed-precondition', 'No bill');
      const rows = await t.rowsForBill(r.billId);
      const note = r.kind === 'refund' && r.creditNoteId ? await t.readNote(r.creditNoteId) : null;
      if ('retry' in v2) return { row: r, bill: state(b, rows, cfg), retry: true, opensDrawer: false };

      // BT: a voided collection gives the account its amount back; a voided credit take cancels the
      // receivable, unless money has already been collected on it — then the collection is voided first.
      const rec = r.receivableId ? await t.readReceivable(r.receivableId) : r.tender.kind === 'credit' ? await t.readReceivable(r.paymentId) : null;
      if (r.tender.kind === 'credit' && rec && rec.collectedTotal > 0) throw new ApprovalError('failed-precondition', `${rec.party} has already paid ${rec.collectedTotal} on this; void that collection first`);
      const v3 = { at, by: staff.staffId, reason: req.reason, note: typeof req.note === 'string' ? req.note : '' };
      t.setVoid(paymentId, v3);
      const after = rows.map(x => (x.paymentId === paymentId ? { ...x, void: v3 } : x));
      if (note) t.stampNote(note.creditNoteId, Math.max(0, note.refundedTotal - r.amount));   // a voided refund gives the note its amount back
      if (rec && r.receivableId) t.stampReceivable(rec.receivableId, { collectedTotal: Math.max(0, rec.collectedTotal - r.amount), state: 'open' });
      if (rec && r.tender.kind === 'credit') t.stampReceivable(rec.receivableId, { collectedTotal: 0, state: 'cancelled' });
      const s = stamp(t, b, after, at, staff.staffId, cfg);
      t.createAudit(`${paymentId}_void`, auditRow({ ts: at, cid: r.cid, action: 'voidPayment', staffId: staff.staffId, sev: 'P0', amount: r.amount, reason: req.reason, note: v3.note, lineId: null, before: null, after: null }));
      return { row: { ...r, void: v3 }, bill: s, retry: false, opensDrawer: false };   // R15: a void never opens the drawer
    });
    logLine(ports, { cid: out.row.cid, billId: out.row.billId, kind: 'void', tenderId: out.row.tenderId, amount: out.row.amount, outstandingAfter: out.bill.outstanding, outcome: out.retry ? 'retry' : 'applied' });
    return out;
  } catch (e) {
    if (e instanceof ApprovalError) fail(e.code, e.message, cid, billId, e.details);
    fail('unavailable', 'Could not record the void, try again', cid, billId);
    throw e;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
export interface TenderTotals { taken: number; refunded: number; overpaid: number; tips: number; owed: number; count: number; net: number }   // owed: BT arch P2, see domain/dayClose totalsFrom
export interface DayList { businessDate: string; byTender: Record<string, TenderTotals>; byStaff: Record<string, TenderTotals>; cashNet: number; rows: StoredRow[] }
export interface BillList extends BillState { rows: StoredRow[]; tenders: Tender[] }   // tenders: what the till may offer (PY-S19)

/** PY-S18 / R19: what DC and RP read. Any role may look (who-can row 1); only take, refund and void are gated. */
export interface ReceivableList { receivables: Receivable[]; tenders: Tender[] }   // BT: what is owed, and what it may be collected on
export async function list(ports: Ports, req: ListReq): Promise<DayList | BillList | ReceivableList> {
  await staffFor(ports, req);
  const cfg = await cfgFor(ports, req.restaurantId);
  if (req.receivables === true) return { receivables: await ports.receivables.open(req.restaurantId), tenders: cfg.tenders.filter(t => t.kind !== 'credit') };
  if (str(req.billId)) {
    const billId = req.billId;
    const { b, rows } = await ports.transact(req.restaurantId, async t => ({ b: await t.readBill(billId), rows: await t.rowsForBill(billId) }));
    if (!b) throw new ApprovalError('failed-precondition', 'No bill issued for this table');
    return { ...state(b, rows, cfg), rows, tenders: cfg.tenders };
  }
  need(str(req.businessDate), 'billId or businessDate required');
  let rows: StoredRow[];
  try { rows = await ports.ledger.forDay(req.restaurantId, req.businessDate as string); }
  catch { throw new ApprovalError('unavailable', 'ledger unavailable'); }   // never zeros for a broken day

  const empty = (): TenderTotals => ({ taken: 0, refunded: 0, overpaid: 0, tips: 0, owed: 0, count: 0, net: 0 });
  const byTender: Record<string, TenderTotals> = Object.fromEntries(cfg.tenders.map(t => [t.id, empty()]));
  const byStaff: Record<string, TenderTotals> = {};
  const add = (g: TenderTotals, r: StoredRow) => {
    if (r.kind === 'take' && r.tender.kind === 'credit') g.owed += r.amount + (r.tip ?? 0);
    else if (r.kind === 'take') { g.taken += r.amount; g.overpaid += r.overpaid ?? 0; g.tips += r.tip ?? 0; } else g.refunded += r.amount;
    g.count += 1; g.net = g.taken - g.refunded;
  };
  let cashNet = 0;
  for (const r of rows) {
    if (r.void) continue;
    add(byTender[r.tenderId] ??= empty(), r);
    add(byStaff[r.by] ??= empty(), r);
    if (r.tender.kind === 'cash') cashNet += r.kind === 'take' ? r.amount : -r.amount;
  }
  return { businessDate: req.businessDate as string, byTender, byStaff, cashNet, rows };
}

// ─────────────────────────────────────────────────────────────────────────────
/**
 * BT / TD-012. Collecting what an account owes, days later. A take row on the ORIGINAL bill carrying
 * `receivableId`, so the money lands on the day it arrives (its own businessDate, its own tender, the
 * drawer if cash) while the bill, already settled on account, is untouched: paidTotalOf skips it.
 */
export async function collect(ports: Ports, req: CollectReq): Promise<{ row: StoredRow; receivable: Receivable; retry: boolean; opensDrawer: boolean }> {
  const staff = await staffFor(ports, req);
  need(str(req.receivableId) && str(req.paymentId), 'receivableId and paymentId required');
  const { restaurantId: rid, receivableId, paymentId } = req;
  const cfg = await cfgFor(ports, rid);
  const at = ports.now();
  const businessDate = businessDateFor(at, cfg);
  const fail = (code: string, message: string, cid = ''): never => {
    logLine(ports, { cid, billId: receivableId, kind: 'collect', tenderId: str(req.tenderId) ? req.tenderId : null, amount: 0, outstandingAfter: null, outcome: code });
    throw new ApprovalError(code, message);
  };
  let cid = '';
  try {
    const out = await ports.transact(rid, async t => {
      const existing = await t.rowById(paymentId);
      const rec = await t.readReceivable(receivableId);
      if (existing) {
        const same = existing.receivableId === receivableId && existing.amount === req.amount && existing.tenderId === req.tenderId;
        if (!same || !rec) throw new ApprovalError('failed-precondition', 'paymentId already used for a different payment');
        return { row: existing, receivable: rec, retry: true, opensDrawer: false };
      }
      await dayOpenOrThrow(t, businessDate);
      refuse(canCollect(rec, { ...req, role: staff.role }, cfg));
      const r = rec as Receivable;
      cid = r.cid;
      const tender = tenderById(cfg, req.tenderId) as Tender;
      const row: StoredRow = {
        paymentId, billId: r.billId, cid: r.cid, businessDate, kind: 'take', tenderId: tender.id, tender: { ...tender },
        amount: req.amount, tendered: null, change: null, captured: false, overpaid: null, at, by: staff.staffId,
        ref: str(req.ref) ? req.ref : null, creditNoteId: null, refundsPaymentId: null, tip: 0, receivableId, void: null,
      };
      t.createRow(paymentId, row);
      const collectedTotal = r.collectedTotal + req.amount;
      const receivable: Receivable = { ...r, collectedTotal, state: collectedTotal >= r.amount ? 'collected' : 'open' };
      t.stampReceivable(receivableId, { collectedTotal, state: receivable.state });
      if (tender.opensDrawer) t.createPrintJob(newPrintJob({ jobId: printIds.drawer(paymentId), cid: r.cid, kind: 'drawer', ticketNo: r.billId, tableLabel: '', billId: r.billId, paymentId, by: staff.staffId, now: at }));
      return { row, receivable, retry: false, opensDrawer: tender.opensDrawer };
    });
    logLine(ports, { cid: out.row.cid, billId: out.row.billId, kind: 'collect', tenderId: out.row.tenderId, amount: out.row.amount, outstandingAfter: out.receivable.amount - out.receivable.collectedTotal, outcome: out.retry ? 'retry' : 'applied' });
    return out;
  } catch (e) {
    if (e instanceof ApprovalError) fail(e.code, e.message, cid);
    fail('unavailable', 'Could not record the collection, try again', cid);
    throw e;
  }
}


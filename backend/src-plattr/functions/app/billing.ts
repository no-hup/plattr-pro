// BL · use-cases: preview / issue / cancel / creditNote / reprint / split / get. Domain does the money; ports do the I/O.
// Every money figure is recomputed here from line snapshots (R2, R12); nothing the client sends is trusted.
import { Job as PrintJob, ids as printIds, newJob as newPrintJob } from '../domain/print';
import { Line } from '../domain/line';
import {
  Bill, BillBody, BillDiscount, BillingConfig, BILLING_DEFAULTS, BillRef, ChargeIn, Meta, Seller,
  billLabel, cancel as cancelBill, creditNote as noteOn, issue as issueBill, preview as previewBody,
} from '../domain/billing';
import { auditRow } from '../domain/approvals';
import { Counter, InvoiceConfig, INVOICE_DEFAULTS, counterKey, nextNumber } from '../domain/invoice';
import { apportion } from '../domain/billing';
import { net } from '../domain/approvals';   // listPrice − offer − discount, the base a bill discount is judged against
import { ApprovalError, ApplyRequest, ApplyResult, Staff } from './approvals';
export { ApprovalError };

/** BL-S24 / TD-016. `targets` is the offer's own per-cart-item breakdown in minor units; absent on an
  * ORDER-scoped offer, which by design discounts the whole bill and ships no itemised breakdown. */
export interface OrderOffer { id: string; name: string; amount: number; targets?: Record<string, number> }

export interface BillingSettings {
  billing: BillingConfig & { charges: ChargeIn[] };
  invoice: InvoiceConfig;
  seller: Seller;
}

export interface Tx {
  getLines(ids: string[]): Promise<Line[]>;
  setLine(id: string, patch: Partial<Line>): void;
  getBill(id: string): Promise<Bill | null>;
  setBill(id: string, bill: Bill): void;          // create; must fail if the id exists
  updateBill(id: string, patch: Partial<Bill>): void;
  getCounter(key: string): Promise<Counter | null>;
  setCounter(key: string, c: Counter): void;
  createAudit(id: string, row: object): void;
  enqueuePrint(job: PrintJob): void;                 // KT: the bill's or the note's print job, in this same transaction
  tableLabel(tableIds: string[]): Promise<string>;   // KT: "7" or "5+6", what the paper says
  newBillId(): string;
}
export interface Ports {
  now(): number;
  log(line: object): void;
  staff: { bySession(restaurantId: string, sessionId: string): Promise<Staff> };
  config: { billing(restaurantId: string): Promise<BillingSettings> };     // throws when the doc cannot be read (R12)
  linesOfDraft(restaurantId: string, draftId: string): Promise<Line[]>;
  linesOfOrder(restaurantId: string, orderId: string): Promise<Line[]>;   // D2: the whole order, to share its offer by value
  orderOffer(restaurantId: string, orderId: string): Promise<OrderOffer | null>;   // BL-S24: as evaluated at placement
  getBill(restaurantId: string, billId: string): Promise<Bill | null>;
  /** BT: a table document may name the charge rows that apply to it (`charges: ['PACKING']` on a counter ticket); null = the table names none. */
  tables(restaurantId: string, tableIds: string[]): Promise<{ tableId: string; charges: string[] | null }[]>;
  approve(req: ApplyRequest): Promise<ApplyResult>;   // ST's one door: role, reason, PIN, P0 audit row. Throws permission-denied {requires:'pin'} until the PIN arrives
  transact<T>(restaurantId: string, fn: (t: Tx) => Promise<T>): Promise<T>;
}

const ISSUERS = ['MANAGER', 'ADMIN'];
const fail = (code: string, message: string, details: Record<string, unknown> = {}): never => { throw new ApprovalError(code, message, details); };

export interface PreviewRequest { restaurantId: string; sessionId: string; draftId: string; dropCharges?: string[]; discount?: BillDiscount | null; customer?: { name: string; taxId: string } | null }
export interface PreviewResult extends BillBody { flagged: string[]; offer: OrderOffer | null; dropped: string[] }

/** BL "Who can do what": dropping a charge is the cashier's, even on a preview (QB-13: a captain quoted ₹63 for ₹66). */
function mayDrop(role: string, req: PreviewRequest) {
  if ((req.dropCharges ?? []).length && !ISSUERS.includes(role)) fail('permission-denied', 'Only the cashier can take a charge off');
}

/** BL-S1..S6, S14, S21..S24. Computed, never written. `flagged` names lines that cannot be issued. */
export async function preview(ports: Ports, req: PreviewRequest): Promise<PreviewResult> {
  const staff = await ports.staff.bySession(req.restaurantId, req.sessionId);
  mayDrop(staff.role, req);
  const { body, flagged, offer, message, dropped } = await compute(ports, req);
  if (!body) fail('failed-precondition', message, { flagged });
  return { ...body!, flagged, offer, dropped: dropped.map(d => d.type) };
}

type GetBill = (billId: string) => Promise<Bill | null>;

/** `getBill` is the issue transaction's own read when there is one, so the offer already given and the charges an edit
 *  kept off are judged on the bills as the transaction sees them; a preview reads them plainly. */
async function compute(ports: Ports, req: PreviewRequest, lines?: Line[], getBill: GetBill = id => ports.getBill(req.restaurantId, id)) {
  const cfg = await ports.config.billing(req.restaurantId);
  const all = lines ?? await ports.linesOfDraft(req.restaurantId, req.draftId);
  const open = all.filter(l => l.billId === null);
  const orderId = open[0]?.orderId;
  // BL-S24: the order offer as evaluated when the round was placed becomes the bill discount, apportioned by R1.
  const offer = orderId ? await ports.orderOffer(req.restaurantId, orderId) : null;
  const byLine = offer && !offer.targets && !req.discount ? await orderShares(ports, req.restaurantId, orderId!, offer.amount, getBill) : undefined;
  // With `byLine` the discount is what is LEFT of the offer for the unbilled lines; each draft then takes its lines' part.
  const amount = byLine ? Object.values(byLine).reduce((a, v) => a + v, 0) : offer?.amount ?? 0;
  // A person's discount carries only amount, pct and source: `targets` and `byLine` are the server's, never a client's
  // (a till sending {amount: 1, byLine: {naan: 50000}} would pass ST's door at ₹0.01 and take ₹500 off).
  const person: BillDiscount | null = req.discount ? { amount: req.discount.amount, pct: req.discount.pct, source: req.discount.source } : null;
  const discount: BillDiscount | null = person ?? (offer && amount > 0
    ? { amount, pct: 0, source: { reason: offer.name, note: offer.id, approverId: 'offer' }, ...(offer.targets ? { targets: offer.targets } : {}), ...(byLine ? { byLine } : {}) }
    : null);
  // BT: which charge rows this draft carries is the TABLE's say, as data, never a branch on what
  // kind of table it is. A table naming `charges` takes exactly those rows (a counter ticket takes
  // PACKING and not the service charge); a draft whose tables name nothing takes every row that is
  // not `optIn` (packing is optIn: it never lands on a dine-in table by default). Merged tables
  // that each name a list take the union.
  const tables = await ports.tables(req.restaurantId, [...new Set(open.map(l => l.tableId))]);
  const named = tables.filter(t => t.charges);
  const allowed = named.length ? new Set(named.flatMap(t => t.charges as string[])) : null;
  const mine = cfg.billing.charges.filter(c => (allowed ? allowed.has(c.type) : !c.optIn));
  // DECISION(D2, 2026-09-25): a service charge removed before an Edit stays removed on the new bill. See moonshot/reviews/2026-09-25-decisions-for-shaurya.md. If you change this, ask Shaurya first.
  // Table 12 refused the 5 % on A-0417, then ordered gulab jamun: the cashier's list if the till sent one, else what
  // the bill(s) these lines came back from had dropped (QB-10: a reload or an edit used to bring the charge back).
  const drop = req.dropCharges ?? [...new Set((await replacedBills(getBill, open)).flatMap(b => b.dropped ?? []))];
  const charges = mine.filter(c => !drop.includes(c.type));
  const r = previewBody(open, discount, charges, cfg.billing);
  if (!r.ok) {
    if (r.lineIds) return { body: null, flagged: r.lineIds, message: r.message, offer, cfg, open, dropped: [] as { type: string; amount: number }[] };
    fail(r.code, r.message);
  }
  // QB-7: what each dropped charge would have come to, for its audit row at issue. A full body that cannot be priced
  // (a flat charge in an untaxed block: the very reason to drop it) records 0.
  const gone = mine.filter(c => drop.includes(c.type));
  const full = gone.length ? previewBody(open, discount, mine, cfg.billing) : null;
  const dropped = gone.map(c => ({ type: c.type, amount: full && full.ok ? full.value.charges.find(x => x.type === c.type)?.amount ?? 0 : 0 }));
  return { body: (r as { value: BillBody }).value, flagged: [] as string[], message: '', offer, cfg, open, dropped };
}

/** D2: the cancelled bills the open lines were freed from (Edit or Cancel), read through the port. */
async function replacedBills(getBill: GetBill, open: Line[]): Promise<Bill[]> {
  const ids = [...new Set(open.map(l => l.lastBillId).filter((x): x is string => !!x))].sort();
  return (await Promise.all(ids.map(getBill))).filter((b): b is Bill => !!b);
}

/**
 * DECISION(D2, 2026-09-25): ₹882 table with ₹100 off split in two: eligibility on the whole table, amount shared by value (BL-S3 rule). See moonshot/reviews/2026-09-25-decisions-for-shaurya.md. If you change this, ask Shaurya first.
 * The offer was judged on the whole order when the round was placed. What is left of it after the order's live bills
 * (the ones not cancelled) is spread over the order's unbilled counting lines by net share, R1, lines by lineId.
 * 21:40 table 12's A-0417 took all ₹100; a naan ordered at 22:05 is left ₹0 of it, never ₹100 again (TD-121).
 * A split before issue: every line is unbilled, so the drafts' shares sum to exactly ₹100 (QB-1, QB-6).
 */
async function orderShares(ports: Ports, rid: string, orderId: string, amount: number, getBill: GetBill): Promise<Record<string, number>> {
  // The order's lines are a query, so they are read plainly even inside the issue transaction. That is safe because
  // a line's share is fixed by the order's lines alone, never by which draft it sits in: two drafts of one table
  // issued in the same second each take their own lines' shares, and still sum to the offer.
  const lines = (await ports.linesOfOrder(rid, orderId)).sort((a, b) => (a.lineId < b.lineId ? -1 : a.lineId > b.lineId ? 1 : 0));
  let given = 0;
  for (const billId of new Set(lines.map(l => l.billId).filter((x): x is string => !!x))) {
    const b = await getBill(billId);
    if (b && b.status !== 'cancelled' && b.discount?.source.approverId === 'offer') given += b.discount.amount;
  }
  const open = lines.filter(l => l.billId === null && l.countsTowardTotal);
  const shares = apportion(Math.max(0, amount - given), open.map(l => Math.max(0, net(l))));
  return Object.fromEntries(open.map((l, i) => [l.lineId, shares[i]]));
}

/** QB-3 / QB-9: "A-0417 is already issued — Edit it to add these dishes", by the number on the paper, never the doc id. */
async function printedRefusal(t: Tx, billId: string): Promise<ApprovalError> {
  const b = await t.getBill(billId);
  return new ApprovalError('failed-precondition', `${b ? billLabel(b) : 'this table\'s bill'} is already issued — Edit it to add these dishes`, { billId });
}

/** Both numbered documents take their number here, inside their transaction. */
function numberOrRefuse(key: string, counter: Counter | null, cfg: InvoiceConfig) {
  const n = nextNumber(counter, cfg);
  if (!n) throw new ApprovalError('failed-precondition', `invoice counter ${key} is unreadable; refusing rather than risk a repeated number`, { counter: key });
  return n;
}

export interface IssueRequest extends PreviewRequest { pin?: unknown; cid: string; expectedV: Record<string, number> }

/**
 * The sitting and the tables a bill belongs to, read off the lines it bills — never from the request, whose
 * `sessionId` is the cashier's login and whose screen only knows the draft. One sitting or refuse.
 */
export function billSitting(lines: Line[]): { sittingId: string; tableIds: string[] } {
  if (!lines.length) throw new ApprovalError('failed-precondition', 'nothing to bill');
  const orphan = lines.find(l => !l.sessionId);
  if (orphan) throw new ApprovalError('failed-precondition', 'a line on this draft has no sitting', { lineId: orphan.lineId });
  const sittings = [...new Set(lines.map(l => l.sessionId))];
  if (sittings.length > 1) throw new ApprovalError('failed-precondition', 'this draft holds lines of two sittings; split it first', { sittings });
  return { sittingId: sittings[0], tableIds: [...new Set(lines.map(l => l.tableId))] };
}

/** BL-S7: number, freeze, lines stamped, counter moved, all in one transaction. Recomputed from snapshots. */
export async function issue(ports: Ports, req: IssueRequest): Promise<Bill> {
  const staff = await ports.staff.bySession(req.restaurantId, req.sessionId);
  if (!ISSUERS.includes(staff.role)) fail('permission-denied', 'Not allowed for your role');
  if (typeof req.cid !== 'string' || !req.cid) fail('invalid-argument', 'cid required');
  // TD-040: `expectedV` is the preview the cashier is looking at — every open line of the draft and
  // the `v` it was shown at. The transaction below refuses unless the draft is still exactly that set,
  // so a dish voided, added or split away after the preview can never print a figure nobody saw.
  // The offline replay (ReconcileScreen) previews first too, so it sends the same thing.
  if (!req.expectedV || typeof req.expectedV !== 'object') fail('invalid-argument', 'expectedV required: the line versions the preview was taken at, {} for none');

  // TD-019. A bill-level discount sent by a client is a person giving money away, so it goes
  // through ST's one door before anything is written: reason from the configured list, an audit
  // row ALWAYS, and a PIN above `approvals.discountPinAbovePercent` (BL-S3, BL-S22).
  // The offer's own discount (BL-S24) is the system's, not a person's, and is never gated — it is
  // the `??` branch in compute() and never reaches here.
  // Gating `issue` and not `preview`: looking at what a comp would come to costs nothing and moves
  // no money. Taking the invoice number is the act, so that is where the door goes — the same
  // place, and the same order, `cancel` already puts it (role, then refusable checks, then PIN).
  if (req.discount && Number(req.discount.amount) > 0) {
    const draft = await ports.linesOfDraft(req.restaurantId, req.draftId);
    const base = draft.filter(l => l.billId === null && l.countsTowardTotal).reduce((n, l) => n + net(l), 0);
    await ports.approve({
      restaurantId: req.restaurantId, sessionId: req.sessionId, action: 'billDiscount', cid: req.cid,
      reason: req.discount.source?.reason, note: `${req.discount.source?.note ?? ''} bill discount ${req.discount.amount} of ${base}`.trim().slice(0, 200),
      pin: req.pin, amountMinor: req.discount.amount, baseMinor: base,
    });
  }

  const now = ports.now();
  const bill = await ports.transact(req.restaurantId, async t => {
    const draft = await ports.linesOfDraft(req.restaurantId, req.draftId);
    const fresh = await t.getLines(draft.map(l => l.lineId));
    const { sittingId, tableIds } = billSitting(fresh);
    const tableLabel = await t.tableLabel(tableIds);
    const taken = fresh.find(l => l.billId !== null);
    if (taken) throw await printedRefusal(t, taken.billId!);
    // Moved off this draft, added or edited since the preview, or previewed and now gone.
    const changed = fresh.find(l => l.draftId !== req.draftId || req.expectedV[l.lineId] !== l.v)
      ?? Object.keys(req.expectedV).filter(id => !fresh.some(l => l.lineId === id)).map(lineId => ({ lineId }))[0];
    if (changed) throw new ApprovalError('failed-precondition', 'the bill changed since the preview, preview again', { lineId: changed.lineId });
    const { body, flagged, cfg, message, dropped } = await compute(ports, req, fresh, id => t.getBill(id));
    if (!body) throw new ApprovalError('failed-precondition', message, { flagged });
    const key = counterKey(cfg.invoice.series, now, cfg.invoice);
    const n = numberOrRefuse(key, await t.getCounter(key), cfg.invoice);
    // D2 / BL-S25: the bills these lines were freed from, read here before any write. A-0417 edited and split into food
    // and drinks: both new bills say "Replaces A-0417", and A-0417 lists both (Q2-4).
    const olds = (await Promise.all([...new Set(fresh.map(l => l.lastBillId).filter((x): x is string => !!x))].sort().map(id => t.getBill(id))))
      .filter((b): b is Bill => !!b);
    const meta: Meta = {
      billId: t.newBillId(), number: n.number, series: cfg.invoice.series, fiscalYear: key.slice(cfg.invoice.series.length + 1),
      cid: req.cid, tableIds, sittingId, draftId: req.draftId, issuedAt: now, issuedBy: staff.staffId,
      seller: cfg.seller, customer: req.customer ?? null,
    };
    const r = issueBill(body, meta);
    if (!r.ok) throw new ApprovalError(r.code, r.message);
    const me: BillRef = { billId: meta.billId, number: billLabel(meta) };
    const bill: Bill = { ...r.value, dropped: dropped.map(d => d.type), replaces: olds.map(o => ({ billId: o.billId, number: billLabel(o) })) };
    t.setCounter(key, n.counter);
    t.setBill(meta.billId, bill);
    for (const o of olds) t.updateBill(o.billId, { replacedBy: [...(o.replacedBy ?? []), me] });
    for (const l of fresh) t.setLine(l.lineId, { billId: meta.billId, lastBillId: null });   // voided lines too: they sit in bill.lines[] and must not be re-billed
    // QB-7 / BL-S10: one P1 row per charge the cashier took off, with what it would have come to. The one fraud this
    // decision leaves without a PIN is a cashier taking ₹1,050 and dropping the ₹50 charge, so the row is the catch (Q2-5).
    for (const d of dropped) t.createAudit(`${meta.billId}_drop_${d.type}`, auditRow({ ts: now, cid: req.cid, action: 'dropCharge', staffId: staff.staffId, sev: 'P1', amount: d.amount, reason: 'charge removed', note: `${d.type} off bill ${me.number}`, lineId: null, before: null, after: null }));
    // KT-S6: the bill is paper at the counter, queued here so there is no moment where it exists and its job does not.
    t.enqueuePrint(newPrintJob({ jobId: printIds.bill(meta.billId), cid: req.cid, kind: 'bill', ticketNo: meta.number, tableLabel, billId: meta.billId, now }));
    return bill;
  });
  ports.log({ mod: 'billing', cid: req.cid, billId: bill.billId, from: 'draft', to: 'issued', number: bill.number, payable: bill.payable, replaces: bill.replaces?.map(x => x.number), dropped: bill.dropped });
  return bill;
}

export interface CancelRequest { restaurantId: string; sessionId: string; cid: string; billId: string; reason: string; note?: string; pin?: unknown }

/** BL-S9: issued and unpaid → cancelled; number kept; lines freed. Role, reason and PIN are ST's (one door); ST writes the P0 audit row. */
export async function cancel(ports: Ports, req: CancelRequest): Promise<Bill> {
  const staff = await ports.staff.bySession(req.restaurantId, req.sessionId);
  const existing = await ports.getBill(req.restaurantId, req.billId);
  if (!existing) fail('not-found', 'bill not found');
  // Before the PIN is asked for, so nobody is asked for a PIN for nothing: the same rule the transaction applies again
  // below on the fresh bill (status, credit note, D3's money on it), since a payment can land in between.
  const pre = cancelBill(existing!, 0, staff.staffId, req.reason);
  if (!pre.ok) fail(pre.code, pre.message);
  await ports.approve({ restaurantId: req.restaurantId, sessionId: req.sessionId, action: 'cancelBill', cid: req.cid, reason: req.reason, note: `${req.note ?? ''} bill ${existing!.number} ₹${existing!.payable}`.trim().slice(0, 200), pin: req.pin });
  const now = ports.now();
  const bill = await ports.transact(req.restaurantId, async t => {
    const b = await t.getBill(req.billId);
    if (!b) throw new ApprovalError('not-found', 'bill not found');
    const r = cancelBill(b, now, staff.staffId, req.reason);
    if (!r.ok) throw new ApprovalError(r.code, r.message);
    t.updateBill(req.billId, { status: 'cancelled', cancelled: r.value.cancelled });
    for (const l of b.lines) t.setLine(l.lineId, { billId: null, lastBillId: req.billId });   // D2: the next bill says what it replaces
    return r.value;
  });
  ports.log({ mod: 'billing', cid: req.cid, billId: req.billId, from: 'issued', to: 'cancelled' });
  return bill;
}

export interface EditRequest { restaurantId: string; sessionId: string; cid: string; billId: string }

/**
 * DECISION(D2, 2026-09-25): 22:10 table 12 adds gulab jamun: Edit cancels A-0417 as "edited" with no PIN, and the new bill says it replaces it. See moonshot/reviews/2026-09-25-decisions-for-shaurya.md. If you change this, ask Shaurya first.
 * BL-S9's cancel with reason `edited`: cashier only, no PIN, and one P1 `bill.edit` row in the same transaction as the
 * act (never before it, QB-4). D3's "no money on it" is re-checked inside, on the fresh bill: a second till taking ₹200
 * in the same second makes one of the two retry. The dishes go back to the same draft carrying `lastBillId`.
 * The row is keyed on the bill id, not the till's cid: the till sends `till_<draftId>`, and a second Edit on the same
 * table in one night would collide on it.
 */
export async function edit(ports: Ports, req: EditRequest): Promise<Bill> {
  const staff = await ports.staff.bySession(req.restaurantId, req.sessionId);
  if (!ISSUERS.includes(staff.role)) fail('permission-denied', 'Only the cashier can edit a bill');
  const existing = await ports.getBill(req.restaurantId, req.billId);
  if (!existing) fail('not-found', 'bill not found');
  const pre = cancelBill(existing!, 0, staff.staffId, 'edited');
  if (!pre.ok) fail(pre.code, pre.message);
  const now = ports.now();
  const bill = await ports.transact(req.restaurantId, async t => {
    const b = await t.getBill(req.billId);
    if (!b) throw new ApprovalError('not-found', 'bill not found');
    const r = cancelBill(b, now, staff.staffId, 'edited');
    if (!r.ok) throw new ApprovalError(r.code, r.message);
    t.updateBill(req.billId, { status: 'cancelled', cancelled: r.value.cancelled });
    for (const l of b.lines) t.setLine(l.lineId, { billId: null, lastBillId: req.billId });
    t.createAudit(`${req.billId}_edit`, auditRow({ ts: now, cid: b.cid, action: 'bill.edit', staffId: staff.staffId, sev: 'P1', amount: b.payable, reason: 'edited', note: `bill ${billLabel(b)} ₹${b.payable / 100}`, lineId: null, before: null, after: null }));
    return r.value;
  });
  ports.log({ mod: 'billing', cid: bill.cid, billId: req.billId, from: 'issued', to: 'cancelled', reason: 'edited', by: staff.staffId, payable: bill.payable });
  return bill;
}

export interface CreditRequest { restaurantId: string; sessionId: string; cid: string; billId: string; reason: string; note?: string; pin?: unknown; credits: { lineId: string; qty: number }[] }

/** BL-S11: a new document in the credit-note series, the original gains creditNotes[]. */
export async function creditNote(ports: Ports, req: CreditRequest): Promise<Bill> {
  const staff = await ports.staff.bySession(req.restaurantId, req.sessionId);
  if (!Array.isArray(req.credits) || !req.credits.length) fail('invalid-argument', 'nothing to credit');
  const existing = await ports.getBill(req.restaurantId, req.billId);
  if (!existing) fail('not-found', 'bill not found');
  if (existing!.status !== 'paid') fail('failed-precondition', `credit note needs a paid bill, this one is ${existing!.status}`);   // before the PIN is asked for
  await ports.approve({ restaurantId: req.restaurantId, sessionId: req.sessionId, action: 'creditNote', cid: req.cid, reason: req.reason, note: `${req.note ?? ''} bill ${existing!.number} ${req.credits.map(c => `${c.lineId}×${c.qty}`).join(' ')}`.trim().slice(0, 200), pin: req.pin });
  const now = ports.now();
  const note = await ports.transact(req.restaurantId, async t => {
    const b = await t.getBill(req.billId);
    if (!b) throw new ApprovalError('not-found', 'bill not found');
    const tableLabel = await t.tableLabel(b.tableIds);
    const cfg = await ports.config.billing(req.restaurantId);
    const key = counterKey(cfg.invoice.creditNoteSeries, now, cfg.invoice);
    const n = numberOrRefuse(key, await t.getCounter(key), cfg.invoice);
    const meta: Meta = {
      billId: t.newBillId(), number: n.number, series: cfg.invoice.creditNoteSeries, fiscalYear: key.slice(cfg.invoice.creditNoteSeries.length + 1),
      cid: req.cid, tableIds: b.tableIds, sittingId: b.sittingId, draftId: b.draftId, issuedAt: now, issuedBy: staff.staffId, seller: b.seller, customer: b.customer ?? null,
    };
    const r = noteOn(b, req.credits, meta);
    if (!r.ok) throw new ApprovalError(r.code, r.message);
    t.setCounter(key, n.counter);
    t.setBill(meta.billId, r.value.note);
    t.updateBill(req.billId, { lines: r.value.original.lines, creditNotes: r.value.original.creditNotes });
    t.enqueuePrint(newPrintJob({ jobId: printIds.credit(meta.billId), cid: req.cid, kind: 'credit', ticketNo: meta.number, tableLabel, billId: meta.billId, now }));   // KT-S15
    return r.value.note;
  });
  ports.log({ mod: 'billing', cid: req.cid, billId: req.billId, from: 'paid', to: 'paid', creditNote: note.billId, number: note.number, payable: note.payable });
  return note;
}

export interface SplitRequest { restaurantId: string; sessionId: string; cid: string; draftId: string; moves: { lineId: string; toDraftId: string }[] }

/** BL-S12: move lines between drafts in one transaction. Unbilled lines only; nothing is re-priced. */
export async function split(ports: Ports, req: SplitRequest): Promise<{ moved: number }> {
  const staff = await ports.staff.bySession(req.restaurantId, req.sessionId);
  if (!ISSUERS.includes(staff.role)) fail('permission-denied', 'Not allowed for your role');
  if (!Array.isArray(req.moves) || !req.moves.length) fail('invalid-argument', 'nothing to move');
  const moved = await ports.transact(req.restaurantId, async t => {
    const fresh = await t.getLines(req.moves.map(m => m.lineId));
    if (fresh.length !== req.moves.length) throw new ApprovalError('not-found', 'line not found');
    const taken = fresh.find(l => l.billId !== null);
    if (taken) throw await printedRefusal(t, taken.billId!);
    for (const m of req.moves) t.setLine(m.lineId, { draftId: m.toDraftId });
    return req.moves.length;
  });
  ports.log({ mod: 'billing', cid: req.cid, from: req.draftId, to: 'split', moved });
  return { moved };
}

/** BL-S16: read only; the reprint audit row is ST's (`reprint`, P1, amount = payable). */
export async function get(ports: Ports, req: { restaurantId: string; sessionId: string; billId: string }): Promise<Bill> {
  await ports.staff.bySession(req.restaurantId, req.sessionId);
  const b = await ports.getBill(req.restaurantId, req.billId);
  if (!b) fail('not-found', 'bill not found');
  return b!;
}

/** Config shape → settings with defaults. A missing doc is not an error for preview of a fresh restaurant; a thrown read is (R12). */
export function settingsFrom(raw: unknown, info: { name?: string; address?: string } | undefined): BillingSettings {
  const r = (raw ?? {}) as Record<string, Record<string, unknown>>;
  const b = r.billing ?? {}, i = r.invoice ?? {}, s = r.seller ?? {}, tax = r.tax ?? {};
  const num = (v: unknown, d: number) => (typeof v === 'number' && Number.isFinite(v) ? v : d);
  const str = (v: unknown, d: string) => (typeof v === 'string' ? v : d);
  const charges = Array.isArray(b.charges) ? (b.charges as Record<string, unknown>[]).map(c => ({
    type: str(c.type, 'SERVICE_CHARGE'),
    pctBps: typeof c.pctBps === 'number' ? c.pctBps : Math.round(num(c.percentage, 0) * 100),   // old key stays a percent
    flat: Math.max(0, Math.round(num(c.amount, 0))),   // BT: a flat row (packing) is `amount` in minor units; the old checkout ignores rows with no `percentage`
    taxBlockId: str(c.taxBlockId, 'food'),
    ...(c.optIn === true ? { optIn: true } : {}),
  })) : [];
  return {
    billing: { partRounding: tax.partRounding === 'residualLast' ? 'residualLast' : BILLING_DEFAULTS.partRounding, roundTo: num(b.roundTo, BILLING_DEFAULTS.roundTo), charges },
    invoice: { ...INVOICE_DEFAULTS, series: str(i.series, INVOICE_DEFAULTS.series), creditNoteSeries: str(i.creditNoteSeries, INVOICE_DEFAULTS.creditNoteSeries), fiscalYearStartMonth: num(i.fiscalYearStartMonth, 4), width: num(i.width, 4), timezone: str((r.locale ?? {}).timezone, INVOICE_DEFAULTS.timezone) },
    seller: { name: str(s.name, info?.name ?? ''), address: str(s.address, info?.address ?? ''), taxId: str(s.taxId, ''), stateCode: str(s.stateCode, ''), placeOfSupply: str(s.placeOfSupply, '') },
  };
}

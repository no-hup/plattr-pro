// BL · use-cases: preview / issue / cancel / creditNote / reprint / split / get. Domain does the money; ports do the I/O.
// Every money figure is recomputed here from line snapshots (R2, R12); nothing the client sends is trusted.
import { Line } from '../domain/line';
import {
  Bill, BillBody, BillDiscount, BillingConfig, BILLING_DEFAULTS, ChargeIn, Meta, Seller,
  cancel as cancelBill, creditNote as noteOn, issue as issueBill, preview as previewBody,
} from '../domain/billing';
import { Counter, InvoiceConfig, INVOICE_DEFAULTS, counterKey, nextNumber } from '../domain/invoice';
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
  newBillId(): string;
}
export interface Ports {
  now(): number;
  log(line: object): void;
  staff: { bySession(restaurantId: string, sessionId: string): Promise<Staff> };
  config: { billing(restaurantId: string): Promise<BillingSettings> };     // throws when the doc cannot be read (R12)
  linesOfDraft(restaurantId: string, draftId: string): Promise<Line[]>;
  orderOffer(restaurantId: string, orderId: string): Promise<OrderOffer | null>;   // BL-S24: as evaluated at placement
  getBill(restaurantId: string, billId: string): Promise<Bill | null>;
  approve(req: ApplyRequest): Promise<ApplyResult>;   // ST's one door: role, reason, PIN, P0 audit row. Throws permission-denied {requires:'pin'} until the PIN arrives
  transact<T>(restaurantId: string, fn: (t: Tx) => Promise<T>): Promise<T>;
}

const ISSUERS = ['MANAGER', 'ADMIN'];
const fail = (code: string, message: string, details: Record<string, unknown> = {}): never => { throw new ApprovalError(code, message, details); };

export interface PreviewRequest { restaurantId: string; sessionId: string; draftId: string; dropCharges?: string[]; discount?: BillDiscount | null; customer?: { name: string; taxId: string } | null }
export interface PreviewResult extends BillBody { flagged: string[]; offer: OrderOffer | null }

/** BL-S1..S6, S14, S21..S24. Computed, never written. `flagged` names lines that cannot be issued. */
export async function preview(ports: Ports, req: PreviewRequest): Promise<PreviewResult> {
  await ports.staff.bySession(req.restaurantId, req.sessionId);
  const { body, flagged, offer, message } = await compute(ports, req);
  if (!body) fail('failed-precondition', message, { flagged });
  return { ...body!, flagged, offer };
}

async function compute(ports: Ports, req: PreviewRequest, lines?: Line[]) {
  const cfg = await ports.config.billing(req.restaurantId);
  const all = lines ?? await ports.linesOfDraft(req.restaurantId, req.draftId);
  const open = all.filter(l => l.billId === null);
  const orderId = open[0]?.orderId;
  // BL-S24: the order offer as evaluated when the round was placed becomes the bill discount, apportioned by R1.
  const offer = orderId ? await ports.orderOffer(req.restaurantId, orderId) : null;
  const discount: BillDiscount | null = req.discount ?? (offer && offer.amount > 0
    ? { amount: offer.amount, pct: 0, source: { reason: offer.name, note: offer.id, approverId: 'offer' }, ...(offer.targets ? { targets: offer.targets } : {}) }
    : null);
  const charges = cfg.billing.charges.filter(c => !(req.dropCharges ?? []).includes(c.type));
  const r = previewBody(open, discount, charges, cfg.billing);
  if (!r.ok) {
    if (r.lineIds) return { body: null, flagged: r.lineIds, message: r.message, offer, cfg, open };
    fail(r.code, r.message);
  }
  return { body: (r as { value: BillBody }).value, flagged: [] as string[], message: '', offer, cfg, open };
}

export interface IssueRequest extends PreviewRequest { pin?: unknown; cid: string; tableIds: string[]; expectedV: Record<string, number> }

/** BL-S7: number, freeze, lines stamped, counter moved, all in one transaction. Recomputed from snapshots. */
export async function issue(ports: Ports, req: IssueRequest): Promise<Bill> {
  const staff = await ports.staff.bySession(req.restaurantId, req.sessionId);
  if (!ISSUERS.includes(staff.role)) fail('permission-denied', 'Not allowed for your role');
  if (typeof req.cid !== 'string' || !req.cid) fail('invalid-argument', 'cid required');

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
    const taken = fresh.find(l => l.billId !== null);
    if (taken) throw new ApprovalError('failed-precondition', `already issued ${taken.billId}`, { billId: taken.billId });
    for (const l of fresh) if (req.expectedV[l.lineId] !== undefined && req.expectedV[l.lineId] !== l.v) throw new ApprovalError('failed-precondition', 'line changed, preview again', { lineId: l.lineId });
    const { body, flagged, cfg, message } = await compute(ports, req, fresh);
    if (!body) throw new ApprovalError('failed-precondition', message, { flagged });
    const key = counterKey(cfg.invoice.series, now, cfg.invoice);
    const n = nextNumber(await t.getCounter(key), cfg.invoice);
    const meta: Meta = {
      billId: t.newBillId(), number: n.number, series: cfg.invoice.series, fiscalYear: key.slice(cfg.invoice.series.length + 1),
      cid: req.cid, tableIds: req.tableIds, sessionId: req.sessionId, draftId: req.draftId, issuedAt: now, issuedBy: staff.staffId,
      seller: cfg.seller, customer: req.customer ?? null,
    };
    const r = issueBill(body, meta);
    if (!r.ok) throw new ApprovalError(r.code, r.message);
    t.setCounter(key, n.counter);
    t.setBill(meta.billId, r.value);
    for (const l of fresh) t.setLine(l.lineId, { billId: meta.billId });   // voided lines too: they sit in bill.lines[] and must not be re-billed
    return r.value;
  });
  ports.log({ mod: 'billing', cid: req.cid, billId: bill.billId, from: 'draft', to: 'issued', number: bill.number, payable: bill.payable });
  return bill;
}

export interface CancelRequest { restaurantId: string; sessionId: string; cid: string; billId: string; reason: string; note?: string; pin?: unknown }

/** BL-S9: issued and unpaid → cancelled; number kept; lines freed. Role, reason and PIN are ST's (one door); ST writes the P0 audit row. */
export async function cancel(ports: Ports, req: CancelRequest): Promise<Bill> {
  const staff = await ports.staff.bySession(req.restaurantId, req.sessionId);
  const existing = await ports.getBill(req.restaurantId, req.billId);
  if (!existing) fail('not-found', 'bill not found');
  if (existing!.status !== 'issued') fail('failed-precondition', `cannot cancel a ${existing!.status} bill`);   // before the PIN is asked for
  await ports.approve({ restaurantId: req.restaurantId, sessionId: req.sessionId, action: 'cancelBill', cid: req.cid, reason: req.reason, note: `${req.note ?? ''} bill ${existing!.number} ₹${existing!.payable}`.trim().slice(0, 200), pin: req.pin });
  const now = ports.now();
  const bill = await ports.transact(req.restaurantId, async t => {
    const b = await t.getBill(req.billId);
    if (!b) throw new ApprovalError('not-found', 'bill not found');
    const r = cancelBill(b, now, staff.staffId, req.reason);
    if (!r.ok) throw new ApprovalError(r.code, r.message);
    t.updateBill(req.billId, { status: 'cancelled', cancelled: r.value.cancelled });
    for (const l of b.lines) t.setLine(l.lineId, { billId: null });
    return r.value;
  });
  ports.log({ mod: 'billing', cid: req.cid, billId: req.billId, from: 'issued', to: 'cancelled' });
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
    const cfg = await ports.config.billing(req.restaurantId);
    const key = counterKey(cfg.invoice.creditNoteSeries, now, cfg.invoice);
    const n = nextNumber(await t.getCounter(key), cfg.invoice);
    const meta: Meta = {
      billId: t.newBillId(), number: n.number, series: cfg.invoice.creditNoteSeries, fiscalYear: key.slice(cfg.invoice.creditNoteSeries.length + 1),
      cid: req.cid, tableIds: b.tableIds, sessionId: req.sessionId, draftId: b.draftId, issuedAt: now, issuedBy: staff.staffId, seller: b.seller, customer: b.customer ?? null,
    };
    const r = noteOn(b, req.credits, meta);
    if (!r.ok) throw new ApprovalError(r.code, r.message);
    t.setCounter(key, n.counter);
    t.setBill(meta.billId, r.value.note);
    t.updateBill(req.billId, { lines: r.value.original.lines, creditNotes: r.value.original.creditNotes });
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
    if (taken) throw new ApprovalError('failed-precondition', `already issued ${taken.billId}`);
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
    taxBlockId: str(c.taxBlockId, 'food'),
  })) : [];
  return {
    billing: { partRounding: tax.partRounding === 'residualLast' ? 'residualLast' : BILLING_DEFAULTS.partRounding, roundTo: num(b.roundTo, BILLING_DEFAULTS.roundTo), charges },
    invoice: { ...INVOICE_DEFAULTS, series: str(i.series, INVOICE_DEFAULTS.series), creditNoteSeries: str(i.creditNoteSeries, INVOICE_DEFAULTS.creditNoteSeries), fiscalYearStartMonth: num(i.fiscalYearStartMonth, 4), width: num(i.width, 4), timezone: str((r.locale ?? {}).timezone, INVOICE_DEFAULTS.timezone) },
    seller: { name: str(s.name, info?.name ?? ''), address: str(s.address, info?.address ?? ''), taxId: str(s.taxId, ''), stateCode: str(s.stateCode, ''), placeOfSupply: str(s.placeOfSupply, '') },
  };
}

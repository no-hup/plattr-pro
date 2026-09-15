// PY · Payments — pure. No I/O, no clock, no Firestore, no currency symbol, no tender name.
// Money is integer minor units everywhere. See moonshot/SPEC_PY_payments.md.

export type TenderKind = 'cash' | 'external';
export interface Tender { id: string; label: string; kind: TenderKind; opensDrawer: boolean; needsRef: boolean }
export interface PaymentsConfig { tenders: Tender[]; maxTendersPerBill: number; settleWithin: number; dayCloseHour: number; dayCloseMinute: number; timezoneOffsetMinutes: number }

export type BillStatus = 'draft' | 'issued' | 'paid' | 'cancelled';
export interface Bill { billId: string; payable: number; status: BillStatus }

export interface VoidBlock { at: number; by: string; reason: string; note?: string | null }
export interface Row {
  kind: 'take' | 'refund';
  amount: number;
  tender: Tender;
  tendered?: number | null;
  change?: number | null;
  captured?: boolean;
  overpaid?: number | null;
  creditNoteId?: string | null;
  refundsPaymentId?: string | null;
  void?: VoidBlock | null;
}
export interface Note { creditNoteId: string; billId: string; total: number; refundedTotal: number; status?: string }

export type Code = 'invalid-argument' | 'failed-precondition' | 'permission-denied';
export type Verdict = { ok: true } | { ok: false; code: Code; message: string };
const no = (code: Code, message: string): Verdict => ({ ok: false, code, message });
const yes: Verdict = { ok: true };

export const DEFAULTS: PaymentsConfig = {
  tenders: [
    { id: 'cash', label: 'Cash', kind: 'cash', opensDrawer: true, needsRef: false },
    { id: 'card', label: 'Card', kind: 'external', opensDrawer: false, needsRef: true },
    { id: 'upi', label: 'UPI', kind: 'external', opensDrawer: false, needsRef: true },
  ],
  maxTendersPerBill: 10,
  // Shaurya 2026-09-15: round off. BL already rounds payable to whole units, so a sub-unit
  // remainder can only come from a mistyped tender, and chasing a cashier for it at 11pm costs
  // more than it is worth. 0 requires the exact amount.
  settleWithin: 99,
  dayCloseHour: 4,
  dayCloseMinute: 0,
  timezoneOffsetMinutes: 330, // Asia/Kolkata. A value, not a country.
};

const MAX_MONEY = 100_000_000_00; // ten crore in minor units. A pad with no max length, not a business limit.
const isMoney = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v) && v >= 0 && v <= MAX_MONEY;
const blank = (v: unknown): boolean => typeof v !== 'string' || v.trim() === '';

// ── config ──────────────────────────────────────────────────────────────────
export function configFrom(raw: unknown): { config: PaymentsConfig; warnings: string[] } {
  const warnings: string[] = [];
  const src = (raw && typeof raw === 'object' ? (raw as Record<string, unknown>).payments : null) as Record<string, unknown> | null;
  if (!src || typeof src !== 'object') {
    if (raw !== null && raw !== undefined) warnings.push('payments config missing, defaults applied');
    else warnings.push('config document missing, defaults applied');
    return { config: DEFAULTS, warnings };
  }
  let tenders = DEFAULTS.tenders;
  if (Array.isArray(src.tenders)) {
    const kept = (src.tenders as unknown[]).filter((t): t is Tender => {
      const r = t as Record<string, unknown>;
      const ok = !!r && typeof r.id === 'string' && r.id !== '' && (r.kind === 'cash' || r.kind === 'external');
      if (!ok) warnings.push(`tender row ignored: ${JSON.stringify(t)}`);
      return ok;
    }).map((t) => ({ id: t.id, label: typeof t.label === 'string' ? t.label : t.id, kind: t.kind, opensDrawer: t.opensDrawer === true, needsRef: t.needsRef === true }));
    // An empty list after filtering is a real configuration, not a reason to invent cash (Decisions).
    tenders = kept;
  } else if (src.tenders !== undefined) {
    warnings.push('payments.tenders is not an array, defaults applied');
  }
  const max = src.maxTendersPerBill;
  let maxTendersPerBill = DEFAULTS.maxTendersPerBill;
  if (typeof max === 'number' && Number.isInteger(max) && max >= 0) {
    maxTendersPerBill = max;
    if (max === 0) warnings.push('payments.maxTendersPerBill is 0: no take will be accepted');
  } else if (max !== undefined) {
    warnings.push('payments.maxTendersPerBill is not a non-negative integer, default applied');
  }
  const num = (v: unknown, d: number) => (typeof v === 'number' && Number.isInteger(v) ? v : d);
  const within = src.settleWithin;
  let settleWithin = DEFAULTS.settleWithin;
  if (typeof within === 'number' && Number.isInteger(within) && within >= 0) settleWithin = within;
  else if (within !== undefined) warnings.push('payments.settleWithin is not a non-negative integer, default applied');
  return {
    config: {
      tenders,
      maxTendersPerBill,
      settleWithin,
      dayCloseHour: num(src.dayCloseHour, DEFAULTS.dayCloseHour),
      dayCloseMinute: num(src.dayCloseMinute, DEFAULTS.dayCloseMinute),
      timezoneOffsetMinutes: num(src.timezoneOffsetMinutes, DEFAULTS.timezoneOffsetMinutes),
    },
    warnings,
  };
}

export const tenderById = (config: PaymentsConfig, id: unknown): Tender | undefined =>
  typeof id === 'string' ? config.tenders.find((t) => t.id === id) : undefined;

// ── the money, derived from rows every time ─────────────────────────────────
const live = (rows: Row[]): Row[] => (rows || []).filter((r) => !r.void);

/** R2. Net receipts over non-void rows. `overpaid` and `tendered` are never in it. */
export function paidTotalOf(rows: Row[]): number {
  return live(rows).reduce((n, r) => {
    if (r.kind === 'take') return n + r.amount;
    // R7: an overpay refund returns money that was never in paidTotal, so it does not move it.
    return r.refundsPaymentId ? n : n - r.amount;
  }, 0);
}

/** R2. Negative when over-taken; callers must see that rather than a clamp. */
export const outstanding = (bill: Bill, rows: Row[]): number => bill.payable - paidTotalOf(rows);

/**
 * R3. The one definition. BL imports this for its zero-payable stamp (PY-S8).
 * `within` is the round-off tolerance (R9): a remainder at or below it settles the bill.
 */
export const isSettled = (payable: number, paidTotal: number, within = 0): boolean => payable - paidTotal <= within;

/** R2. Status follows outstanding in both directions; never a one-way latch. */
export const statusFor = (bill: Bill, rows: Row[], config: PaymentsConfig = DEFAULTS): BillStatus =>
  bill.status === 'cancelled' ? 'cancelled'
    : isSettled(bill.payable, paidTotalOf(rows), config.settleWithin) ? 'paid' : 'issued';

// ── R6. Cash makes change; external either fits or has already moved. ───────
export function changeFor(tender: Tender, tendered: number, out: number): { amount: number; change: number } {
  if (tender.kind !== 'cash') throw new Error('changeFor is cash only; use overpaidFor');
  const amount = Math.min(tendered, Math.max(out, 0));
  return { amount, change: tendered - amount };
}

export function overpaidFor(tender: Tender, received: number, out: number): { amount: number; overpaid: number } {
  if (tender.kind !== 'external') throw new Error('overpaidFor is external only; use changeFor');
  const amount = Math.min(received, Math.max(out, 0));
  return { amount, overpaid: received - amount };
}

// ── R18. The day a payment belongs to. ──────────────────────────────────────
/** Calendar date of `at`, shifted back by the close time. 03:30 with close 04:00 is the day before. */
export function businessDateFor(at: number, config: PaymentsConfig): string {
  const closeMs = (config.dayCloseHour * 60 + config.dayCloseMinute) * 60_000;
  const localMs = at + config.timezoneOffsetMinutes * 60_000;
  return new Date(localMs - closeMs).toISOString().slice(0, 10);
}

// ── the gates ───────────────────────────────────────────────────────────────
export interface TakeRequest { role?: string; tenderId?: unknown; amount?: unknown; tendered?: unknown; captured?: unknown; ref?: unknown; creditNoteId?: unknown }

const STAFF = ['MANAGER', 'ADMIN'];

export function canTake(bill: Bill | null, rows: Row[], req: TakeRequest, config: PaymentsConfig): Verdict {
  if (!STAFF.includes(String(req.role))) return no('permission-denied', 'Manager or admin required');
  if (!bill) return no('failed-precondition', 'No bill issued for this table');
  if (bill.status !== 'issued' && bill.status !== 'paid') return no('failed-precondition', `Bill is ${bill.status}`);
  if (req.creditNoteId != null) return no('invalid-argument', 'A take never reverses a credit note');

  const tender = tenderById(config, req.tenderId);
  if (!tender) return no('invalid-argument', `Unknown tender ${String(req.tenderId)}`);
  if (tender.needsRef && blank(req.ref)) return no('invalid-argument', `${tender.label} needs a reference`);

  const cash = tender.kind === 'cash';
  if (cash && req.captured === true) return no('invalid-argument', 'Cash is never already captured');
  const sent = cash ? req.tendered : req.amount;
  if (!isMoney(sent) || sent === 0) return no('invalid-argument', 'Amount must be a positive integer in minor units');

  const out = outstanding(bill, rows);
  if (out <= config.settleWithin) return no('failed-precondition', 'Nothing outstanding');

  // R6: an external tender chosen at the till can still be corrected, so an overshoot is refused.
  // One that has already reached us cannot be un-sent, so it is recorded (PY-S28).
  if (!cash && sent > out && req.captured !== true) return no('invalid-argument', 'More than the bill outstanding');

  const liveTakes = live(rows).filter((r) => r.kind === 'take').length;
  if (liveTakes >= config.maxTendersPerBill) return no('failed-precondition', `At most ${config.maxTendersPerBill} payments per bill`);
  return yes;
}

export interface RefundRequest { role?: string; tenderId?: unknown; amount?: unknown; creditNoteId?: unknown; refundsPaymentId?: unknown; reason?: unknown }

export function canRefund(bill: Bill | null, rows: Row[], note: Note | null, target: Row | null, req: RefundRequest, config: PaymentsConfig): Verdict {
  if (!STAFF.includes(String(req.role))) return no('permission-denied', 'Manager or admin required');
  if (!bill) return no('failed-precondition', 'No bill');
  if (!tenderById(config, req.tenderId)) return no('invalid-argument', `Unknown tender ${String(req.tenderId)}`);
  if (!isMoney(req.amount) || req.amount === 0) return no('invalid-argument', 'Amount must be a positive integer in minor units');
  if (blank(req.reason)) return no('invalid-argument', 'A reason is required');

  const byNote = req.creditNoteId != null;
  const byRow = req.refundsPaymentId != null;
  if (byNote === byRow) return no('invalid-argument', 'Name exactly one of creditNoteId or refundsPaymentId');

  if (byRow) {
    // PY-S32: returning an overpay. Never bill money, so it does not reopen a settled bill.
    if (!target || target.void) return no('failed-precondition', 'No such payment row');
    // What is left of the overpay after the refunds already made against that row. Derived, so voiding one restores it.
    const already = live(rows).filter((r) => r.kind === 'refund' && r.refundsPaymentId === req.refundsPaymentId).reduce((n, r) => n + r.amount, 0);
    const left = (target.overpaid || 0) - already;
    if (left <= 0) return no('failed-precondition', 'That payment has no overpay to return');
    if (req.amount > left) return no('failed-precondition', 'More than the overpay on that payment');
    return yes;
  }

  // Shaurya 2026-09-15: refund to the tender the guest paid on if we can, cash only as a last
  // resort. A tender that never paid this bill is not a route back out of it.
  const paidOn = new Set(live(rows).filter((r) => r.kind === 'take').map((r) => r.tender.id));
  const back = tenderById(config, req.tenderId) as Tender;
  if (!paidOn.has(back.id) && back.kind !== 'cash') {
    return no('failed-precondition', `${back.label} was not used to pay this bill; refund to a tender that was, or to cash`);
  }

  if (!note) return no('failed-precondition', 'No such credit note');
  if (note.billId !== bill.billId) return no('failed-precondition', 'That credit note is for another bill');
  if (note.status === 'cancelled') return no('failed-precondition', 'That credit note is cancelled');
  // PY-S25: BL owns the precondition, PY checks it too. "Fully paid" is what the guest handed over (the takes);
  // refunds already given never make a bill unpaid again for this purpose, or a note could never be refunded in parts.
  const taken = live(rows).filter((r) => r.kind === 'take').reduce((n, r) => n + r.amount, 0);
  if (bill.payable - taken > config.settleWithin) return no('failed-precondition', 'Bill is not fully paid');
  if (note.refundedTotal + req.amount > note.total) return no('failed-precondition', 'More than the credit note');
  return yes;
}

export interface VoidRequest { role?: string; by?: string; reason?: unknown }

/** R15, R17. `retry` means the same staff repeating the same reason: idempotent, not an error. */
export function canVoid(row: Row | null, dateClosed: boolean | null, req: VoidRequest): Verdict | { ok: true; retry: true } {
  if (!STAFF.includes(String(req.role))) return no('permission-denied', 'Manager or admin required');
  if (!row) return no('failed-precondition', 'No such payment row');
  if (blank(req.reason)) return no('invalid-argument', 'A reason is required');
  if (row.void) {
    return row.void.by === req.by && row.void.reason === req.reason
      ? { ok: true, retry: true }
      : no('failed-precondition', 'That payment is already voided');
  }
  if (dateClosed !== false) return no('failed-precondition', dateClosed === null ? 'Day close state unknown' : 'That day is closed');
  return yes;
}

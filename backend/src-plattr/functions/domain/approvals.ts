// ST · Staff PIN & approvals — pure decisions. No firebase, no adapters, no clock: `now` is passed in.
// Sheet: moonshot/SPEC_ST_staff_pin_and_approvals.md

export type Action = 'discount' | 'billDiscount' | 'removeOffer' | 'void' | 'reprint' | 'drawer' | 'cancelBill' | 'creditNote' | 'estimate' | 'releaseUnpaid';
export type Role = 'ADMIN' | 'MANAGER' | 'SERVER' | 'KITCHEN';
export type Sev = 'P0' | 'P1';
export type ErrorCode = 'permission-denied' | 'invalid-argument' | 'failed-precondition';

export interface ApprovalsConfig {
  discountPinAbovePercent: number;
  discountMaxPercent: number;   // TD-004: above this a staff line discount is refused, PIN or not. 100 = no cap
  voidAfterKitchenNeedsPin: boolean;
  pinSlowAfterWrong: number;
  pinSlowWindowMinutes: number;
  pinSlowMaxSeconds: number;
  reasons: string[];
}

export const DEFAULTS: ApprovalsConfig = {
  discountPinAbovePercent: 10,
  discountMaxPercent: 50,   // Shaurya 2026-09-24
  voidAfterKitchenNeedsPin: true,
  pinSlowAfterWrong: 5,
  pinSlowWindowMinutes: 10,
  pinSlowMaxSeconds: 120,
  reasons: ['placard', 'regular', 'complaint', 'birthday', 'guest left', 'staff meal', 'complimentary', 'other'],
};

const NOTE_MAX = 200;
const ACTIONS: Action[] = ['discount', 'billDiscount', 'removeOffer', 'void', 'reprint', 'drawer', 'cancelBill', 'creditNote', 'estimate', 'releaseUnpaid'];

/** Raw `approvals` block from the config doc → full config plus one warning per bad key. Never PIN-free on bad input. */
export function configFrom(raw: unknown): { config: ApprovalsConfig; warnings: string[] } {
  if (raw === undefined || raw === null || typeof raw !== 'object') {
    return { config: { ...DEFAULTS }, warnings: ['approvals config missing, defaults apply'] };
  }
  const r = raw as Record<string, unknown>;
  const warnings: string[] = [];
  const pick = <K extends keyof ApprovalsConfig>(key: K, ok: (v: unknown) => boolean): ApprovalsConfig[K] => {
    if (r[key] === undefined) return DEFAULTS[key];
    if (ok(r[key])) return r[key] as ApprovalsConfig[K];
    warnings.push(`approvals.${key} invalid, default ${JSON.stringify(DEFAULTS[key])} applies`);
    return DEFAULTS[key];
  };
  const nonNegNumber = (v: unknown) => typeof v === 'number' && Number.isFinite(v) && v >= 0;
  return {
    config: {
      discountPinAbovePercent: pick('discountPinAbovePercent', nonNegNumber),
      discountMaxPercent: pick('discountMaxPercent', v => nonNegNumber(v) && (v as number) <= 100),
      voidAfterKitchenNeedsPin: pick('voidAfterKitchenNeedsPin', v => typeof v === 'boolean'),
      pinSlowAfterWrong: pick('pinSlowAfterWrong', v => nonNegNumber(v) && (v as number) >= 1),
      pinSlowWindowMinutes: pick('pinSlowWindowMinutes', nonNegNumber),
      pinSlowMaxSeconds: pick('pinSlowMaxSeconds', nonNegNumber),
      reasons: pick('reasons', v => Array.isArray(v) && v.every(x => typeof x === 'string')),
    },
    warnings,
  };
}

/** amount and listPrice are integer paise (R9). */
export interface DecideInput { action: Action; role: Role; amount?: number; listPrice?: number; lineSent?: boolean }
export type Decision = { ok: true; needsPin: boolean; sev: Sev } | { ok: false; code: ErrorCode };

export const toPaise = (rupees: number) => Math.round(rupees * 100);

/** The table in "Who can do what". Amount vs limit is compared in whole paise, never as a float percent (R9: discount / listPrice). */
export function decide(input: DecideInput, cfg: ApprovalsConfig): Decision {
  const { action, role } = input;
  if (!ACTIONS.includes(action)) return { ok: false, code: 'invalid-argument' };
  const isCashier = role === 'MANAGER' || role === 'ADMIN';
  if (!isCashier) {
    return action === 'void' && input.lineSent === false
      ? { ok: true, needsPin: false, sev: 'P1' }
      : { ok: false, code: 'permission-denied' };
  }
  switch (action) {
    // TD-019: a discount on the whole bill is the same act as a discount on one dish — a person
    // giving money away — so it is judged by the same key, against the bill's net instead of the
    // line's list price. One rule, one config value, no second threshold to keep in step.
    case 'discount': case 'billDiscount': {
      // TD-004 (Shaurya 2026-09-24): the ceiling is on the staff line discount only. The bill-level comp
      // (billDiscount: BL-S22 walkout, DC-S25 staff meal, NC) is a full give-away by design and keeps its
      // PIN-above-threshold rule; automatic offers never come through this door at all.
      const capped = action === 'discount' && cfg.discountMaxPercent < 100 && (input.amount ?? 0) * 100 > (input.listPrice ?? 0) * cfg.discountMaxPercent;
      if (capped) return { ok: false, code: 'failed-precondition' };
      const over = (input.amount ?? 0) * 100 > (input.listPrice ?? 0) * cfg.discountPinAbovePercent;
      return over ? { ok: true, needsPin: true, sev: 'P0' } : { ok: true, needsPin: false, sev: 'P1' };
    }
    case 'removeOffer': return { ok: true, needsPin: true, sev: 'P0' };
    case 'void':
      return input.lineSent
        ? { ok: true, needsPin: cfg.voidAfterKitchenNeedsPin, sev: 'P0' }
        : { ok: true, needsPin: false, sev: 'P1' };
    case 'reprint': return { ok: true, needsPin: false, sev: 'P1' };
    case 'drawer': return { ok: true, needsPin: true, sev: 'P0' };
    // BL-S9 / BL-S11: a bill-level reversal is always a PIN and always P0. BL calls this door before it moves a bill.
    case 'cancelBill': case 'creditNote': return { ok: true, needsPin: true, sev: 'P0' };
    // OF-S20: an emergency estimate printed with no server is a fact to record, not a change to a bill.
    // Audit only, no PIN: the money moves later through billing-issue and payments-take.
    case 'estimate': return { ok: true, needsPin: false, sev: 'P1' };
    // FL (Shaurya 2026-09-24): freeing a table that still owes is money walking out. Cashier only, always a PIN.
    case 'releaseUnpaid': return { ok: true, needsPin: true, sev: 'P0' };
  }
}

export function percentOf(amount: number, listPrice: number): number {
  return Math.round((amount / listPrice) * 10000) / 100;
}

/** null when fine, else the message for an invalid-argument error. Below-zero is applyToLine's call (failed-precondition, ST-S13). */
export function validateAmount(amount: unknown, listPrice: number): string | null {
  if (typeof amount !== 'number' || !Number.isFinite(amount)) return 'amount must be a number';
  if (!(listPrice > 0)) return 'line has no list price';
  if (amount <= 0) return 'amount must be more than 0';
  return null;
}

export function validateReason(reason: unknown, note: unknown, cfg: ApprovalsConfig): string | null {
  if (typeof reason !== 'string' || reason.trim() === '') return 'reason required';
  if (!cfg.reasons.includes(reason)) return 'reason not on the list';
  if (note !== undefined && note !== null && (typeof note !== 'string' || note.length > NOTE_MAX)) return `note longer than ${NOTE_MAX} characters`;
  return null;
}

// ── Wrong-PIN slowdown (R7): a streak slows the next attempt, it never locks the account ────
export interface PinState { wrongAt: number[]; retryAfter?: number }

/** A PIN arriving before retryAfter is refused unchecked and does not count. */
export function tooSoon(state: PinState, now: number): boolean {
  return state.retryAfter !== undefined && now < state.retryAfter;
}

/**
 * Window is [first wrong, first wrong + window). From the `pinSlowAfterWrong`-th wrong in the window the
 * next attempt waits min(pinSlowMaxSeconds, 2^(n − after)) seconds: 1, 2, 4, 8 … capped. `audit` is true
 * exactly once per streak, on the wrong that starts the slowdown.
 */
export function recordWrongPin(state: PinState, now: number, cfg: ApprovalsConfig): { state: PinState; attemptsLeft: number; penaltySeconds: number; audit: boolean } {
  const windowMs = cfg.pinSlowWindowMinutes * 60_000;
  const wrongAt = [...state.wrongAt.filter(t => t > now - windowMs), now];
  const n = wrongAt.length;
  const slowed = n >= cfg.pinSlowAfterWrong;
  const penaltySeconds = slowed ? Math.min(cfg.pinSlowMaxSeconds, 2 ** (n - cfg.pinSlowAfterWrong)) : 0;
  const next: PinState = slowed ? { wrongAt, retryAfter: now + penaltySeconds * 1000 } : { wrongAt };
  return { state: next, attemptsLeft: Math.max(0, cfg.pinSlowAfterWrong - n), penaltySeconds, audit: n === cfg.pinSlowAfterWrong };
}

// ── The line snapshot this module writes (v1 home: restaurants/{id}/lines/{lineId}, ST-Q2) ───
export interface DiscountSource { reason: string; note: string; approverId: string }
export interface Offer { id?: string; amount: number }
/** Money fields are integer paise, all cuts of the GST-inclusive menu price (R9). */
export interface Line {
  listPrice: number;
  sent: boolean;
  v: number;
  countsTowardTotal: boolean;
  discount?: { amount: number; pct: number; source: DiscountSource };
  void?: DiscountSource;
  offer?: Offer | null;
  removedOffer?: Offer | null;
}

/** R9: listPrice − offer − discount, in paise. */
export function net(line: Line): number {
  return line.listPrice - (line.offer?.amount ?? 0) - (line.discount?.amount ?? 0);
}
export interface Change { action: Action; amount?: number; pct?: number; reason: string; note: string; approverId: string }

export function applyToLine(line: Line, c: Change): { ok: true; line: Line } | { ok: false; code: ErrorCode; message: string } {
  if (line.void) return { ok: false, code: 'failed-precondition', message: 'line is voided' };
  const source: DiscountSource = { reason: c.reason, note: c.note, approverId: c.approverId };
  const v = line.v + 1;
  switch (c.action) {
    case 'discount': {
      // One manual discount slot: a new value replaces the old one (ST-S12). The line may not go below zero (ST-S13).
      const after: Line = { ...line, v, discount: { amount: c.amount ?? 0, pct: c.pct ?? 0, source } };
      if (net(after) < 0) return { ok: false, code: 'failed-precondition', message: 'line cannot go below zero' };
      return { ok: true, line: after };
    }
    case 'void': return { ok: true, line: { ...line, v, countsTowardTotal: false, void: source } };
    case 'removeOffer': return { ok: true, line: { ...line, v, offer: null, removedOffer: line.offer ?? null } };
    default: return { ok: false, code: 'invalid-argument', message: `${c.action} does not change a line` };
  }
}

// ── Audit row (R5) and log line (LG). Neither can carry the PIN: the keys are fixed here. ──
export interface AuditRow {
  ts: number; cid: string; action: string; staffId: string; sev: Sev; amount: number; pct: number;
  reason: string; note: string; lineId: string | null; before: Line | null; after: Line | null;
}
export interface AuditInput {
  ts: number; cid: string; action: string; staffId: string; sev: Sev; amount?: number; pct?: number;
  reason: string; note: string; lineId: string | null; before: Line | null; after: Line | null;
}

export function auditRow(i: AuditInput): AuditRow {
  const isVoid = i.action === 'void';
  const amount = isVoid ? (i.before?.listPrice ?? 0) : (i.amount ?? 0);
  const pct = isVoid ? 100 : (i.pct ?? 0);
  return { ts: i.ts, cid: i.cid, action: i.action, staffId: i.staffId, sev: i.sev, amount, pct, reason: i.reason, note: i.note, lineId: i.lineId, before: i.before, after: i.after };
}

export type Outcome = 'applied' | 'retry' | 'needs_pin' | 'wrong_pin' | 'too_soon' | 'forbidden' | 'invalid' | 'try_again';
export interface LogLine { cid: string; action: string; sev: Sev | null; needsPin: boolean; outcome: Outcome }
export function logLine(i: LogLine): LogLine {
  return { cid: i.cid, action: i.action, sev: i.sev, needsPin: i.needsPin, outcome: i.outcome };
}

// ── ST-S8 / R10: who and why from the audit rows, how much from the line docs ─────────────
export interface StaffSummary { p0: number; p1: number; rupees: number; topReasons: string[] }
export function summarise(rows: AuditRow[], lines: Line[]): Record<string, StaffSummary> {
  const out: Record<string, StaffSummary & { counts: Record<string, number> }> = {};
  const bucket = (id: string) => (out[id] ??= { p0: 0, p1: 0, rupees: 0, topReasons: [], counts: {} });
  for (const r of rows) {
    // OF-S20: an estimate row is an offline bill syncing, not a person doing something that needs
    // a look. Thirty of them must not bury the real P1s (Shaurya 2026-09-16). RP can opt in later.
    if (r.action === 'estimate') continue;
    const s = bucket(r.staffId);
    if (r.sev === 'P0') s.p0++; else s.p1++;
    s.counts[r.reason] = (s.counts[r.reason] ?? 0) + 1;
  }
  for (const l of lines) if (l.discount) bucket(l.discount.source.approverId).rupees += l.discount.amount / 100;
  return Object.fromEntries(Object.entries(out).map(([id, s]) => {
    const { counts, ...rest } = s;
    return [id, { ...rest, topReasons: Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([r]) => r) }];
  }));
}

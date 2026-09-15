// ST · Staff PIN & approvals — pure decisions. No firebase, no adapters, no clock: `now` is passed in.
// Sheet: moonshot/SPEC_ST_staff_pin_and_approvals.md

export type Action = 'discount' | 'removeOffer' | 'void' | 'reprint' | 'drawer';
export type Role = 'ADMIN' | 'MANAGER' | 'SERVER' | 'KITCHEN';
export type Sev = 'P0' | 'P1';
export type ErrorCode = 'permission-denied' | 'invalid-argument' | 'failed-precondition';

export interface ApprovalsConfig {
  discountPinAbovePercent: number;
  voidAfterKitchenNeedsPin: boolean;
  pinLockAfterWrong: number;
  pinLockMinutes: number;
  pinLockWindowMinutes: number;
  reasons: string[];
}

export const DEFAULTS: ApprovalsConfig = {
  discountPinAbovePercent: 10,
  voidAfterKitchenNeedsPin: true,
  pinLockAfterWrong: 5,
  pinLockMinutes: 15,
  pinLockWindowMinutes: 10,
  reasons: ['placard', 'regular', 'complaint', 'birthday', 'guest left', 'staff meal', 'other'],
};

const NOTE_MAX = 200;
const ACTIONS: Action[] = ['discount', 'removeOffer', 'void', 'reprint', 'drawer'];

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
      voidAfterKitchenNeedsPin: pick('voidAfterKitchenNeedsPin', v => typeof v === 'boolean'),
      pinLockAfterWrong: pick('pinLockAfterWrong', v => nonNegNumber(v) && (v as number) >= 1),
      pinLockMinutes: pick('pinLockMinutes', nonNegNumber),
      pinLockWindowMinutes: pick('pinLockWindowMinutes', nonNegNumber),
      reasons: pick('reasons', v => Array.isArray(v) && v.every(x => typeof x === 'string')),
    },
    warnings,
  };
}

export interface DecideInput { action: Action; role: Role; amount?: number; listPrice?: number; lineSent?: boolean }
export type Decision = { ok: true; needsPin: boolean; sev: Sev } | { ok: false; code: ErrorCode };

const paise = (rupees: number) => Math.round(rupees * 100);

/** The table in "Who can do what". Amount vs limit is compared in whole paise, never as a float percent. */
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
    case 'discount': {
      const over = paise(input.amount ?? 0) * 100 > paise(input.listPrice ?? 0) * cfg.discountPinAbovePercent;
      return over ? { ok: true, needsPin: true, sev: 'P0' } : { ok: true, needsPin: false, sev: 'P1' };
    }
    case 'removeOffer': return { ok: true, needsPin: true, sev: 'P0' };
    case 'void':
      return input.lineSent
        ? { ok: true, needsPin: cfg.voidAfterKitchenNeedsPin, sev: 'P0' }
        : { ok: true, needsPin: false, sev: 'P1' };
    case 'reprint': return { ok: true, needsPin: false, sev: 'P1' };
    case 'drawer': return { ok: true, needsPin: true, sev: 'P0' };
  }
}

export function percentOf(amount: number, listPrice: number): number {
  return Math.round((amount / listPrice) * 10000) / 100;
}

/** null when fine, else the message for an invalid-argument error. */
export function validateAmount(amount: unknown, listPrice: number): string | null {
  if (typeof amount !== 'number' || Number.isNaN(amount)) return 'amount must be a number';
  if (!(listPrice > 0)) return 'line has no list price';
  if (amount <= 0) return 'amount must be more than 0';
  if (amount > listPrice) return 'amount cannot exceed the list price';
  return null;
}

export function validateReason(reason: unknown, note: unknown, cfg: ApprovalsConfig): string | null {
  if (typeof reason !== 'string' || reason.trim() === '') return 'reason required';
  if (!cfg.reasons.includes(reason)) return 'reason not on the list';
  if (note !== undefined && note !== null && (typeof note !== 'string' || note.length > NOTE_MAX)) return `note longer than ${NOTE_MAX} characters`;
  return null;
}

// ── Wrong-PIN lock: state lives server-side per staffId, this is the pure part ─────────────
export interface LockState { wrongAt: number[]; lockedUntil?: number }

export function isLocked(state: LockState, now: number): boolean {
  return state.lockedUntil !== undefined && now < state.lockedUntil;
}

/** Window is [first wrong, first wrong + window): a wrong at exactly +window starts a fresh streak. */
export function recordWrongPin(state: LockState, now: number, cfg: ApprovalsConfig): { state: LockState; locked: boolean; attemptsLeft: number } {
  if (isLocked(state, now)) return { state, locked: true, attemptsLeft: 0 };
  const windowMs = cfg.pinLockWindowMinutes * 60_000;
  const wrongAt = [...state.wrongAt.filter(t => t > now - windowMs), now];
  const locked = wrongAt.length >= cfg.pinLockAfterWrong;
  const next: LockState = locked ? { wrongAt, lockedUntil: now + cfg.pinLockMinutes * 60_000 } : { wrongAt };
  return { state: next, locked, attemptsLeft: Math.max(0, cfg.pinLockAfterWrong - wrongAt.length) };
}

// ── The line snapshot this module writes (v1 home: restaurants/{id}/lines/{lineId}, ST-Q2) ───
export interface DiscountSource { reason: string; note: string; approverId: string }
export interface Line {
  listPrice: number;
  sent: boolean;
  v: number;
  countsTowardTotal: boolean;
  discount?: { amount: number; pct: number; source: DiscountSource };
  void?: DiscountSource;
  offer?: unknown;
  removedOffer?: unknown;
}
export interface Change { action: Action; amount?: number; pct?: number; reason: string; note: string; approverId: string }

export function applyToLine(line: Line, c: Change): { ok: true; line: Line } | { ok: false; code: ErrorCode; message: string } {
  if (line.void) return { ok: false, code: 'failed-precondition', message: 'line is voided' };
  const source: DiscountSource = { reason: c.reason, note: c.note, approverId: c.approverId };
  const v = line.v + 1;
  switch (c.action) {
    case 'discount': return { ok: true, line: { ...line, v, discount: { amount: c.amount ?? 0, pct: c.pct ?? 0, source } } };
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

export type Outcome = 'applied' | 'needs_pin' | 'wrong_pin' | 'locked' | 'forbidden' | 'invalid' | 'try_again';
export interface LogLine { cid: string; action: string; sev: Sev | null; needsPin: boolean; outcome: Outcome }
export function logLine(i: LogLine): LogLine {
  return { cid: i.cid, action: i.action, sev: i.sev, needsPin: i.needsPin, outcome: i.outcome };
}

// ── ST-S8: per-staff summary for the Discounts report ─────────────────────────────────────
export interface StaffSummary { p0: number; p1: number; rupees: number; topReasons: string[] }
export function summarise(rows: AuditRow[]): Record<string, StaffSummary> {
  const out: Record<string, StaffSummary & { counts: Record<string, number> }> = {};
  for (const r of rows) {
    const s = (out[r.staffId] ??= { p0: 0, p1: 0, rupees: 0, topReasons: [], counts: {} });
    if (r.sev === 'P0') s.p0++; else s.p1++;
    s.rupees += r.amount;
    s.counts[r.reason] = (s.counts[r.reason] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(out).map(([id, s]) => {
    const { counts, ...rest } = s;
    return [id, { ...rest, topReasons: Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([r]) => r) }];
  }));
}

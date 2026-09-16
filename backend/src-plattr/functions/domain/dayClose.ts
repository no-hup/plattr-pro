// DC · Day close & cash count — pure. No I/O, no clock, no Firestore, no currency symbol, no
// tender name, no country. Money is integer minor units everywhere.
// See moonshot/SPEC_DC_day_close.md. `businessDateFor` is PY's and is imported, never re-written (R8).
import { Code, Verdict, Tender, businessDateFor } from './payments';

export { businessDateFor };

export type Sev = 'P0' | 'P1' | 'P2';
export type MovementKind = 'float' | 'in' | 'out';
export type DayState = 'open' | 'closed' | 'unknown';

const no = (code: Code, message: string): Verdict => ({ ok: false, code, message });
const yes: Verdict = { ok: true };

export interface VoidBlock { at: number; by: string; reason: string; note?: string | null }

/** One non-sale movement of cash through the drawer. `kind` carries the sign; `amount` is positive. */
export interface Movement {
  movementId: string; businessDate: string; kind: MovementKind; amount: number;
  reason: string; note?: string | null; at: number; by: string; void?: VoidBlock | null;
}

/**
 * The part of a PY payment row DC reads. Structural, so PY's StoredRow satisfies it without DC
 * importing app code. `tender` is the FROZEN snapshot on the row: renaming a tender next month
 * must not restate last month (R2).
 */
export interface LedgerRow {
  kind: 'take' | 'refund'; amount: number; tenderId: string;
  tender: Pick<Tender, 'label' | 'kind'>; overpaid?: number | null; by: string; void?: unknown | null;
}

/** A bill BL still reads as `issued`, with the business date derived from its issuedAt (R5). */
export interface IssuedBill { billId: string; number?: string | null; businessDate: string; tableLabel?: string | null }

/**
 * A line BL has placed but not yet put on any bill. BL writes no draft document, so a table that is
 * still eating leaves no bill at all — the only trace is its lines with `billId` null (DC-S25).
 */
export interface UnbilledLine { lineId: string; name: string; businessDate: string; tableId?: string | null }

/** Everything on the floor that is not finished, for the one date being closed. */
export interface Floor { issued: IssuedBill[]; unbilled: UnbilledLine[] }

export interface DayCloseConfig { blindCount: boolean; overShortP0Above: number; reasons: string[] }

export const DEFAULTS: DayCloseConfig = {
  // Shaurya 2026-09-16: blind by default. A cashier who sees ₹13,166.00 first types ₹13,166.00,
  // and the day balances every night forever.
  blindCount: true,
  overShortP0Above: 10000,   // ₹100.00. Below it the difference is noise; above it, a conversation.
  reasons: ['opening float', 'vendor payment', 'bank drop', 'change in', 'petty cash', 'correction'],
};

const MAX_MONEY = 100_000_000_00;
const isMoney = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v) && v >= 0 && v <= MAX_MONEY;
const blank = (v: unknown): boolean => typeof v !== 'string' || v.trim() === '';
const KINDS: MovementKind[] = ['float', 'in', 'out'];
const STAFF = ['MANAGER', 'ADMIN'];   // Shaurya 2026-09-16: exactly ST's roles, no new one (R7)

/** A real calendar date in ISO form. `2026-02-30` round-trips to `2026-03-02`, so it is refused. */
export function isBusinessDate(v: unknown): v is string {
  if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const d = new Date(`${v}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
}

// ── config ──────────────────────────────────────────────────────────────────
export function configFrom(raw: unknown): { config: DayCloseConfig; warnings: string[] } {
  const warnings: string[] = [];
  const src = (raw && typeof raw === 'object' ? (raw as Record<string, unknown>).dayClose : null) as Record<string, unknown> | null;
  if (!src || typeof src !== 'object') {
    warnings.push(raw === null || raw === undefined ? 'config document missing, defaults applied' : 'dayClose config missing, defaults applied');
    return { config: DEFAULTS, warnings };
  }
  let blindCount = DEFAULTS.blindCount;
  if (typeof src.blindCount === 'boolean') blindCount = src.blindCount;
  else if (src.blindCount !== undefined) warnings.push('dayClose.blindCount is not a boolean, default applied');

  let overShortP0Above = DEFAULTS.overShortP0Above;
  if (isMoney(src.overShortP0Above)) overShortP0Above = src.overShortP0Above;
  else if (src.overShortP0Above !== undefined) warnings.push('dayClose.overShortP0Above is not a non-negative integer in minor units, default applied');

  let reasons = DEFAULTS.reasons;
  if (Array.isArray(src.reasons)) {
    const kept = (src.reasons as unknown[]).filter((r): r is string => {
      const ok = typeof r === 'string' && r.trim() !== '';
      if (!ok) warnings.push(`dayClose reason ignored: ${JSON.stringify(r)}`);
      return ok;
    });
    // An empty list would leave no legal reason at all, which is a broken config, not a policy.
    if (kept.length) reasons = kept;
    else warnings.push('dayClose.reasons is empty, default list applied');
  } else if (src.reasons !== undefined) {
    warnings.push('dayClose.reasons is not an array, default list applied');
  }
  return { config: { blindCount, overShortP0Above, reasons }, warnings };
}

// ── the arithmetic ──────────────────────────────────────────────────────────
const liveRows = (rows: LedgerRow[]): LedgerRow[] => (rows || []).filter(r => !r.void);
const liveMoves = (ms: Movement[]): Movement[] => (ms || []).filter(m => !m.void);

/** R2. The change put in before service: the date's `float` movements, non-void. */
export const openingFloatOf = (movements: Movement[]): number =>
  liveMoves(movements).filter(m => m.kind === 'float').reduce((n, m) => n + m.amount, 0);

/**
 * R2. `openingFloat + cash taken − cash refunded + cash in − cash out`, non-void only.
 * What counts as drawer money is `tender.kind === 'cash'` on the frozen snapshot, never the id:
 * a tender called `cash` that settles externally moves no drawer (DC-S14, DC-S17).
 * A cash take moves the drawer by `amount`, never by `tendered`: the change went back (PY-S2).
 */
export function expectedCashFrom(rows: LedgerRow[], movements: Movement[]): number {
  const cash = liveRows(rows)
    .filter(r => r.tender?.kind === 'cash')
    .reduce((n, r) => n + (r.kind === 'take' ? r.amount : -r.amount), 0);
  const moved = liveMoves(movements).reduce((n, m) => n + (m.kind === 'out' ? -m.amount : m.amount), 0);
  return cash + moved;
}

/** R3. Signed, never clamped, never absolute. Short is negative. */
export const differenceOf = (countedCash: number, expectedCash: number): number => countedCash - expectedCash;

/** R16. A clean close is routine; a difference is a finding; a big one is a conversation. */
export const severityOf = (difference: number, config: DayCloseConfig): Sev =>
  difference === 0 ? 'P2' : Math.abs(difference) > config.overShortP0Above ? 'P0' : 'P1';

export interface TenderTotal { tenderId: string; label: string; kind: Tender['kind']; taken: number; refunded: number; overpaid: number; count: number; net: number; counted?: number; difference?: number }
export interface StaffTotal { staffId: string; taken: number; refunded: number; overpaid: number; count: number; net: number }

/** R17, R19. Card and UPI stay apart so each reconciles against its own statement; staff stay apart so two cashiers on one drawer are two numbers. */
export function totalsFrom(rows: LedgerRow[]): { byTender: TenderTotal[]; byStaff: StaffTotal[] } {
  const tenders = new Map<string, TenderTotal>();
  const staff = new Map<string, StaffTotal>();
  for (const r of liveRows(rows)) {
    const t = tenders.get(r.tenderId) ?? { tenderId: r.tenderId, label: r.tender?.label ?? r.tenderId, kind: r.tender?.kind ?? 'external', taken: 0, refunded: 0, overpaid: 0, count: 0, net: 0 };
    const s = staff.get(r.by) ?? { staffId: r.by, taken: 0, refunded: 0, overpaid: 0, count: 0, net: 0 };
    for (const g of [t, s] as { taken: number; refunded: number; overpaid: number; count: number; net: number }[]) {
      if (r.kind === 'take') { g.taken += r.amount; g.overpaid += r.overpaid ?? 0; } else g.refunded += r.amount;
      g.count += 1;
      g.net = g.taken - g.refunded;
    }
    tenders.set(r.tenderId, t);
    staff.set(r.by, s);
  }
  return { byTender: [...tenders.values()], byStaff: [...staff.values()] };
}

// ── the gates ───────────────────────────────────────────────────────────────
const dayVerdict = (day: DayState): Verdict | null =>
  day === 'closed' ? no('failed-precondition', 'That day is closed')
    : day === 'unknown' ? no('failed-precondition', 'Day close state unknown')
      : null;

export interface CloseRequest { role?: string; businessDate?: unknown; countedCash?: unknown }

/**
 * R4: a mismatch is never a reason to refuse — a cashier who is ₹50 short and cannot close
 * simply does not close, and the number this module exists to produce is the one that is lost.
 */
export function canClose(req: CloseRequest, day: DayState, floor: Floor, today: string): Verdict {
  if (!STAFF.includes(String(req.role))) return no('permission-denied', 'Manager or admin required');
  if (!isBusinessDate(req.businessDate)) return no('invalid-argument', 'businessDate must be a real date as YYYY-MM-DD');
  if (!isMoney(req.countedCash)) return no('invalid-argument', 'countedCash must be a non-negative integer in minor units');
  if (req.businessDate > today) return no('invalid-argument', 'That day has not happened yet');
  const d = dayVerdict(day);
  if (d) return day === 'closed' ? no('failed-precondition', 'That day is already closed') : d;
  // R5, first half: settlement is BL's word, never inferred from payment rows.
  const open = (floor?.issued || []).filter(b => b.businessDate === req.businessDate);
  if (open.length) {
    const first = open[0];
    const named = first.number || first.billId;
    const where = first.tableLabel ? ` on ${first.tableLabel}` : '';
    return no('failed-precondition', `Bill ${named}${where} is still unpaid; settle or cancel it before closing${open.length > 1 ? ` (${open.length} in all)` : ''}`);
  }
  // R5, second half (DC-S25): BL writes no draft document, so a table still eating shows up only as
  // lines carrying no billId. Without this the day closes clean over food that then walks out.
  // No money in the message: R15 keeps every rupee figure out of domain.
  const eating = (floor?.unbilled || []).filter(l => l.businessDate === req.businessDate);
  if (eating.length) {
    const tables = [...new Set(eating.map(l => l.tableId).filter(Boolean))];
    const where = tables.length ? ` on ${tables.join(', ')}` : '';
    return no('failed-precondition', `${eating.length} item${eating.length > 1 ? 's' : ''}${where} ${eating.length > 1 ? 'are' : 'is'} not on a bill yet; bill the table or void the items before closing`);
  }
  return yes;
}

export interface MoveRequest { role?: string; kind?: unknown; amount?: unknown; reason?: unknown }

export function canMove(req: MoveRequest, day: DayState, config: DayCloseConfig): Verdict {
  if (!STAFF.includes(String(req.role))) return no('permission-denied', 'Manager or admin required');
  if (!KINDS.includes(req.kind as MovementKind)) return no('invalid-argument', `kind must be one of ${KINDS.join(', ')}`);
  if (!isMoney(req.amount) || req.amount === 0) return no('invalid-argument', 'amount must be a positive integer in minor units');
  if (blank(req.reason)) return no('invalid-argument', 'A reason is required');
  if (!config.reasons.includes(req.reason as string)) return no('invalid-argument', `Unknown reason ${String(req.reason)}`);
  // Taking out more than the drawer is believed to hold is allowed on purpose: the drawer may hold
  // cash the system never saw, and a negative expected figure is itself the signal (Decisions).
  return dayVerdict(day) ?? yes;
}

export interface VoidMoveRequest { role?: string; by?: string; reason?: unknown }

/** R13, and the same retry shape as PY's canVoid: the same staff repeating the same reason is idempotent. */
export function canVoidMove(movement: Movement | null, day: DayState, req: VoidMoveRequest): Verdict | { ok: true; retry: true } {
  if (!STAFF.includes(String(req.role))) return no('permission-denied', 'Manager or admin required');
  if (!movement) return no('failed-precondition', 'No such drawer movement');
  if (blank(req.reason)) return no('invalid-argument', 'A reason is required');
  if (movement.void) {
    return movement.void.by === req.by && movement.void.reason === req.reason
      ? { ok: true, retry: true }
      : no('failed-precondition', 'That movement is already voided');
  }
  return dayVerdict(day) ?? yes;
}

// ── the day before, and counting a tender that is not in the drawer ─────────
/** The calendar day before a business date. Used to show the closer what last night's drawer held. */
export function previousDate(businessDate: string): string {
  const d = new Date(`${businessDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

/**
 * Donor review (Odoo `pos_session.py:718-755`): a POS counts the card terminal's batch too, not just
 * the drawer. Optional here — a restaurant that does not reconcile its terminal simply sends nothing —
 * but without it ₹450 of uncaptured card sales surfaces at the bank weeks later instead of that night.
 * An id nobody took money on is returned as `unknown` rather than silently dropped: it is a typo.
 */
export function applyCounted(byTender: TenderTotal[], counted?: Record<string, unknown> | null): { rows: TenderTotal[]; unknown: string[]; bad: string[] } {
  if (!counted || typeof counted !== 'object') return { rows: byTender, unknown: [], bad: [] };
  const ids = new Set(byTender.map(t => t.tenderId));
  const unknown = Object.keys(counted).filter(k => !ids.has(k));
  const bad = Object.entries(counted).filter(([, v]) => !isMoney(v)).map(([k]) => k);
  const rows = byTender.map(t =>
    Object.prototype.hasOwnProperty.call(counted, t.tenderId) && isMoney(counted[t.tenderId])
      ? { ...t, counted: counted[t.tenderId] as number, difference: (counted[t.tenderId] as number) - t.net }
      : t);
  return { rows, unknown, bad };
}

// ST · apply(): role → config → decide → verify PIN → one transaction (line + audit). No Firestore here; ports only.
import {
  Action, AuditRow, Line, LockState, Outcome, Sev, applyToLine, auditRow, decide, isLocked, logLine,
  percentOf, recordWrongPin, validateAmount, validateReason,
} from '../domain/approvals';
import { loadApprovalsConfig } from './config';

export interface Staff { staffId: string; role: string; status: string; password?: string }
export interface Tx {
  getLine(lineId: string): Promise<Line | null>;
  setLine(lineId: string, line: Line): void;
  createAudit(id: string, row: AuditRow): void;   // must fail if the id exists
}
export interface Ports {
  now(): number;
  log(line: object): void;
  warn(msg: string): void;
  staff: { bySession(restaurantId: string, sessionId: string): Promise<Staff> };  // throws unauthenticated
  pin: { verify(pin: string, stored: string | undefined): Promise<boolean> };
  config: { approvals(restaurantId: string): Promise<unknown> };
  lockState: {
    get(restaurantId: string, staffId: string): Promise<LockState>;
    update(restaurantId: string, staffId: string, fn: (s: LockState) => { state: LockState; audit?: AuditRow }): Promise<LockState>;
  };
  transact<T>(restaurantId: string, fn: (t: Tx) => Promise<T>): Promise<T>;
}

export interface ApplyRequest {
  restaurantId: string; sessionId: string; action: string; cid: string;
  lineId?: string; amount?: number; reason?: string; note?: string; pin?: unknown;
  [extra: string]: unknown;
}
export interface ApplyResult { line?: Line; auditId: string }

export class ApprovalError extends Error {
  constructor(public code: string, message: string, public details: Record<string, unknown> = {}) { super(message); }
}

const LINE_ACTIONS: Action[] = ['discount', 'removeOffer', 'void'];

export async function apply(ports: Ports, req: ApplyRequest): Promise<ApplyResult> {
  const { restaurantId, sessionId, action, cid, lineId } = req;
  const emit = (sev: Sev | null, needsPin: boolean, outcome: Outcome) =>
    ports.log(logLine({ cid: typeof cid === 'string' ? cid : '', action: typeof action === 'string' ? action : '', sev, needsPin, outcome }));
  const fail = (code: string, message: string, details: Record<string, unknown>, sev: Sev | null, needsPin: boolean, outcome: Outcome): never => {
    emit(sev, needsPin, outcome);
    throw new ApprovalError(code, message, details);
  };

  if (typeof cid !== 'string' || cid === '') fail('invalid-argument', 'cid required', {}, null, false, 'invalid');
  if (typeof restaurantId !== 'string' || typeof sessionId !== 'string') fail('invalid-argument', 'restaurantId and sessionId required', {}, null, false, 'invalid');

  const staff = await ports.staff.bySession(restaurantId, sessionId);   // one auth door; throws on a bad session
  if (staff.status !== 'active') fail('permission-denied', 'Staff account is not active', {}, null, false, 'forbidden');

  const cfg = await loadApprovalsConfig(ports.config.approvals, ports.warn, restaurantId);
  const needsLine = LINE_ACTIONS.includes(action as Action);
  const line = needsLine ? await ports.transact(restaurantId, t => t.getLine(String(lineId))) : null;
  if (needsLine && !line) fail('not-found', 'line not found', { lineId }, null, false, 'invalid');

  let pct = 0;
  if (action === 'discount') {
    const bad = validateAmount(req.amount, line!.listPrice);
    if (bad) fail('invalid-argument', bad, {}, null, false, 'invalid');
    pct = percentOf(req.amount as number, line!.listPrice);
  }

  const decision = decide({ action: action as Action, role: staff.role as never, amount: req.amount, listPrice: line?.listPrice, lineSent: line?.sent }, cfg);
  if (!decision.ok) {
    fail(decision.code, decision.code === 'permission-denied' ? 'Not allowed for your role' : `unknown action ${action}`, {}, null, false, decision.code === 'permission-denied' ? 'forbidden' : 'invalid');
  }
  const { needsPin, sev } = decision as { needsPin: boolean; sev: Sev };

  const reason = action === 'reprint' ? (typeof req.reason === 'string' ? req.reason : '') : req.reason;
  if (action !== 'reprint') {
    const bad = validateReason(reason, req.note, cfg);
    if (bad) fail('invalid-argument', bad, {}, sev, needsPin, 'invalid');
  }
  const note = typeof req.note === 'string' ? req.note : '';

  // A locked account is refused for every approvals call, PIN or not (Decisions, 2026-09-15).
  const lock = await ports.lockState.get(restaurantId, staff.staffId);
  if (isLocked(lock, ports.now())) fail('permission-denied', 'Account locked after too many wrong PINs', { locked: true, lockedUntil: lock.lockedUntil }, sev, needsPin, 'locked');

  if (needsPin) {
    const pin = req.pin;
    if (pin === undefined || pin === '') fail('permission-denied', 'PIN required', { requires: 'pin', action, sev }, sev, true, 'needs_pin');
    if (typeof pin !== 'string') fail('invalid-argument', 'pin must be a string', {}, sev, true, 'invalid');
    const ok = await ports.pin.verify(pin as string, staff.password);
    if (!ok) {
      const now = ports.now();
      let result = { locked: false, attemptsLeft: 0 };
      await ports.lockState.update(restaurantId, staff.staffId, s => {
        const r = recordWrongPin(s, now, cfg);
        result = r;
        const audit = r.locked && !isLocked(s, now)
          ? auditRow({ ts: now, cid, action: 'pinLock', staffId: staff.staffId, sev: 'P0', reason: 'wrong pin streak', note: '', lineId: null, before: null, after: null })
          : undefined;
        return { state: r.state, audit };
      });
      if (result.locked) {
        const until = now + cfg.pinLockMinutes * 60_000;
        fail('permission-denied', 'Account locked after too many wrong PINs', { locked: true, lockedUntil: until }, sev, true, 'locked');
      }
      fail('permission-denied', 'Wrong PIN', { requires: 'pin', wrong: true, attemptsLeft: result.attemptsLeft, action, sev }, sev, true, 'wrong_pin');
    }
    await ports.lockState.update(restaurantId, staff.staffId, () => ({ state: { wrongAt: [] } }));
  }

  // The change and its audit row are one transaction (R4). Any failure: nothing applied, "try again".
  const ts = ports.now();
  try {
    const out = await ports.transact(restaurantId, async t => {
      if (!needsLine) {
        const auditId = `${cid}_${action}_${ts}`;
        t.createAudit(auditId, auditRow({ ts, cid, action, staffId: staff.staffId, sev, reason: reason as string, note, lineId: null, before: null, after: null }));
        return { auditId } as ApplyResult;
      }
      const before = await t.getLine(String(lineId));
      if (!before) throw new ApprovalError('not-found', 'line not found', { lineId });
      const applied = applyToLine(before, { action: action as Action, amount: req.amount, pct, reason: reason as string, note, approverId: staff.staffId });
      if (!applied.ok) throw new ApprovalError(applied.code, applied.message);
      const auditId = `${lineId}_v${applied.line.v}`;
      t.createAudit(auditId, auditRow({ ts, cid, action, staffId: staff.staffId, sev, amount: req.amount, pct, reason: reason as string, note, lineId: String(lineId), before, after: applied.line }));
      t.setLine(String(lineId), applied.line);
      return { line: applied.line, auditId } as ApplyResult;
    });
    emit(sev, needsPin, 'applied');
    return out;
  } catch (e) {
    if (e instanceof ApprovalError) { emit(sev, needsPin, 'invalid'); throw e; }
    fail('unavailable', 'Could not record the approval, try again', {}, sev, needsPin, 'try_again');
    throw e; // unreachable
  }
}

/** What the till may know about the config: the reasons list. Never the limit; the client does not compute needsPin. */
export async function reasons(ports: Ports, req: { restaurantId: string; sessionId: string }): Promise<{ reasons: string[] }> {
  if (typeof req.restaurantId !== 'string' || typeof req.sessionId !== 'string') throw new ApprovalError('invalid-argument', 'restaurantId and sessionId required');
  await ports.staff.bySession(req.restaurantId, req.sessionId);
  const cfg = await loadApprovalsConfig(ports.config.approvals, ports.warn, req.restaurantId);
  return { reasons: cfg.reasons };
}

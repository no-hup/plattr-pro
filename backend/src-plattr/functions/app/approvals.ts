// ST · apply(): role → config → decide → verify PIN → one transaction (line + audit). No Firestore here; ports only.
import { Job as PrintJob, cancelJobsFor as cancelPrintJobs, ids as printIds, newJob as newPrintJob } from '../domain/print';
import {
  Action, ApprovalsConfig, AuditRow, Line, PinState, Outcome, Sev, applyToLine, auditRow, decide, tooSoon, logLine,
  percentOf, recordWrongPin, toPaise, validateAmount, validateReason,
} from '../domain/approvals';
import { loadApprovalsConfig } from './config';
import { offlineFrom, OfflineConfig } from '../domain/offline';

export interface Staff { staffId: string; role: string; status: string; pinHash?: string }  // pinHash: bcrypt of the approval PIN, never the login password (TD-041)
export interface Tx {
  getLine(lineId: string): Promise<Line | null>;
  setLine(lineId: string, line: Line): void;
  createAudit(id: string, row: AuditRow): void;   // must fail if the id exists
  getAudit(id: string): Promise<AuditRow | null>;
  kotJobsOfCart(cartId: string): Promise<PrintJob[]>;   // KT-S12: which stations the voided line's ticket went to (read before writes)
  createPrintJob(job: PrintJob): void;
}
export interface Ports {
  now(): number;
  log(line: object): void;
  warn(msg: string): void;
  staff: { bySession(restaurantId: string, sessionId: string): Promise<Staff> };  // throws unauthenticated
  pin: { verify(pin: string, stored: string | undefined): Promise<boolean> };
  config: { approvals(restaurantId: string): Promise<unknown>; offline?(restaurantId: string): Promise<unknown> };
  pinState: {   // wrong-PIN streak on the staff doc (R7): pinWrongAt[], pinRetryAfter
    get(restaurantId: string, staffId: string): Promise<PinState>;
    update(restaurantId: string, staffId: string, fn: (s: PinState) => { state: PinState; audit?: AuditRow }): Promise<PinState>;
  };
  transact<T>(restaurantId: string, fn: (t: Tx) => Promise<T>): Promise<T>;
}

export interface ApplyRequest {
  restaurantId: string; sessionId: string; action: string; cid: string;
  lineId?: string; amount?: number /* rupees as typed at the till; stored as paise */; reason?: string; note?: string; pin?: unknown;
  [extra: string]: unknown;
}
export interface ApplyResult { line?: Line; auditId: string; retry?: boolean }

export class ApprovalError extends Error {
  constructor(public code: string, message: string, public details: Record<string, unknown> = {}) { super(message); }
}


export type PinPorts = Pick<Ports, 'now' | 'pin' | 'pinState'>;

/**
 * ST's one PIN door (R3, R7), shared with every module that asks for a PIN (PY refunds and voids).
 * Resolves when the PIN is right. Throws ApprovalError otherwise; the caller logs, this never does.
 * A streak slows the next attempt: too soon is refused unchecked and does not count.
 */
export async function pinGate(ports: PinPorts, cfg: ApprovalsConfig, restaurantId: string, staff: Staff, pin: unknown, cid: string, action: string, sev: Sev): Promise<void> {
  if (pin === undefined || pin === '') throw new ApprovalError('permission-denied', 'PIN required', { requires: 'pin', action, sev });
  if (typeof pin !== 'string') throw new ApprovalError('invalid-argument', 'pin must be a string', {});
  const now = ports.now();
  const state = await ports.pinState.get(restaurantId, staff.staffId);
  if (tooSoon(state, now)) throw new ApprovalError('permission-denied', 'Too soon, wait before trying again', { requires: 'pin', tooSoon: true, retryAfter: state.retryAfter, action, sev });
  const ok = await ports.pin.verify(pin, staff.pinHash);
  if (!ok) {
    let r = { attemptsLeft: 0, penaltySeconds: 0, retryAfter: undefined as number | undefined };
    await ports.pinState.update(restaurantId, staff.staffId, s => {
      const rec = recordWrongPin(s, now, cfg);
      r = { attemptsLeft: rec.attemptsLeft, penaltySeconds: rec.penaltySeconds, retryAfter: rec.state.retryAfter };
      const audit = rec.audit
        ? auditRow({ ts: now, cid, action: 'pinStreak', staffId: staff.staffId, sev: 'P0', reason: 'wrong pin streak', note: '', lineId: null, before: null, after: null })
        : undefined;
      return { state: rec.state, audit };
    });
    throw new ApprovalError('permission-denied', 'Wrong PIN', { requires: 'pin', wrong: true, attemptsLeft: r.attemptsLeft, ...(r.retryAfter !== undefined ? { retryAfter: r.retryAfter } : {}), action, sev });
  }
  await ports.pinState.update(restaurantId, staff.staffId, () => ({ state: { wrongAt: [] } }));
}

/** The log outcome for a pinGate refusal, so every caller logs the same word for the same event. */
export function pinOutcome(e: ApprovalError): Outcome {
  if (e.code === 'invalid-argument') return 'invalid';
  if (e.details.tooSoon) return 'too_soon';
  if (e.details.wrong) return 'wrong_pin';
  return 'needs_pin';
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
  let amountPaise: number | undefined;
  let base = line?.listPrice;
  if (action === 'discount') {
    const bad = validateAmount(req.amount, line!.listPrice);
    if (bad) fail('invalid-argument', bad, {}, null, false, 'invalid');
    amountPaise = toPaise(req.amount as number);
    pct = percentOf(amountPaise, line!.listPrice);
  } else if (action === 'billDiscount') {
    // BL counts in minor units already (its R7), so these arrive as integers and are never
    // multiplied by 100 here: `8.49 × 100` in binary floating point is not 849.
    const amt = req.amountMinor, b = req.baseMinor;
    if (!Number.isInteger(amt) || (amt as number) <= 0) fail('invalid-argument', 'amountMinor must be a positive integer in minor units', {}, null, false, 'invalid');
    if (!Number.isInteger(b) || (b as number) <= 0) fail('invalid-argument', 'baseMinor must be a positive integer in minor units', {}, null, false, 'invalid');
    amountPaise = amt as number;
    base = b as number;
    pct = percentOf(amountPaise, base);
  } else if (action === 'estimate' || action === 'releaseUnpaid') {
    const amt = req.amountMinor;
    if (!Number.isInteger(amt) || (amt as number) <= 0) fail('invalid-argument', 'amountMinor must be a positive integer in minor units', {}, null, false, 'invalid');
    amountPaise = amt as number;
  }

  const decision = decide({ action: action as Action, role: staff.role as never, amount: amountPaise, listPrice: base, lineSent: line?.sent }, cfg);
  if (!decision.ok) {
    const why = decision.code === 'permission-denied' ? 'Not allowed for your role'
      : decision.code === 'failed-precondition' ? `discount is above the ${cfg.discountMaxPercent} % limit`   // TD-004
      : `unknown action ${action}`;
    fail(decision.code, why, {}, null, false, decision.code === 'permission-denied' ? 'forbidden' : 'invalid');
  }
  const { needsPin, sev } = decision as { needsPin: boolean; sev: Sev };

  // reprint and estimate carry no reason from the list; the note (≤200 chars) still applies.
  const reason = action === 'reprint' ? (typeof req.reason === 'string' ? req.reason : '') : action === 'estimate' ? 'estimate' : req.reason;
  if (action !== 'reprint') {
    const bad = validateReason(reason, req.note, { ...cfg, reasons: action === 'estimate' ? ['estimate'] : cfg.reasons });
    if (bad) fail('invalid-argument', bad, {}, sev, needsPin, 'invalid');
  }
  const note = typeof req.note === 'string' ? req.note : '';

  if (needsPin) {
    try { await pinGate(ports, cfg, restaurantId, staff, req.pin, cid, action, sev); }
    catch (e) { if (e instanceof ApprovalError) fail(e.code, e.message, e.details, sev, true, pinOutcome(e)); throw e; }
  }

  // The change and its audit row are one transaction (R4). Any failure: nothing applied, "try again".
  const ts = ports.now();
  try {
    const out = await ports.transact(restaurantId, async t => {
      if (!needsLine) {
        if (action === 'estimate') {
          // OF-S20: the till resends on every reconnect, so the id is the cid alone and a repeat
          // answers the row it already wrote. Same cid, different amount: a different act, refused.
          const auditId = `${cid}_estimate`;
          const prior = await t.getAudit(auditId);
          if (prior) {
            if (prior.amount !== amountPaise) throw new ApprovalError('failed-precondition', 'estimate already recorded with a different amount', { auditId, amount: prior.amount });
            return { auditId, retry: true } as ApplyResult;
          }
          t.createAudit(auditId, auditRow({ ts, cid, action, staffId: staff.staffId, sev, amount: amountPaise, pct: 0, reason: reason as string, note, lineId: null, before: null, after: null }));
          return { auditId } as ApplyResult;
        }
        // Two drawer opens in one millisecond must both leave a row: the suffix keeps the ids apart.
        const auditId = `${cid}_${action}_${ts}_${Math.random().toString(36).slice(2, 8)}`;
        t.createAudit(auditId, auditRow({ ts, cid, action, staffId: staff.staffId, sev, amount: amountPaise, reason: reason as string, note, lineId: null, before: null, after: null }));
        // KT-S17: a no-sale open is a drawer kick too, queued with its P0 row and keyed on that row.
        if (action === 'drawer') t.createPrintJob(newPrintJob({ jobId: printIds.drawer(auditId), cid, kind: 'drawer', ticketNo: cid, tableLabel: '', paymentId: auditId, by: staff.staffId, now: ts }));
        return { auditId } as ApplyResult;
      }
      const before = await t.getLine(String(lineId));
      if (!before) throw new ApprovalError('not-found', 'line not found', { lineId });
      const cartId = (before as { cartId?: string }).cartId ?? null;
      const kotJobs = action === 'void' && cartId ? await t.kotJobsOfCart(cartId) : [];   // read now: no reads after the writes below
      // BL-S8: once a bill is issued its lines are frozen. The fix is cancel (BL-S9) or a credit note (BL-S11).
      if ((before as { billId?: string | null }).billId) throw new ApprovalError('failed-precondition', 'bill already issued', { billId: (before as { billId?: string }).billId });
      // The line may have gone to the kitchen since the decision read. Decide again on the fresh doc:
      // a PIN that was not needed then, and was never verified, is needed now.
      const fresh = decide({ action: action as Action, role: staff.role as never, amount: amountPaise, listPrice: before.listPrice, lineSent: before.sent }, cfg);
      if (!fresh.ok) throw new ApprovalError(fresh.code, fresh.code === 'failed-precondition' ? `discount is above the ${cfg.discountMaxPercent} % limit` : 'Not allowed for your role');
      if (fresh.needsPin && !needsPin) throw new ApprovalError('permission-denied', 'PIN required', { requires: 'pin', action, sev: fresh.sev });
      const applied = applyToLine(before, { action: action as Action, amount: amountPaise, pct, reason: reason as string, note, approverId: staff.staffId });
      if (!applied.ok) throw new ApprovalError(applied.code, applied.message);
      const auditId = `${lineId}_v${applied.line.v}`;
      t.createAudit(auditId, auditRow({ ts, cid, action, staffId: staff.staffId, sev: fresh.sev, amount: amountPaise, pct, reason: reason as string, note, lineId: String(lineId), before, after: applied.line }));
      t.setLine(String(lineId), applied.line);
      // KT-S11 / S12: a ticket the kitchen may have seen gets a cancel ticket at its station; a held one is not
      // this door's to drop (the cart cancel path does that). Keyed on the line and its version, so a retry lands
      // on the same document.
      for (const j of cancelPrintJobs(kotJobs.filter(k => k.state !== 'held'), [String(lineId)], { v: `${lineId}_v${applied.line.v}`, reason: reason as string, by: staff.staffId, now: ts })) t.createPrintJob(j);
      return { line: applied.line, auditId } as ApplyResult;
    });
    emit(sev, needsPin, out.retry ? 'retry' : 'applied');
    return out;
  } catch (e) {
    if (e instanceof ApprovalError) {
      if (e.details.requires) emit(e.details.sev as Sev, true, 'needs_pin'); else emit(sev, needsPin, 'invalid');
      throw e;
    }
    fail('unavailable', 'Could not record the approval, try again', {}, sev, needsPin, 'try_again');
    throw e; // unreachable
  }
}

/** What the till may know about the config: the reasons list. Never the limit; the client does not compute needsPin. */
export async function reasons(ports: Ports, req: { restaurantId: string; sessionId: string }): Promise<{ reasons: string[]; offline: OfflineConfig }> {
  if (typeof req.restaurantId !== 'string' || typeof req.sessionId !== 'string') throw new ApprovalError('invalid-argument', 'restaurantId and sessionId required');
  await ports.staff.bySession(req.restaurantId, req.sessionId);
  const cfg = await loadApprovalsConfig(ports.config.approvals, ports.warn, req.restaurantId);
  // OF: the till's offline keys ride the same read; it already fetches this once at login.
  return { reasons: cfg.reasons, offline: offlineFrom(await ports.config.offline?.(req.restaurantId)) };
}

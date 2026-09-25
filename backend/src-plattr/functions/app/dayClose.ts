// DC · close() / get() / move() / voidMove(). Role → config → domain → ONE transaction
// (document + audit). No Firestore here; ports only. See moonshot/SPEC_DC_day_close.md.
// Money is integer minor units on every field.
import {
  DayBill, DayCloseConfig, DayState, DiscountTotal, Floor, LedgerRow, Movement, StaffTotal, TenderTotal, VoidBlock,
  applyCounted, canClose, canMove, canVoidMove, configFrom, differenceOf, walkoutsFrom, Walkouts, discountsFrom, expectedCashFrom,
  openingFloatOf, previousDate, severityOf, totalsFrom,
} from '../domain/dayClose';
import { businessDateFor, PaymentsConfig } from '../domain/payments';
import { ApprovalError, PinPorts, Staff, pinGate, pinOutcome } from './approvals';
import { AuditRow, auditRow } from '../domain/approvals';
import { loadApprovalsConfig, loadPaymentsConfig } from './config';

export { ApprovalError as DayCloseError };   // one error door for the api layer

export type StoredMovement = Movement;

/** The signed lid. Written once, with `create`, on a document whose id is the date (R9). */
export interface CloseDoc {
  businessDate: string; closed: true; closedAt: number; closedBy: string;
  openingFloat: number; expectedCash: number; countedCash: number; difference: number;
  leftInDrawer: number | null;
  byTender: TenderTotal[]; byStaff: StaffTotal[]; movements: Movement[];
  discounts: DiscountTotal[];   // BT: what the day gave away, by reason (NC, staff meal, comps, offers), frozen like byTender
  walkouts: Walkouts;           // D1: walked-out bills, their own line, frozen like discounts
  thresholds: { overShortP0Above: number }; note: string;
}

export interface Tx {
  readClose(businessDate: string): Promise<CloseDoc | null>;
  createClose(businessDate: string, doc: CloseDoc): void;        // must fail if the date exists
  rowsForDay(businessDate: string): Promise<LedgerRow[]>;
  movementsForDay(businessDate: string): Promise<StoredMovement[]>;
  floorOn(businessDate: string): Promise<Floor>;
  billsForDay(businessDate: string): Promise<DayBill[]>;   // BT: every bill issued on the date, any status
  movementById(movementId: string): Promise<StoredMovement | null>;
  createMovement(movementId: string, m: StoredMovement): void;   // must fail if the id exists
  setMovementVoid(movementId: string, v: VoidBlock): void;
  createAudit(id: string, row: AuditRow): void;
}

export interface Ports extends PinPorts {
  log(line: object): void;
  warn(msg: string): void;
  staff: { bySession(restaurantId: string, sessionId: string): Promise<Staff> };
  config: { settings(restaurantId: string): Promise<unknown> };
  /** Reads outside a transaction, for get() and for the decision that precedes the PIN. */
  read: {
    close(restaurantId: string, businessDate: string): Promise<CloseDoc | null>;
    rows(restaurantId: string, businessDate: string): Promise<LedgerRow[]>;
    movements(restaurantId: string, businessDate: string): Promise<StoredMovement[]>;
    floor(restaurantId: string, businessDate: string): Promise<Floor>;
    bills(restaurantId: string, businessDate: string): Promise<DayBill[]>;
  };
  transact<T>(restaurantId: string, fn: (t: Tx) => Promise<T>): Promise<T>;
}

export interface CloseReq { restaurantId: string; sessionId: string; businessDate: string; countedCash: number; countedByTender?: Record<string, unknown>; leftInDrawer?: number; note?: string; pin?: unknown }
export interface GetReq { restaurantId: string; sessionId: string; businessDate?: string }
export interface MoveReq { restaurantId: string; sessionId: string; movementId: string; kind: string; amount: number; reason: string; note?: string; pin?: unknown }
export interface VoidMoveReq { restaurantId: string; sessionId: string; movementId: string; reason: string; note?: string; pin?: unknown }

export interface PreviousClose { businessDate: string; countedCash: number; leftInDrawer: number | null }
export interface DayView {
  businessDate: string; closed: boolean; blindCount: boolean; reasons: string[];
  byTender: TenderTotal[]; byStaff?: StaffTotal[]; movements?: Movement[];
  discounts: DiscountTotal[];   // BT: not a cash figure, so it shows blind too
  walkouts: Walkouts;           // D1: not a cash figure either
  openingFloat?: number; expectedCash?: number; countedCash?: number; difference?: number; leftInDrawer?: number | null;
  closedAt?: number; closedBy?: string; note?: string;
  floor: { issuedBills: number; unbilledItems: number };
  previousClose: PreviousClose | null; previousDayClosed: boolean;
}
export interface CloseResult { doc: CloseDoc; retry: boolean }
export interface MoveResult { movement: StoredMovement; retry: boolean }

const str = (v: unknown): v is string => typeof v === 'string' && v !== '';
const need = (ok: boolean, message: string): void => { if (!ok) throw new ApprovalError('invalid-argument', message); };
const refuse = (v: { ok: true } | { ok: false; code: string; message: string }): void => { if (!v.ok) throw new ApprovalError(v.code, v.message); };

async function staffFor(ports: Ports, req: { restaurantId: unknown; sessionId: unknown }): Promise<Staff> {
  need(str(req.restaurantId) && str(req.sessionId), 'restaurantId and sessionId required');
  const staff = await ports.staff.bySession(req.restaurantId as string, req.sessionId as string);
  if (staff.status !== 'active') throw new ApprovalError('permission-denied', 'Staff account is not active');
  return staff;
}

async function configs(ports: Ports, rid: string): Promise<{ cfg: DayCloseConfig; pay: PaymentsConfig }> {
  const settings = await ports.config.settings(rid);
  const { config: cfg, warnings } = configFrom(settings);
  warnings.forEach(ports.warn);
  const pay = await loadPaymentsConfig(async () => settings, ports.warn, rid);
  return { cfg, pay };
}
const approvalsCfgFor = (ports: Ports, rid: string) =>
  loadApprovalsConfig(async r => ((await ports.config.settings(r)) as { approvals?: unknown } | undefined)?.approvals, ports.warn, rid);

/** R1: absent is open, a document is closed, and a read that throws is unknown — never open. */
const stateOf = (doc: CloseDoc | null): DayState => (doc ? 'closed' : 'open');
async function dayState(read: () => Promise<CloseDoc | null>): Promise<{ state: DayState; doc: CloseDoc | null }> {
  try { const doc = await read(); return { state: stateOf(doc), doc }; }
  catch { return { state: 'unknown', doc: null }; }
}

const logLine = (ports: Ports, l: { businessDate: string; action: string; amount: number; difference: number | null; outcome: string }) =>
  ports.log({ mod: 'dayClose', cid: `day_${l.businessDate}`, ...l });

// ─────────────────────────────────────────────────────────────────────────────
export async function close(ports: Ports, req: CloseReq): Promise<CloseResult> {
  const staff = await staffFor(ports, req);
  const rid = req.restaurantId;
  const { cfg, pay } = await configs(ports, rid);
  const at = ports.now();
  const today = businessDateFor(at, pay);
  const bd = req.businessDate;
  const fail = (code: string, message: string, details: Record<string, unknown> = {}, outcome = code): never => {
    logLine(ports, { businessDate: String(bd), action: 'close', amount: 0, difference: null, outcome });
    throw new ApprovalError(code, message, details);
  };

  // Decide on a read, take the PIN if the difference needs one, then decide AGAIN inside the write (R6a).
  const head = await dayState(() => ports.read.close(rid, bd));
  let rows: LedgerRow[], movements: StoredMovement[], floor: Floor;
  try {
    [rows, movements, floor] = await Promise.all([ports.read.rows(rid, bd), ports.read.movements(rid, bd), ports.read.floor(rid, bd)]);
  } catch {
    // DC-S13: never a close against zero takings. A day closed over an unreadable ledger books the
    // whole drawer as an overage and then freezes it.
    return fail('unavailable', 'Cannot read the day\'s payments, so the drawer cannot be checked against anything');
  }

  // A retry of the same count is a success, not a red "already exists" at midnight (R9, DC-S27).
  if (head.doc && head.doc.countedCash === req.countedCash) {
    logLine(ports, { businessDate: bd, action: 'close', amount: req.countedCash, difference: head.doc.difference, outcome: 'retry' });
    return { doc: head.doc, retry: true };
  }
  if (head.doc) {
    return fail('failed-precondition', `That day was already closed at ${new Date(head.doc.closedAt).toISOString()} by ${head.doc.closedBy}`,
      { closedAt: head.doc.closedAt, closedBy: head.doc.closedBy, countedCash: head.doc.countedCash, expectedCash: head.doc.expectedCash, difference: head.doc.difference });
  }

  const v = canClose({ ...req, role: staff.role }, head.state, floor, today);
  if (!v.ok) return fail(v.code, v.message);
  if (req.leftInDrawer !== undefined) {
    need(Number.isInteger(req.leftInDrawer) && req.leftInDrawer >= 0, 'leftInDrawer must be a non-negative integer in minor units');
    need(req.leftInDrawer <= req.countedCash, 'leftInDrawer cannot be more than the cash you counted');
  }

  const expected = expectedCashFrom(rows, movements);
  const difference = differenceOf(req.countedCash, expected);
  const sev = severityOf(difference, cfg);
  // DC-S29: a count that is wildly out is still recorded (R4), it just costs one deliberate act.
  const needsPin = Math.abs(difference) > cfg.overShortP0Above;
  if (needsPin) {
    try { await pinGate(ports, await approvalsCfgFor(ports, rid), rid, staff, req.pin, `day_${bd}`, 'dayClose', 'P0'); }
    catch (e) { if (e instanceof ApprovalError) return fail(e.code, e.message, e.details, pinOutcome(e)); throw e; }
  }

  try {
    const out = await ports.transact(rid, async t => {
      const already = await t.readClose(bd);
      if (already) {
        if (already.countedCash === req.countedCash) return { doc: already, retry: true };
        throw new ApprovalError('failed-precondition', `That day was already closed by ${already.closedBy}`, { countedCash: already.countedCash, difference: already.difference });
      }
      // R6a: the numbers that get frozen are read here, inside, so a payment committed while the
      // cashier was counting aborts one of the two transactions instead of being lost (DC-S26).
      const [rows2, moves2, floor2, bills2] = await Promise.all([t.rowsForDay(bd), t.movementsForDay(bd), t.floorOn(bd), t.billsForDay(bd)]);
      const v2 = canClose({ ...req, role: staff.role }, 'open', floor2, today);
      if (!v2.ok) throw new ApprovalError(v2.code, v2.message);

      const expected2 = expectedCashFrom(rows2, moves2);
      const difference2 = differenceOf(req.countedCash, expected2);
      if (!needsPin && Math.abs(difference2) > cfg.overShortP0Above) {
        throw new ApprovalError('failed-precondition', 'The day moved while you were counting; check the drawer and close again', { expectedCash: expected2, difference: difference2 });
      }
      const totals = totalsFrom(rows2);
      const counted = applyCounted(totals.byTender, req.countedByTender);
      if (counted.unknown.length) throw new ApprovalError('invalid-argument', `No money was taken on ${counted.unknown.join(', ')} today`);
      if (counted.bad.length) throw new ApprovalError('invalid-argument', `countedByTender.${counted.bad[0]} must be a non-negative integer in minor units`);

      const doc: CloseDoc = {
        businessDate: bd, closed: true, closedAt: at, closedBy: staff.staffId,
        openingFloat: openingFloatOf(moves2), expectedCash: expected2, countedCash: req.countedCash,
        difference: difference2, leftInDrawer: req.leftInDrawer ?? null,
        byTender: counted.rows, byStaff: totals.byStaff,
        movements: moves2,   // voided ones included, the way BL freezes voided lines onto a bill
        discounts: discountsFrom(bills2),
        walkouts: walkoutsFrom(bills2),
        thresholds: { overShortP0Above: cfg.overShortP0Above }, note: typeof req.note === 'string' ? req.note : '',
      };
      t.createClose(bd, doc);
      // R16: an audit row only when there is something to look at. The document is its own record.
      const sev2 = severityOf(difference2, cfg);
      if (sev2 !== 'P2') {
        t.createAudit(`${bd}_dayClose`, auditRow({
          ts: at, cid: `day_${bd}`, action: 'dayClose', staffId: staff.staffId, sev: sev2,
          amount: Math.abs(difference2), reason: difference2 < 0 ? 'drawer short' : 'drawer over',
          note: doc.note, lineId: null, before: null, after: null,
        }));
      }
      return { doc, retry: false };
    });
    logLine(ports, { businessDate: bd, action: 'close', amount: out.doc.countedCash, difference: out.doc.difference, outcome: out.retry ? 'retry' : 'applied' });
    return out;
  } catch (e) {
    if (e instanceof ApprovalError) return fail(e.code, e.message, e.details);
    return fail('unavailable', 'Could not close the day, try again');
  }
}

// ─────────────────────────────────────────────────────────────────────────────
/** R14: while the day is open and blindCount is true, NO cash figure for that day leaves here. */
export async function get(ports: Ports, req: GetReq): Promise<DayView> {
  await staffFor(ports, req);
  const rid = req.restaurantId;
  const { cfg, pay } = await configs(ports, rid);
  const bd = str(req.businessDate) ? req.businessDate : businessDateFor(ports.now(), pay);
  need(/^\d{4}-\d{2}-\d{2}$/.test(bd), 'businessDate must be YYYY-MM-DD');

  const prevDate = previousDate(bd);
  let doc: CloseDoc | null, prev: CloseDoc | null, rows: LedgerRow[], movements: StoredMovement[], floor: Floor, bills: DayBill[];
  try {
    [doc, prev, rows, movements, floor, bills] = await Promise.all([
      ports.read.close(rid, bd), ports.read.close(rid, prevDate),
      ports.read.rows(rid, bd), ports.read.movements(rid, bd), ports.read.floor(rid, bd), ports.read.bills(rid, bd),
    ]);
  } catch { throw new ApprovalError('unavailable', 'Cannot read that day'); }

  // DC-S31: what was left in the drawer last night is what the morning float screen opens on.
  const previousClose: PreviousClose | null = prev ? { businessDate: prev.businessDate, countedCash: prev.countedCash, leftInDrawer: prev.leftInDrawer } : null;
  const base = {
    businessDate: bd, blindCount: cfg.blindCount, reasons: cfg.reasons,
    floor: { issuedBills: floor.issued.filter(b => b.businessDate === bd).length, unbilledItems: floor.unbilled.filter(l => l.businessDate === bd).length },
    previousClose, previousDayClosed: prev !== null,
  };
  if (doc) {
    return {
      ...base, closed: true, byTender: doc.byTender, byStaff: doc.byStaff, movements: doc.movements, discounts: doc.discounts, walkouts: doc.walkouts,
      openingFloat: doc.openingFloat, expectedCash: doc.expectedCash, countedCash: doc.countedCash,
      difference: doc.difference, leftInDrawer: doc.leftInDrawer, closedAt: doc.closedAt, closedBy: doc.closedBy, note: doc.note,
    };
  }
  const { byTender, byStaff } = totalsFrom(rows);
  const discounts = discountsFrom(bills);
  const walkouts = walkoutsFrom(bills);
  if (cfg.blindCount) {
    // Takings of ₹12,450, refunds of ₹84 and a float of ₹2,000 are one addition away from the
    // number we are hiding, so the cash rows, the staff split and the movement amounts all stay here.
    return { ...base, closed: false, byTender: byTender.filter(t => t.kind !== 'cash'), discounts, walkouts };
  }
  return { ...base, closed: false, byTender, byStaff, movements, discounts, walkouts, openingFloat: openingFloatOf(movements), expectedCash: expectedCashFrom(rows, movements) };
}

// ─────────────────────────────────────────────────────────────────────────────
export async function move(ports: Ports, req: MoveReq): Promise<MoveResult> {
  const staff = await staffFor(ports, req);
  need(str(req.movementId), 'movementId required; the server never generates one');
  const rid = req.restaurantId, id = req.movementId;
  const { cfg, pay } = await configs(ports, rid);
  const at = ports.now();
  const bd = businessDateFor(at, pay);   // R8: server time, then frozen. Never from the body.
  const fail = (code: string, message: string, details: Record<string, unknown> = {}, outcome = code): never => {
    logLine(ports, { businessDate: bd, action: `drawer_${String(req.kind)}`, amount: 0, difference: null, outcome });
    throw new ApprovalError(code, message, details);
  };

  const head = await ports.transact(rid, t => t.movementById(id));
  const day = await dayState(() => ports.read.close(rid, bd));
  if (!head) {
    const v = canMove({ ...req, role: staff.role }, day.state, cfg);
    if (!v.ok) return fail(v.code, v.message);
    // ST R2 already calls opening the drawer with no sale a PIN, P0. Recording a movement is that act.
    try { await pinGate(ports, await approvalsCfgFor(ports, rid), rid, staff, req.pin, `day_${bd}`, 'drawer', 'P0'); }
    catch (e) { if (e instanceof ApprovalError) return fail(e.code, e.message, e.details, pinOutcome(e)); throw e; }
  }

  try {
    const out = await ports.transact(rid, async t => {
      const existing = await t.movementById(id);
      if (existing) {
        // R13: the same tap twice is one row. A different amount under the same id is a bug, not a retry.
        const same = existing.kind === req.kind && existing.amount === req.amount && existing.reason === req.reason;
        if (!same) throw new ApprovalError('failed-precondition', 'movementId already used for a different drawer movement');
        return { movement: existing, retry: true };
      }
      const state = stateOf(await t.readClose(bd));
      const v2 = canMove({ ...req, role: staff.role }, state, cfg);
      if (!v2.ok) throw new ApprovalError(v2.code, v2.message);
      const m: StoredMovement = {
        movementId: id, businessDate: bd, kind: req.kind as Movement['kind'], amount: req.amount,
        reason: req.reason, note: typeof req.note === 'string' ? req.note : '', at, by: staff.staffId, void: null,
      };
      t.createMovement(id, m);
      t.createAudit(`${id}_drawer`, auditRow({
        ts: at, cid: `day_${bd}`, action: 'drawer', staffId: staff.staffId, sev: 'P0',
        amount: m.amount, reason: m.reason, note: m.note as string, lineId: null, before: null, after: null,
      }));
      return { movement: m, retry: false };
    });
    logLine(ports, { businessDate: bd, action: `drawer_${out.movement.kind}`, amount: out.movement.amount, difference: null, outcome: out.retry ? 'retry' : 'applied' });
    return out;
  } catch (e) {
    if (e instanceof ApprovalError) return fail(e.code, e.message, e.details);
    return fail('unavailable', 'Could not record the drawer movement, try again');
  }
}

// ─────────────────────────────────────────────────────────────────────────────
export async function voidMove(ports: Ports, req: VoidMoveReq): Promise<MoveResult> {
  const staff = await staffFor(ports, req);
  need(str(req.movementId), 'movementId required');
  const rid = req.restaurantId, id = req.movementId;
  const { cfg } = await configs(ports, rid);
  const at = ports.now();
  let bd = '';
  const fail = (code: string, message: string, details: Record<string, unknown> = {}, outcome = code): never => {
    logLine(ports, { businessDate: bd, action: 'drawer_void', amount: 0, difference: null, outcome });
    throw new ApprovalError(code, message, details);
  };

  const head = await ports.transact(rid, t => t.movementById(id));
  bd = head?.businessDate ?? '';
  const day = head ? await dayState(() => ports.read.close(rid, head.businessDate)) : { state: 'open' as DayState };
  const v = canVoidMove(head, day.state, { role: staff.role, by: staff.staffId, reason: req.reason });
  if (!v.ok) return fail(v.code, v.message);
  if (!('retry' in v)) {
    try { await pinGate(ports, await approvalsCfgFor(ports, rid), rid, staff, req.pin, `day_${bd}`, 'drawer', 'P0'); }
    catch (e) { if (e instanceof ApprovalError) return fail(e.code, e.message, e.details, pinOutcome(e)); throw e; }
  }

  try {
    const out = await ports.transact(rid, async t => {
      const m = await t.movementById(id);
      const state = m ? stateOf(await t.readClose(m.businessDate)) : 'open';
      const v2 = canVoidMove(m, state, { role: staff.role, by: staff.staffId, reason: req.reason });
      if (!v2.ok) throw new ApprovalError(v2.code, v2.message);
      const row = m as StoredMovement;
      if ('retry' in v2) return { movement: row, retry: true };
      const block: VoidBlock = { at, by: staff.staffId, reason: req.reason, note: typeof req.note === 'string' ? req.note : '' };
      t.setMovementVoid(id, block);
      t.createAudit(`${id}_drawerVoid`, auditRow({
        ts: at, cid: `day_${row.businessDate}`, action: 'voidDrawerMove', staffId: staff.staffId, sev: 'P0',
        amount: row.amount, reason: req.reason, note: block.note as string, lineId: null, before: null, after: null,
      }));
      return { movement: { ...row, void: block }, retry: false };
    });
    logLine(ports, { businessDate: out.movement.businessDate, action: 'drawer_void', amount: out.movement.amount, difference: null, outcome: out.retry ? 'retry' : 'applied' });
    return out;
  } catch (e) {
    if (e instanceof ApprovalError) return fail(e.code, e.message, e.details);
    return fail('unavailable', 'Could not void the drawer movement, try again');
  }
}

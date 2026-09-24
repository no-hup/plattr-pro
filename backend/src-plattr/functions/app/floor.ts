// FL · use-cases: what the cashier's home screen reads, and the three acts it can take.
// Domain does every decision; ports do the I/O. Sheet: moonshot/SPEC_FL_floor_and_moves.md.
//
// R1 — the floor is a picture, and the tap is a read of the truth. `getFloor` paints; `openTable`
// goes back to the database and decides there. A tile five seconds stale never routes a screen.
//
// R19 — if the money cannot be summed the call fails. It never answers with an occupied tile
// reading ₹0, because the cashier skips that table and the party walks out unbilled.

import { Line } from '../domain/line';
import {
  Bill, Sitting, Table, Tile, Role, OrderState, DEFAULTS,
  canMerge, canMove, canReceive, canUnmerge, isReleasable, moveWriteSet, tile, idleCall, lastTouchedAt, onTable, unpaid, sittingOf,
} from '../domain/floor';
import { ApprovalError, Staff } from './approvals';
export { ApprovalError };

export interface FloorConfig { pollSeconds: number; staleAfterSeconds: number; idleFreeAfterMinutes: number; takeawayTableIds: string[] }

export function floorConfigFrom(doc: unknown): FloorConfig {
  const f = (doc as { floor?: Partial<FloorConfig> } | undefined)?.floor ?? {};
  const num = (v: unknown, d: number) => (typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : d);
  return {
    pollSeconds: num(f.pollSeconds, DEFAULTS.pollSeconds),
    staleAfterSeconds: num(f.staleAfterSeconds, DEFAULTS.staleAfterSeconds),
    idleFreeAfterMinutes: num(f.idleFreeAfterMinutes, DEFAULTS.idleFreeAfterMinutes),
    // BT / OR-3: the counter tickets (`ordering.takeawayTableIds`), so the screen can draw them as a Parcels strip.
    takeawayTableIds: (() => { const t = (doc as { ordering?: { takeawayTableIds?: unknown } } | undefined)?.ordering?.takeawayTableIds; return Array.isArray(t) ? t.filter((x): x is string => typeof x === 'string') : []; })(),
  };
}

/** A sitting as the database holds it, before its lines and bills are attached. */
export interface SittingHead {
  sessionId: string;
  tableIds: string[];
  openedAt: number;
}

export interface Order { orderId: string; state: OrderState }

export interface Tx {
  getTable(tableId: string): Promise<Table | null>;
  childrenOf(tableId: string): Promise<string[]>;
  getSitting(sessionId: string): Promise<Sitting | null>;
  setSessionTable(sessionId: string, tableId: string): void;
  moveCart(fromTableId: string, toTableId: string): Promise<void>;
  setOrderTable(orderId: string, tableId: string): void;
  setLineTable(lineId: string, tableId: string): void;
  setTable(tableId: string, patch: Partial<Table> & Record<string, unknown>): void;
  endSession(sessionId: string): void;
  ordersOfSession(sessionId: string): Promise<Order[]>;
  createAudit(id: string, row: object): void;
  /**
   * R21. Every timestamp the database holds that says this sitting moved, beyond what the sitting
   * itself carries: the session's `updatedAt`, each table's cart `lastUpdated` and scan
   * `lastActivity`, each bill's `issuedAt`/`paidAt`, each payment's `at`. Millis; unknown → 0.
   */
  touchedAt(sitting: Sitting): Promise<number[]>;
}

export interface Ports {
  now(): number;
  log(line: object): void;
  staff: { bySession(restaurantId: string, sessionId: string): Promise<Staff> };
  config: { floor(restaurantId: string): Promise<FloorConfig> };
  tablesOf(restaurantId: string): Promise<Table[]>;
  sittingsOf(restaurantId: string): Promise<SittingHead[]>;
  linesOfSessions(restaurantId: string, sessionIds: string[]): Promise<Line[]>;   // R2: by frozen sessionId
  billsOfSessions(restaurantId: string, sessionIds: string[]): Promise<Bill[]>;
  transact<T>(restaurantId: string, fn: (t: Tx) => Promise<T>): Promise<T>;
  /** FL-S36. Live sittings opened before `openedBefore` — the only ones that can possibly be idle. */
  idleCandidates(restaurantId: string, openedBefore: number): Promise<SittingHead[]>;
  restaurantIds(): Promise<string[]>;
  /** ST's one door (app/approvals apply): role, reason, PIN, P0 audit row. Throws ApprovalError on refusal. */
  approve(req: { restaurantId: string; sessionId: string; action: 'releaseUnpaid'; cid: string; amountMinor: number; reason?: unknown; note?: unknown; pin?: unknown }): Promise<unknown>;
}

const fail = (code: string, message: string, details: Record<string, unknown> = {}): never => {
  throw new ApprovalError(code, message, details);
};

/** R16. The floor's three acts are a manager's. 403, never a PIN prompt. */
async function actor(ports: Ports, restaurantId: string, staffSessionId: string): Promise<Staff> {
  const staff = await ports.staff.bySession(restaurantId, staffSessionId);
  if (staff.status !== 'active') fail('permission-denied', 'this login is not active');
  return staff;
}

// ── Read ───────────────────────────────────────────────────────────────────

export interface FloorRequest { restaurantId: string; staffSessionId: string }
export interface FloorResult { tiles: Tile[]; config: FloorConfig; at: number }

/** Assemble every sitting's money once, then paint. One read of lines for the whole floor, not one per table. */
export async function getFloor(ports: Ports, req: FloorRequest): Promise<FloorResult> {
  await actor(ports, req.restaurantId, req.staffSessionId);
  const [tables, heads, config] = await Promise.all([
    ports.tablesOf(req.restaurantId),
    ports.sittingsOf(req.restaurantId),
    ports.config.floor(req.restaurantId),
  ]);

  const ids = heads.map(h => h.sessionId);
  const [lines, bills] = await Promise.all([
    ports.linesOfSessions(req.restaurantId, ids),
    ports.billsOfSessions(req.restaurantId, ids),
  ]);

  const sittings = heads.map(h => sittingOf(h, lines, bills));
  const now = ports.now();
  const byTable = new Map<string, Sitting>();
  for (const s of sittings) for (const t of s.tableIds) byTable.set(t, s);

  const numbers = new Map(tables.filter(t => t.number).map(t => [t.tableId, t.number as string]));
  // mergedInto on the child is the only stored form of the relationship (see the note in
  // adapters/firestore/floor.ts); the group is rebuilt from it on every read.
  const kids = new Map<string, string[]>();
  for (const t of tables) if (t.mergedInto) kids.set(t.mergedInto, [...(kids.get(t.mergedInto) ?? []), t.tableId]);
  const tiles: Tile[] = [];
  const drawn = new Set<string>();
  for (const t of tables) {
    if (drawn.has(t.tableId)) continue;
    const s = byTable.get(t.tableId) ?? null;
    // R9 + R17 in one line: a table with no sitting and no money shows nothing if it is
    // `disabled`, which covers both a retired table and a merged child (setMerge writes
    // DISABLED on every child). A child WITH a sitting is drawn as part of its group's one
    // tile below, and `drawn` then keeps it from being drawn twice.
    if (!s && t.status === 'disabled') continue;
    const group = kids.has(t.tableId) ? [t.tableId, ...(kids.get(t.tableId) as string[])] : undefined;
    tiles.push(tile(s, t, now, numbers, group));
    if (s) for (const id of s.tableIds) drawn.add(id);
    else for (const id of group ?? [t.tableId]) drawn.add(id);
  }

  // R17: a sitting whose table document was retired or deleted still needs a door to its bill.
  for (const s of sittings) {
    if (s.tableIds.some(id => drawn.has(id))) continue;
    tiles.push(tile(s, { tableId: s.tableIds[0], status: 'disabled' }, now, numbers));
    for (const id of s.tableIds) drawn.add(id);
  }

  return { tiles, config, at: now };
}


// ── The tap ────────────────────────────────────────────────────────────────

export interface OpenRequest extends FloorRequest { tableId: string }
export interface OpenResult {
  tableIds: string[];
  sessionId: string | null;
  drafts: { draftId: string; onTable: number; lineIds: string[] }[];
  bills: { billId: string; payable: number; paid: number; status: Bill['status'] }[];
}

/**
 * R1, R12. Re-read inside the call, and answer with every draft and every bill. A tap never picks
 * one silently: a split has three, and choosing one for the cashier orphans the other two.
 */
export async function openTable(ports: Ports, req: OpenRequest): Promise<OpenResult> {
  await actor(ports, req.restaurantId, req.staffSessionId);
  const heads = await ports.sittingsOf(req.restaurantId);
  const head = heads.find(h => h.tableIds.includes(req.tableId));
  if (!head) return { tableIds: [req.tableId], sessionId: null, drafts: [], bills: [] };

  const [lines, bills] = await Promise.all([
    ports.linesOfSessions(req.restaurantId, [head.sessionId]),
    ports.billsOfSessions(req.restaurantId, [head.sessionId]),
  ]);
  const s = sittingOf(head, lines, bills);

  const drafts = new Map<string, { draftId: string; onTable: number; lineIds: string[] }>();
  for (const l of s.lines) {
    if (l.billId || !l.countsTowardTotal) continue;
    const d = drafts.get(l.draftId) ?? { draftId: l.draftId, onTable: 0, lineIds: [] };
    d.onTable += Math.max(0, l.listPrice - (l.offer?.amount ?? 0) - (l.discount?.amount ?? 0));
    d.lineIds.push(l.lineId);
    drafts.set(l.draftId, d);
  }

  return {
    tableIds: s.tableIds,
    sessionId: s.sessionId,
    drafts: [...drafts.values()].sort((a, b) => a.draftId.localeCompare(b.draftId)),
    bills: s.bills
      .filter(b => b.status !== 'cancelled')
      .map(b => ({ billId: b.billId, payable: b.payable, paid: b.paid, status: b.status })),
  };
}

// ── Move ───────────────────────────────────────────────────────────────────

export interface MoveRequest extends FloorRequest { fromTableId: string; toTableId: string; cid: string }

/**
 * R5, FL-S28. One transaction re-points the session, the cart, every unfinished order and every
 * unbilled line. Prices are never touched: `tableId` is routing, not money.
 */
export async function moveTable(ports: Ports, req: MoveRequest): Promise<{ moved: string[]; orderIds: string[]; lineIds: string[] }> {
  const staff = await actor(ports, req.restaurantId, req.staffSessionId);
  const at = ports.now();

  return ports.transact(req.restaurantId, async t => {
    const [from, dest] = await Promise.all([t.getTable(req.fromTableId), t.getTable(req.toTableId)]);
    if (!from) fail('not-found', `table ${req.fromTableId} does not exist`);
    if (!dest) fail('not-found', `table ${req.toTableId} does not exist`);

    const sitting = await sittingAt(t, from as Table);
    const check = canMove(from as Table, dest as Table, sitting, staff.role as Role);
    if (!check.ok) fail(check.code, check.message);

    const s = sitting as Sitting;
    const orders = await t.ordersOfSession(s.sessionId);
    const w = moveWriteSet(s, req.fromTableId, req.toTableId, orders);

    // The cart move reads the source document, and Firestore refuses a read after a write in
    // the same transaction, so it goes first and every pure write follows it.
    await t.moveCart(w.cartFrom, w.cartTo);
    t.setSessionTable(w.sessionId, w.toTableId);
    for (const id of w.orderIds) t.setOrderTable(id, w.toTableId);
    for (const id of w.lineIds) t.setLineTable(id, w.toTableId);
    t.setTable(req.fromTableId, { status: 'vacant', currentOTP: null });
    t.setTable(req.toTableId, { status: 'active' });

    t.createAudit(`${req.cid}_move`, {
      cid: req.cid, action: 'table.move', sev: 'P1', at,
      by: staff.staffId, role: staff.role,
      sessionId: w.sessionId, from: req.fromTableId, to: req.toTableId,
      orderIds: w.orderIds, lineCount: w.lineIds.length,
    });

    ports.log({ evt: 'table.move', cid: req.cid, from: req.fromTableId, to: req.toTableId, by: staff.staffId, orders: w.orderIds.length, lines: w.lineIds.length });
    return { moved: [req.fromTableId, req.toTableId], orderIds: w.orderIds, lineIds: w.lineIds };
  });
}

async function sittingAt(t: Tx, table: Table): Promise<Sitting | null> {
  const s = await t.getSitting(table.tableId);
  return s;
}

// ── Merge and unmerge ──────────────────────────────────────────────────────

export interface MergeRequest extends FloorRequest {
  parentTableId: string;
  childTableIds?: string[];
  merge?: boolean;
  cid: string;
}

/**
 * FL-S7, S9, S26, S27, S32. `table-setMerge` keeps its name and its door; what changed is that
 * every child is re-read INSIDE the transaction. The first version read the child and then
 * committed a batch, so two cashiers merging the same vacant table could both win and table 6
 * would end up pointing at two parents.
 *
 * Unmerge releases every child of the parent (OR-5a, signed 2026-09-17) and is refused outright
 * while the group holds open money (R14) — which is what makes releasing everything affordable.
 */
export async function setMerge(ports: Ports, req: MergeRequest): Promise<{ parentTableId: string; childTableIds: string[]; merged: boolean }> {
  const staff = await actor(ports, req.restaurantId, req.staffSessionId);
  const merge = req.merge !== false;
  const at = ports.now();

  return ports.transact(req.restaurantId, async t => {
    const parent = await t.getTable(req.parentTableId);
    if (!parent) fail('not-found', `table ${req.parentTableId} does not exist`);

    if (!merge) {
      const sitting = await t.getSitting(req.parentTableId);
      const allowed = canUnmerge(sitting, staff.role as Role);
      if (!allowed.ok) fail(allowed.code, allowed.message);

      const children = await t.childrenOf(req.parentTableId);
      for (const id of children) t.setTable(id, { status: 'vacant', mergedInto: null, mergedBy: null });
      if (children.length) {
        t.createAudit(`${req.cid}_unmerge`, {
          cid: req.cid, action: 'table.unmerge', sev: 'P1', at,
          by: staff.staffId, role: staff.role, parentTableId: req.parentTableId, childTableIds: children,
        });
      }
      ports.log({ evt: 'table.unmerge', cid: req.cid, parent: req.parentTableId, released: children.length, by: staff.staffId });
      return { parentTableId: req.parentTableId, childTableIds: children, merged: false };
    }

    const childTableIds = req.childTableIds ?? [];
    if (!childTableIds.length) fail('invalid-argument', 'childTableIds must list at least one table to merge');

    // Every child is read here, inside the transaction, so a guest finishing an OTP in the same
    // second makes this merge lose rather than both writes landing (FL-S32).
    const children = await Promise.all(childTableIds.map(id => t.getTable(id)));
    children.forEach((child, i) => {
      if (!child) fail('not-found', `table ${childTableIds[i]} does not exist`);
      const allowed = canMerge(parent as Table, child as Table, staff.role as Role);
      if (!allowed.ok) fail(allowed.code, allowed.message);
    });

    for (const id of childTableIds) {
      t.setTable(id, { status: 'disabled', mergedInto: req.parentTableId, mergedBy: { serverId: staff.staffId, role: staff.role } });
    }
    t.createAudit(`${req.cid}_merge`, {
      cid: req.cid, action: 'table.merge', sev: 'P1', at,
      by: staff.staffId, role: staff.role, parentTableId: req.parentTableId, childTableIds,
    });
    ports.log({ evt: 'table.merge', cid: req.cid, parent: req.parentTableId, children: childTableIds.length, by: staff.staffId });
    return { parentTableId: req.parentTableId, childTableIds, merged: true };
  });
}

// ── Freeing a settled table (FL-Q1) ────────────────────────────────────────

export interface ClearRequest extends FloorRequest { tableId: string; cid: string; pin?: unknown; reason?: unknown; note?: unknown }

/**
 * Freeing a table (Shaurya 2026-09-24). A table with no open money: anyone may free it — the
 * captain's Vacant and the cashier's Clear alike. A table that still owes: only the cashier, and
 * only through ST's door as `releaseUnpaid` — reason, PIN, and a P0 audit row naming the amount
 * walked away from. No PIN, the refusal is the one it always was.
 */
export async function clearTable(ports: Ports, req: ClearRequest): Promise<{ freed: string[] }> {
  // A blank id reached Firestore once and came back as "An unexpected error occurred" (sanity run 1).
  if (typeof req.tableId !== 'string' || !req.tableId) fail('invalid-argument', 'tableId required: which table to clear');
  const staff = await actor(ports, req.restaurantId, req.staffSessionId);
  const at = ports.now();
  const cashier = staff.role === 'MANAGER' || staff.role === 'ADMIN';

  const release = (owedApproved: number | null) => ports.transact(req.restaurantId, async t => {
    const table = await t.getTable(req.tableId);
    if (!table) fail('not-found', `table ${req.tableId} does not exist`);
    // TD-037: a merged child has no session of its own; its money is its group's. The waiter's manual
    // Vacant reaches here for a child too, and must not detach table 6 from a party that still owes.
    const s = await t.getSitting(table!.mergedInto ?? req.tableId);
    if (!s) return { freed: [] as string[], owed: 0 };                // already free; nothing to do
    const owed = isReleasable(s) ? 0 : onTable(s.lines) + unpaid(s.bills);
    if (owed > 0 && owed !== owedApproved) {
      if (!cashier) fail('permission-denied', 'only the cashier can free a table that still owes');
      // Approved a different figure (a dish landed in between): the PIN covered that amount, not this one.
      if (owedApproved !== null) fail('failed-precondition', 'the amount on this table changed, try again', { owed });
      fail('failed-precondition', 'this table still has money on it — bill it and settle it first', { requires: 'pin', action: 'releaseUnpaid', owed });
    }
    if (table!.mergedInto) return { freed: [] as string[], owed }; // the group owes nothing; the caller detaches the child, the party stays

    // The sitting ends with the table. Leaving the session active would keep painting the tile
    // as settled forever, and a passer-by scanning the QR would join a paid party's tab (R18).
    endSitting(t, s);
    t.createAudit(`${req.cid}_clear`, {
      cid: req.cid, action: 'table.clear', sev: owed > 0 ? 'P0' : 'P2', at, owed,
      by: staff.staffId, role: staff.role, sessionId: s.sessionId, tableIds: s.tableIds,
    });
    ports.log({ evt: 'table.clear', cid: req.cid, tableIds: s.tableIds, by: staff.staffId, owed });
    return { freed: s.tableIds, owed };
  });

  if (!cashier || req.pin === undefined) return { freed: (await release(null)).freed };
  // The cashier sent a PIN: learn what is owed, clear it through ST's door (which writes the P0 row
  // with that amount), then free the table only if the amount is still exactly that.
  const owed = await ports.transact(req.restaurantId, async t => {
    const table = await t.getTable(req.tableId);
    const s = table ? await t.getSitting(table.mergedInto ?? req.tableId) : null;
    return s && !isReleasable(s) ? onTable(s.lines) + unpaid(s.bills) : 0;
  });
  if (owed === 0) return { freed: (await release(null)).freed };
  await ports.approve({ restaurantId: req.restaurantId, sessionId: req.staffSessionId, action: 'releaseUnpaid', cid: req.cid, amountMinor: owed, reason: req.reason, note: req.note, pin: req.pin });
  return { freed: (await release(owed)).freed };
}

/**
 * What "vacant" writes, in one place: the session ends and every table of the sitting is reset —
 * the merge, the scan hold and the older table module's party fields (`occupiedBy`,
 * `primaryCustomer`, `activeOrderId`), which `tablesOf` still reads as "has a session".
 */
function endSitting(t: Tx, s: Sitting): void {
  t.endSession(s.sessionId);
  for (const id of s.tableIds) {
    t.setTable(id, { status: 'vacant', mergedInto: null, mergedBy: null, currentOTP: null, occupiedBy: [], primaryCustomer: null, activeOrderId: null });
  }
}

// ── The table nobody frees (FL-S36, R21, TD-044) ───────────────────────────

export interface IdleReport { restaurantId: string; candidates: number; freed: string[]; money: string[]; skipped: string[] }

/**
 * The sweep. Candidates are the live sittings opened before the threshold; each is re-read inside
 * its own transaction (a run that overlaps this one, or a Clear that landed meanwhile, finds the
 * session ended and does nothing). `free` ends the sitting with an audit row that names the clock;
 * `money` is logged and left — day close is where a person meets it (it refuses on open money).
 * A sitting that cannot be read is skipped and logged, never freed: fail closed.
 */
export async function releaseIdle(ports: Ports, restaurantId: string): Promise<IdleReport> {
  const cfg = await ports.config.floor(restaurantId);
  const idleMs = cfg.idleFreeAfterMinutes * 60_000;
  const now = ports.now();
  const heads = await ports.idleCandidates(restaurantId, now - idleMs);
  const report: IdleReport = { restaurantId, candidates: heads.length, freed: [], money: [], skipped: [] };

  for (const h of heads) {
    try {
      await ports.transact(restaurantId, async t => {
        const s = await t.getSitting(h.tableIds[0]);
        if (!s || s.sessionId !== h.sessionId) return;                  // ended or replaced since the read
        const touched = await t.touchedAt(s);
        const call = idleCall(s, touched, now, idleMs);
        if (call === 'busy') return;
        const idleMinutes = Math.floor((now - lastTouchedAt(s, touched, now)) / 60_000);
        if (call === 'money') {
          report.money.push(s.sessionId);
          ports.log({ evt: 'table.idle.money', cid: s.sessionId, tableIds: s.tableIds, idleMinutes });
          return;
        }
        endSitting(t, s);
        t.createAudit(`${s.sessionId}_autoVacate`, {
          cid: s.sessionId, action: 'table.autoVacate', sev: 'P2', at: now,
          by: 'system', role: 'SYSTEM', sessionId: s.sessionId, tableIds: s.tableIds,
          idleMinutes, why: `idle ${idleMinutes}m, no open money`,
        });
        report.freed.push(...s.tableIds);
        ports.log({ evt: 'table.autoVacate', cid: s.sessionId, tableIds: s.tableIds, idleMinutes });
      });
    } catch (e) {
      report.skipped.push(h.sessionId);
      ports.log({ evt: 'table.idle.skipped', cid: h.sessionId, error: String((e as Error)?.message ?? e) });
    }
  }
  ports.log({ evt: 'floor.idleSweep', restaurantId, candidates: heads.length, freed: report.freed.length, money: report.money.length, skipped: report.skipped.length });
  return report;
}

/** One restaurant failing never stops the others; the sweep line per restaurant is the heartbeat. */
export async function releaseIdleEverywhere(ports: Ports): Promise<IdleReport[]> {
  const out: IdleReport[] = [];
  for (const rid of await ports.restaurantIds()) {
    try { out.push(await releaseIdle(ports, rid)); }
    catch (e) { ports.log({ evt: 'floor.idleSweep.failed', restaurantId: rid, error: String((e as Error)?.message ?? e) }); }
  }
  return out;
}

export { canReceive };

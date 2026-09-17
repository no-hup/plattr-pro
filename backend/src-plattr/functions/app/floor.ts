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
  canMerge, canMove, canReceive, canUnmerge, isReleasable, moveWriteSet, tile,
} from '../domain/floor';
import { ApprovalError, Staff } from './approvals';
export { ApprovalError };

export interface FloorConfig { pollSeconds: number; staleAfterSeconds: number }

export function floorConfigFrom(doc: unknown): FloorConfig {
  const f = (doc as { floor?: Partial<FloorConfig> } | undefined)?.floor ?? {};
  const num = (v: unknown, d: number) => (typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : d);
  return {
    pollSeconds: num(f.pollSeconds, DEFAULTS.pollSeconds),
    staleAfterSeconds: num(f.staleAfterSeconds, DEFAULTS.staleAfterSeconds),
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

  const sittings = heads.map(h => attach(h, lines, bills));
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

function attach(head: SittingHead, lines: Line[], bills: Bill[]): Sitting {
  return {
    ...head,
    lines: lines.filter(l => l.sessionId === head.sessionId),
    bills: bills.filter(b => (b as Bill & { sessionId?: string }).sessionId === head.sessionId),
  };
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
  const s = attach(head, lines, bills);

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

export interface ClearRequest extends FloorRequest { tableId: string; cid: string }

/** The cashier's Clear. Refused while anything is still open, so it can never hide money. */
export async function clearTable(ports: Ports, req: ClearRequest): Promise<{ freed: string[] }> {
  const staff = await actor(ports, req.restaurantId, req.staffSessionId);
  const at = ports.now();

  return ports.transact(req.restaurantId, async t => {
    const table = await t.getTable(req.tableId);
    if (!table) fail('not-found', `table ${req.tableId} does not exist`);
    const s = await t.getSitting(req.tableId);
    if (!s) return { freed: [] };                                     // already free; nothing to do
    if (!isReleasable(s)) {
      fail('failed-precondition', 'this table still has money on it — bill it and settle it first');
    }

    // The sitting ends with the table. Leaving the session active would keep painting the tile
    // as settled forever, and a passer-by scanning the QR would join a paid party's tab (R18).
    t.endSession(s.sessionId);
    for (const id of s.tableIds) t.setTable(id, { status: 'vacant', mergedInto: null, currentOTP: null });
    t.createAudit(`${req.cid}_clear`, {
      cid: req.cid, action: 'table.clear', sev: 'P2', at,
      by: staff.staffId, role: staff.role, sessionId: s.sessionId, tableIds: s.tableIds,
    });
    ports.log({ evt: 'table.clear', cid: req.cid, tableIds: s.tableIds, by: staff.staffId });
    return { freed: s.tableIds };
  });
}

export { canReceive };

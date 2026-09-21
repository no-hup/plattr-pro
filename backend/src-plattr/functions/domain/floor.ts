// FL · the floor, pure. Sheet: moonshot/SPEC_FL_floor_and_moves.md.
//
// Two ideas hold this file together.
//
// R2 — money is read off the line snapshots by their FROZEN sessionId, never by draftId. A split
// rewrites draftId (app/billing.ts), so a tile keyed on it reads ₹0 for a table that owes ₹3,000.
//
// R11/R14 — a tile is not one status word. It carries two numbers on two axes: what is on the
// table unbilled, and what is still owed on bills already issued. "Free" means no open money, not
// no session: a captain marking an order COMPLETED must not paint a pale tile over ₹2,340.

import { Line } from './line';
import { net } from './approvals';

export type Role = 'ADMIN' | 'MANAGER' | 'SERVER' | 'CAPTAIN';
export type RefusalCode = 'failed-precondition' | 'invalid-argument' | 'permission-denied';
export type Check = { ok: true } | { ok: false; code: RefusalCode; message: string };

const ok: Check = { ok: true };
const no = (message: string, code: RefusalCode = 'failed-precondition'): Check => ({ ok: false, code, message });

/** A bill as the floor needs it. `paid` is the sum of takes; a cancelled bill owes nothing. */
export interface Bill {
  billId: string;
  status: 'issued' | 'paid' | 'cancelled';
  payable: number;
  paid: number;
}

/** What a person calls the table. A refusal a cashier cannot act on is not a refusal. */
const name = (t: Table): string => t.number ?? t.tableId;

/** Why a table is not free, in the words the cashier would use. R6 refuses on the state, not the word. */
const WHY: Record<Table['status'], string> = {
  vacant: 'is free',
  active: 'has a party at it',
  pending: 'has a guest signing in',   // legacy documents only; nothing writes it since 2026-09-21
  disabled: 'is out of service',
  reserved: 'is reserved',
};

/** A table document, only the fields a floor decision turns on. */
export interface Table {
  tableId: string;
  number?: string;             // what the cashier reads on the tile: "12", not "table_fl_12"

  status: 'vacant' | 'active' | 'pending' | 'disabled' | 'reserved';
  mergedInto?: string | null;
  /**
   * Someone scanned this table's QR and has not signed in yet, and their claim has not lapsed.
   *
   * This replaced the `pending` table status on 2026-09-21. The adapter derives it from
   * `currentOTP.expiresAt`, the same way it derives `hasSession` and `isParent` — a claim that
   * is a timestamp lapses on its own, where a stored status needed a cleanup job to undo it and
   * never got one (TD-044). See session/otpService.js and
   * moonshot/reviews/2026-09-21-otp-and-table-state.md.
   */
  hasHold?: boolean;
  hasSession?: boolean;
  isParent?: boolean;          // some other table is merged into this one
}

export interface Sitting {
  sessionId: string;
  tableIds: string[];          // the parent and every child merged into it
  openedAt: number;
  lines: Line[];
  bills: Bill[];
}

export const DEFAULTS = { pollSeconds: 5, staleAfterSeconds: 20 };

// ── The two numbers ────────────────────────────────────────────────────────

/**
 * R2. What is on the table and not yet on any bill. Never negative, never NaN.
 *
 * R19: a line we cannot read throws rather than contributing 0. An occupied tile painted ₹0 is
 * worse than a floor that admits it is broken — the cashier skips the table and the party walks.
 */
export function onTable(lines: Line[]): number {
  let total = 0;
  for (const l of lines) {
    if (l.billId) continue;              // already on a bill: it is the other axis now
    if (!l.countsTowardTotal) continue;  // voided
    const n = net(l);
    if (!Number.isFinite(n)) throw new Error(`line ${l.lineId} cannot be read`);
    total += Math.max(0, n);             // an offer larger than the price cannot pull the tile down
  }
  return total;
}

/** R12. What is still owed across every bill of the sitting. A cancelled bill owes nothing. */
export function unpaid(bills: Bill[]): number {
  let total = 0;
  for (const b of bills) {
    if (b.status === 'cancelled') continue;
    total += Math.max(0, b.payable - b.paid);  // an overpaid bill owes 0, never a negative
  }
  return total;
}

/** How many drafts a tap would have to choose between. A tap never picks one silently (R12). */
export const draftCount = (lines: Line[]): number =>
  new Set(lines.filter(l => !l.billId && l.countsTowardTotal).map(l => l.draftId)).size;

// ── The tile ───────────────────────────────────────────────────────────────

export type TileWord = 'free' | 'holding' | 'reserved' | 'seated' | 'ordered' | 'billed' | 'settled';

export interface Tile {
  tableIds: string[];     // document ids: what an act is sent with
  label: string;          // what a person reads: "12", or "5+6" for a merged group (R9)
  word: TileWord;
  onTable: number;        // axis 1
  unpaid: number;         // axis 2
  drafts: number;
  minutes: number;
}

/**
 * R11. The word is derived, never stored, and it never replaces the numbers — a table that is
 * billed AND still eating shows both, because ordering does not stop at issue (BL R13, TD-034).
 */
export function tileWord(s: { onTable: number; unpaid: number; hasSession: boolean; settled: boolean; hasHold?: boolean; reserved?: boolean }): TileWord {
  if (s.unpaid > 0) return 'billed';
  if (s.onTable > 0) return 'ordered';
  if (s.settled) return 'settled';        // paid, nothing left open, party may still be sitting
  if (s.hasSession) return 'seated';      // scanned, reading the menu, nothing placed
  // TD-042. A guest is at the QR screen with the code in their hand. No session and no money, so
  // every line above says nothing — and until 2026-09-21 the tile therefore read `free` while
  // merge and move refused that very table. The cashier aimed at a tile that lied to them.
  if (s.hasHold) return 'holding';
  // Same lie, second cause: staff are holding this table for a booking, `canReceive` refuses it,
  // and until 2026-09-21 the tile said free. A word the cashier can act on, or none at all.
  if (s.reserved) return 'reserved';
  return 'free';                          // R14: no open money anywhere
}

export function tile(sitting: Sitting | null, table: Table, now: number, numbers?: Map<string, string>, groupIds?: string[]): Tile {
  const money = sitting ? onTable(sitting.lines) : 0;
  const owed = sitting ? unpaid(sitting.bills) : 0;
  const settled = !!sitting && sitting.bills.some(b => b.status !== 'cancelled') && money === 0 && owed === 0;
  // FL-S7: tables are pushed together BEFORE the party sits down, so a merged group with nobody
  // at it is still one tile reading "5+6". Without `groupIds` it would read "5" and table 6
  // would vanish from the floor until someone ordered.
  const ids = sitting ? sitting.tableIds : (groupIds ?? [table.tableId]);
  // The label is what a person reads. A table whose number was never set falls back to its id,
  // which is ugly but findable — better than a blank tile the cashier cannot name on the phone.
  const nameOf = (id: string) => numbers?.get(id) ?? (id === table.tableId ? table.number : undefined) ?? id;
  return {
    tableIds: ids,
    label: ids.map(nameOf).join('+'),
    word: tileWord({ onTable: money, unpaid: owed, hasSession: !!sitting, settled, hasHold: table.hasHold, reserved: table.status === 'reserved' }),
    onTable: money,
    unpaid: owed,
    drafts: sitting ? draftCount(sitting.lines) : 0,
    minutes: sitting ? Math.floor((now - sitting.openedAt) / 60_000) : 0,
  };
}

// ── Who may act ────────────────────────────────────────────────────────────

/** R16. Recording who did it is not the same as deciding who may. 403, never a PIN box. */
export function mayAct(role: Role): Check {
  return role === 'ADMIN' || role === 'MANAGER'
    ? ok
    : no(`${role} may not merge, unmerge or move a table`, 'permission-denied');
}

// ── Merge, unmerge, move ───────────────────────────────────────────────────

/** R6. One level of merge, always: a parent is never itself a child. */
export function canMerge(parent: Table, child: Table, role: Role): Check {
  const allowed = mayAct(role);
  if (!allowed.ok) return allowed;
  if (parent.tableId === child.tableId) return no('a table cannot be merged into itself', 'invalid-argument');
  if (parent.status === 'disabled' && !parent.mergedInto) return no(`table ${name(parent)} is out of service`);
  if (parent.mergedInto) return no(`table ${name(parent)} is already merged into ${parent.mergedInto}`);
  // A child of a merge and a destination of a move have to be free in exactly the same way, so
  // there is one list of reasons and one set of words for both.
  return canReceive(child);
}

/**
 * R14 + OR-5a. Refused while the group holds open money — that is the half that matters, and it
 * is why releasing every child (never just the ones named) is affordable: a group that owes
 * nothing can be re-merged for free, and no live party can be split silently.
 */
export function canUnmerge(sitting: Sitting | null, role: Role): Check {
  const allowed = mayAct(role);
  if (!allowed.ok) return allowed;
  if (!sitting) return ok;
  if (onTable(sitting.lines) > 0) return no('this group has food on it — bill it or move it first');
  if (unpaid(sitting.bills) > 0) return no('this group has an unpaid bill — settle it or move it first');
  return ok;
}

/** R6. A destination is vacant on five counts, not one. Four of them have no session to check. */
export function canReceive(dest: Table): Check {
  if (dest.status === 'disabled' && !dest.mergedInto) return no(`table ${name(dest)} is out of service`);
  if (dest.mergedInto) return no(`table ${name(dest)} is part of another group`);
  if (dest.isParent) return no(`table ${name(dest)} has tables merged into it`);
  if (dest.hasHold) return no(`table ${name(dest)} has a guest signing in`);
  if (dest.hasSession) return no(`table ${name(dest)} has a party at it`);
  // Last, because every line above says something sharper than the status word can.
  if (dest.status !== 'vacant') return no(`table ${name(dest)} ${WHY[dest.status]}`);
  return ok;
}

/** R5, FL-S24. A move re-points routing, never money — and never under an issued bill. */
export function canMove(from: Table, dest: Table, sitting: Sitting | null, role: Role): Check {
  const allowed = mayAct(role);
  if (!allowed.ok) return allowed;
  if (from.tableId === dest.tableId) return no('that party is already at this table', 'invalid-argument');
  if (!sitting) return no(`table ${name(from)} has no party to move`);
  if (from.isParent || sitting.tableIds.length > 1) return no('release the merge first, then move the table');
  if (sitting.lines.some(l => l.billId)) return no('this table has a printed bill — cancel it before moving the party');
  return canReceive(dest);
}

// ── Freeing a settled table (FL-Q1) ────────────────────────────────────────

/**
 * Re-decided 2026-09-18: **the payment path writes nothing to a table.** A fully paid sitting
 * reads `settled` from the data it already has, with no write at all, and the table frees when
 * its session actually ends. The earlier answer had payment fire a release, which meant a
 * settled group released its merged children unaudited and ended the sitting, so `settled` could
 * never be shown and FL-S14 and FL-S35 could not hold.
 *
 * What is left is the cashier's explicit Clear, and the only question it asks is whether any
 * money is still open. Deriving beats storing here for the same reason `isParent` is derived:
 * a written flag is a thing that can drift, and then needs a reconciler.
 */
export function isReleasable(sitting: Sitting): boolean {
  if (onTable(sitting.lines) > 0) return false;   // dessert after the bill
  if (unpaid(sitting.bills) > 0) return false;    // one half of a split still owing
  return true;
}

/** R18. Once every bill is settled the sitting stops taking new guests and new checkouts. */
export const acceptsNewGuests = (sitting: Sitting): boolean =>
  onTable(sitting.lines) > 0 || unpaid(sitting.bills) > 0 || sitting.bills.length === 0;

// ── The move write set (R5, R15, FL-S28) ───────────────────────────────────

export interface MoveWrites {
  sessionId: string;
  toTableId: string;
  cartFrom: string;
  cartTo: string;
  orderIds: string[];   // every non-terminal order, SERVED-but-unpaid included (FL-Q2)
  lineIds: string[];    // every unbilled line
}

export type OrderState = 'PENDING' | 'PREPARING' | 'READY' | 'SERVED' | 'COMPLETED' | 'CANCELLED';
const TERMINAL: OrderState[] = ['COMPLETED', 'CANCELLED'];

/**
 * Everything that is not finished moves, in ONE transaction. No price field is ever in here:
 * tableId is routing, not money. draftId is not in here either, so the bill in progress follows
 * the party without being re-minted.
 */
export function moveWriteSet(
  sitting: Sitting,
  from: string,
  to: string,
  orders: { orderId: string; state: OrderState }[],
): MoveWrites {
  return {
    sessionId: sitting.sessionId,
    toTableId: to,
    cartFrom: from,
    cartTo: to,
    orderIds: orders.filter(o => !TERMINAL.includes(o.state)).map(o => o.orderId),
    lineIds: sitting.lines.filter(l => !l.billId).map(l => l.lineId),
  };
}

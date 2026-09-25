// FL · the floor, pure. One it() per scenario in SPEC_FL_floor_and_moves.md, plus the production
// cases the sheet forgot. Every expected value is hand-computed and written in the name, so a
// wrong implementation cannot quietly redefine what the test was for.
//
// Written blind first, then extended by three reviews: the Gemini fan-out, the blind donor
// review, and Grok's late pass. Each extra has a Decisions line in the sheet. Grok's pass
// invalidated six expected values that were already written here; those are corrected, not added.

import {
  onTable, unpaid, draftCount, tile, tileWord, mayAct,
  canMerge, canUnmerge, canReceive, canMove, isReleasable, acceptsNewGuests, moveWriteSet, roundRefusal, guestRefusal, canMergeInto,
  Bill, Table, Sitting, Role, OrderState, idleCall, lastTouchedAt, DEFAULTS, sittingOf,
} from './floor';
import { Line } from './line';

const MIN = 60_000;
const NOW = 1_700_000_000_000;

function line(over: Partial<Line> & { lineId: string; listPrice: number }): Line {
  return {
    cid: 'cid_fl', orderId: 'order_fl', cartId: 'cart_fl', cartItemId: 'ci_fl',
    tableId: 'table_12', sessionId: 'sess_12', placedAt: NOW - 40 * MIN, placedBy: 'guest_1',
    menuItemId: 'mi', name: 'Item', qty: 1, components: [], taxBlocks: {},
    draftId: 'sess_12', billId: null,
    sent: true, v: 0, countsTowardTotal: true,
    ...over,
  } as Line;
}

// The sheet's own table 12: paneer tikka ₹320.00, a ₹1,250.00 pitcher with ₹100.00 off,
// and a ₹450.00 biryani that was voided. 32000 + 115000 = 147000p = ₹1,470.00.
const tikka = line({ lineId: 'l_tikka', listPrice: 32000 });
const pitcher = line({ lineId: 'l_pitcher', listPrice: 125000, offer: { id: 'happy_hour', amount: 10000 } as Line['offer'] });
const biryani = line({ lineId: 'l_biryani', listPrice: 45000, countsTowardTotal: false });
const TABLE_12 = [tikka, pitcher, biryani];

const bill = (over: Partial<Bill> & { billId: string }): Bill =>
  ({ sittingId: 'sess_12', status: 'issued', payable: 0, paid: 0, ...over });

const table = (over: Partial<Table> & { tableId: string }): Table =>
  ({ status: 'vacant', ...over });

const sitting = (over: Partial<Sitting> = {}): Sitting => ({
  sessionId: 'sess_12', tableIds: ['12'], openedAt: NOW - 48 * MIN,
  lines: [], bills: [], ...over,
});

describe('onTable — what is on the table, unbilled (R2)', () => {
  it('FL-S19 sums net() over unbilled counting lines: 32000 + 115000 = 147000p', () => {
    expect(onTable(TABLE_12)).toBe(147000);
  });

  it('FL-S19 a voided line (countsTowardTotal false) adds nothing: the ₹450 biryani is not in the 147000', () => {
    expect(onTable([biryani])).toBe(0);
    expect(onTable(TABLE_12)).toBe(onTable([tikka, pitcher]));
  });

  it('FL-S19 stops before charges: 147000p on the tile, service charge and round-off belong to the bill', () => {
    // 147000 + 10 % service = 161700, + round-off would be 161700. The tile is the smaller number.
    expect(onTable(TABLE_12)).toBe(147000);
    expect(onTable(TABLE_12)).not.toBe(161700);
  });

  it('a line already stamped with a billId is not on the tile: billed 125000 leaves 22000p', () => {
    const billed = [line({ lineId: 'l_a', listPrice: 125000, billId: 'bill_1' }), line({ lineId: 'l_b', listPrice: 22000 })];
    expect(onTable(billed)).toBe(22000);
  });

  it('an empty sitting is 0p, never null and never NaN', () => {
    expect(onTable([])).toBe(0);
  });

  it('a line whose offer exceeds its list price can never push the tile below 0p', () => {
    const upside = line({ lineId: 'l_bad', listPrice: 32000, offer: { id: 'x', amount: 50000 } as Line['offer'] });
    expect(onTable([upside])).toBe(0);
    expect(onTable([upside, tikka])).toBe(32000);
  });

  it('a discount and an offer on the same line are both cut once: 32000 − 6400 − 4000 = 21600p', () => {
    const both = line({
      lineId: 'l_both', listPrice: 32000,
      offer: { id: 'happy_hour', amount: 6400 } as Line['offer'],
      discount: { amount: 4000, pct: 0, source: { reason: 'goodwill', note: 'spilled', approverId: 'manager_1' } },
    });
    expect(onTable([both])).toBe(21600);
  });

  it('lines from two rounds of the same sitting add: 47000 + 100000 = 147000p', () => {
    const round1 = line({ lineId: 'r1', listPrice: 47000, orderId: 'order_1' });
    const round2 = line({ lineId: 'r2', listPrice: 100000, orderId: 'order_2' });
    expect(onTable([round1, round2])).toBe(147000);
  });

  // R2, corrected by the fan-out: split rewrites draftId, sessionId is frozen
  it('R2 lines are found by the frozen sessionId, not draftId: a 300000p sitting split three ways still reads 300000p', () => {
    const split = [
      line({ lineId: 's1', listPrice: 100000, draftId: 'draft_a' }),
      line({ lineId: 's2', listPrice: 100000, draftId: 'draft_b' }),
      line({ lineId: 's3', listPrice: 100000, draftId: 'draft_c' }),
    ];
    expect(split.every(l => l.sessionId === 'sess_12')).toBe(true);
    expect(onTable(split)).toBe(300000);
  });
});

// Sanity run 1: the floor looked for bills under the cashier's login, found none, and a table with
// ₹258 on an issued bill read ₹0 owed. A stamped line whose bill the read missed must be loud.
describe('sittingOf — a sitting is its own lines and its own bills, or it throws', () => {
  const head = { sessionId: 'sess_12', tableIds: ['12'], openedAt: NOW };
  it('takes the lines and bills of sess_12 and none of sess_9s', () => {
    const s = sittingOf(head,
      [tikka, line({ lineId: 'other', listPrice: 9000, sessionId: 'sess_9' })],
      [bill({ billId: 'b12', payable: 32000 }), bill({ billId: 'b9', sittingId: 'sess_9', payable: 9000 })]);
    expect(s.lines.map(l => l.lineId)).toEqual(['l_tikka']);
    expect(s.bills.map(b => b.billId)).toEqual(['b12']);
  });
  it('a line stamped b12 with no b12 in the read throws naming both, instead of painting ₹0 owed', () => {
    expect(() => sittingOf(head, [line({ lineId: 'l_tikka', listPrice: 32000, billId: 'b12' })], []))
      .toThrow(/l_tikka is on bill b12/);
  });
  it('a bill issued under some other id (the old staff-login shape) is not this sitting`s, so the stamped line throws', () => {
    expect(() => sittingOf(head, [line({ lineId: 'l_tikka', listPrice: 32000, billId: 'b12' })], [bill({ billId: 'b12', sittingId: 'staff_login_7', payable: 32000 })]))
      .toThrow(/could not be read/);
  });
  it('the endpoint gets a named refusal, not "An unexpected error occurred": failed-precondition with the table, line and bill', () => {
    try { sittingOf(head, [line({ lineId: 'l_tikka', listPrice: 32000, billId: 'b12' })], []); throw new Error('did not throw'); }
    catch (e) { expect(e).toMatchObject({ code: 'failed-precondition', message: expect.stringContaining('table 12'), details: { lineId: 'l_tikka', billId: 'b12' } }); }
  });
  it('a credit note on the sitting is a refund, never an open bill: it is left off the sitting', () => {
    const s = sittingOf(head, [line({ lineId: 'l_tikka', listPrice: 32000, billId: 'b12' })],
      [bill({ billId: 'b12', payable: 32000, paid: 32000, status: 'paid' }), bill({ billId: 'cn1', payable: -8400, note: true })]);
    expect(s.bills.map(b => b.billId)).toEqual(['b12']);
  });
});

describe('unpaid — what is still owed across every bill (R12)', () => {
  it('FL-S22 a ₹1,000 bill with ₹400 taken is 60000p unpaid, never 0 and never 100000', () => {
    expect(unpaid([bill({ billId: 'b1', payable: 100000, paid: 40000 })])).toBe(60000);
  });

  it('FL-S21 three bills of ₹1,000 with one paid is 200000p unpaid across 2 open bills', () => {
    const three = [
      bill({ billId: 'b1', payable: 100000, paid: 100000, status: 'paid' }),
      bill({ billId: 'b2', payable: 100000 }),
      bill({ billId: 'b3', payable: 100000 }),
    ];
    expect(unpaid(three)).toBe(200000);
  });

  it('a cancelled bill owes nothing: 100000p issued then cancelled is 0p unpaid', () => {
    expect(unpaid([bill({ billId: 'b1', payable: 100000, status: 'cancelled' })])).toBe(0);
  });

  it('an overpaid bill is 0p unpaid, never negative', () => {
    expect(unpaid([bill({ billId: 'b1', payable: 100000, paid: 120000 })])).toBe(0);
  });
});

describe('the word on the tile — derived, never stored (R11, R14)', () => {
  const word = (o: Partial<Parameters<typeof tileWord>[0]>) =>
    tileWord({ onTable: 0, unpaid: 0, hasSession: false, settled: false, ...o });

  it('FL-S1 no session and no open money → free', () => {
    expect(word({})).toBe('free');
  });

  it('FL-S16 no session but 234000p of unbilled lines → NOT free; the captain tapping Complete does not free money', () => {
    expect(word({ onTable: 234000, hasSession: false })).toBe('ordered');
  });

  it('FL-S16 no session but an unpaid issued bill → NOT free', () => {
    expect(word({ unpaid: 234000, hasSession: false })).toBe('billed');
  });

  it('FL-S34 an expired session with 184000p unbilled → still shows the money, never free', () => {
    const long = sitting({ openedAt: NOW - 245 * MIN, lines: [line({ lineId: 'l', listPrice: 184000 })] });
    const t = tile(long, table({ tableId: '7', status: 'active' }), NOW);
    expect(t.onTable).toBe(184000);
    expect(t.word).toBe('ordered');
    expect(t.minutes).toBe(245);
  });

  it('FL-S5 session open, nothing placed → seated', () => {
    expect(word({ hasSession: true })).toBe('seated');
  });

  it('FL-S2 147000p on the table, no bill → shows the money, not a status word', () => {
    const t = tile(sitting({ lines: TABLE_12 }), table({ tableId: '12', status: 'active' }), NOW);
    expect(t.onTable).toBe(147000);
    expect(t.unpaid).toBe(0);
    expect(t.word).toBe('ordered');
  });

  it('FL-S3 a bill issued and nothing taken → shows what is due', () => {
    const t = tile(sitting({ bills: [bill({ billId: 'b1', payable: 86000 })] }), table({ tableId: '7', status: 'active' }), NOW);
    expect(t.unpaid).toBe(86000);
    expect(t.word).toBe('billed');
  });

  it('FL-S14 nothing on the table, nothing owed, not cleared → settled', () => {
    const paid = sitting({ bills: [bill({ billId: 'b1', payable: 100000, paid: 100000, status: 'paid' })] });
    expect(tile(paid, table({ tableId: '7', status: 'active' }), NOW).word).toBe('settled');
  });

  it('FL-S17 a bill issued then cancelled → back to money on the table, and billable again', () => {
    // cancel clears billId on the lines in the same transaction, so they count again.
    const after = sitting({ lines: TABLE_12, bills: [bill({ billId: 'b1', payable: 161700, status: 'cancelled' })] });
    const t = tile(after, table({ tableId: '12', status: 'active' }), NOW);
    expect(t.onTable).toBe(147000);
    expect(t.unpaid).toBe(0);
    expect(t.word).toBe('ordered');
  });

  it('FL-S17 cancelled, but a second issued bill of the same sitting is still open → still shows that bill', () => {
    const mixed = sitting({
      bills: [bill({ billId: 'b1', payable: 161700, status: 'cancelled' }), bill({ billId: 'b2', payable: 90000 })],
    });
    const t = tile(mixed, table({ tableId: '12', status: 'active' }), NOW);
    expect(t.unpaid).toBe(90000);
    expect(t.word).toBe('billed');
  });

  it('FL-S21 a sitting with three drafts reports three, and a tap has no single answer', () => {
    const split = [
      line({ lineId: 's1', listPrice: 100000, draftId: 'draft_a' }),
      line({ lineId: 's2', listPrice: 100000, draftId: 'draft_b' }),
      line({ lineId: 's3', listPrice: 100000, draftId: 'draft_c' }),
    ];
    expect(draftCount(split)).toBe(3);
    expect(tile(sitting({ lines: split }), table({ tableId: '4', status: 'active' }), NOW).drafts).toBe(3);
  });

  it('FL-S35 a bill comped to 0p and settled → settled, exactly like a paid one', () => {
    const comped = sitting({ bills: [bill({ billId: 'b1', payable: 0, paid: 0, status: 'paid' })] });
    expect(tile(comped, table({ tableId: '7', status: 'active' }), NOW).word).toBe('settled');
  });

  it('FL-S20 billed AND eating: ₹2,000 due and ₹300 new are both shown; neither hides the other', () => {
    const dessert = sitting({
      lines: [line({ lineId: 'l_billed', listPrice: 200000, billId: 'b1' }), line({ lineId: 'l_jamun', listPrice: 30000 })],
      bills: [bill({ billId: 'b1', payable: 200000 })],
    });
    const t = tile(dessert, table({ tableId: '12', status: 'active' }), NOW);
    expect(t.unpaid).toBe(200000);
    expect(t.onTable).toBe(30000);
  });

  it('FL-S20 a tile with anything owed or anything on the table is never settled', () => {
    expect(word({ unpaid: 1, settled: true })).not.toBe('settled');
    expect(word({ onTable: 1, settled: true })).not.toBe('settled');
  });

  it('a session past its expiry that still has unbilled lines → shows the money, never free', () => {
    const stale = sitting({ openedAt: NOW - 300 * MIN, lines: TABLE_12 });
    expect(tile(stale, table({ tableId: '12', status: 'active' }), NOW).word).toBe('ordered');
  });
});

describe('canMerge (R6)', () => {
  const parent = table({ tableId: '5', status: 'active', hasSession: true });
  const child = table({ tableId: '6', status: 'vacant' });

  it('FL-S7 a vacant child merges into an occupied parent', () => {
    expect(canMerge(parent, child, 'MANAGER')).toEqual({ ok: true });
  });

  it('FL-S9 a child with its own party is refused, and the refusal names the table number', () => {
    const busy = table({ tableId: '8', status: 'active', hasSession: true });
    const r = canMerge(parent, busy, 'MANAGER');
    expect(r.ok).toBe(false);
    expect(r.ok === false && r.message).toMatch(/table 8/);
  });

  it('FL-S26 a child already inside another group is refused', () => {
    const inGroup = table({ tableId: '6', status: 'disabled', mergedInto: '5' });
    expect(canMerge(table({ tableId: '8', status: 'active' }), inGroup, 'MANAGER').ok).toBe(false);
  });

  it('a child that is out of service is refused', () => {
    expect(canMerge(parent, table({ tableId: '6', status: 'disabled' }), 'MANAGER').ok).toBe(false);
  });

  it('a parent that is itself merged into a third table is refused (one level, always)', () => {
    const merged = table({ tableId: '5', status: 'disabled', mergedInto: '4' });
    expect(canMerge(merged, child, 'MANAGER').ok).toBe(false);
  });

  it('a child that already has tables merged into it is refused', () => {
    expect(canMerge(parent, table({ tableId: '6', status: 'vacant', isParent: true }), 'MANAGER').ok).toBe(false);
  });

  it('merging a table into itself is refused', () => {
    const r = canMerge(table({ tableId: '5', status: 'active' }), table({ tableId: '5' }), 'MANAGER');
    expect(r.ok === false && r.code).toBe('invalid-argument');
  });
});

describe('canUnmerge — never over open money; releases the whole group (R14, OR-5a)', () => {
  it('FL-S8 a 5+6+7 group holding 640000p is refused before anything is released', () => {
    const big = sitting({ tableIds: ['5', '6', '7'], lines: [line({ lineId: 'l', listPrice: 640000 })] });
    const r = canUnmerge(big, 'MANAGER');
    expect(r.ok).toBe(false);
    expect(r.ok === false && r.message).toMatch(/bill it or move it first/);
  });

  it('FL-S8 a group with nothing placed releases all three children at once', () => {
    expect(canUnmerge(sitting({ tableIds: ['5', '6', '7'] }), 'MANAGER')).toEqual({ ok: true });
  });

  it('FL-S27 a group holding 298000p unbilled is refused, and says to bill or move it first', () => {
    const open = sitting({ tableIds: ['5', '6'], lines: [line({ lineId: 'l', listPrice: 298000 })] });
    const r = canUnmerge(open, 'MANAGER');
    expect(r.ok === false && r.message).toMatch(/bill it or move it first/);
  });

  it('FL-S27 a group whose bill is issued and unpaid is refused', () => {
    const owing = sitting({ bills: [bill({ billId: 'b1', payable: 298000 })] });
    const r = canUnmerge(owing, 'MANAGER');
    expect(r.ok).toBe(false);
    expect(r.ok === false && r.message).toMatch(/settle it or move it first/);
  });

  it('a group whose only bill is fully paid releases', () => {
    const done = sitting({ bills: [bill({ billId: 'b1', payable: 298000, paid: 298000, status: 'paid' })] });
    expect(canUnmerge(done, 'MANAGER')).toEqual({ ok: true });
  });

  it('a group whose only bill was cancelled and has no lines releases', () => {
    const voided = sitting({ bills: [bill({ billId: 'b1', payable: 298000, status: 'cancelled' })] });
    expect(canUnmerge(voided, 'MANAGER')).toEqual({ ok: true });
  });
});

describe('canMove (R5, R6, R16)', () => {
  const from = table({ tableId: '4', status: 'active', hasSession: true });
  const dest = table({ tableId: '9', status: 'vacant' });
  const party = sitting({ sessionId: 'sess_4', tableIds: ['4'], lines: [line({ lineId: 'l', listPrice: 168000 })] });

  it('FL-S10 a sitting moves onto a vacant table', () => {
    expect(canMove(from, dest, party, 'MANAGER')).toEqual({ ok: true });
  });

  it('FL-S11 moving onto an occupied table is refused', () => {
    const busy = table({ tableId: '11', status: 'active', hasSession: true });
    expect(canMove(from, busy, party, 'MANAGER').ok).toBe(false);
  });

  it('FL-S12 moving a merged parent is refused, and says to release the merge first', () => {
    const group = sitting({ tableIds: ['5', '6'] });
    const r = canMove(table({ tableId: '5', status: 'active', isParent: true }), dest, group, 'MANAGER');
    expect(r.ok === false && r.message).toMatch(/release the merge first/);
  });

  it('FL-S24 a sitting with any line carrying a billId is refused: an issued bill freezes its tableIds', () => {
    const printed = sitting({ lines: [line({ lineId: 'l', listPrice: 168000, billId: 'bill_1' })] });
    const r = canMove(from, dest, printed, 'MANAGER');
    expect(r.ok === false && r.message).toMatch(/printed bill/);
  });

  it('FL-S33 a destination that is disabled with mergedInto set, and holds no session, is still refused', () => {
    const childOf10 = table({ tableId: '9', status: 'disabled', mergedInto: '10' });
    expect(childOf10.hasSession).toBeUndefined();
    expect(canMove(from, childOf10, party, 'MANAGER').ok).toBe(false);
  });

  it('FL-S33 a destination with an OTP in flight is refused', () => {
    expect(canMove(from, table({ tableId: '9', status: 'vacant', hasHold: true }), party, 'MANAGER').ok).toBe(false);
  });

  it('FL-S33 a destination that is a parent of a merged child is refused', () => {
    expect(canMove(from, table({ tableId: '9', status: 'vacant', isParent: true }), party, 'MANAGER').ok).toBe(false);
  });

  it('FL-S29 a SERVER role is refused 403; MANAGER and ADMIN may move', () => {
    const r = canMove(from, dest, party, 'SERVER');
    expect(r.ok === false && r.code).toBe('permission-denied');
    expect(canMove(from, dest, party, 'ADMIN')).toEqual({ ok: true });
    expect(canMove(from, dest, party, 'MANAGER')).toEqual({ ok: true });
  });

  it('moving a table that has no sitting is refused', () => {
    const r = canMove(table({ tableId: '4', status: 'vacant' }), dest, null, 'MANAGER');
    expect(r.ok === false && r.message).toMatch(/no party to move/);
  });

  it('moving onto an out-of-service table is refused', () => {
    expect(canMove(from, table({ tableId: '9', status: 'disabled' }), party, 'MANAGER').ok).toBe(false);
  });

  it('moving a sitting onto its own table is refused', () => {
    const r = canMove(from, table({ tableId: '4', status: 'active' }), party, 'MANAGER');
    expect(r.ok === false && r.code).toBe('invalid-argument');
  });

  it('TD-042 a table a guest is signing in at is refused, and reads `holding` rather than free', () => {
    // The hold replaced the `pending` status on 2026-09-21. Both halves are one decision: the
    // refusal and the word on the tile have to come from the same fact, or the cashier aims at
    // a tile that says free and the till says no — which is exactly what happened on 2026-09-21.
    const held = table({ tableId: '9', number: '9', status: 'vacant', hasHold: true });
    const r = canReceive(held);
    expect(r.ok).toBe(false);
    expect(r.ok === false && r.message).toMatch(/table 9 has a guest signing in/);
    expect(tile(null, held, 0).word).toBe('holding');

    // and when the claim lapses, nothing had to run for the table to come free again
    const lapsed = table({ tableId: '9', number: '9', status: 'vacant', hasHold: false });
    expect(canReceive(lapsed).ok).toBe(true);
    expect(tile(null, lapsed, 0).word).toBe('free');

    // same lie, second cause: staff holding a table for a booking is also refused, and also
    // read `free` before 2026-09-21
    const held2 = table({ tableId: '9', number: '9', status: 'reserved' });
    expect(canReceive(held2).ok).toBe(false);
    expect(tile(null, held2, 0).word).toBe('reserved');
  });

  it('a reserved destination is refused: five counts, and "not vacant" is the fifth', () => {
    expect(canReceive(table({ tableId: '9', status: 'reserved' })).ok).toBe(false);
  });
});

describe('isReleasable — what Clear is allowed to free (FL-Q1, R14)', () => {
  it('a sitting whose every bill is paid and with nothing unbilled is releasable', () => {
    expect(isReleasable(sitting({ bills: [bill({ billId: 'b1', payable: 100000, paid: 100000, status: 'paid' })] }))).toBe(true);
  });

  it('30000p of dessert ordered after the bill is not releasable', () => {
    const dessert = sitting({
      lines: [line({ lineId: 'l_jamun', listPrice: 30000 })],
      bills: [bill({ billId: 'b1', payable: 100000, paid: 100000, status: 'paid' })],
    });
    expect(isReleasable(dessert)).toBe(false);
  });

  it('one of two split bills still owing 100000p is not releasable', () => {
    const half = sitting({
      bills: [bill({ billId: 'b1', payable: 100000, paid: 100000, status: 'paid' }), bill({ billId: 'b2', payable: 100000 })],
    });
    expect(isReleasable(half)).toBe(false);
  });

  it('a merged group is judged across every table in it, not just the parent', () => {
    const group = sitting({
      tableIds: ['5', '6'],
      lines: [line({ lineId: 'l6', listPrice: 40000, tableId: '6' })],
      bills: [bill({ billId: 'b1', payable: 100000, paid: 100000, status: 'paid' })],
    });
    expect(isReleasable(group)).toBe(false);
  });

  it('a sitting that was never billed is releasable: nothing is open, so nothing can be hidden', () => {
    expect(isReleasable(sitting())).toBe(true);
  });

  it('it asks about money and nothing else: no clock, no flag, no stored settled time', () => {
    // The payment path writes nothing, so there is no settledAt to read and no timer to trust.
    // The whole question is whether anything is still open (re-decided 2026-09-18).
    expect(isReleasable.length).toBe(1);
  });
});

describe('the floor is a picture (R1, R17, R19)', () => {
  it('FL-S30 a sitting whose table was retired still has a tile under its old number', () => {
    const retired = table({ tableId: '12', status: 'disabled' });
    const t = tile(sitting({ lines: TABLE_12 }), retired, NOW);
    expect(t.label).toBe('12');
    expect(t.onTable).toBe(147000);
  });

  it('FL-S6 a merged group is ONE tile labelled 5+6, never two greyed ones (R9)', () => {
    const group = sitting({ tableIds: ['5', '6'], lines: [line({ lineId: 'l', listPrice: 412000 })] });
    const t = tile(group, table({ tableId: '5', status: 'active', isParent: true }), NOW);
    expect(t.label).toBe('5+6');
    expect(t.tableIds).toEqual(['5', '6']);
    expect(t.onTable).toBe(412000);
  });

  it('FL-S32 two merges of the same child cannot both win: the loser is refused, not overwritten', () => {
    const child = table({ tableId: '6', status: 'vacant' });
    expect(canMerge(table({ tableId: '5', status: 'active' }), child, 'MANAGER').ok).toBe(true);
    // the winner's write lands: the child is now disabled and points at 5
    const afterWin = table({ tableId: '6', status: 'disabled', mergedInto: '5' });
    expect(canMerge(table({ tableId: '8', status: 'active' }), afterWin, 'MANAGER').ok).toBe(false);
  });

  it('FL-S14 once every bill of the group is settled the sitting refuses a new user', () => {
    const done = sitting({ bills: [bill({ billId: 'b1', payable: 100000, paid: 100000, status: 'paid' })] });
    expect(acceptsNewGuests(done)).toBe(false);
  });

  it('FL-S14 once every bill of the group is settled the sitting refuses a new checkout', () => {
    const done = sitting({ bills: [bill({ billId: 'b1', payable: 100000, paid: 100000, status: 'paid' })] });
    expect(acceptsNewGuests(done)).toBe(false);
    // D2 (Shaurya 2026-09-25) replaced "ordering does not stop at issue": a fully paid sitting takes no new round even
    // with a ₹300 dish still unbilled on it. The late coffees go on a new sitting after Clear, never onto a paid bill.
    const eating = sitting({ lines: [line({ lineId: 'l', listPrice: 30000 })], bills: [bill({ billId: 'b1', payable: 100000, paid: 100000, status: 'paid' })] });
    expect(acceptsNewGuests(eating)).toBe(false);
  });

  it('a sitting that has never been billed accepts guests', () => {
    expect(acceptsNewGuests(sitting())).toBe(true);
  });

  // The impact review's bug in the old check: `bills.length === 0` read a sitting mid-Edit (its only bill cancelled)
  // as paid, and refused the gulab jamun the Edit was for.
  it('D2 a sitting whose only bill was cancelled (mid-Edit) still accepts guests and rounds', () => {
    const editing = sitting({ bills: [bill({ billId: 'b1', payable: 480000, status: 'cancelled' })] });
    expect(acceptsNewGuests(editing)).toBe(true);
    expect(roundRefusal(editing.bills, '12')).toBeNull();
  });

  // D2 / D3 at 22:10: table 12's A-0004 is ₹1,200. Unpaid and printed: a round goes on (Edit takes it). ₹500 paid:
  // it waits. All ₹1,200 paid: "table 12 has paid — clear it first". A credit note on it changes none of this.
  it('D2 D3 FL-S14 the round check: printed → yes; part-paid → waits naming A-0004; paid → clear it first', () => {
    const a4 = (paid: number, status: Bill['status'] = 'issued') => bill({ billId: 'b4', series: 'A', number: '0004', payable: 120000, paid, status });
    const note = bill({ billId: 'cn1', note: true, payable: -6300 });
    expect(roundRefusal([a4(0)], '12')).toBeNull();
    expect(roundRefusal([a4(50000)], '12')).toBe('A-0004 is being paid — finish the payment, then add');
    expect(roundRefusal([a4(120000, 'paid'), note], '12')).toBe('table 12 has paid — clear it first');
    // A stranger scanning: only the paid table refuses (a part-paid table may still gain a guest, Q2-1 is about rounds).
    expect(guestRefusal([a4(50000)], '12')).toBeNull();
    expect(guestRefusal([a4(120000, 'paid')], '12')).toBe('table 12 has paid — clear it first');
    expect(guestRefusal([], '12')).toBeNull();
  });

  // Review P1: table 12 split food and drinks; the drinks (₹1,300) are paid, then the food bill A-0005 is edited to add a
  // dessert. Until the food is re-issued the table is being billed, not paid: the dessert round goes on. Once A-0006
  // replaces A-0005 and is paid too, the table has paid.
  it('D2 mid-Edit on a split table with the other half paid still takes the round; once replaced and paid it refuses', () => {
    const drinks = bill({ billId: 'b4', series: 'A', number: '0004', payable: 130000, paid: 130000, status: 'paid' });
    const food = (extra: Partial<Bill>) => bill({ billId: 'b5', series: 'A', number: '0005', payable: 350000, status: 'cancelled', ...extra });
    expect(roundRefusal([drinks, food({})], '12')).toBeNull();
    const refood = bill({ billId: 'b6', series: 'A', number: '0006', payable: 374000, paid: 374000, status: 'paid' });
    expect(roundRefusal([drinks, food({ replaced: true }), refood], '12')).toBe('table 12 has paid — clear it first');
  });

  // FL-S37: 21:50 table 12's ₹4,800 bill is printed, unpaid; the cashier tries to push table 11 onto it.
  it('D2 FL-S37 merging onto a table with a printed unpaid bill, or a paid one, is refused naming the table', () => {
    const p12 = table({ tableId: 't12', number: '12', status: 'active' });
    expect(canMergeInto(sitting({ bills: [bill({ billId: 'b', payable: 480000 })] }), p12)).toMatchObject({ ok: false, message: 'table 12 has a printed bill — edit or settle it first' });
    expect(canMergeInto(sitting({ bills: [bill({ billId: 'b', payable: 480000, paid: 480000, status: 'paid' })] }), p12)).toMatchObject({ ok: false, message: 'table 12 has paid — clear it first' });
    expect(canMergeInto(sitting({ lines: [tikka] }), p12).ok).toBe(true);
    expect(canMergeInto(null, p12).ok).toBe(true);
  });

  it('R19 lines that cannot be read fail the floor; they never render an occupied tile as 0p', () => {
    const unreadable = line({ lineId: 'l_bad', listPrice: NaN });
    expect(() => onTable([unreadable])).toThrow(/l_bad cannot be read/);
  });

  it('R19 one unreadable line fails the whole tile rather than quietly dropping 147000p', () => {
    expect(() => onTable([...TABLE_12, line({ lineId: 'l_bad', listPrice: NaN })])).toThrow();
  });
});

describe('the move write set (R5, R15, FL-S28)', () => {
  const orders: { orderId: string; state: OrderState }[] = [
    { orderId: 'o_cooking', state: 'PREPARING' },
    { orderId: 'o_served', state: 'SERVED' },
    { orderId: 'o_done', state: 'COMPLETED' },
    { orderId: 'o_void', state: 'CANCELLED' },
  ];
  const party = sitting({
    sessionId: 'sess_4', tableIds: ['4'],
    lines: [line({ lineId: 'l_biryani', listPrice: 168000, tableId: '4' }), line({ lineId: 'l_billed', listPrice: 50000, tableId: '4', billId: 'bill_1' })],
  });

  it('FL-S28 a move names session.tableId, the cart doc, the open order and every unbilled line', () => {
    const w = moveWriteSet(party, '4', '9', orders);
    expect(w.sessionId).toBe('sess_4');
    expect(w.toTableId).toBe('9');
    expect(w.cartFrom).toBe('4');
    expect(w.cartTo).toBe('9');
    expect(w.orderIds).toContain('o_cooking');
    expect(w.lineIds).toEqual(['l_biryani']);
  });

  it('FL-Q2 a SERVED-but-unpaid order moves too; a CANCELLED or COMPLETED one is left alone', () => {
    const w = moveWriteSet(party, '4', '9', orders);
    expect(w.orderIds).toEqual(['o_cooking', 'o_served']);
  });

  it('FL-S28 a billed line is never in the write set, and its presence refuses the whole move', () => {
    const w = moveWriteSet(party, '4', '9', orders);
    expect(w.lineIds).not.toContain('l_billed');
    const r = canMove(table({ tableId: '4', status: 'active', hasSession: true }), table({ tableId: '9' }), party, 'MANAGER');
    expect(r.ok).toBe(false);
  });

  it('FL-S10 no price field is in the write set: tableId is routing, not money', () => {
    const w = moveWriteSet(party, '4', '9', orders);
    const keys = Object.keys(w).join(',');
    expect(keys).not.toMatch(/price|offer|discount|tax|payable|amount/i);
  });

  it('FL-S10 draftId is not in the write set, so the bill in progress follows the party', () => {
    const w = moveWriteSet(party, '4', '9', orders) as unknown as Record<string, unknown>;
    expect(w.draftId).toBeUndefined();
    expect(Object.keys(w)).not.toContain('draftId');
  });
});

describe('who may act (R16)', () => {
  it('ADMIN and MANAGER may; SERVER and CAPTAIN may not, and get 403 rather than a PIN box', () => {
    expect(mayAct('ADMIN')).toEqual({ ok: true });
    expect(mayAct('MANAGER')).toEqual({ ok: true });
    for (const role of ['SERVER', 'CAPTAIN'] as Role[]) {
      const r = mayAct(role);
      expect(r.ok === false && r.code).toBe('permission-denied');
    }
  });
});

// ── FL-S36 · the table nobody frees (R21) ─────────────────────────────────

describe('FL-S36 idle tables — the clock is derived from what the sitting did (R21)', () => {
  const MIN = 60_000;
  const NOW = 1_800_000_000_000;
  const HOUR = DEFAULTS.idleFreeAfterMinutes * MIN;   // 60m
  const sit = (over: Partial<Sitting> = {}): Sitting =>
    ({ sessionId: 's4', tableIds: ['4'], openedAt: NOW - 2 * 60 * MIN, lines: [], bills: [], ...over });
  const placed = (at: number, listPrice = 184000, billId: string | null = null): Line =>
    ({ lineId: 'l', sessionId: 's4', placedAt: at, listPrice, countsTowardTotal: true, billId, draftId: 's4' } as unknown as Line);

  it('FL-S36 21:10 scanned, nothing ordered, nothing touched for 120m → free', () => {
    expect(idleCall(sit(), [], NOW, HOUR)).toBe('free');
    expect(lastTouchedAt(sit(), [], NOW)).toBe(NOW - 120 * MIN);
  });

  it('FL-S36 a re-open at minute 110 (session updatedAt) is activity → busy, not freed at 120', () => {
    expect(idleCall(sit(), [NOW - 10 * MIN], NOW, HOUR)).toBe('busy');
  });

  it('FL-S36 a round being built (cart written 5m ago) is activity → busy', () => {
    expect(idleCall(sit(), [NOW - 5 * MIN], NOW, HOUR)).toBe('busy');
  });

  it('FL-S36 the newest line placed 30m ago outranks an opening 2h ago → busy', () => {
    const s = sit({ lines: [placed(NOW - 30 * MIN, 184000, 'b1')], bills: [{ billId: 'b1', sittingId: 's4', status: 'paid', payable: 184000, paid: 184000 }] });
    expect(idleCall(s, [], NOW, HOUR)).toBe('busy');
  });

  it('FL-S36 unbilled food 184000p and idle 2h → money: reported, never freed', () => {
    expect(idleCall(sit({ lines: [placed(NOW - 2 * 60 * MIN)] }), [], NOW, HOUR)).toBe('money');
  });

  it('FL-S36 an issued bill 184000p unpaid and idle 2h → money', () => {
    const s = sit({ lines: [placed(NOW - 2 * 60 * MIN, 184000, 'b1')], bills: [{ billId: 'b1', sittingId: 's4', status: 'issued', payable: 184000, paid: 0 }] });
    expect(idleCall(s, [], NOW, HOUR)).toBe('money');
  });

  it('FL-S36 paid in full 2h ago, nobody tapped Clear → free (signed lazy default, see plan)', () => {
    const s = sit({ lines: [placed(NOW - 2 * 60 * MIN, 184000, 'b1')], bills: [{ billId: 'b1', sittingId: 's4', status: 'paid', payable: 184000, paid: 184000 }] });
    expect(idleCall(s, [NOW - 2 * 60 * MIN], NOW, HOUR)).toBe('free');
  });

  it('FL-S36 exactly at the threshold (60m) is idle; 59m59s is busy', () => {
    expect(idleCall(sit({ openedAt: NOW - HOUR }), [], NOW, HOUR)).toBe('free');
    expect(idleCall(sit({ openedAt: NOW - HOUR + 1 }), [], NOW, HOUR)).toBe('busy');
  });

  it('FL-S36 fail closed: a sitting with no finite timestamp at all reads as touched now → busy', () => {
    const s = sit({ openedAt: NaN });
    expect(lastTouchedAt(s, [undefined as unknown as number, 0, -5], NOW)).toBe(NOW);
    expect(idleCall(s, [], NOW, HOUR)).toBe('busy');
  });

  it('FL-S36 a zero or negative threshold frees nothing (a bad config key is never "free everything")', () => {
    expect(idleCall(sit(), [], NOW, 0)).toBe('busy');
    expect(idleCall(sit(), [], NOW, NaN)).toBe('busy');
  });
});

// FL · skeleton. One it() per scenario in SPEC_FL_floor_and_moves.md, plus the production
// cases the sheet forgot. Every expected value is hand-computed and written in the name, so a
// wrong implementation cannot quietly redefine what the test was for.
//
// Written blind first, then extended by three reviews: the Gemini fan-out, the blind donor
// review, and Grok's late pass. Each extra has a Decisions line in the sheet. Grok's pass
// invalidated six expected values that were already written here; those are corrected, not added.

describe('onTable — what is on the table, unbilled (R2)', () => {
  // Paneer tikka ₹320.00 (32000p) + pitcher ₹1,250.00 (125000p) less ₹100.00 (10000p)
  // + biryani ₹450.00 voided. 32000 + 115000 = 147000p = ₹1,470.00.
  it.todo('FL-S19 sums net() over unbilled counting lines: 32000 + 115000 = 147000p');
  it.todo('FL-S19 a voided line (countsTowardTotal false) adds nothing: the ₹450 biryani is not in the 147000');
  it.todo('FL-S19 stops before charges: 147000p on the tile, service charge and round-off belong to the bill');
  it.todo('a line already stamped with a billId is not on the tile: billed 125000 leaves 22000p');
  it.todo('an empty sitting is 0p, never null and never NaN');
  it.todo('a line whose offer exceeds its list price can never push the tile below 0p');
  it.todo('a discount and an offer on the same line are both cut once: 32000 − 6400 − 4000 = 21600p');
  it.todo('lines from two rounds of the same sitting add: 47000 + 100000 = 147000p');

  // R2, corrected by the fan-out: split rewrites draftId, sessionId is frozen
  it.todo('R2 lines are found by the frozen sessionId, not draftId: a 300000p sitting split three ways still reads 300000p');
});

describe('unpaid — what is still owed across every bill (R12)', () => {
  it.todo('FL-S22 a ₹1,000 bill with ₹400 taken is 60000p unpaid, never 0 and never 100000');
  it.todo('FL-S21 three bills of ₹1,000 with one paid is 200000p unpaid across 2 open bills');
  it.todo('a cancelled bill owes nothing: 100000p issued then cancelled is 0p unpaid');
  it.todo('an overpaid bill is 0p unpaid, never negative');
});

describe('the word on the tile — derived, never stored (R11, R14)', () => {
  it.todo('FL-S1 no session and no open money → free');
  it.todo('FL-S16 no session but 234000p of unbilled lines → NOT free; the captain tapping Complete does not free money');
  it.todo('FL-S16 no session but an unpaid issued bill → NOT free');
  it.todo('FL-S34 an expired session with 184000p unbilled → still shows the money, never free');
  it.todo('FL-S5 session open, nothing placed → seated');
  it.todo('FL-S2 147000p on the table, no bill → shows the money, not a status word');
  it.todo('FL-S3 a bill issued and nothing taken → shows what is due');
  it.todo('FL-S14 nothing on the table, nothing owed, not cleared → settled');
  it.todo('FL-S17 a bill issued then cancelled → back to money on the table, and billable again');
  it.todo('FL-S17 cancelled, but a second issued bill of the same sitting is still open → still shows that bill');
  it.todo('FL-S21 a sitting with three drafts reports three, and a tap has no single answer');
  it.todo('FL-S35 a bill comped to 0p and settled → settled, exactly like a paid one');
  it.todo('FL-S20 billed AND eating: ₹2,000 due and ₹300 new are both shown; neither hides the other');
  it.todo('FL-S20 a tile with anything owed or anything on the table is never settled');
  it.todo('a session past its expiry that still has unbilled lines → shows the money, never free');
});

describe('canMerge (R6)', () => {
  it.todo('FL-S7 a vacant child merges into an occupied parent');
  it.todo('FL-S9 a child with its own party is refused, and the refusal names the table number');
  it.todo('FL-S26 a child already inside another group is refused');
  it.todo('a child that is out of service is refused');
  it.todo('a parent that is itself merged into a third table is refused (one level, always)');
  it.todo('a child that already has tables merged into it is refused');
  it.todo('merging a table into itself is refused');
});

describe('canUnmerge — never over open money; releases the whole group (R14, OR-5a)', () => {
  it.todo('FL-S8 a 5+6+7 group holding 640000p is refused before anything is released');
  it.todo('FL-S8 a group with nothing placed releases all three children at once');
  it.todo('FL-S27 a group holding 298000p unbilled is refused, and says to bill or move it first');
  it.todo('FL-S27 a group whose bill is issued and unpaid is refused');
  it.todo('a group whose only bill is fully paid releases');
  it.todo('a group whose only bill was cancelled and has no lines releases');
});

describe('canMove (R5, R6, R16)', () => {
  it.todo('FL-S10 a sitting moves onto a vacant table');
  it.todo('FL-S11 moving onto an occupied table is refused');
  it.todo('FL-S12 moving a merged parent is refused, and says to release the merge first');
  it.todo('FL-S24 a sitting with any line carrying a billId is refused: an issued bill freezes its tableIds');
  it.todo('FL-S33 a destination that is disabled with mergedInto set, and holds no session, is still refused');
  it.todo('FL-S33 a destination with an OTP in flight is refused');
  it.todo('FL-S33 a destination that is a parent of a merged child is refused');
  it.todo('FL-S29 a SERVER role is refused 403; MANAGER and ADMIN may move');
  it.todo('moving a table that has no sitting is refused');
  it.todo('moving onto an out-of-service table is refused');
  it.todo('moving a sitting onto its own table is refused');
});

describe('isReleasable — when a paid table frees itself (FL-Q1, R14)', () => {
  it.todo('last bill fully paid and nothing unbilled → releasable');
  it.todo('last bill fully paid but 30000p of dessert unbilled → not releasable');
  it.todo('one of two split bills still owing 100000p → not releasable');
  it.todo('a merged group is judged across every table in it, not just the parent');
});

describe('the floor is a picture (R1, R17, R19, R20)', () => {
  it.todo('FL-S30 a sitting whose table was retired still has a tile under its old number');
  it.todo('FL-S32 two merges of the same child cannot both win: the loser is refused, not overwritten');
  it.todo('FL-S14 once every bill of the group is settled the sitting refuses a new user');
  it.todo('FL-S14 once every bill of the group is settled the sitting refuses a new checkout');
  it.todo('R20 lines that cannot be read fail the floor; they never render an occupied tile as 0p');
});

describe('the move write set (R5, R15, FL-S28)', () => {
  it.todo('FL-S28 a move names session.tableId, the cart doc, the open order and every unbilled line');
  it.todo('FL-S28 a billed line is never in the write set, and its presence refuses the whole move');
  it.todo('FL-S10 no price field is in the write set: tableId is routing, not money');
  it.todo('FL-S10 draftId is not in the write set, so the bill in progress follows the party');
});

// FL · app skeleton. The use-cases, against fake ports and a fake clock. No emulator.
// The domain skeleton (`domain/floor.test.ts`) owns the arithmetic and the refusals; this file
// owns what the domain cannot see: who is asking, what one transaction must write, what an audit
// row says afterwards, and what the screen is handed when a port is down.
//
// Every expected value is hand-computed and written into the name. Bodies are todo until phase 3.

describe('getFloor — one read that paints every tile (R1, R2, R3)', () => {
  it.todo('FL-S1 24 tables come back as 24 tiles in one call: table 12 = 234000p/48min, table 7 = 86000p/12min, 9 free');
  it.todo('FL-S1 a tile carries its own minutes since the sitting opened, computed off the fake clock, not the client');
  it.todo('FL-S6 a merged 5+6 group is ONE tile labelled "5+6" for 412000p; table 6 returns no tile of its own (R9)');
  it.todo('FL-S5 a table scanned at 20:02 with nothing placed is seated at 0p, not free (R14)');
  it.todo('FL-S30 a table marked out of service at 20:50 with 234000p open still returns its tile (R17)');
  it.todo('FL-S30 an out-of-service table with no sitting and no money returns no tile');
  it.todo('FL-S34 a sitting whose 4-hour session expired at 23:00 still shows 184000p at 23:05 (R17)');
  it.todo('never reads activeOrderId: the port is not given one, and the tiles are still right (R3)');
  it.todo('lines are found by the frozen sessionId, never draftId: a split sitting still totals 300000p (R2)');
  it.todo('one call per floor, not one per table: the lines port is asked exactly once for 24 tables');
});

describe('getFloor — the two axes and the word on the tile (R11)', () => {
  it.todo('FL-S19 unbilled 147000p and nothing issued reads "ordered", never a money word');
  it.todo('FL-S20 issued 200000p unpaid AND 30000p ordered after issue reads both: due 200000p + ordered 30000p');
  it.todo('FL-S22 an issued 100000p bill with 40000p taken reads due 60000p, never "paid"');
  it.todo('FL-S35 a bill comped to 0p and settled reads "settled", exactly as a paid one does');
  it.todo('FL-S17 a cancelled 234000p bill puts the money back on the ordered axis');
  it.todo('FL-S17 a cancelled bill with a second issued bill still open keeps showing that second bill too');
  it.todo('FL-S21 three drafts on one sitting read 300000p and a count of 3, never one draft picked silently');
});

describe('getFloor — what happens when a port is down (R19)', () => {
  it.todo('FL-S20/R19 if the lines port throws, the floor answers failed, never a tile reading 0p on an occupied table');
  it.todo('FL-S20/R19 a bills port failure fails the same way: partial money is not money');
  it.todo('a tables port failure fails the whole call; there is nothing to paint');
  it.todo('one table failing does not blank the other 23: the failure names the table and the rest still paint');
});

describe('openTable — the tap is a read of the truth, not of the poll (R1, R12)', () => {
  it.todo('FL-S2 tapping table 12 returns its one open draft with 9 lines, read fresh inside the call');
  it.todo('FL-S2 the answer is drafts: [...], never a single draftId + billId + state (R12)');
  it.todo('FL-S3 tapping table 7 four minutes after issue returns the issued bill for tender, not a second draft');
  it.todo('FL-S4 tapping empty table 19 returns nothing to open, and says so rather than minting a draft');
  it.todo('R1 a tile that says ordered but whose draft was issued 2s ago returns the bill: the poll never decides');
  it.todo('FL-S21 three drafts come back as three, in a stable order, so the picker does not reshuffle under a thumb');
  it.todo('opening a table of a merged group answers for the parent sitting, not the child');
});

describe('move — one transaction, four writes, no price rewritten (R5)', () => {
  it.todo('FL-S10 moving 4 → 9 writes the session tableId, the cart doc, the open order tableId and every unbilled line, in ONE transaction');
  it.todo('FL-S10 the source cart document is deleted and the destination written; two carts never exist at once');
  it.todo('FL-S28 an open order with 168000p of biryani is re-pointed to table 9 so the runner walks the right way');
  it.todo('FL-S28 a SERVED-but-unpaid order moves too (FL-Q2); a CANCELLED one is left alone');
  it.todo('R5 no line price is rewritten: listPrice, offer, discount and taxBlocks are byte-identical after the move');
  it.todo('R5 a billed line keeps its tableId; only unbilled lines move');
  it.todo('if any one write fails the whole move rolls back: table 4 still holds the sitting and table 9 is still vacant');
  it.todo('FL-S25 after the move, a guest scanning table 9 joins the moved sitting rather than opening a new one');
  it.todo('FL-S13 table 4 is left vacant, and the moved party is not redirected: their old QR is dead by design');
});

describe('move — who may, and onto what (R6, R16)', () => {
  it.todo('FL-S29 a SERVER-role staff session is refused 403, and is never offered a PIN box');
  it.todo('FL-S29 MANAGER and ADMIN may move');
  it.todo('FL-S11 a destination holding a live sitting is refused before anything is written');
  it.todo('FL-S33 a destination that is disabled with mergedInto set and no session is refused (all five counts, R6)');
  it.todo('FL-S33 a destination with a currentOTP in flight is refused');
  it.todo('FL-S12 moving a merged parent is refused, with "release the merge first" in the message');
  it.todo('FL-S24 a sitting with any line carrying a billId is refused: an issued bill freezes its tableIds');
  it.todo('FL-S31 moving table 5 onto occupied table 6 is refused in words, and no third path is offered');
  it.todo('an expired staff session is refused unauthenticated, not 403');
});

describe('setMerge — the race and the release (R14, R16, OR-5a)', () => {
  it.todo('FL-S32 the child is re-read INSIDE the transaction: a guest completing OTP at 20:16 makes the merge lose, not both win');
  it.todo('FL-S32 two merges naming the same child in the same second: exactly one commits, the other is refused');
  it.todo('FL-S7 merging 5 and 6 writes both children disabled with mergedInto, plus one audit row naming the cashier');
  it.todo('FL-S9 merging occupied table 8 is refused: it is not vacant');
  it.todo('FL-S26 merging table 6, which is already a child of 5, into 8 is refused: 6 is disabled, not vacant');
  it.todo('FL-S27 unmerging a group holding 298000p unbilled is refused, and says bill it or move it first (R14)');
  it.todo('FL-S27 unmerging a group with an issued unpaid bill is refused too');
  it.todo('FL-S8 a group that owes nothing releases ALL its children at once (OR-5a), not the ones named');
  it.todo('FL-S29 SERVER is refused 403 on merge and on unmerge, same as move');
  it.todo('the audit row and the merge write commit together: a failed audit rolls the merge back');
});

describe('the release rule — free means no open money (R14)', () => {
  it.todo('FL-S16 the captain marking table 12 COMPLETED with 234000p unbilled does NOT free the tile');
  it.todo('FL-S16 the tile still shows 234000p after vacateTable ran, because money outranks the session');
  it.todo('FL-S14 a sitting whose every bill is settled stops accepting new users and new checkouts (R18)');
  it.todo('FL-S14 a passer-by scanning table 7 after it settled opens a NEW sitting, never joins the paid one');
  it.todo('FL-S35 a 0p comped settlement releases exactly like a paid one: no open money is no open money');
  it.todo('a group is free only when every table in it holds no open money, not just the parent');
});

describe('audit — one row per act a person chose (R16)', () => {
  it.todo('FL-S18 a move writes one row with the staff name, both table numbers and the minute');
  it.todo('FL-S7 a merge writes one row naming every child, not one row per child');
  it.todo('an unmerge writes one row naming every child it released');
  it.todo('a refused act writes no audit row: the floor records what happened, not what was attempted');
  it.todo('every row carries the sitting cid so a Monday morning question needs one collection, not five');
});

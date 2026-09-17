import { test } from '@playwright/test'

// FL in the browser. Every test is `fixme` until phase 5 builds the screen: the endpoints it
// drives (`floor-get`, `floor-open`, `table-moveTable`) do not exist yet, so a real body here
// would be red for two phases and would tell nobody anything new.
//
// Sheet: moonshot/SPEC_FL_floor_and_moves.md. The screen's job is a picture that is never
// trusted (R1): the poll paints, the tap re-reads. Expected values are hand-computed and live
// in the test name so a wrong implementation cannot quietly redefine what the test was for.
//
// Fixtures this file will seed, on the restaurant the other specs already use:
//   table_fl_12  seated 20:00, unbilled 234000p (tikka 32000 + pitcher 125000 less 10000 + …)
//   table_fl_7   bill fl_0701 issued 100000p, 40000p taken → 60000p due
//   table_fl_5   parent, table_fl_6 merged into it, 412000p on the group
//   table_fl_19  vacant, nothing open
//   staff        manager@fl.test (MANAGER) and server@fl.test (SERVER), both pin 1234

test.describe('the floor is the home screen', () => {
  test.fixme('FL-S1 opening the till with no URL param lands on the floor, not a blank page', () => {})
  test.fixme('FL-S1 24 tiles paint in one call; table 12 reads ₹2,340 · 48 min and 9 tiles are pale', () => {})
  test.fixme('FL-S6 tables 5 and 6 draw ONE tile labelled 5+6 reading ₹4,120, never two greyed tiles (R9)', () => {})
  test.fixme('FL-S5 a table scanned with nothing ordered reads seated · ₹0, visibly not the same as empty', () => {})
  test.fixme('FL-S20 a table with ₹2,000 due and ₹300 ordered after issue shows both numbers, not one word (R11)', () => {})
  test.fixme('FL-S22 a part-paid table reads ₹600 due; the string "paid" appears nowhere on it', () => {})
  test.fixme('FL-S1 the floor repaints on its own every 5s (floor.pollSeconds) with no tap', () => {})
})

test.describe('the tap is a read of the truth (R1)', () => {
  test.fixme('FL-S2 tapping tile 12 lands on its draft with 9 lines; no table number is typed', () => {})
  test.fixme('FL-S3 tapping tile 7 after its bill printed lands on tender, not a second draft', () => {})
  test.fixme('FL-S4 tapping empty tile 19 does nothing and says nothing is open there', () => {})
  test.fixme('FL-S21 tapping a sitting with 3 drafts lists all three and waits; it never picks one', () => {})
  test.fixme('R1 a tile still reading ordered 2s after issue opens the BILL: the stale picture never routes', () => {})
  test.fixme('FL-S30 a table marked out of service with ₹2,340 open is still tappable and still reaches its bill', () => {})
})

test.describe('picking mode — merge, unmerge, move (R13, R16)', () => {
  test.fixme('FL-S23 with Merge armed, tapping tile 5 selects it instead of opening its money', () => {})
  test.fixme('FL-S23 leaving picking mode restores tap-to-bill on the very next tap', () => {})
  test.fixme('FL-S7 Merge → pick 5 → pick 6 → confirm turns two tiles into one reading ₹4,120', () => {})
  test.fixme('FL-S9 picking occupied table 8 as a merge child is refused on screen, in words', () => {})
  test.fixme('FL-S27 Unmerge on a group holding ₹2,980 is refused, and the screen says bill it or move it first', () => {})
  test.fixme('FL-S8 Unmerge on a group that owes nothing releases all its children at once (OR-5a)', () => {})
  test.fixme('FL-S10 Move → pick 4 → pick 9 moves the party; tile 9 carries the money and tile 4 goes pale', () => {})
  test.fixme('FL-S11 picking occupied table 11 as a destination is refused before confirm is offered', () => {})
  test.fixme('FL-S12 moving a merged group is refused with "release the merge first" on screen', () => {})
  test.fixme('FL-S24 moving a sitting whose bill is printed is refused, and the reason names the bill', () => {})
  test.fixme('FL-S31 two occupied tables offer neither merge nor move, and the screen says so rather than greying out silently', () => {})
})

test.describe('who may act (R16)', () => {
  test.fixme('FL-S29 a SERVER login sees no Merge, Unmerge or Move control at all', () => {})
  test.fixme('FL-S29 a SERVER login calling it anyway is refused 403, and is never shown a PIN box', () => {})
  test.fixme('FL-S29 a MANAGER login sees all three', () => {})
})

test.describe('when the answer is old or missing (R15, R19)', () => {
  test.fixme('FL-S15 with the network down the floor greys, shows the time of the last answer, and keeps painting it', () => {})
  test.fixme('FL-S15 merge, unmerge and move are refused while greyed, with the reason on screen', () => {})
  test.fixme('FL-S15 the grey clears on the first successful poll after the network returns', () => {})
  test.fixme('R19 if the money cannot be summed the floor says so; an occupied tile never paints ₹0', () => {})
  test.fixme('floor.staleAfterSeconds: a poll that hangs past 20s greys the screen even though nothing errored', () => {})
})

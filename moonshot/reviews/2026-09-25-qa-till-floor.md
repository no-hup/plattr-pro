# QA · till floor screen · 2026-09-25

Driver run, screen-exploration mode ([AGENT_QA.md](../../AGENT_QA.md) §5). Restaurant `res_meghana`, emulator slot 1
(Firestore `127.0.0.1:8180`, functions `:5102`), till at `http://127.0.0.1:5174/?r=res_meghana`, seed MockData7.
Headless Chromium via Playwright. States were made with
[floorstate.mjs](../../backend/src-plattr/functions/test/e2e/qa/floorstate.mjs), which goes through the real endpoints.
Trajectory: [qa-till-floor-2026-09-25.jsonl](../../backend/src-plattr/functions/test/e2e/results/qa-till-floor-2026-09-25.jsonl).
Screenshots: `/private/tmp/claude-501/-Users-shaurya-Desktop-dev-plattr-pro/3f613176-28cf-443a-a752-78de23bca6c4/scratchpad/qa/shots/`
(scratchpad, outside the repo).

## 1. Summary

I ran **93 cells**: **61 PASS, 19 FAIL, 13 NOTE**, and about 300 browser actions. The till forced **about 22
re-logins** (TD-052: every tile tap that opens a draft or bill, plus every Back and reload). Merge, unmerge and move do
what the spec says on almost every refusal. Each refusal names the table in plain words, leaves the database unchanged,
and writes no audit row. Each success writes one audit row naming the cashier. The FL-S32 race and the two-tills race
both held.

The serious problems are elsewhere:
- **Walk-out** tells the cashier the table is freed, but the tile keeps the old money forever. Once a new party sits
  there, the new party's money disappears from the floor.
- **Parcel counters** can be merged into a table, and a party can be moved onto one.
- A pick that was started before the floor went stale can still be confirmed.
- The move refusal tells the cashier to **cancel a paid bill**.

Midway through, the slot-1 emulator was stopped by an outside signal. The observer restarted it and re-seeded. I re-ran
the walk-out cells after the restart and got the same result, and I discarded the one probe that timed out during the
outage.

## Observer check (2026-09-25, after the run)

Re-produced on a clean re-seed, calling the backend directly, with no till screen involved:
- **QF-1 and QF-2 confirmed.** `floor-clear` with the walk-out reason and PIN answers `Cleared, freed [tbl_meg_6]`.
  `floor-get` right after still returns `6: ordered, onTable 6000` and `7: billed, unpaid 6600`. With a new party seated
  at 7, `floor-get` still returns only the old `7: billed, unpaid 6600`. The fault is in what `floor-get` returns, not
  in the screen.
- **QF-3 confirmed.** `table-setMerge` with parent `tbl_meg_11` and child `tbl_meg_p1` succeeds, and `floor-get` returns
  `11+P1: free`.

**For the fixer: QF-2 is partly a spec conflict, not only a bug.** FL R14 says a table is free only when no open money
remains, and the floor is doing exactly that: the walked-out bill is still `issued`, and the lines are still unbilled.
The walk-out decision (Shaurya, 2026-09-24, quoted in `useFloor.ts`) says a table that still owes can be freed with a
PIN. Both cannot hold. Decide what a walked-out sitting's money becomes (written off, on a bill marked walked-out, or
still owed but off the floor) before changing `floor-get`. The "Expected" line in QF-2 quotes the driver brief, not the
spec. QF-1 is a bug under either reading: a live party must always have its own tile (R9, R17).

## 2. Findings (most severe first)

### QF-1 · A new party at a walked-out table is invisible on the floor · P0

**Scene.** Friday 21:10. The couple at table 7 leaves without paying a printed ₹66 bill. The cashier presses Walk-out
and enters their PIN. Twenty minutes later a family sits at 7 and orders. Tile 7 still reads `₹66.00 due`. The family's
₹60 of food appears nowhere on the floor. Tapping 7 opens the family's draft, so the tile and the tap disagree.

**Steps to reproduce** (from a clean re-seed):
1. `node floorstate.mjs 7 billed`
2. Log in as `till@meg.test`. Click `walkout-7`, accept the confirm, enter PIN `1234` in `pin-input`, then click `pin-ok`.
3. `node floorstate.mjs 7 ordered`. The helper accepts, because table 7 is now `vacant`.
4. Wait 6 s and read `tile-7`. Then tap it.

**Expected.** One tile per sitting (R9). The live party's money is on the floor (FL-S1, R19: "an occupied tile reading
₹0 is more dangerous than a floor that says it is down"). The tile and the tap describe the same thing (R1).

**Actual.** `tile-7` reads `7 ₹66.00 due · 0 min Walk-out` with `data-word=billed`. The new party's ₹60 is not shown.
The tap goes to `?draft=htcZPMqZmltKFisRh8TU` (the new party). `floor-get` returns one tile for `tbl_meg_7`:
`onTable 0, unpaid 6600`. Table 6 behaves the same way: after a walk-out and a new ₹60 party, it shows a single ₹60, and
the minutes on the tile belong to the old sitting.

**Database.** Table 7 has two sessions: `htcZ..` active and `xf5x..` ended. The `xf5x` line is billed. The `htcZ` line
is open at ₹6000. Bill A-0001 is still `issued`, with `sittingId xf5x`.

**Evidence.** Cell `walkout:then-new-party`. Screenshot `shots/walkout_then_new_party_7_rerun.png`.

**Where to look.** `floor-get`: how it picks one sitting per table when a table has several.

### QF-2 · Walk-out says "freed" but the tile keeps the money and the Walk-out button forever · P1

**Scene.** Table 6 walks out on ₹60. The cashier presses Walk-out, confirms, and enters their PIN. The bar says
"6 freed, unpaid". The tile still says `₹60.00` with a Walk-out button, for the rest of the night. The cashier cannot
tell a walked-out table from one still eating. A second Walk-out press "succeeds" again silently.

**Steps to reproduce.**
1. `node floorstate.mjs 6 ordered` and `node floorstate.mjs 7 billed`.
2. Log in. Click `walkout-6`, accept, enter PIN 1234. Do the same for `walkout-7`.
3. Wait 6.5 s (one poll) and read both tiles.

**Expected.** The prompt says: "after walk-out the tile reads free and the money is recorded". The control's own words
say "freed" (the Shaurya 2026-09-24 decision quoted in `useFloor.ts`).

**Actual.**
- The bar says `6 freed, unpaid`. The tile stays `6 ₹60.00 · 0 min Walk-out` (`data-word=ordered`).
- Tile 7 stays `₹66.00 due` (`billed`).
- The same happens after part-paid (`₹33.00 due`), dessert, split (`₹120.00 · 2 drafts`) and merged group (`10+11`)
  walk-outs.
- Pressing Walk-out again on 6: no PIN is asked, the bar says "6 freed, unpaid" again, and no new audit row is written.

**Database.**
- The table is `vacant` and the session is `ended`.
- The line is still `billId null, countsTowardTotal true`, or the bill is still `issued`.
- The money is recorded: `table.clear` sev P0 `owed 6000` and `releaseUnpaid` P0 `amount 6000`.

**Related.** If the walked-out table is then merged into another table, the money vanishes from view entirely: `6+9`
reads `free` while table 9's ₹60 line still counts (cell `merge:walked-out-child`, R14). So walked-out money is shown
forever on its own tile and hidden completely inside a group. Neither behaviour is a decision.

**Evidence.** Cells `walkout:ordered`, `walkout:billed`, `walkout:partpaid`, `walkout:split`, `walkout:merged-group`,
`walkout:repeat`, `merge:walked-out-child`. Screenshots `shots/walkout_after_poll_rerun.png` and
`shots/merge_walkedout_child.png`.

**Where to look.** `floor-get` tile derivation for sittings whose session is ended by `floor-clear` with a walk-out
reason.

### QF-3 · Parcel counters can be merged into a table and a dine-in party can be moved onto one · P1

**Scene.** The cashier sets up a merge and misses: they tap P1 in the Parcels strip instead of table 12. The merge goes
through. Table 11 disappears from the main floor and reappears inside the Parcels strip as `11+P1`. In the move case, a
seated party with ₹60 of food is moved onto P1 and now looks like a takeaway ticket.

**Steps to reproduce.**
- Merge: log in, click `start-merge`, tap `tile-11`, tap `tile-P1`, click `confirm-pick`.
- Move: `node floorstate.mjs 11 ordered`, click `start-move`, tap `tile-11`, tap `tile-P1`, click `confirm-pick`.

**Expected.** Parcels are drawn in their own strip "so a waiting parcel is seen, and never mistaken for a table" (BT /
OR-3 comment in `FloorScreen.tsx`, Shaurya 2026-09-23). A counter ticket is not a table a party sits at.

**Actual.**
- Merge: the bar says `Merged into tbl_meg_11`. `tiles` no longer contains 11. `parcels-list` contains `11+P1 free
  Unmerge`.
- Move: the bar says `Party moved`. Tile 11 reads free and `P1 ₹60.00` sits in the Parcels strip.

**Database.**
- Merge: `tbl_meg_p1` is `disabled`, `mergedInto tbl_meg_11`. Audit `table.merge` parent 11, child [p1].
- Move: session, order and line all have `tableId tbl_meg_p1`. Audit `table.move` 11 → p1.

**Evidence.** Cells `merge:free+parcel` and `move:ordered>parcel`. Screenshots `shots/merge_free_parcel_strip.png` and
`shots/move_ordered_parcel.png`.

**Where to look.** `table-setMerge` and `table-moveTable` vacancy checks, against `ordering.takeawayTableIds`.

### QF-4 · A pick started before the floor went stale can still be confirmed · P1

**Scene.** 20:50. The cashier has picked 6 and 7 for a merge when the internet drops. The floor text says "Showing the
floor as of 20:50 — No connection" and the Merge and Move buttons grey out. Confirm stays live. The cashier presses it
and the merge happens on a picture that is 20 s old.

**Steps to reproduce.**
1. Log in. Click `start-merge`, tap `tile-6`, tap `tile-7`.
2. In Playwright run `context.route('**/floor-get', r => r.abort())` and wait 23 s.
3. `floor-stale` is visible. Click `confirm-pick`.

**Expected.** FL-S15: while stale, the floor "refuses merge, unmerge and move".

**Actual.** `confirm-pick` is enabled. The bar says `Merged into tbl_meg_6`. `start-merge`, `start-move`, `unmerge-*`
and `walkout-*` are disabled correctly. Only the Confirm of an open pick escapes.

**Database.** `tbl_meg_7` is `disabled`, `mergedInto tbl_meg_6`. An audit `table.merge` row was written while stale.

**Evidence.** Cell `stale:merge-confirm-mid-pick`. Screenshot `shots/stale_mid_pick.png`.

**Where to look.** `FloorScreen.tsx`: the `confirm-pick` disabled condition.

### QF-5 · The move refusal on a paid or part-paid table tells the cashier to cancel the bill · P1

**Scene.** Table 10 has paid ₹66 in full and wants to move to the window for coffee. The cashier tries Move. The till
says "this table has a printed bill — cancel it before moving the party". A cashier who follows that advice cancels a
paid bill. On a part-paid table, where ₹33 of cash is already in the drawer, the same words appear.

**Steps to reproduce.**
1. `node floorstate.mjs 10 settled` and `node floorstate.mjs 9 partpaid`.
2. Log in. Click `start-move`, tap `tile-10`, tap `tile-3`, click `confirm-pick`.
3. Repeat with `tile-9`.

**Expected.** FL-S24: refused, with "Cancel the bill **or finish tender** first". For a settled table the words should
fit a paid table, not suggest cancelling it.

**Actual.** Both show `floor-msg` = "this table has a printed bill — cancel it before moving the party". The refusal
itself is correct.

**Database.** Unchanged. Bills stay `paid` and `issued`. No audit row.

**Evidence.** Cells `move:settled>free` and `move:partpaid>free`. Screenshots `shots/move_settled_free.png` and
`shots/move_partpaid_free.png`.

**Where to look.** The `table-moveTable` refusal text.

### QF-6 · The walk-out amount adds pre-tax food to post-tax bills · P2

**Scene.** Table 10's ₹66 bill is printed, and then they order a ₹60 naan. They walk out. The confirm reads "Free 10
with ₹126.00 unpaid?". The P0 audit row records 12600. The real exposure is ₹66 + ₹66 = ₹132, because the naan bills at
₹66 with service charge and tax. The owner reading the P0 row on Monday sees the wrong figure.

**Steps to reproduce.** `node floorstate.mjs 10 dessert`, log in, click `walkout-10`, and read the dialog.

**Expected.** R2 says tile numbers stop before tax. That is by design for the tile (FL-S19), and I am not reporting the
tile. But this confirm and the P0 row are "the amount abandoned", and they add a pre-tax number to a post-tax one.

**Actual.**
- Dialog: `Free 10 with ₹126.00 unpaid?`
- `table.clear` `owed 12600`. `releaseUnpaid` `amount 12600`.
- The same pre-tax figure is recorded for a plain ordered table: ₹60 (6000) when the bill would be ₹66.

**Evidence.** Cell `walkout:dessert`.

**Where to look.** The `floor-clear` owed computation and the client's `onTable + unpaid` in the confirm text.

### QF-7 · After a double-tap on Confirm the till says the merge failed when it succeeded · P2

**Scene.** The cashier taps Confirm twice on a merge of 6 and 7. The merge happens once, which is correct. The bar
ends on the second call's answer, "table 7 is part of another group", so the cashier thinks the merge failed and tries
again.

**Steps to reproduce.** Log in, click `start-merge`, tap `tile-6`, tap `tile-7`, then click `confirm-pick` twice in the
same tick (`b.click(); b.click()`).

**Expected.** One merge, and a screen that says merged (AGENT_QA §5 "repeat").

**Actual.** `floor-msg` = "table 7 is part of another group".

**Database.** 7 is `mergedInto tbl_meg_6`, and there is exactly one `table.merge` row.

**Evidence.** Cell `misuse:double-confirm-merge`. Related: under load (two tills), merge answers took 3–8 s with
nothing on screen to say the till was working, which is why a second tap is likely (cell `two-tills:merge-same-child`).

### QF-8 · The dessert tile drops the word "new" · P2

**Scene.** Table 10's bill is printed and they order dessert. The spec's tile reads `₹66 due · ₹60 new`. The till shows
`₹66.00 due ₹60.00`. The second number reads like a correction of the first.

**Steps to reproduce.** `node floorstate.mjs 10 dessert`, log in, read `tile-10`.

**Expected.** FL-S20 and the "What the cashier sees" table: `₹600 due · ₹300 new`.

**Actual.** `10 ₹66.00 due ₹60.00 · 0 min`. The chooser itself is right: a draft `₹60.00 · 1 items`, a bill `₹66.00
due`, and Back.

**Evidence.** Cell `tap:dessert`. Screenshot `shots/tap_10_picker.png`.

### QF-9 · Picking shows no selection and speaks in document ids · P2

**Scene.** The cashier taps 6, then 7, for a merge. Neither tile changes. The only feedback is a line reading
"— tbl_meg_6, tbl_meg_7". After the merge, the bar says "Merged into tbl_meg_6". Nothing says which table is the keeper.

**Steps to reproduce.** Log in, click `start-merge`, tap `tile-6`, tap `tile-7`, and look at the screen.

**Expected.** R13 and FL-S23: picking is a visible mode. Tiles are labelled by number and never by id (Decisions
2026-09-18: "A tile is labelled by the table's `number`").

**Actual.**
- `data-picked` is set, but nothing styles it: [index.css](../../frontend/till/src/index.css) has no rule for it.
- The `picking` text and the success messages use `tbl_meg_*`.
- When the keeper is picked second (cell `merge:parent-picked-second`), the refusal "table 10 has a party at it" does
  not tell the cashier to pick 10 first.

**Evidence.** Cells `picking:visible-selection` and `merge:free+free`. Screenshot `shots/stale_mid_pick.png`.

### QF-10 · The stale floor is not greyed · P2

**Steps to reproduce.** Block `floor-get` for more than 20 s.

**Expected.** FL-S15: "the last answer it had, greyed, with the time on it".

**Actual.** One text line appears: "Showing the floor as of 05:17 — No connection". The tiles keep their full colour.
`class="stale"` is set on `tiles` and `parcels-list`, but no CSS uses it. The controls are disabled correctly.

**Evidence.** Cell `stale:greyed`. Screenshot `shots/stale_mid_pick.png`.

### QF-11 · The unmerge refusal points at a Move that will also be refused · P2

**Scene.** The 12+11 group has an unpaid bill. Unmerge says "this group has an unpaid bill — settle it or move it
first". Move then says "release the merge first" for a group, and "cancel the bill" for a billed table. The advice
loops.

**Steps to reproduce.** `node floorstate.mjs 12 billed`. Merge 12+11. Click `unmerge-12+11`, then try `start-move` on
`12+11`.

**Expected.** FL-S27, FL-S12 and FL-S24 together mean a billed group can only be settled. The words should say that.

**Actual.**
- Unmerge on a group with food: "this group has food on it — bill it or move it first".
- Unmerge on a billed group: "this group has an unpaid bill — settle it or move it first".
- Move on a group: "release the merge first, then move the table".

**Evidence.** Cells `unmerge:ordered-group`, `unmerge:billed-group` and `move:merged-group>free`.

### QF-12 · Tiles are sorted as text · P2

**Scene.** The cashier looks for table 2 and finds it after 12: `1, 10, 11, 12, 2, 3, 4…`. After merges the order is
`1, 3+10, 12+11, 2, 4, 6+7+8+9`.

**Expected.** FL-S1 glance test.

**Evidence.** Cell `floor:tile-order`. Screenshot `shots/00-initial.png`.

### QF-13 · A seated tile shows neither "seated" nor ₹0 · P3

**Steps to reproduce.** Look at tile 1 in the seed: an active session with nothing placed.

**Expected.** FL-S5: "Tile 3 shows seated and `₹0`".

**Actual.** `1 · 30 min`. The word only exists as `data-word=seated`. From a glance, a seated table and a table with a
stuck OTP look alike (compare the `signing in` tile).

**Evidence.** Cell `tile:seated-glance`.

### QF-14 · The PIN box shows a code word · P3

**Steps to reproduce.** Walk-out on any table with money.

**Actual.** The prompt reads "Enter your PIN / Needed for this **releaseUnpaid**".

**Evidence.** Cell `walkout:pin-cancel`.

### QF-15 · The split chooser buttons are identical · P3

**Steps to reproduce.** `node floorstate.mjs 11 split` and tap 11.

**Actual.** Two buttons, both `₹60.00 · 1 items`. Nothing shows which dish or guest is on which draft, and "1 items" is
bad grammar. The chooser works otherwise (FL-S21 PASS).

**Evidence.** Cell `tap:split`. Screenshot `shots/tap_11_picker.png`.

## 3. Not bugs / not built

These surprised me but match the spec, are unspecified, or live outside this screen.
- **Disabled table 5 has no tile**, so "merge or move onto a disabled table" cannot be reached from the till. This
  matches R17, which only requires a tile when the table has money.
- **A merged child has no tile of its own.** Tapping a group always picks its parent, so FL-S26 and "move onto a merged
  child" are only reachable through the parent. Both refuse correctly ("table 6 has tables merged into it").
- **Merging a free table into a billed or settled parent is allowed.** The bill's `tableIds` stay frozen at the parent.
  The spec is silent on this (cells `merge:billed-parent+free`, `merge:settled-parent+free`).
- **A SERVER can Clear a settled table through the API** (200, audited as role SERVER), while the UI hides Clear from
  them. R16 covers merge, unmerge and move only, so this is a question for Shaurya.
- **A KITCHEN login on the till sees the whole money floor** and can open drafts. Generate bill is refused ("Not
  allowed"). This is unspecified.
- **Unmerge and Clear act on one tap with no confirmation.** Clear ends the sitting (R18). Both are allowed by the spec.
- **Walk-out on a merged group** releases the children inside the `table.clear` row (both tableIds listed) and writes
  no separate `table.unmerge` row.
- **After Clear or Walk-out the order stays `IN_PROGRESS`.** This is outside the floor, but other apps may keep showing
  it.
- **Table 2 is seeded with an OTP in flight**, so it reads `signing in`, not free as the brief said.
- **FL-S16 (captain COMPLETED):** the tile keeps ₹60 (PASS). `order-updateOrderStatus` did not end the session in this
  build, so the "session ended underneath" half was not exercised.
- **Not built:** `floor.settledFreeAfterMinutes` (struck in the spec), the auto-free of settled tables (FL-Q1 note), and
  thousands separators or whole-rupee display on tiles (`₹2340.00`, not `₹2,340`).
- **R5 cart document:** after checkout there is no cart document left to move, so the helper cannot test it.

## 4. Suggestions from the cashier's chair

- **Keeper badge.** The cashier picks 10 and then 9 for a merge. The first pick shows "keeps" and the second shows
  "joins", and both tiles light up. Without this, the cashier picks in the wrong order, gets "table 10 has a party at
  it", and has no idea why.
- **Walked-out mark.** Table 7 walks out at 21:10. The tile goes pale with a small "walked out ₹66" note until day
  close, and the next party gets a fresh tile. Without this, the cashier either sees ghost money all night or loses the
  new party's money (QF-1, QF-2).
- **Busy line.** On a slow Friday network, a merge takes 5 s. The bar says "Merging 6 + 7…" until the answer comes.
  Without this, the cashier taps Confirm twice and is told it failed (QF-7).
- **Say who is on the draft.** For a split at table 11, each chooser button names its first dish, for example "Butter
  Naan ₹60". Without this, two identical `₹60.00 · 1 items` buttons mean the cashier opens the wrong half.
- **Undo for Clear.** At 21:45 the cashier taps Clear on 9 instead of the Merge button beside it. A 10-second
  "Cleared 9 — Undo" bar appears. Without this, the coffee party's session is ended and their phones say "session
  ended".

## 5. Coverage

Legend: P = PASS, F = FAIL(QF-n), N = NOTE, — = not applicable, nb = not built or unreachable, nt = not tried.

**Merge.** The column is the child's state, and the parent is free unless stated.

| free | seated | holding | ordered | billed | partpaid | settled | reserved | disabled | parcel | group child | walked-out |
|---|---|---|---|---|---|---|---|---|---|---|---|
| P | P (FL-S32) | P | P | P | nt | P | P | nb | F(QF-3) | P | F(QF-2) |

Parent side: seated P, ordered P, billed N, settled N, a group extended by one more table P. Three tables at once P.
The same table twice P. Parent picked second N (QF-9).

**Unmerge.**

| empty group | seated group | ordered group | billed group | settled group | parcel group |
|---|---|---|---|---|---|
| P | P | P | P (words QF-11) | P | P |

**Move.** The source is on the left. The destination is free unless stated.

| from | → free | → seated | → holding | → reserved | → group | → parcel |
|---|---|---|---|---|---|---|
| free | P ("no party") | — | — | — | — | — |
| seated | P | nt | nt | nt | nt | nt |
| ordered | P | P | P | P | P | F(QF-3) |
| billed | P | — | — | — | — | — |
| partpaid | F(QF-5) | — | — | — | — | — |
| settled | F(QF-5) | — | — | — | — | — |
| merged group | P | — | — | — | — | — |

Picking one table: P. Picking three: N.

**Tap in billing mode.**

| free | holding | seated | reserved | ordered | billed | partpaid | settled | dessert | split | completed | expired |
|---|---|---|---|---|---|---|---|---|---|---|---|
| P | P | P | P | P | P | P | P | F(QF-8) | N(QF-15) | P | P |

**Clear.** Only on settled: P. Settled: P. Merged settled: P. Double-tap: P.

**Walk-out.**

| dismiss | PIN cancel | wrong PIN | ordered | billed | partpaid | dessert | split | merged group | double-tap | repeat |
|---|---|---|---|---|---|---|---|---|---|---|
| P | P | P | F(QF-2) | F(QF-2) | F(QF-2) | F(QF-6) | F(QF-2) | F(QF-2) | N | N |

**Roles.** SERVER UI: P. SERVER API merge/move/walk-out: P. SERVER API clear: N. KITCHEN UI: N. KITCHEN API: P.
ADMIN: P.

**Screen states.**
- Stale controls: P. Stale grey: F(QF-10). Stale Confirm: F(QF-4). Stale tap: P.
- Offline tap: P. Recovery: P.
- Tile glance: F(QF-12, QF-13).

**Misuses.**
- Cancel-then-tap: P. Reload mid-pick: P. Back after tap: N (TD-052).
- Two tills, same child: P. Move vs walk-out: P.
- FL-S32 holding: P. FL-S32 seated: P. Stale-picture tap: P (weak).

**Not tried:**
- FL-S17 (a cancelled bill making the money billable again)
- FL-S30 (a retired table with money)
- FL-S36 (idle auto-vacate sweep)
- FL-S25 (scanning the new table after a move)
- a move with a live cart document
- a staff session expiring mid-act
- the network dropping between Confirm and the answer
- a second till clearing while the first moves the same settled table

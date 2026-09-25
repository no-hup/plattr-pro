# QA exploration: waiter (captain) app, 2026-09-25

Screen exploration of the waiter app ([platter_server](../../frontend/src-platter-apps/apps/platter_server/lib/)), per
[AGENT_QA.md](../../AGENT_QA.md) §2 and §5–§7, working through the [grid](2026-09-25-grid-waiter-app.md) (65 cells) risk
first. One Opus driver with one headless gstack tab. The parent session observed. Trajectory:
[test/e2e/results/qa-waiter-app-2026-09-25.jsonl](../../backend/src-plattr/functions/test/e2e/results/qa-waiter-app-2026-09-25.jsonl)
(gitignored, local only: one line per cell, plus one per second-scenario repro, marked `repro_of`).

Stack: slot 0 (Firestore `:8080`, functions `:5002`, log `backend/flutter-app-logs/emulator.log`), because the waiter
app is hardcoded to `:5002`. MockData7 re-imported `--clean --refresh-timestamps` at the start. Waiter app via
`run_app.sh server` (`:5050`), viewport 430×900 (a captain's phone). Restaurant `res_meghana`, tables 6–12. Every
starting state was seeded through real endpoints with
[qa/floorstate.mjs](../../backend/src-plattr/functions/test/e2e/qa/floorstate.mjs), and every verdict cites a
read-back from `floorstate.mjs <n> dump` / `seen`. Screenshots are on the driver's machine
(`scratchpad/w*.png`, named by cell). About 300 browser commands of the 350 budget.

## Result

| verdict | cells |
|---|---|
| FAIL | 14: W01, W02, W03, W06, W14, W18, W21, W23, W24, W30, W41, W46, W52, W53 |
| NOTE | 11: W15, W17, W22, W26, W27, W38, W48, W56, W57, W62, W64 |
| PASS | 27 |
| NOTBUILT | 2: W43 (reject a guest round), W58 (`table-view-order`) |
| not run | 11: W04, W07, W28, W29, W32, W33, W34, W35, W47, W50, W55 |

Every FAIL was reproduced in a second scenario with one thing changed (another table, dish, staff login or starting
state) before it was logged (AGENT_QA §7). One cell that did not reproduce (W27, double Send) is a NOTE. The FAILs
collapse into **11 findings**: 2 P0, 5 P1, 4 P2.

What held: every refusal to free a table that owes money (W08–W10, W12, W63), the settled Clear (W11), the gate's
confirm and "Not yet" (W39, W40), stale serves and confirms against a cancelled round (W37, W42), a stale serve after
another captain served (W36), the out-of-stock refusal wording (W30's first half, W59), and the order detail's layout
(W49). The waiter app kept its login across page reloads and a browser crash (W65).

Money used everywhere unless named: Butter Naan ₹60 → payable ₹66 (₹60 + 5 % service ₹3, GST 5 % on ₹63 = ₹3.15,
round-off −₹0.15). Chicken 65 ₹280 → ₹309. Gulab Jamun ₹90 → ₹99. The waiter's cards show food only (by design).

## Findings

### QW-1 · P0 · Any staff member's "Cancel Order" takes the round off the kitchen and leaves it on the bill

*Scene.* 20:10, table 6 orders a Butter Naan. The captain opens the order and taps Cancel Order by mistake (or
on purpose). The kitchen's ticket vanishes, so the naan is never cooked. At 21:00 the cashier bills table 6 ₹66 for
it. If the table had already paid, the order still flips to CANCELLED with the money kept and no credit note.

*Steps from a clean seed.* `node floorstate.mjs 6 ordered`. Log in to the waiter app as `server@meg.test`. On Orders,
tap `order-cart-<cartId>` for table 6 → `order-cancel` → "Yes, Cancel Order" (no id). Then `node floorstate.mjs 6 seen`
and `… 6 dump`, and `… audit 3`.

*Expected.* A SERVER is refused (ST R8, ST-S4/S5). If a cancel is allowed at all, the lines leave the bill with a P0
audit row, the way a cart cancel does (TD-023's closure). After an invoice it is a credit note, never an order cancel
(ST Decisions 2026-09-15).

*Seen.* Screen: the dialog closes with no message. The header chip reads "CANCELLED" over "Cart 1 PENDING"
(`w03b.png`). Database (table 6): `orders/zrzT0Wq9YqcZpMck9W8o` `orderStatus CANCELLED`, cart still `PENDING`. The
kitchen read (`order-getActiveCartsForKitchen`) no longer returns it. Line `res_meghana_tbl_meg_6_1d957e2e_1`
`countsTowardTotal: true`, `billId: null`. `billing-preview` on the draft: Butter Naan 6000, payable 6600. The till
tile reads "6 ordered ₹60". No audit row.

*Evidence (4 scenarios, all the same).* W01 (table 6, unbilled, server@ on screen). W02 (table 9, bill A-0002 issued:
the order goes CANCELLED under the live bill; bill still issued, 6600 due). W03 (table 10, bill A-0003 paid: order
CANCELLED, bill paid, no credit note). W01-r2 (API, `kitchen@meg.test`, table 11, round READY: allowed too, and the
ready naan leaves both reads).

*Where to look.* [orders/updateOrderStatus.js](../../backend/src-plattr/functions/orders/updateOrderStatus.js): any
staff session may move IN_PROGRESS → CANCELLED, and only `orderStatus` is written.

### QW-2 · P0 · Add dishes after the guest's session expired starts a second sitting; the till bills one and Clear loses the other

*Scene.* A long dinner at table 12. The guest ordered a naan at 19:00 on the QR, and the session expired at 23:00
mid-meal. The captain adds a Chicken 65 from Add dishes. The table now has two sittings and two orders. The till tile
shows the old ₹60, but the tap opens only the new sitting's bill. The cashier bills and takes it, taps Clear, and the
table is freed. The first naan (₹66) is never billed.

*Steps from a clean seed.* `node floorstate.mjs 12 expired`. Waiter app as `server@`: `tab-tables` → `table-tbl_meg_12`
→ `table-add-dishes` → `add-dishes-dish-mi_chicken65` → `add-dishes-send`. `node floorstate.mjs 12 dump` and `… 12 seen`.

*Expected.* The same sitting is extended: one session, one draft, one bill (OR-S19: "extends the sitting… Without this
one party gets two bills"; `table-openTable`'s own comment says the same).

*Seen.* Opening Add dishes logged `validateTableSession: Marked session mpiuFe4cOjM5182BtEjR as expired`, and
`table-openTable` minted session `4BKRHs3956nJsFCUNSSb`. Send logged "Creating new order for table tbl_meg_12 with
order number ORD-00017". Database: two sessions (active + expired), two orders (`7pwRw3RGfoy0NZKh3bAs`,
`TD1peiGxDwhHYCCCpGtf`), two drafts: Chicken 65 payable 30900 and Butter Naan payable 6600. `floor-get` tile 12
"ordered" onTable 6000 (the expired sitting's naan only). The screen said nothing.

*Evidence.* W21 (on screen, table 12, Chicken 65). W21-r2 (API, one thing changed: table 7, `server2@`, Gulab Jamun),
then the till's own calls: `floor-open` returned only the new draft (Gulab ₹90), `billing-issue` ₹99, `payments-take`,
`floor-clear` → `freed: [tbl_meg_7]`. After: table 7 vacant, expired session `UMGAnvoZqtf7eLgw78To` still holds Butter
Naan 6000 unbilled (preview payable 6600), the tile says "7 ordered ₹60" on a vacant table, and both orders stay in the
kitchen and waiter reads.

*Where to look.* `sessionService.validateTableSession` marks an expired session and returns nothing, so
[table/openTable.js](../../backend/src-plattr/functions/table/openTable.js) creates a fresh one; the floor's tile and
its `floor-open` then pick different sittings for one table.

### QW-3 · P1 · A captain can't open a free table from the waiter app

*Scene.* 19:30, a couple sits at table 6 and asks the captain to order. He taps table 6 → Add dishes. The screen shows
"Table 6: add dishes" and a spinner, forever. No "how many people?" question, no menu. Back is the only control.

*Steps from a clean seed.* Waiter app as `server@`: `tab-tables` → `table-tbl_meg_6` (VACANT) → `table-add-dishes`.

*Expected.* The covers dialog "Table 6: how many people?" (`add-dishes-covers`, Skip, `add-dishes-covers-ok`), then the
menu (OR-S1, D4 covers).

*Seen.* Spinner only (`w24a.png`, `w24b.png`). Console: "Caught unhandled Dart error:
dependOnInheritedWidgetOfExactType<_LocalizationsScope>() … was called before _AddDishesScreenState.initState()
completed … add_dishes_screen.dart 56:5 initState". No `table-openTable` call in the emulator log. Table 6 unchanged.
Occupied tables skip the covers question and open fine (W21, W23, W24).

*Evidence.* W18 (table 6). W18-r2 (after a page reload, table 7): identical. Seen in the debug build that every QA run
uses; a release build may not hit this assertion, which is unverified. It also blocked W28 and W29.

*Where to look.* [add_dishes_screen.dart:56-62](../../frontend/src-platter-apps/apps/platter_server/lib/pages/tables_home/add_dishes_screen.dart):
`initState` → `_start()` → `showDialog` before the first frame.

### QW-4 · P1 · Mark Paid on an order with a round still at the kitchen makes that round vanish from the kitchen and the captain

*Scene.* Table 9's naan is READY on the pass. The captain taps Mark Paid ("This marks the food as done"). The naan's
card disappears from his Orders tab and from the kitchen screen. Nobody carries it. The till still bills ₹66 for it.
The same happens to a round the kitchen hasn't started: it's never cooked.

*Steps from a clean seed.* `node floorstate.mjs 9 ready`. Waiter app: tap table 9's card → `order-mark-paid` →
`order-mark-paid-confirm`. `node floorstate.mjs 9 seen`.

*Expected.* Unspecified in the specs (the grid asked Shaurya). The dialog's own text says it "marks the food as done";
a READY or PENDING round isn't done. At the least the kitchen should keep its ticket.

*Seen.* Dialog "Mark as Paid? This marks the food as done. The table stays occupied until the bill is settled and
someone taps Vacant." (`w06a.png`). Order `oQJpqjS7nD189JurJvmT` `COMPLETED` with carts `[READY]`. Kitchen read and
waiter read both drop table 9. Tile 9 "ordered" ₹60, draft payable 6600.

*Evidence.* W06 (on screen, READY). W06-r2 (API, `server2@`, table 11, round PENDING): the uncooked round leaves the
kitchen read too. W05 (billed table 10) showed the same for its PENDING round.

*Where to look.* Both reads skip COMPLETED orders
([getActiveOrdersForRestaurant.js:74](../../backend/src-plattr/functions/orders/getActiveOrdersForRestaurant.js));
[updateOrderStatus.js](../../backend/src-plattr/functions/orders/updateOrderStatus.js) allows COMPLETED with unserved carts.

### QW-5 · P1 · After a refused Send, the round's earlier dishes stay in the cart, and the retry sends them twice

*Scene.* The captain punches Gulab Jamun + Coastal Crab Roast for table 12. Between opening the screen and Send, the
kitchen marks crab out of stock. Send says "Coastal Crab Roast: … out of stock". He removes the crab and taps Send
again. The kitchen gets **two** Gulab Jamun, and the bill says ₹180, for one ordered.

*Steps from a clean seed.* `node floorstate.mjs 12 seated`. Waiter app: `table-tbl_meg_12` → `table-add-dishes`. Then
mark `mi_crab_roast` unavailable (`menu-updateMenuItemAvailability`, HTTP POST body
`{restaurantId, sessionId, menuItemId, isAvailable:false}`). Tap `add-dishes-dish-mi_gulab`,
`add-dishes-dish-mi_crab_roast`, `add-dishes-send`. Tap − on the crab line (no id), `add-dishes-send` again. Restore
the dish after.

*Expected.* The refusal names the dish (it does), nothing is checked out, and no earlier line of the round is left in
the cart ([AD:215](../../frontend/src-platter-apps/apps/platter_server/lib/pages/tables_home/add_dishes_screen.dart), grid W30). The retry sends one Gulab.

*Seen.* Refusal: red "Coastal Crab Roast: [addItemToCart] Menu item is currently out of stock." (`w30.png`). Nothing
checked out, but `carts/tbl_meg_12` holds `mi_gulab` `addedBy staff:srv_meg_1` while the round pane still shows
"Gulab Jamun 1". After the retry: line "Gulab Jamun (2 pc)" `qty 2`, list 18000.

*Evidence.* W30 (table 12, Gulab + Crab). W30-r2 (table 10, Apollo Fish + Qubani ka Meetha, Qubani made unavailable
after the screen loaded): after the retry, "Apollo Fish qty=2 list=68000". W26 is the same mechanism from an
interrupted Send: the next Send silently ships a line the pane never showed.

*Where to look.* `_send` in [add_dishes_screen.dart:198-236](../../frontend/src-platter-apps/apps/platter_server/lib/pages/tables_home/add_dishes_screen.dart)
adds lines one by one before checkout and keeps the pane after a failure.

### QW-6 · P1 · With the waiter-confirmation gate on, the captain's own round waits for a waiter

*Scene.* Meghana turns on "a waiter confirms every guest round". The captain punches Chicken 65 for table 6 himself.
The kitchen never sees it. His own card says "TO CONFIRM", and he has to long-press it and send it to himself.

*Steps from a clean seed.* `node floorstate.mjs gate on`, `node floorstate.mjs 6 seated`. Waiter app: `table-tbl_meg_6`
→ `table-add-dishes` → `add-dishes-dish-mi_chicken65` → `add-dishes-send`. `… 6 seen`. `node floorstate.mjs gate off` after.

*Expected.* Born PENDING, and the kitchen sees it (SPEC_OR config row `ordering.requireWaiterConfirmation`: "a
till-punched round is placed by the waiter, so it is born PENDING regardless"; OR Decision 2026-09-17).

*Seen.* `orders/NOQwCl9gCbZv0epCw22q` carts `[AWAITING_CONFIRMATION]`; line `placedBy staff:srv_meg_1`, `sent: false`.
The kitchen read returns the order with `carts: []`. Card "Table tbl_meg_6 | TO CONFIRM | 1× | Chicken 65 | ₹280".

*Evidence.* W24 (table 6, server@, on screen). W24-r2 (API, `server2@`, table 12 vacant, covers 3, Gulab Jamun): AWAITING too.

*Where to look.* [createOrUpdateOrder.js:72-74](../../backend/src-plattr/functions/orders/createOrUpdateOrder.js) reads
only the config, not `addedBy: staff:*`.

### QW-7 · P1 · A table cleared with a round still unserved leaves a live card and a live kitchen ticket (TD-082, worse than its row)

*Scene.* Table 12 pays ₹66 and leaves before its naan came out. The captain taps Vacant (or the cashier taps Clear).
The till shows "12 free". The waiter's Orders still shows "Table tbl_meg_12 PENDING Butter Naan", and the kitchen
still has the ticket, for a party that has gone.

*Steps from a clean seed.* `node floorstate.mjs 12 settled` (the seeded naan is never served). Waiter app:
`table-tbl_meg_12` → `table-status-vacant`. `node floorstate.mjs 12 seen`.

*Expected.* TD-082 assumes a cleared order has 0 carts and so draws nothing ("no one on the floor is misled today").

*Seen.* Tile 12 "free"; session ended; order `xchavp7aKGzj6ya5OnwC` `IN_PROGRESS` carts `[PENDING]`, returned by both
`order-getActiveOrdersForRestaurant` and `order-getActiveCartsForKitchen`. After a reload the waiter's card is there.

*Evidence.* W46 (captain's Vacant on table 12). W46-r2 (manager's `floor-clear` at the till on table 9, state
`clearedlive`): same. W38 then showed a captain can still serve that round on a vacant table.

*Where to look.* The TD-082 row: nothing in the Clear path ends the order. This run only shows the row's "invisible"
premise fails when a round is unserved.

### QW-8 · P2 · Ticking one dish served fails, or serves a second round's copy, when the same dish is in two rounds

*Scene.* Table 12 ordered a naan, then another naan. The second is READY. The captain opens the order and ticks it:
red "[markItemAsServed] Invalid status transition from PENDING to SERVED". On table 9, where both are READY, one tick
marks both naans served, though only one left the pass.

*Steps from a clean seed.* `node floorstate.mjs 12 samedish` (round 1 PENDING, round 2 READY) and `… 9 samedish2`
(both READY). Tap the table's card → detail → round 2's item checkbox (no id; `@e6` in `ab snap`).

*Expected.* Only the tapped round's line is served (CD:227).

*Seen.* Table 12: red snackbar as above (`w52b.png`); order `qt4Nhwoh8xFn2LR5eNZC` unchanged. Table 9: order
`SedYspPNpMDcnexeNpri` `READY:1/SERVED | READY:1/SERVED` after one tick (`w53.png`).

*Evidence.* W52, W53 on screen. W52-r2 (API, table 10, Gulab Jamun, `server2@`): refused the same way. W53-r2 (API,
table 11, Chicken 65, ticking round 1): both rounds SERVED.

*Where to look.* [serverMarkItemServed.js:65-70](../../backend/src-plattr/functions/orders/serverMarkItemServed.js)
matches `menuItemId + cartItemId` across every cart, and `cartItemId` restarts at 1 per cart.

### QW-9 · P2 · A captain can change a merged child's status, so the waiter shows 8 as free while the till groups it with 7

*Scene.* Tables 7 and 8 are merged for a party of eight. The captain opens table 8 (it reads "disabled") and taps
Active. Table 8 now shows ACTIVE on his screen, while the till still shows one "7+8" tile.

*Steps from a clean seed.* `node floorstate.mjs 7 mergedowes`. Waiter app: `table-tbl_meg_8` → `table-status-active`.
`node floorstate.mjs 8 dump`.

*Expected.* Refused, naming the group ("8 is merged into 7") (FL Decision 2026-09-17: the child stays `disabled` so
nobody seats a second party; R6).

*Seen.* Log "updateTableStatus - Updating table tbl_meg_8 status from disabled to active". `tables/tbl_meg_8` `status
active`, `mergedInto tbl_meg_7`. `floor-get` still one tile "7+8". Dialog before the tap: `w14a.png`.

*Evidence.* W14 (on screen, Active, group owes). W14-r2 (API, `server2@`, Reserved, group owes nothing): same.

*Where to look.* `table-updateTableStatus` in [table/table.js](../../backend/src-plattr/functions/table/table.js) (around :1414) writes the status with no merge check.

### QW-10 · P2 · A round added to a paid, not-yet-cleared table is accepted

*Scene.* Table 9 has paid ₹66 and is putting on coats. The captain punches a Chicken 65 on it. It goes to the kitchen
and onto the paid sitting. The till's tile flips from "settled" to "ordered ₹280", so the money isn't lost, but the
spec says a settled sitting takes no new checkout.

*Steps from a clean seed.* `node floorstate.mjs 9 settled`. Waiter app: `table-tbl_meg_9` → `table-add-dishes` →
`add-dishes-dish-mi_chicken65` → `add-dishes-send`. `… 9 seen`.

*Expected.* Refused (FL-S14; FL Decision 2026-09-17 "a settled sitting stops accepting new users and checkouts").

*Seen.* "Updating existing order ajrOMKpvo87xwySMAlRm … with new cart". Same session, carts `[PENDING, PENDING]`,
Chicken 65 unbilled on the paid sitting. Tile 9 "ordered" ₹280. No message on screen.

*Evidence.* W23 (on screen). W23-r2 (API, `server2@`, table 11, Gulab Jamun): accepted.

*Where to look.* `acceptsNewGuests` in [domain/floor.ts:263](../../backend/src-plattr/functions/domain/floor.ts) has no caller.

### QW-11 · P2 · "Send to kitchen" on a round someone else already sent says "Failed to confirm order"

*Scene.* Gate on. Two captains see table 12's "TO CONFIRM" card. The other one sends it. Seconds later this captain
long-presses it and taps Send to kitchen: red "Failed to confirm order", and his card still says TO CONFIRM. It did
go; he thinks it didn't, and walks back to the table to re-take the order.

*Steps from a clean seed.* `node floorstate.mjs gate on`, `node floorstate.mjs 12 awaiting`. Open Orders (the card
shows). `cart-updateCartStatus {…, cartIndex:0, newStatus:'PENDING', sessionId:<server2@>}`. Then on screen long-press
`order-cart-<cartId>` → `order-confirm-cart`. `gate off` after.

*Expected.* Harmless (already sent), or refused naming who sent it (TESTING "refusals name the thing").

*Seen.* Log "Error in updateCartStatus: Error: Invalid status transition from PENDING to PENDING" (a plain Error, so
`internal`). Red "Failed to confirm order" (`w41.png`). Cart PENDING, unchanged.

*Evidence.* W41 (table 12, sent by `server2@`). W41-r2 (table 6, the captain's own round, sent by `manager@`): same,
and the card still read TO CONFIRM after the failure (`w41b.png`). The vague snackbar is TD-084; the refusal of an
already-done confirm is not.

*Where to look.* [cart/updateCartStatus.js:131](../../backend/src-plattr/functions/cart/updateCartStatus.js).

## Notes (not filed as bugs)

- **W27, double Send.** Four activations of `add-dishes-send` inside one JS task (two pointer sequences and two
  `element.click()`) sent two rounds (two Paneer 65, ₹240 each). Two taps 60 ms apart sent one. `_send` has no
  in-flight guard, but at human speed the rebuild disables the button in time. Not reproduced, so a NOTE.
- **W26, orphan lines.** A staff line left in the cart by an interrupted Send ships with the next Send, and the round
  pane never shows it (table 11: naan + Chicken 65 in one round for one tapped dish). Needs Shaurya's call; same
  mechanism as QW-5.
- **W15.** A captain may disable a table with ₹340 on it. The till keeps the tile, the captain's Add dishes is then
  refused ("Table is disabled"), and the guest can still check out from the QR.
- **W17.** Active on a vacant table: the waiter reads ACTIVE, the till "free". Two words for one table (near TD-042/044).
- **W22.** A captain's round on a billed table is accepted, and the till tile carries both (unpaid 6600, onTable 9000: FL-S20). OR-S20
  says refuse. Spec conflict, recorded only.
- **W38.** Serving a round of a table the till already freed is allowed.
- **W57.** An OTP can be minted on a merged child, and a later Vacant still detaches it (FL R6 counts an OTP in
  flight as "not vacant").
- **W62.** `kitchen@meg.test` can log in to the waiter app (role KITCHEN). Screen part not run.
- **W64.** With the captain's staff session expired, the Orders poll (`order-getActiveOrdersForRestaurant`) still
  answers, while `table-openTable` refuses "Session has expired". The Orders tab looks alive while Add dishes fails.
  A new login revives the same session doc. Screen part not run.
- **W48.** server@ and server2@ see the same tables. Table 1 (assigned to srv_meg_1) has no checked-out order in the
  seed, so the assignment filter wasn't exercised.
- **TD-046 is worse at phone width than its row says.** At 430 px every Orders card reads "Table tbl_me…" and every
  Tables tile "Table t…" (`w41.png`, `w08.png`). The captain can't tell which table a card is for without opening it.
- **Tooling: the card identifiers go stale.** After a poll or a tab switch reorders the Orders list, a card's
  `flt-semantics-identifier` can be another card's (`order-cart-…tbl_meg_11…` on table 6's card; one id on two cards).
  A reload fixes it. In W37 the id looked up for table 10's card read table 7's; the log proved the tap hit table 10.
  Added to FRONTEND_TESTING §8.
- **Flake.** The headless tab went blank once (three "operation timed out", recovered by `goto`), and later stopped
  answering and crashed ("Server crashed twice in a row"). After that `ab preflight` refused for a while (personal
  Chrome 4.4 GB), so W15–W17, W22, W56–W64 ran through the API. Those rows say `"via":"api"`.
- **Environment.** A stray client polled `order-getActiveCartsForKitchen` with a dead session all run
  ("Invalid or inactive session"); same as runs 3 and 4. The functions emulator reloaded its source once mid-run
  (someone rebuilt `lib/`); no cell straddled it.
- No `table-view-order`, and a fully served order has no card, so its detail and Mark Paid can't be reached from
  Orders. Known since 2026-09-08, and still no TD row.

## Suggestions from the captain's chair

- Say "7", not "Table tbl_meg_7", so it fits on a phone card. Right now every card and tile is "Table t…".
- Refuse Cancel Order and Mark Paid while a round is still at the kitchen, or at least say "the naan on table 9 is
  still READY".
- After Send, say "Sent to the kitchen: 1 Chicken 65". After a refusal, say what is still in the round and what the
  kitchen already has.
- When someone else already sent or served a round, say "Already sent by Server Two", in grey, not a red failure.
- Show the table's money state on the Tables tab (ordered / billed / paid). "ACTIVE" is the same word for a table
  that owes ₹309 and one that has paid.
- Add a logout. There is none, so a second captain can't use the same phone, and a kitchen login gets the waiter app.

## Coverage grid

| cell | control × state | verdict | finding |
|---|---|---|---|
| W01 | Cancel Order × unbilled | FAIL | QW-1 |
| W02 | Cancel Order × billed | FAIL | QW-1 |
| W03 | Cancel Order × paid | FAIL | QW-1 |
| W04 | Cancel Order × awaiting | not run | |
| W05 | Mark Paid × billed | PASS (human lens: "Mark Paid" while ₹66 owed) | |
| W06 | Mark Paid × READY | FAIL | QW-4 |
| W07 | Mark Paid × already completed | not run | |
| W08–W10 | Vacant × unbilled / billed / part-paid | PASS | |
| W11 | Vacant × settled | PASS | |
| W12 | Vacant × merged child, group owes | PASS | |
| W13 | Vacant × merged child, group owes nothing | PASS | |
| W14 | Active × merged child | FAIL | QW-9 |
| W15 | Disabled × ordered | NOTE (API) | |
| W16 | Reserved × ordered | PASS (API) | |
| W17 | Active × vacant | NOTE (API) | |
| W18 | Add dishes × vacant | FAIL | QW-3 |
| W19 | Add dishes × seated | PASS | |
| W20 | Add dishes × ordered | PASS | |
| W21 | Add dishes × guest session expired | FAIL | QW-2 |
| W22 | Add dishes × billed | NOTE (API) | |
| W23 | Add dishes × paid, not cleared | FAIL | QW-10 |
| W24 | Add dishes × gate on | FAIL | QW-6 |
| W25 | Add dishes × guest's unsent cart | PASS | |
| W26 | Add dishes × orphan staff lines | NOTE | (QW-5 mechanism) |
| W27 | Send × double tap | NOTE (not reproduced) | |
| W28, W29 | covers 0/100; back out | not run (blocked by QW-3) | |
| W30 | Send × dish went out of stock | FAIL | QW-5 |
| W31 | Add dishes on a merged child | PASS (hidden) | |
| W32, W33 | Add dishes × reserved; × merged parent | not run | |
| W34 | serve × READY | not run (sanity run 3) | |
| W35 | serve × PENDING | not run (TD-084) | |
| W36 | serve × stale, served by server2 | PASS | |
| W37 | serve × stale, cart cancelled | PASS (TD-084 wording) | |
| W38 | serve × table already cleared | NOTE | |
| W39 | confirm × awaiting | PASS | |
| W40 | "Not yet" × awaiting | PASS | |
| W41 | confirm × stale, already sent | FAIL | QW-11 |
| W42 | confirm × stale, cancelled | PASS (TD-084 wording) | |
| W43 | reject a guest round | NOTBUILT | |
| W44 | Pending sub-tab | PASS | |
| W45 | Ready sub-tab after kitchen READY | PASS (poll-bound) | |
| W46 | Orders × cleared with a round live | FAIL | QW-7 |
| W47 | My Orders vs All Orders | not run | |
| W48 | server2's view | NOTE (API) | |
| W49 | order detail | PASS | |
| W50 | detail Mark Served × READY | not run | |
| W51 | detail Mark Served × PENDING | PASS (disabled) | |
| W52 | item tick × same dish, other round PENDING | FAIL | QW-8 |
| W53 | item tick × same dish, both READY | FAIL | QW-8 |
| W54 | Mark Paid, then Back | PASS | |
| W55 | table dialog × billed / settled | not run | |
| W56 | Refresh OTP × seated | NOTE (API) | |
| W57 | Refresh OTP × merged child | NOTE (API) | |
| W58 | View order | NOTBUILT | |
| W59 | menu switch × guest cart holds the dish | PASS (API) | |
| W60 | menu switch as SERVER | PASS (API) | |
| W61 | wrong password | PASS (API; the form wasn't reachable, W65) | |
| W62 | kitchen@ login | NOTE (API) | |
| W63 | Vacant as MANAGER × owes | PASS (API) | |
| W64 | staff session expired | NOTE (API) | |
| W65 | reload / browser restart | PASS | |

## For the observer

- New `floorstate.mjs` states (each tested on a spare table before use): `preparing ready served cartcancelled
  ordercancelled samedish samedish2 awaiting clearedlive merged mergedowes staffopen orphan guestdraft staffexpired`,
  plus `gate on|off` (masks the leaf `ordering.requireWaiterConfirmation` only; Meghana's parcels survive) and
  `<n> seen` (the till tile, each draft's `billing-preview`, and the kitchen and waiter reads for one table).
- The gate is **off**, and `mi_crab_roast`, `mi_qubani` and `mi_butter_naan` are available again. Tables 6–12 are left
  in their last states for re-reading; `floorstate.mjs <n> reset` or a `--clean` re-import clears them.
- None of the findings has a TECH_DEBT row yet.

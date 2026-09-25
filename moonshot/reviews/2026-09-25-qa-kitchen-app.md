# QA exploration: kitchen app, 2026-09-25

Screen exploration of the kitchen app ([platter_kitchen](../../frontend/src-platter-apps/apps/platter_kitchen/lib/)), per
[AGENT_QA.md](../../AGENT_QA.md) §2 and §5–§7, working through the [grid](2026-09-25-grid-kitchen-app.md) (42 cells)
risk first. One Opus driver with one headless gstack tab; the parent session observes. Trajectory:
[test/e2e/results/qa-kitchen-app-2026-09-25.jsonl](../../backend/src-plattr/functions/test/e2e/results/qa-kitchen-app-2026-09-25.jsonl)
(gitignored, local only: one line per cell, plus one per second-scenario repro, marked `repro_of`).

Stack: slot 0 (Firestore `:8080`, functions `:5002`, log `backend/flutter-app-logs/emulator.log`), because the kitchen
app is hardcoded to `:5002`. MockData7 re-imported `--clean --refresh-timestamps` at the start (not rebuilt: the seed
JSON has someone else's uncommitted edits). Kitchen app via `run_app.sh kitchen` (`:5052`), viewport 1280×800 (a
kitchen tablet) and 430×900 (a phone). Restaurant `res_meghana`, tables 6–12, P1, P2, login `kitchen@meg.test`. Every
starting state was seeded through real endpoints with
[qa/floorstate.mjs](../../backend/src-plattr/functions/test/e2e/qa/floorstate.mjs), and every verdict cites a
read-back (`floorstate.mjs <n> seen` / `dump`, the kitchen read itself, or `lines` / `printJobs`). Screenshots are in
the driver's scratchpad (`k*.png`, named by cell). About 140 browser commands of the 250 budget.

## Result

| verdict | cells |
|---|---|
| FAIL | 8: K15, K23, K24, K26, K29, K35, K38, K41 |
| NOTE | 5: K10, K11, K16, K19, K32 |
| PASS | 25 (one extra cell, K24b, added during the run) |
| NOTBUILT | 1: K39 (History) |
| not run | 3: K17 (known QW-1/QW-4), K20 (known TD-046), K31 (QW-1 domain) |

Every FAIL was reproduced in a second scenario with one thing changed before it was logged (AGENT_QA §7). The FAILs
are **7 findings: 2 P1, 4 P2, 1 P3**. No money was wrong on any screen; the kitchen app shows no money.

What held: the waiter gate hides a guest round until it's confirmed, then shows it (K03, K04, KT-S4). A second round
gets its own card with only its own dishes (K07, KT-S2). Quantity 3, the same dish added twice, and a variant with an
add-on read right at tablet width (K21, K22, K23's variant half). Mark Ready moves the whole round to READY at once,
and a double tap sends one call (K12, K28). A round the manager cancels, or a captain serves, leaves on the next poll
(K13, K14). A waiter's login is refused by name (K34). A reload keeps the login (K36), and logout stops polling (K37).
The round-level note from the guest's checkout ("peanut allergy") shows in amber (K24b).

## Findings

### QK-1 · P1 · A dish note from the captain ("no onion") never reaches the kitchen screen

*Scene.* 20:30, table 9. The guest is allergic to onion. The captain opens Add dishes, adds a Butter Naan and types
"no onion" in the dish's note box, then Send. The kitchen card reads "1x Butter Naan" and nothing else. The detail
dialog says the same. The cook makes it the usual way.

*Steps from a clean seed.* `node floorstate.mjs 9 note` (what Add dishes sends: `table-openTable` as `server@`, then
`cart-addItemToCart {…, menuItemId:'mi_butter_naan', note:'no onion', addedBy:'staff:srv_meg_1'}` and
`cart-checkoutCart {…, addedBy}`). Log in to the kitchen app as `kitchen@meg.test`. Read the table 9 card, then tap
`kitchen-cart-<orderId>_0`.

*Expected.* "no onion" on the card and in the detail. TD-048 was closed on 2026-09-23 by freezing the note on the line
and adding the captain's note dialog, with "KT unchanged"; SPEC_KT R8 says the kitchen screen is the true view of the
round, and KT-S13 prints the note as `! no onion`.

*Seen.* Card "tbl_meg_9 now 1x Butter Naan #0 PENDING". Dialog "Butter Naan x1 | Mark Ready" (`k24_dialog.png`).
Database: the kitchen read (`order-getActiveCartsForKitchen`) returns the item with `note: "no onion"`; the line doc
`res_meghana_tbl_meg_7_8ae8e606_1` has `note: "no onion"` (first seeding on table 7).

*Evidence.* K24 (table 9, captain's round, plain dish). K23 (one thing changed: a guest round by API, Chicken Biryani
Family + Extra Raita with the note "less spicy", table 11): variant and add-on show, "less spicy" doesn't
(`k23_dialog.png`; kitchen read `note: "less spicy"`). The round-level note (checkout `notes`, the one the guest app
sends) does show (K24b), so the fixer can see both paths side by side.

*Where to look.* [kitchen_repository.dart:268-269](../../frontend/src-platter-apps/apps/platter_kitchen/lib/core/kitchen_repository.dart)
sets `itemNote: null` for every item; the card and dialog already render `itemNote` when it's set.

### QK-2 · P1 · When the kitchen's login expires, the screen freezes on its last tickets and says nothing (TD-051, worse than its row)

*Scene.* The kitchen tablet was logged in at 10:30. At 22:30 its 12-hour staff session expires in the middle of
dinner. The screen keeps showing the tickets it had. Table 12 orders three Chicken 65: no card ever appears, while an
old round that no longer exists stays up. Mark Ready says "Failed to mark cart as ready. Please try again." Nothing
tells the cook to log in again. TD-051's row assumes the screen "shows its session-expired state"; it doesn't.

*Steps from a clean seed.* Kitchen app logged in as `kitchen@meg.test`, a few rounds on screen. Get the session id
from `server-serverLogin` (it returns the same doc the app holds) and PATCH `sessions/<id>.expiresAt` to a minute ago
(as `floorstate.mjs staffexpired` does for `server@`). `node floorstate.mjs 12 qty3`. Wait 30 s (one poll). Then tap a
card → `kitchen-mark-ready`. Afterwards `server-serverLogin` as kitchen@ revives the same doc.

*Expected.* "Session expired. Reconnect to continue." with Reconnect → login, polling stopped
([kitchen_live_provider.dart:113](../../frontend/src-platter-apps/apps/platter_kitchen/lib/state/kitchen_live_provider.dart);
the view exists in [live_orders_screen.dart:160](../../frontend/src-platter-apps/apps/platter_kitchen/lib/pages/live/live_orders_screen.dart)).

*Seen.* No message. Console on every poll: "[getActiveCartsForKitchen] Session has expired" → "Exception: Session has
expired" → "Failed to fetch active carts" (the transient-error path, which keeps the old list). The new round
`orders/VKTtI5r8HzS4aImMxV6Z` (3x Chicken 65 on 12) never appeared, while 12 still showed "1x Butter Naan READY", a
round that no longer existed in the database. Mark Ready: log "HttpsError: Session has expired", app "Failed to mark
cart ready", dialog stays open (`k35_expired.png`, `k35b_expired.png`). After the revive the next poll drew the new
round, with no word that anything had been missed.

*Evidence.* K35 (tablet width, table 12's new round). K35-r2 (one thing changed: phone width and another round, table
10 Chicken Biryani `tYQBYXOwlcOqANDh5gHm`): same freeze; 10 still showed an empty card for a round that was gone. (A
first repro attempt set the session's `status` to `inactive`; nothing in the product writes that, so it was
discarded: `K35-r2-void` in the trajectory.)

*Where to look.* The callable error arrives as `error.status: FAILED_PRECONDITION` with the code under
`error.details.data.code`; `DioClient._extractErrorDetails`
([dio_client.dart:108](../../frontend/src-platter-apps/modules/platter_core/lib/src/network/dio_client.dart)) reads
only `error.code`, so the kitchen's `_isSessionExpiryCode` (`kitchen_repository.dart:384`) never matches.

### QK-3 · P2 · A round the captain ticks served dish by dish stays on the kitchen screen as an empty READY ticket

*Scene.* Table 8's naan is READY. The captain opens the order and ticks the naan served (the checkbox, not the round's
Mark Served). The naan leaves the kitchen card, but the card stays: "tbl_meg_8 #0 READY" with no dishes, for good. At
a busy pass the cook sees a READY ticket and looks for food that has already gone.

*Steps from a clean seed.* `node floorstate.mjs 8 ready`. `server-markItemServed {restaurantId, orderId,
menuItemId:'mi_butter_naan', cartItemId:1, sessionId:<server2@>}` (what the waiter detail's checkbox sends). Kitchen
app: wait a poll or reload.

*Expected.* The card leaves once nothing in it is left to cook or carry (the kitchen read drops SERVED items and SERVED
carts, [getActiveCartsForKitchen.js:211-230](../../backend/src-plattr/functions/orders/getActiveCartsForKitchen.js)).

*Seen.* Card `kitchen-cart-nzJI2Vmgou81mj5YMHS5_0` "tbl_meg_8 now #0 READY", no dish lines (`k15_empty.png`; below
the fold at 1280×800). `orders/nzJI2Vmgou81mj5YMHS5` cart `READY`, items `[SERVED]`. The waiter read keeps the READY
cart too.

*Evidence.* K15 (table 8, one naan, `server2@`). K15-r2 (one thing changed: table 10, two dishes, Chicken 65 + Gulab
Jamun, both ticked by `server@`): empty READY card, `orders/ibLSD7NaZ1h2Nf8umVxZ` cart READY, items `[SERVED, SERVED]`.

*Where to look.* [serverMarkItemServed.js](../../backend/src-plattr/functions/orders/serverMarkItemServed.js) never
moves the cart when its last item is served.

### QK-4 · P2 · A dish voided at the approvals door stays on the kitchen screen; only the paper hears about it

*Scene.* 21:40, table 6 cancels its Butter Naan. The manager voids the line with a PIN. The bill drops it, and a cancel
ticket is queued for the kitchen printer. The kitchen screen still says "1x Butter Naan PENDING", so a kitchen that
works off the screen (SPEC_KT R8: "a screen and no paper" is allowed) cooks it.

*Steps from a clean seed.* `node floorstate.mjs 6 linevoid` (`approvals-apply {action:'void', lineId, reason:'other',
pin:'1234'}` as `manager@`). Kitchen app: read the table 6 card and its detail.

*Expected.* The voided dish struck through or gone (KT-S11/S12: "Without this the kitchen serves food for a table that
left"; R8 "the screen … carries status, timers and voids live").

*Seen.* Card "tbl_meg_6 1x Butter Naan PENDING"; dialog "Butter Naan x1 | Mark Ready". Line
`res_meghana_tbl_meg_6_07b2389d_1` `countsTowardTotal: false`, `void` set; `printJobs/cancel:res_meghana_tbl_meg_6_07b2389d:kitchen:…_v1`
queued; the order's cart item unchanged.

*Evidence.* K26 (table 6, manager@). K26-r2 (one thing changed: table 10's round-2 Gulab Jamun, voided by `till@`, note
"guest changed mind"): card unchanged. P2, not P1, because no screen can void a line yet (TD-074); today only the ST
endpoint reaches this, but it's the door the till's void will use.

*Where to look.* The ST void in [app/approvals.ts](../../backend/src-plattr/functions/app/approvals.ts) writes the line
and the cancel job, not the order's cart item that the kitchen read renders (the app model already has `isVoided`,
never set).

### QK-5 · P2 · Mark Ready on a round cancelled a moment ago says "may already be ready, served, or cancelled"

*Scene.* The cook has table 9's ticket open. The manager cancels the round ("guest left"). The cook taps Mark Ready and
reads "Cannot mark as ready. The cart may already be ready, served, or cancelled." The dialog stays open with Mark
Ready still live, while the card behind it has already left the list. Nothing says "cancelled, stop cooking".

*Steps from a clean seed.* `node floorstate.mjs 9 ordered`. Kitchen app: tap table 9's card. Then
`cart-updateCartStatus {…, cartIndex:0, newStatus:'CANCELLED', notes:'guest left', sessionId:<manager@>}`. Tap
`kitchen-mark-ready`.

*Expected.* Refused with a reason that names the cancel (TESTING "Refusals are behaviour too"); the backend already
says it: "Invalid status transition from CANCELLED to READY".

*Seen.* The snackbar above (`k29_stale.png`); log "Error in updateCartStatus: … from CANCELLED to READY"; cart stays
CANCELLED.

*Evidence.* K29 (PENDING round, manager@). K29-r2 (one thing changed: table 7 COOKING, cancelled by `till@`, "wrong
table"): same log twice, dialog still offering Mark Ready over an empty slot (`k29r2_stale.png`). K30 shows the same
text is fine when another tablet already marked it READY; the cancel is the case that matters.

*Where to look.* [cart_detail_dialog.dart:63-72](../../frontend/src-platter-apps/apps/platter_kitchen/lib/widgets/cart_detail_dialog.dart)
replaces the server's message with a fixed one.

### QK-6 · P2 · The category filter in the app bar filters nothing

*Scene.* The bar has its own tablet and picks "bar" in the app bar. Every food ticket stays on screen. The bartender
can Mark Ready a food round (Mark Ready is the whole round), and the captain collects a dish that isn't cooked.

*Steps from a clean seed.* `node floorstate.mjs 6 ordered`, and table 7: guest orders 2x `mi_kingfisher`. Kitchen app:
tap the "All" dropdown (no id; `ab snap`) → "bar", then → "kitchen".

*Expected.* Only that station's rounds, or no such control.

*Seen.* Console "Category filter changed to: bar"; all nine cards stay, food included (`k38_bar.png`). With "kitchen",
the "2x Kingfisher Premium (650 ml)" card stays. A reload resets the choice to All.

*Evidence.* K38 ("bar", food rounds). K38-r2 (one thing changed: "kitchen", a beer round).

*Where to look.* `selectedCategory` reaches [live_orders_screen.dart:33-37](../../frontend/src-platter-apps/apps/platter_kitchen/lib/pages/live/live_orders_screen.dart)
and is never read.

### QK-7 · P3 · On a phone-width screen the card cuts dish names and add-ons to one line

*Scene.* A small kitchen runs the app on a phone. Table 11's biryani card reads "Chicken Dum …" and "Family (serves
3), ". The "+ Extra Raita" is gone, so the plate goes out without it unless the cook opens the card.

*Steps from a clean seed.* `node floorstate.mjs 11 variant`. Kitchen app at 430×900.

*Expected.* Name, variant and add-ons readable on the card (KT-S13 for paper: "never truncate"; R8).

*Seen.* `k41_phone.png`: "Chicken Dum …", "Family (serves 3), ", "Gulab Jamun …", "Coastal Crab …". The detail dialog
shows everything.

*Evidence.* K41 (Chicken Biryani + Extra Raita). K41-r2 (one thing changed: Mutton Biryani Single ×2 + Boiled Egg,
table 12): "Single, + Boiled Eg" (`k41r2_phone.png`). Not TD-088 (that row is the header's sideways overflow).

*Where to look.* `maxLines: 1` on the name and modifiers in [active_cart_card.dart:126,136](../../frontend/src-platter-apps/apps/platter_kitchen/lib/widgets/active_cart_card.dart).

## Notes (not filed as bugs)

- **K10, "This tablet prints" on the web build.** The toggle is live in a browser and starts the print agent (R12 says
  no browser is behind a printer). It claimed jobs and reported `fail` "station has no address" every 5 s; every job
  stayed `queued`, so nothing was lost. Before that, it retried one job the server refused ("no lines found", a job
  whose lines my table reset had deleted) on every poll and printed nothing else for the station. Only a test reset made
  that job; `floorstate.mjs reset` now deletes the table's print jobs too.
- **K16 / K32.** A round still PENDING when the till clears the table stays on the kitchen screen (TD-082, QW-7), and
  the cook can Mark Ready it for a table that has left. Same root, not worse than the row.
- **K19.** A parcel reads "tbl_meg_p1" in the same pill as a table; nothing says "parcel, pack it". The paper says "P1".
  Raw id is TD-046; the missing parcel marker is a suggestion below.
- **K08.** Two rounds of the same dish give two cards that differ only in the chip (both "#0", TD-086); nothing says
  "round 1" and "round 2".
- **At 1280×800 only eight cards fit**, and the second row's status chips (PENDING / READY) are below the fold
  (`k15_empty.png`). READY rounds stay until a captain serves them, so they fill the first screen at a busy pass.
- **The app bar overflows** ("A RenderFlex overflowed by 178 pixels on the right", toolbar trailing row) at both widths.
- **Logout makes no backend call**; the staff session doc stays active.
- **Tooling.** The card identifiers go stale after a poll reorders the grid (`kitchen-cart-BAAL…_0` sat on P2's card),
  as FRONTEND_TESTING §8 already says for Flutter lists; reload before clicking by id. The functions emulator reloaded
  its source once mid-run (someone rebuilt `lib/`); no cell straddled it. A stray client polls the kitchen read with a
  dead session all run ("Invalid or inactive session"), as in runs 3 and 4.

## Suggestions from the cook's chair

- Show the dish note under the dish, in the same amber as the round note, and in bold on the phone layout.
- A new ticket should announce itself: a sound or a highlight for the first 30 s. Today a card slips in silently on the
  next 30 s poll.
- Say "7" or "P1 · parcel", not "tbl_meg_7". A parcel needs to look different: it gets packed, not plated.
- Put the status chip at the top of the card and show READY rounds in a separate strip, so the pass isn't hidden below
  the fold.
- When a round is cancelled, grey the card out with "CANCELLED · guest left" for a minute rather than making it vanish
  on the next poll.
- Either make the category filter work (by the frozen station on the line, SPEC_KT R9) or remove it.
- A round number on each card ("#17-2"), so the cook can call out a ticket.

## Coverage grid

| cell | control × state | verdict | finding |
|---|---|---|---|
| K01 | Live list × guest round PENDING (P1) | PASS | |
| K02 | Live list × captain round | PASS | |
| K03 | Live list × AWAITING (gate on) | PASS (hidden) | |
| K04 | Live list × confirmed | PASS | |
| K05 | Live list × parcel P1 | PASS (appears, K01); marker NOTE (K19) | |
| K06 | Live list × merged child's guest | PASS (TD-080) | |
| K07 | Live list × two rounds | PASS | |
| K08 | Live list × same dish in two rounds | PASS (human lens) | |
| K09 | Live list × guest session expired | PASS | |
| K10 | print toggle on the web | NOTE | |
| K11 | checkout → card latency | NOTE (≤30 s poll) | |
| K12 | Mark Ready × PENDING | PASS | |
| K13 | Live list × served | PASS | |
| K14 | Live list × round cancelled | PASS | |
| K15 | Live list × every dish ticked served | FAIL | QK-3 |
| K16 | Live list × cleared at the till | NOTE (TD-082) | |
| K17 | Live list × order cancelled / completed | not run (QW-1, QW-4) | |
| K18 | card × PREPARING | PASS | |
| K19 | label × parcel vs table at 430 | NOTE | |
| K20 | detail header | not run (TD-046) | |
| K21 | quantity 3 | PASS | |
| K22 | same dish twice in one round | PASS | |
| K23 | variant + add-on + dish note | FAIL (note) | QK-1 |
| K24 | captain's dish note | FAIL | QK-1 |
| K24b | round note at checkout | PASS | |
| K25 | six dishes | PASS | |
| K26 | line voided | FAIL | QK-4 |
| K27 | Mark Ready × READY | PASS (disabled) | |
| K28 | Mark Ready × double tap | PASS | |
| K29 | Mark Ready × cancelled meanwhile | FAIL | QK-5 |
| K30 | Mark Ready × another tablet marked it | PASS | |
| K31 | Mark Ready × order cancelled by a captain | not run | |
| K32 | Mark Ready × table cleared | NOTE | |
| K33 | login wrong password | PASS | |
| K34 | login as server@ | PASS | |
| K35 | staff session expired | FAIL | QK-2 |
| K36 | reload | PASS | |
| K37 | logout | PASS | |
| K38 | category filter | FAIL | QK-6 |
| K39 | History | NOTBUILT | |
| K40 | nothing live | PASS | |
| K41 | 430 × 900 | FAIL | QK-7 |
| K42 | card order | PASS (FIFO) | |

## For the observer

- New `floorstate.mjs` states, each tried on a spare table before use: `note qty3 tworounds variant biground linevoid
  confirmed mergedchild`. `reset` now also deletes the table's print jobs.
- Left as found: tables 6–12, P1, P2 reset to free; the gate is **off**; the slot-0 emulator is still running; the
  kitchen app server and the browser are stopped. `kitchen@meg.test`'s session doc was patched during K35 and revived by
  a real `server-serverLogin`; its `status` is `active`.
- None of the findings has a TECH_DEBT row yet.

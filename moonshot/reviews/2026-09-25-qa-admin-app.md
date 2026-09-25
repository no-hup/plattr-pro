# QA exploration: admin app on screen, 2026-09-25

Screen exploration of the admin app ([platter_admin](../../frontend/src-platter-apps/apps/platter_admin/lib/)) per
[AGENT_QA.md](../../AGENT_QA.md) §5–§7, working through the [grid](2026-09-25-grid-admin-app.md) (60 cells) after the
[API-only pass](2026-09-25-qa-admin-guest-api-pass.md). First job: confirm on screen the D6 fixes (TD-106, TD-107,
TD-110, TD-132), then the screen halves of the open rows (TD-108, 109, 111–118), then the rest of the grid.
One agent as driver and observer. The finder never fixed anything.

- **Stack.** Slot 0 (Firestore `:8080`, functions `:5002`, log `backend/flutter-app-logs/emulator.log`), because the
  admin app is hardcoded to `:5002`. MockData7 re-imported `--clean --refresh-timestamps` at the start, once mid-run
  (after the menu, offer and staff edits) and at the end. Admin app via `run_app.sh admin` (`:5053`), headless gstack,
  viewport 1280×900, then 1280×1600 (Flutter lists only put on-screen rows in the accessibility tree).
  Logins `admin@meg.test`, `manager@meg.test`, `admin@pb.test` / 1234.
- **Read-backs.** Every verdict cites a document or another app's read: the dish/add-on/portion/offer/table/staff doc,
  the guest menu (`menu-fetchMenu-fetchMenu`), the waiter/admin menu (`menu-getRestaurantMenu`), and money through the
  real guest path (seat → `cart-addItemToCart` → `cart-checkoutCart` → `billing-preview`). States through
  [floorstate.mjs](../../backend/src-plattr/functions/test/e2e/qa/floorstate.mjs). Bill = food × 1.05 × 1.05, rounded.
- **Trajectory.** [results/qa-admin-app-2026-09-25.jsonl](../../backend/src-plattr/functions/test/e2e/results/qa-admin-app-2026-09-25.jsonl)
  (gitignored, local: 62 hops; a second scenario carries `repro_of`). Screenshots in the session scratchpad.
- **Ids.** Findings are QA2-n (QA-n is the API pass).

## Result

| verdict | count | cells |
|---|---|---|
| PASS | 23 | A01 A03 A04 A07 A08 A10 A11 A17 A18 A19 A20 A23 A30 A38 A39 A46 A50 A52 A54 A55 A56 A59 A60 |
| FAIL | 18 | A02 A05 A12 A13 A14 A16 A21 A22 A24 A28 A31 A40 A41 A42 A49 A51 A53 A58 |
| NOTE | 4 | A15 A26 A43 A44 |
| BYPASSED | 5 | A32 A33 A34 A35 A37: the Settings tab can't load (A31), so no switch there is reachable |
| NOT BUILT | 2 | A09 (respectParentDiscount control), A36 (tax, service charge, approvals, tenders in Settings) |
| not run | 8 | A06 A25 A27 A29 A45 A47 A48 A57 (API pass covered A06, A45, A47 as NOTEs) |

Plus four TD-132 flows (all PASS) and two cells found on the way (stale add-on price, subcategory parent: both FAIL).

**Confirmed fixed on screen.** TD-106 (a text-only save sends `meta` alone; add-ons stay ids through two saves; Family +
Raita still bills ₹573). TD-107 (Raita ₹40 → ₹50 "Change all 3" bills ₹584 and ₹425 on two dishes; Boiled Egg ₹35
"Only Mutton Biryani" makes a copy, Chicken keeps ₹30; Family ₹260 → ₹280 bills ₹606 and ₹584; the add-on stock switch
refuses Raita everywhere). TD-110 (a description fix from a stale tab leaves an 86'd prawn dish off). TD-132, never
screen-checked before: Add Option "Jumbo (serves 5)" ₹480 bills ₹772 and ₹706 on two dishes and reaches the waiter's
menu; Delete Family "Only Veg Biryani" copies the group and the old option and old group are refused; a new group
"Serve" (guest must pick; Plain ₹0 / With ice cream ₹60) is linked by the dish Save, refuses an add without a pick, and
bills ₹187 with the 15 % inherited; Remove unlinks it (₹131). The "X is on N dishes" question shows "Change all N" and
"Only <dish>" exactly as D6 says.

**Still open on screen.** TD-108 (150 % offer saves; naan order ₹0; till "discount exceeds bill"), TD-109 (Gulab
Jamun at 150 % shows "Price: 0" and bills ₹0), TD-111 (Add Dish closes silently; the dosa is in no list, even the
admin's own), TD-112 (clearing Min Order Value keeps ₹499), TD-113 (switching an owing table on frees it; the card then
reads AVAILABLE with the guest's name), TD-114 (child 8 switched on keeps `mergedInto`), TD-116 (a till switched off on
the Staff screen still issues a ₹66 bill; a dismissed manager keeps changing offers and tables on this screen),
TD-117 (Settings: "Failed to parse response: TypeError: null: type 'Null' is not a subtype of type 'Map<String,
dynamic>'", Retry does the same, Meghana and Pizza Bakery), TD-118 (the "10 % Off Biryani" switch snaps back silently).
TD-115 has no screen half: nothing in the admin app edits approval limits (A36 not built, and Settings can't load); the
hole is the API, and QA2-3 below is its screen cousin.

## Findings

Filed the same day in [TECH_DEBT](../TECH_DEBT.md): QA2-1 TD-137, QA2-2 TD-138, QA2-3 TD-139, QA2-4 TD-140, QA2-5
TD-141, QA2-6 TD-142, QA2-7 TD-143, QA2-8 TD-144, QA2-9 added to TD-111, QA2-10 TD-145, QA2-11 TD-146. Every one was
re-run in a second scenario before it was logged; the A26 date reading had one observed scenario and stays a NOTE.

### QA2-1 · P2 · The dish editor can't open Chicken 65, Andhra Chicken Curry or Gongura Mutton

**Scene.** 19:00 the manager wants Chicken 65 at ₹300. She taps its pencil. In the debug build the screen turns red;
nothing can be edited on that dish, or on the two other spice-4 dishes.

**Steps (clean seed).** Admin app, `admin@meg.test`; Menu; tap `menu-edit-mi_chicken65`. Second: reload, tap
`menu-edit-mi_andhra_chicken`.

**Expected.** The dish editor opens (every other cell on Chicken 65 needs it: A02, A05, A06, A20's human lens).

**Screen.** Red error: "Assertion failed … dropdown.dart:1852 … There should be exactly one item with [DropdownButton]'s
value: 4." **DB.** Seed `meta.spiceLevel: 4` on `mi_chicken65`, `mi_andhra_chicken`, `mi_gongura_mutton` (3 of Meghana's
16 dishes; no other restaurant has spice > 3). The Spice Level dropdown offers 0–3.

**Evidence.** Hops 10, 11. **Second scenario:** Andhra Chicken Curry after a reload, same assertion. **Held.**

P2, not P1: this is a debug-build assertion; a release build skips asserts and was not checked, so there the field may
just show blank. **Where to look:** [dish_editor_dialog.dart](../../frontend/src-platter-apps/apps/platter_admin/lib/pages/menu/editors/dish_editor_dialog.dart) ~:406 (items 0–3) against the seed's 4.

### QA2-2 · P1 · A refused save on the Menu tab says nothing: an expired manager thinks she 86'd the naan

**Scene.** The manager's admin tab has been open since the morning. At 21:00 (12 h later, TD-051) the naan runs out;
she flips its switch. The switch stays on, nothing is said, and guests keep ordering naan. Earlier she fixed Paneer 65's
description; the dialog closed as if saved.

**Steps (clean seed).** Log in `manager@meg.test`. Expire that login: `sessions/<its id>.expiresAt` = a minute ago
(one session doc per staff member; AGENT_QA §8 "expire only through `expiresAt`"). Menu → edit Paneer 65 → change
Description → `dish-save`. Second: Butter Naan's row switch off.

**Expected.** "Your session has expired" and the login screen (the TD-100 pattern); nothing changes in the DB.

**Screen.** The dialog closes; no message; still on Menu. The naan switch stays on; no message. **DB.** Description
unchanged; `mi_butter_naan.isInStock: true`. Log: `Error in updateMenuItem: HttpsError: Session has expired`, and the
same for `menu-updateMenuItemAvailability`.

**Evidence.** Hops 44, 45. **Second scenario:** the stock switch instead of the dish save. **Held.** The grid (§0)
predicted this for every refused Menu save: the provider stores the error but the screen shows it only when the menu
itself failed to load. **Where to look:** [menu_catalog_screen.dart](../../frontend/src-platter-apps/apps/platter_admin/lib/pages/menu/menu_catalog_screen.dart) ~:44 and the provider's `errorMessage`.

### QA2-3 · P1 · A manager can make themself Admin on the Staff screen, with no audit row

**Scene.** The cashier's `till@` login is a MANAGER. He opens Staff, edits his own card and picks Role "Admin". From
then on he is the owner as far as every "owner only" rule is concerned (SPEC_ST "Who can do what"), and nothing records
that he did it.

**Steps (clean seed).** Log in `manager@meg.test`; Staff; Manager card ⋮ → Edit → Role → Admin → Update.

**Expected.** Refused: roles are the owner's to give. Unspecified in the grid (A51, "record, ask"); the API pass
filed it as a NOTE under QA-11.

**Screen.** Card now reads "Manager · Admin". **DB.** `servers/srv_meg_mgr.role: ADMIN`.

**Evidence.** Hop 60. **Second scenario:** `till@` (another MANAGER) sends the same `admin-updateServer {role:
'ADMIN'}` for itself: accepted, `role: ADMIN`, 0 audit rows naming it (hop 61). **Held.** Same root as TD-115
(`validateAdminSession` lets MANAGER through, the endpoint writes any role). **Where to look:**
[staff_admin.js](../../backend/src-plattr/functions/adminApp/staff_admin.js) `updateServer`.

### QA2-4 · P2 · A dish deleted from the menu still goes through from a guest's cart to the kitchen

**Scene.** 20:30 the manager deletes Butter Naan for good. A guest at table 9 already has one in the cart; he taps
Proceed. The kitchen gets a naan ticket, the bill charges ₹66.

**Steps (clean seed).** `floorstate 9 guestdraft` (a naan in the cart) and `6 ordered` twice; Menu → Butter Naan's bin
→ "Confirm Delete …" → Delete; the table 9 guest checks out.

**Expected.** Table 6's placed naans still bill (they do: ₹143, the PASS half of A14). Table 9's checkout refused,
naming the naan, like an out-of-stock dish (A17: "Cannot checkout. The following items are out of stock: Butter Naan").

**DB.** `menuItems/mi_butter_naan` gone; table 9 checkout accepted, `billing-preview` payable ₹66.

**Evidence.** Hop 53. **Second scenario:** Chicken 65 in table 3's cart, Chicken 65 deleted on screen: checkout
accepted, the kitchen read has the round, payable ₹309 (hop 54). **Held.** No money lost; the kitchen cooks what the
manager took off. The admin order detail then names the line "Unknown Item" (hop 56). **Where to look:**
`validateMenuItemsStock` in [checkoutCart.js](../../backend/src-plattr/functions/cart/checkoutCart.js) :196 checks
stock only `if (doc.exists)`, so a missing dish passes.

### QA2-5 · P2 · The Orders tab shows every time 5½ hours early, and the wrong date after midnight

**Scene.** 00:37 on 26 Sep a late table orders. The owner's Orders tab says "Sep 25, 2026 • 7:07 PM".

**Steps (clean seed).** Any guest checkout (`floorstate <n> ordered`); Orders tab → Refresh.

**Expected.** The time the order was placed, in the restaurant's time (IST).

**Screen.** "Sep 25, 2026 • 7:07 PM" for an order whose `createdAt` is 26 Sep 00:37:36 IST (19:07 UTC). The browser's
zone is Asia/Calcutta. **Evidence.** Hop 55. **Second scenario:** the order detail (another read,
`admin-getOrderDetails`) says "7:05 PM" for the 00:35 order (hop 56). **Held.** Not the emulator: the app parses the
backend's ISO UTC string and formats it without `.toLocal()`, so prod shows it too. **Where to look:**
[orders_api_service.dart](../../frontend/src-platter-apps/apps/platter_admin/lib/pages/orders/orders_api_service.dart)
`createdAtDateTime`.

### QA2-6 · P2 · The order detail's total is always ₹0

**Scene.** The owner opens a ₹1,186 order from the list to check it. The detail header says ₹0.

**Steps (clean seed).** Orders tab → tap the seeded "COMPLETED PAID … ₹1186" order.

**Expected.** The same total as the list card.

**Screen.** Header "₹0 · 2 items"; lines Mutton Biryani ₹666, Coastal Crab Roast ₹620. **Evidence.** Hop 56 (second
order). **First scenario:** the table 9 order the list shows at ₹60 opens at ₹0 (hop 56). **Held.** **Where to
look:** `totalAmount` in [orders_api_service.dart](../../frontend/src-platter-apps/apps/platter_admin/lib/pages/orders/orders_api_service.dart)
~:201 sums `cart.total.finalPayableAmount`, which the carts don't carry.

### QA2-7 · P2 · Operations draws a reserved table as AVAILABLE, and switching it off and on erases the booking

**Scene.** Table 4 is held for an 8 pm booking. The manager's Operations tab shows it green, "AVAILABLE", switch on.
He tidies up by switching it off and on; the booking is gone and the next walk-in is seated there.

**Steps (clean seed).** Operations tab: read card 4 (seeded `reserved`). Second: `floorstate 9 reserved`, Refresh,
read 9; switch 9 off, then on.

**Expected.** Reads RESERVED (FL table states). The switch keeps a booking or refuses (grid A42).

**Screen.** Both read "AVAILABLE" with a live switch. The header counts "Available 9" while 11 cards say AVAILABLE
(the count goes by status, the cards don't). **DB.** 9: `reserved` → `disabled` → `vacant`.

**Evidence.** Hops 29, 30. **Held.** A table in the middle of a scan (11, `holding`) also reads AVAILABLE (A43,
NOTE). **Where to look:** [operations_screen.dart](../../frontend/src-platter-apps/apps/platter_admin/lib/pages/operations/operations_screen.dart)
~:342 knows only DISABLED / OCCUPIED / AVAILABLE.

### QA2-8 · P2 · An offer that has ended is drawn "Active" in green

**Scene.** The manager checks what's running tonight. "Expired Ugadi Offer" says Active. So does "Monsoon 5 % off",
which she ran 1–10 Sep. She thinks guests are getting 5 %; they aren't.

**Steps (clean seed).** Offers tab, read "Expired Ugadi Offer". Second: Create Offer, Percentage, Entire order, 5,
Start 1 Sep, End 10 Sep, Create.

**Expected.** Reads Expired (or the create is refused for dates already past).

**Screen.** Switch on, "Active" in green, both. **DB.** The Monsoon offer saved; it does not fire (naan still ₹66),
so only the list lies. **Evidence.** Hops 18, 23. **Held.** **Where to look:**
[offers_screen.dart](../../frontend/src-platter-apps/apps/platter_admin/lib/pages/offers/offers_screen.dart) ~:275
reads `isActive` only.

### QA2-9 · P2 · A new category is invisible everywhere (TD-111's cause, one level up)

"Dosas" (order 7) and then "Chaats" (order 8) from Categories → Add → Save: both docs stored, neither in the admin's own
category list nor the guest menu; `menus/menu_meg.categoryIds` unchanged (hops 50, 51). A new **subcategory** ("Tandoor"
under Starters) does show. Filed as an addition to TD-111, not a new row: same fix (a new dish or category joins the
active menu).

### QA2-10 · P3 · "Add subcategory" on a category row always pre-selects Biryani

Tapping "+" on the Starters row, then on the Seafood row, opens the dialog with "Parent Category Biryani" (hop 52). A
manager who types "Tandoor" and saves puts it under Biryani. **Held** on two rows. **Where to look:**
[subcategory_editor_dialog.dart](../../frontend/src-platter-apps/apps/platter_admin/lib/pages/menu/editors/subcategory_editor_dialog.dart)
:53 defaults to `categories.first`, and the screen (:131) doesn't pass the row's category.

### QA2-11 · P3 · A dish editor opened within a second of a shared change shows the old add-on price

After "Change all 3" on Raita (₹40 → ₹50) from Chicken Biryani's editor, Done, Cancel, and opening Mutton Biryani's
add-ons at once: Raita reads ₹40 while the record says ₹50 (hop 5). **Second scenario:** Gravy ₹60 → ₹65, same path:
₹60 at once, ₹65 three seconds later (hop 6). **Held**, but only in the reload window: the list reloads after a shared
edit (`takeSharedEdited`), and an editor opened before it lands copies the old list. Nothing is written from the stale
value (a name-only edit sends the name only). **Where to look:** `_openDishDialog` in
[menu_catalog_screen.dart](../../frontend/src-platter-apps/apps/platter_admin/lib/pages/menu/menu_catalog_screen.dart).

## Notes (one scenario, unspecified, or by design)

- **A26, offer dates** (NOTE, ask Shaurya). The editor stores dates without a zone (`2026-09-26T00:00:00.000`) and the
  functions run in UTC, so an offer made "from 26 Sep" did not fire at 00:12 IST on the 26th (hop 20); it starts at
  05:30 IST. By the same reading, "End: 30 Sep" stops at 05:30 IST on the 30th, so the last day's lunch and dinner lose
  it. One observed scenario (the start); the end is from the stored value and `offerEngine.js:37-40`.
- **A15.** Deleting "Desserts" asks "Confirm Delete category …" and deletes it; Gulab Jamun keeps `categoryId:
  mc_desserts`, stays in All Items and in the guest read, with no category to sit under (hop 58).
- **A44.** Capacity `abc` closes the dialog like a save and changes nothing; `-2` is stored (hop 35; the API pass saw the
  same).
- **A43.** Table 11 mid-scan (`holding`) reads AVAILABLE; not switched.
- **A53 amount.** The list shows table 9 as "PAID ₹60"; the till took ₹66 (food before charge and tax). Reports aren't
  built; one note.
- **A60.** Logout → Yes lands on the login form. Browser Back leaves to `about:blank` (the app has no history entry), so
  "Back doesn't return" holds trivially.
- **Stale editor switch.** Prawn Ghee Roast 86'd elsewhere still opened with "In Stock" on (A11). The save no longer
  sends it (TD-110), but the switch misleads.
- **First save sends `meta`.** Seed dishes carry `categoryName: ""`, so the first save of any seeded dish sends the whole
  `meta` even when no text changed (feeds TD-133's window).
- **Variant editor says nothing on success.** The add-on editor confirms "Extra Raita changed on 3 dishes"; the portion
  editor shows no snackbar. The "is on N dishes" dialog doesn't name the dishes.
- **Helper.** After Add Dish, `floorstate`'s plain-dish picker chose the admin-made "Mysore Masala Dosa" (its doc id
  sorts before `mi_*`), and a guest checkout of that invisible dish went through to the kitchen and was refused by the
  till "no tax block: Mysore Masala Dosa" (hop 33): TD-111's second wall, reached by accident. AGENT_QA §8 gotcha added.

## Coverage grid (control × state)

| control | S1 seed | S2 cart | S3 placed | S6 billed/paid | S7 merged | S8 owes+disabled | S9 reserved/holding | S10 live staff | S11 expired | S12 stale tab |
|---|---|---|---|---|---|---|---|---|---|---|
| dish Save (text) | PASS A01 | | | | | | | | FAIL A58 | PASS A11 |
| dish price / discount | PASS A03 A04, FAIL A05 | | PASS A03 | | | | | | | |
| dish editor open | FAIL A02 (spice 4) | | | | | | | | | |
| add-on edit / stock | PASS A07 A19 | | | | | | | | | FAIL QA2-11 |
| portion edit / option / group | PASS A08, TD-132 ×4 | | | | | | | | | |
| Add Dish / category / subcat | FAIL A12 A13, QA2-10 | | | | | | | | | |
| dish delete | | FAIL A14 | PASS A14 | | | | | | | |
| stock switch | | PASS A17 A18 | PASS A17 | | | | | | FAIL A58 | |
| offer create / edit / switch / delete | PASS A20 A23 A30, FAIL A21 A22 A24 A28 | | | | | | | FAIL A49 | | |
| Settings tab | FAIL A31 (2 restaurants) | | | | | | | | | |
| table switch | PASS A38 A39 | | | | FAIL A40 | FAIL A41 | FAIL A42, NOTE A43 | FAIL A49 | | |
| table edit | NOTE A44 | | | | | | | | | |
| staff add / role / PIN / switch | PASS A46 A50 A52, FAIL A51 | | | | | | | FAIL A49 | | |
| orders list / detail / filter | | | | FAIL A53, PASS A54 | | | | | | |
| login / reload / logout | PASS A55 A56 A59 A60 | | | | | | | | | |

## Suggestions from the manager's chair

- Every save should say what happened: "Saved", "Chicken 65 is off on 1 dish", or the refusal in words. Today a refused
  save, a no-op and a real save all look the same: the dialog closes.
- "Extra Raita is on 3 dishes" should name them (Chicken, Mutton, Veg Biryani). "3" makes the manager go and check.
- Offer IDs are typed by hand (`mc_starters`); a category picker would stop a typo offer that saves and never fires.
- The offer list needs Scheduled / Running / Ended, from the dates, not only the switch.
- Operations should show every state a waiter sees (reserved, billed, scanning), and the header counts should match the
  cards.
- A dismissed staff member's sessions should end at the switch, not up to 12 h later (TD-116, TD-051).
- The Orders tab should show the bill the till issued (₹66, paid in cash), not the food total.

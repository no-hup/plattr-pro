# QA: admin and guest grids, API-only pass, 2026-09-25

**What this is.** The headless browser was blocked (personal Chrome over `ab.sh`'s 4 GB limit), so this pass ran only
the cells a backend call can answer: what an endpoint accepts or refuses, what it stores, and what another app's read
returns next. Every call sends **the payload the screen sends**, rebuilt from the Flutter code (the dish editor's
`item.toJson()` after `_submit`, the offer editor's `offerData`, the guest app's `stampCartCall` `addedBy`). Grids:
[admin](2026-09-25-grid-admin-app.md) (60 cells), [guest](2026-09-25-grid-guest-app.md) (49 cells). Rules:
[AGENT_QA.md](../../AGENT_QA.md) §5–§7, [TESTING.md](../../TESTING.md).

- **Environment.** Slot 0 (Firestore `:8080`, functions `:5002`), MockData7 re-imported `--clean --refresh-timestamps`
  before each section (the menus JSON was not rebuilt: it carries someone else's uncommitted edits). `res_meghana`.
  Logins `admin@`, `manager@`, `till@` (MANAGER), `server@`, `kitchen@` `@meg.test` / 1234. Seeds and read-backs through
  [floorstate.mjs](../../backend/src-plattr/functions/test/e2e/qa/floorstate.mjs) (`setState`, `seen`, `act`, `stock`).
- **Trajectory.** [results/qa-api-pass-admin-guest-2026-09-25.jsonl](../../backend/src-plattr/functions/test/e2e/results/qa-api-pass-admin-guest-2026-09-25.jsonl)
  (69 hops, `"via":"api"`; a second scenario carries `"repro_of"`). Hop numbers below point into it.
- **Left behind.** Slot 0 running, MockData7 re-imported clean at the end (every admin edit undone), gate off
  (`ordering` is back to `{takeawayTableIds}` only).
- **Ids.** Admin findings are QA-n. Guest findings start at **QG-2**: QG-1 is already taken by the groups run (TD-080).
- **Bill arithmetic.** Meghana bills food × 1.05 (service) × 1.05 (GST), rounded to the rupee (grid §0).

## Findings

**Needs the screen to confirm what the person sees:** QA-1 (the dialog's add-on list after reload), QA-3 (that the
dialog really is stale), QA-13 (the error text), QG-2 (what "To Pay" and PROCEED say). The money and the stored
documents below are already proven by API.

### QA-1 · P0 · Saving any dish in the admin app breaks its add-ons, and a second save erases them

**Scene.** 18:00, the manager fixes a typo in "Chicken Dum Biryani". From then on no guest and no captain can add Extra
Raita, Boiled Egg or Extra Gravy to it: the add-ons are gone from both menus and the add is refused. At 18:10 she
changes its spice level, and the three add-ons are wiped from the dish for good.

**Steps (clean seed).** `admin@` session. `menu-getRestaurantMenu` (what the Menu tab loads), take `mi_chicken_bir`, build
the dish editor's Save payload (DE `_submit` → MP:282 `item.toJson()`: `addons` are full objects), change only
`meta.description`, send `menu-updateMenuItem {restaurantId, sessionId, menuItemId:'mi_chicken_bir', updateData}`.
Then guest `menu-fetchMenu-fetchMenu {inStock:true}` and, on table 10, `cart-addItemToCart {menuItemId:'mi_chicken_bir',
selectedVariants:{mv_bir_portion:'family'}, selectedAddons:['ma_extra_raita']}`.

**Expected.** Stored `addons` stay ids `["ma_extra_raita","ma_extra_egg","ma_extra_gravy"]`; the guest menu offers
three add-ons; the add succeeds (line ₹620). Source: the readers' shape, MH:180 and AIH:400.

**Stored and read.** `menuItems/mi_chicken_bir.addons` = three objects (`{ma_extra_raita}`, …). Guest menu add-ons `[]`.
Add refused: "Add-on is not offered on this dish." Second save (spice 3 → 2): the admin read had already dropped the
objects, so the payload carried `addons: []` and the doc now holds `[]` (hops 2, 3). Side effect of the same payload:
`nutritionalInfo` carbs/protein/fat stored as 0 (the editor only sends calories).

**Second scenario.** `manager@`, Mutton Biryani, Calories changed instead of Description: stored objects, guest menu
`[]`, **waiter** `menu-getRestaurantMenu` `[]`, add Single + Boiled Egg refused the same way (hop 4). **Held.**

**Where to look.** [menuHelpers.js:180](../../backend/src-plattr/functions/menu/menuHelpers.js) maps `addons` as ids;
the admin writes objects through [menu_catalog_provider.dart:282](../../frontend/src-platter-apps/apps/platter_admin/lib/pages/menu/menu_catalog_provider.dart).

### QA-2 · P0 · Add-on and variant edits in the dish editor change nothing a guest pays or can order

**Scene.** The manager raises Family portion from ₹260 to ₹280 on Chicken Biryani and saves. That night every family
biryani still bills +₹260. He switches Extra Raita out of stock on Mutton Biryani; guests keep ordering raita with Veg
Biryani.

**Steps.** Clean seed. `admin@` saves `mi_chicken_bir` with the editor payload where the Portion variant's `family`
option is `{basePrice:280, finalPrice:280}`. Guest on table 6 adds Chicken Biryani Family, checks out;
`floorstate 6 seen`.

**Expected.** Family is +₹280 everywhere: line ₹600, −₹100 order offer, bill ₹551 (500 × 1.1025 = 551.25).

**Stored and read.** `variants/mv_bir_portion` family still 260; only the dish's own copy says 280; the guest menu shows
260; the line is ₹580 and `billing-preview` payable ₹529 (480 × 1.1025 = 529.2) (hop 5).

**Second scenario.** `manager@`, Mutton Biryani (10 % off, Family inherits), Family 260 → 300. Hand: 378 + 270 = ₹648,
−₹100 = 548, bill ₹604. Stored shared doc still 260, line list ₹680, payable ₹564 (512 × 1.1025 = 564.48) (hop 6).
**Held.**

**Same cause, two more cells.** A07: Chicken Biryani → Extra Raita 40 → 50: `addons/ma_extra_raita` stays ₹40, a Veg
Biryani + Raita line is ₹300, not ₹310 (hop 7). A19: Mutton Biryani → Extra Raita "In Stock" off:
`addons/ma_extra_raita.isInStock` stays true and a guest adds raita to Veg Biryani without a refusal (hop 8; TD-015's
own words, "staff believe switching it off does something"). Both one scenario each; they share A08's cause.

**Where to look.** The editors ([variant_editor_dialog.dart](../../frontend/src-platter-apps/apps/platter_admin/lib/pages/menu/editors/variant_editor_dialog.dart),
[addon_editor_dialog.dart](../../frontend/src-platter-apps/apps/platter_admin/lib/pages/menu/editors/addon_editor_dialog.dart))
write the dish's copy; every reader prices from `variants/` and `addons/` (AIH:316-414).

### QA-3 · P1 · A description fix in the admin app puts a sold-out dish back on sale

**Scene.** 20:00 prawns run out; the captain turns Prawn Ghee Roast off. 20:05 the manager, whose Menu tab loaded at
18:00, fixes a typo in its description. Prawns are back on the guest menu.

**Steps.** Clean seed. `admin@` `menu-getRestaurantMenu` (tab loaded). `server@` `menu-updateMenuItemAvailability
{menuItemId:'mi_prawn_fry', isAvailable:false}` → stored `isInStock:false`. `admin@` saves a description edit built from
the earlier read.

**Expected.** The dish stays out of stock (TD-015 why-column).

**Stored and read.** After the save `isInStock:true`; the guest menu (`inStock:true`) lists it again (hop 9).

**Second scenario.** Chicken 65, 86'd by `kitchen@` instead: same (hop 10). **Held.** The screen run should confirm the
dialog opens from the list loaded at login (grid §0 says no tab refreshes by itself).

**Where to look.** The dish editor sends the whole dish, `isInStock` included (DE:79, MP:282).

### QA-4 · P1 · A dish added in the admin app appears nowhere, and if ordered it can't be billed

**Scene.** The owner adds "Mysore Masala Dosa ₹120" to Breads & Rice. The save succeeds; the dish is not in his own
list, the captain's Add dishes or the guest menu.

**Steps.** Clean seed. `admin@` `menu-addMenuItem` with the dish editor payload (`taxBlockId: null`, "Same as category",
because the Tax group picker is hidden, A16). Read admin and `server@` `menu-getRestaurantMenu` and guest
`menu-fetchMenu-fetchMenu`.

**Expected.** Visible in all three reads (owner's expectation; unspecified).

**Stored and read.** Doc `menuItems/r2wkOuk1yuEZx8u8EpsL` stored; absent from all three reads; `menus/menu_meg.menuItemIds`
does not list it (hop 11). **Second scenario:** `manager@`, Desserts, "Kesari Bath ₹80", no subcategory: same (hop 12).
**Held.**

**The next wall.** A guest who adds the dish by id (only possible by API today) gets through checkout, the kitchen gets
the round, and then the till refuses the **whole** sitting: table 11 with Butter Naan + Kesari Bath → `billing-preview`
"no tax block: Kesari Bath" (hop 13; the same on table 12 with the dosa). No MockData7 restaurant has `tax.assign`, and
the admin app can't set a dish's block, so every admin-made dish is unbillable. TD-038 is closed on the promise of the
picker and `tax.assign`; this is a regression candidate the moment QA-4 is fixed.

**Where to look.** `filterItemsByMenu` in [menuHelpers.js](../../backend/src-plattr/functions/menu/menuHelpers.js): nothing
adds a new dish to the active menu's `menuItemIds`.

### QA-5 · P0 · An offer over 100 % makes food free, and the table can then never be billed

**Scene.** The manager means "15 % off" and types 150. Chicken 65 shows ₹0 on the guest's order; the kitchen cooks it;
the cashier cannot bill the table, even after the offer is deleted.

**Steps.** Clean seed. `admin@` `admin-createOffer` with the editor payload: PERCENTAGE, ORDER, `benefit.value:150`.
Guest on 10 orders Chicken 65; read the order and `floorstate 10 seen`. Then `admin-deleteOffer` and `seen` again.

**Expected.** Unspecified in the grid ("ask"); no real offer is over 100 %, so refused at save.

**Stored and read.** Saved (`bZapQGTPYiiwxgtJEhAC`). Order `priceInfo.finalPrice` 0 (`offerDiscount` 280, offer
`discountAmount` 420). `billing-preview`: "discount exceeds bill". After the delete: still "discount exceeds bill"; the
kitchen read has the round PENDING (hops 28, 30).

**Second scenario.** `manager@`, CATEGORY Starters at 120 %, Chicken 65 + Butter Naan (₹340): order ₹4, preview "discount
exceeds bill" (hop 29). **Held.**

**Where to look.** `validateAndNormalizeOffer` in [offers_admin.js](../../backend/src-plattr/functions/adminApp/offers_admin.js)
checks only `value > 0`.

### QA-6 · P0 · A discount over 100 % on a dish bills it at ₹0

**Scene.** The manager types 150 in Chicken 65's "Discount %" (meaning ₹150 off). Every Chicken 65 bills ₹0.

**Steps.** Clean seed. `admin@` saves `mi_chicken65` with the editor payload `priceInfo {basePrice:280, finalPrice:0,
discount:150}` (DE clamps only the computed price). Guest on 6 orders Chicken 65; `seen`.

**Expected.** Grid A05: unspecified, "P0 if the dish goes free". It goes free.

**Stored and read.** Stored as sent; order ₹0; `billing-preview` payable ₹0 (hop 33).

**Second scenario.** `manager@`, Apollo Fish (already 10 % off) at 110 %, beside a Butter Naan: stored `finalPrice 0`,
the guest menu shows ₹0, order ₹60, payable ₹66, which is the naan alone (hop 39). **Held.**

**Where to look.** `menu-updateMenuItem` ([menu.js](../../backend/src-plattr/functions/menu/menu.js)) takes `priceInfo`
from the client unchecked; DE:146 clamps the price but stores the raw percent.

### QA-7 · P1 · A minimum order value can never be removed from an offer

**Scene.** The manager clears "Min Order Value" on "₹100 Off (min ₹499)" to make it apply to everything. Save succeeds.
A ₹280 Chicken 65 still gets nothing.

**Steps.** Clean seed. `admin@` `admin-updateOffer off_meg_flat100` with the editor payload built from the stored offer,
Min Order Value blank (OFE:233-236 then sends no `conditions` key). Guest on 7 orders Chicken 65; `seen`.

**Expected.** Threshold gone: ₹100 off, food ₹180, bill ₹198 (180 × 1.1025 = 198.45).

**Stored and read.** `conditions {minOrderValue:499}` unchanged; order ₹280, payable ₹309 (hop 26).

**Second scenario.** `manager@`; first set the minimum to 300 (saved), then clear it: stays 300, payable ₹309 (hop 27).
**Held.**

**Where to look.** `updateOffer` merges `{...stored, ...incoming}` ([offers_admin.js](../../backend/src-plattr/functions/adminApp/offers_admin.js) ~:302).

### QA-8 · P3 · An offer whose stored doc fails today's create rules can't be switched off or edited

**Scene.** The manager flips off "10% Off Biryani". The switch does nothing and says nothing (OFS:131).

**Steps.** Clean seed. `admin@` `admin-updateOffer off_meg_bir10 {offerData:{isActive:false}}` (the Offers switch).

**Stored and read.** Refused "Offer description is required"; `isActive` stays true (hop 24). **Second scenario:**
`manager@`, a priority edit instead of the switch: same refusal (hop 25). **Held.**

P3 because only a seeded or API-written offer can have an empty description today; any offer that predates a tightened
rule freezes the same way. **Where to look:** `updateOffer` re-validates the merged doc with `isUpdate=false`.

### QA-9 · P1 · The admin Operations switch frees a table that still owes, and the next party joins the old sitting

**Scene.** 21:00 table 9 has ₹60 of naan unbilled; the captain disabled the table (the waiter's W15 path). The owner
flips it back on in Operations. It reads vacant; a stranger scans table 9 and is put on the first party's sitting.

**Steps.** Clean seed. `floorstate 9 ordered`; `server@` `table-updateTableStatus {status:'disabled'}`; `admin@`
`admin-updateTableStatus {tableId:'tbl_meg_9', status:'vacant'}`; a stranger (9876543211) signs in on 9.

**Expected.** Refused: only the cashier frees a table that owes (FL Decision 2026-09-24). Table, sitting, lines unchanged.

**Stored and read.** Accepted; `tables/tbl_meg_9` `status:vacant, currentSessionId:null`; the old sitting stays
`active`; the till tile still reads ordered ₹60; the stranger's sign-in returns the **old** sitting id (hop 14). No money
is lost (the till still has the ₹60), but the new party is now on the old party's bill.

**Second scenario.** `manager@`, table 10: same (hop 15). **Held.**

**Where to look.** `updateTableStatus` in [tables_admin.js](../../backend/src-plattr/functions/adminApp/tables_admin.js)
checks only `active → disabled`.

### QA-10 · P2 · TD-096 also on the admin door: a merged child can be switched on

`merged` on 7; `admin@` `admin-updateTableStatus {tableId:'tbl_meg_8', status:'vacant'}` is accepted; 8 reads `vacant`
with `mergedInto: tbl_meg_7` still set; a second party scanning 8 lands on 7's sitting (hop 16). **Second scenario:**
`mergedowes` on 6, `manager@`: same (hop 17). **Held.** TD-096 names the waiter's `table-updateTableStatus`; a fix there
alone leaves this door open. Expected: refused naming the group (FL Decision 2026-09-17).

### QA-11 · P1 · A manager (and the till's own login) can lift the PIN limit, with no audit row

**Scene.** The cashier, logged in as `till@` (MANAGER), raises "discount needs a PIN above" from 10 % to 100 %, then gives
80 % off with no PIN. Nothing in the audit says the limit changed.

**Steps.** Clean seed. Control: `till@` `billing-issue` on table 6's naan with `discount {pct:50}` and no PIN → "PIN
required". `manager@` `admin-updateRestaurantSettings {settings:{'approvals.discountPinAbovePercent':100}}`. `till@`
repeats 50 % on table 7.

**Expected.** The write is refused 403: changing the limits is the owner's (SPEC_ST "Who can do what", last row).

**Stored and read.** Write accepted; `config/settings.approvals {discountPinAbovePercent:100}`; the 50 % bill issued
without a PIN, payable ₹33 (hop 19). **Second scenario:** the owner sets it back to 10, then `till@` itself raises it and
issues 80 % off on table 11 without a PIN, payable ₹13; audit rows naming the settings change: 0 (hop 20). **Held.**

Same root, NOTE: `manager@` promotes himself to ADMIN with `admin-updateServer {role:'ADMIN'}` (hop 38, A51, unspecified).
**Where to look.** `validateAdminSession` in [auth.js](../../backend/src-plattr/functions/adminApp/auth.js) lets MANAGER
through every admin endpoint, and `updateRestaurantSettings` writes any key.

### QA-12 · P1 · A deactivated manager's live session keeps issuing bills and running the admin app

**Scene.** 19:00 the owner switches off a cashier who was just let go. Her till stays logged in: the floor goes blank,
but she can still preview and **issue** bills, open the admin app's tables and change settings, until the session dies
(up to 12 h, TD-051).

**Steps.** Clean seed. `floorstate 6 ordered`; `till@` logs in; `admin@` `admin-updateServer {serverId:'srv_meg_till',
updateData:{status:'inactive'}}` (the Staff switch). The old `till@` session then calls each endpoint.

**Expected.** Refused everywhere, as `approvals-apply` already does ([app/approvals.ts:97](../../backend/src-plattr/functions/app/approvals.ts)).

**Stored and read.** New login refused "Server is not active". Refused: `floor-get` ("this login is not active"),
`payments-take`, `approvals-apply`. **Allowed:** `billing-preview`, `billing-issue` (bill `hIpcqKdFe3QDGlV1ZvDS`, ₹66, a
number taken from the series), `admin-getTables`, `admin-updateRestaurantSettings` (hop 31).

**Second scenario.** `manager@` on table 7: identical split (hop 32). **Held.** The grid's claim that nothing checks
status is half right: the floor and payments do; billing and every `adminApp/` endpoint don't.

### QA-13 · P1 (backend half) · No seeded restaurant's settings doc can be parsed by the admin Settings tab

`admin-getRestaurantSettings` for Meghana returns keys `seller, ordering, payments, tax, billing`: no `theme`, no
`featureFlags`, and `ordering.takeawayTableIds` is a list. `RestaurantSettings.fromJson`
([restaurant_settings.g.dart](../../frontend/src-platter-apps/modules/platter_core/lib/src/models/settings/restaurant_settings.g.dart))
casts `theme` as a required Map and every `ordering` value as bool, so the parse throws (hop 18). The other four
restaurants have the same keys. One scenario for the shape, five restaurants for the data. **Needs the screen** for the
message the manager sees. This also explains A16: the dish editor's Tax group picker reads the same doc and hides.

### QG-2 · P1 (needs screen) · "To Pay" is the whole table's cart; PROCEED sends only this phone's dishes

**Scene.** Two friends at table 6, one phone each. Asha adds a Butter Naan, Bhanu a Chicken 65. Asha's cart says To Pay
₹340; she taps PROCEED and orders ₹60. Bhanu's Chicken 65 sits in the cart until he sends it himself.

**Steps.** Clean seed. Seat 9876543210 on 6; 9876543211 signs in (same sitting). `cart-addItemToCart` naan with
`addedBy:'dev_A'`, Chicken 65 with `addedBy:'dev_B'` (the guest app's `stampCartCall` stamps the device id).
`cart-getCart` (the cart page's `priceInfo`, CP:650). `cart-checkoutCart {addedBy:'dev_A'}`.

**Expected.** The screen makes clear what PROCEED sends (grid G13).

**Stored and read.** Cart `priceInfo.finalPrice` ₹340; the order got the naan only, ₹60; Chicken 65 (dev_B) left in the
cart at ₹280 (hop 52). **Second scenario:** table 7, Paneer 65 (A) vs Crab Roast + Gulab Jamun (B): To Pay ₹914 (hand
204 + 620 + 90), order ₹204, ₹710 left (hop 53). **Held** at the data level; whether the page explains it is for the
screen. G22 on seeded table 1: the joiner's To Pay ₹848, order ₹90; the seeded ₹758 has no `addedBy`, so no phone can
ever send it (hop 54, NOTE).

### QG-3 · P2 · TD-097 on the guest side is worse: a stranger joins a paid party's sitting and lands on its order

**Scene.** 22:00 table 12 paid ₹66 and is putting on coats. A couple sits down, scans 12 and orders Chicken 65. They
are put on the first party's sitting and order: their order page reads ₹340, the paid naan included.

**Steps.** Clean seed. `floorstate 12 settled`; a stranger (9123456789) signs in on 12 with the OTP, adds Chicken 65,
checks out; read `orders` for `tbl_meg_12`.

**Expected.** The stranger can't join the paid sitting (FL-S14, R18).

**Stored and read.** Sign-in returns the paid party's session id; checkout accepted; one order `wk4TPbikvkWxHbrDZJus`
with carts [naan (paid party) | Chicken 65 (stranger)], `finalPrice` 340; the till draft now shows Chicken 65, payable
₹309 (hops 61, 63). **Second scenario:** `comped` on 2: same (hop 62). **Held.** Nothing is lost (the till bills the
₹309), so P2. G45, the paid party's own phone ordering again, is TD-097 as filed (hops 57, 59: accepted, kitchen gets
it).

## Notes (one scenario, unspecified, or by design)

- **A06** (NOTE, one scenario): Gulab Jamun saved at `basePrice -50`; the guest add and checkout are accepted, and the
  till refuses the table "qty below 1 or a negative component price" (hops 34, 40, 41). The same class as QA-6.
- **A34** (NOTE, unspecified): `featureFlags.qrOrderingEnabled:false` and `kitchenDisplayEnabled:false` save, and nothing
  changes: a guest signs in and orders, the kitchen read has the round (hop 21). No backend or app reads the six flags
  (grep: only SET and SETB). Ask Shaurya what they should do.
- **A44, A45, A47** (one scenario each): capacity `-2` stored (hop 36); table 9 renamed "7" stored, two tables numbered
  7 (hop 35, renamed back); `Server@meg.test` added as a second account beside `server@meg.test` (hop 37).
- **G31** (NOTE): with Chicken 65 86'd, the guest's `inStock:true` read drops the dish, so MW's "Out of Stock" badge is
  never reached (hop 55). The admin grid (A17) expects hiding, the guest grid (G31) a badge. One of the grids is wrong.
- **G47** (NOTE): after Clear, the old phone's add and re-scan are refused "Authentication required" (hop 69), not the
  FL-S36 "session ended" wording. Screen to confirm what the guest reads.
- **A32** passes: the admin endpoint deep-merges, `takeawayTableIds` kept, the round waits (hop 22). The kitchen read
  returns the order shell with `carts: []`; the kitchen screen run should check that an empty card isn't drawn.

## Cells

### Admin (60)

| answered by API this pass | result |
|---|---|
| A01, A07, A08, A19 | FAIL: QA-1, QA-2 |
| A05, A06 | FAIL: QA-6, A06 NOTE |
| A11 | FAIL: QA-3 |
| A12 | FAIL: QA-4 |
| A21, A22, A24 | FAIL: QA-5, QA-8, QA-7 |
| A31 (backend half) | FAIL: QA-13 |
| A32, A33 | PASS |
| A34 | NOTE |
| A37, A51 | FAIL: QA-11 (A51 NOTE) |
| A40, A41 | FAIL: QA-10, QA-9 |
| A44, A45, A47 | FAIL, one scenario each (NOTE) |
| A49 | FAIL: QA-12 |

**API-answerable, not run this pass (lower priority):** A02, A03, A04, A10, A13, A14, A15, A17, A18, A20, A23, A25, A26,
A27, A29, A30, A38, A39, A42 (backend half), A43, A46, A48, A50, A52, A53, A54. A02–A04 are safe to run before QA-1 is
fixed: Chicken 65 and Butter Naan have no add-ons to lose.

**Needs the screen:** A16 (picker hidden), A28 (Expired offer drawn Active), A35 (colour), A55–A60 (login, reload,
logout, expired session silence), plus the screen half of A01, A11, A31. **Not built:** A09, A36.

### Guest (49)

| answered by API this pass | result |
|---|---|
| G02, G03, G04, G05, G07, G08, G09, G10, G11, G12, G14 | PASS (amounts by hand; G11's order is ₹740: 840 ≥ 499 fires FLAT, corrected in hop 49) |
| G13, G22 (backend half) | FAIL: QG-2 (G22 NOTE) |
| G18, G19, G20, G32, G38, G41 | PASS |
| G31 | NOTE |
| G45 | seen, TD-097 |
| G46 | FAIL: QG-3 |
| G47 (backend half) | NOTE |

**API-answerable, not run this pass:** G21 (join works: both G13 runs joined the same sitting), G23, G24, G29, G30, G37,
G39, G40, G42, G44, G48.

**Needs the screen:** G01, G06 (sheet price), G15, G16, G17, G25, G26, G27, G33, G34, G36, G43, G49, and the screen half
of G13, G22, G31, G47. **Not built:** G28, G35.

## Suggestions from the manager's chair

- A dish save should say what it changed. Today a refused save and a destructive save look the same: the dialog closes.
- Offers and discounts need a "this makes Chicken 65 cost ₹0" warning before Save, not a till refusal after the kitchen
  has cooked.
- The Staff switch should end the person's sessions at once; the owner switches someone off because they must stop now.

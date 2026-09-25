# QA grid: admin app, 2026-09-25

Prep for a driver agent exploring the admin Flutter app screen by screen ([AGENT_QA.md](../../AGENT_QA.md) §5–§7).
Read-only prep: nothing was run, no emulator, no browser. Every "expected" cites a spec row, a decision or the
code that decides it. There is no spec sheet for this app. Sources: [SPEC_BL](../SPEC_BL_billing_and_tax.md)
(prices, tax, offers on the bill), [SPEC_ST](../SPEC_ST_staff_pin_and_approvals.md) (roles, PIN),
[SPEC_FL](../SPEC_FL_floor_and_moves.md) (tables), [CLAUDE.md](../../CLAUDE.md) (waiter gate, price reference),
[TESTING.md](../../TESTING.md) and the backend validators. Shape follows [the waiter grid](2026-09-25-grid-waiter-app.md).

**The point of this run.** The admin app is where the manager sets things every other app obeys. The risk is a
setting that saves and nothing obeys, or one that breaks another app. So almost every cell has two halves: the admin
act, and a **read-back in another app** (guest menu or cart, waiter Add dishes, kitchen read, till bill through
`floorstate.mjs <n> seen`). A cell passes only when the other app agrees.

**File keys** (app = [platter_admin/lib/](../../frontend/src-platter-apps/apps/platter_admin/lib/), backend = [functions/](../../backend/src-plattr/functions/)):

| key | file | key | file |
|---|---|---|---|
| HS | [home_screen.dart](../../frontend/src-platter-apps/apps/platter_admin/lib/pages/home/home_screen.dart) | AUTH | [adminApp/auth.js](../../backend/src-plattr/functions/adminApp/auth.js) |
| LP | [login_provider.dart](../../frontend/src-platter-apps/apps/platter_admin/lib/pages/auth/login_provider.dart) | SETB | [adminApp/settings.js](../../backend/src-plattr/functions/adminApp/settings.js) |
| MC | [menu_catalog_screen.dart](../../frontend/src-platter-apps/apps/platter_admin/lib/pages/menu/menu_catalog_screen.dart) | MENU | [menu/menu.js](../../backend/src-plattr/functions/menu/menu.js) |
| MP | [menu_catalog_provider.dart](../../frontend/src-platter-apps/apps/platter_admin/lib/pages/menu/menu_catalog_provider.dart) | MI | [menu/menuItem.js](../../backend/src-plattr/functions/menu/menuItem.js) |
| DE | [dish_editor_dialog.dart](../../frontend/src-platter-apps/apps/platter_admin/lib/pages/menu/editors/dish_editor_dialog.dart) | MH | [menu/menuHelpers.js](../../backend/src-plattr/functions/menu/menuHelpers.js) |
| VE | [variant_editor_dialog.dart](../../frontend/src-platter-apps/apps/platter_admin/lib/pages/menu/editors/variant_editor_dialog.dart) | MA | [adminApp/menu_admin.js](../../backend/src-plattr/functions/adminApp/menu_admin.js) |
| AE | [addon_editor_dialog.dart](../../frontend/src-platter-apps/apps/platter_admin/lib/pages/menu/editors/addon_editor_dialog.dart) | AIH | [cart/addItemToCartBoilerplateHelper.js](../../backend/src-plattr/functions/cart/addItemToCartBoilerplateHelper.js) |
| OPS | [operations_screen.dart](../../frontend/src-platter-apps/apps/platter_admin/lib/pages/operations/operations_screen.dart) | TA | [adminApp/tables_admin.js](../../backend/src-plattr/functions/adminApp/tables_admin.js) |
| STF | [staff_screen.dart](../../frontend/src-platter-apps/apps/platter_admin/lib/pages/staff/staff_screen.dart) | SA | [adminApp/staff_admin.js](../../backend/src-plattr/functions/adminApp/staff_admin.js) |
| OFS | [offers_screen.dart](../../frontend/src-platter-apps/apps/platter_admin/lib/pages/offers/offers_screen.dart) | OA | [adminApp/offers_admin.js](../../backend/src-plattr/functions/adminApp/offers_admin.js) |
| OFE | [offer_editor_dialog.dart](../../frontend/src-platter-apps/apps/platter_admin/lib/pages/offers/editors/offer_editor_dialog.dart) | OE | [offers/offerEngine.js](../../backend/src-plattr/functions/offers/offerEngine.js) |
| SET | [settings_screen.dart](../../frontend/src-platter-apps/apps/platter_admin/lib/pages/settings/settings_screen.dart) | COO | [orders/createOrUpdateOrder.js](../../backend/src-plattr/functions/orders/createOrUpdateOrder.js) |
| RS | [restaurant_settings.g.dart](../../frontend/src-platter-apps/modules/platter_core/lib/src/models/settings/restaurant_settings.g.dart) (platter_core) | OAD | [adminApp/orders_admin.js](../../backend/src-plattr/functions/adminApp/orders_admin.js) |
| ORD | [orders_screen.dart](../../frontend/src-platter-apps/apps/platter_admin/lib/pages/orders/orders_screen.dart) | FS | [qa/floorstate.mjs](../../backend/src-plattr/functions/test/e2e/qa/floorstate.mjs) |

## 0. Read this before starting

- **The admin app only talks to slot 0.** It uses platter_core's `AppConfig`, whose dev URL is the literal
  `http://localhost:5002/...` ([app_config.dart:15](../../frontend/src-platter-apps/modules/platter_core/lib/src/config/app_config.dart)),
  and nothing calls `setOverrideBaseUrl`. So the run needs slot 0 (Firestore `:8080`, functions `:5002`), and
  **slot 0 belongs to another agent right now**. Wait for it. Don't point `floorstate.mjs` at another slot: the
  screen would read slot 0 and the seed would land elsewhere.
- Stack: [FRONTEND_TESTING.md](../../FRONTEND_TESTING.md) §3 (`run_app.sh admin` → `:5053`), §4, §6, §8. For the
  read-backs also `run_app.sh consumer` (`:5051`) and, when a cell needs the waiter screen, `server` (`:5050`);
  most read-backs are API reads through `floorstate.mjs`, which is cheaper. Seed MockData7, restaurant `res_meghana`.
- **No identifiers except login.** Admin has `login-restaurant`, `login-username`, `login-password`, `login-submit`
  and nothing else (FRONTEND_TESTING §6). Every other control is found by text through `ab snap` / `@eN` refs,
  re-snapshotted before each click. Text fields need a click before `fill`. The text to look for is in §1.
- **`ab login admin meg` prints "submitted but still on the login form" on a login that worked**: it waits for any
  non-login identifier, and admin has none. Check with `ab snap` for the title "Meghana Foods • Menu".
- **Nothing refreshes on its own.** All six tabs are built at login (`IndexedStack`, HS:113) and each loads once.
  After any change made elsewhere, press that tab's refresh icon (tooltip "Refresh"). A tab is otherwise as old
  as the login.
- **Menu saves fail silently.** The Menu provider stores the error (MP:127, :155, :273, :296…), but the screen
  shows `errorMessage` only when the menu itself failed to load (MC:44). A refused save just closes the dialog.
  Never trust the screen after Save: read the document back. File this once, not per cell.
- **Admin writes persist.** `floorstate.mjs <n> reset` only resets tables and sittings. A menu, offer, staff or
  settings edit stays until you undo it. See §5 "Undo".
- **Don't put a discount on Butter Naan.** `floorstate`'s `dish()` picks the first plain dish whose final price
  equals its base price. A discounted naan makes every seeded state silently switch to another dish.
- **How a bill is worked out by hand.** Meghana's config: 5 % service charge, then 5 % GST on food and charge,
  rounded to the rupee. So bill = food × 1.05 × 1.05. Proven in earlier runs: Chicken 65 ₹280 → ₹309 and
  ₹900 − ₹100 offer = ₹800 → ₹882. The till's number comes from `billing-preview` (`floorstate <n> seen`).

## 1. Controls

"(text)" = no identifier; click by that text through `ab snap`.

### Login and shell (HS, [platter_login_form.dart](../../frontend/src-platter-apps/modules/platter_core/lib/src/ui/auth/platter_login_form.dart))
| control | what | file:line |
|---|---|---|
| `login-*` | staff login. Allowed roles `admin`, `manager` (lower-cased compare) | LP:9 |
| (text) bottom tabs "Menu", "Orders", "Operations", "Staff", "Offers", "Settings" | switch tab, no reload | HS:117 |
| (tooltip) "Logout" → "Yes" | clears local session, back to login | HS:107, :65 |

### Menu (MC, DE, VE, AE)
| control | what | file:line |
|---|---|---|
| (tooltip) "Refresh" | `menu-getRestaurantMenu` + `admin-getRestaurantSettings` (for the tax picker) | MC:175, MP:73-83 |
| (text) "Add" (categories), category row, (tooltips) "Add subcategory", "Edit category", "Delete category" | `admin-addCategory` / `-updateCategory` / `-deleteCategory` | MC:180-248 |
| subcategory row, edit / delete icons | `admin-updateSubcategory` / `-deleteSubcategory` | MC:267-283 |
| (text) "Add Dish" | opens the dish editor → `menu-addMenuItem` | MC:353 |
| Switch on a dish row | `menu-updateMenuItemAvailability` (stock) | MC:381 |
| edit icon / delete icon → "Delete" | dish editor → `menu-updateMenuItem` / `menu-deleteMenuItem` | MC:391, :395 |
| Dish editor: "Name", "Description", "Image URL", "Category", "Primary Subcategory", subcategory chips, "In Stock", "Base Price", "Discount %", "Tax group" (hidden unless tax blocks load), "Dietary", "Spice Level", "Vegan", "Calories", "Allergen Tags", "Variants" Edit, "Add-ons" Edit, "Save" | sends the **whole dish** (`item.toJson()`) | DE:217-446, MP:282 |
| Variants: "Add Variant", edit / delete icon, "Save"; one variant: "Variant Name", "Mandatory", option "Name" / "Price", "Add Option", "Save" | edits the dish's own copy only | VE:108-121, :222-288 |
| Add-ons: "Name", "Price", "In Stock", "Mandatory", "Remove", "Add Add-on", "Save" | same | AE:91-165 |

Not built: menus (the active menu's dish list), respectParentDiscount, editing the shared variant/add-on documents.

### Orders (ORD)
| control | what | file:line |
|---|---|---|
| refresh, "Filter by date" start / end, clear | `admin-getHistoricalOrders` | ORD:70-116 |
| order card | `admin-getOrderDetails` | ORD:227 |

### Operations (OPS)
| control | what | file:line |
|---|---|---|
| (tooltip) "Refresh" | `admin-getTables` | OPS:84 |
| Switch on a card (hidden when the table is `active`) | on → `vacant`, off → `disabled` via `admin-updateTableStatus` | OPS:292-296 |
| tap a card → "Table Number/Name", "Seating Capacity", "Save" | `admin-updateTable` | OPS:264, :425-447 |

Not built: add table, delete table, merge, move.

### Staff (STF)
| control | what | file:line |
|---|---|---|
| refresh, (text) "Add Staff" → "Name *", "Phone Number", "Email", "Role *", "Add" | `admin-addServer`, then a dialog with the PIN and password | STF:83-90, :484-534 |
| Switch on a row ("Active"/"Inactive") | `admin-updateServer {status}` | STF:355 |
| ⋮ menu → "Edit" / "Reset PIN" → "Reset" | `admin-updateServer` / `admin-resetServerPin` | STF:373-397, :189 |

### Offers (OFS, OFE)
| control | what | file:line |
|---|---|---|
| refresh, (text) "Create Offer" | editor → `admin-createOffer` | OFS:85-92 |
| Switch on a card | `admin-updateOffer {isActive}`. **No message on failure** | OFS:275, :131 |
| edit icon / delete icon → "Delete" | `admin-updateOffer` / `admin-deleteOffer` (soft) | OFS:291-296 |
| Editor: "Title *", "Description *", "Type *", "Scope *", target ids (typed, comma-separated), "Exclusion IDs", value, "Max Discount", "Buy/Get Quantity", "Min Order Value", "Start:" / "End:" date pickers, "Terms", "Priority", active switch, "Save" | the whole offer | OFE:292-496 |

### Settings (SET)
| control | what | file:line |
|---|---|---|
| (tooltip) "Refresh", "Retry" | `admin-getRestaurantSettings` | SET:98, :50 |
| "Waiter confirms QR orders" | `ordering.requireWaiterConfirmation` | SET:114-121 |
| six Feature Flag switches: Dine-In, Takeout, Delivery, QR Code Ordering, Online Payments, Kitchen Display | `featureFlags.*` on the config doc | SET:135-175 |
| Primary / Secondary / Accent colour, Font Family | `theme.*` | SET:188-254 |

Not built: tax blocks and GST rates, service charge, parcel tables and packing charge, approval limits, tenders.

## 2. States, in product words

| # | state | seed (§5) |
|---|---|---|
| S1 | seed menu, offers, staff, settings untouched | re-seed, or §5 Undo |
| S2 | a guest has a dish in the cart, not sent | `guestdraft` ✓ |
| S3 | a round placed (Butter Naan ₹60), not billed | `ordered` ✓ |
| S4 | Chicken Biryani Family + Extra Raita placed | `variant` ✓ |
| S5 | Chicken 65 + Coastal Crab Roast placed, ₹100 order offer fired | `offer` ✓ |
| S6 | billed / paid, sitting open | `billed` / `settled` ✓ |
| S7 | 8 merged into 7 | `merged` ✓ |
| S8 | a table disabled while it still owes | **add** `disabledowes` |
| S9 | reserved / disabled / scan in flight | `reserved` / `disabled` / `holding` ✓ |
| S10 | a staff member's session is live (till@, server2@, manager@) | `server-serverLogin` by API |
| S11 | admin@'s session expired | **add** `staffexpired admin` |
| S12 | the admin screen is older than a change made elsewhere | act elsewhere after the admin tab loaded |

## 3. The grid

**60 cells**, risk first. "Refused" means **refused with a reason that names the thing, and nothing changed in the
database** ([TESTING.md](../../TESTING.md) "Refusals are behaviour too"). **Bold** in "watch for" = what I think
will fail, from reading the code. None of these cells has run on screen before; the backend e2e `admin` suite
(16/16, TD-007) covers the endpoints' happy paths only, never another app's read-back.

### A. Menu edits: does the guest cart and the till bill follow?

| # | control | state | expected (the cross-app read-back) | source | watch for |
|---|---|---|---|---|---|
| A01 | edit Chicken Dum Biryani, change only "Description", Save | S1 | The dish doc keeps `addons` as ids (`["ma_extra_raita", …]`) and `variants` as `[{id, name}]`. Guest menu still offers the three add-ons. Then `floorstate 9 variant` works: Family + Raita = ₹620, ₹100 order offer, bill ₹573 (520 × 1.1025 = 573.30) | reader shapes: MH:180 (add-on ids), AIH:400 (`offered.includes(addonId)`) | **MP:282 sends `item.toJson()`, which writes `addons` as full objects. MH:180 then finds none, so the guest menu shows no add-ons, and AIH:400 refuses the add "Add-on is not offered on this dish".** A typo fix makes every biryani add-on unsellable. P0 candidate. Read `menuItems/mi_chicken_bir` |
| A02 | Chicken 65 "Base Price" 280 → 300, Save | S1 | Admin row "Price: 300". Guest menu and cart ₹300. Waiter Add dishes ₹300. A new round bills ₹331 (300 → 315 → 330.75) | BL R2 (billing sums line snapshots); §0 formula | Chicken 65 has no add-ons, so A01's damage doesn't show here |
| A03 | Butter Naan 60 → 70, Save | S3 on 6 | The placed naan stays ₹60, bill ₹66. A second naan round after the edit is ₹70; both bill ₹143 (130 → 136.50 → 143.33) | BL Objects: line fields frozen when the round is placed; R2 | Put it back to ₹60 before any other state (§0) |
| A04 | Chicken 65 "Discount %" 0 → 10, Save | S1 | Stored `{basePrice:280, discount:10, finalPrice:252}`. Guest cart ₹252. Till line: list ₹280, menu offer −₹28, payable ₹278 (252 → 264.60 → 277.83) | DE:142-147 (discount is a percent); CLAUDE.md price reference | |
| A05 | "Discount %" = 150 | S1 | Unspecified. Should be refused (0–100). Record what's stored and what a guest pays. Ask Shaurya | DE:146 clamps only the computed price | **DE:192 stores `discount: 150` with `finalPrice: 0`.** P0 candidate if the dish goes free |
| A06 | "Base Price" typed as `₹300`, then `3,00`, then `-50` | S1 | Refused, naming the field | Unspecified. Record, ask | **DE:140 `num.tryParse(...) ?? 0`: the first two save a ₹0 dish with no warning.** `-50` is saved (MENU only checks it's a number); record what the guest's add says |
| A07 | Chicken Biryani → Add-ons "Edit" → Extra Raita price 40 → 50 → Save → Save | S1 | Raita is one shared add-on on three biryanis. All three charge ₹50: Family + Raita ₹630, bill ₹584 (530 → 556.50 → 584.33) | seed: `addons/ma_extra_raita` is its own doc; AIH:389-414 prices from it | **The editor changes only the dish's copy (AE:54-60). `addons/ma_extra_raita` stays ₹40.** Saves, nothing obeys. Plus A01 |
| A08 | Chicken Biryani → Variants "Edit" → Portion → Family 260 → 280 | S1 | Family is +₹280 on all three biryanis: ₹640 line, bill ₹595 (540 → 567 → 595.35) | AIH:316-340 prices from `variants/mv_bir_portion` | **Same as A07: the shared doc is untouched, guest still pays +₹260** |
| A09 | `respectParentDiscount` (Mutton Biryani 10 % off: Family inherits it, Raita doesn't) | — | **NOT BUILT**: no control. Record the stored dish after any variant or add-on save | CLAUDE.md price reference | VE:204-210 and AE:54-60 rebuild without the flag, so the dish's copy flips to the default `true`. Money moves only if a reader uses the dish's copy; note it, file only if a price moves |
| A10 | Chicken 65 → Variants → "Add Variant" "Spice", Mandatory, options Mild ₹0 / Hot ₹0 | S1 | The guest must pick a spice level; waiter Add dishes opens a picker | AIH:365-370 (mandatory check) | **The new id `variant_<ms>` (VE:40) exists only inside the dish. MH:177 drops it and AIH ignores it. Nobody is asked** |
| A11 | stale screen: admin Menu loaded; server@ turns Prawn Ghee Roast out of stock (API or waiter Menu tab); admin edits Prawn Ghee Roast's description, Save | S12 | Prawns stay out of stock | TD-015 why-column: staff believe the stock switch works | **The dialog was built from the old list ("In Stock" on, DE:79) and saves the whole dish, so `isInStock` goes back to true.** Scene: 20:00 prawns run out, 20:05 a typo fix puts them back on sale. P1 candidate |
| A12 | "Add Dish" "Mysore Masala Dosa" ₹120 in Breads & Rice, Save | S1 | The dish appears in the admin list, the guest menu and waiter Add dishes | owner's expectation; unspecified | **Meghana's active menu `menu_meg` lists every dish id, and MH:232-248 drops ids not on that list. Success, reload, and the dish isn't even in the admin's own list.** Read `menuItems` for the new doc. Also record its `taxBlockId` (null → Breads' `tax.assign`, TD-038) |
| A13 | Categories "Add" "Dosas", order 7 | S1 | Shows everywhere | unspecified | Same filter on `categoryIds` (MH:78-86). Expect it invisible |
| A14 | delete Butter Naan → "Delete" | S3 on 6 **and** S2 on 7 | Table 6's placed naan still bills ₹66 ("reading a line never needs the menu item to exist"). Table 7's guest checkout is refused, naming the naan | SPEC_BL Objects (line doc) | Record the exact refusal text on 7. Put the naan back (§5) |
| A15 | delete category "Breads & Rice" (holds naan) | S1 | Unspecified: refuse while dishes are in it, or move them. Record, ask | MA:103-116 deletes with no check | Human lens: the naan disappears from every menu and nothing warned |
| A16 | open the dish editor | S1 | A "Tax group" picker: Same as category / GST / Liquor | TD-038 closure: "the admin dish editor has a Tax group picker" | **Hidden. MP:79-83 reads the settings doc, the read fails (A31), so the picker has no blocks and DE:334 hides it.** An existing `taxBlockId` survives the save (DE:80) |

### B. Stock

| # | control | state | expected | source | watch for |
|---|---|---|---|---|---|
| A17 | Butter Naan row Switch off | S2 on 7, S3 on 6 | Guest menu hides the naan (consumer asks `inStock: true`). Table 7's checkout refused "Cannot checkout. The following items are out of stock: Butter Naan". Waiter Add dishes hides it next open. Table 6's placed naan untouched | [menu_fetch.js:114](../../backend/src-plattr/functions/menu/menu_fetch.js); [checkoutCart.js:104](../../backend/src-plattr/functions/cart/checkoutCart.js); waiter grid W59 | `floorstate stock` covers the API; the screen switch is new |
| A18 | Switch back on | after A17 | Everything back; table 7's checkout goes | same | |
| A19 | Chicken Biryani → Add-ons → Extra Raita "In Stock" off → Save | S1 | Guest can't add Raita: "Add-on Extra Raita is currently out of stock" | TD-015 closure (AIH:410) | **Writes the dish's copy only. `addons/ma_extra_raita.isInStock` stays true.** TD-015's own words: "staff believe switching it off does something" |

### C. Offers (read-back: guest checkout, then the till bill through `seen`)

| # | control | state | expected | source | watch for |
|---|---|---|---|---|---|
| A20 | "Create Offer": "20% off Starters", Percentage off, Specific categories, target `mc_starters`, value 20, max 100, today to +30 days | S1 | Guest orders Chicken 65 alone: ₹56 off, food ₹224, bill ₹247 (224 → 235.20 → 246.96) | OE; BL-S24 | Human lens: the manager must type the internal id `mc_starters` (OFE:353) |
| A21 | "Create Offer": Percentage off, Entire order, value 150 | S1 | Unspecified; no real offer is over 100 %. Record whether it saves, ask | OA:100-104 checks only > 0 | **COO:392 caps the offer at the order total, so Chicken 65 comes to ₹0.** P0 candidate: one keystroke makes the menu free |
| A22 | Switch off "10% Off Biryani (max ₹120)" | S1 | `isActive: false`; a biryani order gets no 10 % | OA updateOffer | **The seed's description is "". OA:302-303 re-checks the whole merged offer as if new, and OA:43 refuses "Offer description is required". The screen says nothing (OFS:131).** Read the doc |
| A23 | Switch off "₹100 Off (min ₹499)", then seed | S5 on 10 after the switch | No offer: Chicken 65 + Crab Roast = ₹900, bill ₹992 (900 → 945 → 992.25), not ₹882 | OE:31 | Switch it back on |
| A24 | Edit "₹100 Off": clear "Min Order Value", Save | S1 | The threshold is gone: Chicken 65 alone gets ₹100 off, food ₹180, bill ₹198 | OFE:233-236 | **With the field blank OFE sends no `conditions`, and OA:302 merges the old `{minOrderValue: 499}` back. Chicken 65 bills ₹309.** A threshold can never be removed |
| A25 | Edit "₹100 Off": Min Order 499 → 1000 | S5 on 10 | ₹900 no longer qualifies: ₹992 | OE:46 | |
| A26 | Edit "₹100 Off": "End:" = today | S1, guest orders ₹900 today | Unspecified: "valid till 25 Sep" should include 25 Sep. Record, ask | OFE:249-250: a midnight local date, sent without `Z` | **It ends at 00:00 today, so it's already dead.** Human lens |
| A27 | "Create Offer" Specific items, target `mi_chiken65` (typo) | S1 | Refused, naming the unknown id | Unspecified (TD-021 covers condition keys, not ids). Record, ask | Saves, never fires, no warning |
| A28 | read the offer list | S1 | "Expired Ugadi Offer" reads Expired | — | **OFS:275 draws the switch from `isActive` only: it reads "Active" in green.** Human lens |
| A29 | Edit "₹100 Off" value → 150 | S5 on 10, checked out before the edit | The bill already open stays ₹882. Then a naan round (₹60) re-runs the offer: record ₹948 (₹100 kept: 860 → 948.15) or ₹893 (₹150 over ₹960: 810 → 893.03) | SPEC_BL Decisions 2026-09-15 "reads the order offer as the last checkout stored it" | |
| A30 | delete "BOGO Paneer 65" → "Delete" | S1, guest orders 2 × Paneer 65 before and after | Before: one free, food ₹204, bill ₹225 (204 → 214.20 → 224.91). After: ₹408, bill ₹450 (408 → 428.40 → 449.82) | OA soft delete sets `isActive: false`; OE:31 | |

### D. Settings and flags

| # | control | state | expected | source | watch for |
|---|---|---|---|---|---|
| A31 | open the Settings tab | S1 (any MockData7 restaurant) | Ordering, Feature Flags, Theme, General | SET | **Error + "Retry". The config doc has no `theme` and no `featureFlags` (RS casts both as required), and `ordering.takeawayTableIds` is a list (RS casts every `ordering` value to bool).** Every switch here is unreachable at every seeded restaurant. P1 candidate. Quote the message |
| A32 | "Waiter confirms QR orders" on (on screen if A31 passes, else as manager@ by API: `admin-updateRestaurantSettings {settings: {'ordering.requireWaiterConfirmation': true}}`) | S1 | Config: gate true **and** `takeawayTableIds` still `[tbl_meg_p1, tbl_meg_p2]` (SETB:86-92 deep-merges). A guest checkout on 12 lands AWAITING: the waiter read has it, the kitchen read doesn't (`floorstate 12 seen`) | CLAUDE.md waiter gate | TD-094 (the captain's own round waits) is known. Turn the gate off after |
| A33 | gate off | after A32 | The next guest checkout is PENDING and in the kitchen read | same | |
| A34 | "QR Code Ordering" off (or `featureFlags.qrOrderingEnabled: false` by API); also "Kitchen Display" off | S1 | Unspecified what they should do; the labels promise that scanning stops and the kitchen screen stops. Record a guest scan of 6 and the kitchen read. Ask | — | **Nothing reads any of the six flags: they appear only in SET and SETB.** The offers kill switch is a different field on the restaurant doc ([offerFeatureGuard.js:28](../../backend/src-plattr/functions/offers/offerFeatureGuard.js)). One finding for all six |
| A35 | "Primary Color" → pick one | S1 | Unspecified which app shows it. Record the guest app, ask | — | |
| A36 | tax blocks and GST rate, service charge %, parcel tables, packing charge, approval limits, tenders | — | **NOT BUILT** in this app. They are hand-set on the config doc. Mark NOTBUILT | SPEC_BL and SPEC_ST config keys | |
| A37 | misuse by API: manager@ (MANAGER) sends `admin-updateRestaurantSettings {settings: {'approvals.discountPinAbovePercent': 100}}` | S1 | Refused 403: changing the limits is the owner's (ADMIN) | SPEC_ST "Who can do what", last row | **AUTH:76 lets MANAGER through and SETB writes any key.** A cashier can switch off his own PIN gate. Put it back to 10. TD-039 is about the shape of values, not who writes them |

### E. Tables (read-back: waiter Tables tab, till `floor-get`, a guest scan)

| # | control | state | expected | source | watch for |
|---|---|---|---|---|---|
| A38 | table 10 Switch off | S1 | `disabled`. A guest scan of 10 is refused; waiter Tables shows DISABLED; the till floor shows it off | TA:108-143 | |
| A39 | table 10 Switch on | after A38 | `vacant`, scannable | same | |
| A40 | Switch on child 8 | S7 (`merged` on 7) | Refused, naming the group ("8 is merged into 7") | FL Decision 2026-09-17: the child stays disabled so nobody seats a second party | **TA has no merge check: 8 goes vacant with `mergedInto` still 7.** Then scan 8: a second party on a merged table |
| A41 | Switch on table 9 | S8 (`disabledowes` on 9, ₹60 unbilled) | Refused: only the cashier frees a table that still owes. Table, sitting and lines unchanged | FL Decision 2026-09-24 | **TA writes `vacant` with no money check and ends no sitting.** Read table 9, its session (still active?) and the till tile. P0 candidate: ₹60 orphaned, next scan may join the old party |
| A42 | read card 4 | S9 reserved | Reads RESERVED | FL table states | **OPS:342-347 knows only DISABLED / OCCUPIED / AVAILABLE: 4 reads AVAILABLE with its switch on.** Off then on turns it `vacant`: the booking is gone. The "Occupied" count also misses billed and scanning tables. Unspecified; record |
| A43 | read card 11, then Switch off | S9 `holding` on 11 (scan in flight) | Unspecified. Record: counted as Available? Can it be disabled mid-OTP? Ask | FL R6 counts an OTP in flight as not vacant | |
| A44 | table 6: "Seating Capacity" 0, then -2, then `abc` | S1 | -2 and `abc` refused, naming the field. 0 unspecified (parcels use 0). After each, the waiter Tables tab still loads | TD-058 context (null only) | **`abc` is dropped (OPS:457 `int.tryParse` → not sent) and the dialog closes like a save. -2 is stored (TA:200)** |
| A45 | table 9: "Table Number/Name" → `7` | S1 | Refused: there is already a table 7 | Unspecified. Record, ask | **Stored (TA:196). Two "7"s on the till floor and the waiter app. `floorstate`'s `tableByNumber` then picks the wrong table: rename it back before any other seed** |

### F. Staff (read-back: logins and live sessions in the other apps)

| # | control | state | expected | source | watch for |
|---|---|---|---|---|---|
| A46 | "Add Staff" Ravi, email `ravi@meg.test`, Server, "Add" | S1 | A dialog shows the PIN and the password once. The waiter app logs in with them; role SERVER; the doc holds `pinHash` and a hashed `password`, never plain text | SA:132-176; TD-041 closure | |
| A47 | "Add Staff" with email `Server@meg.test` | S1 | Refused as a copy of `server@meg.test` | Unspecified. Record, ask | SA:125 and login (server_auth.js:116) both match exact case, so a second account is made |
| A48 | server2@ Switch → Inactive | S10 (server2 logged in by API first) | New login refused (server_auth.js:134). The **live** session: record per call (`order-getActiveOrdersForRestaurant`, `cart-updateCartStatus`) | SPEC_ST "role from staff doc" | |
| A49 | till@ (MANAGER) Switch → Inactive | S10 (till@ logged in) | Its live session is refused by `floor-get`, `billing-preview` and `admin-getTables`, as `approvals-apply` already does | [app/approvals.ts:97](../../backend/src-plattr/functions/app/approvals.ts) | **AUTH:26-84 and :93-141 never read the staff doc's `status`.** A dismissed cashier keeps billing and running this app for up to 12 h (TD-051). P1 candidate |
| A50 | till@ "Edit" → Role Server | S10 | till@'s next discount is 403, not a PIN box | ST R8 | |
| A51 | manager@ (logged into admin) edits own role → Admin | S1 | Unspecified. The owner alone changes limits (ST); a manager promoting himself defeats that. Record, ask | SA:257 stores any role | |
| A52 | manager@ ⋮ → "Reset PIN" → "Reset" | S1 | A new 4-digit PIN shown once. `approvals-apply` (a line void, `ordered` on 6) accepts it and refuses `1234`; manager@'s login password `1234` still works | SA:292-337; TD-041 | Put `1234` back by API `admin-resetServerPin {newPin:'1234'}` |

### G. Orders tab, login, session

| # | control | state | expected | source | watch for |
|---|---|---|---|---|---|
| A53 | Orders tab, find table 9 | S6 `settled` on 9 | Unspecified (reports aren't built). Record the amount and the payment chip | OAD:66-70 | Expect ₹60 and PENDING (food before charge and tax; nobody writes `paymentStatus`, TD-010) while the till says ₹66 paid. One NOTE: the owner reads every order as unpaid |
| A54 | "Filter by date" today → today | orders placed during the run | They're listed | OAD:32-45 | Record any missing (emulator timestamp types, AGENT_QA §8) |
| A55 | log in `admin@meg.test` / 1234 | — | Home, "Meghana Foods • Menu" | LP | §0: `ab login` prints a false warning |
| A56 | log in `server@meg.test`, then `kitchen@meg.test` | — | "You are not authorized as an Admin or Manager" | LP:13 | |
| A57 | log in `till@meg.test` (MANAGER) while the till is logged in as till@; then Logout here | — | Both work. Logging out here doesn't log the till out (one session doc per staff member) | server_auth.js:301 | |
| A58 | edit a dish and Save | S11 (admin@'s session expired) | Told the session has expired, taken to login | pattern of TD-100 | **The dialog closes and nothing is said (MC:44). The dish is unchanged.** Same silence for every refused Menu save |
| A59 | reload the page | logged in | Still logged in, Menu tab | [main.dart](../../frontend/src-platter-apps/apps/platter_admin/lib/main.dart) `tryRestoreSession` | |
| A60 | Logout → "Yes", then browser Back | logged in | Login screen; Back doesn't return | HS:65 `pushAndRemoveUntil` | |

## 4. Misuses (AGENT_QA §5 table, for the manager)

| misuse | for the manager | cells |
|---|---|---|
| repeat | double-click "Save" in "Create Offer" (two clicks in one frame through `$B js`): two identical offers make a TD-020 tie, so count the docs. Double "Add" in Add Staff (the second must be refused as a duplicate). Double "Save" in the dish editor: a second `pop` could close the home screen, record what shows | A20, A46, A02 |
| stale screen | any edit on a tab loaded before a change elsewhere (stock, price, offer on/off). The admin never refreshes by itself | A11, A22, A49 |
| two people at once | two admin tabs (admin@ and manager@) save the same dish within a second: the last whole-dish write wins, record which. Two settings saves on different keys at once: SETB:81-92 reads, merges and `set()`s outside a transaction, so read back **both** keys | A02, A32, A34 |
| interrupt | reload while a dish save is in flight; reload with the Variants dialog open (edits are lost, nothing half-written?) | A07, A08 |
| after an error | empty "Name" on Save does nothing, no message (DE:137). After a refused offer toggle, does the switch show the old state after Refresh? After A31's error, does "Retry" ever recover? | A22, A31 |
| skip a step | save a variant with no options; an offer with start after end (OA:155 should refuse, naming the dates); Item scope with no targets (OA:77-83) | A10, A27 |
| typing | the option and add-on text fields rebuild their controller on every keystroke (VE:242, :257; AE:92, :104). Type a price one key at a time (`$B type`), not only `fill`, and read what was stored | A07, A08 |

## 5. Seeding and undo

Env (slot 0, because of §0):
`cd backend/src-plattr/functions/test/e2e/qa && export FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 PLATTR_BASE_URL=http://127.0.0.1:5002/rms-app-dd875/us-central1`.
`node floorstate.mjs` with no args prints the states. Admin endpoints are callables: the helper's `call(endpoint,
{restaurantId: 'res_meghana', sessionId, …})` works for them with a manager@ or admin@ session from `server-serverLogin`.

**Already in [floorstate.mjs](../../backend/src-plattr/functions/test/e2e/qa/floorstate.mjs):** `guestdraft ordered variant offer billed settled merged reserved disabled holding`,
`gate on|off`, `stock <menuItemId> on|off`, `<n> seen` (till tile, each sitting's `billing-preview`, kitchen and waiter reads).
`seen` is the cross-app read-back for every money cell.

**To add** (test each on a spare table with `dump` before the driver starts, AGENT_QA §5):

| name | what |
|---|---|
| `disabledowes` | `ordered`, then server@ calls `table-updateTableStatus {status: 'disabled'}` (the waiter's W15 path) |
| `ordered <menuItemId>` | `ordered` with a named plain dish (Chicken 65 for A02, A04, A20, A24; 2 × Paneer 65 for A30) |
| `staffexpired admin` | as `staffexpired`, but on admin@'s session doc |
| `restore <collection>[/<id>]` | **Undo** for admin edits. Put `menuItems`, `variants`, `addons`, `categories`, `offers`, `servers`, `tables` or `config/settings` back to the seed file's copy, and delete docs the seed doesn't have (a new dish, category, offer or staff member). It is a reset, not a state a reader sees, so writing documents is fine, as `resetTable` already does. The config doc must come back **whole**, `ordering.takeawayTableIds` included |

Until `restore` exists: before each edit, save the doc (`get menuItems/<id>` etc.) and undo by the same admin endpoint
afterwards, or re-import MockData7 `--clean` between sections (costs every live sitting; slot 0 only if it's yours).

**Order.** A01 first on its own (it damages Chicken Biryani, which A07, A08, A19 and `variant` all need): run
`variant` before and after it, then restore. Then A02–A06 on Chicken 65 and naan, restoring after each. Offers after
menu (A23, A25, A29 depend on the seeded ₹100 offer). Tables and staff last; restore staff PINs and roles.

Suggested tables: 6 = placed naan, 7 = guest draft, 7+8 = merged, 9 = disabledowes / settled, 10 = offer, 11 =
holding, 12 = gate. Reset each before re-use.

## 6. Do not report

Open rows. If you see one, write "seen, TD-nnn" in the cell and move on.

| TD | what the driver will see |
|---|---|
| [TD-020](../TECH_DEBT.md) | Two offers worth the same amount: which one wins is a coin flip. The admin UI makes it easy (priority is optional) |
| [TD-021](../TECH_DEBT.md) | An offer condition key the engine doesn't know is ignored. The UI only writes `minOrderValue`, so only an API call can hit it |
| [TD-039](../TECH_DEBT.md) | A config value of the wrong shape is accepted at write. (A37 is about **who** may write, which is different) |
| [TD-012](../TECH_DEBT.md) | An offer's validity is judged by the server clock at evaluation time |
| [TD-025](../TECH_DEBT.md) | A threshold offer across a mid-meal cancellation |
| [TD-053](../TECH_DEBT.md) / [TD-066](../TECH_DEBT.md) | The floor tile disagrees with the bill once an order offer fires; a split gives the offer to each half |
| [TD-058](../TECH_DEBT.md) | A table with **no** capacity field breaks the waiter app (0 is fixed) |
| [TD-094](../TECH_DEBT.md) | With the gate on, the captain's own round also waits |
| [TD-051](../TECH_DEBT.md) | Staff sessions die after 12 h |
| [TD-003](../TECH_DEBT.md) | No PIN box in any Flutter app |
| [TD-082](../TECH_DEBT.md) | Paid, cleared orders stay IN_PROGRESS: the admin Orders tab shows them so |
| [TD-046](../TECH_DEBT.md) / [TD-087](../TECH_DEBT.md) | Raw `tbl_meg_*` ids and broken dates, if the admin order detail shows them. Note once |

By design, or known elsewhere:
- An occupied (`active`) table has no switch in Operations (OPS:292). Not a bug.
- `paymentStatus` is never written; PY owns payment (TD-010 closed). A53 is one NOTE, not a bug per order.
- Debug build: "Seeded logins" cards under the form.
- STATE.md 2026-09-18 says the tax picker is "hand-tested only" because agents couldn't drive Flutter web then. That
  was before `ab`; it isn't a reason to skip A16.
- **Closed rows that would be regressions, so do report them:** TD-014 (variant or add-on inherits the discount in the
  cart but not on the bill), TD-015 (out-of-stock add-on accepted), TD-038 (a hand-entered dish can't be billed),
  TD-007 (role spelling `ADMIN`).

## 7. What the observer watches in the emulator log

Filter on `Beginning execution of "us-central1-<name>"`, `Error in`, `HttpsError`. **At login** all six tabs load:
`menu-getRestaurantMenu`, `admin-getRestaurantSettings` (twice: Menu's tax picker and Settings),
`admin-getHistoricalOrders`, `admin-getTables`, `admin-getServers`, `admin-getOffers`. Nothing polls after that.
Tell your own seed calls apart: they come from `floorstate.mjs` with guest, kitchen@, server@, server2@ or manager@ sessions.

| screen action | function(s) | lines worth grepping |
|---|---|---|
| dish Save (new / edit) | `menu-addMenuItem` / `menu-updateMenuItem`, then `menu-getRestaurantMenu` + `admin-getRestaurantSettings` | `updateMenuItem function called with request:` logs the whole payload: look at `addons` (ids or objects?) and `isInStock`. `Unknown tax block`, `Error in updateMenuItem:` |
| stock switch | `menu-updateMenuItemAvailability` | `updateMenuItemAvailability function called with request:` |
| category / subcategory | `admin-addCategory` … `admin-deleteSubcategory` | `Error in addCategory:` |
| guest add / checkout (read-back) | `cart-addItemToCart`, `cart-checkoutCart` | `Add-on is not offered on this dish`, `Variant not found`, `Invalid price data in menu item`, `PriceInfo: Discount clamped`, `out of stock` |
| offer create / edit / switch / delete | `admin-createOffer` / `-updateOffer` / `-deleteOffer`, then `admin-getOffers` | `Error in updateOffer:` (A22's refusal lands here, invisible on screen), `evaluateOrderOffers: offer … eval failed`, `OFFERS: Offers disabled` |
| settings switch | `admin-updateRestaurantSettings` | `Error in updateRestaurantSettings:` |
| Settings tab open | `admin-getRestaurantSettings` | none: A31's failure is a client parse error, so it shows only in `$B console --errors` |
| table switch / edit | `admin-updateTableStatus` / `admin-updateTable`, then `admin-getTables` | `Error in updateTableStatus:`, `Cannot disable an occupied table` |
| staff add / edit / switch / reset | `admin-addServer` / `-updateServer` / `-resetServerPin`, then `admin-getServers` | `Error in addServer:` |
| orders tab / card | `admin-getHistoricalOrders` / `admin-getOrderDetails` | `Error in getHistoricalOrders:` |

After every admin write, read the document back (`get menuItems/<id>`, `offers/<id>`, `config/settings`,
`tables/<id>`, `servers/<id>`), then the other app's read (`floorstate <n> seen`, the guest menu, a guest add).
The screen is not evidence of a save (§0).

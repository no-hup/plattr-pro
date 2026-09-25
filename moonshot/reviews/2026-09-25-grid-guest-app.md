# QA grid: guest (consumer) app, 2026-09-25

Prep for a driver exploring the guest app screen by screen ([AGENT_QA.md](../../AGENT_QA.md) §5–§7). Written
read-only before the run; every expected amount was worked out by hand here, before a tap ([TESTING.md](../../TESTING.md)).
The live guest app is [frontend/flutter_boilerplate/](../../frontend/flutter_boilerplate/) (top-level `consumer/` is dead).
Sources: [CLAUDE.md](../../CLAUDE.md) "Price Calculation Reference" (per-component discount) and the waiter gate,
[SPEC_BL](../SPEC_BL_billing_and_tax.md) (offers auto-apply at checkout, BL-S24), [SPEC_FL](../SPEC_FL_floor_and_moves.md)
(FL-S14, R18, FL-S34, FL-S36), the offer engine and checkout code listed below. Format follows the
[kitchen grid](2026-09-25-grid-kitchen-app.md). Verdicts are in the [report](2026-09-25-qa-guest-app.md#coverage-grid).

**File keys** (app = [lib/](../../frontend/flutter_boilerplate/lib/), backend = [functions/](../../backend/src-plattr/functions/)):

| key | file | key | file |
|---|---|---|---|
| CP | [pages/cart_listing/cart_page.dart](../../frontend/flutter_boilerplate/lib/pages/cart_listing/cart_page.dart) | CO | [cart/checkoutCart.js](../../backend/src-plattr/functions/cart/checkoutCart.js) |
| OL | [pages/checkout_order_flow/order_listing_page.dart](../../frontend/flutter_boilerplate/lib/pages/checkout_order_flow/order_listing_page.dart) | EO | [offers/evaluateOrderOffers.js](../../backend/src-plattr/functions/offers/evaluateOrderOffers.js) |
| MS | [pages/menuListing/widgets/menu_customization_sheet.dart](../../frontend/flutter_boilerplate/lib/pages/menuListing/widgets/menu_customization_sheet.dart) | OE | [offers/offerEngine.js](../../backend/src-plattr/functions/offers/offerEngine.js) + [strategies/](../../backend/src-plattr/functions/offers/strategies/) |
| MP | [pages/menuListing/MenuPage.dart](../../frontend/flutter_boilerplate/lib/pages/menuListing/MenuPage.dart) | CCV | [cart/calculateCartValue.js](../../backend/src-plattr/functions/cart/calculateCartValue.js) |
| MW | [pages/menuListing/menu_widgets.dart](../../frontend/flutter_boilerplate/lib/pages/menuListing/menu_widgets.dart) | TBL | [table/table.js](../../backend/src-plattr/functions/table/table.js) (scan, OTP), [table/mergedTables.js](../../backend/src-plattr/functions/table/mergedTables.js) |
| TV | [pages/table_verification/table_verification_state.dart](../../frontend/flutter_boilerplate/lib/pages/table_verification/table_verification_state.dart) | FS | [qa/floorstate.mjs](../../backend/src-plattr/functions/test/e2e/qa/floorstate.mjs) |

**Run 2026-09-25 (screen half):** 50 cells (+1 added, G13b): 15 FAIL, 3 NOTE, 28 PASS, 2 NOTBUILT, 2 not run. 11 new findings QG-4…QG-14 (1 P0, 3 P1, 7 P2), plus TD-119 and TD-120 confirmed on screen. Correction to the grid: G11's cart is ₹840 → ₹560 as written, but its *order* at ×3 is ₹740 (840 ≥ 499 fires FLAT), per the API pass.

## 0. Read this before starting

- **Slot 0 only.** The guest app is hardcoded to `:5002`. App: `run_app.sh consumer` → `:5051`. Phone viewport 430×900.
- **What the guest's money shows.** Cart: `Subtotal` (struck, only when menu discounts exist), `Discount`, `To Pay`
  = the cart's `priceInfo` (CP:650-710) — the **whole table's cart**, although checkout sends only this phone's lines
  (`addedBy`, CO:95). Order page: `Total Amount` = `order.priceInfo.finalPrice` (after the order offer) and a green
  "You saved ₹X with <offer>!" banner (OL:333, 420). Per round: "Cart total". **Food only, by design**: no service
  charge or GST before the till bills.
- **Offers** (EO, OE): every active offer is evaluated at checkout over the whole order; **only the best one** applies.
  `minOrderValue` is tested against the **pre-discount** base (OE:45). FLAT ORDER = min(value, base). PERCENTAGE
  CATEGORY = % of each eligible line's final price, capped. BOGO = the cheapest eligible unit(s) free.
  Meghana: `off_meg_flat100` ₹100 off, min ₹499 (ORDER); `off_meg_bir10` 10 % biryani category, max ₹120;
  `off_meg_bogo_paneer` BOGO Paneer 65; expired and inactive ones must never fire.
- **Per-component discount** (CLAUDE.md): a variant/add-on with `respectParentDiscount: true` takes the item's menu
  discount %. Mutton Biryani is 10 % off; Family (+₹260) and Extra Gravy (+₹60) inherit it, Extra Raita does not.
- **Not built** (a cell, not a stop): veg filter, search (`nav-search` has no handler), dish notes (no field anywhere in
  the guest app), a bill/pay view.
- **Seeding a guest's phone onto a seeded sitting:** `FS <n> <state>` seats phone 9876543210; put that session into
  `sessionStorage['restaurant_session_state']` exactly as `ab seed-consumer` does, then set `location.hash`.

## 1. Controls

| id | what | file |
|---|---|---|
| `verify-name`, `verify-phone`, `verify-otp`, `verify-submit` | sign-in page / OTP dialog | TV, otp_input_dialog |
| category carousel (no id) | jump to a category | category_carousel |
| `menu-add-<itemId>`, `menu-<itemId>-inc/-dec` | add / quantity on the menu | MW:353 |
| `sheet-add` ("ADD ₹n"), options, add-ons | customization sheet | MS:434 |
| `menu-open-cart` | View Cart | MP:373 |
| `cart-<cartItemId>-inc/-dec`, Remove → REMOVE | cart line | CP:533, quantity_selector |
| `cart-checkout` | PROCEED TO CHECKOUT | CP:721 |
| `nav-menu`, `nav-cart`, `nav-orders`, `nav-search`, `nav-offers` | app bar | consumer_app_bar |
| offers carousel card (no id) | offer detail sheet, informational | MP:455 |

## 2. States

| # | state | seed |
|---|---|---|
| T1 | table vacant, first scan | tables 6, 7, 9, 10, 11 |
| T2 | table held by another scan (OTP in flight) | `FS <n> holding` |
| T3 | table active with another guest (join) | table 1 (seeded Customer One + cart ₹830) |
| T4 | merged child QR (8 into 10) | `FS 10 merged` |
| T5 | reserved / disabled | tables 4 / 5 |
| T6 | billed at the till | round on screen, then `FS <n> bill` |
| T7 | paid (settled, still sitting) | then `FS <n> pay` |
| T8 | cleared | then `FS <n> clear` |
| T9 | guest session expired | `FS <n> expired` + inject session |
| T10 | waiter gate on | `FS gate on` |
| T11 | dish out of stock mid-cart | `FS stock mi_chicken65 off` |
| T12 | round cancelled by manager / kitchen READY | `FS <n> cartcancelled` / `FS <n> ready` |

## 3. The grid — money first

Hand amounts. "Order" = `Total Amount` on the order page; "cart" = `To Pay`. **Bold** = expected to fail or risky.

### A. Money (each amount by hand)

| # | screen | dish / state | expected (hand) | source |
|---|---|---|---|---|
| G01 | menu card | Paneer 65 | ₹240 struck, ₹204 | seed 15 % |
| G02 | cart → order | Butter Naan ×1, T1 | cart ₹60 (no Subtotal/Discount rows); order ₹60, no banner (base 60 < 499) | OE |
| G03 | cart → order | Paneer 65 ×1 | cart Subtotal ₹240, Discount −₹36, To Pay ₹204; order ₹204, no offer (BOGO needs 2) | OE BOGO |
| G04 | cart → order | Paneer 65 ×2 (cart +) | cart Subtotal ₹480, Discount −₹72, To Pay ₹408; order **₹204**, banner "saved ₹204.00 with BOGO Paneer 65" (one unit at ₹204 free; FLAT not eligible, base 480 < 499) | OE BOGO |
| G05 | sheet → cart → order | Veg Biryani, Single, no add-on | sheet ADD ₹260; cart ₹260; order **₹234**, banner ₹26 (10 % biryani; FLAT base 260 < 499) | OE PERCENTAGE |
| G06 | sheet | Mutton Biryani + Family + Extra Gravy + Extra Raita | the sheet's ADD price = what the cart will charge: 378 + 234 + 54 + 40 = **₹706** | CLAUDE.md per-component |
| G07 | cart | same | Subtotal ₹780 (420+260+60+40), Discount −₹74, To Pay ₹706 | CLAUDE.md, CCV |
| G08 | order | same | biryani 10 % = ₹70.60 vs FLAT ₹100 (base 780 ≥ 499) → FLAT wins: order **₹606**, banner ₹100 "₹100 Off (min ₹499)" | EO best-one |
| G09 | cart → order | Chicken 65 + Paneer 65 (base 520, final 484) | cart To Pay ₹484; order **₹384** — FLAT fires because the test is on the pre-discount ₹520 | OE:45 |
| G10 | order, round 2 | round 1 Chicken 65 + Butter Naan ×2 + Gulab (₹490, no offer: order ₹490); round 2 Butter Naan | round 2 "Cart total" ₹60; order re-evaluated over 550 → FLAT: **₹450**, banner appears | EO over all carts |
| G11 | cart qty | Chicken 65, + to 3, − to 2 | ₹840 → ₹560 on screen and in the cart doc | CCV |
| G12 | order | Andhra Chicken Curry, Spice Andhra Hot (₹0 option) | ₹320, spice shown on the line | seed |
| G13 | cart, two phones | this phone Butter Naan; another phone (API, `addedBy` other) Chicken 65 | the screen makes clear what "PROCEED" sends. **To Pay shows ₹340 while checkout sends ₹60** | CO:95, CP:650 |
| G14 | order | expired offer / paused offer never fire | Chicken 65 alone → ₹280, no banner (expired 25 % would make it ₹210) | seed negatives |
| G15 | menu offers carousel | offers listed | the live three shown; expired/paused absent; detail says "applied automatically at checkout" | MP:516 |

### B. Sign-in and table states

| # | control | state | expected | source |
|---|---|---|---|---|
| G16 | scan route | T1 | verify page: name, phone; OTP prefilled (debug build) → menu, "TABLE 7" | AGENT_QA §8 |
| G17 | verify-submit | phone 9 digits / empty name | refused inline, no call | TV:511-531 |
| G18 | OTP | wrong OTP 000000 | refused with a message, stays on dialog, no session | TBL validateOTP |
| G19 | scan | T5 reserved (4) | "ask the staff", 403, no session | FRONTEND_TESTING §5 |
| G20 | scan | T5 disabled (5) | "table unavailable", no session | TV:155 |
| G21 | scan | T3 table 1 (Customer Two joins) | join via OTP → same sitting as Customer One; cart shows "Rest of the table" (not editable) | CP:239 |
| G22 | cart | T3 joiner | To Pay vs what checkout sends (the seeded ₹830 is not the joiner's) | CO:95 |
| G23 | scan | T4 child 8 of 10 | lands in 10's sitting; the round is on 10's order; header number the guest recognises | mergedTables.js:8 |
| G24 | scan | T2 holding by another phone | a second phone either joins the same hold or is told to wait; no two sittings | TBL:101 |
| G25 | reload | on menu / cart / orders | still signed in, same cart, same route | session storage |
| G26 | back | browser Back from the order page after checkout | no resubmit, no empty cart confusion | AGENT_QA §5 go back |

### C. Menu, sheet, cart

| # | control | state | expected | source |
|---|---|---|---|---|
| G27 | category carousel | menu | tapping Seafood scrolls to Seafood | category_carousel |
| G28 | veg filter / search | menu | NOT BUILT (search icon: no handler) | consumer_app_bar |
| G29 | sheet mandatory | Veg Biryani, no portion picked | ADD blocked or Single default; never a portion-less line | variant `isMandatory` |
| G30 | sheet OOS add-on | Veg Biryani: Prawn Topping (OOS) | not selectable or refused with the dish named | TD-015 closure |
| G31 | menu | T11: Chicken 65 out of stock | after refresh: "Out of Stock" badge, no add button | MW:314-339 |
| G32 | checkout | T11 mid-cart (added, then 86'd) | refused naming "Chicken 65"; cart unchanged; guest can remove and send the rest | CO:105 |
| G33 | cart Remove | own line | REMOVE confirm → gone, To Pay drops | CP:589 |
| G34 | cart − to 0 | own line | removed (or floor at 1) — never ₹0 line | quantity_selector |
| G35 | notes | cart / sheet | NOT BUILT: no way to say "no onion" | — |
| G36 | 360 wide | menu, sheet, cart | nothing clipped; To Pay and PROCEED visible | FRONTEND_TESTING §2 |

### D. Checkout, tracking, rounds

| # | control | state | expected | source |
|---|---|---|---|---|
| G37 | checkout | T1 | one order IN_PROGRESS, cart PENDING, one line per item with tax block; route → orders | spine step 1 |
| G38 | checkout double tap | T1 | one order, one cart (requestId) | OF R1, CO:60 |
| G39 | order page | T10 gate on | round shows "WAITING FOR CONFIRMATION"; kitchen doesn't see it | CLAUDE.md gate, OL:759 |
| G40 | order page | T12 kitchen READY | status READY after refresh / poll | OL |
| G41 | order page | T12 round cancelled by manager | round shows CANCELLED; **Total drops** to what is still owed | lineSnapshots voidCartLines |
| G42 | second round | T1 → round 2 | same order, 2 carts, "Cart total" per round | FRONTEND_TESTING §11 |
| G43 | order page | T6 billed | the guest sees the bill is on its way (or nothing misleading); order total vs bill: food only by design | S2 note |
| G44 | round after bill | T6 | accepted (FL-S20 dessert after the bill) and the guest can tell it's on a new bill | FL-S20 |
| G45 | checkout | T7 paid, still sitting | **refused** (R18/FL-S14) — known TD-097 for the captain; check the guest side | FL-S14, R18 |
| G46 | scan by a stranger | T7 paid | **cannot join** the paid party's sitting (R18) | FL-S14 |
| G47 | old phone after Clear | T8 | "session ended" on the next call (FL-S36 wording), not a silent new sitting on a free table | FL-S36 |
| G48 | add + checkout | T9 expired | the round lands on the same sitting as the first (FL-S34); known TD-090 for the captain, check the guest side | FL-S34, TD-090 |
| G49 | order page | T1 after checkout | "Order placed" and the orders list shows it; hash route stays on `/orders` | S2 note |

## 4. Misuses, for a guest on a phone

| misuse | cells |
|---|---|
| repeat | G38 |
| go back / reload | G25, G26 |
| stale screen (dish 86'd while in the cart) | G32 |
| two people at once | G13, G21, G22, G24 |
| after the till acted | G43–G47 |
| session expired | G48 |

## 5. Do not report

TD-020/TD-021 (offer tie-break, unread conditions), TD-046, TD-082, TD-090, TD-097, TD-099, TD-052, and every open
TECH_DEBT row touching the consumer/guest/cart/checkout/offers. By design: the guest's cart and order show food only
(no service charge or GST before the till bills). Debug build prefills OTP 123456. Report a known one only if the
guest side is worse.

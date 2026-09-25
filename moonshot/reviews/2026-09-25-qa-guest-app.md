# QA exploration: guest (consumer) app, 2026-09-25

Screen exploration of the guest app ([frontend/flutter_boilerplate/](../../frontend/flutter_boilerplate/lib/)), per
[AGENT_QA.md](../../AGENT_QA.md) §2 and §5–§7, working through the [grid](2026-09-25-grid-guest-app.md) (49 cells)
money first. One Opus driver with one headless gstack tab; the parent session observes. This is the **screen half**:
cells already answered by endpoint in the [API pass](2026-09-25-qa-admin-guest-api-pass.md) were only checked for
what the guest sees. Trajectory:
[test/e2e/results/qa-guest-app-2026-09-25.jsonl](../../backend/src-plattr/functions/test/e2e/results/qa-guest-app-2026-09-25.jsonl)
(gitignored, local only: 55 lines, one per cell plus one per second-scenario repro, marked `repro_of`).

Stack: slot 0 (Firestore `:8080`, functions `:5002`, log `backend/flutter-app-logs/emulator.log`), because the guest
app is hardcoded to `:5002`. MockData7 re-imported `--clean --refresh-timestamps` at the start (not rebuilt: the seed
JSON has someone else's uncommitted edits). Guest app via `run_app.sh consumer` (`:5051`), viewport 430×900 (a phone),
one pass at 360×800. Preflight: free+inactive 2.6 GB, personal Chrome 4.0 GB, ok (memory refusal removed in `a590ac4`).
Restaurant `res_meghana`, tables 1, 4–12; guests 9876543210/11/12 and made-up numbers, OTP 123456. Till, kitchen and
manager acts through [qa/floorstate.mjs](../../backend/src-plattr/functions/test/e2e/qa/floorstate.mjs) (`bill`, `pay`,
`clear`, `ready`, `stock`, `expired`, `merged`, `gate`). Every verdict cites a read-back (`floorstate <n> dump` /
`seen`, the `orders`, `carts`, `lines`, `bills` documents). Screenshots in the driver's scratchpad (`g*.png`, named by
cell). About 190 browser commands of the 250 budget.

## Result

| verdict | cells |
|---|---|
| FAIL | 14 (+1 added cell, G13b): G06, G13, G13b, G15, G17, G23, G32, G39, G40, G41, G44, G46, G47, G48, G49 |
| NOTE | 3: G22, G31, G43 |
| PASS | 28: G01, G02, G03, G04, G05, G07, G08, G09, G10, G11, G12, G14, G16, G18, G19, G20, G21, G25, G26, G27, G29, G30, G33, G34, G36, G37, G38, G42 |
| NOTBUILT | 2: G28 (search, veg filter), G35 (dish note) |
| not run | 2: G24 (two phones on one OTP hold), G45 (paid party orders again: TD-097 as filed, per the API pass) |

Every FAIL was reproduced in a second scenario with one thing changed before it was logged (AGENT_QA §7). Two are
known rows confirmed on screen (TD-119 G13, TD-120 G46, the latter not worse than filed). The rest are **11 new
findings: 1 P0, 3 P1, 7 P2**. Every amount the guest app printed matched the hand sum and the database, except the
customization sheet's price (QG-4). The one real money loss is on the till side, reached from a guest's dessert (QG-5).

## Findings

Ids continue from the API pass (QG-2, QG-3). QG-1 is the groups run's.

### QG-5 · P0 · A dessert ordered after the bill gets the order offer a second time

**Scene.** 21:40, table 12 had Chicken 65 + Paneer 65 (₹484, "₹100 Off (min ₹499)" fired). The cashier issues A-0002
for ₹423. They then order a Qubani ka Meetha (₹119) from the QR menu. The dessert draft comes to **₹21**, not ₹131:
the ₹100 offer already on A-0002 is taken off again. On a table whose offer is bigger than the dessert (table 7, biryani
10 % = ₹113.80, then a ₹90 Gulab Jamun) the dessert cannot be billed at all.

**Steps (clean seed).** Guest on table 12 orders Chicken 65 + Paneer 65 (screen or `cart-addItemToCart` ×2 + checkout).
`node floorstate.mjs 12 bill`. The guest orders Qubani ka Meetha. `node floorstate.mjs 12 seen`.

**Expected.** The offer is given once per order. A-0002: (484 − 100) × 1.05 × 1.05 = 423.36 → ₹423. Dessert draft:
119 × 1.05 × 1.05 = 131.20 → **₹131**. Source: BL decision 2026-09-15 (the bill reads `order.appliedOffer`
as placed), BL-S24; the guest app's own total (₹503 = 484 + 119 − 100) counts the ₹100 once.

**Seen.** A-0002 payable 42300 (= hand). Dessert draft `TuLhxDdTUQAb4hGot6QC`: lines `[Qubani ka Meetha 14000]`,
payable **2100** (119 − 100 = 19 × 1.1025). Guest screen: "Total Amount: ₹503.00" (hops 31, 32).

**Second scenario.** Table 7, biryani 10 % offer (₹113.80): A-0003 ₹1,129 (= 1024.20 × 1.1025, hand). Gulab Jamun
after the bill: `billing-preview` on the dessert draft refuses "discount exceeds bill" (hop 33). **Held**: the
restaurant either gives the offer twice or cannot bill the dessert. Related to TD-065 (the till has no door to bill a
dessert after the bill) but this is the money inside the preview, not the door.

**Where to look.** The draft preview in `app/billing.ts` applies `order.appliedOffer.discountAmount` to every new draft
of the sitting, with no memory of the share already issued on an earlier bill.

### QG-4 · P1 · The customization sheet quotes more than the cart charges when the dish is discounted

**Scene.** 20:30, a guest builds a Mutton Biryani (10 % off) Family with Extra Raita and Extra Gravy. The sheet's button
says "ADD ₹738". The cart then says ₹706. A guest who budgets from the sheet sees two prices for one dish; one who
reads ₹738 as the price may not order a second one.

**Steps.** Clean seed, table 7, sign in. `menu-add-mi_mutton_bir`, pick Family, Extra Raita, Extra Gravy.

**Expected.** ADD **₹706** = 378 + 234 (Family 260 − 10 %) + 54 (Gravy 60 − 10 %) + 40 (Raita, no inherit).
Source: CLAUDE.md "Price Calculation Reference" (per-component, `respectParentDiscount`).

**Seen.** Sheet "Family (serves 3) +₹260", "Extra Gravy +₹60", **"ADD ₹738"**. After ADD: cart doc `finalPrice 706`,
"To Pay: ₹706.00" (hops 3, 4). The cart line also lists the components at list price (Family ₹260.00, Gravy ₹60.00)
beside a ₹706.00 line.

**Second scenario.** Single + Extra Gravy only: "ADD ₹438", cart ₹432 (hop 8). **Held.**

**Where to look.** [menu_customization_sheet.dart:57-75](../../frontend/flutter_boilerplate/lib/pages/menuListing/widgets/menu_customization_sheet.dart)
adds each option's and add-on's `finalPrice` as listed and never applies the parent discount.

### QG-6 · P1 · A guest on a merged table's QR sees the previous party's order, never their own

**Scene.** 21:00, tables 11 and 8 are pushed together; a guest scans table 8's QR and orders a Butter Naan, then a
Gulab Jamun. Both rounds go correctly onto table 11's sitting. But their Orders page shows "Order #ORD-00008 … 1x
Butter Naan ₹60.00, Total ₹60.00, placed 14:21": the order of the party that sat at table 8 earlier, paid and left. The
gulab never appears. They will order it again.

**Steps.** Clean seed. Table 8: a guest orders a Butter Naan; `floorstate 8 bill`, `8 pay`, `8 clear` (leaves that order
IN_PROGRESS, TD-082). `floorstate 11 merged` (8 into 11). New phone scans `#/r/res_meghana/t/tbl_meg_8`, signs in,
orders on screen.

**Expected.** Rounds on 11's sitting (they are) and the Orders page shows that sitting's order. Source: mergedTables.js
"someone scanning table 6 has to land in table 5's session, table 5's cart and table 5's order"; FL-S14's spirit (no
stranger's tab).

**Seen.** Stored: session `anu9UE72aIUh809KcggF` on `tbl_meg_11`, order `TGlPAPDDcNxUYEo7ZSSg` (ORD-00010) with the
guest's carts. Screen: ORD-00008 (`fKT2ARvLTKFP99GauDER`, `tbl_meg_8`, session `Envl241FXtutc0lhngNI`,
`paymentStatus: paid`). `order-getOrder` was called `{tableId: tbl_meg_8, sessionId: anu9…}` (hop 45).

**Second scenario.** Same phone, Gulab Jamun round: stored on 11 (2 carts); screen still ORD-00008, naan only, ₹60
(hop 46). **Held.** Without TD-082's leftover the same read finds no order on 8 at all, so the guest still wouldn't see
theirs.

**Where to look.** [orders/getOrder.js](../../backend/src-plattr/functions/orders/getOrder.js) reads by the scanned
`tableId` without `resolveTableId`, and returns an order from another (ended) session.

### QG-7 · P1 · Once a sitting expires, no guest can ever sign into that table again

**Scene.** 23:05, table 10 has been eating since 19:00 and the four-hour session ends. Deepa taps ADD on the menu; the
app asks her to verify. She types the code the waiter gives her: refused. She rescans: refused. A new guest at the same
table: refused. The only words are a 4-second "No active session for this table" under a dialog that says "Please ask
QA 6 or your server for the OTP code."

**Steps.** Clean seed. `floorstate 6 expired`. Open `#/r/res_meghana/t/tbl_meg_6` fresh, any name, OTP 123456, Submit.

**Expected.** The guest carries on in the same sitting (FL-S34: an expired session is not an empty table), or is told
plainly to call the waiter.

**Seen.** Table 6 `active`, the only session `expired`. `table-validateOTP` 400 "No active session for this table";
snackbar with that text; dialog stays (hops 37, 41). On table 10, from the menu: tap ADD → 401 → the dialog; Submit →
"OTP data missing for the table. Please try scanning again."; rescan + Submit → "No active session for this table"
(hop 36). **Held** on two tables, two guests. TD-090 is the captain's door on the same state (it opens a second
sitting); the guest's door is shut.

**Where to look.** [table/table.js](../../backend/src-plattr/functions/table/table.js) `validateOTP`: an `active` table
whose session expired has no branch.

### QG-8 · P2 · The Orders page hides every round's status: a cancelled round just vanishes

**Scene.** 20:45, the kitchen runs out and the manager cancels table 11's Veg Biryani round. The guest's Orders page
drops the biryani without a word. Their Chicken 65 is READY and the page still says IN PROGRESS. With the waiter gate on,
a round waiting for the waiter reads the same IN PROGRESS.

**Steps.** Clean seed. Guest orders two rounds; `floorstate <n> ready 0`; manager `cart-updateCartStatus` round 1
`CANCELLED`. Open Orders.

**Expected.** Each round shows READY / CANCELLED / WAITING FOR CONFIRMATION (the labels exist, OL:759; CLAUDE.md
waiter gate).

**Seen.** Default view: a flat list of live items, the order's IN PROGRESS chip, "Total Amount: ₹384.00". The round
chips READY and CANCELLED appear only after "Toggle View Mode" → switch, which is off by default
([featureFlags.dart:17](../../frontend/flutter_boilerplate/lib/singletonGods/featureFlags.dart)) (hop 28). The total is
right. **Second scenario:** table 11, Veg Biryani round cancelled: gone silently (hop 29). **Third:** gate on, table
10: "IN PROGRESS" while the cart is AWAITING_CONFIRMATION (hop 30). **Held.**

**Where to look.** `showCartLevelBreakupForOrder = false` picks the flat list, which carries no status.

### QG-9 · P2 · The offers strip never appears, so guests learn of an offer only after ordering

**Scene.** A couple orders one Paneer 65 at ₹204. Nothing on the menu tells them a second one is free. They find
"BOGO Paneer 65" only if they happen to order two.

**Steps.** Clean seed, any table, sign in, look under the category bar.

**Expected.** The offers carousel (MP:259) lists the three live offers, with "applied automatically at checkout".

**Seen.** No carousel. `offers-getApplicableOffers` 200 "Found 4 offers"; console "🎁 OFFERS: Loaded 0 offers"
(hop 2). **Second scenario:** table 7 after two biryani rounds, same (hop 11). **Held.** The API list also returns the
expired "Expired Ugadi Offer" (isApplicable false), which would show once the strip works.

**Where to look.** [offers_repository.dart:115](../../frontend/flutter_boilerplate/lib/pages/menuListing/offers_repository.dart)
reads `data['data']`; the callable reply nests it under `result`. The request also omits `sessionId`.

### QG-10 · P2 · After an order the address loses the table, and a reload lands on the Welcome page

**Scene.** 20:30 on patchy 4G, the guest places an order and the phone reloads the tab. They are on a "Welcome /
QR: 1 … QR: 12" page, not their table. In production they'd have to find the QR again.

**Steps.** Clean seed, any table, add a dish, PROCEED; `$B url`; reload.

**Expected.** The route stays `#/r/res_meghana/t/<table>/orders`.

**Seen.** `http://127.0.0.1:5051/?agent=1` right after checkout; reload shows the Welcome list (hop 6). **Second
scenario:** round 2, other dish, same (hop 10). **Held.** (Sanity run 2 noted the dropped hash, not the reload.)

**Where to look.** [cart_page.dart:756](../../frontend/flutter_boilerplate/lib/pages/cart_listing/cart_page.dart)
`context.replace('/r/$restaurantId/t/$tableId/orders')`.

### QG-11 · P2 · After the table is cleared, the guest's taps do nothing and say nothing

**Scene.** 22:00, table 8 paid and was cleared, but Gita's phone is still on the menu. She taps ADD on a Gulab Jamun.
Nothing happens. She taps again. The cart says "Your cart is empty".

**Steps.** Clean seed. Guest on the menu of table 8; `floorstate 8 bill`, `pay`, `clear`; tap `menu-add-mi_gulab`.

**Expected.** "This table's sitting has ended" in words (FL-S36: the phone gets "session ended" on its next call).

**Seen.** `cart-addItemToCart` 401 "Authentication required"; no snackbar or dialog at 0.8 s and 2 s (hops 34, 35,
42). **Held** on tables 11 and 8 (twice on 8). The expired case (QG-7) and a wrong OTP do show a snackbar; this one
doesn't.

**Where to look.** Every 401 calls `AuthPrompt.showIfNeeded(force: true)`
([dio_client.dart:72](../../frontend/flutter_boilerplate/lib/networking/dio_client.dart)); after an expiry it drew the
OTP dialog, after a Clear it drew nothing.

### QG-12 · P2 · A dish sold out while in the cart turns into "Unknown Item ₹0.00", but To Pay still counts it

**Scene.** 20:50, prawns and Apollo Fish run out while a guest has Apollo Fish in the cart. The cart now reads
"Unknown Item ₹0.00" and "Gulab Jamun ₹90.00", yet "To Pay ₹396.00". PROCEED replaces the page with "Oops! Something
went wrong / Cannot checkout. The following items are out of stock: Apollo Fish", a dish the cart no longer names.

**Steps.** Clean seed. Add Apollo Fish + Gulab Jamun; `floorstate stock mi_apollo_fish off`; open the cart; PROCEED.

**Expected.** The cart names the dish and marks it sold out; the total agrees with the rows; after the refusal the cart
stays in view (grid G32, CO:105).

**Seen.** Hop 48 as above (306 + 90 = 396). **Second scenario:** Chicken 65 + Qubani: after "Try Again", "Unknown Item
₹0.00" beside "To Pay ₹399.00" (hop 47). **Held.** Removing the Unknown row and sending the rest works.

**Where to look.** The cart row resolves name and price from the menu read, which is fetched `inStock: true`
([cart_page.dart:338](../../frontend/flutter_boilerplate/lib/pages/cart_listing/cart_page.dart)).

### QG-13 · P2 · Any phone number is accepted at sign-in, even "1"

**Scene.** A guest fat-fingers their number as 98765. They are let in, and their sitting belongs to "98765"; the next
time they type their real number they are a different guest.

**Steps.** Clean seed, vacant table, name, phone `98765`, OTP 123456, Submit.

**Expected.** Refused inline (a 10-digit number).

**Seen.** Menu; session `sMR3zBqcUmbofrxiyZBr` `primaryUserId: "98765"` (hop 38). **Second scenario:** table 8, phone
`1`: session `5rKa1Cr6YOeNHyxsnOhX` `primaryUserId: "1"` (hop 39). **Held.**

**Where to look.** [table_verification_state.dart:531](../../frontend/flutter_boilerplate/lib/pages/table_verification/table_verification_state.dart)
and the OTP dialog check only for empty; `validateOTP` takes any string.

### QG-14 · P2 · With only a friend's dish in the cart, PROCEED is live and then says the cart is empty

**Scene.** A friend's phone added two Butter Naan to table 10's cart. Deepa opens the cart: "Rest of the table: Butter
Naan ₹120.00", "To Pay ₹120.00", and a live PROCEED. She taps it: a whole-page "Oops! Something went wrong / Cannot
checkout an empty cart".

**Steps.** Clean seed. Sign in on 10; another phone's `cart-addItemToCart` (`addedBy` another id); open the cart; PROCEED.

**Expected.** PROCEED off, or "nothing of yours to send; your friend sends theirs".

**Seen.** Hop 19. **Second scenario:** paid table 9, stranger's phone with the leftover Chicken 65: "To Pay ₹280.00",
same page (hop 17). **Held.** Same cause as TD-119 (To Pay is the whole table's cart), a worse edge of it.

### Known rows confirmed on screen

- **TD-119 (QG-2)**, G13: "YOURS … REST OF THE TABLE Chicken 65 ₹280.00 Added by someone else at this table", "To Pay:
  ₹340.00", PROCEED → "1x Butter Naan ₹60.00 … Total Amount: ₹60.00"; Chicken 65 left in the cart (hops 12, 13: ₹370
  shown, ₹150 order).
- **TD-120 (QG-3)**, G46: a stranger on paid table 9 is let in (the dialog names the paid party's guest, "Please ask
  Bhanu"), and their Orders page lists Bhanu's paid naan and gulab under their own Qubani, "Total Amount: ₹269.00"
  (hops 16, 18). As filed, not worse.

## Notes (one scenario, by design, or unspecified)

- **G22** (NOTE, seed): the seeded table-1 cart has no `addedBy`, so a joiner sees Customer One's dishes as their own,
  editable, "To Pay ₹848.00", and sends ₹90 (hop 15).
- **G31** (NOTE): a sold-out dish disappears from the menu instead of showing the "Out of Stock" badge (hop 49). The
  admin grid expects hiding, this grid a badge.
- **G43** (NOTE, by design): after the bill the guest's page still reads the food total (₹384) and says nothing about
  the bill (₹423) being issued (hop 31).
- **G09**: "₹100 Off (min ₹499)" fires on a cart whose To Pay is ₹484, because the minimum is tested on the pre-discount
  ₹520 (OE:45). Generous, but the title reads as a rule the cart broke.
- **No table number anywhere** on the menu or cart (MP:416 draws "TABLE n" only when `tableNumber` is set; it isn't).
- **No bar menu**: Kingfisher, Bira and Old Monk are absent from the guest menu (no BAR category). Maybe deliberate
  (liquor by the waiter only); unspecified.
- **The first guest at a vacant table** reads "Please ask the restaurant staff for the OTP to join this table". The
  join dialog names "Please ask <name> or your server": the name is the phone owner's last name on the customer record,
  so it can be a stale or a paid party's name (Bhanu, "QA 6").
- **An open OTP dialog survives a table change** in the same tab (a second QR scanned): it then submits against the
  new table with `phoneNumber: null` (seen once, while setting up QG-11's repro).
- **Remove Item** asks "remove this item" without naming the dish (hop 25).
- The floating menu button covers the struck price and ADD of the card at the bottom edge (430 wide).

## The money: hand vs screen vs database

| cell | what | hand | screen | database |
|---|---|---|---|---|
| G06 | Mutton Biryani Family + Raita + Gravy, sheet | ₹706 | **ADD ₹738** | cart 706 |
| G06 repro | Mutton Single + Gravy, sheet | ₹432 | **ADD ₹438** | cart 432 |
| G07 | same, cart | 780 / −74 / 706 | ₹780.00 / -₹74.00 / ₹706.00 | base 780, final 706 |
| G08 | order (FLAT 100 beats biryani 70.60) | ₹606 | ₹606.00, saved ₹100 | final 606, offer 100 |
| G42 | + round 2 Mutton Single + Gravy (biryani 113.80 beats FLAT) | ₹1,024.20 | ₹1024.20, saved ₹113.80 | final 1024.2, offer 113.8 |
| G03 | Paneer 65 ×1 cart | 240 / −36 / 204 | same | — |
| G04 | Paneer ×2: cart / order (BOGO) | 408 / ₹204 | ₹408.00 / ₹204.00 | final 204, offer 204 |
| G05 | + Veg Biryani Single (BOGO 204 beats FLAT, biryani 26) | ₹464 | sheet ₹260, cart ₹260, order ₹464.00 | final 464 |
| G09 | Chicken 65 + Paneer 65 | cart ₹484, order ₹384 | same | — |
| G12 | + Andhra Chicken (Andhra Hot) + Gulab | ₹794 | ₹794.00 | base 930, final 794 |
| G33 | cart 470 − Butter Naan | ₹410 | ₹410.00 | cart 410 |
| G13 | To Pay vs sent | shows what's sent | ₹340 / sent ₹60; ₹370 / sent ₹90 | lines 6000; 9000 |
| G41 | total after round 2 cancelled | ₹384 | ₹384.00 | — |
| G43 | table 12 bill A-0002 | ₹423 | (guest ₹384, food only) | payable 42300 |
| G44 | dessert Qubani after the bill | ₹131 | (guest ₹503) | **draft payable 2100** |
| G44 repro | table 7 bill A-0003; dessert Gulab | ₹1,129; ₹99 | — | 112900; **"discount exceeds bill"** |
| G46 | table 9 bill A-0001 (naan + gulab) | ₹165 | — | 16500 |
| G47 | table 11 bill A-0004 (Paneer ×2 BOGO) | ₹225 | — | 22500 |
| G32 | Apollo Fish (86'd) + Gulab | row shows the dish | **Unknown Item ₹0.00**, To Pay ₹396.00 | cart 396 |

## Suggestions from the guest's chair

- Show the table number and the offers on the menu. "Table 8 · second Paneer 65 free" would sell the second plate.
- One number that means one thing: "Your dishes ₹60 · table total ₹340" and a PROCEED that says "Send my 1 dish".
- A round tracker that a phone can read at a glance: Sent → Cooking → Ready, and "Cancelled by the restaurant" in red.
- After Send, keep the guest on their table's page, with "Order more" and "Call waiter" buttons.
- When the till bills: "Your bill (₹423 incl. service and GST) is on its way". Today the phone and the bill never meet.
- When the table is cleared or the session ends, say it once in words, with "Call the waiter".
- Notes on a dish ("no onion", "less spicy") and a veg-only switch; both are asked for at every Indian table.

## Coverage grid

| control ↓ / state → | T1 vacant | T3 join (1) | T4 child (8→11) | T5 reserved/disabled | T6 billed | T7 paid | T8 cleared | T9 expired | T10 gate | T11 86'd | T12 READY/cancelled |
|---|---|---|---|---|---|---|---|---|---|---|---|
| scan / sign-in | PASS G16; FAIL G17 | PASS G21 | PASS (lands on 11) | PASS G19, G20 | — | FAIL G46 (TD-120) | — | FAIL G48 | — | — | — |
| menu / categories / offers | PASS G27; FAIL G15 | — | — | — | — | — | FAIL G47 | — | — | NOTE G31 | — |
| sheet | FAIL G06; PASS G05, G29, G30 | — | — | — | — | — | — | — | — | — | — |
| cart money / qty / remove | PASS G03, G07, G11, G33, G34; FAIL G13, G13b | NOTE G22 | — | — | — | FAIL G13b | — | — | — | FAIL G32 | — |
| checkout / double tap / back | PASS G37, G38, G26; FAIL G49 | PASS | PASS (stored right) | — | PASS G44 (accepted) | — | — | — | PASS (lands AWAITING) | FAIL G32 | — |
| orders page / tracking | PASS G02, G04, G08, G09, G12, G42 | — | FAIL G23 | — | NOTE G43 | FAIL G46 (TD-120) | — | — | FAIL G39 | — | FAIL G40, G41 |
| till money after the guest | — | — | — | — | FAIL G44 (QG-5) | — | — | — | — | — | — |
| 360 wide | PASS G36 | | | | | | | | | | |

Not built: search, veg filter (G28), dish notes (G35). Not run: G24, G45.

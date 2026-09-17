# Go-live — the build order for what is left (draft for Shaurya, 2026-09-17)

**Job.** Take the five remaining gaps (OR, KT, FL, RP, config) and turn them into an order of work
with commit boundaries, decisions named, and the calls I will make unless you say otherwise.
Written against the shipped code, not against the build map.

Verified while writing this: `domain/line.ts`, `orders/lineSnapshots.js:51`, `adminApp/settings.js:63`,
`menu/menu.js:145`, `menu/menuItem.js:143`, `app/dayClose.ts:206`, `domain/approvals.ts:201`,
`SPEC_OR_till_order_entry.md`, `SPEC_KT_print_path.md`, `SPEC_FL_floor_and_moves.md`.

---

## The day I planned against

One restaurant, one outlet, dine-in, serves alcohol. What actually happens, hour by hour, and where
it hits a wall today.

| Time | What happens | Today |
|---|---|---|
| 10:45 | Manager puts ₹2,000 change into the drawer | **Works** (DC opening float) |
| 11:00 | Cashier opens the till and wants to see her tables | **Wall** — the till has no home screen; you reach a bill by typing a URL (FL, in flight) |
| 12:30 | A couple sits at table 4. Neither wants to scan a QR; one has a ₹6,000 phone with no data | **Wall** — no staff surface can place an order. The captain app has eleven endpoints and not one of them is `cart-*` (OR) |
| 12:31 | The round has to reach the kitchen | **Half works** — the kitchen tablet shows it. No paper (KT-b) |
| 13:10 | "One more Old Monk" to the captain, on the same table | **Wall** — same as 12:30 (OR) |
| 13:40 | "Bill please" | **Works** (BL) — the numbers, the two tax blocks, the round-off are all correct |
| 13:41 | Hand the guest a printed GST invoice | **Wall** — the bill exists only on a screen (KT-a) |
| 13:45 | She pays ₹1,240 by card, he pays ₹600 cash | **Works** (PY) |
| 13:46 | Guest pays by UPI instead | **Works badly** — the cashier uses their own Paytm soundbox and types the reference in. Fine for one restaurant (UQ is P1) |
| 20:15 | A regular phones for two Masala Dosas ₹180 to collect | **Wall** (OR) |
| 21:30 | Party of six on table 3 moves to the quieter 9 | **Wall** (FL) |
| 23:30 | Cash counted, day closed, short by ₹40 | **Works** (DC) |
| 23:35 | Manager wants today's sale on paper before locking up | **Wall** — the close document exists and nothing renders or prints it (RP + KT-a) |
| Next morning | Owner: "what sold yesterday, and who gave discounts?" | **Wall** for sales (RP). Discounts are half-built: `domain/approvals.ts:201 summarise()` exists and has no screen |
| Month end | CA wants taxable value and tax per block for the month | **Wall** (RP) |
| Before any of this | Somebody enters GSTIN, tax blocks, tenders, tables, printer stations, and a tax label on all 400 dishes | **Wall, and the worst one** — see the two findings below |

**Without this day working end to end, there is no product.** Everything else on the roadmap —
aggregators, inventory, loyalty — is a feature on top of a restaurant that can already trade.

---

## Two findings this pass, neither of them on the list

### 1. No menu item in a real restaurant can be billed (proposed TD-027, P0 for go-live)

`orders/lineSnapshots.js:51` freezes `taxBlockId` off the menu item. `domain/line.ts:12` says a line
with `taxBlockId: null` **cannot be issued** (BL R10). The field is written by the seed fixtures and
by nothing else: `taxBlock` does not appear anywhere in the Flutter admin app, and the item editor has
no picker for it. `createMenuItem` spreads whatever it is given (`menu/menuItem.js:143`), so the
backend would keep the field — the gap is purely that no human-facing surface writes it.

So the first real restaurant types in 400 dishes, and every single line is unbillable. HSN/SAC is the
same story, and the GST bill needs it per item.

**This is the true first blocker, ahead of all five.** It is also cheap: a dropdown on one existing
screen, plus a menu-wide "assign tax block to a category" action so nobody edits 400 items by hand.

### 2. The config document is world-writable with no validation and no audit row (proposed TD-026, P1)

`adminApp/settings.js:63 updateRestaurantSettings` deep-merges any JSON a MANAGER or ADMIN client
sends into `restaurants/{id}/config/settings`. When it was written, that document held a theme and
three feature flags. It now also holds **tax blocks and rates, the invoice series, the PIN threshold,
the tender list, the day-close over/short limit and the round-off rule** — about sixty keys across
ST, BL, PY, DC, OF.

Every module validates on **read** (`configFrom` in `domain/*.ts`). Nothing validates on **write**, and
nothing records who changed what. A typo in `tax.blocks.food.parts` silently re-rates tonight's bills;
`invoice.series` changed mid-year breaks the one thing the contract says must be prevented
("a broken number series"). That is the *prevent* side of "catch it, don't cage it", not the record side.

The fix is small and reuses what exists: `config-set` calls the same `configFrom` parsers and refuses
anything they warn about, and writes one audit row per changed key. It belongs with CF below.

---

## Build order

Each row is a commit boundary set, not a sprint. Sizes are relative to shipped modules.

| # | What | Size | Why here | Blocked by |
|---|---|---|---|---|
| **0** | **Tax block + HSN on the menu item** (finding 1) | ¼ ST | Nothing downstream can issue a bill without it, and it is rank-2 data typed by hand — the longest *human* task in onboarding, so it starts first | Your call: Flutter admin or a till screen (D1 below) |
| **1** | **FL · Floor** — in flight, session `plattr-pro-d3` | — | It is the till's home screen; OR's every scenario starts by tapping a table | — |
| **2** | **OR · Till order entry** | ≈ BL | The single largest gap. Also the one that decides session schema, which is expensive later | FL, and D2/D3 below |
| **3** | **KT-a · Bill printing only** (counter station) | ≈ ST | The guest must leave with paper. Split out from KOT deliberately — see the scoping call | A printer bought and proven (D4) |
| **4** | **RP · Reports, three of them** | ≈ ST | Owner every morning, CA every month, manager every night at 23:35 | DC (done), BL (done) |
| **5** | **CF · Config & onboarding** | ½ ST | Validation + audit on write (finding 2), then screens for the keys that change *during* service | — |
| **6** | **KT-b · KOT routing** to kitchen and bar | ≈ ST | The chef already sees the round on the kitchen tablet. Paper is better, not vital | KT-a, and D5 (`categoryId` on the line) |
| **7** | **UQ · UPI dynamic QR** | ≈ ST | The first restaurant's soundbox covers it. Restaurant three will not accept that | KT-a |

**Scoping call I am making: KT splits in two.** The sheet treats the print path as one module. A
restaurant with no KOT paper still functions — the kitchen Flutter app exists and shows every round —
but a restaurant that cannot hand over a printed invoice does not. So the bill printer at the counter
is a go-live item and the kitchen and bar printers are a week-two item. Same `link.ts`, same queue,
same code; one station instead of three. It also means we buy and prove **one** printer before go-live,
not three (D4 gets cheaper).

**Scoping call: FL owns move and merge; OR drops them.** `SPEC_OR_till_order_entry.md` carries review
rows for moving a table and two merge gaps, and `SPEC_FL_floor_and_moves.md` is building exactly that
now. Two sheets owning one endpoint is how we get two implementations. OR's rows become a reference to
FL, with one line in OR's Decisions.

---

## The modules, in phases

### 0 · Tax block on the menu item
1. `taxBlockId` + `taxCode` (HSN/SAC) on the item editor, options read from `config/settings.tax.blocks`.
2. A category-level "set tax block for all items in this category" action. 400 dishes in six taps, not 400.
3. A refusal with a countable message: the menu screen shows "37 items have no tax block" and BL's
   preview already reds the line. Onboarding is not done until that number is zero.
4. Characterization test on the menu write path first; the field is rank-2 data.

### 2 · OR · Till order entry
Sheet is drafted and **not fanned out, not signed**. Phases:
0. Fan-out on the draft, answer the review rows, drop move/merge to FL. No code.
1. Skeleton: one `it()` per OR-S id with hand-computed paise, across domain / app / e2e / Playwright.
2. `table-openTable` — the one new endpoint: a staff-opened session with no OTP and no phone number,
   `openedBy: 'staff:<serverId>'`, `covers`. Cart ownership already shipped (2026-09-16), so a till
   round is its own group on a shared cart.
3. Till `features/order/` — menu grid with variants, add-ons, stock; cart pane; Send. Every price from
   the server; the till sends item, quantity, note. Existing `cart-*` endpoints, no new pricing code.
4. Counter tickets: `ordering.takeawayTableIds` through `app/config.ts`. A takeaway is a table.
5. Void and discount before Send route through ST's existing door. Nothing new.

### 3 · KT-a · Bill printing
1. Buy one 80 mm printer, pair it to the real tablet, prove `navigator.serial` sees it. **Before anything else.**
2. `domain/print.ts` — a bill becomes a ticket structure: pure, no bytes.
3. `link.ts` — the only file that knows about the wire. If the Bluetooth test fails, this file changes and nothing else.
4. Queue with a lease, at-least-once, `REPRINT n` marker on anything that is not the first attempt.
5. Reprint goes through ST as it already does (P1 audit row).

### 4 · RP · Reports
Three, and no more. Each reads frozen data and recomputes nothing.
1. **Day summary (Z-report).** Renders DC's frozen close document — sales by tax block, tenders, drawer,
   over/short. Prints on the counter station. This is the 23:35 need.
2. **Tax summary for a date range.** Taxable value and each tax part per block, from line snapshots.
   The CA's file. One CSV export.
3. **Sales and discounts.** Item-wise quantity and value; staff-wise discounts and voids from
   `domain/approvals.ts:201 summarise()`, which exists today with no screen. Closes half of TD-005.

### 5 · CF · Config & onboarding
1. `config-set` → the existing `configFrom` parsers refuse a bad write; one audit row per changed key
   (finding 2). `admin-updateRestaurantSettings` keeps theme and feature flags and stops being able to
   touch `tax`, `invoice`, `approvals`, `payments`, `dayClose`, `print`.
2. Till **Owner** section for the keys that change while the restaurant trades: service charge, discount
   reasons, PIN threshold, tender list, printer stations, takeaway table ids.
3. Onboarding checklist screen: seller identity, tax blocks, tables, tenders, printers, "37 items have
   no tax block". Green when a restaurant can trade. The founder still seeds the first one by script;
   this is what makes restaurant three not need him.

---

## Calls I will make unless you say otherwise

- **Nothing new is invented where something exists.** OR uses `cart-addItemToCart` / `cart-checkoutCart`
  unchanged; RP reads DC's frozen document and `summarise()`; CF reuses the `configFrom` parsers as its
  write-time validation. The only new endpoints in the whole plan are `table-openTable`, `config-set`,
  and KT's queue pair.
- **The till never re-prices anything.** Item, quantity, note go up; money comes down.
- **Reports recompute nothing.** A Z-report that disagrees with the close it renders is worse than no report.
- **One printer station for go-live** (`counter`), three in KT-b.
- **Every one of these modules gets its sheet fanned out and its review rows signed before code**, as BL,
  PY, DC and OF did. RP and CF have no sheet yet and will get one.
- **Out of scope for go-live, written down here so it is not re-argued:** aggregator sync, inventory,
  loyalty, delivery, multi-till, e-invoicing/IRN, a drawn table map with positions, second outlet.

---

## What I need from you

Ranked by what stops until you answer.

| # | Decision | Blocks | My recommendation |
|---|---|---|---|
| **D1** | Tax block + HSN picker: add it to the **Flutter admin** item editor, or build a menu screen in the **till**? It is a module boundary, and the contract says Flutter apps stay untouched | Everything. No bill is issuable without it | **Flutter admin.** It is where the menu already lives and where the owner already goes. One dropdown on an existing form beats a second menu editor we then maintain twice. It breaks the "Flutter untouched" rule for one field, on purpose |
| **D2** | `table-openTable` — a staff-opened table session with no OTP and no guest phone number (OR review row 1). Schema | OR phase 2 | **Yes, one new endpoint.** No existing file changes shape. `openedBy: 'staff:<serverId>'` is the record |
| **D3** | `openedBy` and `covers` on the session (OR review row 2). Schema, rank-1-adjacent | OR phase 2 | **Add both now.** Cheapest field in the build; "table for how many" is the first thing every report wants and the most expensive thing to backfill |
| **D4** | KT-D1 — **buy a Bluetooth printer this week** (~₹6–9k) and prove Chrome 148 sees it on the real tablet. If it fails, LAN + bridge, and only `link.ts` changes | KT-a, so the guest gets paper | **Buy one now.** Also tell me what printer the first restaurant already owns — if it is LAN-only, that answer changes the hardware plan, not the code plan |
| **D5** | KT-D2 — freeze `categoryId` on the placed line so a tandoor can have its own printer later | KT-b only, not go-live | **Yes, one additive field, added now while no restaurant has `lines/` data.** Adding it after 50 restaurants is a migration |
| **D6** | KT-D4 — a KOT may print twice (at-least-once) rather than risk never printing | KT-b | **At-least-once.** Food never cooked is a forty-minute wait and a refund; a duplicate is a slip marked REPRINT |
| **D7** | Config write lockdown (finding 2): `admin-updateRestaurantSettings` loses the money keys | CF phase 1 | **Do it.** It is the *prevent* side the contract names: a wrong tax rate and a broken number series |

---

## If we are late, this is what I cut

In this order, and nothing above the line:
1. **UQ** — the soundbox already on the counter covers it.
2. **KT-b** — the kitchen tablet already shows every round.
3. **RP report 3** (item-wise and staff-wise) — the owner can wait a week; the CA and the nightly Z cannot.
4. **CF screens** — the founder seeds the first restaurant by hand. `config-set` validation stays, because
   it is a correctness gate, not a convenience.

What never gets cut: tax block on items, FL, OR, the printed bill, the Z-report, the tax summary.

---

## Proposed diffs (I do not edit `STATE.md` decisions or `TECH_DEBT.md` myself)

**`TECH_DEBT.md`** — two new rows:
- **TD-026 · P1 ·** `adminApp/settings.js:63` deep-merges unvalidated client JSON into `config/settings`,
  which now holds tax rates, the invoice series, PIN thresholds and tenders. No validation on write, no
  audit row. Fix: `config-set` through the existing `configFrom` parsers; strip the money keys from the
  admin endpoint. Blast radius: one endpoint, one Flutter settings screen.
- **TD-027 · P0 ·** No surface writes `taxBlockId`/`taxCode` on a menu item, so every line in a
  hand-entered menu is unbillable (`domain/line.ts:12`, `orders/lineSnapshots.js:51`). Fix: picker in the
  admin item editor plus a category-level bulk set. Blast radius: menu write path, rank-2 data.

**`STATE.md` → Next**: replace the current list with this page's build order, and add the scoping calls
(KT splits at the counter printer; FL owns move and merge, OR references it).

---

## Answers so far (Shaurya, 2026-09-17)

1. **D1 — tax editing lives in the Flutter admin app.** The menu is already there and the owner already
   goes there. Accepted cost: it breaks "Flutter apps untouched" for one dropdown, and this screen is
   tested by hand because agents cannot drive Flutter web. Goes into OR/CF Decisions as a named exception,
   not as a precedent for building features there.
2. **D2 + D3 — yes to `table-openTable`, with `openedBy` and `covers`.** One new endpoint, no existing
   file changes shape. `openedBy: 'staff:<serverId>'` keeps a staff-opened sitting distinguishable from a
   QR one forever; `covers` is what makes spend-per-head answerable, and no migration can invent it later.
3. **D4 — printing: design for both, build one.** Both the Bluetooth and the LAN-plus-bridge paths stay
   reachable, which costs nothing because `link.ts` is the only file that knows about the wire. Shipping
   both is a support cost, not a code cost, so only one gets built for go-live and the choice follows what
   the first restaurant already owns. Open until Shaurya checks the site.
4. **D5 — tax tagging shape: open.** Question asked back: is per-dish too complex? Answer on the page above
   — per-dish is the simplest code and the most human work; the category map is ten lines of resolver that
   removes ~400 manual edits. Recommendation unchanged.

### D5 · Tax tagging — decided (mine, 2026-09-17, Shaurya handed it over)

**The problem, restated.** Every line needs one tax bucket, frozen at placement, never quietly wrong.
Wrong on liquor is money owed to the excise department, found by a CA months later.

**What reality looks like.** Category predicts the bucket almost perfectly — the bar categories are
liquor, the rest is food — and *almost* is the whole point. A mocktail lives in Cocktails and is not
alcohol; a cheese platter lives in the bar menu and is not either. Category is a good guess and a bad law.

**Decision.**
- **Per-dish `taxBlockId` stays exactly as built.** It is the truth on the line; the snapshot shape does
  not change and nothing already written moves.
- **`tax.assign` joins the config doc**: `{ <categoryId>: <blockId> }`. Six lines for a real restaurant.
- **Resolution order at placement: dish → category → refuse.** **No global default**, which is the one
  push-back against "a map with default values": a default silences the refusal, so an "Imported Beers"
  category added in month three bills as food for weeks and nobody notices. A refusal is loud, lands at
  bill preview where the cashier is standing, and is one tap to fix. BL already refuses `taxBlockId: null`
  (`domain/line.ts:12`), so this needs no new machinery.
- **Freeze `taxSource: 'item' | 'category'` and `categoryId` on the line.** A bill from six months ago
  must be able to say why it was taxed as it was. `categoryId` is the same field KT-D2 wants for printer
  routing, so one additive field serves two modules — and it is already on the cart item
  (`addItemToCartBoilerplateHelper.js:547`), so it is copied, not computed.
- **The Flutter admin picker is still built (D1)**, showing the inherited bucket greyed out so the owner
  can see what a dish will be taxed at without setting anything.

**Cost.** ~10 lines of resolver in `domain/line.ts`, one config block with its `configFrom` validation,
one frozen field. **Benefit.** Onboarding goes from ~400 dropdown edits to one paragraph, and the
onboarding checklist's counter changes from "37 items have no tax block" to "1 category is unmapped".

**Why not the map alone:** it breaks on the mocktail the first week. **Why not per-dish alone:** it is not
more correct, only more typing, and a dish added at 21:00 with the field blank is an unbillable line
discovered when a guest is waiting for their bill.

### D4 · Printer — decided (Shaurya, 2026-09-17)

**Bluetooth first, the bridge kept in reserve.** Buy one 80 mm Bluetooth printer, pair it to the real
tablet, and prove Chrome 148 can see it **before phase 5 of KT-a is planned**. Both paths stay reachable
because `link.ts` is the only file that knows about the wire; shipping both is a support cost, not a code
cost, so only one ships. If the tablet cannot see the printer, or the link dies when the screen sleeps,
`link.ts` becomes the bridge and no other file changes.

### Proposed `STATE.md` decisions-log rows (not edited by me)

| Date | Decision | Why |
|---|---|---|
| 2026-09-17 | **A dish's tax bucket resolves dish → category → refuse. No default.** `tax.assign` maps categoryId to blockId in config; `taxSource` and `categoryId` freeze onto the line | Category predicts the bucket almost perfectly and *almost* is the problem. A default silences the refusal and bills liquor as food for weeks; a refusal lands at preview, in front of the cashier, one tap from fixed |
| 2026-09-17 | **Tax editing lives in the Flutter admin app**, as a named exception to "Flutter apps untouched" | The menu and the owner are already there. A second menu editor in the till is how a dish and its tax get edited in two places |
| 2026-09-17 | **`table-openTable` exists, with `openedBy` and `covers`** | A cashier cannot take a phone order against a guest's OTP. `covers` is the number every report wants first and no migration can invent |
| 2026-09-17 | **KT ships one counter printer for go-live; kitchen and bar are week two** | The chef already sees every round on the kitchen tablet. A guest with no printed invoice is not a restaurant |

---

## Amendment, 2026-09-18 — KT-D1 and KT-D1c supersede D4; the KOT split is withdrawn

**Superseded above:** "Bluetooth first, bridge in reserve" and "what printer the first restaurant owns".
KT-D1 (signed 17th) rejected Bluetooth — it means replacing every printer, the common Indian units are
58 mm portables, and Chrome 148 is recent enough that an old tablet would not print at all. KT-D1c
(18th) makes the **Flutter kitchen app the first print agent**: it is Dart, so it can open TCP 9100,
and it is already on a tablet in the kitchen. The encoder moved server-side, so the job document
carries bytes rather than rows and an agent is ~30 lines in any language. The bridge box is
implementation #2 behind the same protocol. Any LAN 9100 printer works; no hardware is ours.

**My flag 2, answered: the week-one / week-two split is withdrawn.**

The split rested on two costs and both are gone. Buying a second and third printer is now the price of a
printer and nothing else, and KOT is no longer a second print implementation in a second language —
once the agent exists for the bill it is already holding a socket and a job loop, so another station is
a routing rule and one ticket layout.

What replaces it, on merits rather than on cost:

- **The bar ticket is a go-live item.** The first customer serves alcohol and **there is no bar surface
  in the product**. `platter_kitchen/lib/pages/live/live_orders_screen.dart:36` is a client-side category
  dropdown a human selects; no device can be bound to a station. Screen-only therefore means a bartender
  watching the whole kitchen's work behind a filter someone must remember to keep set, or a captain
  calling drinks across the room. It needs **no new frozen field**: `print.routeByTaxBlock: {liquor:'bar'}`
  is already the sheet's fallback and `taxBlockId` is on every line today.
- **The kitchen ticket is desirable, not blocking.** A screen genuinely runs a kitchen — KDS is a real
  product. Paper wins because it is a divisible work queue and because a touchscreen and oily hands do
  not mix, so ship it; do not hold go-live for it.
- **So KT-a's scope becomes a routing table, not a phase boundary:** `counter` and `bar` at go-live,
  `kitchen` a config line the chef can switch on the same afternoon. KT-D2 (`categoryId` frozen on the
  line) is still worth taking now but is no longer needed for go-live — it buys sub-stations like a
  tandoor, which `taxBlockId` cannot express.

**Two consequences for `plattr-pro-41`:**
1. **KT-D3 is answered differently than the sheet recommends.** The print responsibility sits on the
   kitchen tablet, not the till, so the sleeping-device failure moves to a tablet that is plugged in and
   watched through service — better. The loud-queue half of recommendation C should survive the move.
2. **A restaurant with no kitchen tablet has no printing at all.** Fine for customer one, worth naming
   before customer five, and an argument for keeping the bridge as implementation #2 rather than dropping it.

---

# Manager pass, 2026-09-18 — decisions landed

Read before deciding: `SPEC_FL_floor_and_moves.md` v3, `reviews/2026-09-17-donor-FL.md`,
`donor-KT.md` and `donor-OR.md` ranked lists, `reviews/2026-09-17-arch-3-day-review.md` items 3 and 5,
`TECH_DEBT.md` TD-026/027/030/032, and the live code at `table/vacateTable.js`,
`table/mergedTables.js:34`, `orders/updateOrderStatus.js:181`.

## The four tax rows — final, with two corrected before landing

**Row 1 (tax resolution) — amended.** Dish → category (`tax.assign`) → **refuse**. No default.
`taxSource: 'item' | 'category'` and `categoryId` freeze onto the line. **Correction:** the earlier
wording said existing line documents with no `categoryId` "route to the default (tested)". That is a
fail-open compatibility branch and the repo rule is now *not live, no migrations, fail closed*. A line
with no resolvable bucket refuses; seeds get re-run. The branch is not written.

**Row 2 (tax editing in the Flutter admin) — stands**, as a named exception to "Flutter untouched",
for the item editor only.

**Row 3 (`table-openTable` with `openedBy` and `covers`) — stands, and is now stronger.** There is no
migration path by policy, so a number not collected at the sitting is gone for good.

**Row 4 (printing) — rewritten; the original is stale.** Superseded by KT-D1 (bridge over Bluetooth)
and KT-D1c (the Flutter kitchen app is the first print agent, encoder server-side). The row now reads:
**KT ships a routing table — `counter` and `bar` at go-live, `kitchen` a config line.** No hardware is
ours, no phase boundary, and the bar half is not optional: there is no bar surface in the product
(`platter_kitchen/lib/pages/live/live_orders_screen.dart:36` is a client-side dropdown, no device can
be bound to a station) and the first customer serves alcohol.

## Build order, re-confirmed against the donor reviews and KT's new shape

1. **Tax tagging** + **arch item 5 (PIN)** — one window, both nearly free now, a third of item 5 is deleting the plaintext branch at `adapters/firestore/approvals.ts:36` (no legacy staff docs exist).
2. **Arch item 3 — `order.priceInfo`.** Moved **ahead of OR**, which is the one real change to the order I set on the 17th. OR is built on `cart-addItemToCart` → `cart-checkoutCart` → `createOrUpdateOrder`, and all three are in item 3's blast radius. Building OR first means writing its scenarios and tests against a shape scheduled for deletion, then writing them again.
3. **FL** — in flight, unaffected by item 3 (R2 reads line snapshots, not `order.priceInfo`). Runs in parallel.
4. **OR.**
5. **KT** — counter and bar, **with URY's every-minute reconciler in the same phase, not after** (donor-KT rank 4, `ury_kot_validation.py:12-36`). With a box it was a nicety; with a tablet as the agent it is what turns "asleep for four minutes" into a late labelled ticket instead of food nobody cooks.
6. **RP** → 7. **CF** → 8. **UQ.** `KT-b` is struck: it was a phase boundary drawn around a hardware buy that no longer exists.

**Shared dependency, build once:** donor-KT rank 1 and donor-OR rank 2 are the same field — a snapshot
of what the kitchen was last told, with a server-side staleness check. OR needs it to edit a sent round;
KT needs it to diff a ticket. It belongs to KT, and OR reads it. `line.sent` already supplies the
per-line lock half (donor-OR rank 4), so the missing piece is only "what was on the last ticket".

## FL · Q1 reviewed against the code — the intent is right, the route is wrong

FL-Q1 ("a paid sitting frees its own table, from the payment path") is signed. Routing it through the
existing release path breaks three of FL's own rules, because `table/vacateTable.js` does three things
at once: marks vacant, **unmerges every child**, and **ends the session**.

1. **Paying would auto-unmerge a group with people still in it.** `mergedTables.js:34 unmergeChildren`
   releases every child to `vacant`. The party of ten at 5+6+7 pays at 22:00 and stays for coffee;
   tables 6 and 7 read free and the next walk-in is seated into them.
2. **The paid tile falls through `settled` to `free`.** The sheet's own table defines `settled` as
   "no open money, **session not yet ended**" — and `vacateTable` ends the session, so FL-S14 and
   FL-S35 cannot hold. R19's "stop accepting new users and checkouts" is a soft close; this is a hard one.
3. **The unmerge is unaudited and swallowed.** R7 requires one audit row in the same transaction as the
   act. `unmergeChildren` commits a bare batch with no row, and `vacateTable` catches its own failure —
   leaving a vacant parent with children still merged, silently. That is the `except: pass` scar the
   donor review flagged at URY `ury_order.py:2156-2175`.

**Recommendation to the FL session: the payment path writes nothing to the table.** The tile word is
already derived (R2, R14), so a fully-paid sitting reads `settled` with zero writes, and the table
returns to `free` when the session actually ends — the waiter's Vacant, or expiry. It is less code than
FL-Q1 as signed, it removes the contradiction, and it keeps the property the donor review praised:
ours derives every tile, URY stored a flag and had to build a reconciler because it drifted
(`ury_order.py:1585-1593` vs `:306-330`).

## TD-030 · un-merge — closed, won't fix

Keeping the decline. R14 (unmerge refused while the group holds open money) removes the cost the debt
row was written against: the only unmerge that can now happen is on a group that owes nothing, and
releasing the children of a group that owes nothing is free to redo. URY's drift scar does not transfer —
it drifted because the merged list was *stored*; ours is derived on every read. Reversible in six lines
(`childTableIds` on the existing endpoint) the day a large group that owes nothing makes it worth it.
A resolved disagreement is not debt, and leaving it open is noise in a list that must stay readable.

## Two findings still with no row — `TECH_DEBT.md` is at TD-037

Both were verified twice and neither has ever been logged. "No row, no merge" applies.
- **TD-038 · P0 ·** `taxBlockId` is read and never written outside seeds, mocks and two Playwright
  specs (`orders/lineSnapshots.js:51`, `domain/line.ts:12`). A hand-entered menu is 100% unbillable.
- **TD-039 · P1 ·** `adminApp/settings.js:63` deep-merges unvalidated client JSON into the document
  that now holds tax rates, the invoice series, PIN thresholds and tenders. No write validation, no
  audit row. (The numbers TD-026/TD-027 proposed on the 17th were taken by UQ in the meantime.)

## Go-live checklist item, not a build item

The composite indexes — `bills(status, issuedAt)` and `lines(billId, placedAt)` — are the first gate in
this repo that **cannot be proven red locally**: the emulator does not enforce indexes, so a missing one
passes every test and fails only in prod. Deploy them ahead of the query and confirm **READY**, not
BUILDING, before the first day close.

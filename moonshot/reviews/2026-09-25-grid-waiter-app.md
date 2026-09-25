# QA grid: waiter (captain) app, 2026-09-25

Prep for a driver agent exploring the waiter app screen by screen ([AGENT_QA.md](../../AGENT_QA.md) §5–§7).
Read-only prep: nothing was run, no emulator, no browser. Every "expected" cites a spec row, a decision or the
code that decides it. There is no SPEC sheet for this app, so the sources are [CLAUDE.md](../../CLAUDE.md)
(waiter-confirmation gate, coverage notes), [SPEC_FL](../SPEC_FL_floor_and_moves.md),
[SPEC_ST](../SPEC_ST_staff_pin_and_approvals.md), [SPEC_OR](../SPEC_OR_till_order_entry.md),
[SPEC_BL](../SPEC_BL_billing_and_tax.md), [TESTING.md](../../TESTING.md) and the backend validators.
Format follows [the bill-screen grid](2026-09-25-qa-bill-screen-grid.md) and its [report](2026-09-25-qa-bill-screen.md).

**File keys used below** (app = [platter_server/lib/](../../frontend/src-platter-apps/apps/platter_server/lib/), backend = [functions/](../../backend/src-plattr/functions/)):

| key | file | key | file |
|---|---|---|---|
| NAV | [main_navigation.dart](../../frontend/src-platter-apps/apps/platter_server/lib/main_navigation.dart) | MCS | [orders/markCartAsServed.js](../../backend/src-plattr/functions/orders/markCartAsServed.js) |
| LF | [platter_login_form.dart](../../frontend/src-platter-apps/modules/platter_core/lib/src/ui/auth/platter_login_form.dart) (platter_core) | UCS | [cart/updateCartStatus.js](../../backend/src-plattr/functions/cart/updateCartStatus.js) |
| OH | [orders_home_screen.dart](../../frontend/src-platter-apps/apps/platter_server/lib/pages/orders_home/orders_home_screen.dart) | UOS | [orders/updateOrderStatus.js](../../backend/src-plattr/functions/orders/updateOrderStatus.js) |
| OP | [orders_provider.dart](../../frontend/src-platter-apps/apps/platter_server/lib/pages/orders_home/orders_provider.dart) | GAO | [orders/getActiveOrdersForRestaurant.js](../../backend/src-plattr/functions/orders/getActiveOrdersForRestaurant.js) |
| OD | [order_detail_screen.dart](../../frontend/src-platter-apps/apps/platter_server/lib/pages/orders_home/order_detail_screen.dart) | SMI | [orders/serverMarkItemServed.js](../../backend/src-plattr/functions/orders/serverMarkItemServed.js) |
| CD | [cart_detail_card.dart](../../frontend/src-platter-apps/apps/platter_server/lib/widgets/cart_detail_card.dart) | TBL | [table/table.js](../../backend/src-plattr/functions/table/table.js) |
| TH | [tables_home_screen.dart](../../frontend/src-platter-apps/apps/platter_server/lib/pages/tables_home/tables_home_screen.dart) | OT | [table/openTable.js](../../backend/src-plattr/functions/table/openTable.js) |
| TDD | [table_detail_dialog.dart](../../frontend/src-platter-apps/apps/platter_server/lib/pages/tables_home/table_detail_dialog.dart) | FLR | [app/floor.ts](../../backend/src-plattr/functions/app/floor.ts) |
| AD | [add_dishes_screen.dart](../../frontend/src-platter-apps/apps/platter_server/lib/pages/tables_home/add_dishes_screen.dart) | COO | [orders/createOrUpdateOrder.js](../../backend/src-plattr/functions/orders/createOrUpdateOrder.js) |
| MH | [menu_home_screen.dart](../../frontend/src-platter-apps/apps/platter_server/lib/pages/menu_home/menu_home_screen.dart) | CHK / ATC | [cart/checkoutCart.js](../../backend/src-plattr/functions/cart/checkoutCart.js) / [cart/addItemToCart.js](../../backend/src-plattr/functions/cart/addItemToCart.js) |
| MI | [menu_item_card.dart](../../frontend/src-platter-apps/apps/platter_server/lib/widgets/menu_item_card.dart) | SS | [session/sessionService.js](../../backend/src-plattr/functions/session/sessionService.js) |
| CFG | [config/app_config.dart](../../frontend/src-platter-apps/apps/platter_server/lib/config/app_config.dart) | FS | [qa/floorstate.mjs](../../backend/src-plattr/functions/test/e2e/qa/floorstate.mjs) |

**Run 2026-09-25:** 65 cells, 14 FAIL, 11 NOTE, 27 PASS, 2 NOTBUILT, 11 not run. Per-cell verdicts are in the
[report's coverage grid](2026-09-25-qa-waiter-app.md#coverage-grid). The states marked **add** in §2 and §5 now exist in
`floorstate.mjs` (plus `mergedowes`, `samedish2`, `gate on|off` and `<n> seen`).

## 0. Read this before starting

- **The waiter app only talks to slot 0.** Its functions URL is the literal `http://localhost:5002/...` (CFG:14),
  and nothing calls `setOverrideBaseUrl`. There is no `--dart-define`. So the run needs slot 0 (Firestore `:8080`,
  functions `:5002`), and **slot 0 belongs to another agent right now**. Either wait for it, or get a one-line
  product change first (read a `FUNCTIONS_URL` dart-define in CFG). Don't point `floorstate.mjs` at another slot:
  the screen would read slot 0 and the seed would land elsewhere.
- Stack: [FRONTEND_TESTING.md](../../FRONTEND_TESTING.md) §3 (`run_app.sh server` → `:5050`), §4 (`ab`), §6 (ids), §8.
  Seed MockData7, restaurant `res_meghana`. Use tables **6–12**. Table 1 is seeded occupied and assigned to
  `srv_meg_1`. Table 4 is seeded reserved, 5 disabled, P1/P2 are parcels (capacity 0).
- Logins (password `1234`): `server@meg.test` = `srv_meg_1` (SERVER, the captain on screen). `server2@meg.test` =
  `srv_meg_2` (SERVER, the second captain, **by API only**, because there's no logout control and the staff session
  sits in localStorage, so one browser tab can't hold two captains). `kitchen@meg.test` (KITCHEN), `manager@meg.test`
  and `till@meg.test` (MANAGER). One staff member has one session doc: logging in again returns the same id
  ([server_auth.js:301](../../backend/src-plattr/functions/server/server_auth.js)).
- **How the screen refreshes.** Orders polls `order-getActiveOrdersForRestaurant` every 20 s (OP:106). Tables polls
  every 10 s in a debug build (TH:38). Menu polls every 10 s. `orders-refresh` and `tables-refresh` are unreachable:
  the app bar shows Menu's "Refresh Menu" (no id) on every tab (FRONTEND_TESTING §6). **To force a re-read, switch
  bottom tabs away and back** (NAV:161, OH:86, TH:61). A card up to 20 s old is the normal "stale screen".
- **Gestures.** A plain tap on a card opens the order detail. A long-press serves it (READY), or confirms it
  (AWAITING_CONFIRMATION, OH:328). A long-press on a SERVED card does nothing (OH:321).
- **Every failure snackbar on the Orders tab throws the server's reason away**: "Failed to mark cart as served"
  (OH:375), "Failed to confirm order" (OH:425). The provider only returns true/false (OP:318-374). The order detail
  and table dialog do show the server's message (OD:317, TDD:62). Expect this, and file it once (TD-084), not per cell.
- The Served tab is empty for anything served during the run (emulator timestamp gotcha, [AGENT_QA.md](../../AGENT_QA.md) §8).
  Read the order doc instead.

## 1. Controls

`ab ids` shows what's live. "(no id)" = address it by text via `ab snap` / `@eN` (FRONTEND_TESTING §6 fallback).

### Login ([LF](../../frontend/src-platter-apps/modules/platter_core/lib/src/ui/auth/platter_login_form.dart))
| id | what | file:line |
|---|---|---|
| `login-restaurant`, `login-username`, `login-password` | text fields | LF:95, :112, :129 |
| `login-submit` | `server-serverLogin` | LF:150 |
| (no id) "Seeded logins" cards | debug build only: fill the three fields for a restaurant | LF:170-188 |

### Shell (every tab)
| id | what | file:line |
|---|---|---|
| `tab-orders`, `tab-tables`, `tab-menu` | bottom tabs. The **selected** tab has no id | NAV:134, :142, :150 |
| `orders-refresh`, `tables-refresh` | wired, **unreachable** (see §0) | OH:141, TH:110 |
| (no id) refresh icon "Refresh Menu" | refreshes the menu only, whatever tab | MH:106 |
| (no id) avatar, bell | do nothing (`onProfileTap` null, bell is a TODO). **No logout anywhere** | [server_app_bar_widget.dart:42,75](../../frontend/src-platter-apps/apps/platter_server/lib/widgets/server_app_bar_widget.dart) |

### Orders tab (OH)
| id | what | file:line |
|---|---|---|
| (no id) sub-tabs "My Orders", "Ready", "Pending", "Served", "All Orders" | filters on one list. My Orders = All Orders = every card the backend returned (OP:164-167). Pending = AWAITING + PENDING + PREPARING (OP:173-182). Ready = READY. Served = a separate call, fetched when the tab opens | OH:206-212 |
| `order-cart-<cartId>` | one card per live round (SERVED/CANCELLED carts are dropped, GAO:153). Tap = detail, long-press = serve/confirm | OH:303, :312-313 |
| `order-mark-served` "Mark Served" + (no id) "Cancel" | serve dialog, shown when `uiFlags.confirmServeCartAction` (default true) → `order-markCartAsServed` | OH:350, :346 |
| `order-confirm-cart` "Send to kitchen" + (no id) "Not yet" | confirm dialog on an AWAITING card → `cart-updateCartStatus` PENDING | OH:401, :397 |
| (no id) "Retry" | error state → re-poll | [state_views.dart:99](../../frontend/src-platter-apps/apps/platter_server/lib/widgets/state_views.dart) |

### Order detail (OD, CD)
| id | what | file:line |
|---|---|---|
| (no id) refresh icon | re-reads `server-getOrderDetails` | OD:76 |
| (no id) cart tile "Cart n" | expands. Carts are listed by their real index, cancelled ones included | OD:121-130, CD:46 |
| (no id) "Mark Served" (per cart) | `order-markCartAsServed`. Enabled only if the cart may go to SERVED (READY) | CD:78-89 |
| (no id) checkbox (per item) | `server-markItemServed {menuItemId, cartItemId}`. Enabled when the **cart** is READY and the item isn't served | CD:227-229, OD:441 |
| `order-cancel` "Cancel Order" → (no id) "Yes, Cancel Order" | `order-updateOrderStatus` CANCELLED. Hidden once COMPLETED/CANCELLED | OD:213, :351-357 |
| `order-mark-paid` "Mark Paid" → `order-mark-paid-confirm` "Yes, Mark Paid" | `order-updateOrderStatus` COMPLETED. The dialog says "marks the food as done" | OD:221, :244 |

### Tables tab (TH, TDD)
| id | what | file:line |
|---|---|---|
| `table-<tableId>` | opens the table dialog (re-reads `table-getTableDetails`) | TH:203-206 |
| `table-status-vacant` / `-active` / `-reserved` / `-disabled` | `table-updateTableStatus`. The current status's button is hidden | TDD:289-315, :322 |
| `table-refresh-otp` | `table-generateTableOTP` (no table-state checks, TBL:1275) | TDD:234 |
| `table-view-order` | only if `activeOrderId` is set, and **nothing writes it** (only the seed and the resets), so it never shows | TDD:266 |
| `table-add-dishes` | Add dishes. Hidden on a disabled table, so also on a merged child | TDD:177-186 |
| (no id) "Close" | closes the dialog | TDD:188 |

### Add dishes (AD)
| id | what | file:line |
|---|---|---|
| `add-dishes-covers` + `add-dishes-covers-ok`, (no id) "Skip" | asked only when the table is `vacant`. Not a number → null | AD:61, :101, :116 |
| `add-dishes-search`, (no id) category chips | filter | AD:264, :290 |
| `add-dishes-dish-<menuItemId>` | add one. A dish with mandatory variants opens a picker | AD:317 |
| `add-dishes-variant-<optionId>`, `add-dishes-variant-add` | variant picker | AD:165, :184 |
| `add-dishes-note`, (no id) −/+ | per line in the round pane. Note dialog OK/Cancel have no ids | AD:426, :434-443 |
| `add-dishes-send` (label `round-count n`) | `cart-addItemToCart` per line, then `cart-checkoutCart` with `addedBy: staff:srv_meg_1` | AD:351, :198-236 |

Opening the screen already calls `table-openTable` and `menu-getRestaurantMenu` (AD:65-72). **Backing out without
Send leaves the table opened.**

### Menu tab (MH, MI)
| id | what | file:line |
|---|---|---|
| (no id) Switch per dish → (no id) "Confirm"/"Cancel" | `menu-updateMenuItemAvailability` | MI:97, MH:241-262 |

## 2. States, in product words

| # | state | made by | seed (§5) |
|---|---|---|---|
| S1 | table vacant | seed / Clear / Vacant | re-seed or `FS <n> reset` |
| S2 | seated, nothing ordered | guest OTP | `seated` ✓ |
| S3 | round PENDING (kitchen has it) | guest checkout | `ordered` ✓ |
| S4 | round AWAITING_CONFIRMATION | guest checkout, restaurant gate ON | **add** `awaiting` |
| S5 | round PREPARING | kitchen | **add** `preparing` |
| S6 | round READY | kitchen Mark Ready | **add** `ready` |
| S7 | round SERVED | a captain | **add** `served` |
| S8 | round CANCELLED | manager / kitchen | **add** `cartcancelled` |
| S9 | two rounds of the **same** dish, round 1 PENDING, round 2 READY | guest ×2, kitchen | **add** `samedish` |
| S10 | bill issued, unpaid | till | `billed` ✓ |
| S11 | part paid | till | `partpaid` ✓ |
| S12 | paid, not cleared | till | `settled` ✓ |
| S13 | paid and cleared **while a round is still PENDING/READY** | till + kitchen late | **add** `clearedlive` |
| S14 | dessert after the bill | guest | `dessert` ✓ |
| S15 | order COMPLETED (someone tapped Mark Paid) | captain | `completed` ✓ |
| S16 | order CANCELLED | captain | **add** `ordercancelled` |
| S17 | guest session expired | clock | `expired` ✓ |
| S18 | merged 7+8, parent with / without an order | till | **add** `merged` (+ `ordered` on 7 first) |
| S19 | reserved / disabled | staff | `reserved` ✓ / `disabled` ✓ |
| S20 | opened by staff, nothing sent | captain | **add** `staffopen` |
| S21 | staff lines sitting in the cart, never sent (an interrupted Send) | captain | **add** `orphan` |
| S22 | guest has a dish in the cart, not checked out | guest | **add** `guestdraft` |
| S23 | captain's staff session expired | clock | **add** `staffexpired` |
| S24 | dish marked unavailable after the captain opened Add dishes | another staff | inline: `menu-updateMenuItemAvailability` |

## 3. The grid

**65 cells**, risk first. "Refused" always means **refused with a reason that names the table, round or bill, and
nothing changed in the database** ([TESTING.md](../../TESTING.md) "Refusals are behaviour too"; AGENT_QA §5).
**Bold** = what I think will fail. Coverage: **[R3]** already done by [sanity run 3](2026-09-25-sanity-run-3.md),
**[E2E-x]** covered on the backend by suite x (not on screen). Explore the untagged cells first.

### A. Money leaving or staying on the wrong place

| # | control | state | expected | source | watch for |
|---|---|---|---|---|---|
| W01 | `order-cancel` → Yes | S3 (₹280 PENDING, unbilled) | **Refused 403 for a SERVER.** A captain can't void a sent line. If it goes through, the lines must at least leave the bill with a P0 audit row, like a cart cancel | ST R8, ST-S4/S5; [TD-023](../TECH_DEBT.md) closure (cart cancel voids lines + audit) | **UOS:76-96 only flips `orderStatus`.** Nothing voids lines or writes audit. Read `lines` (`countsTowardTotal`) and `floor-get`: the kitchen loses the ticket while the till still bills ₹280. P0 candidate |
| W02 | `order-cancel` → Yes | S10 (bill A-000n issued) | Refused, naming the bill. A void after the invoice is a credit note (BL's) | ST Decisions 2026-09-15 "void after invoice is a credit note" | **The order goes CANCELLED under a live bill** |
| W03 | `order-cancel` → Yes | S12 (paid) | Refused | same | **same** |
| W04 | `order-cancel` → Yes | S4 (AWAITING) | Unspecified: rejecting a guest round is a *cart* CANCELLED ([CLAUDE.md](../../CLAUDE.md) gate). The app only offers whole-order cancel. Record whether the gated lines are voided. Ask Shaurya | CLAUDE.md waiter gate; OP:347-349 | |
| W05 | `order-mark-paid` → confirm | S10 (billed, unpaid) | Order COMPLETED. The table stays occupied, the till tile still shows ₹ due, the session stays active, no `paymentStatus` is written | FL-S16, R14; TD-013 and TD-010 closed; OD:237 dialog text | Human lens: a button called "Mark Paid" while ₹309 is unpaid |
| W06 | `order-mark-paid` → confirm | S6 (READY, not yet served) | Unspecified. Record whether the READY card disappears from the waiter **and the kitchen** (both reads skip COMPLETED, GAO:74), so the food never walks. Ask Shaurya | UOS:76-80 allows it | **P1 candidate if the round vanishes** |
| W07 | `order-mark-paid` → confirm | S15, detail opened before another captain completed it | Refused "Transition COMPLETED → COMPLETED is not allowed", shown in the snackbar | UOS:89-94 | |
| W08 | `table-status-vacant` | S3 (₹280 unbilled) | Refused "only the cashier can free a table that still owes". Table, session and lines unchanged. The red box in the dialog shows the reason | FL Decision 2026-09-24; FLR:336 | [E2E-coverage] |
| W09 | `table-status-vacant` | S10 | Refused, as W08 | same | |
| W10 | `table-status-vacant` | S11 | Refused, as W08 | same | |
| W11 | `table-status-vacant` | S12 | Table vacant, session ended, audit `table.clear` P2 by `srv_meg_1`. The order stays IN_PROGRESS (TD-082) | FL Decision 2026-09-24 "owes nothing → anyone" | |
| W12 | `table-status-vacant` | S18 child 8, group owes | Refused. 8 stays merged, 7's party untouched | FL Decision 2026-09-23 (TD-037 closed) | |
| W13 | `table-status-vacant` | S18 child 8, group owes nothing | 8 detached alone. 7's sitting **not** ended | same | |
| W14 | `table-status-active` | S18 child 8 (shows DISABLED) | Refused, naming the group ("8 is merged into 7") | FL Decision 2026-09-17 "the child stays `disabled` so nobody seats a second party"; R6 | **TBL:1414-1416 writes the status with no merge check.** Then read 8: `status active`, `mergedInto` still 7 |
| W15 | `table-status-disabled` | S3 (₹280 on table) | Unspecified who may. FL-S30/R17: the money keeps a tile at the till. Record whether the guest can still order and whether the captain can reach the table (Add dishes hides, OT:33 refuses). Ask Shaurya | FL-S30, R17 | |
| W16 | `table-status-reserved` | S3 | The seated party is not evicted. Its next checkout works. New scans get 403 | TDD:301-303; [E2E-coverage] reserved 403 | |
| W17 | `table-status-active` | S1 | Unspecified. The table reads ACTIVE with no session. Record what the till floor calls it: two screens disagreeing is a finding | FL-S4 | |

### B. Add dishes: the round must land on the right sitting, once

| # | control | state | expected | source | watch for |
|---|---|---|---|---|---|
| W18 | `table-add-dishes` → covers 2 → dish → `add-dishes-send` | S1 table 6 | Table active. Session `openedBy staff:srv_meg_1`, covers 2. One order, cart PENDING. The line has `placedBy staff:srv_meg_1` and `sent:true`. The kitchen read shows it | OR-S1; D4 covers | [E2E-order-entry] |
| W19 | same, no covers asked | S2 | Same session (`created:false`), `expiresAt` pushed out, no second session | OR-S22 | [E2E-order-entry] |
| W20 | same | S3 | Same order, a second cart. The till tile shows the sum | OR-S19 (second round) | [E2E-order-entry] |
| W21 | same | **S17 guest session expired** | The same sitting is **extended**: one draft, one bill | OR-S19 (expiry text: "extends the sitting… **Without this** one party gets two bills") | **SS:253-274 marks it expired and returns null, so OT:38-46 mints a new session.** Read `sessions` for the table: two, with two `draftId`s. P1 candidate |
| W22 | same | S10 (billed) | OR-S20 says refused, naming the bill. FL-S20 allows it and shows "₹x due · ₹y new". The specs conflict. Record, don't file (TD-065 is the till's dead end) | OR-S20 vs FL-S20 | |
| W23 | same | **S12 (paid, not cleared)** | Refused: a settled sitting accepts no new checkout | FL-S14; FL Decision 2026-09-17 (Grok) "a settled sitting stops accepting new users and checkouts" | **`acceptsNewGuests` ([domain/floor.ts:263](../../backend/src-plattr/functions/domain/floor.ts)) has no caller.** The round lands on the paid sitting |
| W24 | same | **S1 with the gate ON** | The captain's own round is born PENDING and the kitchen sees it | SPEC_OR config row `ordering.requireWaiterConfirmation`: "a till-punched round is placed by the waiter, so it is born PENDING regardless"; OR Decision 2026-09-17 | **COO:72-74 reads only the config.** The captain's round is AWAITING, the kitchen doesn't see it, and he has to long-press his own card |
| W25 | same | S22 (guest's paneer in the cart) | Send ships only the captain's lines. The paneer stays in the guest's cart, not sent | CHK:93-94 (`addedBy` filter) | |
| W26 | same, one naan | S21 (orphan staff lines) | Unspecified. Record: the next Send ships the orphan lines too, and the round pane never showed them. Ask Shaurya | AD:198-236 | Money: the guest is billed dishes nobody on screen sent |
| W27 | `add-dishes-send` **double-click** (two clicks in one frame through `$B js`) | S1 | One round, one cart | AGENT_QA §5 "repeat" | **`_send` never checks `_sending` (AD:198-201).** Only the rebuild disables the button. Count carts |
| W28 | `add-dishes-covers` = `0`, then `100` | S1 | Refused "covers must be a whole number from 1 to 99". Table **not** opened | OT:21-23 | Human lens: a full-screen red sentence and no way back except the app bar |
| W29 | open Add dishes, then back out with no Send | S1 | Unspecified. Table left active and seated at ₹0 until the idle sweep (60 min). Record. Ask Shaurya | FL-S36 | |
| W30 | `add-dishes-dish-<id>` then Send | S24 (dish made unavailable after the screen loaded) | Refused, naming the dish ("Chicken 65: … out of stock"). Nothing checked out | ATC:96, AD:215 | Check that no earlier line of the round was left in the cart (see W26) |
| W31 | `table-add-dishes` | S19 disabled 5 / S18 child 8 | Hidden | TDD:177 | Human lens: nothing on 8 says "merged into 7, use 7" |
| W32 | `table-add-dishes` | S19 reserved 4 | Unspecified: seating the booking? No covers asked (the status isn't `vacant`), and OT flips it to active. Record | AD:61, OT:33 | |
| W33 | `table-add-dishes` on 7 | S18 (7+8) | The round lands on 7's sitting | OT:27-28 | |

### C. Serve and confirm from the Orders tab

| # | control | state | expected | source | watch for |
|---|---|---|---|---|---|
| W34 | long-press `order-cart-<id>` → `order-mark-served` | S6 | Cart and items SERVED, `assignedTo srv_meg_1`, one `statusHistory` entry. Snackbar "Cart marked as served" | MCS:98-131; spine step 3 | [R3] |
| W35 | same | S3 / S5 | Refused, and the reason says the kitchen hasn't marked it ready | MCS:101-103 | TD-084. Confirm once, don't re-file |
| W36 | same, stale card | S6 on screen, server2 served it by API | Harmless: "already served", no second history entry | MCS:94-96 | Human lens: a green snackbar while the card disappears |
| W37 | same, stale card | S6 on screen, manager cancelled the cart by API | Refused "Cannot mark cancelled or returned cart as served", and nothing changed | MCS:89-91 | The generic snackbar is TD-084. Report only if the cart changed or the card survives a tab switch |
| W38 | same, stale card | S6 on screen, till cleared the table (S13) | Unspecified. Record whether serving a vacant table's round is allowed (MCS doesn't check the order or the table) | MCS | |
| W39 | long-press → `order-confirm-cart` | S4 | Cart PENDING, lines `sent:true`, the kitchen read now shows it | CLAUDE.md gate | [E2E-waiter-confirmation] on the backend only |
| W40 | long-press → "Not yet" | S4 | No call, nothing changes | OH:396-399 | |
| W41 | long-press → `order-confirm-cart`, stale | **S4 on screen, server2 confirmed it by API** | Harmless (idempotent), or refused naming who sent it | TESTING "refusals name the thing" | **UCS:131: PENDING→PENDING throws a plain Error, which becomes `internal` "Invalid status transition from PENDING to PENDING".** Screen: "Failed to confirm order". The captain thinks it didn't go |
| W42 | same, stale | S4 on screen, manager cancelled the cart by API | Refused with a reason | same | Same generic snackbar |
| W43 | reject a guest round | S4 | **NOT BUILT** on the waiter app: no reject control. Rejecting is a cart CANCELLED (CLAUDE.md), and OP:347 says "no method of its own" | — | Mark NOTBUILT, don't file |
| W44 | "Pending" sub-tab | S4 + S3 + S5 | All three rounds listed. The AWAITING one isn't under Ready | OP:173-182 | |
| W45 | "Ready" sub-tab | S3, then the kitchen marks READY by API | The card moves to Ready within 20 s, or at once on a tab switch | OP:106 | Time it: a 20 s stale window is the product |
| W46 | Orders as server@ | S13 (cleared while a round is still PENDING) | Unspecified. Record whether the card stays forever on a vacant table. TD-082 assumed the ghost order has 0 carts and so draws nothing; here it has one | TD-082 | If a card stays, it's new evidence against TD-082's P2 grade, not a repeat |
| W47 | "My Orders" vs "All Orders" | any | Unspecified. They are the same list by construction (OP:164-167). Record | — | Human lens |
| W48 | Orders as server2 (API read of `order-getActiveOrdersForRestaurant`) | S3 on table 1 (assigned `srv_meg_1`) vs table 6 (unassigned) | Unspecified: server2 never sees table 1 (GAO:88-99). Record | — | Two captains, one section |

### D. Order detail

| # | control | state | expected | source | watch for |
|---|---|---|---|---|---|
| W49 | tap a card → detail | S3, two rounds | Header, carts in index order, a total | OD | Dates (TD-087) and raw ids (TD-046) are known |
| W50 | cart "Mark Served" (no id) | S6 | SERVED, one call. A second tap after the refresh fires nothing | OD:393-439 | [R3] E2 |
| W51 | cart "Mark Served" | S3 | Disabled (CD:31, :86) | CD | Run 3 said it's "shown" on PENDING. Record whether it's enabled |
| W52 | item checkbox (no id) in **round 2** | **S9** (same dish, round 1 PENDING, round 2 READY) | Only round 2's line is served | CD:227; SMI | **SMI:65-70 matches `menuItemId + cartItemId` across every cart, and `cartItemId` restarts at 1 per cart (UCS:194-196).** Round 1's PENDING copy matches too, so the whole call is refused "Invalid status transition from PENDING to SERVED" and the READY dish can't be ticked |
| W53 | item checkbox in round 2 | S9 with **both** rounds READY | Only the tapped round's line is served | same | **Both rounds flip to SERVED** |
| W54 | `order-mark-paid`, then Back | S3 | The Orders list no longer shows the round | GAO:74 | Pairs with W06 |

### E. Tables, OTP, menu, login, session

| # | control | state | expected | source | watch for |
|---|---|---|---|---|---|
| W55 | `table-<id>` | S10 / S12 | Unspecified: the captain app has no money view. The card reads ACTIVE whether it owes ₹309, is paid or is billed. Record | — | Human lens: "can I seat someone here?" |
| W56 | `table-refresh-otp` | S3 (party seated) | Unspecified: a new code lets another phone join this party's tab. Record | — | |
| W57 | `table-refresh-otp` | S18 child 8 / S19 disabled | Unspecified. The OTP is minted with no state check (TBL:1275). FL R6 counts an OTP in flight as "not vacant" | FL R6 | Does a later Vacant on 8 still pass? |
| W58 | `table-view-order` | S3 | **NOT REACHABLE:** `activeOrderId` is never written (only read, TBL:827, :1014) | — | Known. Mark NOTBUILT |
| W59 | menu switch → Confirm (unavailable) | S22 (guest's cart holds that dish) | The guest's checkout is refused, naming the dish. Add dishes hides it the next time it opens | CHK:102-106 | |
| W60 | menu switch | as SERVER | Allowed: the captain "toggles stock" | SPEC_OR intro (line 17) | |
| W61 | `login-submit`, wrong password | — | Refused, shown in red under the form | LF:160 | |
| W62 | `login-submit` as `kitchen@meg.test` | — | Unspecified. Record whether a KITCHEN login gets the waiter app | — | |
| W63 | log in as `till@meg.test` (MANAGER) → `table-status-vacant` | S3 | Refused "this table still has money on it — bill it and settle it first". No PIN box in Flutter (TD-003) | FLR:339 | |
| W64 | any act (long-press serve, Vacant, Send) | **S23 staff session expired** | The app says "session expired" and takes the captain to login. The dialog exists, but no backend sends `session_expired` | [interrupt_flow_interceptor.dart:63](../../frontend/src-platter-apps/modules/platter_core/lib/src/network/interrupt_flow_interceptor.dart) | **Expect generic "Failed…" snackbars and no way out: no logout button, and the 401 is only logged** ([error_interceptor.dart:8](../../frontend/src-platter-apps/apps/platter_server/lib/network/interceptors/error_interceptor.dart)). Then reload and record whether it lands on login |
| W65 | reload the page (`$B js 'location.reload()'`) | logged in, S6 | Back on the Orders tab, still logged in, same cards | [main.dart:121](../../frontend/src-platter-apps/apps/platter_server/lib/main.dart) `tryRestoreSession` | |

## 4. Misuses (AGENT_QA §5 table, for the captain)

Run these on the cells that passed. Each one is also a grid cell for the report.

| misuse | for the captain | cells |
|---|---|---|
| repeat | double long-press serve, double Send, double "Yes, Mark Paid" | W27, W36, W50 |
| stale screen | act on a card ≤20 s old after the **kitchen** (READY, CANCELLED), the **till** (billed, paid, cleared) or **server2** (served, confirmed) changed it | W36-W38, W41, W42, W46 |
| two people at once | server@ on screen, server2@ by API on the same table: both confirm, both serve, both Send to table 6 within a second (two `table-openTable` → must be one session) | W36, W41, + one extra: parallel `table-openTable` from two sessions on a vacant table → count sessions |
| interrupt | reload during Add dishes Send (a round of 3 dishes, reload after the first `cart-addItemToCart` in the log) → produces S21 for real | W26, W65 |
| after the till acted | Vacant after the till cleared it (already vacant: the button is hidden, re-open the dialog); Add dishes after the till cleared it (new sitting, fine); serve after the till cleared it | W11, W38, W46 |
| skip a step | serve before the kitchen is done; Mark Paid before anything is served | W35, W06 |
| after an error | after a refused Vacant: is the dialog still open, the status unchanged, the buttons still live? After a refused Send: is the round still in the pane, and what is already in the cart? | W08, W30 |
| session expired | staff session expired mid-shift | W64 |

## 5. Seeding every starting state through real endpoints

Env (slot 0, because of §0):
`cd backend/src-plattr/functions/test/e2e/qa && export FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 PLATTR_BASE_URL=http://127.0.0.1:5002/rms-app-dd875/us-central1`.
`node floorstate.mjs` with no args prints the states. Always `node floorstate.mjs <n> reset` between cells.
The helper refuses a table that isn't vacant.

**Already in [floorstate.mjs](../../backend/src-plattr/functions/test/e2e/qa/floorstate.mjs):** `holding seated ordered billed partpaid settled dessert split offer completed expired reserved disabled comped cancelled cancelpp credited onaccount`.
Dish = Butter Naan ₹60 (the helper's `dish()`). `completed` is Mark Paid done by `manager@`, not by server@.

**To add** (each is a few lines in `setState`, same `call()`). Staff sessions come from `server-serverLogin`: `kitchen@meg.test`, `server2@meg.test`, `manager@meg.test`. Test every new state on a spare table with `dump` before the driver starts (AGENT_QA §5):

| state | calls after the named base state |
|---|---|
| `preparing` / `ready` | `ordered`, then `cart-updateCartStatus {restaurantId, orderId, cartIndex:0, newStatus:'PREPARING'|'READY', sessionId:<kitchen>}` |
| `served` | `ready`, then `order-markCartAsServed {restaurantId, orderId, cartIndex:0, sessionId:<server2>}` (not server@: that would make the cart his) |
| `cartcancelled` | `ordered`, then `cart-updateCartStatus … newStatus:'CANCELLED', sessionId:<manager>` |
| `ordercancelled` | `ordered`, then `order-updateOrderStatus {restaurantId, orderId, orderStatus:'CANCELLED', sessionId:<manager>}` |
| `samedish` | `ordered`, then the same dish again (`cart-addItemToCart` + `cart-checkoutCart` on the same guest), then READY on `cartIndex:1` only. Variant: READY on both |
| `awaiting` | turn the gate ON (below), then `seated` + add + checkout. **Turn it OFF afterwards**: it changes every later checkout at Meghana |
| `clearedlive` | `ordered` (PENDING), `billing-issue`, `payments-take` full, then `floor-clear {restaurantId, staffSessionId:<manager>, tableId, cid}`, with **no** kitchen action |
| `merged` | `table-setMerge {restaurantId, sessionId:<manager>, cid, parentTableId:'tbl_meg_7', childTableIds:['tbl_meg_8'], merge:true}`. For "group owes", run `ordered` on 7 first. `reset 7` also frees 8 |
| `staffopen` | `table-openTable {restaurantId, sessionId:<server@ session>, tableId, covers:2}` |
| `orphan` | `staffopen`, then `cart-addItemToCart {restaurantId, tableId, sessionId:<table session from openTable>, addedBy:'staff:srv_meg_1', menuItemId, quantity:1}`, with no checkout |
| `guestdraft` | `seated`, then `cart-addItemToCart` with the guest session, no checkout |
| `staffexpired` | no endpoint makes time pass. Patch `sessions/<server@ session>` `expiresAt` to a minute ago, as the helper's `expired` state already does for a guest. A later `server-serverLogin` revives the same doc |
| S24 | `menu-updateMenuItemAvailability` (HTTP `onRequest`: POST body `{restaurantId, sessionId, menuItemId, isAvailable:false}`, not `{data}`). Put it back after |

**Waiter gate ON/OFF.** No endpoint writes it. It lives at `restaurants/res_meghana/config/settings` → `ordering.requireWaiterConfirmation`
([COO:622](../../backend/src-plattr/functions/orders/createOrUpdateOrder.js)). PATCH with **`updateMask.fieldPaths=ordering.requireWaiterConfirmation`**,
the leaf. **Don't copy [test/e2e/lib/data.js](../../backend/src-plattr/functions/test/e2e/lib/data.js) `setWaiterConfirmation`**:
it masks the whole `ordering` map and would wipe Meghana's `ordering.takeawayTableIds` (P1/P2 stop being parcels).
Re-read the doc after both writes.

Suggested table plan for one pass: 6 = vacant for Add dishes, 7+8 = merged, 9 = billed / settled, 10 = ready / samedish,
11 = expired, 12 = awaiting. Reset each table before re-use.

## 6. Do not report

Open rows. If you see one, write "seen, TD-nnn" in the cell and move on.

| TD | what the driver will see |
|---|---|
| [TD-084](../TECH_DEBT.md) | Mark Served offered on a PENDING card, then "Failed to mark cart as served" with no reason. The generic snackbar on every refused serve or confirm is this row's "refusal is vague" half |
| [TD-085](../TECH_DEBT.md) | Every round's card shows the whole order's total (₹800 on both the ₹280 and ₹620 rounds) |
| [TD-082](../TECH_DEBT.md) | A paid, cleared table leaves its order IN_PROGRESS. Invisible when all carts are served. **Not** this row if a card stays visible (W46) |
| [TD-046](../TECH_DEBT.md) | Raw `tbl_meg_6` everywhere: card, serve dialog, detail, Tables tab |
| [TD-087](../TECH_DEBT.md) | Detail dates "1970-01-01…", "+058702-…", a raw ISO checkout time, "Order #<doc id>", "Server: Unassigned" |
| [TD-023](../TECH_DEBT.md) (closed as detection) | Cancelling a *cart* voids its lines with a P0 row and no PIN. By design. (W01 is the *order* cancel, which is different) |
| [TD-010](../TECH_DEBT.md) (closed) | Mark Paid doesn't write `paymentStatus`. By design: PY owns payment |
| [TD-013 / TD-036](../TECH_DEBT.md) (closed) | Mark Paid doesn't free the table. By design (FL-S16) |
| [TD-003](../TECH_DEBT.md) | No PIN box anywhere in the Flutter apps |
| [TD-051](../TECH_DEBT.md) | A staff session dies after 12 h |
| [TD-058](../TECH_DEBT.md) | A table with no `capacity` field breaks the Tables tab (the seed has one on every table) |
| [TD-065](../TECH_DEBT.md) | Dessert after the bill can't be billed at the till (W22's downstream) |
| [TD-080](../TECH_DEBT.md) | A merged group is "7", never "7+8" |
| [TD-030](../TECH_DEBT.md) | Unmerge releases all children |

By design, or known and filed elsewhere:
- The Served tab stays empty for rounds served during the run (AGENT_QA §8).
- `orders-refresh` / `tables-refresh` unreachable, "Refresh Menu" on every tab (FRONTEND_TESTING §6).
- `table-view-order` never shows (`activeOrderId` never written). A fully served order has no card, so its detail
  and Mark Paid can't be reached from Orders. Both were found 2026-09-08 and kept in session memory, not in the
  repo. The till bills now, so the stakes are lower. There's no TD row yet: say so once in the report's notes.
- A merged child shows as DISABLED with nothing saying "merged" (FL Decision 2026-09-17: "the server app is unchanged").
- The till's round bypasses the gate; the guest's doesn't (CLAUDE.md). W24 is about the **captain's** round.
- No Preparing step in the kitchen UI. Kitchen acts are recorded as `userId: "system"` (run 3 notes).
- Debug build: the seeded-login cards under the form, and the guest app's OTP prefill `123456` (AGENT_QA §8).
- Card amounts are food only (order `priceInfo.finalPrice`, after offers, before service charge and GST). The till's
  bill is higher. Not a finding.
- A card shows "₹" rounded to the rupee (OH:307).

## 7. What the observer watches in the emulator log

The functions emulator logs `Beginning execution of "us-central1-<name>"` / `Finished "us-central1-<name>"` per
call. Filter on the names below, `Error in`, and `HttpsError`. Background noise while a tab is open:
`order-getActiveOrdersForRestaurant` every 20 s (Orders), `table-getTablesForRestaurant` every 10 s (Tables),
`menu-getRestaurantMenu` every 10 s (Menu). **Tell your own seed calls apart**: they come from `floorstate.mjs`
with manager@, kitchen@ or server2@ sessions.

| screen action | function(s), in order | backend console lines worth grepping |
|---|---|---|
| login | `server-serverLogin` | — |
| Orders tab open / poll | `order-getActiveOrdersForRestaurant`, `order-getServedCartsForServer` (on open and on the Served tab) | — |
| long-press → Mark Served | `order-markCartAsServed`, then `order-getActiveOrdersForRestaurant` + `order-getServedCartsForServer` (refresh) | `markCartAsServed request:`, `[markCartAsServed][stage=…]` on a refusal |
| long-press → Send to kitchen | `cart-updateCartStatus`, then the two refresh reads | `Error in updateCartStatus:` / `updateCartStatus: Error updating cart status` |
| tap card | `server-getOrderDetails` | — |
| detail Mark Served | `order-markCartAsServed`, `server-getOrderDetails` | as above |
| detail item checkbox | `server-markItemServed`, `server-getOrderDetails` | `Error in serverMarkItemServed:` |
| Cancel Order / Mark Paid | `order-updateOrderStatus`, `server-getOrderDetails` | `updateOrderStatus request:`, `base drifted` (warn), `Offers V2:` lines at COMPLETED |
| Tables tab / tap table | `table-getTablesForRestaurant`, `table-getTableDetails` | — |
| status button | `table-updateTableStatus` (Vacant runs FL's clear inside it) | `updateTableStatus - Updating table …`, `Error in updateTableStatus:` |
| refresh OTP | `table-generateTableOTP` | `Error in generateTableOTP:` |
| open Add dishes | `table-openTable`, `menu-getRestaurantMenu` | `Error in openTable:`, `validateTableSession: Marked session … as expired` (W21) |
| Send | `cart-addItemToCart` × lines, then `cart-checkoutCart` | `Creating new order for table …` (a new order, vs. appending to the existing one) |
| menu switch → Confirm | `menu-updateMenuItemAvailability` | `Invalid request:` |

After every write, read back through `node floorstate.mjs <n> dump` (table, sessions, orders with cart statuses,
lines with `billId`/`counts`, bills). For W01–W03, also call `floor-get` as manager and read the tile's money.

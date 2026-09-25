# OR · Till order entry

Status: **draft v1, decisions signed 2026-09-17** (see `DECISIONS_2026-09-17.md` § OR). Not yet fanned out. Written after tracing the real order
path end to end: `cart-addItemToCart` → `cart-checkoutCart` → `orders/createOrUpdateOrder.js` →
`orders/lineSnapshots.js` → `billing-preview`. Every claim about existing behaviour below carries the
file it came from.

**Job.** Let the cashier put food on a table — or on no table — without a guest's phone in the loop, and
have that round land on exactly the same order, the same line snapshots and the same bill as a round a
guest placed by QR.

## The finding that shapes this sheet

**No staff surface in the system can place an order today.** The captain app
(`apps/platter_server/lib/network/api_constants.dart`) has eleven endpoints and not one of them is
`cart-addItemToCart` or `cart-checkoutCart`. It reads orders, marks items served, cancels a cart,
mints an OTP and toggles stock. It has no menu-to-cart screen at all. So "make the till the captain
app's flow in React" has nothing to copy — the guest Flutter app is the only order-entry client that
has ever existed, and the till is the second.

**The good news is that almost none of the backend is missing.** The guest path is table-agnostic in
every way that matters:

| What the till needs | What already exists |
|---|---|
| A menu with variants, add-ons, stock | `menu-getRestaurantMenu` — no session needed, returns categories, items, variants, add-ons, `isInStock` |
| Put a dish in a cart | `cart-addItemToCart`. Enforces stock, mandatory variants, and prices server-side |
| Reduce a quantity before Send | `cart-removeItemFromCart` — decrements by one |
| Send the round | `cart-checkoutCart` → one cart snapshot on the order + one line doc per item, in one transaction |
| Not send the whole table's cart | `addedBy` (2026-09-16). The till sends only its own group; the QR guests' half-built list stays. A guest may choose "Send all" for every guest's dishes (`cartItemIds`, D5 2026-09-25); staff items are never swept |
| Not send the same round twice | `requestId` (OF R1) |
| Void a line after the kitchen has it | `approvals-apply` `action: 'void'` (ST-S5), PIN, audit row |
| A party of eight on two tables | `table-setMerge` + `resolveTableId` on every guest cart write + auto-release in `vacateTable` |
| The bill, the money, the day | BL, PY, DC — built |

**The one real gap is the session.** Every cart endpoint gates on *the table having an active session*
(`cartInputValidation.js` `requireActiveTableSession`, `validateCheckoutSession`), and the only thing
in the codebase that creates one is `table.js:513`, inside `validateOTP`, after a guest typed a phone
number and a six-digit code. A walk-in has no phone. **So OR is one new endpoint and a screen.**

## Who can do what

Roles are the existing ones in `adminApp/auth.js`. The till logs in as MANAGER or ADMIN (ST's rule);
`server-serverLogin` already gives it a staff session.

| Action | Captain (SERVER) | Cashier (MANAGER) | Owner (ADMIN) |
|---|---|---|---|
| Open a table with no QR scan | ✓ | ✓ | ✓ |
| Punch a round onto a table | ✓ | ✓ | ✓ |
| Change a quantity before Send | ✓ | ✓ | ✓ |
| Void a line not yet sent | ✓ | ✓ | ✓ |
| Void a line already sent | – | PIN (ST) | PIN (ST) |
| Discount a line | – | ST rules | ST rules |
| Merge / un-merge tables | ✓ | ✓ | ✓ |
| Move a table's order to another table | – | ✓ (audit P1) | ✓ (audit P1) |
| Open a takeaway / phone ticket | ✓ | ✓ | ✓ |
| Change the counter list, session length | – | – | ✓ (config doc) |

## Objects

Nothing new is invented. The till writes the documents that already exist.

**Cart** `restaurants/{id}/carts/{tableId}` — the doc id *is* the table id. Items carry `addedBy`. The
till's `addedBy` is `staff:<serverId>`, so a till round is its own group on a shared table cart and
cannot merge into, remove, or send a guest's items (`addItemToCartBoilerplateHelper.js`,
`removeItemFromCart.js`, `createOrUpdateOrder.js:95-97`).

**Session** `restaurants/{id}/sessions/{sessionId}`. One collection, two shapes: a *table* session has
`tableId, primaryUserId, users[], status, expiresAt`; a *staff* session has `entity: 'server', serverId`
(`adminApp/auth.js:92`). They cannot collide because `validateTableSession` queries on `tableId`.
OR adds **one optional field to a table session**: `openedBy` (`staff:<serverId>` or `guest`).
Nothing reads it but the till and the audit trail — it is the record of who opened a table that no
guest authenticated, which is what makes OR-1 acceptable. Signed 2026-09-17.
**`covers` was proposed here and declined** (OR-2, TD-031): a head count is not stored in v1.

**Order** `restaurants/{id}/orders/{orderId}`. Grouped by `sessionId`, one order per sitting
(`createOrUpdateOrder.js:104-112`), `carts[]` one entry per round. Unchanged.

**Line** `restaurants/{id}/lines/{cartId}_{cartItemId}`. `draftId` is the sessionId
(`lineSnapshots.js:70`), which is what BL previews and issues on. Unchanged.

**Table** `restaurants/{id}/tables/{tableId}`. Statuses `active | vacant | pending | disabled | reserved`
(`table.js:22`), plus `mergedInto`, `mergedBy`. Unchanged.

## Scenarios

Money in rupees for reading; every stored value is minor units. Hours are the restaurant's.

| ID | Scene and what happens | Tag |
|---|---|---|
| OR-S1 | **Two walk-ins, no phone.** 21:00, table 7 is vacant. Cashier taps table 7 and gets a table session without an OTP: `table-openTable` mints one through the existing `createOrGetTableSession(restaurantId, tableId, 'staff:srv_9')`, marks the table `active`, and stamps `openedBy: 'staff:srv_9'`. She punches Mutton Biryani ₹450 and a Kingfisher pint ₹260 and taps Send. One cart snapshot, two line docs, kitchen sees it. **Without this** every walk-in is a paper KOT and Plattr never sees the money. | Engine |
| OR-S2 | **Phone order for pickup.** 20:15, a regular calls for two Masala Dosas ₹180 each. Cashier opens counter ticket `takeaway_1` (an ordinary table doc named in `ordering.takeawayTableIds`), types "Ramesh 98450…" into the order note, punches, Sends. It bills, prints and settles through exactly BL and PY, no branch anywhere. **Without this** phone orders are a notebook and never reach the day close. | Engine |
| OR-S3 | **Takeaway at the counter.** 22:40, a walk-up wants one Butter Naan ₹70 and a Paneer Tikka ₹320 to carry out. Same counter ticket, Send, bill, cash, done; the ticket returns to `vacant` when the bill is paid, exactly like a table. **Without this** the counter competes with the dine-in floor for table ids. | Engine |
| OR-S4 | **Cashier adds to a table already ordering by QR.** Table 12, four guests mid-meal on their own phones, one of them has a half-built cart with a ₹320 Paneer Tikka in it. At 21:20 the fourth guest asks the cashier for an Old Monk 60ml ₹180. The cashier punches it with `addedBy: 'staff:srv_9'` — a second group on the *same* cart doc — and Sends. Only her line leaves; the guest's Paneer Tikka is still in his cart, repriced, untouched. Both rounds land on the same order because the order is found by `sessionId`, and both draw on the same bill because `draftId` is that sessionId. **Without this** the cashier's Send wipes four people's half-built lists and the bar round lands on a second bill. | Engine |
| OR-S5 | **Variant and a mandatory add-on.** Mutton Biryani ₹450 with variant *Boneless* (+₹60) and the mandatory *Raita or Salad* group. The cashier taps Send with no choice made in that group: `processSelectedVariants` refuses with "Mandatory variant 'Raita or Salad' must be selected" and the item never enters the cart. **Without this** the kitchen gets a ticket it cannot cook and rings the counter at the busiest hour. | Engine |
| OR-S6 | **Out of stock.** Prawns went off at 20:00, so `isInStock: false`. The till's menu shows the tile greyed and the tap does nothing; a stale screen that sends anyway is refused twice — by `addItemToCart` at add time and by `checkoutCart`'s stock sweep at Send. **Without this** a guest waits twenty minutes for a dish the kitchen cannot make. | Engine |
| OR-S7 | **Out-of-stock add-on.** The same Prawn Butter Masala is offered as a ₹120 *add-on* on a Veg Biryani. It is accepted, cooked for and billed: `processSelectedAddons` never reads `addon.isInStock`, and an add-on id that does not exist is silently dropped instead of refused (TD-015, live today). The till must not pretend otherwise: it greys the add-on from its own menu read and files nothing new. **Without this** we ship a screen that claims a guard the server does not have. | No (TD-015) |
| OR-S8 | **Quantity change before Send.** Cashier punched 3 Butter Naan ₹70 and the guest says two. She taps minus once: `cart-removeItemFromCart` decrements to 2 and re-prices the cart. Nothing has gone to the kitchen, no reason, no PIN, no audit row. **Without this** a typo at the counter becomes a void with a reason on it. | Engine |
| OR-S9 | **Void after Send.** 21:35, the ₹450 Mutton Biryani is already cooking and the guest leaves. Cashier taps Void on the line: `approvals-apply` `action: 'void'`, `lineId` `{cartId}_{cartItemId}`, reason "guest left". The line was born `sent: true` at checkout, so ST asks for a PIN and writes P0; the line flips `countsTowardTotal: false` and drops off the bill. Stock is not returned. **Without this** the cashier deletes food from the bill with no name on it. | Engine |
| OR-S10 | **Quantity change after Send.** 2 of 3 Butter Naan ₹70 have gone to the kitchen and the guest wants one. `applyToLine` voids a whole line, not part of one, so v1 voids the ₹210 line through ST's door and the cashier re-punches 1. Two rounds and two audit rows for one correction — ugly, honest, and the shape ST already named as scope (donor MISSING 4). **Without this** a 3→1 on a sent line becomes a silent price edit, which is the thing ST exists to remove. | Manual |
| OR-S11 | **Line discount.** 21:50, a ₹1,250 pitcher, the cashier gives ₹100 off, reason "regular". This is ST-S1 verbatim: under the 10 % limit, applied at once, P1. Over the limit the one interceptor in `api/client.ts` shows the PIN box. OR adds a button, not a rule. **Without this** the cashier discounts by voiding and re-punching at a made-up price. | Engine |
| OR-S12 | **Party of eight.** 20:05, tables 5 and 6 are pushed together. Cashier taps Merge with 5 as parent: `table-setMerge` disables 6 and sets `mergedInto: '5'`. Anyone who then scans 6's printed QR lands on 5's cart, 5's session and 5's order, because every guest cart write runs `resolveTableId` first. One ticket, one bill. **Without this** eight people produce two bills and two kitchen tickets for one table. | Engine |
| OR-S13 | **Un-merge.** They pay at 22:40. `vacateTable` already calls `unmergeChildren`, so 6 comes back to `vacant` on its own with nobody confirming — built, and the behaviour an earlier agent recommended. The open half is mid-meal: today the only way to hand 6 back before the bill is a manual `setMerge {merge: false}`, which releases **every** child of 5 at once. **Without this** table 6 sits disabled, its QR pointing at a dead session, and the next party cannot be seated. | Engine |
| OR-S14 | **Two parties join.** 20:30, table 5 (two guests, one round already eaten) and table 6 (two guests, nothing ordered) decide to sit together. `setMerge` refuses: only a `vacant` child can be absorbed (`table.js`), and 6 is `active`. The till says so in words and offers Move instead. **Without this** the cashier "fixes" it by re-punching table 6's food onto table 5 and table 6's session is orphaned. | Engine |
| OR-S15 | **Table transfer.** 21:10, the party on table 3 moves to the quieter table 9. One transaction moves the sitting: the session's `tableId`, the live cart doc (delete `carts/3`, write `carts/9`), the order's `tableId`, and each unbilled line's `tableId`; 3 goes `vacant`, 9 goes `active`. `draftId` does **not** change, because it is the sessionId, so the bill in progress follows the party and nothing re-prices. An ST audit row P1, `action: 'move'`. A line that already carries a `billId` refuses the move. **Without this** a transfer is a void of the whole table and a re-punch, at list price, with no trail. | Engine |
| OR-S16 | **Covers — declined, kept for the record.** Cashier types 4 at open and the count is written on the sitting. **Decided against 2026-09-17 (OR-2):** no head count is stored in v1. The cost is that per-head average, the number a restaurant owner actually watches, is unrecoverable for every night that runs without it — it cannot be backfilled. TD-031. A later session must not add this field on the grounds that it is cheap; it is cheap, and it was declined anyway. | No |
| OR-S17 | **Punched while offline.** 20:44, the till's last call failed. The menu is on screen because it is cached (`ordering.menuCacheMinutes`, 60), so the cashier can read prices — but Add and Send are disabled with "No connection since 20:42, write this one down". OF shipped no write replay by decision, and a cart write is a server-priced write; a queued one would be priced at tomorrow's menu. **Without this** the cashier taps Send, sees nothing, taps again, and four biryanis arrive when the line comes back. | UI |
| OR-S18 | **Send tapped twice.** 21:02, the answer to Send is slow and the cashier taps again. The till minted one `requestId` for that tap and resends it: the second call answers the same order with `retry: true` and writes nothing (OF-S1, `createOrUpdateOrder.js:114-129`). A genuinely different round after the first landed is a new tap and a new id. **Without this** one round becomes two and the kitchen cooks it twice. | Engine |
| OR-S19 | **Session expired under a long dinner.** Table 7 opened at 19:00; the session's expiry is four hours (`sessionService.js:80`). At 23:05 the cashier punches a last round of coffee: `validateTableSession` finds the session past `expiresAt`, flips it to `expired` and refuses. Calling `table-openTable` again would mint a *new* sessionId — a new `draftId` — and split the table's bill in two. So the till instead **extends** the sitting: `table-openTable` on a table that is already `active` pushes the existing session's `expiresAt` out by `ordering.sessionHours` and returns that same id. **Without this** one party gets two bills at 23:05 and the cashier cannot see why. | Engine |
| OR-S20 | **Ordering stops at the bill.** 22:35 the bill for table 7 is issued as 0417. The cashier tries to punch a last beer onto it. Refused: BL R13 says ordering stops at issue. The way back is BL-S9, cancel the bill and reissue. **Without this** a line is placed after the invoice is frozen and the paper disagrees with the data. | Engine |
| OR-S21 | **Walk-out.** 22:50, table 7's guests left without paying. The cashier comps the bill to zero through BL's existing Comp button (DC-S25a, PIN, P0) and the table releases when the ₹0 bill is settled. OR adds nothing. **Without this** the day cannot close, because DC R5 refuses a close over unbilled lines. | Engine |
| OR-S22 | **Table already occupied.** Cashier taps table 7 to open a walk-in and it is already `active` with a guest session from 19:00. The till does not mint anything: it opens that sitting's cart and shows the round the guests placed. **Without this** a second session appears on one table and the two halves of the meal land on two bills. | Engine |

**Without this:** every non-QR guest, phone order and split bill happens on paper, and Plattr never
sees that money.

## Rules

- **R1** The till reuses the guest order path unchanged. A round punched at the till is
  indistinguishable downstream from a round placed by a phone: same cart doc, same
  `createOrUpdateOrder`, same line snapshots, same bill. No second write path for money. Anything OR
  cannot do through the existing endpoints is named in this sheet, not worked around in the till.
- **R2** A cart needs a table session; a table session no longer needs a phone. `table-openTable` is
  staff-gated (`validateStaffSession`), takes no OTP, and mints through the existing
  `createOrGetTableSession` with `primaryUserId: 'staff:<serverId>'`. The OTP path is untouched and is
  still the only way a *guest* gets one.
- **R3** One sitting, one session, one `draftId`. Opening a table that is already `active` returns the
  live session and extends its expiry; it never mints a second. Two sessions on one table is two bills
  for one party, which is a money bug, not a UI annoyance.
- **R3a** The sitting on a line is the table session, never the cashier's login. The till holds two
  session ids: its own staff login (auth, `addedBy`) and the table session `table-openTable` returned.
  Only the second may ever reach `cart-*` as `sessionId`. Since 2026-09-25 the line writer refuses a
  line with no sitting (`orders/lineSnapshots.js`), a bill takes its sitting and tables from its lines,
  and the floor finds bills by that `sittingId`. A staff login sent as the sitting would pass all three
  and bill the walk-in to the cashier. Sanity run 1 found exactly this mix-up between the till and the
  bill (`reviews/2026-09-22-sanity-run-1.md`). The backend half already obeys this: `table-openTable`
  returns the table session and `suites/order-entry.js` sends that to `cart-*`. The till screen is not
  built yet; its first Playwright test asserts the placed line's `sessionId` equals the id
  `table-openTable` returned, not the cashier's login.
- **R4** The till is a diner. It sends `addedBy: 'staff:<serverId>'` on every cart write, so it owns its
  own group, cannot remove a guest's item, and its Send leaves everyone else's list where it is.
- **R5** One Send, one `requestId`, minted at the tap and kept while it is in flight. The same id is the
  same act (OF R1).
- **R6** Nothing is deleted. Before Send, a correction is a cart edit and leaves no trail because
  nothing left the till. After Send, every correction goes through ST's one door — void with a reason,
  discount with a limit — and is recorded.
- **R7** Prices come from the server. The till sends `menuItemId`, quantity, variant ids, add-on ids and
  a note. It never sends a price, a total or a discount amount it computed.
- **R8** A takeaway ticket is a table. Counter tickets are ordinary table documents named in config.
  `if (isTakeaway)` in business logic is a lint failure like `restaurantId ===`.
- **R9** Merged tables are resolved on guest writes and never on staff writes. A cashier naming table 6
  means table 6; a guest scanning table 6 means its parent. That split already exists
  (`mergedTables.js`) and OR keeps it.
- **R10** A move carries the sitting, not the money. `sessionId` and therefore `draftId` survive a table
  transfer, so no line is re-priced and no bill splits. A line with a `billId` cannot move.
- **R11** Offline, the till reads and does not write. A cached menu is a read; an order is a
  server-priced write and OF shipped no replay queue. Send is disabled and says why.
- **R12** Every number the till enforces is a config key on the restaurant config doc. Session length,
  the counter ticket list and the menu cache age are values, not literals.

## Config keys (on `restaurants/{id}/config/settings`, field `ordering`, with defaults)

| Key | Default | Used by |
|---|---|---|
| `ordering.takeawayTableIds` | `[]` | OR-S2, OR-S3 — the counter tickets, seeded at onboarding |
| `ordering.sessionHours` | 4 | OR-S19 — replaces the literal at `sessionService.js:80` |
| `ordering.menuCacheMinutes` | 60 | OR-S17 — how stale a cached menu may be before the till refuses to show it |
| `ordering.requireWaiterConfirmation` | false | **existing** (2026-09-16). A till-punched round is placed by the waiter, so it is born `PENDING` regardless — the gate only judges guest-placed rounds |

Served to the till on the existing `approvals-config` answer, the till's one config read, through
`app/config.ts`.

## Talks to

| Port | What crosses | If the other side is down |
|---|---|---|
| ← CF Config | the keys above, read once per open | defaults apply; log a warning |
| ← Menu | `menu-getRestaurantMenu`: categories, items, variants, add-ons, stock | the cached menu with its age (OR-S17); no cache, no ordering screen |
| → Cart | `cart-addItemToCart`, `cart-removeItemFromCart`, `cart-getCart`, `cart-checkoutCart`, all with `addedBy` | no round; the till says so and the cashier writes it down |
| → Table | `table-openTable` (new), `table-setMerge`, `table-moveTable` (new), `table-getTablesForRestaurant` | no session, no cart; refuse |
| → ST | `approvals-apply` `void` / `discount` on a placed line; `move` audit row | ST refuses, the line does not change |
| → BL | line snapshots, written inside the checkout transaction; `draftId` = sessionId | no lines, no bill |
| → PY / DC | nothing directly. Money reaches them through BL | – |
| → KT Kitchen | nothing new: the kitchen reads the order (`order-getActiveCartsForKitchen`) | – |

## The flow end to end

1. Till calls `table-openTable {restaurantId, tableId, sessionId (staff)}`. Server:
   `validateStaffSession` → refuse if the table is `disabled` or `mergedInto` something → if `active`,
   extend and return the live table session → else `createOrGetTableSession(…, 'staff:<serverId>')`,
   set the table `active`, stamp `openedBy`. Returns the table `sessionId`.
2. Till reads the menu once (`menu-getRestaurantMenu`), caches it.
3. Each tap: `cart-addItemToCart {…, sessionId, addedBy: 'staff:<serverId>'}`. Server prices it,
   checks stock and mandatory variants.
4. Send: `cart-checkoutCart {…, sessionId, addedBy, requestId, notes}`. One transaction: cart snapshot
   onto the order, one line doc per item, cart group cleared.
5. Correction after Send: `approvals-apply {action: 'void'|'discount', lineId, reason, …}`. The `requires`
   interceptor in `api/client.ts` handles the PIN. No new popup.
6. Bill: `billing-preview` on `draftId` = that sessionId. Unchanged.

## Decisions

| Date | Decision | Why |
|---|---|---|
| 2026-09-17 | **Move and merge are FL's, not OR's.** OR-4's `table-moveTable` keeps its name and is built by `SPEC_FL_floor_and_moves.md`; OR's move and merge review rows are a reference to FL's scenarios, not a second design | The go-live plan ruled it: "FL owns move and merge; OR drops them — two sheets owning one endpoint is how we get two implementations." OR-5a (un-merge releases every child) stands; FL's R14 refuses the unmerge while the group owes money, which removes TD-030's expensive case |
| 2026-09-17 | **The till reuses the guest order path; OR is one new endpoint and a screen** | Every alternative is a second way to write money into the same documents. `createOrUpdateOrder` already handles multi-round grouping, offers, charges, line snapshots and the waiter gate; forking it for staff would double the surface BL and DC read from |
| 2026-09-17 | No `domain/ordering.ts`, no `app/ordering.ts`, no four-layer module. Same call OF made | The decisions are "does this table have a live session" and "is this id a counter ticket". A domain file would hold two comparisons. The backend delta is one endpoint in `table/`, extended in that dir's own style with a characterization test first |
| 2026-09-17 | The till is a diner with `addedBy: 'staff:<serverId>'`, not a privileged writer | Cart ownership shipped 2026-09-16 and already gives exactly the behaviour OR-S4 needs. Using it costs one string; not using it means the till's Send deletes guests' carts |
| 2026-09-17 | Takeaway is a table, named in config, not a new order kind | A `kind: 'takeaway'` field would branch checkout, billing, day close and reports. A counter ticket branches nothing, and `vacateTable` already recycles it |
| 2026-09-17 | Quantity reduction on a **sent** line is void-and-re-punch in v1 | `applyToLine` voids a whole line. Partial void means a new domain operation, a new audit shape and a new PIN rule; ST already logged this as scope, not as a bug |
| 2026-09-17 | Offline order entry is refused, not queued | OF's scope decision (2026-09-16) was explicit: no replay queue. A cart is priced by the server; a queued round would price at whatever the menu says when it flushes |
| 2026-09-17 | The menu **is** cached now, reversing OF's read-cache line | OF declined to cache the menu because "the till has neither screen today". OR builds that screen, so the reason expired. R7 in the OF sheet should gain a line pointing here |
| 2026-09-17 | Merge is not rebuilt. `table-setMerge`, `resolveTableId` and `unmergeChildren` already exist and work | Found by reading, not assumed. What is genuinely open is mid-meal un-merge and merging an occupied table — both in Review |
| 2026-09-17 | OR-S7 (out-of-stock add-on) is tagged **No** and files nothing new | TD-015 is already open with a measured example. A second row for the same bug is noise |
| 2026-09-17 | The till's rounds bypass the waiter-confirmation gate by construction, with no flag read | The gate exists so a waiter approves a *guest's* round. The cashier is the waiter. A till round born `AWAITING_CONFIRMATION` would wait for the person who typed it |
| 2026-09-17 | **A cashier opens a table with no OTP: `table-openTable`, staff-gated** (OR-1) | A walk-in has no phone, and the only thing that mints a table session today is `validateOTP`. One new endpoint in `table/`'s own style, ~40 lines; no existing file changes shape. The exposure it adds — a table open with no guest verified, writable by anyone who reads the QR sticker — already exists for every OTP'd table. `openedBy` is the record, and a drive-by item is caught at the bill because nobody ordered it |
| 2026-09-17 | **No covers count in v1** (OR-2) | Declined against the recommendation. The cost is accepted and permanent: per-head average is unrecoverable for those nights. TD-031. `openedBy` is still written — it is the audit record OR-1 rests on |
| 2026-09-17 | **Takeaway and phone orders are counter tickets**, ordinary table docs named in `ordering.takeawayTableIds` (OR-3) | Zero schema change, zero branch. Cost, accepted: a takeaway is not separately reportable until a `kind` field exists, and concurrency is bounded by how many tickets are seeded |
| 2026-09-17 | **`table-moveTable` is built**, as a phase that can still be cut (OR-4) | Moving tables is ordinary on a Friday, and the alternative — void and re-punch — loses every offer on the table and fills the void report, which is the one report ST exists to produce, with moves that are not theft |
| 2026-09-17 | **Un-merge stays all-or-nothing** (OR-5a) | Declined against the recommendation. Releasing one child releases every child; the cashier re-merges the rest. Cost, accepted: between the two taps a table reads `vacant` with people sitting at it, so a walk-in can be seated on a live party. TD-030 |
| 2026-09-17 | **Merging two occupied tables is refused**, said plainly on screen, with Move offered instead (OR-5b) | Merging two live sittings means merging two sessions, two carts and two orders into one bill — the reverse of BL-S12's split, with its own audit shape and a rule about which offers survive. A module of its own. Two live parties joining is uncommon and the failure mode is "two bills", not "wrong money" |
| 2026-09-17 | **Opening an occupied table extends the live sitting and never mints a new one**; `ordering.sessionHours` replaces the literal (OR-6) | Otherwise a 23:05 coffee on a table opened at 19:00 silently lands on a second bill. This also changes guest session lifetime, because `validateTableSession` is shared — a guest at a long dinner stops being logged out mid-meal. That reach is why it is in `STATE.md` too |

## Out of scope, written down

- **Partial void of a sent line** (OR-S10 is the manual workaround). Needs a new domain operation and a
  new audit shape.
- **Splitting a table's party across two sessions** — two independent bills on one table is BL-S12's
  draft split, by lines, not by session.
- **Course firing / hold-and-fire** ("send the starters, hold the mains"). Real in a full-service
  restaurant; it is a kitchen-routing feature and belongs to KT.
- **Seat numbers.** `addedBy` on each cart item says which phone added it (kept on the order's `carts[].items`, which no report reads yet); seat-level entry at
  the till is a second identity model for one report nobody has asked for.
- **A customer record on a phone order.** The name and number go in the order note in v1. A real
  customer link is a schema change and belongs to a CRM sheet.
- **Delivery and aggregator orders.** Named in the build map as a separate concern.
- **Editing the counter ticket list from a screen** — owner edits the config doc, same as ST's reasons.
- **Printing the KOT.** KT owns every byte that reaches a printer; the till prints nothing today.
- **Releasing one merged table without releasing the rest** (OR-5a, signed 2026-09-17). Un-merge is
  all-or-nothing; automatic un-merge happens only on vacate, which is correct and already built. TD-030.

## Open questions (owner: Shaurya)

**None open.** All eight were answered 2026-09-17 and are rows in Decisions above. The three the
contract reserved to him — the session field addition, the move endpoint's document set, and the
counter-ticket shape — were each put to him and each signed.

## Phase plan (each phase is one commit)

0. **This sheet**, plus `/custom-fanout-consult` on the draft and the critical-pieces doc, merged into
   Decisions. No code.
1. **Skeleton.** One `it()` per OR-S id with a hand-computed expected value, body `todo`, across
   `test/unit/table/openTable.characterization.test.js`, `test/e2e/suites/ordering.js` and
   `frontend/till/e2e/ordering.spec.ts`. Then blind lists from an Opus subagent and the fan-out; one
   Decisions line per rejected case. Donor review launched at "how does a POS open a walk-in ticket,
   and what does it do when a table moves".
2. **`table-openTable`.** Characterization test pinned on `createOrGetTableSession` and
   `validateTableSession` *first*, proven red. Then the endpoint in `table/table.js`'s own style:
   staff gate, merged-parent refusal, active-table extend (OR-S19, OR-S22), `openedBy`,
   `ordering.sessionHours` replacing the literal. Unit tests for the extend-not-mint rule.
   Scenario ids OR-S1, S19, S22.
3. **Counter tickets and the round.** `ordering.takeawayTableIds` through `app/config.ts` onto the
   `approvals-config` answer; e2e `suites/ordering.js` drives open → add → Send → preview on a real
   table and on a counter ticket, and asserts a till round and a guest round land on **one** order and
   **one** draft (OR-S2, S3, S4, S5, S6, S8, S18). Proven red by blinding `addedBy` on the till's
   checkout.
4. **`table-moveTable`.** One transaction over session, cart doc, order and unbilled lines, with the ST
   audit row written the way `voidCartLines` already writes one from flat-dir code. Refuses a billed
   line. Unit tests with hand-built docs, e2e OR-S15. **Signed yes 2026-09-17 (OR-4)**, and kept standalone so it can still be cut if the
   first release needs to be smaller.
5. **The screens.** `frontend/till/src/features/ordering/`: table map, menu grid, cart pane, Send,
   per-line Void and Discount reusing `useApproval`. `?r=&table=<id>` routes to it, matching the
   existing `?draft=` / `?bill=` / `?day=` scheme. Merge and un-merge buttons on the table map.
   Playwright `e2e/ordering.spec.ts` for OR-S5, S6, S8, S9, S11, S12, S17.
6. **Done.** Donor review merged, `DEBT(...)` rows filed, `STATE.md` updated, `make check` green, full
   e2e green against the known pre-existing set, browser sanity pasted.

## Review — answered 2026-09-17

All eight calls were put to Shaurya and decided in one sitting. They are now rows in **Decisions**
above; the questions as they were asked are preserved in `DECISIONS_WAITING_2026-09-17.md`, and the
full record with costs is `DECISIONS_2026-09-17.md`.

Two went **against** this sheet's recommendation and are not to be re-opened on the grounds that the
sheet advised otherwise:

- **OR-2, no covers count.** Accepted permanent loss of per-head average. TD-031.
- **OR-5a, un-merge stays all-or-nothing.** Accepted foot-gun: a table reads vacant with people at
  it for the length of two cashier taps. TD-030.

Two things were recorded rather than asked, and stand:

- **Order entry is refused with no connection** (OR-7). The cached menu is read-only so a price can
  still be quoted. Wanting order entry to work offline is a real product position and a different
  module, not a flag.
- **No staff surface has ever placed an order.** The captain app has eleven endpoints and no
  `cart-*` write except `updateCartStatus` and `removeItemFromCart`. So every "the captain app
  already does this" assumption in the handoffs is wrong, `suites/ordering.js` will be the first
  test that places a round as staff, and once the till can punch, the captain app is the odd one
  out — a waiter at table 12 still walks to the counter. Whether it ever gets this screen is a
  product call for after go-live.

**Still owed before phase 2:** the donor review and the fan-out. Neither has run.

## Files

Donors for this concern: `DONORS.md` → *Order lifecycle, lines, totals* and → *Void*. Read after
building, per the contract.

```
backend/src-plattr/functions/          # flat dirs, their own style, characterization test first
  table/table.js                       openTable (new onCall), setMerge gains childTableIds on release
  table/moveTable.js                   move a sitting to another table, one transaction (phase 4, optional)
  session/sessionService.js            expiry from ordering.sessionHours; extend, do not mint (R3)
  app/config.ts                        ordering.* onto the existing approvals-config answer
frontend/till/src/
  features/ordering/TableMap.tsx       tables, counter tickets, merge / un-merge, move
  features/ordering/OrderScreen.tsx    menu grid, cart pane, Send, per-line Void and Discount
  features/ordering/useOrder.ts        open, add, remove, send; one requestId per Send tap
  features/ordering/menuCache.ts       the cached menu and its age (OR-S17)
tests: test/unit/table/openTable.test.js · test/unit/table/moveTable.test.js ·
       test/e2e/suites/ordering.js · frontend/till/e2e/ordering.spec.ts
```

**No new dependency.** Nothing here needs one.

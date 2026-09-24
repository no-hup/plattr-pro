# AG · Aggregator orders

Status: **draft v1** (2026-09-22). Review rows unsigned.

**Job.** A Swiggy or Zomato order reaches the kitchen exactly once with its notes, is accepted before the platform gives up, counts in the day's sales by channel and as a receivable, and can never be billed or settled at the till.

The pipe is UrbanPiper. We do not call Swiggy or Zomato. No LLM call sits on this path. Menu push uses our ids. Bootstrapping our menu from a restaurant's existing Swiggy listing is the IM module's job, the same normaliser, not this one.

## Who can do what

Roles are the existing ones in `adminApp/auth.js`: ADMIN, MANAGER, SERVER, KITCHEN. The till is logged in as a MANAGER or ADMIN. The captain app is a SERVER.

| Action | Captain (SERVER) | Cashier (MANAGER) | Owner (ADMIN) | Kitchen |
|---|---|---|---|---|
| Accept a ringing order | – | ✓ | ✓ | – |
| Reject with a reason | – | ✓ | ✓ | – |
| Answer a customer's cancel request | – | ✓ | ✓ | – |
| Mark food ready | – | – | – | ✓ (the READY tap they already have) |
| 86 a dish | unchanged | unchanged | unchanged | unchanged |
| Push the menu | – | – | ✓ | – |
| Turn the store on or off | – | – | ✓ | – |
| Change markup, auto-accept, prep time | – | – | ✓ (config doc) | – |
| Bill this order, or take a tender for it | impossible | impossible | impossible | impossible |

86 is not a new action. `menu-updateMenuItemAvailability` keeps whatever check it has today. AG adds a push onto the end of that call.

## Scenarios

Money in rupees for reading; every stored amount is paise. Hours are the restaurant's, Bangalore. The dine-in card price of Chicken Biryani is ₹450. A platform order never changes that price.

| ID | Scene and what happens | Tag |
|---|---|---|
| AG-S1 | **Friday ticket.** 20:12. Swiggy order 88421, one Chicken Biryani ₹450, note "no onion, less spicy". `aggregator.autoAccept` is on. One transaction writes order `swiggy_88421`, one line, one receivable, one cart in `PREPARING`, and one KT job. The kitchen screen reads `Swiggy 88421` and the note. After the commit we PUT Acknowledged, then answer 200 with `order_ref_id` `swiggy_88421`. A failed PUT does not change that 200. **Without this the biryani is cooked off a tablet the pass cannot hear.** | Engine |
| AG-S2 | **The double biryani.** 20:14. The transaction committed, the job exists, and the function passed UrbanPiper's 5 second read. They retry the same relay. The transaction sees the order and the job and writes nothing. One order, one job, 200, the same `order_ref_id`. **Without this the kitchen cooks two and the rider takes one.** | Engine |
| AG-S3 | **The job never landed.** 20:16. The order doc is already there and the print job is not (the retry after a commit that died before the job write). The transaction creates the job only. It does not add a line, a receivable, or a second cart. **Without this the retry that should save a lost ticket cooks a second biryani.** | Engine |
| AG-S4 | **Two deliveries at once.** 20:18. Two invocations of the same relay run together. Both use doc id `swiggy_88421`. One creates. The other finds the doc. One order, one receivable, one job. **Without this a query-then-create race prints two tickets. Firestore's only uniqueness is the doc id.** | Engine |
| AG-S5 | **A forged relay.** 20:20. A POST with no token, or the wrong token. 400. No Firestore read, no write, nothing from the body in a log. **Without this the URL is a button that prints a biryani.** | Engine |
| AG-S6 | **No raw body.** The emulator, or a proxy, hands a parsed `req.body` and no `req.rawBody`. 400. We do not re-serialise the parsed body and pretend it is the order. **Without this we would ack an order we cannot store byte for byte.** | Engine |
| AG-S7 | **The cashier is on a card.** 20:22. `aggregator.autoAccept` is off. Zomato 55219, Paneer Tikka ₹320. The order is stored, no Acknowledged PUT, the till strip rings. At 20:23 the cashier taps Accept. We PUT Acknowledged with `extra.prep_time_mins` = `aggregator.prepTimeMins` (20). A SERVER calling accept gets 403. **Without this three orders die while table 4 pays by card, and nobody hears them.** | Engine |
| AG-S8 | **Reject without the item.** 20:27. Prawn Ghee Roast ₹420 is off. The cashier rejects Zomato 55220 "out of stock" and names no item. The server refuses; the order keeps ringing. They pick that line. The PUT carries the item ref id. **Without this the rejection counts against the outlet and the dish stays buyable.** | Engine |
| AG-S9 | **The stock push that failed on one platform.** 20:12. Prawns toggled off. The Zomato callback says success. Swiggy returns 500. We try `aggregator.stockPushAttempts` (3) times, then stop. The till reads `Prawn Ghee Roast still ON on Swiggy`. A later success callback clears that line. A menu push does not turn the dish back on. **Without this Monday's mail says the POS turned it off, and it was never off.** | Engine |
| AG-S10 | **4pm webhook, 8pm slot.** 16:02. Swiggy, Hyderabadi Biryani ₹480, slot 20:00. We store it and acknowledge now, so the platform does not give up. The KT job carries `releaseAt` 19:40 (`slot − aggregator.scheduledLeadMins`). Nothing prints at 16:02. The bridge's pull at 19:40 prints it. No scheduled function. **Without this the kitchen fires it between services and it is dead when the rider is assigned.** | Engine |
| AG-S11 | **Cancel after the bag is packed.** 21:40. Food Ready already went out. The customer cancels. Inbound cancel sets `platformState CANCELLED`, `orderStatus CANCELLED`, the cart `CANCELLED`, voids every line, and queues one KT `cancel` job. The receivable goes `state: 'cancelled'`. Its amounts do not change. No bill exists. The kitchen query drops the ticket. **Without this the next rider is handed a bag for an order that died.** | Engine |
| AG-S12 | **The breaker reopens into a burst.** 20:05. UrbanPiper held webhooks for a minute after 15 failures, then pushed four orders at once. One of them arrives with `order_state` already Acknowledged. Four orders, four jobs. We do not PUT Acknowledged again for the one they already moved. **Without this the burst prints duplicates, or we ack an order the platform has already left behind.** | Engine |
| AG-S13 | **The payout is lower than the menu.** Sunday. Friday's Swiggy 88421 stored menu gross ₹450, restaurant-funded discount ₹90, platform-funded discount ₹50, packaging ₹10, commission omitted (the webhook left it out — not ₹0), and `netReceivable` ₹310 because that is the payout figure they sent (`netSource: 'webhook'`). We did not "correct" ₹310 to a sum of the parts. Day close shows ₹450 and ₹310 on the Swiggy slice. A ₹216 cash tender on table 4 is the whole drawer. The ₹310 is not in it. **Without this the owner subtracts the bank credit from a menu-price total and decides the POS inflated the night.** | Report |
| AG-S14 | **The CA asks for the 9(5) figure.** Month end. They want Swiggy's taxable value for GSTR-1 table 14(b). The day-close slice has, per platform, the stored parts for each business date. There is no export file. Nothing adds 5% to make the channel look like dine-in gross. **Without this they type the partner panel's customer total, which includes the GST the platform charged, and either pay 5% again or mismatch what Swiggy files.** | Report |
| AG-S15 | **It cannot become invoice 1042.** 22:10. The cashier tries to bill Swiggy 88421. The order has no `draftId`, no `tableId`, no `sessionId`, and neither does the line. Billing loads lines by `draftId`, so this order is not a caller. A test that passes the line into `domain/billing.preview` anyway gets `failed-precondition`. The invoice counter does not move. **Without this the next number in the series is a Swiggy docket, and the series has a hole the CA cannot explain.** | Engine |
| AG-S16 | **It cannot be a tender.** 22:10, same order. The cashier taps cash. There is no bill, so `canTake` refuses. No payment row. **Without this the drawer absorbs a sale the platform will also pay, and the night's count is wrong by ₹450.** | Engine |
| AG-S17 | **One Swiggy order does not wedge the day.** 23:20. Table 7 still has an unbilled dine-in Chicken Biryani ₹450 (`settlement: 'till'`, no `billId`). Swiggy 88421 has no bill either, and never will. Close refuses because of table 7, and the message names table 7, not Swiggy. Void the dine-in line, close again: it closes. The Swiggy receivable sits on the channel slice, not in the tender total. Floor-not-clear does not list it. **Without this the first delivery order of the day keeps the outlet from closing, forever.** | Engine |
| AG-S18 | **The captain never sees it.** 20:30. `getActiveOrdersForRestaurant` is queried with `settlement == 'till'`. The waiter's list has table 7 and not 88421. No push goes out: `orderTriggers.js` already returns when `tableId` is missing. The till's strip is the only ring, polled. **Without this every server sees a delivery order, and someone taps Bill.** | Engine |
| AG-S19 | **Ready is the tap they already have.** 20:36. The cook marks the cart READY, the same control as a dine-in ticket. After that write commits, and only because `settlement === 'platform_receivable'`, we PUT Food Ready once. A second READY does not PUT again. The Flutter kitchen app is unchanged. The label on the screen is `Swiggy 88421` because the kitchen read put `ticketLabel` into `tableId`. **Without this someone builds a second kitchen button, and the real one never tells the platform the bag is up.** | Engine |
| AG-S20 | **Couple meal, nothing of ours.** 20:44. Zomato "Couple Meal" ₹649, options Biryani, Starter, two Cokes. None of those ids are on our menu. The ticket prints all four names. The line is not dropped. The till shows the order as unmapped. We still acknowledge. **Without this the ticket looks finished and the drinks are missing at the door.** | Engine |
| AG-S21 | **A status ping is not a new order.** 21:05. The Food Ready webhook arrives twice, and the second body carries a different total. `commercial` is still Friday's figures. No second print job. The inbox already has that body hash, so the second copy does not rewrite status either. **Without this a status replay rewrites the receivable the CA will read, or prints the biryani again.** | Engine |
| AG-S22 | **Swiggy will not take the cancel.** 20:50. `can_reject_order` is false. Our Cancelled PUT returns 400 "Callback requested instead". The order stays `IN_PROGRESS`. The till says Swiggy wants a phone call. We do not mark it cancelled. **Without this the kitchen stops cooking an order Swiggy still considers live.** | Engine |
| AG-S23 | **The customer wants it cancelled.** 13:40. Zomato `customer_cancelled` on a Mutton Biryani ₹520 already on the pass, `timeout_secs` 180. The strip shows 13:43, taken from that field, not from a config default. The cashier confirms at 13:41: AG-S11's cancel path runs, and we PUT Cancelled. If nobody taps, we do not guess. The next status webhook is the truth. **Without this the three minutes expire and the bag still goes out, or we cancel a bag the customer was talked out of.** | Engine |
| AG-S24 | **A menu push is not a store toggle.** 18:00, private lunch, store already off. The owner pushes the menu with `aggregator.markupPercent` 10. Dine-in Chicken Biryani ₹450 goes out as ₹495. The dine-in card stays ₹450. An item with 5 variant groups is named on the till and left out of the body, not truncated. The store stays off. **Without this a save at 18:00 puts the outlet back on the app during a function, and Swiggy rejects a fifth variant group after the guests have already ordered.** | Config |
| AG-S25 | **Authenticated garbage.** 20:11. The token matches. The body is not an order. 200, raw bytes stored, no order, no job, the strip shows unreadable. This is not AG-S5: a bad token is 400. **Without this a bad payload 500s, they retry, and fifteen of them open the circuit breaker on the whole outlet.** | Engine |
| AG-S26 | **A cold start misses their 5 seconds.** 19:40, first order after a quiet afternoon. The commit takes longer than the read timeout. They retry. That retry is AG-S2 or AG-S3. We do not buy a warm instance. **Without this a Friday deploy window becomes a reason to keep a function warm all week.** | Engine |
| AG-S27 | **Dispatched is theirs.** 20:55. A rider-status webhook, then Dispatched, then Completed. The strip shows the rider's name and phone. At Dispatched, `orderStatus` becomes `COMPLETED` and the cart stays `READY`, so the kitchen query drops the ticket. We do not PUT Dispatched or Completed ourselves. `commercial` is untouched. No invoice. **Without this the ticket sits on the pass until someone marks it served, and served means "run this to a table".** | Engine |

**Without this:** delivery is either a tablet the kitchen cannot see, or a fake table that becomes a GST invoice and a tender. Both are how the first month ends.

## Rules

- R1 **Settlement is the lock, not the channel.** Every order and every line is written `settlement: 'till' | 'platform_receivable'` at placement and that field is never updated. Dine-in writes `till`. A delivery webhook writes `platform_receivable`. `channel: 'dinein' | 'swiggy' | 'zomato'` is a label for the ticket and the report. A guard written on `channel` makes a later till sale on a non-dine-in channel a rewrite of every check.
- R2 **A platform line cannot be named by billing.** It omits `draftId`, `tableId`, `sessionId` and `taxBlockId`. Omit, never null. `app/billing` loads lines by `draftId` (`app/billing.ts` `linesOfDraft`). `domain/billing.preview` throws `failed-precondition` if any line has `settlement !== 'till'`, and that throw sits before the tax-block check. The invoice counter is only reached from issue-by-draft. There is no `orderId` argument.
- R3 **A tender needs a bill, and these orders never have one.** `domain/payments.canTake` already refuses a missing bill. AG does not mint a bill, a payment, or a tender. Day close's drawer sums tender rows only. A platform order adds nothing to that sum.
- R4 **Unbilled means a till line with no bill.** The only such query is `unbilledTillLines`: `settlement == 'till' AND billId == null`. `adapters/firestore/dayClose.ts` (today `billId == null` at line 43) and `adapters/firestore/floor.ts` (today line 130) both call it. Day close still adds the `placedAt` window it already has. `domain/dayClose.ts` around line 180 keeps refusing the close when that query returns a row. A platform line is not a row in it, so it cannot wedge the day.
- R5 **The webhook fails closed, before any read.** It is an `onRequest`, not an `onCall`. No Firebase auth, no CORS, HTTP status rather than `ErrorHandler`'s callable envelope. The static token is compared in constant time, before a parse we trust and before a Firestore read. No `req.rawBody`, or a bad token, is 400, and the body is not echoed into a log. The token, the UrbanPiper username and the UrbanPiper key live in Secret Manager. The config doc does not.
- R6 **200 only after a durable outcome.** 2xx is returned after the transaction commits, never before. 5xx only when the transaction failed and a retry would help. A duplicate, a body we cannot parse, an unknown event type, an unknown channel: 200, and no second order. A parsed body we cannot use is stored as raw bytes. We do not invent an `order_ref_id` for it.
- R7 **The doc id is the only uniqueness.** Order and receivable are both `{platform}_{platformOrderId}`. Inside one transaction: the order exists and its print job exists → write nothing, return 200; the order exists and the job does not → create the job only; the order does not exist → create the order, the lines, the receivable and the job. A query-then-create is a race and is not this path. `createOrUpdateOrder` is not this path either: it throws on a null `tableId` (`orders/createOrUpdateOrder.js:44`) and keys carts by table.
- R8 **Money is written once, in paise, and a missing figure stays missing.** `orders/{id}.commercial` and `restaurants/{r}/receivables/{platform}_{id}` are written in the placement transaction with the same amounts: `menuGross`, `restaurantDiscount`, `platformDiscount`, `packaging`, `netReceivable`, `netSource`, `asReceived`, `currency: 'INR'`. An amount the webhook does not send is omitted, including commission. `0` would mean zero. `netReceivable` is set only when they send a payout figure, and then `netSource` is `'webhook'`. There is no `'computed'` value until the Review row on the formula is signed. `asReceived` keeps the raw numbers. Status webhooks do not write `commercial`. The apply function's allowlist is `platformState`, `orderStatus`, cart status, rider name, rider phone, rider status, `receivables.state`, and the inbox hash. The same raw-body hash twice does not append again and does not rewrite status.
- R9 **One map, in `domain/aggregator.ts`, and nowhere else.** `platformState` is `PLACED | ACKNOWLEDGED | FOOD_READY | DISPATCHED | COMPLETED | CANCELLED`. PLACED and ACKNOWLEDGED map to `orderStatus IN_PROGRESS` and cart `PREPARING`. FOOD_READY maps to cart `READY` and leaves the order `IN_PROGRESS`. DISPATCHED and COMPLETED map to `orderStatus COMPLETED` and leave the cart `READY`. CANCELLED maps to both cancelled. An unknown platform state throws. No new cart status is added. `AWAITING_CONFIRMATION` is never written: there is no captain to release it, and the kitchen hides that status. `SERVED` is never written: the captain app treats it as "run this to the table".
- R10 **Food Ready is the cook's existing READY.** After `cart/updateCartStatus.js` commits a transition to READY, and only when that order's `settlement === 'platform_receivable'`, AG calls `foodReady`. The predicate is settlement, not channel. A repeat is a no-op and does not PUT again. The PUT is outside the cart transaction. `updateCartStatus` to SERVED, and `orders/updateOrderStatus.js` for any target, throw `failed-precondition` on a `platform_receivable` order. Cancel of these orders goes through AG, not through `updateOrderStatus`, because that function's CANCELLED branch does not void lines.
- R11 **A cancel after the ticket is a cancel ticket.** Inbound cancel voids every line of the order through the same line-void write dine-in uses, including a line with no `menuItemId`. It does not call `voidCartLines` as written: that function skips items with no `menuItemId` (`orders/lineSnapshots.js:158`). It queues a KT job of `kind: 'cancel'` at `aggregator.packStation`. The receivable's `state` becomes `'cancelled'` and `cancelledAt` is set. Amount fields are not edited and the doc is not deleted.
- R12 **The kitchen app is not modified, so the order is written in the shape it already reads.** The kitchen query filters on `orderStatus` only, so a delivery order appears. The Flutter app reads the label from `order['tableId']` (`kitchen_repository.dart:170`), the item name from `item.menuItem.meta.name` (`:239`), modifiers from `selectedVariantsDetails` / `selectedAddonsDetails` (`:257`), and the note from `cart.notes` (`:191`). Item notes are hardcoded to null (`:268`). Placement therefore writes one cart, `status PREPARING`, each item nested as that app expects, options in those two arrays, and every `platformNote` joined into `cart.notes`. The stored order omits `tableId`. `orders/getActiveCartsForKitchen.js` `sanitizeOrderData` copies `ticketLabel` into the response field `tableId`. Dine-in `ticketLabel` is the table id. Delivery `ticketLabel` is `Swiggy 88421`, the channel label plus the platform order id. A missing `ticketLabel` is a bug in the writer; the read logs it and uses the order id rather than a blank, so two orders cannot merge into one empty group.
- R13 **A future slot is accepted now and printed later.** If the payload carries a slot in the future, the KT job is written with `releaseAt = slot − aggregator.scheduledLeadMins`. The bridge's pending read does not claim a job whose `releaseAt` is still ahead. An order with no slot has no `releaseAt` and prints on the next pull. The Acknowledged PUT is not delayed. There is no scheduled function.
- R14 **Stock and menu are a push plus the callback, not a hope.** `menu/menu.js` `updateMenuItemAvailability` calls `app.pushStock` after its own write. The push tries `aggregator.stockPushAttempts` times, at most `aggregator.stockIdsPerCall` ids in one call. We do not send `turn_on_at`, so an item we disable stays off until we enable it. The item and option callbacks are the read-back. Where the last callback disagrees with our availability, or a platform's callback says failed, the till strip shows that item and that platform. A menu push never sends the store's open flag. Store on and off is its own call.
- R15 **Reject carries their item, or it does not go.** Reason `out of stock` with no item ref ids is `failed-precondition` and the order stays as it was. A reason the adapter has no UrbanPiper code for is the same refusal. The code table lives in the UrbanPiper adapter and is filled from their Postman collection; it is not guessed here. When Swiggy answers 400 "Callback requested instead" (`can_reject_order` false), the order stays in progress and the till says to phone them.
- R16 **A customer-cancel clock is the one they sent.** Zomato's `customer_cancelled` carries `timeout_secs`. The strip shows that instant. We do not substitute a config number. The sample value 180 is not a default. Silence does not accept the cancel and does not reject it.
- R17 **The paper is a docket, not a tax invoice.** The cook job is KT `kind: 'kot'`. The cancel job is `kind: 'cancel'`. The header is the ticket label and the line `ORDER DOCKET — NOT A TAX INVOICE`. No GSTIN, no invoice number, no series. AG never enqueues `kind: 'bill'`. Prices are not required on the docket; the line names, quantities, options and notes are.
- R18 **Day close grows a third slice, outside the drawer.** Receivables are read by `businessDate`, grouped by platform. `state == 'open'` contributes its stored parts to `byChannel`. `cancelled` is listed and not added. `businessDate` is `payments.businessDateFor`, the same cutoff as the drawer, not a second one. The slice is not added to cash, card, UPI, or any tender total. Floor-not-clear does not read receivables. No report adds 5% GST onto these figures.
- R19 **Every number in the rules above is a key below.** After a vendor 429, the order stores `retryAfter` for `aggregator.vendorLockoutSeconds` and the till poll retries then. Nothing in a function sleeps. The poll reads our backend, every `aggregator.pollSeconds`, and never calls UrbanPiper on its own except to retry a PUT we already decided to send.
- R20 **The domain file is pure.** `domain/aggregator.ts` holds the defaults, the state map, the payload-to-order mapping, the money split, and the menu-to-push-body mapping. No Firebase import, no URL, no vendor field name. The adapter owns hosts, header names, and UrbanPiper's JSON.
- R21 **The captain list is till orders only.** `orders/getActiveOrdersForRestaurant.js` adds `where settlement == 'till'` to the live-order query (the unassigned branch at line 96 is how a delivery order would otherwise land on every server). The order trigger is not edited.
- R22 **Tax on these lines is copied, never computed.** A platform line is `taxLiability: 'platform'`, `taxSource: 'webhook'`, `taxParts` copied off the payload. `placePlatformLine` does not look up a tax block. A dine-in line, in the same re-seed, is `settlement: 'till'`, `taxLiability: 'restaurant'`, and keeps today's `taxSource`. The old "no tax block" refusal applies to a till line only, and it runs after that branch. A bottled drink on a Swiggy order does not pick up the restaurant's 5% block.

## Config keys (on `restaurants/{id}/config/settings`, field `aggregator`, with defaults)

| Key | Default | Used by |
|---|---|---|
| `aggregator.autoAccept` | true | AG-S1, S7, R19 |
| `aggregator.prepTimeMins` | 20 | AG-S7, R19 |
| `aggregator.scheduledLeadMins` | 20 | AG-S10, R13 |
| `aggregator.pollSeconds` | 3 | AG-S7, R19 |
| `aggregator.markupPercent` | 0 | AG-S24, R14 |
| `aggregator.maxVariantGroups` | 4 | AG-S24, R14 |
| `aggregator.swiggyItemCap` | 400 | AG-S24, R14 |
| `aggregator.stockPushAttempts` | 3 | AG-S9, R14 |
| `aggregator.stockIdsPerCall` | 400 | R14 |
| `aggregator.vendorLockoutSeconds` | 60 | R19 |
| `aggregator.packStation` | `kitchen` | AG-S1, R11, R17 |
| `aggregator.rejectReasons` | out of stock, kitchen closed, item unavailable, too busy, other | AG-S8, R15 |
| `aggregator.platforms` | swiggy, zomato | R7, R9 |

`aggregator.rejectReasons` is the list the till shows. The UrbanPiper code for each reason is not a config value and is not in this sheet: see R15.

## Talks to

| Port | What crosses | If the other side is down |
|---|---|---|
| ← UrbanPiper, order relay | raw body, static token | 5xx only if our commit failed; they retry, then the breaker. A retry is AG-S2 |
| ← UrbanPiper, status, rider, callbacks | raw body, same token, same URL | 200 once stored. An orphan status (no order yet) waits on the strip; the relay, if it comes later and the inbox already says cancelled, writes the order cancelled and prints nothing |
| → UrbanPiper, status PUT | Acknowledged, Food Ready, Cancelled | the order is already stored. The strip shows the PUT failed. The poll retries after `retryAfter` |
| → UrbanPiper, stock / menu / store | our ids, markup applied to menu prices, store open flag on the store call only | our menu and our 86 stay as we wrote them. The strip shows the push failed. A failed push does not roll back the 86 |
| → KT | one `kot` job at placement, one `cancel` job on cancel, `releaseAt` when the slot is in the future | the kitchen screen still has the cart. Paper waits in the queue, which is what KT already does when the bridge is unplugged |
| ← cart READY | `orderId` after a committed READY | Food Ready is retried by the poll. The kitchen already shows READY |
| ← menu 86 | item id, enable or disable | availability is already saved. The strip shows which platform did not confirm |
| → DC day close | receivables for the business date | the drawer still closes. The channel slice says unavailable. It never shows ₹0 in place of a failed read |
| → BL billing | nothing. These lines have no `draftId` | billing cannot see them. That is the point |
| → PY payments | nothing | no tender exists to fail |
| ← CF config | the keys above, once per request | defaults apply; the log says so |
| → LG logs | one JSON line per transition with `cid` = the order id, `platformState` from and to, `outcome` | never blocks the write |
| → captain FCM | nothing in v1 | the till poll is the ring |

The three onCalls go through `ErrorHandler`. The webhook does not.

## The relay, end to end

1. UrbanPiper POSTs `aggregator-webhook?r=<restaurantId>`. Header `X-AG-Token`. We compare it, then read `req.rawBody`.
2. The adapter classifies the bytes into relay, status, rider, item callback, option callback, store callback, menu callback, stock-out callback, or unknown. Field names stay in the adapter.
3. Relay, and the order doc is missing: one transaction writes the inbox event (deduped by a hash of the bytes), the order, the lines, the receivable, the cart, and the KT job. `order_ref_id` is the doc id.
4. After the commit, if `aggregator.autoAccept` is on and their `order_state` is still Placed, the adapter PUTs Acknowledged. For Zomato that body includes `extra.prep_time_mins`. The PUT is not inside the transaction. If it fails, `platformState` stays `PLACED` and step 6 retries it.
5. We answer 200 with `{order_ref_id}` only after step 3 has committed. If step 4 has not succeeded, the 200 still goes out: the order is durable, and their retry would otherwise be the only copy.
6. The till polls `aggregator-pending` every `aggregator.pollSeconds`. The poll returns ringing orders (auto-accept off), customer-cancel prompts, stock drift, failed PUTs, and unreadable bodies. It also sends any PUT whose `retryAfter` has passed.
7. The cook taps READY. `updateCartStatus` commits, then `foodReady` PUTs Food Ready.
8. Dispatched, Completed, rider updates, and cancels arrive as later POSTs to the same URL. They go through the allowlist in R8. A cancel also does R11.
9. `aggregator-accept` and `aggregator-reject` are the cashier's taps from step 6. `aggregator-pushMenu` pushes categories, items, options, taxes and charges, with `aggregator.markupPercent` applied to our prices, and registers the webhook if it is not registered. `aggregator-setStore` is the only call that turns the store on or off.

A network call inside a Firestore transaction is how one contention retry becomes two PUTs. None of steps 4, 7 or 9 run inside the placement transaction.

## Decisions

| Date | Decision | Why |
|---|---|---|
| 2026-09-22 | UrbanPiper is the only vendor. No direct Swiggy or Zomato client | Zomato's published gate is 50 outlets or 10,000 orders a month plus a 24×7 on-call. One Bangalore outlet fails it. Swiggy has no self-serve POS API we could find |
| 2026-09-22 | Same `orders` collection, same `lines` collection. The lock is `settlement`, written once | The kitchen and the print queue read one shape. A second collection becomes a second mapper the first time a note is added. A check on `channel` blocks a future till sale that is not dine-in |
| 2026-09-22 | Platform lines omit `draftId`, `tableId`, `sessionId`, `taxBlockId`. Never null | Billing's argument is a `draftId`. Writing null, or `draftId = orderId`, is how `billId == null` and `draftId == null` pull every delivery line into the day. Firestore `== null` matching a missing field is moot because we do not query that way |
| 2026-09-22 | `unbilledTillLines` replaces both `billId == null` queries, plus the composite index `lines: settlement + billId + placedAt` | `dayClose.ts:43` and `floor.ts:130` as written would count a Swiggy line as food still on the floor. `domain/dayClose.ts:180` would then refuse every close |
| 2026-09-22 | Delivery placement does not call `createOrUpdateOrder` | That function throws without a `tableId` (`createOrUpdateOrder.js:44`), keys `carts/{tableId}`, and dedupes on a session. AG has none of those |
| 2026-09-22 | Doc id `{platform}_{platformOrderId}` on the order and the receivable | Firestore uniqueness is the doc id. A lookup doc adds a contention point and constrains nothing more |
| 2026-09-22 | `commercial` is write-once, and the receivable is what day close reads | A person debugging a ticket should not have to join. A status body that resends totals must not move the number the CA reads |
| 2026-09-22 | Missing money is omitted, not coerced to 0. That rule covers commission and every other amount | `0` means the platform charged nothing. Unknown means the webhook did not say. The Sunday-payout argument is impossible to have if those two look the same |
| 2026-09-22 | `netReceivable` only when the webhook sends a payout. No computed net in v1 | The formula (packaging in or out, tax in or out) is not something this repo can settle. A wrong net is AG-S13 with our name on it. `'computed'` waits on the Review row |
| 2026-09-22 | Amounts are integer paise, converted once at the boundary. `asReceived` keeps the raw payload numbers | Lines are already minor units. A second unit inside one order is how a report drifts by 100× |
| 2026-09-22 | `businessDate` comes from `payments.businessDateFor` | A second cutoff splits one midnight order across two days depending on who is asking |
| 2026-09-22 | State map is R9, and it lives in one function | A new cart status renders as cookable in the kitchen app, because unknown words fall through to pending. `COMPLETED` must not be read as "needs a bill" |
| 2026-09-22 | The order document carries one cart in the kitchen app's existing shape | Zero Flutter change is only true if the name, the modifiers and the note are in the fields `kitchen_repository.dart` already reads. Lines alone would show "Unknown Item" and a blank note |
| 2026-09-22 | `ticketLabel` is written at placement for dine-in too (the table id), and the kitchen read copies it into `tableId` | One read path. The stored delivery order has no `tableId`, so a captain query on a table cannot return it by accident |
| 2026-09-22 | Food Ready listens to `settlement === 'platform_receivable'`, not to `channel != dinein` | The file list in the brief said channel. The lock is settlement. A channel check is the rewrite R1 exists to avoid |
| 2026-09-22 | `updateOrderStatus` and a SERVED tap refuse a platform order | `updateOrderStatus` CANCELLED does not void lines. SERVED is a captain word. Cancel and completion of these orders have one writer |
| 2026-09-22 | Inbound cancel does not call `voidCartLines` unchanged | That helper skips an item with no `menuItemId`, which is exactly the unmapped line AG-S20 must still void |
| 2026-09-22 | An unmapped item still prints and is still acknowledged. It is flagged on the till. It is not dropped | The failure mode is a ticket that looks complete with a line missing. Refusing the order leaves the platform to time out, which is worse than cooking the name they sent |
| 2026-09-22 | A platform line's `menuItemId` is our id when we have one, otherwise `ext:` plus their item id | A line with no id cannot be voided, stock-matched, or named in a reject |
| 2026-09-22 | No customer document, and no phone or address copied onto the order | Platform numbers are masked. The raw inbox is enough for a dispute. A customers collection is a privacy decision this module does not get to make |
| 2026-09-22 | No staff push for delivery in v1. The trigger stays as it is | `orderTriggers.js:79` and `:156` return on a missing `tableId`. Editing that to invent a recipient is a new notification product. The till polls |
| 2026-09-22 | `aggregator.autoAccept` defaults to true | The cashier is on a table on a Friday. Silence is how the platform cancels. Manual accept remains a key, for a restaurant that wants the ring |
| 2026-09-22 | We do not invent an accept-window in seconds | UrbanPiper does not publish one for Swiggy or Zomato. Auto-accept on receipt is how we stay inside a window we have not been told |
| 2026-09-22 | Acknowledged is PUT after the commit, and a failed PUT does not stop the 200 | Putting before the commit acknowledges an order we might not store. Returning 5xx after the commit is how AG-S2 happens for a reason we caused. The poll retries the PUT |
| 2026-09-22 | We PUT Acknowledged, Food Ready and Cancelled only. Dispatched and Completed arrive inbound | Those two mean the rider, not the kitchen. Sending them ourselves is the early-ready trick the platforms look for. Self-delivery, where we would send them, is out of scope |
| 2026-09-22 | A scheduled order is acknowledged immediately and the job waits on `releaseAt` | Holding the accept loses the order. Printing at 16:02 for a 20:00 slot is a cold biryani. A scheduled function would be a new Cloud Run service to do a comparison the bridge's pending read already can |
| 2026-09-22 | `aggregator.scheduledLeadMins` default 20, `prepTimeMins` default 20, `pollSeconds` default 3 | 20 minutes is one service's prep, not a published UrbanPiper number. The poll matches the till's existing UPI poll so two strips do not tick differently |
| 2026-09-22 | Customer-cancel silence is not an answer. The deadline is `timeout_secs` from the payload | Their sample 180 is a sample. Answering "no" because the till was busy cancels a bag the customer kept. Answering "yes" because we timed out cooks nothing and still charges the cancellation |
| 2026-09-22 | Swiggy's 400 "Callback requested instead" does not cancel the order locally | Their testing note says to mark it cancelled locally and wait for a phone call. If we do, the kitchen stops and Swiggy still has the order. The till shows the phone call instead |
| 2026-09-22 | `aggregator-setStore` is its own onCall. Menu push does not change store open | Folding the flag into the menu body is how a menu refresh reopens an outlet someone closed for a private lunch |
| 2026-09-22 | Markup is a percent on the GST-inclusive dine-in price, default 0. Pushed price is `round(paise × (100 + markupPercent) / 100)`. The dine-in line is not rewritten | One rule a cashier can check. Default 0 until the owner says the apps charge more. The percent itself is a Review row |
| 2026-09-22 | Swiggy's item cap defaults to 400, the lower of the two numbers in their docs. Over the cap, or over `maxVariantGroups` (4), the item is left out and named | Their docs say 400 and also 1000. Sending the 401st and hoping is how a certification push fails after the menu looked saved. Truncating without a name hides which dish |
| 2026-09-22 | Stock off sends no `turn_on_at` | UrbanPiper keeps a disabled item off until enabled. Zomato's own 2-hour / 4-hour / next-day enum is the direct API, which we are not on |
| 2026-09-22 | Rider webhooks are stored and shown, and do not move `platformState` | Certification wants the rider on screen. "Rider arrived" is not Food Ready. Mapping it would pack the bag early |
| 2026-09-22 | One URL, one token header `X-AG-Token`, restaurant id in `?r=` | They can send a static header and nothing else. No HMAC exists to verify. The query param is how UQ already names the outlet, and business logic still does not switch on a restaurant id |
| 2026-09-22 | Raw events live on `restaurants/{r}/aggregatorInbox/{platform}_{platformOrderId}`, an append-only `events` array, deduped by hash of the bytes | A single raw doc keyed only by order id would let a status overwrite the relay, which is the dispute record. A second collection per event is more machinery than one order's handful of posts |
| 2026-09-22 | Unknown channel: 200, raw stored, no order. Unknown platform state on an order we have: throw, 5xx, so they retry. Unknown event type: 200, stored, ignored | A channel we do not know must not become a till sale or a receivable. A state we do not know must not be stored as a lie. An event we do not know must not trip the breaker |
| 2026-09-22 | No Firestore security-rule lock in v1 | The Admin SDK ignores rules. The till has no Firestore client. The writers that could wipe `commercial` are our own functions, and R8's allowlist plus R10's refusal are the lock |
| 2026-09-22 | No `min-instances` | Same call as UQ. The retry is the recovery. A warm function for one outlet is a cost decision, not a default |
| 2026-09-22 | Base URL is the function env `AGGREGATOR_BASE_URL`, default `https://pos-int.urbanpiper.com` | Staging until certification. It is one vendor for the whole project, not a per-restaurant key. The domain file does not contain it |
| 2026-09-22 | `X-UPR-Biz-Id` is not sent | That header is multi-brand. A second brand from one kitchen is out of scope |
| 2026-09-22 | Dine-in `lineSnapshots.js` writes `settlement: 'till'` in this same change, characterization test first | The safe query is `settlement == 'till'`. A dine-in line missing the field does not match it, and the first real invoice freezes the shape |
| 2026-09-22 | `placeLine` gains `placePlatformLine`. It never computes tax | One function that both computes a block and copies a webhook will eventually do the first for a Swiggy coke |
| 2026-09-22 | The docket reuses KT `kind: 'kot'` and `kind: 'cancel'`. It does not add a printer | KT already named those kinds. A second encoder is a second place a GSTIN can leak onto the paper |
| 2026-09-22 | Pack station defaults to `kitchen` | The intake note says watch a Friday before deciding the packer printer. Until that watch, the food printer is where the bag is |
| 2026-09-22 | Human accept, reject, customer-cancel answer, menu push and store toggle write an audit row in the same transaction as the act. Auto-accept writes a log line only | Auto-accept is not a person. A reject is, and it is the act that shows up in the platform's rejection mail |
| 2026-09-22 | Webhook registration runs inside `pushMenu`, not on every order | Registration is setup. Doing it per order is a second way to fail a Friday ticket |
| 2026-09-22 | No LLM anywhere in receive, accept, ready, stock or menu push | The hot path is ids and a token. The one ambiguous match, their existing listing against our menu, is IM |
| 2026-09-22 | The GSTR-1 14(b) file from the founder's v1 list is not built | The later brief moved it out. We store the parts. Which column is "taxable value" is the Review row. A file that picks the wrong column is the double-tax bug with our letterhead |
| 2026-09-22 | v1 assumes a standalone restaurant, `taxLiability: 'platform'` on every delivery line | Section 9(5) makes the platform the deemed supplier for restaurant service through these apps. A hotel with a declared tariff of ₹7,500 or more is the exception, and it is a Review row, not a silent branch |
| 2026-09-22 | Indexes: `lines` settlement + billId + placedAt; `orders` settlement + orderStatus + createdAt; `receivables` businessDate + platform | The first is R4. The second is the captain query in R21. The third is the day-close slice. The kitchen query does not gain a settlement filter, or delivery would vanish from the pass |
| 2026-09-22 | Tests: domain table for the state map and the money split, with hand-computed paise; a characterization test on dine-in `writeLineSnapshots` before the new field; e2e replays fixtures at our webhook over HTTP on this agent's emulator slot. The UrbanPiper adapter is fake in tests. The happy path with a real signature-shaped raw body is a unit test against a synthetic request. The e2e asserts AG-S6's 400 | The emulator has been known to omit `rawBody`. We do not depend on it for the only green run. No test sleeps, and no test calls the real vendor |
| 2026-09-22 | `MockData7` writes `settlement` on every seeded order and line, and adds one delivery order with lines and a receivable | There is no data to migrate. A seed without the field makes R4 look empty for the wrong reason |

| 2026-09-22 | **Reviewed by the main session after the Grok draft.** One gap found, filed as a Review row below: the retry of a failed Acknowledged PUT rides the till poll, so with auto-accept on and no till open (a 16:02 scheduled order on a closed afternoon), the order is stored and never acknowledged. Everything else in the draft matches the shape review and the founder's four calls | Review is not a verdict. The gap is a design choice, not a defect in the draft: a retry from inside the function after the 200 is not guaranteed to run on Cloud Functions, so the honest options are a till that is open, or a small scheduled retry (the same shape KT's reconciler already needs). Shaurya picks |

## Out of scope

- Payout-versus-bank matching. The stored split is what a later match would read. Doing the match now means inventing a bank file we have not seen.
- Aggregator-only names, photos and combos. Both sides writing the listing is how a festival combo disappears at 18:00. IM may bootstrap once. AG pushes our menu; it does not become the listing editor.
- Recipe-level stock-out. Prawns off implying seven dishes needs recipes we do not trust yet. v1 86s the item the cook named.
- ONDC. It is not the two apps this outlet runs, and a buyer app on ONDC is not automatically a section 9(5) operator.
- Self-delivery. Rider name and phone on a platform rider are display-only. Sending Dispatched ourselves, and pay-at-door, are a different fulfilment.
- A second brand from one kitchen. Two catalogues and two outlet ids. `X-UPR-Biz-Id` stays unsent until that exists.
- Direct Swiggy or Zomato APIs. We will not clear the gate, and a ban lands on the restaurant.
- A fake table or a fake sitting so today's code paths work. That is the invoice bug with a name tag.
- `draftId = orderId` so the unbilled queries "still work". Those queries are replaced, not fed.
- Any invoice number, including a zero-tax invoice or a bill of supply, off the dine-in series. Issued numbers do not come back. A later document for the platform, if a CA ever wants one, gets its own series.
- The GSTR-1 14(b) export. The parts are stored on the receivable and shown on the day-close slice. Which column is the taxable value is a CA question, and a file that guesses it will be filed.
- New cart statuses, and a state-machine library. One map in the domain file is the whole machine. A new status word renders as cookable on the kitchen app.
- Staff push notifications for delivery orders. The order trigger returns when `tableId` is missing, and v1 leaves it there. The till polls.

## Review before sign-off (Shaurya reads this section only)

| Call | Weight | Why it matters |
|---|---|---|
| Auto-accept defaults to on. A manual ring exists, but a Friday with the cashier on a card will time out if this is off | **must decide** | It is how the outlet behaves on the first live service. The platform does not publish the accept window |
| Markup defaults to 0, as a percent on the GST-inclusive dine-in price. 10% on a ₹450 biryani pushes ₹495 and does not change the dine-in card | **must decide** | Wrong direction and every app price is wrong on the day you map the outlet |
| No GSTR-1 file in v1. The day-close slice shows menu gross, both discounts, packaging, commission-where-present, and webhook net, per platform. Nobody here has picked which of those is table 14(b) taxable value | **must decide** | The CA will ask in week four. A guessed column is how they pay 5% twice, or mismatch what Swiggy files |
| `netReceivable` is omitted when the webhook sends no payout figure. Nothing computes one | **must decide** | A computed net is a formula we would be signing. Leaving it blank is honest and looks like a hole on the Sunday report |
| This sheet treats the outlet as a standalone restaurant: every delivery line is `taxLiability: 'platform'`. A hotel with any declared room tariff of ₹7,500 or more is the opposite rule | **must decide** | If the pilot is that hotel, the whole tax story is wrong and there is no branch in the code to flip |
| A customer-cancel with nobody tapping is left unanswered. We do not accept it and we do not refuse it when `timeout_secs` passes | **must decide** | One of those two silences is what Zomato will do for us, and we do not know which. The strip is the only chance to answer |
| The docket prints at `aggregator.packStation`, default `kitchen`, until someone watches a Friday service | **must decide** | If the packer is not standing at the kitchen printer, the ticket prints in the wrong room |
| Whether mapping the outlet actually turns the Swiggy and Zomato tablets off | **must decide** | UrbanPiper's pages do not say. If both stay live, every order is cooked twice. This is a sales-call question, not a code branch |
| A failed Acknowledged PUT is retried only by the till poll. Auto-accept on, no till open (a scheduled order on a closed afternoon, or the till tablet asleep) leaves the order stored but never acknowledged, and the platform cancels it | **must decide** | Options: accept it for v1 and say so; or one scheduled retry every minute for `platformState PLACED` orders older than N seconds, which is the same shape as KT's reconciler and can share its cadence |
| Scheduled tickets wait `scheduledLeadMins` (20) after we have already acknowledged | fine to skip | 20 is a prep time, not a published rule. The job is one field if the number is wrong |
| Swiggy item cap taken as 400, not 1000 | fine to skip | Their docs say both. 400 refuses a menu they might have accepted. 1000 can fail certification. The till names every item left out |
| We never PUT Dispatched or Completed | fine to skip | Platform riders send those. The day certification insists we PUT them, it is one more status on a call that already exists |
| No warm instance for the webhook | fine to skip | A missed 5 second read is a retry, and the retry is idempotent |
| Swiggy's "call us instead" 400 leaves the order live on our side | fine to skip | The alternative stops the kitchen while Swiggy still holds the order |

## Files (donors)

No readable open-source donor exists (Odoo's UrbanPiper module is Enterprise-only). UrbanPiper's docs and Postman collection are the reference.

## Files

```
backend/src-plattr/functions/
  domain/aggregator.ts              pure: defaults, state map, payload → order and lines,
                                    money split, menu → push body. No Firebase, no URL.
  app/aggregator.ts                 receiveOrder, accept, reject, foodReady, cancelled,
                                    pushStock, pushMenu, setStore. Idempotency, audit rows.
  adapters/firestore/aggregator.ts  the only Firestore: order, lines, cart, receivable,
                                    inbox, print-job refs.
  adapters/aggregator/urbanpiper.ts vendor HTTP: status PUT, stock, menu, store, webhooks.
                                    active.ts picks the provider. One file per provider.
  api/aggregator.ts                 onCall: aggregator-accept, aggregator-reject,
                                    aggregator-pending, aggregator-pushMenu,
                                    aggregator-setStore.
                                    onRequest: aggregator-webhook (raw body, static token).
  index.js                          exports.aggregator = { ... } nested group, same shape as
                                    exports.approvals.
  menu/menu.js                      updateMenuItemAvailability calls app.pushStock.
  cart/updateCartStatus.js          after READY commits, if settlement is platform_receivable,
                                    call app.foodReady. SERVED on those orders refuses.
  orders/updateOrderStatus.js       refuses a platform_receivable order.
  domain/line.ts                    settlement, taxLiability, taxSource 'webhook', ticketLabel,
                                    platformNote. placePlatformLine beside placeLine.
  orders/lineSnapshots.js           dine-in writes settlement 'till'. Characterization test first.
                                    PlaceContext today requires tableId, sessionId, draftId
                                    (domain/line.ts:40); the platform entry does not take them.
  adapters/firestore/dayClose.ts    unbilledTillLines. Today billId == null at line 43.
  adapters/firestore/floor.ts       same function. Today billId == null at line 130.
  domain/dayClose.ts                byChannel from receivables, outside tender totals.
                                    The unbilled refusal stays (around line 180) and now sees
                                    only till lines.
  domain/billing.ts                 preview: any line with settlement !== 'till'
                                    → failed-precondition, before the tax-block check.
  orders/getActiveOrdersForRestaurant.js   where settlement == 'till' on the live query.
  orders/getActiveCartsForKitchen.js       sanitizeOrderData emits ticketLabel as tableId.
  adapters/firestore/print.ts       pending read skips a job with releaseAt still ahead.
                                    KT owns the job. AG does not grow a second queue.
                                    The docket header is the kot encoder reading ticketLabel
                                    and settlement. That encoder is not in the tree yet;
                                    KT's sheet already names kind 'kot' and kind 'cancel'.
  firestore.indexes.json            the three composites in the decisions table.
  mock/buildMockData7.js            settlement on every seeded order and line;
                                    one delivery fixture, its lines, its receivable.
frontend/till/src/features/aggregator/
  useAggregator.ts                  poll, accept, reject, customer-cancel answer.
  DeliveryStrip.tsx                 ringing orders, drift line, unreadable body, rider.
test/e2e/suites/aggregator.js       replayed fixtures over real HTTP, own emulator slot.
test/unit/domain/aggregator.test.ts state map and money split, hand-computed paise.
```

No Flutter file changes. No new dependency.

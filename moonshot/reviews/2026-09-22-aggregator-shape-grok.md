# Delivery orders: C (A's collections, not A's rule)

**C.** One `orders` collection and one `lines` collection, because the kitchen and the print queue are the hot path and a third of tickets will be delivery. **Do not ship A as written.** `channel != 'dinein'` is the wrong lock, and nullable `tableId` / `sessionId` is how a Swiggy order becomes invoice 1041.

The lock is `settlement: 'till' | 'platform_receivable'`, set at placement, copied onto every line, never updated. Only `till` may enter `issueSittingInvoice(sessionId)` and only a bill id may enter `createTender`. Swiggy, Zomato, and later ONDC-as-ECO are `platform_receivable`. Your own rider with a card machine at the door is `channel: 'self'`, `settlement: 'till'`, and it **must** be allowed to take an invoice. A check on channel makes that future change a rewrite of every guard.

B is how a lone dev drops a ticket. Billing "cannot see a second collection" is fake safety: the Admin SDK can see every collection, and the first time the printer needs item notes you will copy lines across. Split the commercial document, not the kitchen stream.

Volume is irrelevant at one outlet. Firestore will not care.

---

## 1. What decides it

The invoice allocator must be **unable to name** a platform order. Not unwilling.

`issueSittingInvoice` takes a `sessionId: string` and nothing else. No `orderId` overload. A platform order has no `sessionId` and its lines have no `draftId`, so it is not an argument to that function. `createTender` takes a `billId` produced only by that function. Drawer close sums `tenders` only.

`channel` is a label (`dinein | swiggy | zomato`, later `ondc | self`). It is not a permission. Self-delivery plus pay-at-door is a till sale. Scheduled time, a second brand on the same KDS, and ONDC are fields or enum values, not new collections. ONDC's tax treatment is **not** something to infer from the channel name (<80% — a buyer app on ONDC is not automatically the s.9(5) e-commerce operator). The webhook adapter sets `settlement` and `taxLiability` explicitly. Nothing downstream switches on `'swiggy'`.

B fails the next channel: each one adds a kitchen query, a print mapper, a day-close reader. That is the re-architecture, just delayed.

## 2. Null `tableId` / `sessionId` under a shared `orders` collection

| Reader | What happens | Silent or loud |
|---|---|---|
| Kitchen query `orderStatus in [PENDING, IN_PROGRESS]` | Returns the doc. No table filter, so the query is fine. | Silent **blank table** if the UI looks up `tables[tableId].name`. Cooks see an anonymous ticket. |
| Kitchen client grouping by `tableId` | All nulls collapse into one group. | Silent **merged tickets**. Two Swiggy orders, one chit. |
| Captain query `tableId == X` | Delivery not returned. | Correct, by accident. |
| Captain listener on all orders, grouped in memory by `tableId` | One junk pile under `undefined`. A tap runs the bill flow. | Silent, and it is the path to a tax invoice. |
| Order `onWrite` trigger | Fires. Copy that says "Table {tableId}" sends "Table null" or "Table undefined". Status patches re-notify. | Silent wrong text. Not a throw. |
| Floor, sums `lines` where `draftId == <real session id>` | Platform lines with **no** `draftId` are not in the result. | Safe **only** for this query shape. |
| Floor or anyone, `where('draftId','==', null)` or `where('sessionId','==', null)` | Firestore equality-to-null matches **missing fields too**. Every delivery line comes back as one fake sitting. | Silent, large, wrong money. |
| Floor, client `groupBy(draftId)` | Missing key becomes one bucket. | Silent sum. |
| Day close, "unbilled lines" as `billId == null` or missing `billId` | Same null footgun. Delivery lines have no bill, ever. | Silent: **day never closes**, or their gross is counted as dine-in money still on the floor. This is the worst reader. |
| Print, group key `tableId` | Same merge as the kitchen client. | Silent wrong food. |
| Print, group key `orderId + requestId` | Works. | — |
| Billing by `draftId == sessionId` | Cannot see lines whose `draftId` was never written. | Safe until someone stamps `draftId = orderId` "so the floor works". |
| Reports (not built) | Will copy whichever of the above queries you write first. | — |

`AWAITING_CONFIRMATION` on a delivery cart is also a silent stall: the kitchen query is on **order** status, but a captain UI that hides unconfirmed rounds will hide food that has no captain (<80% that this status means "not fired"; the name says so, the code isn't here).

**Minimal guard that is actually structural**

1. The only caller of the invoice counter is `issueSittingInvoice(sessionId: string)`. Delete any `orderId` entry point. After the load, throw if any order has `settlement !== 'till'` or any line has `settlement !== 'till' || taxLiability !== 'restaurant' || !taxBlockId`. The throw is backup. The type is the lock.
2. Platform lines **omit** `draftId` and `tableId`. Do not write null. Omitting is what makes `draftId == <session>` miss them. Do not "fix" queries by writing null.
3. `createTender({ billId })` loads that bill and writes a tender. No tender against an order id, a receivable id, or a platform order id.
4. Kitchen and print render `ticketLabel` only (`"T12"` or `"Swiggy 88421"`), written at placement. Group print by `orderId` + `requestId`. Captain query adds `where('settlement','==','till')`.
5. Firestore rules are not the lock. Cloud Functions use the Admin SDK and walk through rules. Still add rules if the captain or KDS client can write: bill create requires `sessionId is string` and `settlement == 'till'`; order updates may only change `carts`, `orderStatus`, `platformState`, `updatedAt` (`diff().affectedKeys()` — ~85% on that rules API, verify against current rules reference before depending on it).

A billing `if (channel === 'dinein')` is a comment someone deletes. It is not the guard.

## 3. Lines

Same `lines` collection. The print queue is unbuilt; build it once against one line shape. A second line collection means a second mapper the first time a note field is added.

They stop meaning "billable snapshot". They mean "what was sent to the kitchen". Billable is `settlement == 'till'`.

Platform line, placement transaction, same as today otherwise:

- `settlement: 'platform_receivable'`
- `taxLiability: 'platform'`
- `channel: 'swiggy' | 'zomato'`
- `taxSource: 'webhook'`
- `taxParts` copied from the webhook, unmodified
- **no** `taxBlockId`, **no** `draftId`, **no** `tableId`
- `platformNote` (the item note that must hit the chit)
- `orderId`, `sent`, `categoryId`, `requestId` as now

Dine-in lines, in this same re-seed, get `settlement: 'till'`, `taxLiability: 'restaurant'`, `taxSource: 'config'`. The old rule becomes: refuse a **till** line with no `taxBlockId`. Do not run that rule before the branch.

The query that is forbidden to exist: "all lines with no bill". Day close and floor call one function, `unbilledTillLines`, which is `settlement == 'till'` and a real `draftId`. `billId == null` is banned as a filter: it also matches lines that have no `billId` field. There is no sentinel `billId`. A sentinel gets joined, summed, or printed as a bill.

Invoice tax math never reads `taxSource == 'webhook'`. Storing those parts is so a later GSTR report does not recompute them. Do not add them to output tax. Which GSTR-1 table a s.9(5) supply belongs in is **<80%**; don't build that report.

## 4. Money

**Both, written in the same transaction. Day close reads only the receivable.** The order copy is so a person debugging a ticket does not join.

`orders/{id}.commercial`, write-once, present only when `settlement == 'platform_receivable'`:

- `menuGross`, `restaurantDiscount`, `platformDiscount`, `packaging` — required, as the webhook sent them
- `commission` — **omit if absent**. Absent means unknown. `0` means zero. Do not coerce.
- `netReceivable` — from the webhook payout figure if it sends one (`netSource: 'webhook'`). If it doesn't, one function computes it and sets `netSource: 'computed'`. The formula is **<80%**: packaging-in-gross and tax-in-gross vary by platform. Keep `asReceived` with the raw numbers so a wrong formula is recoverable.
- `currency: 'INR'`
- same money type the dine-in lines already use. Do not introduce paise beside rupee floats (<80% which one you store today; match `lines`).

`restaurants/{r}/receivables/{platform}_{platformOrderId}`:

- same amounts, `orderId`, `platform`, `platformOrderId`, `businessDate`, `state: 'open' | 'cancelled'`
- cancel sets `state`, `cancelledAt`. It does not edit amount fields and it does not delete the doc.

Day close's third slice is `receivables` for that `businessDate`, grouped by `platform`, `state == 'open'` in the expected-payout total, `cancelled` listed and not added. It is not added to cash, card, or tender totals. "Floor not clear" reads `unbilledTillLines` plus issued bills. It does not read receivables.

Immutable: `settlement`, `taxLiability`, `channel`, `commercial` / receivable amounts, `platformOrderId`, line name / qty / `platformNote` as printed. Mutable: `platformState`, `orderStatus`, cart fulfilment, `receivables.state`.

Status webhooks that resend the full body must not overwrite `commercial`. The apply function's allowlist is the enforcement. A client `set()` of the whole order from the KDS will wipe it; that is why the rules allowlist exists, and why KDS writes should be a function that patches `carts` and `orderStatus` only.

## 5. Idempotency

Key is **`{platform}_{platformOrderId}`**, and that is the **order doc id** and the **receivable doc id**. Not the middleware event id. Not an auto-id. Swiggy and Zomato id spaces colliding is unlikely and not worth finding out (<80%); the prefix is free.

Firestore's only uniqueness constraint is the document id. A query-then-create is a race: two retries both see nothing and both write. The placement transaction:

1. `tx.get(orders/{platform}_{platformOrderId})`
2. Exists and `printJobs/{orderId}_{requestId}` exists → return 200, write nothing
3. Exists and print job missing (died after commit, before enqueue) → create the print job only
4. Missing → create order, lines, receivable, print job

Return 2xx only after commit. Timeout-before-2xx is case 2 or 3. The middleware retry is the recovery.

Print: exactly-once **enqueue**. Physical print is at least once unless the printer dedupes on job id. Don't promise exactly-once paper.

A later cancel is a different event, not a second create. Dedupe events on middleware event id if you have one (`appliedEventId`), else on `(platformOrderId, platformState)`: applying `FOOD_READY` twice is a no-op. Do not allocate a second print job on a status event.

No lookup doc. It adds a contention point and does not constrain anything the doc id doesn't.

## 6. State

Do not overload `orderStatus` with the platform's lifecycle, and do not add cart statuses. A new cart enum value falls through the KDS and shows a blank column. That is a silent lie.

`platformState`: `PLACED | ACKNOWLEDGED | FOOD_READY | DISPATCHED | COMPLETED | CANCELLED`. Source of truth for the webhook. One map, nowhere else:

- `PLACED`, `ACKNOWLEDGED` → `orderStatus: IN_PROGRESS`, cart `PREPARING` (skip `AWAITING_CONFIRMATION`; there is no captain to release it)
- `FOOD_READY` → order stays `IN_PROGRESS`, cart `READY`. Kitchen terminal. Same column as dine-in "on the pass". Not `SERVED` (captain treats `SERVED` as "run this to the table").
- `DISPATCHED`, `COMPLETED` → `orderStatus: COMPLETED`, cart stays `READY`. Drops out of the kitchen query. Analogous to "left the restaurant", not to "paid".
- `CANCELLED` → both `CANCELLED`, plus the existing order trigger must say `"{ticketLabel} CANCELLED"`. Otherwise the ticket just disappears out of `orderStatus in [PENDING, IN_PROGRESS]`. That vanish is the silent bug.

`COMPLETED` must not mean billable. Day close already keys off lines and bills; keep it that way. A reader that treats `COMPLETED` + no bill as "needs invoice" will try to invoice delivery. That reader is wrong for open dine-in tabs too.

Self-delivery does not reuse `platformState`. Add a fulfillment field when you build it. Don't unify the enums now.

## 7. Not now / must be in the shape now

**Refuse now**

- A fake table or a fake sitting "so the current code works". That is the invoice bug with a name tag.
- `draftId = orderId` so unbilled queries "still work".
- Channel plugin framework, ONDC adapter, self-delivery, pay-at-door flow, payout-vs-bank matching, GSTR for s.9(5), customer records from delivery names.
- Menu sync as a precondition for the ticket. Print the webhook's item name and note. Unmapped items still fire.
- A second money formula hidden in day close. Day close sums stored `netReceivable`.
- New cart statuses, a state-machine library, captain UI for delivery.
- Sharing the invoice counter with "delivery bill numbers". No commercial document in this system for these orders, not even a zero-tax invoice. (<80% whether a bill-of-supply to the platform is legally wanted later; it does not get this series if you add it.)

**The one thing that has to be in this re-seed**

`settlement` required on **every** order and **every** line, including dine-in.

The delivery doc id can wait until the first webhook: no rows exist, so there is nothing to uniquify later. `settlement` cannot. The safe query is `settlement == 'till'`. Documents missing the field do not match it, and `== null` matches both explicit null and missing, so a backfill after dine-in invoices exist is an edit to the lines those invoices were summed from. First real invoice freezes you. Put it on the dine-in writer in this shape change.

Runner-up, same placement write, not optional in practice: doc id `` `${platform}_${platformOrderId}` `` and write-once `commercial`. Those you can still choose on day one of webhooks. You cannot choose them after two retries have printed two chits.

---

## What I would hold you to

- `issueSittingInvoice(sessionId: string)` is the only call into the invoice counter. A grep for the counter shows that one caller. No `orderId` parameter.
- Platform placement is physically unable to write `draftId`, `tableId`, or `taxBlockId`. A test feeds a platform line to `unbilledTillLines` and to `issueSittingInvoice` and gets nothing / a throw, not a preview.
- Concurrent double-submit of the same Swiggy id yields one order, one receivable, one print job.
- A status replay does not change `commercial` and does not create a print job.
- Day-close drawer total, given a fixture with tenders plus an open Swiggy receivable, equals the tenders only. Floor-not-clear does not list that order.
- Cancel from `FOOD_READY` drops it from the kitchen query and emits one cancel notification. No bill doc exists.
- KDS write path cannot update `settlement`, `commercial`, `channel`, or `taxLiability`.
- No code path groups kitchen or print output by `tableId`.
- `commission` omitted, not zeroed, when the webhook leaves it out.
- You do not add `if (channel === 'dinein')` as a billing gate. The next channel that is legally a till sale (`self`) must not require a billing change — only a placement adapter that sets `settlement: 'till'`.

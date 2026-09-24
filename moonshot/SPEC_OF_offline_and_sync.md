# OF · Offline & sync

Status: **v1, Review rows signed 2026-09-16 (four answers via plattr-pro-0f)**, written to Shaurya's scope decision of the same day
(inbox of session `plattr-pro-11`). Not the module the handoff assumed: every staff device has its own
SIM, a full Firebase outage is an accepted loss, and the existing apps are not reshaped for a rare day.

**Job.** A 40-second hiccup on one bar of 4G must not cook two biryanis, charge a guest twice, or
blank a screen; and a guest who wants to leave while the till cannot reach the server gets a piece of
paper and their cash is written down, so the morning can raise the real bill.

**The case being shipped** is the till alone losing its signal while the kitchen phone, the captain
tablet and the guests' phones are all still live and still writing to the cloud. A full outage is the
rare case and the accepted loss.

## Shape: rules across existing modules plus one till feature, not a four-layer module

The server-side changes are one optional field on one existing write (`cart-checkoutCart`, its own flat
dir and style, characterization test first) and one new action on ST's existing door (`approvals-apply`
`action: 'estimate'`, P1, no PIN, idempotent) so an estimate reaches the server by itself. Payments,
refunds and drawer movements already carry a client id. Everything else is till UI, one line in the
**guest app's** checkout call (the captain app never places an order; only `cart-checkoutCart` from
the consumer app does), and one Flutter banner. A `domain/offline.ts` would hold one comparison, so there is
none; the sheet is the module.

## Scenarios

Money in rupees for reading; every stored value is minor units. Hours are the restaurant's.

| ID | Scene and what happens | Tag |
|---|---|---|
| OF-S1 | **Double Place order.** 20:41, table 7, two biryanis ₹450 each in the guest's cart on their own phone. Guest taps Place order; their 4G blips and the answer is lost; the app retries with the same `requestId`. One cart lands on the order, one ticket reaches the kitchen (the kitchen reads the order; a retry writes nothing, so nothing new appears). The retry answers success with the same order and `retry: true`. Without this the guest sees a red error for an order that went through, taps again from a fresh cart, and the kitchen cooks four biryanis. | Engine |
| OF-S2 | **Same id, different cart.** A client reuses the `requestId` from OF-S1 with a cart of one coke ₹80, or at 20:55 sends a second round under the 20:41 id. Refused, failed-precondition "requestId already used for a different cart", the words PY uses for a reused `paymentId`. Nothing written. Same items in a different order is the same cart. | Engine |
| OF-S3 | **No id.** The live consumer app sends no `requestId`. Behaviour is today's, unchanged: the first checkout deletes the live cart inside its transaction, so a second checkout of the same session is refused with "No active cart found for this table." (`checkoutCart.js`, one step before `createOrUpdateOrder`'s own "Cannot process an empty cart"). The pinned characterization test stays green. | Engine |
| OF-S4 | **Double Pay.** 21:05, ₹1,840 cash on bill 0417. The till's answer is lost and it resends the same `paymentId`. One row, one success (PY R13, PY-S23). Named here so the OF suite asserts it on its own emulator. | Engine |
| OF-S5 | **Blind, not quiet.** 20:40 the till's call fails. Within `offline.staleAfterSeconds` (15) a banner reads "No connection since 20:38", the last answered call. Kitchen and captain show the same from their shared network layer, each about its own radio. The banner clears on the next answered call. Writes are not disabled: a tap still tries, and a failure says so. Without this a dead screen reads like a quiet night. | UI |
| OF-S6 | **Sixty-second drop.** Table 12's bill was previewed at 20:38 for ₹2,310.00. At 20:40 the server stops answering for a minute. The screen keeps that preview, labelled "as of 20:38", never blank and never a spinner that does not end. Preview retries when tapped. | UI |
| OF-S7 | **Emergency bill.** Still no answer at 20:45 and table 12 wants to leave. Cashier taps Emergency bill, types the amount taken and picks the tender (cash, or the UPI they read off the guest's phone), and only then gets the printable page: total ₹2,310.00, the words from `offline.estimateText`, the time of the preview it came from, no number and no tax split. Nothing is sent anywhere. Without this the cashier does napkin maths and nothing is written down. | UI |
| OF-S8 | **Reconcile, same business day.** 23:30 the server answers. The till lists 3 open estimates, each already synced (OF-S20). For each the cashier goes preview → issue → take with the recorded amount and tender through the normal endpoints, in that order; the estimate remembers the `billId` after issue and the `paymentId` before take, and closes when the take answers. The take's `ref` is `est:<draftId>:20260916T2045:231000`, the estimate's own time, so both close sheets can be read together. Business date 2026-09-16, because it is before 04:00; the day close then counts it. | Engine |
| OF-S9 | **Reconcile after the day boundary.** The server answers at 09:00 on the 17th. Reconciling dates the bill and the take 2026-09-17 (server clock, PY R5). The 16th could not be closed with table 12's food unbilled (DC R5), so it is closed at 09:10: its expected cash lacks the ₹2,310 that is in the drawer and it reads over by ₹2,310; the 17th's expected cash includes it. Both recorded, the `ref` explains them, nothing re-dated. | Engine |
| OF-S10 | **Close with estimates open.** 23:50, two estimates not reconciled. The till refuses to open Day close: "reconcile 2 estimates first" (`offline.reconcileBeforeClose`). The server refuses too, from the other side: DC R5 will not close a date while table 12's lines carry no `billId`, so a manager on another device gets "2 items on table 12 are not on a bill yet". Two gates, one outcome. | UI |
| OF-S11 | **Stale preview, both ways.** Table 3 previewed at 19:10: idli ₹600, CGST 15 + SGST 15, payable ₹630.00. A guest's phone sent a ₹380 dosa at 20:20 over its own data; the till never re-previewed. The emergency bill says ₹630 "as of 19:10" and ₹630 is recorded. In the morning the real preview is taxable 980, tax 24.50 + 24.50, payable ₹1,029.00; Reconcile shows the ₹399 gap **before** issue and take. Take records ₹630, the bill stays issued with ₹399.00 outstanding. The reverse: the manager voided the idli at 20:50, the real bill is ₹399.00, cash tendered ₹630 → amount 399.00, change 231.00 through PY's cash rules. What to do about either is ST's. | Engine |
| OF-S12 | **Nothing to estimate from.** A preview older than `offline.estimateMaxAgeMinutes` (240), or no preview at all this sitting, refuses the emergency bill: "no preview since 15:10, write it by hand". | UI |
| OF-S13 | **Reload.** The till is reloaded at 20:50. The estimates recorded at 20:45 and the cached previews are still there. | UI |
| OF-S14 | **An estimate never moves money by itself.** Recording one calls no money endpoint: the browser check counts zero calls to `billing-*`, `payments-*` or `dayClose-*` from the emergency screen, and the only call it ever makes later is OF-S20's P1 row. Only a human in Reconcile turns an estimate into a bill and a payment. | Engine |
| OF-S15 | **Second tap.** Emergency bill tapped twice for table 12 is one estimate, keyed by `draftId` (one per sitting, `lineSnapshots.js:70`); the second tap reprints it. | UI |
| OF-S16 | **Server reachable.** The Emergency bill button appears only after a **failed** call and never while a call is in flight; a 20-second cold start is slow, not offline. With the server answering, the cashier issues a real bill; the estimate path is not a way around the invoice. | UI |
| OF-S17 | **Issued, then dark.** 20:30 the till issued bill 0417 for ₹1,840; the signal died before the take. 20:45 the guest pays. The emergency screen for an issued bill shows "due ₹1,840 on 0417" from the cached tender state, records the cash, and Reconcile does take only, never a second issue (BL-S7 would refuse it anyway). | Engine |
| OF-S18 | **Dies between issue and take.** 23:31 Reconcile issues 0418 for ₹2,310; the take's answer is lost. The estimate holds `billId` 0418 and the minted `paymentId`; the next tap retries take only with the same id (OF-S4), then closes the estimate. | Engine |
| OF-S20 | **Synced by itself.** 20:45 the estimate is recorded; the till cannot reach the server. 23:30 the first call that answers is the till's own retry loop, not a person: it sends `approvals-apply {action: 'estimate', cid: 'est_<draftId>_20260916T2045', amountMinor: 231000, note: 'cash draft_of 20:45 preview 20:38'}`. One audit row `est_<draftId>_20260916T2045_estimate`, sev P1, no PIN, no line. Sent again after a lost answer: the same row, `retry: true`, never two. A browser wiped at 23:31 has lost nothing the ledger needs: MN sees an estimate with no `est:` payment behind it. Without this a wiped browser is a night that reads clean. | Engine |
| OF-S19 | **The draft is gone.** 20:45 table 12's estimate records ₹2,310. At 21:15 a manager on the live tablet voids the lines as a walkout and releases the table. 23:30 Reconcile finds nothing to bill. The estimate offers "book as drawer cash-in": `dayClose-move` with the `est:…` trail in its `note` (a movement has no `ref` field; DC's whitelist is `movementId, kind, amount, reason, note, pin`), which DC already makes a PIN and a P0 row. The cash reaches the ledger with a name on it instead of reading as an unexplained overage. | Engine |

**Without this:** a lost 4G packet cooks a second biryani or charges a guest twice, a dead screen looks like a quiet one, and a guest who leaves during an outage leaves with nothing written down.

## Rules

- R1 A retry is the same act, in the shape PY R13 and DC already use: same id and matching details return the existing thing with `retry: true`, a mismatched reuse is refused. `requestId` travels on `cart-checkoutCart` from the guest app and is stored on the order's cart snapshot (`carts[].requestId`), which outlives the live cart the transaction deletes. The same id in the same session returns that order as a success with `retry: true`, writing nothing. "Same" is the cart's fingerprint: sorted `menuItemId:variant:addons:qty`. A different fingerprint under the same id is failed-precondition. No id means today's behaviour, unchanged.
- R2 The server never takes a time or a business date from the client. A reconciled estimate is dated when it is reconciled.
- R3 An estimate is not a tax invoice: no number, no tax split, the words in `offline.estimateText`. The tax invoice is `billing-issue` the next time the server answers. **CA to confirm**, including for the liquor block.
- R4 Recording an estimate writes nothing on the server at that moment, because it cannot. The till sends each estimate through ST's door (`approvals-apply` `action: 'estimate'`, P1, no PIN, audit id `<cid>_estimate`) on its own the moment a call answers, before any human acts (OF-S20). Money still moves only when a human reconciles through the normal endpoints.
- R5 "Offline" is a fact about the last call, not the radio: the banner shows when the server last answered, and the emergency path opens only after a failed call. No screen drops a held answer while the server is silent.
- R6 Day close waits for reconcile. The till refuses to open the close while an estimate is open; DC R5 refuses the close from any device while the estimate's lines are unbilled.
- R7 The till caches what the till read: per draft the last preview and its time, per issued bill the last tender state and its time, plus the tenders. Menu and table map are not the till's to cache.
- R8 An estimate exists only with an amount and a tender on it. Print comes after, never before.

## Config keys (on `restaurants/{id}/config/settings`, field `offline`, with defaults)

| Key | Default | Used by |
|---|---|---|
| `offline.staleAfterSeconds` | 15 | OF-S5 |
| `offline.estimateMaxAgeMinutes` | 240 | OF-S12 |
| `offline.estimateText` | "ESTIMATE, not a tax invoice. A tax invoice will be issued." | OF-S7 |
| `offline.reconcileBeforeClose` | true | OF-S10 |

Served to the till with the existing `approvals-config` answer, the till's one config read, through `app/config.ts`.

## Talks to

| Port | What crosses | If the other side is down |
|---|---|---|
| → OR / cart checkout | `requestId` on `cart-checkoutCart`, stored on `carts[].requestId`; the guest app mints one per Place order and keeps it while that tap is in flight | no server, no order; the guest's app says so |
| → ST | `approvals-apply` `action: 'estimate'` from the till's retry loop (OF-S20); `<cid>_estimate` is the audit id, so a resend is one row | the estimate waits in the till and is sent on the first answered call |
| ← BL | the last preview per draft, cached with its time; `billing-issue` in Reconcile | the estimate prints what was last seen, with its age |
| ← → PY | the last `payments-list` per bill, cached; `payments-take` in Reconcile with `ref: est:<draftId>:<hhmm>:<minor>` | cash stays recorded in the till until it answers |
| → DC | `dayClose-move` for an estimate whose draft is gone (OF-S19); DC R5 is the server-side close gate | – |
| → Flutter `platter_core` | one banner fed by the dio interceptor that already sees every failed call | – |
| → MN | `ref` prefix `est:` on payment and movement rows, `retry: true` in the checkout log line | – |

## Decisions

| Date | Decision | Why |
|---|---|---|
| 2026-09-16 | Scope is Shaurya's four items (request id, indicator, read cache, emergency bill), not the write-replay module the handoff described | Hardware: every staff device on its own SIM. A full Firebase outage is an accepted loss until the move off Firebase. Existing apps are not reshaped pre-launch |
| 2026-09-16 | Not a four-layer module; no `domain/offline.ts` | One optional field on one existing write, one till feature, one banner. A domain file would hold one comparison |
| 2026-09-16 | Double Send is already prevented by structure: checkout reads and deletes the live cart inside one transaction (`orders/createOrUpdateOrder.js:77-81`, `:197`), so the second checkout finds no cart. `requestId` turns that refusal into a success carrying the order (OF-S1), which is what the captain's app needs to stop showing a red error for a ticket that did go through | Found reading the code; the peer session and the handoff assumed a duplicate order was possible |
| 2026-09-16 | `payments-take`, `payments-refund` and `dayClose-move` already carry a client id and answer a retry as a success (`app/payments.ts` take/refund, `app/dayClose.ts` move). Not touched; OF-S4 asserts take on OF's own emulator | Scope item 1 is one endpoint, not three |
| 2026-09-16 | `billing-issue` double tap already refuses with failed-precondition "already issued 0417" and the `billId` in details (BL-S7). Left as is: the till reads the id from the error and no second number is possible | Turning it into a success touches BL for no money outcome |
| 2026-09-16 | Named, not in scope: `cart-addItemToCart` retried doubles the quantity in the live cart. The captain sees the cart before Send and fixes it there | Not a committed write; visible before it costs anything |
| 2026-09-16 | The estimate shows the total only, no tax split, no number | An estimate with CGST and SGST lines reads as an invoice to a guest and to an auditor. CA to confirm with R3 |
| 2026-09-16 | An estimate reconciled after 04:00 lands on the next business date (OF-S9). The client's clock is not taken (R2) | Same rule PY and DC already keep. The over/under on both days is recorded and explained by `ref`; a client-dated row is the thing that cannot be caught |
| 2026-09-16 | The estimate's trail is the payment row's `ref` (`est:<draftId>:<hhmm>:<minor>`), not a new audit action | A new audit row needs a new endpoint; `ref` exists and MN can select on the prefix. Named in Review |
| 2026-09-16 | The till's read cache is per-draft previews, per-bill tender state and the tenders (R7). No menu, no table map: the till has neither screen today, and the captain app is Flutter, which is not reshaped | Item 3 as written assumes screens the till does not have |
| 2026-09-16 | The Flutter banner lives in `platter_core`'s network layer, fed by failed calls, no new package | `connectivity_plus` is only in the server app; a failed call is the truth anyway (R5) |
| 2026-09-16 | Estimate printing is the browser's print; LAN printing is KT's | KT is not built; the till prints nothing today |
| 2026-09-16 | Reconcile is manual, one estimate at a time, through the same three buttons the till already has | A batch that issues and takes in one tap is a write path a person did not choose per act |
| 2026-09-16 | Fan-out on draft v1 (Grok full, Gemini short; Codex out of quota until 30 Sep). Accepted: `requestId` must live on the order's cart snapshot since the live cart is deleted (R1 reworded); the captain app must keep one id per in-flight Send (one line, in Files); "same cart" is a fingerprint, not object equality (OF-S2); an issued-then-dark bill needs a take-only estimate (OF-S17); Reconcile remembers `billId` and `paymentId` so a death between issue and take retries take only (OF-S18); a draft voided and released before Reconcile books the cash as a DC drawer movement (OF-S19); the gap is shown before issue and take and in both directions (OF-S11); amount and tender before print (R8); `ref` carries the `draftId` so two ₹2,310 estimates at 20:45 stay apart; the emergency path opens only after a failed call, never a slow one (OF-S16); no preview at all refuses like an old one (OF-S12); OF-S9 and OF-S11 get emulator tests with a fake clock across 04:00 | Each was a wrong rupee figure or a stuck estimate the draft did not name |
| 2026-09-16 | Verified, not accepted (Grok M17, Gemini scene 3): DC can close yesterday after 04:00 (`domain/dayClose.ts canClose`: only a future date is refused), and it **refuses** to close while any line is unbilled or any issued bill unpaid (DC R5, same function). So a manager on another device cannot seal the night over an open estimate. OF-S10 now says so | Both reviewers assumed the till gate was the only gate |
| 2026-09-16 | Verified (Grok M12): `draftId` is the sitting's session id (`orders/lineSnapshots.js:70`), so a new party on the same table is a new draft and cannot inherit last sitting's cash | Keyed by draft is keyed by sitting |
| 2026-09-16 | Verified (Grok M5): checkout does not notify the kitchen; the kitchen reads the order. A retry that writes nothing produces no second ticket | Asserted by OF-S1's "writes nothing" |
| 2026-09-16 | Push back (Grok B7): a bill left outstanding after OF-S11 holds the table | Paying a bill frees nothing today either (TD-011); table release is OR's |
| 2026-09-16 | Push back (Grok B12): browser print is not a receipt printer | KT owns printing; until it ships the till prints nothing, and a browser page is more than the napkin |
| 2026-09-16 | Push back (Grok, Gemini): write the estimate to the server so a wiped browser cannot lose it | That is the write endpoint the scope removed. The loss window is estimate-to-reconcile on one device; named in Out of scope and in Review as an accepted loss against the "catch it" rule |
| 2026-09-16 | Push back (Grok M7): stop guest and captain ordering once an estimate exists | Needs a server write. The captain, online on their own SIM, can stop the table; the till cannot. Accepted and named |
| 2026-09-16 | Push back (Grok B9): the estimate itself should write an audit row with a `cid` | Same write. The trail is the `ref` on the row Reconcile writes; an estimate never reconciled is the accepted loss above |

| 2026-09-16 | **Shaurya, row 1: the estimate goes back to the server, automatically, on the first answered call** (OF-S20, R4). Home: a new `estimate` action on ST's existing door, sev P1, no PIN, audit id `<cid>_estimate` so a resend is one row. Not a new endpoint; two small changes in `domain/approvals.ts` (the action) and `app/approvals.ts` (return the existing row for that id instead of failing the create) under ST's own tests. Named before building, as asked | "A night that reads clean because nothing was written is the failure"; both reviewers found it independently. Reconcile is a human step and a record cannot depend on one |
| 2026-09-16 | **Shaurya, row 2: never back-date.** The row is dated when entered; the estimate's own time rides on `ref` (`est:<draftId>:<yyyymmddThhmm>:<minor>`). Operationally the cashier reconciles before the close on the same night, so the wrong-date case only arises when the line is still down at 23:30, and then the close is blocked anyway (OF-S10) and the paper is the record | PY R5 and DC refuse client dates; OF is not the exception |
| 2026-09-16 | **Shaurya, row 3: one line in the Flutter caller, approved** — but the caller is the **guest app**, not the captain app. The captain app never calls checkout (`platter_server/lib/network/api_constants.dart` has cart status, remove item, confirm, mark served, mark paid; no create). Only `flutter_boilerplate/lib/pages/checkout_order_flow/checkout_repository.dart` calls `cart-checkoutCart`, and it has no retry of its own today. OF-S1 rewritten to the guest. **Flagged back**: the approval named the captain app | One uuid in one request body, and the app that has the double-tap problem |
| 2026-09-16 | **Shaurya, row 4: till cache is previews and tender state only, approved as written** | – |
| 2026-09-16 | Correction carried from the handoff: "nothing anywhere takes a client-supplied request id" was false when written. `app/payments.ts` and `app/dayClose.ts` implement it in full. `requestId` copies that convention (R1) rather than inventing a third | One shape for "same act" across the codebase |
| 2026-09-16 | **Shaurya (via plattr-pro-0f): estimate rides ST's door, approved.** Condition attached: `domain/approvals.ts summarise` tallies every audit row into p0/p1, so thirty offline bills syncing would read as thirty P1 approvals and bury the real ones. `summarise` now skips `action === 'estimate'`; the row is still in the trail and MN can select on the action. If RP wants estimates counted it opts in explicitly | "One door per cross-cutting thing"; the estimate is an act a person chose, so the audit stream is its home, not a parallel one |
| 2026-09-16 | **Shaurya (via plattr-pro-0f): guest app, confirmed.** Only `flutter_boilerplate/.../checkout_repository.dart` calls `cart-checkoutCart`; `platter_server` has no create. The captain app is untouched by OF; nobody should look for a Flutter change there | – |
| 2026-09-16 | Blind Opus list (`reviews/2026-09-16-OF-consults/tests-opus.md`) found a real hole: `checkoutCart.js` reads the cart doc before `createOrUpdateOrder` and refused "No active cart found" on the retry, so R1 never ran on the wire. Fixed: with a `requestId` the handler lets a missing or empty cart through to the transaction, which answers the retry or refuses exactly as before. OF-S3's message corrected to the handler's. Accepted with tests: zero-write proof on the retry (unit), the OF-S2 refusal leaving the live cart in place (e2e), both OF-S11 directions (e2e), mismatched-amount resend of the estimate refused (unit + e2e). Rejected: the 04:00 boundary test with a fake clock on the emulator, since the functions read the real clock and PY/DC already pin `businessDateFor` in their unit tests; OF-S9 asserts the server date and the ignored client date instead | Two of three "conflicts" it named were exactly the two edits planned; the third was a real bug |
| 2026-09-16 | Second fan-out (Grok full, Gemini short) on the test list: both restated the sheet's numbers and found nothing the Opus list had not; Gemini's flag that a session expiring before OF-S20 fires means no sync is right and is covered by the till resending on every answered call until `retry`/success, and by the estimate list the close refuses over | Nothing new to accept; recorded so nobody reruns it |
| 2026-09-16 | Donor review (`reviews/2026-09-16-donor-OF.md`; Odoo, URY, Dolibarr, SambaPOS) merged. Accepted: an estimate is frozen once printed (Odoo refuses a tender change on a printed order), so the till offers Reprint only, never an edit, OF-S15 (test). Accepted as debt, not built: an in-doubt tender, where the guest's UPI says failed but the bank captured it, is not an OF problem but a PY one, TD-022. Rejected: a per-line "sent to the kitchen" flag for reprints, since OF never reprints a ticket and the retry writes nothing, so the kitchen reads one cart; a retry landing after its day is closed, since a checkout retry writes nothing and the original already landed on its own date; refusing a reconcile past what is owed, since PY already books the excess as change (OF-S11b). Kept: the donors put the key on the row with a DB unique constraint where R1 uses a fingerprint on the snapshot; Firestore has no unique constraint, and the transaction reads the session's orders before writing, which is the same guarantee | Odoo's rescue session forces counted cash to equal theory, erasing the gap OF-S9 deliberately lets show; the sheet is safer there and stays |
| 2026-09-16 | Built (phases 3–4), small calls made on the way: the four config keys live in `domain/offline.ts` and ride `approvals-config`, which the till already fetches once at login and now caches, so a reload with no server still has them; a drawer movement has no `ref` field, so OF-S19's `est:` trail goes in its `note`; a till that has never seen a `payments-list` offers cash and UPI on the emergency screen (the tenders it has seen otherwise); on the tender screen the failed call that reveals the outage is the take itself (OF-S17), after which the screen says "due ₹609.00 on <billId>"; a too-old preview is refused with "No preview since HH:MM, too old: write it by hand" (OF-S12); the till resends unsynced estimates after every answered call and stops on a permission-denied (a captain's session) until a manager logs in | Each is the smallest thing that keeps the scenario true without a new endpoint or a new screen |
| 2026-09-16 | The approved "one Flutter line" in the guest app is the one body line (`'requestId': requestId` in `checkout_repository.dart`) plus the plumbing to carry it: the parameter through `cart_listing_repository.dart`, and in `cart_listing_state.dart` a `CheckoutRequestId` holder (new 15-line file) that mints one id per tap, keeps it only when the call never reached the server (`connection_error`, `timeout_error`), and settles it on success or on any refusal the server gave. Three files touched, ~10 lines. No other guest-app change | An id minted per call would be a new act on every retry and buy nothing; the holder is PY's `currentPaymentId` pattern (R13) in Dart |
| 2026-09-16 | The banner in the kitchen and captain apps is one `builder:` line each in their `main.dart`, wrapping the navigator in `platter_core`'s `OfflineBanner`; the interceptor is registered once in the shared `DioClient`. Item 2 of the scope, UI only; nothing is disabled | "Blind, not quiet" (R5) needs the strip on every device on its own radio |
| 2026-09-16 | Named, not in scope: the captain app's writes (`cart-updateCartStatus`, `cart-removeItemFromCart`, `order-…`) set a state rather than add one, so a retry lands the same state; no id needed | Same reasoning ST used to reject an idempotency key on its own door |
| 2026-09-23 | OF-S18b: an issue that landed and whose answer was lost is adopted on the next tap — BL's "already issued" refusal names the `billId`, Reconcile takes against it. No second number is possible either way (BL-S7); this only un-sticks the estimate. Reconcile's issue also sends the Check's line versions (TD-040) | Without it the estimate sat on "already issued" forever and the cash never met its bill |

## Out of scope

Reserved invoice number range: **BL-S20 stays open and keeps pointing at OF** · a write-replay or sync queue · offline mode for the kitchen tablet (the SIM phone covers it) · offline refunds, price or config changes, day-close seal · two tills offline at once, and two tabs of one till (TD-018) · a menu or table-map cache (R7) · guest QR app offline (guests reach the cloud on their own data) · an idempotency key on `cart-addItemToCart` (Decisions) · stopping guest or captain orders while an estimate is open (needs a server write) · a second endpoint for the estimate (it rides ST's door) · a retry-as-success on `billing-issue` · partial collection, split or merged tables on one estimate (one estimate per draft, one tender; the rest is handwritten) · a comp, void or credit note of an OF-S11 gap from the Reconcile screen (ST's PIN path) · re-dating a morning reconcile onto last night (R2) · getting the morning tax invoice to a guest who left with an estimate · offline table release or occupy (captain's, while their SIM answers).

## Open questions (owner: Shaurya)

- OF-Q1 Is the next-business-date landing of a late reconcile (OF-S9) acceptable, or must the morning cashier be told to reconcile before 04:00 every time? v1: acceptable, recorded.

## Review before sign-off (Shaurya reads this section only)

| Call | Weight | Why it matters |
|---|---|---|
| The estimate's server home is a new `estimate` action on ST's door, not a new endpoint (OF-S20). Two small edits in `domain/approvals.ts` and `app/approvals.ts` under ST's tests | settled 2026-09-16 | Approved via plattr-pro-0f, with one condition: estimate rows stay out of every "needs a look" count (`summarise` skips them) |
| Item 1's Flutter line goes in the **guest** app, not the captain app: the captain never places an order | settled 2026-09-16 | Confirmed via plattr-pro-0f. The captain app is untouched by OF |
| An estimate lives only in the browser until Reconcile | settled 2026-09-16 | Back in scope: it syncs by itself on the first answered call (OF-S20) |
| A late reconcile lands on the next business date, never back-dated; the estimate's time rides on `ref` (OF-S9) | settled 2026-09-16 | Your call |
| Till cache is previews and tender state only | settled 2026-09-16 | Your call |
| The estimate is a total with no tax split and no number (R3), liquor included | fine to skip | CA to confirm; the tax invoice is the morning one. Grok flagged the liquor block at ~60 % |
| The emergency path is a way to hand a guest paper without an invoice; the gates are a failed call, amount-and-tender-first, the auto-synced P1 row, and the estimate list the close refuses over | fine to skip | Catch, don't cage |

## Files

```
backend/src-plattr/functions/
  cart/checkoutCart.js                 passes requestId through (existing dir, its style)
  orders/createOrUpdateOrder.js        R1: same id + same session + same fingerprint → the existing order, retry: true; different fingerprint → refuse
  test/unit/orders/createOrUpdateOrder.characterization.test.js   pinned first, stays green (OF-S3)
  test/unit/orders/checkoutRequestId.test.js                       OF-S1, S2, S3
  domain/approvals.ts · app/approvals.ts                          the `estimate` action (OF-S20); tests in app/approvals.offline.test.ts; summarise skips estimates
  domain/offline.ts                    the four config keys and their defaults, served by approvals-config (test: domain/offline.test.ts)
  test/e2e/suites/offline.js           OF-S1, S2, S3, S4, S8, S9, S11, S17, S19, S20 on the emulator
frontend/till/src/
  api/client.ts                        records the time of the last answered call and the last failure; nothing else changes
  features/offline/useOnline.ts        R5 banner state from those times and offline.staleAfterSeconds
  features/offline/cache.ts            R7: per-draft preview + time, per-bill tender state + time, tenders, estimates; localStorage
  features/offline/sync.ts             OF-S20: send every unsynced estimate through approvals-apply on the first answered call
  features/offline/EstimateScreen.tsx  OF-S7, S12, S15, S16, S17; R8
  features/offline/ReconcileScreen.tsx OF-S8, S9, S11, S18, S19; DayClose refuses per R6
frontend/till/e2e/offline.spec.ts      OF-S5, S6, S7, S10, S13, S14, S16, S17, S18, S20 with the route cut and restored
frontend/src-platter-apps/
  modules/platter_core/lib/src/network/offline_status.dart   OfflineStatus + OfflineStatusInterceptor (registered in dio_client.dart); test/offline_banner_test.dart
  modules/platter_core/lib/src/widgets/offline_banner.dart   the strip (OF-S5)
  apps/platter_kitchen/lib/main.dart · apps/platter_server/lib/main.dart   one `builder:` line each
frontend/flutter_boilerplate/lib/pages/checkout_order_flow/checkout_repository.dart   the one body line (OF-S1)
frontend/flutter_boilerplate/lib/pages/checkout_order_flow/checkout_request_id.dart   one id per tap, kept while in flight; test/checkout_request_id_test.dart
frontend/flutter_boilerplate/lib/pages/cart_listing/{cart_listing_repository,cart_listing_state}.dart   carry it
```

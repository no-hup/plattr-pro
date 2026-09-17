# OF · offline & sync — blind test list (Opus subagent, 2026-09-16)

Written from `SPEC_OF_offline_and_sync.md` + `moonshot/CLAUDE.md` "## Rules" only, grounded in
`orders/createOrUpdateOrder.js`, `cart/checkoutCart.js`, `app/approvals.ts`, `domain/approvals.ts`,
`app/payments.ts`. No existing OF test file was opened.

Money is integer minor units (paise) everywhere. `₹2,310.00 → 231000`.
Confidence flags: **[<80%]** marks a claim I would verify before writing the assertion.

---

## Three conflicts between the sheet and today's code — settle these before writing tests

1. **OF-S3's expected error string is wrong.** The sheet says the second checkout of a session is
   refused with `"Cannot process an empty cart"` (`createOrUpdateOrder.js:79`). It is not: the first
   checkout `transaction.delete(cartRef)`s the cart doc, so the second call never reaches
   `createOrUpdateOrder` — `checkoutCart.js` fails first on `if (!cartDoc.exists)` with
   `failed-precondition` / **`"No active cart found for this table."`** (trailing full stop). The
   `createOrUpdateOrder` message is only reachable when the doc exists with `items: []`, and
   `checkoutCart` catches that one earlier too (`"Cannot checkout an empty cart."`). The
   characterization test must pin **"No active cart found for this table."**, and the sheet line
   corrected.
2. **`estimate` cannot use `apply()`'s non-line audit id as written.** For a non-line action
   `app/approvals.ts` builds `` `${cid}_${action}_${ts}_${Math.random()...}` ``. A resend would write a
   second row, breaking OF-S20's "never two". The `estimate` branch must use the deterministic
   `` `${cid}_estimate` `` and return the existing row with `retry: true`.
3. **`estimate` will be refused by two existing gates unless exempted.** (a) `decide()` returns
   `{ok:false, code:'invalid-argument'}` for an action not in `ACTIONS`, error
   `"unknown action estimate"`. (b) `validateReason` runs for every action except `reprint`, so a
   payload carrying only `note` fails `invalid-argument` / `"reason required"`. (c) `decide()`
   refuses any non-`MANAGER`/`ADMIN` role with `permission-denied` / `"Not allowed for your role"` —
   decide whether a `SERVER`-role till may record an estimate. Also `ApplyResult` has no `retry`
   field today; it needs one.

---

## OF-S1 · Double Place order (unit `checkoutRequestId`, e2e `offline`)

Fixture: table 7, session `sess_t7`, cart = 2 × biryani @ 45000 → cart total 90000.

- **S1.1** First `cart-checkoutCart {restaurantId, tableId:'table_7', sessionId:'sess_t7',
  requestId:'req_A'}` → success. Assertions: exactly **1** order doc for `sessionId==='sess_t7'`;
  `order.carts.length === 1`; `order.carts[0].requestId === 'req_A'`; cart doc
  `restaurants/{r}/carts/table_7` **does not exist**; line snapshots written = **2** (one per placed
  item) **[<80%: snapshot count is per item row, not per unit — confirm `writeLineSnapshots`
  granularity for `quantity: 2`]**; response `retry` is `false` or absent.
- **S1.2** Immediate resend with the **same** `req_A` and the same body → **success**, HTTP-level
  code none. Assertions: `retry === true`; `orderId` identical to S1.1; order doc `updateTime`
  unchanged (**zero writes**: no new cart snapshot, no counter increment, no new line snapshot, no
  audit row). Order count for the session still **1**. `order.carts.length` still **1**.
  `order.priceInfo` total still 90000.
- **S1.3** Kitchen read after the retry: `order-getActiveCartsForKitchen` returns exactly **1** cart
  for table 7, `items` summing to quantity **2**, not 4.
- **S1.4** Write-count assertion on the retry path specifically: a Firestore spy records **0**
  `set`/`update`/`create`/`delete` calls. This is the test that actually proves R1's "writing
  nothing"; without it S1.2 passes on a rewrite-with-same-values.
- **S1.5** Order counter: `counters/orders` value unchanged across S1.2 (no order number burned).
- **S1.6** Retry after a **second, different** round has been placed on the same session under a new
  id `req_B` (order now has 2 carts): resending `req_A` returns `retry: true` with the **same
  orderId** and `order.carts.length === 2` — the retry must not re-append round 1 nor truncate
  round 2.

## OF-S2 · Same id, different cart

- **S2.1** After S1.1, `requestId:'req_A'` with a cart of 1 × coke @ 8000 →
  **`failed-precondition`**, message **`"requestId already used for a different cart"`** (exact PY
  wording parallel: PY says `"paymentId already used for a different payment"`). Assertions: order
  count still 1; `order.carts.length === 1`; the **live cart is not deleted** (the guest keeps their
  coke) — this is the assertion most likely to be missed, since the refusal must happen before
  `transaction.delete(cartRef)`.
- **S2.2** Fingerprint is order-insensitive: cart `[A:qty1, B:qty2]` then a retry whose live cart is
  `[B:qty2, A:qty1]` → **success, `retry: true`**, 0 writes. Sorted
  `menuItemId:variant:addons:qty`.
- **S2.3** Fingerprint is quantity-sensitive: same item, `qty 2` → `qty 3` under `req_A` →
  `failed-precondition`, same message.
- **S2.4** Fingerprint is variant/addon-sensitive: burger+Large vs burger+Regular under one id →
  `failed-precondition`. Same for a differing addon set.
- **S2.5** Fingerprint ignores price: same items, menu price changed between attempts (45000 →
  47000) → **`retry: true`**, the stored order keeps **45000** per unit, total 90000. (R1 names the
  fingerprint as items only; this pins that a price move does not turn a retry into a refusal.)
  **[<80%: the sheet does not say; this is my reading of "sorted menuItemId:variant:addons:qty"]**
- **S2.6** Same `requestId` in a **different session** (`sess_t9`) → treated as new, order created,
  `retry` false. R1 scopes "same" to the same session.
- **S2.7** Same `requestId` reused after the session's order reached a terminal status (order
  `COMPLETED`, new cart on a new session) → new order. Pins that the id lookup is on
  `carts[].requestId` of this session's orders, not global.

## OF-S3 · No id (characterization, must stay green)

- **S3.1** Checkout with **no** `requestId` → success, order created, cart deleted. Byte-identical
  response shape to today's.
- **S3.2** Second checkout, same session, no `requestId`, cart doc already deleted →
  **`failed-precondition`**, message **`"No active cart found for this table."`** (see conflict 1).
- **S3.3** `requestId: null`, `requestId: ''`, `requestId: undefined` all behave as S3.1 (absent), not
  as an empty-string key that collides across guests. **`''` must never be stored** on
  `carts[].requestId`.

## OF-S4 · Double Pay (OF's own emulator)

Bill 0417, payable 184000, cash tender.

- **S4.1** `payments-take {billId:'0417', paymentId:'pay_1', tenderId:'cash', tendered:184000}` →
  row created, `amount: 184000`, `change: 0`, `overpaid: null`, `retry: false`,
  `bill.paidTotal: 184000`, `bill.outstanding: 0`, `bill.status: 'paid'`, `mirror: 'paid'`,
  `opensDrawer: true`.
- **S4.2** Resend identical → `retry: true`, **exactly 1** row under `paymentId 'pay_1'`,
  `bill.paidTotal` still 184000 (not 368000), `opensDrawer: **false**` (the drawer must not pop
  twice), no audit row added.
- **S4.3** Same `paymentId`, `tendered: 200000` → `failed-precondition`
  **`"paymentId already used for a different payment"`**, 1 row, paidTotal 184000.
- **S4.4** Same `paymentId` against a **different** `billId` → same refusal; no row on either bill.
- **S4.5** Cash overtender on the fresh path: `tendered: 200000` on outstanding 184000 →
  `amount: 184000`, `change: 16000`, `overpaid: null`. Retry of that returns `change: 16000` again
  and writes nothing.

## OF-S5 · Blind, not quiet (till e2e + `useOnline` unit)

Fake clock throughout; no sleeps.

- **S5.1** Last answered call at `20:38:00`, a call fails at `20:40:00`, `staleAfterSeconds: 15` →
  banner visible with text exactly **`"No connection since 20:38"`** (HH:mm of the last **answered**
  call, not of the failure).
- **S5.2** Failure at `t+14s` after the last answer → **no banner**. At `t+15s` → **banner**
  (boundary is `>=`). **[<80%: `>=` vs `>` is not stated; pick one and pin it]**
- **S5.3** Next answered call → banner removed within the same render, and `lastAnsweredAt` updates
  to the new time.
- **S5.4** Config override `offline.staleAfterSeconds: 60` from `approvals-config` is honoured;
  missing key → default **15**; garbage (`"abc"`, `-1`, `null`) → default **15** with one warning,
  never "never stale". (Numbers-are-config rule; mirrors `configFrom`'s pick/warn shape.)
- **S5.5** Writes are **not** disabled while the banner shows: a Take-payment tap with the banner up
  still issues the request and, on failure, surfaces the error toast. Assert the network call was
  attempted (**1** call), not swallowed.
- **S5.6** A call **in flight** (no answer yet, 20 s cold start) does **not** raise the banner and
  does **not** open Emergency bill. Only a settled failure counts (R5, OF-S16).

## OF-S6 · Sixty-second drop

- **S6.1** Preview cached at `20:38` = 231000. Server silent from `20:40` to `20:41`. Screen shows
  **₹2,310.00** with the label **`"as of 20:38"`**; no spinner after the request settles; no blank.
- **S6.2** Tap Retry → exactly **1** new preview request. On success the amount and the "as of"
  label both update; on failure the **old** 231000 / `20:38` stay (R5: no screen drops a held
  answer).
- **S6.3** A preview that answers with an **error body** (not a network failure) also leaves the
  cached 231000 in place.

## OF-S7 · Emergency bill

- **S7.1** Order of operations (R8): the printable page is **unreachable** until both `amountMinor`
  and `tenderId` are set. Assert the Print button is disabled with amount empty, with tender empty,
  and with both; enabled only with both.
- **S7.2** Printed page contains, exactly: total **`₹2,310.00`**, the string from
  `offline.estimateText` (default **`"ESTIMATE, not a tax invoice. A tax invoice will be issued."`**),
  and the preview time **`20:38`**.
- **S7.3** Printed page contains **no** invoice number and **no** tax split: assert the rendered DOM
  has **0** occurrences of `CGST`, `SGST`, `GST`, `Invoice`, `Bill no`, and no `/^0\d{3}$/`
  bill-number token.
- **S7.4** Amount defaults to the cached preview (231000) but is editable; a cashier typing 200000
  stores **200000**, and the printed total reads **₹2,000.00**.
- **S7.5** Tender choice is restricted to the cached tender list from `payments-list`; an unknown
  tender id cannot be recorded.
- **S7.6** Recording the estimate makes **zero** network calls at that instant (see OF-S14).

## OF-S8 · Reconcile, same business day

Fake clock `2026-09-16 23:30`, `dayStartHour` 04:00, estimate recorded 20:45 from a 20:38 preview,
amount 231000, tender cash, `draftId = 'sess_t12'`.

- **S8.1** Button order is enforced: Issue is the only enabled action; Take enables only after Issue
  answers. A Take attempted first is refused client-side with **0** network calls.
- **S8.2** `billing-issue` → `billId` (e.g. `0418`). Estimate doc in localStorage now has
  `billId: '0418'` **before** any take is attempted. Assert persistence, not just state.
- **S8.3** `payments-take` sent with `paymentId` minted **once** and stored on the estimate before
  the call, `amount/tendered: 231000`, `tenderId: 'cash'`, and
  `ref: 'est:sess_t12:20260916T2045:231000'` — exactly this string; note the `est:<draftId>:<time>:<minor>`
  shape. **[<80%: the sheet writes the time as `20260916T2045` in OF-S8 and as `<hhmm>` in the Talks-to
  table; pin the full `yyyymmddThhmm` form per the Decisions row]**
- **S8.4** Both rows carry `businessDate: '2026-09-16'` (23:30 is before 04:00 next day).
- **S8.5** After the take answers, the estimate is **closed** (`status: 'reconciled'`) and disappears
  from the open list; open count 3 → 2.
- **S8.6** Three estimates reconcile one at a time; there is **no** batch button. Assert exactly
  **3** `billing-issue` and **3** `payments-take` calls, each after an explicit tap.
- **S8.7** `dayClose` totals for 2026-09-16 include the 231000 in `byTender.cash.taken` and
  `cashNet`.

## OF-S9 · Reconcile after the day boundary

Fake clock `2026-09-17 09:00`.

- **S9.1** Issue + take at 09:00 → both rows `businessDate: '2026-09-17'`. The estimate's own time is
  **not** used for dating anywhere (R2).
- **S9.2** The take's `ref` is still `'est:sess_t12:20260916T2045:231000'` — the 16th's time on a
  17th row. This is the only link between the two days; assert the string survives verbatim.
- **S9.3** Closing 2026-09-16 at 09:10 on the 17th: allowed (`canClose` refuses only a future date),
  and its cash variance reads **over by +231000** — expected cash for the 16th excludes the estimate,
  counted drawer includes it. Assert the signed variance, not "non-zero".
- **S9.4** The 17th's expected cash **includes** +231000.
- **S9.5** No row anywhere is re-dated: after S9.3, re-read both rows and assert `businessDate`
  unchanged (`'2026-09-17'`).
- **S9.6** A client that sends its own `businessDate`/`at`/`ts` on take is ignored: row carries the
  server clock's date (R2). Assert with a payload carrying `businessDate: '2026-09-16'` at 09:00 →
  stored `'2026-09-17'`.
- **S9.7** Closing the 16th **before** reconciling is refused by DC R5 (see OF-S10), so S9.3 must run
  after the reconcile. Pin the ordering in the test so it cannot pass by accident.

## OF-S10 · Close with estimates open

- **S10.1** 2 open estimates → till Day-close entry refused with exactly
  **`"reconcile 2 estimates first"`** (count interpolated; assert the `1`/`2`/`3` forms —
  `"reconcile 1 estimates first"` vs `"reconcile 1 estimate first"` is a real string decision, pick
  one). **[<80%: singular form not specified]**
- **S10.2** `offline.reconcileBeforeClose: false` → the till gate is off, close opens. Default is
  `true`; garbage value → `true` (never the permissive side).
- **S10.3** Server-side gate, independent device: `dayClose-close` for 2026-09-16 with table 12's
  lines carrying `billId: null` → `failed-precondition`, message naming the count and the table,
  e.g. **`"2 items on table 12 are not on a bill yet"`**. Assert the refusal happens even with the
  till gate disabled (S10.2) — two gates, one outcome.
- **S10.4** After both estimates are reconciled, both gates pass and the close writes.

## OF-S11 · Stale preview, both ways

Preview `19:10`: taxable 60000, CGST 1500, SGST 1500, payable **63000**. Guest adds a dosa 38000 at
20:20. Real morning preview: taxable 98000, CGST 2450, SGST 2450, payable **102900**.

- **S11.1** Emergency bill at 20:45 prints **₹630.00** labelled `"as of 19:10"`, records
  `amountMinor: 63000`.
- **S11.2** Reconcile shows the gap **before** Issue and before Take: displayed values
  estimate 63000, real 102900, gap **+39900** (short). Assert the gap is rendered while the Issue
  button is still the enabled one.
- **S11.3** Issue then take 63000 → `bill.payable: 102900`, `bill.paidTotal: 63000`,
  `bill.outstanding: **39900**`, `bill.status: 'issued'` (**not** `'paid'`), `mirror:
  'partially_paid'`.
- **S11.4** Reverse direction: manager voided the idli at 20:50, real bill **39900**, cashier took
  63000 cash. Take with `tendered: 63000` on outstanding 39900 → `amount: **39900**`,
  `change: **23100**`, `overpaid: null`, `paidTotal: 39900`, `outstanding: 0`, `status: 'paid'`.
- **S11.5** Non-cash reverse: same numbers on a UPI tender → `amount: 39900`,
  `overpaid: **23100**`, `change: null`. (PY splits cash change from external overpay; the OF suite
  must assert the UPI branch too, because the emergency screen offers UPI.)
- **S11.6** The gap screen never itself discounts, comps or voids: assert **0** calls to
  `approvals-apply` from Reconcile.
- **S11.7** Zero gap (preview still accurate): gap displays **0** and Reconcile proceeds with no
  warning state.

## OF-S12 · Nothing to estimate from

- **S12.1** Latest preview at `15:10`, now `19:15`, `estimateMaxAgeMinutes: 240` → age 245 min →
  refused, message exactly **`"no preview since 15:10, write it by hand"`**.
- **S12.2** Boundary: age **240** min exactly → allowed; **241** → refused. Pick and pin
  (`age > max` refuses). **[<80%: boundary direction not stated]**
- **S12.3** **No preview at all** for this draft → refused with the same refusal; assert the message
  handles the no-time case without printing `"no preview since undefined"` or `"Invalid Date"`.
- **S12.4** A preview belonging to a **different draft** on the same table does not satisfy the
  check (new sitting, new `draftId`).
- **S12.5** Config `estimateMaxAgeMinutes: 0` → every preview refused (not "no limit").

## OF-S13 · Reload

- **S13.1** Record 2 estimates and 3 cached previews at 20:45, reload the page at 20:50 → both
  estimates present with identical `amountMinor`, `tenderId`, `draftId`, `previewAt`, `synced` flag;
  all 3 previews present with their times.
- **S13.2** A corrupt/unparseable localStorage blob → the app still boots, shows **0** estimates, and
  logs one warning; it must not white-screen. (Malformed-input rule.)
- **S13.3** localStorage unavailable (quota exceeded / disabled) → recording an estimate surfaces a
  visible failure rather than silently keeping it in memory only. **[<80%: sheet is silent; I would
  argue for it because a lost estimate is lost cash]**

## OF-S14 · An estimate never moves money by itself

- **S14.1** From the emergency screen, recording an estimate produces **0** requests matching
  `billing-*`, `payments-*`, `dayClose-*`. Assert by route-interception counting, and assert the
  total request count from that screen is **0** at record time.
- **S14.2** The only call the estimate ever produces on its own is OF-S20's `approvals-apply`
  `action: 'estimate'` — exactly **1** per estimate, from the sync loop, not from the screen.
- **S14.3** Reconcile is the only path that calls `billing-issue` / `payments-take`, and only after a
  human tap.

## OF-S15 · Second tap

- **S15.1** Emergency bill tapped twice for `draftId 'sess_t12'` → **1** estimate in storage, keyed
  by `draftId`; the second tap re-renders the print view with the same `amountMinor` and the same
  original recorded time.
- **S15.2** The second tap does **not** overwrite the amount/tender with fresh form state, and does
  **not** reset `synced` to false (a re-tap after sync must not resend / must resend to the same
  audit id — assert **1** audit row either way).
- **S15.3** A new sitting on the same table (new `draftId 'sess_t12b'`) gets its **own** estimate:
  2 estimates, and the new one's `ref` carries the new draftId, so last sitting's cash cannot be
  inherited.
- **S15.4** Two estimates of the same amount at the same minute but different drafts stay apart:
  refs `est:sess_t12:20260916T2045:231000` and `est:sess_t14:20260916T2045:231000`.

## OF-S16 · Server reachable

- **S16.1** With every call answering, the Emergency bill button is **absent** from the DOM.
- **S16.2** During a 20-second in-flight call (never yet failed), the button is still **absent**.
- **S16.3** After one settled failure, it appears. After the next answered call, it disappears again.
- **S16.4** With the server answering, the cashier's Issue path works normally and the estimate path
  cannot be reached by URL either (assert the route redirects). Otherwise the estimate is a way
  around the invoice.

## OF-S17 · Issued, then dark

Bill 0417 issued 20:30 for 184000; cached `payments-list` shows `paidTotal: 0`, `outstanding: 184000`.

- **S17.1** Emergency screen for the issued bill displays exactly **`"due ₹1,840 on 0417"`**
  (assert the rupee formatting the sheet uses — `₹1,840`, not `₹1,840.00`, is what the sheet writes;
  pick one and pin it). **[<80%: formatting inconsistency between OF-S17 and OF-S7]**
- **S17.2** Recording the cash stores `amountMinor: 184000`, `billId: '0417'`, tender cash.
- **S17.3** Reconcile for this estimate performs **take only**: **0** calls to `billing-issue`,
  **1** to `payments-take`. Assert the call count, not just the outcome.
- **S17.4** If `billing-issue` were called it would refuse with `failed-precondition`
  **`"already issued 0417"`** carrying `billId` in details (BL-S7) — assert that as the safety net.
- **S17.5** After take, `bill.paidTotal: 184000`, `outstanding: 0`, `status: 'paid'`, and the
  estimate closes.
- **S17.6** Partially-paid before the outage (`paidTotal: 50000`, cached outstanding 134000): the
  screen shows `due ₹1,340`, and the take records 134000 against the existing bill without a second
  issue. **[<80%: sheet does not cover a partly-paid issued bill; I think it must, since a split
  before an outage is ordinary]**

## OF-S18 · Dies between issue and take

- **S18.1** Issue answers with `0418`; `payments-take` is sent with `paymentId 'pay_est_1'` and the
  answer is lost. Assert the estimate now holds **both** `billId: '0418'` and
  `paymentId: 'pay_est_1'` in storage.
- **S18.2** Next tap sends **take only** with the **same** `paymentId 'pay_est_1'` — **0** further
  `billing-issue` calls. Server answers `retry: true`, exactly **1** payment row, `paidTotal`
  231000 not 462000.
- **S18.3** The take that was "lost" actually landed: the retry still returns `retry: true` with the
  original row's `at` timestamp, and the estimate closes.
- **S18.4** The take genuinely never landed: the retry creates the row, `retry: false`, and the
  estimate closes. Both branches must close the estimate.
- **S18.5** `paymentId` is minted **before** the first send and never re-minted on retry. Assert the
  second request body carries the identical id (this is the whole bug class).

## OF-S19 · The draft is gone

- **S19.1** Estimate 231000 recorded at 20:45; all of table 12's lines voided at 21:15 and the table
  released. Reconcile finds `payable` 0 / no billable lines and offers **"book as drawer cash-in"**
  — Issue must be **disabled**, not merely unclicked.
- **S19.2** The offer calls `dayClose-move` with `amountMinor: 231000`, direction cash-**in**, and
  `ref: 'est:sess_t12:20260916T2045:231000'`.
- **S19.3** DC gates it: `permission-denied` + `{requires:'pin'}` without a PIN; with the right PIN
  the movement writes and exactly **1** P0 audit row exists.
- **S19.4** Wrong PIN → `permission-denied` `"Wrong PIN"` with `attemptsLeft`, **no** movement
  written, estimate stays open.
- **S19.5** After the movement, the day's expected cash **includes** 231000 and the drawer reads
  **balanced** (variance 0), not over by 231000.
- **S19.6** The estimate closes as `movement` (distinct from `reconciled`) so the morning report can
  tell the two apart. **[<80%: my invention; the sheet does not name a second closed state]**
- **S19.7** `dayClose-move` retried with the same client id → **1** movement row (its existing
  idempotency, asserted on OF's emulator like OF-S4).

## OF-S20 · Synced by itself

Payload: `approvals-apply {action:'estimate', cid:'est_sess_t12_20260916T2045', amountMinor:231000,
note:'cash draft_of 20:45 preview 20:38'}`.

- **S20.1** Happy path: exactly **1** audit row with id **`est_sess_t12_20260916T2045_estimate`**,
  `sev: 'P1'`, `action: 'estimate'`, `amount: 231000`, `pct: 0`, `lineId: null`, `before: null`,
  `after: null`, `staffId` = the logged-in till staff, `ts` = server clock. **No PIN** required:
  a request with no `pin` field succeeds.
- **S20.2** Resend after a lost answer, identical body → **`retry: true`**, still exactly **1** row,
  and the row's `ts` is the **original** (not rewritten). This is the test conflict 2 above exists
  to catch — with today's random suffix it writes a second row.
- **S20.3** Resend with the **same cid** but `amountMinor: 250000` → **`failed-precondition`**
  (same shape as `"paymentId already used for a different payment"`); **1** row, still 231000. A
  mismatched reuse must not silently return the old row. **[<80%: the sheet only promises "the same
  row"; I believe the mismatch case must refuse, by R1's own words]**
- **S20.4** Sent automatically: with 3 unsynced estimates and the route restored, the first answered
  call triggers **3** `approvals-apply` calls with **no** human tap. Assert zero user interaction.
- **S20.5** Ordering/isolation: one of the three fails (server 500) → the other two still sync, the
  failed one stays `synced: false` and retries on the next answered call. No estimate is dropped and
  none is sent twice.
- **S20.6** Marked synced only **after** the answer: a call that never answers leaves
  `synced: false` in localStorage (assert after a simulated reload mid-flight).
- **S20.7** Browser wiped at 23:31 after sync: the ledger still shows the estimate audit row and MN
  can find "an estimate with no `est:` payment behind it" — assert the query
  (audit rows `action === 'estimate'` minus payment rows whose `ref` starts `est:`) returns
  **1** dangling estimate. This is the one assertion that proves the whole OF-S20 decision earned
  its place.
- **S20.8** Sync never moves money: the 3 sync calls produce **0** `payments-*` / `billing-*` calls.
- **S20.9** `action: 'estimate'` requires no `reason`: a body with only `note` succeeds (see conflict
  3b). And `note` longer than 200 chars → `invalid-argument`
  **`"note longer than 200 characters"`** (existing `validateReason`/`NOTE_MAX`).
- **S20.10** Role: the till's session role is checked. Pin the expected outcome for `SERVER` —
  today's `decide()` would give `permission-denied` `"Not allowed for your role"`.
  **[<80%: this is an open decision, not a known expected value]**

---

# EXTRA · production cases the sheet does not cover

## E-Money

- **EM-1** `amountMinor` must be a **positive integer**: `0`, `-100`, `231000.5`, `"231000"`,
  `NaN`, `Infinity` → `invalid-argument`
  **`"amountMinor must be a positive integer in minor units"`** (the exact string `billDiscount`
  already uses), **0** rows written. Rupee floats must never reach the server: assert that
  `8.49 × 100` never appears as `848.9999...` anywhere (the till converts with `Math.round`).
- **EM-2** Upper bound: an estimate above a configured ceiling (say `offline.estimateMaxMinor`) is
  refused rather than recorded. Without a ceiling a fat-finger `231000000` (₹23,10,000) syncs as a
  P1 row and pollutes the day. **[<80%: no such key exists in the sheet; I recommend adding one]**
- **EM-3** Rupee↔paise display round-trip: 231000 renders `₹2,310.00`; `₹2,310.00` typed back
  stores 231000; `2310` typed bare stores 231000 not 2310. Pin the input contract.
- **EM-4** The estimate's amount is never used as a price: after reconcile the bill's `payable` comes
  from the **real** lines (102900 in S11), never from the 63000 estimate. Assert `bill.payable`.
- **EM-5** Three estimates 63000 + 102900 + 231000 sum to **396900** in the open-estimates list and
  in the "reconcile N first" gate; assert the total, since a cashier reads it.
- **EM-6** A `₹0.00` preview (all lines voided already) cannot be recorded as an estimate (R8: an
  estimate exists only with an amount).

## E-Auth

- **EA-1** `approvals-apply action:'estimate'` with **no session** → `unauthenticated`, **0** rows.
- **EA-2** With a session whose staff `status !== 'active'` → `permission-denied`
  **`"Staff account is not active"`**, **0** rows.
- **EA-3** With a **customer/guest** session id (not staff) → `unauthenticated` from
  `staff.bySession`, **0** rows. A guest device must not be able to mint P1 audit rows.
- **EA-4** `cart-checkoutCart` with `requestId` but an **invalid/expired** session → today's
  unauthenticated refusal, unchanged, and **no** `requestId` stored anywhere.
- **EA-5** A `requestId` guessed from another table's guest (`req_A` on `table_9`,
  `sess_t9`) → new order for table 9, never a leak of table 7's order details into the response.
  Assert the response contains **no** table-7 order id. This is the one real data-leak shape in R1.
- **EA-6** Reconcile's `billing-issue` / `payments-take` still enforce their own role gates; an
  estimate does not grant permission the staff member lacks.

## E-Concurrency

- **EC-1** Two `cart-checkoutCart` with the **same** `requestId` fired **simultaneously** (same
  tick, before either commits) → exactly **1** order, **1** cart snapshot, the loser either returns
  `retry: true` or retries the transaction; **never** two orders, never `ABORTED` surfaced to the
  guest. This is the case the sequential S1.2 does not cover, and the one that actually happens on a
  double tap. Run it against the emulator, not mocks.
- **EC-2** Two **different** `requestId`s fired simultaneously on one session → exactly **1** order
  with **2** carts (the second contends on the same cart doc and finds it deleted → the guest's
  second round is refused with `"No active cart found for this table."`, which is today's behaviour;
  assert whichever is true, but assert it). **[<80%: outcome depends on retry ordering — pin
  empirically, then freeze]**
- **EC-3** Sync loop fires while the cashier is reconciling the same estimate: **1** audit row and
  **1** payment row; the estimate does not close twice or resurrect.
- **EC-4** Two browser tabs of one till (TD-018, explicitly out of scope): assert the **known**
  behaviour so the debt is pinned rather than unknown — two tabs recording the same draft produce
  two localStorage copies and **1** audit row (same cid). If it produces two rows, that is a finding.
- **EC-5** `payments-take` racing `dayClose-close` for the same business date: the close read of the
  day doc makes them contend (`dayOpenOrThrow`), so one wins. Assert the take refused after close is
  `failed-precondition` **`"2026-09-16 has been closed and counted; money cannot be added to it"`**
  and writes **0** rows. A late reconcile hitting a just-closed day is exactly OF's scenario.
- **EC-6** `dayClosed` returning `null` (unknown) → refused with
  **`"Cannot tell whether 2026-09-16 has been closed, so no money can be taken on it"`**, 0 rows.

## E-Malformed input

- **EM'-1** `requestId` of the wrong type (`number`, `object`, `[]`, 10 000-char string) →
  `invalid-argument`, **0** writes, live cart untouched. Cap the length explicitly (say 128) so a
  client cannot write an unbounded key into the order doc.
- **EM'-2** `requestId` containing Firestore-hostile characters (`/`, `.`, `__x__`, newline) is
  either rejected or safely stored as a plain field — assert no path uses it as a **document id**.
- **EM'-3** `cid` empty or non-string on the estimate → `invalid-argument` **`"cid required"`**
  (existing string), 0 rows.
- **EM'-4** `tenderId` unknown on Reconcile's take → refusal from `tenderById`, 0 rows.
- **EM'-5** `offline` config block missing entirely → all four defaults apply (15, 240, the estimate
  sentence, true) and the till boots. `offline` present but not an object (`"yes"`, `42`) → defaults
  + **1** warning, never a crash and never the permissive side.
- **EM'-6** `offline.estimateText` set to `""` → falls back to the default sentence, not a blank
  line on the printed page (an estimate with no disclaimer is the one that reads as an invoice).
- **EM'-7** A cached preview blob missing `previewAt` or `payable` is treated as **absent**
  (OF-S12.3 path), not as `NaN` on the printout.

## E-Clock

- **ECL-1** The till's clock is **wrong by +6 hours** (23:00 local vs 17:00 real): the estimate's
  `ref` carries the till time, but every stored `businessDate`, `at` and audit `ts` is the server's.
  Assert no server field ever equals the client's value.
- **ECL-2** Reconcile at exactly **03:59:59** on the 17th → `businessDate '2026-09-16'`;
  at **04:00:00** → `'2026-09-17'`. Pin the boundary in both directions with a fake clock.
- **ECL-3** `dayStartHour` configured to `06` → the same two-sided boundary at 05:59:59 / 06:00:00.
- **ECL-4** An estimate recorded at 23:59 and reconciled at 00:05 the same night: business date is
  still **2026-09-16** (before 04:00), the ref time is `20260916T2359`, and the day close counts it
  on the 16th. This is the common case and is not in the sheet.
- **ECL-5** Staleness maths with a clock that jumps backwards (NTP correction mid-outage): the
  banner must not read a negative age or hide itself. Assert `max(0, now - lastAnsweredAt)`.
- **ECL-6** DST / timezone: all business-date maths uses Asia/Kolkata offsets consistently; a
  `Date` built from a local string and one from epoch ms give the same `businessDate` at 03:59.
  **[<80%: no DST in IST, so this is cheap insurance rather than a live bug]**
- **ECL-7** An estimate older than the whole business day (recorded 20:45 on the 16th, reconciled
  2026-09-20) — nothing refuses it today. Assert the current behaviour (dates on the 20th, ref still
  the 16th) and decide whether a warning is owed. **[<80%: sheet silent]**

## E-Logging & audit (the rule the sheet leans on hardest)

- **EL-1** Every OF state change emits exactly **1** JSON log line carrying the `cid`: estimate
  recorded, estimate synced, estimate reconciled, estimate booked as movement. A quiet night
  (0 estimates) is distinguishable from broken logging: assert the sync loop logs one
  `estimates: 0` line per answered call cycle. **[<80%: my reading of the "quiet day" rule applied
  to OF]**
- **EL-2** The checkout retry logs `retry: true` (the MN hook named in Talks-to) — assert the log
  line, since the response alone is not the ledger.
- **EL-3** No log line or audit row ever contains a PIN, a token, or the full request body.

---

## Summary of what I would not ship without

`S1.4` (zero writes on retry), `S2.1` (refusal does not delete the live cart), `EC-1` (simultaneous
same-id checkout), `S20.2`+`S20.3` (one audit row, mismatched reuse refused), `S11.3`/`S11.4`
(both directions of the gap in minor units), `S18.5` (paymentId minted once), `EC-5` (late reconcile
into a closed day), `ECL-2` (04:00 boundary both sides), and the three conflicts at the top resolved
in the sheet before any of this is written.

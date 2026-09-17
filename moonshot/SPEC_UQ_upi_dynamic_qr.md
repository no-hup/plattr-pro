# UQ · UPI dynamic QR

Status: **draft v1** (2026-09-17). No code written. Every external fact carries a source or is marked
**UNVERIFIED**; the provider choice and everything that costs money per transaction is Shaurya's, in
*Review before sign-off*.

**Job.** Put a QR on the screen that already carries the exact amount of one bill, learn within seconds
that it was paid, and let PY record it. UQ is a pipe, not a ledger: it writes no payment row of its own,
it calls PY's `take`.

Today a UPI payment is a cashier typing a reference into the `upi` tender (`needsRef: true`) after
squinting at a guest's phone. This module removes the typing and the squinting, and it is the only
tender we can confirm without hardware.

## Who can do what

| Action | Captain (SERVER) | Cashier (MANAGER) | Owner (ADMIN) |
|---|---|---|---|
| See a live QR and its state | ✓ | ✓ | ✓ |
| Raise a QR for a bill | – | ✓ | ✓ |
| Cancel a live QR | – | ✓ | ✓ |
| Confirm by hand that the guest paid | – | PIN, reference, P0 | PIN, reference, P0 |
| Clear an unrecorded payment onto today | – | PIN, P0 | PIN, P0 |
| Change the provider, the VPA or the numbers | – | – | ✓ (config doc) |
| Hold the provider's API key | – | – | – (Secret Manager, nobody's screen) |

Exactly ST's roles. No new one.

## Objects

**Collect** `restaurants/{id}/upiCollects/{collectId}`. One document per QR raised. Append-mostly: only
`status`, `paymentId`, `settledBy`, `events[]`, `unrecorded` and `lastProviderCheckAt` are ever written
after creation, and no document is ever deleted.

| Field | What |
|---|---|
| `collectId` | **the till generates it**, and it is the document id. The same tap repeated raises the same QR, never a second one (PY's R13, same rule and same reason) |
| `billId, cid` | the bill this collects against; `cid` is the bill's correlation id, carried into every log line |
| `businessDate` | resolved server-side at creation by `businessDateFor` from `domain/payments`, imported, never re-written. It is what tells the morning screen which day an unrecorded payment belongs to |
| `amount` | minor units. **Computed by the server** from the bill's outstanding inside the creating transaction (R1). The number in the QR payload and this number are the same number |
| `provider` | the adapter id in force at creation, frozen. Switching provider next month must not make last week's collects forget who took the money |
| `providerRef` | the provider's own id for this QR or order. Null in `none` mode |
| `payload` | the exact `upi://pay?…` string the QR encodes, frozen. What was shown is what we keep; the QR image is drawn from this and never stored |
| `tr` | the transaction reference inside the payload. Ours, and the only thing that can tie a bank line back to a bill when no provider is involved |
| `status` | `live` → `paid` \| `cancelled` \| `unrecorded`. **Expiry is not a status** — it is `now > expiresAt` on a `live` row, derived on every read, so no sweeper and no scheduled function |
| `expiresAt` | epoch ms, `createdAt + upi.lifetimeSeconds` |
| `createdAt, by, byRole` | server time, and a **frozen snapshot** of the cashier who raised it. A webhook has no session; this is who DC's `byStaff` will name (R7) |
| `paymentId` | the PY row this collect produced, null while live. Set inside the same transaction as the take |
| `settledBy` | `webhook` \| `providerCheck` \| `manual`. How we learned, kept because the three are not equally trustworthy |
| `events[]` | every provider callback we accepted: `{at, providerPaymentId, amountMinor, kind}`. Append only |
| `unrecorded` | `{at, providerPaymentId, amountMinor, reason}` or null. Money the bank has that the ledger could not take (R8) |
| `lastProviderCheckAt` | epoch ms. The rate limiter for asking the provider "has this been paid" |

**Nothing else is new.** No payments collection, no events collection, no ledger. The payment row is PY's,
the audit row is ST's, the day is DC's.

## Scenarios

Money in rupees for reading; every stored value is minor units. The running bill is table 9 at a Koramangala
restaurant on 2026-09-17: food and two pitchers, **payable ₹2,151.00**, outstanding the same.

| ID | Scene and what happens | Tag |
|---|---|---|
| UQ-S1 | **Three seconds.** 21:38. Cashier taps UPI on the tender screen. The server reads outstanding 215100 inside a transaction, mints the collect, asks the provider for a QR of exactly that, and the till draws it. The guest scans off the till screen and pays. The provider posts to our webhook at 21:38:07; the signature checks out; one `payments-take` row lands, `tenderId: 'upi'`, `captured: true`, `amount: 215100`, `ref` = the provider's payment id. The till's 3-second poll sees `paid` and the bill closes. **Without this the cashier reads a total off a static QR by eye and reconciles UPI by hand at midnight.** | Engine |
| UQ-S2 | **The guest types less, which is not supposed to be possible.** NPCI's spec says an `am` with no `mam` makes the amount **non-editable** in the payer's app, and a provider QR minted `fixed_amount: true, single_use` refuses a different amount at the provider. So this should never happen — and it is a "should", enforced by the payer's app, not by the switch. If ₹2,000.00 arrives anyway, the take records amount 200000, outstanding falls to ₹151.00, the bill stays `issued`, and the till shows "₹151.00 still to pay". We do not write a guard for a state the spec forbids; we let PY's existing part-payment path answer it, because money that has moved cannot be refused. | Engine |
| UQ-S3 | **The guest types more.** ₹2,200.00 arrives against ₹2,151.00. The take records amount 215100 and `overpaid` 4900 — PY-S28 verbatim, and PY-S32 is how the ₹49 goes back. The bank statement reads ₹2,200.00 and DC-S15 reconciles. Without this the ledger has to lie about money that already moved. | Engine |
| UQ-S4 | **The guest pays twice.** The same QR is scanned by the guest at 21:38 and again at 21:39 because the first screen looked stuck. Two provider payments, two different provider payment ids. The first is `uq_<collectId>` and settles the bill. The second is `uq_<collectId>_<providerPaymentId>` and lands as a take of amount 0 with `overpaid` 215100 against a settled bill — which **PY refuses today** (`canTake`: "Nothing outstanding"). That refusal is a hole this module has to close; see R2 and the Review row. Recorded, the ₹2,151 goes back through PY-S32's overpay refund. Without this the restaurant is holding ₹2,151 of somebody's money with no row anywhere. | Engine |
| UQ-S5 | **Scanned, never paid.** 21:38 the QR goes up. The guest opens three apps, gives up and hands over a card. At 21:43 `upi.lifetimeSeconds` (300) is past: the till stops showing the QR, the collect reads expired on every read, and the provider was told to close it at creation. **Nothing sweeps it** — expiry is a comparison, not a job. The cashier takes the card through PY as normal. Without this a stale QR sits on a screen and somebody eventually pays a bill that was already settled. | Engine |
| UQ-S6 | **Half by QR, half in cash.** 21:38, four friends. The cashier raises a QR for ₹1,200.00 — under the outstanding, so it is accepted (R1) — one friend pays it, outstanding falls to ₹951.00, and the rest is handed over in notes. Two PY rows, the second cash with its own change. A requested amount **above** the outstanding is refused, `invalid-argument`, before any QR exists. Without this a table that wants to split is pushed into one payer or a hand-typed reference. | Engine |
| UQ-S7 | **Two QRs at once.** Table 9 asked for two bills (BL-S12): 0431 for the bar at ₹1,402.00 and 0432 for the food at ₹749.00. Two collects, two bills, two QRs, both live, each with its own `tr`. Two webhooks arrive within four seconds of each other and each finds its own collect by `providerRef`. Neither bill can take the other's money, because the take names the `billId` on the collect. Without this a split table is a queue. | Engine |
| UQ-S8 | **The webhook is late.** The guest's app says success at 21:38:04, the callback has not landed by 21:38:24. At `upi.providerCheckAfterSeconds` (20) the till's next poll makes the server ask the provider once, directly, whether that QR has been paid. It has. The take is written with the same `uq_<collectId>`, `settledBy: 'providerCheck'`. The webhook lands at 21:38:41 and is a retry: PY returns the existing row, one row, and the collect gains a second `events[]` entry. Without this a slow callback reads to the cashier exactly like a failed payment. | Engine |
| UQ-S9 | **The webhook never comes and the guest is holding a success screen.** 21:40, still nothing, and the provider status call is failing too. The cashier taps "Guest paid — confirm by hand", types the UTR off the guest's phone (required, `upi.manualConfirmNeedsRef`), and enters their PIN. One take, `paymentId: uq_<collectId>`, `captured: true`, `ref` = the typed UTR, `settledBy: 'manual'`, and a **P0 audit row** through ST's door, `action: 'upiManualConfirm'`, naming the cashier, the amount and the reference. If the real callback ever arrives it lands on the *same* `paymentId` and PY's R13 answers it as a retry — one row, not two. Without this the only escape hatch is a cashier recording a UPI payment on trust with nothing that says they did. | Engine |
| UQ-S10 | **The amounts disagree on the way back.** Same as UQ-S9, but the cashier typed ₹2,151.00 by hand and the callback that arrives an hour later says ₹2,051.00 — the guest paid a different amount and showed the wrong screen. PY's R13 refuses a known `paymentId` with a different amount. UQ catches that refusal, writes **nothing** to the ledger, marks the collect `unrecorded` with both figures, and raises a P0 audit row `action: 'upiMismatch'`. The webhook still answers 200. Somebody reads it in the morning. Detection, not prevention: the alternative is a webhook that can overwrite a human's record. | Engine |
| UQ-S11 | **The day is already closed.** DC closed 2026-09-17 at 23:30. At 23:44 a callback lands for a QR raised at 23:29. PY's day gate refuses the take — correctly, DC-S6. UQ does **not** retry into the wall and does **not** fail the webhook: it marks the collect `unrecorded`, writes a P0 audit row `action: 'upiUnrecorded'`, answers the provider 200, and the till's morning screen shows "₹2,151.00 reached the bank at 23:44 on a closed day". A manager clears it with a PIN and it is recorded **on today's date** — a new row on an open day, exactly what DC-S28 already allows for a refund. Yesterday's signed document does not move a paisa. Without this money lands in the bank and nothing anywhere says so. | Engine |
| UQ-S12 | **Giving it back.** The pitcher was never poured. BL raises CN-0011 for ₹499.00 against the paid bill; the cashier refunds ₹499.00 on the `upi` tender, PIN, reason "wrong dish". PY-S36 allows it because the bill was actually paid on UPI. **v1 moves no money through the provider**: the row is recorded, the `note` carries the collect's `tr`, and the owner pushes the refund from the provider's dashboard that night. The alternative is an API key in our functions that can send money out, and that is a Review row. | Engine |
| UQ-S13 | **The till loses its signal.** 21:38 the QR is on the screen; 21:39 the till's 4G drops. The guest pays anyway. **The confirmation path never touches the restaurant's internet** — the provider posts to Cloud Functions directly — so the take is recorded server-side while the till is dark. At 21:41 the till reconnects, the poll answers `paid`, and the bill is already closed. Without this a working payment reads as a failure to the only person who can act on it. | Engine |
| UQ-S14 | **The signal is gone before the QR exists.** 21:36, the till cannot reach the server at all, so there is no outstanding to compute and no QR to raise. OF's answer stands unchanged: the emergency bill, the amount written down, the tender recorded as the UPI the cashier read off the guest's phone, reconciled later (OF-S7, OF-S8). **UQ is online-only, like every other tender** (PY's Out of scope). Without this we would be inventing an offline QR whose amount nobody computed. | UI |
| UQ-S15 | **Two guests, one QR.** Table 9's QR is on the till screen; a guest at table 11 walking past scans it and pays ₹2,151.00. It lands on table 9's bill, because the collect names the bill and the QR is a picture of that collect. Table 9's guest then pays too — UQ-S4. This is a real failure mode and the answer is a short lifetime (300s) and a QR that leaves the screen the moment it is paid, not a cleverer key. | Engine |
| UQ-S16 | **A payment for a bill that was cancelled.** 21:38 the QR goes up; 21:39 the cashier cancels bill 0431 under BL-S9 because the guest refused the service charge; 21:40 the guest pays the old QR. The take is refused (`canTake`: "Bill is cancelled"). The collect is marked `unrecorded`, P0 audit row, webhook 200, morning screen. The money is real and belongs to the replacement bill 0432, which a manager settles against by hand. Without this the callback 500s, the provider retries for a day, and the restaurant never hears about ₹2,151. | Engine |
| UQ-S17 | **A forged callback.** Someone POSTs `{"amount": 215100, "paid": true}` at our webhook URL with no signature, or with one computed over a different body. 400, no read, no write, nothing from the body in any log. The URL is public by construction; the signature is the whole of its security (R3). Without this the endpoint is a button anybody on the internet can press to mark a table paid. | Engine |
| UQ-S18 | **The same callback twice.** Providers retry; a delivery can arrive twice. The second one derives the same `paymentId`, PY's R13 returns the existing row, and the collect's `events[]` gains a second entry that says a duplicate arrived. One row, 200, no second take. Without this every retry is another ₹2,151 in the ledger. | Engine |
| UQ-S19 | **The provider is down when the QR is asked for.** 21:38, `create` times out or answers 5xx. No collect is written, the till says "UPI QR unavailable, take another tender", and the cashier takes cash. **No half-written collect, ever**: the provider call happens before the document, not inside the transaction that writes it. Without this the screen shows a QR that the provider does not know about, and the guest pays into nothing. | Engine |
| UQ-S20 | **No provider at all.** `upi.provider` is `none`, which is the default. The till still draws a QR — a `upi://pay` payload built from `upi.vpa`, the bill amount and our `tr` — and the till says in so many words **"we cannot confirm this; check the guest's phone"**. Confirming is UQ-S9's manual path, PIN and typed reference, every time. This is the mode the restaurant runs in on day one, before any merchant account exists, and it is already better than a printed static QR because the amount is right. | Config |
| UQ-S21 | **A callback for a QR we never raised.** A stray delivery arrives with a `providerRef` no collect carries — a test event from the dashboard, or a payment against a different product on the same merchant account. Nothing is written to any bill. One P0 audit row `action: 'upiOrphan'` with the amount and the reference, and a 200. Without this either we 500 forever or a stray ₹500 silently attaches to whatever bill was last open. | Engine |
| UQ-S22 | **The bill changes under the QR.** 21:38 a QR for ₹2,151.00 is live. 21:39 a manager voids a ₹450.00 biryani (ST-S5), so the bill is now ₹1,701.00. The guest pays the old ₹2,151.00. The take records amount 170100 and `overpaid` 45000; the bill settles and ₹450 goes back through PY-S32. The alternative — refusing money that arrived because the bill moved — is not available to us. The till warns the cashier that a live QR is stale the moment the outstanding changes. | Engine |
| UQ-S23 | **The owner switches provider.** Owner sets `upi.provider` from `none` to the live one in Admin. The next QR is raised through the new adapter. Collects already written keep their frozen `provider` and their `providerRef`, and a late callback for an old one still resolves, because the webhook route carries the provider in its path, not in a global. No deploy, no restart. | Config |
| UQ-S24 | **The 0.4 % that is not on the bill.** From **15 October 2026** a P2M UPI payment **above ₹2,000** carries 0.4 % MDR, capped at ₹300, and the **merchant pays it** — passing it to the guest is not allowed. Table 9's ₹2,151.00 costs the restaurant **₹8.60**. A ₹1,999.00 bill costs ₹0. The POS does exactly two things about this: it **never adds a surcharge**, and the day-close UPI line is the gross the bank credited, never a net. Naming it here because the obvious "clever" move — split every bill into two QRs under ₹2,000 — is a thing this software could trivially do and deliberately does not. | Engine |
| UQ-S25 | **A cold start misses the provider's five seconds.** The callback lands on an idle function; the take takes 5.4 seconds; the provider gives up at 5.0 and marks the delivery failed. It retries — and the retry is UQ-S18, one row, a success. Meanwhile the till's own provider check at 20 seconds (UQ-S8) has probably already settled it. **We do not buy a warm instance to win a race we have two other ways to finish.** The one thing that would be a real problem is 24 hours of continuous failure, which one provider answers by disabling the webhook; that is a monitoring line, not a design change. | Engine |

**Without this:** most payments by count are UPI, and every one of them is a cashier reading a number off a
stranger's phone at 23:40 and typing it in, with a bank statement the next morning that nobody can line up
against the day's bills.

## Rules

- R1 **The server computes the amount.** The till sends `billId` and `collectId`, and may *propose* an
  amount for a split. The server reads the outstanding inside the creating transaction, refuses anything
  above it, and defaults to the whole of it. No number from the client ever reaches the QR payload.
- R2 **Every provider callback is idempotent, and the key is PY's, not a new one.** The take that answers a
  QR is written with `paymentId = uq_<collectId>`; any further payment on the same QR is
  `uq_<collectId>_<providerPaymentId>`. Both are deterministic from what the provider sends, so a webhook,
  a provider status check and a manual confirm all land on the same row. PY's R13 does the rest: the same
  id twice is one row and a success.
- R3 **The signature is checked over the raw body, first, before anything.** Before a parse we trust, before
  a Firestore read, before a log line. Constant-time compare against a secret from Secret Manager. A bad or
  missing signature is `400` with no body echoed anywhere. This endpoint is public; the signature is its
  only door.
- R4 **The webhook answers 200 for everything it has handled or cannot act on**, and 5xx only when a retry
  would genuinely help (a transient Firestore failure). A refusal the provider retries for a day costs us
  invocations against `max-instances: 10` and gets the restaurant no money.
- R5 **A QR expires; a payment never does.** Expiry stops the till showing the QR and closes it at the
  provider. It never refuses money that has arrived. Expiry is `now > expiresAt`, computed on read — no
  scheduled function, no sweeper, no third status.
- R6 **UQ writes no money.** It calls PY's `takeAs()` — the same code `payments-take` calls, one layer below
  its onCall wrapper. UQ never writes `payments/`, never writes a bill field, never writes `dayClose/`.
  If the money rule is wrong it is wrong in one place.
- R7 **A webhook-born payment is attributed to the cashier who raised the QR**, frozen on the collect at
  creation. A webhook carries no session. Inventing a `system` staff id would put rupees into DC's
  `byStaff` under a name nobody can ask a question of.
- R8 **Money that arrived and could not be recorded is never dropped.** The collect goes `unrecorded` with
  the amount and the provider reference, a P0 audit row is written through ST's door, the provider gets
  200, and the till keeps showing it until a manager clears it onto an open day with a PIN.
- R9 **The manual confirm needs a PIN, a non-blank reference and a P0 audit row.** It is the one place a
  human asserts that money arrived without the provider saying so, and it is the one a dishonest cashier
  would reach for.
- R10 **One live collect per bill** (`upi.maxLivePerBill`, default 1). Raising a new one cancels the old at
  the provider *first*; if that cancel fails, the new one is refused. Two live QRs for one bill is how a
  guest pays twice for reasons nobody can reconstruct.
- R11 **Credentials are not config.** The provider's key id, secret and webhook secret live in Secret
  Manager and are read by the adapter only. The config document holds the provider id, the VPA, the payee
  name and the numbers. A Firestore document is not a place to put a key that can move money.
- R12 `domain/upi.ts` holds no provider name, no URL, no rupee figure, no clock and no Firestore. It builds
  a payload string, decides an amount against an outstanding, and says whether a collect is still live.
- R13 **The QR is shown on the till screen.** Nothing in v1 reaches the guest's own app, and nothing is
  printed on the bill. The guest points a camera at the cashier's screen, which is what they already do
  everywhere else in Bangalore.
- R14 The till polls **our** backend, never the provider. One endpoint, `upi.pollSeconds` (3) apart, only
  while a collect is live, and it stops at `upi.lifetimeSeconds`. The provider is asked at most once every
  `upi.providerCheckEverySeconds`, server-side, and only after `upi.providerCheckAfterSeconds`.

## Config keys (on `restaurants/{id}/config/settings`, field `upi`, with defaults)

| Key | Default | Used by |
|---|---|---|
| `upi.provider` | `'none'` | UQ-S20, UQ-S23, R11. The adapter `active.ts` picks. `none` is a working mode, not "off" |
| `upi.tenderId` | `'upi'` | UQ-S1. Must name a row in `payments.tenders[]`; if it does not, raising a QR is refused |
| `upi.vpa` | `''` | UQ-S20. Only read in `none` mode; empty refuses |
| `upi.payeeName` | `''` | UQ-S20. The `pn` parameter |
| `upi.lifetimeSeconds` | `300` | UQ-S5, UQ-S15, R5 |
| `upi.pollSeconds` | `3` | UQ-S1, R14 |
| `upi.providerCheckAfterSeconds` | `20` | UQ-S8, R14 |
| `upi.providerCheckEverySeconds` | `10` | R14. The rate limit on asking the provider |
| `upi.maxLivePerBill` | `1` | UQ-S7, R10 |
| `upi.manualConfirmNeedsRef` | `true` | UQ-S9, R9 |
| `upi.noteText` | `'Bill {number}'` | the `tn` parameter, what the guest sees in their app |

That is the whole list. No key turns the PIN off on a manual confirm, and no key turns the signature check
off: a key that disables a control is a second policy.

## Talks to

| Port | What crosses | If the other side is down |
|---|---|---|
| ← BL Billing | the issued bill: `billId`, `number`, `payable`, `cid` | no bill, no QR |
| ← PY Payments | the outstanding, read inside the creating transaction | no outstanding, no amount, no QR |
| → PY Payments | `takeAs()` with `captured: true`, the computed amount, `ref`, and the frozen actor | the take is refused and R8's unrecorded path runs |
| ← CF Config | the keys above, read once per request | **a config read failure refuses the QR**, the same call PY made. Guessing a VPA is how money goes to the wrong account |
| ← ST Approvals | `pinGate` for the manual confirm and the unrecorded-clear; `auditRow` for every P0 above | no PIN door, no manual confirm |
| ← DC Day close | whether the business date is closed, via PY's existing gate | refuse the take, R8 runs |
| → provider | create QR, cancel QR, ask status | UQ-S19 for create, UQ-S9's manual path for status |
| ← provider | the webhook | there is nothing we can do about a callback that is never sent except UQ-S8 and UQ-S9 |
| → LG Logs | one JSON line per collect state change with `cid`, `collectId`, `billId`, `amount`, `settledBy`, `outcome` | never blocks |

## The flow, end to end

1. Till calls `upi-raise` with `{restaurantId, sessionId, billId, collectId, requested?}`.
2. Server: role → config → read outstanding in a transaction → `domain/upi.amountFor()` → cancel any live
   collect for that bill (R10) → **call the provider** → write the collect document. The provider call is
   outside the write transaction on purpose (UQ-S19): a network call inside a Firestore transaction is
   retried by Firestore on contention, and a retried non-idempotent side effect is two QRs.
3. Till draws the QR from `payload` and starts polling `upi-status` every `upi.pollSeconds`.
4. Provider posts to `POST /upi-webhook/<provider>?r=<restaurantId>`. Signature over the raw body first
   (R3), then normalise to `{providerRef, providerPaymentId, amountMinor, at, kind}`, then one transaction:
   find the collect, derive the `paymentId` (R2), call `takeAs()`, stamp the collect. 200 either way (R4).
5. The poll answers `paid` and the till closes the bill screen. If it does not, UQ-S8 then UQ-S9.

The webhook is an **`onRequest`**, not an `onCall`, and that difference is the whole security design:
there is no Firebase client SDK on the other end, no `request.auth`, no CORS (a CORS header on a
server-to-server endpoint is decoration), and the error shape is HTTP status codes rather than
`ErrorHandler`'s callable envelope. `ErrorHandler` is still the door for the three onCalls.

## Out of scope

Card terminals of every kind — **a separate block, not planned here** · the guest's own phone showing the
QR (the till screen is v1, R13) · printing the QR on the bill (KT) · a refund pushed through the provider's
API (UQ-S12 records, the owner moves the money) · UPI AutoPay, mandates, subscriptions · UPI Lite,
credit-line-on-UPI and RuPay-credit-card-on-UPI as distinct tenders — they arrive as UPI and are recorded as
UPI · settlement-file reconciliation against the bank statement (RP, and only once a real statement exists) ·
a second merchant account or a second outlet · aggregator payouts (Swiggy, Zomato) · tips added at the QR ·
offline QR (UQ-S14: OF's emergency bill) · a scheduled function of any kind · storing the QR image ·
international/foreign-VPA payers · dynamic QR on the **kitchen** or **captain** app · **chargebacks** —
since 15 Feb 2025 a UPI chargeback is auto-accepted or auto-rejected on the beneficiary bank's TCC/RET,
so it arrives as a debit in the provider's dashboard with no screen and no state on our side · **any
surcharge, convenience fee or MDR passed to the guest**, which the NPCI framework forbids outright ·
**splitting a bill into sub-₹2,000 QRs to stay under the MDR threshold** — trivially buildable, deliberately
not built (UQ-S24) · signing the QR (`sign`), which needs an acquiring bank to upload our public key.

---

## External facts, verified

This is the block that decides whether the rest of the sheet is worth building. Everything here carries a
source. Anything I could not confirm from a source I could actually read is marked **UNVERIFIED** and must
not be treated as a fact — several of the loudest pages on these topics are AI-written SEO filler.

### The `upi://pay` payload (NPCI UPI Linking Specification v1.6, Nov 2017)

Text read from a mirror at `labnol.org/files/linking.pdf`; NPCI's own copy sits behind its member portal
and its public site serves a JavaScript shell, so **every NPCI-primary citation in this sheet is a mirror
or press report** (UNVERIFIED provenance, self-identifying document).

| Parameter | Dynamic-mode | What it is |
|---|---|---|
| `pa` | mandatory | payee VPA |
| `pn` | mandatory | payee name |
| `am` | **mandatory** | amount, decimal. **"If `am` is not present then field is editable"** |
| `mam` | conditional | minimum amount. **"If `mam` tag is not present or `mam=null` or `mam=` then amount field should NOT be editable"** |
| `tr` | **mandatory for merchant transactions and dynamic URL generation** | our reference: order number, bill id |
| `tn` | optional | short description the guest reads |
| `cu` | optional | **only `INR`** |
| `mc` | optional | merchant category code |
| `mode` | mandatory | 2 digits: `01` = QR, `02` = Secure QR, `04` = Intent |
| `orgid` | mandatory | 6 digits. **`000000` for a merchant-created intent or QR** |
| `sign` | mandatory | base64 `SHA256withRSA512` over everything before `&sign=` |
| `mid`/`msid`/`mtid` | optional, ≤20 | merchant / store / terminal, **echoed in all messages** for reconciliation |

Encoding: spaces are `%20` (RFC 3986 §2.1); a null is passed as null, never the string `"null"`.
**Max lengths for `pa`, `pn`, `am`, `tr`, `tn` are not given in v1.6 — UNVERIFIED.** A v1.7 exists and its
text was not retrieved, so those may since have been tightened.

**Three things that follow directly, and they shape the module:**

1. **Locking the amount is free.** Send `am` and no `mam` and the payer app must render the amount
   read-only. That is the whole "dynamic" in dynamic QR. Compliance sits in the payer's app, not in the
   NPCI switch, so **real-world behaviour across GPay / PhonePe / Paytm is UNVERIFIED without a device
   test** — which is why UQ-S2 exists rather than being designed away.
2. **A merchant generating its own QR is explicitly legitimate.** v1.6 §2.2: *"Developers who are
   developing merchant applications must generate a URL fully compliant to specification in previous
   section and then create a QR code of that URL."* §1.1's own worked example is a shop's PoS producing a
   dynamic QR with an amount and a bill number.
3. **We cannot sign it, and that is survivable.** `sign` needs an RSA key pair whose **public half is
   uploaded to UPI by an acquiring bank through the Manage VAE API**. There is no route to that without a
   bank relationship. An unsigned intent still works everywhere: per v1.6 §1.3 the payer app must warn
   *"source of intent could not be verified"* and ask for the passcode, and then proceed. A tampered
   signature is declined; an absent one is not. So `none` mode (UQ-S20) is a legal, working, slightly
   uglier QR — not a hack.

**Can `tr` be reconciled from a bank statement with no provider?** Spec-level, `tr` maps to `Txn→refId`
and v1.6 says every parameter must be carried into the online message, so it does reach the payee's PSP.
**Whether any Indian bank surfaces it on a retail current-account statement line is UNVERIFIED** — I found
no primary source either way, and what a narration reliably carries is the 12-digit RRN/UTR and the payer
VPA, not our bill id. Treat `tr` as a hope for reconciliation, never a plan.

**The confirmation is the product.** A deep link gives our server nothing: the payer's app talks to NPCI,
not to us. v1.6 §1.4 tells the *merchant app* to "check the final status with their server/PSP server",
which presupposes a PSP relationship. That is the whole reason a provider exists in this module.

### UPI rules that changed in 2025–2026

- **MDR is back, and it lands on 15 October 2026.** The Taxation and Other Laws (Amendment) Bill 2026
  (introduced 4 Aug, passed 10 Aug) amended **s.10A of the Payment and Settlement Systems Act 2007**,
  replacing the blanket zero-MDR prohibition with a power to notify which modes stay free. A Finance
  Ministry gazette notification of **14 Sep 2026** keeps RuPay debit and UPI **up to ₹2,000** free. NPCI's
  framework and FAQs of **15 Sep 2026** set **0.4 % on P2M UPI above ₹2,000, capped at ₹300** (the cap
  binds at ₹75,000), effective **15 Oct 2026**. The **merchant** pays; surcharging the guest is not
  permitted. Sources: prsindia.org bill track; inc42 on the gazette; BusinessToday and SCC Online on the
  NPCI FAQs; RBI publicly backed it (@RBI, 15 Sep 2026). A **PIL challenging both the notification and the
  framework was filed in the Supreme Court around 16 Sep 2026** (ANI), so this could still move.
  As recently as **June 2025** the Finance Ministry said there was no plan to levy MDR, so the position
  reversed inside fifteen months — **assume it can move again and keep it out of any hard-coded number.**
- **Small merchants are exempt, and a restaurant will not stay small.** NPCI's **P2PM** category —
  inward UPI up to **₹1 lakh a month** — pays no MDR at any ticket size. Exceed it for **three consecutive
  months** and NPCI reclassifies to P2M. A single dine-in Bangalore outlet clears ₹1 lakh of UPI in a
  fortnight, so the exemption has roughly a three-month shelf life. (BusinessToday, 15 Sep 2026. The
  underlying NPCI circular defining P2PM and the ₹1 lakh figure is **UNVERIFIED**; the older widely-cited
  number was ₹50,000.)
- **Status-check polling was rate-limited in April 2025**, after three UPI outages were traced to
  status-call floods: the first `CheckTransaction` no earlier than **90 seconds** after the original
  transaction, at most **3 calls in the first two hours**, and a hard stop on connection-level errors.
  (inc42, Business Standard, MediaNama, TeamLease RegTech.) That limit binds the **PSP**, not us, but it is
  why R14 makes the webhook primary and the provider check a backstop rather than a loop — and why a
  provider status call inside the first 90 seconds may honestly answer "pending".
- **API response-time ceilings were cut on 16 June 2025**: pay 30s → **15s**, check-status 30s → **10s**,
  validate-address 15s → **10s** (BusinessToday, TeamLease RegTech). Our own timeouts should sit outside
  those, not inside them.
- **Broader NPCI API usage guidelines**, notified 21 May 2025, compliance 31 Jul 2025: non-customer-initiated
  requests must be rate-limited during peak hours **10:00–13:00 and 17:00–21:30** — which is dinner service.
  Balance enquiry capped at 50/app/customer/day. Non-compliance can suspend a PSP's onboarding.
- **Chargebacks auto-accept or auto-reject from 15 Feb 2025**, decided on the beneficiary bank's TCC/RET in
  the next settlement cycle (Business Standard). We have no chargeback module and no screen for one; a
  chargeback will simply appear as a debit the owner sees in the provider dashboard. Named in Out of scope.
- **Settlement cycles were split on 3 Nov 2025** (NPCI OC No. 222 FY 2025-26): authorised transactions now
  settle in **10 cycles a day between 09:00 and 21:00**, separated from dispute traffic. The primary PDF is
  a scanned image and **its contents are UNVERIFIED**; this is from press.
- **The 30 % third-party-app market-share cap** was extended to **31 Dec 2026**. **Whether it has been
  extended again or is being enforced as of Sep 2026 is UNVERIFIED — I found nothing dated 2026.**
  Relevant only in that PhonePe and Google Pay together hold over 85 % of the apps our guests will use.

### Refunds on a UPI P2M payment

A UPI refund is a **fresh credit that references the original**, not a card-style reversal, and it is
raised through the acquirer's or aggregator's refund API with the original transaction's details. The
identifier banks actually reconcile on is the **12-digit RRN/UTR**, not any id we generate
(HDFC's own explainer; xflowpay). NPCI has mandated merchant-acquiring entities to support pre-approved
online refunds, full or partial (TeamLease RegTech summary; **circular number and date UNVERIFIED**).
Vendor-published timings, so indicative not regulatory: merchant-initiated refunds **3–7 working days**,
occasionally 10; some acquirers sell an instant-refund product. RBI's turn-around-time framework is
generally cited as ~T+5 before compensation, **primary circular UNVERIFIED**.

**The consequence for `none` mode:** with no acquirer relationship there is no refund API, so the only way
back is a manual P2P transfer from the owner's own app. That is not a UPI refund — it carries its own RRN,
nets against nothing, and appears nowhere as a linked reversal. It is exactly why UQ-S12 records the refund
in our ledger and leaves the money movement to a human, and why a provider makes refunds honest.

### Settlement — what the restaurant sees the next morning

Two genuinely different worlds, and it decides how reports will ever be reconciled:

- **Own VPA into own current account (the `none` mode, and a bank-direct merchant account).** The
  beneficiary bank credits the account in the payment flow; there is no escrow. The morning statement has
  **one line per guest payment**, each with an RRN and a payer VPA, and **no bill number on any of them**.
- **Through an aggregator.** Money lands in the aggregator's RBI-regulated escrow and is credited net of
  fees, **no later than T+1 banking day** under the RBI Payment Aggregator Directions (**primary citation
  UNVERIFIED**; the sources are aggregator blogs paraphrasing it). The morning statement has **one
  consolidated credit** with a settlement id, and the per-bill breakdown lives in the aggregator's
  dashboard. Published defaults: Razorpay **T+2**, Cashfree **T+2** (instant from **0.30 %**),
  PhonePe **T+1**, Paytm **T+1** plus same-day / on-demand / real-time options.

Either way, **DC's UPI line reconciles against a document that is not the bank statement** — the
aggregator's report, or a statement with no bill ids. That is not something this module fixes, and it is
why UQ-S3's `overpaid` and UQ-S11's `unrecorded` matter more than they look: they are the two places our
number and the bank's number are allowed to differ, and both are written down.

### Provider comparison

Onboarding, pricing and API facts read from each vendor's own docs and pricing pages on 2026-09-17. No
account was created and no API was called.

*(Decided 2026-09-17: **Paytm**, for 0 %. The table is kept because the trade it records is the risk phase 7 has to measure.)*

| | **Razorpay** | **Cashfree** | **PhonePe PG** | **Paytm** | **Setu / PayU** |
|---|---|---|---|---|---|
| Self-serve for a proprietorship | ✓ PAN + 2 business docs, and **FSSAI is stated mandatory for the food industry** | ✓ PAN/Form 60 + 2 business docs | ✓ GST not needed below the threshold; proprietor's PAN works | ✓ staged: self-attested PAN + bank proof unlocks limited acceptance | Setu ✓ sandbox, prod needs approval; PayU ✓ docs |
| Activation | 1–3 days, **₹199 + tax KYC fee** | **~24 working hours**, ₹0 | "instant" claimed, **SLA UNVERIFIED** | "within seconds" on minimal KYC | Setu "2 hours to 2 days" |
| **Published UPI rate** | **2 % platform fee + 18 % GST** ≈ 2.36 %. MDR itself 0 % | **1.95 %** | 1.99 %, **currently free, no stated end date** | **0.00 %** on both turnover tiers | **UNVERIFIED for both** |
| New-merchant promo | 0 % for 90 days **or ₹5 lakh**, whichever first | 0 % up to **₹20 lakh GMV to 31 Mar 2027** | "limited period" | — | — |
| Per-bill dynamic QR | `POST /v1/payments/qr_codes`, `usage: single_use`, `fixed_amount: true`, `payment_amount` in **paise**, `close_by` (**min 2 minutes**), `notes` up to 15 pairs. **The exact shape this module wants.** | Create Order → Pay with `payment_method.upi.channel: "qrcode"`; the amount is bound to the order. A checkout flow bent into a QR | `/v3/qr/init` with `expiresIn` (the purpose-built till API, but it lives in the **offline/POS** doc track), or `UPI_QR` in Standard Checkout | `POST /paymentservices/qr/create`, returns `qrData` and a base64 image. **Expiry fixed at 10 minutes** | PayU has a literal **Print Invoice QR** API |
| Is it on the self-serve tier? | **⚠ QR Codes must be enabled by a POC or a Dashboard request** | apparently yes beyond KYC — **UNVERIFIED** | **⚠ UNVERIFIED** whether `/v3/qr/init` needs a POS agreement | **⚠ UNVERIFIED** | PayU needs a KAM to set a `DBQR` flag |
| Webhook signature | HMAC-SHA256 over the **raw body**, `X-Razorpay-Signature`. Docs say in so many words: *"Do not parse or cast the webhook request body"* | HMAC-SHA256 over `x-webhook-timestamp` **+** raw body, base64, `x-webhook-signature` | HMAC `x-phonepe-checksum-signature`, **or** `Authorization: SHA256(user:pass)` | `CHECKSUMHASH` via Paytm's own library; **exact construction UNVERIFIED — do not reimplement it** | UNVERIFIED |
| Retries | **exponential backoff for 24 h, then the webhook is auto-disabled** and must be re-enabled by hand | **3 retries at 2, 10 and 30 minutes**, configurable up to 10 | **unpublished** | **unpublished** | Decentro: "up to 3 times" |
| Duplicates | **at-least-once, explicitly**; dedupe on `x-razorpay-event-id` | at-least-once; dedupe on `x-idempotency-header` | *"possible for the same transaction webhook to trigger multiple times"*, **no dedupe key given** | UNVERIFIED | UNVERIFIED |
| Ordering | **explicitly not guaranteed** | UNVERIFIED | UNVERIFIED | UNVERIFIED | UNVERIFIED |
| Ack deadline | **5 s** | UNVERIFIED | **3–5 s** | UNVERIFIED | UNVERIFIED |
| Settlement | T+2 (instant on request, **fee not published**) | T+2, instant **from 0.30 %** | **T+1** | T+1, same-day, on-demand, real-time | UNVERIFIED |
| Refunds | partial ✓, 5–7 days, `speed: optimum` can be under 2 min; **refund fee ₹0** | partial ✓ | UNVERIFIED | partial ✓; **instant is enterprise-only** | UNVERIFIED |
| Static IP / allowlist | not required; they prefer signature validation | not required; HTTPS in production | **one URL per merchantId**, domain or sub-domain, not both | **port 443 only** | Decentro requires an allowlist at least in sandbox |
| Rate limits, QR count caps | **unpublished** everywhere | | | | |

**Bank-direct** (ICICI eazypay, HDFC SmartHub / developer portal, Axis API portal, Yes Bank) is a
relationship-manager path in every case — ICICI says outright *"contact your relationship manager or visit
the nearest branch"* and requires an ICICI current account, and Axis's UPI product page is behind a
sign-in wall. **Everything substantive about bank-direct pricing, webhooks and IP allowlisting is
UNVERIFIED**, and none of it is reachable in the time this module has. Not the v1 path.

### Firebase specifics that bite this design

1. **`req.rawBody` exists on `onRequest` and is what every signature must be computed over** — Firebase
   hands you a *parsed* `req.body`, and re-serialising it will not reproduce the bytes the provider signed.
   Razorpay's docs say do not parse. **`rawBody` is reported missing in the local emulator**
   (`firebase/firebase-tools` issue 1830) — so the emulator will lie to us about the one thing we most
   want to test. The design answer is R3 plus **fail closed**: no `rawBody`, no verification, `400`. The
   signed happy path is a unit test against a synthetic request object; the e2e asserts the refusal.
   Whether that emulator gap is still real in 2026 is the first thing phase 5 checks.
2. **Cold starts versus the ack deadline.** `min-instances: 0` on all 62 services is why this project costs
   nothing at rest (INFRASTRUCTURE §3), and a cold start can exceed Razorpay's 5 seconds. UQ-S25 is the
   answer: every path is idempotent, so a missed ack is a retry, not a lost payment, and the till's own
   provider check finishes the job anyway. Buying a warm instance for this one function is a cost decision
   and a Review row, not a default.
3. **The URL is fine.** A Cloud Functions HTTPS URL is on port 443 and satisfies Razorpay's 80/443 rule,
   Paytm's 443-only rule and PhonePe's valid-HTTPS rule. PhonePe allowlists **a domain, one per
   merchantId** — if that check also pins a resolved IP, Cloud Run's addresses rotate; **UNVERIFIED and
   worth asking before committing to PhonePe.**
4. **`max-instances: 10` is shared.** The webhook endpoint is public and unauthenticated by design, so it
   is the one door an outsider can knock on. R3's refuse-before-any-read is what keeps a flood cheap: a
   forged request costs one HMAC and no Firestore read. The deploy script's `allUsers`-invoker loop
   (INFRASTRUCTURE §6) already does the right thing for an HTTP function; a bare full deploy silently
   dropping that invoker would take the webhook down, which is another reason never to run one.

---

## Decisions

| Date | Decision | Why |
|---|---|---|
| 2026-09-17 | UQ writes no payment row of its own; it calls PY's `takeAs()` (R6) | PY's sheet already says "UPI QR and card terminals are later modules that call `payments-take`; they do not replace it". One ledger, one set of money rules |
| 2026-09-17 | `take()` in `app/payments.ts` is split into `staffFor()` + `takeAs(ports, staff, req)`, with no behaviour change, and UQ calls `takeAs` | Exactly the move ST made when PY needed the PIN check: `pinGate()` was lifted out of `apply()`. A webhook has no session, so the alternative is either a fake session or a second implementation of the take |
| 2026-09-17 | The idempotency key is a **derived PY `paymentId`**, not a new dedupe collection (R2) | PY's R13 is already an exactly-once guard on a client-chosen document id. A second dedupe table would be a second answer to the same question |
| 2026-09-17 | One new collection only (`upiCollects`), no raw-event collection | The events we must keep fit in an array on the collect; the ones with no collect (UQ-S21) are an audit row, and the audit collection already exists |
| 2026-09-17 | Expiry is derived, never a status and never a sweeper (R5) | A scheduled function is a 63rd Cloud Run service, a new failure mode and a cost line, to compute a comparison two reads already do |
| 2026-09-17 | The actor is frozen on the collect (R7) | DC-S18 groups the day by `by`. A payment with no name in it is a payment no owner can ask about |
| 2026-09-17 | `none` is the default provider and a **working** mode (UQ-S20), not an off switch | The restaurant can run the whole module on day one with no merchant account, no KYC and no per-transaction cost, and the only thing missing is the automatic confirm. It also forces the adapter seam to be real from the first commit |
| 2026-09-17 | The provider call is outside the write transaction (UQ-S19, flow step 2) | Firestore retries a transaction body on contention. A retried `create QR` call is two QRs at the provider and a second one nobody will ever cancel |
| 2026-09-17 | Credentials in Secret Manager, not the config doc (R11) | "Config, not code" is about business numbers. A key that can move money is neither |
| 2026-09-17 | One global webhook secret in v1, not one per restaurant | TD row below. The first customer is one outlet with one merchant account (TD-018's assumption already), and per-restaurant secrets need a place to put them that is not Firestore |
| 2026-09-17 | v1 records a UPI refund but does not send one (UQ-S12) | An API key in our functions that can push money out is a different risk from one that can only read and create QRs. Review row |
| 2026-09-17 | The till polls our backend, never the provider (R14) | NPCI has tightened transaction-status API call rates on the provider side; a client polling a provider directly would also need a client-side credential |
| 2026-09-17 | The QR locks the amount with `am` and **no** `mam`, per the spec's own rule, and we write no guard for an edited amount (UQ-S2) | Locking is free and correct. A guard for a case the spec forbids and the provider refuses would be a fallback for a state the design makes impossible — and PY's part-payment path is the honest answer if it happens anyway |
| 2026-09-17 | `none` mode ships an **unsigned** intent, `orgid=000000`, and the till says so on screen (UQ-S20) | `sign` needs an acquiring bank to upload our public key through Manage VAE. There is no route to that without a merchant relationship, and an unsigned intent still works — the payer app asks for the passcode instead of skipping it |
| 2026-09-17 | We do not buy `minInstances: 1` for the webhook (UQ-S25) | A missed 5-second ack is a retry, and every path is idempotent by R2. It would be paying, at rest, every hour of every day, to win a race that UQ-S8's provider check already finishes |
| 2026-09-17 | The webhook **fails closed** when `req.rawBody` is absent | `rawBody` is reported missing in the Firebase emulator. Re-serialising `req.body` would reproduce different bytes and quietly verify a signature over something the provider never signed. Refusing is the only honest answer, and it makes the emulator gap visible instead of silently wrong |
| 2026-09-17 | Recorded, not designed around: **MDR returns on 15 Oct 2026** — 0.4 % above ₹2,000, ₹300 cap, merchant-borne, no surcharge allowed. P2PM under ₹1 lakh/month is exempt and a restaurant will not stay under it | It is a running cost on the restaurant's side, not a number this software computes, and the position reversed once already inside fifteen months (the Finance Ministry said "no plan" in June 2025). A PIL against it was filed in the Supreme Court around 16 Sep 2026. Nothing in the code encodes 0.4 % or ₹2,000 |
| 2026-09-17 | Out of scope is written before the code, not after | Contract: a scoping call that lives only in chat does not exist |
| 2026-09-17 | **Signed: the MDR is accepted and we never split a bill to dodge it** (UQ-1) | Two QRs of ₹1,075.50 instead of one of ₹2,151 pays ₹0 and is about five lines. It stays in Out of scope. Fee avoidance designed into a product is very hard to remove once a restaurant depends on it, and it is a regulator's problem waiting to happen. The pitch changes instead: UPI is still the cheapest tender in the building next to a card terminal's 1.5–2 % |
| 2026-09-17 | **Signed: the provider is Paytm, for 0 % on UPI** (UQ-2) | Chosen against this sheet's recommendation of Razorpay, and the reason is sound: ~2.36 % vs 0 % is roughly ₹21,000 a month on ₹9 lakh of UPI, which is a line item that can decide whether a restaurant buys the POS. What is given up is documentation — see the phase 7 note, which is now a gate, not a formality |
| 2026-09-17 | **Signed: phases 1–6 ship with `none` mode and no provider at all**; the Paytm adapter is phase 7, gated on a merchant account (UQ-2b) | The restaurant gets an exact-amount QR and a manual confirm on day one for ₹0, with no KYC and nobody to sign up with. Only the automatic confirm waits |
| 2026-09-17 | **Signed: a public webhook endpoint on the production project is accepted** (UQ-3) | With raw-body HMAC checked before anything is read, a constant-time compare, and the secret in Secret Manager. It is the first endpoint on `rms-app-dd875` that anyone on the internet can knock on; there is no version of automatic confirmation without one, and a forged request costs one hash and no Firestore read |
| 2026-09-17 | **Signed: a UPI refund is recorded here and moved by a human** (UQ-4) | Our backend never holds a credential that can send money out of the restaurant's account. Today the worst a leaked key does is create QRs and read their status. Cost, accepted: somebody has to remember every night, and no test catches a forgotten one. TD-027. Revisit when refunds happen more than once a week |
| 2026-09-17 | **Signed: the manual confirm escape hatch stays** (UQ-5) | It is the one place it is most tempting to cage, and caging it means the night the provider is down the restaurant cannot take UPI at all — most of its payments by count. The controls are all after the fact: a P0 audit row with the cashier's name, a mandatory typed reference, a PIN, and the provider's morning report that will not contain the payment. This is the strongest argument yet for TD-005, the agent that reads audit rows |
| 2026-09-17 | **Signed: both PY holes are fixed in their own commit, before any UQ code** (UQ-6) | If something breaks, it is then obvious what broke it. The double-payment hole is a live money bug today, with or without UQ |
| 2026-09-17 | **Signed: `qrcode` is approved as a new dependency in the till** (UQ-8) | MIT, no runtime dependencies, ~20 kB. The alternative is the same dependency on the server plus a round trip per bill |
| 2026-09-17 | **Signed: the QR shows on the till screen, not the guest's phone** (UQ-7) | Which is what every restaurant in Bangalore already does, and it needs nothing from the Flutter consumer app. Revisit if a customer asks |

## Known holes this module has to open in PY

Two, and both are real changes to a shipped, green module. Each gets a characterization test first.

1. **`canTake` refuses a captured take on a settled bill** (`domain/payments.ts`: `if (out <= config.settleWithin) return no('failed-precondition', 'Nothing outstanding')`). UQ-S4 needs that to be allowed **when `captured === true`**, producing a row of amount 0 with the whole sum as `overpaid`. Money that has already reached the bank cannot be refused — PY's own R6 says so for the overshoot case and simply never met the second-payment case. One condition, one scenario, and PY-S32 already gives the money back.
2. **`take()` needs a session.** Split into `staffFor` + `takeAs` (Decisions above).

Neither is a schema change and neither moves live data.

## Phase plan (each phase is one commit)

0. **This sheet.** `SPEC_UQ_upi_dynamic_qr.md` v1, then `/custom-fanout-consult` with the sheet and
   `CRITICAL_EXISTING_PIECES.md`: "what is missing, what breaks in production, what should be out of scope".
   No code. Ends when Shaurya signs *Review before sign-off*.
1. **Skeleton.** One `it()` per UQ-S id across `domain/upi.test.ts`, `app/upi.test.ts`,
   `test/e2e/suites/upi.js` and `frontend/till/e2e/upi.spec.ts`, each with a hand-computed paise value,
   body `todo`. Then, blind: an Opus subagent and `/custom-fanout-consult`, merged into Decisions one line
   each. `/moonshot-donor-review` fired in parallel at **"how does a POS take a QR payment it did not
   watch happen, and what does it do when the confirmation never arrives"** — the donor to read is Odoo
   `addons/point_of_sale/models/pos_payment_method.py:202-212, 230-240` (UPI/QR as a payment method with a
   validated account and a precomputed blank QR) and URY `ury/ury/api/payment_terminal.py:41-89` (the
   start/status/cancel contract, and a default that refuses honestly instead of faking approval).
2. **PY's two holes, first, on their own.** Characterization test on `take()` pinned before the
   `staffFor`/`takeAs` split; a failing test for the captured-take-on-a-settled-bill case proven red
   against today's `canTake`. Tests: `domain/payments.test.ts` "UQ-S4 a captured take on a settled bill is
   an overpay row", `app/payments.test.ts` "takeAs with an explicit actor writes the same row as take".
   `make check` green, PY's 272 unit and 45 e2e still green.
3. **`domain/upi.ts`.** Pure: `payload()` (the `upi://pay` string, with every parameter percent-encoded
   exactly once), `amountFor(outstanding, requested)`, `isLive(collect, now)`, `paymentIdFor(collect,
   providerPaymentId)`, `configFrom(raw)`. Table-driven tests, a fake clock, no network. Tests: UQ-S1,
   S2, S3, S5, S6, S20 domain halves, plus the payload's encoding cases (a payee name with a space, an
   amount of exactly 2151.00, a `tn` with an ampersand in it).
4. **`adapters/pay/none.ts` + `active.ts` + `adapters/firestore/upi.ts` + `app/upi.ts`.** `raise()`,
   `status()`, `confirm()`, `cancel()`, `onProviderEvent()`, all against a **fake adapter** and a fake
   clock, with fake Firestore ports the way `app/payments.test.ts` already does it. Every UQ-S id that is
   a state machine lands here: S4, S7, S8, S9, S10, S11, S16, S18, S19, S21, S22, S23.
5. **`api/upi.ts` and the webhook.** Three onCalls through `ErrorHandler`, plus the `onRequest` webhook:
   raw-body HMAC, `timingSafeEqual`, 400/200 only, no CORS. `index.js` gains a nested `exports.upi = {…}`
   group (flat keys crash at boot, INFRASTRUCTURE §6). e2e `suites/upi.js` drives the webhook over **real
   HTTP against the emulator** with a **replayed provider fixture** committed as a file, including a
   deliberately mis-signed copy for UQ-S17, a byte-identical duplicate for UQ-S18, and a delivery
   replayed after a simulated ack timeout for UQ-S25. Proven red by
   planting a signature check that always passes.
6. **The till.** `frontend/till/src/features/upi/` — `useUpi.ts` (raise, poll, confirm, cancel) and
   `QrPanel.tsx` inside the existing tender screen, plus the morning "unrecorded" line. Playwright
   `upi.spec.ts` for UQ-S1 (routed server), UQ-S5 (the QR leaves the screen at 300s on a fake clock),
   UQ-S9 (the manual confirm through the **one** PIN interceptor in `api/client.ts`, never a new prompt)
   UQ-S20 (the `none` mode banner) and UQ-S24 (the tender screen offers no surcharge field, and the
   UPI figure it shows is the gross).
7. **The Paytm adapter,** `adapters/pay/paytm.ts` — **only once a merchant account and sandbox exist**
   (signed 2026-09-17, UQ-2). Until then it is not written and not claimed as done.
   **Paytm publishes no webhook retry policy, no dedupe key and no ordering guarantee, and its checksum
   is "use our library".** Razorpay publishes all four. So this phase does not begin by trusting a
   contract that was never published — it begins by measuring one, in the sandbox, and writing the
   answers into this sheet:
   - does it retry a failed ack, how often, and for how long?
   - is there any id stable across retries to dedupe on? (R2 derives PY's `paymentId`; confirm what
     it can be derived *from*.)
   - can two callbacks arrive out of order?
   - what is the ack deadline?
   - does the merchant reference field round-trip to the callback? Without it the collect cannot be
     found without an index.
   If the answers are bad, the adapter is one file and one config key — which is the entire reason the
   seam exists. Razorpay stays the documented fallback and its contract is recorded above.

**Definition of done** applies to every phase: the scenario id named, the failing test written first and
proven red against the old code, `make check` green, e2e green where the emulator is touched, browser
sanity pasted for anything visible, `DEBT(TD-nnn)` rows filed, `STATE.md` updated, and the scenario id in
the commit message.

### Testing a provider we do not have an account with

- **The fake adapter is the default in every test.** `adapters/pay/fake.ts` implements the same three
  functions and is selected by `upi.provider: 'fake'` in the test seed. Everything from phase 4 runs on it.
- **The webhook is tested by replay.** One committed JSON fixture per event shape, signed in the test with
  the test secret, POSTed over real HTTP. That proves our parsing, our signature check, our idempotency and
  our error mapping. It proves nothing about whether the real provider sends that shape.
- **What cannot be known until a sandbox account exists**, and must not be guessed in the sheet or the code:
  the exact JSON of the callback and the event names; the signature header name and whether the digest is
  over the raw body alone or over a timestamp concatenated with it; whether a per-transaction QR with an
  expiry and a webhook is on the self-serve tier or behind a sales call; whether the merchant's `notes` or
  `receipt` field round-trips to the callback (which is what lets us find the collect without an index);
  the real per-transaction cost, if any; the settlement cycle this particular merchant gets; whether a
  Cloud Functions HTTPS URL is accepted as a webhook target without an IP allowlist; and how long
  activation actually takes for a proprietorship restaurant. **Phase 7 exists so that all of that lands
  behind one file.**

## Open questions (owner: Shaurya)

- UQ-Q1 Is the restaurant's UPI account in the business's name with a GST number, or a proprietor's
  personal VPA? It decides whether a real merchant account is even available, and it is the first thing
  any provider asks.
- UQ-Q2 Does the first customer already take UPI today, and through what? Still worth knowing: a Paytm
  soundbox already on the counter means the merchant account exists and phase 7's onboarding risk mostly
  disappears. The provider question itself is closed (Paytm, UQ-2).
- UQ-Q3 Who at the restaurant would actually clear an `unrecorded` payment in the morning (R8)? If the
  answer is "nobody", the screen needs to be on the day-close path rather than a page somebody visits.

## Review — answered 2026-09-17

All nine calls were put to Shaurya and decided in one sitting. They are rows in **Decisions** above;
the questions as asked are in `DECISIONS_WAITING_2026-09-17.md` and the full record with costs is
`DECISIONS_2026-09-17.md`.

One went **against** this sheet's recommendation and is not to be re-opened on the grounds that the
sheet advised otherwise:

- **UQ-2, Paytm rather than Razorpay.** 0 % against ~2.36 % is roughly ₹21,000 a month on ₹9 lakh of
  UPI. What it costs is documentation, and phase 7 now carries the measurement gate that buys it back.

The three that cost money or cannot be undone — the MDR position, the public webhook endpoint, and
refund-by-hand — were all accepted as recommended. So was the manual confirm escape hatch, which is
the module's one deliberate theft vector and the clearest case yet for TD-005.

**Still owed before phase 1:** the donor review (Odoo `pos_payment_method.py`, URY
`payment_terminal.py`) and the fan-out. Neither has run.

## Debt this module files

Filed in `TECH_DEBT.md` on 2026-09-17, each traceable to the decision that created it.

| Row | What | Pri | From |
|---|---|---|---|
| TD-026 | One global webhook secret, not one per restaurant | P2 | UQ-9 |
| TD-027 | A UPI refund is recorded but not sent; a human moves the money | P2 | UQ-4 |
| TD-028 | Nobody is alerted about money with no bill row; it needs someone to open a screen | P1 | UQ-3, R8 |
| TD-029 | The signed-webhook happy path may be unprovable on the emulator (`rawBody`) | P2 | UQ-3 |
| TD-022 (existing) | An in-doubt external tender has no `pending` state. UQ makes it sharper, not different: the manual confirm is exactly the case that row describes | P2 | UQ-5 |


## Files

Donors for this concern: `DONORS.md` → Payments (Odoo `pos_payment_method.py:202-212`, `:230-240`; URY
`ury/ury/api/payment_terminal.py:41-89`). Read after building, per the contract.

```
backend/src-plattr/functions/
  domain/upi.ts                 payload(), amountFor(), isLive(), paymentIdFor(), configFrom(). Pure.
  app/upi.ts                    raise(), status(), confirm(), cancel(), onProviderEvent().
                                Calls domain, calls adapters/pay/active, calls app/payments takeAs().
  adapters/pay/active.ts        picks by upi.provider. Same function names, no factory, no registry.
  adapters/pay/none.ts          self-VPA payload only. create() → {payload}, confirms:false, status() → 'unknown'
  adapters/pay/fake.ts          tests only: deterministic ids, a settable next answer
  adapters/pay/<provider>.ts    phase 7. The ONLY file that imports the vendor's SDK or hits its URL
  adapters/firestore/upi.ts     collect reads and writes, inside the caller's transaction
  api/upi.ts                    onCall: upi-raise, upi-status, upi-confirm, upi-cancel (ErrorHandler door)
                                onRequest: upi-webhook — raw-body HMAC, timingSafeEqual, 200/400, no CORS
  index.js                      exports.upi = { raise, status, confirm, cancel, webhook }  (nested, INFRA §6)
  app/payments.ts               CHANGED: take() split into staffFor() + takeAs()
  domain/payments.ts            CHANGED: canTake allows a captured take on a settled bill (overpay row)
frontend/till/src/
  features/upi/useUpi.ts        raise, poll at upi.pollSeconds, confirm, cancel
  features/upi/QrPanel.tsx      inside the existing TenderScreen; draws payload as a QR
tests: domain/upi.test.ts · app/upi.test.ts · test/e2e/suites/upi.js +
       test/e2e/fixtures/upi/*.json · frontend/till/e2e/upi.spec.ts
```

**New dependency, flagged:** drawing a QR in the browser needs an encoder. `qrcode` (MIT, no runtime
dependencies, ~20 kB) is the boring choice and is a Review row, because the house rule is that no
dependency arrives without being asked for. The alternative is a server-rendered SVG, which is the same
dependency on the other side of the wire plus a round trip.

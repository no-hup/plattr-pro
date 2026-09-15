# PY · Payments

Status: **draft v2, fan-out merged, awaiting sign-off** (2026-09-15). Phase 1 of the PY plan (`reviews/2026-09-15-PY-plan.md`). Grok and Gemini reviewed v1 blind; Codex was out of quota. Shaurya signs the Review section before code.

**Job.** Take a finalised bill to paid. Record every act of money changing hands as its own row: tenders, a bill split by amount across several of them, change on cash, a refund against a credit note. Whether a bill is paid is a question the rows answer, and PY is the only module that answers it for a bill with anything to pay.

PY is the ledger, not the pipe. UPI QR and card terminals are later modules that call `payments-take`; they do not replace it.

## Who can do what

| Action | Captain (SERVER) | Cashier (MANAGER) | Owner (ADMIN) |
|---|---|---|---|
| See what a bill still owes | ✓ | ✓ | ✓ |
| Take a payment | – | ✓ | ✓ |
| Take a payment that clears the bill | – | ✓ | ✓ |
| Void a payment row | – | PIN, reason | PIN, reason |
| Refund against a credit note | – | PIN, reason | PIN, reason |
| Change tenders | – | – | ✓ (config doc) |

## Objects

**Payment** `restaurants/{id}/payments/{paymentId}`. One document per act of money moving. Append only: no field is ever edited except `void`, and no document is ever deleted.

| Field | What |
|---|---|
| `paymentId` | **the till generates it**, and it is the document id. A retry of the same tap carries the same id and lands on the same row (R13). Never an auto-id |
| `billId, cid` | the bill this is against; `cid` is the bill's correlation id, carried into every log line |
| `businessDate` | the restaurant's calendar day as a string, resolved **server-side** from config at write and then frozen. DC and RP group by this, never by a range over `at`. Service runs past midnight and close time is a config key; without this field, changing that key rewrites which day a 03:30 payment belongs to |
| `kind` | `take` or `refund`. Both carry a positive `amount`; the kind carries the sign |
| `tenderId` | an id from `payments.tenders[]`, frozen as typed |
| `tender` | snapshot of the whole tender row as it was used: `{label, kind, opensDrawer, needsRef}`. `kind` is `cash` or `external`. Turning `opensDrawer` off next month must not make last month's rows forget whether a drawer moved |
| `amount` | minor units, always positive. What the ledger counts against the bill |
| `tendered, change` | minor units, **cash only**, null on an external tender. `tendered − change === amount` |
| `overpaid` | minor units, **external only**, null on cash. Money that reached the bank beyond the outstanding (PY-S28). Not counted against the bill; reported so bank settlement reconciles |
| `at, by` | server time (never from the body) and the staff id from the session (never from the body) |
| `ref` | free string: card slip number, UPI reference. Required when the tender's `needsRef` is true |
| `creditNoteId` | required on `kind: 'refund'`, null on `take`. The BL credit note this money reverses |
| `reason, note, approverId` | on refunds and voids, reason from ST's list |
| `void` | `{at, by, reason, note}` or null. A voided row is excluded from every total and is never deleted |

**Bill fields PY writes** (on BL's `restaurants/{id}/bills/{billId}`, and only these): `status`, `paidTotal`, `paidAt`, `paidBy`. Nothing else on the bill is touched, ever.

**Credit note field PY writes** (on BL's credit-note document): `refundedTotal`, minor units, stamped inside the refund transaction. This is how R7's limit is enforced — by reading and writing one number on the note, never by querying the payment collection inside a transaction and hoping it is complete.

**Order field PY writes:** `order.paymentStatus`, the mirror (TD-010), **inside the same transaction** as the row and the bill.

**Derived, never a status:** `outstanding = payable − paidTotal`, where `paidTotal = Σ take.amount − Σ refund.amount` over non-void rows. `paidTotal` is a cache of net receipts recomputed on every write. Nothing may read `paidTotal === payable` and call it paid; after a refund those two disagree while the bill is correctly settled.

## Scenarios

Money in rupees for reading; every stored value is minor units. Bill 0417 throughout is BL-S1's: pizza ₹500 and a coke ₹80, taxable ₹580.00, CGST ₹14.50, SGST ₹14.50, **payable ₹609.00**.

| ID | Scene and what happens | Tag |
|---|---|---|
| PY-S1 | **Cash, exact.** 21:06, guest hands over ₹609. One `take` row: cash, amount 60900, tendered 60900, change 0. Outstanding 0, bill `paid`, drawer opens. Without this there is no payment at all. | Engine |
| PY-S2 | **Cash, change.** Guest hands ₹700 for the ₹609.00 bill. One row: amount 60900, tendered 70000, **change 9100**. The ledger records ₹609 taken, never ₹700. Without this the drawer counts ₹91 over on every ticket. | Engine |
| PY-S3 | **Split by amount.** Two friends. Card ₹400.00 first: outstanding 20900, bill still `issued`, order mirror `partially_paid`. Then cash ₹209.00: outstanding 0, bill `paid`. Two rows, both kept. | Engine |
| PY-S4 | **Split, change on the last one.** Card ₹500.00, then the second guest hands ₹200 cash against the remaining ₹109.00: amount 10900, tendered 20000, change 9100. Paid. Change is computed on the outstanding, not on the payable. | Engine |
| PY-S5 | **Card for more than the bill.** Cashier types ₹700 on the card tender for the ₹609.00 bill, with the terminal still in their hand. Refused, `invalid-argument`: the amount is chosen before the money moves, so it can still be corrected. Contrast PY-S28, where it already moved. | Engine |
| PY-S6 | **Second card overshoots.** ₹400.00 already on card, outstanding ₹209.00. Cashier types a second card row of ₹300.00. Refused, same reason as PY-S5. | Engine |
| PY-S7 | **Two tills, one last tender.** Both read outstanding ₹209.00 at 21:06, each with its own `paymentId`, and both send cash ₹209.00. The write transaction re-reads and re-decides: the first writes its row and settles the bill, the second is refused `failed-precondition` **"nothing outstanding"**. Never two rows, never ₹418 in the drawer. | Engine |
| PY-S8 | **Nothing to pay.** BL-S22 comped the table: bill 0419, payable ₹0.00. BL stamps it `paid` at issue with no payment row, which is the one case R3 lets another module write that field. A tender against it is refused. Without this the cashier is asked to take ₹0 from a guest already walking out. | Engine |
| PY-S9 | **Refund against a credit note.** Bill 0417 is paid ₹609.00. The coke was never served, so BL issues CN-0007 for ₹84.00. Cashier refunds ₹84.00 in cash: one `refund` row, amount 8400, `creditNoteId` CN-0007, PIN, reason "wrong dish". CN-0007's `refundedTotal` becomes 8400. `paidTotal` reads 52500, outstanding ₹84.00, so the bill is **not** `paid` — see PY-S30 for why that is right. | Engine |
| PY-S10 | **Refund bigger than the note.** Same CN-0007 of ₹84.00, cashier types ₹100. Refused, `failed-precondition`. A note may be refunded in one go or in parts summing to it, never past it. | Engine |
| PY-S11 | **Refund with no note.** Cashier tries to hand back ₹200 with nothing behind it. Refused, `invalid-argument`. BL decides what is owed back; PY only moves it. Without this the credit-note trail and the cash drawer stop agreeing. | Engine |
| PY-S12 | **Captain tries.** A SERVER-role device sends `payments-take`. 403, not a PIN box. The waiter walks to the till. | Engine |
| PY-S13 | **No bill yet.** Till sends a tender for a table whose draft was never issued. Refused, `failed-precondition`. Money is taken against a numbered bill or not at all. | Engine |
| PY-S14 | **Cancelled bill.** 0417 was cancelled under BL-S9 before anyone paid. A tender on it is refused. Its lines went back to the draft and 0418 will take the money. | Engine |
| PY-S15 | **Nobody asks for a downgrade.** No caller may set a settled bill back to `issued`. Only voiding or refunding an actual row moves it back, and each leaves its own trail (PY-S27). `updateOrderStatus` is not that path: it writes the order document, never the bill. | Engine |
| PY-S16 | **Wrong tender recorded.** Guest paid by card; cashier tapped Cash and recorded ₹209.00. Nothing is deleted. The row is voided with PIN and reason "wrong tender", which drops it out of every total, and the correct card row is added. Day close shows three rows and the truth. | Engine |
| PY-S17 | **Row write fails.** The Firestore write errors. No row, no bill stamp, no mirror, and the cashier sees "try again". Money and its record land together or not at all. | Engine |
| PY-S18 | **What the day took.** Owner closes at 23:30. PY answers with the day's non-void rows grouped by `tender.kind` and `businessDate`: cash ₹12,450.00, card ₹31,200.00, UPI ₹8,900.00, and ₹84.00 of cash refunds. Net cash movement ₹12,366.00. What the drawer *should* hold, including the opening float, is DC's arithmetic on top of these numbers. Without this, cash is counted against nothing. | Report |
| PY-S19 | **A new tender.** Owner adds a meal-voucher row to `payments.tenders` in Admin. The next request accepts `tenderId: 'sodexo'`. No deploy, no restart. | Config |
| PY-S20 | **Slip number.** The card tender has `needsRef: true`. A card row with no `ref` is refused; a cash row is never asked for one. | Engine |
| PY-S21 | **A paisa short.** Payable is ₹609.00 because BL already rounded it once. A cash tender of 60899 leaves ₹0.01 outstanding and the bill is not settled. PY never rounds a second time. Without this rule the two rounding steps disagree and the drawer is short a paisa a ticket. | Engine |
| PY-S22 | **Too many rows.** A runaway till retries into a loop. The eleventh **live take** is refused at `payments.maxTendersPerBill` (10). Voided rows do not count toward the cap, so ten mistaps can never freeze a bill the guest still needs to pay. | Config |
| PY-S23 | **Retry of a partial.** Cash ₹400.00 against the ₹609.00 bill commits, then the callable times out on the way back. The till retries with the **same `paymentId`**. Expected: still one row, `paidTotal` 40000, outstanding ₹209.00, status `issued`. Not a second row, not change ₹191, not settled. Without this the drawer is short ₹209 and nobody knows why. | Engine |
| PY-S24 | **Retry of the tender that clears it.** Cash ₹609.00 commits, response lost, till retries the same `paymentId`. Expected: the same row returned and success, not `failed-precondition`. A cashier told "already paid" voids the row and takes again, and the guest pays twice. | Engine |
| PY-S25 | **Credit note on a half-paid bill.** Card ₹400.00 is in, outstanding ₹209.00, and the coke was never served. BL is refused when it tries to issue CN-0007: a note may only be raised once outstanding is 0. Otherwise refunding ₹84 makes the guest owe ₹293 after we agreed we overcharged them. The floor either finishes collecting and then raises the note, or cancels the bill (PY-S14) and issues a new one. *(Invariant BL must enforce; see the note in their inbox.)* | Engine |
| PY-S26 | **Two tills, one note.** CN-0007 is ₹84.00. Both tills send a cash refund of ₹84.00. The transaction reads and stamps `refundedTotal` on the note: the first writes, the second is refused `failed-precondition`. `paidTotal` reads 52500, never 44100. | Engine |
| PY-S27 | **Void the row that settled it.** Cash ₹609.00, bill settled. Cashier voids it, PIN, reason "wrong tender". Expected: that row excluded, `paidTotal` 0, outstanding ₹609.00, status back to `issued`, mirror no longer `paid`. Then UPI ₹609.00 is accepted and the bill settles again. Day close: one voided cash row, one live UPI row, **₹0 cash movement**. Without this the bill is dead — marked paid, owing ₹609, and refusing every further tender. | Engine |
| PY-S28 | **UPI overpayment.** Guest scans the printed QR and types ₹650 for the ₹609.00 bill. The money is in the bank before the till hears about it. The row records amount 60900 and `overpaid` 4100; outstanding 0, bill settled. Day close's UPI receipts read ₹650.00 so bank settlement reconciles. Giving the ₹41 back is a credit note and a refund, the same path as everything else. Refusing the row would force the ledger to lie about money that has already moved. | Engine |
| PY-S29 | **Void twice, and void yesterday.** A row already carrying `void` is refused. A row whose `businessDate` DC has already closed is refused: the day's cash was counted and signed off. A void is not a cash-out — it corrects the record, it never opens the drawer or hands money back. That is PY-S9. | Engine |
| PY-S30 | **Refund leaves the bill owing.** After PY-S9, 0417's outstanding is ₹84.00 and its status is `issued`, not `paid`. That is deliberate: the guest is holding ₹84 of our money back, so the bill genuinely is not settled, and a replacement coke paid in cash is accepted against it. Status always follows outstanding, in both directions. | Engine |
| PY-S31 | **The till never sends a float.** Cashier types `608.995` into the amount pad. The till parses typed text to integer minor units or refuses; a third decimal never becomes a request. The body carries `60899`, an integer, or nothing at all. The server rejects any non-integer or negative amount. Without this, `8.49 × 100` in binary floating point is not `849`, and PY-S21 says one paisa matters. | Engine |

**Without this:** paid means a staff member tapped a button, nobody knows how much was taken or in what, the cash drawer is counted against nothing, and a credit note has no money behind it.

## Rules

- R1 A payment is an event, never a state. Rows append to `payments/`; nothing is edited or deleted. A mistake is a `void` flag with a reason, plus a correct row.
- R2 **Status follows outstanding, every write, both directions.** `outstanding = payable − paidTotal`. The transaction recomputes it from the live rows and stamps `status`: 0 or less → `paid`, above 0 → `issued`. A void or a refund that reopens outstanding downgrades the bill (PY-S27, PY-S30). It is not a one-way latch.
- R3 PY is the only writer of `bill.status = 'paid'` for any bill with `payable > 0`. BL may stamp it at issue **iff** `payable === 0` (PY-S8), because there is no payment to make and a ₹0 row would be a lie about money moving. Both compute the same `isSettled(payable, paidTotal)` from `domain/payments.ts`. There is no third writer.
- R4 No row, no money. The payment row, the bill stamp and the order mirror are **one transaction**. A mirror that can fail on its own leaves a bill the floor cannot see as paid, and the guest is asked to pay twice.
- R5 The outstanding is re-read and re-decided **inside** the write transaction. A decision taken on a stale read is never applied.
- R6 Excess depends on whether the money has moved yet. On **cash** it is `change`, handed back now. On an **external** tender chosen at the till it is refused, because the amount can still be corrected (PY-S5). On an external tender where the guest already sent the money it is `overpaid`: recorded, reported for bank reconciliation, not counted against the bill (PY-S28).
- R7 A refund exists only against a credit note, and refunds against one note may never sum past its total. The limit is enforced by reading and stamping `refundedTotal` on the note inside the transaction, never by querying the payment collection.
- R8 All money is integer minor units, **including on the wire**. The till parses typed text to an integer or refuses; the API accepts integers only and rounds nothing. The server computes `change`, `amount` and `overpaid` from the outstanding — a client-supplied triple only proves it is self-consistent, not that it matches the bill.
- R9 PY does no rounding of its own. BL rounded the payable once (its R7); a tender is compared against that number exactly.
- R10 A tender is `{id, kind}` where `kind` is `cash` or `external`. `cash` is the only kind that makes change or opens a drawer. Nothing in `domain/` contains a tender name, a currency symbol, or a country.
- R11 A SERVER-role account cannot take, refund or void. 403, not a PIN box (ST's R8).
- R12 PY changes no table and no line. Paying does not free a table.
- R13 **A retry is not a second payment.** `paymentId` comes from the till and is the document id. The transaction returns the existing row if that id is already there, so the same tap repeated is one row and a success, never a duplicate and never "nothing outstanding" (PY-S23, PY-S24).
- R14 `businessDate` is resolved server-side at write and frozen on the row. `at` is server time. Neither is ever read from the request body.
- R15 A void is refused if the row is already void, or if DC has closed that `businessDate`. A void corrects the record; it never opens a drawer or returns money.
- R16 **No client writes.** Firestore rules deny every client write to `payments/` and to the bill's `status`, `paidTotal`, `paidAt`, `paidBy`. Without this, R3 is theatre: the till is an authenticated web app and could stamp a bill paid without a ledger row.

## Config keys (on `restaurants/{id}/config/settings`, field `payments`, with defaults)

| Key | Default | Used by |
|---|---|---|
| `payments.tenders[]` | `[{id:'cash', label:'Cash', kind:'cash', opensDrawer:true, needsRef:false}, {id:'card', label:'Card', kind:'external', opensDrawer:false, needsRef:true}, {id:'upi', label:'UPI', kind:'external', opensDrawer:false, needsRef:true}]` | PY-S1, S19, S20 |
| `payments.maxTendersPerBill` | 10 | PY-S22 (live takes only) |

That is the whole list. `allowPartial`, `refundNeedsPin`, `voidNeedsPin`, `payments.reasons` and `cashRoundTo` were all dropped in the fan-out merge; see Decisions.

## Talks to

| Port | What crosses | If the other side is down |
|---|---|---|
| ← BL Billing | the issued bill: `billId`, `number`, `payable`, `status`, `cid` | no bill, no payment; the till shows "bill not issued yet" |
| ← BL Billing | a credit note: `creditNoteId`, its total, its `refundedTotal` | no note, no refund (R7) |
| ← ST Approvals | PIN and audit for refunds and voids | ST refuses, no row is written and no money moves |
| ← CF Config | tenders and the day boundary, read once per request | **a config read failure refuses the payment.** PY never guesses a tender: guessing `cash` is how a card payment is silently recorded as cash |
| ← DC Day close | whether a `businessDate` is closed | unknown means refuse the void (R15) |
| → BL Billing | `status`, `paidTotal`, `paidAt`, `paidBy` on the bill; `refundedTotal` on a credit note | in the same transaction as the row, so neither lands alone |
| → OR Orders | the mirror `order.paymentStatus` (TD-010), in the same transaction (R4) | the take fails. A refused tap is recoverable; a paid bill the floor cannot see is not |
| → DC / RP | non-void rows by `businessDate`, grouped by `tender.kind` | reports show "ledger unavailable", never zeros |
| → LG Logs | one JSON line per row with `cid`, `billId`, `kind`, `tenderId`, `amount`, `outstandingAfter` | never blocks |

## Decisions

| Date | Decision | Why |
|---|---|---|
| 2026-09-15 | A payment is a row, not a status. The old `paymentStatus` string is mirrored, never extended | It has no amount, no tender, no time and no refund. Extending it would mean putting money in a string |
| 2026-09-15 | `order.paymentStatus` keeps working for the Flutter apps: one mirrored line from PY's derived state. `partially_paid` finally becomes reachable | Shaurya's constraint |
| 2026-09-15 | Who may refund: MANAGER and ADMIN, PIN every time, reason from ST's list. SERVER 403 | Shaurya took the default. Money going out deserves the gate money staying in gets |
| 2026-09-15 | No rounding inside PY. No `cashRoundTo` key in v1 | Shaurya took the default. BL rounds the payable once (its R7). A second rounding step is how a drawer goes a paisa short a ticket |
| 2026-09-15 | Tenders are config rows, not an enum. `domain/` sees only `kind: cash \| external` | Change-making and opening a drawer are the only behaviours the maths cares about |
| 2026-09-15 | A refund requires a credit note (R7) | Otherwise the drawer and the tax documents disagree, and no document says why money left |
| 2026-09-15 | A wrong row is voided with a reason, never deleted or edited | Critical pieces §3. A compensating fake refund would corrupt R7's invariant |
| 2026-09-15 | Paying frees no table | OR owns table release when no open bill remains in the group, already a known blocker |
| 2026-09-15 | Tenders carry a frozen snapshot of the **whole** row, not just `{label, kind}` | Grok: `opensDrawer` and `needsRef` are behaviour. Turning `opensDrawer` off next month must not make last month's cash rows forget whether a drawer moved. Four fields, not an abstraction |
| 2026-09-15 | **Fan-out merge (Grok, Gemini; Codex out of quota).** Accepted from both, independently found: client-generated `paymentId` for idempotency (R13, PY-S23/S24); status derived every write instead of a one-way latch (R2, PY-S27/S30); the R3-vs-PY-S8 contradiction resolved as "PY owns paid for `payable > 0`, BL stamps `payable === 0` at issue"; `payments.allowPartial` dropped | Each is a real production sequence with a hand-computable value. Two reviewers reaching the first two blind is the strongest signal in the run |
| 2026-09-15 | Accepted (Grok): `businessDate` frozen server-side on the row (R14, PY-S18) | Service runs past midnight and close time is a config key. Grouping DC off a range over `at` means changing that key later rewrites which day a 03:30 payment belongs to, on the one dataset DC cannot rebuild. Clock skew between two tills does the same at 23:58. Cheap now, a migration after fifty restaurants |
| 2026-09-15 | Accepted (Grok): BL may not issue a credit note while outstanding > 0 (PY-S25) | R2's formula treats a note as cash leaving the drawer. On a half-paid bill, refunding ₹84 against outstanding ₹209 leaves the guest owing ₹293 after we agreed we overcharged them. The invariant is one precondition on BL's side; credit-note-as-tender is the alternative and is a schema change for a rarer case. Asked of BL in their inbox |
| 2026-09-15 | Accepted (Grok): `refundedTotal` stamped on the credit note inside the transaction (R7, PY-S26) | Querying a growing collection inside a transaction is the fragile version of R5. One number on one document is the Firestore-shaped answer |
| 2026-09-15 | Accepted (Grok): the order mirror moves **inside** the transaction (R4) | v1 said "never blocks" in Talks-to and "inside the caller's transaction" in Files. Both could not be true. The captain app reads that field, so a silent paid bill the floor cannot see is how a guest gets asked to pay twice and someone voids a real row to unstick it |
| 2026-09-15 | Accepted (Grok): integer minor units on the wire, server computes change (R8, PY-S31) | `8.49 × 100` in binary floating point is not `849`, and PY-S21 says one paisa matters. Diverges from ST, which sends rupees and rounds server-side — ST has shipped and its amounts are discounts, not drawer counts. Noted rather than retrofitted |
| 2026-09-15 | Accepted (Grok): no client writes to `payments/` or the bill's paid fields, in Firestore rules (R16) | The till is an authenticated web app. Without the rule, R3 is theatre |
| 2026-09-15 | Accepted (Grok): void refused if already void or if DC closed that `businessDate`; a void is not a cash-out (R15, PY-S29) | Two concurrent voids last-write-win the audit, and a void after close silently moves a counted day. Cashiers will reach for void to "give it back" because it is one document instead of two |
| 2026-09-15 | Accepted (Grok): `payments-void` gets its own export; the tender cap counts live takes only (PY-S22) | `voidRow()` existed in `app/` with no door. A cap counting voided rows means ten mistaps freeze a bill the guest still needs to pay |
| 2026-09-15 | Accepted (Grok): config read failure refuses the payment, never defaults a tender | v1's Talks-to row said both. Guessing `cash` is how a card payment is recorded as cash without anyone noticing |
| 2026-09-15 | Accepted (Grok): drop `refundNeedsPin`, `voidNeedsPin` and `payments.reasons` | PIN every time is the decision; a key that turns the gate off is a second policy. Reasons are ST's, so they are not a PY key |
| 2026-09-15 | Accepted (Gemini): a refund may be recorded on any tender, not cash only. **This reverses the v1 default Shaurya approved** | A ₹5,000 card payment refunded in cash empties the drawer for the night, for money that never came in as cash. Recording `tenderId: 'card'` documents that the cashier reversed it on the standalone EDC machine: bookkeeping, not a gateway integration, and it makes day close more correct because card refunds stop touching the drawer. Back in Review before sign-off as a must-decide |
| 2026-09-15 | Accepted (Gemini): external overpayment is recorded, not refused (R6, PY-S28) | Guests scan a printed UPI QR and type the amount. When ₹650 has already reached the bank against a ₹609 bill, refusing the row forces the ledger to lie and permanently breaks bank reconciliation. You cannot refuse money that has already moved. Kept distinct from PY-S5, where the terminal is still in the cashier's hand and the amount can still be corrected |
| 2026-09-15 | Rejected (Gemini): redesign PY so tenders work offline | Offline is OF's whole module, and BL does the same thing (BL-S20 is tagged "No (OF sheet)"). Callables plus R5 mean the till is online or it does not take money. Named in Out of scope rather than designed around |
| 2026-09-15 | Rejected (Gemini): drop `payments.maxTendersPerBill` as speculative | It is not a business rule about eleven cards, it is the runaway-loop guard ST already established (arch review item 5 capped till challenges at 10 for exactly this). Reframed to count live takes so it cannot freeze a bill |
| 2026-09-15 | Verified, and worse than Grok thought: Grok flagged at ~55% that the consumer QR app might already mark an order paid, which would be a double-take on night one. It cannot — `frontend/flutter_boilerplate/` contains no reference to `paymentStatus`, `'paid'` or `updateOrderStatus`. But the **captain** app does call `order-updateOrderStatus` (`platter_server/lib/network/api_constants.dart:10`), so a waiter tapping Complete still marks an order paid while the till is collecting | Right instinct, wrong actor. TD-010 moves from "fine to skip" to a must-decide in Review before sign-off |
| 2026-09-15 | Out of scope v1 (below) is written before the code, not after | Contract: a scoping call that lives only in chat does not exist |

## Out of scope

Gateway integrations of any kind, UPI QR and card terminals included (later modules; they call `payments-take`) · **offline tenders — OF must not queue `payments-take`; the till is online or it does not take money** · tips, including "keep the change", which is a DC variance · loyalty points, wallets and gift cards · cards on file · settlement and reconciliation files from an acquirer · foreign currency · one payment spread across two bills · deposits and advances taken before a bill exists · **un-voiding a row — a new correct row is the fix** · **applying a credit note as a tender** (PY-S25 takes the BL precondition instead) · cash drawer float and blind counts (DC) · split by lines (BL-S12) · printing the receipt (KT) · `registerId` on the row: v1 assumes **one cash drawer per restaurant, which two screens may share**. A second drawer needs that field before data exists, so the assumption is named here rather than discovered later.

## Open questions (owner: Shaurya)

- PY-Q1 When an accountant is available: is BL's single round-off on the payable the whole story, or should cash be rounded to the rupee separately from card? Default shipped is the single round-off (R9). One config key and one scenario if it changes, and it changes what the drawer should hold.
- PY-Q2 Is "one cash drawer per restaurant" true for the first customer? If two screens each have their own drawer, `registerId` has to go on the row before any data exists. Default: one drawer.

## Review before sign-off (Shaurya reads this section only)

| Call | Weight | Why it matters |
|---|---|---|
| **A refund may be recorded on the card/UPI tender, reversing the cash-only default you approved** | **must decide** | You said cash-only and the review changed my mind: a ₹5,000 card refund paid in cash empties the drawer for the night, for money that never arrived as cash. Recording the tender documents an EDC reversal the cashier does anyway. Say the word and it goes back to cash-only |
| A refund only exists against a credit note, and BL may not raise one until the bill is fully paid | **must decide** | Two rules holding each other up. Without the second, refunding ₹84 on a half-paid bill leaves the guest owing more than before we admitted the mistake. It also means a complaint mid-tender is "finish collecting, then refund", which the floor will push back on |
| An overpaid UPI is recorded, not refused (₹650 typed against a ₹609 bill) | **must decide** | Real money that reached the bank before the till heard about it. Recording it is the only way day close reconciles, but it means PY holds ₹41 nobody has asked for yet |
| The captain app can still mark an order paid while the till is collecting (TD-010) | **must decide** | I checked: the guest QR app cannot, but `platter_server` calls `order-updateOrderStatus` today. That is a genuine double-take path on night one, and it is the reason the mirror is a debt row rather than a design |
| No rounding inside PY: 60899 does not settle a ₹609.00 bill | **must decide** | Ship it wrong and every ticket is a paisa out. PY-Q1 is the same question for an accountant |
| Paying does not free the table | fine to skip | Matches OR's existing blocker rather than papering over it at the till |
| A mistyped row is voided with a PIN, and voiding the row that settled a bill reopens it | fine to skip | One more PIN prompt on a busy night, against a ledger nobody can quietly rewrite |
| Offline is OF's: no internet, no payment | fine to skip | Same call BL made (BL-S20). Worth knowing it means a dead ISP stops the till taking cash |

## Files
Donors for this concern: `DONORS.md` → Payments (to be added; Odoo `addons/point_of_sale/models/pos_payment.py` and `pos_payment_method.py` are not in the sparse set yet). Read after building, per the contract.

```
backend/src-plattr/functions/
  domain/payments.ts             outstanding(), isSettled(), changeFor(), overpaidFor(), canTake(), canRefund(),
                                 canVoid(). Pure, takes a bill-shaped object. BL imports isSettled() for PY-S8.
  app/payments.ts                take(), refund(), voidRow(), list(): role → config → domain →
                                 transaction(row + bill stamp + note stamp + order mirror)
  adapters/firestore/payments.ts rowByIdOrNull, appendRow, listRows, readBill, stampBill, stampNote,
                                 mirrorOrder, businessDateFor (all inside the caller's transaction)
  api/payments.ts                onCall wrappers: integers only, no rounding, call app, map errors.
                                 Exported as payments-take, payments-refund, payments-void, payments-list
firestore.rules                  deny all client writes to payments/ and bills/*.{status,paidTotal,paidAt,paidBy}
frontend/till/src/
  features/payments/TenderScreen.tsx
  features/payments/useTender.ts   generates paymentId, parses typed text to integer minor units
tests: domain/payments.test.ts · app/payments.test.ts · test/e2e/suites/payments.js · frontend/till/e2e/payments.spec.ts
```

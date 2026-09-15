# PY · Payments

Status: **draft v1, awaiting fan-out** (2026-09-15). Phase 1 of the PY plan (`reviews/2026-09-15-PY-plan.md`). Shaurya signs the Review section before code.

**Job.** Take a finalised bill to paid. Record every act of money changing hands as its own row: tenders, a bill split by amount across several of them, change on cash, a refund against a credit note. Paid is derived from the rows and stamped once, and nothing else in the system may set it.

PY is the ledger, not the pipe. UPI QR and card terminals are later modules that call `payments-take`; they do not replace it.

## Who can do what

| Action | Captain (SERVER) | Cashier (MANAGER) | Owner (ADMIN) |
|---|---|---|---|
| See what a bill still owes | ✓ | ✓ | ✓ |
| Take a payment | – | ✓ | ✓ |
| Take a payment that clears the bill | – | ✓ | ✓ |
| Void a payment row just recorded | – | PIN, reason | PIN, reason |
| Refund against a credit note | – | PIN, reason | PIN, reason |
| Change tenders, limits | – | – | ✓ (config doc) |

## Objects

**Payment** `restaurants/{id}/payments/{paymentId}`. One document per act of money moving. Append only: no field is ever edited except `void`, and no document is ever deleted.

| Field | What |
|---|---|
| `paymentId, billId, cid` | identity and provenance; `cid` is the bill's correlation id, carried into every log line |
| `kind` | `take` or `refund`. Both carry a positive `amount`; the kind carries the sign |
| `tenderId` | an id from `payments.tenders[]` on the config doc, frozen as typed |
| `tender` | snapshot of the tender row at the moment of payment: `{label, kind}` where `kind` is `cash` or `external`. Renaming a tender in Admin next month never rewrites this row |
| `amount` | minor units, always positive. What the ledger keeps and what day close counts |
| `tendered, change` | minor units, cash only, null on an external tender. `tendered − change === amount` |
| `at, by` | epoch ms, staff id from the session, never from the body |
| `ref` | free string: card slip number, UPI reference. Required when the tender's `needsRef` is true |
| `creditNoteId` | required on `kind: 'refund'`, null on `take`. The BL credit-note bill id this money reverses |
| `reason, note, approverId` | on refunds and voids, from ST's reason list |
| `void` | `{at, by, reason, note}` or null. A voided row is excluded from every total and is never deleted |

**Bill fields PY writes** (on BL's `restaurants/{id}/bills/{billId}`, and only these): `status` `issued → paid`, `paidTotal` (minor units, Σ take − Σ refund over non-void rows), `paidAt`, `paidBy`. Nothing else on the bill is touched, ever.

**Derived, never stored twice:** `outstanding = bill.payable − paidTotal`. It is recomputed from the rows inside every write transaction, never trusted from a previous read.

## Scenarios

Money in rupees for reading; every stored value is minor units. Bill 0417 throughout is BL-S1's: pizza ₹500 and a coke ₹80, taxable ₹580.00, CGST ₹14.50, SGST ₹14.50, **payable ₹609.00**.

| ID | Scene and what happens | Tag |
|---|---|---|
| PY-S1 | **Cash, exact.** 21:06, guest hands over ₹609. One `take` row: cash, amount 60900, tendered 60900, change 0. Outstanding 0, bill `paid`, drawer opens. Without this there is no payment at all. | Engine |
| PY-S2 | **Cash, change.** Guest hands ₹700 for the ₹609.00 bill. One row: amount 60900, tendered 70000, **change 9100**. The ledger records ₹609 taken, never ₹700. Without this the drawer counts ₹91 over on every ticket. | Engine |
| PY-S3 | **Split by amount.** Two friends. Card ₹400.00 first: outstanding 20900, bill still `issued`, order mirror `partially_paid`. Then cash ₹209.00: outstanding 0, bill `paid`. Two rows, both kept. | Engine |
| PY-S4 | **Split, change on the last one.** Card ₹500.00, then the second guest hands ₹200 cash against the remaining ₹109.00: amount 10900, tendered 20000, change 9100. Paid. Change is computed on the outstanding, not on the payable. | Engine |
| PY-S5 | **Card for more than the bill.** Cashier types ₹700 on the card tender for the ₹609.00 bill. Refused, `invalid-argument`. Change exists only where money physically comes back out of a drawer. | Engine |
| PY-S6 | **Second card overshoots.** ₹400.00 already on card, outstanding ₹209.00. Cashier types a second card row of ₹300.00. Refused. An external tender may never exceed the outstanding, not even when the first one did not. | Engine |
| PY-S7 | **Two tills, one last tender.** Both read outstanding ₹209.00 at 21:06 and both send cash ₹209.00. The write transaction re-reads and re-decides: the first writes its row and marks the bill paid, the second is refused `failed-precondition` "already paid". Never two rows, never ₹418 in the drawer. | Engine |
| PY-S8 | **Nothing to pay.** BL-S22 comped the table: bill 0419, payable ₹0.00. It is `paid` the moment BL issues it, with no payment row. A tender against it is refused. Without this the cashier is asked to take ₹0 from a guest who is already walking out. | Engine |
| PY-S9 | **Refund against a credit note.** Bill 0417 is paid ₹609.00. The coke was never served, so BL issues CN-0007 for ₹84.00. Cashier refunds ₹84.00 in cash: one `refund` row, amount 8400, `creditNoteId` CN-0007, PIN, reason "wrong dish". Bill 0417 stays `paid`; `paidTotal` reads 52500. The bill document is otherwise untouched. | Engine |
| PY-S10 | **Refund bigger than the note.** Same CN-0007 of ₹84.00, cashier types ₹100. Refused, `failed-precondition`. A note may be refunded in one go or in parts summing to it, never past it. | Engine |
| PY-S11 | **Refund with no note.** Cashier tries to hand back ₹200 with nothing behind it. Refused, `invalid-argument`. BL decides what is owed back; PY only moves it. Without this the credit-note trail and the cash drawer stop agreeing. | Engine |
| PY-S12 | **Captain tries.** A SERVER-role device sends `payments-take`. 403, not a PIN box. The waiter walks to the till. | Engine |
| PY-S13 | **No bill yet.** Till sends a tender for a table whose draft was never issued. Refused, `failed-precondition`. Money is taken against a numbered bill or not at all. | Engine |
| PY-S14 | **Cancelled bill.** 0417 was cancelled under BL-S9 before anyone paid. A tender on it is refused. Its lines went back to the draft and 0418 will take the money. | Engine |
| PY-S15 | **Paid is final.** 0417 is paid. Any call trying to move it back to `issued` is refused. `updateOrderStatus` is not that path: it writes the order document, never the bill. | Engine |
| PY-S16 | **Wrong tender recorded.** Guest paid by card; cashier tapped Cash and recorded ₹209.00. Nothing is deleted. The row is voided with PIN and reason "wrong tender", which drops it out of every total, and the correct card row is added. Day close shows three rows and the truth. | Engine |
| PY-S17 | **Row write fails.** The Firestore write of the payment row errors. The bill does not become paid, `paidTotal` does not move, and the cashier sees "try again". Money and its record land together or not at all. | Engine |
| PY-S18 | **Monday drawer.** Owner closes at 23:30. The ledger reads cash ₹12,450.00, card ₹31,200.00, UPI ₹8,900.00, and ₹84.00 of cash refunds. The drawer should hold the opening float plus ₹12,366.00. Card and UPI never touch it. Without this, cash is counted against nothing. | Report |
| PY-S19 | **A new tender.** Owner adds a meal-voucher row to `payments.tenders` in Admin. The next request accepts `tenderId: 'sodexo'`. No deploy, no restart. | Config |
| PY-S20 | **Slip number.** The card tender has `needsRef: true`. A card row with no `ref` is refused; a cash row is never asked for one. | Engine |
| PY-S21 | **A paisa short.** Payable is ₹609.00 because BL already rounded it once. A cash tender of ₹608.99 leaves ₹0.01 outstanding and the bill is not paid. PY never rounds a second time. Without this rule the two rounding steps disagree and the drawer is short a paisa a ticket. | Engine |
| PY-S22 | **Too many rows.** A guest insists on eleven separate cards. The eleventh is refused at `payments.maxTendersPerBill` (10). The cap is config, not code. | Config |

**Without this:** paid means a staff member tapped a button, nobody knows how much was taken or in what, the cash drawer is counted against nothing, and a credit note has no money behind it.

## Rules

- R1 A payment is an event, never a state. Rows append to `payments/`; nothing is edited or deleted. A mistake is a `void` flag with a reason, plus a correct row.
- R2 Paid is derived, then stamped. `outstanding = bill.payable − Σ(take) + Σ(refund)` over non-void rows. The transaction that takes outstanding to zero sets `status`, `paidTotal`, `paidAt`, `paidBy` in the same write.
- R3 `api/payments.ts` is the only writer of `bill.status = 'paid'` anywhere in the system.
- R4 No row, no money. The payment row and the bill update are one transaction (ST's R4).
- R5 The outstanding is re-read and re-decided **inside** the write transaction. A decision taken on a stale read is never applied.
- R6 An external tender may never exceed the outstanding. A cash tender may: the excess is `change`, and `amount` is what the ledger keeps.
- R7 A refund exists only against a credit note, and refunds against one note may never sum past its total.
- R8 All money is integer minor units. The till sends rupees as the cashier typed them; `api/` rounds to minor units once, at the edge, exactly as ST does.
- R9 PY does no rounding of its own. BL rounded the payable once (its R7); a tender is compared against that number exactly.
- R10 A tender is `{id, kind}` where `kind` is `cash` or `external`. `cash` is the only kind that makes change or opens a drawer. Nothing in `domain/` contains a tender name, a currency symbol, or a country.
- R11 A SERVER-role account cannot take or refund money. 403, not a PIN box (ST's R8).
- R12 PY changes no table, no line, and no order status beyond the one mirror field. Paying does not free a table.

## Config keys (on `restaurants/{id}/config/settings`, field `payments`, with defaults)

| Key | Default | Used by |
|---|---|---|
| `payments.tenders[]` | `[{id:'cash', label:'Cash', kind:'cash', opensDrawer:true, needsRef:false}, {id:'card', label:'Card', kind:'external', opensDrawer:false, needsRef:true}, {id:'upi', label:'UPI', kind:'external', opensDrawer:false, needsRef:true}]` | PY-S1, S19, S20 |
| `payments.allowPartial` | true | PY-S3 |
| `payments.refundNeedsPin` | true | PY-S9 |
| `payments.voidNeedsPin` | true | PY-S16 |
| `payments.maxTendersPerBill` | 10 | PY-S22 |
| `payments.reasons` | reuses `approvals.reasons` | PY-S9, S16 |

`payments.cashRoundTo` is deliberately **not** a key in v1. See Decisions and the Review section.

## Talks to

| Port | What crosses | If the other side is down |
|---|---|---|
| ← BL Billing | the issued bill: `billId`, `number`, `payable`, `status`, `cid` | no bill, no payment; the till shows "bill not issued yet" |
| ← BL Billing | a credit note: `creditNoteId`, its total | no note, no refund (R7) |
| ← ST Approvals | PIN and audit for refunds and voids | ST refuses, no row is written and no money moves |
| ← CF Config | the keys above, read once per request | defaults apply for tenders; a config read failure refuses the payment, it never guesses a tender |
| → BL Billing | `status: 'paid'`, `paidTotal`, `paidAt`, `paidBy` on the bill | the row is written and the stamp is not: the transaction fails, so neither happens |
| → OR Orders | the mirror: `order.paymentStatus` (TD-010) | mirror write failure is logged, never blocks the payment |
| → DC Day close | every row for the business day, grouped by tender | day close shows "ledger unavailable", never zeros |
| → RP Reports | the same rows by day and by staff | as above |
| → LG Logs | one JSON line per row with `cid`, `billId`, `kind`, `tenderId`, `amount`, `outstandingAfter` | never blocks |

## Decisions

| Date | Decision | Why |
|---|---|---|
| 2026-09-15 | A payment is a row, not a status. The old `paymentStatus` string is mirrored, never extended | It has no amount, no tender, no time and no refund. Extending it would mean putting money in a string |
| 2026-09-15 | `order.paymentStatus` keeps working for the Flutter apps: one mirrored line from PY's derived state. `partially_paid` finally becomes reachable | Shaurya's constraint. Only the admin app reads it, as a coloured chip |
| 2026-09-15 | The `paid` side effect stays in `updateOrderStatus.js:156` for now (TD-010) | Removing it touches an existing dir and needs a characterization test. Its own commit, once the till can take money; not while PY has no UI |
| 2026-09-15 | Who may refund: MANAGER and ADMIN, PIN every time, reason from ST's list. SERVER 403 | Shaurya took the default. Same gate as cancelling a bill; money going out deserves the gate money staying in gets |
| 2026-09-15 | No rounding inside PY. No `payments.cashRoundTo` key in v1 | Shaurya took the default. BL rounds the payable once (its R7). A second rounding step is how a drawer goes a paisa short a ticket. If an accountant asks for cash rounded differently from card, it is one key and one scenario, added then |
| 2026-09-15 | Refunds are cash only in v1 | Shaurya took the default. Reversing a card or UPI payment is the gateway modules' job and they do not exist. A card refund is handed over as cash and the row says so |
| 2026-09-15 | Tenders are config rows, not an enum. `domain/` sees only `kind: cash \| external` | Change-making and opening a drawer are the only behaviours the maths cares about. A new tender is a config edit (PY-S19), never a branch |
| 2026-09-15 | Overpayment is change on cash, refused on everything else | You cannot hand ₹91 back out of a card terminal. The asymmetry is physical, not a policy |
| 2026-09-15 | A refund requires a credit note (R7) | Otherwise the drawer and the tax documents disagree, and there is no document saying why money left |
| 2026-09-15 | A wrong row is voided with a reason, never deleted or edited | Critical pieces §3: nothing is ever deleted. The alternative, a compensating fake refund, would corrupt R7's invariant |
| 2026-09-15 | Paying frees no table | OR owns table release when no open bill remains in the group, and it is already a known blocker. Not smuggled in here |
| 2026-09-15 | A zero-payable bill is paid at issue, with no payment row (PY-S8) | A row of amount 0 is a lie about money moving. BL stamps it; PY refuses tenders against it |
| 2026-09-15 | Tenders carry a frozen `tender` snapshot, not just an id | CLAUDE.md's snapshot rule. Renaming "Card" to "Card (HDFC)" next month must not rewrite last month's ledger |
| 2026-09-15 | Out of scope v1 (below) is written before the code, not after | Contract: a scoping call that lives only in chat does not exist |

## Out of scope

Gateway integrations of any kind, UPI QR and card terminals included (later modules, they call `payments-take`) · tips and service-charge-as-tip · loyalty points, wallets and gift cards · cards on file · settlement and reconciliation files from an acquirer · foreign currency · one payment spread across two bills · deposits and advance payments taken before a bill exists · cash drawer float management and blind drawer counts (DC) · split by lines (BL-S12) · printing the receipt (KT).

## Open questions (owner: Shaurya)

All three from the plan page were closed on 2026-09-15 by taking the stated defaults; see Decisions.

- PY-Q1 When an accountant is available: should cash be rounded to the rupee separately from card, or is BL's single round-off on the payable the whole story? The default shipped is the single round-off (R9). A change here is one config key and one scenario, and it changes what the drawer should hold.

## Review before sign-off (Shaurya reads this section only)

| Call | Weight | Why it matters |
|---|---|---|
| A refund only exists against a credit note. No free-standing "give them their money back" | **must decide** | It is the rule that keeps the drawer and the tax documents agreeing, and it is also the one a cashier will fight on a busy night when a guest wants ₹100 back and nobody wants to issue a note |
| Refunds are cash only in v1, so a card payment is refunded in cash | **must decide** | Real money, real asymmetry. It is the honest option while no gateway exists, but it means cash leaves the drawer for money that never entered it |
| No rounding inside PY (PY-S21): ₹608.99 does not clear a ₹609.00 bill | **must decide** | Ship it wrong and every ticket is a paisa out. PY-Q1 is the same question for an accountant |
| The old `paid` side effect stays in `updateOrderStatus` until the till ships (TD-010) | fine to skip | Two writers of the same idea for one release. Ugly, labelled, and reversible in one commit |
| Paying does not free the table | fine to skip | Matches OR's existing blocker rather than papering over it at the till |
| A mistyped row is voided with a PIN, not edited | fine to skip | One more PIN prompt on a busy night, against a ledger nobody can quietly rewrite |

## Files
Donors for this concern: `DONORS.md` → Payments (to be added; Odoo `addons/point_of_sale/models/pos_payment.py` and `pos_payment_method.py` are not in the sparse set yet). Read after building, per the contract.

```
backend/src-plattr/functions/
  domain/payments.ts             outstanding(), changeFor(), canTake(), canRefund(), nextStatus(). Pure, takes a bill-shaped object.
  app/payments.ts                take(), refund(), voidRow(), list(): role → config → domain → transaction(row + bill stamp) → mirror
  adapters/firestore/payments.ts appendRow, listRows, readBill, stampBill, mirrorOrder (all inside the caller's transaction)
  api/payments.ts                onCall wrappers: parse body, rupees → minor units, call app, map errors.
                                 Exported as payments-take, payments-refund, payments-list
frontend/till/src/
  features/payments/TenderScreen.tsx
  features/payments/useTender.ts
tests: domain/payments.test.ts · app/payments.test.ts · test/e2e/suites/payments.js · frontend/till/e2e/payments.spec.ts
```

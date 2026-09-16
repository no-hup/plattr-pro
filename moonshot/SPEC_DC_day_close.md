# DC · Day close & cash count

Status: **v2, built** (2026-09-16), session `plattr-pro-f8`. Unit 110 (domain 60, app 50) plus 5 added to PY for the R6 gate, e2e `suites/dayclose.js` 49/49, `journey.mjs` 52/52 with the close on the end, Playwright 3/3, `make check` 28 suites 730 green. Shaurya answered the four handoff questions before any code. Three blind reviews merged into Decisions: a donor review (Odoo `pos_session.py`, `pos_hr`, URY sub-till), Grok and Gemini on the v1 draft; Codex was out of quota. All three found the same close-versus-payment race and the same unbilled-floor hole, and those are the two biggest changes from v1.

**Job.** End a trading day. Put the cash that is in the drawer next to the cash the system says should be there, record the difference against the person who counted it, and freeze the day so nothing can ever be written to it again.

DC is the lid, not the ledger. PY owns every payment row and BL owns every bill; DC reads both, adds the money that belongs to no bill (the opening float, the ₹1,200 to the vegetable vendor), and writes one document per day.

## Who can do what

| Action | Captain (SERVER) | Cashier (MANAGER) | Owner (ADMIN) |
|---|---|---|---|
| See a day: takings by tender, movements | ✓ | ✓ | ✓ |
| See what the drawer *should* hold before the count | – | – if `blindCount` | – if `blindCount` |
| Record a drawer movement (float, cash in, cash out) | – | PIN, reason | PIN, reason |
| Void a drawer movement | – | PIN, reason | PIN, reason |
| Close the day | – | ✓ | ✓ |
| Close a day that is out by more than the threshold | – | PIN | PIN |
| Reopen a closed day | – | – | – (nobody, v1) |
| Change the thresholds or reasons | – | – | ✓ (config doc) |

## Objects

**Day close** `restaurants/{id}/dayClose/{businessDate}`. One document per business date, and **the date string is the document id** (`2026-09-16`). Written once, at close, with `create`. Absent means the day is open. This is the document PY already reads for its R15.

| Field | What |
|---|---|
| `businessDate` | the id again as a field, so a query can filter on it |
| `closed` | always `true`. **There is no `closed: false`.** A day that is not closed has no document. A second way to say "open" is the first thing a bad write turns into a closed day |
| `closedAt, closedBy` | server time and the staff id from the session. Never from the body |
| `openingFloat` | minor units. The change put into the drawer before the first sale: the sum of the date's non-void `float` movements |
| `expectedCash` | minor units. `openingFloat + cash taken − cash refunded + cash in − cash out` (R2). **Frozen at close**, because a closed day's payment rows can no longer move (R6), so the number can never restate |
| `countedCash` | minor units. What the person counting typed. One number, not a denomination breakdown |
| `difference` | `countedCash − expectedCash`, signed. Negative is short, positive is over. Never clamped, never made absolute |
| `byTender[]` | frozen snapshot of PY's day list: `[{tenderId, label, kind, taken, refunded, overpaid, count, net}]`, each row optionally carrying `counted` and its own `difference` when the closer typed the terminal's batch total. Card and UPI stay separate (PY's R19) so each reconciles against its own statement |
| `byStaff[]` | the same totals grouped by `by`. When the drawer is ₹800 short and two cashiers shared it, this is the only number that lets the owner ask the question |
| `movements[]` | frozen snapshot of the date's drawer movements, **including the voided ones**, the way BL freezes voided lines onto a bill. A day that shows two rows where three things happened is a day nobody can audit |
| `thresholds` | `{overShortP0Above}` as it was at close, so a row's severity stays explainable after the key changes |
| `leftInDrawer` | minor units, optional. What was left in the drawer for the morning after the bank bag was made up. `countedCash − leftInDrawer` is what went to the locker. Nothing is posted from it: tomorrow's float is still a movement somebody records, and this is the number the screen offers them |
| `note` | free text the closer types: "₹50 short, taxi fare to the bank" |

**Drawer movement** `restaurants/{id}/drawerMovements/{movementId}`. Append only: no field is ever edited except `void`, and no document is ever deleted. Money that moves through the drawer without a bill behind it.

| Field | What |
|---|---|
| `movementId` | **the till generates it**, and it is the document id. A retry of the same tap lands on the same row (R13) |
| `businessDate` | resolved **server-side** from `at` by `businessDateFor` in `domain/payments`, then frozen. The same function PY uses, imported, never re-written |
| `kind` | `float` (change put in before service), `in` (cash added mid-shift), `out` (cash taken out: a vendor, a bank drop) |
| `amount` | minor units, always positive. `kind` carries the sign |
| `reason` | one of `dayClose.reasons`, the same shape as ST's reason list |
| `note` | free text |
| `at, by` | server time and the staff id from the session, never from the body |
| `void` | `{at, by, reason, note}` or null. A voided movement drops out of `expectedCash` and is never deleted |

**Derived, never a field:** whether a day is open. It is the absence of the close document, asked once, and no module caches the answer.

## Scenarios

Money in rupees for reading; every stored value is minor units. The running day is 2026-09-16 at Meghana: opening float ₹2,000.00 at 11:00, cash taken ₹12,450.00, cash refunded ₹84.00, card ₹31,200.00, UPI ₹8,900.00, and ₹1,200.00 handed to the vegetable vendor at 18:40. **Expected cash = 2,000 + 12,450 − 84 − 1,200 = ₹13,166.00.**

| ID | Scene and what happens | Tag |
|---|---|---|
| DC-S1 | **The day adds up.** 23:30, the cashier counts the drawer and types ₹13,166.00. Expected ₹13,166.00, difference 0. One `dayClose/2026-09-16` document with `closed: true`, the count, the difference and a frozen copy of every tender and staff total. Without this there is no day close. | Engine |
| DC-S2 | **₹50 short.** Same day, counted ₹13,116.00. Difference **−5,000** minor units. The close **goes through** and records it, with an audit row naming the cashier. Refusing here means a cashier who is ₹50 short simply never closes, and the signal the whole module exists to produce disappears. | Engine |
| DC-S3 | **Over, not short.** Counted ₹13,216.00, difference **+5,000**. Recorded the same way. Over is a symptom too: change not handed back, or one ticket rung twice. Nothing is clamped to zero and nothing takes an absolute value. | Engine |
| DC-S4 | **Blind count.** `dayClose.blindCount` is true. The count screen shows the date, the card total and the UPI total, and **the server does not send `expectedCash` at all** until the day is closed. If the cashier can see ₹13,166.00 first, ₹13,166.00 is what they will type, and the day balances every night forever. Set the key false and the figure comes back. | Config |
| DC-S5 | **A bill is still issued.** Table 12's bill 0431 was printed at 22:40 and the guests are still arguing about who pays. At 23:30 the close is refused, `failed-precondition`, naming 0431 and its table. Settle it or cancel it, then close. Without this a day is signed off over money nobody collected. | Engine |
| DC-S6 | **Cash after the lid is on.** The day closed at 23:30. At 23:45 a new bill is issued and the cashier tries to take ₹400 cash. PY refuses: `failed-precondition`, "that day is closed". The drawer has been counted and signed; money landing on it afterwards makes the count a lie. The restaurant that is still serving at 23:45 should not have closed at 23:30. | Engine |
| DC-S7 | **Two managers, one Close button.** Both tap at 23:30. The first writes the document. The second gets `failed-precondition` "already closed at 23:30 by Priya" — never a second document, never a second count overwriting the first. The business date is the document id, so `create` refuses by construction. | Engine |
| DC-S8 | **The vegetable vendor.** 18:40, ₹1,200.00 out of the drawer, reason "vendor payment". It belongs to no bill and no tender, and cash counted at 23:00 does not reconcile without it. One movement row, one P1 audit row, expected cash falls by ₹1,200.00. | Engine |
| DC-S9 | **Opening float.** 11:00, the owner puts ₹2,000.00 of change in, kind `float`. Expected cash starts at ₹2,000.00, not at zero, and the close reports the float as its own line. Without this every single day reads ₹2,000.00 over. | Engine |
| DC-S10 | **A mistyped movement.** The cashier types ₹12,000 for the vendor instead of ₹1,200. Nothing is deleted. The row is voided with PIN and reason "wrong amount", which drops it out of expected cash, and a correct ₹1,200 row is added. The day shows three movements and the truth. | Engine |
| DC-S11 | **A movement on a closed day.** Refused, `failed-precondition`. Same reason as PY's void rule: that day's cash was counted and signed off. | Engine |
| DC-S12 | **Retry of a movement.** The vendor row commits and the callable times out on the way back. The till retries with the **same `movementId`**. Still one row, still ₹1,200.00 out. Without this the drawer reads ₹2,400 out and the day is ₹1,200 short for no reason anyone can find. | Engine |
| DC-S13 | **The ledger cannot be read.** PY's day list throws at 23:30. The close is refused with `unavailable` — never a close against zero takings. A day closed over an unreadable ledger records the entire drawer as an overage and then freezes it forever. | Engine |
| DC-S14 | **Card and UPI are counted, but not in the drawer.** Card ₹31,200.00 and UPI ₹8,900.00 are frozen onto the document by tender so each reconciles against its own statement. Neither moves `expectedCash` by a paisa: no card money is in the drawer. Without this a ₹31,200 card day reads ₹31,200 short and the cashier is accused. | Engine |
| DC-S15 | **Overpaid UPI.** A guest sent ₹650 for a ₹609.00 bill (PY-S28). The UPI row on the close reads `taken` ₹609.00 and `overpaid` ₹41.00 as two numbers; the bank statement reads ₹650.00 and reconciles. Expected cash is untouched. Without this the UPI line and the bank disagree by ₹41 and nobody knows which is right. | Engine |
| DC-S16 | **A voided payment.** A cash take of ₹609.00 was voided at 21:10 and re-taken on UPI (PY-S27). The day's cash takings exclude the voided row completely, so that ticket moves the drawer by ₹0.00 and the UPI line by ₹609.00. Without this the drawer reads ₹609 over. | Engine |
| DC-S17 | **The refund that left the drawer.** ₹84.00 of cash refunds against credit notes. Expected cash falls by ₹84.00. The same ₹84.00 refunded on the card tender instead moves the card line and leaves the drawer alone. What counts as drawer money is the frozen tender's `kind`, never its id. | Engine |
| DC-S18 | **Two cashiers, one drawer.** The day is ₹800 short. `byStaff` reads Priya ₹7,200.00 of cash and Ravi ₹5,250.00. It does not say who took the ₹800; it is the only number that lets the owner ask the question at all. | Report |
| DC-S19 | **A day nobody traded.** Monday, shut. No payments, no movements. Expected 0, counted 0, closes clean. Without this the owner cannot tell a shut Monday from a Monday somebody forgot to close. | Engine |
| DC-S20 | **Wrong hands.** A captain (SERVER) taps Close, or records a ₹1,200 cash-out. 403 both times. Counting the drawer is a cashier's job, and a captain who can move cash out of it without a PIN is the hole. | Engine |
| DC-S21 | **Last night, this morning.** At 00:20 on the 17th — still the 16th's business day, close hour 04:00 — the owner closes **2026-09-15**, forgotten the night before. Allowed: the date is an argument, not the clock. A day nobody closes simply stays open. | Engine |
| DC-S22 | **A day that has not happened.** Someone types 2026-09-20. Refused, `invalid-argument`. Closing a future date freezes a day before it trades and refuses every payment on it. | Engine |
| DC-S23 | **₹20 out is noise, ₹900 is a conversation.** A difference of −2,000 minor units writes a P1 audit row; −90,000 writes a **P0**. `dayClose.overShortP0Above` (default 10,000) is where the line sits, and the value in force is frozen onto the document so the row stays explainable after the key changes. | Config |
| DC-S24 | **Read it back.** The owner opens yesterday's close on the phone. It reads exactly as it was signed: the same expected, the same count, the same tender totals. Nothing is recomputed from live rows, because a recomputation of a closed day can only ever disagree with what somebody signed. | Report |
| DC-S25a | **Nobody is coming back for it.** Table 4's guests left at 23:10 without paying, so DC-S25's refusal has no bill to wait for. The way out already exists and needs no new engine code: comp the table 100 % with reason `walkout`, issue the ₹0 bill, which BL numbers and PY-S8 stamps `paid` by construction, and the close passes. What the owner gets is a numbered document per walkout rather than food that silently vanished, so "₹4,200 of walkouts in September" is a query. **Verified end to end on the emulator 2026-09-16** — and the same probe found that this route asked for no PIN and left no audit row at all, which was TD-019, now closed: the comp is a P0 audit row through ST's door, and the till has a Comp button that the one PIN interceptor handles. | Engine |
| DC-S25 | **The floor is still eating.** 23:30, table 4 has ₹1,500.00 of biryani sent to the kitchen and nobody has asked for the bill. There is no bill document yet, so DC-S5's check sees nothing. The close is refused anyway, naming table 4 and ₹1,500.00, because BL's lines for the date include one with no `billId` on it. Without this, a day closes clean over food that walks out of the door, which is the exact failure the served-but-unpaid bug already causes on the floor. | Engine |
| DC-S26 | **Priya counts while Ravi rings.** 23:28, Priya has ₹13,166.00 in her hands and taps Close at 23:32. At 23:30 Ravi took ₹500.00 cash on the other tablet. Expected reads ₹13,666.00 and Priya is ₹500.00 short with her name on it, for a payment she never touched. The close reads the ledger **inside** its own transaction and PY reads the close document **inside** its payment transaction, so one of the two aborts and retries. Whichever order they land in, the frozen figure and the drawer agree. | Engine |
| DC-S27 | **The close call times out.** The document is written, the tablet never hears back and the cashier taps Close again with the same ₹13,166.00. She gets the frozen document back and a success, not a red "already exists" at midnight. A second tap with a **different** figure is still refused, and the refusal carries what was frozen so the screen can show it. | Engine |
| DC-S28 | **Last night's meal, refunded at 12:30 today.** A guest comes back for ₹609.00 against a bill from the 16th, and the 16th is closed. It is **allowed**: the refund is a new row and R8 stamps it with today's date, so today's drawer falls by ₹609.00 and the 16th's signed document does not move a paisa. Only a *void*, which rewrites a row already counted, is refused. Without this, "closed is closed" would mean a guest can never be paid back for last night. | Engine |
| DC-S29 | **The extra zero.** 23:31 the cashier types 131660 instead of 13166 — ₹1,31,660.00 for a day that took ₹13,166.00. Difference +₹1,18,494.00, which is over the threshold, so the close asks for a PIN before it is written. It is still **recorded** if she means it (R4 does not bend), but the tap that freezes a fiction forever costs one more deliberate act. | Engine |
| DC-S30 | **Blind means blind.** `blindCount` is true and the count screen shows no cash figure **at all**: no expected, no opening float, no cash taken, no cash refunded, no movement amounts. Card and UPI stay visible — they are not in the drawer. Omitting only `expectedCash` while showing takings of ₹12,450.00, refunds of ₹84.00 and a float of ₹2,000.00 is an addition away from not being blind. | Config |
| DC-S31 | **The bank bag.** 23:40 Priya counts ₹13,166.00, puts ₹11,000.00 in the bag and leaves ₹2,166.00 for the morning. She types both. The close records counted ₹13,166.00 and left ₹2,166.00; the day's difference is still against the full ₹13,166.00. Next morning the float screen offers ₹2,166.00 and somebody confirms it as a `float` movement. Nothing is posted automatically — but without the number on the screen, the 17th opens ₹2,166.00 over. | Engine |
| DC-S32 | **Yesterday was never closed.** The 17th's count screen says so, because the 16th has no document. It does not refuse: a chain of days that each block the next is how a restaurant ends up unable to close anything ever again. It is a line on the screen and a field in the reply. | Report |

## Rules

- R1 A day is closed when `dayClose/{businessDate}` exists with `closed: true`. **Absent means open. Unreadable means unknown, and every caller refuses on unknown.** There is no `closed: false`.
- R2 `expectedCash = openingFloat + Σ cash takes − Σ cash refunds + Σ movements in − Σ movements out`, over non-void rows only. What counts as drawer money is `kind === 'cash'` on the payment's **frozen tender snapshot**, never the tender id, so renaming a tender next month cannot restate last month.
- R3 `difference = countedCash − expectedCash`. Signed, never clamped, never absolute. Short is negative.
- R4 A count that does not match is **recorded, not blocked** (Shaurya, 2026-09-16).
- R5 The close refuses while the floor is still live on that business date, which is **two** checks, not one: any bill issued on the date that still reads `issued`, **and** any placed line on the date that is not cancelled and carries no `billId` yet (DC-S25). Both come from BL's collections; settlement is never inferred from payment rows. Neither document carries a `businessDate`, so the date comes from `issuedAt` and `placedAt` through the same `businessDateFor` PY uses.
- R6 **Nothing may be written to a closed day**, and the date that matters is the one on the row being written, not the one on the bill behind it. A **take** and a **refund** are new rows stamped with today's date, so they are refused only when *today* is closed — last night's meal refunded at 12:30 today is allowed and lands on today's drawer (DC-S28). A **void** rewrites a row that has already been counted, so it is refused on *that row's* frozen date, which is PY's existing R15. A drawer movement is a new row and follows the take rule.
- R6a The gate is a read **inside the writing transaction**, never a check before it. DC's close reads the ledger, the movements, the bills and the lines inside its own transaction, and PY reads the close document inside its payment transaction. A query outside the transaction followed by a `create` is not a lock, and the money it loses is real (DC-S26).
- R7 MANAGER and ADMIN close a day and move cash (Shaurya, 2026-09-16). SERVER may read a day, never change it. Exactly ST's roles, no new one.
- R8 A movement's `businessDate` is resolved server-side at write from `at` and then frozen, by importing `businessDateFor` from `domain/payments`. Never read from the body, never re-implemented.
- R9 The close is written with `create` on a document whose id is the date. A second close is impossible by construction, not by a read-then-write check that two tills can both pass. A retry of the **same** count by the same person gets the frozen document back as a success (DC-S27); a different count is refused, and the refusal carries what was frozen.
- R10 The count is one number. Denominations are out of scope, and a total typed by a person who counted notes is the same total either way.
- R11 **A closed day is never reopened in v1** (Shaurya, 2026-09-16). A mistake is corrected on the next open day, never by rewriting a signed one.
- R12 A business date later than the current one is refused.
- R13 The till generates `movementId` and it is the document id, so a retry is the same row. Same rule and the same reason as PY's R13.
- R14 Blind count is a **server** rule, and it omits every cash figure, not just the total: while the day is open and `dayClose.blindCount` is true, no expected cash, no opening float, no cash-kind tender or staff total and no movement amount leaves the server. Card and UPI stay. A client that receives the numbers and hides them is not blind, and so is a client that receives the four numbers you add up to get it.
- R15 `domain/dayClose.ts` holds no rupee figure, no tender name, no country, no clock and no Firestore. It takes rows and returns arithmetic.
- R16 A drawer movement and a movement void each need a PIN and write a **P0** audit row — recording one is the act ST already calls "open the drawer with no sale", and ST decided that in its R2. The close itself needs no PIN unless the difference is over `overShortP0Above`, in which case it does (DC-S29). A close writes an audit row **only when there is a difference**: a clean close is already recorded by its own document, and a P1 row for every quiet night buries the noisy ones.
- R17 The close **freezes** `byTender`, `byStaff` and `movements` onto the document. RP reads the frozen copy.

## Config keys (on `restaurants/{id}/config/settings`, field `dayClose`, with defaults)

| Key | Default | Used by |
|---|---|---|
| `dayClose.blindCount` | `true` | DC-S4, R14 |
| `dayClose.overShortP0Above` | `10000` (₹100.00) | DC-S23, R16 |
| `dayClose.reasons` | `['opening float','vendor payment','bank drop','change in','tip payout','petty cash','correction']` | DC-S8, DC-S10 |
| `payments.dayCloseHour` / `dayCloseMinute` / `timezoneOffsetMinutes` | 4 / 0 / 330 | R8 — **PY's keys, read not copied** |

## Talks to

| Direction | What | If it is unavailable |
|---|---|---|
| ← PY Payments | the date's non-void rows grouped by tender and by staff (`payments-list` with a `businessDate`) | refuse the close, `unavailable` (DC-S13) |
| ← BL Billing | bills whose status is `issued` | refuse the close; a day that cannot prove its bills are settled is not closed |
| ← ST Approvals | `pinGate` for a movement void, `auditRow` for every write | ST's door, never a second one |
| → PY Payments | whether a `businessDate` is closed | absent = open, unreadable = unknown = refuse (R1) |
| → RP Reports | the frozen close document | reports read it; they never recompute a closed day |
| → KT Printing | nothing. The Z-report on paper is KT's | — |

## Decisions

| Date | Decision | Why |
|---|---|---|
| 2026-09-16 | Drawer movements get their **own append-only collection**, not an array on the close document (Shaurya) | The ₹1,200 leaves the drawer at 18:40, when no close document exists. An array means creating the day's document at the first movement, so `closed` has to be absent rather than false, and two tills adding movements at 18:40 contend on one document |
| 2026-09-16 | A short drawer is **recorded, never blocked** (Shaurya) | A cashier who is ₹50 short and cannot close simply does not close. The module exists to produce that number, so refusing to store it is self-defeating |
| 2026-09-16 | **MANAGER and ADMIN** may close (Shaurya) | ST's roles reused exactly. ADMIN-only would leave the manager on the late shift unable to close at 23:40, and the day open overnight |
| 2026-09-16 | **No reopen in v1** (Shaurya) | PY already refuses a void on a closed day. A reopen un-freezes counted cash that somebody signed for, and it means no day is ever final |
| 2026-09-16 | `expectedCash` is **frozen** onto the document, not recomputed on read | R6 makes a closed day's inputs immutable, so the frozen figure and a recomputation must agree — and on the one night they do not, the frozen one is what was signed |
| 2026-09-16 | The blind count is enforced **server-side** by omitting the field | A field sent and then hidden by the client is one devtools tab away from not being blind at all |
| 2026-09-16 | One close per **business date**, not per cashier shift | Shifts are a second axis (who was on the drawer at 18:00) and a second document. DC-S18's `byStaff` split gets most of the value for none of the schema |
| 2026-09-16 | The bill's business date is derived from `issuedAt` in the adapter, not stamped by BL | Asking BL to add a field is a schema change on a shipped module for one query. The issued set is small, so an un-dated query plus an in-memory filter is honest. If RP later wants bills by day, the field becomes worth it and it is BL's call |
| 2026-09-16 | `float` is a kind of its own, not just an `in` | The close reports "we started with ₹2,000" as its own line, and Odoo's session split (opening balance vs cash-in) says the same |
| 2026-09-16 | **R6 extends PY**: `canTake` and `canRefund` gain the closed-day gate PY only applied to voids | The handoff's job line is "a closed day can never be written to again". PY-S29 closed the void hole; a take at 23:45 on a day closed at 23:30 is the same hole with more money in it. Raised as a must-decide in Review because it changes a shipped module |
| 2026-09-16 | Out of scope below is written **before** the code | Contract: a scoping call that lives only in chat does not exist |
| 2026-09-16 | **Donor review merged** (`reviews/2026-09-16-donor-DC.md`, Odoo `pos_session.py` + `pos_hr` + URY, read blind before the sheet) | Eight MISSING items, triaged one line each below |
| 2026-09-16 | Accept (donor 1+2, Grok 5): the close records `leftInDrawer`, and `get` hands the next day `previousClose` so the morning float screen opens on last night's figure (DC-S31, DC-S32) | Odoo counts the drawer at open against a carried balance (`pos_session.py:1773-1789`, `:372-380`). A full opening session is a second state machine; the number on the screen is the 20 % that stops the 17th reading ₹2,166 over. Nothing is posted automatically — a human still records the float |
| 2026-09-16 | Accept (donor 3): `countedByTender` is optional on the close, and each tender row carries its own `counted` and `difference` (DC-S26 field, Objects) | `pos_session.py:718-755` counts the card batch too. Without it ₹450 of uncaptured card sales surfaces at the bank weeks later instead of that night. Optional, so a restaurant that does not reconcile its terminal sends nothing |
| 2026-09-16 | Push back (donor 4, offline money arriving after the close): PY's Out of scope already says the till is online or it does not take money | OF must not queue `payments-take`. When OF ships, this becomes OF's problem and this row is the pointer to it |
| 2026-09-16 | Accept as a scenario, no code (donor 5, Grok's (b) refinement): a refund today against last night's closed bill is **allowed** — DC-S28, R6 | It already works, because `businessDate` comes from the clock and not from the bill. It is exactly the thing a reader implements backwards, so it is a test rather than a hope |
| 2026-09-16 | Accept in weak form (donor 6, Grok 9): `get` reports that yesterday was never closed; it does **not** refuse (DC-S32) | Grok wanted D−1 open to block D's close. A chain where each day blocks the next is how a restaurant with one stuck bill can never close anything again. A line on the screen costs one document read |
| 2026-09-16 | Push back (donor 7, Grok: closing does not notify the other tablets) | There is no realtime channel in the till, and the second cashier is a MANAGER whose next take is refused with a plain message. Named in Review as part of the straggler risk rather than hidden |
| 2026-09-16 | Push back to DC-Q3, raised to a **must-decide** Review row (donor 8, Grok 10, Gemini): a per-cashier handover count | Three blind reviewers flagged it independently, which is the signal. It is a second document and a second arithmetic, and `byStaff` is genuinely not custody — so the honest move is to put it in front of Shaurya, not to quietly build it or quietly drop it |
| 2026-09-16 | **Accept, the biggest change from v1** (Grok 3, Gemini): R5 refuses the close while any placed line on the date has no `billId` yet, not only while a bill reads `issued` (DC-S25) | BL writes no draft document, so v1's check saw nothing at all for a table that is still eating. 23:30, ₹1,500 of biryani on table 4, close succeeds, food walks. Two reviewers found this blind and independently |
| 2026-09-16 | **Accept** (Grok 2, Gemini write-skew): R6a — the close reads the ledger inside its own transaction, and PY reads the close document inside its payment transaction (DC-S26) | Query-then-create is not a lock. Firestore tracks a read of a document that does not exist, so PY reading `dayClose/{date}` inside its transaction is the fence, and no new latch document is needed |
| 2026-09-16 | DC-S25's escape hatch is BL's 100 % comp, not a new "write off the table" action | Probed on the emulator before recommending it: preview payable 0, issue gives a numbered bill reading `paid`, the close then passes with difference 0. A second void-the-table path would duplicate what a comp already does and would make walkouts a second kind of record nobody could total. ST's default reason list already carries `guest left`, which is the walkout label, so no config change was needed either. The one real gap was the PIN and audit gate BL never wired — **TD-019**, raised P1 because DC-S25 pushes cashiers down this exact path, and closed the same day |
| 2026-09-16 | Shaurya, 2026-09-16: **one till and one cash drawer** per restaurant. TD-018. The in-transaction reads (R6a) stay anyway | The assumption is what lets the close be one document keyed by the date alone. The guard stays because one till is not one writer: the captain's app and a manager's phone already reach the same collections, and R6a costs nothing now it is built and tested |
| 2026-09-16 | Push back (Grok 1): no `armClose` middle state | It is a third day state and a second set of refusals across BL and PY. R6a closes the race it was invented for, and R5's line check stops the close landing while the floor is live, which is the other half. If a real restaurant still counts against a moving ledger, the latch is the next thing to build and this row is why |
| 2026-09-16 | Accept (Grok 14, Gemini): a close retried with the same count returns the frozen document as a success (R9, DC-S27) | The one write that cannot be undone had no retry rule while movements did. A red "already exists" at midnight is a support call about a day that closed fine |
| 2026-09-16 | Accept (Grok 11): blind omits **every** cash figure, not just the total (R14, DC-S30) | Takings ₹12,450, refunds ₹84 and a float ₹2,000 are one addition away from the number being hidden |
| 2026-09-16 | Accept (Grok 6, and ST's own R2): a drawer movement needs a PIN and writes P0 | Recording a cash-out **is** ST's "open the drawer with no sale", which ST already decided is PIN, P0. My v1 had it as no-PIN P1, which contradicted a shipped rule — and it left the ₹800 short coverable by the person holding the drawer |
| 2026-09-16 | Accept (Grok 8): a close whose difference is over the threshold asks for a PIN, and is still recorded (DC-S29) | R4 does not bend. The extra zero just costs one deliberate act instead of freezing a fiction on a single tap |
| 2026-09-16 | Accept (Grok 16): voided movements are frozen onto the close too | DC-S10 promised "three movements and the truth" while R17 froze two. One of the two had to move |
| 2026-09-16 | Push back (Grok 12, cash "keep the change"): PY's Out of scope puts tips here, and here they are a variance | Letting a cash take carry `overpaid` is a change to PY's row shape for a case DC-S3 already records. Added to the open questions instead |
| 2026-09-16 | Push back (Gemini): keep `overShortP0Above` | "Numbers are config" is the contract, ST already has severities, and the whole cost is one comparison |
| 2026-09-16 | Push back (Gemini): reopen stays out, because the case it is needed for is now blocked | Gemini's bricked till is a close taken while tables are seated. R5's line check refuses that close. What is left is a bill created after a legitimate close, which is TD-017 and a message, not a reopen |
| 2026-09-16 | Accept (Gemini): `tip payout` joins the default reasons | A server pulling ₹300 of card tips out of the drawer at 23:15 should not have to call it petty cash |
| 2026-09-16 | Logged as **TD-017** (Grok 7): BL will still issue a bill onto a closed business date, and PY then refuses the payment | Gating `billing-issue` means touching a third shipped module in this session. The bill is uncollectable until 04:00 and the cashier sees a clear refusal, so it is a debt row with a named fix, not a silent hole |

## Out of scope

Shifts and handovers within one day — one close per business date, `byStaff` is the split, and all three reviewers disagree (DC-Q3) · denomination breakdowns (₹500 × 12) · the Z-report and X-report on paper (KT) · sales, tax, item and hourly reports on the close document (RP) · **a second till or cash drawer — Shaurya confirmed one of each on 2026-09-16, logged as TD-018**; a `registerId` would have to go on payment rows, drawer movements and the close document before any data exists, because rows already written cannot be split by register afterwards · bank deposits tracked against a statement · petty cash as an account with a running balance carried day to day — a movement is a row, not a ledger · an automatic close by a scheduler at 04:00; a day nobody closes stays open, and DC-S21 closes it later · **reopening a closed day** · tips, including "keep the change" · releasing tables or orders at close (OR's) · a float **posted** into tomorrow automatically — the close records what was left in the drawer and the morning screen offers it, but a human still records the movement · an `armClose` latch or any third day state · gating BL's `billing-issue` on a closed date (TD-017).

## Open questions (owner: Shaurya)

- DC-Q1 Should a bill left `issued` for three days block *today's* close? Default shipped: no — only bills issued on the date being closed. The stale one shows up in RP instead.
- DC-Q2 Does the first customer count notes by denomination? Default: one typed total.
- DC-Q3 Two cashiers hand over the drawer at 18:00. Is the `byStaff` split enough, or does a handover need its own count and its own document? Default shipped: the split. **All three blind reviewers said the split is not enough**, so this is now a Review row rather than a quiet default.
- DC-Q4 "Keep the change": a guest pays ₹500 on a ₹470 bill and waves the ₹30 away. Today it lands as an unexplained ₹30 over. Letting a cash payment carry `overpaid` the way UPI already does would name it, at the cost of a change to PY's row shape.

## Review before sign-off (Shaurya reads this section only)

| Call | Weight | Why it matters |
|---|---|---|
| **A payment after the close is refused, and there is no reopen** | must decide | The sharp edge of "closed is closed", and the one thing the two outside reviewers split on. Gemini said build reopen in v1 or you brick the till; Grok said refuse, but only once the close cannot be taken while the floor is live. I took Grok's side and built that gate: R5 now refuses the close while any table still has unbilled food, which is the case Gemini was describing. What is left is a bill created *after* a legitimate close — a real straggler at 23:45 — and they cannot pay on the system until 04:00. TD-017 names the related hole: BL will still issue that bill |
| **A handover count when two cashiers share one drawer** | must decide | I left this out and all three blind reviewers put it back, independently. `byStaff` says who rang the sale up, not who was holding the drawer, so an ₹800 shortage at midnight still cannot be pinned on a shift. It is a second document and a second count. Say the word and it goes in; DC-Q3 is the question |
| **A drawer movement now needs a PIN** | fine to skip, but it is a change | ST already decided that opening the drawer with no sale is PIN, P0. My first draft had a cash-out as no-PIN, which both contradicted that and left the person holding the drawer able to explain away an ₹800 short. It means a PIN prompt on the ₹2,000 float every morning |
| **PY's `take` and `refund` gain the closed-day gate** | must decide | It changes a module that has shipped and is green, and it makes every payment depend on reading one more document — a Firestore problem on `dayClose/` would stop the till collecting, not just stop voids. Both reviewers said do it anyway. Without it R6 is a slogan: PY refuses a *void* on a closed day and happily accepts ₹400 of new cash onto it |
| A short drawer is recorded, never blocked | answered | Your call. It means the system will hold rows saying the cashier was ₹800 short, and doing something about that is a human job, not a refusal |
| The blind count is on by default | fine to skip | The cashier counts before seeing the target. It is the whole point, and it will feel like the machine does not trust them, because it does not |
| One close per business date, not per shift | fine to skip | Two cashiers sharing a drawer get two numbers (DC-S18) but one count. A real handover count is DC-Q3 |
| Expected cash is frozen, not recomputed | fine to skip | Yesterday's close always reads as it was signed, even if something upstream is later fixed |

## Files

Donors for this concern: `DONORS.md` → "Day close, shifts, cash count" (Odoo `addons/point_of_sale/models/pos_session.py` open/count/close/difference, `pos_hr` for the per-employee split). Read by the blind donor reviewer, per the contract, not by me.

```
backend/src-plattr/functions/
  domain/dayClose.ts             expectedCashFrom(), differenceOf(), severityOf(), canClose(),
                                 canMove(), canVoidMove(), configFrom(). Pure: rows in, arithmetic out.
  app/dayClose.ts                close(), get(), move(), voidMove(): role → config → domain →
                                 ONE transaction (close doc + audit), ports only.
  adapters/firestore/dayClose.ts closeDoc, movements by date, issued bills by date, PY's rows by date
  api/dayClose.ts                onCall wrappers, integers only. Exported as dayClose-close,
                                 dayClose-get, dayClose-move, dayClose-voidMove
firestore.rules                  UNCHANGED: the existing blanket `allow read, write: if false`
                                 already denies both collections to every client. The e2e suite proves it
                                 with an unsigned staff JWT rather than assuming it
frontend/till/src/
  features/dayclose/DayCloseScreen.tsx   blind count, then the difference
  features/dayclose/useDayClose.ts       parses typed text to integer minor units
tests: domain/dayClose.test.ts · app/dayClose.test.ts · test/e2e/suites/dayclose.js · frontend/till/e2e/dayclose.spec.ts
```

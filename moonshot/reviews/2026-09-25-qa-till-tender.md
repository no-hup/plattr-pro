# QA · till payment (tender) screen · 2026-09-25

Screen exploration ([AGENT_QA.md](../../AGENT_QA.md) §5), agent C, driver and observer in one session. Restaurant
`res_meghana`, emulator slot 3 (Firestore `127.0.0.1:8380`, functions `:5302`), till at
`http://127.0.0.1:5193/?r=res_meghana&bill=<billId>`, seed MockData7. One headless Chromium through Playwright.
Every state was made with [floorstate.mjs](../../backend/src-plattr/functions/test/e2e/qa/floorstate.mjs), which
calls the real endpoints. I added five states to it: `comped`, `cancelled`, `cancelpp`, `credited`, `onaccount`.
Each was run once on its own table before I used it.
Trajectory: [qa-till-tender-2026-09-25.jsonl](../../backend/src-plattr/functions/test/e2e/results/qa-till-tender-2026-09-25.jsonl)
(gitignored, like the earlier two). Screenshots: `/private/tmp/claude-501/-Users-shaurya-Desktop-dev-plattr-pro/3f613176-28cf-443a-a752-78de23bca6c4/scratchpad/qa-tender/shots/`
(scratchpad, outside the repo).

Helper env for every step below:
`cd backend/src-plattr/functions/test/e2e/qa && export FIRESTORE_EMULATOR_HOST=127.0.0.1:8380 PLATTR_BASE_URL=http://127.0.0.1:5302/rms-app-dd875/us-central1`.
"Clean re-seed" means `node mock/importMockData5.js --file=mock/MockData7ProductionMenus.json --clean --refresh-timestamps`
run from `backend/src-plattr/functions` with the same Firestore host. The dish is always Butter Naan ₹60: with the 5 %
service charge and 5 % GST the bill is **₹66.00** (60 + 3 + 3.15 = 66.15, rounded to 66.00).

## 1. Summary

I ran **48 cells**: **23 PASS, 10 FAIL, 15 NOTE**. Findings: 4 P1, 2 P2, 4 P3, no P0. The trajectory has 51 lines; 3 are marked SUPERSEDED (two early
reads and one tab that carried an earlier cell's state). Roughly 100 browser actions, with a login after every page
load (TD-052). Six clean re-seeds.

**The blocker: a credit note stops the day from closing, forever (QT-1).** Close the day is refused with "Bill 0001
… is still unpaid". Bill 0001 is the credit note itself. A credit note can't be paid and can't be cancelled. So the
first complaint of the night means the owner can never close that day. The refund against the note then adds a
second blocker (QT-2).

What held:
- **The money on every take is right.** Exact cash, change (₹100 → ₹34.00), cash + card split, a card over the bill
  refused and the corrected one accepted, UPI overpaid (₹4 recorded, not refused), tips on cash and card, a tip
  that swallows all the cash refused, a paisa-short take settling (PY-S21), on account with a tip (receivable ₹76).
- **Retries are safe.** A double-tap sends one request. After a lost answer, retyping the same amount gives "Already
  recorded" and one row. Two tills racing cash ₹40 + ₹40 on ₹66 give ₹40 and ₹26 with ₹14 change (PY-S33).
- **Voids and refunds hold their rules.** PIN every time. Void puts the bill back to owing, then UPI settles it
  again. Voiding an on-account take cancels the receivable. Refund on card when the guest paid cash is refused.
  A refund over the note is refused. Parts that add up to the note work. An overpay refund leaves the bill paid.
- **Roles hold.** SERVER and KITCHEN get "Not allowed", with no PIN box and nothing written.

What did not hold:
- A credit note blocks day close (QT-1). A refund against it reopens the bill, and the floor shows "₹63.00 due"
  (QT-2).
- One lost answer freezes every later payment in that browser tab, on every bill (QT-3).
- The refund form needs internal document ids that no screen shows, so a refund can't be done from the till (QT-4).
- After a refusal the screen keeps showing old numbers (QT-5). A cash refund says "DRAWER OPEN" but no drawer kick
  is queued (QT-6). The void reasons are the discount reasons (QT-7).

## 2. Findings (most severe first)

### QT-1 · A credit note stops the day from closing, forever · P1

**Scene.** 21:30, table 6 has paid ₹66 in cash. The guest says the naan was cold. The manager raises credit note
CN-0001 for ₹63. At 23:30 the owner taps Close the day. The screen says "Still on the floor: 1 unpaid bill(s)". The
bar says "Bill 0001 on tbl_meg_6 is still unpaid; settle or cancel it before closing". The table 6 bill is paid.
"Bill 0001" is the credit note. It can't be paid: the tender screen says "settled". It can't be cancelled either:
"a credit note is not cancelled". That day can never be closed.

**Steps** (clean re-seed):
1. `node floorstate.mjs 6 credited`. It prints the credit note id and `CN-0001 for ₹63.00`.
2. `node floorstate.mjs 3 settled`, so the day has one ordinary paid bill too.
3. Log in as `till@meg.test`. Open `?r=res_meghana&day=1`. Type the counted cash (₹132.00). Click `close-day`.

**Expected.** DC-S5 refuses the close only for "a bill still issued … money nobody collected". A credit note is money
going back to a guest, not money owed by one. With both bills paid, the day closes.

**Actual.**
- Screen: `Still on the floor: 1 unpaid bill(s), 0 item(s) not on a bill. The day cannot close yet.`
- `dayClose-close` answers `failed-precondition: Bill 0001 on tbl_meg_6 is still unpaid; settle or cancel it before closing`.
- Database: the credit note is a `bills/` document with `status: 'issued'`, `payable: -6300`, `creditNoteOf` set.
- `billing-cancel` on it answers `a credit note is not cancelled`.
- The message gives the bare number "0001". The day also has a paid bill A-0001, so the cashier looks at the wrong bill.

**Evidence.** Cells `dayclose:with-credit-note` (screen and API), `dayclose:after-payments` (it counted 2 credit notes
among "6 unpaid bills"). Screenshot `shots/dayclose_credit_note_only.png`. Observer check below.

**Where to look.** `adapters/firestore/dayClose.ts:39-41` `issuedQuery` takes every `status == 'issued'` bill.
`domain/billing.ts:221` gives a new credit note `status: 'issued'`. The comment at `dayClose.ts:43` says "the domain
drops … credit notes" for the other query. This one doesn't.

### QT-2 · A refund against a credit note puts the bill back to owing, on the till, the floor and the day close · P1 (spec conflict)

**Scene.** Same table 6. The cashier refunds the ₹63 in cash against CN-0001. The tender screen now reads
`payable ₹66.00 · paid ₹3.00 · outstanding ₹63.00 [issued]` and offers Take again. The floor tile reads
`6 ₹63.00 due` with a Walk-out button. The day close now names the original bill as unpaid as well ("(2 in all)").
The guest owes nothing: they paid ₹66 and got ₹63 back for a naan they sent back. The only ways to clear the tile are
to take ₹63 from the guest again, or to walk it out (a P0 "money abandoned" row).

**Steps** (clean re-seed): `node floorstate.mjs 6 credited`, note the bill and credit note ids. Open
`?bill=<billId>`. Type the **credit note document id** into `refund-note` (see QT-4), amount 63, tender Cash, reason
complaint, `refund`, PIN 1234. Open the floor. Open `?day=1`.

**Expected.** This is what [SPEC_PY](../SPEC_PY_payments.md) PY-S30 asks for, on purpose: "outstanding ₹84.00 and its
status is `issued` … a replacement coke paid in cash is accepted against it". But DC-S5 then refuses the close, and
the floor (FL R11/R14) treats it as open money. The sheets disagree about the most common refund there is: the dish
sent back and the guest leaving.

**Actual.** Bill `status issued`, `paidTotal 300`. Refund row 6300 cash, note `refundedTotal 6300`. Tile `₹63.00 due ·
Walk-out`. `dayClose-close`: `Bill 0003 on tbl_meg_6 is still unpaid … (2 in all)`.

**Evidence.** Cells `refund:by-doc-id`, `refund:rules`, `floor:after-payments`. Screenshots `shots/refund_by_doc_id.png`,
`shots/floor_after_payments.png`.

**Where to look.** `app/payments.ts` `state()`: `outstanding = payable − paidTotal` and never looks at the bill's
credit notes. That is PY-S30 as written.

### QT-3 · One lost answer freezes every later payment in that browser tab · P1

**Scene.** 21:40, the Wi-Fi blips as the cashier takes ₹30 cash on table 3. The screen says "No connection", but the
server did record the ₹30. The guest then hands over the full ₹66. The cashier types 66: "paymentId already used for a
different payment". They reload and log in again. The screen now says ₹30 paid, ₹36 outstanding. They type 36: the
same refusal. They go to table 6 and take ₹66: the same refusal. Every take on every bill fails until the tab is
closed. Nothing on the screen says why.

**Steps** (clean re-seed, `node floorstate.mjs 3 billed` and `… 6 billed`):
1. Open `?bill=<bill 3>`. Make the next `payments-take` answer get lost. In Playwright:
   `page.route('**/payments-take', async r => { await r.fetch(); await r.abort('failed') })`, once.
2. Cash 30, `take`. The bar says `No connection`. The database has the ₹30 row.
3. Cash 66, `take` → refused. Reload, log in, cash 36, `take` → refused.
4. In the same tab open `?bill=<bill 6>`. Cash 66, `take` → refused.

**Expected.** [SPEC_PY](../SPEC_PY_payments.md) decision 2026-09-15: "The till's job is to mint a new id when the
amount changes; the server refusing is the safety net behind that." Retyping the same amount must still reuse the id
(R13). That part works (cell `interrupt:lost-response-same-amount`).

**Actual.** `sessionStorage['till.paymentId']` stays `till-mug95ph4-wtvq04` through the new amount, the reload and
the next bill. Bill 3 ends with `paidTotal 3000` and can't take the rest. Bill 6 can't take anything. It only clears
when some write succeeds, such as a void or a refund.

**Evidence.** Cells `interrupt:lost-response-new-amount`, `interrupt:poisoned-id-next-bill`, and the SUPERSEDED
`interrupt:reload-mid-take` (bill 8 in the same tab, same stuck id). Screenshots `shots/interrupt_lost_new_amount.png`,
`shots/interrupt_poisoned_next_bill.png`.

**Where to look.** `frontend/till/src/features/payments/useTender.ts:36-46`. One `till.paymentId` key for every bill
and every amount, kept until a write succeeds. The server side is right: the observer check shows it refuses the reused id
exactly as the sheet says.

### QT-4 · The refund form asks for ids that no screen shows · P1

**Scene.** The cashier has credit note CN-0001 in hand, just printed. They type `CN-0001` into "credit note id":
"No such credit note". The tender screen lists no credit notes. Returning an overpaid UPI ₹4 needs the payment's
internal id (`till-mug9b7hm-vo9h88`), which appears nowhere on the screen either. So the cashier can't refund
anything from the till.

**Steps** (clean re-seed): `node floorstate.mjs 3 credited`. Open `?bill=<billId>`. Type `CN-0001` in `refund-note`,
63, Cash, complaint, `refund`.

**Expected.** PY-S9: the cashier refunds against the note. The note has to be something they can find.

**Actual.** `No such credit note`, and no PIN box. With the document id pasted from the database, the same refund
works. `payments-list` for the bill returns `billId, payable, paidTotal, outstanding, status, mirror, rows, tenders`,
with no credit notes. The bill document does carry `creditNotes: [{billId, number, at}]`.

**Evidence.** Cells `refund:by-printed-number`, `refund:by-doc-id`, `refund:overpay`, `look:credited` (settled, no
note shown).

**Where to look.** `TenderScreen.tsx:113-114` (two free-text id boxes). `app/payments.ts` `list()` (the bill view
returns no notes).

### QT-5 · After a refusal the tender screen keeps its old numbers · P2

**Scene.** Two tills have table 9's ₹66 bill open. Till A takes cash and settles it. Till B still shows
`outstanding ₹66.00 [issued]` with Take enabled. B takes UPI 66: "Nothing outstanding", and the screen still says
₹66 outstanding. The same happens when the bill is cancelled elsewhere: "Bill is cancelled" under `[issued]` with
Take enabled. In the race cell, B's own success showed `outstanding ₹26.00` while the bill was already paid. The
money is safe, because the server refuses. The cashier is told one thing by the bar and the opposite by the numbers,
and only a reload (and a login, TD-052) fixes it.

**Steps.** Two tabs on `?bill=<billed>`. Tab A: cash 66, `take`. Tab B: UPI 66 ref x, `take`.

**Expected.** PY-S7: B is refused. Then B shows what the server holds: settled.

**Evidence.** Cells `two-tills:second-after-settle`, `stale:cancelled-under-screen`, `two-tills:race-cash`.
Screenshot `shots/two_tills_stale_B.png`.

**Where to look.** `useTender.ts:72-78` `write()`: the `catch` returns null without `refresh()`. After a success,
`refresh()` can run before the other till's write commits.

### QT-6 · A cash refund says "DRAWER OPEN", but no drawer kick is queued · P2

**Scene.** The cashier refunds ₹63 in cash. The screen shows `DRAWER OPEN`. The drawer stays shut: no `drawer` job
was queued. To get the cash out they need a no-sale open, which is a second PIN and a P0 audit row, or the key.

**Steps.** As QT-2. Then read `restaurants/res_meghana/printJobs` for the refund's `paymentId`.

**Expected.** The screen and the drawer agree. KT-S17 names a drawer kick "after a cash take" only, so either the
refund kicks it too or the screen doesn't claim it (question 2 below).

**Actual.** Refund answer `opensDrawer: true`. Zero `printJobs` for the refund's id. One for a cash take on the next
bill.

**Evidence.** Cells `refund:by-doc-id`, `refund:rules` (`drawer: true`). Observer check.

**Where to look.** `app/payments.ts:241` returns `opensDrawer: tender.opensDrawer`. Unlike `take()` at `:174`,
`refund()` never calls `t.createPrintJob`.

### QT-7 · Void reasons are the discount reasons · P3

**Scene.** The cashier tapped Cash, but the guest paid by card. They open "void…" on the row. The choices are
placard, regular, complaint, birthday, guest left, staff meal, complimentary and other. They pick "other". Tomorrow
the owner reads `voidPayment · other` or `voidPayment · birthday`, which says nothing about what went wrong.

**Expected.** PY-S16 and PY-S27 use the reason "wrong tender". A void corrects a payment, so it needs payment words:
wrong tender, wrong amount, entered twice.

**Evidence.** Cell `void:reasons`, and every `look:*` cell with a row.

**Where to look.** `TenderScreen.tsx:105` uses the `reasons` from `approvals-config` (ST's discount list) for voids and
refunds alike.

### QT-8 · A refund with both id boxes empty says "No such payment row" · P3

The cashier refunds ₹10 on a part-paid bill and leaves both boxes empty. The bar says "No such payment row". They
meant a plain refund. PY-S11 refuses it, which is right, but the words should say a credit note is needed. The till
sends `refundsPaymentId: ''` (`TenderScreen.tsx:57`), and the server counts an empty string as naming a row
(`domain/payments.ts` `canRefund`, `!= null`). Cells `refund:no-note`, `cancelled-part-paid:give-back`.

### QT-9 · A SERVER or KITCHEN login is offered Take, Void and Refund · P3

The captain opens a bill link, sees the tender buttons, types 66 and presses Take. Only then do they get "Not allowed".
PY-S12 holds: no PIN box, nothing written. But the floor already hides Merge and Move from a SERVER (FL-S29), and this
screen could do the same. Cells `role:server`, `role:kitchen`. Screenshot `shots/role_server.png`.

### QT-10 · A bill link that doesn't exist says "Loading bill…" forever · P3

`?bill=no_such_bill_123`: the bar says "No bill issued for this table", and "Loading bill…" stays under it. Cell
`look:bogus`.

## 3. Known bugs that look worse from this screen (not re-reported)

- **QB-2 (part-paid cancel).** From the tender screen there is no recorded way to give the guest's ₹33 back. Refund
  is refused, because a credit note needs a paid bill and a cancelled bill has no credit note. The only exit is Void.
  But PY-S29 says a void "is not a cash-out". After the void the ledger says ₹0 cash while the drawer holds the ₹33.
  If the cashier hands it back, the drawer is right but no row says why. Cell `cancelled-part-paid:give-back`.
- **QB-16.** A cancelled bill that was never paid also reads `outstanding ₹66.00 [cancelled]` (cell
  `look:cancelled-unpaid`). The heading still shows the document id, not A-0002.
- **TD-052.** A login after every page load, including every reload in the interrupt cells.

## 4. Not bugs / by design

- **Blind count.** Day close shows UPI and card but no cash line, and no "drawer should hold". That's
  `blindCount`, on purpose.
- **Paisa short.** Cash ₹65.50 on ₹66 settles the bill (`settleWithin` 99, PY-S21). The drawer is 50 paise light, as
  the sheet decided.
- **Big change.** Typing 6600 (thinking in paise) on a ₹66 bill previews and records `change ₹6534.00`. The preview
  shows it before Take, so the cashier can see it. Cell `misuse:fat-finger-cash`.
- **Reload mid-take.** The in-flight ₹30 died with the reload, and the screen after login matched the database
  (₹66 outstanding).
- **A credit note opened as a bill** reads `payable ₹-63.00 · settled [paid]`, with nothing to take. Odd, but harmless.
- A take on a comped ₹0 bill is refused `Nothing outstanding` (PY-S8). The screen hides Take for comped and
  cancelled bills.
- `payments-take` on a cancelled bill is refused `Bill is cancelled` (PY-S14).

## 5. Unclear spec (questions for the owner)

1. **After a refund against a credit note, is the bill owing or done?** PY-S30 says owing (a replacement dish may be
   paid against it). DC-S5 and the floor then treat it as unpaid money. Suggested default: a refund that matches a
   credit note leaves the bill settled, and a replacement dish is a new round. (QT-2)
2. **Does a cash refund kick the drawer?** KT-S17 names takes only. Today the screen says it opens and it doesn't.
   (QT-6)
3. **Void reasons.** Should payments have their own short list (wrong tender, wrong amount, entered twice, other), or
   share ST's? (QT-7)
4. **A credit note for the whole dish keeps the service charge.** CN-0001 for the naan is ₹63.00 (₹60 + 5 % tax). The
   bill was ₹66. The ₹3 charge and its tax stay with the guest. Is that intended? This is BL's call, not PY's.

## 6. Suggestions from the cashier's chair

- **Credit notes on the bill.** Under the payments, one line per note: "CN-0001 ₹63.00 · refunded ₹0.00", and tapping
  it fills the refund form. Without this, no refund can be done from the till at all (QT-4).
- **Table and bill number at the top.** "Table 6 · Bill A-0003 · ₹66.00" instead of the document id. The cashier
  checks the bill they're taking money on against the paper.
- **Exact-amount button.** One tap fills the outstanding (₹66.00). Most tenders are exact. Without it, the cashier
  types every bill by hand at 21:00 on a Friday.

## 7. Coverage

Legend: P = PASS, F = FAIL (QT-n), N = NOTE, nb = not built, nt = not tried, — = hidden, as it should be.

**Take** (on a billed ₹66 bill unless named)

| cash exact | cash change | cash+card split | card over | UPI captured over | cash tip | card tip | tip = all cash | paisa short | on account + tip | 6600 typo | part-paid remainder |
|---|---|---|---|---|---|---|---|---|---|---|---|
| P | P | P | P | P | P | P | P | P | P | N | nt (seed state only) |

**Take in other states.** Settled: —. Comped: — (API refused, P). Cancelled: —. Cancelled part-paid: —. Stale
cancelled under the screen: F (QT-5). Credit note opened as a bill: — (N).

**Misuse**

| double-tap | lost answer, same amount | lost answer, new amount | next bill same tab | reload mid-take | two tills, one settles | two tills race | SERVER | KITCHEN | bogus link | staff session expired | offline |
|---|---|---|---|---|---|---|---|---|---|---|---|
| P | P | F (QT-3) | F (QT-3) | P | F (QT-5) | P (screen F QT-5) | P (F QT-9) | P (F QT-9) | F (QT-10) | nt | nt (OF's) |

**Void.** Settled cash then UPI: P. Wrong PIN then Cancel: P. On account: P. Cancelled part-paid: N (QB-2 worse).
Reasons: F (QT-7). Void twice / a closed day: nt (PY-S29/S35 are covered by `suites/payments.js`).

**Refund.** By printed number: F (QT-4). By document id: P (the outcome is QT-2). Card on a cash bill: P. Over the
note: P. In parts: P. Overpay back: P (needs an internal id, QT-4). Nothing named: F (QT-8). Drawer: F (QT-6).
Collect on account (`?account=1`): nt.

**After.** Floor: N (`₹63.00 due` after a refund, QT-2). Day close: F (QT-1, QT-2).

**Not tried:** a staff session expiring mid-screen, offline tenders (OF's screen), `?account=1` collection, voiding a
row on a closed day, a take that reaches `maxTendersPerBill`.

## Observer check

Re-run on a clean re-seed with backend calls only, no browser (`node floorstate.mjs 2 billed`, `3 billed`,
`6 credited`). Output kept in the scratchpad as `qa-tender/observer.out`.

- **QT-3: the server is right; the till is wrong.** `payments-take` with id X ₹30 → success. X ₹30 again → success,
  `retry: true`. X ₹66, X ₹36, and X on another bill → each `paymentId already used for a different payment`. A new
  id Y ₹36 → success, outstanding 0. So the fix is in the till: mint a new id when the bill or the amount changes.
- **QT-1 reproduced.** With the paid bills A-0001 and A-0002 and CN-0001, `dayClose-close` → `Bill 0001 on tbl_meg_6
  is still unpaid`. The note is `status issued, payable -6300`. `billing-cancel` on it → `a credit note is not
  cancelled`. `payments-list` for the original bill never mentions the note's id (QT-4).
- **QT-2 and QT-6 reproduced.** `payments-refund` ₹63 cash against CN-0001 → success, `outstanding 6300`,
  `opensDrawer: true`. Bill → `issued, paidTotal 300`. `printJobs` for the refund: 0. For a cash take right before: 1.
  `dayClose-close` → `Bill 0003 on tbl_meg_6 is still unpaid … (2 in all)`.
- QT-5, QT-7 to QT-10 were checked against the code (the lines above), not re-run.

## Parked for Shaurya

The finder doesn't fix. Each of these changes product code.

**QT-1 · credit note blocks day close.**
- Scene: a paid table gets a credit note. Close the day is refused forever, naming the note as an unpaid bill.
- Root cause: `adapters/firestore/dayClose.ts:39-41` `issuedQuery` matches `status == 'issued'`. BL creates notes
  as `issued` (`domain/billing.ts:221`).
- Fix: in `toFloor` (`dayClose.ts:54`), skip docs whose data has `creditNoteOf`. That is the same rule the
  `billsQuery` comment at `:43` already states. The other way is to create notes as `paid`. That touches every reader
  of a note's status (`canRefund` checks `note.status === 'cancelled'` only, so it's safe, but the BL tests pin
  `issued`). The filter is smaller.
- Touches: `floorOn` (`:84`, inside the close transaction) and the read at `:110` (the day-close screen's "unpaid
  bill(s)" count). Both go through `toFloor`.
- Test: e2e in `suites/` (dayclose): a paid bill plus a credit note → the close succeeds.
- Question: none, if QT-2's answer is "settled".

**QT-2 · a refunded credit note reopens the bill.**
- Scene: complaint, credit note, cash refund. The bill, the floor and the day close all say ₹63 owed.
- Root cause: PY-S30 as written. `app/payments.ts` `state()` ignores credit notes.
- Fix, if Shaurya picks "settled": outstanding = payable − Σ(credit note totals) − paidTotal. Read the bill's
  `creditNotes[]` totals inside the same transaction, as `refundedTotal` is already read. Rewrite PY-S9/S30 and
  their tests.
- Touches: `state()` and `stamp()` (take, refund, void, list), `mirrorFor`, the floor's due figure, and DC-S5.
  PY-S25's "fully paid" check must keep counting takes only.
- Question: 5.1 above. Must decide.

**QT-3 · a stuck payment id.**
- Scene: a lost answer, then a different amount, freezes every take in the tab.
- Root cause: `frontend/till/src/features/payments/useTender.ts:36-46`.
- Fix: store `{billId, endpoint, tenderId, amount, tendered, tip, id}` under the key. `currentPaymentId(body)` reuses
  the id only when the stored body matches, and mints a new one otherwise. Keep minting at the tap, so a reload
  mid-tender still resends the same id for the same body.
- Touches: `take` (`:86`) and `refund` (`:92`) only. `ReceivablesScreen.tsx:30` and `ReconcileScreen.tsx:32` already
  use `freshPaymentId()` or their own stored id.
- Test: Playwright, extending `payments.spec.ts` R13. Lost answer, new amount: accepted with a new id. Same amount:
  "Already recorded".
- Question: none.

**QT-4 · the refund form needs hidden ids.**
- Scene: the printed "CN-0001" is refused. No screen shows a note id or a payment id.
- Root cause: `TenderScreen.tsx:113-114` are free-text id boxes. `app/payments.ts` `list()` returns no credit notes.
- Fix: `list()` for a bill adds `creditNotes: [{billId, number, total, refundedTotal}]` from the bill's
  `creditNotes[]` plus each note's `refundedTotal`. TenderScreen shows them as a select. Rows with `overpaid > 0` get
  a "give back ₹4" choice that fills `refundsPaymentId`.
- Touches: `BillList` type, `adapters/firestore/payments.ts` (one more read per note), `useTender.ts` `BillState`.
- Question: none.

**QT-5 · a stale screen after a refusal.**
- Root cause: `useTender.ts:77` `catch { return null }`.
- Fix: in the catch, `refresh().catch(() => {})` on `failed-precondition`, so the numbers follow the refusal.
- Touches: take, refund and void in this hook only.
- Question: none.

**QT-6 · cash refund, drawer shown, no kick.**
- Root cause: `app/payments.ts` `refund()` (`:213-241`) has no `createPrintJob`, yet it returns `opensDrawer`.
- Fix, either way: (a) queue `printIds.drawer(paymentId)` as `take()` does at `:174`; or (b) return
  `opensDrawer: false` for refunds.
- Touches: `refund()`, KT-S17 wording, the PY-S9 Playwright spec (it may assert the drawer signal).
- Question: 5.2. Must decide.

**QT-7 · void reasons.**
- Root cause: `TenderScreen.tsx:105` and `:121` use ST's discount reasons.
- Fix: a `payments.voidReasons` config key with a default of `['wrong tender', 'wrong amount', 'entered twice',
  'other']`, served by `payments-list`. The server doesn't validate the reason against the list today (PY dropped
  `payments.reasons`), so this is display plus config.
- Touches: `app/config.ts` payments defaults, TenderScreen.
- Question: 5.3. Fine to skip.

**QT-8 · empty id boxes.**
- Fix: `TenderScreen.tsx:57` sends neither field when both are blank. The server then answers `Name exactly one of
  creditNoteId or refundsPaymentId`, or better, "a refund needs a credit note". `canRefund` could treat `''` as
  absent.
- Touches: only this form.
- Question: none.

**QT-9, QT-10** are display-only, and TenderScreen was out of agent D's scope today. Hide the tender, void and refund
controls when `role` is SERVER or KITCHEN (App already has `session.role`). Drop "Loading bill…" once the list call
has failed.

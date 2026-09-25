# Fix plan · the 31 QA findings of 2026-09-25

**For:** whoever fixes them, and Shaurya for the parked section. **Sources:**
[floor run](2026-09-25-qa-till-floor.md) (QF-1..15) and [bill screen run](2026-09-25-qa-bill-screen.md) (QB-1..16).
Paths below are under `backend/src-plattr/functions/` (backend) or `frontend/till/src/` (till) unless written in full.

## How the tests work

- Every backend-visible finding has a test that **fails today**, marked as a known bug (TESTING.md, "A known bug is
  marked"). The runs stay green and list the bug on every run. The day the bug is fixed, the test goes **red**:
  the fixer removes the mark in the same commit, and the test becomes a normal guard.
  - Jest: `knownBug(...)` = `test.failing` with `[known bug]` in the title. Swap `knownBug(` to `test(`.
  - e2e: `check(label, cond, actual, 'QF-1')` in [suites/qa-findings.js](../../backend/src-plattr/functions/test/e2e/suites/qa-findings.js).
    Drop the last argument. The runner prints `⚠ … known bug` with what came back, and `KNOWN …` in the summary.
- Unit tests: [test/unit/qa/billingFindings.test.js](../../backend/src-plattr/functions/test/unit/qa/billingFindings.test.js)
  and [test/unit/qa/floorFindings.test.js](../../backend/src-plattr/functions/test/unit/qa/floorFindings.test.js). They
  load the compiled `lib/`, so run `npm run build` before `npx jest`.
- Real-writer e2e: [suites/qa-findings.js](../../backend/src-plattr/functions/test/e2e/suites/qa-findings.js). It
  wipes `res_meghana`'s sittings, orders, lines, bills, carts, payments and audit rows, re-imports MockData7 on top
  of the database (no `--clean`), and seeds through the real endpoints. It uses the QA runs' own restaurant and
  prices, and reproduces their figures exactly.
- Each test was run once without its mark to prove it red. What it got is in the **Red today** column.
- **Already fixed** by agent D's display pass (Playwright tests in
  [frontend/till/e2e/qa-display.spec.ts](../../frontend/till/e2e/qa-display.spec.ts)): QF-8, QF-9, QF-10, QF-12,
  QF-13, QF-14, QF-15, QB-15.

## The 31 findings

Level: **B** = backend, **UI** = browser. Safe = can be applied without Shaurya (wording or display only, changes no
request). Everything marked **no** is in [Parked for Shaurya](#parked-for-shaurya).

| Id | P | Level | Test | Red today | Root cause | Proposed fix | Blast radius (callers grepped) | Safe |
|---|---|---|---|---|---|---|---|---|
| QF-1 | P0 | B | unit `QF-1 FL R9…`; e2e `QF-1` | e2e tile 7: `onTable 0, unpaid 6600`; unit: family's 6000 on no tile | `app/floor.ts:112` one sitting per table, last read wins; `adapters/firestore/floor.ts:147-154` keeps the walked-out sitting alive for its open money | Several sittings per table: draw the live one as the table's tile, and the walked-out money elsewhere (see QF-2) | `getFloor` only (`floor-get`, till `useFloor`). `openTable` has the same `find` on `tableIds` (`app/floor.ts:163`) | no |
| QF-2 | P1 | B + UI | none yet: the rule is undecided (spec conflict below) | — | `app/floor.ts:345` ends the session but leaves the bill `issued` and the lines unbilled, so R14 keeps the money on the tile | Depends on the decision | `floor-clear` from the till's Walk-out and the captain's Vacant (`table/table.js:1417`), `getFloor`, day close's open-money check | no |
| QF-3 | P1 | B | unit `QF-3` ×2 | both resolve (merge and move go through) | `domain/floor.ts:221` `canReceive` knows nothing of `ordering.takeawayTableIds` | Pass the takeaway ids into `canMerge` / `canMove` and refuse "P1 is a parcel counter" | `app/floor.ts:209, 294`; `setMerge` also backs the older `table-setMerge` (till only; no Dart caller found) | no |
| QF-4 | P1 | UI | browser, see agent B | — | `features/floor/FloorScreen.tsx:133` Confirm is `disabled={!ready \|\| floor.busy}`, not `floor.stale` | Add `\|\| floor.stale` | Confirm only | no (stops a request) |
| QF-5 | P1 | B | unit `QF-5` ×2 | `"this table has a printed bill — cancel it before moving the party"` for paid and part-paid | `domain/floor.ts:239` one message for every billed table | Paid: "this table's bill is paid — clear the table, then seat the party at the new one". Issued with money taken: "finish the payment first". Unpaid: FL-S24's "cancel the bill or finish tender first" | `canMove` only; the till shows `floor-msg` as sent | yes |
| QF-6 | P2 | B | e2e `QF-6` | `owed 12600` | `app/floor.ts:334, 360` owed = `onTable` (pre-tax) + `unpaid` (post-tax); the confirm text adds the same two (`FloorScreen.tsx:102`) | Price the unbilled part through billing's `compute` before the PIN and the P0 row | `clearTable` (till Walk-out, captain Vacant), ST `releaseUnpaid` amount | no |
| QF-7 | P2 | UI | browser, see agent B | — | `FloorScreen.tsx:55-65` two clicks in one tick both call `confirm()` before `busy` re-renders; the second answer ("part of another group") overwrites the first | A ref guard in `confirm`, and a "Merging 6 + 7…" line while busy | Confirm only | no (changes requests sent) |
| QF-8 | P2 | UI | `qa-display.spec.ts` | — | — | Fixed in `4d20c70` | — | done |
| QF-9 | P2 | UI | `qa-display.spec.ts` | — | — | Fixed in `f3ff215` | — | done |
| QF-10 | P2 | UI | `qa-display.spec.ts` | — | — | Fixed in `8b1e005` | — | done |
| QF-11 | P2 | B | browser, see agent B (the words are backend text; a unit test is one line if wanted) | — | `domain/floor.ts:215-216, 238` each refusal names a way out that another refusal closes | Billed group: "this group has an unpaid bill — settle it first". Group with food: "bill it first" (move is refused for groups anyway, FL-S12) | `canUnmerge`, `canMove` | yes |
| QF-12 | P2 | UI | `qa-display.spec.ts` | — | — | Fixed in `ccc9e35` | — | done |
| QF-13 | P3 | UI | `qa-display.spec.ts` | — | — | Fixed in `268c843` | — | done |
| QF-14 | P3 | UI | `qa-display.spec.ts` | — | — | Fixed in `fe7d01c` | — | done |
| QF-15 | P3 | UI | `qa-display.spec.ts` | — | — | Fixed in `f95083d` (numbered; dish names need a backend field, still open) | — | done |
| QB-1 | P0 | B | unit `QB-1`; e2e `QB-1` | unit 18900 + 54600 = 73500 < 84000; e2e 19800 + 57300 < 88200 | `app/billing.ts:69-74` every draft holding a line of the order takes the whole order offer; TD-016's clamp needs `targets`, and an ORDER offer ships none (`adapters/firestore/billing.ts:47`) | Depends on the decision (spec conflict below) | `compute` → `preview`, `issue`; the till's BillScreen and ReconcileScreen | no |
| QB-2 | P0 | B | unit `QB-2`; e2e `QB-2` | cancel answers `success · Cancelled` with 3300 taken | `app/billing.ts:184` and `domain/billing.ts:176` check only `status`, and PY keeps a part-paid bill `issued` | Refuse before the PIN while `paidTotal > 0`: "₹33.00 is already taken on bill 0006 — void or refund it first" | `billing-cancel` (till `useBill.cancel`); PY-S25's cancel-and-reissue path | no |
| QB-3 | P1 | B + UI | unit `QB-3` (the refusal's words); flow: browser, see agent B | `already issued bill_1`, no number | `app/billing.ts:149-150` the `taken` check runs over lines already on a bill, and names the bill by its id; Cancel exists only on the page that issued (`features/billing/BillScreen.tsx:79`) | Words: name the number (read the bill in the same transaction). Flow: decision | `issue` only; BillScreen, ReconcileScreen | words yes, flow no |
| QB-4 | P1 | B | unit `QB-4` | one `billDiscount` P0 row written | `app/billing.ts:133-141` ST's door writes the audit row before the transaction that refuses | Run the refusable checks (`taken`, `changed`) before `approve`, or write the row inside the issue transaction | `issue` with `discount` (the till's comp, BillScreen) | no |
| QB-5 | P1 | B + UI | unit `QB-5` | `payable 2100` | `domain/billing.ts:128-133` a flat charge is added after the 100 % discount; the success text is hard-coded (`BillScreen.tsx:29`) | Decision: does a comp take the packing too | `previewBody` → every bill with a flat charge | no |
| QB-6 | P1 | B + UI | unit `QB-6` | preview throws `discount exceeds bill` | Same as QB-1; and BillScreen draws nothing, not even Preview, when `bill` is null (`BillScreen.tsx:35`) | Falls out of the QB-1 decision; keep Preview drawn when there is no bill (display) | as QB-1 | no (the backend half) |
| QB-7 | P1 | B | unit `QB-7` | 0 audit rows | `app/billing.ts:115-175` `dropCharges` rides in the issue body and nothing records it | One P1 row in the issue transaction: action `dropCharge`, the type and amount, staff | `issue`; ST's audit reader (TD-005) | no |
| QB-8 | P2 | UI (+B) | browser, see agent B | — | `app/billing.ts:68` preview of a draft whose lines are all billed answers an empty ₹0 body; BillScreen shows it as a live draft | Preview refuses "billed as 0006" (or answers the bill id), and the screen opens the bill | `preview` callers: BillScreen, ReconcileScreen | no |
| QB-9 | P2 | B | covered by unit `QB-3` for "already issued"; the `baseMinor` text is browser (agent B/D) | as QB-3 | `app/billing.ts:150, 245` the id, not the number; `app/approvals.ts:116` a code-level message reaches the cashier | Number in both refusals; "Nothing left to comp on this draft" for a zero base | `issue`, `split`, ST `billDiscount` | yes |
| QB-10 | P2 | UI (+B) | browser, see agent B | — | `features/billing/useBill.ts:26` the dropped charge lives in page memory; a cancel frees the lines and a reload forgets it | Keep the dropped charges on the draft (a backend field), or read them back off the cancelled bill | `useBill`, `billing-cancel`, a new draft field | no |
| QB-11 | P2 | UI | browser, see agent B | — | `BillScreen.tsx:37-44` the preview's `offer {name, amount}` (`useBill.ts:13`) is never drawn | One line under the dishes: "Offer: ₹100 off above ₹499 −₹100.00" | BillScreen only | yes |
| QB-12 | P2 | B | e2e `QB-12` | row `amount 6000, pct 0` | `app/approvals.ts:168` the non-line audit row never passes the `pct` computed at `:120` | Pass `pct` | every non-line approval row (billDiscount, drawer, reprint, releaseUnpaid); day-close and TD-005 readers | no (audit) |
| QB-13 | P3 | B + UI | unit `QB-13` | preview with `dropCharges` resolves for SERVER | `app/billing.ts:58-63` preview takes `dropCharges` from any role; BillScreen shows the toggle to everyone (`BillScreen.tsx:60`) | Refuse `dropCharges` below MANAGER in preview, and hide the toggle | `preview`; the till; KITCHEN on the till is its own open question | no (auth) |
| QB-14 | P3 | UI | browser, see agent B | — | `useBill.ts:53` throws the refusal before the api client's one message hook sees it | Say "Nothing to comp" through `ui/says` | comp only | yes |
| QB-15 | P3 | UI | `qa-display.spec.ts` | — | — | Fixed in `0874e64` | — | done |
| QB-16 | P3 | UI | browser, see agent B (TenderScreen is agent C's; not running today) | — | `features/payments/TenderScreen.tsx` heading shows `billId`; a cancelled bill reads "outstanding" | Show `series-number`; "cancelled" instead of outstanding | TenderScreen only | yes |

### Known spec conflicts

- **QF-2: FL R14 against the walk-out decision.** R14 says a table is free only when no open money remains. The
  floor does exactly that: the walked-out bill is still `issued` and the lines are still unbilled. The walk-out
  decision (Shaurya 2026-09-24, quoted in `features/floor/useFloor.ts`) says a table that still owes can be freed with
  a PIN. Both cannot hold. So QF-2 has no test yet: a test would pick a side (TESTING.md, "if you can't say which
  rule, don't write it"). QF-1 is a bug under either reading, and its test asserts only the new party's money.
- **QB-1: the split decision against TD-016.** [SPEC_BL](../SPEC_BL_billing_and_tax.md) decision log, 2026-09-15:
  a split drops the bill discount on both drafts, and the cashier re-applies it per draft. The
  [STATE.md](../STATE.md) TD-016 fix (2026-09-16) instead clamps an offer to each bill's share, and needs `targets`,
  which an ORDER offer does not have. The QB-1 tests assert only what both readings agree on: the halves never
  add up to less than the unsplit bill.

## Parked for Shaurya

Everything here changes what an endpoint accepts, writes or returns, money, audit or auth. Each has its test
waiting (except QF-2), so the fix is: make the change, drop the mark, and watch the test go green.

### QF-1 · A new party at a walked-out table is invisible (P0)
- **Scene.** 21:10 the couple at 7 walks out on a ₹66 bill. 21:30 a family sits at 7 and orders ₹60 of food. The
  tile still reads ₹66 due, and the family's ₹60 is nowhere on the floor.
- **Root cause.** `adapters/firestore/floor.ts:151-154` brings back every sitting with an open bill, ended or not.
  `app/floor.ts:112` keeps one sitting per table, and the last one read wins. Live sessions are read first
  (`:146`), so the walked-out sitting wins.
- **Fix.** In `getFloor`, a table with a live sitting shows that sitting. An ended sitting that still owes gets
  its own tile under the same table number, marked walked out, or is left off. Which one is QF-2's answer.
  `openTable` (`app/floor.ts:163`) needs the same rule, so the tap and the tile agree.
- **Touches.** `floor-get` and `floor-open`. The till's floor. Day close counts open money separately and is not
  affected.
- **Question.** Answer QF-2 first.

### QF-2 · What does a walk-out leave behind? (P1)
- **Scene.** Table 6 walks out on ₹60. The bar says "6 freed, unpaid". The tile keeps ₹60 and a Walk-out button all
  night, and a second press "succeeds" again with no new audit row.
- **Root cause.** `app/floor.ts:345` ends the session. The bill stays `issued` and the lines stay unbilled, so R14
  keeps showing the money.
- **Fix, three options.** (a) Write it off: give the walked-out money a numbered ₹0 or comp document, as the comp
  path already does (DC-S25a). (b) Mark the bill `walkedOut`: still owed, but off the floor, and listed at day
  close. (c) Keep today's behaviour and change the words to "marked walked out", not "freed". (b) is the smallest
  change that keeps the money visible where the owner looks.
- **Touches.** `clearTable` (till Walk-out; captain Vacant via `table/table.js:1417`), `getFloor`, `openTable`, day
  close's open-money refusal, and the P0 row.
- **Question.** Which of (a), (b) or (c)? That answer also settles QF-1's second tile.

### QF-3 · Parcel counters in merges and moves (P1)
- **Scene.** The cashier aims at 12 and taps P1. Table 11 disappears into the Parcels strip as `11+P1`. A seated
  party moved onto P1 looks like a takeaway ticket.
- **Root cause.** `domain/floor.ts:221` `canReceive(dest)` has no idea which tables are counters. The list lives in
  config (`app/floor.ts:28`, `ordering.takeawayTableIds`) and is never passed in.
- **Fix.** `setMerge` and `moveTable` read `ports.config.floor` and refuse a takeaway id as either side: "P1 is a
  parcel counter". Better still, the counters' table documents could carry a `kind` the domain can read.
- **Touches.** `table-setMerge` (the till only; no Dart caller found), `table-moveTable`. Should a parcel be movable
  onto a table (the takeaway guest decides to sit down)? Today that is also allowed.
- **Question.** Refuse both directions, or allow parcel → table?

### QF-4 · Confirm of an open pick works on a stale floor (P1)
- **Scene.** The cashier picks 6 and 7, the network drops, and Merge and Move grey out. Confirm stays live and
  merges on a 20-second-old picture.
- **Root cause.** `features/floor/FloorScreen.tsx:133`.
- **Fix.** `disabled={!ready || floor.busy || floor.stale}`. One line. It is parked only because it stops a
  request from being sent. The browser test is agent B's.
- **Question.** None. Apply it with the test.

### QF-6 · The walk-out amount mixes pre-tax and post-tax money (P2)
- **Scene.** Table 10's ₹66 bill is printed, then a ₹60 naan follows, and the table walks out. The P0 row says
  ₹126. What was really abandoned is ₹132.
- **Root cause.** `app/floor.ts:334` and `:360`: `onTable(lines)` is list minus offers, before charges and tax.
  `unpaid(bills)` is payable, after both. The confirm text adds the same two numbers (`FloorScreen.tsx:102`).
- **Fix.** Price the unbilled lines through billing's preview maths (the floor would need billing's config port)
  before the PIN, and send that figure to ST and the audit row. The tile keeps showing pre-tax money (R2, FL-S19).
- **Touches.** `clearTable`, ST `releaseUnpaid`, the captain's Vacant, and the walk-out confirm text.
- **Question.** Is the walk-out figure "as it would be billed"? The e2e test assumes yes: 6600 + 6600 = 13200.

### QF-7 · A double tap on Confirm reports failure after a success (P2)
- **Root cause.** `FloorScreen.tsx:55-65`.
- **Fix.** Guard `confirm` with a ref so a second tap while busy is ignored, and show "Merging 6 + 7…" while the
  call is out. Parked because it changes what gets sent. Browser test: agent B.
- **Question.** None.

### QB-1 · A split gives the order offer to each half (P0)
- **Scene.** A ₹882 table becomes ₹198 + ₹573 = ₹771. ₹111 is given away, more with more halves.
- **Root cause.** `app/billing.ts:69-74`: `orderOffer(open[0].orderId)` becomes the bill discount of every draft
  holding a line of that order. TD-016's clamp works from `targets`, and ORDER offers ship none
  (`adapters/firestore/billing.ts:47`).
- **Fix.** Option A, the signed decision (2026-09-15): a draft that holds only part of an order gets no order
  offer. Option B, TD-016's spirit: apportion the offer across the order's lines by R1 at placement, store each
  line's share, and let each draft sum its own shares. B keeps the guest's discount and cannot give it twice.
- **Touches.** `compute` → `preview` and `issue`; BillScreen and ReconcileScreen. QB-6 falls out of either option.
- **Question.** A or B? Also: should liquor lines ever carry an order offer (QA question 9)?

### QB-2 · Cancelling a part-paid bill (P0)
- **Scene.** ₹33 cash is taken on a ₹66 bill, then the bill is cancelled and re-issued. The new bill and the floor
  ask for ₹66, and the drawer is ₹33 over at close.
- **Root cause.** `app/billing.ts:184` and `domain/billing.ts:176` check only `status`, and PY keeps a part-paid bill
  `issued`.
- **Fix.** Refuse before the PIN while `paidTotal > 0`: "₹33.00 is already taken on bill 0006. Void or refund it
  first." The void path already exists on the tender screen. Alternatively, carry the payments onto the new bill
  (PY-S25).
- **Touches.** `billing-cancel` (till `useBill.cancel`), PY-S25, and day close's drawer reconciliation.
- **Question.** Refuse (simple and safe), or carry the money over (PY-S25's wording)?

### QB-3 · Dessert after the bill cannot be billed from the till (P1)
- **Root cause.** `app/billing.ts:149-150`: `issue` refuses a draft that still holds an already-billed line.
  Cancel lives only on the page that issued the bill (`BillScreen.tsx:79`).
- **Fix.** The words can be fixed now: name the number, as in QB-9. For the flow, pick one: (a) `issue` bills only
  a draft's unbilled lines, so the dessert gets its own number; (b) a new round lands on a fresh draft
  automatically; (c) Cancel moves to the tender screen, with QB-2's guard.
- **Touches.** `issue` (TD-040's `expectedV` check reads the same lines), the floor picker, and the tender screen.
- **Question.** (a), (b) or (c)? QA questions 1 and 10.

### QB-4 · A refused comp still writes a P0 audit row (P1)
- **Root cause.** `app/billing.ts:133-141`: `ports.approve` writes the row before the transaction that refuses.
- **Fix.** Run the `taken` and `changed` checks before `approve`, or pass the audit row into the issue
  transaction the way `table.clear` does. The second is exact under a race.
- **Touches.** `issue` with a discount. ST's door is shared, so do not change `approve` itself.
- **Question.** None of substance. It is parked because it touches the audit.

### QB-5 · A comped parcel still owes ₹21 (P1)
- **Root cause.** `domain/billing.ts:128-133`: a flat charge is added after a 100 % discount. The success text is
  hard-coded (`BillScreen.tsx:29`).
- **Fix.** A 100 % bill discount zeroes the charges too (BL-S22 "payable 0.00"). Show the real payable in the
  success text.
- **Touches.** `previewBody`, meaning every bill with a flat charge that gets a discount.
- **Question.** Does a comp take the packing too? (QA question 5.) The test assumes yes, per BL-S22.

### QB-6 · A cheap half of an offer order cannot be billed (P1)
- **Fix.** Falls out of QB-1. The display half (keep Preview drawn when `bill` is null) is safe.
- **Question.** As QB-1.

### QB-7 · Removing the service charge leaves no audit row (P1)
- **Root cause.** `app/billing.ts:115-175`: `dropCharges` is never recorded.
- **Fix.** Write one P1 row in the issue transaction: `{action:'dropCharge', type, amount, staffId, billId}`.
- **Touches.** `issue`, and the TD-005 audit reader.
- **Question.** Name the action.

### QB-8 · An issued draft reopens as a live ₹0 draft (P2)
- **Root cause.** `app/billing.ts:68`: preview filters to open lines and answers an empty body.
- **Fix.** Preview of a draft whose lines are all billed answers "billed as 0006" with the bill id, and the screen
  opens that bill. `?draft=nope` answers "nothing to bill".
- **Touches.** `preview` (BillScreen, ReconcileScreen).
- **Question.** None. It is parked because it changes a response.

### QB-10 · A dropped service charge comes back after cancel and reload (P2)
- **Fix.** Store the dropped charges on the draft (a field on the lines, or a draft doc), and have `cancel` keep
  them.
- **Question.** QA question 4: should the draft remember it?

### QB-12 · The comp audit row says pct 0 (P2)
- **Root cause.** `app/approvals.ts:168` omits the `pct` computed at `:120`.
- **Fix.** Add `pct` to that `auditRow` call. One word. Parked only because it is audit content.
- **Touches.** Every non-line approval row. Readers get a truer number.
- **Question.** None.

### QB-13 · A captain can take the service charge off the preview (P3)
- **Fix.** `preview` refuses `dropCharges` below MANAGER, and the toggle is hidden (like FL-S29).
- **Question.** QA questions 6 and 7: may KITCHEN preview at all? Hide or refuse for SERVER?

## Not tested at backend level, and why

- **QF-2**: the rule is undecided (above).
- **QF-4, QF-7, QB-8, QB-10, QB-11, QB-14, QB-16, QF-11's screen and QB-3's missing Cancel**: what the screen
  sends or shows. They are browser tests, agent B's.
- **QF-8..QF-10, QF-12..QF-15, QB-15**: already fixed with Playwright tests by agent D.

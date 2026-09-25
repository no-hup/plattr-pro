# Decisions D1–D6 · what each one really costs · 2026-09-25

**Read-only impact pass over the six decisions on the [decisions page](2026-09-25-decisions-for-shaurya.md), traced
through the code before any fixer starts.** Each decision below has its size, the code and docs it touches, the tests
that pin today's behaviour, the risks, a build order, and the questions whose answer changes what gets built. Paths
are relative to this file. `F/` means [backend/src-plattr/functions/](../../backend/src-plattr/functions/).

## Summary

| | Decision | Size | Layers | Biggest surprise found in the code |
|---|---|---|---|---|
| D1 | Walk-out becomes its own line | **M** · ~10 files, ~150 lines | domain, app, adapters, till | Payments re-derive a bill's status on every take and void. A new "walked out" status would be wiped back to `issued` by the next void unless PY is taught it too. And a walk-out on food that was never billed has no bill to mark. |
| D2 | One "Edit bill" button | **L** · ~15 files, ~350 lines, 4 sub-changes | domain, app, adapters, api, till, 3 JS join paths | The offer share is small (the machinery exists). The expensive parts are the no-PIN cancel, the "replaces" link, the paid-table refusal on 4 join/checkout paths, and the "morning report", which does not exist (TD-005). |
| D3 | No Edit/Cancel with money on the bill | **S** · 2 files, ~10 lines | domain, app | None. It is one guard, and it must sit inside the transaction. |
| D4 | Waiter's Cancel Order | **M** · ~8 files, ~120 lines | JS orders/cart, domain/approvals, Flutter waiter app | The void path skips a billed line silently instead of refusing it. It also voids dishes already SERVED in a cancelled round. And a void audit row always carries the dish's price as its amount, which fights "no money effect". |
| D5 | Shared cart asks what to send | **M**, not S · ~7 files, ~120 lines | Flutter guest app, JS checkout | The guest app **cannot** send the whole cart today: the network interceptor overwrites `addedBy` on every checkout. And a send with no `addedBy` records the round as placed by `system`, sweeps in a waiter's items on the same cart, and sends whatever is live at commit, not what the phone showed. |
| D6 | Admin add-on/portion edits apply everywhere | **M, upper end** · ~9 files, ~250 lines | JS menu endpoints, Flutter admin app | Placed lines are safe: nothing re-prices a snapshot. But the cart freezes an add-on's price when it is **added**, not placed. A "changed fields only" save would switch `isCustomizable` off. New add-ons made in today's editor are unbuyable. `variant.js` and two siblings can't even load. |

**Questions for Shaurya: 19** (D1: 4, D2: 6, D3: 0, D4: 3, D5: 2, D6: 4). The top five are at the end of this page.

---

## D1. Walk-out money becomes its own write-off line

**Size M.** About 10 files and 150 lines, plus tests. No new endpoint: the walk-out already goes through
`floor-clear` with a PIN (`releaseUnpaid`).

### What the code does today

- Walk-out is `clearTable` with a PIN ([F/app/floor.ts:320-365](../../backend/src-plattr/functions/app/floor.ts)).
  It writes the P0 `releaseUnpaid` row and the `table.clear` row, then ends the session. It changes **nothing on
  the bill or the lines**. The bill stays `issued` and unbilled lines stay `billId: null`.
- The floor then finds the old sitting again, because
  [F/adapters/firestore/floor.ts:138-176](../../backend/src-plattr/functions/adapters/firestore/floor.ts) `sittingsOf`
  pulls in any session named by an open line or an `issued` bill. That is why the tile keeps ₹660 and Walk-out
  forever (TD-064). `getFloor` then keys sittings by table in a `Map`, so when a new party sits, one sitting
  silently overwrites the other (TD-063, [F/app/floor.ts:111-112](../../backend/src-plattr/functions/app/floor.ts)).
- Day close refuses on any `issued` bill and any unbilled line
  ([F/domain/dayClose.ts:212-229](../../backend/src-plattr/functions/domain/dayClose.ts)), so a walk-out blocks the
  close (TD-073).
- The written-off amount is `onTable + unpaid`: pre-tax food added to post-tax bills (QF-6).

### What has to change

| Layer | File | Change |
|---|---|---|
| domain | [F/domain/billing.ts:157](../../backend/src-plattr/functions/domain/billing.ts) | `status` gains `'walkedOut'`, plus `walkedOut: { at, by, amount, cid }`. `amount` = payable − paidTotal. |
| domain | [F/domain/floor.ts:23-30, 115-122, 164](../../backend/src-plattr/functions/domain/floor.ts) | Floor `Bill.status` gains it. `unpaid()` skips a walked-out bill. `settled` counts it as closed. |
| domain | [F/domain/payments.ts:9, 137-139, 204](../../backend/src-plattr/functions/domain/payments.ts) | `statusFor` keeps `walkedOut` sticky, like `cancelled`. `canTake` decides whether a late payment is allowed (Q1-3). |
| app | [F/app/payments.ts:71](../../backend/src-plattr/functions/app/payments.ts) | Same sticky rule in `state()`. **Without it the next void on a part-paid walked-out bill stamps it back to `issued`.** |
| app | [F/app/floor.ts:327-351](../../backend/src-plattr/functions/app/floor.ts) | Inside the release transaction: mark every unpaid bill of the sitting `walkedOut`, and handle unbilled lines (Q1-1). The owed figure becomes post-tax (QF-6). |
| app | [F/app/floor.ts:111-112](../../backend/src-plattr/functions/app/floor.ts) | TD-063 needs its own fix anyway: two sittings on one table must both be drawn (R9). D1 removes the walk-out cause, but a captain's COMPLETED on unbilled food (FL-S16) still leaves an ended sitting with money on the same table. |
| domain + app | [F/domain/dayClose.ts:66-79](../../backend/src-plattr/functions/domain/dayClose.ts), [F/app/dayClose.ts:186, 242](../../backend/src-plattr/functions/app/dayClose.ts) | A `walkoutsFrom(bills)` beside `discountsFrom`, frozen onto the close document. |
| adapters | [F/adapters/firestore/floor.ts:142](../../backend/src-plattr/functions/adapters/firestore/floor.ts), [F/adapters/firestore/dayClose.ts:41-46](../../backend/src-plattr/functions/adapters/firestore/dayClose.ts) | These query `status == 'issued'`, so a walked-out bill drops out of both on its own. The day's bills query (`:46`) has no status filter and will see it. Check nothing else assumes three statuses. |
| till | [frontend/till/src/features/dayclose/DayCloseScreen.tsx:65-70](../../frontend/till/src/features/dayclose/DayCloseScreen.tsx), [frontend/till/src/features/floor/FloorScreen.tsx:102](../../frontend/till/src/features/floor/FloorScreen.tsx), [frontend/till/src/features/payments/TenderScreen.tsx:39, 77](../../frontend/till/src/features/payments/TenderScreen.tsx) | A "Walked out ₹660" line on day close. The tender screen needs a `walkedOut` state, not "Loading" or a live Take form. |

### Docs to update

- [SPEC_FL](../SPEC_FL_floor_and_moves.md): R14 (line 95, "free only when no open money") gets the walk-out
  exception. FL-S35 (line 76, "walk-out is comped to ₹0") is replaced. Add a Decisions row.
- [SPEC_DC](../SPEC_DC_day_close.md): DC-S25a (line 87) and the 2026-09-16 decision (line 163) say "walk-out = 100 %
  comp, reason walkout". D1 replaces both: walk-outs are no longer comps. R5 (line 103) gains "a walked-out bill is
  not open".
- [SPEC_BL](../SPEC_BL_billing_and_tax.md): the bill states (Objects), and BL-S22 stops being the walk-out tool.
- [SPEC_PY](../SPEC_PY_payments.md): a status PY must not overwrite.

### Tests that pin today's behaviour

- **Will flip, known bug:** [F/test/unit/qa/floorFindings.test.js:63](../../backend/src-plattr/functions/test/unit/qa/floorFindings.test.js)
  (QF-1). e2e [qa-findings.js:69-93](../../backend/src-plattr/functions/test/e2e/suites/qa-findings.js) (QF-1, QF-6).
- **Will change:** [F/app/floor.test.ts:775-793](../../backend/src-plattr/functions/app/floor.test.ts) (the release
  records `onTable + unpaid`). e2e [billing.js:220](../../backend/src-plattr/functions/test/e2e/suites/billing.js)
  (DC-S25a comp for a walk-out), which stays valid only as a "comp", no longer as the walk-out route.
- **Must stay green:** every PY status test. Add one where a part payment on a walked-out bill is voided and the bill
  stays `walkedOut`.

### Risks

- **The status is overwritten.** PY recomputes `issued | paid | cancelled` from the payment rows on every take and
  void. Miss one of the two derivations and the walk-out silently comes back as an unpaid bill, and day close refuses
  again.
- **Tax.** The bill number is kept, so GST is still due on ₹660 nobody paid. Indian GST has no relief for an unpaid
  restaurant bill. That is probably what Shaurya wants (an honest series), but a CA should confirm.
- **A cheap way to hide theft.** "Walked out" is now a line that doesn't look like a comp. A cashier who pockets cash
  and walks the bill out needs the manager PIN, and the P0 row names them. Keep the per-cashier count of walk-outs
  in the same report as comps.

### Build order

1. Domain status and PY's sticky rule, with unit tests (a void can't un-walk a bill).
2. `clearTable` marks the bills, post-tax amount (QF-6).
3. Floor: TD-064 falls out. Fix TD-063's two-sittings-per-table separately.
4. Day close line (TD-073 falls out).
5. Till screens.

### Questions for Shaurya

**Q1-1. Walk-out on food that was never billed.** *Scene:* 22:40, table 6 ate ₹600 of food and left before anyone
asked for the bill. There is no bill to mark "walked out".
- (a) The walk-out issues the bill itself (taking a number, no paper) and marks it walked out at once.
- (b) The lines are marked walked out with no bill. There is no invoice and no GST, and the amount on the day-close
  line is pre-tax.
- (c) Refuse: "print the bill first, then Walk-out".
- **Recommended: (a).** One kind of thing to count: every walk-out is a numbered bill, the amount is what the guest
  would have paid (fixes QF-6), and day close needs no second rule. The cost is GST on the ₹660, the same as a
  billed walk-out.

**Q1-2. A table with a printed bill and dessert on top walks out.** *Scene:* table 10's ₹66 bill is printed, then
they order a ₹60 naan, then leave. Follows from Q1-1: with (a), the naan gets its own walked-out bill, and day close
shows "₹132 walked out, 2 bills". **Recommended:** same as Q1-1, no separate answer needed unless you pick (b).

**Q1-3. The guest comes back and pays.** *Scene:* the next day, table 6's guest returns and pays ₹660 cash.
- (a) The till takes it on the walked-out bill. It turns `paid`, the take is today's cash, and the walked-out line
  on yesterday's close stays as it was signed.
- (b) Refused. The cashier records it as cash "in" on the drawer with a note.
- **Recommended: (a).** The money lands against the right bill number. Without it the day's cash is over with no
  bill to explain it.

**Q1-4. A group or split sitting walks out.** *Scene:* tables 10+11 have two split bills, A-0012 paid and A-0013
unpaid ₹900. They leave. **Recommended:** only A-0013 is marked walked out. The paid one is untouched. That is how
the code would naturally do it. Say so only if you want the whole sitting shown as one walk-out.

---

## D2. One "Edit bill" button on the till

**Size L.** About 15 files and 350 lines, in four parts that can ship separately. This is the biggest of the six.

| Part | What | Size |
|---|---|---|
| D2a | Edit = cancel without a PIN, reason "edited", lines back to the draft, `replaces` link on the next bill | M |
| D2b | Service-charge removal: kept across the edit, audited per cashier (QB-7, QB-10) | S |
| D2c | Order offer shared across split bills by value (QB-1, QB-6, TD-066) | S |
| D2d | Paid table refuses new rounds and new guests; merge into a printed table refused (TD-097, TD-120) | M |

### D2a · Edit = cancel with no PIN, and a link

**Today.** [F/app/billing.ts:180-198](../../backend/src-plattr/functions/app/billing.ts) `cancel` checks the status,
then calls ST's door with `action: 'cancelBill'`, which is **always a PIN and always P0**
([F/domain/approvals.ts:96](../../backend/src-plattr/functions/domain/approvals.ts)). It writes the audit row
*before* the cancel transaction, the same pattern as QB-4. It frees the lines (`billId → null`) and leaves their
`draftId` alone, so the dishes go back to the same draft. `issue` then bills that draft again, plus anything
ordered since. The till shows Cancel only on the bill screen right after Generate
([BillScreen.tsx:79-88](../../frontend/till/src/features/billing/BillScreen.tsx)). The tender screen has none (TD-065).

**What has to change.**
- A new ST action, e.g. `editBill`: cashier only, no PIN, sev P1, amount = the payable. Added to `ACTIONS` and
  `decide` in [F/domain/approvals.ts:4, 30, 67-104](../../backend/src-plattr/functions/domain/approvals.ts). The
  reason is fixed server-side as `edited`, so it doesn't need to be on the configured reasons list.
- `cancel` takes a mode (`edit` or `cancel`). Plain Cancel keeps its PIN and P0.
- **The link.** Lines forget their old bill when they are freed. The smallest server-side way: on an edit, stamp
  `editedFrom: <billId>` on each freed line. At issue, `replaces` = the distinct `editedFrom` values on the lines
  being billed, then clear them. This is "server decides": the till never sends the link. Line shape is in
  [F/domain/line.ts](../../backend/src-plattr/functions/domain/line.ts). Meta gains `replaces` in
  [F/domain/billing.ts:150-155](../../backend/src-plattr/functions/domain/billing.ts). The old bill gains `replacedBy`
  when the new one issues. That is an update on a cancelled bill, which R4 allows (cancel is already a state change).
- The receipt/print path prints "Replaces A-0417" ([F/domain/receipt.ts](../../backend/src-plattr/functions/domain/receipt.ts)).
- Till: an **Edit** button on the tender screen for an issued, unpaid bill. It opens the bill screen on the same
  draft. [TenderScreen.tsx](../../frontend/till/src/features/payments/TenderScreen.tsx),
  [useTender.ts](../../frontend/till/src/features/payments/useTender.ts),
  [useBill.ts:57-58](../../frontend/till/src/features/billing/useBill.ts).
- **Removing a dish needs a till button that doesn't exist.** The bill screen has no line void. The backend door does
  exist (`approvals-apply` with `void`; PIN once the line was sent), so this is a till change only.

**The cid trap.** The till sends `cid: till_<draftId>` on every bill call
([useBill.ts:33](../../frontend/till/src/features/billing/useBill.ts)). Today that is harmless, because ST's
non-line audit ids add a timestamp and a random suffix
([F/app/approvals.ts:166](../../backend/src-plattr/functions/app/approvals.ts)). If the fixer keys a new `bill.edit`
row on the cid alone, the second Edit on the same table in one night fails on `create`. Key it on the bill id.

### D2b · Service charge across the edit

**Today.** The dropped charge lives only in page memory
([useBill.ts:26](../../frontend/till/src/features/billing/useBill.ts)). It is sent as `dropCharges` on preview and
issue. No audit row is written (QB-7). A reload or a cancel brings it back (QB-10). Any role can drop it on a preview
(QB-13).

**Change.** At issue, write one P1 `dropCharge` row per dropped type, naming the cashier and the amount, in the issue
transaction ([F/app/billing.ts:144-172](../../backend/src-plattr/functions/app/billing.ts)). Refuse `dropCharges`
below MANAGER. For the edit: see Q2-2.

### D2c · Order offer shared by value across a split

**Today.** The offer is evaluated at every checkout over the **whole order's** live rounds
([F/orders/createOrUpdateOrder.js:578-596](../../backend/src-plattr/functions/orders/createOrUpdateOrder.js)) and
stored as `order.appliedOffer`. Eligibility is therefore already judged on the whole table, as D2 wants. The bug is
only in the share. [F/app/billing.ts:69-74](../../backend/src-plattr/functions/app/billing.ts) hands
`orderOffer(open[0].orderId)` to every draft. For an ORDER-scope offer the adapter ships no `targets`
([F/adapters/firestore/billing.ts:48-59](../../backend/src-plattr/functions/adapters/firestore/billing.ts)), and then
[F/domain/billing.ts:82](../../backend/src-plattr/functions/domain/billing.ts) gives each draft the full amount.

**Smallest change: no new domain rule.** The TD-016 clamp already does "only the part sitting here" when an offer
names `targets`. So, for an offer with no targets, build them: spread the offer amount over **all the order's
counting lines** by net share, with `apportion` (R1, the same rule BL-S3 uses), keyed by `cartItemId`. Then pass that
to `previewBody` unchanged. Each draft then takes exactly its share, the halves sum to the offer, and no half is
re-judged against ₹499 (QB-6 falls out). It needs one new port, `linesOfOrder(orderId)`, a query on `lines` by
`orderId`, in [F/adapters/firestore/billing.ts](../../backend/src-plattr/functions/adapters/firestore/billing.ts).
About 20 lines.

**Interaction with "Must decide" 4 (offers on liquor).** If the default there is taken (offers spread over food only),
the weights in this same function become the food lines' net only, and a food/drinks split puts the whole offer on the
food bill. Do both in one change, or this code is written twice.

### D2d · Paid table refuses new rounds and guests; merge into a printed table

**Today.** `acceptsNewGuests` exists in
[F/domain/floor.ts:263-264](../../backend/src-plattr/functions/domain/floor.ts) and has **no caller** outside its own
test. The ways onto a paid sitting are:

| Path | Where |
|---|---|
| Guest checkout, and the waiter's Send (same endpoint, same guest session) | [F/cart/checkoutCart.js:36-45](../../backend/src-plattr/functions/cart/checkoutCart.js) → [F/orders/createOrUpdateOrder.js](../../backend/src-plattr/functions/orders/createOrUpdateOrder.js) |
| A stranger scanning and joining (TD-120) | [F/session/sessionService.js:44-60](../../backend/src-plattr/functions/session/sessionService.js) `createOrGetTableSession`, called from [F/table/table.js:521, 557](../../backend/src-plattr/functions/table/table.js) |
| A user added during session validation | [F/session/sessionService.js:281](../../backend/src-plattr/functions/session/sessionService.js) |
| The waiter opening the table to add dishes | [F/table/openTable.js:46](../../backend/src-plattr/functions/table/openTable.js) |

**Change.** One app function in `app/floor.ts`, e.g. `acceptsRound(restaurantId, sessionId)`, reading the sitting's
lines and bills and calling `acceptsNewGuests`. The JS paths call it the way
[F/table/table.js:17](../../backend/src-plattr/functions/table/table.js) already requires `lib/app/floor`. Checkout
must check **inside** its transaction, or a payment landing in the same second lets one round through.

**Bug in the existing check.** `acceptsNewGuests` counts `bills.length === 0` as "still open". A sitting whose only
bill was cancelled (mid-edit) and whose dishes were all voided reads as paid and would refuse. Use
`bills.every(b => b.status === 'cancelled')`, as `tile()` already does at
[F/domain/floor.ts:164](../../backend/src-plattr/functions/domain/floor.ts).

**Merge.** [F/domain/floor.ts:195-204](../../backend/src-plattr/functions/domain/floor.ts) `canMerge` checks only the
child. Add a check on the parent's sitting in `setMerge`
([F/app/floor.ts:265-297](../../backend/src-plattr/functions/app/floor.ts), which already opens a transaction and
can call `t.getSitting(parentTableId)`): refuse while it holds a non-cancelled bill.

### Docs to update (D2)

- [SPEC_BL](../SPEC_BL_billing_and_tax.md): BL-S9 (line 75) says removing the service charge after printing is a
  cancel with a PIN, so rewrite it as Edit with no PIN. BL-S12 (line 78) and the offer decisions (lines 189-191)
  change to "shared by value". R13 (line 108, "ordering stops at issue") is now true only for a paid table. Add a
  scenario for Edit and one for the `replaces` link.
- [SPEC_ST](../SPEC_ST_staff_pin_and_approvals.md): the new `editBill` action in "Who can do what". `cancelBill` stays
  PIN.
- [SPEC_FL](../SPEC_FL_floor_and_moves.md): R18 (line 99) and FL-S14 (line 55) are finally enforced; the merge
  refusal becomes a scenario.
- [SPEC_PY](../SPEC_PY_payments.md): PY-S14 unchanged. Note that an edited bill is a cancelled bill to PY.
- [the feature-request page](2026-09-25-feature-requests-bill-changes.md): FR-1, FR-5 and FR-7 are decided as one
  button. FR-3 (split after printing) is covered by Edit then split.

### Tests that pin today's behaviour (D2)

- **Will flip, known bug:** [F/test/unit/qa/billingFindings.test.js:94, 104, 167, 178](../../backend/src-plattr/functions/test/unit/qa/billingFindings.test.js)
  (QB-1, QB-6, QB-7, QB-13). e2e [qa-findings.js:111-119](../../backend/src-plattr/functions/test/e2e/suites/qa-findings.js)
  (QB-1). Till [frontend/till/e2e/qa-findings.spec.ts:48, 56](../../frontend/till/e2e/qa-findings.spec.ts) (QB-3, QB-6)
  and [walks.spec.ts:78, 116](../../frontend/till/e2e/walks.spec.ts) (QB-3 dessert, QB-10 charge after cancel).
- **Must stay green:** [F/app/billing.test.ts:300-318](../../backend/src-plattr/functions/app/billing.test.ts)
  (BL-S9 cancel is PIN and P0). The plain Cancel keeps that.
- **Will change:** [F/domain/floor.test.ts:488-500](../../backend/src-plattr/functions/domain/floor.test.ts) (the
  `bills.length === 0` fix).
- **New:** a split of the ₹882 order with ₹100 off gives two bills whose offer shares sum to exactly ₹100.

### Risks (D2)

- **The "morning report" doesn't exist.** D2 leans on "the morning report counts edits and service-charge removals
  per cashier". Nothing reads the audit rows today: `summarise` in
  [F/domain/approvals.ts:211](../../backend/src-plattr/functions/domain/approvals.ts) has no endpoint, and TD-005 is
  open. The rows can be written now, but nobody will see them until TD-005 is built. Removing the PIN before the
  reader exists is "catch it" with nobody catching.
- **Edit without a PIN plus Walk-out.** Edit frees the lines. If the cashier then never re-issues, the table sits with
  unbilled food, which only a Walk-out (PIN, P0) or a comp (PIN) clears. So nothing is lost without a PIN. Say this in
  the ST Decisions row so nobody "fixes" it.
- **Offer amount moves between rounds.** The order offer is re-evaluated at every checkout. If half of a split is
  issued, and then a dessert changes the offer, the other half's share uses the new amount and the two halves no
  longer sum to one offer. This is rare and bounded (one offer), so log it rather than refuse.
- **Two tills.** Edit and a payment on the same bill at the same moment. The edit must re-check "no money" inside its
  transaction (D3).

### Build order (D2)

D3 first (it is the guard D2a needs). Then D2c (backend only, unit tests exist). Then D2b. Then D2a backend, then its
till screens. D2d last, with a characterization test on each JS path first (contract rule for existing dirs).

### Questions for Shaurya (D2)

**Q2-1. A new round on a part-paid bill.** *Scene:* table 10 owes ₹4,800. One friend has paid ₹2,000 by UPI, then they
order a ₹240 gulab jamun from the QR menu. D3 refuses Edit, and `issue` refuses the draft ("already issued"). The
dessert can't be billed.
- (a) Refuse new rounds while any bill of the table has money on it but isn't settled, the same as a paid table.
- (b) Accept the round. The till's split moves the new dishes to a second draft (the backend already allows this) and
  prints a second bill.
- (c) Accept it, and put a round placed after a bill on a new draft automatically.
- **Recommended: (a).** It matches your "a table doesn't pay part and then reorder", and it's the same check as the
  paid table. (b) needs a split button the till doesn't have yet.

**Q2-2. Does a removed service charge stay removed after an edit?** *Scene:* table 12's bill was printed without the
5 % service charge. They add two gulab jamun, and the cashier taps Edit.
- (a) The new bill keeps it off. The server reads which charges the replaced bill carried.
- (b) It comes back, and the cashier removes it again.
- **Recommended: (a).** Otherwise the guest is charged what they already refused. It is also QB-10.

**Q2-3. Which audit row does Edit write?** *Scene:* 30 desserts on a Friday means 30 edits.
- (a) One P1 `bill.edit` row per edit, with the old and new payable, counted apart from cancels.
- (b) A P0 row like a cancel.
- **Recommended: (a).** P0 is what the owner reads first. Thirty innocent P0s bury the one real cancel, which is the
  whole reason for this decision.

**Q2-4. Edit then split: what does each new bill say it replaces?** *Scene:* A-0417 (₹4,800) is edited and split into
food A-0431 and drinks A-0432. **Recommended:** both print "Replaces A-0417", and A-0417 lists both. Say so if you'd
rather only the first one carries it.

**Q2-5. Should the PIN-free Edit wait for the report that catches abuse?** *Scene:* a cashier takes ₹1,050 cash, taps
Edit, removes the service charge, records ₹1,000 and keeps ₹50. Only a per-cashier count of removals catches it, and
that count isn't built (TD-005).
- (a) Ship Edit with no PIN now. Rows are written, and the reader comes later.
- (b) Keep the PIN on service-charge removal until TD-005's per-cashier count exists.
- **Recommended: (a).** We aren't live, so nothing is lost before the reader exists. Put TD-005 on the pickup list
  before any real outlet.

**Q2-6. A staff round on a paid table.** *Scene:* 23:15, table 7 has paid ₹3,100 and asks the waiter for two filter
coffees. D2 refuses "table 7 has paid — clear it first".
- (a) The waiter asks the cashier to Clear, then opens the table again (new sitting, new bill).
- (b) The refusal to staff offers "Clear and start a new sitting" in one tap.
- **Recommended: (a) for now.** It's the smallest change. Revisit when the till's own order entry (OR) is built.

---

## D3. "Edit bill" is refused once any money is on the bill

**Size S.** Two files, about 10 lines, plus the tests that already exist.

**Today.** [F/app/billing.ts:184](../../backend/src-plattr/functions/app/billing.ts) and
[F/domain/billing.ts:175-179](../../backend/src-plattr/functions/domain/billing.ts) check only `status`. PY keeps a
part-paid bill at `issued`, so it passes. PY writes `paidTotal` on the bill document every time it records a take or a
void ([F/app/payments.ts:94-101](../../backend/src-plattr/functions/app/payments.ts)).

**Change.**
- In domain `cancel`: refuse when `paidTotal > 0`, with "₹500 already paid on A-0004 — take the rest first". This
  gives Edit and Cancel one rule. `paidTotal` needs to be on BL's `Bill` type.
- Check it twice. Once before the PIN is asked for (so nobody is asked for a PIN for nothing), and again **inside**
  the cancel transaction on the fresh bill. A payment committing in between would otherwise slip through. PY stamps
  the same bill document, so Firestore makes the two transactions contend and the retry sees the money.
- A voided payment takes `paidTotal` back to 0, so Edit works again after the cashier voids a mistaken take. That is
  the right behaviour: the void is PIN-gated and audited.

**Docs.** [SPEC_BL](../SPEC_BL_billing_and_tax.md) BL-S9 gains "unpaid means no money on it". Decisions row. The
[fix plan QB-2](2026-09-25-qa-fix-plan.md) is answered ("refuse", not "carry the money over").

**Tests.** Will flip: [billingFindings.test.js:116](../../backend/src-plattr/functions/test/unit/qa/billingFindings.test.js)
(QB-2), e2e [qa-findings.js:98-105](../../backend/src-plattr/functions/test/e2e/suites/qa-findings.js).

**Risk.** Almost none. The walk-out of the unpaid part is D1.

**Questions.** None.

---

## D4. The waiter app's Cancel Order

**Size M.** About 8 files and 120 lines: 3 JS backend files, 1 TS domain file, 2 Flutter files, and tests.

### What the code does today

- Cancel Order and Mark Paid live in
  [order_detail_screen.dart:202-257, 339-362](../../frontend/src-platter-apps/apps/platter_server/lib/pages/orders_home/order_detail_screen.dart).
  Both call `order-updateOrderStatus` (`cancelled` / `completed`).
- [F/orders/updateOrderStatus.js:95-96](../../backend/src-plattr/functions/orders/updateOrderStatus.js): CANCELLED
  writes only `{orderStatus, updatedAt}`. No lines, no carts, no kitchen tickets, no audit, no bill check. Any staff
  session may call it; there is no role check (`:58`). That is TD-089.
- The right path already exists for a **round**: `cart-updateCartStatus` → CANCELLED →
  [F/orders/lineSnapshots.js:163-210](../../backend/src-plattr/functions/orders/lineSnapshots.js) `voidCartLines`. It
  voids the lines, writes an audit row (P0 if `sent`, P1 if not), and sends the kitchen a cancel ticket. It has no PIN
  (TD-023, closed as "record, don't gate").
- The waiter app has **no** round-level or dish-level cancel button. Only whole orders.

### What has to change

- Order CANCELLED goes through `voidCartLines` for every live round of the order, in one transaction. Today each
  `_updateCartStatus` call runs its own transaction, so this is a loop inside `updateOrderStatus`, with all reads
  first.
- **Refuse once billed.** [F/orders/lineSnapshots.js:180](../../backend/src-plattr/functions/orders/lineSnapshots.js)
  *skips* a line with a `billId`, so the cancel "succeeds" and the dish stays on the bill. The same is true for the cart
  cancel ([F/test/unit/orders/waiterConfirmation.test.js:357-364](../../backend/src-plattr/functions/test/unit/orders/waiterConfirmation.test.js)
  pins it: "an already-issued bill is left alone"). D4 wants a refusal: "bill A-0002 is printed — ask the cashier to
  edit it". It must be checked inside the transaction, since a bill can be issued at the same moment.
- **Latent bug found:** `voidCartLines` voids every item of a cancelled round, including items already SERVED
  ([:167-170](../../backend/src-plattr/functions/orders/lineSnapshots.js)). The order document keeps them SERVED and
  billable. Eaten food leaves the till bill. Filter out SERVED items.
- **ST.** `voidCartLines` never calls `decide`, so the PIN relaxation needs no code there. But `decide` still says a
  SERVER may not void a sent line ([F/domain/approvals.ts:71-75](../../backend/src-plattr/functions/domain/approvals.ts),
  R8). Write the relaxation into ST's Decisions so nobody later routes this through `decide` and breaks it.
- **"Wasted, no money effect".** A void row always records `amount = listPrice`, `pct = 100`
  ([F/domain/approvals.ts:197-199](../../backend/src-plattr/functions/domain/approvals.ts)). See Q4-2.
- **Mark Paid.** Remove the button and its dialog from the waiter app. `markOrderAsDone` in
  [order_api_service.dart:345-356](../../frontend/src-platter-apps/apps/platter_server/lib/network/order_api_service.dart)
  has no callers, so delete it. On the backend, COMPLETED stays (e2e suites use it: order-lifecycle, multi-diner,
  journey.mjs), but refuse it while any round is unserved (TD-092). The compiled waiter bundle in
  `backend/src-plattr/staff-web/server/main.dart.js` needs a rebuild.
- Role: only SERVER, MANAGER and ADMIN may cancel. Not KITCHEN.

### Docs (D4)

[SPEC_ST](../SPEC_ST_staff_pin_and_approvals.md): ST-S5 (line 30) and R8 (line 51) both get "except the waiter's
cancel, audited, no PIN (D4)". Decisions row. TD-023 note. [SPEC_OR](../SPEC_OR_till_order_entry.md) if it describes
the waiter's cancel. TECH_DEBT: TD-010's Mark Paid note, TD-089 and TD-092 closed together.

### Tests that pin today's behaviour (D4)

- **Will flip:** [F/test/unit/orders/updateOrderStatus.characterization.test.js:74-79](../../backend/src-plattr/functions/test/unit/orders/updateOrderStatus.characterization.test.js)
  (CANCELLED writes exactly one update). [waiterConfirmation.test.js:357-364](../../backend/src-plattr/functions/test/unit/orders/waiterConfirmation.test.js)
  (billed line left alone; becomes a refusal). e2e [order-lifecycle.js:281-290](../../backend/src-plattr/functions/test/e2e/suites/order-lifecycle.js)
  (cancel succeeds without voiding).
- **Check:** [waiterConfirmation.test.js:334-355](../../backend/src-plattr/functions/test/unit/orders/waiterConfirmation.test.js)
  pins reason `other` and the P0/P1 split, which is kept. e2e [multi-diner.js](../../backend/src-plattr/functions/test/e2e/suites/multi-diner.js)
  MD-8 expects 590 after a cancel with a served item. It will show whether the SERVED fix changes the figure.
- **No known-bug test exists** for TD-089 or TD-092. Write the red test first.

### Risks (D4)

- A round that is half served: the SERVED filter must match the order's own item status, or the till and the order
  disagree again.
- "Kitchen started" has no clean signal. `line.sent` means the kitchen was *told*. No app writes PREPARING. The KOT
  job's `printed` state is the nearest thing.

### Build order (D4)

Characterization test first, then: refuse-once-billed in `voidCartLines` (fixes the cart path too), then
order-cancel through it, then the SERVED filter, then Mark Paid removal and the COMPLETED guard.

### Questions for Shaurya (D4)

**Q4-1. How does the waiter say "it stays" vs "waste it"?** *Scene:* 20:15, the Butter Naan is on the tandoor. The
guest wants it off. D4 says the waiter decides.
- (a) The app asks nothing. A waiter who tells the guest "it's already cooking" just doesn't press Cancel. A cancel
  always removes it from the bill, and the audit row says whether the kitchen had it.
- (b) Cancel asks "Kitchen already making it — waste it?" and records the answer.
- **Recommended: (a).** "It stays" means nothing happens, so there's nothing to build. The row's P0/P1 already records
  whether the kitchen had it.

**Q4-2. What amount does the audit row show for a wasted dish?** *Scene:* the owner reads Monday's report: "Naan
cancelled after kitchen, ₹60".
- (a) The dish's price, as today. It is what the restaurant lost in food, even though the bill didn't change.
- (b) ₹0, with the price in the note.
- **Recommended: (a).** It's the real loss, and it's the number that catches a waiter cancelling too much.

**Q4-3. Cancel one dish, or only the whole order?** *Scene:* table 6 ordered naan, dal and paneer in one round, and
changes their mind about the naan only. Today the waiter can only cancel the whole order.
- (a) Whole order only, as today.
- (b) Add a per-dish cancel. It uses the same `voidCartLines` for one line.
- **Recommended: (b) if it's this week's work, else (a).** The scene in D4 is one Butter Naan, and whole-order cancel
  would take the dal and paneer with it. (b) is about 40 more lines and a button.

---

## D5. The guest's shared cart asks what to send

**Size M, not S.** About 7 files and 120 lines. The decision says "Checkout already sends the whole cart when no
`addedBy` is given, so this is mostly a screen change". The backend half is true and deliberate. The rest is not.

### What the code does today

- The phone's `addedBy` is a **device id** (`dev_` + 128 random bits), not the session or phone number
  ([frontend/flutter_boilerplate/lib/networking/device_id.dart:29-47](../../frontend/flutter_boilerplate/lib/networking/device_id.dart)).
- **The app cannot send the whole cart today.** `stampCartCall`
  ([dio_client.dart:179-194](../../frontend/flutter_boilerplate/lib/networking/dio_client.dart)) runs on add, remove
  **and checkout**, and line 191 always overwrites `addedBy`. A screen change alone sends only your dishes.
- "To Pay" ([cart_page.dart:700-708](../../frontend/flutter_boilerplate/lib/pages/cart_listing/cart_page.dart)) is the
  whole cart's `finalPrice` from the server. Proceed (`:740`) sends only this phone's lines. That's TD-119.
- The cart is fetched once, on open (`cart_page.dart:42`). **There is no refresh.** After a checkout the app blanks its
  whole local cart ([cart_listing_state.dart:571](../../frontend/flutter_boilerplate/lib/pages/cart_listing/cart_listing_state.dart)),
  even though friends' dishes are still on the server.
- `splitByOwner` ([cart_page.dart:202-213](../../frontend/flutter_boilerplate/lib/pages/cart_listing/cart_page.dart))
  already splits mine/theirs. It counts an item with **no** `addedBy` as mine. The server never sends such an item on
  an owned checkout ([F/orders/createOrUpdateOrder.js:100-101](../../backend/src-plattr/functions/orders/createOrUpdateOrder.js)).
- Backend with no `addedBy`: the whole cart is sent and the cart doc is deleted. This is deliberate and tested
  ([createOrUpdateOrder.characterization.test.js:268](../../backend/src-plattr/functions/test/unit/orders/createOrUpdateOrder.characterization.test.js)).
  But then `userId = 'system'` ([F/cart/checkoutCart.js:48](../../backend/src-plattr/functions/cart/checkoutCart.js)),
  so the round's `placedBy`, the kitchen ticket's "by" and `statusHistory` all lose who ordered it. The stock check
  covers the whole cart (`:94`).
- The waiter's Add Dishes writes the **same cart doc** under the guest's session, with `addedBy: 'staff:<id>'`
  ([add_dishes_screen.dart:198-225](../../frontend/src-platter-apps/apps/platter_server/lib/pages/tables_home/add_dishes_screen.dart)), and the till
  will too ([SPEC_OR](../SPEC_OR_till_order_entry.md) R4, line 140).
- Who-ordered-what downstream: nothing reads per-dish `addedBy` after checkout. Receipts, the till, reports and
  per-guest split don't use it. Only the round-level `placedBy` reaches the line snapshot and the kitchen ticket
  ([F/domain/kot.ts:255](../../backend/src-plattr/functions/domain/kot.ts)).

### Every way "Send all 3 for the table" goes wrong

| # | What happens | Why (code) |
|---|---|---|
| 1 | The app still sends only your dish | The interceptor overwrites `addedBy` (`dio_client.dart:191`) |
| 2 | The round says "placed by system", and the kitchen ticket says "by guest" for the waiter's items too | No `addedBy` → `userId='system'` (`checkoutCart.js:48`) |
| 3 | "All 3" goes out as 4, or 2 | The phone's list is a one-time fetch. The transaction sends whatever is in the cart at commit (`createOrUpdateOrder.js:93-101`). Nothing checks the list still matches. |
| 4 | A guest's send-all takes the waiter's half-entered round. The waiter's own Send then fails with "Cannot process an empty cart" though the food was ordered | Same cart doc (`add_dishes_screen.dart:201-225`; `createOrUpdateOrder.js:138-140`) |
| 5 | A friend's sold-out prawns refuse the whole table's send | The stock check is scoped by `addedBy` only (`checkoutCart.js:94`). This undoes the MD-12 guarantee. |
| 6 | A dish added in the last second skips the stock check | The check runs on a read made outside the transaction (`checkoutCart.js:57`) |
| 7 | Two phones press at once: one wins, the other sees an empty-cart error though its food went | Two phones mean two different `requestId`s, so there's no cross-phone dedup (multi-diner MD-6) |
| 8 | "Send mine" times out, then "Send all" is refused with "requestId already used for a different cart" | The id is kept after a lost answer (`checkout_request_id.dart:15`; `createOrUpdateOrder.js:130-131`) |
| 9 | "Your dishes ₹60" shows an item that "Send yours" will not send | Unowned items count as yours on the phone (`cart_page.dart:206`) but not on the server (`:101`) |
| 10 | After "Send mine", the Table total disappears while friends' dishes are still waiting | Local cart wiped (`cart_listing_state.dart:571`) |
| 11 | The ₹ on the screen is not the ₹ on the bill | Offers are evaluated on the round sent (`createOrUpdateOrder.js:384`) |
| 12 | With the waiter gate on, one guest's send-all becomes one round awaiting the waiter for everyone. Per-person tickets merge into one "by guest" ticket. | The gate is per round (`createOrUpdateOrder.js:72-77`) |

**Is "no `addedBy` = whole cart" a supported path?** It is deliberate legacy behaviour (comment at
`createOrUpdateOrder.js:36-38`, a characterization test), kept for callers from before cart ownership. It is not a
path anyone designed for a guest to use: it drops attribution and ignores staff items. Don't build D5 on it.

### The safer shape

Keep `addedBy` on every call. Add `scope: 'mine' | 'table'` and `expect: [cartItemId…]` (what the phone showed). The
server refuses if the live cart differs ("Your table's order changed — check it again"). `scope: 'table'` sends every
**guest** item (not `staff:*`) and keeps each item's own `addedBy` for attribution. Its stock check covers exactly
what is sent. About 30 backend lines in `checkoutCart.js` and `createOrUpdateOrder.js`, plus the screen, the
interceptor and a fresh cart read before the choice. The `requestId` resets when the scope changes.

### Docs (D5)

[SPEC_OR](../SPEC_OR_till_order_entry.md): line 30 ("Not send the whole table's cart", 2026-09-16) is now "the guest
may choose; staff items are never swept" (Decisions row). Line 232 claims `addedBy` "already carries per-person
attribution", which is true only inside `carts[].items`, where nothing reads it. Fix the sentence. TECH_DEBT TD-119.

### Tests that pin today's behaviour (D5)

- Backend: [createOrUpdateOrder.characterization.test.js:216-274](../../backend/src-plattr/functions/test/unit/orders/createOrUpdateOrder.characterization.test.js)
  (`:255` refuses when the placer has nothing, `:268` no `addedBy` sends all). `test/unit/cart/cartOwnership.test.js`.
  e2e [multi-diner.js](../../backend/src-plattr/functions/test/e2e/suites/multi-diner.js) MD-3, MD-6, MD-12, MD-13;
  `multi-diner-offers.js:123-202`; `order-entry.js:85-143` (the waiter's own round must not be swept).
- Flutter: `frontend/flutter_boilerplate/test/cart_device_id_test.dart:22` pins stamping on checkout;
  `cart_owner_split_test.dart`; `checkout_request_id_test.dart`.
- No known-bug test exists for TD-119. Write one first.

### Build order (D5)

Backend `scope` + `expect` with unit tests, then the interceptor, then the screen (fresh read before the dialog, two
totals, the choice), then the post-send refresh instead of the wipe.

### Questions for Shaurya (D5)

**Q5-1. Does "Send all for the table" include the waiter's half-entered dishes?** *Scene:* 21:20, the captain is
punching an Old Monk ₹180 into table 12's cart on his phone. A guest taps "Send all 3 for the table" at the same
second.
- (a) Guests' dishes only. Staff items (`staff:*`) are never swept, and the captain sends his own.
- (b) Everything on the cart.
- **Recommended: (a).** With (b), the captain's Send fails with "empty cart" though his drink went, and it goes out as
  if the guest ordered it.

**Q5-2. The table's list changed while the guest was deciding.** *Scene:* the guest sees "Send all 3". Meanwhile a
friend adds a Coke.
- (a) Refuse and reshow: "Your table's order changed — 4 dishes now". The guest taps again.
- (b) Send whatever is there at that moment (4 dishes).
- **Recommended: (a).** The guest agreed to 3. Sending 4 is the same screen-vs-send mismatch D5 exists to fix.

---

## D6. Admin edits to add-ons and portions apply everywhere

**Size M, upper end.** About 9 files and 250 lines. One new endpoint, a guard on the existing one, two admin editors,
the dish save, and three dead files deleted. Pricing code is untouched, as the decision says.

### What the code does today

- Dishes store add-ons as **ids** and portions as `[{id, name}]`. The menu read builds each dish from the shared
  records ([F/menu/menuHelpers.js:176-180](../../backend/src-plattr/functions/menu/menuHelpers.js)). An add-on sent
  back as an object resolves to nothing and is silently dropped: that is TD-106. A portion's **price** comes from the
  shared record, but its **name** comes from the dish's copy (`:177`).
- An add-on that is out of stock is removed from the dish on the guest read (`isInStock == true` filter,
  [F/menu/menu_fetch.js:141](../../backend/src-plattr/functions/menu/menu_fetch.js)). The guest app never reads add-on
  stock itself. It relies on this. Portions have **no stock field anywhere**.
- Add to cart reads the shared records, refuses an add-on not listed on the dish or out of stock, and stores the
  price on the cart line ([F/cart/addItemToCartBoilerplateHelper.js:304-417](../../backend/src-plattr/functions/cart/addItemToCartBoilerplateHelper.js)).
  Checkout re-reads add-on **stock** only, not price ([F/cart/checkoutCart.js:199-208](../../backend/src-plattr/functions/cart/checkoutCart.js)).
- Placing freezes every add-on and portion as a component of the line with its name and price
  ([F/orders/lineSnapshots.js:53-75](../../backend/src-plattr/functions/orders/lineSnapshots.js)). Billing reads no
  menu at all. **No path re-prices a placed line**, so a mid-service price change is safe for placed food.
- `menu-updateMenuItem` ([F/menu/menu.js:218-271](../../backend/src-plattr/functions/menu/menu.js) →
  [F/menu/menuItem.js:183-235](../../backend/src-plattr/functions/menu/menuItem.js)) writes whatever it is sent. It
  doesn't check the add-on shape and writes **no audit row**. No menu endpoint writes one.
- **Trap for "save only changed fields":** [F/menu/menuItem.js:192-198](../../backend/src-plattr/functions/menu/menuItem.js)
  always writes `isCustomizable`, computed from the `addons`/`variants` in the request. A description-only save would
  set `isCustomizable: false`.
- **No live endpoint writes `restaurants/{id}/addons` or `/variants`.** The stock toggle
  (`menu-updateMenuItemAvailability`, [F/menu/menu.js:330-418](../../backend/src-plattr/functions/menu/menu.js))
  writes only a dish's `isInStock`. It is called by both the admin and the waiter app.
- **[F/menu/creation/variant.js](../../backend/src-plattr/functions/menu/creation/variant.js) is dead, confirmed.**
  Nothing requires it, and it can't even load: `require('../admin/admin')` and `require('./menuValidation')` point at
  files that don't exist. Its siblings `menu_add.js` and `menu_remove.js` are dead the same way (only a proposal doc
  names them). Only `cateogory.js` is live. Delete all three.
- Admin app: the dish save sends `item.toJson()`, with full add-on and portion objects and `isInStock`
  ([menu_catalog_provider.dart:278-299](../../frontend/src-platter-apps/apps/platter_admin/lib/pages/menu/menu_catalog_provider.dart)).
  The add-on and portion editors change only the dish's in-memory copy
  ([addon_editor_dialog.dart:23-60](../../frontend/src-platter-apps/apps/platter_admin/lib/pages/menu/editors/addon_editor_dialog.dart),
  `variant_editor_dialog.dart:35-205`). **A new add-on made there gets an id like `addon_1727…` that exists in no
  shared record**, so the menu read drops it and the cart refuses it.

### What has to change

| Layer | File | Change |
|---|---|---|
| backend | new, beside [F/menu/menu.js](../../backend/src-plattr/functions/menu/menu.js) | `menu-updateSharedOption` (name it as you like): ADMIN/MANAGER, `kind: 'addon' \| 'variant'`, changed fields only (name, price, `isInStock` for add-ons), price ≥ 0, one audit row with before and after. It answers with the count of dishes using it, computed on the server. |
| backend | [F/menu/menuItem.js:192-198](../../backend/src-plattr/functions/menu/menuItem.js), [F/menu/menuValidation.js:180-195](../../backend/src-plattr/functions/menu/menuValidation.js) | Refuse object-shaped `addons`. Keep `variants` as `{id, name}`. Write `isCustomizable` only when `addons` or `variants` are in the update. |
| backend | [F/menu/creation/](../../backend/src-plattr/functions/menu/creation/) | Delete `variant.js`, `menu_add.js`, `menu_remove.js`. |
| admin app | [menu_catalog_provider.dart:278-299](../../frontend/src-platter-apps/apps/platter_admin/lib/pages/menu/menu_catalog_provider.dart) | Send only the changed fields, with add-ons as ids (fixes TD-106 and TD-110). |
| admin app | [addon_editor_dialog.dart](../../frontend/src-platter-apps/apps/platter_admin/lib/pages/menu/editors/addon_editor_dialog.dart), `variant_editor_dialog.dart` | Price, name and stock edits call the new endpoint and show "Raita is on 6 dishes — this changes all 6". Removing from this dish stays a dish edit. |

**Counting "on 6 dishes".** Do it on the server: `menuItems where addons array-contains 'ma_extra_raita'`. Counting on
the admin screen would be wrong: the admin's menu load is filtered to the active menu (TD-111), and a dish already
broken by TD-106 has lost its add-ons from the result. The seed's `itemsAssociatedWith` on each shared record is
maintained by no code. Don't trust it; delete it or leave it unread. Portions are stored as `{id, name}` objects, which
`array-contains` can't match by id. Either store a `variantIds` array on the dish, or scan the restaurant's dishes (a
few hundred documents).

### Docs (D6)

There is no menu spec sheet. Per the contract, the decision goes into the [STATE.md](../STATE.md) decisions log (as a
proposed diff, since agents can't edit STATE decisions). TECH_DEBT TD-106, TD-107 and TD-110 close. TD-111 (the admin
menu filtered to the active menu) is touched by the counting note above.

### Tests that pin today's behaviour (D6)

- **No test covers `menu-updateMenuItem` at all.** Write a characterization test first (existing dir rule).
- Must stay green: `test/unit/cart/addItemToCartHelper.test.js:116-138` (add-ons as ids, out of stock refused, "not
  offered"), `test/unit/cart/checkoutStock.test.js`, `test/unit/orders/lineSnapshots.characterization.test.js`,
  `platter_server/test/contract/menu_update_menu_item_availability_contract_test.dart`.
- No known-bug test exists for TD-106, TD-107 or TD-110 (they're only in TECH_DEBT). Write them first.

### Risks (D6)

- **A stale tab, one level up.** If the new endpoint writes the whole shared record from the editor's copy, the TD-110
  bug comes back for every dish at once: a manager's old tab puts Raita back on sale. Changed fields only, and compare
  `lastUpdated`.
- **A guest's cart keeps the old price.** Raita ₹40 in a cart at 19:55, raised to ₹50 at 20:00, placed at 20:05 at
  ₹40. The price is frozen when the dish is **added to the cart**, not when it is placed, and checkout re-checks only
  stock. See Q6-2.
- **Switching an add-on off hits every open cart.** Checkout refuses any cart that holds it (`checkoutCart.js:204-207`),
  so one tap can stop several tables' rounds. That's correct, but the manager should know.
- **Delete.** Deleting a shared add-on that dishes still reference: the menu read drops it, but add-to-cart answers
  "not found" and checkout blocks carts that hold it. Refuse the delete while any dish uses it. That's not in D6's
  wording, so it is a small extra.
- **Portion rename.** The guest menu shows the dish's copy of the name (`menuHelpers.js:177`), the cart shows the
  shared name (`addItemToCartBoilerplateHelper.js:356`). Rename the shared record and the menu doesn't change. Pick
  one source (the shared one) in the same change.

### Build order (D6)

Characterization test on `menu-updateMenuItem`, then its guard (TD-106), then the admin dish save sending changed fields
(TD-106/110 fixed), then the new endpoint with the audit row, then the two editors and the warning, then the dead files.

### Questions for Shaurya (D6)

**Q6-1. Who switches an add-on off?** *Scene:* 20:00, the kitchen runs out of raita. The waiter is the one who hears it.
Today the waiter app can mark a **dish** sold out, but nobody can mark an add-on.
- (a) Admin app only (manager's phone).
- (b) Admin app and the waiter app's existing stock screen, on the same shared record.
- **Recommended: (b).** Otherwise raita keeps selling for however long it takes to find the manager. The endpoint is the
  same, the waiter app gains one list.

**Q6-2. A price change and carts that already hold the item.** *Scene:* Raita ₹40 → ₹50 at 20:00. A guest added it at
19:55 and presses Proceed at 20:05.
- (a) They pay ₹40. The price is fixed when added to the cart. Nothing changes.
- (b) Checkout re-prices add-ons and portions from the shared records, so they pay ₹50 and the cart shows the new
  total.
- **Recommended: (a).** The decision says pricing is untouched, the window is minutes, and the guest saw ₹40. Write it
  into the Decisions row.

**Q6-3. A new add-on made from the dish editor.** *Scene:* the manager adds "Extra cheese ₹30" while editing Margherita.
Today it gets a made-up id, and the guest can never buy it.
- (a) The dish editor creates a shared add-on and links it to this dish in one step.
- (b) New add-ons are made only on a separate Add-ons page and then linked.
- **Recommended: (a).** It's where the manager already is, and it's one more branch in the same new endpoint.

**Q6-4. A portion shared by two dishes that should now differ.** *Scene:* Chicken and Mutton biryani share one
"Family" portion at ₹260. The manager wants Mutton Family at ₹300 and Chicken to stay ₹260. (The QA repro did exactly
this.)
- (a) Edits always change the shared record. To make them differ, the manager asks for a separate portion (a
  developer or a later screen).
- (b) The editor offers "Change for all 2 dishes" or "Only Mutton biryani". The second copies the portion into a new
  shared record and relinks just this dish.
- **Recommended: (b).** With (a) the manager can't do the most natural edit on a biryani menu at all. It's about 40
  more lines on the same endpoint.

---

## Could be combined / shared work

| Combine | Why |
|---|---|
| **D3 + D2a** | D3 is the guard the Edit needs. One change in domain `cancel`, one test file. Ship D3 first, the same day. |
| **D2c + "Must decide" 4 (offers on liquor)** | Both are the weights of one apportion over the order's lines. Write it once. |
| **D1 + D2d** | Both change what a sitting's bills mean on the floor (`unpaid`, `settled`, `acceptsNewGuests`). Walk-out ends the sitting, and a paid sitting refuses new rounds. Same file, same tests ([F/domain/floor.test.ts](../../backend/src-plattr/functions/domain/floor.test.ts)). |
| **D1 + TD-063 + TD-064 + TD-073** | As the TECH_DEBT rows already say: land together. |
| **D2a + D4** | Both end in "once the bill is printed, only the till's Edit changes it". D4's refusal message names the Edit button, so D2a should exist first or the refusal points nowhere. |
| **D2b + TD-067 + D2 "morning report"** | Service-charge rows, the comp row's `pct` and the refused-comp row are all issue-time audit rows (QB-4, QB-7, QB-12). One commit. Then TD-005 reads them. |
| **D4 + TD-092 + TD-010** | Mark Paid removal and the COMPLETED guard are one change to `updateOrderStatus.js`. |
| **D2d + "Fine with the default" 14 (TD-090)** | Both touch how the waiter and guest join a session. |
| **D5 + D2d** | Guest checkout gets two new checks in the same transaction: the paid-table refusal and the scope/expect check. |

## Code-comment sites

Leave `// DECISION(Dn, 2026-09-25): <scene>. If you change this, ask Shaurya first.` (Dart uses the same `//` form)
at:

| Decision | File:line | Scene for the comment |
|---|---|---|
| D1 | [F/domain/billing.ts:157](../../backend/src-plattr/functions/domain/billing.ts) | Table 6 leaves on ₹660: the bill stays, marked walked out, number kept |
| D1 | [F/domain/payments.ts:137-139](../../backend/src-plattr/functions/domain/payments.ts) | A walked-out bill stays walked out when a part payment on it is voided |
| D1 | [F/app/payments.ts:71](../../backend/src-plattr/functions/app/payments.ts) | Same, the app-side derivation |
| D1 | [F/app/floor.ts:327](../../backend/src-plattr/functions/app/floor.ts) | Walk-out marks the unpaid bills walked out and frees the table; only the unpaid part is written off |
| D1 | [F/domain/floor.ts:115](../../backend/src-plattr/functions/domain/floor.ts) | A walked-out bill owes nothing on the floor |
| D1 | [F/domain/dayClose.ts:212](../../backend/src-plattr/functions/domain/dayClose.ts) | "₹660 walked out" is its own line at close, not inside comps, and does not block the close |
| D2 | [F/app/billing.ts:180](../../backend/src-plattr/functions/app/billing.ts) | 22:10 table 12 adds gulab jamun: Edit cancels A-0417 as "edited" with no PIN, and the new bill says it replaces it |
| D2 | [F/app/billing.ts:69](../../backend/src-plattr/functions/app/billing.ts) | ₹882 table with ₹100 off split in two: eligibility on the whole table, amount shared by value (BL-S3 rule) |
| D2 | [F/domain/billing.ts:82](../../backend/src-plattr/functions/domain/billing.ts) | Same, the clamp that makes each half take only its share |
| D2 | [F/domain/floor.ts:263](../../backend/src-plattr/functions/domain/floor.ts) | Table 12 has paid: no new round, no new guest until Clear |
| D2 | [F/app/floor.ts:291](../../backend/src-plattr/functions/app/floor.ts) | Merging a free table into one with a printed unpaid bill is refused |
| D2 | [F/session/sessionService.js:44](../../backend/src-plattr/functions/session/sessionService.js) | A stranger scanning a paid table does not join the paid party |
| D2 | [frontend/till/src/features/billing/useBill.ts:26](../../frontend/till/src/features/billing/useBill.ts) | A service charge removed before an Edit stays removed on the new bill |
| D2 | [frontend/till/src/features/payments/TenderScreen.tsx:77](../../frontend/till/src/features/payments/TenderScreen.tsx) | Edit lives on the till only; the waiter app has no bill powers |
| D3 | [F/domain/billing.ts:175](../../backend/src-plattr/functions/domain/billing.ts) | ₹500 already paid on A-0004: Edit and Cancel refused, take the rest first |
| D4 | [F/orders/updateOrderStatus.js:95](../../backend/src-plattr/functions/orders/updateOrderStatus.js) | 20:10 a guest drops the Butter Naan: cancel takes it off bill and kitchen, audited, no PIN |
| D4 | [F/orders/lineSnapshots.js:180](../../backend/src-plattr/functions/orders/lineSnapshots.js) | Once the bill is printed the waiter's cancel is refused; only the till's Edit changes it |
| D4 | [F/domain/approvals.ts:71](../../backend/src-plattr/functions/domain/approvals.ts) | The waiter's cancel after the kitchen started is allowed and audited, no PIN (relaxes ST-S5/R8) |
| D4 | [order_detail_screen.dart:220](../../frontend/src-platter-apps/apps/platter_server/lib/pages/orders_home/order_detail_screen.dart) | Mark Paid removed: the till owns payment (TD-010) |
| D5 | [F/orders/createOrUpdateOrder.js:100](../../backend/src-plattr/functions/orders/createOrUpdateOrder.js) | Table 8: "Send your 1 dish" or "Send all 3 for the table"; staff items never swept |
| D5 | [F/cart/checkoutCart.js:94](../../backend/src-plattr/functions/cart/checkoutCart.js) | A friend's sold-out dish never blocks your own send |
| D5 | [dio_client.dart:191](../../frontend/flutter_boilerplate/lib/networking/dio_client.dart) | `addedBy` is always this phone; "send all" is a scope, never a missing `addedBy` |
| D5 | [cart_page.dart:202](../../frontend/flutter_boilerplate/lib/pages/cart_listing/cart_page.dart) | "Your dishes ₹60 · Table ₹340" |
| D6 | [F/menu/menuHelpers.js:176](../../backend/src-plattr/functions/menu/menuHelpers.js) | Raita is on 6 dishes: every dish reads the one shared add-on record, dishes hold ids only |
| D6 | [F/menu/menuItem.js:192](../../backend/src-plattr/functions/menu/menuItem.js) | A description-only save must not touch add-ons, portions, stock or `isCustomizable` |
| D6 | [F/cart/addItemToCartBoilerplateHelper.js:406](../../backend/src-plattr/functions/cart/addItemToCartBoilerplateHelper.js) | Raita out of stock is refused on every dish, guest app first |
| D6 | [F/cart/checkoutCart.js:199](../../backend/src-plattr/functions/cart/checkoutCart.js) | Same, re-checked at send; the price stays as it was when added (Q6-2) |
| D6 | [menu_catalog_provider.dart:282](../../frontend/src-platter-apps/apps/platter_admin/lib/pages/menu/menu_catalog_provider.dart) | The dish editor saves only what the manager changed, add-ons as ids |
| D6 | [addon_editor_dialog.dart:23](../../frontend/src-platter-apps/apps/platter_admin/lib/pages/menu/editors/addon_editor_dialog.dart) | "Raita is on 6 dishes — this changes all 6"; removing from one dish is a dish edit |

## Top five questions

1. **Q1-1 (D1). Walk-out on food that was never billed.** 22:40, table 6 ate ₹600 and left before asking for the bill,
   so there is no bill to mark. (a) the walk-out issues the bill itself and marks it walked out, (b) mark the lines
   with no bill (no invoice, no GST, pre-tax figure), (c) refuse until the bill is printed. **Recommended (a):** every
   walk-out is one numbered bill at what the guest would have paid, and day close needs one rule. Costs GST on the ₹600.
2. **Q2-1 (D2/D3). A new round on a part-paid bill.** Table 10 owes ₹4,800, a friend paid ₹2,000, then they order a ₹240
   gulab jamun. D3 refuses Edit and issue refuses the draft, so the dessert can't be billed. (a) refuse new rounds while
   a bill has money on it but isn't settled, (b) accept and split the dessert onto a second bill, (c) accept onto a new
   draft automatically. **Recommended (a):** it matches "a table doesn't pay part and then reorder" and is the
   paid-table check.
3. **Q5-1 (D5). Does "Send all for the table" include the waiter's half-entered dishes?** The captain is punching an
   Old Monk into table 12's cart as a guest taps Send all. (a) guests' dishes only, staff items never swept, (b)
   everything. **Recommended (a):** with (b) the captain's Send fails with "empty cart" and his drink goes out as the
   guest's.
4. **Q6-4 (D6). A portion shared by two dishes that should now differ.** Chicken and Mutton biryani share "Family" at
   ₹260; the manager wants Mutton at ₹300. (a) edits always change both, (b) the editor offers "Only Mutton biryani",
   copying the portion and relinking that dish. **Recommended (b):** otherwise the most natural biryani edit can't be
   made at all.
5. **Q2-5 (D2). The PIN-free Edit before the report that catches abuse exists.** A cashier takes ₹1,050 cash, edits
   off the service charge, records ₹1,000 and keeps ₹50. Only a per-cashier count catches it, and nothing reads the
   audit rows yet (TD-005). (a) ship with no PIN now and write the rows, (b) keep a PIN on service-charge removal until
   TD-005 exists. **Recommended (a):** we aren't live. Put TD-005 on the pickup list before any real outlet.

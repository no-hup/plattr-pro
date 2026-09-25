# QA · till bill screen · 2026-09-25

Driver run, screen-exploration mode ([AGENT_QA.md](../../AGENT_QA.md) §5), following the grid in
[2026-09-25-qa-bill-screen-grid.md](2026-09-25-qa-bill-screen-grid.md). Restaurant `res_meghana`, emulator slot 1
(Firestore `127.0.0.1:8180`, functions `:5102`), till at `http://127.0.0.1:5174/?r=res_meghana`, seed MockData7.
Headless Chromium through Playwright. States were made with
[floorstate.mjs](../../backend/src-plattr/functions/test/e2e/qa/floorstate.mjs), which calls the real endpoints. I
added one state to it, `offer`: Chicken 65 + Coastal Crab Roast in one checkout, so the ORDER offer FLAT ₹100 fires.
It was tested on table 12 before I used it.
Trajectory: [qa-bill-screen-2026-09-25.jsonl](../../backend/src-plattr/functions/test/e2e/results/qa-bill-screen-2026-09-25.jsonl).
Screenshots: `/private/tmp/claude-501/-Users-shaurya-Desktop-dev-plattr-pro/3f613176-28cf-443a-a752-78de23bca6c4/scratchpad/qa-bill/shots/`
(scratchpad, outside the repo).

Helper env for every step below:
`cd backend/src-plattr/functions/test/e2e/qa && export FIRESTORE_EMULATOR_HOST=127.0.0.1:8180 PLATTR_BASE_URL=http://127.0.0.1:5102/rms-app-dd875/us-central1`.
"Clean re-seed" means `node mock/importMockData5.js --file=mock/MockData7ProductionMenus.json --clean --refresh-timestamps`
run from `backend/src-plattr/functions` with the same Firestore host.

## 1. Summary

I ran **73 cells**: **36 PASS, 25 FAIL, 8 NOTE, 3 BYPASSED, 1 NOTBUILT**. That took about 185 browser actions and
about 20 forced re-logins (TD-052). I re-seeded three times. The emulator stayed up for the whole run.

What held:
- The money is right on every single-draft bill I checked by hand: naan ₹66.00, ₹63.00 with the charge removed, the
  FLAT ₹100 offer at ₹882.00, three dishes with the offer at ₹948.00, a ₹20 line discount at ₹44.00, a voided line,
  and the parcel at ₹84.00.
- The TD-040 stale-preview guard works in the browser.
- Roles hold. SERVER and KITCHEN are refused Generate and Comp with "Not allowed", and never see a PIN box.
- The PIN slowdown works. Cancelling a paid bill is refused before the PIN box.
- The line-discount screen matches ST in every cell.

What did not hold:
- **A split gives the order offer twice.** A ₹882 table became ₹198 + ₹573 = ₹771, so ₹111 was given away (QB-1).
- **Cancelling a part-paid bill goes through.** The cash already taken is left on a dead bill. The new bill and the
  floor ask for the full amount again (QB-2).
- **Dessert after the bill cannot be billed from any screen.** Once the cashier has left the bill screen, nothing
  reaches Cancel (QB-3).
- **Food and drinks on separate bills has no control on the till** (NOTBUILT). The backend split works, apart from
  the offer bug in QB-1.
- A comp refused after the PIN still writes a P0 "billDiscount" audit row (QB-4). A comped parcel still owes ₹21
  (QB-5).

## 2. Findings (most severe first)

### QB-1 · A split draft gives the whole order offer to each half · P0

**Scene.** Friday 21:30, table 12. A Chicken 65 (₹280) and a Coastal Crab Roast (₹620) earn the ₹100-off offer, and
the bill previews at ₹882. The two guests want separate bills. The cashier splits the crab onto its own draft. Each
half now shows "−₹100.00". The bills print at ₹198.00 and ₹573.00, ₹771 together. The restaurant has lost ₹111, and
the more halves, the more it loses.

**Steps to reproduce** (from a clean re-seed):
1. `node floorstate.mjs 12 offer`. Note the `guest session` id `<g>`.
2. Log in as `till@meg.test`. Open `?r=res_meghana&draft=<g>` and read `payable`. It says ₹882.00.
3. Call `billing-split {restaurantId:'res_meghana', sessionId:<manager login>, cid, draftId:<g>, moves:[{lineId:<crab line>, toDraftId:'<g>_b'}]}`.
   There is no screen for this (see QB-3 and the NOTBUILT row).
4. Click `preview`. Then open `?draft=<g>_b`. Click `issue` on each.

**Expected.** D 2026-09-15: "a split drops the bill discount on both drafts and the cashier re-applies it per draft
(the alternative, cloning it, cuts twice)". Hand-worked: half A ₹309.00, half B ₹684.00 (grid §6 case 4-split). Either
way, the two halves must never add up to less than the unsplit ₹882. BL-S12: "any bill
discount is recomputed per draft".

**Actual.**
- Screen, half A: `Chicken 65 × 1 ₹280.00 −₹100.00`, `SERVICE_CHARGE 5%: ₹9.00`, `Payable ₹198.00`.
- Screen, half B: `Coastal Crab Roast × 1 ₹620.00 −₹100.00`, `SERVICE_CHARGE 5%: ₹26.00`, `Payable ₹573.00`.
- Database, bill A-0004 (draft `<g>_b`): payable 57300, line `billDiscount` 10000.
- Database, bill A-0005 (draft `<g>`): payable 19800, line `billDiscount` 10000.
- Both numbers match the "offer cloned" figures in the grid exactly. The service charge and tax are correct for what
  each half was given.

**Evidence.** Cells `preview:S14-A`, `preview:S14-B`, `issue:S14`. Screenshots `shots/s14_A.png`, `shots/s14_B.png`.

**Where to look.** `app/billing.ts` `compute()`: `orderOffer(open[0].orderId)` is applied to every draft that holds a
line of that order.

### QB-2 · Cancelling a part-paid bill leaves the cash on a dead bill, and the table is asked for the full amount again · P0

**Scene.** Table 11's bill is ₹66. One guest pays ₹33 in cash and the other says the naan was cold. The cashier
still has the bill on screen, presses Cancel, and enters their PIN. It says "Bill 0006 cancelled". They generate a
new bill: ₹66.00. The floor says `₹66.00 due`. Nothing on either screen mentions the ₹33 already in the drawer. The
guest either pays ₹99, or the drawer is ₹33 over at close with nothing to explain it.

**Steps to reproduce** (from a clean re-seed):
1. `node floorstate.mjs 11 ordered`. Note `<g>`.
2. Log in, open `?draft=<g>`, and click `issue`. The screen says `#A-nnnn`, ₹66.00. **Do not reload.**
3. From outside, call `payments-take {billId, tenderId:'cash', amount:3300, tendered:3300, …}`. This is what
   `floorstate partpaid` does.
4. On the same page, choose `cancel-reason` = other and click `cancel`. Then `pin-input` 1234, then `pin-ok`.
5. Click `preview`, then `issue`. Open the floor.

**Expected.** BL "Who can do what": cancel is for "an issued, **unpaid** bill". PY-S14: "cancelled under BL-S9
**before anyone paid**". PY-S25 allows cancelling a half-paid bill only as a step towards a new bill that takes the
money. So either the cancel is refused while cash is on the bill, or the ₹33 visibly moves to the new bill or is
refunded.

**Actual.**
- Screen: PIN hint `Needed for this cancelBill`, then `#A-0006 (cancelled)` and "Bill 0006 cancelled". No mention of
  money taken.
- Database: bill 0006 has `status cancelled`, `paidTotal 3300`. The payment row `qa_pp_…` (take, cash, 3300) still
  points at 0006, not voided. The line is freed (`billId null`).
- Re-issue: bill 0007 has payable 6600 and paidTotal 0.
- Floor tile 11: `11 ₹66.00 due`.
- The tender screen for 0006 reads `payable ₹66.00 · paid ₹33.00 · outstanding ₹33.00 [cancelled]`. The only way
  out I found is to void the take row there (PIN, `voidPayment`). Nothing tells the cashier to do that.

**Evidence.** Cells `setup:S9`, `cancel:S9`, `cancel:S9-tender`, `cancel:S9-reissue`, `cancel:S9-floor`,
`cancel:S9-void`. Screenshots `shots/s9_cancel_partpaid.png`, `shots/s9_tender_after_cancel.png`, `shots/s9_floor.png`.

**Where to look.** `app/billing.ts` `cancel()` checks only `status !== 'issued'`, and PY keeps a part-paid bill
`issued`.

### QB-3 · Dessert after the bill: no screen can bill it · P1

**Scene.** Table 10's ₹66 bill is printed at 21:10. At 21:15 they order one more naan. The cashier taps table 10 and
picks the ₹60 draft. Generate bill answers `already issued A2iFCDp84fRupzZD62Mu`. The cashier goes back to the floor
and picks the ₹66 bill instead. That opens the tender screen, which has no Cancel. Opening the draft again shows only
the naan, with no Cancel either. The cashier cannot bill the dessert, and cannot undo the first bill to re-bill
everything. The only way to take the ₹60 is off the books.

**Steps to reproduce** (from a clean re-seed):
1. `node floorstate.mjs 10 dessert`. Note `<g>`.
2. Log in. Tap `tile-10`. The `floor-picker` shows `pick-draft-<g>` "₹60.00 · 1 items" and `pick-bill-<id>` "₹66.00 due".
3. Tap `pick-draft-<g>`, log in again (TD-052), and click `issue`.
4. Go back to the floor. Tap `tile-10`, then `pick-bill-<id>`, and look for Cancel.
5. Open `?draft=<g>` again and look for Cancel.

**Expected.** FL-S20 keeps "billed and still ordering" as a normal state: the tile reads `₹66 due · ₹60 new`. Some
path should bill the ₹60. Either it gets its own draft and number, or the first bill is cancelled (BL-S9, PIN,
reason) and everything is re-issued. BL-S7 says a refusal names the number ("already issued 0417").

**Actual.**
- Generate: `bill-msg` = `already issued A2iFCDp84fRupzZD62Mu`, and no number.
- Tender screen controls: `tender-cash/card/upi/account, amount, tip, take, refund-*`. There is no cancel and no link
  to the draft.
- `?draft=<g>`: Preview, Generate, Remove service charge, Comp. There is no cancel.
- Database: bill A-0002 is still `issued`, 6600. The first line has `billId` = A-0002 and the new line has
  `billId null`, both with `draftId <g>`. So `issue` reads a draft that holds an already-billed line.
- The old bill is never silently edited. Its number and money are untouched.

**The paths that do work, both BYPASSED because they need an API call:**
- (a) `billing-cancel` on A-0002 (PIN, reason) writes a P0 `cancelBill` audit row, then Preview → Generate on the
  same draft gives **A-0003 at ₹132.00** (hand-worked 12000 + 600 + 2×315 = 13230 → ₹132.00). A-0002 stays
  `cancelled` with its number.
- (b) `billing-split` of the new line onto `<g>_d` makes the floor picker offer that draft, and Generate gives
  **A-0007 at ₹66.00** beside the untouched A-0006.

**Evidence.** Cells `dessert:floor-tap`, `preview:S18`, `issue:S18`, `dessert:tender-cancel`, `dessert:draft-cancel`,
`dessert:cancel-api`, `dessert:reissue`, `dessert:split-api`, `dessert:after-split`. Screenshots
`shots/dessert_picker.png`, `shots/dessert_issue.png`, `shots/dessert_tender.png`, `shots/dessert_reissued.png`,
`shots/dessert_split_issued.png`.

**Where to look.** `app/billing.ts` `issue()`: the `taken` check runs over `linesOfDraft`, which includes lines
already on a bill. Cancel exists only in `BillScreen` for a bill issued in the same page load.

### QB-4 · A comp that is refused still writes a P0 "billDiscount" audit row · P1

**Scene.** On the dessert draft from QB-3, the cashier tries the other button, "Comp the whole bill" with reason
complaint, and enters their PIN. It is refused with the same `already issued …`. The owner's audit now shows a P0
₹60 comp by the till login, which never happened. The same happens after any stale preview. When the owner reads the
log (TD-005), they will think the cashier gave food away.

**Steps to reproduce.**
- Dessert: steps 1–3 of QB-3. Then choose `comp-reason` = complaint, click `comp`, enter PIN 1234, click `pin-ok`, and
  run `node floorstate.mjs audit 3`.
- Stale: `node floorstate.mjs 8 ordered`. Open `?draft=<g>`. From outside, add and check out a second dish with the
  guest session. Then comp, entering PIN 1234.

**Expected.** D 2026-09-15: "no P0 row is written for a thing that did not happen". Grid §3 Comp S15.

**Actual.**
- Dessert: `bill-msg` = `already issued A2iFCDp84fRupzZD62Mu`. New audit row: `billDiscount`, sev `P0`,
  amount 6000, reason complaint, note "bill discount 6000 of 6000", staff `srv_meg_till`.
- Stale: `the bill changed since the preview, preview again`. New audit row: `billDiscount` P0, 6000, "bill discount
  6000 of 12000".
- When **every** line of the draft is already billed (a second till), the base is 0. ST then refuses before the PIN
  box, but with the text `baseMinor must be a positive integer in minor units` (see QB-9).

**Evidence.** Cells `comp:S18`, `comp:S15`, `two-tills:comp`. Screenshots `shots/dessert_comp.png`, `shots/s15_comp.png`.

**Where to look.** `app/billing.ts` `issue()` calls `ports.approve` (which writes the audit row) before the
transaction that refuses.

### QB-5 · A comped parcel still owes ₹21, while the screen says "comped to ₹0.00" · P1

**Scene.** A parcel at P1 (naan + ₹20 packing, ₹84) is comped because the order was wrong. The bar says "Bill 0002
comped to ₹0.00". Right above it the screen says `Payable ₹21.00`, and a Cancel form appears, which a comp never
shows. The bill sits `issued` with ₹21 due. The cashier doesn't know whether to collect ₹21 or not.

**Steps to reproduce** (from a clean re-seed):
1. `node floorstate.mjs P1 ordered`. This works, and the helper handles the parcel table.
2. Log in and open `?draft=<g>`. Choose `comp-reason` = complaint, click `comp`, and enter PIN 1234.

**Expected.** BL-S22: "every line taxable 0, tax 0, payable 0.00". A comp becomes `paid` at ₹0 (grid §3).

**Actual.**
- Screen: `Butter Naan × 1 ₹60.00 −₹60.00`, `PACKING ₹20.00 flat: ₹20.00`, `GST: ₹20.00 · CGST 2.5% ₹0.50 · SGST 2.5% ₹0.50`,
  `Payable ₹21.00`, bar `Bill 0002 comped to ₹0.00`, buttons Preview and Cancel bill.
- Database: bill 0002 is `issued`, payable 2100, charges `[PACKING 2000]`.

**Evidence.** Cell `comp:S7`. Screenshot `shots/comp_s7.png`.

**Where to look.** The comp success text is hard-coded in `BillScreen.tsx` `onComp`. The flat charge survives the
100 % discount in `compute()`.

### QB-6 · Splitting a cheap dish off an offer order leaves it impossible to bill, on a blank screen · P1

**Scene.** A table of three has Chicken 65, Crab Roast and a ₹60 naan, and the ₹100 offer is on. The naan guest wants
their own bill. After the split, the naan's draft opens to a bare "Table bill draft" with the words `discount exceeds
bill`. There are no lines, no total and no buttons, not even Preview. The naan can never be billed. The other half
still shows the full −₹100 at ₹882.00.

**Steps to reproduce.**
1. `node floorstate.mjs 11 seated`. Then call `cart-addItemToCart` for `mi_chicken65`, `mi_crab_roast` and
   `mi_butter_naan` with the guest session, then `cart-checkoutCart`.
2. Open `?draft=<g>`. It says ₹948.00, which is correct (hand-worked 86000 + 4300 + 2×2258 = 94816 → ₹948.00).
3. `billing-split` the naan line onto `<g>_b`. Open `?draft=<g>_b`, then `?draft=<g>`.

**Expected.** D 2026-09-15 (discount dropped on a split): naan alone ₹66.00, and chicken + crab ₹992.00.

**Actual.**
- `<g>_b`: `bill-msg` = `discount exceeds bill`. The `bill` section shows only the heading, no buttons at all.
- `<g>`: `−₹31.11`, `−₹68.89`, `Payable ₹882.00`.

**Evidence.** Cells `preview:S5-3`, `preview:S14-cheap`, `preview:S14-cheap-A`. Screenshot `shots/s14_cheap_half.png`.

**Where to look.** Same as QB-1. Also, `BillScreen` draws no Preview button when `bill` is null.

### QB-7 · Removing the service charge leaves no audit row · P1

**Scene.** The cashier removes the ₹3 service charge on table 6 and issues a ₹63 bill. The owner, reading the audit
at close, has no record that anyone waived it or who did. Done forty times a night, that is a quiet way to lose
money.

**Steps to reproduce.** `node floorstate.mjs 6 ordered`. Log in and open `?draft=<g>`. Click `toggle-charge`, then
`issue`. Then run `node floorstate.mjs audit 5`.

**Expected.** BL "Who can do what": "Drop the service charge before issue: ✓ (audit P1)". BL-S10: "Audit P1, no PIN".

**Actual.**
- Screen: `#A-0001`, `Payable ₹63.00`, no charge row. That part is correct.
- Database: bill A-0001 has `charges []`, payable 6300. The audit collection has **0 rows**.

**Evidence.** Cell `issue:S6`. Screenshot `shots/s6_issued.png`.

**Where to look.** `dropCharges` travels inside the `billing-issue` body, and `app/billing.ts` `issue()` writes no row
for it.

### QB-8 · An issued draft reopens as an empty ₹0.00 "draft" with every button live · P2

**Scene.** The cashier issues table 8's bill and then presses Preview to double-check, or reloads, or comes back with
Back. The bill vanishes. The screen says "Table bill draft", `SERVICE_CHARGE 5%: ₹0.00`, `Payable ₹0.00`, with
Generate, Remove service charge and Comp all live. After Preview, the old "Bill 0001 issued" text stays underneath.
A bogus `?draft=nope` looks exactly the same.

**Steps to reproduce.**
- `node floorstate.mjs 8 ordered`. Open `?draft=<g>`, click `issue`, then `preview`. Or reload `?draft=<g>`.
- Or open `?draft=nope`.

**Expected.** The grid (S19) and the spec's PO row say preview shows "no lines placed". The screen should show the
bill or say it is billed, never a live ₹0 draft.

**Actual.**
- After Preview: `Table bill draft`, no lines, `Payable ₹0.00`, `bill-msg` still `Bill 0001 issued`, buttons
  `issue`, `toggle-charge` ("Add service charge back"), `comp`.
- After reload: the same, plus `SERVICE_CHARGE 5%: ₹0.00`.
- `?draft=nope`: the same, with Generate → `nothing to bill`.
- Back after issue lands on the previous page's draft in this same state.

**Evidence.** Cells `preview:S19`, `deeplink:issued-draft`, `preview:S17`, `misuse:back-after-issue`. Screenshots
`shots/s19_preview_after_issue.png`, `shots/deeplink_issued.png`, `shots/s17_bogus.png`.

### QB-9 · Refusals name internal ids and code words · P2

**Scene.** A second till presses Generate on a bill the first till just issued. The bar says
`already issued EWnQG8FaDXoy9NJmgC4E`. The cashier cannot match that to anything on paper, which says 0003. Pressing
Comp there gives `baseMinor must be a positive integer in minor units`.

**Steps to reproduce.** `node floorstate.mjs 8 ordered`. Open `?draft=<g>` in two browsers (`till@` and `manager@`).
Click `issue` in A, then `issue` in B, then comp (complaint) in B.

**Expected.** BL-S7: `failed-precondition "already issued 0417"`, the number.

**Actual.**
- `already issued <billId>` (cells `two-tills:issue`, `issue:S18`, `issue:S19`).
- `baseMinor must be a positive integer in minor units` (cell `two-tills:comp`). No audit row is written in this case.

**Evidence.** Screenshot `shots/two_tills_B.png`.

### QB-10 · A service charge removed before a cancel comes back after a reload · P2

**Scene.** A guest refused the service charge. The cashier removed it and issued ₹63. Then a dish was wrong, so the
cashier cancelled. Right after the cancel, Preview still reads ₹63.00. But after any reload (which TD-052 forces on
every navigation), the draft reads ₹66.00 with the service charge back. If the cashier doesn't notice, the guest who
refused it pays it.

**Steps to reproduce.** `node floorstate.mjs 3 ordered`. Open `?draft=<g>`. Click `toggle-charge`, then `issue`.
Cancel with reason other and PIN 1234. Click `preview`, then reload `?draft=<g>` and click `issue`.

**Expected.** BL-S9: "its lines return to the draft with their charges as they were". A cancel for "wrong dish"
keeps the charge state.

**Actual.**
- In-page Preview: `Payable ₹63.00`, "Add service charge back".
- After reload: `SERVICE_CHARGE 5%: ₹3.00`, `Payable ₹66.00`. Generate → A-0007 at 6600. A-0006 (cancelled) was 6300.

**Evidence.** Cells `cancel:S8`, `cancel:S8-preview`, `cancel:S8-reload`, `cancel:S8-reissue`. Also grid question Q4.

### QB-11 · The order offer is never named on the bill · P2

**Scene.** Table 12's bill shows `Chicken 65 ₹280.00 −₹31.11` and `Coastal Crab Roast ₹620.00 −₹68.89`. The guest
asks "what are these odd numbers?" The cashier cannot say "₹100 off above ₹499", because the screen never says which
offer it is or that the two figures add up to ₹100.

**Steps.** `node floorstate.mjs 12 offer`, then open `?draft=<g>`.

**Expected.** Not written in BL. This is the human lens. The preview response carries `offer {name, amount}`
(`useBill.ts` `Bill.offer`), and the screen drops it.

**Actual.** No text containing "offer" or the offer name anywhere in `main`. Cell `preview:S5`, screenshot
`shots/s5_offer_preview.png`.

### QB-12 · The comp audit row says 0 % for a 100 % comp · P2

**Scene.** The owner reads the audit for a birthday comp: `billDiscount P0 amount 6000 pct 0`. It reads like nothing
was given.

**Steps.** `node floorstate.mjs 7 ordered`. Open `?draft=<g>`, comp (birthday) with PIN 1234. Then run
`node floorstate.mjs audit 3`.

**Actual.** Row `{action:'billDiscount', sev:'P0', amount:6000, pct:0, note:'bill discount 6000 of 6000'}`. Bill A-0001
is `paid`, payable 0. That part is correct (cell `comp:S1`). The line-discount rows do carry the right pct (33.33).

### QB-13 · A captain or the kitchen can take the service charge off the preview · P3

**Scene.** A captain logged into the till removes the service charge. The preview drops to ₹63.00. Generate is
refused anyway, so no bill comes out of it. But the captain now tells the guest "₹63".

**Steps.** Log in as `server@meg.test` (or `kitchen@meg.test`) on `?draft=<g>` and click `toggle-charge`.

**Expected.** BL "Who": SERVER "–". FL-S29 hides Merge and Move from a SERVER in the same way.

**Actual.** `Payable ₹63.00`, "Add service charge back". Cells `role:server:toggle`, `role:kitchen:toggle`.

### QB-14 · Tapping Comp on an empty draft does nothing at all · P3

**Steps.** Open an issued draft (QB-8), choose a reason, and click `comp`.

**Expected.** Grid: client "Nothing to comp".

**Actual.** `bill-msg` is empty, and there is no PIN box and no call. The client-side refusal is thrown outside the API
client, so nothing says it. Cell `comp:S19`.

### QB-15 · After the PIN box is cancelled, the bar still says "Wrong PIN" · P3

**Steps.** Comp, enter PIN 9999, then click `pin-cancel`.

**Actual.** The hints were `Needed for this billDiscount` → `Wrong PIN, 4 left`. After Cancel, `bill-msg` reads
`Wrong PIN`, not "PIN required". Nothing was written, which is correct. Cell `comp:wrongpin-cancel`.

### QB-16 · Seen in passing on the tender screen · P3

Not this screen's grid, but the cashier lands there from the floor:
- The heading is `Bill A2iFCDp84fRupzZD62Mu · payable ₹66.00`, the internal id where the paper says 0002.
- A cancelled bill whose cash take was voided reads `outstanding ₹66.00 [cancelled]`, as if ₹66 were still owed.

Cells `dessert:tender-cancel`, `cancel:S9-void`.

## 3. The two owner cases

### Dessert after the bill

**Today a cashier cannot bill the dessert from the till.** Every path they might try:

| Path | Result |
|---|---|
| Floor → tap 10 → picker → the ₹60 draft → Generate bill | Refused `already issued <id>`. Stuck. |
| Same draft → Comp the whole bill | PIN asked, then refused the same way, **and a false P0 comp row is written** (QB-4) |
| Floor → tap 10 → picker → the ₹66 bill | Tender screen. No Cancel, no link back to the draft |
| Open the draft again to find Cancel | Not there. Cancel exists only on the page where the bill was just issued, until the next reload |
| Cancel the first bill, re-issue everything | **Works only through the API** (`billing-cancel`, PIN + reason, P0 `cancelBill` audit row). Then the screen's Preview → Generate gives the next number for both dishes, ₹132.00, which is correct |
| Move the dessert to its own draft | **Works only through the API** (`billing-split`). The floor picker then offers that draft, and Generate gives its own number at ₹66.00 beside the untouched first bill |

The old bill is never silently edited: its number, lines and money stay as they were in every path. A cancel needs a
PIN and a reason and writes a P0 audit row. The cashier gets stuck at the Generate refusal, and again at the tender
screen that has no Cancel.

### Food and alcohol on separate bills

**There is no control on the till to put some dishes on a second bill** (NOTBUILT; D 2026-09-15 says "split has no
screen yet"). Meghana has no bar menu, so I tested the mechanics with two food dishes (Chicken 65 ₹280 and Crab Roast
₹620) through `billing-split`, marked BYPASSED.

| Check | Result |
|---|---|
| Each its own number | ✓ A-0004 and A-0005, consecutive |
| Service charge per bill | ✓ 5 % of each half's own food (₹26 and ₹9) |
| Tax per bill | ✓ computed on each half, figures check by hand |
| Nothing re-priced | ✓ list prices unchanged (28000, 62000) |
| Order-wide offer not given twice | **✗ each half got the full ₹100 off. ₹882 became ₹771 (QB-1)**. A half cheaper than ₹100 cannot be billed at all (QB-6) |

For a real corporate party, the drinks bill would carry the ₹100 again. Per the seed's own note, liquor is never
meant to be discounted (grid Q9), so that makes it worse.

### Cancelling a part-paid bill (the planner's suspect)

**Confirmed (QB-2).** The cancel is allowed with ₹33 cash taken. The ₹33 stays attached to the cancelled bill. The
new bill asks ₹66 again, and the floor shows ₹66 due. Nothing prompts a void or a refund, though voiding the take on
the cancelled bill's tender screen does work (PIN).

## 4. Not bugs / not built

- **Not built on screen:** split (NOTBUILT cell `split:control`), credit note, reprint, customer tax id, a link from
  the bill to the tender screen, and any link back to the floor. All are covered by D 2026-09-15.
- **Roles.** SERVER and KITCHEN get "Not allowed" on Generate and Comp, with no PIN box and no audit row. KITCHEN may
  preview (unspecified, see Q6).
- **TD-040 in the browser.** A dish added from outside after the preview is refused `the bill changed since the
  preview, preview again`, and the counter does not move. Preview → Generate then gives ₹132.00.
- **Double-click Generate.** One number, counter +1. The button disables while busy, so two requests never left the
  browser.
- **Cross-restaurant.** A Meghana session with `restaurantId res_pizzabakery` gets `Invalid or expired session` on
  preview and issue. A Pizza Bakery draft id opened under Meghana shows nothing of Pizza Bakery.
- **Reload mid-PIN.** Nothing is issued and no audit row is written.
- **Cancel.** With no reason, the browser blocks the submit. Five wrong PINs slow down per ST R7: `Wrong PIN, 1 left`
  → `wait 1 s`. On a stale screen, cancelling a paid bill is refused `cannot cancel a paid bill` before the PIN box.
  Cancel on an issued bill keeps its number, frees the lines and writes a P0 audit row.
- **Line discount (`?line=`).** 10 % with no PIN; 33 % needs the PIN; 66 % is refused "above the 50 % limit"; a line
  on an issued bill is refused "bill already issued". A voided line is hidden and not taxed on preview, and it sits in
  `bill.lines` with `countsTowardTotal false`.
- **Parcel.** P1/P2 through the helper work. The packing ₹20 is taxed, ₹84.00 is correct, and Remove packing gives
  ₹63.00.
- `₹-0.16` style round-off and the raw `SERVICE_CHARGE` label: on the do-not-report list, seen everywhere.

## 5. Unclear spec (questions for the owner)

1. **Dessert after the bill.** R13 says ordering stops at issue. FL-S20 and the helper treat it as normal. If it's
   allowed, should a new round land on a fresh draft automatically, so it can be billed without a split?
2. **Part-paid cancel.** Refuse it until the money is voided or refunded? Or carry the ₹33 onto the replacement bill
   (PY-S25 "cancels the bill and issues a new one")?
3. **ORDER offer on a split.** Drop it on both halves (D 2026-09-15), keep it on the first draft only, or apportion
   it? Today it is cloned.
4. **Charges after a cancel.** Should a dropped service charge be remembered on the draft, not in page memory
   (QB-10)?
5. **Comp and flat charges.** Does a whole-bill comp take the packing too (BL-S22 says payable 0)?
6. **KITCHEN on the till.** May it preview a bill at all?
7. **SERVER and "Remove service charge".** Hide it, as FL-S29 hides Merge and Move?
8. **Undoing a mistaken comp.** A ₹0 comp is born `paid` and shows no Cancel. Is a credit note the only path?
9. **Offers on liquor.** R1 spreads an ORDER offer over every line; the seed says liquor is never discounted. Which
   wins? (Not testable at Meghana.)
10. **Where does Cancel live** once the cashier has left the bill screen: on the tender screen, or on a bill list?

## 6. Suggestions from the cashier's chair

- **Bill the new round.** Table 10 orders a ₹60 naan after its ₹66 bill. Tapping 10 offers "New round ₹60 · Bill
  it" and prints 0003 beside 0002. Without this, the dessert goes off the books or the cashier calls the owner.
- **Split with checkboxes.** The corporate party at 12 wants drinks separate. The cashier ticks the beers, taps "Move
  to new bill", and sees two totals side by side, the offer shown once. Without this, the only way is to type two
  orders or hand-write a bill.
- **Cancel on the tender screen.** Bill 0002 is on the tender screen when the guest says the naan was cold. A Cancel
  button (PIN, reason) is right there, and it warns "₹33 cash already taken: void it or carry it to the new bill".
  Without this, the cashier can't cancel at all after leaving the bill screen, or cancels and forgets the ₹33.
- **Name the offer.** A line under the dishes: "Offer: ₹100 off above ₹499 −₹100.00". Without this, the guest argues
  about −₹31.11 and −₹68.89.
- **Back to floor.** A button on the bill and tender screens. Without this, the cashier uses browser Back and lands
  on a ₹0 "draft" (QB-8).
- **Say the number.** "Already billed as 0002", never the document id.

## 7. Coverage

Legend: P = PASS, F = FAIL (QB-n), N = NOTE, B = BYPASSED, nb = not built or unreachable, nt = not tried,
— = hidden, as it should be.

**Preview on load**

| S1 | S2/S5 multi | S3 void | S4 line disc | S5 offer | S7 parcel | S14 split | S14 cheap half | S16 other rest. | S17 bogus | S18 dessert | S19 after issue |
|---|---|---|---|---|---|---|---|---|---|---|---|
| P | P | P | P | P (name: F QB-11) | P | F(QB-1) | F(QB-6) | P | F(QB-8) | P | F(QB-8) |

**Generate bill**

| S1/S6 MGR | SRV | KITCHEN | S3 | S7 | S14 halves | S15 stale | S15 then preview | S17 | S18 dessert | S19 | double-tap | two tills |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| P (audit F QB-7) | P | P | P | P | F(QB-1) | P | P | P | F(QB-3) | F words (QB-9) | P | F words (QB-9) |

**Remove / add back charge.** S1 MGR: P. S7 packing: P. SRV: F(QB-13). KITCHEN: F(QB-13). After issue: —.

**Comp the whole bill**

| S1 | wrong PIN → cancel | SRV | KITCHEN | S7 parcel | S15 stale | S18 dessert | S19 empty | two tills | no reason | reload mid-PIN |
|---|---|---|---|---|---|---|---|---|---|---|
| P (audit pct F QB-12) | P (text F QB-15) | P | P | F(QB-5) | F(QB-4) | F(QB-4) | F(QB-14) | F words (QB-9) | nt | P |

**Cancel bill**

| S8 | S8 then preview | S8 reload | S8 re-issue | no reason | wrong PIN ×6 | S9 part-paid | S10 paid stale | SRV | after leaving screen | S12 comped |
|---|---|---|---|---|---|---|---|---|---|---|
| P | N | F(QB-10) | P | P | P | F(QB-2) | P | nb (cannot reach) | F(QB-3) | — |

**Line discount.** ≤10 %: P. 10–50 % with PIN: P. >50 %: P. Line on an issued bill: P. Voided line: nt.

**Misuses.** Double-tap: P. Two tills: F (words). Back after issue: N (QB-8). Reload mid-PIN: P. Deep link issued: F.
Bogus: F. Other restaurant: P. Cross-restaurant API: P. Staff session expired: nt. Offline: nt.

**Owner cases.** Dessert on screen: F(QB-3). Dessert via cancel (API): B/P. Dessert via split (API): B/P.
Split control: nb. Split mechanics (API): B, offer F(QB-1).

**Not tried:**
- the SERVER cancel path in the browser (a SERVER cannot issue, so no Cancel form ever appears for them)
- a voided line on the `?line=` screen
- a staff session expiring mid-screen
- offline (OF's estimate screen)
- a credit note via the API (S13)
- two tills both cancelling
- a merged-table bill

## Observer check

Re-run by the observer on a clean re-seed, backend calls only (no browser), with `floorstate.mjs 12 offer` and `11 partpaid`:

- **QB-1 reproduced.** Whole draft previews `payable 88200`. After `billing-split` of the crab: halves preview `19800` and `57300`, sum `77100`. The same ₹111 short.
  For the fixer: the 2026-09-16 TD-016 fix (STATE.md) clamps an offer to the share on each bill, but it works from `targets`, and an ORDER-scope offer ships none. So the clamp never runs for this offer. The decision in [SPEC_BL](../SPEC_BL_billing_and_tax.md) (decision log, 2026-09-15) says a split drops the bill discount on both drafts.
- **QB-2 reproduced.** Bill A-0001 `issued`, `paidTotal 3300`. `billing-cancel` answers `success · Cancelled`, and the bill ends `cancelled` with `paidTotal 3300` still on it.
- QB-3 to QB-16 were not re-run. QB-3's backend half (`issue` refuses a draft holding an already-billed line) matches what the observer read in `app/billing.ts` before the run.

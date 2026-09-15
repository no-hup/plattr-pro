# BL · Billing & tax

Status: **draft v0** (2026-09-15). Phase 0 of the BL plan (`reviews/2026-09-15-BL-plan.md`): the line snapshot and the tax config shape are the Objects block below. Shaurya signs those before code.

**Job.** Turn a table's placed lines into a legal bill: one tax block per kind of tax on the same paper, bill-level discount spread across lines before tax, one round-off, an unbroken number handed out at the moment of issue, then frozen. Changes after issue are a cancel or a credit note, never an edit.

## Who can do what

| Action | Captain (SERVER) | Cashier (MANAGER) | Owner (ADMIN) |
|---|---|---|---|
| Preview a table's bill | ✓ | ✓ | ✓ |
| Drop the service charge before issue | – | ✓ (audit P1) | ✓ (audit P1) |
| Bill-level discount before issue | – | ST rules (limit, PIN) | ST rules |
| Issue the bill (number, freeze) | – | ✓ | ✓ |
| Reprint an issued bill | – | ✓ (audit P1) | ✓ (audit P1) |
| Cancel an issued, unpaid bill | – | PIN, reason | PIN, reason |
| Credit note on a paid bill | – | PIN, reason | PIN, reason |
| Split or merge bills before issue | – | ✓ | ✓ |
| Change tax blocks, series, rounding | – | – | ✓ (config doc) |

## Objects

**Line** `restaurants/{id}/lines/{lineId}`. One document per placed line. **F** = frozen when the round is placed, **L** = live until the bill is issued, then frozen inside the bill. Reading a line never needs the menu item to exist.

| Field | F/L | What |
|---|---|---|
| `lineId, cid, orderId, cartId, cartItemId, tableId, sessionId` | F | identity and provenance; `cid` is the order's correlation id carried into every log line |
| `placedAt, placedBy` | F | epoch ms, staff or guest id |
| `menuItemId, name` | F | reference and display; the reference may dangle |
| `qty` | F | integer ≥ 1; a free item is qty with a 100 % discount, never qty 0 |
| `components[]` | F | `{kind: item\|variant\|addon, id, name, unitListPrice, taxBlockId, taxCode}`; each carries its own tax block, inherited from the item only when unset at placement |
| `listPrice` | F | `qty × Σ components.unitListPrice`, minor units. ST reads this |
| `offer` | F | `{id, name, amount}` from PO, minor units, cut of `listPrice`; null when none |
| `taxBlocks{}` | F | snapshot of every block this line touches: `{mode, parts[{label, rate}]}` keyed by block id. Editing config later never touches a placed line |
| `sent, v, countsTowardTotal, discount, void, removedOffer` | L | ST's fields, unchanged (`discount = {amount, pct, source{reason, note, approverId}}`) |
| `billId` | L→F | null while unbilled; set at issue and never changed. A cancelled bill sets it back to null in the same transaction |
| `billDiscount` | L→F | `{amount}` this line's share of the bill-level discount, written at issue |
| `tax` | L→F | computed at issue: `{taxable, parts[{label, rate, amount}]}` per component, minor units |

**Bill** `restaurants/{id}/bills/{billId}`

| Field | What |
|---|---|
| `status` | `draft` → `issued` → `paid` (PY) ; `issued` → `cancelled` ; `paid` → `credited` (partial or full, via credit notes) |
| `number, series, fiscalYear` | null on a draft. Assigned at issue in one transaction with the counter |
| `cid, tableIds[], sessionId, issuedAt, issuedBy` | provenance |
| `lines[]` | frozen copy of every line at issue, including voided ones (`countsTowardTotal: false`, not printed) |
| `blocks[]` | one per tax block touched: `{id, label, mode, taxable, parts[{label, rate, amount}], total}` |
| `discount` | bill-level: `{amount, pct, source}` via ST; apportioned onto lines by taxable share before tax |
| `charges[]` | bill-level rows from `billing.charges` still present at issue: `{type, pct, amount, taxBlockId}`; taxed in their block |
| `subtotal, taxTotal, roundOff, payable` | minor units; `roundOff` signed; `payable = subtotal − discount + charges + tax + roundOff` |
| `customer` | optional `{name, taxId}`; `taxId` printed under `tax.idLabel`, format not validated |
| `printCount` | incremented by reprint (ST audit P1) |
| `cancelled` | `{at, by, reason}`; number kept |
| `creditNoteOf` | for a credit-note bill: the original `billId`; lines are the reversed subset, amounts negative |

**Counter** `restaurants/{id}/counters/{series}_{fiscalYear}` = `{next, reserved[{from, to, deviceId}]}`. Drafts never touch it. `reserved` is the shape OF fills; BL only skips over it.

## Scenarios

Money in rupees for reading; every stored value is minor units. Food block: exclusive, CGST 2.5 + SGST 2.5. Liquor block: its own block on the same bill with **no tax line** (Karnataka collects the tax upstream as excise; see Decisions). A state that taxes it at the bar adds one part to the config, nothing else changes.

| ID | Scene and what happens | Tag |
|---|---|---|
| BL-S1 | **Plain bill.** Pizza ₹500 and a coke ₹80 at 20:10. Preview: taxable 580.00, CGST 14.50, SGST 14.50, payable 609.00, no round-off. Without this there is no bill. | Engine |
| BL-S2 | **Discount before tax.** Same pizza with the 20 % lunch offer (₹100 off). Taxable 400.00, CGST 10.00, SGST 10.00, payable 420.00. Never 525 minus 100. | Engine |
| BL-S3 | **₹200 off a mixed bill.** Food lines ₹1,200 and liquor lines ₹800 (list). Cashier gives ₹200 off the bill, reason "regular", ST decides the PIN. The 200 is split by taxable share: 120 on food, 80 on liquor, each line carrying its own share. Tax is computed after. Without this the declared taxable value and the tax collected disagree. | Engine |
| BL-S4 | **Liquor on the same paper.** Beer ₹499 and the ₹500 pizza on one bill. The liquor block shows 499.00 with no tax part; the food block shows taxable 500.00, CGST 12.50, SGST 12.50. Payable 1,024.00. The 499 never enters the GST taxable value. A config with `parts: [{label: 'VAT', rate: 5.5}]` on the liquor block would instead print taxable 472.99 and VAT 26.01 (inclusive, R6). | Engine |
| BL-S5 | **Residual paisa.** Taxable ₹333.00 at 2.5 + 2.5. Total tax 16.65. Parts 8.325 each cannot print: CGST 8.32, SGST 8.33. The leftover lands on the last part by position. CGST + SGST equals the single-rate figure by construction. | Engine |
| BL-S6 | **Round-off.** Payable 609.40 prints 609.00 with round-off −0.40; 609.50 prints 610.00 with +0.50. Tax lines stay exact. `billing.roundTo` 0 turns it off. | Engine |
| BL-S7 | **Issue gives the number.** Preview shows no number. Cashier taps Issue at 21:05: bill 0417 in series `A`, fiscal year 2026-27. A second till issuing in the same instant gets 0418, never 0417 twice. Drafts never consume a number. | Engine |
| BL-S8 | **Frozen.** After 0417 is issued the cashier tries ₹50 off the pizza line. ST refuses with failed-precondition "bill already issued". The fix is BL-S9 or BL-S11. | Engine |
| BL-S9 | **Guest refuses the service charge.** Bill 0417 carried 10 % service charge and is printed, unpaid. Cashier cancels it: PIN, reason "service charge removed". 0417 stays in the series marked cancelled, its lines return to draft, the service charge row is dropped (audit P1), Issue gives 0418. Without this the bill is edited by hand and the series lies. | Engine |
| BL-S10 | **Drop the charge before issue.** Same guest, but they ask before the bill is issued. Cashier removes the service charge row from the draft. Audit P1, no PIN. | Engine |
| BL-S11 | **Wrong dish, already paid.** Bill 0417 paid ₹609. The coke was never served. Credit note CN-0007 references 0417, reverses the coke line only: taxable −80.00, CGST −2.00, SGST −2.00, total −84.00. The refund itself is PY. 0417 stays as it was. | Engine |
| BL-S12 | **Two bills for one table.** Table 7 wants the beers on one bill and the food on another. Cashier moves lines between two drafts in one transaction; tax and any bill discount are recomputed per draft, no line is re-priced. Each issues its own number. Splitting one amount three ways is PY. | Engine |
| BL-S13 | **Two for one.** Two ₹500 beers, offer −500. Bill shows qty 2, list 1,000, offer −500, liquor block total 500, no tax part. Stock falls by two. | Engine |
| BL-S14 | **No tax block.** A dish added yesterday has no tax block. Preview shows the line flagged; Issue refuses with the dish name. Nothing defaults. | Engine |
| BL-S15 | **Composition scheme.** `tax.collect` is false. The bill shows no tax amounts and carries the mandatory wording from `tax.collectOffText`. Totals are list minus discounts. | Config |
| BL-S16 | **Reprint.** Guest lost the bill. Reprint marks the copy DUPLICATE, `printCount` 2, ST audit P1 with `amount` = payable. | Engine |
| BL-S17 | **Voided line.** The ₹450 biryani was voided (ST-S5) before issue. It is in `bill.lines[]` with `countsTowardTotal: false`, not printed, not taxed. A birthday dessert at 100 % discount is printed at ₹0 with tax on ₹0. | Engine |
| BL-S18 | **Year end.** 31 March 23:59 issues 0999. 1 April 00:00 issues 0001 of `A/2027-28`. `invoice.fiscalYearStartMonth` decides the day. | Engine |
| BL-S19 | **Company guest.** Guest gives a tax id for their expense claim. Cashier types it before issue; it prints under the `tax.idLabel` label. Format is not checked. | Engine |
| BL-S20 | **Offline.** The tablet has no internet at 20:40. Numbers come from the reserved range on the counter. | No (OF sheet) |

**Without this:** every non-QR guest is billed on paper, the tax return is typed by hand, and the number series has holes nobody can explain.

## Rules

- R1 Discount is taken before tax, always. Bill-level discounts are apportioned onto lines by taxable share and stored on the line before tax is computed.
- R2 Billing sums snapshots. Nothing in BL reads a menu price or re-prices a line.
- R3 A number is assigned only at issue, in the same transaction as the bill write and the counter increment. Drafts have no number. A cancelled bill keeps its number.
- R4 An issued bill never changes. Cancel and credit note are new state or new documents; `bill.lines[]` is a copy, not a reference.
- R5 Tax per block: one combined rate on the block's taxable, then split back by each part's share; the leftover minor unit lands on the last part by position. Part names are display strings.
- R6 Inclusive decomposition is one function: `taxable = gross × 100 ÷ (100 + rate)` in minor units, remainder to tax.
- R7 Rounding happens once, on the payable, by `billing.roundTo`. Tax lines stay exact.
- R8 All money is integer minor units. `locale.minorUnits` is the only place the count lives.
- R9 A country is a set of config values. `domain/` contains no tax name, currency symbol, code label or unit name. `if (country …)` is a lint failure like `restaurantId ===`.
- R10 A line without a tax block on every component cannot be issued.
- R11 Every tax id, code and label on the printed bill is a config string.

## Config keys (on `restaurants/{id}/config/settings`, with defaults)

| Key | Default | Used by |
|---|---|---|
| `locale.currency` / `locale.symbol` / `locale.minorUnits` | INR / ₹ / 2 | every screen and print; R8 |
| `tax.collect` | true | BL-S15 |
| `tax.collectOffText` | "Composition taxable person, not eligible to collect tax on supplies" | BL-S15 |
| `tax.idLabel` | GSTIN | BL-S19 |
| `tax.itemCodeLabel` | HSN/SAC | line and bill print |
| `tax.blocks.food` | `{label: 'GST', mode: 'exclusive', parts: [{label: 'CGST', rate: 2.5}, {label: 'SGST', rate: 2.5}], defaultCode: '9963'}` | BL-S1..S6 |
| `tax.blocks.liquor` | `{label: 'Liquor', mode: 'inclusive', parts: [], defaultCode: ''}` | BL-S4, S13 |
| `invoice.series` | `A` | BL-S7 |
| `invoice.fiscalYearStartMonth` | 4 | BL-S18 |
| `invoice.width` | 4 | print only |
| `invoice.creditNoteSeries` | `CN` | BL-S11 |
| `billing.roundTo` | 100 | BL-S6 |
| `billing.charges[]` | `[]` (existing key; each row gains `taxBlockId`) | BL-S9, S10 |

## Talks to

| Port | What crosses | If the other side is down |
|---|---|---|
| ← PO / OR checkout | one line doc per placed line, snapshot fields F | no lines, no bill; preview shows "no lines placed" |
| ← ST | discount, void, reprint, cancel decisions with audit | ST refuses, nothing changes on the bill |
| ← CF Config | the keys above, read once per request | defaults apply; missing tax block is BL-S14, never a default |
| → PY | issued bill: `payable`, `billId`, `number` | payment cannot start; bill stays issued |
| → DC / RP | issued, cancelled and credit-note bills by day | reports read bills only, never lines |
| → KT print | a print-ready structure: header, blocks, lines, totals, labels | print fails, bill stays issued, reprint later |
| → LG Logs | one JSON line per state change with `cid`, `billId`, `from`, `to` | never blocks |

## Decisions

| Date | Decision | Why |
|---|---|---|
| 2026-09-15 | Tax labels are set manually in Admin; no import work | Shaurya |
| 2026-09-15 | Checkout writes the line docs inside its own transaction (one hook in `createOrUpdateOrder.js`, characterization test first). No trigger | Shaurya delegated; a trigger is async, so a bill could be asked for before its lines exist. Consumer sees no change: the order doc is untouched |
| 2026-09-15 | Service charge is a bill-level row the cashier can drop before issue (P1, no PIN); after issue the bill is cancelled and re-issued | Shaurya: guests ask for it to go, and today nothing removes it |
| 2026-09-15 | A country is config, never a switch: six keys, no country enum, no i18n framework | Shaurya via peer session; portability to another South Asian market without a rewrite |
| 2026-09-15 | Per-component tax blocks on a line, apportioned by component list price | Critical-pieces doc: variants and add-ons carry their own label. A loop, not a branch |
| 2026-09-15 | Split is by lines only; equal-amount split is PY | Lines have tax; amounts do not |
| 2026-09-15 | Composition scheme is one boolean plus one text | The bill shape does not change, only the block amounts vanish |
| 2026-09-15 | Liquor block default has no tax part. Karnataka exempted sales tax on liquor from 16.02.2001 (KST Act s.8A notification 15.02.2001, tax collected at source as additional excise duty), reintroduced 5.5 % VAT on bar sales from 01.03.2014 (notification 28.02.2014) and withdrew it with GST on 01.07.2017. Sources: Karnataka HC, *Sangeetha Bar & Restaurant v. State of Karnataka*, 22.12.2021 (indiankanoon.org/doc/9115228); Deccan Herald 2017 "VAT on liquor down". Grok's open pass said the same unprompted; Gemini's guided pass marked the rate UNVERIFIED. Marked **CA to confirm** | Shaurya: do not block on an accountant. The design is unchanged either way: a state that taxes bar liquor is one `parts` entry |
| 2026-09-15 | Tax facts folded from Gemini (guided pass), each with its basis: composition bill is a Bill of Supply with the wording above (CGST s.10, Rules 5(1)(f), 49); standalone restaurant 5 % without ITC, 18 % with ITC inside a hotel with any room at ₹7,500 or more (Notification 11/2017-CT(R) as amended by 46/2017); one paper for GST and liquor is an "invoice-cum-bill of supply" (Rule 46A); SAC 9963 is optional on a B2C bill under ₹5 crore (Notification 78/2020-CT); service charge cannot be added by default and must go on request (CCPA guidelines 04.07.2022) and when paid is part of the taxable value (s.15(2)(c)); a discount printed on the bill reduces taxable value (s.15(3)(a)); serial number ≤ 16 characters, consecutive per financial year (Rule 46(b)); rounding to the rupee permitted (s.170); credit note references the original invoice, deadline 30 November of the next financial year (s.34) | Each is a default or a rule in this sheet; verify list in Review before sign-off |

## Out of scope

Legal bill layout per country · e-invoicing and IRN · dynamic payment QR on the bill · receipt language · tips · liquor excise register export · tax id format validation · bank-card offers.

## Open questions (owner: Shaurya)

- BL-Q1 Is the first customer on the composition scheme or regular GST? Sets `tax.collect` and whether the food block prints at all.
- BL-Q2 One series for food and liquor, or two? Default one; Rule 46A allows one paper.
- BL-Q3 Standalone at 5 % or inside a hotel at 18 %? Sets the food block default.

## Review before sign-off (Shaurya reads this section only)

| Call | Weight | Why it matters |
|---|---|---|
| The line snapshot fields above, frozen vs live | **must decide** | Data written once, kept forever. Everything else on this sheet is code |
| Service charge: removable before issue without a PIN; after issue, cancel and re-issue | **must decide** | Every bill that carries one |
| Liquor block prints no tax line in Karnataka (excise collected upstream), on a court judgment and two consults, not an accountant | **must decide** | Every liquor bill. If a CA disagrees it is one config part, no code |
| Service charge default off and removable on request | fine to skip | CCPA guideline; matches your ask |
| Split by lines only | fine to skip | PY handles amounts |
| Composition as one boolean | fine to skip | Only matters if BL-Q1 is yes |

## Files

```
backend/src-plattr/functions/
  domain/line.ts        the Line type with F/L comments; nothing else
  domain/billing.ts     draft(lines, cfg) → blocks, totals; apportion; issue(draft, number); cancel; creditNote. Pure
  domain/invoice.ts     nextNumber(counter, now, cfg) → {number, counter}; fiscalYear(now, cfg). Pure
  app/billing.ts        preview / issue / cancel / creditNote / reprint / split, through Ports
  adapters/firestore/billing.ts   lines, bills, counter; one transaction per issue
  api/billing.ts        onCall wrappers, exported as billing-*
frontend/till/src/features/billing/   BillScreen.tsx, useBill.ts
tests: domain/billing.test.ts · domain/invoice.test.ts · app/billing.test.ts · test/e2e/suites/billing.js · frontend/till/e2e/billing.spec.ts
golden: mock/goldenExpectedValues.json gains kind "bill" rows for BL-S1..S6, S11, S12, S13
```

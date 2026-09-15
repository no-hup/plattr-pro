# BL · Billing & tax

Status: **signed v1** (2026-09-15, Shaurya: "yes" to every Review row). The line snapshot and the tax config shape are the Objects block below; four tax consults and two sheet reviews are merged in Decisions (`reviews/2026-09-15-BL-consults/`). Golden rows proposed at `reviews/2026-09-15-BL-golden-proposal.json`; critical-pieces diff at `reviews/2026-09-15-BL-critical-pieces-diff.md`.

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
| Split a draft by lines before issue | – | ✓ | ✓ |
| Change tax blocks, series, rounding | – | – | ✓ (config doc) |

## Objects

**Line** `restaurants/{id}/lines/{lineId}`. One document per placed line. **F** = frozen when the round is placed, **L** = live until the bill is issued, then frozen inside the bill. Reading a line never needs the menu item to exist.

| Field | F/L | What |
|---|---|---|
| `lineId, cid, orderId, cartId, cartItemId, tableId, sessionId` | F | identity and provenance; `cid` is the order's correlation id carried into every log line |
| `placedAt, placedBy` | F | epoch ms, staff or guest id |
| `menuItemId, name` | F | reference and display; the reference may dangle |
| `qty` | F | integer ≥ 1; a free item is qty with a 100 % discount, never qty 0 |
| `components[]` | F | `{id, kind: item\|variant\|addon, name, unitListPrice, taxBlockId, taxCode}`; prices are additive (the item component carries the base only, a variant its delta, an add-on its price); each carries its own tax block, inherited from the item only when unset at placement |
| `listPrice` | F | `qty × Σ components.unitListPrice`, minor units. ST reads this |
| `offer` | F | `{id, name, amount}` from PO, minor units, cut of `listPrice`; null when none |
| `taxBlocks{}` | F | snapshot of every block this line touches: `{label, mode, collect, parts[{label, rateBps}]}` keyed by block id. Rates are integer basis points (250 = 2.5 %). Editing config later never touches a placed line; issue reads this, never live config |
| `sent, v, countsTowardTotal, discount, void, removedOffer` | L | ST's fields, unchanged (`discount = {amount, pct, source{reason, note, approverId}}`) |
| `draftId` | L | which draft this line sits in before issue; one per table by default, split rewrites it in one transaction |
| `billId` | L→F | null while unbilled; set at issue and never changed. A cancelled bill sets it back to null in the same transaction |

No tax or bill-discount field lives on the open line: preview computes from lines and config, and the numbers are frozen once, inside `bill.lines[]` at issue.

**Bill** `restaurants/{id}/bills/{billId}`

| Field | What |
|---|---|
| `status` | `issued` → `paid` (PY) ; `issued` → `cancelled`. A paid bill stays `paid`; credit notes hang off it in `creditNotes[]`. There is no persisted draft: preview is computed, the bill document is written at issue |
| `number, series, fiscalYear` | null on a draft. Assigned at issue in one transaction with the counter |
| `cid, tableIds[], sessionId, draftId, issuedAt, issuedBy` | provenance |
| `seller` | frozen copy of `seller.*` config at issue: name, address, tax id, state code, place of supply |
| `lines[]` | frozen copy of every line at issue, including voided ones (`countsTowardTotal: false`, not printed), each gaining `billDiscount` (its share) and `tax{}` keyed by component id: `{taxable, parts[{label, rateBps, amount}]}`, plus `credited{qty}` per line as notes land |
| `blocks[]` | one per tax block touched: `{id, label, mode, taxable, parts[{label, rate, amount}], total}` |
| `discount` | bill-level: `{amount, pct, source}` via ST; apportioned onto lines by taxable share before tax |
| `charges[]` | bill-level rows from `billing.charges` still present at issue: `{type, pctBps, base, amount, taxBlockId}`; the base is the net of the lines in the charge's own block, computed server-side at issue; taxed in that block, so a food-block service charge never carries tax on liquor |
| `subtotal, taxTotal, roundOff, payable` | minor units; `subtotal` = Σ blocks.taxable, `taxTotal` = Σ blocks tax, `roundOff` signed, `payable = Σ blocks.total + roundOff`. Charges sit inside their block, so nothing is added twice for an inclusive block |
| `customer` | optional `{name, taxId}`; `taxId` printed under `tax.idLabel`, format not validated |
| `cancelled` | `{at, by, reason}`; number kept |
| `creditNotes[]` | on the original: `[{billId, number, at}]` |
| `creditNoteOf` | on a credit-note document: the original `billId`, number and date. Its `lines[]` are copies of the original's frozen lines with `qty` ≤ the remaining creditable quantity and every amount negated pro rata, including `billDiscount` and `tax` as charged. Nothing is re-priced, re-apportioned or read from live config. Round-off stays on the original |

**Counter** `restaurants/{id}/counters/{series}_{fiscalYear}` = `{next}`, one for the invoice series and one for the credit-note series, incremented only inside the issue transaction. `fiscalYear` is `2026-27`. `invoice.width` pads, it never wraps: bill 10000 prints as 10000. Offline reserved ranges are OF's; nothing in BL reserves or skips.

## Scenarios

Money in rupees for reading; every stored value is minor units. Food block: exclusive, CGST 2.5 + SGST 2.5. Liquor block: its own block on the same bill with **no tax line** (Karnataka collects the tax upstream as excise; see Decisions). A state that taxes it at the bar adds one part to the config, nothing else changes.

| ID | Scene and what happens | Tag |
|---|---|---|
| BL-S1 | **Plain bill.** Pizza ₹500 and a coke ₹80 at 20:10. Preview: taxable 580.00, CGST 14.50, SGST 14.50, payable 609.00, no round-off. Without this there is no bill. | Engine |
| BL-S2 | **Discount before tax.** Same pizza with the 20 % lunch offer (₹100 off). Taxable 400.00, CGST 10.00, SGST 10.00, payable 420.00. Never 525 minus 100. | Engine |
| BL-S3 | **₹200 off a mixed bill.** Food lines ₹1,200 and liquor lines ₹800 (list). Cashier gives ₹200 off the bill, reason "regular", ST decides the PIN. The 200 is split by taxable share: 120 on food, 80 on liquor, each line carrying its own share. Tax is computed after. Without this the declared taxable value and the tax collected disagree. | Engine |
| BL-S4 | **Liquor on the same paper.** Beer ₹499 and the ₹500 pizza on one bill. The liquor block shows 499.00 with no tax part; the food block shows taxable 500.00, CGST 12.50, SGST 12.50. Payable 1,024.00. The 499 never enters the GST taxable value. A config with `parts: [{label: 'VAT', rateBps: 550}]` on the liquor block would instead print taxable 472.98 and VAT 26.02 (R6: 49900 × 10000 ÷ 10550 = 47298 minor units, floor, remainder to tax), and the guest still pays 1,024.00. | Engine |
| BL-S5 | **Half a paisa.** Taxable ₹333.00 at 2.5 + 2.5. Each part is 8.325 and cannot print. Default `independent`: CGST 8.33, SGST 8.33, tax 16.66, the two levies equal. `residualLast`: CGST 8.32, SGST 8.33, tax 16.65, equal to the single 5 % figure. One config value, both hand-computed. | Engine |
| BL-S6 | **Round-off.** Payable 609.40 prints 609.00 with round-off −0.40; 609.50 prints 610.00 with +0.50. Tax lines stay exact. `billing.roundTo` 0 turns it off. | Engine |
| BL-S7 | **Issue gives the number.** Preview shows no number. Cashier taps Issue at 21:05: bill 0417 in series `A`, fiscal year 2026-27. The server recomputes from snapshots, ignores any money the client sent, checks every line's `v` and `billId == null`, and writes bill, lines and counter in one transaction. A double tap, or a second till on the same table, gets failed-precondition "already issued 0417", never 0418 for the same lines. | Engine |
| BL-S8 | **Frozen.** After 0417 is issued the cashier tries ₹50 off the pizza line. ST refuses with failed-precondition "bill already issued". The fix is BL-S9 or BL-S11. | Engine |
| BL-S9 | **Guest refuses the service charge.** Bill 0417 carried 10 % service charge and is printed, unpaid. Cashier cancels it: PIN, reason "service charge removed". 0417 stays in the series marked cancelled, its lines return to the draft with their charges as they were; the cashier then drops the charge row (BL-S10) and Issue gives 0418. A cancel for "wrong dish" keeps the charge. Without this the bill is edited by hand and the series lies. | Engine |
| BL-S10 | **Drop the charge before issue.** Same guest, but they ask before the bill is issued. Cashier removes the service charge row from the draft. Audit P1, no PIN. | Engine |
| BL-S11 | **Wrong dish, already paid.** Bill 0417 paid ₹609. The coke was never served. Credit note CN-0007 references 0417 by number and date, reverses the coke line only: taxable −80.00, CGST −2.00, SGST −2.00, total −84.00. One of three beers works the same with `qty` 1 on the note, amounts pro rata. The refund itself is PY. 0417 stays as it was. | Engine |
| BL-S12 | **Two bills for one table.** Table 7 wants the beers on one bill and the food on another. Cashier moves lines between two drafts in one transaction; tax and any bill discount are recomputed per draft, no line is re-priced. Each issues its own number. Splitting one amount three ways is PY. | Engine |
| BL-S21 | **Service charge on a mixed bill.** Food net ₹1,200, liquor net ₹800, `billing.charges` has 10 % in the food block. The charge base is 1,200, the row is 120.00, taxed CGST 3.00 + SGST 3.00. Liquor carries none of it. | Engine |
| BL-S22 | **Whole bill on the house.** Owner comps the table, 100 % bill discount, PIN. Every line taxable 0, tax 0, payable 0.00, and the bill still takes number 0419. | Engine |
| BL-S23 | **Stacked cuts.** Pizza ₹500 with the ₹100 offer, ₹50 ST discount, then a ₹200 bill discount on a table whose net is ₹350 in total. Apportioned share on the pizza is 200 × 350 ÷ 350 = 200; net would be 150. A share that would take a component below zero is refused with failed-precondition, like ST-S13. | Engine |
| BL-S13 | **Two for one.** Two ₹500 beers, offer −500. Bill shows qty 2, list 1,000, offer −500, liquor block total 500, no tax part. Stock falls by two. | Engine |
| BL-S14 | **No tax block.** A dish added yesterday has no tax block. Preview shows the line flagged; Issue refuses with the dish name. Nothing defaults. | Engine |
| BL-S15 | **Composition scheme.** `tax.blocks.food.collect` is false. The food block shows no tax amounts and the bill carries the mandatory wording from `tax.collectOffText`; the liquor block is untouched. Totals are list minus discounts. | Config |
| BL-S16 | **Reprint.** Guest lost the bill. Reprint marks the copy DUPLICATE and writes an ST audit row P1 with `amount` = payable. The bill document is not touched. | Engine |
| BL-S17 | **Voided line.** The ₹450 biryani was voided (ST-S5) before issue. It is in `bill.lines[]` with `countsTowardTotal: false`, not printed, not taxed. A birthday dessert at 100 % discount is printed at ₹0 with tax on ₹0. | Engine |
| BL-S18 | **Year end.** 31 March 23:59 issues 0999. 1 April 00:00 issues 0001 of `A/2027-28`. `invoice.fiscalYearStartMonth` decides the day. | Engine |
| BL-S19 | **Company guest.** Guest gives a tax id for their expense claim. Cashier types it before issue; it prints under the `tax.idLabel` label. Format is not checked. | Engine |
| BL-S20 | **Offline.** The tablet has no internet at 20:40. Numbers come from the reserved range on the counter. | No (OF sheet) |

**Without this:** every non-QR guest is billed on paper, the tax return is typed by hand, and the number series has holes nobody can explain.

## Rules

- R1 Discount is taken before tax, always. Bill-level discounts are apportioned onto lines by each line's net price share (`listPrice − offer − discount`), the leftover minor unit on the last line, and stored on the line before tax is computed. Inside a line, every cut is apportioned onto components by `qty × unitListPrice` share the same way. Never circular: shares come from prices, not from tax.
- R2 Billing sums snapshots. Nothing in BL reads a menu price or re-prices a line.
- R3 A number is assigned only at issue, in the same transaction as the bill write and the counter increment. Drafts have no number. A cancelled bill keeps its number.
- R4 An issued bill never changes. Cancel and credit note are new state or new documents; `bill.lines[]` is a copy, not a reference.
- R5 Tax is computed per component, then summed: a block is the sum of its lines, never a second calculation. Per component: one combined rate on its taxable, then split back by each part's share; the leftover minor unit lands on the last part by position. Part names are display strings. (See Review before sign-off: independent rounding per part is the alternative.)
- R6 Inclusive decomposition is one function: `taxable = floor(gross × 10000 ÷ (10000 + rateBps))` in minor units, remainder to tax. A block with `parts: []` has rate 0: taxable is the gross, it still prints as its own block total and never folds into another block. Block total is Σ (taxable + tax), which for an inclusive block equals the gross the guest sees.
- R7 Rounding happens once, on the payable, by `billing.roundTo`, half up. Tax lines stay exact.
- R8 All money is integer minor units. `locale.minorUnits` is the only place the count lives.
- R9 A country is a set of config values. `domain/` contains no tax name, currency symbol, code label or unit name. `if (country …)` is a lint failure like `restaurantId ===`.
- R10 A line without a tax block on every component cannot be issued.
- R11 Every tax id, code and label on the printed bill is a config string. `seller.*` is copied onto the bill at issue.
- R12 Issue reads the line snapshots and the `seller`, `locale`, `invoice` and `billing` config; a config read failure refuses issue rather than defaulting. Tax rates never come from live config at issue.
- R13 Ordering for a table stops at issue. Which states hold the table is OR's; BL only names issue as the stop.

## Config keys (on `restaurants/{id}/config/settings`, with defaults)

| Key | Default | Used by |
|---|---|---|
| `locale.currency` / `locale.symbol` / `locale.minorUnits` | INR / ₹ / 2 | every screen and print; R8 |
| `locale.timezone` | Asia/Kolkata | BL-S18 year end, day boundaries in DC and RP |
| `tax.blocks.<id>.collect` | true | BL-S15; per block, never per bill |
| `tax.collectOffText` | "Composition taxable person, not eligible to collect tax on supplies" | BL-S15 |
| `tax.idLabel` | GSTIN | BL-S19 |
| `tax.itemCodeLabel` | HSN/SAC | line and bill print |
| `tax.blocks.<id>.legend` | food: "GST 5 % without input tax credit" (empty allowed) | print only |
| `seller.name` / `seller.address` / `seller.taxId` / `seller.stateCode` | from the restaurant info doc | R11, frozen on every bill |
| `tax.blocks.food` | `{label: 'GST', mode: 'exclusive', collect: true, parts: [{label: 'CGST', rateBps: 250}, {label: 'SGST', rateBps: 250}], defaultCode: '9963'}` | BL-S1..S6 |
| `tax.blocks.liquor` | `{label: 'Liquor', mode: 'inclusive', collect: true, parts: [], defaultCode: ''}` | BL-S4, S13 |
| `invoice.series` | `A` | BL-S7 |
| `invoice.fiscalYearStartMonth` | 4 | BL-S18 |
| `invoice.width` | 4 | print only |
| `invoice.creditNoteSeries` | `CN` | BL-S11 |
| `billing.roundTo` | 100 | BL-S6 |
| `tax.partRounding` | independent | R5, BL-S5 |
| `print.title` / `print.titleWithExempt` | "Tax Invoice" / "Invoice-cum-Bill of Supply" | bill print (Rule 46, 46A) |
| `print.placeOfSupply` / `print.reverseCharge` | "Karnataka (29)" / "No" | bill print (Rule 46(n), (o)) |
| `billing.charges[]` | seed: one service-charge row, rate set at onboarding (existing key; each row gains `taxBlockId`; `percentage: 5` stays five percent for the old checkout, `app/config.ts` derives `pctBps = percentage × 100` at read) | BL-S9, S10, S21 |

## Talks to

| Port | What crosses | If the other side is down |
|---|---|---|
| ← PO / OR checkout | one line doc per placed line, snapshot fields F | no lines, no bill; preview shows "no lines placed" |
| ← ST | discount, void, reprint, cancel decisions with audit | ST refuses, nothing changes on the bill |
| ← CF Config | the keys above, read once per request | preview and issue refuse (R12); defaults exist for a fresh restaurant's setup, never for a bill |
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
| 2026-09-15 | Four consults (Grok open and guided, Gemini guided; Gemini open produced nothing twice) agree on all ten tax questions except two, below. Extra facts taken from Grok: KVAT Third Schedule entry 59-A (5.5 %) omitted by Karnataka Act 15 of 2017 from 01.04.2017, liquor back in the exempt First Schedule; a restaurant with a bar licence cannot opt for composition (CGST s.10(2)(b), liquor is not leviable under the Act), so BL-Q1 defaults to regular and `tax.collect` stays a key for a no-liquor outlet; Rule 46A document title is "Invoice-cum-Bill of Supply" when liquor is on the page; Rule 46 needs place of supply and a reverse-charge "No" line; the credit-note series follows the same numbering rules and must cite the original number and date (Rule 53(1A)); B2C bills under ₹50,000 need no guest name | Each becomes a print field (config string) or a default; none is a branch |
| 2026-09-15 | Disagreement 1, rounding: CGST s.170 says tax payable is rounded to the rupee, and both Grok passes read that as per tax head on the bill; Gemini reads it as permitting the grand-total round-off; universal restaurant practice rounds the total. Sheet keeps R7 (tax lines exact, one round-off on the payable) and adds `billing.taxRoundTo` default 0 so per-head rounding is a config flip. **CA to confirm** | The return, not the bill, is where s.170 bites; a config key covers both readings |
| 2026-09-15 | Sheet review, Gemini (open, blind to the consults). Accepted: `locale.timezone` (year end at 05:30 IST otherwise); line cuts apportioned to components by price share; tax per component and blocks as sums (line taxes always reconcile to the printed block); credit note by quantity; payable = Σ block totals + round-off (the draft added tax to an inclusive subtotal, ₹499 beer would have printed ₹526.44); composition per block, not per bill (a liquor VAT block must survive a food composition flag); bill discount apportioned by net price share, not taxable share (taxable of an inclusive line depends on the discount, circular) | Each is a wrong bill or a data shape; each has a scenario or rule now |
| 2026-09-15 | Push back (Gemini): credit notes out of scope, cancel and re-ring instead | CGST s.34: an issued, paid invoice is reduced only by a credit note; cancel-and-re-ring on a paid bill is a lie in the series. Kept, narrowed: a note reverses lines or quantities, never a free amount |
| 2026-09-15 | Verify (Gemini): "GST portal mandates CGST = SGST". Residual-on-last-part gives 8.32 / 8.33 on ₹333; independent half-up rounding gives 8.33 / 8.33, total 16.66, not the 5 % figure 16.65. CGST and SGST are separate levies, so equal parts is the defensible reading; the critical-pieces doc asks for "equal to the single-rate figure by construction". Config `tax.partRounding` = `residualLast` \| `independent`, default **independent**; proposed diff to the critical-pieces doc rather than an edit | Shaurya's doc; must decide, listed below |
| 2026-09-15 | Sheet review, Grok (blind, 20 + 20 + 10 items). Accepted: explicit payable algebra per component (gross → taxable → parts; blocks are sums); inclusive block total equals the gross; `parts: []` semantics; bill discount by net share with the leftover on the last line and a below-zero refusal (BL-S23); charge base is the net of its own block (BL-S21); `draftId` on lines, split rewrites it in one transaction; issue recomputes server-side, checks `v` and `billId`, refuses a double tap (BL-S7); credit note copies frozen lines negated with `billDiscount` and `tax` as charged, remaining creditable qty per line, original stays `paid` with `creditNotes[]`, its own counter; `seller.*` frozen on the bill; `fiscalYear` string, width pads never wraps; config read failure refuses issue; `line.tax` keyed by component id and `taxBlocks{}` freezes `label`; integer `rateBps` and half-up stated; components additive; cancel keeps charges (BL-S9); tax id needs a name; legend as a block string; BL-S4 arithmetic corrected to 472.98 / 26.02 (floor, remainder to tax); whole-bill comp still numbered (BL-S22). Removed from BL: `counters.reserved` and skip-over (OF, and an unconsumed range is an illegal gap), merge, `credited` status, live `line.tax`, persisted drafts, `printCount` (reprints are ST audit rows) | Each was a wrong bill, a duplicate number, or a shape that cannot be fixed with live data |
| 2026-09-15 | Push back (Grok): drop the inclusive path and BL-S4's VAT figures | The critical-pieces doc and PO-S10 need the one inclusive helper; BL-S4's second sentence is its test. One function, kept |
| 2026-09-15 | Push back (Grok): drop composition | It is now one boolean per block plus a text; no document fork, the title is a config string already |
| 2026-09-15 | Push back (Grok): drop the portability keys | Shaurya's requirement via the peer session; every key is a value, none a branch |
| 2026-09-15 | Flagged, CA to confirm (Grok ~80 %): a tax invoice and a bill of supply sharing one series if `collect` flips mid-year | Not built; noted for the day BL-S15 is switched on |
| 2026-09-15 | Deferred to OR (Grok ~75 %): which table states block release while a draft or an issued-unpaid bill exists | R13 names issue as the ordering stop; the rest is the order-lifecycle sheet |
| 2026-09-15 | Blind test lists for the domain (Opus subagent, Gemini, Grok; kept at `reviews/2026-09-15-BL-consults/tests-*.md`). Taken as tests: blocks are sums, never a recompute (three lines of 10000 with 10000 off give 501 per part, not 500); an inclusive block with two parts always splits the remainder residual-last so the block total equals the gross (independent rounding would print 9999 for a 10000 gross); "last line" for the leftover is by `lineId`, never insertion order; the charge base is the block net **after** the bill discount; a charge in a block no line touches is a row with 0; an offer above the list price is refused; half-up is not banker's | Each was a wrong bill the sheet did not name |
| 2026-09-15 | Credit note pro rata is cumulative floor: the k-th unit credited takes floor(total × k ÷ qty) − floor(total × (k−1) ÷ qty), so three notes of 1 on a 140000 line give 46666, 46667, 46667 and sum exactly. Nothing extra is stored: `credited.qty` is enough | Opus: Σ notes must equal the charged amount; the shape it proposed (residual on the last note) needs a stored running total, this one does not |
| 2026-09-15 | Charges and round-off are never on a credit note; a note reverses lines and quantities only | Sheet Objects said so; the domain enforces it (`charges: []`, `roundOff: 0`) |
| 2026-09-15 | `billing.taxRoundTo` dropped | Opus: named with no semantics. Add when a CA asks, with the rule written first |
| 2026-09-15 | `fiscalYearStartMonth` 1 prints a single year ("2027"); any other month prints "2026-27" | Opus flagged it undefined |
| 2026-09-15 | `collect: false` keeps the parts with rate 0 and amount 0 rather than dropping them | Gemini expected `parts: []`; keeping the shape means the print layout has nothing to branch on |
| 2026-09-15 | `billing.charges[].percentage` stays a percent for the old checkout; `app/config.ts` derives `pctBps = percentage × 100` at read | Peer review: one stored field must not mean two things across old and new code |
| 2026-09-15 | Serial length ≤ 16 (Rule 46(b)) is not enforced in code | Series "A" plus a 4-digit number is 5; a restaurant would need 10¹⁵ bills to breach it |
| 2026-09-15 | All consult answers and both sheet reviews are kept at `reviews/2026-09-15-BL-consults/` | Scratchpad research was lost once already |
| 2026-09-15 | Disagreement 2, none on substance: Grok's guided pass would not name a liquor VAT figure at all (UNVERIFIED), Grok's open pass says nil since 2017 with the Act; the court judgment settles it. Default `parts: []` stands | See the liquor row above |
| 2026-09-15 | Tax facts folded from Gemini (guided pass), each with its basis: composition bill is a Bill of Supply with the wording above (CGST s.10, Rules 5(1)(f), 49); standalone restaurant 5 % without ITC, 18 % with ITC inside a hotel with any room at ₹7,500 or more (Notification 11/2017-CT(R) as amended by 46/2017); one paper for GST and liquor is an "invoice-cum-bill of supply" (Rule 46A); SAC 9963 is optional on a B2C bill under ₹5 crore (Notification 78/2020-CT); service charge cannot be added by default and must go on request (CCPA guidelines 04.07.2022) and when paid is part of the taxable value (s.15(2)(c)); a discount printed on the bill reduces taxable value (s.15(3)(a)); serial number ≤ 16 characters, consecutive per financial year (Rule 46(b)); rounding to the rupee permitted (s.170); credit note references the original invoice, deadline 30 November of the next financial year (s.34) | Each is a default or a rule in this sheet; verify list in Review before sign-off |

## Out of scope

Merging bills · persisted drafts · offline reserved ranges (OF) · legal bill layout per country · e-invoicing and IRN · dynamic payment QR on the bill · receipt language · tips · liquor excise register export · tax id format validation · bank-card offers.

## Open questions (owner: Shaurya)

- ~~BL-Q1~~ closed: a bar-licensed restaurant cannot be on composition (all consults agree). Default regular; `tax.collect` stays for a no-liquor outlet.
- BL-Q2 One series for food and liquor, or two? Default one; Rule 46A allows one paper.
- ~~BL-Q3~~ closed: per-restaurant setting in `tax.blocks.food`, set by the owner or at onboarding; 2.5 + 2.5 is only the seed (Shaurya via peer session).
- ~~BL-Q4~~ closed: the first customer adds a service charge and the seed has the row present, rate theirs; removable per bill before issue (BL-S10), cancel and re-issue after (BL-S9). BL-S9/S10/S21 are live tests (Shaurya via peer session).

## Review before sign-off (Shaurya reads this section only)

| Call | Weight | Why it matters |
|---|---|---|
| The line snapshot fields above, frozen vs live | **must decide** | Data written once, kept forever. Everything else on this sheet is code |
| Service charge: removable before issue without a PIN; after issue, cancel and re-issue | **must decide** | Every bill that carries one |
| CGST and SGST rounded independently (8.33 + 8.33) rather than forced to the single-rate figure (8.32 + 8.33). Differs from the critical-pieces doc; a diff is proposed, not applied | **must decide** | Every bill with a half-paisa; a CA may have a view |
| Liquor block prints no tax line in Karnataka (excise collected upstream), on a court judgment and two consults, not an accountant | **must decide** | Every liquor bill. If a CA disagrees it is one config part, no code |
| Service charge seeded ON for a new restaurant, removable on request before issue | decided (Shaurya via peer, BL-Q4) | The CCPA line says it must go on request; removal is BL-S10 |
| Split by lines only | fine to skip | PY handles amounts |
| Composition as one boolean | fine to skip | Only matters if BL-Q1 is yes |

## Files

```
backend/src-plattr/functions/
  domain/line.ts        the Line type with F/L comments; nothing else
  domain/billing.ts     preview(lines, cfg) → bill body; apportion; issue(body, number, seller); cancel; creditNote(bill, qtys). Pure
  domain/invoice.ts     nextNumber(counter, now, cfg) → {number, counter}; fiscalYear(now, cfg). Pure
  app/billing.ts        preview / issue / cancel / creditNote / reprint / split, through Ports
  adapters/firestore/billing.ts   lines, bills, counter; one transaction per issue
  api/billing.ts        onCall wrappers, exported as billing-*
frontend/till/src/features/billing/   BillScreen.tsx, useBill.ts
tests: domain/billing.test.ts · domain/invoice.test.ts · app/billing.test.ts · test/e2e/suites/billing.js · frontend/till/e2e/billing.spec.ts
golden: mock/goldenExpectedValues.json gains kind "bill" rows for BL-S1..S6, S11, S12, S13
```

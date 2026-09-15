I'll read the full offloaded prompt and the billing sheet so the three lists are grounded in the complete spec.**1. WHAT IS MISSING**

1. Payable/`subtotal` algebra covering offers, line discounts, bill discount, charges, exclusive tax, and inclusive tax — without it the printed total cannot be derived from the objects, and implementers will drop offers or add inclusive tax twice.
2. Rule: inclusive-block tax is already inside the line gross and must not be added again in `payable` — without it any liquor/VAT-inclusive config overcharges the guest and overstates the tax invoice.
3. Bill-discount basis and paisa remainder: apportion by pre-discount line net (including 0-rate liquor), leftover minor unit on the last line, clamp so net ≥ 0 — without it shares will not sum to `bill.discount.amount`, R1 “taxable share” will put the whole cut on GST food when liquor `parts` are empty, and stacked discounts will go negative.
4. Service-charge formula: base (post-line-discount net? food only?), whether the pct is of that base at preview/issue, and how the amount is split across tax blocks on a mixed food+liquor bill — without it GST is collected on liquor through the charge, or the charge is untaxed in violation of s.15(2)(c).
5. Tax source of truth: one R5 pass on each block’s summed taxable (charges included), then allocate parts onto lines/components; do not R5 per line and again per block — without it printed `blocks[]` and summed `line.tax` differ by paisa and the return cannot be tied to the paper.
6. Discount stack and per-component split: apply `offer.amount`, then ST `discount.amount`, then `billDiscount.amount`, then split the net across `components[]` by `unitListPrice×qty` into each component’s block — without it a food item with a liquor addon gets a single line tax and the wrong block’s taxable.
7. Draft ownership before issue: a `draftId` (or bill doc id) on every live line, split/merge as one transaction that rewrites those ids, `billId` frozen only at issue; cancel of an issued unpaid bill nulls it — without it S12 has no data shape and two drafts can claim the same pizza.
8. Issue concurrency: server recomputes from snapshots (ignore client money), `v` match on every line, fail if any line already has an issued `billId`, one transaction with the counter — without it a double-tap or two tills emit two numbers for one table.
9. Credit-note shape: original keeps `paid` and gains `creditNotes[]`; CN copies frozen line snapshots with negated amounts (no re-price, no re-apportion, no live config); remaining creditable qty/amount per original line; round-off stays on the original — without it a second CN double-reverses the coke, or the reverse tax does not match what was charged after a bill discount.
10. Seller identity and clock as config, frozen on the bill at issue: GSTIN, legal name, address, state code, place of supply, `locale.timezone` — without it the paper fails Rule 46 and BL-S18 flips fiscal year at UTC midnight instead of IST 1 April 00:00.
11. Number-series rules: FY string format (`2026-27`), credit-note counter `counters/{creditNoteSeries}_{FY}` with the same increment-at-issue transaction, what happens after 9999 when `invoice.width` is 4 (width is pad, not modulus), unused `reserved` ranges are illegal gaps — without it you get duplicate serials or holes a CA cannot explain.
12. Config-read failure refuses preview/issue; defaults are for empty-restaurant setup only — without it a CF blip bills an 18% hotel at 2.5+2.5 and R4 makes that permanent.
13. `line.tax` keyed by component `id` (parallel map, not an unkeyed blob); `taxBlocks{}` must also freeze `label` — without it you cannot tell which addon was taxed, and a later rename/rate “fix” is read back onto unbilled lines.
14. Charge and empty-block rules: `parts: []` means rate 0, skip R6, still print the block total, never fold into GST taxable; charge `amount` is computed server-side at issue and taxed in `taxBlockId` — without it liquor lands in CGST or SC is a bare number with no tax.
15. Integer rates (`rateBps`, 250 not `2.5`) and round mode for R6/R7 (S6 is half-up at `.50`) — without it 5.5% inclusive and residual paisa depend on IEEE rounding.
16. Missing scenarios that will ship wrong if untested: one line with two blocks (food + liquor addon); SC on mixed bill; offer + ST discount + ₹200 bill cut; CN of one line after bill discount; double-tap Issue; cancel unpaid for a wrong dish without dropping SC; IST year-end; whole-bill 100% comp (payable 0, still a number); fixed-price offer (list 699, amount 200) that the critical-pieces fixture requires.
17. Occupancy: which event stops ordering (preview vs issue), table/group not released while any draft or issued-unpaid split remains — without it a dessert is placed after freeze or the table frees with an open draft. FLAG ~75% this may belong on the order-lifecycle sheet, but BL must name the states it occupies.
18. Print: `printCount=1` at issue, DUPLICATE only when reprinting; reprint must not mutate the issued money document (append an audit event) — without it R4 is false and the first copy is unmarked.
19. If `customer.taxId` is set, require `customer.name` and print component `taxCode` on that bill — without it the company claim is rejected. FLAG ~75% for B2C-only first customer.
20. “GST 5% without ITC” legend as a config string on the food block. FLAG ~70%, CA/print matter not engine.

**2. WHAT BREAKS IN PRODUCTION**

1. Input: beer ₹499 inclusive with `parts: [{VAT, 5.5}]` + pizza ₹500 exclusive 5%. Sheet formula `payable = subtotal − discount + charges + tax + roundOff` with `subtotal=999`, `tax=26.01+25`. Output: payable ₹1050.01 (VAT counted in 499 and again in tax); guest total should stay ₹1024.00.
2. Input: same ₹499 at 5.5% inclusive, R6 as written (`taxable = gross×100÷(100+rate)`, remainder to tax, integer). Output: taxable ₹472.98, VAT ₹26.02; BL-S4 golden says ₹472.99 / ₹26.01. Fixture and code cannot both be right.
3. Input: food list ₹1,200 exclusive + liquor list ₹800 with `parts: []`, bill discount ₹200, implementer follows R1 “taxable share”. Output: liquor GST-taxable 0 so ₹200 all on food, food taxable ₹1,000, CGST/SGST on ₹1,000; S3 wants ₹120/₹80 and tax on food ₹1,080.
4. Input: two food lines taxable ₹333.00 each, R5 per line then sum `blocks[]`. Output: per line CGST ₹8.32 + SGST ₹8.33 → summed CGST ₹16.64 / SGST ₹16.66; block 5% of ₹666.00 is ₹33.30 split ₹16.65/₹16.65. Paper vs line annex vs return disagree by 1 paisa.
5. Input: S2 pizza ₹500, offer ₹100, `subtotal=listPrice`, formula only subtracts `bill.discount`. Output: payable ₹520 + tax on ₹400 or tax on ₹500; correct is taxable ₹400, payable ₹420.
6. Input: food ₹1,200 + liquor ₹800, `billing.charges` 10% into `tax.blocks.food`. Output: SC ₹200, GST ₹10 on the whole including liquor; correct is SC split (or food-only base) so GST is not charged on the liquor share.
7. Input: CF down, hotel food block is 9+9, defaults apply. Output: issued bill at 2.5+2.5; R4 forbids correction, only CN/cancel. Wrong tax forever.
8. Input: Issue at 2027-04-01 00:10 IST on a UTC server, `fiscalYearStartMonth=4`, no timezone. Output: FY still `2026-27` (UTC 31 Mar 18:40) while the next morning’s bills are `2027-28`; two years in one night or a second `0001`. FLAG ~85% (depends on host TZ; Node in prod is usually UTC).
9. Input: `invoice.width=4` implemented as `next % 10000` or zero-padded stored number. Output: bill 10000 stored/printed as `0000`, collides with the first bill of the year.
10. Input: `reserved[{from:100,to:199}]` skipped by online issue, offline never consumes it. Output: permanent hole 100–199 in series A; GST consecutive-serial failure.
11. Input: two cashiers Issue the same table, no `v` / no “already billed” check. Output: 0417 and 0418 both freeze the same lines, or one bill’s `lines[]` copy plus live `billId` pointing at the other; series lies and PY takes the wrong `payable`.
12. Input: paid bill with ₹200 apportioned discount, CN reverses coke at list ₹80. Output: CN CGST/SGST −₹2.00 each; original tax on that line was on ~₹72. Wrong reverse, original 0417 still shows full tax, GSTR original+CN do not net.
13. Input: first CN sets original `status=credited`. Output: second CN for the pizza is refused, or DC/RP drop the original sale while `payable` is still ₹609; sales over/under by a full bill.
14. Input: S9-style `cancel()` always deletes `charges[]`. Output: cancel for “wrong dish / wrong GSTIN” reissues without the service charge the guest already accepted.
15. Input: PO writes `components[{item}, {variant}]` both with `unitListPrice`. Output: `listPrice` double-counted, tax on 2×, frozen at placement, unfixable after service.
16. Input: stacked lunch offer + ST ₹50 off + bill ₹200 on a small net. Output: negative `taxable`, negative CGST (a refund on a sale).
17. Input: credit notes use `invoice.creditNoteSeries` but no counter document. Output: two CNs both `CN-0007`.
18. Input: reprint increments `printCount` on the issued bill (R4). Output: concurrent reprint vs payment/read sees two versions of an “immutable” document; auditors cannot hash the bill. Weaker money bug, broken invariant.
19. Input: `tax.collect` flipped mid-year, same `invoice.series`. Output: tax invoices and bills of supply share one consecutive series. FLAG ~80% legal; engine will happily do it.
20. Input: unbilled lines, admin edits `tax.blocks.food` rate, issue reads live config because snapshot omitted `label`/was treated as hint. Output: tonight’s placed rounds print the new rate; time-of-supply and snapshot promises both fail.

**3. WHAT SHOULD BE OUT OF SCOPE**

1. S4’s inclusive 5.5% VAT liquor path (and building R6 for a block the first Bengaluru bar will leave `parts: []`) — it adds the double-count and remainder bugs with no first-customer tax line.
2. Composition (`tax.collect`, `collectOffText`, BL-S15, Q1) — forks Bill of Supply vs Tax Invoice in the same objects; set it when the CA says so, do not code the fork in v0.
3. `counters.reserved[]` and any skip-over logic — belongs to OF; in BL it punches GST-illegal holes before anyone is offline.
4. Merge bills/tables — split-by-lines is the first-customer need; merge has no scenario and breaks occupancy.
5. `status: credited` on the original paid bill — extra state that wrecks reports; original stays `paid`, CN is a new document.
6. Live `line.tax` as a second ledger — freeze tax only on `bill.lines[]` / `bill.blocks[]` at issue; summing snapshots does not require a mutable tax field on the open line.
7. Country portability beyond R9 (`no if (country)`) — do not add keys, enums, or i18n for a single-outlet INR till.
8. Hotel 18%, IGST, a third packaged-goods block, e-invoicing/IRN, GSTIN checksum, s.34 deadline, GSTR file export — config or later sheets; not BL v0 code.
9. Persisted full draft bill state machine and draft GC — preview from lines; persist the bill at issue; split only needs a draft grouping id on lines.
10. `printCount` on the money document, legal layout, FSSAI, UQC, signature, tips, excise register, takeaway packaging, tax-id format — already mostly excluded; keep them out of this object list.

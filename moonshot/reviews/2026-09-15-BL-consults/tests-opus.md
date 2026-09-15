# Blind test-case list — Opus subagent (read only the sheet and the contract Rules), 2026-09-15

Rules used: exclusive part = half-up(taxable × rateBps / 10000); inclusive taxable = floor(gross × 10000 / (10000+rateBps)), remainder to tax; bill discount apportioned by net share with leftover on the last line; one half-up round-off on payable; partRounding default independent.

## A. apportion
- A1 nets [3333, 3333, 3334], discount 100 → [33, 33, 34].
- A2 nets [10000, 5000], discount 10000 → [6666, 3334] (last takes the leftover, not the true share).
- A3 same reversed → [3333, 6667]. **Gap: "the last line" is undefined; pin it by lineId.**
- A4 components qty 2, unit [10000, 5000, 3333] → bases [20000, 10000, 6666], cut 1000 → [545, 272, 183].
- A5 all lines at 100 % (net 0), bill discount 5000 → zeros, no NaN (~60 %; or refuse).
- A6 net 35000, share 40000 → failed-precondition; component version: share 200 on base 150.
- A7 single line takes the whole discount.

## B. tax
- B1 33300 at 250+250 independent → [833, 833], 1666. B2 residualLast → [832, 833], 1665.
- B3 blocks are sums: two lines of 33300 → block 1666 per part, never 1665 recomputed. **Most likely production bug.**
- B4 components 3333/3333/3334 at 250 → 83+83+83 = 249, not 250.
- B5 half-up not banker's: 100 → 3, 300 → 8.
- B6 inclusive parts [] 49900 → taxable 49900, tax 0. B7 550 bps → 47298 / 2602. B8 after a 10000 cut → 37819 / 2081.
- **B9 inclusive + two parts + independent cannot reconcile: 10000 → taxable 9523, tax 477, independent gives 238+238 = 476. Force residualLast for inclusive or refuse the config.**
- B10 collect false → parts 0 (or absent), total = taxable, collectOffText printed; liquor untouched.
- B11 one line two blocks: food 50000 + liquor 10000, line discount 6000 → 5000/1000; food 45000 → 1125/1125; liquor 9000; payable 56250.
- B12 taxable 0 → parts 0/0. B13 `billing.taxRoundTo` has no semantics (~70 %): define or delete. B14 every output an integer.

## C. preview
- C1 BL-S1 full. C2 mixed blocks payable = Σ block totals (subtotal 97298 + taxTotal 5102 = 102400). C3 BL-S3 payable 185400. C4 BL-S21 payable 218600.
- **C5 charge base before or after the bill discount (~65 %): post-discount 100000 → 10000 / 115500 vs pre 120000 → 12000 / 117600. Needs a Decisions line.**
- C6 charge on an empty block → 0 row or omitted, never NaN.
- C7 round-off matrix at roundTo 100: 60940 → −40; 60950 → +50; 60999 → +1; 60900 → 0; 60901 → −1; taxTotal unchanged. C8 roundTo 0. C9 roundTo 500 on 60940 → 61000 (+60).
- C10 voided line excluded from the apportion denominator. C11 100 % comp. C12 BL-S14 flagged line, no default block. C13 no lines → payable 0, issue refuses.
- C14 snapshot not config (250 stays 250 when live says 900). C15 determinism. C16 free item is qty with 100 % discount; qty 0 rejected. C17 offer above list → failed-precondition.

## D. issue (app layer)
- D1 number and counter in one step. D2 double tap → "already issued 0417", counter still 418. D3 stale v → refuse. D4 zero countable lines → refuse. D5 missing block names the dish. D6 config read failure → refuse, never defaults. D7 client money ignored. D8 deep copy. D9 seller frozen. D10 charges survive onto the bill.

## E. cancel
- E1 issued → cancelled, number kept, lines' billId back to null, counter untouched. E2 paid → refuse. E3 cancelled → refuse, first cancel not overwritten. E4 charges preserved. E5 re-issue gives 0418.

## F. creditNote
- F1 BL-S11 confirmed. **F2/F3 partial qty needs a rounding rule; Σ notes must equal the charged amount** (proposed −46666, −46666, −46668; ~75 % on shape). F4 full qty reconciles. F5 over-credit refused. F6 qty 4 of 3, 0, negative refused. F7 note on issued-unpaid or cancelled → refuse. F8 nothing re-priced. F9 own series CN; "CN-0007" separator is not a key. F10 creditNoteOf cites number and date. F11 voided lines not creditable. F12 billDiscount share negated too.

## G. invoice
- G1 padding. G2 no wrap. G3 absent counter → 0001. G4 fiscal year at startMonth 4. **G5 timezone trap: 2026-03-31T19:00Z → 2026-27, 18:00Z → 2025-26.** G6 year-scoped key. **G7 startMonth 1 label undefined (~50 %).** G8 serial ≤ 16 chars. G9 monotonic. G10 pure.

## Summary of what the sheet forgot
B9, A3, C5, F3, G5, B13, G7, A5/C6. No wrong expected value found in the sheet.

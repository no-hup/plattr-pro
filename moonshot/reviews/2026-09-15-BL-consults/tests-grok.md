I'll read the full offloaded prompt and any remaining spec details first so the test cases match the signed sheet.I’ll pull the golden rows and any rounding notes so the expected minor-unit figures match the signed sheet.Defaults used unless a case overrides: food exclusive CGST 250 bps + SGST 250 bps, `tax.partRounding=independent`, `billing.roundTo=100`, `billing.taxRoundTo=0`, liquor inclusive `parts=[]`, `locale.minorUnits=2`, series `A` width 4, CN series `CN`, FY start month 4, tz `Asia/Kolkata`. Charge `10%` is `pctBps=1000`. Half-up means `floor(x+0.5)` on positives. Leftover minor unit lands on the last line/component **by array position**.

---

## A. Money engine (golden)

**T1 · BL-S1**  
In: lines pizza `listPrice=50000` food, coke `listPrice=8000` food; no offer/discount/charge.  
Out: pizza `taxable=50000` CGST `1250` SGST `1250`; coke `taxable=8000` CGST `200` SGST `200`; `blocks.food.taxable=58000` CGST `1450` SGST `1450` `total=60900`; `subtotal=58000` `taxTotal=2900` `roundOff=0` `payable=60900`.

**T2 · BL-S2**  
In: pizza `50000`, offer `10000`.  
Out: `taxable=40000` CGST `1000` SGST `1000` `taxTotal=2000` `roundOff=0` `payable=42000`.  
Reject if `payable=42500` (tax-then-cut).

**T3 · BL-S3**  
In: food `list=120000`, liquor `list=80000`, bill discount `20000`. One food line, one liquor line.  
Out: food `billDiscount=12000` `taxable=108000` CGST `2700` SGST `2700` `total=113400`; liquor `billDiscount=8000` `taxable=72000` parts `[]` tax `0` `total=72000`; `subtotal=180000` `taxTotal=5400` `roundOff=0` `payable=185400`.

**T4 · BL-S4 nil liquor tax**  
In: beer `49900` liquor, pizza `50000` food.  
Out: liquor `taxable=49900` tax `0` `total=49900`; food `taxable=50000` CGST `1250` SGST `1250` `total=52500`; `subtotal=99900` `taxTotal=2500` `roundOff=0` `payable=102400`. Beer is not in food taxable (`food.taxable≠99900`).

**T5 · BL-S4 VAT 5.5% inclusive**  
In: same lines; liquor `parts=[{VAT,550}]` `mode=inclusive`.  
Out: liquor `taxable=floor(49900×10000÷10550)=47298` VAT `2602` `total=49900`; food unchanged `52500`; `subtotal=97298` `taxTotal=5102` `payable=102400`. Guest still `102400`.

**T6 · BL-S5 independent (default)**  
In: one food line `taxable=33300`.  
Out: CGST `833` SGST `833` `taxTotal=1666`; pre-round `34966`; `roundOff=+34` `payable=35000`. With `roundTo=0`: `roundOff=0` `payable=34966`.

**T7 · BL-S5 residualLast**  
In: same, `tax.partRounding=residualLast`.  
Out: CGST `832` SGST `833` `taxTotal=1665`; pre-round `34965`; `roundOff=+35` `payable=35000`. With `roundTo=0`: `payable=34965`.

**T8 · BL-S13**  
In: beer qty `2`, `unitListPrice=50000`, `listPrice=100000`, offer `50000`, liquor.  
Out: qty `2` `list=100000` offer `50000` liquor `taxable=50000` tax `0` `total=50000` `payable=50000` `roundOff=0`.

**T9 · BL-S22**  
In: S1 lines, bill discount `58000` (100%).  
Out: every line `taxable=0` CGST `0` SGST `0`; `subtotal=0` `taxTotal=0` `roundOff=0` `payable=0`. Issue still consumes a number (see T70).

**T10 · BL-S23 success**  
In: pizza `50000`, offer `10000`, line discount `5000`, bill discount `20000`; table net `35000`.  
Out: `billDiscount=20000` `taxable=15000` CGST `375` SGST `375`; pre-round `15750`; `roundOff=+50` `payable=15800`.

**T11 · BL-S23 refuse below zero**  
In: same pizza net `35000`, bill discount `35001`.  
Out: failed-precondition; no bill; counter unchanged.

**T12 · BL-S21**  
In: food net `120000`, liquor net `80000`, charge `{pctBps:1000, taxBlockId:food}`.  
Out: `charges[0].base=120000` `amount=12000`; food `taxable=132000` CGST `3300` SGST `3300` `total=138600`; liquor `80000` tax `0`; `subtotal=212000` `taxTotal=6600` `roundOff=0` `payable=218600`. Liquor tax `0`, liquor does not include `12000`.

**T13 · BL-S17 void vs 100% discount**  
In: biryani `45000` `void=true` `countsTowardTotal=false`; dessert `20000` discount `20000` `countsTowardTotal=true`; pizza `50000`.  
Out: biryani not in block sums, its `taxable=0` tax `0`; dessert `taxable=0` CGST `0` SGST `0`; pizza `52500`; `subtotal=50000` `taxTotal=2500` `payable=52500`; `lines.length=3`.

**T14 · BL-S15 food composition + liquor**  
In: S4 lines; `food.collect=false`; liquor default.  
Out: food tax parts `0` food `total=50000`; liquor `taxable=49900` tax `0` `total=49900`; `taxTotal=0` `payable=99900`.

**T15 · composition does not kill liquor VAT**  
In: S4 + food `collect=false` + liquor VAT 550 inclusive.  
Out: food tax `0` `total=50000`; liquor `47298`/`2602` `total=49900`; `subtotal=97298` `taxTotal=2602` `payable=99900`.

---

## B. Rounding

**T16 · BL-S6 down**  
In: pizza `50000` food + liquor `8440` → pre-round `60940`.  
Out: CGST `1250` SGST `1250` (unchanged); `roundOff=-40` `payable=60900`.

**T17 · BL-S6 half-up**  
In: pizza `50000` + liquor `8450` → `60950`.  
Out: tax still `1250`/`1250`; `roundOff=+50` `payable=61000`.

**T18 · BL-S6 roundTo=0**  
In: T16 lines, `roundTo=0`.  
Out: `roundOff=0` `payable=60940`.

**T19 · not banker's rounding**  
In: pizza `50000` + liquor `8350` → `60850`.  
Out: half-up `roundOff=+50` `payable=60900` (not `60800`).

**T20 · just below half**  
In: pizza `50000` + liquor `8349` → `60849`.  
Out: `roundOff=-49` `payable=60800`.

**T21 · exact rupee**  
In: S1 `60900`.  
Out: `roundOff=0` `payable=60900`.

**T22 · 1 paisa bill**  
In: food `listPrice=1`.  
Out: CGST `0` SGST `0` pre-round `1`; `roundOff=-1` `payable=0`.

**T23 · independent vs 5% identity**  
In: food `20`.  
Out independent: CGST `1` SGST `1` `taxTotal=2` pre-round `22` `roundOff=-22` `payable=0`.  
Out residualLast: combined `1`, CGST `0` SGST `1` `taxTotal=1` pre-round `21` `roundOff=-21` `payable=0`.

**T24 · last-line leftover discount**  
In: three food lines `10000`,`10000`,`10000` in that order; bill discount `1`.  
Out: `billDiscount=[0,0,1]`; `taxable=[10000,10000,9999]`; independent tax per line `500`,`500`,`500`; `subtotal=29999` `taxTotal=1500` pre-round `31499`; `roundOff=+1` `payable=31500`.

**T25 · leftover follows position, not size**  
In: nets coke `8000` then pizza `35000`; bill discount `20000`.  
Out: coke `billDiscount=floor(20000×8000/43000)=3720`; pizza (last) `16280`; coke `taxable=4280` CGST `107` SGST `107`; pizza `taxable=18720` CGST `468` SGST `468`; `subtotal=23000` `taxTotal=1150` `payable=24150` `roundOff=+50` wait: 4280+18720=23000; tax 214+936=1150; total 24150; rem 50 → `roundOff=+50` `payable=24200`.

**T26 · reverse order of T25**  
In: pizza `35000` then coke `8000`; bill discount `20000`.  
Out: pizza `billDiscount=floor(20000×35000/43000)=16279`; coke last `3721`; pizza `taxable=18721` CGST `468` SGST `468`; coke `taxable=4279` CGST `107` SGST `107`; `subtotal=23000` `taxTotal=1150` pre-round `24150`; `roundOff=+50` `payable=24200`.

**T27 · inclusive identity holds when parts split**  
In: liquor `49900`, inclusive CGST 250 + SGST 250 (combined 500).  
Out: `taxable=floor(49900×10000/10500)=47523`; tax total `2377`; `total=49900` (must equal gross); `payable=49900`. Split: residual on last → CGST `1188` SGST `1189` (or whatever split, **sum must be 2377**).

**T28 · taxRoundTo=100 on S1**  
In: S1, `billing.taxRoundTo=100`.  
Out **if applied per head after paisa tax**: CGST `1500` SGST `1500` `taxTotal=3000` `payable=61000` `roundOff=0`.  
**FLAG <80%:** whether `taxRoundTo` rounds each part, the combined tax, or is a no-op until a CA sets it. Default `0` must leave T1 at `1450`/`1450`.

**T29 · taxRoundTo=100 on S5 independent**  
In: `33300`, `taxRoundTo=100`.  
Out **if per head**: `833→800` each, `taxTotal=1600`, pre-round `34900`, `roundOff=0` `payable=34900`.  
**FLAG <80%:** same as T28.

---

## C. Components, snapshots, no re-price

**T30 · additive components same block**  
In: pizza item `45000` + variant `5000`, qty `1`, `listPrice=50000`.  
Out: same as pizza in T1: `taxable=50000` CGST `1250` SGST `1250`.

**T31 · one line, two blocks**  
In: qty `1`, item `50000` food + addon `49900` liquor, `listPrice=99900`.  
Out: food `50000`/`1250`/`1250`; liquor `49900`/`0`; `payable=102400` (same money as T4).

**T32 · offer split across components**  
In: T31, offer `20000`.  
Out: food share `floor(20000×50000/99900)=10010` food `taxable=39990` CGST `1000` SGST `1000`; liquor last `9990` `taxable=39910` tax `0`; `payable=81900` `roundOff=0`.

**T33 · qty multiplies list, not unit tax twice**  
In: pizza qty `2`, `unitListPrice=50000`, `listPrice=100000`.  
Out: `taxable=100000` CGST `2500` SGST `2500` `payable=105000`.

**T34 · live menu / live config ignored**  
In: snapshot pizza `50000` food 5%; live menu now `99999`; live food parts now 900+900 bps.  
Out: still T1 pizza `1250`/`1250`; issue `payable=60900` if coke present.

**T35 · client money ignored**  
In: snapshots T1; client body `payable=1` `taxTotal=0`.  
Out: stored `payable=60900` `taxTotal=2900`.

**T36 · preview === issue money**  
In: same snapshots T1.  
Out: preview `payable=60900` equals issued `payable=60900`; preview `number=null`.

**T37 · missing tax block**  
In: dish `name="Dal"`, component `taxBlockId` missing / not in `taxBlocks`.  
Out: issue refused; counter `next` unchanged; no default `taxable`/`tax` written as if 0-rated. **FLAG <80%:** whether preview subtotal includes `listPrice` of the flagged line; issue must not.

**T38 · config read fail**  
In: T1 lines; seller/locale/invoice/billing read fails.  
Out: issue refused; counter unchanged; no bill doc.

**T39 · `pctBps` not `percentage=10` as bps**  
In: S1 + charge. `pctBps=1000` → `amount=5800`.  
Out: if someone passes `10` as bps, `amount` would be `58` — that is a fail. Expected `charges[0].amount=5800`.

**T40 · charge after bill discount (food only)**  
In: food `120000`, liquor `80000`, bill discount `20000`, food charge 10%.  
Out **if base is net after bill discount**: food net `108000`, `charge.base=108000` `amount=10800`; food `taxable=118800` CGST `2970` SGST `2970` `total=124740`; liquor `72000`; `payable=196740`.  
**FLAG <80%:** sheet says “net of the lines in the charge’s own block”; I am treating that as after offer, line discount, **and** bill discount. If charge is on pre-bill-discount net, `base=120000` `amount=12000` `payable=198000` after the T3 discount.

**T41 · charge on liquor `parts=[]`**  
In: liquor `80000`, charge 10% `taxBlockId=liquor`.  
Out: `base=80000` `amount=8000` liquor `total=88000` tax `0`; `payable=88000`.  
**FLAG <80%:** if that block later has VAT 550, whether `8000` is extra gross (inclusive remainder) or exclusive add.

**T42 · negative variant delta**  
In: item `50000` + variant `-10000`, `listPrice=40000` food.  
Out: `taxable=40000` CGST `1000` SGST `1000` `payable=42000`.  
**FLAG <80%:** whether negative unit prices are allowed at placement; if yes, this is the money.

---

## D. Service charge drop / cancel / reissue

**T43 · BL-S9 issued with SC**  
In: T1 + food charge 10%, unpaid, issue.  
Out: `charge.base=58000` `amount=5800`; food `taxable=63800` CGST `1595` SGST `1595` `taxTotal=3190`; pre-round `66990`; `roundOff=+10` `payable=67000`; `number="0417"`.

**T44 · BL-S9 cancel**  
In: T43, cancel PIN+reason.  
Out: bill `status=cancelled` `number="0417"` `payable=67000` (frozen); lines `billId=null`; invoice counter stays at `418` (not reused); charges still on the returned draft.

**T45 · BL-S9 reissue after drop**  
In: after T44, drop charge, issue.  
Out: `payable=60900` `roundOff=0` `number="0418"`; `0417` still cancelled `67000`.

**T46 · cancel “wrong dish” keeps charge**  
In: T43 cancel, reissue **without** drop.  
Out: `0418` `payable=67000` `roundOff=+10` (same money as T43).

**T47 · BL-S10 drop before issue**  
In: T1 + charge present, drop, then issue.  
Out: no charge row; `payable=60900`; `number="0417"` (no cancelled `0417`).

**T48 · drop after issue refused**  
In: T43, drop charge on issued bill.  
Out: refused; `payable` stays `67000`; no edit of `blocks`.

---

## E. Credit notes

**T49 · BL-S11 full line**  
In: T1 issued+paid `payable=60900` `number="0417"`; credit coke qty `1`.  
Out: CN `taxable=-8000` CGST `-200` SGST `-200` `total=-8400` `roundOff=0`; original still `status=paid` `payable=60900` `taxable` coke `+8000`; original `roundOff=0`; `creditNotes[].number="0007"` if CN `next=7`; invoice counter unchanged.

**T50 · live rate change does not reprice CN**  
In: after T1 paid, live food 18%; credit coke.  
Out: still `-8000`/`-200`/`-200`/`-8400`, not `-1440` tax.

**T51 · qty 1 of 3 beers**  
In: beer qty `3` `list=150000` liquor paid; credit qty `1`.  
Out: CN `qty=1` `list=-50000` `taxable=-50000` tax `0` `total=-50000`; original `credited.qty=1`; original `payable=150000`.

**T52 · remaining qty**  
In: after T51, credit qty `2`.  
Out: CN2 `total=-100000`; `credited.qty=3`; further credit qty `1` refused; Σ CN totals `-150000`.

**T53 · over-credit refused**  
In: T51 remaining 2, credit qty `3`.  
Out: refused; original `payable` still `150000`; CN counter unchanged.

**T54 · chunk residual (uneven)**  
In: food qty `3` `taxable=10001` CGST `250` SGST `250` (independent: `10001×2.5%=250.025→250` each, tax `500`, line total `10501`); credit qty `1` then qty `2`.  
Out: Σ of both CNs `taxable=-10001` CGST `-250` SGST `-250` `total=-10501`.  
**FLAG <80%:** per-note split. I would implement `floor(orig×qty/origQty)` on non-final notes and dump residual on the note that zeros remaining qty. First note is **not** specified as `-3334` vs `-3333`.

**T55 · CN does not reverse original round-off**  
In: T17 paid `payable=61000` `roundOff=+50`; credit whole bill.  
Out: CN `roundOff=0`; original `roundOff=+50` `payable=61000` unchanged; CN totals negate **block totals**, not the rounded payable (`CN.total=-60950`, not `-61000`).  
**FLAG <80%:** “round-off stays on the original” is clear; whether a full-qty CN equals `-Σ blocks.total` (`-60950`) is the reading I am using.

**T56 · CN with billDiscount**  
In: T3 paid; credit full food line (qty 1).  
Out: CN food `billDiscount=-12000` `taxable=-108000` CGST `-2700` SGST `-2700` `total=-113400`; original `payable=185400` unchanged.

**T57 · credit unpaid issued**  
In: T1 issued, not paid; credit coke.  
Out: refused; no CN; `payable=60900`.

**T58 · credit cancelled**  
In: T44; credit.  
Out: refused.

**T59 · free-amount credit**  
In: paid T1, credit amount `5000` with no qty.  
Out: refused.

---

## F. Numbers, FY, freeze, split

**T60 · BL-S7 issue**  
In: T1 preview then issue; counter `A_2026-27.next=417`.  
Out: `number="0417"` `series="A"` `fiscalYear="2026-27"`; `next=418`; lines `billId` set.

**T61 · double tap / second till**  
In: two issue on same lines after T60.  
Out: loser failed-precondition already issued `0417`; `next` stays `418` (not `419`); no second bill; `payable` of winner `60900`.

**T62 · BL-S8 freeze**  
In: after T60, line discount `5000` on pizza.  
Out: refused; bill `payable=60900`.

**T63 · width does not wrap**  
In: `next=10000`, width `4`.  
Out: printed/stored number `10000` (not `0000`); `next=10001`.

**T64 · pad**  
In: `next=1`.  
Out: `number="0001"`.

**T65 · BL-S18 FY boundary IST**  
In: issue at `2027-03-31T23:59:00+05:30`, `next=999` on `A_2026-27`.  
Out: `number="0999"` `fiscalYear="2026-27"` `next=1000`.  
In: issue at `2027-04-01T00:00:00+05:30`, `A_2027-28.next=1`.  
Out: `number="0001"` `fiscalYear="2027-28"`.

**T66 · FY uses tz not UTC**  
In: `2027-03-31T18:29:00Z` → still `2026-27` `0999` path.  
In: `2027-03-31T18:30:00Z` → `2027-28` `0001`.  
Wrong tz (`UTC`) would flip at `2027-04-01T05:30 IST` — that is a fail.

**T67 · cancelled number kept**  
In: T44 then T45.  
Out: `0417` cancelled; next issue `0418`; no hole skip beyond that.

**T68 · CN series independent**  
In: T60 then T49; invoice `next=418`, CN `next=7`.  
Out: invoice still `418`; CN `next=8`.

**T69 · BL-S16 reprint**  
In: T60 reprint twice.  
Out: bill `payable=60900` `subtotal=58000` `taxTotal=2900` unchanged; audit `amount=60900` each time; `next` still `418`.

**T70 · zero payable still numbered**  
In: T9, `next=419`.  
Out: `number="0419"` `payable=0` `next=420`.

**T71 · BL-S12 split**  
In: beer `49900` + pizza `50000` + coke `8000`; move beer to draft B.  
Out: draft A issue `payable=60900` `number="0417"`; draft B issue `payable=49900` `number="0418"`; unit prices still `49900`/`50000`/`8000`.

**T72 · split does not clone bill discount onto both drafts**  
In: T3 then move liquor to draft B.  
Out **expected:** draft A food `billDiscount=20000` `taxable=100000` CGST `2500` SGST `2500` `payable=105000`; draft B liquor `billDiscount=0` `payable=80000`.  
**FLAG <80%:** sheet only says “recomputed per draft”. Cloning `20000` onto both (`A payable=105000`, `B payable=60000`) would double-cut. Dropping the discount on both is the other legal option (`A=126000`, `B=80000`).

**T73 · BL-S19**  
In: T1 + `customer.taxId="foo"` (invalid).  
Out: `payable=60900`; tax id stored as `"foo"`.

**T74 · seller frozen**  
In: issue T1 with `seller.taxId="GST1"`; then config `"GST2"`; reprint.  
Out: bill.seller.taxId `"GST1"`; `payable=60900`.

**T75 · empty table**  
In: no lines.  
Out: preview not issuable; issue refused; `next` unchanged. Payable not `0` with a number.

**T76 · BL-S20**  
Out of scope (OF). Do not assert reserved-range skips in BL. BL must not increment `next` over a hole.

---

## G. Concurrency

**T77 · two tables S1**  
In: both T1, `next=417`.  
Out: numbers `0417` and `0418`; both `payable=60900`; `next=419`; no duplicate number.

**T78 · issue vs void**  
In: T1, concurrent void pizza and issue.  
Winner void: issue sees `v` mismatch or voided line; `next` unchanged if issue failed; if issue won first: void refused, `payable=60900`, `next=418`. Never both a voided pizza **and** `taxable=50000` on an issued bill.

**T79 · issue vs line discount**  
In: concurrent ST discount `5000` on pizza and issue.  
Out: one of: issued at T1 `60900` and discount refused; or issued at pizza `taxable=45000` CGST `1125` SGST `1125` coke `8400` `payable=55650` `roundOff=+50` `payable=55700` with matching `v`. Never issued `60900` **and** line `discount=5000`.

**T80 · split vs issue**  
In: concurrent split of beer and issue of whole table.  
Out: one transaction wins. Either one bill `102400` (T4) and split fails, or two bills `60900`+`49900` (T71) and whole-table issue fails. Never three numbers for those lines. `next` advances by `1` or `2` accordingly.

**T81 · two CNs on remaining qty 1**  
In: T49 remaining coke qty `0` after first winner.  
Out: one CN `total=-8400`; other refused; CN `next` +1 once.

**T82 · cancel vs pay**  
In: T43 concurrent pay and cancel.  
Out: if paid wins, cancel refused, `status=paid` `payable=67000`; if cancel wins, pay must not see an issued bill, `status=cancelled` `payable=67000`. Never `status=paid` and `cancelled` both true.

**T83 · double cancel**  
In: T44 twice.  
Out: second refused; `number="0417"`; invoice `next=418`.

**T84 · concurrent reprint**  
In: two reprints of T60.  
Out: `payable=60900` both audits; bill bytes/money unchanged; `next=418`.

---

## H. State / ACL (numeric side-effects)

| Case | In | Out (money / counter) |
|---|---|---|
| T85 SERVER preview T1 | role SERVER | `payable=60900` `number=null`; `next` unchanged |
| T86 SERVER issue | role SERVER | refused; `next` unchanged; no bill |
| T87 SERVER drop charge | T43 draft | refused; preview still `67000` pre-round path |
| T88 MANAGER drop | T47 | `payable=60900` |
| T89 issued→paid | PY on T60 | `status=paid` `payable=60900`; BL does not rewrite lines |
| T90 paid stays paid | line edit / cancel | refused; `60900` |
| T91 issued→cancelled | T44 | `67000` frozen; lines `billId=null` |
| T92 reissue after cancel | T45 | new doc `0418` `60900` |
| T93 reprint draft | no bill | refused; `next` unchanged |
| T94 issue `billId!=null` | stale client | failed-precondition; `next` unchanged |
| T95 issue stale `v` | line `v` bumped | refused; `next` unchanged |

---

## I. Invariants to assert on every success path

On every issued bill above:  
`subtotal = Σ blocks.taxable`  
`taxTotal = Σ block part amounts`  
`Σ lines.tax.parts` (counting only `countsTowardTotal`) `= taxTotal`  
`payable = Σ blocks.total + roundOff`  
`roundOff ∈ (-roundTo, +roundTo]` with half-up  
inclusive block `total = gross` (T5, T27)  
`parts=[]` ⇒ tax `0`, own block, not folded into food.

---

## Flags (<80%)

1. **T28–T29 `taxRoundTo`:** default `0` is solid. How `100` applies (per CGST/SGST head vs combined) is not computed on the sheet.  
2. **T40 charge vs bill discount order.**  
3. **T41 / T27 independent split on inclusive remainder** — total tax must stay `gross-taxable`; last-part leftover is the only split that keeps R6.  
4. **T54 / T55 credit-note integer pro rata and whether a full reverse excludes original `roundOff`.** Full reverse of T17 must not print CN `-61000` if original tax lines were `60950`.  
5. **T72 discount after split.**  
6. **T37 preview of a line with no block** — issue refuse is certain; preview totals are not.  
7. **T42 negative variant.**  
8. **Charge amount rounding** when `base×pctBps/10000` is not integer (e.g. base `33333` → `3333.3`). Not in the sheet. Do not ship without locking `floor` vs half-up; I did not put a fake expected there.

BL-S20 is OF, not a BL numeric case. Tips, merge, IRN, tax-id format, offline holes: out of scope, no expected money.

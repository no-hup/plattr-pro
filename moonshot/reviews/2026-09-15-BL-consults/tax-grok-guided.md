# POS tax defaults — Bengaluru dine-in restaurant with bar (as at 15 September 2026)

Scope: single-outlet B2C dine-in in Bengaluru, Karnataka; turnover under INR 5 crore; food and drink under GST; alcoholic liquor outside GST. Figures below are configuration defaults, not hard-coded values. Anything not matched to a primary source is marked UNVERIFIED.

---

## 1. Composition scheme vs regular GST — bill wording

**Summary:** A composition restaurant must issue a bill of supply (not a tax invoice), must not show or collect GST, and must print the prescribed composition legend at the top; a regular restaurant issues a tax invoice showing CGST/SGST. A Bengaluru bar-restaurant that actually sells liquor is generally ineligible for composition.

**Answer**

Regular GST (section 9, CGST Act 2017 / KGST Act 2017): the outlet issues a tax invoice under section 31 read with rule 46 of the CGST Rules 2017, collects CGST + KGST from the guest, and (if on the 5% restaurant rate) forgoes ITC.

Composition (section 10): the dealer pays a flat levy on turnover and **shall not collect any tax from the recipient** and is **not entitled to ITC** — section 10(4). Instead of a tax invoice, the dealer issues a **bill of supply** — section 31(3)(c) read with rule 49.

Mandatory wording on every bill of supply (rule 5(1)(f), CGST Rules 2017):

> composition taxable person, not eligible to collect tax on supplies

That phrase must appear **at the top** of the bill of supply. Signboards at the premises must say “composition taxable person” — rule 5(1)(g).

What may **not** appear: a GST rate line, a CGST/SGST amount, or any collection of GST from the guest. Showing “GST 5%” on a composition bill is the exact practice CBIC publicly contradicted (composition dealers cannot issue a taxable invoice or collect GST).

Restaurant composition rate, if eligible: **2.5% CGST + 2.5% KGST = 5%** of turnover in the State — section 10(1)(b) (supplies in Schedule II para 6(b)) read with rule 7, Sl. No. 2. Karnataka turnover ceiling for this scheme: **INR 1.5 crore** in the preceding FY — Notification No. 14/2019-Central Tax dated 7 March 2019 (w.e.f. 1 April 2019). The separate 6% scheme under section 10(2A) / Notification No. 2/2019-CT (Rate) dated 7 March 2019 is for residual service providers, not the restaurant 5% composition.

**Bar licence — eligibility.** Section 10(2)(b) (as amended by the CGST (Amendment) Act 2018, in force 1 February 2019) disqualifies a person “engaged in making any supply of goods or services which are not leviable to tax under this Act.” Alcoholic liquor for human consumption is not leviable to GST — section 9(1). Schedule II para 6(b), as it now stands, covers food or drink **other than alcoholic liquor for human consumption**. Working position of the department and of most practitioners: a restaurant that **sells liquor** cannot remain in composition. Default the POS to **regular GST** whenever a bar licence is on.

Law vs practice: some small eat-in places still try to sit in composition while pouring liquor. That is not a safe default.

**Period:** composition machinery in force from 1 July 2017; current 1.5 crore ceiling from 1 April 2019; Schedule II 6(b) alcohol carve-out as amended by the CGST (Amendment) Act 2018 (1 February 2019).

**Rests on:** CGST Act ss. 9, 10(1)(b), 10(2)(b), 10(4), 31(3)(c); Schedule II para 6(b); CGST Rules rr. 5(1)(f)–(g), 7, 49; Notification 14/2019-CT dated 7.3.2019.

**Confidence:** high on bill-of-supply wording and the no-collection rule; high that a liquor-selling outlet should not be configured as composition.

---

## 2. GST rate on restaurant food and drink; hotel split; ITC

**Summary:** A standalone Bengaluru restaurant is 5% GST (2.5% CGST + 2.5% KGST) without ITC; a restaurant inside a “specified premises” hotel is 18% with ITC. The split is premises-based, not dish-based.

**Answer**

| Situation (FY 2026–27, i.e. from 1 April 2026, looking at FY 2025–26 rooms) | Rate | ITC |
|---|---|---|
| Restaurant service **other than at specified premises** (standalone restaurant; also a hotel restaurant whose rooms did not cross the threshold and that has not opted in) | **5%** (2.5 + 2.5) | **Not available** — condition of the rate entry |
| Restaurant service **at specified premises** | **18%** (9 + 9) | **Available** |

**What decides the split.** “Specified premises” is defined in para 4(xxxvi) of Notification No. 11/2017-Central Tax (Rate) dated 28 June 2017, as substituted by **Notification No. 05/2025-Central Tax (Rate) dated 16 January 2025**, **w.e.f. 1 April 2025**:

- a premises from which, in the **preceding** FY, hotel accommodation was supplied with **value of supply of any unit above INR 7,500 per unit per day** (or equivalent); or
- a premises that a registered hotel-accommodation supplier has **declared** as specified premises (Annexure VII between 1 January and 31 March of the preceding FY; new registrants: Annexure VIII within 15 days of acknowledgement); or
- the corresponding new-applicant declaration.

The old “declared tariff” test was omitted from 1 April 2025. Classification is **premises-wise**, not entity-wise. A standalone dine-in with no rooms is never a specified premises, and cannot opt into 18% with ITC — that option is for hotel-accommodation suppliers (CBIC FAQ on restaurant service at specified premises, issued after Notification 05/2025; mirrored by Karnataka CTD FAQ dated March 2025, gst.karnataka.gov.in).

**Rate entries (still Notification 11/2017-CT (Rate) as amended):**

- Sl. No. 7(ii): supply of restaurant service other than at specified premises — central tax **2.5%**, condition that credit of input tax on goods and services used in supplying the service has not been taken (Explanation (iv) of that notification).
- Sl. No. 7(vi), Explanation (b): restaurant service at specified premises — **9%** central tax, with ITC.

Karnataka mirrors this under the KGST rate notification corresponding to 11/2017.

“Restaurant service” (para 4 of Notification 11/2017, inserted by Notification 20/2019-CT (Rate) dated 30 September 2019, w.e.f. 1 October 2019): supply, by way of or as part of any service, of food or any other article for human consumption or any drink, by a restaurant, eating joint including mess or canteen, whether for consumption on or away from the premises.

Alcoholic liquor is **not** in this GST charge — section 9(1). Soft drinks, mocktails, tea, coffee served as part of restaurant service follow the restaurant rate, not a goods rate.

**ITC in each case.** At 5%: ITC on inputs used exclusively for that restaurant service must not be taken; common ITC is reversed as if the 5% restaurant supply were exempt — Explanation (iv) of Notification 11/2017, as explained in the CBIC/Karnataka FAQ. At 18% specified premises: normal ITC under sections 16–17.

**Period:** 5% / 18% restaurant structure in this form from 1 October 2019 (Notification 20/2019-CT (Rate)); specified-premises definition currently in force from **1 April 2025**.

**Rests on:** Notification 11/2017-CT (Rate) dated 28.6.2017, Sl. No. 7(ii) and 7(vi); Notification 20/2019-CT (Rate) dated 30.9.2019; Notification 05/2025-CT (Rate) dated 16.1.2025; section 9(1); CBIC FAQ on restaurant service at specified premises.

**Confidence:** high.

**POS default for this outlet:** 5% without ITC on food and non-alcoholic drink. Flag 18% only if the operator later attaches the kitchen to a specified-premises hotel.

---

## 3. Karnataka tax on liquor sold in a bar or restaurant

**Summary:** Liquor is outside GST. Karnataka does not currently add a guest-facing VAT line on bar sales; the state tax is additional excise duty collected upstream, in lieu of sales tax. The last guest-facing VAT on urban bar sales was 5.5%, removed from 1 April 2017.

**Answer**

**Which law.** Alcoholic liquor for human consumption is carved out of GST — Constitution Article 366(12A); CGST Act section 9(1) and KGST Act section 9(1). Manufacture and sale sit with the State: **Karnataka Excise Act, 1965** and the **Karnataka Excise (Excise Duties and Fees) Rules, 1968**, plus the remnant **Karnataka Value Added Tax Act, 2003** to the extent liquor remains a VAT commodity.

On-premise sale in Bengaluru is under a **CL-9** refreshment-room (bar) licence (or CL-7 for hotel/boarding house) — Karnataka Excise (Sale of Indian and Foreign Liquors) Rules, 1968, rule 3(9). Bars and restaurants are **not** bound by bottle MRP the way a CL-2 retail shop is; they may sell by the peg or bottle at a price they set (Karnataka High Court, *Renukamba v. State of Karnataka*, 22 March 2017, contrasting CL-2 MRP with bar/restaurant pricing).

**Current rate on a sale by the bar to the guest.** There is **no current ad valorem VAT that the POS must add on the guest cheque**.

History, from primary material:

- From **1 March 2014**, KVAT was levied at **5.5%** on liquor including beer, fenny, liqueur and wine sold by urban bars, restaurants, clubs and star hotels — KVAT (Amendment) Act 2014 inserting Entry 59-A in the Third Schedule, with Notification dated 28 February 2014 carving urban CL-9 and similar licences out of the general liquor exemption. Upheld in *Sangeetha Bar & Restaurant v. State of Karnataka* (Karnataka High Court, 22 December 2021) for the period up to GST.
- Karnataka Budget 2017–18 (speech of 15 March 2017, para 491): “VAT on liquor including beer, fenny, liqueur and wine will be removed with effect from **01.04.2017**,” with a matching hike in additional excise duty slabs. Contemporary reporting (The Hindu, 15 March 2017; The Hindu Business Line, 15 March 2017) records the same date.

Since then, the published Karnataka excise duty structure states **“AED : ADDITIONAL EXCISE DUTY (In lieu of Sales Tax)”** — State Excise Duty Structure of Karnataka 2025–26 (stateexcise.karnataka.gov.in). AED is built into the KSBCL landing price / declared-price slab, not billed by the restaurant to the guest as a separate VAT.

**Last change of the guest-facing levy:** VAT **removed 1 April 2017**. Excise (AED / AIB) has been revised several times since; the latest structural change is the **Alcohol-in-Beverage** duty under the **Karnataka Excise (Excise Duties and Fees) (2nd Amendment) Rules, 2026**, Notification No. **FD 14 PES 2026 dated 8 May 2026**, **in force 11 May 2026**. That revises duty on the producer/wholesale side and MRP lists; it is **not** a restaurant VAT rate.

I did not find a Karnataka commercial-tax notification after 1 April 2017 that re-imposes a percentage VAT on CL-9/CL-7 sales to guests. Treat any “VAT 20% on liquor” POS default as **wrong for Karnataka**.

**Period:** no guest-facing VAT from 1 April 2017 through 15 September 2026, on the sources above.

**Rests on:** CGST/KGST s. 9(1); KVAT Act 2003 Entry 59-A (historical); Karnataka Budget 2017–18 para 491; Karnataka Excise (Excise Duties and Fees) Rules 1968, including 2nd Amendment Rules 2026 (FD 14 PES 2026, 8.5.2026); State Excise duty-structure note “AED in lieu of sales tax”.

**Confidence:** high that liquor is outside GST; high that AED replaced guest-facing VAT from 1 April 2017; medium-high that no later notification quietly restored a restaurant VAT (none found in 2017–2026 searches). Mark a live “VAT % on the cheque” as **UNVERIFIED / not applicable**.

---

## 4. Tax-inclusive liquor pricing vs tax on the bill; what the bill must show

**Summary:** In Karnataka bars the menu price is what the guest pays; there is no VAT to back out or add. GST law does not require a liquor tax block. Excise law requires the licencee to record sales, not a particular guest-bill format.

**Answer**

**Convention.** Karnataka on-premise liquor is **priced at a selling price the house sets**. Because there is no current guest-facing VAT (Q3), there is nothing to “include” or “add”. Practice in Bengaluru: the drink line on the menu is the amount payable for that drink; GST is not applied to it; no VAT% is added at the foot.

This is **not** the Maharashtra/Delhi pattern, where a state VAT (often 20% or similar) still appears on the liquor block. Do not copy those states.

**What the law requires the bill to show.**

- **GST side.** Liquor is a non-taxable supply. Section 31(3)(c) / rule 49 contemplate a bill of supply for exempt/non-taxable supplies. For a mixed B2C cheque, rule 46A (see Q6) lets the GST tax invoice and the bill-of-supply particulars live on one document. The liquor lines should **not** carry CGST/SGST. Section 15(2)(a) would pull a separately charged non-GST tax into GST value **if** such a tax were charged separately — it is not, in current Karnataka practice.
- **KVAT side (historical).** When 5.5% VAT applied (1 March 2014 – 31 March 2017), KVAT section 29 required a tax invoice showing tax separately. That duty is dormant while no VAT is levied on the sale.
- **Excise side.** CL-9 conditions and the Karnataka Excise (Sale of Indian and Foreign Liquors) Rules 1968 require the licencee to sell only duty-paid liquor of approved brands, keep a daily stock-and-sales register, and not remove liquor from the premises for off-sale. They do **not**, on the materials I could open, prescribe a guest-facing “VAT inclusive / exclusive” legend or a statutory MRP on the peg.

**POS default:** liquor unit price = amount payable; no GST; no VAT line. Optionally print “Alcoholic liquor — not leviable to GST (CGST Act s. 9(1))” on the liquor block so the two regimes are visible. Quantity (ml / peg / bottle) should still print for excise stock reconciliation.

**Period:** from 1 April 2017.

**Rests on:** CGST s. 9(1), s. 31(3)(c), rr. 49, 46A; historical KVAT s. 29; Karnataka Excise (Sale of Indian and Foreign Liquors) Rules 1968, rule 3(9) (CL-9). Guest-bill format under current excise rules: **UNVERIFIED** as a specific statutory template — none found.

**Confidence:** high on convention and on “no GST on liquor”; medium on the exact excise invoice fields, because the sale rules speak to registers more than to the guest cheque.

---

## 5. Service charge — GST value, rate, default add, removal on request

**Summary:** If a service charge is actually collected, it is part of the GST taxable value of the restaurant service and is taxed at the same 5% (or 18%) rate. Consumer-protection law forbids adding it by default and requires it to be dropped on request.

**Answer**

**GST.** Value of supply is the transaction value — section 15(1). It **includes** incidental expenses charged by the supplier and any amount charged for anything done in respect of the supply at the time of or before delivery — section 15(2)(c). A service charge printed on the bill and paid by the guest is consideration for the restaurant supply, not a separate “tip to staff” outside the Act.

Rate: the restaurant rate that applies to the food (5% without ITC, or 18% with ITC at specified premises) — the charge is bundled with the principal supply. Circular No. **178/10/2022-GST dated 3 August 2022** (CBIC) treats ancillary amounts that are naturally bundled with a principal supply (late-payment fee, cancellation/retention charges) as assessable at the principal rate. A service charge sits in the same family, though that circular does not name “service charge” in terms.

It is **not** a separate 18% “other service.” Do not GST it on liquor (liquor is outside GST); if the house insists on a service charge on the liquor subtotal, that slice is **not** a GST supply — treat it as part of the liquor consideration. (Splitting service charge between food and liquor is a configuration choice; GST attaches only to the food-related portion.)

**Allowed to add by default?** **No.** Central Consumer Protection Authority guidelines **F. No. J-25/57/2022-CCPA dated 4 July 2022**:

1. No hotel or restaurant shall add service charge automatically or by default in the bill.
2. It shall not be collected under any other name.
3. The consumer shall be clearly informed that it is voluntary, optional and at the consumer’s discretion; it shall not be forced.
4. No restriction on entry or service for refusing it.
5. “Service charge shall not be collected by adding it along with the food bill and levying GST on the total amount.”

The Delhi High Court **upheld** these guidelines on **28 March 2025** in W.P.(C) 10683/2022 and W.P.(C) 10867/2022. CCPA has since penalised restaurants that still auto-added 10% (orders reported January 2026).

**Must it be removed on request?** **Yes.** The 4 July 2022 guidelines and the accompanying press note tell the guest to ask the restaurant to take it off, then complain to the National Consumer Helpline (1915) if refused.

**Law vs practice.** Many Bengaluru houses still auto-print 5–10%, or have folded it into menu prices after the Delhi HC order (Deccan Herald, 24 September 2025, quoting a Central GST Joint Commissioner that raising MRP is lawful; auto-adding a separate line is not). POS default should be: **off**, or **opt-in with a visible “optional — removable” flag**, never a hard add.

**Period:** GST valuation from 1 July 2017; CCPA guidelines from **4 July 2022**; Delhi HC from **28 March 2025**.

**Rests on:** CGST s. 15(1), 15(2)(c); Circular 178/10/2022-GST dated 3.8.2022 (by analogy on bundling); CCPA guidelines 4.7.2022; Delhi HC 28.3.2025.

**Confidence:** high on consumer-protection rules; high that a collected service charge on food is in GST value at the restaurant rate; medium that Circular 178 is the closest GST circular (it does not use the words “service charge”).

---

## 6. One bill, two tax blocks (GST food + state liquor)

**Summary:** A single B2C print-out with a GST block and a liquor block is acceptable. GST specifically allows an invoice-cum-bill of supply for taxable plus exempt/non-taxable supplies to an unregistered guest. Karnataka commercial tax has no current VAT invoice series to keep separate.

**Answer**

**GST.** Rule **46A**, CGST Rules 2017 (inserted by Notification 45/2017-CT dated 13 October 2017; proviso added by Notification 26/2022-CT dated 26 December 2022): where a registered person supplies **taxable as well as exempted** goods or services to an **unregistered** person, a single **“invoice-cum-bill of supply”** may be issued, containing the particulars of rule 46 (and rule 49).

“Exempt supply” **includes a non-taxable supply** — section 2(47). Alcoholic liquor is a non-taxable supply. Walk-in guests are unregistered. So one document covering food (tax invoice particulars: taxable value, 2.5%+2.5%, tax amounts) and liquor (bill-of-supply particulars: description and value, no GST) is the design the Rules had in mind.

Serial numbers: rule 46(b) and rule 49(b) both allow **one or multiple series**. Using one series for the combined B2C cheque is fine. A separate liquor-only series is not required by GST.

**Karnataka commercial tax / excise.** With no guest-facing VAT, there is no live KVAT invoice-series duty. Excise still wants a daily stock-and-sales register reconcilable to pours; that is a back-office report, not a second guest invoice.

**Practice.** Mixed GST+liquor cheques on one docket are universal in Indian restaurants. I found no CBIC circular or Karnataka CTD circular that forbids it.

**POS default:** one bill, two sections (GST food/softs; liquor outside GST). Do not force a second printer series unless the operator wants it for kitchen/bar routing.

**Period:** rule 46A from 13 October 2017; combined-particulars proviso from 26 December 2022.

**Rests on:** CGST s. 2(47); rr. 46, 46A, 49; Notifications 45/2017-CT and 26/2022-CT.

**Confidence:** high for GST; medium-high for Karnataka (absence of a contrary CTD circular is not the same as an affirmative permission).

---

## 7. HSN / SAC on a B2C restaurant bill under INR 5 crore

**Summary:** For B2C, a restaurant under INR 5 crore **need not** print HSN/SAC at all. If it prints one code, bill-level SAC **9963** (or 996331) is enough; per-item HSN on each dish is not required.

**Answer**

Notification **No. 12/2017-Central Tax dated 28 June 2017**, as substituted by **Notification No. 78/2020-Central Tax dated 15 October 2020**, **w.e.f. 1 April 2021**, issued under the first proviso to rule 46:

| Preceding-FY aggregate turnover | Digits of HSN/SAC |
|---|---|
| Up to INR 5 crore | 4 (B2B) |
| More than INR 5 crore | 6 (B2B and B2C) |

**Proviso:** a registered person with turnover up to INR 5 crore **may not mention** those digits **on a tax invoice issued to an unregistered person**.

This outlet is under INR 5 crore and B2C. **SAC on the bill is optional.** GSTR-1 still uses HSN summaries for B2B and, from the later HSN reporting changes, a 4-digit summary even for smaller taxpayers in the return — that is a return issue, not a printed-bill issue.

**Which code for restaurant service.** Scheme of classification of services, Heading **9963** (Accommodation, food and beverage services). Six-digit **996331**: “Services provided by Restaurants, Cafes and similar eating facilities including takeaway services, Room services and door delivery of food.” Four-digit **9963** satisfies the 4-digit rule if the house chooses to print a code.

Restaurant supply is a **service**. Do not put Chapter 16/19/20 food-goods HSN on dine-in lines.

**Period:** optional B2C HSN for ≤ INR 5 crore from **1 April 2021**.

**Rests on:** rule 46 first proviso; Notification 12/2017-CT dated 28.6.2017 as amended by Notification 78/2020-CT dated 15.10.2020; Annexure to Notification 11/2017-CT (Rate) (classification heading 9963 / 996331).

**Confidence:** high.

**POS default:** no per-item HSN on B2C; optional bill-level SAC 9963 / 996331; keep a 4-digit switch for B2B and for the day turnover crosses INR 5 crore.

---

## 8. Discounts and taxable value

**Summary:** A discount printed on the invoice against the line (or as a bill-level amount recorded on that invoice) reduces GST taxable value. A discount given after the invoice does not, unless section 15(3)(b) is met — and as at 15 September 2026 that still requires a pre-supply agreement, invoice linkage, and recipient ITC reversal, via a section 34 credit note.

**Answer**

**On-bill discount.** Section **15(3)(a)**: value of supply shall not include any discount given **before or at the time of the supply** if it is **duly recorded in the invoice**. Rule 46(k) requires the invoice to show taxable value “taking into account discount or abatement, if any.” Line-level “less 10% happy hour” or a bill-level “management discount” that is printed **on that same invoice** comes off the GST base. Tax is computed on the net.

**After the invoice.** Section **15(3)(b)** as **currently in force** (CBIC statute pages as at this date): the discount is excluded only if —

1. it was established in an agreement entered into **at or before** the time of supply and is **specifically linked** to the relevant invoices; **and**
2. the recipient has **reversed** the ITC attributable to the discount.

The machinery for reducing output tax is a **credit note under section 34**. Circular **92/11/2019-GST dated 7 March 2019**: a purely commercial/financial credit note that fails 15(3)(b) does **not** reduce taxable value or output tax.

For B2C restaurant guests there is almost never recipient ITC, so limb (ii) is empty in substance — but limb (i) (pre-agreed, invoice-linked) still has to be true if the house wants a GST credit note rather than a goodwill write-off.

**Finance Act 2026 (enacted, not yet notified for this clause).** Sections 153–155 of the Finance Act, 2026 (assent 30 March 2026) will substitute section 15(3)(b) so that a post-supply discount is excluded if a section 34 credit note is issued and the recipient reverses attributable ITC — dropping the pre-agreement and invoice-link conditions — and will add that discount as an express ground in section 34(1). **Section 1(2) of that Act leaves ss. 153–155 to a commencement notification.** Commentary as late as 6 September 2026 records **no notification**. **Do not configure the POS on the amended text until that notification is issued.**

**Period:** s. 15(3) from 1 July 2017; Circular 92/11/2019 from 7 March 2019; FA 2026 amendment **not in force** as at 15 September 2026.

**Rests on:** CGST s. 15(3)(a)–(b), s. 34; rule 46(k); Circular 92/11/2019-GST dated 7.3.2019; Finance Act 2026 ss. 153–155 (enacted, unnotified).

**Confidence:** high on on-bill discounts; high that the FA 2026 change is not yet live; medium on how a B2C restaurant should evidence a “pre-supply agreement” for a post-meal gesture (in practice they issue a same-day credit note or void — see Q10).

---

## 9. B2C tax invoice: mandatory fields, numbering, rounding

**Summary:** Rule 46 lists the fields; for a walk-in under INR 50,000, name and address are not mandatory unless the guest asks. Invoice numbers must be consecutive, unique for the financial year, max 16 characters, only letters/digits/`-`/`/`. Tax (not the whole cheque) is rounded to the nearest rupee under section 170.

**Answer**

**Mandatory fields on a printed B2C restaurant tax invoice** — rule 46, CGST Rules 2017 (and KGST Rules, in pari materia):

| Clause | Field | B2C dine-in under INR 50,000 |
|---|---|---|
| (a) | Name, address, GSTIN of supplier | Yes |
| (b) | Consecutive serial number (see numbering) | Yes |
| (c) | Date of issue | Yes |
| (d) | Recipient GSTIN | Only if registered |
| (e) | Name, address, State and State code of unregistered recipient | **Only if taxable value ≥ INR 50,000** |
| (f) | Same details | If value < INR 50,000 **and the recipient requests** |
| (g) | HSN/SAC | Optional for this taxpayer on B2C (Q7) |
| (h) | Description | Yes |
| (i) | Quantity and unit (goods) | For goods; for restaurant service, quantity of dishes/pegs is good practice |
| (j) | Total value | Yes |
| (k) | Taxable value after discount | Yes |
| (l) | Rate of tax (CGST, SGST) | Yes |
| (m) | Tax amount, by head | Yes |
| (n) | Place of supply / State | Inter-State only |
| (p) | Reverse charge | If applicable (almost never on this bill) |
| (q) | Signature or digital signature | Yes, subject to the electronic-invoice relaxation |
| (r) | QR with IRN | Only if e-invoiced under rule 48(4) — **not** this taxpayer (e-invoice threshold is far above INR 5 crore) |

Dynamic QR for B2C (Notification 14/2020-CT dated 21 March 2020) applies only where aggregate turnover exceeds **INR 500 crore**. Not this outlet.

Section 31(3)(b): for B2C supplies under **INR 200**, a tax invoice need not be issued if a **consolidated** tax invoice is issued at the close of the day. Restaurants almost always print a bill anyway.

**Invoice numbering — rule 46(b):**

- Consecutive.
- Not exceeding **sixteen characters**.
- Alphabets, numerals, hyphen `-`, slash `/`, or any combination.
- **Unique for a financial year.**
- **One or multiple series** allowed (e.g. a food series and a bar series, or one combined series).
- The rule does **not** require restarting at 1 each FY. Restarting is permitted if the new numbers remain unique for that FY (typical pattern: `2526/0001`). Continuing last year’s counter is also permitted if uniqueness is kept.

Gaps in a series are a GSTR-1 reporting headache (invoice-number table); they are not independently a rule 46 offence if the numbers that were issued are consecutive and unique.

**Rounding.** Section **170**, CGST Act (and KGST s. 170): tax, interest, penalty, fine, refund or any other **sum payable or due under the Act** shall be rounded to the **nearest rupee** (50 paise and above up; below 50 paise ignored). Apply this **per tax head** (CGST, KGST), not by silently rounding the guest’s grand total and misstating tax.

Rounding the **payable total** (food GST + liquor + optional service charge) to the nearest rupee is **not** authorised by section 170. It is a commercial rounding. If used, keep it as a separate “round off” line that does not alter the tax amounts reported in GSTR-1/3B. Legal Metrology package rules do not govern a restaurant service bill.

**Period:** rule 46 from 1 July 2017 (16-character cap via later amendment, in force well before 2026); s. 170 from 1 July 2017.

**Rests on:** CGST s. 31, s. 170; rr. 46, 48; Notification 12/2017-CT; Notification 14/2020-CT (QR, not applicable).

**Confidence:** high on fields and numbering; high on rounding tax; medium on rounding the grand total (common, not statute-backed).

---

## 10. Credit notes — when, what they must reference, deadline

**Summary:** Once a tax invoice has been issued, you do not “delete” it; you issue a section 34 credit note if value or tax was excessive, goods/services were deficient, or (in restaurant terms) the guest walked, a dish was returned, or a rate was wrong. The credit note must cite the original invoice number and date. Output-tax reduction must be reported by 30 November after the FY of the **original supply**, or by the annual-return date, whichever is earlier.

**Answer**

**When a credit note is required instead of cancelling.** Section 34(1): where one or more tax invoices have been issued and the taxable value or tax charged **exceeds** what is payable, or goods are returned, or goods or services are **deficient**, the supplier **may** issue one or more credit notes for supplies of that financial year.

There is no GST concept of “void this invoice so it never existed” after issue. Practice in restaurants — same-day “bill cancelled / settlement void” **before** the invoice is reported in GSTR-1 — is a **systems** convenience. If the number has been issued, the safer legal path is:

- same tax period, invoice not yet reported: still issue a credit note (or, if the POS never allocated a number that went to the guest, do not issue the invoice);
- after reporting: credit note is mandatory if tax is to come down.

**Must reference.** Rule **53(1A)** (inserted w.e.f. 1 February 2019 by Notification 3/2019-CT dated 29 January 2019): a credit note shall contain, among other things:

- nature of the document (“credit note”);
- consecutive serial number, max 16 characters, unique for the FY (same character set as invoices);
- date;
- supplier GSTIN and identity;
- recipient details (for unregistered: name and address if available);
- **serial number(s) and date(s) of the corresponding tax invoice(s) or bill(s) of supply**;
- taxable value, rate, and tax credited.

**Deadline.** Section **34(2)** (as amended by the Finance Act 2022, in force via Notification 18/2022-CT dated 28 September 2022): declare the credit note in the return for the month of issue, **but not later than the 30th day of November following the end of the financial year in which the supply was made**, or the date of furnishing the annual return, **whichever is earlier**. After that, a commercial refund to the guest does not reduce GST.

Proviso to section 34(2): no reduction of output tax if the incidence of tax has been passed on to another person. For B2C that is usually the guest; if you refund the guest the tax as well, the proviso is met in substance.

Finance Act 2025 inserted a further ITC-reversal condition on the recipient’s side for credit-note relief in B2B. It does not change a typical walk-in restaurant credit note.

**POS default:** credit-note document type, own series, mandatory original invoice number + date, reason code (return / deficiency / value excess / discount). Do not reuse or delete invoice numbers.

**Period:** s. 34 from 1 July 2017; 30 November deadline from the Finance Act 2022 amendment (Notification 18/2022-CT); rule 53(1A) from 1 February 2019.

**Rests on:** CGST s. 34(1)–(2); rule 53(1A); Notification 3/2019-CT dated 29.1.2019; Notification 18/2022-CT dated 28.9.2022.

**Confidence:** high.

---

## Suggested POS configuration defaults (this outlet)

| Parameter | Default | Notes |
|---|---|---|
| GST scheme | Regular, not composition | Bar licence |
| Food / non-alcoholic restaurant service | 5% (2.5+2.5), ITC off | Notification 11/2017 Sl. 7(ii) |
| Hotel 18% flag | Off | Not specified premises |
| SAC | 996331 (optional on B2C print) | Print optional under INR 5 crore |
| Liquor GST | 0% / non-GST | s. 9(1) |
| Liquor VAT % | 0 | No current Karnataka guest-facing VAT |
| Liquor price | Tax-inclusive selling price = menu | No VAT to add or back out |
| Service charge | Off; optional; removable | CCPA 4.7.2022 |
| Service charge GST | Same as food rate, on food portion only | s. 15(2)(c) |
| Invoice form | Invoice-cum-bill of supply, two blocks | Rule 46A |
| Invoice number | `YYFY/########`, max 16 chars, consecutive | Rule 46(b) |
| HSN per item (B2C) | Off | Notification 78/2020 proviso |
| On-bill discount | Reduces GST base | s. 15(3)(a) |
| Post-bill discount | Credit note; do not auto-reduce GST | s. 15(3)(b) still as pre-FA 2026 |
| Round tax | Nearest rupee per tax head | s. 170 |
| Round grand total | Optional separate line, do not touch tax | Not in s. 170 |
| Credit notes | Own series; must cite original invoice | s. 34; r. 53(1A) |

---

## Sources used (primary or official reprints)

- CGST Act 2017 ss. 2(47), 9, 10, 15, 31, 34, 170; Schedule II para 6(b) — taxinformation.cbic.gov.in
- KGST Act 2017 s. 9 (Karnataka Act 27 of 2017, as amended)
- CGST Rules 2017 rr. 5, 7, 46, 46A, 49, 53
- Notification 11/2017-CT (Rate) dated 28.6.2017, as amended, including by 20/2019-CT (Rate) dated 30.9.2019 and 05/2025-CT (Rate) dated 16.1.2025
- Notification 12/2017-CT dated 28.6.2017 as amended by 78/2020-CT dated 15.10.2020
- Notification 14/2019-CT dated 7.3.2019
- Notification 45/2017-CT dated 13.10.2017; 26/2022-CT dated 26.12.2022 (rule 46A)
- Circular 92/11/2019-GST dated 7.3.2019; Circular 178/10/2022-GST dated 3.8.2022
- CBIC / Karnataka CTD FAQ on restaurant service at specified premises (post-1.4.2025)
- Karnataka Budget 2017–18, para 491 (VAT on liquor removed w.e.f. 1.4.2017)
- Karnataka Excise (Excise Duties and Fees) (2nd Amendment) Rules, 2026, FD 14 PES 2026 dated 8.5.2026, w.e.f. 11.5.2026
- State Excise Duty Structure of Karnataka 2025–26 (AED in lieu of sales tax)
- CCPA guidelines F. No. J-25/57/2022-CCPA dated 4.7.2022; Delhi HC 28.3.2025, W.P.(C) 10683/2022
- Finance Act 2026 ss. 153–155 (enacted; GST discount clauses awaiting notification)

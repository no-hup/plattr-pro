# POS tax defaults — Bengaluru dine-in restaurant with bar (as at 15 September 2026)

Config defaults only. Nothing here is intended as hard-coded law. A restaurant that also sells liquor is almost always on the regular GST scheme; composition is legally closed to it.

---

## 1. Composition vs regular GST — what may appear on the bill

**Summary:** A bar-restaurant cannot be on composition; if it were, the document would be a bill of supply with no GST collected and the statutory legend at the top.

**Answer.** Two schemes exist.

- **Regular scheme (the correct default for this outlet).** Tax invoices under section 31 of the CGST Act, 2017, with CGST + KGST shown separately on food and non-alcoholic drink. Liquor is not GST. Input tax credit is blocked on restaurant service at 5% (see Q2). Turnover under INR 5 crore is irrelevant to scheme choice here; alcohol is.

- **Composition (section 10(1) read with Rule 7).** Available only to a person whose preceding-year aggregate turnover is not more than INR 1.5 crore in Karnataka (Notification 14/2019-Central Tax, in force from 1 April 2019), who supplies restaurant service as in paragraph 6(b) of Schedule II (food or drink **other than alcoholic liquor**), and who is not engaged in supply of goods not leviable to GST. Rate is 5% of turnover in the State (2.5% CGST + 2.5% KGST), paid from the dealer’s pocket. No ITC.

This outlet holds a bar licence and sells liquor. Alcoholic liquor for human consumption is outside GST (Article 366(12A); section 9(1) of the CGST Act). Section 10(2)(b) bars composition if the person supplies goods not leviable to tax under the Act. Composition is also closed if the restaurant supplies through an e-commerce operator who is required to pay tax under section 9(5) (Swiggy/Zomato). **Default: regular scheme. Do not offer composition as a live mode while liquor is on the menu.**

If composition were nevertheless configured (food-only outlet, no alcohol, no ECO):

| May appear | Must not appear |
|---|---|
| Bill of supply (not a tax invoice) — section 31(3)(c), Rule 49 | Any CGST/SGST/IGST rate or amount |
| Description, qty, value, total payable | “GST”, “tax invoice”, or a tax column |
| The legend below, at the top | Collection of GST from the guest — section 10(4), section 32 |

**Mandatory wording** (Rule 5(1)(g) of the CGST Rules, 2017, in force since 1 July 2017):

> Composition taxable person, not eligible to collect tax on supplies

The same person must also display “composition taxable person” on a notice or signboard at the principal (and every additional) place of business — Rule 5(1)(h).

**Law vs practice.** Some small food-only kitchens still print a “GST 5%” line on composition bills. That is unauthorised collection. Do not copy it.

**Period.** Section 10 / Rules 5, 7, 49 and Notification 14/2019-CT as in force on 15 September 2026. Restaurant composition rate of 5% has applied since 1 July 2017.

**Rests on.** CGST Act ss. 9(1), 10(1), 10(2)(b), 10(4), 31(3)(c), 32; Schedule II para 6(b); CGST Rules 5(1)(g)–(h), 7, 49; Notification 14/2019-Central Tax (1 April 2019).

**Confidence.** High on the bar-licence ineligibility and on the legend. High on the 5% composition rate and the bill-of-supply rule.

---

## 2. GST rate on restaurant food and drink — standalone vs hotel

**Summary:** A standalone Bengaluru restaurant is 5% GST with no ITC; 18% with ITC applies only at a “specified premises” hotel, decided by last year’s room value (or an opt-in declaration), not by the food bill.

**Answer.** Restaurant service is a supply of service (Schedule II, para 6(b)). Alcoholic liquor is carved out of that paragraph and is not GST.

From **1 April 2025** (Notification 05/2025-Central Tax (Rate) dated 16 January 2025, amending Notification 11/2017-CTR; CBIC FAQ on restaurant service at specified premises):

| Place | Rate | ITC |
|---|---|---|
| Standalone restaurant, QSR, cloud kitchen, takeaway, dine-in — **this outlet** | **5%** (2.5% CGST + 2.5% KGST) | **Not available** |
| Restaurant / room service / outdoor catering **other than at specified premises** (including a hotel whose rooms never crossed the threshold and which has not opted in) | 5% | Not available |
| Restaurant / room service / outdoor catering **at specified premises** | **18%** (9% + 9%) | **Available** (subject to the usual blocked-credit rules) |

**What decides the split.** “Specified premises” for a financial year means:

1. a premises from which, in the **preceding** financial year, hotel accommodation was supplied at a **transaction value** of more than **INR 7,500 per unit per day** (or equivalent); or
2. a premises that the registered hotel has **declared** as specified (Annexure VII, 1 January–31 March of the preceding year; new registrants, Annexure VIII within 15 days of acknowledgement); or
3. the corresponding new-registrant declaration.

“Declared tariff” was omitted from 1 April 2025. One room sold above INR 7,500 in FY 2025-26 makes the premises specified for FY 2026-27. A hotel below the threshold may still opt in to 18% with ITC. There is also an opt-out path (Annexure IX) for a premises that would otherwise be specified.

The test is **premises status for the year**, not the amount of the food bill, not air-conditioning, and not whether the restaurant has a liquor licence. Those last two tests died in November 2017.

**This POS.** Single-outlet dine-in restaurant, not a hotel. Default **5% without ITC**. Keep 18% as a configurable alternate for a future specified-premises site.

**September 2025 hotel-room change (do not mix this with restaurant).** From 22 September 2025 (56th GST Council; Notification 15/2025-CTR dated 17 September 2025) hotel **accommodation** is 5% without ITC up to INR 7,500 per unit per day and 18% with ITC above that. The 12% room slab is gone. That does not change the restaurant entries above.

**Law vs practice.** Some hotel restaurants still bill 5% after they have become specified because one festive-season room crossed INR 7,500. That is a short-payment. Bombay HC granted an interim stay in a challenge to the 18% hotel-restaurant rate (October 2025); it is not a Karnataka default and is not a reason to hard-code 5% inside a specified hotel.

**Period.** Restaurant 5% / 18% split as above from 1 April 2025. Standalone 5% without ITC has been the general rate since 15 November 2017.

**Rests on.** Notification 11/2017-Central Tax (Rate) entries 7(ii) (5%, no ITC) and 7(vi) (18%, with ITC), as amended by Notification 05/2025-CTR; CBIC FAQ on restaurant service at specified premises; Notification 15/2025-CTR (rooms, 22 September 2025).

**Confidence.** High for a standalone restaurant. High on the specified-premises test from 1 April 2025.

---

## 3. Karnataka tax on liquor sold in a bar or restaurant

**Summary:** Liquor is outside GST; Karnataka abolished VAT on liquor from 1 April 2017, so the bar does not add a state VAT line — the live tax is excise / additional excise collected upstream, last recast on 11 May 2026 on an alcohol-in-beverage basis.

**Answer.** Alcoholic liquor for human consumption is constitutionally outside GST. The State taxes it.

**Which law.**

- **Karnataka Excise Act, 1965** and the **Karnataka Excise (Excise Duties and Fees) Rules, 1968** — basic excise duty and **additional excise duty (AED)** (AED historically absorbed the old sales tax). Stock moves through **Karnataka State Beverages Corporation Limited (KSBCL)**. On-premise sale is under a CL-series licence (typically CL-9 refreshment-room/bar, or CL-7 hotel and boarding house), not a GST levy.
- **Karnataka Value Added Tax Act, 2003** — this is the sales-tax statute that *would* tax a bar sale to a guest. It no longer does.

**Rate on the sale by the bar to the guest.** **Nil VAT.** There is no current Karnataka VAT percentage to print on a guest bill for liquor, beer, fenny, liqueur or wine.

History of the VAT leg (so the last change is not confused with excise):

| From | To | VAT on bar/restaurant liquor |
|---|---|---|
| 1 April 2005 – 28 February 2014 | Exempt (First Schedule) | |
| 1 March 2014 | 5.5% on specified urban bar/restaurant/club/star-hotel licence holders (Entry 59-A, Third Schedule; notification 28 February 2014). CL-2 MRP shops remained exempt because AED had already been collected on MRP. | |
| **1 April 2017** | **Exempt again.** Karnataka Act 15 of 2017 re-inserted Entry 34 (“Liquor including beer, fenny, liqueur and wine”) in the First Schedule and omitted Entry 59-A. Budget 2017-18. | |

I have not found a later KVAT amendment that re-taxes bar liquor. As at 15 September 2026 the First Schedule exemption still appears to be the law. **Default POS VAT rate on liquor: 0%.** Keep the rate configurable in case the State reintroduces a levy.

**What did change in 2026 — not a POS VAT rate.** From **11 May 2026**, Karnataka Excise (Excise Duties and Fees) (2nd Amendment) Rules, 2026 (notification FD 14 PES 2026 dated 8 May 2026) moved excise onto **alcohol-in-beverage (AIB)**: duty linked to litres of pure alcohol (illustratively INR 1,000 per litre of pure alcohol for the core rate) plus slab-wise AED, with IMFL slabs cut from 16 to 8 and government MRP fixation deregulated. That reprices what the bar **pays KSBCL**, and therefore what it can commercially charge. It is not a tax the POS adds at the table.

**Law vs practice.** Trade write-ups still say “bars charge state VAT”. That is true in several other States (Maharashtra, Delhi, etc.). It is **not** true in Karnataka after 1 April 2017. Bengaluru bills that still print “VAT 5.5%” or “VAT 20%” on liquor are either stale templates or copying another State.

**Period.** KVAT exemption from 1 April 2017 to date. AIB excise from 11 May 2026.

**Rests on.** Constitution Art. 366(12A); CGST Act s. 9(1) proviso; KGST Act s. 9(1); Karnataka Act 15 of 2017; KVAT First Schedule Entry 34; Karnataka Excise Act 1965; Karnataka Excise (Excise Duties and Fees) (2nd Amendment) Rules, 2026 w.e.f. 11 May 2026.

**Confidence.** High that liquor is outside GST. High that KVAT on bar liquor was withdrawn from 1 April 2017. Medium-high that no VAT has been reimposed through 15 September 2026 (no later re-levy found; confirm against the live First Schedule before go-live). High that 11 May 2026 recast **excise**, not restaurant VAT.

---

## 4. Liquor priced tax-inclusive or tax-added? What the bill must show

**Summary:** In Karnataka the menu price is what the guest pays; there is no VAT to back out or add, unlike MRP liquor shops, and the bill should show liquor as a non-GST line with rate and tax blank or “NA”.

**Answer.**

**Convention in Karnataka bars.** **Tax-inclusive commercial price.** The bar is not bound by MRP (MRP binds CL-2 retail shops). The menu / peg rate is a markup on KSBCL landing cost. Because there is no POS VAT (Q3), there is nothing to “back out” and nothing to add at the foot of the liquor block. Guests in Bengaluru do not see a VAT column on pegs. That is both law and practice.

**Do not copy Maharashtra/Delhi logic** (VAT 20% or similar added, or MRP treated as VAT-inclusive). Those States still levy VAT on on-premise liquor. Karnataka does not.

**What the law requires the bill to show.**

- **GST side.** Liquor is not a GST supply. Do not put CGST/SGST on it. A registered person supplying non-GST / non-taxable goods is not issuing a GST tax invoice for those lines. If the same paper also covers food, segregate (Q6).
- **KVAT side.** Section 29 of the KVAT Act requires a tax invoice (tax shown separately) only for a **taxable** sale. Liquor is First Schedule exempt. A “bill of sale” under section 29(3) is the KVAT document for non-taxable goods, if a KVAT document is issued at all. There is no current obligation to print a VAT rate on liquor.
- **Excise side.** The licence conditions and the Karnataka Excise (Sale of Indian and Foreign Liquors) Rules, 1968 require stock accounts, brand/pack identity and permitted on-premise sale. They do not prescribe a VAT-style tax column on the guest bill. Pegs and opened bottles must still be reconcilable to the daily stock register.

**Suggested default print for a liquor line:** description (brand, measure), quantity, unit price, line value; tax-name “Karnataka liquor (outside GST)”; rate “—”; tax amount “0.00” or omitted. Do not invent an AED/VAT percentage at the table.

**Period.** Inclusive menu pricing as the commercial norm throughout; VAT-off from 1 April 2017; AIB excise from 11 May 2026 does not change the bill layout.

**Rests on.** KVAT Act ss. 3, 9, 29 and First Schedule Entry 34; Karnataka Excise Act and IMFL sale rules; contrast with States that still schedule liquor to VAT.

**Confidence.** High on Karnataka practice (inclusive, no VAT add-on). High on the absence of a statutory POS VAT. Medium on the exact excise-rule wording for guest-bill particulars (stock books are the enforcement focus, not bill format).

---

## 5. Service charge — GST value, rate, default levy, removal on request

**Summary:** If collected, service charge is in the GST taxable value at the restaurant rate (5% here); it must not be added by default and must come off if the guest refuses.

**Answer.**

**GST.** Any amount the restaurant actually collects is part of the **transaction value** under section 15(1) and 15(2)(a) / (c) of the CGST Act (amounts charged by the supplier; incidental expenses). CBIC’s published FAQ: service charge is consideration for a supply and is **leviable to GST**. It is not a statutory levy. Rate: the **same rate as the restaurant service** to which it attaches — **5% without ITC** in this outlet (18% if the site were specified premises). Do not apply a different SAC or a “tip” exemption. If the charge sits only on food, tax it as restaurant service. If the house also loads it on liquor, the liquor portion is outside GST (do not put GST on that slice).

**Consumer law — default add and refusal.** The Central Consumer Protection Authority **Guidelines to prevent unfair trade practices … levy of service charge in hotels and restaurants dated 4 July 2022** (section 18(2)(l) of the Consumer Protection Act, 2019), upheld by the Delhi High Court on **28 March 2025** in *National Restaurant Association of India v. Union of India* (2025 SCC OnLine Del 1975; stay of July 2022 vacated):

1. Do not add service charge automatically or by default.
2. Do not collect it under another name.
3. Tell the guest it is **voluntary, optional, and at the guest’s discretion**.
4. Do not restrict entry or service for refusal.
5. The guest may ask for it to be **removed**; the house must remove it.
6. The guidelines also say service charge “shall not be collected by adding it along with the food bill and levying GST on the total.”

**Law vs practice (the real tension).** GST law taxes what is collected. CCPA guidelines forbid a default add and discourage GST-on-service-charge as a billing pattern because it makes a voluntary tip look like a tax. **POS default: service charge off.** If the guest agrees, add it as a separate line, labelled “Service charge (optional — not a tax)”, compute GST only on the restaurant (food/soft-drink) portion of that line at 5%, and provide a one-tap remove. Do not pre-tick 10%.

**Period.** GST treatment since 1 July 2017. CCPA guidelines 4 July 2022. Delhi HC confirmation 28 March 2025 (still the leading reported decision as at 15 September 2026).

**Rests on.** CGST Act s. 15; CBIC FAQ on service charge; CCPA guidelines 4 July 2022; Delhi HC 28 March 2025 in NRAI / FHRAI.

**Confidence.** High on GST inclusion if collected, and on the 5% rate for this outlet. High on “not by default” and “remove on request”. Medium on how strictly inspectors read the CCPA “do not levy GST on it” sentence against section 15 — bill it as optional, tax it only if paid.

---

## 6. One bill, two tax blocks (GST food + state liquor)

**Summary:** A single printed guest bill with a GST food block and a non-GST liquor block is acceptable and is how Karnataka bars work; keep two internal document series if you want a conservative books trail, but a separate physical liquor invoice is not required.

**Answer.**

**GST.** Section 31 requires a tax invoice for the **taxable** supply (restaurant service). Liquor is not that supply. The Act does not forbid one piece of paper that also lists a non-GST item, provided the GST particulars in Rule 46 are complete for the taxable part and liquor is not swept into CGST/SGST. Circular 167/23/2021-GST told **e-commerce operators** it is “advisable” to raise a separate bill when restaurant service and other items sit in one order — that is ECO section 9(5) hygiene, not a restaurant dine-in mandate.

**Karnataka commercial tax / excise.** KVAT no longer taxes the liquor line (Q3), so there is no KVAT tax-invoice duty to isolate. Excise enforcement is on the **daily stock-and-sales register** and permit-wise purchases from KSBCL, not on whether food and liquor share a thermal slip.

**Practice.** Bengaluru bar-restaurants print **one bill**: food/softs with 5% GST, liquor with no GST, grand total. That is the convention. I have not found a Karnataka commercial-tax or excise circular that requires a separate liquor invoice series for dine-in.

**Conservative books (recommended default, not a legal must).**

- One **guest-facing** printout, two clearly headed blocks: “Restaurant service (GST)” and “Liquor (outside GST / KVAT exempt)”.
- Internally, two number series are allowed (Rule 46(b) permits **one or multiple series**): e.g. `F/2526/0001` for the GST tax invoice and `L/2526/0001` for the liquor bill of sale. Print both numbers on the same slip if you split the series, or print one guest-bill number and store the split in the ledger. Either is defensible.
- Do **not** put liquor value in GSTR-1 as taxable restaurant supply. Report restaurant B2C in the relevant table; liquor is outside the GST return (it may still matter for aggregate-turnover and income-tax).

**Period.** This has been the workable position since GST (1 July 2017) and since KVAT-off (1 April 2017).

**Rests on.** CGST Act ss. 9, 31; Rule 46(b); Circular 167/23/2021-GST (ECO analogy only); KVAT s. 29; Karnataka excise stock-register practice.

**Confidence.** High that a combined guest bill is accepted in Karnataka practice. Medium-high that neither GST nor Karnataka CT has issued a “must split physically” instruction for dine-in. Low that a future audit note could still prefer two series — hence keep series configurable.

---

## 7. HSN / SAC on a B2C restaurant bill under INR 5 crore

**Summary:** On a B2C bill, HSN/SAC is optional below INR 5 crore; a bill-level SAC 996331 is enough if you print a code at all — do not force a code on every line.

**Answer.**

**Invoice.** Notification 12/2017-Central Tax dated 28 June 2017, as substituted by **Notification 78/2020-Central Tax dated 15 October 2020 (w.e.f. 1 April 2021)**:

- Preceding-year AATO **up to INR 5 crore:** 4-digit HSN/SAC on the tax invoice.
- **Proviso:** that person **may not mention** HSN/SAC on invoices to **unregistered persons (B2C)**.
- Above INR 5 crore: 6 digits on all invoices, B2B and B2C.

GSTN’s May 2025 advisory on Table 12 of GSTR-1/1A repeats this: B2C HSN summary is **not mandatory** for AATO ≤ INR 5 crore.

**This outlet.** Walk-in B2C, turnover under INR 5 crore. **Default: do not print SAC on each item.** Optional: print once at bill level.

**Which code.** Restaurant service sits in heading **9963** (accommodation, food and beverage services). The working SAC is **996331** — services provided by restaurants, cafés and similar eating facilities including takeaway, room service and door delivery of food (explanatory notes; Circular 164/20/2021-GST on cloud kitchens). Outdoor catering is 996337 / 996334 territory — not this dine-in. Do not put HSN of the raw dish (e.g. 2106) on a restaurant supply; the supply is the service.

**Returns.** Even if the B2C invoice is silent, many practitioners still fill Table 12 B2C with 9963 / 996331 for cleanliness. That is optional at this turnover.

**Period.** Optional B2C HSN from 1 April 2021 (Notification 78/2020). SAC 996331 has been the classification since the 2017 scheme of classification of services.

**Rests on.** First proviso to Rule 46; Notification 12/2017-CT as amended by 78/2020-CT; GSTN advisory 1 May 2025; Notification 11/2017-CTR heading 9963; Circular 164/20/2021-GST.

**Confidence.** High.

---

## 8. Discounts and taxable value

**Summary:** A discount printed on the invoice reduces GST value under section 15(3)(a); a discount after the invoice needs a credit note, and until the Finance Act 2026 amendment is notified the old pre-agreed-and-linked test still applies.

**Answer.**

**Discount on the face of the bill (line or bill-level, before/at supply).** Excluded from value if it is given **before or at the time of supply** and **recorded in the invoice**. Section 15(3)(a), CGST Act. GST is computed on the net (Rule 46(k) — taxable value after discount or abatement). A “happy hour 20% off” line, a complimentary starter shown as a discount, or a bill-level coupon all qualify if they are on that invoice. **Default: yes, reduce taxable value.**

Do not discount only the tax; discount the base, then tax the net. Do not treat a discount on liquor as a GST adjustment.

**Discount after the invoice is issued.**

- **Law in force on 15 September 2026.** Section 15(3)(b) still requires (i) the discount to be established in an agreement **at or before** the time of supply and **specifically linked** to the invoices, and (ii) the recipient, if registered, to reverse attributable ITC. Circular 92/11/2019-GST: if those conditions fail, you may still issue a **commercial / financial credit note**, but **output GST is not reduced**. For walk-in B2C there is no ITC to reverse, so the practical GST-reducing path is a **section 34 credit note** that actually reduces value/tax, used for returns, wrong rate, or a discount that was already a published scheme (happy-hour board, loyalty rules) at the time of supply.
- **Finance Act, 2026 (Act 4 of 2026, assent 30 March 2026), ss. 153–155.** Rewrites section 15(3)(b) so that a post-supply discount is excluded if a **credit note is issued** and attributable ITC is reversed under section 34; also inserts that discount as an express ground in section 34(1). **Commencement is by separate notification.** As at 15 September 2026 I have not seen that notification; several professional notes in July–August 2026 still treat it as uncommenced. **Do not configure the POS as if the new test is live until a Central Tax commencement notification is cited.**

**Restaurant floor.** A manager “knocking off” INR 200 after the bill is printed is a post-supply discount. Reduce GST only via a credit note (Q10), and only if you are willing to stand on section 15(3)(b) as then in force — for B2C a same-day credit note against a published scheme is the clean path.

**Period.** Section 15(3)(a) since 1 July 2017. Section 15(3)(b) old test still operative pending commencement of FA 2026 ss. 153–155.

**Rests on.** CGST Act s. 15(3); Rule 46(k); Circular 92/11/2019-GST; Finance Act 2026 ss. 153–155 (uncommenced as far as checked).

**Confidence.** High on on-invoice discounts. High that the FA 2026 rewrite exists. Medium on the exact commencement status on 15 September 2026 — treat as **not in force** until a notification number is in hand.

---

## 9. B2C tax invoice: fields, numbering, rounding

**Summary:** Print the Rule 46 fields that apply to an unregistered diner; number consecutively, unique in the financial year, max 16 characters (`A–Z`, `0–9`, `-`, `/` only); round **tax** to the nearest rupee under section 170 — rounding the grand total is practice, not a GST mandate.

**Answer.**

**Mandatory fields on the printed B2C bill** (Rule 46, CGST Rules — tax invoice under section 31). For a walk-in diner under INR 50,000, name and address of the guest are **not** required unless the guest asks (Rule 46(e)–(f)). Dynamic QR (Notification 14/2020-CT) applies only if AATO has exceeded **INR 500 crore** — not this outlet. E-invoicing (IRN) is B2B and, in any case, the current threshold is AATO above INR 5 crore.

| Field | B2C dine-in, bill typically well under INR 50,000 |
|---|---|
| Supplier name, address, GSTIN | Yes |
| Consecutive serial number (see below) | Yes |
| Date of issue | Yes |
| Recipient GSTIN | No (unregistered) |
| Recipient name, address, State and code | Only if value ≥ INR 50,000, or if the guest requests |
| HSN/SAC | Optional (Q7) |
| Description of services / items | Yes |
| Quantity / unit | Yes where it is goods-like (pegs, covers); for a service line, description suffices |
| Total value | Yes |
| Taxable value after discount | Yes |
| Rate of tax (CGST, KGST) | Yes, on the GST block |
| Tax amount, by levy | Yes, on the GST block |
| Place of supply / State name | Intra-State Karnataka; still good practice to print “Place of supply: Karnataka” |
| Reverse charge (Yes/No) | Yes — print **No** |
| Signature / digital signature | Rule 46(q). For invoices issued by an electronic-tax-register / computer, a later proviso dispenses with physical signature if the invoice is electronically generated — most POS printers rely on that. Keep a signed/authorised digital trail. |

Also print the liquor block as non-GST (Q4, Q6). Section 31(2) / Rule 47: invoice for services within **30 days** of supply — in a restaurant that means **before the guest leaves**.

**Numbering (Rule 46(b)).**

- Consecutive serial number.
- Unique for a **financial year** (1 April–31 March).
- Not more than **16 characters**.
- Only letters, digits, hyphen `-`, slash `/`. No space, `#`, `@`.
- **One or multiple series** (food vs liquor, dine-in vs takeaway) are expressly allowed.
- Restarting at 1 each FY is **not** mandated if uniqueness is kept; if you restart at 1, put the FY in the prefix (`F2526-0001`) so 0001 is not reused naked across years.
- Gaps from deleted numbers attract questions. Prefer credit notes over silent deletes (Q10).

**Rounding.**

- **Section 170, CGST Act:** tax, interest, penalty, fine, refund — round to the **nearest rupee** (50 paise up, below 50 ignored). Apply per tax head (CGST and KGST separately) on the invoice, which is how GSTR-3B is paid.
- **Grand total of the bill** (food + liquor + optional service charge + rounding of paise on the commercial total) is **not** a section 170 subject. Indian restaurants commonly round the payable total to the nearest rupee as a house rule. That is permitted as a commercial adjustment if you post the few paise to a rounding account and do not bury tax in it. Legal Metrology MRP rounding is a different statute and does not govern a restaurant service bill.

**Period.** Rule 46 from 1 July 2017 (16-character cap from the original rule). Section 170 from 1 July 2017. B2C HSN option from 1 April 2021.

**Rests on.** CGST Act ss. 31, 170; CGST Rules 46, 47; Notifications 12/2017-CT, 78/2020-CT, 14/2020-CT.

**Confidence.** High on fields and numbering. High that section 170 rounds **tax**, not the commercial grand total. Medium on whether a given officer expects CGST and SGST each rounded vs total tax rounded — round each head.

---

## 10. Credit notes — when, what they reference, deadline

**Summary:** Once a tax invoice is issued, do not cancel it — issue a section 34 credit note that cites the original number and date; declare it by 30 November after the FY of supply (or the date of the annual return, if earlier).

**Answer.**

**When a credit note is required instead of “cancelling” the bill.** GST has no legal “invoice cancellation” after issue. Section 34(1): if taxable value or tax **charged exceeds** what is payable, or goods are returned, or goods/services are **deficient**, the supplier **may** issue one or more credit notes for supplies of that financial year. Restaurant events that belong here:

- Guest walks out / refuses a dish after the bill is printed and issued.
- Wrong rate or wrong value on an issued bill.
- Complimentary / discount that was not on the original invoice (then also read Q8).
- Payment short against an already-issued invoice that the house writes off as a deficiency of service.

**Same-day POS “void”.** If the document was never issued to the guest (kitchen error, duplicate draft, bill not printed/handed), there is no section 31 invoice yet — a void is fine, but **do not leave a hole** in the consecutive series without an audit trail. If the bill was printed and given, or already reported in GSTR-1, use a credit note. Practice of silent same-day voids with reused numbers is a common failure in restaurant audits.

**What the credit note must contain** (Rule 53): nature of the document; consecutive number (same 16-character rules, own series is fine); date; supplier GSTIN; recipient particulars (for B2C, as on the original — often blank); **serial number and date of the corresponding tax invoice or bill of supply**; taxable value, rate, and tax credited; signature / electronic equivalent. Reason (return / deficiency / excess value) should be stored even if not all of it is on the thermal slip.

**Deadline.** Section 34(2): declare the credit note in the return for the month of issue, **but not later than 30 November following the end of the FY in which the supply was made**, or the date of furnishing the **annual return**, whichever is earlier. After that you can still issue a commercial note; you **cannot** reduce output tax. Finance Act 2025 tightening (from 1 October 2025): reduction of output tax on a credit note is not allowed unless the registered recipient has reversed ITC (or, for unregistered, the prescribed conditions). For this B2C restaurant the recipient is unregistered, so the ITC-reversal limb does not bite; the 30 November clock still does.

Debit notes (section 34(3)) have no 30 November cutoff for increasing tax.

**Period.** Section 34 as amended (30 November deadline from 1 January 2021 / Finance Act 2020; ITC-reversal condition on the supplier’s reduction from 1 October 2025). Rule 53 from 1 July 2017.

**Rests on.** CGST Act s. 34; CGST Rules 53; Circular 92/11/2019-GST (commercial vs tax credit notes).

**Confidence.** High.

---

## Suggested POS defaults for this outlet

| Setting | Default |
|---|---|
| GST scheme | Regular (composition locked off while liquor is sold) |
| Restaurant GST | 5% (2.5 + 2.5), ITC off |
| SAC | 996331, print optional on B2C |
| Liquor GST | Outside GST |
| Liquor KVAT | 0% (exempt from 1 April 2017) |
| Liquor price | Tax-inclusive menu / peg rate; no VAT add-on |
| Service charge | Off unless guest accepts; if on, GST 5% on the food portion |
| Guest document | One bill, two blocks |
| Invoice no. | Consecutive, FY-prefixed, ≤16 chars, `-` `/` only |
| Rounding | Each of CGST and KGST to nearest rupee; grand-total rupee round optional and separate |
| Corrections after print | Credit note citing original invoice; no silent cancel |

Not legal advice to a client; defaults for a configurable POS as at 15 September 2026.

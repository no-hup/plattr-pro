# Restaurant tax, Bangalore, one outlet — what is actually saveable

Bottom line. A 10–20 table Bangalore restaurant cannot legally “save GST” the way owners mean it. Standalone restaurant service is 5% with no input credit, and that 5% is the concession. The money you can actually keep is income tax, and only if every rupee of sales is on the record: presumptive tax at 6% of digital receipts and 8% of cash, and — for a resident individual proprietor with no other income — a nil tax bill while that deemed profit stays within the rebate. Deleting cash bills does the opposite of this. It is how the current raids were built, it fails because the bill already left a trail outside the till, and it converts a small, often-zero income-tax bill into GST at 5% of the suppressed amount plus interest, a fraud penalty, and an income-tax addition. For you as the POS vendor, the product bet is an invoice that cannot be unpublished, plus a weekly pack a CA will sign. Do not ship an agent that tells the owner what to file.

Press figures below (100 restaurants, 45 cities, 60 TB, ₹70,000 crore, “63,000 notices”) are what officers and reporters have said. They are not adjudicated findings. Petpooja’s stated position is that it has no bulk-delete feature and that it keeps an audit log. Treat the mechanism as real, because cash-only deletion is an old restaurant practice. Treat the rupee totals as allegations.

The Income-tax Act, 2025 is in force from 1 April 2026. Returns for FY 2025-26 (the ones being filed now) still cite the 1961 Act. FY 2026-27 workings should be ready for the new section numbers. Where I cite a new-Act number I say so. Where I am under about 80% sure, I say so in the sentence.

---

## 1. How the deletions were seen

Officers did not need a customer to complain, and they did not start with a raid. The pattern in the reporting (Inc42, 24 Apr 2026; Times of India, Hyderabad, 5 Aug 2026; Taxmann note of CA Milind Wadhwani, 17 Mar 2026) is: analytics first, survey later.

**The POS vendor’s own database is the trail.** A bill that has been printed, WhatsApped, or saved to a cloud server is already outside the owner’s control. Deleting it on the restaurant login removes the row from the owner’s screen. It does not remove the insert, the print event, or the later delete from the vendor’s store. The department’s reported path was a survey/search at the vendor, a copy of the billing database (the press figure is about 60 TB), and a match of “ever billed” against “still billed” and against GSTR-1 / ITR turnover. Month-end clusters did the selection for them: cancellations piled up 8–10 days before the GST due date, and the cancel rate on cash was wildly higher than on UPI and card. A 40–50% cash cancel rate is not a kitchen. Once that pattern is visible at one vendor, every merchant id on that vendor is a row in a spreadsheet. Raids on individual restaurants came after the spreadsheet, not before.

**Tender data the owner does not hold.** Card acquirers, UPI pipes and soundboxes settle to a bank account. AIS and specified-financial-transaction reporting already show the department large cash deposits and card credits. Swiggy and Zomato deduct tax at source on the gross (section 194-O; 0.1% from 1 October 2024, raised from the old 1% — Finance (No. 2) Act, 2024) and the gross lands in Form 26AS / AIS. Officers can see platform sales with no help from the POS. Deleting those bills is pointless, which is why the reported behaviour was cash-only. That selectivity is itself the evidence.

**Purchase side, no POS required.** Registered suppliers — dairy, packaged goods, the liquor distributor, the gas agency — file their outward supplies. A kitchen that bought like a ₹3 crore restaurant and returned ₹80 lakh of sales is visible from GSTR-1 of the suppliers and from the excise liftings, before anyone opens the till. Liquor is the cleanest version of this: stock comes from a licensed channel, the excise daily stock book is a legal record, and sales can be estimated from pour minus breakage. Food cost in this segment, when the owner is honest, sits roughly in the high 20s to mid 30s as a percentage of food sales. I will not quote a tighter benchmark; the officer only needs an absurd one.

**The bill in the customer’s hand.** Survey teams buy a meal, keep the tax invoice, and look for that invoice number in the next return. Section 67 of the CGST Act is enough to walk in. Income-tax survey (section 133A of the 1961 Act) is the same visit with a different officer. Gaps in invoice serials, two series, or a series that restarts, show up in ten minutes.

**What did not catch them.** E-invoicing did not. IRN applies to B2B supplies once aggregate turnover has crossed ₹5 crore in any year from 2017-18 (threshold last cut from 1 August 2023). A dine-in bill to a walk-in guest is B2C. There is no IRN on it. Dynamic QR on B2C is a ₹500 crore-turnover rule. A 15-table restaurant is outside both. Anybody who tells you the GSTN “sees every table bill live” is wrong.

The durable lesson for a till: if a finalised invoice can disappear, the department will one day read the disappearance. Build so there is nothing to find.

---

## 2. The legal levers

### GST — rate first, so nobody “optimises” a fiction

Restaurant service (SAC 9963) at a place that is not a “specified premises” is **5% (2.5% CGST + 2.5% SGST), and input tax credit is blocked** by the condition in entry 7 of Notification 11/2017-Central Tax (Rate), as amended (the 5%-without-ITC design dates from Notification 46/2017-CT(Rate)). “Specified premises” from 1 April 2025 means a hotel where any unit of accommodation was supplied in the preceding year above ₹7,500 a unit a day, or a hotel that filed the voluntary declaration in the January–March window (CBIC FAQ on specified premises; the entry for 18% with ITC is 7(vi) of the same notification). A standalone Bangalore restaurant **cannot elect 18% in order to take credit**. Blog posts that still tell AC restaurants to “choose 18% if your inputs are heavy” are describing the law from before November 2017. Ignore them.

Outdoor catering at non-specified premises is the same 5% without credit. Credit is available on restaurant/catering only inside specified premises, at 18%. Surety on the catering line: about 80%. Do not let the product offer an 18% toggle.

Consequences that follow, and that owners misread:

- GST paid on rent, Swiggy’s commission invoice, crockery, the fit-out, the POS subscription — all of it is a cost. It is not a credit.
- From 10 October 2024, renting of commercial property by an **unregistered** landlord to a registered restaurant is under reverse charge: Notification 09/2024-Central Tax (Rate), inserting entry 5AB into Notification 13/2017-CT(Rate). The restaurant pays 18% GST in cash on that rent and cannot use it as credit. A registered landlord charging 18% forward is the same economic result. There is no structuring win here. There is a miss: people forget to pay the reverse charge and eat a notice.
- Same trap on a few other reverse-charge lines a restaurant actually hits: advocate fees; goods-transport where the transporter has not charged forward GST; security supplied by anyone who is not a body corporate. The saving is booking the right one, not avoiding the tax.
- Electricity transmission and distribution is exempt. Diesel is outside GST. Neither produces a credit to “manage”.

**Composition is usually the wrong scheme for this client.** Section 10, and rule 7: a restaurant composition dealer pays 5% (2.5+2.5) on turnover in the State, **cannot collect that tax from the guest**, and issues a bill of supply. A regular dealer also pays 5% and **does** collect it. Same rate, and composition comes out of the owner’s pocket. Composition also forbids inter-state outward supplies, and the turnover cap is ₹1.5 crore (₹75 lakh in the special-category States — Karnataka is not one of them). Turnover in the State includes exempt and non-taxable supplies. Alcoholic liquor is a non-taxable supply (section 2(47) read with the definition of exempt). Whether a State officer folds liquor turnover into the composition base is something I have seen argued both ways — surety that you will win this is well under 80%. Do not opt a bar into composition.

One narrow reading goes the other way on Swiggy. Section 10(2)(d) blocks composition only where the person supplies through an e-commerce operator **who has to collect TCS under section 52**. Restaurant service through Swiggy/Zomato was notified under section 9(5) from 1 January 2022 (Notification 17/2021-CT(Rate)). On that service the operator pays the GST and does **not** collect TCS (Circular 167/23/2021-GST, 17 Dec 2021). So the 10(2)(d) bar arguably does not bite, and a pure dine-in-plus-Swiggy restaurant can stay on composition. Surety: about 70%. Platforms often still refuse a composition GSTIN, and any sale of goods on the same app (a packed bottle, a tub of ice cream sold as goods) brings section 52 back and breaks composition. For a client who can charge 5% to the guest, I do not recommend composition even when it is available.

**Section 9(5) is the GST point owners and CAs still get wrong in both directions.**

- On restaurant service supplied through Swiggy/Zomato, the operator is the person who pays GST. The restaurant does not put that turnover in its 3B tax payable. Paying 5% again is a gift to the department.
- The same turnover **is** part of aggregate turnover (Circular 167, and section 2(6)). It counts for the registration threshold (₹20 lakh of aggregate turnover for a service supplier in Karnataka; ₹10 lakh only in the special-category States), for composition eligibility, for e-invoice, and for GSTR-9. Dropping Swiggy sales out of the GST returns entirely is how small restaurants drift into a wrong “unregistered” story.
- The restaurant’s income-tax turnover includes those sales in full. “The app already paid the GST, so it isn’t my sale” is wrong on income tax and is exactly the mismatch AIS is built to show, because 194-O is deducted on the gross.
- Value is the price of the restaurant service, not the bank credit. Commission, ads and the platform’s own delivery fee have to be unwound from the payout file. Coding turnover off the IMPS credit understates sales and leaves the 26AS gross unexplained.

**Split the bill.** Schedule II, paragraph 6(b) of the CGST Act: food and any drink **other than alcoholic liquor for human consumption**, supplied as part of a service, is a service. Alcoholic liquor itself is outside the GST levy (section 9). It is a State VAT plus excise item. Inc42’s line that liquor is “18% GST” is not the law; do not encode it. Karnataka moved excise on alcohol to an alcohol-in-beverage duty from 11 May 2026 (Karnataka Excise (Excise Duties and Fees) (2nd Amendment) Rules, 2026). I am not quoting a VAT percentage on a peg poured in a bar. Pull the current commercial-tax entry when you configure the liquor tender, and keep it a configurable rate, not a hardcoded one. A till that puts food and liquor on one 5% GST button manufactures a wrong return every night. A till that puts GST on the peg and VAT on the dosa does the same.

**What you may reduce, legally, on the GST side.**

- The taxable value is the transaction value (section 15). A discount decided before or at the time of supply, and printed on the invoice, reduces the value. Happy-hour pricing does this. A discount thought up after the invoice needs a credit note under section 34, linked to the invoice, and it has to be issued by 30 November following the end of the financial year (the old September cut-off is gone). A “discount” that is really a deleted bill is not a section 15 discount.
- Complimentary, staff meal, wastage, wrong KOT: record them as what they are, before the invoice exists or by credit note after. They are not GST planning. They stop the owner from reaching for delete, which is the behaviour that created this market.
- Goods sold as goods, not eaten as restaurant service, follow the goods rate, and credit on those inputs is not blocked by the restaurant-rate condition. A counter that sells packed sweets, coffee beans or merchandise can claim credit on inputs used **only** for that counter (rule 42/43 for anything common). The classic circular on sweet shops is the authority for “over the counter is goods; served on a plate is restaurant service” — confirm the circular number in the opinion you rely on, surety that I have the number right is under 80%, surety on the distinction itself is higher. Two failures I see constantly: everything punched as 5% service, so legitimate goods-credit is left on the table; or full credit taken on the whole kitchen, which breaches the condition of the 5% rate. On a breach, the concession can be denied and the demand raised as if the rate never applied. I would not want to litigate the exact alternative rate; do not create the fight.
- Registration timing. Stay unregistered only while aggregate turnover, including liquor and including Swiggy, is genuinely under ₹20 lakh. Voluntary registration earlier just creates 5% you then have to collect and reverse-charge rent you then have to pay.
- Annual return. GSTR-9 has been kept optional at or under ₹2 crore of turnover and GSTR-9C applies above ₹5 crore; Notification 15/2025-Central Tax is what is being cited for the FY 2024-25 exemption. Confirm the notification for the year you file. Surety on the thresholds: about 80%.

There is no restaurant equivalent of an area-based exemption, a lower rate for takeaway, or a lower rate for non-AC. Takeaway from a normal restaurant is the same 5%.

### Income tax — this is where the rupees are

**Section 44AD (1961 Act) / the corresponding presumptive provision in the 2025 Act (written up in commentaries as section 58 — confirm the number against the Gazette before you print it, surety on the renumber: under 80%).**

An eligible resident individual, HUF or partnership firm (not an LLP, not a company) with eligible-business turnover up to ₹2 crore may declare profit at **8% of turnover**, or **6% of the portion received by account-payee cheque, draft or a prescribed electronic mode**, and not less. If cash receipts for the year are 5% or less, the turnover cap rises to **₹3 crore**. The 6% is not an all-or-nothing switch. Cash is at 8%, UPI/card/NEFT is at 6%, computed separately. One QR code on the counter does not pull the cash sales down to 6%.

Opt out, or declare below those rates, and you are out of the scheme for the next five years, and if your income exceeds the basic exemption you maintain books and get audited (44AD(4) with 44AB). Do not flip in and out.

What 44AD is worth in this city, for a proprietor on the new regime:

- Rebate under section 87A, as amended by the Finance Act, 2025, wipes income tax for a resident individual whose total income is up to ₹12 lakh. That rebate is not a salary-only rule. A proprietor gets it; a firm does not; a company does not. Salary’s extra standard deduction (the ₹12.75 lakh speech line) does **not** apply to business income. Surety on ₹12 lakh for FY 2025-26: high. Surety that the 2025 Act kept an identical rebate from 1 April 2026: high on the policy, low on the section number.
- 6% of ₹2 crore is ₹12 lakh. A single owner, fully digital, turnover at or under ₹2 crore, no other income, 44AD at 6%, is at the rebate line. Income tax: nil. 8% of the same ₹2 crore is ₹16 lakh, which is no longer nil. The entire “planning” content of pushing UPI is that gap, plus the ₹3 crore cap, plus the audit threshold below.
- A firm pays 30% plus surcharge and cess on the presumptive profit, and the partners’ share is exempt in their hands (section 10(2A)). Two brothers in a firm on a ₹1.5 crore digital turnover pay tax on ₹9 lakh at 30%. The same business in one brother’s name, if it is genuinely his, can fall under the rebate. Whether the conversion is worth it is a CA judgment: GST amendment, FSSAI, shops-and-establishments, and — if there is a bar — a Karnataka excise licence that does not move just because the CA redrafted the deed. I have watched people “save” income tax and lose the CL-9. Do not let software recommend an entity change.

44AD is a floor. If the real margin is higher, declaring the floor while **all** receipts are in the turnover is what the section permits. If the real margin is lower — heavy Swiggy commission, Koramangala rent, a new outlet still filling — 44AD over-taxes them. Then the legal move is books, a true profit, and audit where 44AB requires it. The software’s job is to show both numbers. The CA picks.

**Audit threshold, separate from 44AD.** Section 44AB: tax audit above ₹1 crore of turnover, extended to ₹10 crore if **both** cash receipts and cash payments are 5% or less. A restaurant can clear the receipt test on UPI and still fail the payment test because the mandi, the casual staff and the milk are in cash. Track cash out, not only cash in. Under 44AD, within the limits and at or above the presumptive rate, this audit does not apply. The moment they leave 44AD, it does.

**Cash rules that bite once you are on real books, and one that bites anyway.**

- Section 40A(3): a cash expense above ₹10,000 in a day to one person is disallowed in full (₹35,000 for a goods-carriage transporter). Rule 6DD exceptions are narrow; “the vendor doesn’t take UPI” is not one of them. Under 44AD this disallowance does not operate, because no expense is claimed. That is a reason some cash-heavy kitchens should stay in 44AD even when a naive comparison looks close.
- Section 269ST: do not **receive** ₹2 lakh or more in cash from one person in a day, or against one transaction, or in relation to one event. Penalty under section 271DA equals the cash taken. A wedding party that pays the banquet in cash is the usual corpse. This applies whether or not you are in 44AD.
- Sections 269SS and 269T: loans and deposits of ₹20,000 or more in cash. Owners fund the till from a personal cash loan and create a penalty file. Put capital in through the bank.

**Expenses that matter only on actual books** (they do nothing under a pure 44AD return):

- Non-creditable GST, reverse-charge GST, Swiggy commission and the 18% GST on it, rent, wages, PF, ESI. Deductible. PF/ESI and the employer’s other section 43B items are deductible in the year they are **paid**.
- Depreciation on kitchen equipment and a real fit-out (section 32). Additional depreciation is for manufacture. A restaurant does not get it. CAs who claim it are wrong.
- Partner interest and salary: on a real computation, deductible within section 40(b). From FY 2025-26 the firm also deducts TDS on those payments under section 194T (10%, above ₹20,000 — confirm the threshold against the latest chart before you code it; surety about 80%). Under 44AD the settled practical position is that you do **not** claim a further 40(b) deduction on top of the presumptive profit. A few tribunals have gone the other way. Surety that a further deduction is safe: low. Do not automate it.
- Section 40(a)(ia): 30% of an expense is disallowed if TDS was deductible and was not deducted or not deposited. The live dispute for this segment is the platform commission invoice — is it 194H, 194J, or neither, given the operator already withholds 194-O on the gross? I do not want a POS deciding that. I want the commission ledger printed so the CA can take a position and apply it consistently. Surety that “never deduct on Swiggy commission” survives a serious assessment: under 70%.

**TDS the restaurant itself must get right, or the assessment becomes the product.** Rent of land, building, furniture under section 194-I at 10%, plant and machinery at 2%, once the payer is a person required to deduct (an individual/HUF only crosses into this net above the turnover threshold in the preceding year). Thresholds were rewritten in the Finance Act, 2025; I have seen both “₹50,000 a month” and “₹6 lakh a year” written up for 194-I in FY 2025-26 charts, so **do not hardcode a rent threshold** without checking the Finance Act text for that year. Contractors (housekeeping, the casual caterer) under 194C. The CA’s bill under 194J. Missing these is how an otherwise clean 44AD case grows a disallowance the year they fall onto books.

**Entity, stated once, because it dominates every other lever.** A company or LLP cannot use 44AD. On a disclosed margin of 10–15% they pay corporate tax on the real profit (22% if they opt into section 115BAA, else 25/30 — plus dividend tax when the money comes out). That is the right wrapper if turnover will cross the presumptive cap, if there are outside investors, or if liability matters. It is an expensive wrapper for a single outlet at ₹1–2 crore. Most Bangalore restaurants I see incorporated because someone said “Swiggy wants a company” or “GST looks better”. Swiggy does not require a company. The conversion back is cheap on paper and miserable on the excise licence.

**What I will not dress up as a lever.** Paying a spouse a salary for work they do not do. Splitting one kitchen across two PANs so each stays under ₹2 crore. Booking personal household spend as kitchen expense. Inflating purchases. Treating the owner’s cash drawings as an expense. All of these fail in survey, and two of them are prosecution facts.

---

## 3. What the software can run every week, and what stays with me

The till sees bills, tenders, voids, payouts if you ingest them, and purchases if the owner enters them. It does not see the owner’s other income, the firm’s deed, the excise licence conditions, or whether last year’s return was already on 44AD. That split is the product boundary.

**Operate, every week, without a CA in the chair.**

- Sales by tender: cash, UPI, card, each aggregator, other. Cash ratio against the 5% lines (44AD cap and 44AB), and the 6%/8% split computed as an **indication**.
- Invoice series with no gaps, no reuse, no backdating. Voids and credit notes listed with reason, user, time, and original bill.
- A hard stop on any single cash receipt that would cross ₹2 lakh (269ST), including a running event tab.
- Aggregator gross, discount funded by the restaurant, discount funded by the platform, commission, GST on commission, 194-O deducted, bank credit. Variance versus the POS’s own delivery channel. This one schedule is worth more than the rest of the GST module.
- Tax-head split on every bill: 5% restaurant service, liquor at VAT with no GST, goods-counter at the goods rate. Refuse to close a liquor line that has a GST rate on it.
- Credit notes in the last five days of the month, and cash voids as a percentage of cash sales, shown against the outlet’s own trailing average. You are showing the owner the exact statistic the department sorts on. You are not “fixing” it.
- GSTR-1 buckets: B2C at 5%, section 9(5) supplies reported but not in the restaurant’s tax payable, credit notes, B2B (and, only if they ever cross the e-invoice threshold, a flag that those B2B invoices need an IRN).
- Purchases by vendor, cash versus bank, with any vendor crossing ₹10,000 cash in a day marked for 40A(3).
- Reverse-charge candidates: unregistered landlord, advocate, non-corporate security, GTA. A list, not a return.
- Both tax sketches side by side once a month: tax if they stay in 44AD at the indicated 6/8, tax if the rough books are right. Fixed costs (rent, payroll, PF) will be wrong unless the CA types them in monthly. Label both sketches “not a return”.

**Flag, and stop. A human CA decides.**

- In or out of 44AD, including the five-year lock-in. The software does not know last year’s election.
- Composition versus regular. Default regular. Do not switch a live GSTIN.
- Entity: proprietor, firm, company. Never recommend. Show the tax difference and the licence list.
- Whether platform commission needs TDS, and under which section.
- Whether a mixed counter’s credit is worth the rule 42 exercise.
- Partner remuneration, 40(b) limits, 194T.
- Anything about a past period in which bills were deleted. See section 6.
- The actual 3B, the annual return, the ITR, the audit report. A GST practitioner or a CA signs these. The product prepares the schedule.

If the agent’s sentence is “your GST this week is ₹x, here is the invoice list”, it is inside the line. If the sentence is “declare 6% and keep the second outlet in your wife’s name”, you are practising chartered accountancy without being a member, and you are also giving the kind of advice that gets quoted in a show-cause. The Chartered Accountants Act, 1949 reserves that practice. Disclaimers do not cure a product that makes the decision.

---

## 4. The line, for the owner and for you

**Planning, owner.** Every guest bill that was paid exists in the return at the price the guest paid, reduced only by a real section 15 discount or a real section 34 credit note. Food and liquor are taxed under the statutes that actually apply. Aggregator gross is in the turnover and is not in the restaurant’s GST payable. The owner then picks 44AD or real books, proprietor or company, and pays the TDS the Act requires. Pushing customers to UPI so the 6% rate and the ₹3 crore cap apply is planning. Recording a complimentary as a complimentary is planning. Asking a CA whether the true margin is under 6% is planning.

**Evasion, owner.** Removing a finalised cash bill. Editing items out of a finalised bill so the serial stays pretty and the total falls. Billing ₹900 for a ₹2,500 table with the guest’s consent. A second book. A personal QR whose credits never hit the sales register. Parking one kitchen in two GSTINs or two PANs to multiply a threshold, with one cash drawer and one kitchen. Collecting 5% from guests while on composition (section 10(4) forbids collection; the collected amount has a way of being demanded again). Taking input credit while charging the 5% conditional rate. Booking purchases that did not happen so that, in a year on real books, profit shrinks. Calling suppressed sales “wastage”.

The department’s labels are section 74 of the CGST Act (suppression, fraud — extended period, penalty up to 100% of the tax) against section 73 (a normal mistake). On the income-tax side, escaped business receipts assessed as business income are painful; the same receipts thrown into section 68/69 and taxed under section 115BBE (60% plus surcharge and cess, effectively near 78%, and no set-off of any expense) are ruinous. Courts often accept a profit-rate addition on proved business receipts instead of 115BBE. Surety that a given bench will be kind: low. People who deleted bills do not get to choose the section.

**Planning, vendor.** Immutable finalised invoices. Corrections only by credit note or by voiding before issue. Full log retained for the longer of the GST window (section 36: 72 months from the due date of the annual return for that year) and a practical ten years, because income-tax reopening where escaped income is represented by an asset of ₹50 lakh or more runs that far (section 149 of the 1961 Act; the 2025 Act keeps a long tail — confirm the new section before you write the retention policy). One export, the same numbers, for the owner, the CA and the officer. Liquor cannot be punched as GST. Composition bills cannot print a GST charge. The merchant cannot see a “net of deleted” report, because that report is a second set of books you would be maintaining.

**What puts you, the vendor, on the search warrant.**

- A control that deletes, zeros, or rewrites finalised bills in bulk, by date range, or by tender. The press theory of this raid is that the feature existed and the trade treated it as the reason to buy the software. You do not have to share that theory to see the consequence. Petpooja’s defence — “every POS can edit a bill, and we keep logs” — is exactly the sentence that still got their servers copied. Logging a delete is weaker than not having the delete. Officers seize first and read the logs later.
- Renumbering invoices after the fact so the gaps close. That is falsification of a financial record. Section 132(1)(f) of the CGST Act (falsifying or substituting financial records with intent to evade) is the GST prosecution limb; clause (l) covers abetment. Section 122(1A) puts a penalty, equal to the tax, on a person who retains the benefit of a listed offence or at whose instance it is committed. A subscription fee for a suppression feature is an easy “at whose instance” paragraph for a drafting officer. Surety that a court convicts a vendor who merely allowed a per-bill void with a log: low. Surety that a vendor who shipped date-range cash delete will at least be searched and will spend years as a witness against its own customers: high. The search is the business-ending event. The prosecution is extra.
- Two databases, or an export parameter for “exclude void / exclude cash / management sales”.
- Backdated invoices, editable dates, a “reprint with a new number”.
- In-app copy that tells the owner the till can “manage GST” or “reduce taxable sales”. Your own marketing will be exhibit A. Petpooja’s public line — that it is not a tax tool and the merchant is solely responsible — is the correct line, and it is not a defence if the feature set contradicts it.
- Holding the billing store outside India, or being unable to produce it on a section 70 CGST summons or a section 131 income-tax summons. You will receive those summons. Budget a lawful way to respond. “We can’t see merchant data” is not available to you once you run the cloud, and inventing it is worse.

A void **before** the invoice is issued, a printed cancelled KOT, a credit note, a manager approval, a reason code: that is a restaurant, and every clean POS has it. The line is whether the guest’s tax invoice, once issued, remains reconstructable for ten years by an officer who does not have the owner’s password.

---

## 5. What an owner will pay, and what I need before I tell a client to switch

**Owner.** This segment already pays a POS a small monthly fee and a CA a retainer. In Bangalore, for one outlet with GST, TDS and an ITR, a competent retainer sits roughly between ₹5,000 and ₹15,000 a month if there is liquor or a notice, and less if it is a simple vegetarian 3B. That is a practice range in 2026, not a survey — surety about 70%. They will not pay another ₹10,000 a month for an “AI CA”. They will pay a small add-on, on the order of ₹500–₹2,000 a month, for something their CA has said “use this, it cuts my time and your notice risk”. The liquor outlet near the ₹2–3 crore line will pay the top of that, because the 6-versus-8 gap and the audit threshold are worth real money and the excise visit is worth more. A cloud kitchen whose Swiggy commission already ate the margin will not pay for tax ideas; it will pay for the payout reconciliation, because that is where its cash leaks.

Price the owner package as part of the POS, not as a second subscription they can cancel. Price a CA login separately, per firm, across that firm’s outlets. The firm is the channel. Owners buy what their CA tells them to buy the week a notice arrives in the building.

What they are buying, in their words: the bill cannot be questioned, the Swiggy statement matches the ITR, and if someone walks in on a Thursday the export is already in the drawer. They are not buying a percentage saving. Quote them a saving and you have become their CA.

**What I want, before I will recommend you.**

- A CA login over all my clients on your till. One screen: cash ratio, void ratio, 9(5) variance, 269ST breaches, 40A(3) breaches, liquor punched under GST. Red on top.
- A single export that ties to GSTR-1 tables and to a P&L, same totals, voids included, no filters that change the total.
- Payout-file import for Swiggy and Zomato (and the next two they use), mapped to gross, commission, GST on commission, TDS, credit.
- Closed-day lock. The owner who wants a change after close raises a credit note. Nobody edits yesterday.
- Department export: invoices, credit notes, voids, tender, user, timestamp. I will hand this over on the first summons. I need you to hand it to me the same day.
- The weekly page in language a owner reads. English is fine for most of my Bangalore clients; do not spend a year on a chatbot.
- No tax opinion in the UI. “Indicative. Your CA files.”
- A data-retention commitment in the contract, ten years, in India, and a named way summons are handled if you and the client have fallen out. I will not move a client onto a till that can hold their old bills hostage.

If you do those and the pricing is honest, I will move the clients who are still on a system that can delete a bill. That is the entire recommendation. Fear is doing your selling for you this year; it will not do it in 2028 if you are sloppy.

---

## 6. What you are not asking

**Direct orders beat any tax idea you have.** On Swiggy the guest’s 5% is paid by the operator, so the restaurant remits nothing on that plate — and then gives away 20–30% commission plus 18% GST on the commission, with no credit. On your own bill the restaurant remits the 5% and keeps the rest. A till that makes the in-house bill, the QR and a simple own-delivery order pleasant will save more cash than 44AD, composition and entity choice added together. Build that. Do not bury it under a tax dashboard.

**Excise, not GST, is the Saturday-night risk for any outlet with a bar.** Karnataka excise inspectors look at physical stock, the brand-wise stock register, permitted hours, and whether the pegs you sold could have come from the bottles you lifted. A perfect GSTR-1 with no liquor stock ledger still fails that visit. If you serve this segment, the stock ledger is part of the product, maintained in the same locked day as the bill. I am not giving you the excise-law chapter here; get a Karnataka excise practitioner to spec the register. Surety that this, and not income tax, is what a Bar-and-Restaurant licensee in this city fears month to month: high.

**Past deletions are a legal problem, not an onboarding flow.** If a prospect used a delete feature in the last several years, section 74 GST (five years from the due date of the annual return, in a fraud case) and income-tax reopening are already in motion, and your database from go-live will not match their old returns. Do not offer a “clean opening”. Do not import a cooked-up past. The owner’s only sensible move is to quantify the gap with a CA and pay the tax under section 73 or 74 **before** a notice, where the penalty is lower, or to answer the notice if it has already come. That computation is the CA’s work, offline. Your contract should say you will not reconstruct history.

**The agent’s liability.** A weekly indicator with the schedules above is a tool. A chat that says “you can safely declare ₹x” is advice, and when it is wrong the owner will point at you, and so will the officer. Keep a human signature on every filed number. Carry professional-indemnity thinking in the pricing even though you are not a firm: your customer is one raid away from blaming the software.

**Summons are a product requirement.** Section 70 CGST and section 131 of the income-tax Act (1961 numbering) will be used on you, not only on the restaurant. Decide now, in writing, what you produce, how fast, and that you tell the merchant when you have been asked. Producing complete logs is how you stay a witness. Negotiating what to hide is how you become an accused.

**Thresholds move.** The ₹12 lakh rebate, the 194-O rate, the 194-I threshold, GSTR-9 limits, and the Karnataka excise tariff have all changed inside the last two years. Put every rate and threshold in a table a CA can update, with the notification number next to it. Hardcode nothing in section 2 of this note except the 5% restaurant rate, and even that should be a row in the table.

**One kitchen is one turnover.** A second outlet under the same PAN adds to 44AD, to aggregate turnover, and to the audit line. An additional place of business on the same GSTIN is the honest structure. A spouse’s PAN is a second business only if it is actually a second business. Write that into the CA screen so I can see two GSTINs that share a phone number and a kitchen address.

**Service charge.** The CCPA guidelines of 4 July 2022 treat a compulsory service charge as an unfair practice. If the restaurant still collects one, it is part of the price the guest pays and it is in the GST value and the income-tax turnover. A voluntary tip, paid to staff, not touching the bill, is not your sale. Give the owner a tip field that does not enter taxable value, and do not give them a default 10% service charge that posts to sales “because guests expect it”.

I would buy, and I would tell clients to buy, a boring till: the bill cannot die, food and liquor never share a tax head, Swiggy’s gross is reconciled to the bank credit every Monday, and my login shows me who is about to do something stupid. I would not buy, and I would warn clients off, an agent that promises to lower the tax.

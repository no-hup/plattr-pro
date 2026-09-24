# Roadmap — product track

For the product manager and staff engineer. What to build next, in order, and why.
Sources: the competitor dossier (2026-09-23), a Grok strategy pass, and a code check of
what is actually built. Business-owner track is a separate file.

**Position.** Single-outlet sit-down restaurants in Bangalore, 10–20 tables, owner on the
floor most nights. Our edge is that a bill can never be rewritten: every act is an
append-only row. Petpooja is under a tax investigation over deleted bills (vendor denies it),
so "clean books" is a real reason to switch. Price near Positeasy's top plan
(~₹10k/outlet/year), charge separately for the agent.

## Already built (do not rebuild)

Guest QR ordering, kitchen display, captain app, variants and add-ons, floor map with
merge / move / split, billing with line snapshots and liquor VAT as its own block, invoice
series, credit notes, staff PIN approvals with audit rows, payments, day close, thermal
printing with a queue and sweep, offline cash estimate. Seven modules have domain, app,
API and till screen.

## Now — blocks a switch

- **Parcel.** A guest at the counter orders two dosas to take home at 1pm. The cashier rings
  a parcel bill with packing charge, no table. Without this, every takeaway goes on a fake
  table or a paper slip, and the till's totals are wrong by lunchtime. *Zero code today.*
- **No-charge and staff meal.** The chef eats a thali at 4pm; the owner's friend gets a free
  dessert. Cashier marks the line NC with a reason; it stays on the record at ₹0 and shows in
  day close. Without this, staff void the line instead, and the void report fills with noise
  that hides real theft.
- **Bill to company.** A corporate lunch for 8, ₹6,400, paid by invoice next month. The bill
  closes as credit against the company and shows as receivable. Without this, the cashier
  fakes a cash tender and the drawer is ₹6,400 short.
- **UPI QR on the bill.** Table 4's ₹1,280 bill prints with a QR carrying the exact amount;
  payment lands against that bill. Without this, the cashier types the amount into a static
  QR and nobody can match payments to bills. *Specced (`SPEC_UQ`), not built.*
- **CA export.** Month end: the CA downloads a GSTR-1-shaped file and a Tally import. Without
  this, the CA re-types our reports and can veto us after the owner already said yes.
- **Menu import.** An owner moving from Petpooja uploads their menu export, including
  variants and add-ons, and fixes what didn't map. Without this, nobody hand-types 200
  dishes to try us. *Parked as IM; move it up.*
- **Owner reports, six not eighty.** Sales by day, by dish, by staff, by tender; voids and
  discounts; tax summary. Without this, the owner opens Petpooja on his phone to compare.
- **Offline invoice numbers — check, then fix.** The Wi-Fi drops for 20 minutes on a Friday.
  Confirm no two bills can ever carry the same number. Without this, it is a GST problem,
  not a sync bug.

## Next — earns the switch

- **Monday closer (agent).** Monday 9am, one WhatsApp message: "Week billed ₹3,42,000.
  Bank and payouts ₹3,11,400. ₹28,100 is commission and two credit notes. ₹2,500 I cannot
  explain — two UPI payments have no bill. Reply 1 to attach them." It reads our ledger plus
  bank, UPI and Swiggy/Zomato payout files, asks one question, and writes any fix as a new
  audited row. Batch the model once a week; cheap rules decide when to wake it. Also flags
  owner-PIN used 40 times during rush (the PIN is on a sticky note). Without this, "catch it,
  don't cage it" catches nothing, because nobody reads the audit trail.
- **Auto-86 (agent).** 8:30pm Saturday: mutton biryani voided three times after the KOT
  printed, tandoor tickets at 24 minutes. It takes biryani off the QR menu and messages the
  owner, "Reply NO to put it back." Uses signals the kitchen already makes; no stock count.
  Without this, the kitchen keeps accepting a dish it cannot make, and on delivery that means
  cancellations and a rating drop.
- **Swiggy / Zomato orders.** Specced (`SPEC_AG`), sandbox requested. **Open decision:** it
  was made a go-live must-have on 2026-09-22; this plan puts it here, after 10 live outlets,
  with the Swiggy tablet staying meanwhile. Shaurya to call it.

## Later

- **Light loyalty.** Phone number on the bill, visit count, one offer on the 5th visit. The
  `customer/` module already tracks visits.
- **Recipe inventory.** Only when an owner asks for food cost by name. Most never enter stock.

## Not building

Multi-outlet hierarchy, voice ordering, review-reply bot, "AI analytics" card, food cost from
invoice photos. And never a bill edit or delete, whoever asks.

## Before more building

- One Saturday beside a Petpooja cashier: log every tap for 20 bills.
- One CA who files for restaurants: show our bill and day close, ask what file they need.
- Ring a real Indiranagar menu end to end, including parcel and NC.
- Confirm the liquor VAT rate and bill layout with the CA.
- Retire `order.priceInfo` when the old cart path goes (30 files still read it; STATE D2).

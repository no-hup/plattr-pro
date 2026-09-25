# Feature requests · changing a bill on a busy night · 2026-09-25

**Status: requests, not decisions.** Nothing here is built or scheduled. The four calls at the bottom are Shaurya's.

**Where this came from.** Shaurya raised two cases: a table orders dessert after its bill is printed, and a
corporate party wants the drinks on a separate bill. Claude checked what the code does today, then thought through the
other busy-night cases. Gemini (via Antigravity) reviewed that thinking blind, with one rebuttal round. The list was
filtered on three tests: it happens weekly or more, money moves, and it isn't already built.

## What the system does today

- **Changing a printed bill means cancelling it.** The cashier cancels with a manager PIN and a reason, and the bill keeps
  its number, marked cancelled. Its dishes go back to the same draft, so Generate bill picks all of them up again, plus
  anything ordered since. **Nothing has to be re-entered.** The mechanism is correct under GST: an issued invoice is
  never edited; the old number is cancelled and a new one issued.
- **The till cannot reach that path.** Cancel shows only on the bill screen, right after Generate. Tapping the table
  later opens the payment screen, which has no Cancel. Confirmed in the browser by the QA run (QB-3).
- **The backend can split one table onto two bills** (move dishes to a second draft, each gets its own number, tax and
  service charge). The till has no button for it.
- **Guests can keep ordering from their phone after the bill.** The tile shows both amounts, but the new round cannot
  be billed until the first bill is cancelled.
- **Known gap:** a part-paid bill can be cancelled, even though cash has already been taken against it. The cash stays on
  the dead bill and the new bill asks for the full amount again. That is a bug, not a request (QB-2, P0).

## Why "cancel and re-issue" is the wrong everyday answer

The mechanism is right; making it the cashier's routine is not.
- Cancelling is the fraud signal the manager reads each morning ("print, take cash, cancel, pocket"). If every dessert
  creates a cancelled bill, a Friday produces thirty innocent cancels and the one real theft hides among them.
- It asks for a manager PIN when the bill only goes up.
- It is three steps (find Cancel, PIN, Generate again) at the busiest moment of the night.

## The requests, most important first

### FR-1 · Add to bill
**Scene.** Friday 22:10. Table 12's bill (18 dishes, ₹4,800) is on the table. They order two gulab jamun from the QR
menu, ₹240. The cashier taps table 12, sees "₹4,800 due · ₹240 new", taps **Add to bill**. The screen shows the two
added dishes, who ordered them and when, and the old and new totals. One tap: a new bill A-0431 prints with all 20 dishes
and a large header "REVISED — replaces A-0417". A-0417 is kept, marked "revised → A-0431".
**What the system does.**
- In one step: cancel the old number with the reason "revised", issue the new one, and link the two.
- Audit it as its own act (`bill.revise`, the delta and the direction), never as a plain cancel. The morning report shows
  revisions that raised a bill separately from those that lowered it and from cancels.
- **No PIN when the bill only goes up.** Adding to a bill never creates a dish. It re-bills dishes someone already
  ordered, and every dish records who placed it. The "put table 4's whiskies on table 7" fraud happens when the dish is
  ordered, and is just as easy before any bill is printed, so a PIN here would only slow the honest case. Instead, dishes
  that **staff** added after the bill was printed are flagged by name in the morning report. Dishes ordered from the
  guest's own phone are not flagged.
- **Before confirming, show any offer that changes.** Adding a dish can switch an offer on and lower the bill. Removing
  one can switch an offer off and raise it. The cashier sees it before the paper prints.
- **Refused once any payment is on the bill.** The new round then goes on a second bill for the same table (FR-6).
**Without this** the dessert cannot be billed at all from the till, or every dessert becomes a manager PIN and a cancel
that buries the real fraud in the morning report.
**Needs first.** Each dish must record who ordered it: the guest, or the staff login. Guest orders currently read
`placedBy: system` (sanity run 1), so the flag would be blind until that is fixed.

### FR-2 · Separate bills before printing (food and drinks, or one guest's share)
**Scene A.** 21:30, an office party of twelve. Their company pays for food, not alcohol. The cashier opens the draft
and taps **Split → Food / Drinks**. Two bills print: food ₹9,200 with GST and the company's GSTIN, drinks ₹6,400 on its
own paper. Accounts departments reject any expense claim that shows alcohol, even on a separate line of one bill, so
two tax sections on one paper are not enough.
**Scene B.** 22:15, one guest of eight has to leave. They want to pay for their two beers and a starter. The cashier
taps **Split → pick dishes**, ticks the three, and prints a bill for that guest only. The rest of the table keeps ordering.
**What the system does.** Moves the chosen dishes to a second draft (the backend exists: `billing-split`). Each bill gets
its own number, tax and service charge. No dish is re-priced. No PIN: no money leaves, only how it is presented changes.
**Without this** the corporate guest gets one mixed bill their office refuses to pay, and an early leaver's share is
worked out on a calculator.
**Needs a decision:** how an order-wide offer is shared between split bills (decision 3). Today each half gets the
whole ₹100 off (QA finding QB-1, P0).

### FR-3 · Separate bills after printing
**Scene.** 22:40, table 5's printed bill is ₹6,000. They look at it and decide to pay separately.
**What the system does.** The FR-2 split flow, run on a printed, unpaid bill. Underneath it is the FR-1 step: cancel
with reason "split", issue N new bills, all linked. No PIN, for the same reason as FR-2. It is refused once any payment
is on the bill.
**Without this** the only way is cancel with a PIN, then a split button that doesn't exist.

### FR-4 · Add the company's details after printing
**Scene.** 22:50, the guest at table 3 pays with a company card and asks for the company name and GSTIN on the bill,
which was printed without them. Frequent in business districts.
**What the system does.** Re-issues with the same dishes and the same total, plus the customer details. It is
linked, audited and reprinted, with no PIN because no money moves. It is refused if the total would change.
**Without this** the cashier cancels with a manager PIN to change nothing but a name, or the guest loses the claim.

### FR-5 · Take something off after printing
**Scene.** 23:00, table 9 says they will not pay the 5% service charge (it is voluntary in India). At another table a
starter on the printed bill never arrived. At a third, food was late and the manager gives 10% off.
**What the system does.** Revises the bill down in the same one step as FR-1, with a separate button for each reason.
- **Service charge removed:** no PIN (decision 2). Every removal is counted per cashier in the morning report, with the
  share settled in cash. The fraud is a guest who hands ₹1,050 in cash, has the charge removed before the payment is
  recorded, and the cashier pocketing ₹50. It shows up as one cashier removing far more charges than the others, mostly
  on cash bills. Friday may bring ten of these, and a PIN each time would keep the manager at the till.
- **Dish removed or discount given:** PIN and reason, the same rule as cancelling a bill today.
- Either way the cashier sees the old and new totals and any offer that switches off.
**Without this** each of these is a full cancel with a PIN, and all of them look identical in the morning report.

### FR-6 · A new round after paying, or on a part-paid bill
**Scene.** 23:15, table 7 has paid ₹3,100 in full and orders two filter coffees. At table 10, one friend paid ₹2,000 of
the ₹4,800 by UPI before they ordered dessert.
**What the system does.** The new round goes on a **second bill for the same table**, and the first bill is never
touched. A bill with any payment on it is frozen, because card and UPI settlements reconcile against its total.
**Without this** there are two bad outcomes. The coffee is refused, because a paid table stops taking phone orders
(FL R18) and staff ordering at the till isn't built. Or the part-paid bill is cancelled with ₹2,000 already taken against it.
**Needs a decision** (decision 4): whether a paid table may start a new round at all.

### FR-7 · Cancel within the cashier's reach
**Scene.** Any of the above, before FR-1 to FR-5 exist.
**What the system does.** Cancel, with its PIN and reason, is on the payment screen for an issued, unpaid bill, and is
refused when any payment is on the bill.
**Without this** the only way back from a printed bill today is a developer.

## Considered and cut

| Case | Why cut |
|---|---|
| Merging two tables after one bill is printed | Rare. Settle the billed table, then merge the rest |
| Wrong table billed, noticed after printing | Rare, and it should hurt: cancel with a PIN, move the dishes, bill again |
| Leftovers packed to go on a dine-in bill | An ordinary added dish, with packing if the menu has it |
| Happy hour missed because the order was punched late | The existing line discount, with its reason, covers it. Guests on the QR menu are timed by their own order |
| Card tip on top of the bill | Built: the tip is its own field on the payment |
| Splitting one bottle by amount to hit a company's cap | Real but uncommon, and an invoice lists dishes, not amounts. Revisit if a customer asks |
| Payment app confirms but our record doesn't | Belongs to the UPI / aggregator payment module, not bill changes |

## Decisions for Shaurya

1. **Adding to a printed bill without a PIN** (FR-1), with staff-added dishes flagged in the morning report instead.
   *Must decide.* Recommended: yes.
2. **Removing service charge after printing without a PIN** (FR-5), caught by per-cashier counts and cash share.
   *Must decide.* Recommended: yes. The alternative is a PIN each time, ten times on a Friday.
3. **An order-wide offer across split bills** (FR-2). A decision exists: the SPEC_BL decision log (2026-09-15) says a split
   **drops** the bill discount on both drafts and the cashier re-applies it per draft. The code does neither: each half
   keeps the whole ₹100 (QB-1). *Must decide:* keep "drop and re-apply", or change it to share by each bill's value.
   Recommended: share by value. With "drop", a guest who splits loses the offer unless the cashier remembers to
   re-apply it, and the re-apply needs a discount with a PIN.
4. **A paid table ordering again** (FR-6): allow a second bill on the same sitting, or require a fresh sitting. *Fine
   to skip for now.* It matters once staff ordering at the till (OR) is built.

## To check before building

- A chartered accountant confirms two points: cancel-and-re-issue is correct for an unpaid B2C restaurant bill, and
  Karnataka practice on liquor and food on one paper versus separate invoices. Claude and Gemini agree on both, but
  neither is a tax authority.
- FR-1's flag depends on `placedBy` being correct for guest orders (see "Needs first").

## Consult record

Gemini 3.1 Pro via Antigravity, brief plus one rebuttal round, raw answers in the session scratchpad.
- **Kept from Gemini:** the offer can flip on a revision; the old paper stays on the table (hence "REVISED" printed
  large); a bill is frozen once any payment is on it; buttons named by intent (Add / company details / take off) instead
  of one "Revise"; alcohol on a separate bill is required, not optional; the early-leaver case.
- **Rejected:** a PIN on adding to a bill (Gemini conceded: that fraud happens at ordering); the kitchen being sent a
  duplicate order when a bill is revised (conceded: a revision sends nothing to the kitchen); service charge removal
  without a PIN only for card or UPI (conceded: the tender isn't known when the bill is revised); a PIN on splitting
  after printing (conceded: no money leaves).

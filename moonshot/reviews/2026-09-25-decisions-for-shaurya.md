# Decisions for Shaurya · after the till QA runs · 2026-09-25

**Every open question from the five till QA runs (floor, bill, tender, day close, merged groups + parcels), the
bill-change requests and the agents, in one place.** Each question gives a short scene, what the till does today, the
choices, and a recommended default with its reason. Answer inline ("yes", "default", or your own call), or say "take
all defaults except N". The bugs themselves are TD-061..098 in [TECH_DEBT.md](../TECH_DEBT.md); the run reports hold
the full evidence.

## Must decide (a fix is waiting on each)

1. **What does walked-out money become?** · unblocks TD-063, TD-064, TD-073 · QF-2, QD-1
   - *Scene.* 22:40, table 6 leaves without paying a ₹660 bill. The cashier taps Walk-out and enters the manager PIN.
   - *Today.* The till says "freed", but the tile keeps showing ₹660 and the Walk-out button forever. A new party
     seated at table 6 is hidden behind the old money (TD-063, P0). At day close the bill still reads `issued`, so the
     close refuses "Bill 0004 is still unpaid", and nothing on the till can clear it. In the run it took a backend call
     and three PINs to close one ₹66 walk-out (TD-073).
   - *Why it's stuck.* FL R14 says a table is free only when it owes nothing. The 2026-09-24 walk-out decision says a
     table that owes can be freed with a PIN. Both can't hold.
   - *Choices.* (a) The bill stays, marked "walked out" with its P0 audit row; the sitting closes; the table is free;
     day close counts the money as written off, on its own line. (b) Walk-out cancels the bill and comps the lines
     as `guest left` in one PIN'd act (the day-close agent's suggestion).
   - *Default:* (a). The morning report keeps "₹660 walked out" as its own number rather than hiding it inside comps,
     and the bill number isn't cancelled. Either choice fixes the day-close block.

2. **Cancelling a bill that is part-paid** · unblocks TD-062 (P0) · QB-2
   - *Scene.* A ₹66 bill; one friend pays ₹33 cash; then the table wants a change and the cashier cancels the bill.
   - *Today.* The cancel succeeds. The ₹33 stays recorded against the dead bill, the new bill asks for the full ₹66,
     and nothing tells the cashier. The till has no recorded way to hand the ₹33 back.
   - *Choices.* (a) Refuse the cancel while any payment is on the bill. (b) Allow it and carry the ₹33 onto the new bill.
   - *Default:* (a). Card and UPI settlements reconcile against a bill's total, so a bill with money on it should be
     frozen. The new round goes on a second bill for the same table (FR-6).

3. **An order-wide offer when a bill is split** · unblocks TD-066 · QB-1, QB-6, FR decision 3
   - *Scene.* An ₹882 order gets "₹100 off above ₹499". The table asks for two bills.
   - *Today.* Each half gets the full ₹100 off (₹198 + ₹573 = ₹771, not ₹782). A half too cheap for the offer can't be
     billed at all. No till button calls split yet, so this is P0 on the day one ships.
   - *Why it's stuck.* The written rule (SPEC_BL log 2026-09-15) says a split drops the offer on both halves and the
     cashier re-applies it per bill with a PIN. The code does neither.
   - *Choices.* (a) Keep "drop, then re-apply". (b) Share the ₹100 between the bills by each one's value.
   - *Default:* (b). With (a) the guest who splits loses the offer unless the cashier remembers to re-apply it.
     Splitting should never cost the table money.

4. **After a refund against a credit note, does the bill owe again?** · unblocks TD-071 · QT-2
   - *Scene.* A ₹66 bill is paid in full. The naan was burnt, so the cashier raises credit note CN-0001 for ₹63 and
     refunds it in cash.
   - *Today.* The bill goes back to owing ₹63 (PY-S30 wants this so a replacement dish could be paid against it). The
     floor then shows "₹63.00 due" with a Walk-out button, and day close names the bill as unpaid.
   - *Default:* the bill stays settled after such a refund. A replacement dish is a new round on a new bill. Otherwise
     the floor and day close chase money nobody owes.

5. **Adding a dish to a printed bill without a PIN** · unblocks TD-065 (P0) · QB-3, FR-1, FR decision 1
   - *Scene.* 22:10, table 12's ₹4,800 bill is on the table; they order two gulab jamun (₹240) from the QR menu.
   - *Today.* The dessert can't be billed from the till. Generate answers "already issued", and Cancel only shows on
     the bill screen right after printing; the payment screen has none.
   - *Choices.* (a) "Add to bill" re-issues the bill with the new dishes and no PIN when the total only goes up; dishes
     staff added after printing are flagged in the morning report. (b) Every change is a cancel with a manager PIN.
   - *Default:* (a). Adding to a bill creates no dish that wasn't already ordered, and thirty innocent PIN'd cancels on
     a Friday would bury the one real theft. Until FR-1 is built, Cancel goes on the payment screen (FR-7).

6. **Removing the service charge after printing, without a PIN** · FR-5, FR decision 2
   - *Scene.* Table 9 says they won't pay the 5 % service charge (it's voluntary in India).
   - *Today.* Only possible by cancelling the bill with a manager PIN.
   - *Default:* no PIN; every removal is counted per cashier in the morning report, with how many were on cash bills.
     The fraud (charge removed, cash pocketed) shows up as one cashier removing far more than the others. A PIN each
     time would keep the manager at the till ten times a Friday.

7. **Blind count vs fixing a typo in the drawer** · unblocks TD-076 · QD-4
   - *Scene.* 18:00, the cashier records ₹1,200 paid out for vegetables but types ₹12,000.
   - *Today.* Blind mode (DC R14) hides every drawer movement so the cashier can't work backwards to the expected cash.
     So the typo can't be seen, and there is no Void button (DC-S10 wants one). At close the drawer reads ₹12,000
     over, and that raises a false P0.
   - *Default:* while blind, list the movements with kind, reason, time and who, and show the amount only on the
     cashier's own rows from today. Add Void with a PIN and a reason.

8. **The PIN on a big difference gives away the blind count** · QD-9
   - *Scene.* The cashier counts ₹1,400. The till asks for a manager PIN only when the count is ₹100 or more off.
   - *Today.* The PIN box appearing (or not) tells the cashier whether she's within ₹100, before anything is saved, so
     she can recount towards the answer. Separately, the "day moved while you were counting" refusal sends the expected
     cash to the till.
   - *Default:* save the count first, then ask for the PIN. (Or ask for a PIN on every close, so it says nothing.) Drop
     the expected cash from that refusal either way.

9. **What frees a parcel ticket: the payment, or Clear?** · unblocks TD-078 · QP-1
   - *Scene.* 13:10, a walk-up pays ₹179 cash for two dosas to go on ticket P1. The next walk-up comes two minutes later.
   - *Today.* P1 stays open, reading "settled · Clear", until the cashier taps Clear. If she forgets, the next walk-up
     joins the paid customer's order and Generate refuses "already issued". The counter is stuck on the normal lunch flow.
   - *Why it's stuck.* OR-S3 says a ticket goes back to vacant when its bill is paid. PY says paying frees no table (dine-in
     tables are cleared by hand once the party leaves).
   - *Default:* for a ticket named in `ordering.takeawayTableIds`, the payment that settles its last bill ends the sitting,
     with the same `table.clear` audit row. Dine-in keeps Clear. Nobody sits at a parcel ticket, so there's nothing to wait for.

10. **The packing charge on a parcel with no food** · unblocks TD-079 · QP-2
    - *Scene.* A guest buys a beer (or a cold drink) to go.
    - *Today.* The ₹20 packing charge is taxed in the food block. With nothing from the food block on the bill, the
      preview refuses ("nothing is levied untaxed"). The screen then shows nothing, not even the Remove-packing button,
      so the counter cannot sell the drink.
    - *Choices.* (a) Keep refusing, but keep the charge controls on screen so the cashier can drop packing. (b) Leave
      the charge off by itself and print "No packing: nothing taxed as food".
    - *Default:* (b), and the screen keeps its controls on any refused preview either way.

11. **Offers on liquor** · bill report Q9
    - *Scene.* A ₹1,500 table with ₹600 of beer gets "₹100 off the order".
    - *Today.* The offer is spread over every line, beer included. The seed says liquor is never discounted. Liquor and
      food are taxed differently, so where the ₹100 lands moves tax between blocks. This can't be tested at Meghana, which
      has no liquor.
    - *Default:* liquor wins; the offer is spread over food only.

## Fine with the default (say so if not)

12. **Does a cash refund open the drawer?** (QT-6) Today the screen says it opens, and it doesn't; KT-S17 names cash takes
    only. *Default:* yes, a cash refund opens it, same as a cash take.
13. **Payment voids get their own short reason list** (wrong tender, wrong amount, entered twice, other) instead of
    sharing the discount reasons (placard, birthday…). (QT-7) *Default:* yes.
14. **A credit note for a whole dish keeps the service charge.** CN-0001 for a ₹60 naan is ₹63 (dish + tax); the bill
    was ₹66, so the ₹3 charge and its tax stay with the guest. (tender Q4) *Default:* the note also takes that dish's
    share of the service charge and its tax.
15. **A whole-bill comp leaves ₹21 packing on a parcel.** The bar says "comped to ₹0.00", the bill still owes ₹21
    (TD-068). BL-S22 says payable 0. *Default:* the comp zeroes the charges too.
16. **KITCHEN login on the till.** Today it sees the money floor, can preview bills and can read the day. (floor,
    bill Q6, day close) *Default:* the till refuses a KITCHEN login outright.
17. **SERVER login powers.** A captain can remove the service charge on a preview, and can Clear a settled table
    through the API though the screen hides the button. (QB-13, floor) *Default:* both MANAGER only, refused by the backend.
18. **Undoing a mistaken comp.** A ₹0 comp is born paid, so it has no Cancel. (bill Q8) *Default:* a credit note is
    the only way back, same as any paid bill.
19. **A dropped service charge survives a cancel and reload.** Today it's forgotten on reload, so the re-issued bill
    quietly puts the charge back (QB-10). *Default:* remember it on the draft.
20. **Merging a free table into a table whose bill is printed.** Allowed today, spec silent. The new guest's orders then
    can't be billed (TD-065). (floor, groups G10) *Default:* refuse while that bill is unpaid: "bill 0004 is open on 8;
    settle it first".
21. **Who may "retry" a day close?** Today a second manager, or even a SERVER, sending a count after the close is told
    "Day closed", as if it were their retry. (QD-7) *Default:* only the person who closed it; anyone else gets "already
    closed at 23:30 by Priya", by name and in local time.
22. **A group's bill names every table.** Today the bill and kitchen tickets for tables 10+11 say "10" (TD-080).
    *Default:* the parent plus its merged tables, fixed when the bill is issued, so the paper reads "10+11".
23. **A second phone on a busy parcel ticket.** A third walk-up scanning P1 while it's busy joins the first customer's
    order (groups P4). *Default:* a parcel ticket takes one phone, until till order entry (OR) makes phones unnecessary
    at the counter.
24. **Where the till keeps its login** (the TD-052 fix, parked by the test-stack agent). Per tab (`sessionStorage`,
    gone when the tab closes) or per browser (`localStorage`, survives a restart of a shared till). *Default:* per tab;
    a restarted till asks for a login, which is safer on a shared counter.
25. **A paid table ordering again.** Table 7 paid ₹3,100 and wants two coffees. (FR decision 4) *Default:* skip until
    staff ordering at the till (OR) is built.

## Approve, no question

26. **The parked fixes.** Each has cause, fix, callers and a waiting red test:
    [fix plan, Parked](2026-09-25-qa-fix-plan.md) (QF/QB), [tender report, Parked](2026-09-25-qa-till-tender.md) (QT),
    [day-close report, Parked](2026-09-25-qa-till-dayclose.md) (QD),
    [groups/parcels report, Parked](2026-09-25-qa-till-groups-parcels.md) (QG/QP). Once 1–11 are answered, these are
    mechanical.
27. **Backend wording** the display-fix agent parked: refusals name bill numbers, not internal ids (QB-9); the merge
    refusal says which table to pick first; the split chooser names the dishes (both need `floor-open` to send names).
28. **One line in `moonshot/CLAUDE.md` Commands** (agents may not edit it): replace "Browser sanity: `npm run e2e:ui`
    in `frontend/till/` — TO BE CREATED" with "Browser sanity: `EMU_SLOT=<n> npm run e2e:ui` in `frontend/till/`".
    Built in `9726ac4`; the builder's answers are in the [ticket](2026-09-25-ticket-till-test-stack.md).

## How to resume when you have time

1. Answer this page (10–15 minutes). Defaults are fine where you don't care.
2. Open a fresh session and paste:

```
Resume the till QA fixes. Read moonshot/STATE.md (pickup list, "QA runs 2026-09-25" line),
moonshot/reviews/2026-09-25-decisions-for-shaurya.md (my answers are inline), and TECH_DEBT TD-061..098.
1. Write each answer into the right spec sheet's Decisions table (FL, BL, PY, ST, DC, OR) and propose any
   STATE.md decision diff to me.
2. Fix in this order, one commit each, red test first (most already exist, marked known bug: drop the mark):
   TD-061, TD-062, TD-063+064+073, TD-065 (FR-7 Cancel on tender first), TD-089, TD-090, TD-078, TD-079, TD-066, TD-067,
   TD-068, TD-069, TD-070, TD-071, TD-074..076, TD-080, then TD-091..094, TD-082, TD-084..086, TD-095..098, and TD-072, TD-077, TD-081, TD-083, TD-087, TD-088's small ones
   (TD-084..087 are the kitchen and waiter apps' own: Flutter, not the till).
3. Money paths: run the moonshot-review subagent before each commit. Ask me only where my answer is missing.
```

3. After the fixes, the next QA run is the waiter app (not yet planned). The till's floor, bill, tender, day close,
   merged groups and parcels are done.

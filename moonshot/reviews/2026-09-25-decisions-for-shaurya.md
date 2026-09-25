# Decisions for Shaurya · after the QA runs · 2026-09-25

**Every open question from the QA runs (till floor, bill, tender, day close, groups + parcels; the waiter, kitchen,
guest and admin apps), the bill-change requests and the agents, in one place.** Duplicates are merged: each question
lists the old numbers and TD rows it absorbed. The bugs are TD-061..131 in [TECH_DEBT.md](../TECH_DEBT.md); the run
reports hold the evidence. Answers given on 2026-09-25 are marked **Decided**; the fixer writes each into the right
spec sheet's Decisions table before fixing.

## Decided 2026-09-25

**D1. Walk-out money becomes its own write-off line.** · TD-063, TD-064, TD-073 · QF-2, QD-1 (was #1)
- *Scene.* 22:40, table 6 leaves without paying a ₹660 bill; the cashier taps Walk-out with the manager PIN.
- *Decided.* The bill stays, marked "walked out", with its audit row. The sitting closes and the table is free. Day
  close shows "₹660 walked out" on its own line, not inside comps. The bill number is not cancelled.
- *For the fixer.* This replaces FL R14 ("free only when nothing is owed") for the walk-out case. A part-paid table
  that walks out writes off only the unpaid part.
- *Unbilled food (asked 2026-09-25).* A walk-out on food never billed issues the numbered bill itself (no paper) and
  marks it walked out at once, so every walk-out is one numbered bill at what the guest would have paid.

**D2. One "Edit bill" button on the till; waiters get no bill powers.** · TD-065 (P0), TD-066, TD-097, TD-120, FR-1,
FR-5, FR-7 · QB-1, QB-3, QB-6, QB-10 (was #3, #5, #6, #19, #20, #25)
- *Scene.* 22:10, table 12's ₹4,800 bill is on the table. They order two gulab jamun, then ask for the beer on a
  separate bill, and to drop the 5 % service charge.
- *Decided.* The cashier taps **Edit** on the unpaid printed bill. The old number is cancelled with the reason
  "edited" (BL-S9's existing cancel: dishes return to the draft), and the new bill records which one it replaced. The
  cashier adds the new round, splits by dish, or removes the service charge, then prints again.
- *PIN.* None for adding dishes, splitting or removing the service charge. A PIN only for removing a dish or a
  discount above the limit. The morning report counts edits and service-charge removals per cashier.
- *Offer on a split.* Whether the table qualifies is judged on the whole table (as the guest did qualify). The
  amount is shared across the split bills by value, the same rule BL-S3 uses for a bill discount. No half is
  re-checked against the ₹499 minimum.
- *Why cancel-and-reprint, not an "edited" tag on the same bill.* BL R4 says an issued bill never changes (GST: the
  series must be honest, and CGST s.34 governs changes to paid invoices). Reports, day close, receipts and payments
  all assume a printed bill is frozen. The cancel path already exists and is tested; an edit-in-place would touch
  all of them.
- *Paid table.* A paid table takes no new rounds and no new guest until Clear ("table 12 has paid — clear it first").
  Merging a free table into a table with a printed, unpaid bill is refused.
- *Paid vs printed (asked 2026-09-25).* Printed but not paid: new dishes go onto the same bill through Edit. Fully
  paid: the table is cleared and opened again (new sitting, new bill) for the late coffees. Don't mix the two.
- *Waiter app.* No bill editing (side deals). This keeps the change to the till only.

**D3. "Edit bill" is refused once any money is on the bill.** · TD-062 (P0) · QB-2 (was #2)
- *Why.* Shaurya: a table doesn't pay part of a bill and then reorder. Friends paying ₹500 + ₹700 towards one ₹1,200
  bill is normal and already works: the bill stays `part-paid` until the last payment settles it.
- *Decided.* Edit and Cancel are refused while any payment is on the bill: "₹500 already paid on A-0004 — take the
  rest first". If the table then leaves without paying the rest, that's a walk-out of the unpaid part (D1).
- *A new round during payment (asked 2026-09-25).* Part-paid is only the seconds between two payments on one bill.
  A new round then waits: "A-0004 is being paid — finish the payment, then add". If the dessert must go on that bill,
  the cashier voids the payment (existing, recorded), edits, and takes it again. No automatic carrying of payments.

**D4. The waiter app's Cancel Order.** · TD-089 (P0), TD-092
- *Scene.* 20:10, a guest changes their mind about a Butter Naan.
- *Decided.* A cancel always takes the dish off the bill and off the kitchen, with an audit row. There's no PIN. Once
  the kitchen has started, the waiter decides: tell the guest it can't be cancelled (it stays on the bill), or accept
  it and waste the dish. Dishes made then cancelled are audited, with no money effect. Once the bill is printed, only
  the till's Edit bill changes it (D2).
- *For the fixer.* This relaxes ST-S5 ("voiding a line the kitchen started needs a PIN") for the waiter app. Record
  it in ST's Decisions. Mark Paid wasn't discussed; default: removed from the waiter app, because the till owns
  payment (TD-010).
- *One dish, not the whole round (asked 2026-09-25).* The waiter app gets a per-dish cancel on a sent round (same
  `voidCartLines` path, one line). Removing a dish still in the cart before sending already exists
  (`cart-removeItemFromCart`); after sending, today only a whole round can be cancelled.

**D5. The guest's shared cart asks what to send.** · TD-119 · QG-2
- *Found.* Each dish records who added it (`addedBy`), and on 2026-09-16 you decided each phone sends only its own.
  The bug is the screen: "To Pay ₹340" is the whole table, while Proceed sends only this phone's ₹60.
- *Decided.* The cart shows "Your dishes ₹60 · Table ₹340". Proceed asks "Send your 1 dish" or "Send all 3 for the
  table". Checkout already sends the whole cart when no `addedBy` is given, so this is mostly a screen change.
- *Refined after the code trace (2026-09-25).* "Send all" means **every guest's dishes, never the waiter's or the
  till's** (their own Send must keep working). The phone sends the list of dishes it showed, and the backend sends
  exactly those, like the existing `addedBy` filter; a dish a friend added in the meantime stays in the cart for next
  time. No refusal, no extra tap. Note from the trace: the guest app overwrites `addedBy` on every checkout
  (`dio_client.dart:191`), and a checkout with no `addedBy` records the order as placed by "system" and sweeps in staff
  dishes, so don't reuse that branch.

**D6. Admin edits to add-ons and portions apply everywhere.** · TD-106 (P0), TD-107 (P0), TD-110
- *Found.* Pricing and stock already read the shared add-on and portion records (`restaurants/{id}/addons`,
  `/variants`), so every dish using them follows. But no endpoint writes those records: the admin dish editor only
  changes the dish's own copy. The only such code, [menu/creation/variant.js](../../backend/src-plattr/functions/menu/creation/variant.js),
  writes a top-level `variants` collection that nothing reads. Removing an add-on from one dish already exists in the
  dish editor ([addon_editor_dialog.dart](../../frontend/src-platter-apps/apps/platter_admin/lib/pages/menu/editors/addon_editor_dialog.dart)).
- *Decided.* A price, name or stock change on an add-on or portion edits the shared record, and the editor says so:
  "Raita is on 6 dishes — this changes all 6". Out of stock is respected everywhere, guest app first. If a dish
  shouldn't offer an add-on, the manager removes it from that dish (disassociate). The dish editor saves only the
  fields it changed and add-ons as ids (fixes TD-106 and TD-110).
- *Blanket or one dish (asked 2026-09-25, decided from the construct).* Add-ons and portions are shared records that
  dishes link to by id, and pricing reads the shared record. So an edit applies to every linked dish by default; when
  the record is shared, the editor also offers "only this dish", which copies it into a new record and relinks that
  dish. Pricing code stays untouched.
- *Add-on stock (asked 2026-09-25).* The admin app and the waiter app's existing stock screen can both switch an
  add-on off, on the same shared record.
- *For the fixer.* One new admin endpoint for the shared add-on and portion records; pricing code untouched.
  `menu/creation/variant.js` looks dead: confirm no caller, then delete it.
  The trace confirmed it, `menu_add.js` and `menu_remove.js` are dead (their `require` paths don't exist): delete all three.

**D7. Partner payments (Dineout, EazyDiner, Swiggy Dineout) are payment methods with a reference.** (asked 2026-09-25)
- *Scene.* The guest pays through Dineout; the restaurant confirms it later from a screenshot.
- *Decided.* Add each partner as an `external` method in the restaurant's `payments.tenders[]` config with `needsRef`;
  the cashier picks it and types the reference. Checking the partner's settlement stays manual. Config only, no code;
  day close totals each method, which makes the next-day check easy.

**Everything else from the [impact review](2026-09-25-decisions-impact.md)** takes its recommended default: Q1-2, Q1-3
(a guest who comes back pays on the walked-out bill), Q1-4, Q2-2..Q2-5 (Edit ships without a PIN; TD-005, the report
that reads audit rows, goes on the pickup list before any real outlet), Q4-1, Q4-2, Q6-2 (price fixed when added to
the cart), Q6-3.

## Must decide (a fix is waiting on each)

1. **Blind count vs the drawer** (two sides of one rule) · TD-076 · QD-4, QD-9 (was #7, #8)
   - *Typo.* 18:00, the cashier records ₹1,200 paid out for vegetables but types ₹12,000. Blind mode hides every
     drawer movement, so the typo can't be seen and has no Void. At close the drawer reads ₹12,000 over, a false P0.
   - *Leak.* The till asks for a manager PIN only when the count is ₹100 or more off. The PIN box appearing tells the
     cashier whether she's within ₹100 before anything is saved, so she can recount towards the answer.
   - *Default:* while blind, list movements with kind, reason, time and who, with amounts only on the cashier's own
     rows from today. Add Void with a PIN and a reason. Save the count first, then ask for the PIN. Drop the expected
     cash from the "day moved while you were counting" refusal.

2. **A parcel ticket's life: what frees it, and who can join** · TD-078 · QP-1, groups P4 (was #9, #23)
   - *Scene.* 13:10, a walk-up pays ₹179 cash for two dosas to go on P1. The next walk-up comes two minutes later.
   - *Today.* P1 stays open ("settled · Clear") until the cashier taps Clear. If she forgets, the next walk-up joins
     the paid customer's order. A third phone scanning a busy P1 also joins the first customer's order.
   - *Default:* for a ticket in `ordering.takeawayTableIds`, the payment that settles its last bill ends the sitting
     (same `table.clear` audit row); dine-in keeps Clear. A parcel ticket takes one phone until till order entry (OR).

3. **The packing charge on a parcel with no food** · TD-079 · QP-2 (was #10)
   - *Scene.* A guest buys a beer to go. The ₹20 packing is taxed in the food block, and with no food on the bill the
     preview refuses and the screen goes blank, so the drink can't be sold.
   - *Default:* leave packing off by itself and print "No packing: nothing taxed as food"; the screen keeps its
     controls on any refused preview.

4. **Offers on liquor** · bill report Q9 (was #11)
   - *Scene.* A ₹1,500 table with ₹600 of beer gets "₹100 off the order". Today the offer is spread over the beer too,
     which moves tax between blocks; the seed says liquor is never discounted.
   - *Default:* the offer is spread over food only. On a food/alcohol split (D2) the whole offer lands on the food bill.

5. **Credit notes: what they include, and what happens after the refund** · TD-071 · QT-2, tender Q4 (was #4, #14)
   - *Scene.* A ₹66 bill is paid. The naan (₹60) was burnt; the cashier raises CN-0001 and refunds in cash.
   - *Today.* The note is ₹63 (dish + tax), so the ₹3 service charge and its tax stay with the guest. After the
     refund the bill owes ₹63 again, the floor shows "₹63.00 due" with a Walk-out button, and day close names it unpaid.
   - *Default:* the note also takes that dish's share of the service charge and its tax, and the bill stays settled
     after the refund. A replacement dish is a new round on a new bill.

6. **What each login may do** · TD-115, TD-116 · QB-13, floor, bill Q6 (was #16, #17)
   - *Today.* A KITCHEN login sees the money floor on the till. A SERVER can remove the service charge on a preview and
     Clear a table through the API. A MANAGER (including the shared `till@`) can raise its own no-PIN discount limit to
     100 %, unaudited. A deactivated manager's live session can still issue bills and change settings.
   - *Default:* the till refuses KITCHEN and SERVER logins for money acts (MANAGER only, refused by the backend).
     Changing approval limits writes an audit row and is flagged in the morning report ("catch it, don't cage it").
     Every staff endpoint checks the staff member is still active (one shared session check).

## Fine with the default (say so if not)

7. **Does a cash refund open the drawer?** (QT-6) Today the screen says it opens and it doesn't. *Default:* yes.
8. **Payment voids get their own reason list** (wrong tender, wrong amount, entered twice, other). (QT-7) *Default:* yes.
9. **A whole-bill comp leaves ₹21 packing on a parcel** (TD-068). *Default:* the comp zeroes the charges too.
10. **Undoing a mistaken comp.** A ₹0 comp is born paid. *Default:* a credit note is the only way back.
11. **Who may "retry" a day close?** (QD-7) *Default:* only the person who closed it; anyone else gets "already
    closed at 23:30 by Priya".
12. **A group's bill names every table** (TD-080). *Default:* "10+11" on the bill and tickets, fixed at issue.
13. **Where the till keeps its login** (TD-052). *Default:* per tab (`sessionStorage`); a restarted till asks again.
14. **An expired guest session when the waiter adds dishes** (TD-090, P0). *Default:* OR-S19: extend the old
    session, never start a second one; Clear refuses while any sitting on the table owes.
15. **A captain's own round with the waiter gate on** (TD-094). *Default:* a staff round goes straight to the kitchen.
16. **A sold-out dish on the guest menu** (the guest and admin grids disagree). *Default:* shown greyed with
    "Sold out", not hidden, so a guest who wanted it knows why.
17. **Offer and discount limits** (TD-108, TD-109). *Default:* refuse a percentage above 100 or below 0 at the
    admin endpoint; the till's refusal must not outlive a deleted offer.

## Approve, no question

18. **The parked fixes.** Each has cause, fix, callers and a waiting red test:
    [fix plan, Parked](2026-09-25-qa-fix-plan.md) (QF/QB), [tender report, Parked](2026-09-25-qa-till-tender.md) (QT),
    [day-close report, Parked](2026-09-25-qa-till-dayclose.md) (QD),
    [groups/parcels report, Parked](2026-09-25-qa-till-groups-parcels.md) (QG/QP), and the
    [waiter](2026-09-25-qa-waiter-app.md), [kitchen](2026-09-25-qa-kitchen-app.md) and
    [admin/guest API pass](2026-09-25-qa-admin-guest-api-pass.md) reports.
19. **Backend wording** the display-fix agent parked: refusals name bill numbers, not internal ids (QB-9); the merge
    refusal says which table to pick first; the split chooser names the dishes.
20. **One line in `moonshot/CLAUDE.md` Commands** (agents may not edit it): replace "Browser sanity: `npm run e2e:ui`
    in `frontend/till/` — TO BE CREATED" with "Browser sanity: `EMU_SLOT=<n> npm run e2e:ui` in `frontend/till/`".
    Built in `9726ac4`.
21. **A knob on the browser guard** (blocked for agents by the permission check, so it's yours to approve): let
    [scripts/ab.sh](../../scripts/ab.sh) take `AB_CHROME_MAX_GB` (default 4.0) so a run can go ahead when you
    accept your Chrome being over 4 GB. The free-memory check (2 GB) stays.

## How to resume when you have time

1. Answer 1–6 above (defaults are fine where you don't care), and 7–17 only where you disagree.
2. Open a fresh session and paste:

```
Resume the QA fixes. Read moonshot/STATE.md (pickup list, "QA runs 2026-09-25" line),
moonshot/reviews/2026-09-25-decisions-for-shaurya.md (D1–D6 decided, the rest answered inline), and TECH_DEBT TD-061..131.
1. Write each decision into the right spec sheet's Decisions table (FL, BL, PY, ST, DC, OR) and propose any
   STATE.md decision diff to me.
2. Fix in this order, one commit each, red test first (most already exist, marked known bug: drop the mark):
   P0s: TD-061, TD-062 (D3), TD-063+064+073 (D1), TD-065 + the Edit bill button (D2), TD-089 (D4), TD-090,
   TD-106+107+110 (D6), TD-108, TD-109. Then TD-078, TD-079, TD-066 (D2 offer share), TD-067..071, TD-074..076,
   TD-080, TD-091..094, TD-082, TD-084..086, TD-099, TD-100, TD-095..098, TD-101..105, TD-111..120 (TD-119 = D5),
   and the small ones TD-072, TD-077, TD-081, TD-083, TD-087, TD-088.
   (TD-084..105 are the Flutter apps' own; TD-106..118 the admin app and its endpoints.)
3. Money paths: run the moonshot-review subagent before each commit. Ask me only where my answer is missing.
```

3. Still to run on screen when the browser is free: the guest app ([grid](2026-09-25-grid-guest-app.md)) and the
   admin app ([grid](2026-09-25-grid-admin-app.md)), including the screen half of TD-106, TD-110, TD-117 and TD-119.

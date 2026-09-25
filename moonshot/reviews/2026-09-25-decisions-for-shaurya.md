# Decisions for Shaurya · after the till QA runs · 2026-09-25

**Every open question from the three QA runs, the bill-change requests and the agents, in one place.** Each has a
recommended default. Answer inline (write "yes", "default", or your call), or say "take all defaults except N".
The bugs themselves are TD-061..072 in [TECH_DEBT.md](../TECH_DEBT.md).

## Must decide (a fix is waiting on each)

1. **What does walked-out money become?** (TD-064, QF-2) FL R14 says a table is free only with no open money; the
   2026-09-24 walk-out decision says a table that owes can be freed with a PIN. Both can't hold.
   *Default:* the bill stays, marked walked-out with its P0 audit row; the sitting closes; the table is free; the
   money counts as written off in the day close.
2. **Cancelling a part-paid bill.** (TD-062, QB-2) Refuse it, or carry the ₹33 already taken onto the new bill?
   *Default:* refuse while any payment is on it. The new round goes on a second bill (FR-6).
3. **An order-wide offer on a split bill.** (TD-066, QB-1, FR decision 3) The written rule (SPEC_BL log 2026-09-15)
   drops it on both halves; the code gives the whole ₹100 to each.
   *Default:* share it by each bill's value, so splitting never costs the table money.
4. **After a refund against a credit note, is the bill owing or done?** (TD-071, QT-2) PY-S30 says owing; the floor
   and day close then chase money nobody owes. *Default:* done. A replacement dish is a new round.
5. **Adding to a printed bill without a PIN.** (TD-065, QB-3, FR-1, FR decision 1) *Default:* yes, no PIN when the
   bill only goes up; staff-added dishes flagged in the morning report. Until FR-1 exists, Cancel goes on the tender
   screen (FR-7).
6. **Removing service charge after printing without a PIN.** (FR-5, FR decision 2) *Default:* yes, counted per
   cashier in the morning report.
7. **Offers on liquor.** (bill report Q9) R1 spreads an ORDER offer over every line, and the seed says liquor is
   never discounted. *Default:* liquor wins; the offer is spread over food only. (Tax moves between blocks otherwise.)

## Fine with the default (say so if not)

8. **Cash refund kicks the drawer?** (QT-6) *Default:* yes, same as a cash take.
9. **Payment voids get their own short reason list** (wrong tender, wrong amount, entered twice, other)? (QT-7)
   *Default:* yes.
10. **A whole-dish credit note keeps the service charge** (₹63 back on a ₹66 bill). (tender Q4) *Default:* the note
    takes the dish's share of the service charge and its tax too.
11. **A whole-bill comp takes the packing charge too?** (QB-5, BL-S22 says payable 0) *Default:* yes.
12. **KITCHEN login on the till** sees the money floor and can preview bills. (floor, bill Q6) *Default:* the till
    refuses a KITCHEN login.
13. **SERVER login:** can remove the service charge on the preview, and can Clear a settled table through the API
    though the screen hides it. (QB-13, floor) *Default:* both are MANAGER/cashier only, refused by the backend.
14. **Undoing a mistaken comp:** a ₹0 comp is born paid with no Cancel. (bill Q8) *Default:* a credit note is the
    only way back, same as any paid bill.
15. **A dropped service charge survives a cancel and reload?** (QB-10) *Default:* yes, remembered on the draft.
16. **Merging a free table into a billed parent** is allowed today, spec silent. (floor) *Default:* allow.
17. **A paid table ordering again.** (FR decision 4) *Default:* skip until staff ordering at the till (OR) is built.

## Approve, no question

18. **The parked fixes.** Each has cause, fix, callers and a waiting red test:
    [fix plan, Parked](2026-09-25-qa-fix-plan.md) (QF/QB) and [tender report, Parked](2026-09-25-qa-till-tender.md)
    (QT). Once 1–7 are answered, these are mechanical.
19. **Backend wording** the display-fix agent parked: refusals name bill numbers, not internal ids (QB-9); the merge
    refusal says which table to pick first; the split chooser names the dishes (both need `floor-open` to send names).

Still with the agents, not you: the till test-stack ticket's builder questions
([ticket](2026-09-25-ticket-till-test-stack.md)); agent B answers those itself.

## How to resume when you have time

1. Answer this page (10 minutes). Defaults are fine where you don't care.
2. Open a fresh session and paste:

```
Resume the till QA fixes. Read moonshot/STATE.md (pickup list, "QA runs 2026-09-25" line),
moonshot/reviews/2026-09-25-decisions-for-shaurya.md (my answers are inline), and TECH_DEBT TD-061..072.
1. Write each answer into the right spec sheet's Decisions table (FL, BL, PY, ST) and propose any
   STATE.md decision diff to me.
2. Fix in this order, one commit each, red test first (most already exist, marked known bug: drop the mark):
   TD-061, TD-062, TD-063+064, TD-065 (FR-7 Cancel on tender first), TD-066, TD-067, TD-068, TD-069,
   TD-070, TD-071, then TD-072's small ones.
3. Money paths: run the moonshot-review subagent before each commit. Ask me only where my answer is missing.
```

3. After the fixes, the next QA run is the waiter app (not yet planned) or the day close.

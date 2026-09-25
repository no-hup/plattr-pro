# Decisions for Shaurya · after the till QA runs · 2026-09-25

**Every open question from the four QA runs (floor, bill, tender, day close), the bill-change requests and the agents, in one place.** Each has a
recommended default. Answer inline (write "yes", "default", or your call), or say "take all defaults except N".
The bugs themselves are TD-061..077 in [TECH_DEBT.md](../TECH_DEBT.md).

## Must decide (a fix is waiting on each)

1. **What does walked-out money become?** (TD-064, QF-2) FL R14 says a table is free only with no open money; the
   2026-09-24 walk-out decision says a table that owes can be freed with a PIN. Both can't hold.
   *Default:* the bill stays, marked walked-out with its P0 audit row; the sitting closes; the table is free; the
   money counts as written off in the day close.
   The day-close run adds TD-073: today a walk-out bill blocks the close with no till way out. The day-close agent's
   alternative: Walk-out cancels the bill and comps the lines as `guest left` in one PIN'd act. Either answer fixes it.
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
7. **Blind count vs fixing a typo.** (TD-076, QD-4) Blind mode (DC R14) hides the drawer movements, so a ₹12,000
   typo for ₹1,200 can't be seen or voided (DC-S10). *Default:* while blind, list movements without amounts, and add
   Void with a PIN.
7b. **The PIN over ₹100 leaks the blind figure.** (QD-9) Asking for a PIN only when the count is ₹100+ off tells the
   cashier she is close. *Default:* record the count first, then ask the PIN; or ask a PIN on every close.
7c. **Offers on liquor.** (bill report Q9) R1 spreads an ORDER offer over every line, and the seed says liquor is
   never discounted. *Default:* liquor wins; the offer is spread over food only. (Tax moves between blocks otherwise.)

## Fine with the default (say so if not)

8. **Cash refund kicks the drawer?** (QT-6) *Default:* yes, same as a cash take.
9. **Payment voids get their own short reason list** (wrong tender, wrong amount, entered twice, other)? (QT-7)
   *Default:* yes.
10. **A whole-dish credit note keeps the service charge** (₹63 back on a ₹66 bill). (tender Q4) *Default:* the note
    takes the dish's share of the service charge and its tax too.
11. **A whole-bill comp takes the packing charge too?** (QB-5, BL-S22 says payable 0) *Default:* yes.
12. **KITCHEN login on the till** sees the money floor, can preview bills and read the day. (floor, bill Q6, QD) *Default:* the till
    refuses a KITCHEN login.
13. **SERVER login:** can remove the service charge on the preview, and can Clear a settled table through the API
    though the screen hides it. (QB-13, floor) *Default:* both are MANAGER/cashier only, refused by the backend.
14. **Undoing a mistaken comp:** a ₹0 comp is born paid with no Cancel. (bill Q8) *Default:* a credit note is the
    only way back, same as any paid bill.
15. **A dropped service charge survives a cancel and reload?** (QB-10) *Default:* yes, remembered on the draft.
16. **Merging a free table into a billed parent** is allowed today, spec silent. (floor) *Default:* allow.
16b. **Who may "retry" a day close?** (QD-7) *Default:* only the person who closed it; anyone else gets "already
    closed at 23:30 by Priya".
16c. **Where the till keeps its login** (TD-052 fix, parked by the test-stack agent): per tab (`sessionStorage`, gone
    when the tab closes) or per browser (`localStorage`, survives a restart of a shared till). *Default:* per tab.
17. **A paid table ordering again.** (FR decision 4) *Default:* skip until staff ordering at the till (OR) is built.

## Approve, no question

18. **The parked fixes.** Each has cause, fix, callers and a waiting red test:
    [fix plan, Parked](2026-09-25-qa-fix-plan.md) (QF/QB) and [tender report, Parked](2026-09-25-qa-till-tender.md)
    (QT), [day-close report, Parked](2026-09-25-qa-till-dayclose.md) (QD). Once 1–7c are answered, these are mechanical.
19. **Backend wording** the display-fix agent parked: refusals name bill numbers, not internal ids (QB-9); the merge
    refusal says which table to pick first; the split chooser names the dishes (both need `floor-open` to send names).

The till test-stack ticket's builder questions are answered in the [ticket](2026-09-25-ticket-till-test-stack.md)
(built in `9726ac4`). One proposed line for `moonshot/CLAUDE.md` Commands, yours to approve: "Browser sanity:
`EMU_SLOT=<n> npm run e2e:ui` in `frontend/till/`" in place of "— TO BE CREATED".

## How to resume when you have time

1. Answer this page (10 minutes). Defaults are fine where you don't care.
2. Open a fresh session and paste:

```
Resume the till QA fixes. Read moonshot/STATE.md (pickup list, "QA runs 2026-09-25" line),
moonshot/reviews/2026-09-25-decisions-for-shaurya.md (my answers are inline), and TECH_DEBT TD-061..077.
1. Write each answer into the right spec sheet's Decisions table (FL, BL, PY, ST) and propose any
   STATE.md decision diff to me.
2. Fix in this order, one commit each, red test first (most already exist, marked known bug: drop the mark):
   TD-061, TD-062, TD-063+064, TD-065 (FR-7 Cancel on tender first), TD-066, TD-067, TD-068, TD-069,
   TD-070, TD-071, TD-073..076 (TD-073 lands with TD-063/064), then TD-072 and TD-077's small ones.
3. Money paths: run the moonshot-review subagent before each commit. Ask me only where my answer is missing.
```

3. After the fixes, the next QA run is the waiter app (not yet planned). The till's floor, bill, tender and day close are done.

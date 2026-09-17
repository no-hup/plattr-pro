# FL · e2e plan (becomes `floor.js` in phase 4)

The runner discovers `suites/*.js` and has no pending state: a skeleton suite dropped here now
would be red on every other session's full run for two phases, and would tell nobody anything
they do not already know from this file. So the scenarios live here until `floor-get`,
`floor-open` and `table-moveTable` exist, then this file becomes `floor.js` and is deleted.

Fixtures this suite seeds and deletes itself, so it reruns without a reset. Dedicated tables, so
no other suite's seed can move underneath it. Minor units throughout; food block is exclusive
CGST 2.5 + SGST 2.5.

```
table_fl_12   seated 20:00. Lines on session sess_fl_12, all unbilled:
              fl_tikka    listPrice 32000                      → net 32000
              fl_pitcher  listPrice 125000, offer 10000        → net 115000
              fl_biryani  listPrice 45000, countsTowardTotal=false (voided) → net 0
              onTable = 147000p.   FL-S19 asserts exactly this, and that it is NOT the bill:
              the bill adds service charge, so a test that compares them is wrong by design.
table_fl_7    bill fl_0701 issued 100000p, take fl_t1 cash 40000 → unpaid 60000p
table_fl_5    parent; table_fl_6 mergedInto table_fl_5. Group lines total 412000p
table_fl_9    vacant on all five counts (R6): status vacant, no session, no currentOTP,
              no mergedInto, not a parent
table_fl_19   vacant, nothing ever placed
table_fl_out  status disabled (out of service) with 234000p open on sess_fl_out
staff         manager@fl.test MANAGER pin 1234 · server@fl.test SERVER pin 1234
```

| Scenario | Call | Expected |
|---|---|---|
| FL-S1 | `floor-get` | 6 tiles in one answer; table_fl_12 onTable 147000, minutes ≥ 0 and computed server-side |
| FL-S6 | `floor-get` | one tile for 5+6 reading 412000; no tile whose id is table_fl_6 (R9) |
| FL-S5 | `floor-get` | a scanned table with no lines is seated at 0, not absent and not free |
| FL-S19 | `floor-get` | onTable 147000 exactly; the voided 45000 is not in it; no service charge in it |
| FL-S22 | `floor-get` | table_fl_7 unpaid 60000, not 100000, not 0 |
| FL-S20 | `floor-get` | after adding 30000 post-issue: unpaid 200000 AND onTable 30000, two numbers (R11) |
| FL-S17 | `billing-cancel` then `floor-get` | the cancelled bill's money is back on onTable; a second issued bill still shows |
| FL-S21 | `billing-split` ×3 then `floor-get` | drafts length 3, total still 300000 — proves R2 reads sessionId, not draftId |
| FL-S30 | `floor-get` | table_fl_out still returns a tile with 234000 (R17) |
| FL-S34 | expire sess_fl_7, `floor-get` | the tile still shows its money after the 4-hour session expiry |
| FL-S2 | `floor-open` | table_fl_12 → drafts:[one draft], 3 counting lines |
| FL-S3 | `floor-open` | table_fl_7 → the issued bill for tender, never a new draft |
| FL-S4 | `floor-open` | table_fl_19 → nothing open, and no draft is created as a side effect |
| FL-S7 | `table-setMerge` manager | 5+6 merged; audit row names the staff and both children |
| FL-S9 | `table-setMerge` | merging occupied table_fl_12 → failed-precondition, child not vacant |
| FL-S26 | `table-setMerge` | merging table_fl_6 (already a child) into another parent → refused |
| FL-S27 | `table-setMerge {merge:false}` | group holds 412000 → failed-precondition /bill it or move it/ (R14) |
| FL-S8 | `table-setMerge {merge:false}` | after billing and settling the group: all children released at once (OR-5a) |
| FL-S29 | `table-setMerge` as server@fl.test | permission-denied 403, and NO `requires:'pin'` in the answer |
| FL-S32 | two `table-setMerge` in flight | exactly one commits; the loser is refused, not silently overwritten |
| FL-S10 | `table-moveTable` 4 → 9 | session tableId, cart doc, open order tableId and every unbilled line move together |
| FL-S28 | `table-moveTable` | the open order's tableId is table_fl_9 afterwards; the runner is sent the right way |
| FL-S24 | `table-moveTable` | any line carrying a billId → failed-precondition, nothing written |
| FL-S33 | `table-moveTable` onto table_fl_6 | disabled + mergedInto + no session → still refused (R6) |
| FL-S11 | `table-moveTable` onto an occupied table | refused |
| FL-S12 | `table-moveTable` of a merged parent | refused, message says release the merge first |
| FL-S25 | guest OTP on table_fl_9 after the move | joins the moved sitting; no second session is minted |
| FL-S13 | guest OTP on table_fl_4 after the move | opens a NEW sitting; the old QR is dead by design |
| FL-S16 | `order-updateOrderStatus` COMPLETED then `floor-get` | the tile still shows 234000: money outranks the session (R14) |
| FL-S14 | settle every bill, then guest OTP | the settled sitting refuses the new user and the new checkout (R18) |
| FL-S35 | comp to 0 and settle | reads settled exactly like a paid table |
| FL-S18 | `audit` after a move | one row, staff name, both table numbers, the minute, the sitting cid |

# FL · Floor & moves

Status: **draft v3** (2026-09-17). Session `plattr-pro-d3`. v2 merged the Gemini fan-out and the donor review; v3 merges Grok's pass, which invalidated eight scenarios and the return shape.

**Job.** Show the cashier every table at a glance, get them from a table to its money in one tap, and let them merge, unmerge and move a party without leaving the till.

The floor is the till's home screen — what is on the display between bills, which on a Friday night is most of the evening. It is the only screen a cashier looks at without being asked to.

## What the cashier sees

One tile per **sitting**. Each tile answers three questions in the time it takes to glance: is anyone there, what do they owe, and can I bill them.

A tile carries **two independent numbers**, never one status word. Order lifecycle already says states are separate axes, not one enum, and a table that has been billed and then ordered dessert is exactly that case.

| On the tile | Means |
|---|---|
| `onTable` | Paise of placed lines on no bill yet, across **every** draft of the sitting |
| `unpaid` | Paise still owed across **every** issued, uncancelled bill of the sitting |
| `drafts` | One row per draft and per bill, because a split makes several of both |
| `since` | The earliest `placedAt` of a counting line, else the session's start |

The word on the tile is derived from those, never stored:

| Reads | When | Tap does |
|---|---|---|
| `free` | **No open money in the group**, and no active session | Nothing. Says "nobody here" |
| `seated` | Session open, nothing placed | Nothing to bill yet |
| `₹1,560` | `onTable` > 0, nothing issued | Opens that draft's bill |
| `₹600 due` | One issued bill is short | Opens tender for it |
| `₹600 due · ₹300 new` | Both | Opens a chooser |
| `₹1,150 · 2 drafts` | A split, more than one thing to open | Opens a chooser, never guesses |
| `settled` | No open money, session not yet ended | Opens the paid bill |

`free` is the one that has to be right. It means **no open money**, not "no active session". A captain who marks an order COMPLETED runs `vacateTable` today and ends the session while the bill is unpaid — and a tile that goes pale with ₹2,340 still out is a table the next walk-in is seated on.

A merged group draws as **one** tile with the parent's number and a "+6" mark. One tile, never two greyed ones: two tiles for one bill is how a table gets billed twice.

## Scenarios

| ID | Scene and what happens | Tag |
|---|---|---|
| FL-S1 | **Friday, 20:40.** Cashier glances at the till between bills. 24 tiles. Table 12 reads `₹2,340 · 48 min`, table 7 reads `₹860 · 12 min`, nine tiles are pale and empty. No tapping, no menu. | Screen |
| FL-S2 | **One tap to the money.** Table 12 asks for the bill. The cashier taps tile 12 and the draft is on screen with its nine lines. No table number typed, no search. | Screen |
| FL-S3 | **Tapping twice cannot double-issue one draft.** Table 7's bill printed four minutes ago. Tapping tile 7 opens tender for it. `billing-issue` would refuse a second invoice on that draft anyway; the floor must not invite the attempt. This holds per draft, not per sitting — a split sitting is *meant* to have a second invoice. | Engine |
| FL-S4 | **Empty table.** Cashier taps tile 19, which nobody is sitting at and which owes nothing. Nothing opens. | Engine |
| FL-S5 | **Scanned, not ordered.** A party scans table 3 at 20:02 and reads the menu for ten minutes. Tile 3 shows seated and `₹0`. | Engine |
| FL-S6 | **The party of eight.** Tables 5 and 6 are pushed together. The floor draws **one** tile, "5+6", `₹4,120`. | Screen |
| FL-S7 | **Merging from the till.** 20:15, a party of eight arrives, the captain is across the room. Cashier taps Merge, picks 5, picks 6, confirms. The two tiles become one. An audit row names the cashier. | Engine |
| FL-S8 | **Unmerging.** The party of ten at 5+6+7 loses two people at 21:30, but ₹6,400 is on the group, so unmerge is refused outright (FL-S27) — bill it or move it first. Only a group with nothing open can be released, and then it releases **all** its children at once and the cashier re-merges what is still wanted (OR-5a). Releasing everything is cheap precisely because nothing was open. | Engine |
| FL-S9 | **Merging an occupied table.** Cashier tries to merge table 8, which has its own party halfway through dinner. Refused: table 8 is not vacant. | Engine |
| FL-S10 | **Moving a party.** Table 4 is by the kitchen door and the guests ask to move. The cashier moves them to table 9. One transaction moves the session's `tableId`, the cart document, the open order's `tableId` and every unbilled line's `tableId`. `draftId` does not change, because it is the session id, so nothing re-prices and the bill in progress follows the party. | Engine |
| FL-S11 | **Moving onto someone.** Moving table 4 onto table 11, which is occupied, is refused. | Engine |
| FL-S12 | **Moving a merged group.** Moving the 5+6 group is refused: release the merge first. The three-step dance (unmerge, move the parent, re-merge) is the v1 answer, and it has a window where 6 is free with people sitting next to it. | Engine |
| FL-S13 | **The old table's QR after a move.** The party moved 4 → 9. Their session moved with them; it was never ended. Table 4's QR now points at whatever sits at table 4 next, so the party must rescan table 9. Until TD-033 is closed, a phone still holding table 4 can write into the next party's cart. | Known limit |
| FL-S14 | **Paid and still sitting.** Table 7 pays at 21:30 and stays for coffee. The tile reads settled. Once every bill of the group is settled the session stops accepting new users and new checkouts, so a passer-by scanning table 7's QR cannot join the paid party's tab, and the captain's two filter coffees are refused "table 7 has paid — clear it first" (D2). The cashier clears, and the coffees start a new sitting on a new bill. While a bill of the table is part-paid, a new round waits too: "A-0004 is being paid — finish the payment, then add" (D3). Every way in is checked: the guest's checkout and the waiter's Send, a new phone joining, and the waiter opening the table. Without this a stranger scanning table 7 joins the paid party's order (TD-120). | Engine |
| FL-S15 | **No connection.** The internet drops at 20:50. The floor shows the last answer it had, greyed, with the time on it, and refuses merge, unmerge and move. | Offline |
| FL-S16 | **The captain closes the table under the cashier.** 20:44, the captain marks table 12's order COMPLETED because the food is out. `vacateTable` ends the session. The bill was never issued and ₹2,340 of lines are still unbilled. The tile stays `ordered` with ₹2,340 on it, because `free` means no open money. Otherwise the tile goes pale, the next walk-in is seated on it, a new session is minted, and the ₹2,340 is visible only to day close — which then cannot close. | Engine |
| FL-S17 | **Cancelled bill.** Table 12's ₹2,340 bill is cancelled with a PIN. The tile shows the money as billable again — unless another issued bill of the same sitting is still open, in which case it keeps showing that too. | Engine |
| FL-S18 | **Monday morning.** The owner asks who moved table 4 to table 9 on Friday. One audit row, with the cashier's name, both table numbers and the minute. | Report |
| FL-S19 | **The tile is the food, not the bill.** Table 12 has ₹320 paneer tikka, a ₹1,250 pitcher with ₹100 off, and a ₹450 biryani that was voided. The tile reads **₹1,470** — the net of the lines that still count. The bill then adds service charge and tax and rounds. The tile is never a second calculation. | Engine |
| FL-S20 | **Dessert after the bill.** Table 12's ₹2,000 bill is printed at 21:10. At 21:15 they order a ₹300 gulab jamun. BL R13 says ordering should stop at issue, and no code enforces it (TD-034). So the tile reads `₹2,000 due · ₹300 new` and neither number hides the other. | Engine |
| FL-S21 | **Split three ways.** Table 4's ₹3,000 becomes three drafts. The tile reads `₹3,000 · 3 drafts`. Tapping lists them; it never picks one silently. `billing-split` rewrites `draftId`, so a tile keyed on the session's own draft would read ₹0 here. | Engine |
| FL-S22 | **Part paid.** Table 7's ₹1,000 bill takes ₹400 in cash and the guest goes for a card. The tile reads `₹600 due`. A glance must never read as paid when ₹600 is out. | Engine |
| FL-S23 | **Picking, not billing.** While a merge or move is being set up, a tap selects a table instead of opening its money. Without the mode, the first tap opens table 5's bill and the merge can never be started. | Screen |
| FL-S24 | **Moving with a printed bill.** Table 4's ₹1,680 bill is printed, then the party moves to table 9. The move is refused while any line of the sitting carries a `billId`: an issued bill's `tableIds` are frozen, and moving underneath it makes the paper and the data disagree. Cancel the bill or finish tender first. | Engine |
| FL-S25 | **Scanning the new table.** After the move, a guest scans table 9's QR. Table 9 holds their session now, so they join it and the beer lands on the same sitting. | Engine |
| FL-S26 | **Merging a table that is already in a group.** 21:20, tables 5+6 carry ₹4,120. Merging table 6 into table 8 is refused: table 6 is not vacant. | Engine |
| FL-S27 | **Releasing a table with money on it.** 22:15, the 5+6 group has ₹2,980 unbilled. Unmerge is refused while anything is open — bill it or move it first. Otherwise table 6 reads free and the next party is seated on top of a live bill. | Engine |
| FL-S28 | **The kitchen has to be told.** 21:10, a party moves from table 4 to table 9 with ₹1,680 of biryani still cooking. The open order's `tableId` and every unbilled line's `tableId` move in the same transaction, so the runner carries the food to table 9. `tableId` on a line is routing, not money; rewriting it re-prices nothing. | Engine |
| FL-S29 | **Who may move a table.** Moving a ₹4,120 group is a MANAGER or ADMIN act. A SERVER-role login on the till is refused 403, not a PIN box. | Engine |
| FL-S30 | **A retired table with people at it.** 20:50, an admin marks table 12 out of service while ₹2,340 is open. The sitting still appears under its old number, so the bill always has a door. | Engine |
| FL-S31 | **Two parties want to sit together.** 20:30, table 5 has eaten a round and table 6 has just scanned. Merge refuses (6 is not vacant) and move refuses (5 is occupied). The till says so in words and offers no third path. They get two bills. Naming the refusal is the scenario; papering over it is not. | Engine |
| FL-S32 | **Two writers, one child, same second.** 20:16, the cashier starts merging vacant table 6 into 5 while a guest at 6 completes their OTP. Today `table-setMerge` reads the child and then batch-writes, so both can win: table 6 ends up `disabled` and `mergedInto: 5` while still holding its own active session. One transaction that reads the child inside it, or the merge is refused. | Engine |
| FL-S33 | **The destination is not as vacant as it looks.** Table 9 is `disabled` and `mergedInto: 10`, with no session. A move onto it must be refused. A destination must be `vacant`, hold no session, have no `currentOTP` in flight, point at no parent, and be nobody's parent. | Engine |
| FL-S34 | **The session runs out under a long dinner.** Table 7 opened at 19:00 and the session expires after four hours (`sessionService.js:80`). At 23:05 the tile must still show the ₹1,840 that is on the table. An expired session is not an empty table. Extending it is TD-034's problem, not the floor's; showing the money is the floor's. | Engine |
| FL-S35 | **Walk-out.** 22:40, table 6 leaves without paying a ₹660 bill. The cashier taps Walk-out with the manager PIN. The bill stays, marked walked out, number kept; the sitting ends and the table is free. Food never billed is issued as a numbered bill first (no paper) and marked walked out the same way, so every walk-out is one bill at what the guest would have paid. A part-paid bill writes off only the unpaid part. A new party at table 6 then sees only its own money. **Without this the tile keeps ₹660 and the Walk-out button forever, and the new couple's order is nowhere on the floor** (D1, TD-063, TD-064). | Engine |
| FL-S37 | **Merging onto a printed bill.** Table 12's ₹4,800 bill is printed, unpaid. The cashier tries to merge free table 11 into 12. Refused: "table 12 has a printed bill — edit or settle it first". **Without this the new table's food lands on a sitting whose bill is frozen, and nothing can bill it** (D2, groups G10). | Engine |
| FL-S36 | **The party that walked out.** 21:10 a couple scans table 4, signs in, orders nothing, and leaves. 22:10 nobody has touched table 4 for an hour and it owes nothing. The system ends the sitting, writes one audit row (`table.autoVacate`, by `system`, why `idle 60m, no open money`) and the tile reads free; the phone still open on that session gets "session ended" on its next call, not a crash. A table that owes ₹1,840 and has been idle two hours is **not** freed: one log line per sweep, the tile keeps its money, and day close is where a person meets it (it refuses on an unpaid bill and on unbilled lines). A round being built in the cart, a re-open, a re-scan, a line placed, a bill issued or a payment taken each count as the table being touched. A paid table nobody cleared is freed by the same clock. **Without this the table refuses every merge and move until a human notices, and there is nothing on the tile to say why** (TD-044). | Engine |

**Without this:** the cashier works from shouted table numbers and a paper docket, bills the wrong table on a busy night, and nobody can move a party without losing their food.

## Rules

- R1 The floor is a **picture, not a decision**. The poll is the glance; **the tap is a read of the truth**. A tap asks the server for the live route rather than trusting the state from the last poll, and every act re-reads inside its own write.
- R2 A tile's money is the sum of `net()` over the line snapshots of that sitting, found by the line's own **frozen `sessionId`**, never by `draftId`. `draftId` is live and `billing-split` rewrites it (`app/billing.ts:199`), so a split table would read ₹0. `onTable` counts lines with `billId == null` and `countsTowardTotal` true; `unpaid` is the outstanding of every issued, uncancelled bill of the sitting. Both numbers stop before service charge, tax and round-off.
- R3 The floor never reads `activeOrderId`. It is read in four places in the existing code and written in none.
- R4 A sitting is its **session**. `draftId` starts as the session id, so a party keeps its bill wherever it sits — but money is always found by `sessionId`, because a split moves lines to other drafts.
- R5 A move rewrites, in **one transaction**: the session's `tableId`, the cart document (delete the source, write the destination), the open order's `tableId`, and every unbilled line's `tableId`. Prices are never rewritten. `tableId` on a line is routing and provenance, not money.
- R6 A move or merge onto a table that is not truly vacant is refused, and "vacant" means status `vacant`, no session, no OTP in flight, no `mergedInto`, and not a parent (FL-S33). A move of a merged parent is refused; release it first.
- R7 Every merge, unmerge and move writes **one audit row in the same transaction as the act**, severity P1: who, which tables, when. No row, no act.
- R8 The floor **polls**; it never opens a Firestore listener. The till talks to Cloud Functions only.
- R9 One tile per **sitting**, not per table: a merged group is one tile, never two greyed ones.
- R10 `floor-get` answers in **one round trip** for the whole floor.
- R11 A tile carries **two numbers on two axes** — what is on the table and what is still owed — never one status word.
- R12 A sitting may have **several drafts and several bills**. Every read sums across all of them, and a tap that could mean more than one asks rather than guesses.
- R13 The floor has two modes: **billing** (a tap opens money) and **picking** (a tap selects a table). Picking is entered deliberately and leaves on Confirm or Cancel.
- R14 A table is **free only when no open money remains** anywhere in its group: no counting unbilled line, no unpaid issued bill. This outranks the session and outranks a waiter having tapped Vacant. It is the order-lifecycle rule, applied to the floor. The one exception is the cashier's **Walk-out** (D1, FL-S35): with the manager PIN, every unpaid bill of the sitting is marked walked out, unbilled food is issued and marked the same way, and the table frees. A walked-out bill owes nothing on the floor.
- R15 A move carries the sitting's **open kitchen orders** with it (R5). Money that moves without the food walks a ₹1,680 tray to the wrong party.
- R16 Merge, unmerge and move are **MANAGER or ADMIN**. Recording who did it is not deciding who may.
- R17 A sitting with money on it always has a tile, even if its table was retired or disabled underneath it.
- R18 Once every bill of a group is settled, the sitting **stops accepting new users and new checkouts**, until Clear. While any bill of it has money on it but is not settled, it takes no new round (D3). A sitting whose only bills were cancelled (mid-Edit) is still open. Keeping the session alive to stop the next party being seated does the opposite if a scan can still join it.
- R19 If the money cannot be summed, the floor **fails visibly** (R19). An occupied tile reading `₹0` is more dangerous than a floor that says it is down.
- R21 **Idle is measured off everything the sitting did, never off one stored flag.** The clock is the newest of: the session's `createdAt` and `updatedAt` (a re-open, OR-S22), each table's cart `lastUpdated` and scan `lastActivity`, every line's `placedAt`, every bill's `issuedAt` and `paidAt`, every payment's `at`. Derived, not a rollup: `table.lastActivity` written by three callers and read by a job is the bug TD-044 was. A sitting that cannot be dated is never freed, and open money outranks the clock the way it outranks a captain's COMPLETED (R14). Only live sittings opened before the threshold are read at all (composite index `sessions: status, createdAt`), and the sweep runs every five minutes, not one: the threshold is an hour and the reads are the bill.

## Config keys (on `restaurants/{id}/config/settings`, field `floor`, with defaults)

| Key | Default | Used by |
|---|---|---|
| `floor.pollSeconds` | 5 | FL-S1 |
| `floor.staleAfterSeconds` | 20 | FL-S15 — when the grey kicks in if a poll hangs, which is not the same as the poll interval |
| `floor.idleFreeAfterMinutes` | 60 | FL-S36 — how long a sitting may go untouched before the sweep ends it (was the literal `60 * 60 * 1000` in `table/table.js`). Zero or negative frees nothing |
| ~~`floor.settledFreeAfterMinutes`~~ | ~~30~~ | **Not built, 2026-09-18.** FL-S14's timer half was removed with `releaseIfSettled` when the payment path was corrected to write nothing to the table. The key is gone from `FloorConfig`; this row stays struck rather than deleted so the gap is visible. See the FL-Q1 note below |

## Talks to

| Port | What crosses | If the other side is down |
|---|---|---|
| ← BL Billing | the sitting's lines, drafts, and each bill's id and state | the floor fails visibly (R19); it never paints ₹0 on an occupied table |
| ← PY Payments | what is still owed on each issued bill | tiles read `billed` and never `settled`; the tender screen is the truth |
| ← TB Tables | number, capacity, status, `mergedInto` | no floor at all; the screen says so |
| ← CF Config | the two keys above | defaults apply; log a warning |
| → LG Logs | one line per act with `cid`, `action`, the table ids | never blocks the act |

## The floor, end to end

1. Till calls `floor-get({restaurantId, staffSessionId})` every `floor.pollSeconds`. The staff session is named `staffSessionId` on the wire, because "session" already means the guests' sitting everywhere else in this sheet.
2. Server reads tables, their sessions, every line whose `sessionId` belongs to a sitting, and the bills of those sittings, in one pass. It folds merged children into their parent and returns one row per sitting:
   `{ tableIds, since, onTable, unpaid, drafts: [{draftId, total, billId, billState, outstanding}] }`.
3. The cashier taps a tile. The till asks the server where that tap goes rather than routing on the last poll: one draft and nothing issued → the bill; one unpaid bill → tender; anything else → a chooser. A five-second-old picture must not decide which screen opens.
4. Merge and unmerge go to `table-setMerge`, which already exists and is what the captain app calls; move goes to a new `table-moveTable` beside it (OR-4's name — both are table verbs and belong in one family). Each re-reads inside **one transaction**, writes the change and its audit row together, and answers with the **affected tiles**, not one row: a merge makes a tile disappear and a move changes two. The floor owns the rules; it does not own a second door.

## Decisions

| Date | Decision | Why |
|---|---|---|
| 2026-09-17 | **The floor screen** never punches an order. It is read-and-bill | Shaurya's call, and it scopes this screen, not the product. The till does punch — in OR, which the go-live plan ranks #2, straight after this |
| 2026-09-17 | Tables only. No bar or parcel tiles in v1 | Shaurya's call. Both are ordinary table documents when the day comes; no code changes for it |
| 2026-09-17 | Grouping is one free-text `section` key; a two-storey restaurant names its sections after its floors | Shaurya's call. "Floor" is the screen, "section" is the grouping. Never a second `floor` field. Config, not code |
| 2026-09-17 | Sections are **not rendered in v1** | Shaurya's call. The field is already seeded ("Indoor" in MockData6) and read at `table/table.js:1072`; nothing else changes until a restaurant asks |
| 2026-09-17 | "Mark vacant" is not on the till floor. It stays in the server app | Shaurya's call. `table-updateTableStatus` already does it, and it already auto-unmerges |
| 2026-09-17 | A moved party's phones stop working until they rescan (FL-S13) | Shaurya's call, taken with the cost named. The guest app carries the table id in its URL (`router.dart:35`), so a redirect would mean pinning the old table open and it could not be reseated |
| 2026-09-17 | New FL module rather than extending `table-getTablesForRestaurant` | Shaurya's call. The old endpoint is a flat-dir JS file the Flutter server app also reads; money maths does not belong in the table module |
| 2026-09-17 | Merge and unmerge stay on `table-setMerge`, fixed in place; move is a new `table-moveTable` beside it (OR-4) | `table-setMerge` (built 2026-09-16) writes no audit row and commits a batch, so it needs the transaction and the row either way. Giving it a second door in `floor-act` buys nothing and costs the captain app a rename |
| 2026-09-17 | Floor polls at 5 s; no Firestore listener | The till talks to Cloud Functions only (stack rule). One till per restaurant (TD-018) makes 12 calls a minute, which is nothing |
| 2026-09-17 | A merged group is one tile, not two greyed tiles | Two tiles for one bill is how a table gets billed twice. The child still exists and is still `disabled`, so the server app is unchanged |
| 2026-09-17 | The floor shows `settled` as its own state rather than freeing the table | Guests sit after paying. A paid table that reads free gets a second party seated on it |
| 2026-09-17 | Fan-out (Gemini). **Accepted:** a tile is two numbers on two axes, not one enum (FL-S20, R11) | It caught that I had broken an existing rule — order lifecycle already says kitchen, service and payment are separate axes. A billed table that orders dessert is that case, and today nothing stops the dessert |
| 2026-09-17 | Fan-out (Gemini). **Accepted:** lines are found by the frozen `sessionId`, never the live `draftId` (R2) | Verified in code: `app/billing.ts:199` rewrites `draftId` on split, so a split table would have read ₹0. `sessionId` is frozen at placement (`domain/line.ts:19`) |
| 2026-09-17 | Fan-out (Gemini). **Accepted:** a sitting can have several bills; a tap asks instead of guessing (FL-S21, R12) | Routing to one arbitrary `?bill=` would orphan the other halves of a split |
| 2026-09-17 | Fan-out (Gemini). **Accepted:** the floor needs a picking mode (FL-S23, R13) | Real contradiction in v1: tap-to-bill made merge unreachable, because the first tap would open table 5's bill |
| 2026-09-17 | Fan-out (Gemini). **Accepted:** the tile shows what is still owed, not the bill's face value (FL-S22) | A glance reading "₹1,000" on a bill with ₹400 taken is how a part-paid table gets waved out |
| 2026-09-17 | Fan-out (Gemini). **Accepted:** FL-Q1 blocks the build rather than following it | Its "settled gridlock" is right: with no auto-free and no clear action, every paid table becomes a permanent tile and the cashier cannot do anything about it |
| 2026-09-17 | Fan-out (Gemini). **Pushed back:** moves and merges stay on the till | Shaurya chose both with the cost named. The captain is not always near the table, and the cashier is the one the guest asks. The complexity Gemini objects to is real and is why R13 and FL-S23 exist |
| 2026-09-17 | Fan-out (Gemini). **Verified, no change:** a guest scanning the new table after a move joins the moved sitting | `createOrGetTableSession` finds the active session by `tableId`, and R5 re-points it, so table 9's QR works. Only the old table's QR breaks (FL-S25) |
| 2026-09-17 | Fan-out: Codex out of quota, Grok did not return in time | Two of three is a valid round; Gemini's pass was substantive and is merged above |
| 2026-09-17 | Donor review (`reviews/2026-09-17-donor-FL.md`). **Accepted:** unmerge is refused while the group holds open money (FL-S27, R14) | URY `ury_order.py:462-478`. The real hole, and it is in yesterday's `table-setMerge` too: it checks the child is vacant on the way in and checks nothing on the way out |
| 2026-09-17 | Donor review. **Accepted:** a move carries the sitting's open kitchen orders (FL-S28, R15) | URY `ury_order.py:2156-2175`. Order documents freeze `tableId` at placement, so moving only the session sends the food to the old table |
| 2026-09-17 | Donor review. **Accepted:** merge, unmerge and move need a role check, not just an audit row (FL-S29, R16) | URY `ury_order.py:1006-1035`. "Catch it, don't cage it" sets the recording bar; it does not say every login may move ₹4,120 |
| 2026-09-17 | Donor review. **Accepted:** a sitting outlives its table document (FL-S30, R17) | Odoo `pos_restaurant.py:80-85`. An admin retiring a table at 20:50 must not take the bill's only door with it |
| 2026-09-17 | Donor review. **Accepted as a scenario, already true in code:** merging a table that is in another group (FL-S26) | `table-setMerge` refuses a child that is not `vacant`, and a merged child is `disabled`. The sheet had no scenario pinning it, so it was one refactor from being lost |
| 2026-09-17 | Donor review. **Noted, no change:** the sheet derives `occupied` rather than storing it, and holds `settled` past bill print | Both called safer than the donors. Kept |
| 2026-09-17 | Fan-out (Grok, returned late). **Accepted, the deepest find:** `free` means no open money, not no session (R14, FL-S16) | `vacateTable` already runs off `order status → COMPLETED` while a bill is unpaid. The sheet's `free` contradicted the standing release rule outright, and a pale tile over ₹2,340 is a table the next walk-in is seated on |
| 2026-09-17 | Fan-out (Grok). **Accepted:** the return shape is `drafts: [...]`, not one `draftId` + one `billId` + one state (R12, step 2) | Verified: `billing-split` rewrites `draftId` (`app/billing.ts:199`). One row could not represent a split, a partial payment, or food ordered after issue. This was the return type being wrong, not a missing scenario |
| 2026-09-17 | Fan-out (Grok). **Accepted:** the tap re-reads; the poll never decides which screen opens (R1, step 3) | R1 said the floor is a picture and step 3 then routed on that picture. After an issue the tile lies `ordered` for up to five seconds, the cashier taps, preview is empty, and they hit issue again |
| 2026-09-17 | Fan-out (Grok). **Accepted:** a settled sitting stops accepting new users and checkouts (R19, FL-S14) | Keeping the session alive to stop the next party being seated does the opposite: `createOrGetTableSession` returns the live session and the scanner **joins** the paid party's tab |
| 2026-09-17 | Fan-out (Grok). **Raised independently, re-declined:** unmerge keeps releasing every child (OR-5a stands, R18 dropped) | Grok found TD-030 on its own, which is a fair sign it is real. It is re-declined anyway, because **R14 removes its cost**: an unmerge is now refused outright while the group holds open money, so the party of ten with ₹6,400 on it can no longer be split silently — the act never reaches the write. What is left is releasing the children of a group that owes nothing, which is free to redo. Signed OR-5a stands at zero code instead of six lines |
| 2026-09-17 | Fan-out (Grok). **Accepted:** the merge race is real and a wrapper does not fix it (FL-S32) | `table-setMerge` reads the child then `batch.commit()`s. Two parents can both win. The standing rule calls last-write-wins the bug; only a read inside the transaction is the version |
| 2026-09-17 | Fan-out (Grok). **Accepted:** a destination must be vacant on five counts, not one (R6, FL-S33) | A `disabled` child with `mergedInto` set has no session, so a session-based vacancy check would move a party onto it and split the brain |
| 2026-09-17 | Fan-out (Grok). **Accepted:** a move is refused while any line carries a `billId` (FL-S24) | Lifted from OR-S15. An issued bill's `tableIds` are frozen at issue, so moving underneath one makes the paper and the data disagree. v2 allowed it |
| 2026-09-17 | Fan-out (Grok). **Accepted:** the BL-down behaviour is inverted (R20) | v2 said show the table with no money. An occupied tile reading ₹0 is worse than a dead floor: the cashier skips it |
| 2026-09-17 | Fan-out (Grok). **Accepted:** `staffSessionId` on the wire, `floor.staleAfterSeconds`, `since` defined, indexes named | Four small ones. "Session" already means the guests' sitting everywhere else, and a hung poll is not the same as the poll interval |
| 2026-09-17 | Fan-out (Grok). **Accepted, corrected in place:** FL-S3, S7, S13, S16, S17, S19 had wrong expected values | S3 was right per draft and false as a global (a split is *meant* to produce a second invoice); S7 contradicted R9; S13 said the session was gone when it had moved; S17 ignored a second issued bill |
| 2026-09-17 | Fan-out (Grok). **Pushed back, then agreed:** `table-setMerge` is fixed in place, not moved into `floor-act` | v2 said one implementation, two doors. Grok is right that rewriting a live endpoint the captain app parses, in the same commit as a new screen, is the regrettable half. It still gets the transaction and the audit row — just not the relocation. Move is the new verb and stays FL's |
| 2026-09-17 | Fan-out (Grok). **Accepted, filed not fixed:** the cart-write hole is TD-033 | Verified: `validateSessionId` (`cart/cartInputValidation.js:154`) checks the session is active, not that it belongs to this table, and `vacateTable` never deletes `carts/{tableId}`. Shaurya's call to file it — it is a live guest-path bug, and hiding the fix in a till-screen commit is how it stops being noticed |
| 2026-09-18 | **Half of FL-Q1 is not built, and this is a divergence from a signed row — not a re-decision.** `releaseIfSettled` and `floor.settledFreeAfterMinutes` were removed on 2026-09-18. The reason is good: that function ran *from the payment path*, and the payment path was corrected to write nothing to the table at all (`vacateTable` was releasing every merged child of a party still sitting, ending the session so a paid tile could never read `settled`, and swallowing an unaudited unmerge). It also never had a caller, so deleting it removed no behaviour. **What is lost is the safety net:** Clear is now the only way a settled table frees, so a table nobody taps holds its tile forever. Either the timer comes back driven by something other than the payment path — the floor read, or a sweep — or Shaurya agrees Clear is enough and the signed row is amended. Until one of those, the sheet and the code disagree and the code is winning silently |
| 2026-09-17 | **Signed (FL-Q1): a settled table frees itself, and the cashier can free it now.** On the last bill settling with nothing unbilled left, the tile reads `settled`. A **Clear** control frees it immediately. If nobody taps it, it frees itself after `floor.settledFreeAfterMinutes` (default 30) | Shaurya chose both halves. Taken literally they cancel: freeing on payment leaves Clear nothing to do. The reading where both work is settled-then-release — the tile holds while the party finishes its coffee, Clear is the cashier's override, and the timer is the safety net so no table is a permanent tile. The release runs from the payment path, which is the one change this sheet makes outside its own module |
| 2026-09-17 | **Signed (R14, FL-S16): open money outranks the captain.** A COMPLETED order that leaves money unbilled does not free the tile | Shaurya's call. `vacateTable` ends the session today, and ₹2,340 of food then exists only for day close, which refuses to close on it. The floor keeps showing it until someone bills it |
| 2026-09-17 | **Signed (R5, FL-S28, and FL-Q2 with it): a move carries everything that is not finished** — the session, the cart, every non-terminal order including SERVED-but-unpaid, and every unbilled line | Shaurya's call. Leaving a served-but-unpaid order on table 4 leaves the old table holding a claim on the party's money, which day close then has to reconcile. Cancelled orders are left alone |
| 2026-09-18 | **A merged group is one tile from the moment it is merged, not from the first order (FL-S7)** | Found by the browser tests. The group was built from the *sitting*, so two tables pushed together before the party sat down read as "5" and table 6 vanished from the floor entirely. That is the sheet's own scene — the party of eight is at the door — and the cashier could not see what she had just done. The group is now rebuilt from `mergedInto` on every read, party or no party |
| 2026-09-18 | **Clear and the automatic release end the sitting, not just the table** | Found by the browser tests. Freeing the tables while the session stayed active left the tile reading `settled` forever, and R18 says a settled sitting must stop taking new guests — a passer-by scanning that QR would have joined a paid party's tab |
| 2026-09-18 | **"Is somebody at this table" is answered by the sessions collection, not by a flag on the table** | Found by the browser tests. `activeSessionId` and `occupiedBy` are written by the older table module and were empty on a table that plainly had a live sitting, so a refusal came back as "not vacant" instead of "has a party at it". The session is what a guest's cart actually hangs off, so it is what the question is asked of |
| 2026-09-18 | **A tile is labelled by the table's `number`, not its document id.** Acts still carry the id | Found by the e2e suite, which is exactly what it is for: eight assertions failed on `table_fl_12` where the cashier reads `12`. A merged group reads `5+6`. A table with no number set falls back to its id — ugly, but findable on the phone, which a blank tile is not |
| 2026-09-18 | **Grok's push-back rested on a wrong premise, and the conclusion survives anyway.** `table-setMerge` has **no caller**: a grep across all four Flutter apps and the till found none | It was built 2026-09-16 and nothing consumes it yet, so "rewriting a live endpoint the captain app parses" was not the risk it looked like. Keeping it in place is still right — move and merge are table verbs and belong in one family — so the endpoint name and door are unchanged while the rules moved to `app/floor.ts`, giving it the transaction, the role check and the audit row it never had |
| 2026-09-17 | **Scoping:** the e2e scenarios wait in `test/e2e/suites/floor.plan.md` and become `floor.js` in phase 4 | The runner discovers `suites/*.js` and has no pending state, so a skeleton suite would be **red on every other session's full run for two phases**. The unit and Playwright layers do have one (`it.todo`, `test.fixme`) and were written as tests. Every scenario ID is still named; the plan file carries the hand-computed fixtures so phase 4 writes the suite, not the arithmetic |
| 2026-09-17 | Fan-out (Grok). **Accepted:** drop the OF port row; the grey state is ten lines in `useFloor.ts` | Twenty over a hundred. `tileWord` and the totals stay pure because they carry money; ageing the last poll does not need a port |
| 2026-09-17 | **SPEC_OR stands and is next.** FL owns merge, unmerge and move; OR's rows for them become a reference to this sheet | The go-live plan (`reviews/2026-09-17-go-live-plan.md`) already made this call in writing: "FL owns move and merge; OR drops them — two sheets owning one endpoint is how we get two implementations." FL is #1 because the till has no home screen at all; OR is #2. OR's seven decisions were signed the same morning and are not re-opened. TD-034 closed |
| 2026-09-17 | OR's move write-set (OR-S15) is lifted into FL-S28 and R5 rather than rewritten | It was better than FL's first draft: it already re-pointed the open orders, which FL v1 missed. Taking the better text is not superseding the sheet it came from |
| 2026-09-22 | **FL-S36 / TD-044: the idle sweep is `app/floor.ts releaseIdle` behind `floor-releaseIdleTables`, `onSchedule('every 5 minutes', maxInstances 1, no retry)`. Its own schedule, not a shared "housekeeping" door** | The contract says one caller means inline it; a print sweep, when KT builds one, has a one-minute cadence and its own failure domain. Cloud Scheduler bills per job (three free), so two jobs cost nothing; the Firestore reads are the bill, hence candidates-first and five minutes |
| 2026-09-22 | **The old `cleanupInactiveSessions` body is deleted.** The name stays as the emulator-only manual trigger (`lib/api/floor.ts idleSweepHandler`, guard tested in `api/floor.test.ts`), because the emulator registers a schedule and never fires it | It judged idleness by `table.lastActivity`, which nothing in the order path writes, and ended sessions with no money check (R14). Its `pending` branch went with it: nothing writes `pending` since the 21st |
| 2026-09-22 | **Signed by Shaurya: a silent table owing nothing is freed after `floor.idleFreeAfterMinutes`, and a paid table nobody cleared is freed by the same clock.** The second half is the less certain call and is written as such in `domain/floor.ts idleCall` and PRD §10.1 | It is the P1 half of TD-044; the risk is seating the next party on lingering guests, which a 60-minute silence makes unlikely. Flip it by making `idleCall` return `money` on `bills.length > 0 && !unbilled` if Shaurya says so |
| 2026-09-22 | Grok (plan review) proposed a `session.lastActivityAt` rollup written by every event; **refused** in favour of R21's derived clock | Same failure class as `table.lastActivity` with more writers. A derived max over timestamps that already exist cannot be forgotten by a new caller |
| 2026-09-22 | The unpaid idle table is logged once per sweep (`table.idle.money`), not surfaced on the till | Day close already refuses on an unpaid bill and on unbilled lines (`domain/dayClose.ts:175,180`), so a person meets it at the only moment that matters; MN is not built |
| 2026-09-24 | **Shaurya: who may free a table.** Owes nothing → anyone: the captain's Vacant and the cashier's Clear, no role check. Still owes → the cashier only, through ST's door as `releaseUnpaid`: reason, PIN, a P0 approval row with the amount, and the `table.clear` row carries `owed` at P0. A captain gets permission-denied. The cashier without a PIN gets the old refusal plus `{requires:'pin', owed}`, so the till's PIN box asks. If the amount changes between the PIN and the write, refused "try again": the PIN covered that figure only. The till shows a **Walk-out** button on a tile that owes (reason `guest left`). Superseded the same day's first answer ("only the cashier, even on a paid table") | A walk-out was either impossible to record or, by the captain's Vacant, silent |
| 2026-09-23 | **TD-037 closed: the captain's manual Vacant (`table-updateTableStatus`) runs Clear's rule.** Refused while the group holds open money, otherwise it ends the sitting and writes the `table.clear` audit row; `vacateTable` then resets the older module's fields. A merged child is judged by its group's sitting (it has no session of its own) and is detached alone, never ending the party's sitting. `setMerge` already had R14 since phase 4. TD-030 stays declined (Shaurya delegated, 2026-09-23) | Vacant was a second door that freed a table over ₹6,400 and detached table 6 from a group that still owed |
| 2026-09-25 | **D1 (Shaurya): walk-out money is its own write-off line.** Walk-out (`floor-clear` with the PIN, `releaseUnpaid`) marks every unpaid bill of the sitting `walkedOut` and ends the sitting; food never billed is issued first (numbered, no paper) and marked the same. R14 gains this exception; FL-S35 ("a walk-out is comped to ₹0") is replaced. The P0 row's `owed` is the post-tax amount left unpaid | The tile kept ₹660 and the button forever, a new party at the table vanished, and the day could not close (TD-063, TD-064, TD-073) |
| 2026-09-25 | **D1: two sittings naming one table are both drawn.** The newer sitting owns the table's tile; an older one still carrying money gets its own tile beside it (R9, R17) | D1 removes the walk-out cause, but a captain's COMPLETED on unbilled food (FL-S16) still leaves an ended sitting with money on the same table; one silently overwrote the other in a map (TD-063) |
| 2026-09-25 | **D2 / D3 (Shaurya): a paid table takes no new round and no new guest until Clear; a part-paid one takes no new round until the payment is finished (new guests may still join it).** One check, `domain/floor.ts roundRefusal`, called inside the checkout transaction and on the session join and the waiter's open-table paths. Merging into a table with a printed, unpaid bill is refused (FL-S37). `acceptsNewGuests` now counts a sitting whose bills were all cancelled as open, not paid | FL-S14 was written and never called (TD-097), and a stranger scanning a paid table joined the paid party's order (TD-120). Q2-6 default taken: the refusal says "clear it first"; no one-tap Clear-and-reopen until OR |

## Out of scope

Punching an order at the till and counter/takeaway tickets — both are **OR's**, the next module after this one (go-live plan, 2026-09-17), not "never" · a drawn table map with positions · section grouping on screen · reservations and waitlist · merging two occupied tables (OR-5b says refuse it in words) · moving a merged group in one act · covers · anything on the captain's app.

## Open questions (owner: Shaurya)

None. FL-Q1 (a settled table frees itself) and FL-Q2 (a served-but-unpaid order moves) were both
signed on 2026-09-17 and are in Decisions above.

## Review before sign-off (Shaurya reads this section only)

| Call | Weight | Why it matters |
|---|---|---|
| A paid sitting frees its own table, from the payment path (FL-Q1) | **SIGNED 2026-09-17** | Taken from your own contract rather than asked. Without it every table the till bills stays occupied forever and the cashier cannot clear it. It is the only change this sheet makes outside its own module |
| `free` means no open money, not no session (R14, FL-S16) | **SIGNED 2026-09-17** | The captain marking an order COMPLETED already vacates a table with an unpaid bill on it. Today that money is visible only to day close, which then refuses to close |
| A move carries the kitchen's open orders and the lines' `tableId` (R5, FL-S28) | **SIGNED 2026-09-17** | Without it a runner walks ₹1,680 of biryani to the table the party just left. Lifted from OR-S15, which had this right |
| A move is refused while any line is billed (FL-S24) | fine to skip | An issued bill's `tableIds` are frozen; moving underneath it makes paper and data disagree |
| `table-setMerge` is fixed **in place**, and move becomes a new `table-moveTable` beside it | fine to skip | Grok's push-back and I agree: the merge works and the captain path is live. Moving it across a module boundary in the same commit as a new screen is the change you regret on a Friday. Move is the new verb, it is FL's to build, and OR-4 already named it |
| Merge, unmerge and move are MANAGER or ADMIN (R16) | fine to skip | Recording who did it is not deciding who may |
| Unmerge keeps releasing every child (OR-5a stands; Grok's R18 dropped) | fine to skip | You signed this in the morning with the cost named. R14 now refuses an unmerge while the group owes money, which is the expensive half of that cost, so it gets cheaper for free |
| FL owns merge, unmerge and move; SPEC_OR stands and is next | fine to skip | The go-live plan already ruled this. Recorded here so no later session re-opens it |

## Files
Donors for this concern: `DONORS.md` → Tables, the floor, merge and move.

Firestore indexes this needs before the first production call: lines by `sessionId` + `billId`, sessions by `tableId` + `status`.

```
backend/src-plattr/functions/
  domain/floor.ts                onTable(), unpaid(), tileWord(), canMerge/canUnmerge/canMove, isReleasable. Pure.
  app/floor.ts                   get(): tables + sessions + lines + bills → rows. act(): re-read, decide, write + audit in one transaction
  adapters/firestore/floor.ts    tablesOf, sittingsOf, linesOfSession, billsOfSession, transact(move + audit)
  api/floor.ts                   onCall wrappers. Exported as floor-get, floor-open
  table/table.js                 setMerge converted from batch to one transaction, plus its audit row, in place
                                 new table-moveTable (OR-4), using domain/floor.ts canMove and the R5 write set
frontend/till/src/
  features/floor/FloorScreen.tsx  the screen shown when the URL carries no other param
  features/floor/useFloor.ts      poll, age the last answer, picking mode, route a tap through floor-open
  api/floor.ts                   + releaseIdleTables (onSchedule, every 5 minutes) and idleSweepHandler (table-cleanupInactiveSessions, emulator-only)
tests: domain/floor.test.ts · app/floor.test.ts · api/floor.test.ts · test/e2e/suites/floor.js · test/e2e/suites/housekeeping.js · frontend/till/e2e/floor.spec.ts
```

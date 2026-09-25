# QA · till day close screen · 2026-09-25

Screen exploration ([AGENT_QA.md](../../AGENT_QA.md) §5), one agent as driver and observer. Restaurant `res_meghana`,
emulator slot 2 (Firestore `127.0.0.1:8280`, functions `:5202`), till `http://127.0.0.1:5197/?r=res_meghana&day=1`,
seed MockData7. One headless Chromium through Playwright, one scenario script at a time. States were made with
[floorstate.mjs](../../backend/src-plattr/functions/test/e2e/qa/floorstate.mjs) (CLI only; agent B owns it and was
editing it during the run) and with real endpoint calls from my scratch scripts (UPI and card takes, cancel, void).
Trajectory: [qa-till-dayclose-2026-09-25.jsonl](../../backend/src-plattr/functions/test/e2e/results/qa-till-dayclose-2026-09-25.jsonl)
(gitignored, like the earlier runs). Screenshots and scripts: `/private/tmp/claude-501/-Users-shaurya-Desktop-dev-plattr-pro/3f613176-28cf-443a-a752-78de23bca6c4/scratchpad/qa-day/`
(`shots/`, `s1.mjs`…`s10.mjs`, `observer.mjs`; scratchpad, outside the repo).

Helper env: `cd backend/src-plattr/functions/test/e2e/qa && export FIRESTORE_EMULATOR_HOST=127.0.0.1:8280 PLATTR_BASE_URL=http://127.0.0.1:5202/rms-app-dd875/us-central1`.
"Clean re-seed" = `node mock/importMockData5.js --file=mock/MockData7ProductionMenus.json --clean --refresh-timestamps`
from `backend/src-plattr/functions` with the same Firestore host (it also wipes `dayClose/` and `drawerMovements/`).
The dish is always Butter Naan ₹60, so every bill is **₹66.00** (60 + 5 % service 3.00 + 5 % GST 3.15 = 66.15 → 66.00).
MockData7 has no `dayClose` config, so the defaults hold: blind count on, PIN over ₹100, reasons `opening float, vendor
payment, bank drop, change in, petty cash, correction`. The emulator clock is real: business date 2026-09-25.

## 1. Summary

**51 cells: 30 PASS, 11 FAIL, 10 NOTE.** Findings: 4 P1, 5 P2, 3 P3, no P0. Three clean re-seeds, about 150 browser
actions, a login after every page load (TD-052).

**The blocker: a walk-out stops the day from closing, and the till has no way out (QD-1).** The cashier walks table 2
out on the floor (PIN, P0 row). At close the screen says "Bill 0004 on tbl_meg_2 is still unpaid; settle or cancel
it". The till can't cancel that bill: the tile opens the tender screen, which has no cancel. Only a backend call got
the day closed. Close behind it: a cancelled bill still blocks the close too (QD-2), and nothing on the till leads to
the day close screen at all; you type `?day=1` (QD-3).

What held:
- **The money is right.** Hand-worked day: float ₹2,000 + cash ₹66 + ₹33 + ₹33 + ₹66 − vendor ₹1,200 + change in ₹500,
  with a ₹12,000 typo voided = **₹1,498.00 expected**. The frozen document says 149800. Counted ₹1,400 → short ₹98,
  one P1 row, no PIN. UPI, card and on account stay out of the drawer. The voided row is frozen with the others.
- **Blind means blind on the screen and on the wire.** The open day's reply has no cash row, no expected figure, no
  float and no movements. Setting `blindCount: false` brings back "Drawer should hold ₹1,232.00", which matches the sum.
- **The gates hold.** An unpaid bill, a part-paid bill and unbilled food each block the close, before any PIN. On
  account, comp and settled bills don't. After the close, a cash take is refused with "2026-09-25 has been closed and
  counted", and a movement is refused. A future date is refused. Past dates close (DC-S21). Last night's figure and
  "left in the drawer" show on the next day (DC-S31, DC-S32).
- **Retries are safe.** A double-tapped Close writes one document. A lost answer, then Close again with the same count:
  "Day closed, drawer exact". A lost answer, then reload: the screen shows the closed day. Two tills racing: one
  document.
- **PIN and roles.** Every movement asks a PIN ("Needed for a drawer entry"). Cancel writes nothing. A wrong PIN says
  "Wrong PIN, 4 left". Over ₹100 the close asks a PIN and writes P0. SERVER and KITCHEN get "Not allowed" and nothing
  is written.
- **Offline.** An estimate on this till hides the close form ("reconcile 1 estimate first"). After reconcile it comes back.

What did not hold:
- A walk-out blocks the day (QD-1). A cancel only changes the refusal (QD-2). There is no way to reach the screen (QD-3).
- A mistyped drawer movement can't be seen or voided from the till (QD-4).
- The movement form on yesterday's screen writes today's drawer (QD-5). A lost answer on a movement locks every later
  movement until reload (QD-6).
- A second manager, or a captain, typing the same count is told "Day closed" (QD-7). `tip payout` is missing from the
  reasons (QD-8). The PIN box tells a blind cashier whether they're more than ₹100 off (QD-9).

## 2. Findings (most severe first)

### QD-1 · A walk-out stops the day from closing, and the till can't undo it · P1

**Scene.** 22:40, table 2's guests leave without paying a ₹66 bill. The cashier taps Walk-out on the floor, confirms,
types the PIN: "2 freed, unpaid". The tile still reads "₹66.00 due · Walk-out" (TD-064, known). At 23:30 she opens day
close: "Still on the floor: 2 unpaid bill(s)…". Close the day → "Bill 0004 on tbl_meg_2 is still unpaid; settle or
cancel it before closing (2 in all)". She taps tile 2. It opens the tender screen: Take, Void, Refund, and no Cancel.
There's nothing left to try on the till. The day stays open, and every take after 04:00 goes onto the next day.

**Steps** (clean re-seed):
1. `node floorstate.mjs 3 settled`, `node floorstate.mjs 2 billed`.
2. Log in as `till@meg.test`, floor, `walkout-2`, confirm, PIN 1234.
3. Open `?r=res_meghana&day=1`, type 66 in `counted`, `close-day`.
4. Go back to the floor and tap tile 2: you land on `?bill=…`, which has no cancel.

**Expected.** DC-S25a: the walk-out exit is a 100 % comp, "and the close passes". DC-S5: "Settle it or cancel it, then
close". Either the walk-out gets the table past the close, or the till offers the steps that do.

**Actual.**
- Screen: `Bill 0004 on tbl_meg_2 is still unpaid; settle or cancel it before closing (2 in all)`, before and after the walk-out.
- Database after the walk-out: bill A-0004 `status: issued`. The sitting has ended. Audit: `table.clear P0 6600` and `releaseUnpaid P0 6600`.
- The only way through was a backend `billing-cancel` (PIN), then tile 2 → draft → Comp the whole bill → `guest left`
  (PIN). That's three PINs and three P0 rows for one ₹66 walk-out.
- For a table walked out **before** its bill (table 12, "ordered"), the tile still routes to the draft, and Comp works
  from the screen. But nothing tells the cashier to do that. The close says "bill the table or void the items".

**Evidence.** Cells `close:after-walkouts`, `walkout:day-close-after-walkout`. Screenshots `d1_floor_after_walkouts.png`,
`d1_close_after-walkouts.png`, `d1_t12_comp.png`. Observer check below.

**Where to look.** `app/floor.ts` `clearTable` ends the sitting and leaves the bill `issued` and the lines unbilled;
`domain/dayClose.ts:212-227` `canClose` then counts them. On the till, `TenderScreen.tsx` has no cancel and
`BillScreen.tsx` shows Cancel only straight after Generate.

### QD-2 · Cancelling a bill doesn't clear the day either · P1

**Scene.** Table 11's ₹66 bill was cancelled at 21:00 (wrong table). At close the screen says "2 item(s) not on a bill",
and once the unpaid bills are dealt with, the refusal reads "3 items on tbl_meg_2, tbl_meg_11, tbl_meg_12 are not on
a bill yet; bill the table or void the items before closing" (observer run, with table 2's bill cancelled as well).
The cashier did exactly what DC-S5 told her to do. The cancel just sent the naan back to the table, unbilled. And the
till has no way to void an item.

**Steps** (clean re-seed): `node floorstate.mjs 11 cancelled`. Open `?day=1`, type a count, `close-day`.

**Expected.** DC-S5: "Settle it or cancel it, then close." At least the words should say what works: re-issue it and
take the money, or comp it.

**Actual.** Line `Butter Naan billId=null` on table 11. Close refused as above. It went through only after tile 11 →
draft → Generate bill → take ₹66 cash.

**Evidence.** Cells `close:blocked-by-floor`, `cancelled:day-close`. Observer check.

**Where to look.** `domain/dayClose.ts:217` and `:226` (the two refusal texts). The cancel putting lines back is BL's
rule, and it's right for a re-issue. The advice in the refusal is what's wrong.

### QD-3 · Nothing on the till leads to the day close screen · P1

**Scene.** 23:30, the cashier wants to count the drawer. The floor has Merge, Move, tiles and parcels. No "Close the
day", no "Reconcile", no "Accounts". The screen is only reachable by typing `?r=res_meghana&day=1` into the address
bar. The same goes for `?reconcile=1`, which the day screen itself sends her to ("reconcile 1 estimate first").

**Steps.** Log in on the floor. Look for any way to the day close.

**Expected.** DC's job line is "end a trading day". A cashier needs a way to get there.

**Actual.** `grep` of `frontend/till/src` finds one navigation call, the floor tile's `location.assign`. `App.tsx:14-19`
picks screens by URL only.

**Evidence.** Cell `navigation:reach-day-close`.

**Where to look.** `App.tsx` (the screen switch) and `FloorScreen.tsx` (the only screen with actions on top).

### QD-4 · A mistyped drawer movement can't be seen or voided from the till · P1

**Scene.** 18:40 the cashier pays the vegetable vendor ₹1,200 and types 12000. The bar says "Drawer: ₹12000.00
recorded". She spots it. The day screen shows no movements while the count is blind, so she can't see the row, and
there's no void button anyway. If she doesn't know about the backend, she counts ₹1,498 at 23:30 against an expected
₹−10,502. The screen asks a PIN (it's over ₹100) and freezes a P0 "drawer over ₹12,000.00" against her name.

**Steps** (any seed): `?day=1`, Cash out, `12000`, bank drop, `move`, PIN 1234. Look for the row or a void.

**Expected.** DC-S10: "The row is voided with PIN and reason 'wrong amount' … a correct ₹1,200 row is added. The day
shows three movements and the truth."

**Actual.** No `day-movements` list while blind (the reply has no `movements`, R14). No control calls `dayClose-voidMove`.
The void worked only by backend call. The closed day then lists `out ₹12000.00 · bank drop · VOIDED`, correctly.

**Evidence.** Cells `move:mistyped-12000`, `move:void-control`. Screenshots `d1_after_moves.png`, `d1_closed_short.png`.

**Where to look.** `DayCloseScreen.tsx:110` (list shown only when `movements` arrive), `app/dayClose.ts:246` (blind drops
them), `useDayClose.ts` (no `voidMove`). R14 and DC-S10 pull against each other. See question 1.

### QD-5 · The movement form on yesterday's screen writes today's drawer · P2

**Scene.** 00:20 on the 26th the owner opens last night's day to close it (DC-S21). The page says
"Day close 2026-09-24 open" with the movement form under it. He records the ₹2,000 float he forgot. "Drawer: ₹2000.00
recorded". It went onto 2026-09-25, today, not the 24th. Today's drawer is now ₹2,000 over, and the 24th has no float.
Once today is closed, the same form answers "That day is closed", under a header that still says 2026-09-24 open.

**Steps** (clean re-seed): open `?day=2026-09-24`, Opening float, 2000, opening float, `move`, PIN.

**Expected.** R8: a movement's date comes from the clock, never the body. So a past date's screen shouldn't offer the
form, or should say "this goes on today, 2026-09-25".

**Actual.** Stored `drawerMovements/…` with `businessDate: '2026-09-25'`. Observer: sending `businessDate: '2026-09-24'`
in the body still stores 2026-09-25 (the server is right).

**Evidence.** Cells `past:movement-today-open`, `past:movement`. Screenshots `d2_past_move_goes_today.png`, `d1_past_move.png`.

**Where to look.** `DayCloseScreen.tsx:87`: the form renders for any open date.

### QD-6 · A lost answer on a movement locks every later movement until reload · P2

**Scene.** The Wi-Fi blips as the cashier records the vendor's ₹1,200: "No connection". The server did write it. The
vendor says he only took ₹1,100, so she types 1100: "movementId already used for a different drawer movement", with no
PIN asked. She gives up and records a ₹300 cash in: the same words. Every movement fails until the page reloads. This is
the tender screen's QT-3 in a smaller form (a reload clears it here).

**Steps** (any seed): `?day=1`. Make the next `dayClose-move` answer get lost (Playwright: `route` → `fetch()` →
`abort('failed')` once). Cash out 1200 vendor payment, PIN → "No connection". Then 1100 → refused. Then Cash in 300 → refused.

**Expected.** R13: one id per tap, reused only for the same tap. A new amount or kind is a new tap.

**Actual.** Rows: float 2000, out 1200 only. Both later taps were refused. After a reload, a double-tapped ₹300 gives one row (PASS).

**Evidence.** Cells `interrupt:move-lost-answer-new-amount`, `repeat:move-double-tap-after-reload`. Screenshot `d2_move_stuck_id.png`.

**Where to look.** `useDayClose.ts:46-48`: `tap.current` is kept for any body until one succeeds.

### QD-7 · A second closer is told "Day closed"; a losing till keeps the open form · P2

**Scene.** Priya closes at ₹1,298. Ravi's till loaded the day before that. He types the same ₹1,298 and gets "Day
closed, drawer exact", so he thinks he closed it. The document says `closedBy: srv_meg_till`. On a third till the count
was different: "That day was already closed by srv_meg_till". That's a staff id, not a name and not a time, and the
screen keeps the open count form under it. From the API, a captain (SERVER) sending the same count also gets success,
along with the whole frozen document.

**Steps** (clean re-seed, day with money): close from tab A as `till@` with the right count. Tab B (`till@`, loaded
earlier) with another count → refusal. Tab C (`manager@`, loaded earlier) with A's count → "Day closed".

**Expected.** DC-S7: "already closed at 23:30 by Priya", never a second count. R9: "A retry of the **same** count by the
same person" gets the document back.

**Actual.** Tab C: `Day closed, drawer exact`. Tab B: `That day was already closed by srv_meg_till`, form still shown.
The API with a different count: `That day was already closed at 2026-09-25T01:29:57.373Z by srv_meg_till` (UTC ISO).
The SERVER with the same count: `success, retry: true`.

**Evidence.** Cells `closed:second-manager-same-count`, `closed:server-same-count`, `two-tills:close-at-once`,
`two-tills:stale-manager-same-count`. Screenshots `d2_two_tills_B.png`, `d2_two_tills_C_manager.png`.

**Where to look.** `app/dayClose.ts:131-134`: the retry returns before `canClose` (role) and never compares
`closedBy`. The words are at `:136` and `:162`. On the till, `useDayClose.ts:52-57` doesn't `load()` after a refusal.

### QD-8 · "tip payout" is not a reason, so cash tips leave the drawer as "petty cash" · P2

**Scene.** A guest leaves a ₹50 cash tip on the bill. BT puts it in expected cash "until a `tip payout` movement takes
it out". At 23:15 the waiter takes his tips. The reason list has no "tip payout", so the cashier picks petty cash, and
tomorrow the owner can't tell tips from petty cash.

**Steps.** `?day=1`, open `move-reason`. Or `dayClose-move` with `reason: 'tip payout'` → `Unknown reason tip payout`.

**Expected.** The config table and the decision of 2026-09-16 put `tip payout` in the default list. PY's decision of 2026-09-23 relies on it.

**Evidence.** Cell `move:reasons`. Observer check.

**Where to look.** `domain/dayClose.ts:88` `DEFAULTS.reasons`.

### QD-9 · The PIN box tells a blind cashier whether she is more than ₹100 off · P2 (spec conflict)

**Scene.** Blind count, expected ₹1,498 (she can't see it). She types ₹1,000: a PIN box, "Needed for closing the day".
She cancels, "recounts" and types ₹1,400: it closes at once, short ₹98. So the box answers "am I within ₹100?" before
anything is written. A few taps narrow down the hidden figure, which is what blind count exists to stop (DC-S4). And the
PIN is her own.

**Steps.** A day with money, blind on. Type a count far off, see the PIN box, Cancel. Type one within ₹100.

**Expected.** DC-S30 "no cash figure at all", and DC-S29 "over the threshold … asks for a PIN". Each is right alone. Together they leak.

**Actual.** Cells `close:probe-1000` (PIN box, nothing written), `close:short-98` (no PIN, closed). By code reading,
there's a second leak with no race run: the in-transaction refusal "The day moved while you were counting" sends
`{expectedCash, difference}` to the till while the day is open (`app/dayClose.ts:173`). R14 says a client that receives
the number and hides it isn't blind.

**Where to look.** `app/dayClose.ts:151-155` (PIN decided on the difference before the write) and `:173` (details).
See question 2.

### QD-10 · The blocked screen doesn't say which tables · P3

The screen says "Still on the floor: 2 unpaid bill(s), 2 item(s) not on a bill". It doesn't say which ones. The close
refusal names only the first bill, by bare number and internal id: "Bill 0004 on tbl_meg_2 … (2 in all)". The cashier
fixes table 2 and taps again to learn about table 7. The items message says "void the items", which the till can't do.
TD-061's row already covers the bare number. The table id and the one-at-a-time naming are new. Cells
`close:blocked-by-floor`. Where to look: `DayCloseScreen.tsx:83`, `domain/dayClose.ts:212-227`,
`adapters/firestore/dayClose.ts:61` (`tableLabel` is the table's document id).

### QD-11 · SERVER and KITCHEN get the whole form; KITCHEN can read the day · P3

Both see the movement and close forms and only learn "Not allowed" after typing. Nothing is written (DC-S20 holds). A
KITCHEN login also reads the day (`dayClose-get` succeeds), but KITCHEN isn't in the role table. It's the same as QT-9
on the tender screen. Cells `role:server`, `role:kitchen`. Where to look: `App.tsx` doesn't pass `session.role` to
`DayCloseScreen`, and `app/dayClose.ts` `get()` checks only that the staff is active.

### QD-12 · An impossible or future date shows an open day with forms · P3

`?day=2026-02-30` shows "Day close 2026-02-30 open · Yesterday was never closed" with both forms. Only Close answers
"businessDate must be a real date". `?day=2026-09-26` shows an open day and a Close button that answers "That day has
not happened yet". `?day=garbage` shows only the refusal, which is right. Cells `date:*`. Where to look: `app/dayClose.ts:216`
(`get` checks the shape, not a real or past date).

## 3. Known bugs that look worse from this screen (not re-reported)

- **TD-064 / QF-2 (walk-out).** From the floor it's a sticky tile. From here it's a day that can't close (QD-1).
- **TD-017 (bill on a closed day).** After the close the floor looks exactly the same. Table 3 was seated, billed
  (A-0012 issued) and shows "₹66.00 due · Walk-out". Only the Take says "2026-09-25 has been closed and counted". So the
  cashier finds out at the moment the guest holds out the money. Cells `closed:take-cash`, `closed:floor`.
- **TD-052.** A login after every page load, including each reload in the interrupt cells.
- **TD-035.** The estimates gate is per browser, as filed. Seen working on this till.

## 4. Not bugs / by design

- No cash row, no "Drawer should hold" and no movement list while blind (DC-S30, R14). With `blindCount: false` all three come back.
- The on-account ₹66 shows as "(owed, counts when collected)" and is not drawer money (BT).
- A comped or walked-out ₹60 appears under "guest left ₹120.00 · 2 bills or lines". That's the discount net of charges (BT).
- A count under the ₹100 line closes on one tap with a P1 row. A short count is recorded, not refused (R4).
- A past day nobody traded closes at ₹0 "drawer exact" (DC-S19). "Yesterday was never closed" is a line, not a block (DC-S32).
- Every drawer movement needs a PIN, even the morning float (R16, a listed Review call).
- `countedByTender` (the card batch count) has no field on the screen. It's optional in the spec, so I counted it as not built, not failed.

## 5. Unclear spec (questions for the owner)

1. **Blind count vs fixing a typo.** R14 hides movement amounts while blind, and DC-S10 needs the cashier to see and void
   a wrong one. Suggested default: while blind, send the movements with kind, reason, time and who, and send the
   amount only for the cashier's own rows from today. Add a Void button with PIN and reason.
2. **The PIN over ₹100 leaks the blind figure (QD-9).** Suggested default: record first, PIN after. Or ask the PIN on
   every close, so its presence says nothing. The first keeps DC-S29's "one more deliberate act" without the hint.
3. **What does Walk-out do to the bill?** Suggested default: a walk-out of a billed table cancels the bill and comps the
   lines as `guest left` in one PIN'd act, so the day can close (DC-S25a). One P0 row, not three.
4. **Who may "retry" a close?** Suggested default: only the person who closed it. Anyone else gets "already closed at
   23:30 by Priya", in local time and by name.
5. **May KITCHEN read the day?** Suggested default: no. The role table lists SERVER, MANAGER and ADMIN only.

## 6. Suggestions from the cashier's chair

- **A "Close the day" button on the floor.** It should show the unpaid tables as tiles you can tap, not as a count.
  "Table 2 ₹66 · table 7 ₹33 due" is the to-do list at 23:30.
- **Say who closed it and when, on the closed day.** "Closed 23:31 by Priya · short ₹98.00 · note". The owner reading it
  on the phone the next morning (DC-S24) sees the figures but not the person.
- **Offer last night's "left in the drawer" as the float.** The next day shows "left in the drawer ₹50.00", but the
  float form starts empty. A "Use ₹50.00 as today's float" button is DC-S31's own words.

## 7. Coverage

Legend: P pass, F fail (QD-n), N note, nb not built, nt not tried, — hidden, as it should be.

**Open day, controls**

| control | blind | blind off | blocked | SERVER | KITCHEN | past date | future / bad date |
|---|---|---|---|---|---|---|---|
| tender rows | P | P | P | P | N (QD-11) | P | N |
| expected figure | — P | P | — | — | — | — | — |
| movement list | — (F QD-4) | P | — | — | — | — | — |
| floor line | — | — | P (F QD-10) | P | P | P | N |
| move + PIN | P | nt | P | P (F QD-11) | P | F (QD-5) | F (QD-5, QD-12) |
| move void | nb (F QD-4) | nb | nb | — | — | — | — |
| close | P | nt | P refused (F QD-1, QD-2) | P refused | P refused | P | P refused (N QD-12) |
| left in drawer | P | nt | — | — | — | P | — |
| estimate gate | P | — | — | — | — | — | — |

**Movements.** PIN cancel P · wrong PIN P · float P · out P · in P · typo P (void F QD-4) · amounts `1,200`, `abc`,
`0`, `-50`, `12.345` all refused on the screen P · tip payout F (QD-8) · double tap P · lost answer, new amount F (QD-6).

**Close.** Blocked by unpaid P · part-paid P · unbilled P · walk-out F (QD-1) · cancelled F (QD-2) · on account P ·
comp P · estimate P · probe over ₹100 N (QD-9) · short ₹98 P · over ₹50 P · over ₹200 with PIN P0 P · zero day P ·
left > counted nt (the probe closed the day first) · double tap P · lost answer + tap again P · lost answer + reload P ·
two tills at once P (F QD-7 wording) · stale manager F (QD-7) · SERVER retry F (QD-7) · close vs take race nt (N).

**After the close.** Closed screen P · take on the tender screen P (refused) · movement P (refused) · bill issue N
(TD-017) · floor N (no sign) · next day's "last close" P · reopen: none, by design (R11).

**Not tried:** `left` more than `counted` (the probe closed the day before that cell ran), a close racing a
receivable collection (DC-S26: no same-day bill can race it, see the NOTE), voiding a payment on the closed day from
the screen (PY R15, covered by `suites/payments.js`), a staff session expiring mid-count, `countedByTender`.

## Observer check

Re-run on a clean re-seed with backend calls only, no browser (`scratchpad/qa-day/observer.mjs`: `3 settled`,
`2 billed`, `11 cancelled`, `12 ordered`).

- **QD-1 reproduced, and it's the backend.** `floor-clear` with PIN on tables 2 and 12 → `freed`. Bill A-0002 still
  `issued`. Audit: `table.clear P0` and `releaseUnpaid P0` for each. `dayClose-close` → `Bill 0002 on tbl_meg_2 is
  still unpaid; settle or cancel it before closing`.
- **QD-2 reproduced.** Table 11's line is `billId=null` after the cancel. After cancelling table 2's bill too, the close
  says `3 items on tbl_meg_2, tbl_meg_11, tbl_meg_12 are not on a bill yet; bill the table or void the items`.
- **QD-5: the server is right, the screen is wrong.** `dayClose-move` with `businessDate: '2026-09-24'` in the body →
  stored on 2026-09-25.
- **QD-6: the server is right, the till is wrong.** Same id, ₹1,100 after ₹1,200 → `movementId already used for a
  different drawer movement`, as R13 says. The fix is in `useDayClose.ts`.
- **QD-7 reproduced.** On a closed 2026-09-20: same person, same count → `retry true`. Another manager, same count →
  `retry true, closedBy srv_meg_till`. SERVER, same count → `retry true`. SERVER, other count → `already closed at
  2026-09-25T01:38:19.285Z by srv_meg_till` (not a 403).
- **QD-8 reproduced.** `reason: 'tip payout'` → `Unknown reason tip payout`.
- **QD-9 reproduced.** A shut day, count ₹50 with no PIN sent → closed at +5000. Another shut day, count ₹200 → `PIN
  required {requires: pin, action: dayClose}` and no document. The answer depends only on the hidden difference.
- KITCHEN `dayClose-get` → success (QD-11).
- QD-3, QD-4, QD-10 and QD-12 were checked against the code (the lines above).

## Suggested helper states

For agent B, if a later run needs them. My scratch scripts did these through real endpoints:
- `paidupi` / `paidcard`: billed, then `payments-take` UPI or card for the full bill, `captured: true`, with a ref.
- `walkedout`: billed (or ordered), then `floor-clear` with PIN, reason `guest left`. This is QD-1's state.
- A day-level `move <kind> <rupees> <reason>` that calls `dayClose-move` with PIN 1234, so a drawer can be seeded without the screen.

## Parked for Shaurya

The finder doesn't fix. Each of these changes product code.

- **QD-1.** Question 3 decides it. Smallest route without a decision: put Cancel on the tender screen for an unpaid bill.
  The comp from the draft already works.
- **QD-2.** Rewrite the two refusal texts to say what works on the till. Blocked by nothing.
- **QD-3.** Links on the floor to `?day=1` and `?reconcile=1` (and `?account=1`). Blocked by nothing.
- **QD-4.** Question 1.
- **QD-5.** Hide the movement form unless the screen's date is today. Blocked by nothing.
- **QD-6.** Mint a new `tap` id when kind, amount or reason changes. Same shape as TD-070's fix.
- **QD-7.** Question 4. Also `load()` after a refusal, and a local time in the message.
- **QD-8.** Add `tip payout` to `DEFAULTS.reasons`. Blocked by nothing.
- **QD-9.** Question 2. Drop `expectedCash` and `difference` from the `:173` details either way.
- **QD-10 to QD-12.** Display only.

## Appendix · the grid, written before the run

Kept as written, so the expected figures can be checked against what happened. One change on the day: the "₹50
short" close became ₹98 short, because the ₹1,400 probe was under the PIN line and closed the day on one tap.

**Day 1 (2026-09-25), hand-worked.** Tables: 3 settled cash ₹66 · 6 UPI ₹66 · 9 card ₹66 · 2 billed unpaid (must
block, DC-S5) · 7 part-paid ₹33 cash (must block) · 8 on account ₹66 (must not block, BT) · 10 comped (must not block,
PY-S8) · 11 cancelled (? DC-S5 "settle or cancel") · 12 ordered then Walk-out (? DC-S25 / DC-S25a). Movements through
the screen, PIN each: float ₹2,000 (DC-S9), out ₹1,200 vendor payment (DC-S8), in ₹500 change in, a mistyped out
₹12,000 bank drop to be voided (DC-S10).
Expected cash = 2,000 + 66 + 33 − 1,200 + 500 = **₹1,399.00**; + table 7's other ₹33 = ₹1,432.00; + table 2 or 11 paid
₹66 in cash = **₹1,498.00**. Past dates: 09-24 counted ₹0 → exact (DC-S19); 09-23 counted ₹50 → over, P1, no PIN
(DC-S3); 09-22 counted ₹200 → over, PIN, P0 (DC-S29).

| control | open, blind | open, blocked | closed | past date | future date | SERVER | KITCHEN |
|---|---|---|---|---|---|---|---|
| tender rows | UPI, card, account owed; no cash row (DC-S30) | same | all rows incl. cash (DC-S24) | that date's | empty | read (R7) | ? |
| expected figure | hidden (DC-S4) | hidden | in the result | hidden | hidden | hidden | hidden |
| movement list | hidden (R14) | hidden | listed incl. voided (DC-S10) | | | | |
| floor line | — | names bills and tables (DC-S5, S25) | — | that date | | | |
| move form | PIN, reason, P0 (DC-S8, R16) | same | refused (DC-S11) | writes today (R8) | writes today | 403 (DC-S20) | 403 |
| void movement | DC-S10 (a control?) | | refused | | | 403 | 403 |
| close | difference only after the count (DC-S4) | refused (DC-S5, S25) | same count: success; other: refused with frozen (DC-S27, S7) | allowed (DC-S21) | refused (DC-S22) | 403 | 403 |
| left in drawer | ≤ counted (DC-S31) | | next day shows it | | | | |

After the close: take cash refused (DC-S6) · a bill still issues (TD-017) · second closer refused "by <name>" (DC-S7, R9)
· movement refused (DC-S11). Misuses: double tap Close and Record · reload and lost answer mid-close (DC-S27) · lost
answer on a movement, then a new amount (R13) · two tills at once (DC-S7) · close vs payment (DC-S26) · 131660-style
typo (DC-S29) · `1,200`, `abc`, `0`, `-50` · `?day=2026-09-26`, `2026-02-30`, `garbage` · SERVER, KITCHEN · an offline
estimate (OF R6).
Do not report: TD-061, TD-071, TD-062, TD-055, TD-052, TD-017, TD-018, TD-035, TD-064, TD-070, and every QF/QB/QT id.
By design: blind hides cash (DC-S30), no reopen (R11), short is recorded (R4).

# Agent QA — how an agent tests this product like a person using it

The method for sanity-testing and exploring Plattr Pro through its real screens. The tooling
(how to open a browser, `ab`, identifiers, seeds) is in [FRONTEND_TESTING.md](FRONTEND_TESTING.md).
This file is the thinking: what to test, who does what, what counts as proof.

Only proven lessons go here. The run log at the bottom shows where each one came from.
Rules for editing are in the last section.

---

## 1. Why this exists

Unit and e2e tests build their own inputs, so they can only prove what their author already
believed. Bugs in this product live where one person hands work to the next: guest → kitchen →
captain → cashier, and the old Flutter apps → the new till. One real order pushed through every
screen found a bill-to-table bug in 25 minutes. Every automated layer had passed with that bug in:
39 unit suites, 21 e2e suites and 6 browser specs.

Think as the person at the counter, not as the code. "The cashier taps table 10 and it says
Nothing open" is a finding. "The function returned an empty list" is not.

## 2. Two modes

| Mode | Question it answers | Setup | When |
|---|---|---|---|
| **Sanity spine** | Does one ordinary order survive every screen, end to end? | Nothing seeded between steps: each screen gets its state from the screen before | After any change that crosses apps; before any claim of "done" on a flow |
| **Screen exploration** | What happens on this one screen, in every state a person can reach? | Seed the starting state directly, act through the screen, check the database | Per feature or per screen, risk first |

Run the spine first. Exploring a screen whose spine is broken finds the same bug fifty times.

## 3. Two roles: driver and observer

- **Driver:** one subagent (Opus) with one headless browser. It taps, then appends one JSON line
  per step to a trajectory file. It never fixes code and never retries.
- **Observer:** the parent session. It never opens a browser. It watches the trajectory file and
  the emulator log, and after each step it reads the same document the driver claims to have read.
  A driver's PASS that the observer reads differently is itself a finding.

Why two: one agent that both taps and judges trusts its own memory and drifts into fixing. In run 1
the split caught two false alarms from the driver and one misread by the observer.

Observer habits that paid off:
- Tail the emulator log filtered to function names and errors. The order of calls shows which tap
  fired what, and an error shows up before the driver reports it.
- Tell your own probes apart from the driver's calls. Your test call's error will appear in the same log.
- Before calling something a bug, check whether a debug build or the seed explains it.
- After the run, reproduce the top findings by calling the backend directly on a clean seed. That tells the fixer
  whether the fault is in the screen or in the API (the floor's walk-out bug was in `floor-get`), and catches a finding
  that was really a spec conflict.

## 4. Rules for the sanity spine

1. **Every step goes through its own screen.** The state entering screen N must come from screen
   N−1, never from a seed. That is the whole value.
2. **A step that can't be done on the screen is BYPASSED, not fixed.** The cause may be a missing
   control, an unbuilt feature or a broken screen. The driver does that step with the same API call
   [journey.mjs](backend/src-plattr/functions/test/e2e/journey.mjs) uses, marks it BYPASSED with the
   reason, and carries on. The run always reaches "table free". The number to drive to zero is the
   BYPASSED count.
3. **FAIL means the database disagrees with the expected result after a tap.** Stop, dump the
   documents, console errors, URL and log tail, and don't retry. Retries hide races.
4. **The database decides, never the screen and never memory.** Every verdict cites a read-back.
5. **Budget the driver.** Give it a fixed number of browser commands. Going over the budget is a FAIL.
6. **One browser, headless, one tab.** Visit the apps one after another. State lives in the
   backend, so leaving an app and coming back costs nothing. `ab preflight` first, `ab stop` last.

The spine for dine-in, one guest, one simple dish, cash:

| # | person | app | action | read-back that proves it |
|---|---|---|---|---|
| 1 | guest | consumer | scan route → verify → add → cart → checkout | session active; order IN_PROGRESS; cart PENDING; one line per item with a tax block |
| 2 | kitchen | kitchen | Mark Ready | cart READY |
| 3 | captain | server | long-press the card → Mark Served | cart SERVED |
| 4 | cashier | till | floor tile → draft → Issue | bill doc; bill number on screen equals the doc; `sittingId` = guest session; `tableIds` = the table |
| 5 | cashier | till | back to floor → tap the table → tender → cash | tap routes to `?bill=`; bill `paid` |
| 6 | cashier | till | Clear on the settled tile | table vacant; session ended; tile reads free |

Write the expected money for each step once, by hand. Check which offers fire on the dish first:
the seed has auto-applied offers, and they surprised run 1.

## 5. Screen exploration: think like a manual tester

Hand the driver lists, not a mission. An agent told to "explore the floor" makes things up. An
agent given these three lists works through them:

1. **Controls** on the screen: `ab ids` for Flutter, the `data-testid` list for the till.
2. **States** each thing can be in, in the spec sheet's own words. A table is free, seated,
   ordered, billed, settled, merged-child, disabled or reserved. A bill is draft, issued,
   part-paid, paid or cancelled.
3. **Scenario IDs** from the spec sheet (`FL-S12`), marked with which ones a test already covers.
   Explore the unmarked ones first.

**The grid.** Try every control against every state it can be shown in, and every state where it
must be hidden or refused. Merge is the first table's state × the second table's state. Most cells
should be "refused, with a reason that names the table". Any cell where the screen and the spec
disagree is a bug.

**Then the misuses a real person commits**, on each control that passed the grid:

| misuse | at the till it means |
|---|---|
| skip a step | deep-link to a bill or draft that shouldn't exist |
| go back | browser Back after Issue, or mid-PIN |
| interrupt | reload during a payment; lose the network between Issue and Take |
| repeat | double-tap Issue, Take, Clear or Merge |
| two people at once | two tills act on one table; the captain acts while the cashier bills |
| after an error | after a refusal: is the picker still open, is the money unchanged? |
| stale screen | act on a picture that is a minute old; staff session expired mid-act |

**The human lens.** A person notices what a pass/fail script doesn't. Record these as findings
too: a forced re-login, two numbers for one thing on two screens, a slow screen, wording that
would confuse a cashier. Ask at every step: "what would annoy or mislead the cashier here?"

**Unbuilt features.** A control that doesn't exist yet is a cell marked "not built", not a reason
to stop the screen.

**Seed, act, check.** Exploration seeds its starting state instead of clicking it: "table 5 billed,
table 6 settled" takes a second to seed and ten minutes to click. Seed **through the real endpoints**
(guest OTP, cart, checkout, `billing-issue`, `payments-take`), not by writing documents. A seeded
document is the shape the reader expects, which is how the bill-to-table bug hid (§8). The helper is
[qa/floorstate.mjs](backend/src-plattr/functions/test/e2e/qa/floorstate.mjs): `node floorstate.mjs 6 billed`,
`… 6 dump`, `… audit`. Add a state there when a screen needs one, rather than writing a second helper.
Test the helper on every state before briefing the driver, because a broken seed looks like a broken screen.

**Order.** Risk first, from what has already failed: till floor (merge, move, Clear), bill
(charges, cancel, credit note), tender (part-pay, refund), server orders tab, kitchen, consumer,
admin. Day close gets its own session, because a closed day blocks later payments.

## 6. The driver prompt, minimum

Paste the step or grid table, and nothing else the driver doesn't need. Always include:
- the environment: slot, ports, seed, restaurant, table, staff logins, the exact dish
- the tooling sections of FRONTEND_TESTING.md to read (§2, §4, §6, §11), by section, not whole
- the rules in §4 (or the grid and misuses in §5), the command budget, and the trajectory file path
- **a "do not report" list**: open `TECH_DEBT.md` rows for that screen, and any by-design difference
  the driver will trip over (a tile shows food at ₹60, the bill ₹66 with service charge and tax). Without
  it, the report fills up with known items.
- the spec sheet's scenario ids next to each grid row, so every expected result cites its source
- the trajectory line shape:
  `{"hop":1,"app":"consumer","action":"...","url":"...","expected":"...","actual":"...","verdict":"PASS|FAIL|BYPASSED|NOTE","reason":"...","ts":"ISO"}`
- the final message: the per-step table, evidence for every FAIL or BYPASSED, the money seen, and
  anything that looked wrong even where the read-back passed

## 7. Proof and what happens to a finding

- The trajectory goes to `backend/src-plattr/functions/test/e2e/results/<name>-<date>.jsonl`.
  The report goes to `moonshot/reviews/<date>-<name>.md`. The prose summarises the file; it never
  replaces it.
- **The finder does not fix.** An exploration run only finds and writes down. A separate agent reads
  the report, looks at the code and fixes it, so each finding has to stand alone for a reader who
  wasn't there. Each one gets: a severity (P0 money wrong or lost, P1 cashier blocked or misled, P2
  friction, P3 cosmetic), the scene in a restaurant sentence, steps from a clean re-seed (helper
  commands, login, test ids), the expected result with its scenario id, what the screen said (quoted)
  and what the database said, and the evidence (trajectory cell, screenshot). No proposed fix; at most
  one "where to look" line. The report ends with **suggestions from the cashier's chair** (features
  wanted after an evening on the screen) and a coverage grid of control × state.
- **Every real bug becomes one automated check** at the cheapest level that can see it: a unit test
  for a rule, an e2e suite or the journey for a transaction, Playwright for something only the
  screen shows. Prove the check red on the old code, then green on the fix.
- Something found and not fixed gets a `TECH_DEBT.md` row the same day.
- **Graduate.** Steps that pass twice become a script. Agents explore; scripts guard. The journey
  already asks the floor what it sees after issue and payment, so the bill-to-table bug can't
  return silently.

## 8. Proven gotchas

Each one cost a run time or produced a false finding.

- **Fixtures must keep ids distinct.** Billing unit tests used `s1` for the cashier login, the
  guest sitting and the draft, so a bill storing the wrong one passed every test. Never share an
  id between two concepts in a fixture.
- **Tests that seed the shape their own code expects prove nothing about the seam.** Check at
  least once that the real writer produces what the reader's seed assumes.
- **Staff logins share the `sessions` collection** (`entity: 'server'`, no `tableId`). Any reader of
  "active sessions" must skip them.
- **The debug consumer build prefills OTP 123456** (`config/dev_guest.dart`). "Session activated
  with no OTP typed" is not a bug.
- **`mi_veg_bir` opens a customization sheet**, and a seeded biryani offer fires on it. Pick the
  dish from the seed, not from memory.
- **Kitchen card id is `kitchen-cart-<orderId>_<index>`**; the server card id is `order-cart-<cartId>`.
- **`ab login server` can print a timeout and "no login-submit" on a login that worked.** Check the
  screen before reporting it.
- **The till forgets its login on every page load** (TD-052). Until that's fixed, expect a re-login
  after every tile tap. Every till spec hides this by logging in after each `goto`.
- **`make check` rebuilds `lib/`, and a running emulator reloads it mid-suite.** An e2e run started
  right after can fail at random (18 of 52 once). Rerun before debugging.
- **Running the backend e2e suites and the till specs on one slot collides**: both seed tables
  numbered 7, 12 and 19 in `res_e2e_all_on`. Re-seed `--clean` between them.
- **`journey.mjs` closes the business day** at the end, and later payments that day are refused.
  Re-seed after it.
- **Other sessions share the source tree.** Take your own emulator slot (`EMU_SLOT`); slot 0 is
  usually someone else's. The till follows it only if started with `VITE_FUNCTIONS_URL` pointing at
  your slot (FRONTEND_TESTING §3); otherwise it quietly reads slot 0.

## 9. Editing this file

For any agent running this process:
- Add only what a real run demanded: a false finding, a wasted hour, a bug a rule would have
  caught. Never add something in advance.
- One line per lesson, with its date in the run log. Replace a line rather than adding a second one
  that says the same thing.
- Remove a gotcha once its cause is fixed (for example, TD-052's line when the till keeps its login).
- The tooling (commands, identifiers, ports) belongs in FRONTEND_TESTING.md, not here.
- Keep it readable in one sitting. If a section grows past a screen, it's time to cut, not add.

## Run log

| date | mode | what | result | report |
|---|---|---|---|---|
| 2026-09-22 | spine | dine-in, one dish, cash, 5 apps; Opus driver, parent observer | 5/6; Clear failed. Found: bills not linked to their sitting, blank staff tiles, till login loss, tile vs bill amount | [sanity-run-1](moonshot/reviews/2026-09-22-sanity-run-1.md) |
| 2026-09-25 | spine (till steps 4–6) | re-drive on a real checkout after the fix | 10/10; the tap after issue now routes to the bill | same report, "Fixed 2026-09-25" |
| 2026-09-25 | exploration | till floor: merge, unmerge, move, tap, clear, walk-out, roles, stale; Opus driver with a seed helper | 93 cells, 19 FAIL (1 P0, 4 P1). Refusals and roles held; walk-out, parcels and stale Confirm did not. The top 3 were reproduced by the observer on the backend | [qa-till-floor](moonshot/reviews/2026-09-25-qa-till-floor.md) |
| 2026-09-25 | exploration | till bill screen: preview, generate, cancel, comp, service charge, split (API only), dessert after the bill; Opus driver, grid written first by a read-only prep agent | 73 cells, 25 FAIL (2 P0, 5 P1). Numbers and tax held; the split offer and the part-paid cancel did not. Both P0s were reproduced by the observer on the backend | [qa-bill-screen](moonshot/reviews/2026-09-25-qa-bill-screen.md) |
| 2026-09-25 | exploration | till tender screen: cash, change, split, tips, overpay, on account, void, refund, lost answer, reload, two tills, roles, then floor and day close; one agent as driver and observer | 48 cells, 10 FAIL (4 P1). Every take's money held; a credit note blocks day close for good, a lost answer freezes the tab's payments, and refunds need ids no screen shows. The top 3 were reproduced on the backend | [qa-till-tender](moonshot/reviews/2026-09-25-qa-till-tender.md) |
| 2026-09-25 | exploration | till day close: blind count, movements with PIN, over/short, open/part-paid/on-account/comp/cancelled/walk-out/estimate, close twice, two tills, reload, roles, after the close, past and future dates; one agent as driver and observer | 51 cells, 11 FAIL (4 P1). The money and the blind count held; a walk-out or a cancel still blocks the close and the till can't clear it, nothing links to the screen, and a mistyped movement can't be voided. The top findings were reproduced on the backend | [qa-till-dayclose](moonshot/reviews/2026-09-25-qa-till-dayclose.md) |

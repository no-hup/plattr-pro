# Agent hand-offs · after the till QA runs · 2026-09-25

Paste one prompt per agent. Each prompt stands alone. **Two agents: A and B. Five: A to E.**
Every prompt starts with the shared rules below, pasted verbatim.

Machine budget (checked 2026-09-25): about 3 GB free memory, emulator slots 1–3 free (the port math stops at 3).
A, B and C each need an emulator, and C also needs a browser. D needs a slot only briefly at the end. E needs none.

---

## Shared rules (paste at the top of every prompt)

```
You are working unattended in /Users/shaurya/Desktop/dev/plattr-pro (branch `moonshot`). Shaurya is not available to
answer questions. Other agents are working in the same checkout at the same time.

Read first: CLAUDE.md (it points at moonshot/CLAUDE.md), TESTING.md, AGENT_QA.md.

What you may do freely:
- Anything that only adds or changes TESTS, test helpers, test docs, or review/report files. Go all in there.
- Read any code.

What you must NOT do, and must park instead:
- Any change to product code that alters behaviour: what an endpoint accepts, refuses, writes or returns; what a
  screen sends to the backend; money, tax, audit, auth, sessions, PIN rules. This includes "obvious" fixes.
- Instead, write each one in your report under a heading `## Parked for Shaurya`. For each one write: the finding
  id, the scene in two lines, the root cause with file:line, the fix you would make, what else it touches (grep
  every caller), and the question Shaurya has to answer, if any. Make it good enough that a later session can
  apply it in minutes.

Working alongside others:
- Your own emulator slot only: `cd backend/src-plattr && ./emu.sh` picks a free one and prints it (moonshot/CLAUDE.md,
  "Emulator slots"). Never slot 0. Before starting one, check memory (`vm_stat`); if free+inactive is under about
  1.5 GB, wait and retry rather than start. All slots run the same source files, so never break shared backend code
  on purpose to prove a test goes red; prove red against the code as it is.
- Stop every process you started before you finish (emulator, vite, browser).
- Touch only the files your prompt names or files you create. If you need to change a file outside that list, park
  it in your report instead.
- Git: commit only your own files, by explicit path (never `git add -A` or `.`), with a message ending
  `Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>`. Do NOT push, pull, rebase, stash, reset or
  checkout. Shaurya pushes later.
- Never weaken or delete an existing test to make something pass.

Finish with a short report (plain English, bullets): what you did, what is committed (hashes), what is parked, what
you did not get to.
```

---

## A · Guard tests for the 31 QA findings, plus a fix plan  *(pick in both the 2 and 5 plans)*

```
<shared rules>

Task: turn the two QA reports into regression tests and a fix plan. Do not fix product code.

Inputs:
- moonshot/reviews/2026-09-25-qa-till-floor.md (QF-1..QF-15)
- moonshot/reviews/2026-09-25-qa-bill-screen.md (QB-1..QB-16), each with steps from a clean seed
- moonshot/reviews/2026-09-25-ticket-till-test-stack.md, section "Where each finding should have been caught"
- The seed helper backend/src-plattr/functions/test/e2e/qa/floorstate.mjs (read only; agent B owns it)

Do:
1. For every finding whose bug a backend call can see (the ticket lists about 12, including all 3 P0s: QF-1, QB-1,
   QB-2), write a test at the cheapest level that fails today: a Jest unit test under test/unit/ where the logic is
   pure, otherwise a backend e2e check in the matching suite under test/e2e/suites/ (floor.js, billing.js, …). Name
   each test by its finding id and rule, e.g. "QB-2 BL: a bill with money on it cannot be cancelled". Work the
   expected values out by hand, as in the reports.
2. Prove each one fails against the current code, and record the failure line.
3. These tests will be red until the bugs are fixed. Do not leave the default runs red for everyone else: find the
   least clever way the existing runners allow to mark a test as a known bug (reported, counted, visibly listed,
   not failing the run), and use one way everywhere. If none exists, add the smallest one to the runner and
   explain it in one line in TESTING.md. It must flip to a plain failure the day the bug is fixed, so nobody forgets
   to un-mark it.
4. For all 31 findings, write moonshot/reviews/2026-09-25-qa-fix-plan.md: finding → level (backend/browser) → test
   (path, or "browser, see agent B") → root cause file:line → proposed fix → blast radius (callers grepped) →
   safe to apply without Shaurya? (yes only for wording or display that changes no request). Everything else goes under
   `## Parked for Shaurya`. Note known spec conflicts: QF-2 (FL R14 vs the walk-out decision), QB-1 (SPEC_BL decision
   log 2026-09-15 says a split drops the discount; the STATE.md TD-016 clamp needs `targets`, ORDER offers have none).
5. Run the full unit suite and the e2e suites you touched on your own slot; both must end green apart from the
   marked known bugs.

Files you own: new/changed tests under backend/src-plattr/functions/test/ (not test/e2e/qa/), the runner change if
any, one line in TESTING.md if needed, the fix-plan file.
```

---

## B · The till test stack (the ticket, test-only parts)  *(pick in both plans)*

```
<shared rules>

Task: build moonshot/reviews/2026-09-25-ticket-till-test-stack.md. Read it fully first. Answer its "Questions for the
builder" in that file (write your decision and one line why) before building. Commit the ticket file with your work.

Limits specific to you:
- TD-052 (the till forgets its login) is PRODUCT code: park it, do not fix it. Write the floor → bill → tender →
  floor walk so it logs in once, and mark the extra-login failure as a known bug the same way agent A marks backend
  ones (coordinate by reading TESTING.md for what A added; if A has not added anything yet, use Playwright's own
  `test.fail()` with the finding id in the title).
- You own the shared seed module. Keep backend/src-plattr/functions/test/e2e/qa/floorstate.mjs working at its path
  with the same CLI (agent C uses it during its run). Build on it, don't move it; if moving it is right, park the move.
- Never change a screen or a hook in frontend/till/src. If a control has no data-testid, list it in your report
  under Parked (adding one is a product-code change for this session).
- Write browser tests for the screen-level findings (QF-4, QF-7..QF-15, QB-3's unreachable Cancel, QB-6, QB-8..QB-11,
  QB-14, QB-15), each named by id, marked known bug, and proven to fail today. Do not write tests for TenderScreen
  findings; agent C is exploring that screen now. If agent D is running (Shaurya will say so when he pastes this;
  if unsure, check `git log` for commits touching frontend/till/e2e/qa-display.spec.ts), skip D's list: QF-8, QF-9,
  QF-10, QF-12..QF-15, QB-9, QB-15.
- Make the Playwright config follow EMU_SLOT (functions URL and a free Vite port) so any session can run it.
- The existing ~60 specs must still pass on your slot at the end.
- Update AGENT_QA.md §5 and FRONTEND_TESTING.md to point at the result, by their own editing rules.

Files you own: frontend/till/e2e/**, frontend/till/playwright.config.ts, frontend/till/package.json (scripts only),
test/e2e/qa/ (additions), the ticket file, the AGENT_QA.md §5 / FRONTEND_TESTING.md lines.
```

---

## C · Exploration run: the till payment screen  *(3rd pick; in the 5 plan)*

```
<shared rules>

Task: explore the till's payment screen (frontend/till/src, TenderScreen and its hook) the way AGENT_QA.md describes a
screen exploration. You are both the driver and the observer: run the grid in a headless browser, then reproduce your
top findings by calling the backend directly on a clean seed, and add an "Observer check" section.

Follow the two earlier runs as the model for scope and report shape:
- moonshot/reviews/2026-09-25-qa-till-floor.md and moonshot/reviews/2026-09-25-qa-bill-screen.md
- moonshot/reviews/2026-09-25-qa-bill-screen-grid.md (how the grid was prepared first)
Spec: moonshot/SPEC_PY_payments.md (and SPEC_UQ_upi_dynamic_qr.md for UPI), plus the "Who can do what" rules in SPEC_BL.

Seed with backend/src-plattr/functions/test/e2e/qa/floorstate.mjs (states billed, partpaid, settled already exist).
You may ADD new states to it (append only, through real endpoints, tested on one table before use); agent B also
works in that folder, so never rename or restructure it.

Cover at least: exact cash, cash with change, split across cash and UPI/card, tips, over-payment, on-account, refunds
and voiding a payment (PIN), paying a cancelled or comped bill, double-tap Take, reload mid-payment, two tills paying
one bill, a SERVER login, the part-paid bill from QB-2, and what the floor and the day close then show.
Also write "Suggestions from the cashier's chair".

The finder does not fix. Report: moonshot/reviews/2026-09-25-qa-till-tender.md (findings QT-1…, most severe first,
same format as the earlier two). Trajectory: backend/src-plattr/functions/test/e2e/results/qa-till-tender-2026-09-25.jsonl.
Add one run-log row to AGENT_QA.md. Known open bugs are not re-reported (TECH_DEBT open rows, QF-*, QB-*), but
say if one of them looks worse from this screen.

Files you own: the report, the trajectory, the AGENT_QA.md run-log row, appended states in floorstate.mjs.
```

---

## D · Safe wording and display fixes on the floor and bill screens  *(5 plan only)*

```
<shared rules>

Task: fix only the findings that change words or what is shown, never what is sent or allowed. This is the one
agent allowed to edit product code, and only inside this list.

Candidates (confirm each is display-only by reading the code first; if not, park it):
- QF-9 (picking shows document ids like tbl_meg_… in messages), QF-12 (tiles sorted as text: 1, 10, 11, 2),
  QF-13 (a seated tile shows no word), QF-14 (the PIN box shows a code word like "releaseUnpaid"),
  QF-15 (identical split-chooser buttons), QF-8 (dessert tile drops "new"), QF-10 (stale floor not greyed),
  QB-9 (refusals show internal ids / code words), QB-15 ("Wrong PIN" stays after the PIN box is cancelled).
- Source: moonshot/reviews/2026-09-25-qa-till-floor.md and moonshot/reviews/2026-09-25-qa-bill-screen.md.

Rules specific to you:
- Only frontend/till/src files for the floor, bill and PIN box. Do NOT touch TenderScreen or its hook (agent C is
  exploring it right now) and do not touch any backend file.
- A message that needs data the screen does not have (e.g. a table number the backend does not return) is not
  display-only: park it.
- Each fix gets a Playwright test named by its id in a NEW file frontend/till/e2e/qa-display.spec.ts (agent B owns
  the rest of e2e/). Prove it fails before the fix and passes after.
- If an existing spec asserts the old text, update that assertion to the new correct text and say so in the commit;
  that is not weakening.
- Run `npx tsc -b` and `npx oxlint` in frontend/till. Run the till specs on a free slot (1–3) once at the end; if none
  is free for 20 minutes, leave a note saying the specs were not run.
- One commit per finding.

Files you own: the till source files for those fixes, e2e/qa-display.spec.ts, assertion updates in existing specs.
```

---

## E · Plan the waiter app exploration (read-only)  *(5 plan only)*

```
<shared rules>

Task: prepare, do not run, the next screen exploration: the waiter (server) Flutter app, the screens a captain uses
on the floor. No emulator, no browser. Read only.

Model: moonshot/reviews/2026-09-25-qa-bill-screen-grid.md is exactly the kind of document to produce.
Write moonshot/reviews/2026-09-25-qa-waiter-grid.md with:
- the screens a captain touches in a shift, and for each: its controls with their keys/identifiers (read
  frontend/src-platter-apps/apps/platter_server and FRONTEND_TESTING.md for how Flutter screens are driven);
- the states each screen must be seen in, and how each state is produced through real endpoints (reuse the
  floorstate.mjs states where they fit; list missing ones with the endpoint calls that would produce them);
- the grid (control × state), with spec ids (moonshot SPEC_* sheets, and the waiter-confirmation gate in CLAUDE.md);
- misuse to try (double tap, two captains on one table, a stale list, the guest ordering at the same moment);
- where the waiter app meets the till (the floor findings QF-1..QF-3 were at that seam): list each seam to check;
- the do-not-report list (open TECH_DEBT rows and known findings);
- questions where the spec is unclear, and your top suspects with file:line.

Files you own: that one grid file. Commit it.
```

---

## Which to pick

- **Two agents: A and B.** They use up what the runs already found (tests for every finding, plus a fix plan ready
  for a session with Shaurya) and make the next run cheaper. Neither changes product behaviour.
- **Five: add C, D, E.** C finds new bugs on the payment screen. D clears the small wording bugs. E prepares the next
  run at no machine cost.
- **Memory is the limit with five.** A, B and C each run an emulator, and C a browser too, on about 3 GB. If the
  machine struggles, hold C until A or B finishes.

# Ticket · make the till's browser tests catch what the QA runs caught · 2026-09-25

**For:** the agent who builds it. **Status:** built 2026-09-25 (agent B), test parts only; TD-052's fix is parked (see the answers below). The *what* and *why* are settled below; the *how* is
yours, and the open questions at the end are real questions, not decided answers. Read [TESTING.md](../../TESTING.md)
and [AGENT_QA.md](../../AGENT_QA.md) first.

## The problem in one paragraph

The till already has a browser suite: [frontend/till/e2e/](../../frontend/till/e2e/), 8 files, about 60 Playwright tests,
one per spec scenario, and it **passed** on the morning of 2026-09-25. That afternoon two exploration runs on the same
screens found 31 bugs, 3 of them P0
([floor](2026-09-25-qa-till-floor.md), [bill screen](2026-09-25-qa-bill-screen.md)). A green suite beside 31 bugs on
screens it claims to cover means the suite is testing something other than what a cashier does. The job is to fix
that, and to make the next exploration run cheaper.

## Why the suite missed them (evidence, not guesses)

1. **It seeds hand-written documents.** Every spec PATCHes tables, lines, sessions and bills straight into Firestore
   in the shape the screen expects (e.g. [floor.spec.ts](../../frontend/till/e2e/floor.spec.ts) `reset()`). The QA runs
   seeded through the real endpoints ([floorstate.mjs](../../backend/src-plattr/functions/test/e2e/qa/floorstate.mjs)),
   and states the product really produces broke the screen: a walked-out table then a new party (QF-1), a split of an
   offer order (QB-1, QB-6), a part-paid bill then cancel (QB-2). TESTING.md: "seams tested from the real writer".
2. **It logs in after every page load, which hid a P1.** TD-052 (the till forgets its login on every screen change)
   survived because every spec calls `login()` after each `goto`. The QA driver re-logged in about 20 times per run.
3. **It walks the spec's happy line, one scenario per test.** No test goes screen → screen as a cashier does (floor →
   bill → tender → floor), and almost none tries misuse: double tap, a stale screen, two tills, reload mid-flow,
   Cancel after leaving the page. Those are where QF-4, QF-7, QB-3, QB-8 and QB-10 live.
4. **Each spec file carries its own copy of the Firestore helpers** (`enc`, `seed`, `del`, a login), so a fix to one
   never reaches the others.
5. **It only runs on slot 0.** [playwright.config.ts](../../frontend/till/playwright.config.ts) pins Vite to :5173 and the
   till falls back to functions on :5002. A second session cannot run it without trampling someone else's emulator.

## Where each finding should have been caught

A rough split of the 31 findings by the cheapest test that sees them (TESTING.md "cheapest level"). Rough, because
some are both:

- **Backend e2e, no browser (about 12, including every P0):** QF-1, QF-2, QF-3, QF-6, QB-1, QB-2, QB-3's refusal,
  QB-4, QB-5, QB-7, QB-12, QB-13. These belong in [backend e2e suites](../../backend/src-plattr/functions/test/e2e/suites/),
  not Playwright. Note QB-1 has a near-miss test already: the TD-016 split fix (STATE.md, 2026-09-16) was tested
  with item-scoped offers only; an ORDER-scope offer skips the clamp.
- **Browser only (about 19):** wording, missing states and flow, e.g. QF-4, QF-7 to QF-15, QB-6's blank screen,
  QB-8, QB-9, QB-10, QB-11, QB-14, QB-15, and QB-3's "Cancel is unreachable".

So the browser suite should stay small and be about **flow and words**. Money rules belong one level down.

## What done looks like

- **One seed module, real writers.** Specs get table states from one shared module that produces them through
  the real endpoints (guest OTP, cart, checkout, `billing-issue`, `payments-take`, `billing-split`, `floor-clear`),
  the way `floorstate.mjs` does. The QA driver and the specs use the **same** module, so a state added for one run
  is there for every later test. Hand-written documents stay only for states no endpoint can produce yet (offline,
  a stuck printer), each with a one-line comment saying why.
- **TD-052 fixed first, then logins once per test.** A spec logs in once and walks floor → bill → tender → floor
  without logging in again. That walk is itself the TD-052 test.
- **A few cashier walks, not more scenario tests.** Something like three to five tests, each a real shift moment
  from seed to paid, with the misuse in the middle: the dessert after the bill, the part-paid table, the split, the
  walk-out then new party. Each asserts what the screen says **and** what the database holds.
- **Every fixed QF/QB finding leaves a test, named by its id,** at the level the list above gives it. A fixer who
  closes QB-2 adds a backend test "QB-2 …"; one who closes QF-9 adds a browser one. This is the loop that makes
  exploration runs pay off twice.
- **Runs on your own slot.** One command, run from any session, uses `EMU_SLOT` for the emulator, the functions URL
  and a free Vite port. No session ever needs slot 0.
- **The existing 60 tests keep passing** or are deleted with a reason, never weakened (TESTING.md).
- **AGENT_QA.md and FRONTEND_TESTING.md point at the shared seed module** instead of the QA folder.

## What makes the next exploration run cheaper (measured from the two runs)

| What cost the driver time | What removes it |
|---|---|
| About 20 re-logins per run (TD-052) | The fix plus the login-once fixture |
| Three full re-seeds per run to reset one table | A per-table reset in the seed module, so one table can go back to free without wiping the rest |
| States built by hand from the grid each time | Named states in the shared module, listed by `--help` |
| No till screen for split, so API calls marked BYPASSED | Not this ticket: a product gap (FR-2 in [the bill-change requests](2026-09-25-feature-requests-bill-changes.md)) |
| Finding the test ids by reading JSX | Every control the grid names has a `data-testid`, and the ids are listed once per screen |

## Questions for the builder (decide, write the answer here, then build)

1. **Where does the seed module live?** Frontend and backend both need it. Options: keep it under
   `backend/.../test/e2e/qa/` and import it from the till specs by relative path; or a small shared folder. It is
   `.mjs` today; the specs are TS. Which costs less to keep in step?
2. **Migrate the 60 hand-seeded tests, or leave them?** They are fast and pass. Rewriting them all on real writers is
   big. Alternative: leave them, add the walks on real writers, and move a test over only when it lies (like TD-052
   did). Which tests are most likely lying today? The floor and billing specs are the first suspects.
3. **Restaurant for the walks:** MockData7's `res_meghana` (what QA uses, real menu, has the ₹100 offer) or the e2e
   restaurants the specs use (`res_e2e_all_on`, controlled config)? One seed for both suites would be simpler, but
   the specs rely on e2e-restaurant config such as a 10 % service charge.
4. **How is state isolated between tests?** A table per test, a per-table reset, or a full `--clean` import before
   the file (about 1 s)? `workers: 1` today because PIN attempts share staff accounts. Can the walks run in parallel
   with a staff account each?
5. **Misuse helpers:** stale screen (`page.route` abort, already used in [offline.spec.ts](../../frontend/till/e2e/offline.spec.ts)),
   double tap, two tills (two browser contexts), reload mid-flow. Worth a tiny shared helper, or inline each time?
6. **Can the QA trajectory feed tests?** Each run writes a JSONL of cells (`test/e2e/results/qa-*.jsonl`, gitignored).
   Turning cells into tests automatically sounds cheap but would copy the driver's exact clicks, which are brittle.
   Our lean: no, a person or agent picks the finding and writes the test by hand. Challenge it if you see a better way.
7. **When does it run?** Nothing runs the till suite automatically today. Before a commit that touches `frontend/till`
   or `app/billing.ts`? From `scripts/dev-up.sh`? Keep it opt-in? Weigh against the 16 GB memory budget in
   FRONTEND_TESTING.md.
8. **TD-052's fix is product code.** Do it in this ticket, or as its own change first? It changes every spec's
   `login()` either way.

### Answers (agent B, 2026-09-25)

1. **It stays where it is**, [floorstate.mjs](../../backend/src-plattr/functions/test/e2e/qa/floorstate.mjs), same
   path and CLI, now also a module (`setState`, `resetTable`, `dump`, `list`, `call`). The specs import it by
   relative path; Playwright loads `.mjs` as it is. One file, no build step, no types to keep in step.
2. **Leave the 60, add walks on real writers.** They pass and are fast; rewriting them all is a week for no found
   bug. Move one when it lies. The floor spec is the first suspect (hand-written lines and sittings, the shape
   that hid the bill-to-table bug), then billing.
3. **Meghana for the walks, the e2e restaurants for the old specs.** The walks must see what QA saw (real menu, the
   ₹100 order offer, 5 % SC); the old specs rely on `res_e2e_all_on`'s 10 % SC. A global setup imports both seeds
   on top of the slot before every run (under a second each), so it stays one command.
4. **A table per test, reset per table.** `floorstate.mjs <n> reset` puts a table (and anything merged into it)
   back to the seed and deletes its sittings, orders, lines, bills, notes and payments. Each walk resets its own
   tables in `beforeEach`. `workers: 1` stays: 96 tests take about three minutes, and parallel staff accounts
   would be new seed for no measured need.
5. **Inline.** Each misuse is one or two Playwright lines (`page.route` abort, two clicks in one `evaluate`, a
   second context); a helper would be longer than its uses.
6. **Agreed: no.** A finding is picked and written by hand; the trajectory stays evidence, not a test source.
7. **Opt-in**, `EMU_SLOT=<n> npm run e2e:ui` in `frontend/till`, before a commit that touches the till or
   `app/billing.ts`. Not from `dev-up.sh`: that brings up slot 0 and four Flutter apps, and a browser suite on top
   breaks the 16 GB budget.
8. **Its own change, first, by a session allowed to touch product code.** It is parked. The walks are written to
   log in once; `TD-052 one login carries the cashier…` is marked known bug, and the other walks log in again
   through one `loginAgain` marked `DEBT(TD-052)`, which fails loudly the day the login form stops appearing.

## Out of scope

- Fixing the QF/QB bugs themselves (each goes to a fixer; this ticket only makes their tests land somewhere).
- Screenshot or pixel tests (TESTING.md "Don't").
- The Flutter apps. The same thinking will apply there later; build the till first and learn from it.
- New till features (split button, add to bill): see the feature requests.

# The sanity run — one sitting, every screen, an agent drives, a session watches

> **Superseded 2026-09-25 by [AGENT_QA.md](../../AGENT_QA.md)**, the maintained version. This page is the original design, kept for the record.

Written 2026-09-22 for Shaurya. Run 1 executed the same evening: [2026-09-22-sanity-run-1.md](2026-09-22-sanity-run-1.md) — 5 of 6 hops pass, the BL/FL seam is broken on a real bill, and the step-card corrections are listed there.

## The one-line version

**One guest, one dish, one cash payment, pushed through all five screens in order, with the
Firestore document read back after every tap.** The run's output is a per-hop list of
`PASS / FAIL / BYPASSED`, never a single green tick. A driver agent taps; the parent session
watches logs and documents and never touches the browser.

## What already exists (do not rebuild)

| piece | what it gives the run |
|---|---|
| [journey.mjs](../../backend/src-plattr/functions/test/e2e/journey.mjs) | the whole chain over the **API**: vacant table → OTP → cart → checkout → kitchen → served → floor → preview → issue → take → settled. Has `makeBillable()` (tax config so a bill can issue) and `--setup-only`. Every hop we want, already ordered and rupee-checked, just not through screens. |
| [ab.sh](../../scripts/ab.sh) + [FRONTEND_TESTING.md §11](../../FRONTEND_TESTING.md) | the three Flutter hops through the browser (consumer checkout, kitchen Mark Ready, server long-press Mark Served), measured at ~90 s. Identifiers exist for every control on that path. |
| till Playwright specs [frontend/till/e2e/](../../frontend/till/e2e/) | `data-testid` on every till control we need: `floor`, `tiles`, `preview`, `issue`, `bill-number`, `take`, `amount`, `status`. But every spec **hand-seeds its lines**; none has ever received a real guest order. |
| [dev-up.sh](../../scripts/dev-up.sh) | emulator + MockData7 + five apps in one command. `--no-browser` is the agent form. |
| Firestore REST, `Authorization: Bearer owner` | the read-back. The screen can lie, the document cannot. |
| [findings.cjs](../../backend/src-plattr/functions/test/findings.cjs) → FINDINGS.md | one issue log every layer already appends to. |

## The gap, precisely

Two worlds meet at one seam. Checkout (old Flutter world) writes `lines/` snapshots; the floor and
the bill (new till world) read them. `journey.mjs` proves the seam over the API. The till specs
prove the till over fake lines. **Nobody has proved a real tap on the guest's phone ends as a
number on the cashier's screen.** That is the run.

## The scenario: "the golden sitting"

Fixed forever, so a failure means the code moved, not the test.

- Restaurant `res_meghana`, table `tbl_meg_6` (vacant in MockData7), Customer One `9876543210`, OTP `123456`.
- One dish, no customisation, qty 1: `mi_veg_bir` (adds directly, no sheet).
- Cash, full amount, no split, no discount, no PIN, no offer that fires (verify once against
  [verifyGolden](../../backend/src-plattr/functions/mock/verifyGolden.js); if one fires, pick a
  dish that dodges it).
- Expected rupees at every hop hand-computed **once** and written into the step cards.

Hops. Each is: one actor, one app, one control, one read-back.

| # | actor | app | control | read-back that proves it |
|---|---|---|---|---|
| 0 | — | shell | `dev-up.sh --no-browser`, then `makeBillable` | `dev-listRestaurants` answers; tax block on config |
| 1 | guest | consumer | scan route → `verify-*` → `menu-add-mi_veg_bir` → `menu-open-cart` → `cart-checkout` | order `IN_PROGRESS`, cart 0 `PENDING`, **one `lines/` doc with a `taxBlockId`** |
| 2 | kitchen | kitchen | `kitchen-mark-ready` | cart 0 `READY` |
| 3 | captain | server | long-press card → `order-mark-served` | cart 0 `SERVED`, line `sent` |
| 4 | cashier | till | `floor` tile for table 6 shows ₹X → tap → `preview` shows ₹X → `issue` | bill doc, `bill-number` on screen equals `billId` in doc |
| 5 | cashier | till | `take` cash `amount` = payable | payment doc, bill `settled`, tile reads settled |
| 6 | cashier | till | Clear | table free, session ended, `activeSessionId` null |
| 7 | (variant) | consumer → kitchen → server | round 2 on the same session before hop 4 | same order, **two** carts. This variant is the one that caught both Sep blockers; run it as `--two-rounds`, not in the base. |

Day close is **out** of the base run. It is once-a-day state and fights "run it five times an
afternoon". Add it later as its own variant.

## Three rules the run lives by

1. **Every hop goes through its screen.** The old rule "set up through the API, exercise through
   the UI" is right for feature tests and wrong here. The sanity run's whole value is that the
   state entering each screen was produced by the previous screen, not by a seed.
2. **A broken hop is bypassed, not fixed, and never hidden.** If the screen cannot do hop N
   (control missing, feature not built, real bug), the driver performs hop N with the exact API
   call `journey.mjs` uses, marks the hop `BYPASSED` with the reason, and continues. So one run
   always reaches "table free", and the report says precisely which hops the screens own today.
   The number to drive to zero is the count of `BYPASSED`. This is how "functionality not yet
   built" stops blocking the run.
3. **Stop on the first `FAIL`, dump, do not retry.** A `FAIL` is a read-back that disagrees with
   the card after the tap. The driver dumps the order, table, session, lines and bill documents,
   the last 50 lines of the app log and `console --errors`, then stops. Retrying hides races.

## Driver and observer: who does what

**Driver** = one Opus subagent. Its prompt is the step-card table above plus the ab/gstack
vocabulary, nothing more. It is told:
- one tab, one headless daemon (`ab preflight` first, `ab stop` last), apps visited in
  sequence; state lives in the backend, so leaving an app and coming back is free. Do not
  hold five tabs open: memory, not the browser, is the constraint on this Mac.
- Flutter apps via `ab`; the till via the same gstack daemon with `$B click [data-testid=x]`.
  One tool, one vocabulary. The till's own Playwright specs stay for feature tests.
- after **every** hop, append one JSON line to a trajectory file:
  `{hop, app, action, url, readback, expected, actual, verdict, ms, ts}`.
  That file is the report. Prose at the end is a summary of it, never a substitute.
- never report from memory of an earlier snapshot; every claim cites a read-back.

**Observer** = the parent session (this one, or the next). It never opens a browser. It:
- tails the trajectory file and the emulator log
  ([backend/flutter-app-logs/](../../backend/flutter-app-logs/)) side by side;
- after each hop, independently reads the same document the driver claims to have read. A
  driver that says `PASS` on a document the observer reads differently is the finding;
- watches for the slow poisons the driver will not notice: a function that answered in
  8 s, a second cart appearing when one was expected, a `setState during build` in the
  consumer log, a 1970 timestamp on the till;
- writes findings to FINDINGS.md through `findings.cjs`, one row per hop, `confirmed` when
  the observer's own read agrees.

Why split it: a single agent that both taps and judges reports from memory, drifts into
fixing, and calls the wrong tab a broken button (that false "Mark Ready is broken" already
happened once). Two roles, one file between them, is the cheapest guard.

## How it becomes cheap the second time

1. **Run 1, agent-driven.** The driver works from the cards and discovers what is missing:
   which till tile id, whether Clear has a testid, whether the floor sees a checkout line at
   all. Expect several `BYPASSED`. The trajectory file records the exact commands that worked.
2. **Freeze the commands.** The commands that passed in run 1 become
   `scripts/sitting.sh` (or a `--ui` mode on `journey.mjs`: same hop list, same rupees,
   browser instead of `fetch`). Deterministic happy path = script, not agent.
3. **Run N, script-driven; agent only on red.** The script prints the same per-hop table.
   When a hop fails, *then* the driver agent is spawned on that hop alone with the dump, to
   diagnose. The observer role stays with the parent session.

Do not write the script first. The first run is what tells you which identifiers and
which hops actually exist, and an agent finds that out faster than a human guessing at a script.

## Cost and memory, from what is measured

- Three Flutter hops measured at ~90 s including logins. The till hops are a plain React page,
  seconds. Whole run ≈ 3 min wall clock once the stack is up.
- One headless Chromium ≈ 0.6 GB. `ab preflight` refuses below 2 GB free or above 4 GB of
  personal Chrome; obey it.
- Driver context stays small because it reads the trajectory file, not full snapshots
  (`ab snap 6`, never `--base64` screenshots).

## Part 2 — per-screen exploration (after the sanity run is green)

Added 2026-09-22 evening. The sanity run proves the spine. This is how one agent then works a
single screen the way a QA tester would: every control, in every state it can meet, plus the
seven ways a real cashier misuses it.

### The permutations are derived, not imagined

An agent told "explore the floor screen" invents. An agent handed three lists and one rule
enumerates. Per screen, the card holds:

1. **Controls** — the identifiers on that screen (`ab ids` for Flutter, the `data-testid` list
   for the till: `start-merge`, `start-move`, `take`, `issue`, `cancel`, `toggle-charge` …).
2. **Entity states** — the words the spec sheet already uses. Floor: `free · seated · billed ·
   settled · merged-child · disabled · stale`. Bill: `draft · issued · part-paid · settled ·
   cancelled`. Cart: `PENDING · READY · SERVED · CANCELLED`.
3. **The spec's own scenario and rule IDs** (FL-S1…S35, R1…R20; the same for BL, PY, ST, DC),
   with a mark for which IDs an automated test already claims. Exploration targets the
   unmarked ones first.

The rule: **every control × every state it can be shown in, and every state where it must be
hidden or refused.** Merge is `start-merge` × parent ∈ {free, seated, billed, settled} × child ∈
{those four, merged-child, disabled}. Most cells are "must refuse with a named reason". The
agent walks the cells, the spec says which are allowed, and a cell where the screen and the
spec disagree is the finding. That is where your merge bug lives, and it is one cell of a
table, not a guess.

### Then the seven misuses, per control

Lifted from the exploratory-testing heuristic bank (state-transition ideas), rephrased for a
till. Applied to each control that passed the matrix:

| # | misuse | at the till it means |
|---|---|---|
| 1 | skip a step | deep-link `?bill=` for a table with no bill; `?draft=` after Clear |
| 2 | go backward | browser Back after Issue; Back mid-PIN |
| 3 | interrupt | reload during Take; cut the network after Issue, before Take (OF covers some) |
| 4 | repeat | double-tap Issue, Take, Clear, Merge; same `paymentId` twice |
| 5 | two actors, same transition | two till tabs merge the same pair; captain marks served while cashier issues |
| 6 | state after an error | a refused merge: is the picker still open, is the tile still selected, is money unchanged |
| 7 | timeout / stale | act on a 60-s-old picture (R1 says the tap re-reads); staff session expired mid-act |

Seven rows × the handful of controls on a screen is the whole session. It fits in one agent
run with a step budget.

### Oracle outside the agent (the one rule that makes findings trustworthy)

Borrowed straight from the agentic-browser-testing skill, because it names the exact failure
we already had once (a false "Mark Ready is broken" from the wrong tab):

- **Every cell states its expected outcome before the tap**: a document field, an audit row,
  or the refusal text. "No error" and "looks right" are not outcomes.
- **Every cell also states a forbidden state**: for a refused merge, "no `mergedInto` written,
  no audit row, money unchanged". The negative check is what kills the false pass.
- **The harness decides, not the model**: the observer re-reads the document. The driver's
  verdict is a claim until the observer's read agrees.
- **Step budget, no retry.** A run past its budget is `FAIL`, and a retry-until-pass loop is
  banned; both hide races, which are precisely the bugs the seven misuses exist to find.

### How exploration state differs from the sanity run

The sanity run forbids seeding, because its job is the spine. Exploration **must** seed: a
cell like "parent billed, child settled" would take ten screen-minutes to reach by hand and
seconds through Firestore REST. The till specs already carry the seed recipes (`seed()`,
`line()`, `PIN_1234`), and `journey.mjs --setup-only` produces a real drafted table in one
command. So: **seed the precondition through the API, perform the act through the screen,
read the outcome through the API.** The old rule from FRONTEND_TESTING applies again here.

### Session log and graduation

- The driver writes the same trajectory JSONL, one line per cell, plus a tag per observation:
  `BUG · QUESTION · IDEA · RISK · NOTE` (from the SBTM note template; the tag is what lets
  the observer sort a 60-line log without re-reading it).
- Every `BUG` gets a pipeline, not a comment: reproduction steps from the log → fix → **one
  automated test that fails on the bug and passes on the fix**, at the cheapest level that
  can see it (domain unit if it is a rule, e2e suite if it is a transaction, Playwright if
  only the screen shows it) → the spec's Decisions line. The next exploration of that screen
  skips it, because it is now marked covered.
- A cell green twice is graduated into the screen's spec file and never explored by an agent
  again. Agents explore; scripts guard.

### Order of screens

Risk-first, from what has already bitten: the **floor** (merge, move, clear; TD-033's cart
leak lives under it), then the **bill** (toggle-charge, cancel, credit note under PIN), then
**take** (part-pay, refund, tender picker), then the **server app orders tab** (long-press,
the two-cart vanish), then **kitchen**, then **consumer** (mostly stable; the rounds path
only). Admin last. Day close is its own session because it is once-a-day state.

## Borrowed from the two repos, and what was left

**petrkindlmann/qa-skills** (138★, 50 skills, updated yesterday). Took: the oracle-with-a-
forbidden-state rule; step budget with no retry; the state-transition heuristic bank (the
seven misuses); the charter shape "explore X with Y to discover Z" as the card header; the
five observation tags; the bug→regression-test pipeline; "graduate a green agent run into a
script". Left: SBTM time-boxing (agents do not fatigue), HICCUPS brand/comparable oracles
(not our problem), CI gating (no CI here yet), Playwright Test Agents for graduation (Flutter
draws to a canvas; our graduation target is `ab` commands and the till's own specs), and the
skill's Playwright MCP wiring (gstack already gives the accessibility-tree-first model on
this machine). Nothing installed.

**lackeyjb/playwright-skill** (3.1k★). A runner that executes ad-hoc Playwright scripts,
visible browser by default, dev-server detection, screenshot helpers. On this Mac a visible
browser is the memory incident; the till already has Playwright installed with its own
config; gstack drives the Flutter apps. Nothing to take.

## Assumptions I made, and questions for Shaurya

Stated so the run can start without waiting; correct any and the cards change, nothing else.

1. **The go-live payment path is the till** (floor → bill → take), not the server app's
   `order-mark-paid`. The old path stays untested by this run.
2. **Day close is out of the base run.** Variant later.
3. **`BYPASSED` is acceptable**: a broken hop is faked through the API and reported as such,
   never patched inside the run.
4. **One tool for all five apps** (gstack), the till's Playwright specs untouched.
5. Driver model **Opus, effort high**; observer is whatever session spawns it.

Open questions where the answer changes the work:

- Q1. Is there any hop above that is **already known** not to exist on a screen today (Clear on
  a settled tile, a checkout line reaching the floor)? If yes, say which, and run 1 skips
  straight to `BYPASSED` there instead of discovering it.
- Q2. Round 2 (two carts, hop 7): in the base run, or a variant? I put it as a variant, but it
  is the case with the best record of finding real bugs, and it costs three taps.
- Q3. Should the trajectory file live under
  [backend/src-plattr/functions/test/e2e/results/](../../backend/src-plattr/functions/test/e2e/results/)
  beside FINDINGS.md (my pick), or in the scratchpad and thrown away?

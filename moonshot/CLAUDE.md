# Moonshot — Agent Instructions

Plattr Pro is becoming a full restaurant POS for single-outlet Bangalore restaurants, replacing
Petpooja. Guest QR ordering, kitchen, captain and admin apps already exist in Flutter on Firebase.
New staff screens (till, day close, reports, config) are a React web app. This file governs all
new POS work. The root `AGENTS.md` still governs the existing apps.

## Commands
- Unit: `cd backend/src-plattr/functions && npx jest`
- E2E (emulator): `cd backend/src-plattr/functions/test/e2e && bash run-tests.sh`
- Emulator: `cd backend/src-plattr && EMU_SLOT=<n> ./emu.sh` — **pick a free slot, see below**
- Browser sanity: `npm run e2e:ui` in `frontend/till/` — TO BE CREATED, see STATE.md
- `make check` = lint + typecheck + unit — TO BE CREATED. Must be green before any commit.

## Emulator slots — you are not the only agent on this machine

Several agents work this repo at once. Each one gets its own emulator. This is already built and
needs no setup, so a port that is taken is never a reason to stop testing.

```bash
cd backend/src-plattr
./emu.sh                                 # background shell; takes the first free slot and prints it
eval "$(EMU_SLOT=3 ./emu.sh env)"        # the shell you test from, with the slot it just printed
bash functions/test/e2e/run-tests.sh
```

`./emu.sh` with no `EMU_SLOT` picks the first free slot itself and announces it. Pass `EMU_SLOT=n`
only when you want a particular one. `env` deliberately refuses to guess — pointing your tests at
the wrong slot means testing against another agent's database — so give it the slot that was printed.

There are four slots, 0 to 3. Not a budget decision: past slot 3 the port math overlaps (slot 5's UI
port is slot 0's logging port) and Firebase's own emulator hub takes 4400 upward. If all four are
busy, `emu.sh` refuses rather than quietly landing on slot 0 and wiping somebody's seed data.

Ports are `base + slot × 100`, so slot 3 is firestore 8380, functions 5302, UI 4301. Each slot is a
separate database — your seed data cannot be wiped by anyone else, and you cannot wipe theirs.
`emu.sh` refuses to start on a slot someone already holds, so the guard is automatic.

`npm run emulators` is slot 0. Never use it; it is the one slot everybody collides on.

**Read this before you report an emulator as blocked.** Ports 8080 and 5002 being busy means slot 0
is busy. It says nothing about slots 1 to 5. Run the loop above and take a free one. "The emulator
is occupied by another session" is not a finding — it is a slot you did not look for.

Two real limits, so you are not surprised:
- Every slot runs the same source files. Another agent saving a half-finished function is hot-reloaded
  into *your* emulator. A failure that makes no sense against your own diff is usually this. Re-run
  before you debug it.
- So do not deliberately break shared code to prove a test goes red while other slots are live: you
  break their runs too. Prove it red at unit level, or wait until you are alone on the machine.

## Stack (locked)
Backend: Firebase Cloud Functions (Node.js, TypeScript for new code) + Firestore. Emulator-first.
Staff web: Vite + React + TypeScript, PWA on Chrome for Android. Playwright for browser tests.
Printing: LAN (TCP 9100) first, Web Serial over Bluetooth second, native wrapper never unless both fail.
Bans: no new dependency without asking. No Next.js, Redux, CSS-in-JS, component library. No second
HTTP client. No ORM. No Firestore call outside `adapters/`.

## Layout and boundaries (new code only)
```
backend/src-plattr/functions/
  domain/     pure functions: pricing, tax, invoice numbering, state transitions. No imports from
              firebase, adapters, or app. Testable with plain jest, no emulator.
  app/        use-cases: "settle bill", "close day". Calls domain, calls adapters. No Firestore API.
  adapters/   firestore/, printers/, pay/, terminal/, aggregator/. The ONLY place Firebase or a
              vendor SDK is imported. One file per provider, same function names, `active.ts` picks.
frontend/till/   React app. Talks to Cloud Functions only. Never touches Firestore directly.
```
Illegal: `domain → anything`, `app → firebase`, `ui → adapters`. Enforced by `make check` (grep rule).
Why: the domain is what ports to Supabase or AWS later. Adapters are what gets rewritten. Keep the
line sharp and the port is a week, not a quarter.
**Module shape.** One module = one name used in every layer: `domain/<name>.ts`, `app/<name>.ts`,
`adapters/firestore/<name>.ts`, `api/<name>.ts`, `frontend/till/src/features/<name>/`. A new dev finds a
feature by name, opens four files, reads top to bottom. No `utils/`, `helpers/`, `common/` folders;
shared code lives in the layer that owns it under its own name. Template: `moonshot/SPEC_ST_staff_pin_and_approvals.md`.
Existing flat dirs (`cart/`, `orders/`, `offers/`…) stay as they are. Touch them only with a plan,
in their own style, with a characterization test first.

## Where things live
| Thing | Place |
|---|---|
| Price of a line, discounts, tax split | `domain/pricing` (extend `cart/calculateCartValue.js` logic, do not fork it) |
| Invoice numbers, series, reserved ranges | `domain/invoice` |
| Order / bill / line state transitions | `domain/state` |
| Per-restaurant settings | `restaurants/{id}/config` doc, read once via `app/config.ts` |
| Feature flags | `singleton/FeatureFlags.js` (existing, keep) |
| Errors | `singleton/ErrorHandler.js` (existing, keep) |
| Golden fixture | `mock/goldenExpectedValues.json` + `verifyGolden` (existing, extend) |
| PIN / password / OTP challenge | Backend answers `permission-denied` + `{requires:'pin'\|'otp'\|'password'}`; the till has ONE interceptor that prompts and retries. Never a per-screen popup. Flutter side is TD-003 |

## Read these to copy the shape
One example per thing, so nobody reads half the tree to find the pattern. Paths are
`backend/src-plattr/functions/`.

| Need the shape of | Read |
|---|---|
| An onCall endpoint, start to finish | `adminApp/staff_admin.js` → `resetServerPin` |
| Roles and the session check | `adminApp/auth.js` |
| PIN and password hashing | `utils/passwordUtils.js` |
| A unit test with hand-computed money | `test/unit/cart/calculateCartValue.test.js` |
| An e2e suite and how it authenticates | `test/e2e/suites/server-journey.js`, `test/e2e/lib/auth.js` |
| Throwing an error a client can read | `singleton/ErrorHandler.js` |

Read what you need to be right, not everything. One canonical example beats a survey, and a
grep for the one answer beats reading the file it sits in. Context spent on the tenth example
is context missing when the module is half built.

## Rules
- **Config, not code.** Restaurant differences are keys on the config doc. `restaurantId ===` in
  business logic is a lint failure. If it cannot be a config key, it is not supported.
- **Snapshot, not reference.** A placed line stores list price, discount amount, discount source,
  tax block, rate, and computed tax parts. Billing sums snapshots. Nothing downstream re-prices.
- **Server decides.** Prices, permissions, PIN checks, offer eligibility: computed in Cloud
  Functions. The client sends item, quantity, note. Nothing else is trusted.
- **Hacks are labelled.** Any shortcut, workaround or not-ideal call gets `// DEBT(TD-nnn): why`
  at the site and a row in `moonshot/TECH_DEBT.md`. No row, no merge.
- **Catch it, don't cage it.** We defend against the staff, not against the account holder: one
  trusted login is assumed, and every act it takes is recorded. **Prevent** only what is unbounded,
  irreversible, or filed with someone outside — client-sent money, a hard delete, a wrong tax rate,
  a broken number series. **Record** everything else and let it be caught the next morning. A day's
  theft found tomorrow is a cost of doing business; a night that reads clean because nothing was
  written is the failure. Never a reason to skip a test, a check at a trust boundary, or an audit
  row: detection is the higher bar, not the lower one.
- **Logs and audit rows are one feature, not two.** One JSON line per state change, one `cid` per
  bill, order or day carried everywhere, and one append-only audit row per act a person chose to
  take, written in the same transaction as the act. No request dumps. They are read by an agent,
  not a human: written to be judged without joining five collections, and a quiet day must be
  distinguishable from a day whose logging broke.
- **One door per cross-cutting thing.** Auth checks, the error shape, the credential challenge, config
  reads, logging, money maths: each has one shared place (table above) and every new call path goes
  through it. Before writing a handler, look for the door. Before adding a door, name the second
  caller or the trust boundary that needs it; one caller means inline it. A door is a plain function
  or one interceptor, not a framework.
- **Numbers are config.** A limit, threshold, window, rate or count in business logic is a key on the
  restaurant config doc with a default, never a literal. Decisions with the key name are in `STATE.md`.
- **Tests are for bugs and edge cases.** Correctness, money, auth, concurrency, the sheet's scenarios.
  No performance tests. No flaky tests: no sleeps, no real clock, no network, no shared emulator
  state between tests; fake clock and fake adapters instead. A test that fails twice without a code
  change is fixed or deleted the same day, never retried into green.
- **20 over 100.** Twenty lines of plain working code beat a hundred well-abstracted ones. No
  interface with one implementation. No factory for one product. No helper that already exists.
- **Scoping is written, never spoken.** Any "for now", "later", "out of scope", "first X then Y",
  or "we won't handle Z" call goes into the relevant spec sheet's Out-of-scope or Decisions block
  with a one-line reason, before the code that depends on it. No sheet yet? Then the decisions log
  in `STATE.md`. Name the call in the reply's summary line so Shaurya sees it. A scoping decision
  that lives only in chat does not exist, and the drift watcher will flag it.

## What lives where
`moonshot/` is the knowledge: contract, sheets (`SPEC_<XX>_<topic>.md`), handoffs
(`HANDOFF_<XX>_<topic>.md`), state, debt, reviews. The repo proper is the implementation. File names
say what the file is; nobody should have to open one to know.

## Editing these docs
They are short on purpose: an agent reads them whole, every session, and a rule nobody finishes
is not a rule. When you change one:
- Keep the voice. A rule is a bold name, what must be true, and why, in one or two lines. A
  scenario is a scene with real prices and a real hour, then what the system does.
- State the outcome, never the keystrokes. These docs remove ambiguity, not thinking. An edit
  that reads like a procedure belongs in a sheet or a skill, not here.
- Add only what a real event demanded: a bug, a decision, a mistake. Never in advance.
- Prefer replacing a line to adding one. If a file grew, say what you considered cutting.
- Each file has one job. Contract is how we work, sheets are what to build, `STATE.md` is where
  we are, `TECH_DEBT.md` is what we owe. Do not let one spill into another.

## Side sessions
Main sessions register with `/moonshot-session start <task>` and deregister with `stop`.
Reviewers (`/moonshot-review`, `/moonshot-drift`) only look at registered sessions. Check your
inbox (`moonshot/reviews/inbox/<id>.md`) before saying done; answer what is there.

## Never do
- Weaken, skip or delete a test to get green. Say so instead.
- Add a fallback for a state the types should make impossible.
- Edit `moonshot/CLAUDE.md`, `moonshot/STATE.md` decisions, or the golden fixture directly. Propose the diff.
- Claim done without pasting `make check` output and the browser sanity result.
- Decide the stack, a schema change, or a module boundary alone. Those are Shaurya's.
- Write a scenario without its "without this" line, or a test without a hand-computed expected value.
- Ship a check without proving it can fail. `make check` passed with failing tests for a day (jest piped
  into tail, no pipefail). A new gate is green on a clean tree and red on a planted failure, both pasted.
<add one line here per real mistake, never in advance>

## Writing a sheet
Draft it yourself from the format in `SPEC_ST_staff_pin_and_approvals.md`. Then `/custom-fanout-consult`
with the draft and the critical-pieces doc: "what is missing, what breaks in production, what should be
out of scope." Fold in what is practical; you decide, and the sheet's Decisions table says what you
dropped and why. Every sheet ends with **Review before sign-off**: the handful of calls a human must
check, each marked *must decide* or *fine to skip*. Shaurya reads that section only.

## Building a module (in this order)
0. Anything bigger than one layer, or on new ground: write a 5–10 line phase plan into `STATE.md`
   In flight before touching code. Grounding and structure first (setup, schema, domain), screens last.
   Phases are the commit boundaries. No plan-mode tool needed; the written plan is the plan.
1. Read its sheet in `moonshot/`. Every scenario ID must end up as a test name.
2. **Test skeleton first, then a second opinion.** Write the skeleton yourself: one `it()` per
   scenario plus the production cases the sheet forgot, each with a hand-computed expected value,
   body `todo`. Then, blind, get the same list from others: an Opus subagent (Agent tool,
   model opus) and `/custom-fanout-consult` (Grok, Gemini, Codex). Prompt them with the sheet and
   the rules, not your list. Ask: "which test cases are necessary and exhaustive for this to be
   safe in production; expected values, not descriptions." Merge: accept, push back, or verify
   each extra; write one line per rejected case in the sheet's Decisions. You choose. No consult
   for a one-file change.
3. Implement one test at a time, domain → adapters → app → api → till. Red before green.
4. **Blind donor review, in parallel.** The moment implementation starts, run
   `/moonshot-donor-review <sheet> "<DONORS.md section>"`. It spawns a fresh agent that reads the
   open-source POS code for this concern before it reads our sheet, and reports what they handle
   that we do not. You never read donor files yourself; your thinking is already on the sheet, and
   theirs is only useful unmixed with it. Merge the report before Definition of done: one Decisions
   line per item, accept with a test, push back with why, or verify that one file:line.
5. Definition of done below.

## Definition of done
1. Scenario ID named (`PO-S3`). Failing test written first, and it fails against the old code.
2. Fix. `make check` green. E2E green if the path touches the emulator.
3. Browser sanity for any user-visible change, run by the agent, result pasted.
4. Logs show the state transitions with the `cid`.
5. Any `DEBT(...)` has its row. Donor review merged. `STATE.md` updated. Commit message carries the scenario ID.

## Talking to Shaurya
Summary line first. Then short bullets, one idea each. Anything long goes on a page, not in chat.
Ask when readings would lead to different work; otherwise pick the lazy default and say so.

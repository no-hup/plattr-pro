# State

The one page a fresh session reads to continue. Updated at the end of every working session.
Newest at the top of each list.

## In flight
- PY · Payments, session `plattr-pro-8c`, 2026-09-15 evening. Plan page `reviews/2026-09-15-PY-plan.md`, Shaurya said go. Today `paymentStatus` is one string with two writers, and `paid` is a side effect of `orderStatus → COMPLETED` (`updateOrderStatus.js:156`): no amount, no tender, no time, no refund, and it can move backwards. PY replaces it with an append-only ledger at `restaurants/{id}/payments/{paymentId}`; `order.paymentStatus` becomes a one-line mirror (TD-010). Phase plan (each a commit):
  0. DONE: plan page, Shaurya said go.
  1. DONE (awaiting sign-off): `SPEC_PY_payments.md` draft v2. Fan-out merged (Grok, Gemini; Codex out of quota). Grok and Gemini independently found the same two holes: no idempotency key, so a retried tap is a second payment; and `paid` latched one-way, so voiding the row that settled a bill left it marked paid while owing the full amount. Both fixed (R13, R2). Also taken: `businessDate` frozen server-side, credit notes only on a fully paid bill (asked of BL), order mirror moved inside the transaction, integer minor units on the wire, no client writes to `payments/`. Reversed one of Shaurya's approved defaults (refunds are no longer cash-only) and flagged it as must-decide.
  2. Test skeleton, blind Opus + fan-out, merged. Shown to Shaurya.
  3. `domain/payments.ts` against a fake bill, so nothing waits on BL.
  4. `adapters/firestore/payments.ts` + `app/payments.ts`, fake adapters and fake clock.
  5. `api/payments.ts` + `index.js` exports. E2E `todo` until BL's finalise lands.
  6. Till `features/payments/`. Playwright `todo`, same reason. Donor review (Odoo `pos_payment.py`, `pos_payment_method.py`) in parallel from phase 3.
  Open for Shaurya: who may refund, rounding per tender, refund tender. Each has a default on the plan page.
- BL · Billing & tax, session `plattr-pro-9a`, 2026-09-15 evening. Shaurya said go; tax facts come from four consults (Grok and Gemini, one open pass and one source-guided pass each) and are marked "CA to confirm" until signed. Phase plan (each a commit):
  0. DONE: `SPEC_BL_billing_and_tax.md` draft v1 with the line snapshot (F/L fields) and tax config shape as Objects.
  1. DONE: four tax consults and two blind sheet reviews merged into Decisions. Shaurya signed every Review row 2026-09-15 night.
  2. DONE (proposed, fixture is Shaurya's): 21 rows at `reviews/2026-09-15-BL-golden-proposal.json`, every number re-derived by a throwaway script; two of my hand sums were wrong and are fixed. Critical-pieces diff at `reviews/2026-09-15-BL-critical-pieces-diff.md`. PY is a separate session (HANDOFF_PY_payments.md); it asks BL for bill fields via the inbox.
  3. DONE: `domain/line.ts`, `domain/billing.ts` (preview, issue, cancel, creditNote), `domain/invoice.ts`; 56 tests (48 + 8), every BL-S id a test name; blind lists from Opus, Gemini and Grok merged (`reviews/2026-09-15-BL-consults/tests-*.md`). Donor review (ERPNext `taxes_and_totals.py`, sparse clone 9be19e6) merged: cumulative-floor apportion, credit-note round-off on a full reverse, config-shape validation (phase 5); six push-backs and one question for Shaurya (frozen rate on a rate-change night).
  4. Checkout hook writes line docs (characterization test on `createOrUpdateOrder.js` first). Closes TD-008.
  5. `app/billing.ts`, `adapters/firestore/billing.ts`, `api/billing.ts`, e2e suite. ST gains the "bill already issued" precondition (BL-S8).
  6. Till `features/billing/`, Playwright. Donor review (ERPNext `taxes_and_totals.py`, clone first) in parallel with 3–5.
- ST arch fixes, session `plattr-pro-9a`, 2026-09-15 evening: items 2–5 of `reviews/2026-09-15-arch.md` done (ST-S5 race re-decide in the write transaction, drawer audit id suffix, till challenge cap of 10, TD-008 split). Item 1 (PIN gate on net instead of list price) closed by Shaurya as accepted risk, TD-009 (peer commit ac61694). BL plan for Shaurya at `reviews/2026-09-15-BL-plan.md`; his answers so far: tax labels set manually in Admin; snapshot-at-checkout is mine to decide; service charge must be removable per bill.
- ST · Staff PIN & approvals, session `plattr-pro-9a`, 2026-09-15. Phases 1–6 committed; reworked to the evening sheet (R7 slowdown, R9 paise money, R10 report from lines, ST-S11–13). Phase plan (each phase is a commit):
  1. Setup, minimal: `make check` at repo root = tsc + jest + boundary grep; `frontend/till/` Vite+React+TS with one Playwright smoke test against the emulator.
  2. DONE, awaiting yes: skeleton (82 todo across domain/app/e2e/till), Opus + fan-out (Grok, Gemini; Codex out of quota) + donor review merged into the sheet's Decisions. Phase 1 done: `make check` green, till smoke test green on the emulator.
  3. `domain/approvals.ts` green, one scenario at a time.
  4. `adapters/firestore/{staff,audit,lines}.ts` + `app/config.ts` + `app/approvals.ts`, app tested with fake adapters and a fake clock.
  5. `api/approvals.ts`, `index.js` export `approvals-apply`, e2e suite green on the emulator.
  6. Till `features/approvals/` + the `requires` interceptor in `api/client.ts`, Playwright ST-S2.

## Next
1. `make check`: one command, lint + typecheck + unit, under 60 s, plus the boundary grep.
2. Scaffold `frontend/till/` (Vite + React + TS) with Playwright and one smoke test against the emulator.
3. ~~Golden module ST~~ done (see Done). Next for ST: RP report screen reads `summarise(rows, lines)`; BL/PO replace the staging line doc (TD-008).
4. Write the line-snapshot field list (one page) and extend the golden fixture for it.
5. Spec sheet BL · Billing & tax, then OF · Offline & sync.

## Done
- 2026-09-15 · Shaurya confirmed the mid-build sheet changes (R7 slowdown, R9 paise, R10 report from lines) were his. Drift finding closed.
- 2026-09-15 · Arch P1 "admin exports restructured in ST" resolved: the nested `exports.admin` group is the prod requirement from 2026-09-08 (`INFRASTRUCTURE.md:142`), uncommitted in the working tree since, swept into `68fcccf`. Correct code, wrong commit; not worth a history rewrite. Admin suite's remaining 9 role failures are TD-007. Remaining arch P1/P2 sent to the ST session to fix per DoD.
- 2026-09-15 · First architecture review run: P0 confirmed and fixed (`make check` could not fail; pipefail added, proven red then green). Five P1/P2 left in `reviews/2026-09-15-arch.md`, two need Shaurya: admin exports restructured in an ST commit; discount gate on list price not net.
- 2026-09-15 · ST verified by a second session: unit 197, e2e approvals 27/27, Playwright 7/7, screenshots. TD-006 (admin session `toDate` crash) fixed with a characterization test first. Admin e2e suite is 7/9 failing on role permissions with or without the fix; pre-existing, unrelated. First reviewer and drift runs done, see `reviews/`.
- 2026-09-15 · ST · Staff PIN & approvals built end to end on `moonshot` (commits ccd7052 → 593bedc): `make check` + `frontend/till/` scaffold, domain/app/adapters/api, `approvals-apply` + `approvals-config`, till PIN interceptor. Unit 89, e2e 27, Playwright 7. Sheet Decisions carry every reviewer merge (Opus, Grok, Gemini, donor review) and Shaurya's answers (ST-Q1 asked, PO-Q1 percent, ST-Q2 `lines/{lineId}`, own PIN). Open: TD-008 staging line doc; `admin-getRestaurantSettings` 500s on string `expiresAt` in the emulator (pre-existing, untouched). Review page: `moonshot/reviews/2026-09-15-ST-review-for-shaurya.html`.
- 2026-09-15 · Donor pass was missing from the process. Now step 4 of building: a blind Opus subagent (`/moonshot-donor-review`) reads donors before the sheet, in parallel with implementation, merged before DoD. Sheet-writing stays donor-free so first thinking is ours. `DONORS.md` indexes clones (now durable at `~/Desktop/moonshot/donors/`, half the scratchpad research was already lost) by concern with verified line numbers. ST sheet got five donor-backed decisions.
- 2026-09-15 · Contract: canonical-examples table (one file to copy per shape) and an "Editing these docs" section. Both aimed at cutting the grounding read; first run spent ~108k tokens before writing a line.
- 2026-09-15 · Contract: sheet-writing process (draft → fan-out → decide, with a Review-before-sign-off section), phase plan step 0, test philosophy (bugs and edge cases, never flaky, no perf). Drift watcher now scores instruction following 0–10. Files renamed `SPEC_…`/`HANDOFF_…`.
- 2026-09-15 · "Building a module" process added to contract (skeleton → blind second opinion → implement). Handoff prompt: `moonshot/HANDOFF_ST_staff_pin_and_approvals.md`.
- 2026-09-15 · `SPEC_ST_staff_pin_and_approvals.md` final v1: 10 scenarios, 8 rules, 5 config keys, file layout. Module-shape rule added to the contract.
- 2026-09-15 · TD-003 logged: generic PIN/password/OTP challenge missing in both Flutter apps; till builds it first. Contract gained "one door per cross-cutting thing" and "numbers are config".
- 2026-09-15 · Decision: build our own POS, emulate open-source designs, never fork. Firebase stays
  for now; new code layered so the domain ports cleanly later.
- 2026-09-15 · Decision: staff screens in React web (Vite), Flutter apps untouched, LAN printing
  first then Web Serial over Bluetooth (verified: Chrome 138 release notes).
- 2026-09-15 · `moonshot/CLAUDE.md`, `TECH_DEBT.md`, this file. Three skills: `/moonshot-session`,
  `/moonshot-review`, `/moonshot-drift`, with a session registry so reviewers only watch
  registered sessions and can message them by name.
- 2026-09-15 · Marked two superseded lines in the root PRD and business-rules doc.
- 2026-09-13 · Research complete: Petpooja API, market, OSS candidates, three deep-dives, donor
  designs, 45 table edge cases. Digests live in the Plan artifact and the Edge Cases artifact.
- 2026-09-13 · Spec sheet PO · Pricing & offers, draft, 3 open questions.

## Decisions log
| Date | Decision | Why |
|---|---|---|
| 2026-09-15 | Manual discount is cashier-only: the till logs in as an existing MANAGER (or ADMIN) account. SERVER role gets 403. No new role | "Cashier" is a seat, not a role; reuse `adminApp/auth.js` roles |
| 2026-09-15 | Server decides when a PIN is needed. Under the limit: applied at once. Over: backend returns `permission-denied` + `{requires:'pin'}`, till shows the PIN popup, resends with `pin`, backend checks it against that same account's hashed PIN (`servers/{id}.password`) | Same pattern the consumer app uses for `unauthenticated` → `AuthPrompt`; the till is new code so it gets its own handler |
| 2026-09-15 | Every manual discount writes one audit row with a severity: `P1` under the limit, `P0` over it. Report groups by severity and staff | Count of P0s per cashier per week is the theft signal |
| 2026-09-15 | Limit is a config key (`discount.pinAbovePercent`, lean 10). PO-Q1 still open on rupees-vs-percent | Config not code |
| 2026-09-15 | Donor clones live outside the repo at `~/Desktop/moonshot/donors/`; `DONORS.md` is the index and the recreate commands | Greps stay clean; disk is at 97%, so sparse and shallow only |
| 2026-09-15 | Firebase stays; domain layer must not import it | Port later without a rewrite |
| 2026-09-15 | React web for staff screens, not Flutter | Agents can drive a real DOM; Flutter web is canvas |
| 2026-09-15 | Config document per restaurant, lint bans `restaurantId ===` | Variation as data, not branches |
| 2026-09-15 | One file per provider + `active.ts`, no factories | Modular without a framework |
| 2026-09-13 | Emulate open source, do not adopt | Both candidates weak where we are strong |
| 2026-09-13 | First customer: single outlet, dine-in, serves alcohol | Liquor is finite work; aggregators are a permanent dependency |

## Open questions (owner: Shaurya)
- ST-Q1 is ADMIN also asked for a PIN over the limit? v1 default: yes.
- PO-Q1 manual discount limit before PIN: rupees, percent, or both? (Shaurya leaning 10%, 2026-09-15)
- PO-Q2 offers on takeaway/delivery by default, or dine-in only unless ticked?
- PO-Q3 inclusive/exclusive per tax block enough, or per dish?
- Is "prod feels slow" cold starts? If so, `minInstances: 1` on hot functions is a config change, not a migration.

## Links
- Plan artifact: https://claude.ai/code/artifact/2acc57db-538c-4306-9deb-cabb74fd893c
- Table edge cases: https://claude.ai/code/artifact/4ef3e574-9a4d-48e6-9dbc-1bdf0c400fc8
- Critical pieces: `moonshot/CRITICAL_EXISTING_PIECES.md`

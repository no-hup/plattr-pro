# State

The one page a fresh session reads to continue. Updated at the end of every working session.
Newest at the top of each list.

## In flight
- BL · Billing & tax, session `plattr-pro-9a`, 2026-09-15 evening. Shaurya said go; tax facts come from four consults (Grok and Gemini, one open pass and one source-guided pass each) and are marked "CA to confirm" until signed. Phase plan (each a commit):
  0. DONE: `SPEC_BL_billing_and_tax.md` draft v1 with the line snapshot (F/L fields) and tax config shape as Objects.
  1. DONE: four tax consults and two blind sheet reviews merged into Decisions. Shaurya signed every Review row 2026-09-15 night.
  2. DONE (proposed, fixture is Shaurya's): 21 rows at `reviews/2026-09-15-BL-golden-proposal.json`, every number re-derived by a throwaway script; two of my hand sums were wrong and are fixed. Critical-pieces diff at `reviews/2026-09-15-BL-critical-pieces-diff.md`. PY is a separate session (HANDOFF_PY_payments.md); it asks BL for bill fields via the inbox.
  3. DONE: `domain/line.ts`, `domain/billing.ts` (preview, issue, cancel, creditNote), `domain/invoice.ts`; 56 tests (48 + 8), every BL-S id a test name; blind lists from Opus, Gemini and Grok merged (`reviews/2026-09-15-BL-consults/tests-*.md`). Donor review (ERPNext `taxes_and_totals.py`, sparse clone 9be19e6) merged: cumulative-floor apportion, credit-note round-off on a full reverse, config-shape validation (phase 5); six push-backs and one question for Shaurya (frozen rate on a rate-change night).
  4. DONE: `placeLine` (domain) + `orders/lineSnapshots.js` + one hook in `createOrUpdateOrder.js`, inside its transaction. Characterization test written first and pinned before the hook (`test/unit/orders/createOrUpdateOrder.characterization.test.js`, 12 tests, proven red with the hook disabled). TD-008 closed. BL-S24 added: the order offer's amount is live but its clock is frozen at order open (TD-012 for the engine change).
  5. DONE: `app/billing.ts` (preview/issue/cancel/creditNote/split/get, 20 fake-port tests), `adapters/firestore/billing.ts`, `api/billing.ts` exported as `billing-*`, e2e `suites/billing.js` 26/26 on the emulator. ST refuses any change on a billed line (BL-S8, unit + e2e). TD-012 stays open: preview reads the order offer as Offers V2 evaluated it at the last round (amount and clock both from placement), which satisfies BL-S24; re-evaluation over voided lines is the refinement.
  6. DONE: till `features/billing/` (`useBill.ts`, `BillScreen.tsx`; `?draft=` routes to it), Playwright `e2e/billing.spec.ts` 2/2 (draft with service charge ₹670.00 → removed ₹609.00; issue → number → cancel asks PIN through the one interceptor → cancelled). Cancel and credit note go through ST's door as `cancelBill` / `creditNote` (PIN always, P0). Donor review merged in phase 3. BL is at Definition of done except the print structure (KT) and a paid bill (PY).
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
5. ~~Spec sheet BL~~ in flight (9a); ~~PY~~ done; ~~DC · Day close~~ done. Next sheets: OF · Offline & sync, then RP · Reports (it reads DC's frozen close document, never recomputes one).

## Done
- 2026-09-16 · TD-019 closed, and TD-014's fix committed. TD-019 was found by *probing* DC-S25's escape hatch on the emulator instead of reading the code: comping an abandoned table to zero cleared it, and asked for nothing at all. `billing-issue` took the bill-level discount straight from the request body and never called ST's door, so a MANAGER session zeroed a ₹1,500 table with no PIN, **no audit row**, and a client-typed `approverId` — and the day close then balanced perfectly, which is the one thing it exists to stop. Shaurya's trust model (2026-09-16): assume one person at the restaurant we can trust with access, but make the audit strong. So the audit row is now unconditional and the PIN follows ST's existing `discountPinAbovePercent`, against the bill's net. `preview` stays ungated on purpose; the invoice number is the act. The till gained a Comp button so DC-S25 has an in-app way out. TD-018 also logged: **one till and one cash drawer** per restaurant, Shaurya's call, with the `registerId` migration named before any data exists. Open money debt after this: TD-015 (out-of-stock add-on billed) and TD-016 (offer apportioned across lines it does not target).
- 2026-09-16 · DC · Day close & cash count built end to end on `moonshot`: `SPEC_DC_day_close.md` v2 (32 scenarios, 18 rules, 3 config keys), `domain/dayClose.ts`, `app/dayClose.ts`, `adapters/firestore/dayClose.ts`, `api/dayClose.ts` exported as `dayClose-close/-get/-move/-voidMove`, till `features/dayclose/`. Unit 110 (domain 60, app 50), e2e `suites/dayclose.js` 50/50, Playwright 3/3, `make check` 28 suites 730 green, full e2e 331/12 (the 12 are the known pre-existing set: admin TD-007 ×9, menu, server-journey, table). `journey.mjs` gained step 9 and is 52/52 on res_meghana with a real close on the end — the handoff made that part of done.
  Shaurya's four calls, answered before any code: drawer movements get their own append-only collection; a short drawer is recorded and never blocks; MANAGER and ADMIN close; **no reopen in v1**.
  Three blind reviews merged into the sheet's Decisions (donor `reviews/2026-09-16-donor-DC.md` on Odoo `pos_session.py`/`pos_hr`/URY, plus Grok and Gemini on the v1 draft; Codex out of quota). All three independently found the same two holes and both are fixed: **R5 now refuses the close while any placed line still has no `billId`** (BL writes no draft document, so v1 closed clean over a table that was still eating), and **R6a makes the close read its ledger inside its own transaction while PY reads the close document inside its payment transaction**, so a payment taken while the cashier counts aborts one of the two instead of vanishing.
  **PY changed in this session**: `take` and `refund` now refuse a closed business date, which PY only did for voids. The date judged is the one on the row being written, so last night's meal refunded at 12:30 today is still allowed (DC-S28). Five tests added to `app/payments.test.ts`, and the gate is proven able to pass as well as fail.
  Also merged: a drawer movement needs a PIN and writes P0 (ST's own R2 already said opening the drawer with no sale is PIN, P0 — my first draft contradicted it); blind count omits **every** cash figure, not just the total; a close retried with the same count returns the frozen document instead of a red "already exists"; a count over the threshold asks for a PIN and is still recorded; `leftInDrawer` plus `previousClose` so the morning float screen opens on last night's figure.
  Open for Shaurya, in the sheet's Review section: the straggler (a payment after a legitimate close is refused and there is no reopen) and a handover count when two cashiers share one drawer — DC-Q3, which all three reviewers put back after I left it out. TD-017 logged: BL still issues a bill onto a closed date.
- 2026-09-15 · PY · Payments built end to end on `moonshot` (commits 6cb89f8 → this one): plan page, sheet v3 (36 scenarios, 19 rules), skeleton of 330 cases merged from three blind passes, `domain/app/adapters/api/payments.ts`, `payments-take/-refund/-void/-list`, till `features/payments/`. Unit 272, e2e 45/45, Playwright 13/13, `make check` 604 green. Shaurya's calls: refund to the original tender with cash as last resort (PY-S36), round-off via `payments.settleWithin` 99 (PY-S21), TD-010 closed (the `paid` side effect left `updateOrderStatus.js` with a characterization test), table release is OR's (TD-011). ST's PIN check is now one exported `pinGate()`. Donor review merged (`reviews/2026-09-15-donor-PY.md`), DONORS.md has a Payments section, TD-012 logs the missing tab. Open for DC: it writes `restaurants/{id}/dayClose/{businessDate}` `{closed: true}`, refuses to close over an issued bill (reads BL's `bills/`), and owns non-sale drawer movements. Sheet: `moonshot/SPEC_PY_payments.md`; rendered copy `reviews/2026-09-15-PY-sheet.html`.
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

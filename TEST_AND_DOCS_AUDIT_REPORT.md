# Test Code & Documentation Audit Report

**Author:** Senior Engineer review (read-only — no files changed)
**Date:** 2026-06-16
**Scope:** All test code and `.md`/doc artifacts across the monorepo
**Goal:** Identify what is redundant, stale, deprecated, or throwaway — and what to keep.

---

## TL;DR

The repo has **two officially-blessed test homes** (per `CLAUDE.md`) but test code has leaked into **~13 other locations**. Most of the leakage is harmless (real Flutter app tests) — the actual problems are a handful of throwaway debug scripts, one near-duplicate test, and ~5 raw output dumps committed to git.

On docs: the corpus is large (~110 markdown files) and **mostly healthy and actively maintained**. The trim targets are concentrated: ~7 build/debug artifacts to delete, ~4 superseded design/migration docs to archive, and ~3 near-duplicate contract docs to consolidate.

**Net actionable cleanup is small and low-risk.** No emergency. One item (`testFetchMenu.js`) was flagged "critical security" by automated scan — that is **overstated** (see correction below) but the file should still go.

---

## Part 1 — Test Code

### 1.1 The two official homes (keep, healthy)

| Home | What | Status |
|------|------|--------|
| `backend/src-plattr/functions/test/unit/` | Jest unit tests — cart, pricing, models (~934 LOC, 5 files) | ✅ Active, recent |
| `backend/src-plattr/functions/test/e2e/` | E2E API suite — 12 suites, ~167 tests vs emulator | ✅ Active, heavily maintained |

### 1.2 Legit scattered tests (keep — these are real app tests, not "scatter")

These live outside the two homes **by necessity** — Flutter app tests must live in each app's `test/` dir. Not a problem.

| Location | Purpose | Note |
|----------|---------|------|
| `frontend/flutter_boilerplate/test/` | Consumer app backend-flow + model parsing (~2.7k LOC) | ✅ Active, comprehensive |
| `frontend/src-platter-apps/apps/platter_server/test/contract/` | Server app endpoint contract tests (16 files) | ✅ Active |

`CLAUDE.md` already carves out "Frontend Dart tests live in their respective app `test/` directories — that is the only exception." So these are **compliant**, not scatter.

### 1.3 Trim candidates — Test code

| # | Item | Reason | Recommendation | Risk |
|---|------|--------|----------------|------|
| T1 | `backend/src-plattr/functions/utils/testFetchMenu.js` | Throwaway script, hardcoded, points at **prod project `rms-app-dd875`**. Not in any suite. | **Delete** | Low |
| T2 | `backend/src-plattr/testFirestore.js` (5.4K) | One-off debug script, `"poopoo"` log markers, not integrated | **Delete** | Low |
| T3 | `frontend/flutter_boilerplate/test/debug_api_responses.dart` | One-off API-response debug, not in automated suite | **Delete** | Low |
| T4 | `consumer/` (entire dir — 3 files, 24K) | **CONFIRMED DEAD.** Live consumer app is `frontend/flutter_boilerplate`. `consumer/` holds no app — only an orphan test dir (`backend_flow_test.dart` = older dup of flutter_boilerplate's, + `run_backend_tests.sh` + `README_BACKEND_TESTS.md`). Zero external references. | **Delete whole `consumer/` dir** | Low |
| T5 | `backend/src-plattr/functions/tests/` (dir) | `API_WORKFLOW_TEST.md` + `api_workflow_test.sh` — manual curl harness superseded by `claude-api-testing-workflow/` | **Archive/delete** (note: the `.md` has some still-useful flow narrative — extract before deleting) | Medium |
| T6 | `backend/src-plattr/contract-tests/` (dir) | Old bash contract harness predating Flutter `test/contract/`. Orphaned since 2025-09-09 | **Archive/delete** | Low |
| T7 | `platter_admin/test/widget_test.dart` + `platter_kitchen/test/widget_test.dart` | Flutter template boilerplate (counter test) — zero real coverage | **Replace** with real tests, or leave as harmless stub | Low |

#### ⚠️ Correction to automated "CRITICAL" flag on T1
The scan called `testFetchMenu.js` a **critical credential leak**. That is **inaccurate**. The values are a Firebase **web app config** (`apiKey`, `projectId`, etc.) — these are *public by design* in Firebase web clients and are not secrets. The real (lesser) concern: a stray script that talks to the **production** project, which could accidentally mutate prod data if run. Treat as **hygiene**, not a security incident. Still delete it.

### 1.4 Skipped / blocked test coverage (track, don't trim)

Documented in `CLAUDE.md` + suite source. These are **known gaps**, not dead code — keep but schedule rewrites:

- `suites/offers.js` — 7 tests SKIP (V1 `applyOffer` removed in Offers V2; needs checkout-flow rewrite)
- `suites/offer-pricing.js` — 9 tests SKIP (blocked on checkout, BUG-1)
- `suites/admin.js` — SKIP (emulator namespace bug with `admin-*` function naming)
- `checkTableStatus` endpoint — returns INTERNAL error, needs investigation

---

## Part 2 — Documentation

### 2.1 State of the corpus
~110 markdown files. **~95 are active and well-maintained** (architecture under `Plattr_Pro_Context/`, app docs, feature specs, testing guides). The docs are in good shape overall.

### 2.2 Trim candidates — Docs

**Tier 1 — Delete (pure artifacts, not docs)** — Low risk:

| Item | Reason |
|------|--------|
| `backend/src-plattr/functions/test_output.txt` → `test_output_5.txt` (5 files, ~240K) | Raw Jest output dumps committed to git. Should be gitignored, never committed |
| `frontend/flutter_boilerplate/cart_logs.txt` | Empty |
| `frontend/flutter_boilerplate/test_logs/logcat.txt` | Empty |

**Tier 2 — Archive (superseded but historically useful)** — add deprecation banner, don't silently delete:

| Item | Reason |
|------|--------|
| `auxilary/docs/OFFERS_KILLSWITCH.md` | Describes V1 cart-level offers (endpoints deleted 2026-04-11). Superseded by `OFFERS_SYSTEM.md` (V2) |
| `auxilary/docs/CLOUD_FUNCTIONS_MIGRATION_GUIDE.md` | Flat→namespaced migration is complete |
| `backend/src-plattr/warp/ENHANCED_CONSUMER_APP_ANALYSIS.md` (998 lines) | 2025-09 research artifact, not code-synced |
| `kitchen plan/` (8 files) | Kitchen app already built; these are 2026-01-28 build-time snapshots |

**Tier 3 — Consolidate (near-duplicates)** — Medium risk (verify ownership first):

| Item | Reason |
|------|--------|
| `auxilary/docs/API_RESPONSE_CONTRACTS.md` vs `mock/apiContracts.md` | Overlapping API contract docs — pick one source of truth, cross-ref the other |
| `auxilary/docs/Server.md` vs `Plattr_Pro_Context/App_Platter_Server.md` | Generic `Server.md` overlaps the canonical app doc |

**Tier 4 — Clarify (orphaned / unclear)** — investigate before acting:

| Item | Reason |
|------|--------|
| `auxilary/docs/PROPOSAL_MULTI_MENU_HIERARCHY.md` (732 lines) | No active references; likely already implemented — verify vs `functions/menu/` then archive |
| `functions/secure_stuff/stuff.md` | Vague title — audit for sensitive content before anything else |
| `agent_workspace/agents/supervisor_befe_sync_dev/` | Template supervisor w/ empty `learned_corrections.md` — confirm if role active |

---

## Part 3 — Prioritized action list

**Done (2026-09-08):**
1. ✅ Deleted 5× `test_output*.txt` + 2 empty log files; `.gitignore` updated
2. ✅ Deleted T1 `testFetchMenu.js`, T2 `testFirestore.js`, T3 `debug_api_responses.dart`
4. ✅ Deleted entire `consumer/` dir (T4); `claude-api-testing-workflow/` moved to `functions/test/e2e/`

**Do next (needs one decision each):**
5. Archive legacy harness dirs T5 + T6 (extract any unique flow notes first)
6. Add deprecation banners to Tier-2 docs

**Schedule (real work, not cleanup):**
7. Rewrite SKIPed `offers` / `offer-pricing` suites against checkout flow
8. Fix `admin-*` emulator namespace bug + `checkTableStatus` INTERNAL error
9. Replace placeholder widget tests with real coverage (or accept as stubs)

**Investigate:**
10. Tier-3 doc consolidation + Tier-4 orphan audit

---

## Caveats
- This is a static read-only audit. "Duplicate" / "orphaned" calls are based on content + reference scan; confirm runtime usage before deleting borderline items (Tier-3/4).
- ✅ RESOLVED: `frontend/flutter_boilerplate` is the live consumer app. `consumer/` is dead → delete (T4).
- Nothing here was modified. All deletions/archives are **recommendations only**.

---

# Part 4 — Second pass, 2026-09-08

Full re-audit of all 113 markdown files, every claim verified against HEAD source rather
than against other docs. Five parallel readers covered the table/API specs, the contract
and schema docs, the suspected-superseded set, the architecture set and the consumer app
docs; root-level files were checked directly.

## 4.1 Corrections to Parts 1–3 above

| Item | Correction |
|---|---|
| **T6 — "archive/delete `backend/src-plattr/contract-tests/`"** | **Do not act on this.** The directory is live: `contract_test_config.sh` is *sourced* by `.agent/skills/comprehensive-unit-test/tools/import_mock_data.sh`, and `run_customer_server_order_flow.sh` is invoked by `tools/run_backend_flow.sh`. `TEST_STRATEGY.md` §5 also carries an explicit "Do NOT delete" on it. |
| **Tier 2 — `CLOUD_FUNCTIONS_MIGRATION_GUIDE.md` "flat→namespaced migration is complete"** | Wrong on both counts. It documents an **onCall→onRequest** migration, and it was **abandoned, not completed**: `onCall` still appears 82× and no `*Http.js` files exist. Its objective was met another way — clients POST at the onCall endpoints with a `{data:…}` envelope. |
| **Tier 4 — `PROPOSAL_MULTI_MENU_HIERARCHY.md` "likely already implemented → archive"** | Implemented in full, but it is the **only** schema documentation for `menus`, `subcategories`, `primarySubcategoryId`, `viewType` and `defaultExpanded`. `DATABASE_SCHEMA.md` covers none of them. Archiving as-is loses the schema. |
| **Tier 3 — "`API_RESPONSE_CONTRACTS.md` vs `mock/apiContracts.md` — pick one source of truth"** | Misreads the pair; they overlap almost nowhere. The real duplication axes are `API_RESPONSE_CONTRACTS.md` ↔ `02_Backend_and_Database.md`, and `server_app_consumed_apis.md` ↔ `App_Platter_Server.md`. |

## 4.2 The headline finding: wrong docs, not redundant ones

Across 113 files there is **very little true duplication**. Only two files are a strict
subset of another (`GEMINI.md` inside `AGENTS.md`, and `SCROLL_SYNC_STRATEGY.md` inside
`MENU_MIGRATION_STRATEGY.md`). The real problem is a different one: **several
actively-maintained docs give instructions that are now false**, and an agent following
them would write wrong code. Those were fixed in this pass rather than deleted.

Note `CLAUDE.md` is already a symlink to `AGENTS.md` (git mode 120000) — they are one file,
not two, and were never a duplication problem.

### Fixed in this pass

| File | Was | Now |
|---|---|---|
| `AGENTS.md` (= `CLAUDE.md`) | Shared core at `packages/platter_core/` | `modules/platter_core/` — the `packages/` path does not exist |
| `AGENTS.md` | "`checkTableStatus` returns INTERNAL — needs investigation" | Marked fixed, with the root cause and the covering tests |
| `Plattr_Pro_Context/App_Platter_Kitchen.md` | "**Currently returns MOCK DATA**", "Network integration **MOCK ONLY**", "Cart status updates **Not implemented**" | Corrected. The kitchen app is fully wired to `order-getActiveCartsForKitchen` and `cart-updateCartStatus`; zero mock references remain in `kitchen_repository.dart`. This was the highest-risk doc in the repo — an agent trusting it would rebuild working code. |
| `Plattr_Pro_Context/01_Business_Rules_and_States.md` | "The PRD mentions a `reserved` state. This does **NOT** exist in the backend code." | Replaced with the real `RESERVED` semantics and a pointer to PRD §16.1 |
| `warp/ENHANCED_CONSUMER_APP_ANALYSIS.md` | Feature-flag section lists 7 flags (code has 4) with every default inverted, plus 3 flags that do not exist | Warning banner added at the top pointing readers at `FeatureFlags.js`. Content left intact. |
| 6 docs referencing `backend/claude-api-testing-workflow/` | Path deleted when the suite moved | Repointed to `backend/src-plattr/functions/test/e2e/` (13 occurrences) |
| `run_emulator.sh`, `run_consumer.sh`, `run_server.sh` | Hardcoded `/Users/shauryajaiswal/...`, unrunnable on this machine | Derive the project root from their own location |
| `contract-tests/run_customer_server_order_flow.sh` | `assert_success()` used `sys.stderr` without `import sys`, so any failure died with `NameError` instead of printing the diagnostic | Import added; failure path verified |

### Code bugs found while verifying docs (both fixed, both proven)

- **`checkTableStatus` always returned 500.** The handler was `onCall(async (data, context))` and
  destructured the callable *request wrapper*, so `restaurantId`/`tableId` were always undefined.
  Every sibling in `table.js` reads `request.data`. Fixed; the endpoint now returns 200, and the
  e2e table suite went from 18 pass / 2 fail to **20 pass / 0 fail**. The consumer app has a live
  call path to this endpoint.
- **Inverted error message in `validateOTP`.** The guard requires a phone number when multi-user
  support is **enabled**, but the message said "or when multi-user support is disabled". Two docs
  had copied the wrong text out of the code. Message corrected at the source.

## 4.3 Still open — needs a decision, not a cleanup

Nothing below was touched. Every one of these files holds at least one fact that exists
nowhere else, so none is safe to delete outright.

**Merge, then delete (4 files).** Each has a small unique core worth moving first:
`server_app_consumed_apis.md` → `App_Platter_Server.md` (keep the per-screen endpoint
grouping, both serverLogin request bodies, the "last 3 orders" fact; drop its malformed cart
state machine). `network_layer_guide.md` → `server_app_code_guideline.md` (keep the
`dataExtractor` recipe; drop its three wrong claims). `SCROLL_SYNC_STRATEGY.md` →
`MENU_MIGRATION_STRATEGY.md` (nothing unique survives). `plattr-changes.md` → the table docs
(it is the last copy of a deleted `allPossibleResponses.md`, and the only home of the OTP
dialog UI contract, including the rule that a `false` multi-user flag forces the phone field).

**Archive with a banner (7 files).** Completed plans and superseded specs whose rationale is
still worth having: `MOBILE_UI_OPTIMIZATION_STRATEGY.md`, `ULTRA_PLAN_Kitchen_API_and_Password_Hashing.md`,
`order_details_feature_spec.md`, `DATABASE_SCHEMA.md`, `E2E_TEST_SCENARIOS.md`,
`README_BACKEND_FLOW_TESTS.md`, `CLOUD_FUNCTIONS_MIGRATION_GUIDE.md`.

**Unfinished work hiding inside "historical" docs.** These are the two things most likely to
be lost by a naive cull, because both look like completed plans:
- `MENU_MIGRATION_STRATEGY.md` holds the backend `tableContext` spec. `tableContext` appears
  **0 times** in the backend, so the consumer menu header, restaurant name, table number and
  OTP badge are dead code today. That is a backend ticket, not history.
- `README_BACKEND_FLOW_TESTS.md` frames the consumer suite's failures as valuable
  ("The failing tests are valuable"). The real cause: its fixtures use `rest001` / `table001`,
  which exist in **none** of the current seeds. That framing is why a red suite (39 failures)
  has been tolerated.

**Also worth a ticket, found while verifying:**
- `assertOffersEnabled()` in `offers/offerFeatureGuard.js` is dead code — zero callers since the
  V1 endpoints were deleted.
- `notifications/updateServerFCMToken` and `handleTableQRScan` exist but are not exported from
  `index.js` at all.
- `showDebugCards` defaults to `true` in the kitchen app, flagged in its own doc as a go-live TODO.
- Multi-config Phase 6 is claimed done in one doc and pending in another. Evidence favours
  pending: no widget test references `CartVariantPickerSheet`.

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
| `backend/claude-api-testing-workflow/` | E2E API suite — 12 suites, ~167 tests vs emulator | ✅ Active, heavily maintained |

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

**Do now (safe, mechanical):**
1. Delete 5× `test_output*.txt` + 2 empty log files → add to `.gitignore`
2. Delete T1 `testFetchMenu.js`, T2 `testFirestore.js`, T3 `debug_api_responses.dart`

**Do now — confirmed:**
4. Delete entire `consumer/` dir (T4) — live app confirmed as `frontend/flutter_boilerplate`; `consumer/` is an orphan test dir, no app, no refs

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

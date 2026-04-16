# Plan: Item-Level Food Status — Remove Dead Flag

**Origin:** `TODO_Feature_Flags_and_Schema.md`
**Status:** Ready for implementation
**Scope:** Backend only. ~15-30 minutes of work.
**Dependencies:** None.

---

## Decision: REMOVE (not implement)

The feature flag `shouldUpdateFoodStatusAtItemLevelORAtOrderLevel` is defined in `FeatureFlags.js` but has **zero code reading it**. It's a dead flag.

### Why remove instead of implement

1. **Kitchen app is 100% mocked.** `kitchen_repository.dart` returns hardcoded mock orders for `getLiveOrders`, `getActiveCarts`, `getHistoryOrders`, and `updateItemStatus`. Wiring one endpoint against fake data is pointless — the mock item IDs don't exist in the backend.
2. **Server app already supports item-level marking.** `serverMarkItemServed.js` + `OrderApiService.markItemAsServed()` are fully implemented with passing contract tests. Where item-level marking matters (Server app), it already works.
3. **Dead flags are worse than missing features.** They mislead future maintainers into thinking the feature is gated when it isn't gated by anything.

---

## What stays (DO NOT DELETE)

- `backend/src-plattr/functions/orders/serverMarkItemServed.js` — **still used** by Server app via `server.markItemServed` callable
- Server app's `OrderApiService.markItemAsServed()` and its contract tests
- Item `.status` field in the order/cart document schema (used by the Server app path)
- `FULFILLMENT_STATUS` enum and `VALID_TRANSITIONS` map

---

## Files to Change

| File | Change |
|------|--------|
| `backend/src-plattr/functions/singleton/FeatureFlags.js` | Remove `shouldUpdateFoodStatusAtItemLevelORAtOrderLevel` from defaults, JSDoc header comments, and flow-impact map |
| `backend/src-plattr/functions/mock/MockData5EndToEndTesting.json` | Remove flag from any restaurant's `featureFlags` overrides |
| `backend/src-plattr/functions/session/setFeatureFlags.js` | Remove from validation allow-list if referenced |
| `backend/claude-api-testing-workflow/` | Grep for flag name, remove any test references |

---

## Required first step: Grep

Before editing, run:
```bash
grep -rn "shouldUpdateFoodStatusAtItemLevelORAtOrderLevel" backend/ frontend/
```
This will list **every** reference across backend, frontend, tests, and docs. Remove all of them. The task is complete when this grep returns zero results.

---

## Follow-up work (explicitly NOT this task)

When Kitchen app eventually gets real backend wiring (a separate future initiative):
- Wire `updateItemStatus` in `kitchen_repository.dart` to the existing `/server-markItemServed` endpoint
- Wire `getLiveOrders`, `getActiveCarts`, `getHistoryOrders` to real Firestore queries
- At that point, if a flag is needed to gate kitchen workflow granularity (per-item vs per-cart marking), introduce a **new, properly-named** flag. Do not resurrect the removed one.

---

## Test Plan

1. Grep confirms zero references to `shouldUpdateFoodStatusAtItemLevelORAtOrderLevel` after edits
2. Backend boots without errors (`FeatureFlags` singleton loads clean)
3. Existing E2E suite passes (the flag was dead — nothing should change)
4. Server app contract tests for `markItemAsServed` still pass
5. `getFeatureFlags` endpoint (if any exposes the full list) no longer returns the removed key

---

## Shared File Caution

`FeatureFlags.js` and `MockData5EndToEndTesting.json` are also touched by Task 3 (flag consolidation). If running in parallel, merge manually.

# TODO: Feature Flags & Schema Gaps

Discovered during Big Brewski onboarding session (10th Apr 26).

---

## Plan Files — Agent Task Index

Each actionable TODO below has a dedicated plan file suitable for parallel agent execution. Spawn one agent per file.

| # | Task | Plan File | Status | Dependencies |
|---|------|-----------|--------|--------------|
| 1 | Remove dead item-level status flag | [TODO_Item_Level_Food_Status_Plan.md](./TODO_Item_Level_Food_Status_Plan.md) | Pending | None |
| 2 | Multi-config cart feature (picker UX + backend flag cleanup) | [TODO_Multi_Config_Cart_Feature.md](./TODO_Multi_Config_Cart_Feature.md) | Pending, phased execution | None — designed for one-phase-at-a-time execution across sessions |
| 3 | Unify consumer cart state (follow-up to #2) | [TODO_Unify_Cart_State.md](./TODO_Unify_Cart_State.md) | Deferred | Blocked by #2 completion |

### Recommended execution

- **Task 1** is independent and small. Can run anytime.
- **Task 2** is the big one. It absorbs the old "variant/addon flag cluster" task entirely. Execute it one phase at a time with a review after each phase — see Section 0 of the task plan for the full execution protocol. The backend dead-code cleanup is Phase 1 of this task and will delete `shouldUpdateFoodStatusAtItemLevelORAtOrderLevel` (overlaps with Task 1 — pick whichever runs first to handle it).
- **Task 3** is a deferred architectural cleanup. Do not start until Task 2 is fully merged.

### Guiding theme for all tasks

**Functionality + simplicity, not over-engineering for 1% edge cases.** Details in Section 0.2 of `TODO_Multi_Config_Cart_Feature.md`.

### Shared file cautions (for parallel merges)

- `FeatureFlags.js` — touched by tasks 1 and 2 (Phase 1). Overlapping — whichever task runs first handles the `shouldUpdateFoodStatusAtItemLevelORAtOrderLevel` deletion.
- `MockData5EndToEndTesting.json` — touched by tasks 1 and 2 (Phase 1). Same overlap.

### Not in this task list

The **Offers V2** rewrite (order-level auto-apply, exclusionIds, scope changes, etc.) is already complete — see `agent_workspace/progress/session_progress_shaurya.md` (10th Apr late). It is not part of the 5 tasks above.

The **service charge backend checkout calculation** is also complete for current scope. No frontend/admin work is required for this item.

### FCM / notifications (not actionable)

The FCM-token-in-emulator item below is a testing limitation note, not a feature task. No plan file needed.

---

## Original TODO list (preserved)

## Backend

- [x] **Dead flag: `shouldUpdateFoodStatusAtItemLevelORAtOrderLevel`** — DONE (deleted in multi-config Phase 1). — tracked in `TODO_Item_Level_Food_Status_Plan.md`. Will also be deleted in Phase 1 of `TODO_Multi_Config_Cart_Feature.md` whichever task ships first.
- [x] **Multi-config cart feature + flag cleanup** — DONE (Phases 1-5 shipped; Phase 6 E2E matrix covered by jest + lifecycle matrix). — builds a new `CartVariantPickerSheet` UX for shared-table ordering of items with variants/addons, and deletes `isMultipleVariantOrAddonForMenuItemsSupported` + `fallbackToSameCustomConfigurationForAddItem` outright. Tracked in `TODO_Multi_Config_Cart_Feature.md`.
- [ ] **Cart state unification (follow-up)** — merge `MenuState._cart` and `CartListingState._cart` into one provider after the multi-config feature ships. Tracked in `TODO_Unify_Cart_State.md`.

## Notifications

- [ ] **FCM token in emulator** — `sendServerNotifications` is fully wired but requires `fcmToken` on server docs (only generated on real devices with Google Play Services). Emulator testing: flow executes, orders get assigned to servers, but push notifications don't arrive. Not a blocker — just a testing limitation to be aware of.

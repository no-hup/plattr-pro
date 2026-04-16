# TODO: Unify Consumer Cart State

**Status:** Deferred follow-up. Not blocking any current feature.
**Origin:** Surfaced during the architectural trace for `TODO_Multi_Config_Cart_Feature.md`.
**Theme:** Functionality + simplicity. Don't over-engineer — see Section 0.2 of `TODO_Multi_Config_Cart_Feature.md` for the full guideline.

---

## Problem

The consumer app holds **two independent in-memory cart instances**:

- `MenuState._cart` in `frontend/flutter_boilerplate/lib/pages/menuListing/menu_state.dart` (L653)
- `CartListingState._cart` in `frontend/flutter_boilerplate/lib/pages/cart_listing/cart_listing_state.dart` (L30)

Both are app-scoped providers (`frontend/flutter_boilerplate/lib/app.dart:40-64`), so both survive the entire session. They sync **only** via backend API responses — there is no shared event bus, no direct coupling, no merge logic. Each state independently calls `_repository.fetchCart()` at its own triggers (menu page load, cart page `initState`).

The divergence window is narrow but real: in a `Menu → edit → Back → Cart-already-mounted` navigation pattern, `CartListingState._cart` can show stale data until the next re-fetch.

Several other frictions cluster around the same split:

1. **`CartListingState.updateCartItem` had a silent-failure bug** (`cart_listing_state.dart:444-455`) that was fixed in Phase 1.5 of the multi-config feature. The duplication between the two states means parity fixes have to be applied in two places — a merge would prevent this class of drift.
2. **No request queueing.** Both states use a boolean `_isUpdatingCart` lock that silently drops concurrent requests. Rapid taps on either stepper lose intermediate actions with no user feedback.
3. **No stale-response protection.** Neither state has a sequence number or request ID. If two mutations fire in rapid succession (shouldn't happen post-lock but could in races across the two states), responses could arrive out of order and overwrite newer state.
4. **No unified loading indicator.** Both steppers disable buttons during updates but neither shows a spinner or progress bar. The multi-config picker sheet now has a `LinearProgressIndicator` inside itself, but the menu card + cart page steppers still just fade to 0.5 opacity with no "request in flight" signal.
5. **Repair logic asymmetry.** `CartListingState.fetchCart` runs `CartHelper.repairWithMenuItem` on every cart fetch (L331-427) because backend cart responses intentionally omit `name`, `description`, and `image`. `MenuState.fetchCart` does not. A unified provider would make the repair step consistent.

## Scope of the follow-up task

When this task is eventually picked up, the goal is to **reduce the architectural surface area**, not to add new features. Apply the same "functionality + simplicity, not over-engineering" theme from the multi-config feature plan.

### In scope

1. **Unify the two cart states into a single app-scoped `CartProvider`.**
   - Lift `_cart`, `_isUpdatingCart`, the mutation methods (`updateCartItem`, `fetchCart`), error handling (`_handleApiError`, `_revertToSnapshot`, `_showErrorToast`), and the repair step into one place.
   - `MenuState` and `CartListingState` become thin reader wrappers that delegate mutations to `CartProvider`. Menu quantities, cart page rendering, and the variant picker all read from the same source of truth.
   - Delete the duplicated error-handling code, the duplicated `_isUpdatingCart` lock, and any shared helpers that exist solely to bridge the two states.

2. **App-wide loading indicator** on cart-mutating steppers.
   - Menu card `_QuantityControl` and cart page `QuantitySelector` should show a small spinner (not just fade to 0.5 opacity) when `cartProvider.isUpdatingCart == true`.
   - Reuse the same pattern the variant picker uses (`LinearProgressIndicator` inside the widget, or a small `CircularProgressIndicator.adaptive(strokeWidth: 2)` overlaying the stepper).

3. **Delete dead code surfaced by the merge.**
   - Any helpers that exist only to paper over the two-state split.
   - Any duplicated conversion / repair logic.
   - Any defensive null-guarding for the "what if these two states diverge" case — the merge makes it unreachable.

### Out of scope (explicitly — don't add these without a real triggering need)

- **Request queueing** for rapid taps. The current lock-and-drop behavior is acceptable. If users complain about dropped taps after the merge + spinner improvements ship, reconsider then. Do not pre-build a queue.
- **Sequence numbers / request IDs** for stale-response rejection. Same reasoning — no evidence of a real problem, and the merge alone closes most of the window.
- **Offline persistence** of the cart. No real use case, adds significant complexity.
- **Real-time multi-device sync** (another device modifying the cart while the current user is editing). Pre-existing, deferred indefinitely unless product asks.
- **New abstractions** like a generic `Provider`-wrapping library, a state-merging framework, or anything that isn't the minimal merge.

## Prerequisites

- `TODO_Multi_Config_Cart_Feature.md` should be fully executed and merged before this task starts. The multi-config feature reshapes enough of `MenuState` that attempting the unification in parallel would create painful merge conflicts.
- The `CartListingState` parity bug fix (Phase 1.5 of the multi-config plan) should already be in place — this task absorbs that fix into the unified provider rather than keeping it as a separate code path.

## Critical files for reference (when the task starts)

- `frontend/flutter_boilerplate/lib/app.dart:40-64` — provider topology
- `frontend/flutter_boilerplate/lib/pages/menuListing/menu_state.dart` — source of truth for the correct error-handling pattern
- `frontend/flutter_boilerplate/lib/pages/cart_listing/cart_listing_state.dart` — the duplicated state to merge in
- `frontend/flutter_boilerplate/lib/pages/cart_listing/cart_helper.dart` — repair helper that will move into the unified provider
- `frontend/flutter_boilerplate/lib/pages/menuListing/helpers/cart_customization_helper.dart` — keep as-is; it handles the legacy payload conversion and is not part of the merge

## Related work

- `TODO_Multi_Config_Cart_Feature.md` — blocks this task
- `TODO_Feature_Flags_and_Schema.md` — index

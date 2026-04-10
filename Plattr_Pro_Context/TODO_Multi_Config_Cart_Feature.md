# Multi-Config Cart Feature — Implementation Plan

**Status:** Design-locked. Ready for phased execution.
**Scope:** Consumer app (Flutter) + backend Cloud Functions. Pre-launch, no backward compatibility concerns.
**Supersedes:** `Plattr_Pro_Context/TODO_Variant_Addon_Flag_Cluster_Plan.md` (already deleted — noted here for historical reference).
**Canonical location:** This file (`Plattr_Pro_Context/TODO_Multi_Config_Cart_Feature.md`). The executing agent updates it in place as phases complete — do NOT create a duplicate elsewhere.

---

## 0. How to Execute This Plan (read this first)

### 0.1 Phased execution, one phase at a time

This is a large change that will likely span multiple sessions with the coding agent. **Do not attempt to execute multiple phases in a single pass.** Pick one phase, execute it completely, review it, update this document, stop. The next session picks up the next phase.

The executing agent (which may be a fresh session with no memory of prior work) should:

1. **Read this entire document first.** Especially Section 0 (this section), Section 2 (architecture findings), Section 3 (design), and the "Phase Status Tracker" immediately below.
2. **Identify the next `⬜ pending` phase** in the Phase Status Tracker.
3. **Execute only that phase** — make the code changes described in Section 4 for that phase, nothing more.
4. **Run the phase's merge criteria** (described in Section 5 under each phase).
5. **Conduct the per-phase review** (Section 0.3 below) against the guiding theme.
6. **Update this document** with:
   - Mark the phase ✅ complete in the Phase Status Tracker
   - Add a dated note under "Phase History" (Section 0.4) summarizing what was done, what was reviewed, what was changed or deferred, and any follow-ups discovered
   - Adjust subsequent phases if the review surfaced anything that changes the approach
7. **Stop.** Do not roll into the next phase without a fresh sign-off.

### 0.2 Guiding theme — Functionality + Simplicity, not over-engineering

**This is the most important rule in the document.** Every decision during implementation and review should pass through this filter:

> **Optimize for functionality of the app and backend. Optimize for simplicity on the code side. Do not spend bandwidth over-engineering solutions to 1% edge cases.**

Concretely, this means:

**Do:**
- Ship the functionality described in this plan, correctly.
- Write straightforward code that a future reader can understand in one pass.
- Delete dead code when you find it.
- Prefer the smallest change that works.
- Reuse existing widgets, helpers, and patterns.

**Don't:**
- Add defensive null checks for scenarios that cannot happen given upstream guarantees.
- Introduce new abstractions (interfaces, helpers, factories) that serve only one call site.
- Pre-design for hypothetical future requirements.
- Handle edge cases that are vanishingly rare unless the cost of ignoring them is catastrophic. A 1% scenario with 10% of the engineering effort is usually not worth it.
- Add retry logic, backoff, circuit breakers, or queueing unless a specific scenario in this plan mandates them.
- Rewrite existing code that works just because you're in the same file.
- Add logging beyond what's needed to debug a specific known failure mode.
- Validate inputs at internal call sites — trust the caller unless the boundary is user input or an external API.

**If in doubt, do less.** It is always easier to add complexity later when a real problem surfaces than to remove it once it's baked in.

### 0.3 Per-phase review checklist

After completing each phase's code changes and merge criteria, conduct a review against these questions. Answer each one honestly in the Phase History entry (Section 0.4):

1. **Functionality:** Does this phase deliver exactly what the plan described? Nothing more, nothing less?
2. **Over-engineering check:** Did I add any code that handles a scenario I can't name a real user for? If yes, remove it.
3. **Abstraction check:** Did I create any new class, interface, helper, or file that has only one caller? If yes, inline it.
4. **Defensive code check:** Did I add any null checks, try/catch blocks, or validation for states that cannot occur given the upstream code? If yes, remove them.
5. **Dead code check:** Did the phase leave behind any unused imports, functions, variables, or tests? If yes, delete them.
6. **Reuse check:** Did I re-implement anything that already exists as a widget, helper, or pattern elsewhere in the codebase?
7. **Scope check:** Did I touch any file that wasn't in this phase's file list? If yes, was it necessary, or was it drive-by refactoring?
8. **Follow-ups:** What did I notice that's out of scope but worth capturing for later? Add to Section 8 (Out of Scope) or a new `TODO_*` file in `Plattr_Pro_Context/`.

Each review pass should either result in cleanup edits to the current phase's changes, or explicit acknowledgment in the Phase History that none were needed. The default answer to "should I add more code?" is **no**.

### 0.4 Phase Status Tracker & History

This is a living section. The executing agent updates it after each phase.

**Phase Status:**

- ⬜ Phase 1 — Backend flag + dead-code deletion
- ⬜ Phase 1.5 — `CartListingState` error-handling parity fix
- ⬜ Phase 2 — `cartItemId` threading through the remove path
- ⬜ Phase 3 — Menu badge sum + `_customizationsMatch` cleanup
- ⬜ Phase 4 — `CartVariantPickerSheet` widget
- ⬜ Phase 5 — Menu card handler rewrite
- ⬜ Phase 6 — E2E regression matrix

Legend: ⬜ pending · 🔄 in progress · ✅ complete · ⚠️ complete with deferred follow-ups

**Phase History:**

*(Empty — the executing agent appends an entry here after each phase, dated, containing: what was done, review answers to the 8 questions in Section 0.3, any plan amendments, any follow-ups filed.)*

Template for history entries:

```
### Phase N — <name> — YYYY-MM-DD
**Executed by:** <session identifier or developer>
**Summary:** <1-3 sentences of what shipped>
**Review:**
  1. Functionality: <answer>
  2. Over-engineering: <answer>
  3. Abstraction: <answer>
  4. Defensive code: <answer>
  5. Dead code: <answer>
  6. Reuse: <answer>
  7. Scope: <answer>
  8. Follow-ups filed: <list or "none">
**Plan amendments:** <any sections of this doc updated based on review — or "none">
**Deferred items:** <anything not completed in this phase and why — or "none">
```

---

## 1. Context & Motivation

### The product problem

In a restaurant with a shared-table ordering model, multiple customers at the same table share one cart. When a menu item has variants (e.g., Chicken Wings: 6pc / 12pc / 18pc) and/or addons (e.g., mayo / hot sauce / ranch), different people at the same table will naturally want different configurations of the same item.

**Current behavior (verified in code):** Once User A adds Wings 6pc + mayo to the cart, there is **no UI path** in the consumer app for User B to add Wings 12pc + hot sauce as a separate entry. Tapping the menu card body does nothing. Tapping `+` on the stepper just increments the existing 6pc + mayo entry via a backend fallback that copies the most-recent config. The `MenuCustomizationSheet` only opens when the item's total quantity is zero.

**Impact:** For any menu item with variants (beer flavors, pizza sizes, steak doneness, wing sizes), the shared-table use case is broken. A table of 5 ordering beers with 3 different flavors cannot express that in one cart.

### The goal

Let customers add the same menu item to a cart with multiple different variant/addon configurations as distinct cart entries, via a new bottom-sheet picker UX. Feature must work for every restaurant, always on, no flag.

### Why this plan simplifies the backend too

The code audit surfaced three feature flags in `FeatureFlags.js` tangled up in this area:

1. `isMultipleVariantOrAddonForMenuItemsSupported` — its one reader guards a rejection path in `addItemToCart.js` that the frontend cannot currently trigger. Effectively dead.
2. `fallbackToSameCustomConfigurationForAddItem` — controls the "quick-add reuses most-recent config" helper. Its `false` mode is broken (quick-add errors out on customizable items). No restaurant wants `false`.
3. `shouldUpdateFoodStatusAtItemLevelORAtOrderLevel` — zero readers. Dead.

All three get deleted outright in this task.

---

## 2. Architecture Verification (findings from two-pass code trace)

### Backend is 90% ready — no changes needed to price, offers, or order creation

Verified flat iteration (no `menuItemId`-uniqueness assumptions) in:

- **`backend/src-plattr/functions/cart/calculateCartValue.js:125-195`** — iterates `cart.items` as a flat list, sums each entry's `priceInfo` independently. Multi-config entries contribute correctly to `basePrice`, `finalPrice`, `totalVariantBasePrice`, `totalAddonBasePrice`, `totalDiscount`. No double-counting risk.
- **`backend/src-plattr/functions/offers/offerEngine.js`** + **`offers/strategies/BogoStrategy.js`**, **`PercentageStrategy.js`**, **`FlatStrategy.js`** — filter by `targetIds.includes(item.menuItemId)` but apply per-item with per-unit pricing and track `cartItemId` in `appliedItems`. BOGO is actually **more correct** with multi-config: "buy 1 Wings get 1 free" with Wings 6pc ($5) + Wings 12pc ($7) in cart → the 6pc (cheapest) goes free.
- **`backend/src-plattr/functions/orders/createOrUpdateOrder.js:149-184 normalizeCartItemsForOrder`** — 1:1 cart → order mapping, preserves `cartItemId` at line 180. Two cart entries → two order items.
- **`backend/src-plattr/functions/cart/validateCart.js`** — flat iteration, no uniqueness constraint.
- **`backend/src-plattr/functions/cart/addItemToCart.js:169 findIdenticalItemInCart`** — keys on `menuItemId + variants + addons` (full equality via `compareArraysIgnoringOrder`). Correct.
- **`backend/src-plattr/functions/cart/addItemToCart.js:205 cart.items.push(itemToAdd)`** — when the (to-be-deleted) `isMultiple...` flag is true, new entries are already pushed as distinct cart rows.

**`cartItemId` is a stable backend-assigned integer** via `getNextCartItemId(cart.items)` = `max(cartItemId) + 1`, monotonic per cart. Every cart entry already has a unique identifier we can surgically target.

### Kitchen + Server apps already handle multi-config orders correctly

- **Server app:** `order_detail_screen.dart:393-410 _markItemServed` extracts and passes `cartItemId` alongside `menuItemId`. Backend `serverMarkItemServed.js:72-73` matches on `menuItemId && (hasCartItemId ? cartItemId === match : true)` — precise targeting. No server app changes needed.
- **Kitchen app:** UI renders flat lists (`order_details_dialog.dart:235-286`, `item_view_list.dart:154-162`). No menuItemId-grouping. Currently mocked (`kitchen_repository.dart:117-122`), but the UI code is correct and will handle multi-config orders when wired to real data. No kitchen changes needed in this task.

### Consumer cart page is already multi-config-ready

- **`cart_page.dart:211-223`** — `ListView.separated(itemCount: items.length)`. Each `CartItem` renders as its own tile with an independent `QuantitySelector`. Two Wings entries would already render as two rows today.
- **`cart_page.dart:438-492`** — stepper callbacks pass the full `CartItem` to `CartListingState.updateCartItem`. `CartItem` already carries `cartItemId`.

### Consumer menu page — what must change

Three specific problems to fix in `lib/pages/menuListing/`:

1. **Badge shows wrong count for multi-config.** `menu_state.dart:605-626 getItemQuantity` uses `firstWhere(menuItemId == itemId).quantity` — returns only the first matching entry's quantity, not the sum.

2. **Stepper `+` gate blocks multi-config.** `menu_widgets.dart:72-93 _handleAddToCart` opens the customization sheet only when `quantity == 0`. Once any config is in the cart, `+` always calls `updateCartItem` with empty variants, and the backend fallback copies the most-recent config. Same logic in `category_carousel.dart:135-149`.

3. **Menu card `−` does not pass `cartItemId`.** `menu_widgets.dart:294-299` calls `updateCartItem(item, false)` with only the `MenuItem`. Backend `removeItemFromCart.js:37-48` falls back to `menuItemId` match and hits the first entry. With multi-config this would remove the wrong entry.

### Hard constraints surfaced by the trace (cannot be simplified away)

1. **Backend requires the legacy payload shape.** `backend/src-plattr/functions/cart/addItemToCart.js:35-43` destructures `selectedVariants` as `Map<variantId, optionId>` and `selectedAddons` as `List<addonId>`. `processSelectedVariants` at line 115 would crash on rich `VariantSelection` Freezed objects. **The Flutter conversion layer (`_convertToVariantSelections`, `selectedVariantsMap`, `selectedAddonsList`) is mandatory, not legacy debt.** Keep it.
2. **Backend cart responses intentionally lack display metadata.** The cart payload contains `menuItemId, quantity, priceInfo, cartItemId, selectedVariantsDetails, selectedAddonsDetails` — no `name`, `description`, `image`. `cart_listing_state.dart:331-427` must "repair" cart items with cached menu data before rendering. **`CartHelper.repairWithMenuItem` is architectural glue, not over-engineering.** Keep it.
3. **`MenuState` and `CartListingState` are app-scoped, independent instances** (`app.dart:40-64`). Both survive the session. They sync only via backend responses. Cart page always re-fetches on `initState` (`cart_page.dart:30-45`), so the divergence window is narrow but real. **Merging the two into a single provider is deferred to a separate task (`TODO_Unify_Cart_State.md`).**

### Pre-existing bugs surfaced during the trace

1. **`CartListingState.updateCartItem` silently fails on API errors** (`cart_listing_state.dart:444-455`). Catch block just logs and releases the lock — no rollback, no snapshot, no toast. A 5xx response or network error on a cart-page stepper tap leaves the user with zero feedback and a stale in-memory cart. `MenuState` by contrast has a proper `_handleApiError` → `_revertToSnapshot` → `_showErrorToast` path at `menu_state.dart:310-314, 431-437, 591-597`. **This asymmetry is a real bug independent of multi-config.** Fix it in this task (Phase 1.5).

2. **`_customizationsMatch` uses fragile `toString()` comparison** (`menu_state.dart:410-416`). Works by accident because Freezed generates deterministic `toString()`. Both `VariantSelection` and `AddonSelection` are Freezed with proper `==`, so `listEquals` from `package:flutter/foundation.dart` is a drop-in replacement. Fix in Phase 3 (bundled with the menu badge sum change since they touch the same file).

3. **No loading indicator during `_isUpdatingCart`.** Stepper buttons fade to 0.5 opacity via `onTap: null` (`quantity_selector.dart:98-108`), but there is no `CircularProgressIndicator` anywhere. On slow networks, users can't tell "request in flight" from "broken button." Fix scoped to the picker only in Phase 4.

---

## 3. Design

### 3.1 UX flow — the `CartVariantPickerSheet`

**Scenario:** Shared table. User A adds Wings 6pc + mayo via existing customization sheet. Cart now has 1 Wings entry. User B wants Wings 12pc + hot sauce.

**Step 1.** User B taps `+` on the Wings card on the menu page. Because `totalQtyFor(wings) ≥ 1` and the item is customizable, the new `CartVariantPickerSheet` opens.

**Step 2.** The picker displays:
- **Header** — menu item name (large), image (if available), base price
- **Card list** — one card per existing cart entry for this `menuItemId`:
  - Large text: menu item name
  - Small subtext: variant/addon summary (e.g., "6pc • mayo")
  - Per-line price
  - Per-card `QuantitySelector` stepper (`+` / `−`) — surgical, passes `cartItemId`
- **Secondary button** — "Add new customization" (below the cards)
- **Sticky footer primary button** — "Done" (just closes the sheet)
- **Close (×) button** — top-right

**Step 3.** User B taps "Add new customization". The existing `MenuCustomizationSheet` opens **on top of** the picker (modal stacking). User B selects 12pc + hot sauce and taps its own Confirm button. Customization sheet closes, API call adds the new cart entry, picker refreshes — now shows two cards: 6pc+mayo and 12pc+hotsauce.

**Step 4.** User B optionally adjusts via the picker and taps "Done". Picker closes. Menu page badge now shows "2" (sum of all Wings entries).

**Step 5.** When User B navigates to the cart page, both entries show as separate rows (already works — cart page is already multi-config-ready).

### 3.2 Menu card stepper behavior (final rules)

| State | `+` tap | `−` tap |
|---|---|---|
| `qty == 0` | Show `ADD` button → opens existing `MenuCustomizationSheet` (unchanged) | n/a |
| `qty == 1` (1 entry, 1 unit) | Opens `CartVariantPickerSheet` | **Direct remove** with known `cartItemId` (skip picker — only 1 thing to remove) |
| `qty ≥ 2` (any combination of entries/units) | Opens picker | Opens picker |

**Non-customizable items:** Always use today's direct stepper behavior. Picker never opens. `needsCustomization(item)` check gates every picker-triggering branch.

The visual stepper always shows `+` and `−` at every state. The asymmetry at `qty == 1` is purely in the handler behavior, invisible to users.

### 3.3 Picker commit semantics — immediate mode

Every tap on a stepper inside the picker hits the backend API immediately with an optimistic local update and rollback-on-error. Reuses the existing `MenuState.updateCartItem` path.

**"Done" button is just "close the sheet"** — no transactional commit, no new backend API, no pending-diff state. The × button is equivalent to "Done." There is no Cancel / undo semantic.

**Rationale:** Matches every existing cart mutation pattern in the app. Zero new backend work. Rapid-tap dropped-request problem is bounded by the picker-specific loading indicator (Phase 4 addition).

### 3.4 Backend API contract — no new endpoints

The picker and the menu card handlers call the existing functions:
- `addItemToCart` (callable) with explicit `selectedVariants` + `selectedAddons`
- `removeItemFromCart` (callable) with explicit `cartItemId` + `menuItemId` (`cartItemId` takes precedence in the backend's matching logic at `removeItemFromCart.js:37-48`)

The rich `VariantSelection` / `AddonSelection` Freezed objects get converted to `Map<variantId, optionId>` + `List<addonId>` via the existing `selectedVariantsMap` / `selectedAddonsList` getters on `CartItem` (see `cart_item.dart:174-185`). No payload shape change.

### 3.5 Picker UI fidelity

Implementation-level decisions to keep the widget simple and consistent with the existing design:

- **Bottom-sheet shell:** same `showModalBottomSheet` shape/radius as `MenuCustomizationSheet`, same background (`AppColors.paper`), same top radius (`BorderRadius.vertical(top: Radius.circular(AppDimensions.radiusLG))`)
- **Typography:** `AppTypography` tokens only — no custom text styles
- **Colors:** `AppColors` tokens only — no hard-coded hexes
- **Spacing:** `AppDimensions` tokens only
- **Per-entry stepper:** reuse existing `QuantitySelector` widget with `compact: true`
- **Price display:** reuse existing `PriceDisplay` widget
- **Loading state:** `LinearProgressIndicator` across the top of the sheet (inside the sheet, below the header) — visible whenever `context.watch<MenuState>().isUpdatingCart == true`. Scoped to the picker only. Do not alter menu card or cart page stepper UX in this task.
- **Auto-close:** when all entries for this `menuItemId` drop to 0 qty (e.g., user decrements every card to zero), the picker closes and returns to the menu page. Menu badge updates to 0, stepper collapses back to the `ADD` button.

### 3.6 Edge cases (pre-resolved, no user input needed)

- **Non-customizable items** — Picker never opens. `needsCustomization(item)` gate.
- **"Add new customization" produces a config identical to an existing entry** — Backend `findIdenticalItemInCart` already handles this: the existing entry is incremented rather than duplicated. Picker refreshes showing the merged entry.
- **External cart mutation** (another device at the same table adds a Wings entry while picker is open) — Pre-existing orthogonal concern. Picker re-reads from `MenuState._cart` on every rebuild, so any cart refresh propagates naturally.
- **Rapid taps inside the picker** — Existing `_isUpdatingCart` lock drops concurrent requests silently. Partially mitigated by the new picker loading indicator. Full fix deferred to unification task.

---

## 4. Technical Design & File Changes

### 4.1 Backend — pure deletions

**`backend/src-plattr/functions/singleton/FeatureFlags.js`**
- Delete `isMultipleVariantOrAddonForMenuItemsSupported` (flag + JSDoc + flow-impact map entry)
- Delete `fallbackToSameCustomConfigurationForAddItem` (flag + JSDoc + flow-impact map entry)
- Delete `shouldUpdateFoodStatusAtItemLevelORAtOrderLevel` (flag + JSDoc + flow-impact map entry)
- Update the header JSDoc flow-impact map

**`backend/src-plattr/functions/cart/addItemToCart.js`**
- Delete lines ~10 (import of `applyFallbackConfiguration`)
- Delete lines ~79-87 (the `applyFallbackConfiguration` call site)
- Delete lines ~166-183 (the `isMultipleConfigsSupported` check and `checkDifferentConfigExists` rejection branch)

**`backend/src-plattr/functions/cart/addItemToCartCustomisationHelper.js`**
- **Delete the entire file.** The `applyFallbackConfiguration` helper is obsolete because the new picker flow always sends explicit variants/addons.

**`backend/src-plattr/functions/cart/addItemToCartBoilerplateHelper.js`**
- Delete `checkDifferentConfigExists` function body and its export (grep to confirm orphaned after the `addItemToCart.js` edit)

**`backend/src-plattr/functions/dev/setFeatureFlags.js`**
- Remove any of the three deleted flags from the allow-list if referenced. This is the dev-only endpoint used by tests and the emulator to override flags at runtime; the file itself stays (it's still needed for other flags), only the three deleted flag names come out.
- `backend/src-plattr/functions/dev/indexDev.js` — reference only, no change needed. It just re-exports `setFeatureFlags`; it doesn't reference the deleted flag names directly.

**`backend/src-plattr/functions/test/mocks/featureFlags.mock.js`**
- Remove the three deleted flag entries (verified references at lines ~7, 8, 13). Keep the surrounding mock structure intact — other flags still use this mock.

**`backend/src-plattr/functions/mock/MockData5EndToEndTesting.json`**
- Remove any restaurant-level `featureFlags` overrides of the three deleted flags

**`backend/src-plattr/functions/test/unit/cart/addItemToCart.test.js`**
- Delete tests that exercised `isMultipleVariantOrAddonForMenuItemsSupported=false`, `fallbackToSameCustomConfigurationForAddItem=false`, or `shouldUpdateFoodStatusAtItemLevelORAtOrderLevel`. Specifically the tests the old plan documented as 37, 38, 39 (verify numbering)
- Add new tests for the multi-config add flow (see §5 Testing)

**Docs (optional, low priority — mark as follow-up if skipped):**
- `backend/src-plattr/functions/tests/API_WORKFLOW_TEST.md` — references the three deleted flag names in example request bodies and documentation text. Update to remove them, OR skip and file a `TODO_Docs_Flag_Cleanup.md` follow-up. Do not over-invest here.
- `backend/src-plattr/functions/docs/cart_order_flow.puml` — PlantUML diagram referencing the flag-gated branches. Update only if the diagram is actively maintained. If unclear, skip and note in the Phase History.

**Theme reminder:** Per §0.2, do not rewrite the docs files as a drive-by refactor. Grep-and-prune the specific flag names, and stop. If either docs file is clearly stale beyond the flag references, that's a separate concern — file it, don't fix it here.

### 4.2 `CartListingState` parity fix (pre-existing bug)

**`frontend/flutter_boilerplate/lib/pages/cart_listing/cart_listing_state.dart`**

Bring `updateCartItem` (L260-455) to error-handling parity with `menu_state.dart`:

- Before mutation: `final previousCart = _cart?.copyWith();`
- Add optional `BuildContext? context` parameter to `updateCartItem` (mirrors `MenuState.updateCartItem`)
- On API failure (non-success response OR caught exception): revert `_cart = previousCart`, call `notifyListeners()`, show a toast via `ScaffoldMessenger.of(context).showSnackBar(...)` — identical pattern to `menu_state.dart:310-314, 431-437, 591-597`
- Thread `BuildContext` through the cart page callers at `cart_page.dart:438-492`
- Audit `CartListingState.fetchCart` (L71-239) for the same silent-logging pattern and apply parity fix if present

~30 lines of change.

### 4.3 Surgical remove — `cartItemId` threading

**`frontend/flutter_boilerplate/lib/pages/menuListing/add_cart_response.dart`** (or wherever `class RemoveFromCartRequest` lives — grep to locate)
- Add optional `int? cartItemId` field to `RemoveFromCartRequest`
- Update `toJson()` to include `cartItemId` when non-null

**`frontend/flutter_boilerplate/lib/pages/menuListing/menu_state.dart`**
- `updateCartItem` (L136-235): accept optional `int? cartItemId` parameter
- `_makeCartApiRequest` (L269-306): thread `cartItemId` into the `RemoveFromCartRequest` payload
- `_updateLocalCart` (L317-407): decrement path prefers `cartItemId == existingCartItemId` match over the menuItemId + variants fallback; add helper `getCartEntriesFor(String menuItemId) → List<CartItem>`

**`frontend/flutter_boilerplate/lib/pages/cart_listing/cart_listing_state.dart`**
- `updateCartItem` (L260-308): extract `item.cartItemId` and pass it into the `RemoveFromCartRequest` payload

**`frontend/flutter_boilerplate/lib/pages/menuListing/menu_widgets.dart`** and **`category_carousel.dart`**
- Menu card `−` handler (`menu_widgets.dart:294-299`, same logic in carousel): when the item is customizable and `entries.length == 1`, read `entries.first.cartItemId` and pass it to `updateCartItem`

**`backend/src-plattr/functions/cart/removeItemFromCart.js`** — already accepts `cartItemId`. No change.

### 4.4 Menu badge sum

**`frontend/flutter_boilerplate/lib/pages/menuListing/menu_state.dart`**

Replace `getItemQuantity` at L605-626:

```dart
int getItemQuantity(String itemId) {
  if (_cart == null || _cart!.items.isEmpty) return 0;
  return _cart!.items
      .where((item) => item.menuItemId == itemId)
      .fold<int>(0, (sum, item) => sum + (item.quantity ?? 0));
}
```

Add a new helper for the stepper logic:

```dart
List<CartItem> getCartEntriesFor(String menuItemId) {
  if (_cart == null) return const [];
  return _cart!.items.where((i) => i.menuItemId == menuItemId).toList();
}
```

Callers of `getItemQuantity`: `menu_state.dart:560 _updateMenuQuantities`, `MenuPage.dart:424 _getItemQuantities`. Both benefit directly with no change.

`getStoredCustomization` at L633-645 also uses `firstWhere` — leave as-is. The picker does not call it; it reads `_cart.items` directly via `getCartEntriesFor`.

### 4.5 Replace `_customizationsMatch` with `listEquals`

**`frontend/flutter_boilerplate/lib/pages/menuListing/menu_state.dart`**

At the top of the file, add:
```dart
import 'package:flutter/foundation.dart';
```

Replace L410-416:
```dart
bool _customizationsMatch<T>(List<T> list1, List<T> list2) {
  return listEquals(list1, list2);
}
```

`VariantSelection` and `AddonSelection` are Freezed with generated `==`, so `listEquals` handles element-wise deep equality correctly.

### 4.6 `CartVariantPickerSheet` widget (new file)

**`frontend/flutter_boilerplate/lib/pages/menuListing/widgets/cart_variant_picker_sheet.dart`**

Constructor signature:

```dart
class CartVariantPickerSheet extends StatelessWidget {
  const CartVariantPickerSheet({
    required this.menuItem,
    required this.tableId,
    required this.restaurantId,
    super.key,
  });

  final MenuItem menuItem;
  final String tableId;
  final String restaurantId;
  // ... build() uses Consumer<MenuState>
}
```

Internal behavior:
- Wraps everything in `Consumer<MenuState>` so it rebuilds as cart updates propagate from API responses
- Reads `existingEntries = menuState.getCartEntriesFor(menuItem.id)` on every rebuild
- If `existingEntries.isEmpty` after a decrement-to-zero, auto-closes the sheet (`Navigator.of(context).pop()`) inside a `WidgetsBinding.instance.addPostFrameCallback`
- Renders:
  - Header: menu item name, image, base price
  - `LinearProgressIndicator` visible when `menuState.isUpdatingCart == true`
  - `ListView` of cards (`existingEntries.length` items); each card has variant/addon summary text + `PriceDisplay` + `QuantitySelector(compact: true)` calling `menuState.updateCartItem(menuItem, increment, cartItemId: entry.cartItemId, selectedVariants: entry.selectedVariantsMap, selectedAddons: entry.selectedAddonsList, tableId: ..., restaurantId: ..., context: context)`
  - Secondary button: "Add new customization" (calls `_showAddNewCustomization` helper that does `showModalBottomSheet` for `MenuCustomizationSheet` stacked on top)
  - Sticky footer primary button: "Done" (just `Navigator.of(context).pop()`)
  - Close (×) top-right in the header

Entry point helper on the menu card:

```dart
void _showCartVariantPicker(BuildContext context) {
  showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    backgroundColor: AppColors.paper,
    shape: const RoundedRectangleBorder(
      borderRadius: BorderRadius.vertical(top: Radius.circular(AppDimensions.radiusLG)),
    ),
    builder: (context) => CartVariantPickerSheet(
      menuItem: widget.item,
      tableId: widget.tableId,
      restaurantId: widget.restaurantId,
    ),
  );
}
```

### 4.7 Menu card handler rewrite

**`frontend/flutter_boilerplate/lib/pages/menuListing/menu_widgets.dart`** and **`category_carousel.dart`**

Replace `_handleAddToCart` and split the decrement out into a `_handleDecrement`:

```dart
void _handleAddToCart(BuildContext context) {
  final menuState = context.read<MenuState>();

  if (!menuState.needsCustomization(widget.item)) {
    widget.onQuantityChanged(true);
    return;
  }

  final totalQty = menuState.getItemQuantity(widget.item.id);

  if (totalQty == 0) {
    _showCustomizationSheet(context);
    return;
  }

  // totalQty >= 1 for a customizable item → always picker
  _showCartVariantPicker(context);
}

void _handleDecrement(BuildContext context) {
  final menuState = context.read<MenuState>();

  if (!menuState.needsCustomization(widget.item)) {
    menuState.updateCartItem(
      widget.item,
      false,
      tableId: widget.tableId,
      restaurantId: widget.restaurantId,
      context: context,
    );
    return;
  }

  final entries = menuState.getCartEntriesFor(widget.item.id);
  final totalQty = menuState.getItemQuantity(widget.item.id);

  if (totalQty == 1 && entries.length == 1) {
    final entry = entries.first;
    menuState.updateCartItem(
      widget.item,
      false,
      cartItemId: entry.cartItemId,
      selectedVariants: entry.selectedVariantsMap,
      selectedAddons: entry.selectedAddonsList,
      tableId: widget.tableId,
      restaurantId: widget.restaurantId,
      context: context,
    );
    return;
  }

  _showCartVariantPicker(context);
}
```

Wire `_QuantityControl` (menu_widgets.dart:269-323) and the carousel's equivalent stepper to call `_handleDecrement(context)` on the `−` button instead of the inline `updateCartItem(item, false)`.

Same changes in `category_carousel.dart` at the matching line ranges.

### 4.8 Context-file housekeeping

Already handled at plan-save time (pre-execution) — listed here so the executing agent knows not to redo them:

- ✅ `Plattr_Pro_Context/TODO_Variant_Addon_Flag_Cluster_Plan.md` — already deleted (superseded by this plan)
- ✅ `Plattr_Pro_Context/TODO_Unify_Cart_State.md` — already exists, captures the deferred cart-state unification follow-up
- ✅ `Plattr_Pro_Context/TODO_Feature_Flags_and_Schema.md` — index already updated to reference this plan

The executing agent updates **this file in place** after each phase — marks the Phase Status Tracker (§0.4), appends a Phase History entry, and amends later sections if the review surfaced anything that changes the approach. Do not create a new plan file.

---

## 5. Execution Phases

Each phase is independently reviewable and can ship as its own PR if desired. Suggested ordering minimizes merge conflicts and lets regression testing catch issues early.

### Phase 1 — Backend flag + dead-code deletion
- All changes in §4.1
- Zero user-visible behavior change
- Boot the emulator, run the cart unit tests, run one E2E regression on single-config add/remove → verify nothing fell over
- **Merge criteria:** unit tests pass, emulator boot clean, cart single-config regression intact

### Phase 1.5 — `CartListingState` error-handling parity fix
- All changes in §4.2
- Standalone pre-existing bug fix — could ship independently before or alongside this task
- **Merge criteria:** forced 5xx on cart page `+` / `−` / remove triggers rollback + visible toast; success path unchanged

### Phase 2 — `cartItemId` threading through the remove path
- All changes in §4.3
- **Merge criteria:** cart page stepper and menu card `−` (for single-config items) both send `cartItemId` in the payload verified via network inspection; single-config removal still works end-to-end

### Phase 3 — Menu badge sum + `_customizationsMatch` cleanup
- All changes in §4.4 and §4.5
- Bundle into one PR because they touch the same file
- **Merge criteria:** single-entry badge still shows correct count; adding two different customizations of the same item manually (via a test hook or temporary UI) shows the sum

### Phase 4 — `CartVariantPickerSheet` widget (biggest chunk)
- All changes in §4.6
- Does not wire the widget into any entry point yet — just builds it and verifies via a throwaway debug route
- **Merge criteria:** picker renders correctly against a seeded multi-entry cart (use a test fixture); stepper on picker rows mutates cart correctly; "Add new customization" modal-stacks correctly; loading indicator appears during `isUpdatingCart`; auto-close fires when all entries drop to 0

### Phase 5 — Menu card handler rewrite
- All changes in §4.7
- Picker becomes user-reachable for the first time
- **Merge criteria:** all E2E scenarios in §6 pass

### Phase 6 — E2E regression matrix
- See §6 below
- Run the full matrix as a gate for release

---

## 6. Testing

### Unit tests
- `backend/src-plattr/functions/test/unit/cart/addItemToCart.test.js` — new cases:
  - Adding two different variant configs of the same menuItem produces two distinct cart entries with sequential `cartItemId`
  - Price calculation on a multi-entry cart sums correctly
  - Adding an identical config to an existing entry increments quantity (does not create a third entry)
- Delete tests exercising the three deleted flags
- `MenuState.getItemQuantity` — returns sum for multi-entry, single value for single-entry, zero for no entries
- `MenuState.getCartEntriesFor` — returns empty list for no match, list in insertion order for match
- `_customizationsMatch` via `listEquals` — same list returns true, different order returns false (VariantSelection ordering is deterministic from backend)

### Widget tests
- `CartVariantPickerSheet` with one entry — renders one card, decrement to zero closes the sheet
- `CartVariantPickerSheet` with two entries — renders two distinct cards, each card's stepper targets its own `cartItemId`
- Loading indicator appears when `isUpdatingCart == true` and disappears on release
- "Add new customization" opens `MenuCustomizationSheet` on top; confirming it leaves the picker open with an updated entry list

### End-to-end scenarios (consumer app against live backend emulator)

1. **Happy path multi-config add.** Add Wings 6pc + mayo via customization sheet → menu badge shows "1" → tap `+` → picker opens with one card → tap "Add new customization" → pick 12pc + hot sauce → picker refreshes with two cards → tap "Done" → menu badge shows "2" → navigate to cart page → cart shows two distinct rows with independent steppers → checkout → order is created with two distinct order items
2. **Decrement to zero from picker.** Cart has two Wings entries → tap `+` on menu card → picker opens → decrement each card to 0 → picker auto-closes → menu badge shows 0 → stepper shows `ADD` button
3. **Single-entry single-unit direct remove.** Cart has Wings 6pc qty 1 → tap `−` on menu card → cart empty immediately, no picker flash, no stale state
4. **Single-entry qty 2 via menu card `−`.** Cart has Wings 6pc qty 2 → tap `−` on menu card → picker opens → user decrements the card from 2 to 1 inside the picker → picker stays open
5. **Non-customizable regression.** Burger (no variants) `+` and `−` behave exactly as before, no picker ever opens, quick-add still works for increments
6. **BOGO regression.** Activate a "buy 1 Wings get 1 free" offer → cart has Wings 6pc ($5) + Wings 12pc ($7) → offer engine discounts the 6pc (cheapest unit price) → cart total reflects one Wings free
7. **Price calculation regression.** Multi-entry cart total equals the sum of individual entry prices + variant + addon totals; matches single-entry baseline for trivially equivalent configs
8. **Order creation regression.** Multi-entry cart flows to `createOrUpdateOrder` → order has two items with distinct `cartItemId`s → server app renders both rows → marking 6pc as served updates only the 6pc row's status, 12pc stays pending
9. **Error path on picker stepper.** Force a 5xx on a picker `+` tap → optimistic update reverts → `MenuState._cart` restored → toast shown → picker shows previous state
10. **Error path on cart page stepper (Phase 1.5 validation).** Force a 5xx on cart page `+` tap → `CartListingState._cart` reverts → toast shown (was silently failing before)

---

## 7. Decisions Locked In

- **No feature flag** — multi-config is mandatory for every restaurant. Three flags deleted outright.
- **No backward compatibility** — app is pre-launch, every change is a direct replacement.
- **No new backend endpoints** — picker reuses `addItemToCart` + `removeItemFromCart` with explicit `cartItemId`.
- **Picker commits — immediate mode** — every tap hits the API with optimistic update + rollback-on-error. "Done" just closes the sheet.
- **Menu card stepper rule** — `qty == 0` → customization sheet; `qty == 1` → `+` picker, `−` direct remove; `qty ≥ 2` → both picker.
- **Picker UI fidelity** — reuse existing `AppColors` / `AppTypography` / `AppDimensions` and existing widgets (`QuantitySelector`, `PriceDisplay`, `MenuCustomizationSheet` stacking).
- **Picker loading indicator** — `LinearProgressIndicator` at the top of the sheet, scoped to the picker only.
- **`CartListingState` silent-failure bug** — fix bundled into Phase 1.5.
- **`_customizationsMatch` fragility** — fix bundled into Phase 3.
- **Cart state unification** — deferred to `TODO_Unify_Cart_State.md`.
- **Multi-user attribution** ("this Wings is yours, that's his") — out of scope.

## 8. Out of Scope (Explicitly)

- Cart state unification (`MenuState._cart` + `CartListingState._cart` merge) → `TODO_Unify_Cart_State.md`
- Request queueing / sequence-number stale-response rejection → same follow-up
- App-wide loading indicator on menu card + cart page steppers → same follow-up
- Kitchen app real-backend wiring → tracked in `TODO_Item_Level_Food_Status_Plan.md`
- Multi-user attribution on cart/order items
- Real-time multi-device cart sync (another device modifies cart while picker open)
- Batched picker commits with true Cancel semantics
- Changes to backend price calculation, offer engine, or order creation (all already multi-config-safe)
- Any Server app or Kitchen app UI changes

## 9. Known Limitations (Accepted, Not Fixed Here)

- Menu card + cart page steppers still silently drop rapid concurrent taps (only the picker gets a loading indicator in this task)
- `MenuState._cart` / `CartListingState._cart` can briefly diverge in Menu → edit → Back → Cart-already-mounted navigation patterns
- No sequence-number protection against stale responses arriving out of order

## 10. Critical Files Index

### Backend
- `backend/src-plattr/functions/singleton/FeatureFlags.js` — delete 3 flags
- `backend/src-plattr/functions/cart/addItemToCart.js` — delete dead branches L10, L79-87, L166-183
- `backend/src-plattr/functions/cart/addItemToCartCustomisationHelper.js` — delete entire file
- `backend/src-plattr/functions/cart/addItemToCartBoilerplateHelper.js` — delete `checkDifferentConfigExists`
- `backend/src-plattr/functions/cart/removeItemFromCart.js` — reference only, no change (already accepts `cartItemId`)
- `backend/src-plattr/functions/dev/setFeatureFlags.js` — allow-list cleanup (dev-only endpoint; file stays, flag entries come out)
- `backend/src-plattr/functions/dev/indexDev.js` — reference only, no change (just re-exports `setFeatureFlags`)
- `backend/src-plattr/functions/test/mocks/featureFlags.mock.js` — remove the three deleted flag entries (~L7, L8, L13)
- `backend/src-plattr/functions/mock/MockData5EndToEndTesting.json` — remove flag overrides
- `backend/src-plattr/functions/test/unit/cart/addItemToCart.test.js` — delete + add tests
- `backend/src-plattr/functions/tests/API_WORKFLOW_TEST.md` — **optional docs cleanup** (prune flag name mentions, or defer as follow-up)
- `backend/src-plattr/functions/docs/cart_order_flow.puml` — **optional docs cleanup** (same)

### Consumer frontend
- `frontend/flutter_boilerplate/lib/pages/menuListing/menu_state.dart` — L136-235 (`updateCartItem`), L269-306 (`_makeCartApiRequest`), L317-407 (`_updateLocalCart`), L410-416 (`_customizationsMatch`), L605-626 (`getItemQuantity`), new `getCartEntriesFor`
- `frontend/flutter_boilerplate/lib/pages/menuListing/menu_widgets.dart` — L43-93 (handlers), L269-323 (`_QuantityControl`)
- `frontend/flutter_boilerplate/lib/pages/menuListing/widgets/category_carousel.dart` — L106-149 (handlers), L290-324 (stepper)
- `frontend/flutter_boilerplate/lib/pages/menuListing/widgets/cart_variant_picker_sheet.dart` — **NEW**
- `frontend/flutter_boilerplate/lib/pages/menuListing/add_cart_response.dart` — add `cartItemId` field to `RemoveFromCartRequest`
- `frontend/flutter_boilerplate/lib/pages/menuListing/models/cart_item.dart` — reference only, no change (already has `cartItemId`, `selectedVariantsMap`, `selectedAddonsList`)
- `frontend/flutter_boilerplate/lib/pages/menuListing/helpers/cart_customization_helper.dart` — reference only, no change
- `frontend/flutter_boilerplate/lib/pages/cart_listing/cart_listing_state.dart` — L260-455 (`updateCartItem`), possibly L71-239 (`fetchCart`) for parity fix
- `frontend/flutter_boilerplate/lib/pages/cart_listing/cart_page.dart` — reference only, no change (already passes full `CartItem`)

### Context files (reference — all housekeeping already done)
- `Plattr_Pro_Context/TODO_Multi_Config_Cart_Feature.md` — **this file** (updated in place by the executing agent after each phase — do NOT create a duplicate)
- `Plattr_Pro_Context/TODO_Unify_Cart_State.md` — deferred follow-up (already exists, do not modify unless scope changes)
- `Plattr_Pro_Context/TODO_Feature_Flags_and_Schema.md` — index (already updated; re-check only if deleted flag count changes)
- `Plattr_Pro_Context/TODO_Variant_Addon_Flag_Cluster_Plan.md` — already deleted, do not re-create

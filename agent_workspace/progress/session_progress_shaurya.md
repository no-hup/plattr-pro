9th jan 26

menu refactor done to accomodate sub categories and multiple menus

todo: FE menu page seems to be breaking. secitons are not clickable, need to checkl


13th jan

@menu_v2 design stragtegy prepared. need to execute. SCROLL_SYNC_STRATEGY, MENU_MIGRATION_STRATEGY

designs added 
todo - post migration make stragegy for design and theming changes to accomodate new design

15th Jan

How does offer actually get applied on backend and its realtion with prices.

20th jan

move from branch - 9-jan-db-schema-change-subcategory-menu

to 20-jan-server-app-resume
todo test all apps
Search & Filter
dish level status update and cancellation at server app?

Fix the 

updateOrderStatus
 placeholder in the Server App, implement proper status consolidation using a single source of truth, and ensure robust error handling for status updates.

User Review Required
IMPORTANT

Cart vs Order Status Strategy: The UI only exposes "Mark Ready" at the order level. To support the multi-cart backend, "Mark Ready" will iterate through all active carts in the order and update them individually. This is a workaround to avoid rebuilding the UI at this stage (Tech Debt). "Cancel Order" will use the order-level cancellation endpoint.


mock data for testing end to end flow

23rd Jan 26

**What's Done:**
• Consolidated `CART_STATUS` and `CART_ITEM_STATUS` into a unified `FULFILLMENT_STATUS` in the backend.
• Simplified fulfillment flow by removing the redundant `ACCEPTED` status. New flow: `PENDING` → `PREPARING`/`READY` → `SERVED`.
• Refactored Server App shell to include a global `ServerAppBarWidget` and `NoInternetBannerWidget` using `connectivity_plus`.
• Updated Server App L0 screens (`Orders`, `Tables`, `Menu`) to integrate with the new shell and support dynamic app bar actions.
• Added `profileImageUrl` to server login response and updated the UI to display it in the app bar.
• Synchronized Consumer App status handling and UI colors with the new backend fulfillment statuses.

**Things to Test in UI (Manual):**
• **Server App Login**: Verify successful login and check if the profile image and restaurant name appear correctly in the new app bar.
• **Server App Navigation**: Switch between Orders, Tables, and Menu tabs; ensure the app bar title and actions (refresh button) update correctly.
• **Server App Connectivity**: Toggle internet connection and verify that the "No Internet" banner appears/disappears smoothly.
• **Server App Order Status**: Mark a cart as "Preparing" or "Ready" and verify the status update reflects in the UI without the `ACCEPTED` step.
• **Consumer App Order History**: Check if the order and cart statuses (`Preparing`, `Ready`, `Served`) are displayed with correct colors in the order history.

28th Jan 26
mockdata v5 is minimal to test all apps. make it more robust to cover all feature flags.
test offer and kitchen app.
finish work on admin app

Parsing robustness (suggestions)
- Centralize parsing helpers in `platter_core` (status normalization, timestamps, ids) and reuse everywhere.
- Standardize response envelopes and stable `data` shapes across endpoints.
- Prefer generated models + `@JsonKey(fromJson:)` converters over manual parsing.
- Add a repository-level adapter/mapping layer for backend → app model transforms.
- Enforce required vs optional fields with defaults and logging for missing mandatory fields.
- Normalize status/enums at the edge; keep UI on canonical values.
- One timestamp converter for int/string/`Timestamp`/map formats.
- Contract tests with real backend responses to catch drift.

5th Apr 26

**E2E API Testing Framework — Expanded to ~95% Consumer Coverage**

Scope: `backend/claude-api-testing-workflow/`

**Output optimization (for Haiku-class LLM execution):**
- `run.js` now summary-only by default (silent passes, detailed failures); `--verbose` for humans
- Created `lib/narrator.js` — business-logic narrative log to `results/narrative.log` (tail -f in separate terminal to watch what's being tested: items added, prices verified, offers applied, order status transitions)
- Created `run-tests.sh` wrapper script
- Rewrote `README_AGENT.md` with 3-line quick start for Haiku

**Mock data expansion:**
- 7 restaurants (was 3): added empty_menu, all_out_of_stock, simple_menu (no variants/addons), offer_configs (9 offers incl BOGO, expired, complex conditions, maxDiscount cap)
- 9 tables per restaurant (was 6) for suite isolation
- 6 offers on primary restaurant (was 3)

**New + expanded test suites:**
- NEW `offer-pricing.js` (13 tests): BOGO, PERCENTAGE, FLAT, maxDiscount caps, expiry, condition combos, offer persistence through checkout
- `pricing.js` +5: multi-addon, qty multiplier, 5-item cart, 3-item with quantities
- `offers.js` +7: apply/reject/remove for each offer type, price restoration
- `order-lifecycle.js` +8: CANCELLED flow, backward transition rejection, multi-cart independence
- `menu.js` +3, `table.js` +3, `error-cases.js` +5, `customer-journey.js` +2

**Totals: 12 suites, ~185 tests (was 11 suites, ~139 tests)**

New assertions: `assertPriceRange`, `assertContains`, `assertOneOf`

Progress file also at: `backend/claude-api-testing-workflow/PROGRESS.md`

todo: run full suite against emulator and fix any test failures. BUG-1 (Firestore transaction ordering in createOrUpdateOrder.js) still blocks all checkout-dependent tests.

6th Apr 26

**Feature Flag Override System — Completed wiring for E2E testing**

- Audited all backend entry points that call `featureFlags.isEnabled()`
- Found 4 entry points missing `loadOverrides(db)` call (previously only `addItemToCart` and `table.js` had it)
- Added `loadOverrides(db)` to: `checkoutCart.js`, `updateOrderStatus.js`, `orderTriggers.js` (onOrderPlaced + onOrderUpdated)
- Verified all modules load without syntax errors

Files ready to commit (feature flag override system — uncommitted from prior session + today's fixes):
- `FeatureFlags.js` — `loadOverrides()` method + `_overrideStore`
- `setFeatureFlags.js` — new dev-only endpoint (emulator-guarded)
- `indexDev.js` — exports `setFeatureFlags`
- `importMockData5.js` — `--clean` and `--refresh-timestamps` CLI flags
- `addItemToCart.js`, `table.js`, `checkoutCart.js`, `updateOrderStatus.js`, `orderTriggers.js` — all call `loadOverrides(db)` at entry

todo: commit the feature flag override system. Then run E2E test suite against emulator to validate mock data + flag permutations work end-to-end.

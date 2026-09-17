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

Scope: `backend/src-plattr/functions/test/e2e/`

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

Progress file also at: `backend/src-plattr/functions/test/e2e/PROGRESS.md`

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

10th Apr 26 (late)

**Offers V2 — Order-Level Auto-Apply**

Moved from cart-level manual offer application to order-level auto-apply at checkout. No backward compatibility — system not live yet, cleaned up aggressively.

**Product decisions:**
- Offers auto-apply at each cart checkout (best discount wins, tiebreak by `priority`)
- Evaluated across ALL carts in the order, not per cart
- Safety net re-evaluation at order COMPLETED (catches cancellations)
- Admin app gets full CRUD flow for offers
- New `exclusionIds` support (e.g., "20% off everything except desserts")
- New `scope: ORDER` replaces the old `CART` scope
- Single source of truth: the order document (carts no longer carry offer fields)

**Backend deleted:**
- `offers/applyOffer.js`, `offers/removeOffer.js`, `cart/PriceCalculator.js`

**Backend created:**
- `offers/evaluateOrderOffers.js` — `evaluateAndPickBestOffer` + `buildAppliedOfferObject` (graceful fallback: returns null on any error)
- `adminApp/offers_admin.js` — createOffer / updateOffer / deleteOffer / getOffers with input validation

**Backend modified:**
- `orders/createOrUpdateOrder.js` — removed lazy offer revalidation; auto-applies best offer on every cart append; **uses RAW cart items (not normalized!)** because `normalizeCartItemsForOrder` strips `categoryId`/`subcategoryIds`
- `orders/updateOrderStatus.js` — COMPLETED handler re-evaluates offers; bill check now compares `basePrice` (not `finalPrice`) so cancellation-triggered offer changes don't fail revalidation
- `offers/offerEngine.js`, `strategies/BaseOfferStrategy.js` — ORDER scope, `minOrderValue` (renamed from `minCartValue`), uppercase `FULFILLMENT_STATUS.CANCELLED`, exclusion filtering
- `strategies/{Percentage,Flat}Strategy.js` — CART→ORDER, exclusion-aware
- `strategies/BogoStrategy.js` — `buyQty`/`getQty` → `buyQuantity`/`getQuantity` to match mock data
- `cart/calculateCartValue.js` — no longer preserves offer fields on cart; fixed cancelled-status case
- `cart/validateCart.js` — no longer subtracts offerDiscount
- `genericModels/priceinfo.js` — `OrderPriceInfo` now has `offerDiscount` field
- `orders/getOrder.js` sanitizer — returns `appliedOffer`, `offerDiscount`, full `priceInfo` for the consumer UI
- `offers/indexOffers.js`, `adminApp/indexAdminApp.js`, `index.js` — updated exports

**Pre-existing bugs fixed (caught during plan review):**
1. **Cancelled item case mismatch** — code compared `item.status === 'cancelled'` (lowercase) but constant is `'CANCELLED'` (uppercase). Cancelled items were never actually filtered. Fixed across 4 files via shared `FULFILLMENT_STATUS.CANCELLED` constant.
2. **BOGO naming mismatch** — engine used `buyQty`/`getQty`, mock data used `buyQuantity`/`getQuantity`. BOGO silently defaulted to 1+1 regardless of stored values. Renamed engine to match mock data.
3. **Normalized items strip category fields** — would have broken CATEGORY/ITEM offers at order level. Plan explicitly uses raw cart items.
4. **Bill revalidation on finalPrice** — would mismatch once offer discount was introduced. Changed to compare base.
5. **getOrder sanitizer missing appliedOffer** — consumer UI would show nothing.

**Docs:**
- `auxilary/docs/OFFERS_SYSTEM.md` — rewritten for V2 architecture
- NEW `Plattr_Pro_Context/OFFERS_V2_Architecture.md` — decision log + gotchas for future agents
- `restaurant-menu-setup-prod/ONBOARDING_PROMPT.md` — new offers schema section with ORDER scope and exclusionIds examples

**Frontend (delegated to subagent):**
- Admin app: offers screen + provider + API service + editor dialog + model + home tab
- Consumer app: OffersCarousel wired to real data, order page shows applied offer banner, Offer model extended

**Todo for next session:**
- Wait for frontend subagent to complete, review output
- Rewrite `backend/src-plattr/functions/test/e2e/suites/offers.js` and `offer-pricing.js` for V2 (they test the deleted apply/remove flow)
- Update Big Brewski mock offer data if it uses old field names (`buyQty`, `CART` scope, `minCartValue`)
- Manual E2E testing in emulator: admin create offer → consumer checkout → verify order.appliedOffer → mark COMPLETED → verify persistence
- Consider: server app manual discount override endpoint as graceful fallback (documented as future work)

---

10th Apr 26

**Restaurant Menu Onboarding Pipeline — Big Brewski**

- Created `restaurant-menu-setup-prod/` folder with reusable `ONBOARDING_PROMPT.md` for converting real restaurant menus (photos or JSON) into Firestore-ready DB documents
- First restaurant: Big Brewski — 49 items, 13 variants, 14 addons, 7 categories, 12 subcategories, 4 offers
- Created `firestore-big-brewski.json` — standalone import-ready file
- Added `--file=<path>` flag to `importMockData5.js` so each restaurant can be imported independently without touching MockData5

**Feature flag deep-dive findings:**
- `shouldUpdateFoodStatusAtItemLevelORAtOrderLevel` — flag defined but ZERO implementation exists. No code reads it. Dead flag.
- `isMultipleVariantOrAddonForMenuItemsSupported` and `fallbackToSameCustomConfigurationForAddItem` are effectively redundant — the multipleVariant flag guards a scenario the consumer frontend can't produce (no UI to add same item with different config). Consider consolidating.
- `fallbackToSameCustomConfigurationForAddItem=false` breaks consumer quick-add for customizable items — frontend has no fallback to show config dialog
- `sendServerNotifications` is fully wired (FCM) but needs real device with Play Services for actual push delivery; emulator flow works but notifications don't arrive
- Service charge backend checkout calculation is now implemented; no frontend/admin work required for current scope

todo: see `Plattr_Pro_Context/TODO_Feature_Flags_and_Schema.md` for detailed action items from this session

**Engineering Plans — Deep Codebase Research + Multi-Lens Planning (CEO, Eng, Office Hours)**

Created 3 dedicated plan files for the top-priority TODO items from the feature flag deep-dive. Each plan includes CEO/founder review (10-star product thinking, premise challenges), YC Office Hours forcing questions, and detailed engineering review (architecture, data flow, all frontend touchpoints, edge cases, test plans, implementation order).

- Service charge backend checkout/order calculation — Completed. No frontend/admin work required for current scope.
- `Plattr_Pro_Context/TODO_Variant_Addon_Flag_Cluster_Plan.md` — Unified variant/addon flag task: decision gate first (recommended Option A removes both flags), and only if flags stay togglable does it continue into quick-add recovery and different-config dialog work. Touches: addItemToCart.js, addItemToCartCustomisationHelper.js, addItemToCartBoilerplateHelper.js, Consumer menu_state.dart, optional new VariantConflictDialog. ~backend + consumer cluster across 6-8 files depending on chosen option.
- `Plattr_Pro_Context/TODO_Item_Level_Food_Status_Plan.md` — Implement item-level status tracking (70% infrastructure already exists: serverMarkItemServed.js, Server app API, contract tests). Decision: IMPLEMENT not REMOVE. Key missing piece: auto-promotion logic + Kitchen app API wiring. ~310 lines across 6-8 files.

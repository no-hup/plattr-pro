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

26th Jan 26

**Pending Commit - Verification Required Before Committing**

Changes include sensitive logic modifications (Pricing, Auth, API Contracts). Verification prompts below for coding agent review:

---

## 🔐 Verification Required: Pricing Logic Changes

### Requirement
Refactor pricing calculation to centralize offer discount logic and ensure consistent price computation across cart operations.

### Change Summary
- Modified `calculateCartValue.js` to handle offer discounts separately from item discounts and preserve offer fields in the result
- Refactored `applyOffer.js` to use centralized `PriceCalculator` instead of inline discount calculation
- Created new `PriceCalculator.js` as centralized service for price calculations with/without offers
- Updated `createOrUpdateOrder.js` to use the new pricing system

### Files Changed
- `backend/src-plattr/functions/cart/calculateCartValue.js` — Modified to separate item discounts from offer discounts, preserve offer fields
- `backend/src-plattr/functions/offers/applyOffer.js` — Refactored to use centralized PriceCalculator and offerEngine
- `backend/src-plattr/functions/cart/PriceCalculator.js` — New centralized price calculation service
- `backend/src-plattr/functions/orders/createOrUpdateOrder.js` — Updated to use new pricing system

### Verification Prompt for Agent
> **Objective**: Verify that the pricing logic refactoring correctly handles offer discounts, item discounts, and cart totals without introducing calculation errors.
>
> **Requirement**: Refactor pricing calculation to centralize offer discount logic and ensure consistent price computation across cart operations.
>
> **Files to Review**:
> - `backend/src-plattr/functions/cart/calculateCartValue.js`
> - `backend/src-plattr/functions/offers/applyOffer.js`
> - `backend/src-plattr/functions/cart/PriceCalculator.js`
> - `backend/src-plattr/functions/orders/createOrUpdateOrder.js`
>
> **Validation Steps**:
> 1. Verify that `calculateCartValue` correctly separates item discounts from offer discounts
> 2. Ensure `PriceCalculator.calculatePriceWithOffer` correctly applies offer discounts to the final price
> 3. Verify that `PriceCalculator.calculatePriceWithoutOffer` clears all offer-related fields
> 4. Check that offer discount is not double-counted with item discounts
> 5. Validate that `finalPrice = basePrice - itemDiscount - offerDiscount` (when applicable)
> 6. Test edge cases: zero prices, negative discounts, multiple offers
> 7. Verify that offer fields (`appliedOfferId`, `offerDiscount`, etc.) are preserved correctly

---

## 🔐 Verification Required: Auth Logic Changes

### Requirement
Clean up login screen code formatting and remove debug credentials display.

### Change Summary
- Reformatted `login_screen.dart` for code consistency
- Removed debug credential cards from production UI
- Minor updates to login flow formatting

### Files Changed
- `frontend/src-platter-apps/apps/platter_server/lib/pages/auth/login_screen.dart` — Code formatting and debug credential removal
- `frontend/src-platter-apps/apps/platter_server/lib/pages/auth/login_provider.dart` — Minor formatting updates
- `frontend/src-platter-apps/apps/platter_server/lib/pages/auth/repository/login_api_service.dart` — Minor updates

### Verification Prompt for Agent
> **Objective**: Verify that the login authentication flow still works correctly after formatting changes and debug credential removal.
>
> **Requirement**: Clean up login screen code formatting and remove debug credentials display.
>
> **Files to Review**:
> - `frontend/src-platter-apps/apps/platter_server/lib/pages/auth/login_screen.dart`
> - `frontend/src-platter-apps/apps/platter_server/lib/pages/auth/login_provider.dart`
> - `frontend/src-platter-apps/apps/platter_server/lib/pages/auth/repository/login_api_service.dart`
>
> **Validation Steps**:
> 1. Verify login form validation still works correctly
> 2. Ensure login API calls are made with correct parameters
> 3. Verify navigation after successful login still works
> 4. Check that error messages are displayed correctly
> 5. Confirm that session handling is unchanged
> 6. Test that login flow completes successfully end-to-end

---

## 📋 Contract Change Verification Required

### Change Type
MODIFIED_RESPONSE, REFACTORED_MODELS

### Requirement
Refactor shared status enums and improve code organization by moving common types to shared modules.

### Contract Change Summary
- Moved `OrderStatus` and `CartStatus` enums from `order_summary.dart` to shared `status_utils.dart`
- Updated all model files to use consistent formatting for `fromJson`/`toJson` methods
- Refactored multiple response models for better code organization
- Updated repository files to match new model structure

### Backend Changes
- `backend/src-plattr/functions/orders/createOrUpdateOrder.js` — Updated order creation logic
- `backend/src-plattr/functions/cart/validateCart.js` — Updated validation logic

### Frontend Changes
- `frontend/src-platter-apps/apps/platter_server/lib/pages/orders_home/models/order_summary.dart` — Moved enums to shared module
- `frontend/src-platter-apps/apps/platter_server/lib/shared/status_utils.dart` — New shared status utilities
- Multiple model files — Formatting updates to `fromJson`/`toJson`
- Repository files — Updated to match new model structure
- Contract test files — Updated to reflect changes

### Breaking Change Assessment
- [ ] Is this a breaking change for existing clients? (Likely NO - enums moved but values preserved)
- [ ] Are there dependent components that need updates? (YES - all files importing OrderStatus/CartStatus)
- [ ] Does this require data migration? (NO - only code refactoring)

### Verification Prompt for Contract Validation Agent
> **Objective**: Verify that the API contract changes are correctly implemented on both backend and frontend, and no components are broken.
>
> **Requirement**: Refactor shared status enums and improve code organization by moving common types to shared modules.
>
> **Files to Review**:
> - Backend: `backend/src-plattr/functions/orders/createOrUpdateOrder.js`, `backend/src-plattr/functions/cart/validateCart.js`
> - Frontend: `frontend/src-platter-apps/apps/platter_server/lib/pages/orders_home/models/order_summary.dart`, `frontend/src-platter-apps/apps/platter_server/lib/shared/status_utils.dart`, all repository files, all model files with `fromJson`/`toJson` changes
>
> **Validation Steps**:
> 1. Compare the backend API response schema with the frontend model/parser
> 2. Identify any field mismatches (name, type, nullability)
> 3. Check if all consumers of OrderStatus/CartStatus enums are updated to use shared module
> 4. Verify that enum values match between backend and frontend
> 5. Run test API calls against the emulator to validate response structure
> 6. Check that all model `fromJson`/`toJson` methods still work correctly
> 7. Verify contract tests pass with new structure
> 8. Report any discrepancies or potential runtime errors
>
> **Expected Test Commands**:
> ```bash
> # Start Firebase emulator
> firebase emulators:start --only functions,firestore
> 
> # Test order creation endpoint
> curl -X POST "http://localhost:5001/[project]/[region]/createOrUpdateOrder" \
>   -H "Content-Type: application/json" \
>   -d '{"restaurantId": "rest001", "tableId": "table001", "items": []}'
> ```
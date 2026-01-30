# Add-to-Cart Unit Testing Plan (Foundational Pilot)
> **Status**: Planning phase - awaiting user approval before implementation
---
## Executive Summary
This document proposes a comprehensive unit testing strategy for the **Add Item to Cart** Cloud Function. This is the **foundational pilot** for establishing testing patterns that will scale across all backend flows (orders, cancellations, offers, payments, etc.).
---
## User Review Required
> [!IMPORTANT]
> **Before proceeding, I need answers to clarifying questions in the sections below.** These are marked with ❓
---
## 1. Codebase Analysis Summary
### 1.1 Files Analyzed
| File | Lines | Purpose |
|------|-------|---------|
| [addItemToCart.js](file:///Users/shauryajaiswal/Desktop/dev/plattr-pro/backend/src-plattr/functions/cart/addItemToCart.js) | 367 | Main Cloud Function with Firestore transaction |
| [addItemToCartBoilerplateHelper.js](file:///Users/shauryajaiswal/Desktop/dev/plattr-pro/backend/src-plattr/functions/cart/addItemToCartBoilerplateHelper.js) | 596 | Helper functions (refs, validation, processing) |
| [cartInputValidation.js](file:///Users/shauryajaiswal/Desktop/dev/plattr-pro/backend/src-plattr/functions/cart/cartInputValidation.js) | 166 | Input validation + session validation |
| [calculateCartValue.js](file:///Users/shauryajaiswal/Desktop/dev/plattr-pro/backend/src-plattr/functions/cart/calculateCartValue.js) | 219 | Price calculation for items and cart totals |
| [priceinfo.js](file:///Users/shauryajaiswal/Desktop/dev/plattr-pro/backend/src-plattr/functions/genericModels/priceinfo.js) | 574 | Price models (BasicPriceInfo, CartItemPriceInfo, CartTotalPriceInfo, OrderPriceInfo) |
| [FeatureFlags.js](file:///Users/shauryajaiswal/Desktop/dev/plattr-pro/backend/src-plattr/functions/singleton/FeatureFlags.js) | 44 | Feature flag singleton |
| [sessionService.js](file:///Users/shauryajaiswal/Desktop/dev/plattr-pro/backend/src-plattr/functions/session/sessionService.js) | 359 | Session management (create, validate, expire) |
| [offerEngine.js](file:///Users/shauryajaiswal/Desktop/dev/plattr-pro/backend/src-plattr/functions/offers/offerEngine.js) | 143 | Offer validation + calculation (strategy pattern) |
### 1.2 Key Findings
**Data Collections (from code analysis):**
- `restaurants/{restaurantId}/carts/{tableId}` - Cart documents
- `restaurants/{restaurantId}/menuItems/{menuItemId}` - Menu items
- `restaurants/{restaurantId}/variants/{variantId}` - Variants with options
- `restaurants/{restaurantId}/addons/{addonId}` - Add-ons
- `restaurants/{restaurantId}/sessions/{sessionId}` - Table sessions
**Feature Flags Identified:**
| Flag | Current Value | Impact on Add-to-Cart |
|------|---------------|----------------------|
| `isMultipleVariantOrAddonForMenuItemsSupported` | `true` | Controls whether same item with different config can be added |
| `fallbackToSameCustomConfigurationForAddItem` | `true` | Auto-fills config from existing cart item ("Quick Add") |
| `isOtpManadatoryAtScan` | `true` | Session requirement enforcement |
| `isUsernameEnabled` | `true` | User identification |
| `isMultiUserSupportEnabled` | `false` | Multi-user cart sharing |
| `sendServerNotifications` | `false` | Post-action notifications |
**Price Calculation Flow:**
1. Menu item has `priceInfo` with `basePrice`, `discount`, `finalPrice`
2. Variants have `priceInfo` + `respectParentDiscount` flag
3. Add-ons have `priceInfo` + `respectParentDiscount` flag
4. [calculateItemPrice()](file:///Users/shauryajaiswal/Desktop/dev/plattr-pro/backend/src-plattr/functions/cart/calculateCartValue.js#4-119) aggregates all components
5. [calculateCartValue()](file:///Users/shauryajaiswal/Desktop/dev/plattr-pro/backend/src-plattr/functions/cart/calculateCartValue.js#120-209) sums all items in cart (skipping cancelled)
**Session Validation:**
- Session must exist in `restaurants/{restaurantId}/sessions/{sessionId}`
- Session must have `status === 'active'`
- Session has `expiresAt` timestamp (4-hour expiry)
---
## 2. Clarification Questions ❓
### 2.1 Cart + Session Model
1. **Guest sessions**: **Allowed**. `addItemToCart` works without a session. Session validation is enforced strictly at **checkout**.
2. **Cart ownership**: **Table-based**. The cart is keyed by `tableId`, making the table the owner.
3. **Multi-user cart**: Managed via table-based ownership. Concurrent edits handled via Firestore transactions (optimistic locking).
### 2.2 Restaurant-Level Feature Flags
4. **Are feature flags restaurant-specific?**: **Yes**. Tests must cover scenarios where a restaurant overrides global defaults (e.g., disabling variants for a specific restaurant).
5. **Additional flags**: No comprehensive list provided, so we will focus on the 6 identified + ensuring the mock architecture supports arbitrary overrides.
### 2.3 Pricing & Offers
6. **Offer application**: Offers are **not** auto-calculated in `addItemToCart`. They are applied via a separate `applyOffer` API. `addItemToCart` should simply preserve any existing valid applied offers (re-verifying validity is a nice-to-have, but primary calculation happens elsewhere).
7. **Tax handling**: **Out of scope** for this unit test suite. Focus purely on Item + Variant + Addon pricing.
### 2.4 Edge Cases & Constraints
8. **Quantity limits**: There is a **Cart-Level Constant** for maximum quantity (to be defined in fixtures, e.g., 99 or 999). Item-level limits are not enforcing.
9. **Mandatory variants**: If missing, this is an **Error Case** (Bad Request).
10. **Integration Tests**: **Out of Scope**. We will focus 100% on high-speed, reliable **Unit Tests** with Firestore mocking.
---
## 3. Testing Strategy Recommendation
### 3.1 Approach: Pure Unit Tests (Mocked Firestore)
**Strategy**: **Pure Unit Tests**.
**Why:**
- **Speed**: Tests run in milliseconds.
- **Reliability**: No emulator flakiness.
- **Focus**: We are testing the *logic* of `addItemToCart` (pricing, validation, state updates), not the Firestore database itself.
**Hybrid Approach Removed**: As per user instruction, we are ignoring integration tests/shell scripts for this task and focusing on building a robust unit test suite.
### 3.2 Proposed Test Structure
functions/ ├── test/ │ ├── unit/ │ │ ├── cart/ │ │ │ ├── addItemToCart.test.js # Main function tests │ │ │ ├── calculateCartValue.test.js # Pricing logic │ │ │ └── cartInputValidation.test.js # Input validation │ │ ├── models/ │ │ │ └── priceinfo.test.js # Price model tests │ │ └── helpers/ │ │ └── addItemToCartHelper.test.js # Helper function tests │ ├── fixtures/ │ │ ├── cart.fixtures.js # Cart test data │ │ ├── menuItem.fixtures.js # Menu item test data │ │ ├── variant.fixtures.js # Variant test data │ │ ├── addon.fixtures.js # Add-on test data │ │ └── session.fixtures.js # Session test data │ ├── mocks/ │ │ ├── firestore.mock.js # Firestore mock utilities │ │ ├── featureFlags.mock.js # Feature flag mock │ │ └── transactionBuilder.js # Transaction mock helper │ └── helpers/ │ ├── cartAssertions.js # Custom cart assertions │ └── priceAssertions.js # Price validation helpers ├── jest.config.js # Jest configuration └── jest.setup.js # Global test setup

---
## 4. Expanded Test Scenario Matrix
### 4.1 Core Happy Path (8 tests)
| # | Test Name | Description |
|---|-----------|-------------|
| 1 | `addItemToCart - empty cart - should create new cart with item` | First item, cart doesn't exist |
| 2 | `addItemToCart - existing cart - should add new item` | Cart exists, different item |
| 3 | `addItemToCart - identical item exists - should increase quantity` | Same item+variant+addons |
| 4 | `addItemToCart - with variants - should apply variant pricing` | Single variant selection |
| 5 | `addItemToCart - with multiple variants - should sum variant prices` | Multiple variant categories |
| 6 | `addItemToCart - with addons - should include addon pricing` | Add-ons selected |
| 7 | `addItemToCart - with variants and addons - should calculate total correctly` | Full combination |
| 8 | `addItemToCart - quantity > 1 - should multiply final price correctly` | Quantity handling |
### 4.2 Input Validation (12 tests)
| # | Test Name | Description |
|---|-----------|-------------|
| 9 | `addItemToCart - missing tableId - should throw invalid-argument` | Required field |
| 10 | `addItemToCart - missing restaurantId - should throw invalid-argument` | Required field |
| 11 | `addItemToCart - missing menuItemId - should throw invalid-argument` | Required field |
| 12 | `addItemToCart - missing quantity - should throw invalid-argument` | Required field |
| 13 | `addItemToCart - quantity = 0 - should throw invalid-argument` | Boundary |
| 14 | `addItemToCart - quantity = -1 - should throw invalid-argument` | Invalid |
| 15 | `addItemToCart - quantity = NaN - should throw invalid-argument` | Type safety |
| 16 | `addItemToCart - quantity = 1.5 - should throw or floor` | ❓ Confirm behavior |
| 17 | `addItemToCart - null data - should throw invalid-argument` | Edge case |
| 18 | `addItemToCart - empty string tableId - should throw` | Edge case |
| 19 | `addItemToCart - selectedVariants not object - should handle gracefully` | Type safety |
| 20 | `addItemToCart - selectedAddons not array - should handle gracefully` | Type safety |
### 4.3 Session Validation (8 tests)
| # | Test Name | Description |
|---|-----------|-------------|
| 21 | `addItemToCart - valid sessionId - should proceed successfully` | Happy path |
| 22 | `addItemToCart - invalid sessionId - should throw failed-precondition` | Non-existent session |
| 23 | `addItemToCart - expired sessionId - should throw failed-precondition` | Past `expiresAt` |
| 24 | `addItemToCart - inactive sessionId - should throw failed-precondition` | Status != active |
| 25 | `addItemToCart - no sessionId provided - should skip validation` | ❓ Is this correct? |
| 26 | `addItemToCart - session belongs to different restaurant - should throw` | Cross-restaurant |
| 27 | `addItemToCart - session expiry during transaction - should handle` | Edge case |
| 28 | `addItemToCart - multi-user session - should allow secondary user` | ❓ When flag enabled |
### 4.4 Menu Item Validation (8 tests)
| # | Test Name | Description |
|---|-----------|-------------|
| 29 | `addItemToCart - menuItem not found - should throw not-found` | Non-existent item |
| 30 | `addItemToCart - menuItem out of stock - should throw precondition-failed` | `isInStock=false` |
| 31 | `addItemToCart - menuItem missing priceInfo - should throw internal` | Data corruption |
| 32 | `addItemToCart - menuItem belongs to different restaurant - should throw` | ❓ Confirm behavior |
| 33 | `addItemToCart - variant not found - should throw bad-request` | Invalid variant ID |
| 34 | `addItemToCart - variant option not found - should throw bad-request` | Invalid option ID |
| 35 | `addItemToCart - addon not found - should throw not-found` | Invalid addon ID |
| 36 | `addItemToCart - mandatory variant not selected - should throw bad-request` | Required variant |
### 4.5 Feature Flag Variations (10 tests)
| # | Test Name | Description |
|---|-----------|-------------|
| 37 | `addItemToCart - multipleConfigs=true - should allow different variant configs` | Flag enabled |
| 38 | `addItemToCart - multipleConfigs=false + same config - should merge quantities` | Flag disabled |
| 39 | `addItemToCart - multipleConfigs=false + different config - should return error` | Flag disabled |
| 40 | `addItemToCart - fallbackConfig=true + no selection - should use existing config` | Quick Add |
| 41 | `addItemToCart - fallbackConfig=true + partial selection - should merge configs` | Quick Add partial |
| 42 | `addItemToCart - fallbackConfig=false + no selection - should allow empty variants` | No Quick Add |
| 43 | `addItemToCart - variant disabled at restaurant - should ignore variant input` | ❓ Restaurant-level flag? |
| 44 | `addItemToCart - addon disabled at restaurant - should reject addon input` | ❓ Restaurant-level flag? |
| 45 | `addItemToCart - multiUser=true - should track userId in cart` | Multi-user cart |
| 46 | `addItemToCart - multiUser=false - should not require userId` | Single user |
### 4.6 Price Calculation Correctness (16 tests)
| # | Test Name | Description |
|---|-----------|-------------|
| 47 | `calculateItemPrice - base item only - should return correct finalPrice` | No variants/addons |
| 48 | `calculateItemPrice - with 15% discount - should apply correctly` | Discount math |
| 49 | `calculateItemPrice - with 100% discount - should return 0 finalPrice` | Edge case |
| 50 | `calculateItemPrice - with 0% discount - should equal basePrice` | No discount |
| 51 | `calculateItemPrice - variant respectParentDiscount=true - should apply item discount` | Parent discount |
| 52 | `calculateItemPrice - variant respectParentDiscount=false - should use own price` | Own discount |
| 53 | `calculateItemPrice - addon respectParentDiscount=true - should apply item discount` | Parent discount |
| 54 | `calculateItemPrice - addon respectParentDiscount=false - should use own price` | Own discount |
| 55 | `calculateItemPrice - multiple addons - should sum all addon prices` | Accumulation |
| 56 | `calculateItemPrice - NaN in variant price - should sanitize to 0` | Data corruption |
| 57 | `calculateItemPrice - negative discount - should clamp to 0` | Invalid data |
| 58 | `calculateItemPrice - discount > 100 - should clamp to 100` | Invalid data |
| 59 | `calculateCartValue - single item qty=2 - should double finalPrice` | Quantity multiplier |
| 60 | `calculateCartValue - multiple items - should sum all finalPrices` | Cart total |
| 61 | `calculateCartValue - contains cancelled item - should skip in total` | Cancelled items |
| 62 | `calculateCartValue - empty cart - should return zero prices` | Empty cart |
### 4.7 Transaction Integrity (6 tests)
| # | Test Name | Description |
|---|-----------|-------------|
| 63 | `addItemToCart - concurrent add same item - should not lose quantity` | Race condition |
| 64 | `addItemToCart - concurrent add different items - should contain both` | Race condition |
| 65 | `addItemToCart - transaction retry on conflict - should succeed eventually` | Firestore retry |
| 66 | `addItemToCart - cart totalPrice consistency after update - should match items sum` | Invariant |
| 67 | `addItemToCart - lastUpdated timestamp - should reflect latest update` | Timestamp |
| 68 | `addItemToCart - cartItemId increments - should assign unique IDs` | ID generation |
### 4.8 Real Production Dining Flows (8 tests)
| # | Test Name | Description |
|---|-----------|-------------|
| 69 | `addItemToCart - after kitchen cancel - should maintain correct total` | Cancel + add |
| 70 | `addItemToCart - after waiter cancel - should maintain correct total` | Cancel + add |
| 71 | `addItemToCart - after user cancel - should maintain correct total` | Cancel + add |
| 72 | `addItemToCart - partial cancellation then add - should calculate correctly` | Mixed status |
| 73 | `addItemToCart - table session expired mid-order - should handle gracefully` | Session edge |
| 74 | `addItemToCart - re-adding cancelled item - should create new entry` | Re-add flow |
| 75 | `addItemToCart - same table different session - should create new cart` | Session boundary |
| 76 | `addItemToCart - price change after first add - should use new price for second` | Dynamic pricing |
---
## 5. Fixture + Mock Strategy
### 5.1 Fixture Design (Reusable for All Flows)
**Base fixtures** that can be composed for any test:
```javascript
// fixtures/restaurant.fixtures.js
const restaurantFixtures = {
  standard: { id: 'rest001', name: 'Test Restaurant', ... },
  withOffers: { ...standard, activeOffers: [...] },
  withoutVariants: { ...standard, variantsEnabled: false }
};
// fixtures/menuItem.fixtures.js
const menuItemFixtures = {
  simple: { id: 'item001', priceInfo: { basePrice: 100, discount: 0, finalPrice: 100 } },
  discounted: { id: 'item002', priceInfo: { basePrice: 100, discount: 20, finalPrice: 80 } },
  withVariants: { id: 'item003', variants: [{ id: 'v1' }] },
  outOfStock: { id: 'item004', isInStock: false },
  invalidPrice: { id: 'item005', priceInfo: { basePrice: NaN } }
};
// fixtures/cart.fixtures.js  
const cartFixtures = {
  empty: { restaurantId: 'rest001', tableId: 'table001', items: [], priceInfo: {...} },
  withOneItem: { ...empty, items: [itemFixtures.simple] },
  withCancelledItem: { ...empty, items: [{ ...item, status: 'cancelled' }] }
};
5.2 Mock Strategy
Firestore Transaction Mock:

// mocks/firestore.mock.js
function createMockTransaction(mockData) {
  return {
    get: jest.fn(ref => Promise.resolve(mockDocSnapshot(mockData[ref.path]))),
    set: jest.fn(),
    update: jest.fn()
  };
}
function mockFirestoreDb(initialData) {
  return {
    collection: jest.fn(name => ({
      doc: jest.fn(id => ({
        get: jest.fn(() => Promise.resolve(mockDocSnapshot(initialData[`${name}/${id}`]))),
        collection: jest.fn(...)
      }))
    })),
    runTransaction: jest.fn(updateFn => updateFn(createMockTransaction(initialData)))
  };
}
Feature Flag Mock:

// mocks/featureFlags.mock.js
function createFeatureFlagsMock(overrides = {}) {
  const defaults = {
    isMultipleVariantOrAddonForMenuItemsSupported: true,
    fallbackToSameCustomConfigurationForAddItem: true,
    // ... other flags
  };
  return {
    isEnabled: jest.fn(flag => overrides[flag] ?? defaults[flag])
  };
}
6. Multi-Agent Execution Breakdown
Phase 1: Foundation (Agent 1)
Deliverablez
jest.config.js + jest.setup.js
/test/mocks/firestore.mock.js
/test/mocks/featureFlags.mock.js
/test/mocks/transactionBuilder.js
Phase 2: Fixtures (Agent 2)
Deliverable
/test/fixtures/menuItem.fixtures.js
/test/fixtures/variant.fixtures.js
/test/fixtures/addon.fixtures.js
/test/fixtures/cart.fixtures.js
/test/fixtures/session.fixtures.js
Phase 3: Validation Tests (Agent 3)
Deliverable
Input validation tests (#9-20)
Session validation tests (#21-28)
Menu item validation tests (#29-36)
Phase 4: Pricing Tests (Agent 4)
Deliverable
calculateItemPrice
 tests (#47-58)
calculateCartValue
 tests (#59-62)
priceinfo.js
 model tests
Phase 5: Feature Flag + Flow Tests (Agent 5)
Deliverable
Core happy path tests (#1-8)
Feature flag variation tests (#37-46)
Transaction integrity tests (#63-68)
Phase 6: Dining Flow + Documentation (Agent 6)
Deliverable 
Production dining flow tests (#69-76)
Custom assertion helpers
Test documentation + playbook
Grand Total: ~35 hours across 6 parallel agents

7. Risks + Missing Unknowns
Risk	Mitigation
Firestore transaction mocking complexity	Start with simple mocks, refine as needed. May need firebase-functions-test wrapped mode for complex cases.
Feature flag coupling	Extract flag checks to testable pure functions where possible
Price calculation edge cases	Comprehensive fixture coverage for NaN, Infinity, negative values
Session expiry timing	Mock Date.now() for consistent time-based tests
Restaurant-level flag overrides	❓ Waiting for confirmation if this exists
8. Reusable Learnings for Future Flows
8.1 Testing Patterns to Document
Pattern	Description	Reuse In
Fixture composition	Build complex state from simple base fixtures	All flows
Transaction mock	Firestore transaction mock utilities	Order, Payment, Kitchen
Feature flag isolation	Mock feature flags per test	All flows
Price invariant assertions	Verify totalBase = sum of components	Cart, Order, Payment
Cancelled item filtering	Skip cancelled items in calculations	Kitchen, Order history
8.2 Documentation Artifacts
After implementation, create:

TESTING_PLAYBOOK.md - How to write tests for new Cloud Functions
FIXTURES_GUIDE.md - How to extend fixtures for new entities
MOCK_PATTERNS.md - Standard mocking patterns for Firebase services
9. Verification Plan
9.1 Automated Testing
Command to run all tests:

cd backend/src-plattr/functions
npm test
Command to run with coverage:

npm test -- --coverage
Expected coverage targets:

addItemToCart.js
: >90%
calculateCartValue.js
: >95%
priceinfo.js
: >95%
cartInputValidation.js
: >90%
9.2 CI Integration out of scope
Tests should:

Run on every PR - out of scope
Block merge if any test fails- out of scope
Report coverage delta - out of scope
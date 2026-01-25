# Flexible Restaurant Offers System

## Feature Requirements

### Goal
Provide a unified offers system that supports cart-level, category-level, and item-level offers with a single schema and consistent pricing behavior.

### Supported Offer Examples
- Flat 50% off desserts (category percentage)
- Buy 1 Get 1 Cappuccino (BOGO item)
- Flat INR 100 off cart above INR 500 (cart flat)

### Business Rules and Decisions
- Single offer only: one active offer per cart and per table session.
- New offer application is rejected if an offer is already applied (user must remove first).
- Min cart value is evaluated on pre-discount base price.
- BOGO applies once per cart (no multiples for higher quantities).
- Cheapest eligible units are free for BOGO.
- Unit price for BOGO is item final price including variants and addons.
- Category IDs are stable; no snapshotting required.
- No auto-add of free items; items must be in cart to receive discount.
- Rounding to 2 decimals in pricing outputs.
- Max discount cap applies to all offer types.
- Taxes are not calculated as part of this feature (out of scope).

### Non-goals (Tech Debt)
- Offer stacking or applying multiple offers per cart.
- Post-discount eligibility rules (e.g., stacking with minCartValue re-evaluation).

## Data Model

### Universal Offer Schema (Firestore offers subcollection)
Fields used by backend:
- id (string)
- title (string)
- description (string)
- type (enum): PERCENTAGE, FLAT, BOGO, FREE_ITEM
- scope (enum): CART, CATEGORY, ITEM
- targetIds (array of IDs for categories/subcategories or items)
- isActive (boolean)
- validity (object): startDate, endDate
- conditions (object):
  - minCartValue (number)
  - requiredItems (array of { menuItemId, quantity })
  - userHistory (optional): minOrderCount, activeSessionOrderCount
- benefit (object):
  - value (number; used for PERCENTAGE/FLAT)
  - buyQty, getQty (for BOGO)
  - maxDiscount (number)

## Implementation Plan (As Implemented)

### Backend
1. Offer import and mock data
   - Added offers subcollection to mock data.
   - Updated mock data import to include offers.

2. Core offer engine
   - New shared module for validation and discount calculation:
     - validateOfferApplication(offer, cart, sessionData)
     - calculateOfferBenefit(offer, cart)
   - Validation includes: isActive, validity dates, minCartValue, requiredItems, user history, and scope-level eligibility.
   - BOGO calculation uses cheapest eligible units, applies once per cart, and supports maxDiscount cap.
   - PERCENTAGE for category/item and FLAT for cart are implemented; flat category/item behavior remains limited.

3. Apply offer
   - Reject if a different offer is already applied.
   - Validate eligibility, calculate benefit, and update cart priceInfo:
     - appliedOfferId, appliedOfferTitle, offerDiscount, appliedOfferItems
     - totalDiscountAmount and finalPrice updated based on offer discount

4. Get applicable offers
   - Uses offer engine for eligibility and potential saving.
   - Returns isApplicable, reason, and potentialSaving per offer.

5. Remove offer
   - Clears offer fields from cart priceInfo and recalculates pricing.

6. Cart pricing integration
   - validateCart expects finalPrice = sum(item finalPrice) - offerDiscount.
   - calculateCartValue preserves offer fields and includes offerDiscount in totalDiscountAmount.

7. Order persistence
   - appliedOffer details are included in order creation/update.
   - cartSnapshot retains offer data when added to orders.

### Frontend (Server App)
- Orders list and detail screens were refactored to use shared widgets and improved UI density.
- New OrderCard widget introduced for order/cart summary display.
- No direct consumer offer UI implemented in these changes.

## Verification Summary
- Contract test config updated to point to mock import script.
- Manual or curl tests for offers are expected but not included in code changes here.

## File Change Inventory

### Code Files Changed by Developer (Current Working Tree)
Backend:
- backend/src-plattr/functions/cart/calculateCartValue.js
- backend/src-plattr/functions/cart/validateCart.js
- backend/src-plattr/functions/mock/importMockDataV2.js
- backend/src-plattr/functions/mock/mockDataV2.json
- backend/src-plattr/functions/offers/applyOffer.js
- backend/src-plattr/functions/offers/getApplicableOffers.js
- backend/src-plattr/functions/offers/indexOffers.js
- backend/src-plattr/functions/offers/offerEngine.js (new)
- backend/src-plattr/functions/offers/removeOffer.js (new)
- backend/src-plattr/functions/orders/createOrUpdateOrder.js
- backend/src-plattr/functions/singleton/ErrorHandler.js
- backend/src-plattr/contract-tests/contract_test_config.sh

Frontend (server app):
- frontend/src-platter-apps/apps/platter_server/lib/pages/orders_home/order_detail_screen.dart
- frontend/src-platter-apps/apps/platter_server/lib/pages/orders_home/orders_home_screen.dart
- frontend/src-platter-apps/apps/platter_server/lib/widgets/order_card.dart (new)

### Non-code Docs and Misc
- backend/src-plattr/functions/auxilary/docs/TECH_DEBT.md (tech debt notes)


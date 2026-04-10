# Offers V2 — Order-Level Auto-Apply System

> **V2 replaces V1.** Cart-level manual application has been removed. This document supersedes the older cart-level spec.

## Goal

Provide a simple, admin-managed offers system where:
- The restaurant creates/edits offers from the Admin app
- The consumer sees offers as informational hints on the menu page
- The system automatically picks and applies the BEST eligible offer at checkout, across the entire order (all carts combined)
- No manual apply/remove flow for consumers — zero cognitive burden

## Supported Offer Examples

- **20% off Starters** (PERCENTAGE, CATEGORY scope, targetIds=[cat_starters], maxDiscount=₹200)
- **₹50 off on orders above ₹500** (FLAT, ORDER scope, conditions.minOrderValue=500)
- **Buy 1 Get 1 on Blaze Bean Burger** (BOGO, ITEM scope, targetIds=[item_blaze_bean_burger])
- **30% off everything except desserts** (PERCENTAGE, ORDER scope, exclusionIds=[cat_desserts])

## Business Rules

- **Single offer per order.** No stacking.
- **Auto-selection:** Pick the offer with the highest `discountAmount`. Tiebreaker: lower `priority` wins.
- **Evaluation timing:**
  - At each cart checkout (in `createOrUpdateOrder`) — reevaluate against all items across all carts in the order.
  - At order COMPLETED (in `updateOrderStatus`) — safety net reevaluation after any cancellations.
- **Eligibility is computed on raw cart items**, never on normalized order items — `normalizeCartItemsForOrder` strips `categoryId`/`subcategoryIds`, which would break CATEGORY/ITEM scope matching.
- **Cancelled items are excluded** from eligibility. Status is compared against `FULFILLMENT_STATUS.CANCELLED` (uppercase) via the shared constant — never hardcoded strings.
- **Graceful fallback:** If offer evaluation throws, the order proceeds with `appliedOffer = null`. The failure is logged but never blocks checkout.
- **Killswitch:** `restaurant.featureFlags.isOffersEnabled` (default true). When false, `evaluateAndPickBestOffer` short-circuits to null.

## Data Model

### Firestore offers subcollection — `restaurants/{restaurantId}/offers/{offerId}`

```
{
  id: string                    // same as document ID
  title: string                 // required, shown on consumer carousel
  description: string           // required, shown in offer details sheet
  type: 'PERCENTAGE' | 'FLAT' | 'BOGO'
  scope: 'ORDER' | 'CATEGORY' | 'ITEM'
  targetIds: string[]           // required non-empty for CATEGORY/ITEM
  exclusionIds: string[]        // optional — items/categories to exclude
  isActive: boolean
  validity: {
    startDate: ISO string
    endDate: ISO string
  }
  conditions: {                 // all optional
    minOrderValue: number
    requiredItems: [{ menuItemId, quantity }]
    userHistory: {              // optional, session-based offers
      minOrderCount: number
      activeSessionOrderCount: number
    }
  }
  benefit: {
    // PERCENTAGE/FLAT:
    value: number               // percentage (0-100) or rupee amount
    maxDiscount: number         // optional cap
    // BOGO:
    buyQuantity: number         // default 1
    getQuantity: number         // default 1
  }
  termsAndConditions: string    // optional display text
  imageUrl: string              // optional
  code: string                  // optional promo code (future use)
  priority: number              // optional tiebreaker — lower wins
  createdAt, updatedAt, deletedAt (soft delete)
}
```

### Order document — fields populated by Offers V2

```
order.appliedOffer = {
  id, title, type, scope,
  discountAmount: number,
  appliedItems: [{ menuItemId, cartItemId, originalPrice, discountAmount, discountedPrice }]
} | null

order.priceInfo = {
  basePrice,
  finalPrice,           // already reflects offerDiscount subtraction
  totalDiscount,
  totalDiscountAmount,  // includes offerDiscount
  offerDiscount         // NEW in V2 — the order-level offer portion only
}
```

## Architecture

```
Consumer: browse menu → (sees offers, read-only) → add to cart → checkout
                                                                      ↓
checkoutCart.js → createOrUpdateOrder.js
    1. Append cartSnapshot to order.carts[]
    2. calculateTotalPriceInfo(updatedCarts)  — item-level totals
    3. Collect raw items: updatedCarts.flatMap(c => c.items)
    4. evaluateAndPickBestOffer(restaurantId, allItems, basePrice, sessionId)
         - Killswitch check
         - Fetch active offers
         - For each: validateOfferApplication → calculateOfferBenefit
         - Sort by discountAmount DESC, priority ASC
         - Return top candidate or null
    5. Store order.appliedOffer + adjust order.priceInfo

Consumer: order listing page reads order.appliedOffer → "Saved ₹X with [title]!"

Server marks order COMPLETED → updateOrderStatus.js
    - Recompute base totals from all cart snapshots
    - Re-run evaluateAndPickBestOffer (catches cancellation impact)
    - Compare recomputed base against stored base (offer portion is allowed to differ)
    - Update appliedOffer + priceInfo, set paymentStatus=PAID
```

## Offer Engine

**File:** `backend/src-plattr/functions/offers/offerEngine.js`

- `validateOfferApplication(offer, cart, sessionData)` — Returns `{ isValid, reason, potentialSaving }`
- `calculateOfferBenefit(offer, cart)` — Delegates to the right strategy, returns `{ discountAmount, appliedItems }`

The engine is cart-shape agnostic — it takes any `{ items, priceInfo: { basePrice } }` object. V2 passes a "virtual order cart" built from all items across all cart snapshots.

**Strategies** (`backend/src-plattr/functions/offers/strategies/`):
- `PercentageStrategy.js` — percentage discount with maxDiscount cap
- `FlatStrategy.js` — flat rupee discount
- `BogoStrategy.js` — cheapest eligible units are free (applies ONCE per order)
- `BaseOfferStrategy.getEligibleItems()` handles scope filtering + exclusions

## Admin CRUD Endpoints

All admin endpoints live in `backend/src-plattr/functions/adminApp/offers_admin.js` and are exported via `index.js` with the `admin-` prefix.

- `admin-getOffers` — list all offers for a restaurant (active + inactive, minus soft-deleted)
- `admin-createOffer` — validate + write a new offer doc
- `admin-updateOffer` — merge + validate + update
- `admin-deleteOffer` — soft delete (sets `isActive=false`, `deletedAt=now()`)

Each endpoint requires admin session validation via `validateAdminSession`.

### Input validation rules

- **Required on create:** title, description, type, scope, benefit, validity.startDate, validity.endDate
- **Type-specific:**
  - PERCENTAGE/FLAT: `benefit.value` must be a positive number
  - BOGO: `benefit.buyQuantity` and `benefit.getQuantity` must be numbers ≥ 1
- **Scope-specific:** CATEGORY/ITEM require non-empty `targetIds`
- **Date ordering:** `endDate > startDate`
- Optional fields stored as-is after type-checking

## Deprecated / Removed

- `offers/applyOffer.js` — DELETED
- `offers/removeOffer.js` — DELETED
- `cart/PriceCalculator.js` — DELETED (only used by the deleted files + the lazy revalidation block in createOrUpdateOrder that is no longer needed)
- Cart-level offer fields (`cart.priceInfo.appliedOfferId` etc.) — no longer preserved by `calculateCartValue.js`
- `validateCart.js` no longer subtracts `offerDiscount` — carts carry item-level prices only
- `conditions.minCartValue` — renamed to `minOrderValue`

## Migration Notes

The system is not live yet, so there is NO backward compatibility layer. Any existing offer documents in Firestore must match the V2 schema or be recreated.

**Breaking changes from the pre-V2 engine:**
1. `scope: 'CART'` → use `scope: 'ORDER'`
2. `benefit.buyQty` / `benefit.getQty` → `buyQuantity` / `getQuantity`
3. `conditions.minCartValue` → `conditions.minOrderValue`
4. Cart documents no longer carry offer fields

## Frontend Integration Points

### Consumer app (`frontend/flutter_boilerplate/`)
- `lib/widgets/offers_carousel.dart` — displays real offers from `MenuState.offers` (no apply button)
- `lib/pages/menuListing/MenuPage.dart` — passes `menuState.offers` to the carousel
- `lib/pages/checkout_order_flow/order_listing_page.dart` — shows the "Saved ₹X with [title]!" banner from `order.appliedOffer`
- `lib/pages/menuListing/models/offer.dart` — Freezed model with fields: scope, exclusionIds, termsAndConditions, priority

### Admin app (`frontend/src-platter-apps/apps/platter_admin/`)
- `lib/pages/offers/offers_screen.dart` — list + create button
- `lib/pages/offers/offers_provider.dart` — ChangeNotifier state
- `lib/pages/offers/offers_api_service.dart` — Dio calls to `admin-*` endpoints
- `lib/pages/offers/editors/offer_editor_dialog.dart` — AlertDialog form
- `lib/pages/offers/models/offer_model.dart` — plain Dart model

## Verification Checklist

- [ ] Create an offer via admin → appears in `admin-getOffers` response
- [ ] Single cart checkout → `order.appliedOffer` populated with correct discount
- [ ] Multi-cart checkout → offer re-evaluated with all items, possibly replaced with a better one
- [ ] Killswitch off → `order.appliedOffer = null` and `order.priceInfo.offerDiscount = 0`
- [ ] Cancel items post-checkout → mark order COMPLETED → offer re-evaluated, dropped if no longer valid
- [ ] No applicable offers → order still succeeds with no offer (graceful fallback)
- [ ] Exclusion offer: "20% off everything except desserts" — desserts not discounted
- [ ] BOGO offer with `buyQuantity=1, getQuantity=1` — cheapest eligible unit is free

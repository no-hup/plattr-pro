# Offers V2 — Architecture & Decision Log

> Reference doc for agents working on anything offer-related. Read before touching `functions/offers/`, `functions/orders/createOrUpdateOrder.js`, `functions/orders/updateOrderStatus.js`, or any consumer/admin offer UI.

## TL;DR

Offers in Plattr Pro are **order-level** and **auto-applied**. Consumers never manually apply an offer. The system evaluates all active offers against the entire order (across all carts) at each checkout and picks the best one. At COMPLETED the offer is re-evaluated as a safety net for cancellations.

## Why this shape?

### Why not cart-level?
The V1 design applied offers at the cart level before checkout. This created several pathological cases:
1. **Multi-cart orders**: offer applied to cart 1, cart 2 added with ineligible items — does offer still apply?
2. **Item cancellations**: offer applied to a cart, then kitchen cancels an item — cart's `offerDiscount` is now stale
3. **Out-of-stock**: BOGO applied to "Buy 1 Get 1 Burger" — only one burger in stock — bill now shows free item that was never served
4. **Consumer cognitive load**: forcing users to manually apply offers is friction for a tablet-ordering experience

V2 eliminates all of these by evaluating the whole order against all active offers at each transition and always picking the best currently-valid one.

### Why not finalize-only (at COMPLETED)?
If we only applied offers at COMPLETED, the customer wouldn't see their discount until payment time. That's bad UX — customers want to see the total they'll pay. So we evaluate at **each cart checkout** (so the running order total reflects the current best offer) AND at **COMPLETED** (safety net).

### Why "best offer" = highest discountAmount?
Simplest customer-friendly heuristic. Tiebreaker is a manual `priority` field (lower wins) so admins can force specific offers.

## Key Files

### Backend
- `functions/offers/evaluateOrderOffers.js` — **THE** entry point. `evaluateAndPickBestOffer(restaurantId, allItems, basePrice, sessionId)` + `buildAppliedOfferObject(pickResult)`. Always pass **raw cart items**, never normalized order items.
- `functions/offers/offerEngine.js` — `validateOfferApplication` + `calculateOfferBenefit`. Cart-shape-agnostic: accepts any `{ items, priceInfo: { basePrice } }`.
- `functions/offers/strategies/BaseOfferStrategy.js` — `getEligibleItems()` handles scope filtering + exclusions + cancelled items.
- `functions/offers/strategies/{Percentage,Flat,Bogo}Strategy.js` — type-specific calculations.
- `functions/offers/getApplicableOffers.js` — consumer-facing read endpoint for menu page hints (display-only, no apply).
- `functions/offers/offerFeatureGuard.js` — restaurant-level killswitch via `featureFlags.isOffersEnabled`.
- `functions/orders/createOrUpdateOrder.js` — calls `evaluateAndPickBestOffer` after each cart append.
- `functions/orders/updateOrderStatus.js` — calls `evaluateAndPickBestOffer` on COMPLETED.
- `functions/adminApp/offers_admin.js` — admin CRUD endpoints.

### Frontend
- Consumer: `frontend/flutter_boilerplate/lib/widgets/offers_carousel.dart`, `pages/menuListing/MenuPage.dart`, `pages/checkout_order_flow/order_listing_page.dart`, `pages/menuListing/models/offer.dart`
- Admin: `frontend/src-platter-apps/apps/platter_admin/lib/pages/offers/`

## Critical Gotchas (for future agents)

### 1. Use raw cart items, never normalized order items
`normalizeCartItemsForOrder()` in `createOrUpdateOrder.js` strips `categoryId` and `subcategoryIds`. If you pass the normalized array to `evaluateAndPickBestOffer`, CATEGORY and ITEM scope offers will silently never match. **Always** collect items via `order.carts.flatMap(c => c.items)`.

### 2. Cancelled item status is UPPERCASE
`FULFILLMENT_STATUS.CANCELLED === 'CANCELLED'`. Never hardcode `'cancelled'` (lowercase). This was a pre-V2 bug that blocked correct item filtering across multiple files. The fix is to always import and use the constant.

### 3. BOGO benefit field names
`benefit.buyQuantity` and `benefit.getQuantity` (long form, matches mock data and admin form). The old short form `buyQty`/`getQty` was renamed during the V2 migration.

### 4. Offers are order-level, carts carry no offer fields
Do NOT reintroduce `appliedOfferId` / `offerDiscount` onto cart documents. `calculateCartValue.js` explicitly does NOT preserve these fields. The order document is the single source of truth for applied offers.

### 5. Graceful fallback is intentional
`evaluateAndPickBestOffer` wraps everything in try/catch and returns null on ANY error. This is by design — we never want offer evaluation to block a checkout. A dropped offer is a minor revenue loss; a blocked checkout is a lost sale.

### 6. Bill revalidation at COMPLETED compares base (not final)
`updateOrderStatus.js` COMPLETED handler compares the recomputed `basePrice` against the stored `basePrice`. The `finalPrice` can legitimately differ from what was stored because the offer may have been dropped/changed during revalidation. This is intentional — cancellations change eligibility.

## Schema Reference

See `backend/src-plattr/functions/auxilary/docs/OFFERS_SYSTEM.md` for the full Firestore schema with all fields and the admin create form.

## Testing

- E2E: `backend/src-plattr/functions/test/e2e/suites/offer-pricing.js` — needs updates for V2 (old suite assumed cart-level apply/remove)
- Manual: seed an offer via admin app → checkout in consumer app → verify `order.appliedOffer` is populated → mark COMPLETED → verify `priceInfo.offerDiscount` persists

## Open Items / Future Work

- [ ] Server app: manual discount override endpoint for server staff when auto-apply fails or a customer disputes a bill (not in V2 scope)
- [ ] Offer usage tracking: count how many times each offer has been applied
- [ ] Offer codes: `code` field is stored but not yet checked — needs a "Enter promo code" flow
- [ ] Offer stacking: intentionally NOT supported. Single offer per order is the rule.
- [ ] Post-V2 cleanup: delete the frontend `applyOffer`/`removeOffer` calls in `offers_repository.dart` if any remain
- [ ] Update the `offer-pricing.js` and `offers.js` API test suites for V2 behavior

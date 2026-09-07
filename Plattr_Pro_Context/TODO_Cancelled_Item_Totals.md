# Cancelled Item Totals Bug

**Status:** ✅ FIXED 2026-09-07 — `calculateCartValue.js` excludes cancelled items via `mapCartStatus` (case-insensitive); the two jest tests below are green. Kept for the trace only.

Original status: Pre-existing bug surfaced during Phase 1 of `TODO_Multi_Config_Cart_Feature.md`. Not caused by that work.

## The bug

`backend/src-plattr/functions/cart/calculateCartValue.js` does not exclude cart items with `status: 'cancelled'` from the cart-level totals. A cart containing a cancelled item plus a normal item returns `priceInfo.finalPrice` that includes the cancelled item's price, which is wrong. The "after kitchen cancel" E2E flow depends on cancelled items being invisible to pricing.

## Failing tests (red at HEAD)

- `backend/src-plattr/functions/test/unit/cart/addItemToCart.test.js` → `Dining Flows › 69. addItemToCart - after kitchen cancel - should maintain correct total` — expects 100, gets 150.
- `backend/src-plattr/functions/test/unit/cart/calculateCartValue.test.js` → `Price Calculation › calculateCartValue › contains cancelled item - should skip in total` — expects 100, gets 150.

Both failures collapse to the same root cause in `calculateCartValue`.

## Suggested fix (not verified)

In `calculateCartValue.js`, filter `cart.items` to exclude anything with `status === 'cancelled'` (or whatever the canonical cancelled-status constant is in `orderConstants.js`) before summing `basePrice`, `finalPrice`, `totalVariantBasePrice`, `totalAddonBasePrice`, `totalDiscount`, `totalDiscountAmount`. Confirm by running the two tests above.

## Scope

Standalone bug fix — no dependency on the multi-config cart work. Can ship independently.

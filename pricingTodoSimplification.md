# Pricing Simplification TODO

## Backend refactor approach
- **Single source of truth**: Consolidate all pricing calculations into a dedicated `pricing` module that exposes canonical helpers (`computeCartItem`, `computeCartTotal`, `computeOrderTotal`) so cart, checkout, and order codepaths depend on the same pure functions.
- **Normalized models**: Replace ad-hoc `priceInfo` reconstruction with typed factory functions that always emit the same structure for menu items, variants, addons, cart items, carts, and orders; persist the full object (including variant/addon breakdowns) everywhere to avoid data loss.
- **Parent discount propagation**: Express parent-respecting discounts through shared utility functions that return both discounted and undiscounted amounts, and cache per-component flags (`respectParentDiscount`) alongside prices for consistent downstream display.
- **Quantity-aware calculations**: Ensure every computation receives a `quantity` argument and derives totals from unit prices centrally so order snapshots never need to recompute or guess per-unit values.
- **Validation & rounding**: Centralize sanitization (rounding, clamping, NaN guards) in the pricing module so each caller opts into the same validation rules, simplifying logging and making inconsistencies easier to trace.
- **Testing harness**: Add unit tests with representative carts (multiple variants/addons, mixed discounts) plus golden snapshots to guarantee the new module matches legacy numbers before swapping callers.

## UI breakdown requirements (orders page)
- For each order item, display sections for:
  - **Main item**: base price, discount %, final price.
  - **Variants**: list each selected variant with base price, discount %, final price, and `respectParentDiscount` flag.
  - **Add-ons**: list each selected addon with the same pricing fields and `respectParentDiscount` flag.
- Show per-item totals derived from the shared pricing data to confirm the sum matches the cart/order final price.
- Highlight any applied parent discount when `respectParentDiscount` is `true` so staff understand the discount source.

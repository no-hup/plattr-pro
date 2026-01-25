# Backend Contract Tests Learnings

- Always re-import `mockDataV3.json` before a run; the flow mutates table/session/cart/order state.
- `table-validateOTP` requires both `phoneNumber` and `name` for primary customers because `isUsernameEnabled=true`.
- `table003` in mockDataV3 starts in `pending` with OTP `654321`, which is safe for primary customer login.
- `cart-addItemToCart` and `cart-checkoutCart` are callable functions; send payloads in `{ "data": { ... } }`.
- `server-serverLogin` is onRequest but still accepts `{ "data": { ... } }`.
- `order-getActiveOrdersForRestaurant` filters by server session; the order from `table003` is assigned to `server001`.
- Expected price for `item_pancakes` is `80` (no variants/addons selected by default).

# Cart & Order System Documentation

## Overview
Covers cart lifecycle, checkout, order creation, and server notifications in Firestore.

## 1. Cart Flow
- One active cart per table, holding items with variants & addons.
- Cart statuses: `active` → `ordered` → `cancelled`.

## 2. Price Calculation & Validation
- Total = base price + variant costs + addon costs − discounts.
- `validateCart` enforces consistency; `calculateCartValue` recalculates on mismatch.

## 3. Checkout Process (`checkoutCart`)
- Validates `restaurantId`, `tableId`, `sessionId` via `validateCheckoutFields` & `validateCheckoutSession`.
- Loads the cart; errors if missing or empty.
- Ensures price validity and stock availability.
- Runs `createOrUpdateOrder` in a transaction to create/update order with a `PENDING` cart snapshot.
- Clears the cart via `clearCartInternal`.
- Returns `{ orderId, orderNumber, orderStatus, timestamp }`.

## 4. Notifications (Triggers)
- **onOrderPlaced** (`onDocumentCreated`): sends FCM to assigned server on new order.
- **onOrderUpdated** (`onDocumentUpdated`): sends FCM when a cart status changes to `READY`.
- All notifications use `sendFCMNotification` helper for uniform logging and error handling.

## Order Document Structure
```javascript
{
  tableId,
  restaurantId,
  orderNumber,
  orderStatus,   // pending, preparing, ready, served, complete
  paymentStatus, // unpaid, paid
  carts: [...],  // snapshots per checkout
  items: [...],  // flattened items across all carts
  priceInfo: {...},
  sessionId?,
  createdAt,
  updatedAt
}
```

## Status Flow
`pending` → `preparing` → `ready` → `served` → `complete`

## Firestore Collections
```
restaurants/{restaurantId}/
  carts/{tableId}
  orders/{orderId}
  tables/{tableId}
  servers/{serverId}
```

## Implementation & Limitations
- Core cart management, checkout, order creation, and server notifications.
- Basic error handling; no automatic retries on failures.

## Best Practices
- Validate inputs at each step.
- Use timestamp utility for consistency.
- Centralize FCM via `sendFCMNotification`.
- Log critical operations for tracing.

## TODO
- [ ] Kitchen notifications on new orders and status updates
- [ ] Retry/backoff for FCM and transaction failures
- [ ] Granular order status states (e.g., cooking, garnishing)
- [ ] Bill generation & payment status workflow
- [ ] Multi-user session support (seat splitting)
- [ ] Automated cleanup of expired carts and sessions
- [ ] Enhanced price validation checks in `checkoutCart`
- [ ] Analytics & monitoring for cart/order events
- [ ] Real-time UI hooks for order updates
- [ ] Archiving and retention of completed orders
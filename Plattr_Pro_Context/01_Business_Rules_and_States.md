# Business Rules and State Machines

> Last verified against code: 2026-04-08
> Sources: `orderConstants.js`, `updateCartStatus.js`, `table.js`, `status_utils.dart`, `active_order_models.dart`, `calculateCartValue.js`

---

## Table States (Backend Source of Truth)

**File:** `backend/src-plattr/functions/table/table.js` (lines 18-23)

```javascript
const TABLE_STATUS = {
    ACTIVE: 'active',
    VACANT: 'vacant',
    DISABLED: 'disabled',
    OTP_PENDING: 'pending'
};
```

| Status | Value | Meaning |
|--------|-------|---------|
| `ACTIVE` | `'active'` | Table has active session with customers |
| `VACANT` | `'vacant'` | Table is empty and available |
| `DISABLED` | `'disabled'` | Admin override, table not in service |
| `OTP_PENDING` | `'pending'` | OTP generated, awaiting customer validation |

**State Transitions:**
```
         ┌─────────────┐
         │   VACANT     │ ◄──── Initial state / cleanup
         └──────┬───────┘
                │ Customer scans QR → OTP generated
                ▼
         ┌─────────────┐
         │ OTP_PENDING  │ (value: 'pending')
         └──────┬───────┘
                │ OTP validated successfully
                ▼
         ┌─────────────┐
         │   ACTIVE     │ ◄──── Active dining session
         └──────┬───────┘
                │ Order closed / 1hr inactivity cleanup
                ▼
         ┌─────────────┐
         │   VACANT     │
         └─────────────┘

         ┌─────────────┐
         │  DISABLED    │ ◄──── Admin can set from any state
         └─────────────┘       Admin can restore to VACANT
```

> **Doc vs. Code Conflict:** The PRD (Section 10.1) mentions a `reserved` state. This does **NOT** exist in the backend code. The server app overview confirms only 4 statuses. If `reserved` is ever needed, it must be added to `TABLE_STATUS` in `table.js`.

### Table OTP Rules (Verified)
- 6-digit numeric code
- 5-minute validity
- **Only generated for `vacant` tables** — backend rejects OTP generation for non-vacant tables
- Source: `server/table_otp.js`, `table.js`

### Table Session Cleanup
- Automatic cleanup after **1 hour of table inactivity**
- Resets table to `vacant`, ends associated sessions
- Source: `table-cleanupInactiveSessions` Cloud Function

---

## Order Status (Backend Source of Truth)

**File:** `backend/src-plattr/functions/orders/orderConstants.js`

```javascript
exports.ORDER_STATUS = {
    PENDING: 'PENDING',
    IN_PROGRESS: 'IN_PROGRESS',
    COMPLETED: 'COMPLETED',
    CANCELLED: 'CANCELLED'
};
```

**Frontend Dart Enum:** `platter_core/lib/src/converters/status_utils.dart`
```dart
enum OrderStatus { pending, inProgress, completed, cancelled, unknown }
```

**Normalization:** Frontend normalizes many backend aliases into these 4 states:
- `ACTIVE`, `PROCESSING`, `CONFIRMED`, `PREPARING`, `READY` → all map to `IN_PROGRESS`
- `COMPLETE` → `COMPLETED`
- `CANCELED` → `CANCELLED`

**Order Lifecycle:**
```
PENDING ──► IN_PROGRESS ──► COMPLETED
                │
                └──► CANCELLED
```

An order auto-completes (`COMPLETED`) when **all** its carts reach a terminal state (`SERVED`, `CANCELLED`, or `RETURNED`).

---

## Fulfillment/Cart Status (Backend Source of Truth)

**File:** `backend/src-plattr/functions/orders/orderConstants.js`

```javascript
exports.FULFILLMENT_STATUS = {
    PENDING: 'PENDING',
    PREPARING: 'PREPARING',
    READY: 'READY',
    SERVED: 'SERVED',
    RETURNED: 'RETURNED',
    CANCELLED: 'CANCELLED'
};
```

**Frontend Dart Enum:** `platter_core/lib/src/converters/status_utils.dart`
```dart
enum CartStatus { pending, preparing, ready, served, returned, cancelled, unknown }
```

### Valid Transitions (Backend + Frontend AGREE)

**File:** `backend/src-plattr/functions/cart/updateCartStatus.js` (lines 11-18)

```
PENDING    → [PREPARING, READY, CANCELLED]
PREPARING  → [READY, CANCELLED]
READY      → [SERVED, CANCELLED]
SERVED     → [RETURNED]
RETURNED   → []  (terminal)
CANCELLED  → []  (terminal)
```

**Visual State Machine:**
```
┌─────────┐     ┌───────────┐     ┌─────────┐     ┌────────┐
│ PENDING  │────►│ PREPARING │────►│  READY  │────►│ SERVED │
└────┬────┘     └─────┬─────┘     └────┬────┘     └───┬────┘
     │                │                │               │
     │  (skip prep)   │                │               │
     ├────────────────►├───────────────►│               │
     │                │                │               ▼
     │                │                │          ┌──────────┐
     │                │                │          │ RETURNED │
     │                │                │          └──────────┘
     │                │                │             (terminal)
     ▼                ▼                ▼
┌──────────────────────────────────────────┐
│              CANCELLED (terminal)         │
└──────────────────────────────────────────┘
```

**Key Rule:** PENDING can skip directly to READY (allows kitchen to mark items ready immediately for cold items like drinks). This is verified in both backend and frontend transition maps.

### Status Colors (Backend + Frontend Match)

| Status | Hex | Color |
|--------|-----|-------|
| PENDING | `#FFC107` | Yellow |
| PREPARING | `#FFC107` | Yellow |
| READY | `#4CAF50` | Green |
| SERVED | `#4CAF50` | Green |
| CANCELLED | `#F44336` | Red |
| RETURNED | `#F44336` | Red |

Source: `orderConstants.js` `STATUS_COLOR_HEX` + `status_utils.dart` `StatusColors`

---

## Kitchen App Status Mapping (DIFFERENT from core)

**File:** `apps/platter_kitchen/lib/models/active_order_models.dart`

```dart
enum ActiveCartStatus { pending, cooking, ready, served, cancelled }
```

> **Important Difference:** Kitchen app uses `cooking` instead of `preparing`, and **merges `returned` into `cancelled`**. The `_parseStatus` function handles this normalization:
> - `preparing` / `cooking` / `in_progress` → `ActiveCartStatus.cooking`
> - `cancelled` / `canceled` / `returned` → `ActiveCartStatus.cancelled`

This means the Kitchen Display System shows 5 states (not 6), which is intentional for a simpler kitchen workflow.

### Kitchen-Specific Models (Freezed)
- `ActiveKitchenCart` — One ticket/round: cartId, orderId, orderNumber, tableNumber, submittedAt, status, items
- `ActiveCartItem` — Line item: itemId, name, quantity, modifiers, itemNote, isVoided
- `ActiveCartsResponse` — Wraps list of carts + view type (cart vs item view)
- **Urgency flag**: `isUrgent` computed property — `true` if `submittedAt` was >20 minutes ago

---

## Cart Pricing Math (Verified from `calculateCartValue.js`)

### Per-Item Price Calculation

```
For each cart item:
  1. itemBasePrice  = menuItem.priceInfo.basePrice
  2. itemDiscount   = menuItem.priceInfo.discount  (percentage 0-100)
  3. itemFinalPrice = basePrice * (1 - discount/100)

  4. For each selected variant:
     IF variant.respectParentDiscount == true:
       variantFinalPrice = variantBasePrice * (1 - itemDiscount/100)
     ELSE:
       variantFinalPrice = variant.priceInfo.finalPrice (uses variant's own discount)

  5. For each selected addon:
     IF addon.respectParentDiscount == true:
       addonFinalPrice = addonBasePrice * (1 - itemDiscount/100)
     ELSE:
       addonFinalPrice = addon.priceInfo.finalPrice (uses addon's own discount)

  6. totalBasePrice  = itemBasePrice + variantBaseTotal + addonBaseTotal
  7. totalFinalPrice = itemFinalPrice + variantFinalTotal + addonFinalTotal
  8. discountAmount  = totalBasePrice - totalFinalPrice
```

### Cart Total Calculation

```
For all items in cart (skipping cancelled items):
  cartBasePrice      = SUM(item.priceInfo.totalBasePrice)     // already includes qty
  cartFinalPrice     = SUM(item.priceInfo.finalPrice)
  totalDiscountAmount = cartBasePrice - cartFinalPrice
  totalDiscountPct    = (totalDiscountAmount / cartBasePrice) * 100
```

**All prices rounded to 2 decimal places** via `Math.round(price * 100) / 100`.

### Price Model Hierarchy

| Model | Context | Key Fields |
|-------|---------|------------|
| `BasicPriceInfo` | Menu items, variants, addons | basePrice, discount, finalPrice |
| `CartItemPriceInfo` | Single cart item | itemBasePrice, itemFinalPrice, totalVariantBasePrice, totalVariantFinalPrice, totalAddonBasePrice, totalAddonFinalPrice, totalBasePrice, finalPrice, discount, discountAmount |
| `CartTotalPriceInfo` | Entire cart | basePrice, finalPrice, totalVariantBasePrice, totalAddonBasePrice, totalDiscount, totalDiscountAmount |
| `OrderPriceInfo` | Order record | basePrice, finalPrice, totalDiscount, totalDiscountAmount |

Source: `backend/src-plattr/functions/genericModels/priceinfo.js`

### Offer System (Partially Implemented)
Cart total calculation **preserves** offer-related fields if present:
- `appliedOfferId`, `appliedOfferTitle`, `offerDiscount`, `applicableOfferDiscount`, `appliedOfferItems`
- These are stored but **not applied** during cart value calculation — offer application happens elsewhere.

---

## Multi-Cart Order Model

Each table has **one active order** at a time. Each checkout creates a **new cart snapshot** attached to that order. This supports multi-round ordering:

```
Order #1 (tableId: T5)
├── Cart 0 (Round 1): 2x Burger, 1x Fries  → status: SERVED
├── Cart 1 (Round 2): 1x Dessert, 2x Coffee → status: READY
└── Cart 2 (Round 3): 1x Water              → status: PENDING
```

**Order completes when ALL carts reach terminal state** (SERVED, CANCELLED, or RETURNED).

---

## Session Rules

### Server/Staff Sessions
- 12-hour expiry from last use
- Auto-extended on each authenticated request
- Stored in `restaurants/{restaurantId}/sessions` with `entity: 'server'`

### Customer Sessions
- Linked to a table, enables shared ordering
- Ends on order close or 1-hour inactivity
- `sessionId` is **mandatory** for checkout (verified in `checkoutCart.js`)

---

## Stock Filtering Rules (Verified from `menu_flow_detialed_spec.md`)

When fetching menu with `inStock=true`:
- **Menu items**: Filtered by `isInStock == true` (out-of-stock items hidden)
- **Addons**: Filtered by `isInStock == true` (out-of-stock addons hidden)
- **Variants**: **NOT filtered** — variants are always returned regardless of stock
- **Categories**: Empty categories (all items out of stock) are still returned

Stock toggle by server/admin → immediate effect on future menu fetches, but **does not alter existing carts**.

---

## Payment Status (Defined but Minimal)

```javascript
exports.PAYMENT_STATUS = {
    UNPAID: 'unpaid',
    PARTIALLY_PAID: 'partially_paid',
    PAID: 'paid'
};
```

Payments are **out of scope** per PRD, but the constants exist for future use.

---

## Cross-References

- [[00_Monorepo_Architecture]] — Where these enums/models live in the codebase
- [[02_Backend_and_Database]] — Firestore schema, Cloud Functions that implement these rules
- [[App_Platter_Server]] — How server app renders and transitions these states
- [[App_Platter_Kitchen]] — Kitchen-specific status mapping and urgency logic

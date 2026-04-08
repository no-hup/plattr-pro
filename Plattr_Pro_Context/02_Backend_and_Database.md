# Backend and Database

> Last verified against code: 2026-04-08
> Sources: `index.js`, `FeatureFlags.js`, `ErrorHandler.js`, `ResponseBuilder.js`, `orderConstants.js`, `DATABASE_SCHEMA.md`, actual Cloud Function files

---

## Firestore Multi-Tenant Schema

All data is scoped under `restaurants/{restaurantId}/` for complete tenant isolation.

```
restaurants/{restaurantId}/
├── info                           → Restaurant metadata (name, address, phone, location)
├── categories/{categoryId}        → Menu categories with display order
├── menuItems/{menuItemId}         → Items with pricing, variants, addons, stock
├── variants/{variantId}           → Reusable variant definitions (Size, etc.)
├── addons/{addonId}               → Reusable addon definitions with pricing
├── tables/{tableId}               → Table config, status, OTP, assigned server
├── servers/{serverId}             → Staff profiles, roles, assigned tables
├── orders/{orderId}               → Order header (status, total, table, server, carts[])
├── carts/{tableId}                → Active cart for a table (items[], priceInfo)
│   └── items/{itemId}             → Cart items sub-collection (alt: items[] array)
└── sessions/{sessionId}           → Active sessions (server or customer)

_system/
└── featureFlagOverrides           → Test environment feature flag overrides
```

### Key Collection Details

**Tables:**
| Field | Type | Notes |
|-------|------|-------|
| `number` | string | Table display number |
| `capacity` | number | Seating capacity |
| `status` | string | `active`, `vacant`, `disabled`, `pending` |
| `currentOTP.code` | string | 6-digit OTP |
| `currentOTP.createdAt` | timestamp | OTP creation time |
| `currentOTP.expiresAt` | timestamp | OTP expiry (5 minutes) |
| `occupiedBy` | array<string> | Phone numbers of occupants |
| `assignedServerId` | string | FK to servers collection |
| `lastActivity` | timestamp | For inactivity cleanup |

**Orders:**
| Field | Type | Notes |
|-------|------|-------|
| `customerId` | string | Customer identifier |
| `tableId` | string | FK to tables |
| `serverId` | string | FK to servers |
| `status` | string | `PENDING`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED` |
| `carts` | array<object> | Multi-cart model: each checkout adds a cart |
| `totalAmount` / `priceInfo` | object | Order-level price summary |
| `createdAt` | timestamp | Order creation |
| `updatedAt` | timestamp | Last modification |

**Carts (active, per-table):**
| Field | Type | Notes |
|-------|------|-------|
| `items` | array<object> | Cart items with pricing, variants, addons |
| `priceInfo` | object | `CartTotalPriceInfo` structure |
| `lastUpdated` | timestamp | Last cart modification |

**Sessions:**
| Field | Type | Notes |
|-------|------|-------|
| `entity` | string | `'server'` or `'customer'` |
| `status` | string | `'active'` or `'expired'` |
| Server sessions: 12-hour expiry, auto-extended on use |
| Customer sessions: end on order close or 1-hour inactivity |

---

## Cloud Functions Architecture

### Directory Structure (Verified)

```
backend/src-plattr/functions/
├── index.js                 → Main export file (all function namespaces)
├── admin/                   → Firebase Admin SDK initialization
├── adminApp/                → Admin app-specific endpoints
│   ├── indexAdminApp.js     → Exports all admin functions
│   ├── menu_admin.js        → Category/subcategory CRUD
│   └── tables_admin.js      → Table management for admin
├── cart/                    → Cart operations
│   ├── indexCart.js          → Cart function exports
│   ├── addItemToCart.js      → Add item (with transaction, fallback config)
│   ├── checkoutCart.js       → Checkout (validate, create order, clear cart)
│   ├── calculateCartValue.js → Price calculation engine
│   ├── updateCartStatus.js   → Cart state machine transitions
│   ├── validateCart.js        → Cart price validation
│   ├── clearCart.js           → Clear cart after checkout
│   ├── cartInputValidation.js → Input validation
│   ├── addItemToCartBoilerplateHelper.js → Helper functions
│   ├── addItemToCartCustomisationHelper.js → Fallback config for "Quick Add"
│   └── triggers/
│       └── orderTriggers.js  → Firestore triggers (onOrderPlaced, onOrderUpdated)
├── customer/                → Customer-facing functions
├── dev/                     → Development-only functions
│   ├── indexDev.js           → listRestaurants (emulator-only), setFeatureFlags
│   └── setFeatureFlags.js    → Runtime feature flag override
├── genericModels/           → Shared models
│   └── priceinfo.js          → BasicPriceInfo, CartItemPriceInfo, CartTotalPriceInfo, OrderPriceInfo
├── kitchen/                 → Kitchen-specific functions
├── menu/                    → Menu CRUD and fetching
│   └── menu_flow_detialed_spec.md → Detailed menu spec
├── mock/                    → Mock data importers for testing
├── notifications/           → FCM push notification sending
├── offers/                  → Offer/discount system
├── orders/                  → Order management
│   ├── indexOrders.js        → Order function exports
│   ├── orderConstants.js     → ORDER_STATUS, FULFILLMENT_STATUS, STATUS_COLOR_HEX
│   ├── createOrUpdateOrder.js → Creates or appends cart to existing order
│   ├── updateOrderStatus.js  → Order-level status changes
│   ├── getOrder.js           → Get order details
│   ├── getActiveOrdersForRestaurant.js → Active orders list
│   └── orderInputValidation.js → Validation helpers
├── server/                  → Server/waiter functions
│   └── table_otp.js          → OTP generation
├── session/                 → Session management
├── singleton/               → Singleton pattern implementations
│   ├── FeatureFlags.js       → Feature flag singleton
│   ├── ErrorHandler.js       → Error handling singleton
│   ├── ErrorMessages.js      → Centralized error messages
│   ├── HttpStatusCodes.js    → HTTP status code mapping
│   └── Environment.js        → Environment detection (emulator vs prod)
├── table/                   → Table management
│   └── table.js              → validateTableAndLocation, table CRUD
├── test/                    → Jest tests
└── utils/                   → Shared utilities
    ├── ResponseBuilder.js    → Unified response builder
    ├── statusUtils.js        → Status normalization
    ├── timestamp.js          → Timestamp utilities
    ├── arrayOperations.js    → Array utilities (safeArrayUnion)
    └── cors.js               → CORS wrapper for onRequest functions
```

### Function Namespace Registry (from `index.js`)

| Namespace | Export | Functions |
|-----------|--------|-----------|
| `table` | `tableFunctions` | validateTableAndLocation, getTablesForRestaurant, getTableDetails, updateTableStatus, assignTableToServer, unassignTableFromServer, cleanupInactiveSessions |
| `server` | `serverFunctions` | serverLogin, generateTableOTP |
| `customer` | `customerFunctions` | Customer-facing operations |
| `cart` | `cartFunctions + updateCartStatus` | addItemToCart, getCart, removeItemFromCart, clearCart, checkoutCart, updateCartStatus |
| `menu` | `menuFunctions` | getRestaurantMenu, updateMenuItemAvailability |
| `order` | `orderFunctions` | getOrder, createOrUpdateOrder, updateOrderStatus, getActiveOrdersForRestaurant, markCartAsServed, getServedCartsForServer |
| `dev` | `devFunctions` | listRestaurants (emulator-only), setFeatureFlags |
| `offers` | `offersFunctions` | Offer/discount operations |
| `adminApp` | `adminAppFunctions` | getRestaurantSettings, updateRestaurantSettings, staff CRUD, table management, historical orders |
| `admin-*` | Flat exports | admin-getRestaurantSettings, admin-updateRestaurantSettings, admin-addCategory, admin-updateCategory, admin-deleteCategory, admin-addSubcategory, admin-updateSubcategory, admin-deleteSubcategory, admin-getServers, admin-addServer, admin-updateServer, admin-resetServerPin, admin-getTables, admin-updateTableStatus, admin-updateTable, admin-getHistoricalOrders, admin-getOrderDetails |

### Calling Convention
- **Most functions**: `functions.https.onCall` — invoked by Firebase SDK as RPCs
- **Dev functions**: `functions.https.onRequest` with CORS wrapper — for Flutter web compatibility
- **Triggers**: `onDocumentCreated` / `onDocumentUpdated` — Firestore event triggers

---

## Singletons (Verified from code)

### FeatureFlags (`singleton/FeatureFlags.js`)

Singleton pattern with `Object.freeze`. Manages runtime feature toggles.

**Default Flags (hardcoded):**

| Flag | Default | Purpose |
|------|---------|---------|
| `isOtpManadatoryAtScan` | `true` | Require OTP at table scan |
| `isUsernameEnabled` | `true` | Enable username-based login |
| `isMultiUserSupportEnabled` | `false` | Allow multiple users per table session |
| `isMultipleVariantOrAddonForMenuItemsSupported` | `true` | Support multiple variants/addons per item |
| `sendServerNotifications` | `false` | Send FCM notifications to servers |
| `shouldUpdateFoodStatusAtItemLevelORAtOrderLevel` | `false` | Item-level vs order-level status tracking (not yet implemented) |
| `fallbackToSameCustomConfigurationForAddItem` | `true` | Auto-fill cart item config for "Quick Add" |

**Override Mechanism:**
- Reads from `_system/featureFlagOverrides` Firestore document
- `loadOverrides(db)` called at start of each Cloud Function
- Overrides take precedence over defaults
- Designed for test/emulator environments

**Dev endpoint:** `dev-setFeatureFlags` allows runtime flag changes in emulator mode.

### ErrorHandler (`singleton/ErrorHandler.js`)

Singleton with `Object.freeze`. Standardized error throwing for Cloud Functions.

| Method | Firebase Code | HTTP Code | Use Case |
|--------|--------------|-----------|----------|
| `badRequest()` | `invalid-argument` | 400 | Invalid input |
| `unauthorized()` | `unauthenticated` | 401 | Auth required |
| `forbidden()` | `permission-denied` | 403 | Access denied |
| `notFound()` | `not-found` | 404 | Resource missing |
| `preconditionFailed()` | `failed-precondition` | 412 | Business rule violation |
| `conflict()` | `already-exists` | 409 | Duplicate resource |
| `internalError()` | `internal` | 500 | Server error |
| `handleError()` | varies | varies | Catch-all with error type detection |

Error response format:
```json
{
  "status": "error",
  "message": "Human-friendly message",
  "data": {
    "code": "firebase-error-code",
    "httpCode": 400
  }
}
```

### ResponseBuilder (`utils/ResponseBuilder.js`)

**Not a singleton** — static utility class for building success responses.

Success format:
```json
{
  "status": "success",
  "message": "Human-friendly message",
  "data": { /* payload */ }
}
```

> **Doc vs. Code Conflict:** The `API_RESPONSE_CONTRACTS.md` doc shows success responses wrapped in `{ result: { ... } }`, but `ResponseBuilder.success()` returns `{ status, message, data }` directly (no `result` wrapper). Some functions wrap in `result`, others don't. The frontend `ResponseParser` handles both formats.

### Environment (`singleton/Environment.js`)

Detects whether running in Firebase Emulator or production. Used to guard dev-only endpoints.

---

## Firestore Triggers (Verified)

**File:** `cart/triggers/orderTriggers.js`

| Trigger | Event | Action |
|---------|-------|--------|
| `onOrderPlaced` | Order document created | Auto-assign server if none, send FCM notification (behind `sendServerNotifications` flag) |
| `onOrderUpdated` | Order document updated | Check for cart status → READY, notify assigned server |

**Trigger path:** `restaurants/{restaurantId}/orders/{orderId}`

These triggers use v2 Firestore triggers (`firebase-functions/v2/firestore`).

---

## Testing Infrastructure

**Backend tests:** `backend/src-plattr/functions/test/` (Jest)
- `ResponseBuilder.test.js` — 19 test cases
- Other tests for cart, order, table operations

**E2E API tests:** `backend/claude-api-testing-workflow/`
- Custom test runner for full API flow testing
- Suites: admin, cart, feature-flags, server-journey

**Jest config:** `jest.config.js` + `jest.setup.js` at functions root

---

## Key Backend Patterns

### Transaction Safety
- `addItemToCart` uses `db.runTransaction()` to prevent race conditions
- Cart + menu item fetched in parallel within transaction

### Price Validation
- Cart validation runs before checkout (`validateCart`)
- If validation fails, prices are recalculated automatically
- Stock validation runs during checkout — rejects out-of-stock items

### Cart "Quick Add" Fallback
- When `fallbackToSameCustomConfigurationForAddItem` is enabled
- If user adds same item without specifying variants/addons, reuses last config from cart
- Implemented in `addItemToCartCustomisationHelper.js`

### Multi-Cart Order Creation
- `createOrUpdateOrder` checks for existing active order on the table
- If exists: appends new cart to `carts[]` array
- If not: creates new order document
- Cart is cleared after successful order creation

---

## Cross-References

- [[00_Monorepo_Architecture]] — How frontend apps connect to this backend
- [[01_Business_Rules_and_States]] — State machines and constants defined here
- [[App_Platter_Server]] — Server app API consumption patterns
- [[App_Platter_Kitchen]] — Kitchen app polling against these endpoints
- [[App_Platter_Admin]] — Admin app uses `admin-*` prefixed endpoints

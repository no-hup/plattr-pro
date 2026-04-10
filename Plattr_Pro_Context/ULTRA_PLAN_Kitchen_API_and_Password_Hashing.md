# Ultra Plan: Kitchen API Wiring + Password Hashing

## Context

Two tasks to get plattr-pro closer to a partner restaurant test:
1. Kitchen app is fully built but polls mock data — wire it to real backend
2. Staff passwords stored as plain text — add bcrypt hashing

Both tasks are independent and can be parallelized.

---

## Task 1: Kitchen App — Wire Real API

### Problem
`KitchenRepository` returns hardcoded mock data. `NetworkService` is an empty shell. The UI, polling mechanism, and Freezed models are all done — they just consume fake data.

### Key Insight: Data Structure Mismatch
Backend returns **nested** `orders[].carts[].items[]`. Kitchen needs a **flat** list of `ActiveKitchenCart` (one per ticket). The repository must flatten:

```
Backend:  Order → carts[] → items[]
Kitchen:  ActiveKitchenCart[] (flat list, one per cart/ticket)
```

### Field Mapping (Verified)
| Kitchen Model Field | Backend Source | Transform Needed |
|---------------------|---------------|------------------|
| `cartId` | NOT in response | Generate: `"${orderId}_${cartIndex}"` |
| `orderId` | `order.id` | Direct |
| `orderNumber` | `order.orderNumber` | `_parseOrderNumber()` handles string/int |
| `tableNumber` | `order.tableId` | Direct (or fetch table number) |
| `serverName` | `order.serverId` | May need lookup or pass as-is |
| `submittedAt` | `cart.updatedAt` or `order.createdAt` | `_parseDateTime()` handles ms/Timestamp/ISO |
| `status` | `cart.status` (e.g. "PENDING") | `_parseStatus()` handles all aliases |
| `items[].name` | `cart.items[].meta.name` | Nested extraction |
| `items[].quantity` | `cart.items[].quantity` | `_parseInt()` handles types |
| `items[].modifiers` | `cart.items[].selectedVariants` + `selectedAddons` | Flatten to string list |
| `kitchenNote` | Not in backend | Always `null` |

**Good news:** All `_parseXxx()` functions in `active_order_models.dart` already handle edge cases.

### Files to Change (6 files, ~150 lines)

**File 1: `lib/network/network.dart`** — Replace empty shell
```
Current: Empty class with just Dio constructor
Change: Add two methods:
  - getActiveCarts(restaurantId, sessionId) → POST /order-getActiveOrdersForRestaurant
  - updateCartStatus(restaurantId, orderId, cartIndex, newStatus, sessionId) → POST /cart-updateCartStatus
Pattern: Copy from Server app's OrderApiService (same endpoints, same DioClient)
```

**File 2: `lib/core/kitchen_repository.dart`** — Replace mock with real calls
```
Current: Returns hardcoded KitchenOrder lists with Future.delayed
Change:
  - Inject NetworkService
  - getActiveCarts(): Call network, then TRANSFORM response:
    for each order → for each cart → build ActiveKitchenCart {
      cartId: "${order.id}_${cartIndex}",
      orderId: order.id,
      orderNumber: order.orderNumber,
      tableNumber: order.tableId,
      submittedAt: cart.updatedAt ?? order.createdAt,
      status: cart.status,
      items: cart.items.map(item → ActiveCartItem {
        itemId: item.menuItemId,
        name: item.meta?.name ?? item.name,
        quantity: item.quantity,
        modifiers: [...variant names, ...addon names],
      })
    }
  - Return ActiveCartsResponse(carts: flatList, widgetType: KitchenViewType.cart)
  - Keep getLiveOrders() for backward compat or remove if unused
```

**File 3: `lib/state/kitchen_live_provider.dart`** — Add sessionId
```
Current: Has restaurantId but no sessionId
Change:
  - Add `final String sessionId` field
  - Add to constructor: required this.sessionId
  - Pass to _repository.getActiveCarts(restaurantId, sessionId)
```

**File 4: `lib/di/di.dart`** — Wire up DI
```
Current: Empty setupDi() function
Change: Register NetworkService and KitchenRepository with GetIt
  getIt.registerLazySingleton(() => NetworkService(DioClient().dio));
  getIt.registerLazySingleton(() => KitchenRepository(networkService: getIt<NetworkService>()));
```

**File 5: `lib/main.dart`** — Call DI setup
```
Current: Doesn't call setupDi()
Change: Add setupDi() call after Firebase init, before runApp()
```

**File 6: `lib/main_navigation.dart`** (or wherever KitchenLiveProvider is created)
```
Current: Creates KitchenLiveProvider without sessionId
Change: Pass sessionId from SessionManager to KitchenLiveProvider constructor
```

### API Constants
Add to `lib/constants/kitchen_constants.dart` or create `lib/network/api_constants.dart`:
```dart
static const String getActiveOrders = '/order-getActiveOrdersForRestaurant';
static const String updateCartStatus = '/cart-updateCartStatus';
```

### Request/Response Format

**getActiveOrdersForRestaurant:**
```json
// Request
POST /order-getActiveOrdersForRestaurant
{ "data": { "restaurantId": "xxx", "sessionId": "xxx" } }

// Response
{
  "success": true,
  "data": {
    "orders": [{
      "id": "orderId",
      "orderNumber": "1234",
      "tableId": "table_5",
      "serverId": "server_1",
      "status": "IN_PROGRESS",
      "carts": [{
        "items": [{ "menuItemId": "...", "meta": { "name": "..." }, "quantity": 1, "status": "PENDING" }],
        "status": "PENDING",
        "updatedAt": 1234567890
      }]
    }]
  }
}
```

**updateCartStatus:**
```json
// Request
POST /cart-updateCartStatus
{ "data": { "restaurantId": "xxx", "orderId": "xxx", "cartIndex": 0, "newStatus": "PREPARING", "sessionId": "xxx" } }
```

### Gotchas
1. `cartId` must be generated client-side — backend doesn't provide one
2. `kitchenNote` doesn't exist in backend — always null
3. Backend sends status as UPPERCASE strings — `_parseStatus()` handles this
4. Items' modifiers need to be extracted from `selectedVariants` + `selectedAddons` objects and flattened to display strings
5. `submittedAt` should prefer `cart.updatedAt`, fall back to `order.createdAt`
6. Response wrapper: backend returns `{ success, data }` not `{ result: { status, data } }` — check which format this endpoint uses

### Verification
- Start Firebase emulator with mock data
- Open Kitchen app → Live tab should show real orders instead of mock data
- Orders should refresh every 60 seconds
- Verify status colors match (PENDING=yellow, PREPARING=yellow, READY=green)
- Verify urgency badge (>20 min since submission)
- Test empty state (no active orders)
- Test error state (emulator off)

---

## Task 2: Password Hashing

### Problem
`staff_admin.js` stores passwords as plain text in Firestore. `server_auth.js` compares them with `===`. Three exact locations:
- `staff_admin.js:142` — `password: pin` (addServer stores plain text)
- `staff_admin.js:320` — `password: pin` (resetServerPin stores plain text)
- `server_auth.js:139` — `serverData.password !== password` (login compares plain text)

### Files to Change (3 files + package.json)

**File 1: `package.json`** — Add bcrypt
```
Add to dependencies: "bcrypt": "^5.1.1"
Then run: npm install
```

**File 2: `functions/adminApp/staff_admin.js`** — Hash on store

addServer (~line 130-157):
```javascript
// Before
const pin = server.password || generatePIN(4);
// ...
password: pin,  // plain text

// After
const bcrypt = require('bcrypt');
const plainPin = server.password || generatePIN(4);
const hashedPassword = await bcrypt.hash(plainPin, 10);
// ...
password: hashedPassword,  // hashed
// Return plainPin in response (one-time display to admin)
```

resetServerPin (~line 310-325):
```javascript
// Before
const pin = newPin || generatePIN(4);
password: pin,  // plain text

// After
const bcrypt = require('bcrypt');
const plainPin = newPin || generatePIN(4);
const hashedPassword = await bcrypt.hash(plainPin, 10);
password: hashedPassword,  // hashed
// Return plainPin in response (one-time display to admin)
```

**File 3: `functions/server/server_auth.js`** — Compare with bcrypt

serverLogin credential path (~line 136-147):
```javascript
// Before
if (serverData.password !== password) { ... }

// After
const bcrypt = require('bcrypt');
const isValid = await bcrypt.compare(password, serverData.password);
if (!isValid) { ... }
```

### Migration: Backward-Compatible Wrapper

Existing Firestore data has plain text passwords. New code uses bcrypt. We need a bridge:

```javascript
// In server_auth.js login path:
const bcrypt = require('bcrypt');
const storedPassword = serverData.password;
let isValid = false;

if (storedPassword.startsWith('$2a$') || storedPassword.startsWith('$2b$')) {
  // Already hashed — use bcrypt compare
  isValid = await bcrypt.compare(password, storedPassword);
} else {
  // Legacy plain text — compare directly, then upgrade
  isValid = (storedPassword === password);
  if (isValid) {
    // Silently upgrade to hashed on successful login
    const hashed = await bcrypt.hash(password, 10);
    await serverRef.update({ password: hashed });
    console.log(`Upgraded password hash for server ${username}`);
  }
}
```

This way:
- Existing staff can log in with their current passwords
- Their passwords get automatically hashed on first successful login
- New staff created via admin app get hashed from the start
- No separate migration script needed

### What's NOT Affected
- Session-based login (uses sessionId, not password) — unchanged
- Kitchen app login — uses same `serverLogin` endpoint, no UI changes
- Server app login — uses same `serverLogin` endpoint, no UI changes
- Admin app login — separate flow, already handled

### Verification
- Create new server via Admin app → verify Firestore shows hashed password (starts with `$2b$`)
- Login with new server via Server/Kitchen app → should succeed
- Login with existing plain-text server → should succeed AND upgrade hash in Firestore
- Reset PIN via Admin app → verify new hash stored
- Login with reset PIN → should succeed
- Wrong password → should fail with 401

---

## Execution Order

These two tasks are **fully independent** — different apps, different codebases. Can be parallelized in worktrees.

**If sequential:**
1. Password hashing first (smaller, 30 min, reduces security risk immediately)
2. Kitchen API wiring second (larger, 2-3 hours)

**If parallel:**
- Lane A (worktree): Password hashing in backend
- Lane B (main): Kitchen API wiring in frontend
- No merge conflicts — different directories entirely

---

## Files Summary

| Task | File | Action | Lines Changed |
|------|------|--------|---------------|
| Kitchen | `lib/network/network.dart` | Replace empty shell | ~50 |
| Kitchen | `lib/core/kitchen_repository.dart` | Replace mock with real + transform | ~80 |
| Kitchen | `lib/state/kitchen_live_provider.dart` | Add sessionId param | ~5 |
| Kitchen | `lib/di/di.dart` | Wire GetIt registrations | ~15 |
| Kitchen | `lib/main.dart` | Call setupDi() | ~1 |
| Kitchen | `lib/main_navigation.dart` | Pass sessionId to provider | ~3 |
| Hashing | `package.json` | Add bcrypt dependency | ~1 |
| Hashing | `functions/adminApp/staff_admin.js` | Hash on addServer + resetPin | ~15 |
| Hashing | `functions/server/server_auth.js` | bcrypt.compare + auto-upgrade | ~20 |
| **Total** | **9 files** | | **~190 lines** |

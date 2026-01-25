# Technical Debt & Pending Improvements

## Backend

### 1. Missing Firestore Index for `menus` Collection Queries
**Priority:** Medium
**Source:** menu_change_code_review_supervisor.md (Issue 3)
**Description:**
The `fetchActiveMenu` function queries `menus` collection with:
- `.where('isActive', '==', true)`
- `.where('isDefault', '==', true)`

While single-field equality queries usually don't require composite indexes, if you add ordering or additional filters later, you'll need indexes.

**Action:** Document that Firestore indexes may be needed if queries evolve.

### 2. Hardcoded Collection Names
**Priority:** Low
**Source:** menu_change_code_review_supervisor.md (Issue 9)
**Description:**
Collection names like `'menus'`, `'subcategories'`, `'menuItems'` are hardcoded throughout multiple files (e.g., `menu_fetch.js`, `getRestaurantMenu.js`, `menuHelpers.js`).

**Action:** Extract to a shared constants module (e.g., `constants.js`).
Example:
```javascript
module.exports = {
  COLLECTIONS: {
    MENUS: 'menus',
    SUBCATEGORIES: 'subcategories',
    MENU_ITEMS: 'menuItems',
    // ...
  }
};
```

### 3. Location Proximity Check (isWithinRadius) Not Implemented
**Priority:** Low  
**Source:** Server App Gap Analysis (Jan 2026)
**Files:** `table/table.js` → `isWithinRadius()` function (line 639)
**Description:**
The `isWithinRadius` function is meant to verify that users are physically within the restaurant premises when scanning tables or performing location-sensitive operations. Currently, it always returns `true` as a placeholder.

**Current Implementation:**
```javascript
function isWithinRadius(point1, point2, radius) {
    return true; // Simplified implementation
}
```

**Intended Behavior:**
- Calculate haversine distance between user location and restaurant location
- Return `true` only if user is within specified radius (default 100 meters)
- Used in `scanTable` function to prevent remote table access

**Action:**
- Implement proper geolocation distance calculation using Haversine formula
- Consider using a library like `geolib` for accuracy
- Add unit tests for edge cases (GPS inaccuracy, boundary conditions)

**Note:** For now, keeping `return true` for server-related operations is acceptable for B2B app.

### 4. Order Pagination for Previous Orders Page
**Priority:** Low
**Source:** Server App Feature Enhancement
**Files:** `table/table.js` → `getTableDetails()` (line 945-947)
**Description:**
The "Previous Orders" page in the Server App currently limits display to 10 orders per table. The `getTableDetails` function only fetches the last 3 orders.

**Current Implementation:**
```javascript
.orderBy('createdAt', 'desc')
.limit(3)
```

**Requirements:**
- Backend needs to support `pageSize` and `pageToken` parameters
- Frontend needs infinite scroll or "Load More" functionality
- Consider separate endpoint for paginated order history: `getTableOrderHistory`

**Action:**
- Add pagination support to order fetching for tables
- Implement cursor-based pagination for efficient querying
- Update FE docs when implemented

### 5. Firebase Trigger Implementation Status (Partial)
**Priority:** Medium
**Source:** Server App Documentation Review (Jan 2026)
**Files:** 
- `cart/triggers/orderTriggers.js` (partially implemented)
- FE docs mention recommended triggers that may not be fully implemented

**Description:**
The server app documentation lists several "recommended Firebase triggers" but their implementation status is unclear:

| Trigger | Status | Location |
|---------|--------|----------|
| **Order Ready for Pickup** | ✅ Implemented | `orderTriggers.js` → `onOrderUpdate` |
| **New Order Assignment** | ⚠️ Needs Review | Triggers exist but notification delivery unclear |
| **Table Status Update** | ❓ Not Found | No trigger found for customer service requests |
| **Item Out of Stock** | ❓ Not Found | No trigger for menu item availability changes |

**Implemented Trigger (READY status):**
```javascript
// Find carts that transitioned to READY status
if (cart.status === FULFILLMENT_STATUS.READY && (!beforeCart || beforeCart.status !== FULFILLMENT_STATUS.READY)) {
    // Notifies assigned server
}
```

**Action:**
- Audit all trigger implementations
- Document which triggers are production-ready
- Implement missing triggers if needed for waiter workflow
- Add proper notification channels (FCM tokens, etc.)

### 6. Automated Session/Cart Cleanup Enhancement
**Priority:** Low
**Source:** Server App Gap Analysis (Jan 2026)
**Files:** `table/table.js` → `cleanupInactiveSessions()`
**Description:**
Current implementation cleans up sessions after 1 hour of inactivity, but there's a TODO to enhance this:

```javascript
// TODO: Shaurya - Implement cleanup for tables where there hasn't been any cart or order 
// placed in the last 2 hours. Current implementation only checks for general inactivity.
```

**Action:**
- Consider cart/order activity in addition to general table activity
- May want different thresholds for different scenarios

### 7. Notification Delivery Mechanism (FCM Setup)
**Priority:** Medium
**Source:** Server App Gap Analysis (Jan 2026)
**Files:** 
- `notifications/sendNotification.js` - FCM send function exists
- `orders/updateOrderStatus.js` - Uses `sendFCMNotification` (line 87)
- `cart/triggers/orderTriggers.js` - READY status detection exists

**Description:**
The notification infrastructure exists but requires proper FCM token management:

1. **FCM Token Storage**: Server profiles need `fcmToken` field populated
2. **Token Refresh**: No mechanism to update tokens when they expire
3. **Token Acquisition**: Frontend needs to request FCM permission and send token to backend
4. **Fallback**: No fallback if FCM delivery fails

**Current Flow (updateOrderStatus):**
```javascript
const token = serverDoc.data().fcmToken;
if (token) {
  await sendFCMNotification(token, { ... });
}
```

**Missing Pieces:**
- Frontend code to request notification permission
- API endpoint to register/update FCM token for servers
- Token expiry handling
- Notification history/status tracking

**Action:**
- Add `server-updateFcmToken` endpoint
- Implement frontend FCM permission request flow
- Consider web push notifications for PWA support

### 1. Mock Data Injection in Production Code (Critical)
**Source:** `lib/pages/menuListing/menu_response.dart`
**Description:**
The `MenuItem.fromJson` factory currently contains temporary logic to inject `dietaryType` (Veg/Non-Veg) and `spiceLevel` by checking string patterns in the item name (e.g., "chicken", "spicy").
**Risk:**
- Violates separation of concerns.
- Can lead to incorrect dietary information in production if backend data is missing or logic is flawed.
- Logic executes in production builds.

**Action:**
- Move this logic to a `kDebugMode` block or a dedicated `MockDataTransformer` that only runs in development.
- Remove entirely once backend sends real `dietaryType` and `spiceLevel` fields.

### 2. Potential Null Pointer Exception in Mock Data Logic
**Source:** `lib/pages/menuListing/menu_response.dart`
**Description:**
The mock data injection logic accesses `mutableJson['meta']['name']` without proper null checks:
```dart
final name = (mutableJson['meta'] as Map<String, dynamic>)['name'].toString().toLowerCase();
```
**Risk:**
- If `meta` or `name` is null (e.g., malformed backend response), the app will crash with a runtime NPE during parsing.

**Action:**
- Add defensive null checks: `(mutableJson['meta'] as Map<String, dynamic>?)?['name']`.
- This is part of the mock data removal task above.

### 3. Server App `updateOrderStatus` API Placeholder
**Priority:** Medium
**Source:** Server App Gap Analysis (Jan 2026)
**Files:** `platter_server/lib/pages/orders_home/repository/order_api_service.dart`
**Description:**
The `updateOrderStatus` method is a placeholder that doesn't call the correct backend endpoint:

```dart
// Note: This is a placeholder for the actual API endpoint
// Implement when the backend endpoint is available
final response = await _dio.post(
  ApiConstants.getOrder, // Replace with actual endpoint
```

**Action:**
- Verify which backend endpoint handles order status updates
- Update to call `cart-updateCartStatus` or appropriate endpoint
- Test the complete flow

### 8. Orders List Pagination for High-Volume Restaurants
**Priority:** Low
**Source:** Server App Orders Home Redesign (Jan 2026)
**Files:** `orders/getActiveOrdersForRestaurant.js`
**Description:**
The `getActiveOrdersForRestaurant` function returns all active orders in a single response. For high-volume restaurants with 50+ active tables, this could lead to large payloads.

**Current Implementation:**
- All active orders fetched in single query
- No pagination or cursor-based fetching
- Frontend filters results by category tabs

**Action:**
- Consider pagination if performance issues arise
- Implement cursor-based pagination with `pageSize` and `pageToken` parameters
- Consider splitting "All Orders" tab into paginated fetch
- Monitor payload sizes in production

### 9. "All Orders" Tab Equals "My Orders" (Server-Side Scoping)
**Priority:** Low
**Source:** Orders Home Screen Redesign (Jan 2026)
**Files:** `orders/getActiveOrdersForRestaurant.js`, `platter_server orders_home_screen.dart`
**Description:**
The "All Orders" tab in the Server App currently displays the same data as "My Orders" because the active orders API filters data server-side to only return orders relevant to the current server.

**Current Implementation:**
- `getActiveOrdersForRestaurant` filters orders where:
  - `assignedServer == currentServerId`
  - OR `assignedServer` is null/empty (unassigned)
  - OR any cart has `assignedTo == currentServerId`

**Future Enhancement:**
- If restaurant admins need to see ALL orders regardless of server assignment, create a separate endpoint like `getAllActiveOrdersForRestaurant` that doesn't apply server filtering.
- Add a role-based check to determine which endpoint to call.

**Action:**
- Document this limitation in frontend UI (tooltip/info icon)
- Implement separate endpoint if restaurant-wide view is required

---

## Changelog

| Date | Item | Change |
|------|------|--------|
| 2026-01-20 | #3 Legacy Server CRUD | RESOLVED - Removed legacy functions from `serverIndex.js` |
| 2026-01-20 | #3 isWithinRadius | Added - Location proximity check placeholder |
| 2026-01-20 | #4 Order Pagination | Added - Previous orders page needs pagination |
| 2026-01-20 | #5 Firebase Triggers | Added - Trigger implementation status audit |
| 2026-01-20 | #6 Session Cleanup | Added - Enhancement for cart/order based cleanup |
| 2026-01-20 | FE #3 updateOrderStatus | Added - API placeholder in server app |
| 2026-01-23 | #9 All Orders Tab | Added - All Orders tab equals My Orders due to server-side scoping |

### 10. Missing Edge Case Logs (Backend)
**Priority:** Low  
**Source:** Code Review (Jan 2026)  
**Description:**
Missing logs for key edge cases in order processing:
- `createOrUpdateOrder`: No warning when a new order is created for a table with no assigned server.
- `markCartAsServed`: No specific warning log when idempotent check fails (`alreadyServed: true`), which would help debug potential frontend double-submission issues.

### 11. Deprecation Cleanup (Frontend)
**Priority:** Low  
**Source:** Code Review (Jan 2026)  
**Description:**
In `order_api_service.dart`, the method `markCartAsDelivered` is redundant now that `markCartAsServed` is the standard. It should be verified for usage and removed.

### 12. Type Safety & Error Feedback (Frontend)
**Priority:** Low  
**Source:** Code Review (Jan 2026)  
**Description:**
In `orders_provider.dart`, `fetchServedCarts` fails silently (only `debugPrint`). The UI should show a user-visible indication (e.g., snackbar) if the "Served" tab content fails to load.

### 13. Orders Home Coupling & UI Mapping (Backend + Server App)
**Priority:** Medium  
**Source:** Code Review (Feb 2026)  
**Files:** `orders/getActiveOrdersForRestaurant.js`, `orders/markCartAsServed.js`, `platter_server orders_provider.dart`, `utils/statusUtils.js`
**Description:**
- **Too Much Coupling in Code, Cleaner Organisation Possible With Independent:** `orders/getActiveOrdersForRestaurant.js` and `orders/markCartAsServed.js` rely on `cartIndex`, and `orders_provider.dart` uses that index for actions. Any filtering/reordering breaks updates. Prefer a stable identifier like `cartId` for API calls and update carts by ID.
- **Good to Have Things:** Order-level `statusColorHex` is derived from cart-status mapping, so `IN_PROGRESS` ends up grey. If order-level coloring is needed, add a dedicated order-status color map.
- **Good to Have Things:** `orders_provider.dart` shows `orderId` as order number. If `orderNumber` exists in backend, include it in `OrderSummary` so UI doesn’t show long IDs.
- **Add Logs for Edge Case:** `orders/markCartAsServed.js` should log when `sessionDoc.data().serverId` is empty to debug cases where served carts never appear.

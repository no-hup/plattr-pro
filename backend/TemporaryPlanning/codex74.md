# Frontend Migration Guide: Backend API Response Standardization

## Executive Summary

The backend APIs have been standardized to use a unified response format across all endpoints. This breaking change requires frontend updates to handle the new `{ status: 'success', message: '...', data: <response_data> }` structure instead of various inconsistent formats.

**Breaking Change Impact**: All frontend code consuming these APIs must be updated to access response data via the `data` property instead of directly from the response object.

---

## Response Format Changes

### Before (Inconsistent Formats)
```javascript
// Various legacy formats
{ success: true, message: "...", data: {...} }
{ message: "...", status: "success", data: {...} }
{ cart: {...}, message: "..." } // Direct object properties
```

### After (Standardized Format)
```javascript
{
  status: 'success',
  message: 'Success message here',
  data: { /* actual response data */ }
}
```

### Error Handling Changes
**Before**: Direct `HttpsError` throws with inconsistent structures
**After**: Standardized error responses via `ErrorHandler` singleton (frontend error handling remains the same)

---

## Affected APIs and Required Frontend Changes

### Cart APIs

#### 1. `getCart`
**File**: `cart/getCart.js`
**Response Change**:
```javascript
// OLD: Direct cart object
{ cart: {...}, message: "..." }

// NEW: Standardized wrapper
{
  status: 'success',
  message: 'Cart retrieved successfully.',
  data: {
    cart: { /* sanitized cart data */ }
  }
}
```

**Frontend Changes Required**:
```javascript
// OLD CODE:
const response = await getCart({ restaurantId, tableId });
const cart = response.cart;

// NEW CODE:
const response = await getCart({ restaurantId, tableId });
const cart = response.data.cart;
```

#### 2. `checkoutCart`
**File**: `cart/checkoutCart.js`
**Response Change**:
```javascript
// OLD: Direct order object
{ orderId: "...", orderStatus: "...", ... }

// NEW: Standardized wrapper
{
  status: 'success',
  message: 'Checkout completed successfully.',
  data: {
    orderId: "...",
    orderNumber: "...",
    orderStatus: "...",
    timestamp: "..."
  }
}
```

**Frontend Changes Required**:
```javascript
// OLD CODE:
const response = await checkoutCart({ restaurantId, tableId, sessionId });
const { orderId, orderStatus } = response;

// NEW CODE:
const response = await checkoutCart({ restaurantId, tableId, sessionId });
const { orderId, orderNumber, orderStatus, timestamp } = response.data;
```

---

### Menu APIs

#### 3. `getRestaurantMenu`
**File**: `menu/getRestaurantMenu.js`
**Response Change**:
```javascript
// OLD: Direct menu object
{ categories: [...], menuItems: {...}, ... }

// NEW: Standardized wrapper
{
  status: 'success',
  message: 'Restaurant menu fetched successfully',
  data: {
    categories: [...],
    menuItems: {...},
    metadata: { totalCategories: X, totalMenuItems: Y }
  }
}
```

**Frontend Changes Required**:
```javascript
// OLD CODE:
const response = await getRestaurantMenu({ restaurantId });
const { categories, menuItems } = response;

// NEW CODE:
const response = await getRestaurantMenu({ restaurantId });
const { categories, menuItems, metadata } = response.data;
```

#### 4. Menu CRUD Operations (`menu.js`)
**Affected Operations**: `addMenuItem`, `updateMenuItem`, `deleteMenuItem`, `updateAvailability`
**Response Change**: All operations now return:
```javascript
{
  status: 'success',
  message: 'Operation completed successfully',
  data: { /* operation-specific result */ }
}
```

**Frontend Changes Required**: Access results via `response.data` instead of direct response properties.

---

### Order APIs

#### 5. `getOrder`
**File**: `orders/getOrder.js`
**Response Change**: All variations now return:
```javascript
{
  status: 'success',
  message: 'Order(s) retrieved successfully',
  data: /* order object or array of orders */
}
```

**Frontend Changes Required**:
```javascript
// OLD CODE (examples):
const response = await getOrder({ orderId });
const order = response; // Direct order object

const response = await getOrder({ tableId, getAllOrders: true });
const orders = response; // Direct array

// NEW CODE:
const response = await getOrder({ orderId });
const order = response.data; // Access via data property

const response = await getOrder({ tableId, getAllOrders: true });
const orders = response.data; // Access via data property
```

#### 6. `getActiveOrdersForRestaurant`
**File**: `orders/getActiveOrdersForRestaurant.js`
**Response Change**:
```javascript
// OLD: Direct array
[{ order: {...} }, { order: {...} }, ...]

// NEW: Standardized wrapper
{
  status: 'success',
  message: 'Active orders fetched successfully',
  data: [{ order: {...} }, { order: {...} }, ...]
}
```

**Frontend Changes Required**:
```javascript
// OLD CODE:
const response = await getActiveOrdersForRestaurant({ restaurantId });
const orders = response;

// NEW CODE:
const response = await getActiveOrdersForRestaurant({ restaurantId });
const orders = response.data;
```

#### 7. `updateOrderStatus`
**File**: `orders/updateOrderStatus.js`
**Response Change**:
```javascript
// OLD: Direct result
{ orderId: "...", orderStatus: "..." }

// NEW: Standardized wrapper
{
  status: 'success',
  message: 'Order status updated successfully',
  data: { orderId: "...", orderStatus: "..." }
}
```

**Frontend Changes Required**:
```javascript
// OLD CODE:
const response = await updateOrderStatus({ orderId, orderStatus });
const { orderId: updatedOrderId, orderStatus: newStatus } = response;

// NEW CODE:
const response = await updateOrderStatus({ orderId, orderStatus });
const { orderId: updatedOrderId, orderStatus: newStatus } = response.data;
```

---

### Server APIs

#### 8. `createServer`
**File**: `server/serverIndex.js`
**Response Change**:
```javascript
// OLD: Direct server object
{ id: "...", name: "...", ... }

// NEW: Standardized wrapper
{
  status: 'success',
  message: 'Server created successfully',
  data: { id: "...", name: "...", ... }
}
```

**Frontend Changes Required**:
```javascript
// OLD CODE:
const response = await createServer({ name, email, role });
const server = response;

// NEW CODE:
const response = await createServer({ name, email, role });
const server = response.data;
```

#### 9. `updateServer`
**Response Change**:
```javascript
// OLD: Direct update result
{ id: "...", name: "...", ... }

// NEW: Standardized wrapper
{
  status: 'success',
  message: 'Server updated successfully',
  data: { id: "...", name: "...", ... }
}
```

**Frontend Changes Required**:
```javascript
// OLD CODE:
const response = await updateServer({ id, name, email });
const updatedServer = response;

// NEW CODE:
const response = await updateServer({ id, name, email });
const updatedServer = response.data;
```

#### 10. `getServer`
**Response Change**:
```javascript
// OLD: Direct server data
{ name: "...", email: "...", ... }

// NEW: Standardized wrapper
{
  status: 'success',
  message: 'Server retrieved successfully',
  data: { name: "...", email: "...", ... }
}
```

**Frontend Changes Required**:
```javascript
// OLD CODE:
const response = await getServer({ id });
const server = response;

// NEW CODE:
const response = await getServer({ id });
const server = response.data;
```

#### 11. `assignTable` / `unassignTable`
**Response Change**:
```javascript
// OLD: Direct result
{ serverId: "...", tableId: "..." }

// NEW: Standardized wrapper
{
  status: 'success',
  message: 'Table assigned/unassigned successfully',
  data: { serverId: "...", tableId: "..." }
}
```

**Frontend Changes Required**:
```javascript
// OLD CODE:
const response = await assignTable({ serverId, tableId });
const { serverId: sId, tableId: tId } = response;

// NEW CODE:
const response = await assignTable({ serverId, tableId });
const { serverId: sId, tableId: tId } = response.data;
```

#### 12. `getTables`
**File**: `server/tables_fetch.js`
**Response Change**:
```javascript
// OLD: Direct tables object
{ tables: [...], restaurantId: "...", ... }

// NEW: Standardized wrapper
{
  status: 'success',
  message: 'Tables retrieved successfully',
  data: {
    restaurantId: "...",
    tables: [...],
    count: X
  }
}
```

**Frontend Changes Required**:
```javascript
// OLD CODE:
const response = await getTables({ restaurantId });
const { tables, count } = response;

// NEW CODE:
const response = await getTables({ restaurantId });
const { tables, count, restaurantId } = response.data;
```

---

### Notification APIs

#### 13. `updateServerFCMToken`
**File**: `notifications/updateFcmTokenInDb.js`
**Response Change**:
```javascript
// OLD: Direct result
{ serverId: "...", updatedAt: "..." }

// NEW: Standardized wrapper
{
  status: 'success',
  message: 'FCM token updated successfully',
  data: { serverId: "...", updatedAt: "..." }
}
```

**Frontend Changes Required**:
```javascript
// OLD CODE:
const response = await updateServerFCMToken({ serverId, fcmToken });
const { serverId: sId, updatedAt } = response;

// NEW CODE:
const response = await updateServerFCMToken({ serverId, fcmToken });
const { serverId: sId, updatedAt } = response.data;
```

---

## Implementation Checklist

### High Priority (Core User Flows)
- [ ] Cart retrieval and display (`getCart`)
- [ ] Menu loading (`getRestaurantMenu`)
- [ ] Order checkout (`checkoutCart`)
- [ ] Order status checking (`getOrder`)

### Medium Priority (Admin/Server Features)
- [ ] Server management (`createServer`, `updateServer`, `getServer`)
- [ ] Table assignments (`assignTable`, `unassignTable`)
- [ ] Table listings (`getTables`)

### Low Priority (Background Operations)
- [ ] Order status updates (`updateOrderStatus`)
- [ ] Active orders polling (`getActiveOrdersForRestaurant`)
- [ ] FCM token updates (`updateServerFCMToken`)
- [ ] Menu CRUD operations

---

## Testing Strategy

1. **Unit Tests**: Update API mock responses to use new format
2. **Integration Tests**: Verify end-to-end flows with new response structure
3. **UI Tests**: Ensure UI components correctly access `response.data`
4. **Error Handling**: Verify error responses still work correctly (format unchanged)

---

## Rollback Plan

If issues arise during deployment:
1. **Immediate**: Revert frontend changes to use legacy response format
2. **Backend**: Can maintain new format while frontend temporarily uses compatibility layer
3. **Gradual**: Roll out API-by-API rather than all at once

---

## Additional Notes

- **Error responses**: Frontend error handling code does not need changes - errors still come through as `HttpsError` objects
- **Status field**: All successful responses now include `status: 'success'` for consistency
- **Message field**: Human-readable success messages are provided in all responses
- **Data field**: All actual response data is now nested under the `data` property

This standardization improves API consistency and maintainability but requires coordinated frontend updates across all consuming applications.

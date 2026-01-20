# Server App Consumed APIs

This document lists the backend API endpoints consumed by the server (waiter) app, organized by page/component. All endpoints use Firebase Cloud Functions with the `{namespace}-{functionName}` naming convention.

---

## Authentication

| API | Cloud Function | Description |
|-----|----------------|-------------|
| Server Login | `server-serverLogin` | Credential or session-based authentication |

**Request (Credential Login):**
```json
{
  "data": {
    "restaurantId": "string",
    "username": "email or phone",
    "password": "string"
  }
}
```

**Request (Session Login):**
```json
{
  "data": {
    "restaurantId": "string",
    "sessionId": "string"
  }
}
```

---

## 1. Orders Home

| API | Cloud Function | Description |
|-----|----------------|-------------|
| List active orders | `order-getActiveOrdersForRestaurant` | Fetch all active orders for restaurant |
| Get order details | `order-getOrder` | Get details for a specific order |

---

## 2. Tables

| API | Cloud Function | Description |
|-----|----------------|-------------|
| List all tables | `table-getTablesForRestaurant` | Fetch all tables for restaurant |
| Get table details | `table-getTableDetails` | Get detailed info for a specific table |
| Assign table to server | `table-assignTableToServer` | Link waiter to table (bi-directional) |
| Unassign table from server | `table-unassignTableFromServer` | Remove waiter-table link |
| Generate table OTP | `server-generateTableOTP` | Generate 6-digit OTP (5 min validity) |
| Update table status | `table-updateTableStatus` | Change table status (vacant, disabled, etc.) |

---

## 3. Menu

| API | Cloud Function | Description |
|-----|----------------|-------------|
| Get menu | `menu-getRestaurantMenu` | Fetch full restaurant menu |
| Update item availability | `menu-updateMenuItemAvailability` | Mark item in/out of stock |

---

## Table Popup

| API | Cloud Function | Description |
|-----|----------------|-------------|
| Get table details | `table-getTableDetails` | Includes OTP, server assignment, recent orders |
| Update table status | `table-updateTableStatus` | Mark vacant, disabled, etc. |
| Generate/refresh OTP | `server-generateTableOTP` | Only works for vacant tables |
| Get order history | `table-getTableDetails` | Returns last 3 orders (pagination planned) |

---

## Cart Detail Page

| API | Cloud Function | Description |
|-----|----------------|-------------|
| Get order/cart details | `order-getOrder` | Full order with all carts |
| Remove item from cart | `cart-removeItemFromCart` | Decrement quantity or remove item |
| Update cart status | `cart-updateCartStatus` | State machine transitions |

**Cart Status Transitions:**
```
PENDING → ACCEPTED → PREPARING → READY → SERVED
           ↓            ↓          ↓        ↓
        CANCELLED    CANCELLED  CANCELLED  RETURNED
```

---

## Other

| API | Cloud Function | Description |
|-----|----------------|-------------|
| Cleanup inactive sessions | `table-cleanupInactiveSessions` | Internal trigger (1 hour inactivity) |

---

## Data Paths (Restaurant-Scoped)

All APIs use restaurant-scoped Firestore collections:
- `restaurants/{restaurantId}/servers`
- `restaurants/{restaurantId}/tables`
- `restaurants/{restaurantId}/orders`
- `restaurants/{restaurantId}/sessions`
- `restaurants/{restaurantId}/menus`

---

## Notes

- **OTP**: 6-digit numeric code, valid for 5 minutes, only generated for `vacant` tables
- **Session**: 12-hour expiry, auto-extended on each authenticated request
- **Cart State Machine**: Only specific transitions are allowed (see updateCartStatus.js)
- **Multi-Cart Model**: Each order can have multiple carts (e.g., multiple rounds of ordering)

---

> **Last Updated:** 2026-01-20
> **Source of Truth:** Backend code in `backend/src-plattr/functions/`

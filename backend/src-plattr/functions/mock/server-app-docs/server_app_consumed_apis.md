# Server App Consumed APIs

This document lists the backend API endpoints consumed by the server (waiter) app, organized by page/component. Only relevant endpoints are included for now.

---

## 1. Orders Home
- **List all orders:** `/orders/list`
- **Get order details:** `/orders/{orderId}`

## 2. Tables
- **List all tables:** `/tables/list`
- **Get table details:** `/tables/{tableId}`
- **Assign table to server:** `/tables/assign`
- **Unassign table from server:** `/tables/unassign`
- **Generate table OTP:** `/tables/generate-otp`
- **Update table status:** `/tables/update-status`

## 3. Menu
- **Get menu:** `/menu/list`
- **Mark item out of stock:** `/menu/item/update`

## Table Popup
- **Get table details:** `/tables/{tableId}`
- **Update table status:** `/tables/update-status`
- **Generate/refresh table OTP:** `/tables/generate-otp`
- **Get order history for table:** `/orders/list?tableId={tableId}`
- **Mark order done:** `/orders/mark-done`

## Cart Detail Page
- **Get order/cart details:** `/orders/{orderId}`
- **Remove item from cart:** `/orders/{orderId}/item/remove`
- **Mark item as delivered:** `/orders/{orderId}/item/deliver`

## Other
- **Get server (waiter) profile:** `/server/{serverId}`
- **Update server profile:** `/server/update`
- **Create server:** `/server/create`
- **Get notifications:** `/notifications/list`

---

> **Note:**
> - Some endpoints are implied from app requirements and may need to be implemented if not present.
> - Actual endpoint URLs or cloud function names may differ.
> - This doc will be updated as the app evolves.

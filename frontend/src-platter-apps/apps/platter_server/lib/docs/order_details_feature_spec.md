# Order Details (Server App) Feature Spec

## Context
This document captures the full scope discussed for the server app "Order Details" page, including current state, PRD expectations, backend alignment, gaps, and a minimal-change implementation plan. It is intended for review by another developer before implementation.

## Sources Referenced
- `lib/docs/server_app_prd.md`
- `lib/docs/server_app_overview.md`
- `lib/docs/server_app_orders_flow.puml`
- `lib/pages/orders_home/order_detail_screen.dart`
- `lib/pages/orders_home/repository/order_api_service.dart`
- Backend: `backend/src-plattr/functions/orders/getOrder.js`
- Backend: `backend/src-plattr/functions/cart/updateCartStatus.js`
- Backend: `backend/src-plattr/functions/orders/updateOrderStatus.js`
- Backend: `backend/src-plattr/functions/orders/markCartAsServed.js`
- Screenshot shared in conversation (shows current Order Detail UI with flat items list and two buttons)

## Product Requirements (PRD Summary)
From the server app PRD and overview docs:
- Multi-cart order details view with:
  - Cart status chips
  - Item list per cart
  - Variants/addons displayed for items
- Actions:
  - Mark cart SERVED (cart-level updates)
  - Mark item SERVED/delivered (item-level)
  - Cancel order (order-level)
- Error behavior:
  - Show errors without blanking cached data
  - Allow refresh
- Notification deep-link:
  - Tap notification should open order details (handled elsewhere)
- UX guidance:
  - Large tap targets, fast scanning, minimal taps
  - Confirm destructive actions

## Current Implementation (What Exists Today)
Flutter:
- `OrderDetailScreen` loads `order-getOrder` and renders a flat list of items.
- Header is a placeholder with "Server: Unassigned".
- Actions: "Mark Served" per cart, item-level served checkbox, a cancel button per dish, and "Cancel Order" (D4:
  both take food off the bill and the kitchen, refused on a printed bill). Mark Paid was removed (D4).
- Status chips exist (`_buildStatusChip`) but are not displayed.
- Error state replaces content entirely (no cached fallback).

Backend:
- `order-getOrder` returns a sanitized order object with:
  - `orderStatus`, `createdAt`, `updatedAt`, `tableId`, `total`, `items`, `notes`, `carts`
  - Items include selected variants and addons
- `cart-updateCartStatus` enforces state machine transitions for carts.
- `order-updateOrderStatus` updates order status and handles completion logic.
- `order-markCartAsServed` exists (server app uses this elsewhere for "Served" tab).

## Gaps vs Requirements
- No multi-cart grouping in UI (items are flattened).
- No cart-level status chips or cart-specific metadata.
- No "Mark Served" action in order details.
- No per-item delivery checkbox or removal action (not implemented in screen).
- No order metadata (table ID, status, total, timestamps) in header.
- No non-blocking error banner or cached view when refresh fails.
- Assigned server is hard-coded, not read from order data.

## Cloud Function Usage Policy (Updated per review)
**Do not reuse consumer-facing `order-getOrder`** for server app Order Details.
Create a dedicated BFF endpoint:
- **Filename:** `backend/src-plattr/functions/orders/serverGetOrderDetails.js`
- **Location:** parallel to `getOrder.js`
- **Purpose:** wrap core order retrieval logic but **enrich specifically for server app**
- **Must Enrich:** resolve `assignedServerId` (order/table) to **human-readable `assignedServerName`** server-side
  - Frontend must not perform server lookups or cache management
- **Reasoning:** reduces frontend complexity, prevents over-fetching, and enables future server-specific logic (e.g. kitchen notes).

## Proposed Changes (Updated Plan)

### 1) Backend: Dedicated Server Get Order Details (BFF)
Create **`serverGetOrderDetails.js`** in `backend/src-plattr/functions/orders/`:
- Reuse core retrieval logic from `getOrder.js` (shared helper or copy with minimal divergence).
- Enrich response with `assignedServerName`:
  - Resolve `assignedServerId` (from order or table) to server profile name.
  - Return in response as `assignedServerName` (and optionally `assignedServerId` for reference).
- Preserve required fields for UI:
  - `orderStatus`, `createdAt`, `updatedAt`, `tableId`, `total`, `notes`, `carts`
  - Each cart includes `status`, `items`, `checkoutTime`, `notes`, etc.
- Register as `server-getOrderDetails` in index exports and update API routing if needed.

### 2) Order Details UI Restructure (Flutter)
File: `lib/pages/orders_home/order_detail_screen.dart`
- Replace flat items list with cart sections using `ExpansionTile`.
- Each cart tile shows:
  - Cart status chip (reuse `_buildStatusChip`).
  - Cart metadata (checkout time, notes if present).
- Render items inside each cart:
  - Reuse existing item UI for name/qty/variants/addons.
  - Adapt to cart item shape in `order-getOrder` response.
- Header update:
  - Order number, table ID, order status chip
  - Created/updated timestamps
  - Total and notes
  - Assigned server name (from new endpoint), fallback “Unassigned”.

### 3) Actions
**No global actions** (per requirement).
- **Cart-level only:**
  - SERVED: `OrderApiService.markCartAsServed` (per cart).
  - **Strictly respect VALID_TRANSITIONS**: hide/disable action if transition invalid.
- **Item-level actions:**
  - UI must allow marking individual items as served/delivered (checkbox or tap).
  - Action availability must respect item-level valid transitions.
- **Order-level:**
  - Cancel order (confirmation) remains allowed.

### 4) Error UX
- If refresh fails, keep last-known `_orderDetail`.
- Show a non-blocking error banner or SnackBar.
- Keep refresh action available.

### 5) Item-Level Delivery Endpoints (Backend/Frontend)
If an item-level deliver endpoint exists, wrap it in `OrderApiService` and wire the UI.
If no such endpoint exists:
- Create a server-specific endpoint (naming similar to `server-markItemServed`) to update item status.
- Document valid transitions and return updated order/cart state.

## Risks / Dependencies
- Cart item schema in `order-getOrder` must be validated to ensure UI matches the returned structure.
- Cart status transitions must respect backend `VALID_TRANSITIONS`.
- If server app needs additional fields (assigned server, per-item status), a server-specific endpoint may be necessary.

## Verification / Testing
- Manual:
  - Open order details from Orders tab and verify cart grouping.
  - Confirm READY updates all eligible carts.
  - Confirm SERVED updates only targeted cart.
  - Confirm CANCELLED updates order status.
  - Simulate network failure to validate error banner and cached view.
- Optional: add lightweight widget tests for cart rendering if test harness is available.

## Open Questions for Review
1) **Item-level status API**
   - Which backend endpoint should be used for item served/delivered?
   - If none exists, is it acceptable to create a **server-specific** function (e.g. `server-markItemServed`)?
2) **Item status schema**
   - What is the canonical item-level status field (`status`, `deliveryStatus`, etc.) and valid transitions?
3) **UI placement**
   - Cart actions inline per cart (preferred) or in a bottom sheet?

## Review Clarifications (Resolved)
- **Item-level action endpoint:** create a **server-only** function if none exists; it may internally reuse existing logic.
- **Item status schema:** use `item.status` in cart items (same fulfillment enum as carts).
- **Valid transitions:** reuse the cart VALID_TRANSITIONS for item status.
- **Action placement:** cart actions inline within each cart section.
- **Served carts:** should be **collapsed by default** in the UI.

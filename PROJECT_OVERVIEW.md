# Plattr Pro RMS - Unified PRD

## 1. Vision
Enable fast, accurate in-restaurant ordering and fulfillment through a coordinated set of apps for customers, servers, kitchen staff, and admins. The system should reduce table wait time, minimize order mistakes, and keep all staff aligned on real-time order state.

## 2. Goals
- Seamless customer onboarding via QR and OTP.
- Real-time, reliable order lifecycle from customer to kitchen to server.
- Clear operational visibility across tables and orders.
- Easy menu and staff management for restaurant admins.
- Multi-tenant design to support many restaurants with isolated data.

## 3. Non-goals
- Loyalty programs, CRM, or marketing automation.
- Payroll or scheduling tools for staff.
- Deep analytics beyond operational reporting.

## 4. Personas
- Customer: scans QR, browses menu, orders, and tracks status.
- Server/Waiter: manages tables, order delivery, and menu availability.
- Kitchen Staff: prepares items and updates order status.
- Admin/Manager: configures menu, tables, staff, and reviews operations.

## 5. Product Structure

### 5.1 Consumer App (Customer-Facing)
**Core outcomes**
- Join a table session quickly and safely.
- View and customize menu items.
- Place orders and track fulfillment.

**Key requirements**
- QR scan entry to a table.
- OTP-based validation with optional name/phone capture.
- Session restore for returning users while the session is active.
- Menu browsing with categories, variants, addons, stock status.
- Cart management: add, update quantity, remove, clear.
- Checkout with optional notes and confirmation.
- Order tracking with clear status labels.

**Nuances**
- OTP timing can be required at scan or at order, based on configuration.
- Multi-user sessions allow multiple customers at a table.
- Stock changes should be reflected quickly in the menu.

### 5.2 Server App (Waiter/Staff)
**Core outcomes**
- See active orders and tables at a glance.
- Deliver food quickly and confirm item delivery.
- Keep menu availability accurate.

**Key requirements**
- Orders view with visual status indicators and urgency cues.
- Table view with status, capacity, and quick actions.
- Table detail view: status updates, OTP refresh, order history.
- Order detail view: multi-cart orders, item delivery checks, item removal.
- Menu availability toggles with confirmation.
- Session-based staff login with expiry handling.
- Notifications for READY items and new order assignment.

### 5.3 Kitchen App
**Core outcomes**
- Focused view of active orders.
- Simple flow to update item/cart status.

**Key requirements**
- Active orders list filtered by relevant states.
- Status updates through the preparation pipeline.
- Clear differentiation between new, preparing, ready, and served.

### 5.4 Admin App
**Core outcomes**
- Configure the restaurant without engineering help.
- Monitor operations and staff behavior.

**Key requirements**
- Menu management: categories, items, variants, addons, pricing, stock.
- Table management: add/edit tables, set capacity, control status.
- Staff management: create/update server profiles and assignments.
- Order oversight: view active and historical orders.

## 6. High-Level Data Flow

### 6.1 Table Access and Session
1. Customer scans a table QR code.
2. System validates table state and optional location.
3. If OTP is required, customer enters OTP and any required profile details.
4. A session is created or joined; table becomes active.
5. Session expires or ends when the bill is closed or inactivity threshold is reached.

### 6.2 Menu to Cart
1. Customer loads the menu for the restaurant.
2. Customer selects items with variants/addons.
3. System validates selections and stock, then updates cart totals.

### 6.3 Checkout to Order
1. Customer confirms cart and submits checkout.
2. Cart snapshot is created and attached to an order.
3. Cart is cleared for continued ordering if needed.
4. Order becomes visible to kitchen and server apps.

### 6.4 Fulfillment
1. Kitchen updates preparation status.
2. READY status notifies server staff.
3. Server marks delivered items.
4. Order closes when all items are served or resolved.

## 7. State Models

### 7.1 Table State
- Vacant: available for new customers.
- OTP Pending: OTP generated, awaiting validation.
- Active: session in progress.
- Disabled: unavailable by admin control.
- Reserved: supported in UI; confirm final operational policy.

### 7.2 Session State
- Active: valid and usable.
- Expired: timed out or invalid.
- Ended: closed after settlement or staff action.

### 7.3 Order State
- In Progress: active order lifecycle.
- Completed: paid and closed.
- Cancelled: terminated before completion.

### 7.4 Cart/Item Fulfillment State
- Pending -> Preparing -> Ready -> Served
- Cancelled and Returned are terminal outcomes.

## 8. Configuration and Behavior Flags
- OTP required at scan vs at order time.
- Username required vs optional.
- Multi-user session support on/off.
- Advanced customization (multiple variants/addons) on/off.
- Server notifications enabled/disabled.

## 9. Scenarios and Edge Cases

### 9.1 Customer Onboarding
- Table disabled: show clear denial and guidance to pick another table.
- Location mismatch: prompt to retry with location enabled.
- OTP expired: show retry flow and regenerate OTP.
- Secondary user joins: requires OTP and respects multi-user rules.

### 9.2 Ordering
- Item out of stock during add-to-cart: show error and refresh item state.
- Cart empty on checkout: block and prompt to add items.
- Price mismatch or invalid configuration: request cart refresh.

### 9.3 Fulfillment
- Kitchen marks READY but server is offline: notification should queue or be re-delivered.
- Items partially served: order remains active until all items resolved.
- Item returned after served: reflect in order history.

### 9.4 Staff Ops
- Session expired mid-shift: prompt re-authentication with minimal disruption.
- Table status conflicts: resolve with latest update and visible audit trail.
- Menu availability toggled during active orders: should not mutate existing carts.

## 10. Notifications
- READY items should trigger server notifications.
- New order assignment should notify responsible server.
- Optional future notifications: table assistance requests, out-of-stock alerts.

## 11. Security and Privacy
- Customer phone numbers and names stored only for session and visit tracking.
- Session tokens must be short-lived and revocable.
- Staff actions should be auditable by role.





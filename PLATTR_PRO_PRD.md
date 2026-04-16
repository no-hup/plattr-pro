# Plattr Pro RMS – Product Requirements Document (PRD)

Status: Living Document
Audience: Product, Ops, Engineering

## 1. Vision
Plattr Pro digitizes in-restaurant dining by connecting customers, servers, kitchen staff, and managers in a single real-time workflow. The system reduces table wait time, prevents order mistakes, and keeps staff aligned on the true state of each table and order.

## 2. Objectives
- Fast customer onboarding through QR and OTP.
- Accurate, low-friction ordering and customization.
- Real-time visibility for kitchen and servers.
- Simple restaurant configuration for admins.
- Multi-tenant scalability with data isolation per restaurant.

## 3. Scope
**In scope**
- Table onboarding and session control
- Menu browsing and item customization
- Cart and checkout workflows
- Kitchen fulfillment and server delivery
- Staff table and order management
- Admin configuration of menu, tables, and staff

**Out of scope**
- Payments and invoicing
- Loyalty and CRM
- Payroll and scheduling
- Advanced analytics beyond operational reporting

## 4. Personas
- **Customer**: wants fast access, clear menu, and reliable order tracking.
- **Server/Waiter**: needs quick table and order control with minimal taps.
- **Kitchen Staff**: needs a focused queue and easy status updates.
- **Admin/Manager**: needs configuration controls and operational oversight.

## 5. Product Principles
- Speed over complexity for staff workflows.
- Consistency of order status across all apps.
- Minimal friction at table onboarding.
- Safe defaults with confirmations for destructive actions.
- Clear recovery paths for errors and edge cases.

## 6. System Overview
Plattr Pro consists of four apps working against a shared backend:
- **Consumer App**: customer QR access, menu, cart, checkout, and tracking.
- **Server App**: waiter operations for tables and orders.
- **Kitchen App**: order preparation and readiness updates.
- **Admin App**: restaurant configuration and oversight.

The backend maintains shared data objects (restaurants, tables, sessions, menus, carts, orders, and staff) and broadcasts real-time state changes to each app.

## 7. High-Level Data Flow

### 7.1 Table Access and Session
1. Customer scans a table QR.
2. System validates table availability and location (if enabled).
3. If required, OTP is requested and validated.
4. A session is created or joined; table becomes active.
5. Session ends when the order is closed or after inactivity.

### 7.2 Menu to Cart
1. Customer opens the menu for the restaurant.
2. Customer selects items with variants and addons.
3. System validates selection and stock, updates totals.

### 7.3 Checkout to Order
1. Customer confirms cart and checks out.
2. A cart snapshot is attached to an active order.
3. Order becomes visible to kitchen and server apps.
4. Cart is cleared for future rounds at the same table.

### 7.4 Fulfillment to Completion
1. Kitchen updates preparation status.
2. READY items notify servers.
3. Servers mark items served.
4. Order closes when all items are resolved.

## 8. Functional Requirements

### 8.1 Consumer App (Guest)
**Must have**
- QR entry with table verification.
- OTP flow with configurable requirements.
- Session restore while valid.
- Category-based menu browsing.
- Customization (variants, addons).
- Cart management and checkout.
- Live order tracking with clear status labels.

**Should have**
- Search and filter within menu.
- Lightweight offline handling and retry UX.
- Clear error recovery for invalid OTP or session expiry.

### 8.2 Server App (Staff)
**Must have**
- Orders list with status indicators and sorting by urgency.
- Tables list with capacity and status.
- Table detail view with status controls and OTP refresh.
- Order detail view with multi-cart history and item delivery checks.
- Menu availability toggles.
- Session-based staff login with expiry handling.
- Notifications for READY items and new orders.

**Should have**
- Assignment filtering (“my tables”).
- Historical order view per table.
- Clear offline or stale data indicators.

### 8.3 Kitchen App
**Must have**
- Active orders queue sorted by recency and priority.
- Status updates across the preparation pipeline.
- Clear visibility into item-level notes and modifications.

**Should have**
- Filters by table or server.
- Large format display for shared kitchen screens.

### 8.4 Admin App
**Must have**
- Menu management: categories, items, variants, addons, pricing, stock.
- Table management: add/edit tables, capacity, status.
- Staff management: create/update servers and assignments.
- View active orders and operational status.

**Should have**
- Historical orders with filtering and export.
- Role-based permissions for managers vs staff.

## 9. Shared Platform Concepts

### 9.1 Multi-Cart Order Model
Orders behave like a shared table tab. Each checkout creates a cart snapshot that rolls up into a single order total. This supports multi-round ordering without starting a new bill.

### 9.2 Menu and Inventory
- Items can be in or out of stock.
- Variants and addons affect price and customization rules.
- Availability changes should propagate quickly to customers.

### 9.3 Sessions
- Sessions link customers to a table and enable shared ordering.
- Multi-user sessions may be enabled or disabled.
- Session validity is time-bound and ends on inactivity or order closeout.

## 10. State Models

### 10.1 Table State
- Vacant → OTP Pending → Active → Vacant
- Disabled is an admin override state
- Reserved is supported in UI; operational policy must be finalized

### 10.2 Session State
- Active
- Expired
- Ended

### 10.3 Order State
- In Progress
- Completed
- Cancelled

### 10.4 Fulfillment State (Cart/Item)
- Pending → Preparing → Ready → Served
- Cancelled and Returned are terminal outcomes

## 11. Notifications and Real-Time Updates
- READY items notify servers.
- New order assignment should notify the responsible server.
- Optional future alerts: table assistance, low stock, or out-of-stock events.

## 12. Edge Cases and Scenarios

### 12.1 Customer Onboarding
- Table disabled: user is blocked with clear guidance.
- Location mismatch: user prompted to retry with location enabled.
- OTP expired: user retries with a regenerated OTP.
- Secondary user joins: behavior follows multi-user rules.

### 12.2 Ordering
- Item goes out of stock mid-session: block add-to-cart and refresh menu state.
- Empty cart on checkout: block and prompt to add items.
- Invalid customization: show error and reset to valid choices.

### 12.3 Fulfillment
- READY marked while server offline: notification queued or visible in orders list.
- Partial serving: order remains open until all items resolved.
- Returned items: tracked in order history and totals.

### 12.4 Staff Ops
- Session expired mid-shift: re-auth flow with minimal disruption.
- Table status conflicts: resolve using most recent update and audit trail.
- Menu availability toggled during active orders: does not alter existing carts.

## 13. Operational Requirements
- Mobile-first performance for customer app.
- Clear offline and retry behavior for staff apps.
- Data isolation per restaurant.
- Auditability of staff actions (status changes, menu changes).

## 14. Success Metrics
- Time from QR scan to first order.
- Time from checkout to READY.
- Percentage of READY items served within SLA.
- Reduction in table turn time.
- OTP error rate and recovery rate.

## 15. Risks and Gaps
- Location validation may be simplified or disabled in some deployments.
- Historical order reporting may be limited in early releases.
- Notification reliability depends on device token integrity.
- Final naming alignment of statuses must be confirmed.

## 16. Open Decisions
- Final policy for reserved tables and how it interacts with OTP.
- Exact session timeout and inactivity thresholds.
- SLA targets for kitchen and server performance.


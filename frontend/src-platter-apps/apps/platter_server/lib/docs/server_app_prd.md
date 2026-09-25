# Server App PRD (Waiter/Staff)

> **The `pending` status is gone (2026-09-21).** A guest part way through signing in is now a
> HOLD on the table's code — `currentOTP.expiresAt` is when the claim lapses, not when the
> code dies, and the code itself does not expire. Derived where it is needed rather than
> stored, so it lapses with nothing having to run. Full reasoning and blast radius:
> `moonshot/reviews/2026-09-21-otp-and-table-state.md`.

## Overview
- Purpose: waiter-facing app to manage tables, orders, and menu availability for in-restaurant service
- Primary users: servers/waiters and shift leads; secondary: floor manager
- Success criteria: faster table turn time, fewer missed READY orders, accurate table status, real-time menu availability
- In-scope: orders tab, tables tab, menu tab, session auth, notifications, core backend integrations
- Out-of-scope: deep analytics, staff payroll, customer CRM (nice-to-have later)

## Core User Journeys
- Orders: list active orders -> open order details -> mark cart READY/SERVED or cancel order -> refresh list
- Tables: list tables -> open table detail dialog -> update status, refresh OTP, view active order
- Menu: list categories/items -> toggle availability with confirmation -> immediate UI update
- Menu: Add-ons section -> switch a shared add-on off with confirmation -> it leaves every dish that offers it (D6)

## Must-Have Requirements (Critical)
- Orders list with status indicators and item pills; real-time refresh (manual + pull-to-refresh minimum)
- Table list with status color coding and current order indicator
- Table details dialog with OTP refresh, status change, and "View Order" shortcut
- Menu availability toggle with confirmation and immediate UI feedback, for dishes and for shared add-ons
- Session-based auth with expiry handling and retry UX for expired sessions

## Orders Tab PRD
- Display: active orders sorted by urgency/status; show orderId, tableId, and item status pills
- Detail view: multi-cart display with item list, variants/addons, status chips
- Actions: mark READY (cart-level updates), cancel one dish (`cart-updateCartStatus` with `cartItemId`), cancel order
  (`order-updateOrderStatus` CANCELLED). Every cancel takes the dish off the till bill and the kitchen, audited, no PIN;
  a printed bill refuses it and names the bill (D4, 2026-09-25). No Mark Paid: the till owns payment.
- Error states: offline or backend failure should show error banner but keep cached list
- Suggestion: add "Only my assigned orders" filter (serverId) and "Ready" first sorting

## Tables Tab PRD
- Display: grid of tables with capacity, status, and active order badge
- Detail dialog: status change buttons, OTP display + refresh, quick link to active order
- Rules: OTP only for vacant tables; show error if OTP refresh attempted when not vacant
- Statuses: active, vacant, reserved, disabled (from backend enum; `pending` was removed 2026-09-21)
- Reserved = staff-held: customers scanning it are told to ask staff (403). Set the table
  to Vacant to seat a party. See PRD 16.1 and tables_home/README.md.
- Suggestion: add table grouping by section/floor + search by tableId

## Menu Tab PRD
- Display: categories with item cards (image, name, price, availability)
- Actions: toggle availability with confirmation; reflect change immediately in list
- Backend nuance: availability update uses flat payload (no data envelope)
- Error handling: show toast/snackbar and revert switch if update fails
- Suggestion: add low stock badge and bulk out-of-stock per category
- **Add-on stock** (D6, 2026-09-25). 20:00 the kitchen runs out of raita and tells the waiter. The Menu tab opens
  with "Add-ons (N)"; the waiter switches Extra Raita off and confirms ("It comes off every dish that offers it").
  It is the shared add-on record the admin app switches too, so every biryani drops it on the guest menu and a
  cart holding it is refused at send. Same endpoint as dish stock, with `addonId`; one audit row names the waiter.
  *Without this raita keeps selling until someone finds the manager.* Prices and names stay admin-only.

## Notifications and Realtime
- Must-have: push notification for order READY and new order assigned to server
- Behavior: tapping notification deep-links to order detail
- Suggestion: add in-app notification tray and "acknowledge" action for READY alerts

## Data and Backend Integration
- APIs: order-getActiveOrdersForRestaurant, order-getOrder, cart-updateCartStatus, order-updateOrderStatus
- APIs: table-getTablesForRestaurant, table-getTableDetails, table-updateTableStatus, table-generateTableOTP
- APIs: menu-getRestaurantMenu, menu-updateMenuItemAvailability
- Firestore collections: restaurants/{restaurantId}/{orders,tables,menus,sessions,servers}
- Suggestion: add lightweight cached state to reduce perceived load time (last known good data)

## UX and Design Guidelines
- Fast scanning: color-coded status chips and table cards
- Minimal taps: single-tap to detail, single action for READY per cart
- Safe actions: confirm destructive actions (cancel, disable table, mark unavailable)
- Accessibility: readable labels for busy staff, large tap targets

## Edge Cases and Error Handling
- Session expired -> show re-auth prompt; preserve last known screen
- Partial failures: allow UI with stale data + visible error banner
- Network loss: display offline state; disable destructive actions
- Data mismatch: if order has no active carts, hide or label as completed

## Operational and Security Notes
- Roles: server vs manager (manager can reassign tables and override statuses)
- Audit: store who changed table status and who toggled item availability
- Must-have: rate-limit or debounce availability toggles to avoid accidental spam

## Onboarding Notes (Dev/PM)
- Feature structure: each tab has screen + provider + API service; state via ChangeNotifier
- Sequence flow docs: frontend/src-platter-apps/apps/platter_server/lib/docs/server_app_*_flow.puml
- Primary file entry points: frontend/src-platter-apps/apps/platter_server/lib/main_navigation.dart

## Future Enhancements (Nice-to-Have)
- Table assignment to servers with workload balancing
- Deliver all items bulk action per cart
- Table timeline (last status change, last order time)
- Staff performance metrics and shift handoff notes

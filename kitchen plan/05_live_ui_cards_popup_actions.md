# 05 Kitchen UI Behavior (Live Tab)

## Overview
Define the behavior of the "Live" tab, which is the core operational view for the kitchen. This includes the card-based layout, interaction flows (popups), and status updates (Ready, Cancel, Out of Stock).

## In-Scope
-   **Card Layout**: displaying active carts/orders.
-   **Popup Interaction**:
    -   Click card -> Open details popup.
    -   Show all dishes in the cart.
-   **Actions**:
    -   **Mark Ready**: Update dish status -> Notify waiter.
    -   **Cancel Dish**: Select items -> Cancel.
    -   **Out of Stock**: Mark item unavailable -> Update Menu Item `inStock` = false.
-   **Notifications**: Triggering "Waiter Notification" on "Mark Ready".

## Out-of-Scope
-   Complex order editing (like adding new items) - strictly status management here.

## Requirements & Nuances
-   **Card Based Minimal UI**: Clean, high contrast, easy to read active orders.
-   **Status Granularity**:
    -   Status change happens at the **Dish Level**, not just Cart Level.
-   **Out of Stock**:
    -   Requires Item ID.
    -   Action: API call to set `inStock: false`.
    -   **Visual Indicator**: Items already marked "Out of Stock" must appear greyed out on cards.
    -   **TODO**: Add TODO for "Automatic stock reset / TTL" (e.g., reset stock next day).
-   **Dish Canceled**:
    -   **Reason Required**: Must capture reason via **dropdown** with hardcoded options (e.g., "Out of ingredients", "Customer changed mind", "Quality issue").
    -   Backend receives reason as text string.
    -   Must update backend status to `CANCELLED`.

## Open Questions / Decisions Needed
-   Does "Mark Ready" apply to the whole cart if all items are ready? *Assumption*: Yes, auto-update cart status if all items are done.
-   *Confirmed*: Notification triggers to server/waiter happen purely on status change logic on the backend.

## Dependencies
-   **Task 03**: Navigation shell.
-   **Task 04**: Shared networking for API calls.
-   **Backend**: Endpoints for `updateOrderItemStatus`, `updateMenuItemStock`.

## Acceptance Criteria
-   [ ] Live tab renders list of "Order Cards".
-   [ ] Tapping a card opens a modal/popup with item details.
-   [ ] "Mark Ready" button updates status and closes popup (or updates UI).
-   [ ] "Out of Stock" action updates menu item availability.
-   [ ] "Cancel Dish" flow allows selecting specific items to cancel.

# 07 Configurable Views, Notes, Grouping & History

## Overview
Design the system to support backend-driven "Configurable UI Views" (Cart-based vs Item-based) and ensure critical information like "Customer Notes" is displayed correctly across these views. Also cover the "History" tab requirements.

## In-Scope
-   **View Types**:
    -   `cart_view` (Default): Show whole cart as a card.
    -   `item_view` (Granular): Show individual items.
-   **Backend Control**: The API response determines the `widgetType`.
-   **Notes Visibility**: Handling "Cart Notes" vs "Item Notes".
-   **Grouping**: Grouping items by Cart ID in `item_view`.
-   **History Tab**: Displaying past orders.

## Out-of-Scope
-   Frontend "toggles" for view type (unless backend allows user override). *Assumption*: Backend dictates default, maybe user can toggle locally? *Requirement says "Backend-driven"*.

## Requirements & Nuances
-   **Configurable View Types**:
    -   API field: `widgetType`: `'cart' | 'item'`.
    -   If `cart`: Render `CartCardWidget`.
    -   If `item`: Render `ItemCardWidget`.
-   **Item-Level View Nuances**:
    -   **Grouping**: Even in item view, items from the same cart should be visually grouped or adjacent to provide context.
    -   **Notes**:
        -   Item-specific note: Show on item.
        -   Cart-level note: Must be visible. In `item_view`, if a cart note exists, it might need to repeat on every item OR show once in a group header.
            -   *Requirement*: "Show note for any one item in that cart". A bit ambiguous. Better approach: Group items by Cart in UI loop, show Cart Header (Table #, Server, Note) -> List of Items.
-   **History**:
    -   List of Served/Cancelled orders.
    -   Filter by Date/Time (Start with "Today").

## Open Questions / Decisions Needed
-   How do we handle a mix? Stick to the **simple approach** for now (global switch based on `widgetType`).
-   **History Retention**: 24 hours.
-   **Tech Debt**: Plan to make history retention/pagination configurable at the UI layer in the future.

## Dependencies
-   **Task 06**: Data contract implementation.
-   **Backend**: `widgetType` logic in response.

## Acceptance Criteria
-   [ ] App respects `widgetType` from backend.
-   [ ] `item_view` correctly groups items by cart ID.
-   [ ] Customer notes are visible in both views (never hidden).
-   [ ] History tab shows list of completed orders with minimal details.

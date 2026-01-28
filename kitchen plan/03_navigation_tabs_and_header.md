# 03 Navigation, Tabs & Header

## Overview
Establish the main navigation structure for the Kitchen App, consisting of a tabbed layout ("Live" and "History") and a consistent header displaying context (Restaurant/Kitchen Name) and category filters.

## In-Scope
-   **Main Shell**: Bottom or Top tab navigation (likely Bottom for consistency, or Top if mirroring specific Server app usage). *Decision*: Follow Server app's tab style.
-   **Tabs**:
    1.  **Live**: Active orders/carts.
    2.  **History**: Completed/Served orders (served within X hours).
-   **Header**:
    -   Display "Restaurant Name - Kitchen Name".
    -   Category Filter dropdown/selector (e.g., "Bar", "Kitchen").
    -   *Extension*: Support dynamic categories fetched from backend.

## Out-of-Scope
-   Detailed content of the tabs (handled in tasks 05 & 07).
-   **Logout**: Accessible via a Header icon. Tapping it must trigger a confirmation popup ("Yes" / "No").

## Requirements & Nuances
-   **Tab Layout**:
    -   Use `Scaffold` with `BottomNavigationBar` (or `TabBar` if top tabs preferred/used in Server app).
    -   Persistent state: Switching tabs should not reload data unnecessarily (use `AutomaticKeepAliveClientMixin` or `IndexedStack` if appropriate, but be mindful of memory for long lists).
-   **Header**:
    -   **Dynamic Categories**: Do NOT hardcode "Bar" and "Kitchen".
    -   Fetch categories from backend (or config).
    -   **TODO**: Add placeholder for "subcategories inside kitchen category".
    -   **Flag**: Raise discussion point - "Should there be additional categories for certain restaurant types?"
-   **Navigation State**:
    -   Selected category must persist when switching tabs? *Assumption*: Yes, context is key.

## Open Questions / Decisions Needed
-   Does the header category filter affect both Live and History tabs? *Assumption*: Yes.
-   **Logout**: Header icon with "Yes/No" confirmation popup.

## Dependencies
-   **Task 02**: User must be logged in to see this screen.
-   **Backend**: Kitchen categories list will be included in an existing API response (e.g., login config or active-carts response). No separate endpoint.

## Acceptance Criteria
-   [ ] App launches into the "Live" tab by default.
-   [ ] User can switch between "Live" and "History".
-   [ ] Header displays correct Restaurant and Kitchen names.
-   [ ] Category selector allows switching between "Bar", "Kitchen", etc.
-   [ ] TODO comment added regarding subcategories.

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
-   [x] App launches into the "Live" tab by default.
-   [x] User can switch between "Live" and "History".
-   [x] Header displays correct Restaurant and Kitchen names.
-   [x] Category selector allows switching between "Bar", "Kitchen", etc.
-   [x] TODO comment added regarding subcategories.

## Implementation Notes (Added during implementation)

### Files Created:
- `lib/main_navigation.dart` - Main shell with tabbed navigation
- `lib/widgets/kitchen_app_bar_widget.dart` - Shared app bar with category selector
- `lib/widgets/kitchen_app_bar_configuration.dart` - Configuration for app bar customization
- `lib/pages/live/live_orders_screen.dart` - Placeholder for live orders (Task 05)
- `lib/pages/history/history_screen.dart` - Placeholder for history (Task 07)

### Key Implementation Details:
- Uses `BottomNavigationBar` for tab navigation (following Server app pattern)
- Uses `IndexedStack` for persistent tab state (no data reload on tab switch)
- Category filter persists across tab switches
- Logout button in header with Yes/No confirmation dialog
- Categories are configurable via `initialCategories` parameter (defaults to ["Kitchen", "Bar"])
- `AutomaticKeepAliveClientMixin` used in tab screens for state preservation

### TODO markers added:
1. Fetch dynamic categories from backend (login config or active-carts response)
2. Add support for subcategories inside kitchen category
3. FLAG: Discussion point - "Should there be additional categories for certain restaurant types?"


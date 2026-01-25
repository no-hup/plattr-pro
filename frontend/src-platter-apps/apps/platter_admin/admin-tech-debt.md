This file is for listing down the admin(admin related operations at the restaurant) related tech debt

Backend related tech debt


Frontend related tech debt

### 1. Historical Orders Viewer with Pagination
**Priority:** Low (Future Feature)
**Source:** Server App Orders Home Redesign Discussion (Jan 2026)
**Description:**
The admin app should eventually support viewing historical orders with:
- Date-range filtering (custom start/end dates)
- Paginated results for large datasets
- Search/filter by table, server, order status
- Export functionality (CSV/PDF)

**Current State:**
- Server app shows only active orders and last 6 hours of served carts
- No historical order viewer exists in admin app

**Action:**
- Design admin orders history page
- Implement backend endpoint with date-range filtering and cursor-based pagination
- Consider Firebase extensions for data export
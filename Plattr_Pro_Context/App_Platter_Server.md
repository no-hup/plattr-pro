# App: Platter Server (Waiter)

> Last verified against code: 2026-04-08
> Source: `apps/platter_server/lib/` directory structure, actual `.dart` files, `api_constants.dart`

---

## Purpose

Waiter-facing app for managing tables, orders, and menu availability during restaurant service. Primary users: servers/waiters and shift leads.

**Success criteria:** Faster table turns, fewer missed READY orders, accurate table status, real-time menu availability.

---

## Architecture: Feature-First Hybrid (Verified)

```
lib/
├── config/                          # App configuration
├── core/
│   └── page_type_identifier.dart    # PageType enum for navigation
├── di/                              # GetIt dependency injection setup
├── network/
│   ├── api_constants.dart           # All API endpoint paths
│   ├── dio_client.dart              # App-specific Dio singleton
│   ├── errors/                      # Custom exception types
│   └── interceptors/
│       ├── auth_interceptor.dart    # Injects session token
│       ├── error_interceptor.dart   # Standardized error handling
│       └── user_agent_interceptor.dart
├── pages/
│   ├── auth/                        ◄── Feature 1: Authentication
│   │   ├── login_screen.dart
│   │   ├── login_provider.dart      # extends BaseLoginProvider (from platter_core)
│   │   ├── models/
│   │   │   ├── login_request.dart
│   │   │   └── login_response_data.dart
│   │   └── repository/             # (implicit: uses LoginApiService from core)
│   │
│   ├── orders_home/                 ◄── Feature 2: Order Management
│   │   ├── orders_home_screen.dart  # Orders list UI
│   │   ├── order_detail_screen.dart # Multi-cart order detail
│   │   ├── orders_provider.dart     # ChangeNotifier for orders state
│   │   ├── repository/
│   │   │   └── order_api_service.dart
│   │   └── models/
│   │       ├── order_summary.dart        # List item model
│   │       ├── order_detail.dart         # Full order with carts
│   │       ├── order_detail_response.dart
│   │       ├── order_list_response.dart
│   │       ├── order_item_detail.dart    # Per-item detail
│   │       ├── cart_summary.dart         # Cart-level summary
│   │       ├── cart_item_summary.dart    # Cart item with variants/addons
│   │       ├── served_cart.dart          # Served cart model
│   │       ├── price_info.dart           # Price breakdown
│   │       ├── variant_detail.dart
│   │       ├── addon_detail.dart
│   │       └── ui_flags.dart             # UI state flags
│   │
│   ├── tables_home/                 ◄── Feature 3: Table Management
│   │   ├── tables_home_screen.dart  # Tables grid/list UI
│   │   ├── table_detail_dialog.dart # Table popup dialog
│   │   ├── tables_provider.dart     # ChangeNotifier for tables state
│   │   ├── repository/
│   │   │   └── table_api_service.dart
│   │   └── models/
│   │       └── table_models.dart    # TableModel, responses
│   │
│   └── menu_home/                   ◄── Feature 4: Menu Management
│       ├── menu_home_screen.dart    # Menu with availability toggles
│       ├── menu_provider.dart       # ChangeNotifier for menu state
│       └── repository/
│           └── menu_api_service.dart
│
├── session/                         # Session management
├── shared/                          # Shared utilities
├── singleton/                       # App-level singletons
├── widgets/                         # Reusable widgets
├── theme/                           # App theming
└── docs/                            # In-repo documentation
```

**Each feature follows the same pattern:**
1. `*_screen.dart` — UI widget
2. `*_provider.dart` — ChangeNotifier with business logic + state
3. `repository/*_api_service.dart` — Dio calls to backend
4. `models/*.dart` — JSON-serializable data models

---

## API Endpoints (Verified from `api_constants.dart`)

| Constant | Endpoint | Feature |
|----------|----------|---------|
| `serverLogin` | `/server-serverLogin` | Auth |
| `getActiveOrdersForRestaurant` | `/order-getActiveOrdersForRestaurant` | Orders |
| `getOrder` | `/order-getOrder` | Orders |
| `getOrderDetails` | `/server-getOrderDetails` | Orders |
| `updateOrderStatus` | `/order-updateOrderStatus` | Orders |
| `markCartAsServed` | `/order-markCartAsServed` | Orders |
| `getServedCartsForServer` | `/order-getServedCartsForServer` | Orders |
| `updateCartStatus` | `/cart-updateCartStatus` | Orders |
| `removeItemFromCart` | `/cart-removeItemFromCart` | Orders |
| `markItemServed` | `/server-markItemServed` | Orders |
| `getRestaurantTables` | `/table-getTablesForRestaurant` | Tables |
| `getTableDetails` | `/table-getTableDetails` | Tables |
| `updateTableStatus` | `/table-updateTableStatus` | Tables |
| `generateTableOTP` | `/table-generateTableOTP` | Tables |
| `getRestaurantMenu` | `/menu-getRestaurantMenu` | Menu |
| `updateMenuItemAvailability` | `/menu-updateMenuItemAvailability` | Menu |

---

## Feature Details

### Orders Tab
- **List:** Active orders sorted by urgency/status, shows orderId + tableId + status pills
- **Detail:** Multi-cart display, each cart as expandable section with items
- **Actions:** Mark cart SERVED, cancel order, remove item from cart
- **Models:** Rich model hierarchy — `OrderSummary` (list) → `OrderDetail` (detail) → `CartSummary` → `CartItemSummary` with `VariantDetail` + `AddonDetail`

### Tables Tab
- **List:** Grid/list of all tables with capacity + status color coding
- **Popup:** `TableDetailDialog` — status change, OTP display/refresh, view order link
- **OTP rules:** Only for `vacant` tables, 6-digit, 5-minute validity
- **Statuses rendered:** `active`, `vacant`, `disabled`, `pending` (see [[01_Business_Rules_and_States]])

### Menu Tab
- **Display:** Categories with item cards (uses shared models from `platter_core`)
- **Action:** Toggle availability with confirmation dialog
- **Backend note:** availability update uses `menu-updateMenuItemAvailability`
- **Error handling:** Toast/snackbar on failure, revert toggle

### Auth
- **Login:** Email/phone + password OR session-based re-auth
- **Provider:** `LoginProvider` extends `BaseLoginProvider` from platter_core
- **Session:** 12-hour expiry, auto-extended, stored via `SessionStorage`

---

## Network Layer (App-Specific)

The server app extends platter_core's `DioClient` with its own interceptors:

```
Request flow:
  App code → OrderApiService → Dio (server app singleton)
                                 ├── AuthInterceptor (injects session token)
                                 ├── ErrorInterceptor (standardized error handling)
                                 ├── UserAgentInterceptor (adds app version)
                                 └── [platter_core interceptors]
```

---

## State Management

All features use `ChangeNotifier` + `Provider`:
- `OrdersProvider` — manages orders list, selected order, loading states
- `TablesProvider` — manages tables list, selected table, OTP state
- `MenuProvider` — manages menu categories/items, availability toggles
- `LoginProvider` — manages auth state, session persistence

Each provider uses `DataState` enum from platter_core: `initial → loading → loaded → error`

---

## Key Technical Details

- **Dart SDK:** ^3.6.0 (newest among the 3 apps)
- **JSON serialization:** `json_annotation` + `json_serializable` (code gen, `.g.dart` files)
- **Does NOT use Freezed** (unlike Admin and Kitchen apps)
- **Uses `cloud_firestore`** directly (unlike Admin/Kitchen which don't)
- **No `shared_preferences`** (unlike Admin/Kitchen)
- **Has `connectivity_plus`** for network monitoring
- **Has `flutter_staggered_grid_view`** for table grid layout

---

## Tech Debt (from `server-tech-debt.md`)

Known items tracked in `frontend/src-platter-apps/apps/platter_server/server-tech-debt.md`.

---

## Cross-References

- [[00_Monorepo_Architecture]] — Shared platter_core dependency, tech stack
- [[01_Business_Rules_and_States]] — Cart status transitions, table states, pricing math
- [[02_Backend_and_Database]] — Cloud Functions consumed by this app
- [[App_Platter_Kitchen]] — Parallel app for kitchen side of fulfillment
- [[App_Platter_Admin]] — Admin app that configures what server app displays

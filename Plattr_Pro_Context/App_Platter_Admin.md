# App: Platter Admin

> Last verified against code: 2026-04-08
> Source: `apps/platter_admin/lib/` directory structure, actual API service files, provider files

---

## Purpose

Restaurant configuration and management app. Handles menu editing (categories, items, variants, addons), staff management, table operations, restaurant settings, and historical order viewing.

**Primary users:** Restaurant managers and admin staff.

---

## Architecture: Feature-First Hybrid (Verified)

```
lib/
├── main.dart                        # App entry point
├── firebase_options.dart            # Firebase config
│
├── config/
│   └── env.dart                     # Envied environment config (+ env.g.dart)
│
├── di/
│   └── di.dart                      # GetIt dependency injection
│
├── network/
│   └── network.dart                 # Network setup
│
├── state/
│   └── app_state.dart               # App-wide state
│
├── session/
│   └── session_manager.dart         # Session persistence
│
├── routes/
│   └── app_router.dart              # go_router config
│
├── theme/
│   └── app_theme.dart               # App theming
│
├── pages/
│   ├── auth/                        ◄── Feature 1: Authentication
│   │   ├── login_screen.dart
│   │   ├── login_provider.dart
│   │   ├── models/                  # Auth models
│   │   └── repository/             # Auth API service
│   │
│   ├── home/                        ◄── Feature 2: Dashboard
│   │   └── home_screen.dart         # Main navigation shell
│   │
│   ├── menu/                        ◄── Feature 3: Menu Management
│   │   ├── menu_catalog_screen.dart       # Full menu view
│   │   ├── menu_catalog_provider.dart     # ChangeNotifier for menu state
│   │   ├── menu_api_service.dart          # API calls to admin-* endpoints
│   │   └── editors/                       # CRUD dialogs for menu entities
│   │       ├── category_editor_dialog.dart
│   │       ├── subcategory_editor_dialog.dart
│   │       ├── dish_editor_dialog.dart    # Menu item create/edit
│   │       ├── variant_editor_dialog.dart
│   │       └── addon_editor_dialog.dart
│   │
│   ├── operations/                  ◄── Feature 4: Table Operations
│   │   ├── operations_screen.dart
│   │   ├── tables_provider.dart
│   │   └── tables_api_service.dart
│   │
│   ├── staff/                       ◄── Feature 5: Staff Management
│   │   ├── staff_screen.dart
│   │   ├── staff_provider.dart
│   │   └── staff_api_service.dart
│   │
│   ├── orders/                      ◄── Feature 6: Historical Orders
│   │   ├── orders_screen.dart
│   │   ├── orders_provider.dart
│   │   └── orders_api_service.dart
│   │
│   └── settings/                    ◄── Feature 7: Restaurant Settings
│       ├── settings_screen.dart
│       ├── settings_provider.dart
│       └── settings_api_service.dart
```

**Same pattern as Server app:** Each feature has a screen + provider + API service. Menu feature additionally has `editors/` subdirectory for CRUD dialog widgets.

---

## API Endpoints (Verified from API service files)

The Admin app uses **`admin-*` prefixed endpoints** — separate from the `table-*` / `order-*` endpoints used by the Server app.

### Menu Management
| API Service Method | Endpoint | Action |
|-------------------|----------|--------|
| `getRestaurantMenu` | `/menu-getRestaurantMenu` | Fetch full menu (shared endpoint) |
| `addCategory` | `/admin-addCategory` | Create new category |
| `updateCategory` | `/admin-updateCategory` | Edit category |
| `deleteCategory` | `/admin-deleteCategory` | Remove category |
| `addSubcategory` | `/admin-addSubcategory` | Create subcategory |
| `updateSubcategory` | `/admin-updateSubcategory` | Edit subcategory |
| `deleteSubcategory` | `/admin-deleteSubcategory` | Remove subcategory |

> Menu item CRUD (add/update/delete menu items, variants, addons) is handled through menu APIs but specific admin endpoints may vary. The editors exist in the UI.

### Table Operations
| API Service Method | Endpoint | Action |
|-------------------|----------|--------|
| `getTables` | `/admin-getTables` | List all tables |
| `updateTableStatus` | `/admin-updateTableStatus` | Enable/disable tables |
| `updateTable` | `/admin-updateTable` | Edit table properties |

### Staff Management
| API Service Method | Endpoint | Action |
|-------------------|----------|--------|
| `getServers` | `/admin-getServers` | List all staff |
| `addServer` | `/admin-addServer` | Create new server |
| `updateServer` | `/admin-updateServer` | Edit server details |
| `resetServerPin` | `/admin-resetServerPin` | Reset server PIN |

### Historical Orders
| API Service Method | Endpoint | Action |
|-------------------|----------|--------|
| `getHistoricalOrders` | `/admin-getHistoricalOrders` | Paginated order history with date filtering |
| `getOrderDetails` | `/admin-getOrderDetails` | Detailed order view |

### Restaurant Settings
| API Service Method | Endpoint | Action |
|-------------------|----------|--------|
| `getSettings` | `/admin-getRestaurantSettings` | Fetch restaurant settings |
| `updateSettings` | `/admin-updateRestaurantSettings` | Update settings |

---

## Multi-Tenant Interaction Pattern (Verified)

All API calls follow this pattern:
```dart
final response = await _dio.post(
  '/admin-{endpoint}',
  data: {
    'data': {
      'restaurantId': restaurantId,    // Always required
      'sessionId': sessionId,          // Always required
      // ... endpoint-specific fields
    }
  },
);
```

- **`restaurantId`** scopes every operation to the tenant
- **`sessionId`** authenticates the admin user
- Uses `DioClient().dio` from platter_core (shared singleton)
- All responses parsed through `ResponseParser.parse<T>()` from platter_core
- Error handling via `DioClient.handleDioError()` → `ApiResponse.error()`

---

## Shared Core Usage (Verified)

The Admin app heavily leverages `platter_core` models:

| platter_core Model | Used In |
|-------------------|---------|
| `FullRestaurantMenuResponse` | Menu fetching |
| `MenuItem`, `MenuCategory`, `MenuSubcategory` | Menu display and editing |
| `Variant`, `VariantOption`, `Addon` | Customization editing |
| `PriceInfo` | Price display and editing |
| `RestaurantSettings` | Settings screen |
| `DioClient` | All API calls |
| `ResponseParser`, `ApiResponse` | All response handling |
| `BaseLoginProvider` | Auth flow |
| `SessionStorage` | Session persistence |
| `DataState` | Loading state management |

---

## State Management

Feature-level `ChangeNotifier` + `Provider` pattern:
- `MenuCatalogProvider` — Full menu CRUD state
- `TablesProvider` — Table list and operations state
- `StaffProvider` — Staff list and CRUD state
- `OrdersProvider` — Historical orders with pagination
- `SettingsProvider` — Restaurant settings read/write
- `LoginProvider` — Auth state

---

## Menu Editing Flow

The menu feature is the most complex, with 5 specialized editor dialogs:

```
Menu Catalog Screen
├── Category list (add / edit / delete)
│   └── CategoryEditorDialog
├── Subcategory list (add / edit / delete)
│   └── SubcategoryEditorDialog
├── Menu Items (add / edit / delete)
│   └── DishEditorDialog
│       ├── Variant editing
│       │   └── VariantEditorDialog
│       └── Addon editing
│           └── AddonEditorDialog
```

Each dialog handles:
- Create (empty form)
- Edit (pre-populated from existing entity)
- Validation before save
- API call via `AdminMenuApiService`

---

## Key Technical Details

- **Dart SDK:** >=3.0.0 <4.0.0
- **Uses Freezed** for some models (unlike Server app)
- **Uses `shared_preferences`** for local key-value storage
- **Uses `firebase_analytics`**, `firebase_crashlytics`, `firebase_performance`** — full Firebase observability
- **Uses `firebase_core`** — Firebase initialization
- **Uses `dio_cache_interceptor`** — Response caching
- **Uses `collection`** package for collection utilities
- **Uses `intl`** for date/number formatting
- **Uses `fluttertoast`** for toast notifications
- **Has `flutter_native_splash`** and `flutter_launcher_icons`** configured
- **No direct Firestore usage** (all through Cloud Functions)

---

## Implementation Phases (from backend `index.js`)

The backend admin endpoints were rolled out in phases:
- **Phase 1-3:** Settings, menu CRUD (categories, subcategories)
- **Phase 4:** Staff management (getServers, addServer, updateServer, resetServerPin) + Table management (getTables, updateTableStatus, updateTable)
- **Phase 5:** Historical orders (getHistoricalOrders, getOrderDetails)

---

## Cross-References

- [[00_Monorepo_Architecture]] — Shared platter_core dependency, tech stack
- [[01_Business_Rules_and_States]] — State machines, pricing models used in menu editing
- [[02_Backend_and_Database]] — `admin-*` Cloud Functions, Firestore schema
- [[App_Platter_Server]] — Server app reads what Admin app configures
- [[App_Platter_Kitchen]] — Kitchen app displays orders from menu items Admin creates

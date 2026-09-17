# App: Platter Kitchen (KDS)

> Last verified against code: 2026-04-08
> Source: `apps/platter_kitchen/lib/` directory structure, `kitchen_live_provider.dart`, `kitchen_repository.dart`, `active_order_models.dart`, `kitchen_constants.dart`

---

## Purpose

Kitchen Display System (KDS) for order preparation tracking. Shows live order queue sorted by submission time, allows status updates across the preparation pipeline.

**Primary users:** Kitchen staff (line cooks, prep cooks, expeditors)

---

## Architecture: Layer-First (Verified)

Unlike the Server app's feature-first approach, Kitchen app organizes by **layer** at the top level:

```
lib/
├── main.dart                        # App entry point
├── main_navigation.dart             # Bottom navigation (Live, History)
├── firebase_options.dart            # Firebase config
│
├── config/
│   └── env.dart                     # Envied environment config
│
├── constants/
│   ├── constants.dart               # Barrel export
│   └── kitchen_constants.dart       # All app constants (see below)
│
├── core/                            ◄── Business Logic Layer
│   ├── core.dart                    # Barrel export
│   ├── extensions.dart              # Dart extensions
│   └── kitchen_repository.dart      # Central data access (currently mock)
│
├── models/                          ◄── Data Models (top-level, not per-feature)
│   ├── models.dart                  # Barrel export
│   ├── active_order_models.dart     # Freezed: ActiveKitchenCart, ActiveCartItem
│   ├── active_order_models.freezed.dart
│   └── order_models.dart            # KitchenOrder, KitchenCart, KitchenOrderItem
│
├── state/                           ◄── State Management Layer
│   ├── app_state.dart               # App-wide state
│   └── kitchen_live_provider.dart   # ChangeNotifier for live polling
│
├── network/
│   └── network.dart                 # NetworkService wrapper (minimal, WIP)
│
├── di/
│   └── di.dart                      # GetIt dependency injection
│
├── pages/                           ◄── UI Layer
│   ├── auth/
│   │   ├── login_screen.dart
│   │   ├── login_provider.dart
│   │   ├── models/                  # Auth-specific models
│   │   └── repository/             # Auth API service
│   ├── home/
│   │   └── home_screen.dart         # Shell/scaffold
│   ├── live/
│   │   └── live_orders_screen.dart  # Active tickets view
│   └── history/
│       └── history_screen.dart      # Completed orders
│
├── routes/
│   └── app_router.dart              # go_router configuration
│
├── session/
│   └── session_manager.dart         # Session persistence
│
├── logging/
│   └── logger.dart                  # App-specific logging
│
├── converters/
│   └── converters.dart              # Data converters
│
├── widgets/                         ◄── Reusable Widgets
│   ├── widgets.dart                 # Barrel export
│   ├── active_cart_card.dart        # Single ticket card
│   ├── live_order_card.dart         # Order card in live view
│   ├── item_view_list.dart          # Item list within a ticket
│   ├── status_badge.dart            # Status pill (StatusBadgeSize enum)
│   ├── time_badge.dart              # Time-since-submission badge
│   ├── order_details_dialog.dart    # Order detail popup
│   ├── kitchen_app_bar_widget.dart  # Custom app bar
│   ├── kitchen_app_bar_configuration.dart
│   ├── loading_overlay.dart         # Loading state overlay
│   ├── empty_state_widget.dart      # Empty state placeholder
│   └── debug_info_card.dart         # Debug info (dev only)
│
└── theme/
    ├── theme.dart                   # Barrel export
    ├── app_theme.dart               # Theme data
    └── design_system/
        ├── design_system.dart       # Barrel export
        ├── kitchen_colors.dart      # Color tokens
        ├── kitchen_dimensions.dart  # Spacing/sizing tokens
        └── kitchen_typography.dart  # Text styles
```

---

## KDS Polling Implementation (Verified)

### `KitchenLiveProvider` (`state/kitchen_live_provider.dart`)

```dart
class KitchenLiveProvider extends ChangeNotifier {
  Timer? _pollingTimer;
  List<ActiveKitchenCart> _activeCarts = [];
  KitchenViewType _currentViewType = KitchenViewType.cart;
  bool _sortAscending = true;  // FIFO: oldest first

  void startPolling({Duration interval = const Duration(seconds: 60)}) {
    _pollingTimer?.cancel();
    fetchActiveCarts(silent: false);  // Immediate first fetch
    _pollingTimer = Timer.periodic(interval, (_) => fetchActiveCarts(silent: true));
  }
}
```

**Key behaviors:**
- **Default poll interval:** 60 seconds (configurable)
- **Recommended interval from constants:** 30 seconds (`UiConstants.liveOrdersRefreshInterval`)
- **Silent refresh:** Subsequent polls don't show loading indicator
- **FIFO sorting:** Oldest submission first (ascending `submittedAt`)
- **Pull-to-refresh:** `refresh()` method triggers non-silent fetch
- **Auto-cleanup:** Timer cancelled on `dispose()`

### `KitchenRepository` (`core/kitchen_repository.dart`)

> **Corrected 2026-09-08: this is no longer mock.** The repository is fully wired to the
> backend through `network/kitchen_order_api_service.dart` + `network/api_constants.dart`,
> which call `order-getActiveCartsForKitchen` and `cart-updateCartStatus`. It raises
> `KitchenSessionExpiredException` and `KitchenCartTransitionException`. `NetworkService`
> is now only a small legacy shim. There are zero mock or `Future.delayed` references left
> in `core/kitchen_repository.dart`.

The repository provides:
- `getLiveOrders(restaurantId)` — Returns a `KitchenOrder` list from the live API
- `getActiveCarts(restaurantId)` — Returns `ActiveCartsResponse` (for Freezed models)

---

## Data Models (Verified)

### Active Order Models (Freezed — `models/active_order_models.dart`)

These are the **production** models used by `KitchenLiveProvider`:

**`ActiveKitchenCart`** — Represents one kitchen ticket/round:
| Field | Type | Notes |
|-------|------|-------|
| `cartId` | String | Unique cart identifier |
| `orderId` | String | Parent order |
| `orderNumber` | int | Display number (parsed robustly from various formats) |
| `tableNumber` | String | Table display label |
| `serverName` | String? | Assigned waiter name |
| `submittedAt` | DateTime | When this cart was checked out |
| `status` | `ActiveCartStatus` | See status mapping below |
| `items` | `List<ActiveCartItem>` | Line items |
| `kitchenNote` | String? | Kitchen-level note |

**Computed:** `isUrgent` — `true` if `submittedAt` was >20 minutes ago

**`ActiveCartItem`** — Line item on a ticket:
| Field | Type | Notes |
|-------|------|-------|
| `itemId` | String | Item identifier |
| `name` | String | Display name (defaults to 'Unknown Item') |
| `quantity` | int | Defaults to 1 |
| `modifiers` | `List<String>` | Variants/addons as display strings |
| `itemNote` | String? | Per-item note (reads from `notes`/`note`/`itemNote`) |
| `isVoided` | bool | Item has been voided |

### Kitchen Status Mapping (DIFFERENT from platter_core)

```dart
enum ActiveCartStatus { pending, cooking, ready, served, cancelled }
```

| Backend Value | Kitchen Enum | Notes |
|---------------|-------------|-------|
| `pending`, `ordered` | `.pending` | New tickets |
| `preparing`, `cooking`, `in_progress`, `in-progress` | `.cooking` | Being prepared |
| `ready`, `ready_for_pickup` | `.ready` | Ready for pickup |
| `served`, `completed`, `served_to_customer` | `.served` | Delivered |
| `cancelled`, `canceled`, `returned` | `.cancelled` | **Merges RETURNED into CANCELLED** |

> This is intentional: kitchen staff don't distinguish between returned and cancelled items. Both mean "stop working on it."

> **`AWAITING_CONFIRMATION` is absent on purpose.** Where a restaurant requires waiter
> confirmation, `order-getActiveCartsForKitchen` filters those carts out server-side, so
> the kitchen app never receives the value and needs no enum entry for it.
>
> ⚠️ If that filter is ever relaxed so unconfirmed carts are SHOWN here greyed out, fix
> these two first: `_parseStatus` in `models/active_order_models.dart` (`orElse`) and
> `_mapStatus` in `core/kitchen_repository.dart` (`default`). Both fall through to
> `.pending`, so an unconfirmed ticket would silently render as ordinary cookable work —
> the exact thing the gate exists to prevent. Neither throws.

### View Types
```dart
enum KitchenViewType { cart, item }
```
- **Cart view:** Group items by cart/ticket (default)
- **Item view:** Flat list of all items across carts

### Order Models (Non-Freezed — `models/order_models.dart`)

Simpler models used by the repository:
- `KitchenOrder` — Full order with carts
- `KitchenCart` — Cart within an order
- `KitchenOrderItem` — Individual item

---

## Constants (Verified from `kitchen_constants.dart`)

### API Constants
| Constant | Value | Purpose |
|----------|-------|---------|
| `defaultPageSize` | 20 | Pagination size |
| `orderTimeout` | 15 seconds | Fast operation timeout |
| `longOperationTimeout` | 60 seconds | Slow operation timeout |

### UI Constants
| Constant | Value | Purpose |
|----------|-------|---------|
| `snackbarDuration` | 4 seconds | Snackbar display time |
| `listItemAnimationDuration` | 200ms | List animations |
| `searchDebounce` | 300ms | Search input debounce |
| `liveOrdersRefreshInterval` | 30 seconds | Recommended polling interval |
| `historyWindow` | 8 hours | How far back history shows |

### Kitchen Feature Flags (Client-Side)
| Flag | Default | Purpose |
|------|---------|---------|
| `enableAutoRefresh` | `true` | Auto-poll for live orders |
| `enableSoundNotifications` | `false` | Sound on new order (not implemented) |
| `enableHapticFeedback` | `true` | Haptic on actions |
| `showDebugCards` | `true` | Debug info in UI (**TODO: set false for prod**) |

### Order Status Constants
```dart
activeStatuses = [pending, preparing, ready]    // Live tab
completedStatuses = [served, cancelled]          // History tab
```

### Kitchen Categories
```dart
defaultCategories = [kitchen, bar]    // TODO: fetch dynamically from backend
```

---

## Design System

The kitchen app has its own design system tokens in `theme/design_system/`:
- `kitchen_colors.dart` — Color palette
- `kitchen_dimensions.dart` — Spacing, sizing tokens
- `kitchen_typography.dart` — Text styles

This is separate from platter_core's `PlatterThemeService`, optimized for large-format kitchen displays.

---

## Implementation Status

| Feature | Status | Notes |
|---------|--------|-------|
| Live orders screen | Implemented | Uses `KitchenLiveProvider` |
| History screen | Implemented | Filtered by `completedStatuses` |
| Polling mechanism | Implemented | 60s default, 30s recommended |
| Active cart models (Freezed) | Implemented | Production-ready parsing |
| Network integration | Implemented (corrected 2026-09-08) | `KitchenOrderApiService` → `order-getActiveCartsForKitchen` |
| Cart status updates | Implemented (corrected 2026-09-08) | Mark-ready calls `cart-updateCartStatus`; verified end to end |
| Sound notifications | **Not implemented** | Flag exists but no implementation |
| Backend-driven categories | **Not implemented** | Uses hardcoded defaults |

---

## Key Technical Details

- **Dart SDK:** >=3.0.0 <4.0.0
- **Uses Freezed** for immutable models (unlike Server app)
- **Uses `shared_preferences`** (unlike Server app)
- **Uses `timeago`** package for relative time display
- **No direct Firestore usage** (unlike Server app)
- **Has `dio_cache_interceptor`** for response caching
- **Design system** is self-contained (not from platter_core)

---

## Cross-References

- [[00_Monorepo_Architecture]] — Shared platter_core dependency, tech stack differences
- [[01_Business_Rules_and_States]] — Kitchen-specific status mapping, urgency threshold
- [[02_Backend_and_Database]] — APIs that Kitchen will consume once mock is replaced
- [[App_Platter_Server]] — Server app handles the other side of fulfillment

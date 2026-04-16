# Monorepo Architecture

> Last verified against code: 2026-04-08
> Source of truth: `pubspec.yaml` files, `platter_core.dart` exports, actual `lib/` structures

---

## System Overview

Plattr Pro is a **real-time restaurant management system** with 4 apps and a shared backend:

| App | Role | Location |
|-----|------|----------|
| **Consumer App** | Customer QR ordering | `frontend/flutter_boilerplate/` (separate workspace) |
| **Server App** | Waiter table/order ops | `frontend/src-platter-apps/apps/platter_server/` |
| **Kitchen App** | KDS order prep | `frontend/src-platter-apps/apps/platter_kitchen/` |
| **Admin App** | Restaurant config | `frontend/src-platter-apps/apps/platter_admin/` |
| **Backend** | Firebase Cloud Functions | `backend/src-plattr/functions/` |

---

## Workspace Structure (Verified)

```
plattr-pro/
├── frontend/
│   ├── src-platter-apps/              # Flutter monorepo (manual, no Melos)
│   │   ├── apps/
│   │   │   ├── platter_server/        # Waiter app   (SDK ^3.6.0)
│   │   │   ├── platter_admin/         # Admin app    (SDK >=3.0.0 <4.0.0)
│   │   │   └── platter_kitchen/       # Kitchen app  (SDK >=3.0.0 <4.0.0)
│   │   └── modules/
│   │       ├── platter_core/          # Shared core  (SDK >=3.0.0 <4.0.0)
│   │       └── AnalyticsLogger/       # Analytics abstraction (not yet imported)
│   └── flutter_boilerplate/           # Consumer app (separate workspace)
├── backend/
│   ├── src-plattr/                    # Firebase Cloud Functions (Node.js)
│   └── claude-api-testing-workflow/   # E2E API test suite
└── plantuml-ext/                      # VS Code PlantUML extension (submodule)
```

**No workspace-level `pubspec.yaml` or `melos.yaml` exists.** Apps reference shared modules via path dependencies.

---

## Shared Core: `platter_core` (Verified from `platter_core.dart`)

All 3 apps declare this dependency:
```yaml
platter_core:
  path: ../../modules/platter_core
```

### Verified Exports (grouped by domain)

**Config:**
- `AppConfig` — Environment-aware base URL (`dev` → localhost:5002, `prod` → Cloud Functions URL)

**Network Layer:**
- `ApiResponse<T>` — Generic wrapper with `success`, `data`, `message`, `errorCode` fields
- `ResponseParser` — Parses Dio responses into `ApiResponse<T>`, handles both `{result: {...}}` and flat envelopes
- `DioClient` — Singleton Dio instance with 30s timeouts, JSON content type
  - Interceptors (in order): `LogInterceptor` → `ResponseGuardInterceptor` (debug only) → `InterruptFlowInterceptor`
- `ResponseGuardInterceptor` — Debug-mode detailed logging
- `InterruptFlowInterceptor` — Handles forced update, blocked user scenarios

**Auth:**
- `SessionStorage` — Secure credential persistence
- `LoginRequest` / `LoginResponseData` — Auth models
- `LoginApiService` — API calls for login
- `BaseLoginProvider` — Abstract ChangeNotifier for login state

**State Utilities:**
- `DataState` enum — `initial`, `loading`, `loaded`, `error`
- `Result` — Generic success/error wrapper

**Models (Menu Domain):**
- `MenuItem`, `MenuItemMeta`, `MenuCategory`, `MenuSubcategory`
- `PriceInfo` (basePrice, discount, finalPrice)
- `Addon`, `AddonMeta`, `Variant`, `VariantMeta`, `VariantOption`
- `NutritionalInfo`
- `FullRestaurantMenuResponse`, `UpdateMenuItemAvailabilityResponse`

**Models (Settings):**
- `RestaurantSettings` — Theme config + feature flags

**Models (Error):**
- `ApiError`

**Settings:**
- `SettingsApiService`

**UI:**
- `ErrorHandler`
- `PlatterLoginForm` — Shared login widget
- `PlatterThemeService`

**Converters:**
- `TimestampConverter`, `IdConverter`, `StatusUtils`

**Logging:**
- `AppLogger`, `FieldLogger`

### platter_core's Own Dependencies
| Package | Version | Purpose |
|---------|---------|---------|
| `dio` | ^5.3.3 | HTTP client |
| `logger` | ^2.5.0 | Structured logging |
| `flutter_secure_storage` | ^9.0.0 | Secure credential storage |
| `json_annotation` | ^4.8.1 | JSON serialization annotations |
| `cloud_firestore` | ^6.1.2 | Firestore SDK |

---

## Tech Stack Matrix (Verified from pubspec.yaml files)

| Concern | Package | Server | Admin | Kitchen | Core |
|---------|---------|:------:|:-----:|:-------:|:----:|
| **State Management** | `provider` ^6.1.1 | Y | Y | Y | — |
| **Routing** | `go_router` ^12.1.0 | Y | Y | Y | — |
| **HTTP Client** | `dio` ^5.3.3 | Y | Y | Y | Y |
| **HTTP/2** | `dio_http2_adapter` | Y | Y | Y | — |
| **Response Caching** | `dio_cache_interceptor` | — | Y | Y | — |
| **Secure Storage** | `flutter_secure_storage` ^9.0 | Y | Y | Y | Y |
| **Key-Value Storage** | `shared_preferences` | — | Y | Y | — |
| **Firestore** | `cloud_firestore` ^6.1.2 | Y | — | — | Y |
| **Firebase Analytics** | `firebase_analytics` | — | Y | Y | — |
| **Firebase Crashlytics** | `firebase_crashlytics` | — | Y | Y | — |
| **Firebase Performance** | `firebase_performance` | — | Y | Y | — |
| **Perf Dio** | `firebase_performance_dio` | Y | Y | Y | — |
| **DI** | `get_it` ^7.6.4 | Y | Y | Y | — |
| **JSON Serialization** | `json_annotation` ^4.8.1 | Y | Y | Y | Y |
| **Immutable Models** | `freezed_annotation` ^2.4.1 | — | Y | Y | — |
| **Code Gen** | `build_runner` | Y | Y | Y | Y |
| **Env Config** | `envied` ^0.5.1 | Y | Y | Y | — |
| **Logging** | `logger` ^2.5.0 | Y | Y | Y | Y |
| **Toast** | `fluttertoast` | — | Y | Y | — |
| **Package Info** | `package_info_plus` | Y | Y | Y | — |

---

## Architectural Patterns (Verified)

### State Management: Provider + ChangeNotifier
All 3 apps use `provider` ^6.1.1 with `ChangeNotifier` subclasses for state management. `platter_core` provides `BaseLoginProvider` as a shared abstract ChangeNotifier for auth.

### Dependency Injection: GetIt
All 3 apps use `get_it` ^7.6.4 as a service locator. Each app has a `lib/di/` directory for registration setup.

### Network: Dio Singleton from platter_core
- `DioClient` in platter_core provides the base singleton
- Apps add their own interceptors on top (e.g., Server app adds auth, error, user-agent interceptors)
- `ResponseParser.parse<T>()` standardizes response handling across all apps
- `ApiResponse<T>` wraps all parsed responses with success/error semantics

### Routing: go_router
All 3 apps use `go_router` ^12.1.0. Each app has a `lib/routes/` directory with its own route configuration.

### Serialization
- **Server app**: `json_annotation` + `json_serializable` (code gen)
- **Admin & Kitchen**: `freezed_annotation` + `freezed` for immutable models, plus `json_annotation`
- **platter_core**: `json_annotation` + `json_serializable`

---

## App Architecture Comparison (Verified)

| App | Organization | Business Logic Location |
|-----|-------------|------------------------|
| **platter_server** | Feature-first hybrid: `lib/pages/{feature}/` each with `repository/` and `models/` | API services in `repository/` dirs, state in providers |
| **platter_admin** | Feature-first hybrid: `lib/pages/{feature}/` with per-feature providers | Providers per feature (e.g., `MenuCatalogProvider`) |
| **platter_kitchen** | Layer-first: `lib/core/`, `lib/models/`, `lib/state/` at top level | `KitchenRepository` in `core/`, `KitchenLiveProvider` in `state/` |

All apps share:
- `lib/di/` — GetIt registration
- `lib/config/` — App configuration
- `lib/routes/` — go_router setup
- `lib/session/` — Session management
- `lib/theme/` — App theming

---

## Environment Configuration

Managed via `AppConfig` in platter_core:
- **Dev**: `http://localhost:5002/rms-app-dd875/us-central1` (Firebase Emulator)
- **Prod**: `https://us-central1-rms-app-dd875.cloudfunctions.net`
- Per-app environment overrides via `envied` package (reads from `.env` files)

---

## Cross-References

- [[01_Business_Rules_and_States]] — State machines, enums, pricing math
- [[02_Backend_and_Database]] — Firestore schema, Cloud Functions
- [[App_Platter_Server]] — Feature-first architecture details
- [[App_Platter_Kitchen]] — Layer-first architecture, KDS polling
- [[App_Platter_Admin]] — Admin app responsibilities

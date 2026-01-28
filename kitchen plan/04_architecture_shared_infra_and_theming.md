# 04 Architecture, Shared Infra & Theming

## Overview
Set up the core architecture of the Kitchen App to mirror the Consumer App. This involves copying and adapting the folder structure, singleton patterns, network layers, and theming engines to ensure code reusability and consistency.

## In-Scope
-   **Folder Structure**: `lib/` -> `core`, `features` (or `pages`), `widgets`, `networking`, `models`, `providers`, `constants`.
-   **Shared Infrastructure**:
    -   `DioClient` wrapper (singleton).
    -   **Debug Interceptor**: `ResponseGuardInterceptor` (from boilerplate).
    -   **Custom Interceptor**: Generic interceptor for interrupt flows (e.g., forced update, block screen).
    -   **API Result/Resource Wrapper**: Standard class for handling Data/Error states.
-   **Theming**:
    -   Centralized `AppTheme` or `ThemeManager`.
    -   Define colors, typography, buttons in a scalable way (Consumer app pattern).
-   **Error Handling**:
    -   Global error UI / Dialogs.
    -   Parsing logic for backend standard error format.

## Out-of-Scope
-   Business logic for specific features.

## Requirements & Nuances
-   **Consistency is King**: If `flutter_boilerplate` uses `GetIt` for DI, Kitchen must use `GetIt`. If it uses Provider for state, Kitchen uses Provider.
-   **Parsing Logic**:
    -   Use `json_serializable` / `freezed` if used in boilerplate.
-   **Widgets**:
    -   Create `widgets/` folder.
    -   Identify reusable core widgets from Consumer app (Buttons, Inputs, Cards) and plan to port them over.
-   **Theming**:
    -   "Must be scalable". Avoid hardcoded hex values in screens. Use `Theme.of(context).colorScheme.primary` etc.

## Open Questions / Decisions Needed
-   Use a shared directory (`frontend/src-platter-apps/modules`) for very generic models and shared utility logic if required across apps. Avoid direct app-to-app dependencies.

## Dependencies
-   **Source Code**: `flutter_boilerplate` as the "Gold Standard".

## Acceptance Criteria
-   [x] Project structure matches Consumer App.
-   [x] `DioClient` configured with Interceptors.
-   [x] "Custom Interceptor" for popup triggers logic implemented (stubbed).
-   [x] Theming system set up; changing one constant updates app look.
-   [x] Error handling objects (Result<T>) created.

---

## Implementation Notes

### Completed (2024-01-28)

#### 1. Project Structure
Created proper folder structure:
- `lib/core/` - Core utilities and extensions
- `lib/constants/` - Centralized constants  
- `lib/models/` - Kitchen-specific models
- `lib/theme/design_system/` - Design tokens (colors, dimensions, typography)
- `lib/widgets/` - Reusable widgets with barrel export

#### 2. DioClient with Interceptors (in platter_core)
- `ResponseGuardInterceptor` - Debug logging for LLM analysis
- `InterruptFlowInterceptor` - Handles forced update, blocked user, session expired, maintenance mode
- Both integrated into DioClient singleton

#### 3. Theming System
- Created design tokens:
  - `KitchenColors` - Semantic color palette
  - `KitchenDimensions` - Spacing, radii, shadows
  - `KitchenTypography` - Text styles
- Updated `AppTheme` to use tokens - no hardcoded values in theme
- Light and dark themes fully configured

#### 4. Error Handling
- `Result<T>` sealed class with Success/Failure variants in platter_core
- `ErrorHandler` utility for showing snackbars and dialogs
- `DefaultInterruptFlowHandler` for interrupt flow dialogs
- Common error code to message mapping

#### 5. Shared Infrastructure (platter_core additions)
Exports added:
- `ResponseGuardInterceptor`
- `InterruptFlowInterceptor` + `DefaultInterruptFlowHandler`
- `Result<T>` type
- `ErrorHandler`

#### 6. Reusable Widgets Created
- `StatusBadge` - Order status display with automatic coloring
- `LoadingOverlay` / `LoadingIndicator` - Loading states
- `EmptyStateWidget` - Empty/error states with factory constructors
- `DebugInfoCard` - Reusable debug info display used in placeholder screens

### Refactoring Updates (Post-Review)
- **Navigation Safety**: Registered `/` route in `main.dart` ensuring logout navigation safety.
- **Code Optimization**:
  - Removed redundant `AutomaticKeepAliveClientMixin` (relying on `IndexedStack`).
  - Extracted shared debug UI to `DebugInfoCard`.
  - Used `KitchenCategory.defaultCategories` constant across app.
- **Separation of Concerns**:
  - Created `SessionManager` in `lib/session/` to handle logout logic, decoupling it from UI.


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
-   [ ] Project structure matches Consumer App.
-   [ ] `DioClient` configured with Interceptors.
-   [ ] "Custom Interceptor" for popup triggers logic implemented (stubbed).
-   [ ] Theming system set up; changing one constant updates app look.
-   [ ] Error handling objects (Result<T>) created.

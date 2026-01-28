# 01 Setup, Dependencies & Firebase

## Overview
This task covers the initialization and configuration of both the **Kitchen App** and **Admin App** to ensure they match the standards, dependencies, and architecture of existing apps (Server & Consumer). This is a foundational step to guarantee consistency and stability.

## In-Scope
-   Verifying and aligning `pubspec.yaml` dependencies for `platter_kitchen` and `platter_admin` with `platter_server` and `flutter_boilerplate`.
-   **Shared Modules** (in `frontend/src-platter-apps/modules`):
    -   **Structure**: Use a **local Dart package** (with its own `pubspec.yaml`) that apps import via `path: ../modules/<module_name>`. This ensures proper dependency management and versioning.
    -   **Candidates for shared modules**:
        -   `Result<T>` / API response wrapper (success/error states).
        -   `Logger` wrapper (and event logger if applicable).
        -   Common **Constants** (status enums, error codes).
        -   **Theming primitives** (color palette, typography tokens).
        -   **Common Models** (very generic, e.g., `PaginationMeta`, `ApiError`).
        -   **Utility functions** (date formatting, string helpers).
-   Ensuring strict version matching for shared libraries (Dio, Provider, Firebase, etc.).
-   Verifying Firebase configuration (`google-services.json`, `firebase_options.dart`) for both apps.
-   Setting up the basic project structure if missing (though shells exist).

## Out-of-Scope
-   Implementation of any features (screens, logic).
-   Firebase Admin SDK features (strictly client-side config).

## Requirements & Nuances
-   **Dependencies**:
    -   Must use **exact versions** from `platter_server` / `flutter_boilerplate`.
    -   Critical libs: `dio`, `provider`, `go_router`, `logger`, `firebase_core`, `firebase_crashlytics`, `envied`.
    -   *Nuance*: Do not run `flutter pub upgrade` blindly. Manually sync versions to avoid breaking changes.
-   **Firebase**:
    -   `google-services.json` must be present in `android/app/`.
    -   `firebase_options.dart` must be present in `lib/` and configured for the correct project ID.
    -   Initialize Firebase in `main.dart` (if not already done).

## Open Questions / Decisions Needed
-   Existing `google-services.json` and `firebase_options.dart` files are **confirmed up-to-date** and pointing to the correct environment.
-   **Environment**: Single-environment setup (no separate flavors for now).

## Dependencies
-   Access to common logic in the `modules/` directory.
-   Access to `platter_server` and `flutter_boilerplate` codebase for pattern reference (apps do not depend on each other).

## Acceptance Criteria
-   [ ] `platter_kitchen/pubspec.yaml` and `platter_admin/pubspec.yaml` have dependencies synced with `platter_server`.
-   [ ] Both apps compile and run (`flutter run`) without dependency conflicts.
-   [ ] Firebase initializes successfully on app launch (check logs).
-   [ ] Project structure allows for future modules (lib/core, lib/features, etc.).

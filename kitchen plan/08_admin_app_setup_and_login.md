# 08 Admin App: Setup & Login

## Overview
This task covers the foundational setup for the **Admin App**. At this phase, only **base setup** (dependencies, Firebase) and **login** are in scope. Feature development for Admin is deferred.

## In-Scope
-   **Base Setup**: Align `platter_admin/pubspec.yaml` dependencies with `platter_server` and `flutter_boilerplate`.
-   **Firebase Configuration**: Verify `google-services.json` and `firebase_options.dart` are correct.
-   **Project Structure**: Mirror the folder structure from Task 04 (Architecture).
-   **Login Flow**:
    -   Login UI matching Server/Kitchen apps.
    -   Role validation: Admin role required. Show error "You are not authorized as an Admin" for non-admin users.
    -   Debug credentials mechanism (implemented fresh, not copied).
-   **Shared Modules**: Import from `frontend/src-platter-apps/modules` (same as Kitchen).

## Out-of-Scope
-   Any admin-specific features (user management, analytics, restaurant config, etc.).
-   Firebase Admin SDK integration.
-   Navigation beyond login (post-login placeholder screen is acceptable).

## Requirements & Nuances
-   **Consistency**: Admin app must use the same architecture patterns as Kitchen app (DioClient, Provider, theming).
-   **Login**: Nearly identical to Kitchen app login, but validates for "Admin" role.
-   **Theming**: May differ from Kitchen (Admin might have different color scheme), but uses the same theming infrastructure.

## Open Questions / Decisions Needed
-   Post-login screen: Is a simple placeholder sufficient, or should there be a "Coming Soon" dashboard?
    -   *Assumption*: Placeholder is fine for now.

## Dependencies
-   **Task 01**: Shared modules and base patterns.
-   **Backend**: `POST /login` endpoint (same as Kitchen).

## Acceptance Criteria
-   [ ] `platter_admin/pubspec.yaml` synced with `platter_server`.
-   [ ] Firebase initializes successfully.
-   [ ] Login screen UI matches expected design.
-   [ ] Successful admin login navigates to placeholder home screen.
-   [ ] Non-admin role login shows clear error message.
-   [ ] Debug credentials work in debug builds.

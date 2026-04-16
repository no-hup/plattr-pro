# 02 Kitchen Login

## Overview
Implement the Login screen and authentication flow for the **Kitchen App**, mirroring exactly the UI and functionality of the `platter_server` app.

## In-Scope
-   Login UI (Email/Password fields, branding).
-   Authentication logic using the existing backend auth endpoints.
-   "Debug Credentials" feature (pre-fill for dev/demo).
-   Error handling (wrong password, network error) using standard UI.
-   **Role Validation**: If user role is not "Kitchen", show clear error: "You are not authorized as a Kitchen staff".

## Out-of-Scope
-   Registration/Sign-up flow (Kitchen users are likely pre-created or managed by Admin).
-   Password reset flow (unless present in Server app login screen).

## Requirements & Nuances
-   **UI Consistency**:
    -   Must look *identical* to `platter_server` login page. (Refer to `platter_server/lib/pages/auth/login_screen.dart`).
-   **Architecture**:
    -   Use **Repository Pattern** for Auth (e.g., `AuthRepository` calling `DioClient`).
    -   Use **Provider** for state management (`LoginProvider` or `AuthProvider`).
-   **Debug Behavior**:
    -   If in Debug mode, allow tapping a hidden area or button to auto-fill test credentials.
    -   **Note**: Debug credentials mechanism is NOT directly copyable from `platter_server`. Must be implemented fresh for Kitchen app.

## Open Questions / Decisions Needed
-   The backend distinguishes between "Server" and "Kitchen" users via a **role field**.
-   App must verify user role from login response before allowing access.
-   **Post-Login Navigation**: Hardcoded on app side to navigate to the **1st tab** sent by the backend in the initial config/tabs response.

## Dependencies
-   **Task 01**: Base setup and networking must be ready.
-   **Backend**: `POST /login` (or equivalent) endpoint.

## Acceptance Criteria
-   [ ] Login screen UI matches Server app.
-   [ ] Successful login stores the token (SecureStorage/SharedPreferences) and navigates to Home.
-   [ ] Failed login shows appropriate error message (toast or snackbar).
-   [ ] Debug credentials mechanism works in debug builds.
-   [ ] Auth state persists across app restarts (auto-login check in `main.dart` or Splash).

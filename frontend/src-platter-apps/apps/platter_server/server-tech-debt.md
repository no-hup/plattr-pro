This file is for listing down the server(waiter at the restaurant(not actual server machine)) related tech debt

## Backend related tech debt
- **Security**: Passwords are currently checked as plain text in `server_auth.js`. Need to implement password hashing (e.g., bcrypt).
- **OTP Logic**: The `generateTableOTP` function fails if the table is not `vacant`. A waiter cannot re-generate an OTP for an active table (e.g., if a customer loses their session) without first resetting the table.
- **Order Structure**: Status updates rely heavily on `cartIndex` in the `Order.carts[]` array. This is prone to race conditions and desync if not handled within strict transactions.
- **Data Redundancy**: Items are duplicated in `Order.items` and `Order.carts[].items`. Requires manual syncing logic in all update functions.
- **Location Guard**: `isWithinRadius` in `table_otp.js` is currently a mock that always returns `true`. Proper geo-fencing needs implementation.

## Frontend related tech debt
- **State Management**: Cart state is localized to `MenuState` and `CartListingState`. Future refactor should extract shared offers/calculation logic into a Mixin or separate Controller.
- **UI Performance**: Items in the Order/Cart lists need debouncing on resume to prevent duplicate API fetches when the app is brought to foreground.
- **Hardcoded Strings**: Several UI descriptions for order statuses (e.g., "Preparing", "Ready") are hardcoded and should be moved to a localization/constant file.
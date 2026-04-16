# Platter Server Contract Tests (Agent Instructions)

Purpose: Run backend contract tests against the Firebase emulator using real API responses and existing parsing code.

Target tests (current):
- `server-serverLogin` → `test/contract/auth_server_login_contract_test.dart`
- `order-getActiveOrdersForRestaurant` → `test/contract/order_get_active_orders_contract_test.dart`
- `server-getOrderDetails` → `test/contract/order_get_order_contract_test.dart`
- `server-markItemServed` → `test/contract/order_mark_item_served_contract_test.dart`
- `order-updateOrderStatus` → `test/contract/order_update_order_status_contract_test.dart`
- `cart-updateCartStatus` → `test/contract/order_update_cart_status_contract_test.dart`
- `order-markCartAsServed` → `test/contract/order_mark_cart_as_served_contract_test.dart`
- `order-getServedCartsForServer` → `test/contract/order_get_served_carts_contract_test.dart`
- `table-getTablesForRestaurant` → `test/contract/table_get_tables_contract_test.dart`
- `table-getTableDetails` → `test/contract/table_get_table_details_contract_test.dart`
- `table-updateTableStatus` → `test/contract/table_update_table_status_contract_test.dart`
- `table-generateTableOTP` → `test/contract/table_generate_table_otp_contract_test.dart`
- `menu-getRestaurantMenu` → `test/contract/menu_get_restaurant_menu_contract_test.dart`
- `menu-updateMenuItemAvailability` → `test/contract/menu_update_menu_item_availability_contract_test.dart`

Reference: `agent_workspace/agents/response_guard_runtime/firebase_emulator_tips.md`

Steps
1. Check if the Firebase emulator is running
   - Command:
     `curl -s -o /dev/null -w "%{http_code}" -X POST http://127.0.0.1:5002/rms-app-dd875/us-central1/dev-listRestaurants`
   - Expect: `200`

2. If emulator is not running, start it
   - Command:
     `cd backend/src-plattr`
     `npm run emulators`
   - If ports are in use, run:
     `npm run preflight-ports`
     `npm run emulators`
   - Keep the emulator running while tests execute.
   - Do not kill processes/ports without explicit user approval.

3. Load mock data into the emulator (v3)
   - Command:
     `cd backend/src-plattr/functions`
     `node mock/importMockDataV3.js`
   - This loads `mockDataV3.json`, which includes restaurant `res_server-consumer_order_flow`
     and session `session_server001__preseed`.

4. Run the contract tests
   - Command:
     `cd frontend/src-platter-apps/apps/platter_server`
     `flutter test test/contract -j 1`
   - If you only want one file:
     `flutter test test/contract/table_get_tables_contract_test.dart`

5. Report results
   - Logs are printed to the test output (stdout/stderr). If failures occur, include the test output and any relevant emulator logs.

Overrides (optional)
- Use a different emulator base URL:
  `flutter test test/contract -j 1 --dart-define=PLATTR_FUNCTIONS_BASE_URL=http://127.0.0.1:5002/rms-app-dd875/us-central1`
- Use a different restaurant ID:
  `flutter test test/contract/table_get_tables_contract_test.dart --dart-define=PLATTR_TEST_RESTAURANT_ID=res_server-consumer_order_flow`
- Use a different session ID:
  `flutter test test/contract/order_get_active_orders_contract_test.dart --dart-define=PLATTR_TEST_SESSION_ID=session_server001__preseed`

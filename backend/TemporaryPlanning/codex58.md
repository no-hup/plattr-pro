# codex58 – Front-End Impact Of ResponseBuilder Migration

## TL;DR
- Every callable/HTTP function touched in this round now returns `ResponseBuilder.success(...)` and routes failures through `ErrorHandler`, per `functions/docs/API_RESPONSE_CONTRACT.md`.
- Front-end clients must stop relying on `success` booleans or loosely shaped objects and consistently read `status/message/data` for success and `details.data.code/httpCode` for errors.
- Most consumer Flutter surfaces already have shims (`ApiResponseFreezed`, `CartOperationResponse`, `UnifiedResponseParser`), but we still need to tighten parsing, update models, and refresh fixtures/tests so they only accept the standardized envelope.

## Contract Snapshot
```json
{
  "status": "success",
  "message": "Human readable summary",
  "data": { /* endpoint-specific payload */ }
}
```
Errors now bubble up from `ErrorHandler.*` and arrive as Firebase `HttpsError` with:

```json
{
  "status": "error",
  "message": "What failed",
  "data": {
    "code": "invalid-argument",
    "httpCode": 400,
    "...context"
  }
}
```
Front-end code must surface `message`, key off `status`, and prefer `data.code` instead of bespoke `errorCode`.

## Impact Matrix
| API (cloud function) | Primary clients | Response delta | Required FE follow-up |
| --- | --- | --- | --- |
| `cart-getCart` (`cart/getCart.js`) | Consumer Flutter cart/menu flows (`lib/pages/menuListing`, `cart_listing`, `CartOperationResponse`) | Always returns `{status,message,data:{cart}}` with sanitized price info | Remove `success` checks, rely on `status`; ensure `CartOperationResponse` + `MenuState` pull `result.data.cart`; refresh `api_test.dart` fixtures |
| `cart-checkoutCart` (`cart/checkoutCart.js`) | Consumer checkout (`CheckoutRepository`, `CartListingState`, `checkout_test.dart`) | Response data now `{ orderId, orderNumber, orderStatus, timestamp }` only under `data` | Update `CheckoutResponse`/repository to stop searching for `result`; emit UI success from `status==='success'`; update tests/mocks |
| `menu-getRestaurantMenu` (`menu/getRestaurantMenu.js`) | Consumer menu listing (`MenuRepository`, `MenuState`, `response_parser.dart`) | Organized menu now inside `data` with metadata | Have parser unwrap `data` instead of root arrays, adjust skeleton state + caching, regenerate sample payloads |
| Menu CRUD (`menu/menu.js`, `menu/creation/menu_add.js`) | Server/admin tooling (future Plattr dashboard) | CRUD + availability endpoints now emit envelopes | When dashboard/API runner is wired, make `MenuManagementService` consume `status/data` and expose backend validation errors from `details.data` |
| `order-getOrder` (`orders/getOrder.js`) | Consumer order screen (`OrderRepository`) + Platter Server app (`OrderApiService.getOrder`) | Sanitized order(s) under `data`, no bare arrays | Simplify repository parsing paths, ensure `OrderResponse` assumes `status/message`; refresh fixtures in `order_repository_test.dart` & server app tests |
| `order-getActiveOrdersForRestaurant` (`orders/getActiveOrdersForRestaurant.js`) | Platter Server orders board (`OrderApiService`) | Active orders array inside `data`; each order already normalized (`orderStatus`, `orderId`) | Update `dataExtractor` to just reuse `envelope['data']`, drop legacy boolean handling, refresh `api_parsing_test.dart` |
| `order-updateOrderStatus` (`orders/updateOrderStatus.js`) | Upcoming FOH tools (`OrderApiService.updateOrderStatus`, waiter tablet) | Returns `{status,message,data:{orderId,orderStatus}}` after transaction | When endpoint is actually called, wire `ApiResponse<bool>` to inspect `status`, surface backend validation reasons (`data.code`) |
| Server CRUD (`server/serverIndex.js`) | Future ops console + staff provisioning flows | All create/update/get/assign/unassign responders now wrap payloads | Update any CLI/admin utilities to read `status`, and plan for `plattr_server` settings module to reparse responses |
| `server-getTables` (`server/tables_fetch.js`) | Table verification + seating flows (`lib/pages/table_verification/unified_table_repository.dart`) | Table list packaged as `{data:{restaurantId,tables,count}}` with sanitized timestamps | In `UnifiedTableRepository`, stop checking legacy `success` flag, plug into `UnifiedResponseParser` success helper, adjust empty-state handling |
| `notifications-updateServerFCMTokenInDb` | Server tablet push registration (yet to be built) | Returns `{data:{serverId,updatedAt}}` after token write | When mobile/web client sends tokens, ensure it logs `message` and reads `data.serverId`; update planned `NotificationService` to treat `status` |

> Files reported in `git status` plus `docs/API_RESPONSE_CONTRACT.md` cover all ResponseBuilder adopters from this batch. If another endpoint still emits boolean/plain objects, it was untouched and keeps legacy behavior for now.

## Detailed Front-End Work

### 1. Consumer Flutter App (`frontend/flutter_boilerplate`)
- **Networking shims**: Ensure `ApiResponseFreezed` shortcuts use `status` exclusively. Clean up fallback paths that still expect `result.success` (e.g., `CheckoutRepository.checkoutCart`, `OrderRepository.fetchOrder`).
- **Cart flows**:  
  - `lib/pages/menuListing/menu_state.dart`, `menu_repository.dart`, `menu_listing_response_parser.dart` should read `response.status` instead of `response.success`.  
  - `CartOperationResponse` already unwraps `result`, but we should add regression tests to lock the `{status,message,data.cart}` shape and delete the fallback that tries to fabricate carts from raw arrays once the backend guarantee is in place.
  - Update `cart_listing_state.dart` to treat `response.data?.data.cart` as the truth and display backend `message` on errors.
- **Checkout**:  
  - Update `CheckoutResponse`/`CheckoutRepository` models so they deserialize `orderId/orderStatus/timestamp` from `result['data']` instead of root-level properties.  
  - Update `frontend/flutter_boilerplate/test/checkout_test.dart` & `test/api_test.dart` fixtures to assert `status/message/data`.
- **Order detail**: Remove redundant parsing branches in `OrderRepository.fetchOrder` that check for bare arrays—sanitized results already arrive under `data`.
- **Table verification**: Align `unified_table_repository.dart` and `table_response_parser.dart` with the new `server-getTables` payload (status-driven, `data.tables`). Add logging for `details.data.code` so we can bubble up `not_found` vs `invalid-argument`.

### 2. Platter Server App (`frontend/src-platter-apps/apps/platter_server`)
- **Orders board**:  
  - Simplify `OrderApiService.getActiveOrdersForRestaurant` to stop wrapping the array in `{'orders': ...}`—`ResponseBuilder` already returns an array, so `dataExtractor` can just `return {'orders': envelope['data']};` and trust `status`.  
  - Mirror the same expectation in `OrderApiService.getOrder` and the provider so they don’t rely on `success` booleans.  
  - Refresh `test/api_parsing_test.dart` fixtures for active orders and order detail.
- **Order status mutations**: Once the UI calls `order-updateOrderStatus`, make sure `ApiResponse<bool>` flips based on `status==='success'` and prints `details.data.code` when the backend raises `preconditionFailed` (mismatched bills, invalid transitions).
- **FCM registration**: When we introduce server-tablet push registration, have the service capture `data.serverId` from `updateServerFCMTokenInDb` and store `updatedAt` for debugging; surface backend validation errors from `error.details`.
- **Future menu/server admin modules**: When we hook up menu CRUD or server provisioning screens, their repositories must assume `ResponseBuilder` envelopes from day one—no more `success` booleans. Keep this doc handy when scaffolding those services.

### 3. Shared Front-End Infrastructure
- **Error handling**: Update `DioClient.handleDioException` (consumer) and `ResponseParser` (server app) so they first look for `response.data.status === 'error'` and map `errorCode` from `response.data.data.code`. This will surface the new codes emitted by `ErrorHandler`.
- **Telemetry/logging**: Make app loggers include `status`/`message` exactly as backend sends them, which helps correlate with backend logs that now log the same fields.
- **Fixtures & mocks**: Refresh any JSON under `frontend/**/test/` or `backend-overview/scenarios/` that the apps ingest so that all success bodies include the `status/message/data` trio—especially the HTML mock flows used for testing.

## Verification Plan
- Rerun: `frontend/flutter_boilerplate/test/api_test.dart`, `checkout_test.dart`, and `src-platter-apps/apps/platter_server/test/api_parsing_test.dart` after updating fixtures.
- Manual: hit each callable via Firebase emulator (see curl commands in `backend-overview/scenarios/**`) and confirm front-end logging shows `status: success`.
- Monitoring: Once deployed, capture a sample of each endpoint’s response in console logs to confirm clients are no longer relying on deprecated structures.

Document owner: add-ons/response cleanup squad. Ping @TemporaryPlanning if another endpoint adopts ResponseBuilder so we can append to this codex.


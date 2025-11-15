# codex593 – Front-End Reference for ResponseBuilder Rollout

## TL;DR
- All callable/HTTP functions touched in the ResponseBuilder rollout now return the same `{ status, message, data }` envelope and raise errors through the shared `ErrorHandler`, yielding `HttpsError` objects that carry `data.code` + `data.httpCode`.
- Every frontend (consumer Flutter, Platter Server Flutter, future admin tools) must stop reading bespoke root-level payloads or `success` booleans; always branch on `status === 'success'` and pull payloads from `data`.
- Use `details.data.code` (client SDK) or `error.details.data.code` (Platter Server) for granular failures—no endpoint emits ad-hoc `errorCode` keys anymore.

## Response Envelope
```json
// Success
{
  "status": "success",
  "message": "Human readable summary",
  "data": { /* endpoint specific payload */ }
}

// Error (surfaced via Firebase HttpsError)
{
  "status": "error",
  "message": "What failed",
  "data": {
    "code": "invalid-argument",
    "httpCode": 400,
    "... more context (ids, field names, etc.)"
  }
}
```

**Frontend handling rules**
1. Never trust legacy `success` booleans or raw arrays/objects—check `response.status` exclusively.
2. Read the actual payload from `response.data` (consumer Flutter) or `envelope['data']` (Platter Server repositories).
3. When catching errors, surface `error.message` to the user and map retry logic/logging to `error.details?.data?.code`.

## Consumer Flutter Surfaces

| API (file) | Primary screens/services | New payload highlights | What to read in FE |
| --- | --- | --- | --- |
| `cart-getCart` (`cart/getCart.js`) | `menuListing`, `CartOperationResponse`, `cart_listing_state` | `{data:{cart}}` containing sanitized totals + line items | Pull `response.data.cart`; delete fallbacks that fabricate carts from arrays; bubble backend `message` on empty/error states. |
| `cart-checkoutCart` (`cart/checkoutCart.js`) | `CheckoutRepository`, `CheckoutResponse`, Flutter checkout tests | `{data:{orderId, orderNumber, orderStatus, timestamp}}` only | Deserialize the order fields from `response.data`; emit UI success solely from `status==='success'`. |
| `menu-getRestaurantMenu` (`menu/getRestaurantMenu.js`) | `MenuRepository`, `menu_state.dart`, caching layers | Full menu + metadata now under `data` | Update parsers to unwrap `data` (categories, menuItems, metadata) and refresh fixtures used in `api_test.dart`. |
| Menu CRUD (`menu/menu.js`, `menu/creation/menu_add.js`) | Future consumer/admin menu editors | All CRUD operations emit the standard envelope with operation-specific `data` | Make `MenuManagementService`/future flows assume `status`/`data`; rely on `details.data.code` for validation errors. |
| `orders-getOrder` (`orders/getOrder.js`) | `OrderRepository`, `OrderResponse`, order detail tests | Single/multiple orders always live in `data` (no bare arrays) | Remove branches that detect arrays; parse everything from `response.data`. |
| `orders-getActiveOrdersForRestaurant` (`orders/getActiveOrdersForRestaurant.js`) | Consumer polling helpers (where applicable) | Active orders array lives inside `data` | Set repositories to `return response.data;` and refresh associated fixtures. |
| `server-getTables` (`server/tables_fetch.js`) | `UnifiedTableRepository`, table verification flows | `{data:{restaurantId, tables, count, sanitized timestamps}}` | Rely on `response.data.tables` and expose backend code (`not_found`, `invalid-argument`) when errors bubble up. |

## Platter Server & Admin Tooling

| API (file) | Consuming modules | New payload highlights | What to read in FE |
| --- | --- | --- | --- |
| `orders-getActiveOrdersForRestaurant` (`orders/getActiveOrdersForRestaurant.js`) | `OrderApiService.getActiveOrdersForRestaurant`, FOH dashboard | Orders list arrives as `envelope.data` | Drop manual wrapping (`{'orders': ...}`) in data extractors; trust the backend array directly. |
| `orders-getOrder` (`orders/getOrder.js`) | `OrderApiService.getOrder`, ticket drilldowns | Sanitized order(s) live inside `data` | Remove success-flag code paths, load payload straight from `data`. |
| `orders-updateOrderStatus` (`orders/updateOrderStatus.js`) | FOH mutation flows / future waiter tablets | `{data:{orderId, orderStatus}}` | Flip optimistic UI states off `status==='success'`; show `details.data.code` for invalid transitions. |
| `server/server_auth.js` | Platter Server login bootstrap | Auth result now wrapped | Authenticate by checking `status`, then using `response.data` for session tokens/claims. |
| Server CRUD + table assignment (`server/serverIndex.js`) | Staff provisioning, table assignment screens | All create/update/get/assign/unassign outputs move under `data` | Simplify repositories to always unwrap the envelope; log backend `message` for auditing. |
| `notifications-updateServerFCMTokenInDb.js` | Future server-tablet push registration | `{data:{serverId, updatedAt}}` | Store `data.serverId`/`data.updatedAt`; treat errors via `details.data.code` (e.g., `precondition-failed`). |

## Shared Infrastructure Touchpoints
- **Networking shims**: `ApiResponseFreezed`, `UnifiedResponseParser`, and the Platter Server `ResponseParser` must only look at `status/message/data`; delete legacy coercion helpers.
- **Error handling**: `DioClient.handleDioException` (consumer) and server-app interceptors should peek at `response.data.status === 'error'` before throwing, mapping retry/UX to `data.code`.
- **Telemetry & fixtures**: Update log statements and JSON mocks under `frontend/**/test/` + `backend-overview/scenarios/` so they mirror the envelope. This keeps emulator tests and BrowserTools canvas demos honest.
- **Verification anchors**: Re-run `frontend/flutter_boilerplate/test/api_test.dart`, `frontend/flutter_boilerplate/test/checkout_test.dart`, and `frontend/src-platter-apps/apps/platter_server/test/api_parsing_test.dart` once fixtures adopt the standardized shape; spot-check callable responses through the Firebase emulator to ensure client logs show `status: success`.

# Contract Tests Learnings

- `dev-listRestaurants` is an emulator-only health check and requires POST (GET returns 405).
- Mock data for emulator tests comes from `backend/src-plattr/functions/mock/mockDataV3.json`; valid restaurant ID: `res_server-consumer_order_flow`.
- The active server session in v3 is `session_server001__preseed`; invalid session IDs return precondition errors.
- `DioClient` captures `AppConfig.firebaseFunctionsBaseUrl` at construction time, so `AppConfig.initialize(Environment.dev)` must run before creating API services.
- Most onCall endpoints expect payloads wrapped in `{ "data": { ... } }`.
- `menu-updateMenuItemAvailability` is onRequest and expects a flat payload (no `data` wrapper).
- `importMockDataV3.js` must run with emulator env vars (`FIRESTORE_EMULATOR_HOST`, `FUNCTIONS_EMULATOR`, `NODE_ENV`) set before admin initializes.
- `npm run emulators` uses `backend/src-plattr/firebase.temp.json`; if ports conflict, run `npm run preflight-ports` first.
- Some contract tests mutate emulator state (status updates/serving actions). Run them sequentially (`flutter test test/contract -j 1`) and re-import mock data if later tests fail due to state.

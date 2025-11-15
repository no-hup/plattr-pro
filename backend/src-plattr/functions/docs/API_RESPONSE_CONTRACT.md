# Unified API Response Contract

This document formalizes the backend callable/HTTP contract described in `TemporaryPlanning/codex742.md`. Every user-facing Cloud Function **must**:

1. Build success payloads with `ResponseBuilder.success(data, message?)`.
2. Surface failures exclusively through the `ErrorHandler` singleton (either via the specific helpers such as `badRequest`, `notFound`, `preconditionFailed`, etc. or with `handleError` inside catch blocks).
3. Emit a lightweight log before returning or throwing so we can trace `(functionName, status, message)`.

## Success Envelope

```js
return ResponseBuilder.success(
  { ...data },
  'Human friendly message'
);
```

All fields (`status`, `message`, `data`) are mandatory. `data` must remain an object, even when empty.

## Error Envelope

Use the `ErrorHandler` helpers instead of throwing `functions.https.HttpsError` directly:

```js
errorHandler.badRequest('Restaurant ID is required', { restaurantId });
errorHandler.handleError(error, 'checkoutCart', { restaurantId, tableId });
```

These helpers throw a Firebase `HttpsError` whose `details` already match the spec:

```json
{
  "status": "error",
  "message": "Human friendly error",
  "data": {
    "code": "invalid-argument",
    "httpCode": 400,
    "...context"
  }
}
```

## Guard Rails

- **Code review**: reject callable endpoints that return raw objects or booleans.
- **Unit tests**: `test/ResponseBuilder.test.js` already asserts the canonical shape—extend it whenever the envelope changes.
- **Telemetry**: log `{ status, message }` before each return to aid monitoring (see cart/order/menu/server functions for examples).

Keeping every endpoint on this contract unlocks automated linting later on and allows clients to consume a single happy-path + error-path structure.


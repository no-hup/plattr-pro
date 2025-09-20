# API Compliance Report

This report applies the **API Compliance Verification Rule** to the key frontend-facing Cloud Functions.

## API Compliance Analysis: table-validateTableAndLocation

### Backend Analysis
- **Location**: `backend/src-plattr/functions/table/table.js`
- **Response Format**: Unified (`ResponseBuilder.success`/`error`)
- **Uses ResponseBuilder**: ✅
- **Success Structure**: `{ status: 'success', message: 'Access granted', data: { tableStatus, restaurant, table, session?, primaryCustomer?, occupiedBy? } }`
- **Error Handling**: Comprehensive via `errorHandler` → `HttpsError` → `ResponseBuilder`
- **Field Types**: Strings for ids/status, nested objects, optional session block

### Flutter Analysis
- **Model Location**: `lib/pages/table_verification/models/models.dart`
- **Parser Location**: `lib/pages/table_verification/table_response_parser.dart`
- **Null Safety**: Compliant (sanitizes fields, default fallbacks, nullable getters)
- **Error Handling**: Comprehensive (handles auth-required, validation, unknown)
- **Response Format Expected**: Unified but tolerant of legacy `result`

### Compliance Status
- **Format Compliance**: ✅
- **Field Compliance**: ✅
- **Error Compliance**: ✅
- **Overall Status**: PASS

### Critical Issues
_None_

### Implementation Plan
_No action required_

---

## API Compliance Analysis: table-validateOTP

### Backend Analysis
- **Location**: `backend/src-plattr/functions/table/table.js` (`exports.validateOTP`)
- **Response Format**: Unified (`ResponseBuilder.success`/`error`)
- **Uses ResponseBuilder**: ✅
- **Success Structure**: `{ status: 'success', message, data: { status: 'success', customToken?, isPrimaryCustomer, sessionId } }`
- **Error Handling**: Mixed (`errorHandler` plus explicit `HttpsError` for validation)
- **Field Types**: Strings + booleans; some optional token fields

### Flutter Analysis
- **Model Location**: `lib/pages/otp/models/otp_models.dart`
- **Parser Location**: `lib/pages/otp/otp_response_parser.dart`
- **Null Safety**: Mostly compliant (required `status`/`sessionId`, optional token)
- **Error Handling**: Partial (maps known codes, treats `ask_primary_customer` as error)
- **Response Format Expected**: Unified or legacy `result`

### Compliance Status
- **Format Compliance**: ✅
- **Field Compliance**: ✅ (redundant nested `status` tolerated)
- **Error Compliance**: ⚠️ (ask-primary + generic errors rely on message text)
- **Overall Status**: REVIEW

### Critical Issues
1. Error pathways still depend on plain `HttpsError` payloads; ensure `errorHandler` covers all branches for consistent codes.

### Implementation Plan
- **Backend**: Audit validation failures to route through `errorHandler`.
- **Frontend**: Extend `OtpResponseParser` with explicit codes for secondary flows.
- **Testing**: Add unit coverage for `ask_primary_customer` and raw `HttpsError` payloads.

---

## API Compliance Analysis: menu-fetchMenu-fetchMenu

### Backend Analysis
- **Location**: `backend/src-plattr/functions/menu/menu_fetch.js`
- **Response Format**: Legacy (returns raw `{ categories, menuItems, metadata }`)
- **Uses ResponseBuilder**: ❌
- **Success Structure**: Direct data object without status/message/data envelope
- **Error Handling**: Throws bare `HttpsError` with message only
- **Field Types**: Mixed maps/lists of Firestore docs

### Flutter Analysis
- **Model Location**: `lib/pages/menuListing/menu_response.dart`
- **Parser Location**: `lib/pages/menuListing/response_parser.dart`
- **Null Safety**: Defensive but expects `result` wrapper
- **Error Handling**: Basic (HTTP code mapping, lacks field-level diagnostics)
- **Response Format Expected**: Unified (`result.status/data`) or wrapped success

### Compliance Status
- **Format Compliance**: ❌ (no status/message; parser receives empty menu)
- **Field Compliance**: ❌ (critical data discarded by `MenuResponse.fromJson`)
- **Error Compliance**: ⚠️ (plain `HttpsError` without structured codes)
- **Overall Status**: FAIL

### Critical Issues
1. Frontend currently deserializes to an empty menu because `result` is missing.
2. Lack of standardized success/error envelope prevents consistent logging and diffing.

### Implementation Plan
- **Backend**: Wrap response with `ResponseBuilder.success({ menu: organizedMenu })` or at minimum `{ status, message, data }`.
- **Frontend**: Until backend fixes, add fallback path in `ResponseParser.parseMenuResponse` to treat top-level map as `result.data`.
- **Testing**: Add integration test covering raw legacy payload to confirm fix.

---

## API Compliance Analysis: cart-getCart

### Backend Analysis
- **Location**: `backend/src-plattr/functions/cart/getCart.js`
- **Response Format**: Semi-unified (`{ status, message, data: { cart } }`)
- **Uses ResponseBuilder**: ❌ (manual structure)
- **Success Structure**: Includes sanitized cart with price info, items
- **Error Handling**: Mix of bare `HttpsError` and standard throws
- **Field Types**: Numbers sanitized, arrays enforced

### Flutter Analysis
- **Model Location**: `lib/pages/menuListing/models/cart_operation_response.dart`
- **Parser Location**: `lib/pages/menuListing/response_parser.dart`
- **Null Safety**: Compliant (defaults, converter fallbacks)
- **Error Handling**: Fallback to empty cart on parse failure; limited error codes
- **Response Format Expected**: Unified or direct map (converter unwraps both)

### Compliance Status
- **Format Compliance**: ✅
- **Field Compliance**: ✅
- **Error Compliance**: ⚠️ (some errors bypass `errorHandler`, rely on default Firebase structure)
- **Overall Status**: REVIEW

### Critical Issues
1. Mixed error format complicates frontend mapping of error codes.

### Implementation Plan
- **Backend**: Route error paths through `errorHandler` for consistent payloads.
- **Frontend**: Record HTTP/error codes when falling back to empty cart for debugging.
- **Testing**: Add regression covering corrupt cart + empty cart fallback.

---

## API Compliance Analysis: cart-addItemToCart

### Backend Analysis
- **Location**: `backend/src-plattr/functions/cart/addItemToCart.js`
- **Response Format**: Semi-unified (`{ status, message, data: { cart } }`)
- **Uses ResponseBuilder**: ❌ (manual)
- **Success Structure**: Returns sanitized cart snapshot
- **Error Handling**: Centralized via `errorHandler`
- **Field Types**: Numbers normalized via helper utilities

### Flutter Analysis
- **Model Location**: Shared `CartOperationResponse` (see above)
- **Parser Location**: `lib/pages/menuListing/response_parser.dart`
- **Null Safety**: Compliant via converters
- **Error Handling**: Good (error codes surfaced from `HttpsError` data)
- **Response Format Expected**: Unified/direct

### Compliance Status
- **Format Compliance**: ✅
- **Field Compliance**: ✅
- **Error Compliance**: ✅
- **Overall Status**: PASS

### Critical Issues
_None_

### Implementation Plan
_No action required_

---

## API Compliance Analysis: cart-removeItemFromCart

### Backend Analysis
- **Location**: `backend/src-plattr/functions/cart/removeItemFromCart.js`
- **Response Format**: Semi-unified (`{ status, message, data: { cart } }`)
- **Uses ResponseBuilder**: ❌
- **Success Structure**: Updated cart snapshot after decrement/remove
- **Error Handling**: `HttpsError` with simple message (no detailed codes)
- **Field Types**: Matches frontend cart expectations

### Flutter Analysis
- **Model Location**: Shared `CartOperationResponse`
- **Parser Location**: `lib/pages/menuListing/response_parser.dart`
- **Null Safety**: Compliant
- **Error Handling**: Limited (depends on message text for not-found/internal)
- **Response Format Expected**: Unified/direct

### Compliance Status
- **Format Compliance**: ✅
- **Field Compliance**: ✅
- **Error Compliance**: ⚠️ (missing structured error codes for not-found/cart corruption)
- **Overall Status**: REVIEW

### Critical Issues
1. Frontend cannot distinguish `not-found` vs `internal` without inspecting message text.

### Implementation Plan
- **Backend**: Replace plain `HttpsError` throws with `errorHandler.notFound/internalError` for structured details.
- **Frontend**: Add mapping for Firebase default `error` envelopes as stop-gap.
- **Testing**: Simulate remove with invalid `cartItemId` to verify fix.

---

## API Compliance Analysis: cart-checkoutCart

### Backend Analysis
- **Location**: `backend/src-plattr/functions/cart/checkoutCart.js`
- **Response Format**: Semi-unified (`{ status, message, data: { orderId, orderNumber, orderStatus, timestamp } }`)
- **Uses ResponseBuilder**: ❌
- **Success Structure**: Direct status/message/data (no `result`)
- **Error Handling**: Mixed—uses `errorHandler` in parts, plain `HttpsError` elsewhere; typo `failedPrecondition` vs `failed-precondition`
- **Field Types**: Strings + ISO timestamp

### Flutter Analysis
- **Model Location**: `lib/pages/checkout_order_flow/models/checkout_models.dart`
- **Parser Location**: `lib/pages/checkout_order_flow/checkout_repository.dart`
- **Null Safety**: Compliant but assumes `result` envelope
- **Error Handling**: Expects structured `error` object with `code`
- **Response Format Expected**: Strict unified `result` wrapper

### Compliance Status
- **Format Compliance**: ❌ (frontend rejects unexpected structure)
- **Field Compliance**: ⚠️ (timestamp string parsed, but only after format fix)
- **Error Compliance**: ⚠️ (inconsistent codes)
- **Overall Status**: FAIL

### Critical Issues
1. Checkout success currently surfaces as `ApiResponseFreezed.error` because backend omits `result` wrapper.
2. `errorHandler.failedPrecondition` call is misspelled (`failedPrecondition`) causing runtime exception.

### Implementation Plan
- **Backend**:
  - Wrap success with `ResponseBuilder.success({ orderId, ... })`.
  - Ensure all error paths use `errorHandler` (`failed-precondition`, etc.).
- **Frontend**: Add temporary fallback to accept top-level `{ status, message, data }` until backend change lands.
- **Testing**: Integration test covering successful checkout + empty cart failure.

---

## API Compliance Analysis: order-getOrder

### Backend Analysis
- **Location**: `backend/src-plattr/functions/orders/getOrder.js`
- **Response Format**: Mixed (success returns `{ status, message, data }`; errors via `HttpsError`)
- **Uses ResponseBuilder**: ❌
- **Success Structure**: Single order object or list depending on query
- **Error Handling**: Throws `HttpsError` for not-found/invalid session
- **Field Types**: Strings, arrays, timestamps sanitized

### Flutter Analysis
- **Model Location**: `lib/pages/checkout_order_flow/models/order_models.dart`
- **Parser Location**: `lib/pages/checkout_order_flow/order_repository.dart`
- **Null Safety**: Compliant (custom sanitizers, fallback constructors)
- **Error Handling**: Comprehensive (maps both result and top-level status, handles arrays)
- **Response Format Expected**: Mixed (supports `result` and direct)

### Compliance Status
- **Format Compliance**: ✅
- **Field Compliance**: ✅ (sanitizers cover legacy data)
- **Error Compliance**: ⚠️ (plain `HttpsError` lacks structured details)
- **Overall Status**: REVIEW

### Critical Issues
1. Missing `ResponseBuilder` leads to inconsistent envelope compared to newer APIs.

### Implementation Plan
- **Backend**: Adopt `ResponseBuilder` for all branches, include `code` in errors.
- **Frontend**: Maintain current fallbacks; add logging for unexpected structures.
- **Testing**: Add tests covering single order vs order list parsing.

---

## Summary Table

| API | Format | Field | Error | Overall |
| --- | --- | --- | --- | --- |
| table-validateTableAndLocation | ✅ | ✅ | ✅ | **PASS** |
| table-validateOTP | ✅ | ✅ | ⚠️ | **REVIEW** |
| menu-fetchMenu-fetchMenu | ❌ | ❌ | ⚠️ | **FAIL** |
| cart-getCart | ✅ | ✅ | ⚠️ | **REVIEW** |
| cart-addItemToCart | ✅ | ✅ | ✅ | **PASS** |
| cart-removeItemFromCart | ✅ | ✅ | ⚠️ | **REVIEW** |
| cart-checkoutCart | ❌ | ⚠️ | ⚠️ | **FAIL** |
| order-getOrder | ✅ | ✅ | ⚠️ | **REVIEW** |

## Next Steps
1. Prioritize backend ResponseBuilder adoption for `menu_fetch`, `checkoutCart`, `getOrder`, `getCart`, and `removeItemFromCart`.
2. Add frontend fallbacks where unavoidable (menu + checkout) to prevent blank UI states until backend is aligned.
3. Expand integration tests to cover both success and error envelopes per API.

---

## Simplifying App-Side Parsing (Senior Engineering Recommendation)

To shrink the amount of hand-rolled parsing and Freezed boilerplate while making the pipeline more robust, align both halves of the stack around a single response contract and a shared parser layer.

1. **Adopt a Single Envelope Everywhere**
   - Backend: enforce `ResponseBuilder.success/error` (or an equivalent helper) for *every* callable. Expose a lightweight lint/checklist so new functions cannot merge without the envelope.
   - Define the canonical JSON contract once (`{ status: 'success' | 'error', message, data?, error? }`) and fail CI if a function returns something else.

2. **Generate Dart Models from a Shared Schema**
   - Document endpoints in OpenAPI/JSON Schema (the schema can be generated from the envelope + payload shape).
   - Use `swagger_dart_code_generator` or `openapi-generator` to produce Dart DTOs automatically. Those generated classes pair with `json_serializable`; no manual Freezed work required for core contracts.
   - For hand-written models that must stay, keep them tiny and reuse generic wrappers (see next bullet) so only domain-specific payloads use Freezed.

3. **Centralise Envelope Parsing**
   - Create one generic `UnifiedResponse<T>` class that handles:
     ```dart
     class UnifiedResponse<T> {
       final bool isSuccess;
       final String message;
       final T? data;
       final ApiError? error;

       factory UnifiedResponse.fromJson(
         Map<String, dynamic> json,
         T Function(Object?) fromJson,
       ) {
         final status = json['status'] as String? ?? 'error';
         if (status == 'success') {
           return UnifiedResponse(
             isSuccess: true,
             message: json['message']?.toString() ?? '',
             data: json['data'] != null ? fromJson(json['data']) : null,
             error: null,
           );
         }
         return UnifiedResponse(
           isSuccess: false,
           message: json['message']?.toString() ?? 'Unknown error',
           data: null,
           error: ApiError.fromJson(json['error'] as Map<String, dynamic>? ?? const {}),
         );
       }
     }
     ```
   - Every repository then becomes `final res = UnifiedResponse.fromJson(response.data, (payload) => MenuData.fromJson(payload as Map<String,dynamic>));` removing dozens of bespoke parsers.

4. **Shrink Domain Models**
   - Limit Freezed usage to immutable domain entities (CartItem, MenuItem, Order) only. Response wrappers become generated DTOs.
   - For transient payloads (e.g., OTP success with `sessionId`), prefer `record`/simple classes or `Map<String, dynamic>` until they stabilise.

5. **Surface Breakages Early**
   - Add golden tests that run backend functions via the emulator and compare the JSON against the schema. Failures immediately highlight envelope drift before Flutter devs touch parsing code.

With these steps, the Flutter app manages only a couple of generic helpers plus compact domain models; the churn from changing backend payloads is caught by schema/code generation rather than manual serializer edits.

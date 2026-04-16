# Unified API Response Contracts

Comprehensive API response standards and implementation guidelines for the Plattr backend.

## Table of Contents

- [Overview](#overview)
- [Response Envelope Format](#response-envelope-format)
  - [Success Response](#success-response)
  - [Error Response](#error-response)
- [Backend Implementation](#backend-implementation)
  - [ResponseBuilder Usage](#responsebuilder-usage)
  - [ErrorHandler Usage](#errorhandler-usage)
- [Frontend Implementation](#frontend-implementation)
  - [UnifiedResponseParser Usage](#unifiedresponseparser-usage)
  - [Repository Pattern](#repository-pattern)
- [API Coverage](#api-coverage)
- [Guard Rails](#guard-rails)
- [Migration Strategy](#migration-strategy)
- [Testing](#testing)

---

## Overview

All Plattr APIs follow a unified response structure: `{ result: { status, message, data } }`. This standardization ensures:

- **Consistency**: All APIs return the same envelope format
- **Type Safety**: Frontend can parse responses predictably
- **Error Handling**: Consistent error structure with codes and messages
- **Maintainability**: Single source of truth for response patterns

---

## Response Envelope Format

### Success Response

Every successful response uses the `ResponseBuilder.success()` method:

```javascript
// Backend usage
return ResponseBuilder.success(
  { ...data },
  'Human friendly message'
);
```

**Response Structure:**
```json
{
  "result": {
    "status": "success",
    "message": "Human-readable message",
    "data": { /* response payload */ }
  }
}
```

> [!IMPORTANT]
> All fields (`status`, `message`, `data`) are **mandatory**. The `data` field must be an object, even when empty.

---

### Error Response

Use `ErrorHandler` helpers instead of throwing `functions.https.HttpsError` directly:

```javascript
// Backend usage
errorHandler.badRequest('Restaurant ID is required', { restaurantId });
errorHandler.handleError(error, 'checkoutCart', { restaurantId, tableId });
```

**Response Structure:**
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

**Available Error Helpers:**

| Method | HTTP Code | Use Case |
|--------|-----------|----------|
| `badRequest()` | 400 | Invalid input parameters |
| `notFound()` | 404 | Resource not found |
| `unauthorized()` | 401 | Authentication required |
| `preconditionFailed()` | 412 | Business rule violation |
| `internalError()` | 500 | Server error |
| `handleError()` | varies | Catch block error handling |

---

## Backend Implementation

### ResponseBuilder Usage

**Location:** `backend/src-plattr/functions/utils/ResponseBuilder.js`

```javascript
// Success response
return ResponseBuilder.success(data, 'Operation successful');

// Error responses
return ResponseBuilder.error('validation_failed', 'Invalid input', details);
return ResponseBuilder.notFound('Resource not found');
return ResponseBuilder.unauthorized('Authentication required');
return ResponseBuilder.internalError('Server error occurred');
```

### ErrorHandler Usage

```javascript
// Specific errors
errorHandler.badRequest('Restaurant ID is required', { restaurantId });

// Catch block handling
try {
  // operation
} catch (error) {
  errorHandler.handleError(error, 'functionName', { contextData });
}
```

---

## Frontend Implementation

### UnifiedResponseParser Usage

**Location:** `frontend/flutter_boilerplate/lib/utils/UnifiedResponseParser.dart`

```dart
// Parse response with type safety
final response = UnifiedResponseParser.parse<TableValidationData>(
  json,
  dataParser: (data) => TableValidationData.fromJson(data),
);

// Check and handle
if (response.isSuccess) {
  final data = response.dataOrThrow;
  // Handle success
} else {
  final errorMessage = response.errorMessage;
  // Handle error
}
```

### Repository Pattern

**Location:** `frontend/flutter_boilerplate/lib/pages/table_verification/unified_table_repository.dart`

```dart
final repository = UnifiedTableRepository();
final response = await repository.validateTableAndLocation(
  restaurantId: 'rest123',
  tableId: 'table123',
  userLocation: UserLocation(latitude: 0.0, longitude: 0.0),
);

if (response.isSuccess) {
  final data = response.dataOrThrow;
  // Handle successful validation
}
```

---

## API Coverage

### Table Validation APIs

| Endpoint | Status |
|----------|--------|
| `validateTableAndLocation` | ✅ Updated |
| `validateOTP` | ✅ Updated |
| `checkTableStatus` | ✅ Updated |
| `getTablesForRestaurant` | ✅ Updated |
| `getTableDetails` | ✅ Updated |
| `assignTableToServer` | ✅ Updated |
| `unassignTableFromServer` | ✅ Updated |
| `generateTableOTP` | ✅ Updated |
| `updateTableStatus` | ✅ Updated |
| `cleanupInactiveSessions` | ✅ Updated |

### Frontend Model Classes

| Model | Purpose |
|-------|---------|
| `TableValidationData` | Table validation response |
| `OtpValidationData` | OTP validation response |
| `TableStatusData` | Table status response |
| `TableListData` | Table list response |
| `TableDetailsData` | Table details response |
| `TableAssignmentData` | Assignment response |
| `TableOtpData` | OTP generation response |
| `TableStatusUpdateData` | Status update response |

---

## Guard Rails

1. **Code Review**: Reject callable endpoints that return raw objects or booleans
2. **Unit Tests**: `test/ResponseBuilder.test.js` asserts canonical shape—extend when envelope changes
3. **Telemetry**: Log `{ status, message }` before each return for monitoring

---

## Migration Strategy

### Existing APIs
- Old response format is still supported for backward compatibility
- Gradual migration over time

### New APIs
- **Backend**: Use `ResponseBuilder` for all responses
- **Frontend**: Use `UnifiedResponseParser` for parsing
- Follow established patterns and conventions

---

## Testing

### Backend Tests

**Location:** `backend/src-plattr/functions/test/ResponseBuilder.test.js`

- 19 test cases covering:
  - Success response building
  - Error response building
  - Helper method validation
  - JSON serialization

### Frontend Tests

**Location:** `frontend/flutter_boilerplate/test/unified_response_test.dart`

- 23 test cases covering:
  - Success/error response parsing
  - Edge case handling
  - Extension method testing
  - Model parsing validation

---

## Files Reference

### Backend
- `backend/src-plattr/functions/utils/ResponseBuilder.js` - Response builder
- `backend/src-plattr/functions/table/table.js` - Updated table APIs
- `backend/src-plattr/functions/test/ResponseBuilder.test.js` - Tests

### Frontend
- `frontend/flutter_boilerplate/lib/utils/UnifiedResponseParser.dart` - Parser
- `frontend/flutter_boilerplate/lib/pages/table_verification/models/unified_models.dart` - Models
- `frontend/flutter_boilerplate/lib/pages/table_verification/unified_table_repository.dart` - Repository
- `frontend/flutter_boilerplate/lib/singletonGods/api_constants.dart` - Endpoints
- `frontend/flutter_boilerplate/test/unified_response_test.dart` - Tests

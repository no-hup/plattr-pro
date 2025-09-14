# Table API Workflow Test Document

This document outlines the complete API workflow test for the table management functionality. Each test builds on the previous one to verify the entire flow from table scanning through session management.

## Prerequisites

- Firebase emulator running
- Mock data imported into emulator
- Feature flags set appropriately

## Feature Flags
- `isOtpManadatoryAtScan`: Controls whether OTP validation is required at the scan time
- `isUsernameEnabled`: Controls whether username is mandatory during OTP validation
- `isMultiUserSupportEnabled`: Controls whether multiple users can join the same table

## API Request Format Guidelines

All API requests must follow a consistent structure with the `data` wrapper:

```bash
curl --location 'http://127.0.0.1:5001/rms-app-dd875/us-central1/[function-name]' \
--header 'Content-Type: application/json' \
--data '{
  "data": {
    // Request parameters go here
    "param1": "value1",
    "param2": "value2"
  }
}'
```

This structure is required for all Firebase callable functions. Failing to include the `data` wrapper will result in "Request body is missing data" errors.

## Test Sequence

### 1. Validate Table and Location - Active Table with Valid Session

**Purpose**: Verify table validation works correctly when user has a valid session

**Command**:
```bash
curl --location 'http://127.0.0.1:5001/rms-app-dd875/us-central1/table-validateTableAndLocation' \
--header 'Content-Type: application/json' \
--data '{
  "data": {
    "restaurantId": "rest001",
    "tableId": "table001",
    "userLocation": {
      "latitude": 40.7128,
      "longitude": -74.006
    },
    "sessionId": "session001"
  }
}'
```

**Verification Points**:
- Response should include successful access granted
- Table status should be "active"
- Table details should match mock data for table001
- Session information should be included
- Primary customer information should match mock data
- Response should contain occupiedBy array with customer phone numbers

**Expected Response**:
```json
{
  "status": "success",
  "message": "Access granted",
  "data": {
    "tableStatus": "active",
    "restaurant": {
      "name": "The Gourmet Grove",
      "id": "rest001"
    },
    "table": {
      "number": "T1",
      "id": "table001",
      "capacity": 4,
      "assignedServerId": "server001"
    },
    "session": {
      "sessionId": "session001",
      "expiresAt": "2023-03-15T22:27:14.000Z"
    },
    "primaryCustomer": {
      "phoneNumber": "1234567890",
      "name": "John Customer"
    },
    "occupiedBy": ["1234567890"]
  }
}
```

### 2. Validate Table and Location - Without Session (OTP Required)

**Purpose**: Verify table validation behavior when OTP is required at scan time

**Prerequisites**: 
- Set feature flag `isOtpManadatoryAtScan` to `true`

**Command**:
```bash
curl --location 'http://127.0.0.1:5001/rms-app-dd875/us-central1/table-validateTableAndLocation' \
--header 'Content-Type: application/json' \
--data '{
  "data": {
    "restaurantId": "rest001",
    "tableId": "table001",
    "userLocation": {
      "latitude": 40.7128,
      "longitude": -74.006
    }
  }
}'
```

**Verification Points**:
- Response should indicate authentication is required
- Error status should be included with appropriate message
- OTP requirement flag should be true
- Auth message should reference primary customer or server

**Expected Response**:
```json
{
  "status": "error",
  "message": "Authentication required",
  "data": {
    "tableStatus": "active",
    "restaurant": {
      "name": "The Gourmet Grove",
      "id": "rest001"
    },
    "table": {
      "number": "T1",
      "id": "table001",
      "capacity": 4
    },
    "primaryCustomer": {
      "phoneNumber": "1234567890",
      "name": "John Customer"
    },
    "assignedServer": {
      "name": "John Doe",
      "id": "server001"
    },
    "authMessage": "Please ask John Customer or your server John Doe for the OTP",
    "isUsernameMandatory": false,
    "isPhoneNumberMandatory": false,
    "isMultiUserSupported": true,
    "otpRequired": true
  }
}
```

### 3. Validate Table and Location - Without Session (OTP Not Required)

**Purpose**: Verify table validation behavior when OTP is not required at scan time

**Prerequisites**: 
- Set feature flag `isOtpManadatoryAtScan` to `false`

**Command**:
```bash
curl --location 'http://127.0.0.1:5001/rms-app-dd875/us-central1/table-validateTableAndLocation' \
--header 'Content-Type: application/json' \
--data '{
  "data": {
    "restaurantId": "rest001",
    "tableId": "table001",
    "userLocation": {
      "latitude": 40.7128,
      "longitude": -74.006
    }
  }
}'
```

**Verification Points**:
- Response should indicate success with access granted
- Table status should be active
- Response should include otpRequiredForOrder flag set to true
- Primary customer information should be included

**Expected Response**:
```json
{
  "status": "success",
  "message": "Access granted",
  "data": {
    "tableStatus": "active",
    "restaurant": {
      "name": "The Gourmet Grove",
      "id": "rest001"
    },
    "table": {
      "number": "T1",
      "id": "table001",
      "capacity": 4
    },
    "otpRequiredForOrder": true,
    "primaryCustomer": {
      "phoneNumber": "1234567890",
      "name": "John Customer"
    }
  }
}
```

### 4. Validate Table and Location - Vacant Table

**Purpose**: Verify table validation behavior for a vacant table

**Prerequisites**: 
- Set feature flag `isOtpManadatoryAtScan` to `false`

**Command**:
```bash
curl --location 'http://127.0.0.1:5001/rms-app-dd875/us-central1/table-validateTableAndLocation' \
--header 'Content-Type: application/json' \
--data '{
  "data": {
    "restaurantId": "rest001",
    "tableId": "table002",
    "userLocation": {
      "latitude": 40.7128,
      "longitude": -74.006
    }
  }
}'
```

**Verification Points**:
- Response should indicate success with access granted
- Table status should be vacant
- No session information should be included
- No primary customer information should be included

**Expected Response**:
```json
{
  "status": "success",
  "message": "Access granted",
  "data": {
    "tableStatus": "vacant",
    "restaurant": {
      "name": "The Gourmet Grove",
      "id": "rest001"
    },
    "table": {
      "number": "T2",
      "id": "table002",
      "capacity": 6
    }
  }
}
```

### 5. Validate OTP - Primary Customer (Vacant Table)

**Purpose**: Verify OTP validation for a primary customer on a vacant table

**Command**:
```bash
curl --location 'http://127.0.0.1:5001/rms-app-dd875/us-central1/table-validateOTP' \
--header 'Content-Type: application/json' \
--data '{
  "data": {
    "restaurantId": "rest001",
    "tableId": "table002",
    "otp": "123456",
    "phoneNumber": "9876543210",
    "name": "Jane Customer"
  }
}'
```

**Verification Points**:
- Response should indicate success
- Custom token should be generated for the phone number
- User should be marked as primary customer
- Session ID should be included
- Table status should change to active in database
- User phone number should be stored in occupiedBy array
- Primary customer details should be updated

**Expected Response**:
```json
{
  "status": "success",
  "customToken": "firebase-custom-auth-token",
  "isPrimaryCustomer": true,
  "sessionId": "session002"
}
```

### 6. Validate OTP - Secondary Customer (Active Table)

**Purpose**: Verify OTP validation for a secondary customer on an active table

**Prerequisites**:
- Set feature flag `isMultiUserSupportEnabled` to `true`
- Table001 should be in active state with an existing primary customer

**Command**:
```bash
curl --location 'http://127.0.0.1:5001/rms-app-dd875/us-central1/table-validateOTP' \
--header 'Content-Type: application/json' \
--data '{
  "data": {
    "restaurantId": "rest001",
    "tableId": "table001",
    "otp": "123456",
    "phoneNumber": "5551234567",
    "name": "Secondary Customer"
  }
}'
```

**Verification Points**:
- Response should indicate success
- Custom token should be generated for the phone number
- User should be marked as secondary customer (not primary)
- Session ID should match existing session
- Table status should remain active
- User phone number should be added to occupiedBy array
- Primary customer details should remain unchanged

**Expected Response**:
```json
{
  "status": "success",
  "customToken": "firebase-custom-auth-token",
  "isPrimaryCustomer": false,
  "sessionId": "session001"
}
```

### 7. Validate OTP - Incorrect OTP (Active Table)

**Purpose**: Verify behavior when incorrect OTP is provided for an active table

**Command**:
```bash
curl --location 'http://127.0.0.1:5001/rms-app-dd875/us-central1/table-validateOTP' \
--header 'Content-Type: application/json' \
--data '{
  "data": {
    "restaurantId": "rest001",
    "tableId": "table001",
    "otp": "999999",
    "phoneNumber": "5557654321",
    "name": "Wrong OTP Customer"
  }
}'
```

**Verification Points**:
- Response should indicate failure with specific message
- Response should guide user to ask primary customer or server

**Expected Response**:
```json
{
  "status": "ask_primary_customer",
  "message": "Please ask the primary customer or the server/waiter for the correct OTP."
}
```

### 8. Validate OTP - Missing Required Fields

**Purpose**: Verify proper error handling when required fields are missing

**Prerequisites**:
- Set feature flag `isUsernameEnabled` to `true`

**Command**:
```bash
curl --location 'http://127.0.0.1:5001/rms-app-dd875/us-central1/table-validateOTP' \
--header 'Content-Type: application/json' \
--data '{
  "data": {
    "restaurantId": "rest001",
    "tableId": "table002",
    "otp": "123456",
    "phoneNumber": "9876543210"
  }
}'
```

**Verification Points**:
- Response should indicate bad request error
- Error message should indicate that name is required

**Expected Response**:
```json
{
  "status": "error",
  "message": "Name is required for primary customer or when username feature is enabled",
  "code": "invalid-argument"
}
```

### 9. Check Table Status

**Purpose**: Verify table status retrieval functionality

**Command**:
```bash
curl --location 'http://127.0.0.1:5001/rms-app-dd875/us-central1/table-checkTableStatus' \
--header 'Content-Type: application/json' \
--data '{
  "data": {
    "restaurantId": "rest001",
    "tableId": "table001"
  }
}'
```

**Verification Points**:
- Response should contain full table details
- Status should match the current table status
- Primary customer information should be included
- Server information should be included if assigned
- OTP validity should be accurately reported

**Expected Response**:
```json
{
  "tableNumber": "T1",
  "capacity": 4,
  "status": "active",
  "primaryCustomer": {
    "phoneNumber": "1234567890",
    "name": "John Customer"
  },
  "occupiedBy": ["1234567890", "5551234567"],
  "assignedServer": {
    "name": "John Doe",
    "status": "active"
  },
  "hasActiveOTP": true
}
```

### 10. Error Handling Tests

#### 10.1 Invalid Restaurant ID

**Purpose**: Verify error handling for non-existent restaurant

**Command**:
```bash
curl --location 'http://127.0.0.1:5001/rms-app-dd875/us-central1/table-validateTableAndLocation' \
--header 'Content-Type: application/json' \
--data '{
  "data": {
    "restaurantId": "nonexistent",
    "tableId": "table001",
    "userLocation": {
      "latitude": 40.7128,
      "longitude": -74.006
    }
  }
}'
```

**Expected Response**:
```json
{
  "status": "error",
  "message": "Restaurant not found",
  "code": "not-found"
}
```

#### 10.2 Invalid Table ID

**Purpose**: Verify error handling for non-existent table

**Command**:
```bash
curl --location 'http://127.0.0.1:5001/rms-app-dd875/us-central1/table-validateTableAndLocation' \
--header 'Content-Type: application/json' \
--data '{
  "data": {
    "restaurantId": "rest001",
    "tableId": "nonexistent",
    "userLocation": {
      "latitude": 40.7128,
      "longitude": -74.006
    }
  }
}'
```

**Expected Response**:
```json
{
  "status": "error",
  "message": "Table not found",
  "code": "not-found"
}
```

#### 10.3 Missing Required Parameters

**Purpose**: Verify error handling for missing required parameters

**Command**:
```bash
curl --location 'http://127.0.0.1:5001/rms-app-dd875/us-central1/table-validateTableAndLocation' \
--header 'Content-Type: application/json' \
--data '{
  "data": {
    "restaurantId": "rest001"
  }
}'
```

**Expected Response**:
```json
{
  "status": "error",
  "message": "Missing required parameters",
  "code": "invalid-argument"
}
```

#### 10.4 User Not in Restaurant Location

**Purpose**: Verify location validation error handling
**Note**: For this test to work properly, you'll need to modify the `isWithinRadius` function to return `false` temporarily

**Command**:
```bash
curl --location 'http://127.0.0.1:5001/rms-app-dd875/us-central1/table-validateTableAndLocation' \
--header 'Content-Type: application/json' \
--data '{
  "data": {
    "restaurantId": "rest001",
    "tableId": "table001",
    "userLocation": {
      "latitude": 0,
      "longitude": 0
    }
  }
}'
```

**Expected Response**:
```json
{
  "status": "error",
  "message": "User not in restaurant premises",
  "code": "failed-precondition"
}
```

### 11. Session Cleanup Tests

**Purpose**: Verify the automatic cleanup of inactive table sessions

#### 11.1 Setup for Session Cleanup Test

**Prerequisites**:
- Table must have been inactive for at least 1 hour

**Steps to Prepare Test**:
1. Update the lastActivity timestamp for a table to be more than 1 hour old:

```bash
# This would be done directly in the Firestore emulator database
# For testing purposes, you can modify the lastActivity timestamp directly
```

#### 11.2 Invoke Session Cleanup

**Command**:
```bash
curl --location 'http://127.0.0.1:5001/rms-app-dd875/us-central1/table-cleanupInactiveSessions' \
--header 'Content-Type: application/json' \
--data '{
  "data": {}
}'
```

**Verification Points**:
- Function should execute without errors
- Inactive tables should be updated to vacant status
- Sessions for inactive tables should be ended
- Active tables should remain unchanged

**Expected Outcome**:
The function doesn't return a response directly, but after execution:
1. Check the table status (should be VACANT for inactive tables):
```bash
curl --location 'http://127.0.0.1:5001/rms-app-dd875/us-central1/table-checkTableStatus' \
--header 'Content-Type: application/json' \
--data '{
  "data": {
    "restaurantId": "rest001", 
    "tableId": "table001"
  }
}'
```

2. Verify that the session has been terminated by attempting to use the session:
```bash
curl --location 'http://127.0.0.1:5001/rms-app-dd875/us-central1/table-validateTableAndLocation' \
--header 'Content-Type: application/json' \
--data '{
  "data": {
    "restaurantId": "rest001",
    "tableId": "table001",
    "userLocation": {
      "latitude": 40.7128,
      "longitude": -74.006
    },
    "sessionId": "session001"
  }
}'
```
This should now require a new OTP validation since the session has been terminated.

## Troubleshooting

If tests fail, check:
1. Firebase emulator is running
2. Mock data was imported correctly
3. Feature flags are set as expected
4. The `isWithinRadius` function is not hardcoded to return `true` if testing location validation

## Implementation Notes

### Edge Cases Covered
1. **Session Management**: Tests with valid, invalid, and no session
2. **Table States**: Tests for active, vacant, and non-existent tables
3. **OTP Validation**: Tests for correct OTP, incorrect OTP, and missing OTP
4. **Feature Flags**: Tests different behaviors based on feature flag settings
5. **User Types**: Tests for primary and secondary customers
6. **Error Handling**: Tests for various error conditions and proper error responses

### Multi-User Support
The workflow tests multiple customers joining the same table session when `isMultiUserSupportEnabled` is true.

### Authentication Flow
The tests verify the complete authentication flow from table scan through OTP validation and session creation.

# Restaurant App API Documentation

## Table Scan API

### TODO
- [x] Location Check: Verify user's physical location matches restaurant location
- [ ] Multi-User Support: Allow multiple users to share the same table session

### Endpoint
```
/api/tables/scan
```

### Method
`POST`

### Purpose
This API is called when a user scans a QR code on a restaurant table. It validates the table state and determines whether the user can access the menu or needs to provide an OTP.

### Request Payload
```json
{
  "data": {
    "restaurantId": "rest001",
    "tableId": "table001",
    "sessionId": "sess_12345", // Optional: Included if user has an existing session
    "userLocation": {          // Optional: User's location coordinates 
      "latitude": 123.456,
      "longitude": 789.012
    }
  }
}
```

### Response

#### Success Response (HTTP Status Code: 200)
This response is returned when:
- User has a valid session, OR
- Table is vacant (no OTP required for vacant tables), OR
- Table is active but OTP check feature flag is set to false

```json
{
  "status": "success",
  "message": "Access granted",
  "data": {
    "tableStatus": "vacant|active",
    "restaurant": {
      "name": "The Gourmet Grove",
      "id": "rest001"
    },
    "table": {
      "number": "T1",
      "id": "table001",
      "capacity": 4,  // Optional: Table seating capacity
      "assignedServerId": "server001"  // Optional: ID of the server assigned to this table
    },
    "session": {
      "sessionId": "sess_12345",
      "expiresAt": "2025-03-24T20:00:00Z"
    },
    "occupiedBy": ["+1234567890"],  // Optional: Array of phone numbers of customers occupying the table
    "primaryCustomer": {
      "name": "John Doe",
      "phoneNumber": "+1234567890"  // Optional: Only included if table is active
    },
    "otpRequiredForOrder": true  // Optional: Only included when table is active and OTP is not required at scan time
  }
}
```

#### Error Response - OTP Required (HTTP Status Code: 401 Unauthorized)
This response is returned when:
- Table is active, AND
- User does not have a valid session, AND
- OTP check is mandatory

```json
{
  "error": {
    "code": "unauthenticated",
    "message": "Authentication required",
    "details": {
      "httpCode": 401,
      "tableStatus": "active",
      "restaurant": {
        "name": "The Gourmet Grove",
        "id": "rest001"
      },
      "table": {
        "number": "T1",
        "id": "table001"
      },
      "primaryCustomer": {
        "name": "John Doe",  // Optional: Included if primary customer exists
        "phoneNumber": "+1234567890"  // Optional: Included if primary customer exists
      },
      "assignedServer": {
        "name": "Server Name",  // Optional: Included if server is assigned
        "id": "server001"  // Optional: Included if server is assigned
      },
      "authMessage": "Please ask John Doe for the OTP to join this table",  // Dynamic message based on available contact person
      "isUsernameMandatory": true,
      "isPhoneNumberMandatory": true,  // Indicates if phoneNumber is required based on table state and feature flags
      "isMultiUserSupported": false,   // Indicates if multiple users can join the same table
      "otpRequired": true,
      "error": "OTP authentication required"
    }
  }
}
```

The `authMessage` field provides context-specific guidance based on available contact persons:

1. If primary customer exists: "Please ask [primaryCustomer.name] for the OTP to join this table"
2. If only server exists: "Please ask your server [assignedServer.name] for the OTP to join this table"
3. If both exist: "Please ask [primaryCustomer.name] or your server [assignedServer.name] for the OTP"
4. If neither exists: "Please ask the restaurant staff for the OTP to join this table"

#### Error Response - Table Disabled (HTTP Status Code: 403 Forbidden)
This response is returned when:
- Table is disabled or unavailable

```json
{
  "error": {
    "code": "permission-denied",
    "message": "This table is currently unavailable",
    "details": {
      "httpCode": 403,
      "tableStatus": "disabled",
      "restaurant": {
        "name": "The Gourmet Grove",
        "id": "rest001"
      },
      "table": {
        "number": "T1",
        "id": "table001"
      },
      "error": "Table is disabled"
    }
  }
}
```

#### Error Response - Location Check Failed (HTTP Status Code: 412 Precondition Failed)
This response is returned when:
- User's location doesn't match the restaurant's location

```json
{
  "error": {
    "code": "failed-precondition",
    "message": "User not in restaurant premises",
    "details": {
      "httpCode": 412,
      "restaurant": {
        "name": "The Gourmet Grove",
        "id": "rest001"
      },
      "table": {
        "number": "T1",
        "id": "table001"
      },
      "userLocation": {
        "latitude": 123.456,
        "longitude": 789.012
      },
      "restaurantLocation": {
        "latitude": 123.457,
        "longitude": 789.013
      },
      "error": "User location validation failed"
    }
  }
}
```

### Error Handling
- Invalid/missing parameters: 400 Bad Request
  ```json
  {
    "error": {
      "code": "invalid-argument",
      "message": "Invalid or missing parameters",
      "details": {
        "httpCode": 400,
        "errors": ["restaurantId is required", "tableId is required"]
      }
    }
  }
  ```

- Restaurant not found: 404 Not Found
  ```json
  {
    "error": {
      "code": "not-found",
      "message": "Restaurant not found",
      "details": {
        "httpCode": 404
      }
    }
  }
  ```

- Table not found: 404 Not Found
  ```json
  {
    "error": {
      "code": "not-found",
      "message": "Table not found",
      "details": {
        "httpCode": 404
      }
    }
  }
  ```

- System error: 500 Internal Server Error
  ```json
  {
    "error": {
      "code": "internal",
      "message": "An unexpected error occurred",
      "details": {
        "httpCode": 500,
        "restaurantId": "rest001",
        "tableId": "table001",
        "error": "Internal server error"
      }
    }
  }
  ```

## OTP Validation API

### Endpoint
```
/api/tables/validate-otp
```

### Method
`POST`

### Purpose
This API validates the OTP provided by a user trying to access a table's menu or place an order. It creates a session for authenticated users and identifies the primary customer for a table.

### Request Payload
```json
{
  "data": {
    "restaurantId": "rest001",
    "tableId": "table001",
    "otp": "123456",
    "phoneNumber": "+1234567890",  // Optional based on isPhoneNumberMandatory flag
    "name": "John Doe"  // Optional based on isUsernameMandatory flag
  }
}
```

### When are parameters optional?
- **phoneNumber**: Only mandatory if:
  - Table is vacant (first primary customer) OR
  - Multi-user support is disabled (`isMultiUserSupportEnabled` = false)
- **name**: Mandatory if:
  - Username is enabled (`isUsernameEnabled` = true) OR
  - User is becoming a primary customer (regardless of username flag)

### Error Responses for Missing Required Fields
- If phoneNumber is required but missing:
```json
{
  "error": {
    "code": "invalid-argument",
    "message": "Phone number is required",
    "details": {
      "httpCode": 400,
      "details": "Phone number is required for primary customers or when multi-user support is disabled"
    }
  }
}
```

- If name is required but missing:
```json
{
  "error": {
    "code": "invalid-argument",
    "message": "Name is required",
    "details": {
      "httpCode": 400,
      "details": "Name is required when username feature is enabled or for primary customers"
    }
  }
}
```

### Response

#### Success Response (HTTP Status Code: 200)
```json
{
  "status": "success",
  "customToken": "firebase-custom-auth-token",
  "isPrimaryCustomer": true,
  "sessionId": "sess_12345"
}
```

#### Alternate Success Response - Secondary User (HTTP Status Code: 200)
```json
{
  "status": "success",
  "customToken": "firebase-custom-auth-token",
  "isPrimaryCustomer": false,
  "sessionId": "sess_12345"
}
```

#### Error Response - Wrong OTP for Active Table (HTTP Status Code: 401 Unauthorized)
When someone tries to join an active table with incorrect OTP:

```json
{
  "error": {
    "code": "unauthenticated",
    "message": "Invalid OTP",
    "details": {
      "httpCode": 401,
      "status": "ask_primary_customer",
      "message": "Please ask the primary customer or the server/waiter for the correct OTP.",
      "tableStatus": "active"
    }
  }
}
```

#### Error Response - Invalid OTP (HTTP Status Code: 401 Unauthorized)
```json
{
  "error": {
    "code": "unauthenticated",
    "message": "Invalid OTP",
    "details": {
      "httpCode": 401,
      "details": "The provided OTP is incorrect",
      "tableStatus": "vacant"
    }
  }
}
```

#### Error Response - No Active Session (HTTP Status Code: 412 Precondition Failed)
When a user tries to join a table that should have an active session but doesn't:

```json
{
  "error": {
    "code": "failed-precondition",
    "message": "No active session for this table",
    "details": {
      "httpCode": 412,
      "restaurantId": "rest001",
      "tableId": "table001",
      "error": "Missing active session"
    }
  }
}
```

## OTP Generation and Validation

### OTP Configuration
- Length: 6 digits
- Validity: 5 minutes from creation time
- Storage: Stored in the table document with creation and expiry timestamps
- **Note:** OTP is generated ONLY when scanning a `VACANT` table, not for tables in `OTP_PENDING` state

### OTP Generation Process
1. A 6-digit numeric OTP is generated when:
   - A table is first scanned and is in `VACANT` state
   - A user requests a new OTP for an active table
   - An existing OTP expires

2. OTP object structure:
   ```json
   {
     "code": "123456",
     "createdAt": "2023-03-24T18:00:00Z",
     "expiresAt": "2023-03-24T18:05:00Z",
     "status": "ACTIVE"  // Can be ACTIVE, EXPIRED, or USED
   }
   ```

3. OTP Validation Logic:
   - For vacant tables: OTP validation assigns the user as the primary customer
   - For active tables: OTP validation allows secondary customers to join the existing session (if multi-user support is enabled)
   - Invalid OTPs: Return appropriate error responses based on table state and validation context

## Session Creation and Management

### Session States
- `ACTIVE`: Session is currently in use
- `ENDED`: Session was manually ended
- `EXPIRED`: Session expired due to timeout

### Session Creation Logic
1. Primary user authentication flow:
   - User provides valid OTP for a vacant table
   - System validates user requirements (name and phone number mandatory)
   - System marks user as the primary customer
   - System creates a new session with 4-hour expiration
   - Table status changes to `ACTIVE`

2. Session object structure:
   ```json
   {
     "tableId": "table001",
     "primaryUserId": "+1234567890",
     "users": ["+1234567890"],
     "status": "ACTIVE",
     "createdAt": "2023-03-24T18:00:00Z",
     "updatedAt": "2023-03-24T18:00:00Z",
     "expiresAt": "2023-03-24T22:00:00Z",
     "lastActivityAt": "2023-03-24T18:00:00Z"  // Used for cleanup
   }
   ```

3. Secondary user joining flow:
   - User provides valid OTP for an active table
   - System adds user to the existing session
   - User's ID is added to the `users` array in session document
   - User can access the same menu and place orders

### Session Validation Process
1. When a user scans a table QR code:
   - If sessionId is provided, validate it belongs to this table/restaurant
   - Check if session has expired (compare current time with expiresAt)
   - If valid, grant immediate access without OTP verification
   - If invalid or expired, follow standard OTP verification flow

2. Session cleanup:
   - Inactive sessions are automatically cleaned up after 1 hour of inactivity
   - Cleanup process changes table status back to `VACANT`
   - All related session documents are marked as `ENDED`

## Edge Cases and Special Scenarios

### Vacant Table First Scan
- When a vacant table is scanned for the first time:
  - OTP is generated and stored but not required for menu access
  - Table remains in `VACANT` state until the first order is placed
  - OTP will be required when placing the first order
  - After first order, table state changes to `ACTIVE`

### OTP Expiration During User Flow
- If OTP expires while user is entering it:
  - System returns an error response:
  ```json
  {
    "error": {
      "code": "unauthenticated",
      "message": "Invalid OTP or OTP has expired",
      "details": {
        "httpCode": 401,
        "code": "expired_otp",
        "tableStatus": "active",
        "error": "The provided OTP has expired"
      }
    }
  }
  ```
  - User must request a new OTP from staff or primary customer
  - New OTP is generated with fresh 5-minute validity

### Multiple Users at the Same Table
- When multiple users scan the same table:
  - First authenticated user becomes the primary customer (requires name and phone)
  - Subsequent users can join with or without providing phone number (based on multi-user support)
  - If multi-user support is disabled, subsequent users can access anonymously (without phone)
  - Only users with phone number get a Firebase custom auth token
  - All users can place orders and view menus
  - Only primary customer gets notifications for all orders

### User Location Verification
- The system checks if user's location is within restaurant premises:
  - Uses simple radius check (configurable, default 100 meters)
  - If location check fails, returns error response:
  ```json
  {
    "error": {
      "code": "failed-precondition",
      "message": "User not in restaurant premises",
      "details": {
        "httpCode": 412,
        "restaurant": {
          "name": "<restaurant_name>",
          "id": "<restaurant_id>",
          "location": {
            "latitude": 123.456,
            "longitude": 789.012
          }
        },
        "userLocation": {
          "latitude": 123.556,
          "longitude": 789.112
        },
        "error": "User location validation failed",
        "maxAllowedDistance": 100  // in meters
      }
    }
  }
  ```
  - This prevents remote access to restaurant tables

### Feature Flag Considerations
- `isOtpManadatoryAtScan`: Controls whether OTP verification is required at scan time
  - If true: User must provide OTP to access menu when table is occupied
  - If false: User can view menu without OTP, but will need OTP when placing an order
- `isUsernameEnabled`: Controls whether username is required during authentication
  - If true: User must provide a username along with OTP
  - If false: Only OTP is required for authentication
- `isMultiUserSupportEnabled`: Controls whether multiple users can share the same table
  - If true: Multiple users can join the same table session
  - If false: Only one user can be active per table

### Session Expiration and Renewal
- Sessions expire after 4 hours by default
- When a session expires:
  - User must re-authenticate with OTP
  - New session is created with fresh expiration time
  - Table status remains `ACTIVE` if reauthorization happens within 1 hour
  - If reauthorization fails, system returns:
  ```json
  {
    "error": {
      "code": "failed-precondition",
      "message": "Session has expired",
      "details": {
        "httpCode": 412,
        "error": "Session expired and requires re-authentication",
        "sessionId": "<expired_session_id>",
        "expirationTime": "2023-03-24T22:00:00Z"
      }
    }
  }
  ```

### Table Cleanup and Maintenance
- Tables with no activity for more than 1 hour are automatically reset:
  - Status changes from `ACTIVE` to `VACANT`
  - All sessions are marked as `ENDED`
  - Primary customer information is cleared
  - OTP is invalidated
  - If a user tries to access a cleaned-up table, they receive:
  ```json
  {
    "error": {
      "code": "failed-precondition",
      "message": "Table session has been cleaned up due to inactivity",
      "details": {
        "httpCode": 412,
        "tableStatus": "vacant",
        "lastActivityAt": "2023-03-24T21:00:00Z",
        "cleanupTime": "2023-03-24T22:00:00Z",
        "error": "Table reset due to inactivity"
      }
    }
  }
  ```

### Authentication and Identity
- Users are identified by their phone numbers (when provided)
- After successful OTP validation, a Firebase custom auth token is generated only when phone number is provided
- Anonymous access is allowed for secondary users when multi-user support is disabled
- Customer profiles are created or updated only when both name and phone are provided
- Primary customers always require both name and phone number
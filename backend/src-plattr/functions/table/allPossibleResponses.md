# validateTableAndLocation Function Response Documentation

This document serves as the definitive source of truth for all possible responses from the `validateTableAndLocation` backend function.

## Possible Responses

### Success Responses (HTTP 200 OK equivalent)

These responses indicate the user can proceed, though subsequent actions (like ordering) might still require OTP validation depending on the scenario.

1.  **Valid Session Found**
    *   **Condition:** A valid `sessionId` for the given `restaurantId` and `tableId` is provided and successfully validated. The user is already part of an active session.
    *   **Response Structure:**
        ```json
        {
          "status": "success",
          "message": "Access granted",
          "data": {
            "tableStatus": "active", // Or potentially "pending" if applicable
            "restaurant": {
              "name": "<restaurant_name>",
              "id": "<restaurantId>"
            },
            "table": {
              "number": "<table_number>",
              "id": "<tableId>",
              "capacity": <capacity_number> | null,
              "assignedServerId": "<server_id>" // Optional
            },
            "session": {
              "sessionId": "<validated_session_id>",
              "expiresAt": "<iso_timestamp_string>" // e.g., "2024-08-15T10:30:00.000Z"
            },
            "primaryCustomer": { // Optional: if tableData.primaryCustomer exists
              "name": "<customer_name>",
              "phoneNumber": "<customer_phone>"
            },
            "occupiedBy": [ // Optional: if tableData.occupiedBy exists
              "<phone_number_1>",
              "<phone_number_2>"
            ]
          }
        }
        ```

2.  **Access Granted (Active Table, OTP Not Required at Scan)**
    *   **Condition:** No valid `sessionId` provided, `isOtpManadatoryAtScan` feature flag is **disabled**, and the table status is `active`.
    *   **Response Structure:**
        ```json
        {
          "status": "success",
          "message": "Access granted",
          "data": {
            "tableStatus": "active",
            "restaurant": {
              "name": "<restaurant_name>",
              "id": "<restaurantId>"
            },
            "table": {
              "number": "<table_number>",
              "id": "<tableId>",
              "capacity": <capacity_number> | null,
              "assignedServerId": "<server_id>" // Optional
            },
            "primaryCustomer": { // Optional: if tableData.primaryCustomer exists
              "name": "<customer_name>",
              "phoneNumber": "<customer_phone>"
            },
            "otpRequiredForOrder": true // Indicates OTP will be needed later for actions like ordering
          }
        }
        ```

3.  **Access Granted (Vacant Table, OTP Not Required at Scan)**
    *   **Condition:** No valid `sessionId` provided, `isOtpManadatoryAtScan` feature flag is **disabled**, and the table status is `vacant`. (Note: The function updates the table status to `OTP_PENDING` and generates an OTP in the background for the *next* step, `validateOTP`).
    *   **Response Structure:**
        ```json
        {
          "status": "success",
          "message": "Access granted",
          "data": {
            "tableStatus": "vacant", // Reports original status before internal update
            "restaurant": {
              "name": "<restaurant_name>",
              "id": "<restaurantId>"
            },
            "table": {
              "number": "<table_number>",
              "id": "<tableId>",
              "capacity": <capacity_number> | null,
              "assignedServerId": "<server_id>" // Optional
            }
            // Note: No session info yet. OTP is generated server-side for the next step.
          }
        }
        ```

### Error Responses (Using `ErrorHandler.js` Structure)

These responses indicate an issue preventing access or requiring further action (like OTP). They follow the Firebase `HttpsError` format, potentially including a `details` object.

1.  **Bad Request (`invalid-argument`, HTTP 400)**
    *   **Condition:** Input data (`restaurantId`, `tableId`, `userLocation`, or nested fields like `latitude`/`longitude`) is missing or fails format validation.
    *   **Triggered by:** `TableInputValidation.validateTableAndLocationInput` -> `errorHandler.badRequest`.
    *   **Response Structure:**
        ```json
        {
          "error": {
            "code": "invalid-argument",
            "message": "Invalid input: Missing required field 'tableId'.", // Example message
            "details": {
              "httpCode": 400
              // Optional: Further details might be added by validation logic
            }
          }
        }
        ```

2.  **Authentication Required (`unauthenticated`, HTTP 401)**
    *   **Condition:** No valid `sessionId` provided AND `isOtpManadatoryAtScan` feature flag is **enabled**. This applies regardless of whether the table is `vacant` or `active`.
    *   **Triggered by:** Logic check for `sessionId` and `isOtpManadatoryAtScan` -> `errorHandler.unauthorized`.
    *   **Response Structure:**
        ```json
        {
          "error": {
            "code": "unauthenticated",
            "message": "Authentication required",
            "details": {
              "httpCode": 401,
              "tableStatus": "active" | "pending", // Status might be 'pending' if originally vacant and OTP generated
              "restaurant": {
                "name": "<restaurant_name>",
                "id": "<restaurantId>"
              },
              "table": {
                "number": "<table_number>",
                "id": "<tableId>",
                "capacity": <capacity_number> | null,
                "assignedServerId": "<server_id>" // Optional
              },
              "primaryCustomer": { // Optional: if tableData.primaryCustomer exists
                "name": "<customer_name>",
                "phoneNumber": "<customer_phone>"
              } | null,
              "assignedServer": { // Optional: if server assigned and found
                "name": "<server_name>",
                "id": "<server_id>"
              } | null,
              "authMessage": "<Guidance message on who to ask for OTP>", // e.g., "Please ask John Doe or your server Jane for the OTP"
              "isUsernameMandatory": true | false, // Based on 'isUsernameEnabled' flag
              "isPhoneNumberMandatory": true | false, // Based on table status and 'isMultiUserSupportEnabled' flag
              "isMultiUserSupported": true | false, // Based on 'isMultiUserSupportEnabled' flag
              "otpRequired": true
            }
          }
        }
        ```

3.  **Forbidden (`permission-denied`, HTTP 403)**
    *   **Condition:** The requested table's status in the database is `disabled`.
    *   **Triggered by:** Check on `tableData.status` -> `errorHandler.forbidden`.
    *   **Response Structure:**
        ```json
        {
          "error": {
            "code": "permission-denied",
            "message": "This table is currently unavailable",
            "details": {
              "httpCode": 403,
              "tableStatus": "disabled",
              "restaurant": {
                "name": "<restaurant_name>",
                "id": "<restaurantId>"
              },
              "table": {
                "number": "<table_number>",
                "id": "<tableId>",
                "capacity": <capacity_number> | null,
                "assignedServerId": "<server_id>" // Optional
              }
            }
          }
        }
        ```

4.  **Not Found (`not-found`, HTTP 404)**
    *   **Condition:** The specified `restaurantId` or `tableId` does not correspond to an existing document in Firestore.
    *   **Triggered by:** `validateRestaurantAndTableExistence` -> `errorHandler.notFound`.
    *   **Response Structure (Example: Table Not Found):**
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
    *   **Response Structure (Example: Restaurant Not Found):**
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

5.  **Precondition Failed (`failed-precondition`, HTTP 412)**
    *   **Condition:** The user's provided `userLocation` is determined to be outside the restaurant's defined geographical radius.
    *   **Triggered by:** `isWithinRadius` check -> `errorHandler.preconditionFailed`.
    *   **Response Structure:**
        ```json
        {
          "error": {
            "code": "failed-precondition",
            "message": "User not in restaurant premises",
            "details": {
              "httpCode": 412
            }
          }
        }
        ```

6.  **Internal Server Error (`internal`, HTTP 500)**
    *   **Condition:** Any unexpected error occurs during function execution (e.g., Firestore read/write fails unexpectedly, session validation throws an unknown error, other unhandled exceptions).
    *   **Triggered by:** Generic `catch` block -> `errorHandler.handleError` -> `errorHandler.internalError`.
    *   **Response Structure:**
        ```json
        {
          "error": {
            "code": "internal",
            "message": "An unexpected error occurred.", // Or a more specific default from ErrorMessages
            "details": {
              "httpCode": 500
            }
          }
        }
        ```

---

## Deprecated/Other Scenarios (Covered Above)

*   **Test Case 1 (Valid Session):** Covered by Success Response #1.
*   **Test Case 2 (No Session, OTP Required):** Covered by Error Response #2.
*   **Test Case 3 (No Session, OTP Not Required, Active Table):** Covered by Success Response #2.
*   **Test Case 4 (No Session, OTP Not Required, Vacant Table):** Covered by Success Response #3.
*   **Test Case 10.1 (Invalid Restaurant ID):** Covered by Error Response #4.
*   **Test Case 10.2 (Invalid Table ID):** Covered by Error Response #4.
*   **Test Case 10.3 (Missing Parameters):** Covered by Error Response #1.
*   **Test Case 10.4 (User Not in Location):** Covered by Error Response #5.

This document aims to be exhaustive based on the function's logic and the `ErrorHandler` implementation.

# validateOTP Function Response Documentation

This document section details all possible responses from the `validateOTP` backend function.

## Request Parameters

```json
{
  "data": {
    "restaurantId": "string", // Required: Restaurant ID
    "tableId": "string",     // Required: Table ID
    "otp": "string",        // Required: OTP code
    "phoneNumber": "string", // Required for: primary customers OR when multi-user support is disabled
    "name": "string"        // Required for: primary customers OR when username feature is enabled
  }
}
```

## Possible Responses

### Success Responses (HTTP 200 OK equivalent)

1. **Primary Customer OTP Validation**
   * **Condition:** First user validating OTP for a vacant/pending table
   * **Response Structure:**
   ```json
   {
     "status": "success",
     "customToken": "string", // Firebase custom authentication token
     "isPrimaryCustomer": true,
     "sessionId": "string"    // Newly created session ID
   }
   ```

2. **Secondary Customer OTP Validation**
   * **Condition:** Additional user joining an active table
   * **Response Structure:**
   ```json
   {
     "status": "success",
     "customToken": "string", // Firebase custom authentication token (if phoneNumber provided)
     "isPrimaryCustomer": false,
     "sessionId": "string"    // Existing session ID
   }
   ```

### Error Responses

1. **Bad Request (`invalid-argument`, HTTP 400)**
   * **Condition:** Missing or invalid required parameters
   * **Response Structure:**
   ```json
   {
     "error": {
       "code": "invalid-argument",
       "message": "Phone number is required for this operation",
       "details": {
         "httpCode": 400,
         "details": "Phone number is required for primary customers or when multi-user support is disabled"
       }
     }
   }
   ```

2. **Invalid OTP for Vacant/Pending Table (`unauthenticated`, HTTP 401)**
   * **Condition:** Wrong OTP provided for a vacant or OTP_PENDING table
   * **Response Structure:**
   ```json
   {
     "error": {
       "code": "unauthenticated",
       "message": "Invalid OTP",
       "details": {
         "httpCode": 401,
         "details": "The provided OTP is incorrect",
         "tableStatus": "pending"
       }
     }
   }
   ```

3. **Invalid OTP for Active Table (`unauthenticated`, HTTP 401)**
   * **Condition:** Wrong OTP provided when joining an active table
   * **Response Structure:**
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

4. **Not Found (`not-found`, HTTP 404)**
   * **Condition:** Restaurant or table not found
   * **Response Structure:**
   ```json
   {
     "error": {
       "code": "not-found",
       "message": "Restaurant not found" | "Table not found",
       "details": {
         "httpCode": 404
       }
     }
   }
   ```

5. **Internal Error (`internal`, HTTP 500)**
   * **Condition:** Missing OTP data or other internal errors
   * **Response Structure:**
   ```json
   {
     "error": {
       "code": "internal",
       "message": "OTP data missing for the table. Please try scanning again.",
       "details": {
         "httpCode": 500,
         "tableStatus": "vacant" | "pending" | "active",
         "error": "Missing OTP data",
         "restaurantId": "string",
         "tableId": "string"
       }
     }
   }
   ```

6. **Precondition Failed (`failed-precondition`, HTTP 412)**
   * **Condition:** No active session found when trying to join as secondary user
   * **Response Structure:**
   ```json
   {
     "error": {
       "code": "failed-precondition",
       "message": "No active session for this table",
       "details": {
         "httpCode": 412,
         "restaurantId": "string",
         "tableId": "string",
         "error": "Missing active session"
       }
     }
   }
   ```

## Common Scenarios

1. **Primary Customer Flow**
   * Table is vacant/pending
   * Customer provides valid OTP, name, and phone number
   * Result: Success Response #1

2. **Secondary Customer Flow (Multi-user Enabled)**
   * Table is active
   * Customer provides valid OTP
   * Optional phone number and name
   * Result: Success Response #2

3. **Secondary Customer Flow (Multi-user Disabled)**
   * Table is active
   * Customer must provide valid OTP, phone number
   * Result: Success Response #2

4. **Missing Required Fields**
   * Phone number missing when required
   * Name missing when required
   * Result: Error Response #1

5. **Wrong OTP Scenarios**
   * For vacant/pending table: Error Response #2
   * For active table: Error Response #3 (with guidance)

6. **System State Errors**
   * Missing OTP data: Error Response #5
   * No active session: Error Response #6
   * Restaurant/Table not found: Error Response #4

## State Changes

The function performs the following state changes on success:

1. **For Primary Customer (Vacant/Pending Table)**
   * Updates table status to "active"
   * Sets primaryCustomer information
   * Initializes occupiedBy array with customer's phone number
   * Creates new session

2. **For Secondary Customer (Active Table)**
   * Adds phone number to occupiedBy array (if provided)
   * Adds user to existing session

3. **Common Updates**
   * Updates lastActivity timestamp
   * Creates/updates customer profile (if name and phone provided)

---

# Server Cloud Functions API Workflow Test

This document provides verification points and example cURL commands for testing all server-related cloud functions in the `functions/server` folder using the Firebase emulator.

---

## Error Response Format
All server cloud functions return errors in the following standard format:

```json
{
  "error": {
    "message": "<Error message string>",
    "status": "<Error code (e.g., INVALID_ARGUMENT, NOT_FOUND, INTERNAL)>"
  }
}
```

- `message`: Human-readable error message describing the issue.
- `status`: Error code (usually in ALL_CAPS, e.g., `INVALID_ARGUMENT`, `NOT_FOUND`, `INTERNAL`).

**Example:**
```json
{
  "error": {
    "message": "Restaurant ID is required",
    "status": "INVALID_ARGUMENT"
  }
}
```

---

## 1. Get Tables
**Purpose:** Retrieve all tables for a restaurant

**Command:**
```bash
curl --location 'http://127.0.0.1:5002/rms-app-dd875/us-central1/server-getTables' \
--header 'Content-Type: application/json' \
--data '{
  "data": {
    "restaurantId": "rest001"
  }
}'
```
**Verification Points:**
- Response includes a list of tables for the restaurant
- Structure matches expected schema
- If required fields are missing or invalid, error response matches the documented error format
  - Example error: `{"error":{"message":"Restaurant ID is required","status":"INVALID_ARGUMENT"}}`

---

## 2. Generate Table OTP
**Purpose:** Generate OTP for a table

**Command:**
```bash
curl --location 'http://127.0.0.1:5002/rms-app-dd875/us-central1/server-generateTableOTP' \
--header 'Content-Type: application/json' \
--data '{
  "data": {
    "restaurantId": "rest001",
    "tableId": "table001"
  }
}'
```
**Verification Points:**
- Response includes OTP and status
- Table status changes to OTP_PENDING

---

## 3. Create Server
**Purpose:** Create a new server

**Command:**
```bash
curl --location 'http://127.0.0.1:5002/rms-app-dd875/us-central1/server-createServer' \
--header 'Content-Type: application/json' \
--data '{
  "data": {
    "name": "Alice Server",
    "email": "alice.server@example.com",
    "role": "waiter"
  }
}'
```
**Verification Points:**
- Response includes created server ID and details
- Server appears in Firestore

---

## 4. Update Server
**Purpose:** Update server details

**Command:**
```bash
curl --location 'http://127.0.0.1:5002/rms-app-dd875/us-central1/server-updateServer' \
--header 'Content-Type: application/json' \
--data '{
  "data": {
    "id": "server001",
    "name": "Updated Name"
  }
}'
```
**Verification Points:**
- Response confirms update
- Server details are updated in Firestore

---

## 5. Get Server
**Purpose:** Retrieve server details

**Command:**
```bash
curl --location 'http://127.0.0.1:5002/rms-app-dd875/us-central1/server-getServer' \
--header 'Content-Type: application/json' \
--data '{
  "data": {
    "id": "server001"
  }
}'
```
**Verification Points:**
- Response includes server details
- Structure matches expected schema

---

## 6. Assign Table
**Purpose:** Assign a table to a server

**Command:**
```bash
curl --location 'http://127.0.0.1:5002/rms-app-dd875/us-central1/server-assignTable' \
--header 'Content-Type: application/json' \
--data '{
  "data": {
    "serverId": "server001",
    "tableId": "table001"
  }
}'
```
**Verification Points:**
- Response confirms assignment
- Table's assignedServerId is updated in Firestore

---

## 7. Unassign Table
**Purpose:** Unassign a table from a server

**Command:**
```bash
curl --location 'http://127.0.0.1:5002/rms-app-dd875/us-central1/server-unassignTable' \
--header 'Content-Type: application/json' \
--data '{
  "data": {
    "serverId": "server001",
    "tableId": "table001"
  }
}'
```
**Verification Points:**
- Response confirms unassignment
- Table's assignedServerId is null in Firestore

---

## 8. Server Login
**Purpose:** Login a server and create or reuse a session

### Options
The serverLogin API supports two authentication methods:
1. **Credentials-based login**: Using `username` (email or phone) and `password`
2. **Session-based login**: Using an existing valid `sessionId`

In both cases, `restaurantId` is required.

### Happy Path: New Session (Credentials Login)
**Command:**
```bash
curl --location 'http://127.0.0.1:5002/rms-app-dd875/us-central1/server-serverLogin' \
--header 'Content-Type: application/json' \
--data '{
  "data": {
    "restaurantId": "rest001",
    "username": "bob.brown@gourmetgrove.com",
    "password": "3456"
  }
}'
```
**Verification Points:**
- Response includes `success: true`, `message`, and data object
- Response follows standard format:
```json
{
  "result": {
    "success": true,
    "message": "Server login successful with new session",
    "data": {
      "sessionId": "session123",
      "serverId": "server003",
      "name": "Bob Brown",
      "entity": "server",
      "role": "waiter"
    }
  }
}
```
- A new session is created in Firestore for server003 (if not already present)

### Happy Path: Existing Session (Credentials Login)
**Command:**
```bash
curl --location 'http://127.0.0.1:5002/rms-app-dd875/us-central1/server-serverLogin' \
--header 'Content-Type: application/json' \
--data '{
  "data": {
    "restaurantId": "rest001",
    "username": "john.doe@gourmetgrove.com",
    "password": "1234"
  }
}'
```
**Verification Points:**
- Response includes `success: true`, `message`, and data object
- Response follows standard format:
```json
{
  "result": {
    "success": true,
    "message": "Server login successful with existing session",
    "data": {
      "sessionId": "session003",
      "serverId": "server001",
      "name": "John Doe",
      "entity": "server",
      "role": "waiter"
    }
  }
}
```
- The sessionId matches the existing session for server001 (if not expired)
- No new session is created if the previous one is still valid

### Happy Path: Session-based Login
**Command:**
```bash
curl --location 'http://127.0.0.1:5002/rms-app-dd875/us-central1/server-serverLogin' \
--header 'Content-Type: application/json' \
--data '{
  "data": {
    "restaurantId": "rest001",
    "sessionId": "session003"
  }
}'
```
**Verification Points:**
- Response includes `success: true`, `message`, and data object
- Response should be the same as credential-based login:
```json
{
  "result": {
    "success": true,
    "message": "Server login successful with existing session",
    "data": {
      "sessionId": "session003",
      "serverId": "server001",
      "name": "John Doe",
      "entity": "server",
      "role": "waiter"
    }
  }
}
```
- Session's `updatedAt` timestamp is refreshed to current time
- Session's `expiresAt` timestamp is extended by 12 hours from current time
- Using session-based login extends the session lifetime with each use

### Failure Case 1: Wrong Password
**Command:**
```bash
curl --location 'http://127.0.0.1:5002/rms-app-dd875/us-central1/server-serverLogin' \
--header 'Content-Type: application/json' \
--data '{
  "data": {
    "restaurantId": "rest001",
    "username": "john.doe@gourmetgrove.com",
    "password": "wrongpass"
  }
}'
```
**Verification Points:**
- Error response with `message: Invalid credentials` and `status: UNAUTHENTICATED`
- Response follows standard error format:
```json
{
  "error": {
    "details": {
      "status": "error",
      "message": "Invalid credentials",
      "data": {
        "code": "unauthenticated",
        "httpCode": 401,
        "restaurantId": "rest001",
        "username": "john.doe@gourmetgrove.com",
        "error": "Invalid credentials"
      }
    },
    "message": "Invalid credentials",
    "status": "UNAUTHENTICATED"
  }
}
```

### Failure Case 2: Invalid Session ID
**Command:**
```bash
curl --location 'http://127.0.0.1:5002/rms-app-dd875/us-central1/server-serverLogin' \
--header 'Content-Type: application/json' \
--data '{
  "data": {
    "restaurantId": "rest001",
    "sessionId": "invalid-session-id"
  }
}'
```
**Verification Points:**
- Error response with `message: Invalid session` and `status: UNAUTHENTICATED`
- Response follows standard error format:
```json
{
  "error": {
    "details": {
      "status": "error",
      "message": "Invalid session",
      "data": {
        "code": "unauthenticated",
        "httpCode": 401,
        "restaurantId": "rest001",
        "sessionId": "invalid-session-id",
        "error": "Invalid session"
      }
    },
    "message": "Invalid session",
    "status": "UNAUTHENTICATED"
  }
}
```

### Failure Case 3: Missing Required Fields
**Command:**
```bash
curl --location 'http://127.0.0.1:5002/rms-app-dd875/us-central1/server-serverLogin' \
--header 'Content-Type: application/json' \
--data '{
  "data": {
    "restaurantId": "rest001"
  }
}'
```
**Verification Points:**
- Error response indicating either sessionId or username/password are required
- Response follows standard error format:
```json
{
  "error": {
    "details": {
      "status": "error",
      "message": "Either sessionId or both username and password are required",
      "data": {
        "code": "invalid-argument",
        "httpCode": 400,
        "restaurantId": "rest001",
        "error": "Either sessionId or both username and password are required"
      }
    },
    "message": "Either sessionId or both username and password are required",
    "status": "INVALID_ARGUMENT"
  }
}
```

---

## Notes
- All endpoints assume the emulator is running at `localhost:5001` and project ID is `rms-app-dd875` (adjust if needed).
- Replace IDs with those relevant to your mock data as appropriate.

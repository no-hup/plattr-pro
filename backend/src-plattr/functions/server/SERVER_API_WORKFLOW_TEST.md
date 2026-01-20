# Server Cloud Functions API Workflow Test

This document provides verification points and example cURL commands for testing all server-related cloud functions in the `functions/server` folder using the Firebase emulator.

> **Note:** Legacy CRUD functions (`createServer`, `updateServer`, `getServer`, `assignTable`, `unassignTable`) 
> were removed as they used top-level collections incompatible with multi-tenant architecture.
> Use `table-assignTableToServer` and `table-unassignTableFromServer` instead for table assignment.

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
**Purpose:** Generate OTP for a table (only works for `vacant` tables)

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
- Response includes OTP (6-digit) and status
- Table status changes to `pending` (OTP_PENDING)
- OTP validity: 5 minutes
- Error if table is not vacant: `{"error":{"message":"Cannot generate OTP for non-vacant table","status":"FAILED_PRECONDITION"}}`

---

## 3. Assign Table to Server (via table namespace)
**Purpose:** Assign a table to a server using restaurant-scoped collections

**Command:**
```bash
curl --location 'http://127.0.0.1:5002/rms-app-dd875/us-central1/table-assignTableToServer' \
--header 'Content-Type: application/json' \
--data '{
  "data": {
    "restaurantId": "rest001",
    "tableId": "table001",
    "serverId": "server001"
  }
}'
```
**Verification Points:**
- Response confirms assignment
- Table's `assignedServerId` is updated in `restaurants/{restaurantId}/tables/{tableId}`
- Server's `assignedTables` is updated in `restaurants/{restaurantId}/servers/{serverId}`
- Bi-directional link is established

---

## 4. Unassign Table from Server (via table namespace)
**Purpose:** Remove table-server assignment

**Command:**
```bash
curl --location 'http://127.0.0.1:5002/rms-app-dd875/us-central1/table-unassignTableFromServer' \
--header 'Content-Type: application/json' \
--data '{
  "data": {
    "restaurantId": "rest001",
    "tableId": "table001"
  }
}'
```
**Verification Points:**
- Response confirms unassignment
- Table's `assignedServerId` is set to null
- Previous server's `assignedTables` is updated to remove this table

---

## 5. Server Login
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
      "role": "waiter",
      "restaurantId": "rest001",
      "restaurantName": "Gourmet Grove"
    }
  }
}
```
- A new session is created in `restaurants/{restaurantId}/sessions` for server003

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
      "role": "waiter",
      "restaurantId": "rest001",
      "restaurantName": "Gourmet Grove"
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
- Error response: `message: Either sessionId or both username and password are required`

---

## Notes
- All endpoints assume the emulator is running at `localhost:5002` and project ID is `rms-app-dd875` (adjust if needed).
- Replace IDs with those relevant to your mock data as appropriate.
- **Session expiry**: 12 hours from last use
- **OTP validity**: 5 minutes
- **Table cleanup**: Sessions are cleaned after 1 hour of inactivity

## Data Paths (Restaurant-Scoped)
All APIs use restaurant-scoped Firestore collections:
- `restaurants/{restaurantId}/servers` - Server/waiter profiles
- `restaurants/{restaurantId}/tables` - Table data
- `restaurants/{restaurantId}/sessions` - Active sessions

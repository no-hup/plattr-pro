# Server Login API Response Samples

This document provides sample responses for the `serverLogin` API.

## Authentication Methods

The serverLogin API supports two authentication methods:
1. **Credentials-based login**: Using `username` (email or phone) and `password`
2. **Session-based login**: Using an existing valid `sessionId`

In both cases, `restaurantId` is required.

## Successful Responses

### 1. Login with existing session (using credentials)

**Request:**
```json
{
  "data": {
    "restaurantId": "rest001",
    "username": "john.doe@gourmetgrove.com",
    "password": "1234"
  }
}
```

**Response:**
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

### 2. Login with new session creation (using credentials)

**Request:**
```json
{
  "data": {
    "restaurantId": "rest001",
    "username": "new.server@gourmetgrove.com",
    "password": "password123"
  }
}
```

**Response:**
```json
{
  "result": {
    "success": true,
    "message": "Server login successful with new session",
    "data": {
      "sessionId": "newSessionId123",
      "serverId": "server999",
      "name": "New Server",
      "entity": "server",
      "role": "waiter"
    }
  }
}
```

### 3. Login using session ID (without credentials)

**Request:**
```json
{
  "data": {
    "restaurantId": "rest001",
    "sessionId": "session003"
  }
}
```

**Response:**
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

**Notes:**
- Using session-based login refreshes the session's `updatedAt` timestamp to the current time
- The session's `expiresAt` timestamp is extended by 12 hours from the current time with each use
- This approach keeps the session active as long as it's being used regularly

## Error Responses

### 1. Invalid credentials (wrong password)

**Request:**
```json
{
  "data": {
    "restaurantId": "rest001",
    "username": "john.doe@gourmetgrove.com",
    "password": "wrongpass"
  }
}
```

**Response:**
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

### 2. Invalid session ID

**Request:**
```json
{
  "data": {
    "restaurantId": "rest001",
    "sessionId": "invalid-session-id"
  }
}
```

**Response:**
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

### 3. Inactive server status

**Request:**
```json
{
  "data": {
    "restaurantId": "rest001",
    "username": "bob.brown@gourmetgrove.com",
    "password": "3456"
  }
}
```

**Response:**
```json
{
  "error": {
    "details": {
      "status": "error",
      "message": "Server is not active",
      "data": {
        "code": "unauthenticated",
        "httpCode": 401,
        "serverId": "server003",
        "status": "inactive",
        "username": "bob.brown@gourmetgrove.com",
        "restaurantId": "rest001",
        "error": "Server is not active"
      }
    },
    "message": "Server is not active",
    "status": "UNAUTHENTICATED"
  }
}
```

### 4. Missing required fields

**Request:**
```json
{
  "data": {
    "restaurantId": "rest001"
  }
}
```

**Response:**
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

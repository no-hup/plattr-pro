# Server Module Documentation

## Overview
The Server module provides functionality for managing servers (waitstaff) and their interactions with tables in the restaurant system.

## Functions

### 1. createServer
Creates a new server profile in the system.

**Parameters:**
- `name` (string, required): The name of the server
- `email` (string, required): The email of the server
- `role` (string, required): The role of the server (e.g., "waiter", "manager")

**Response:**
```json
{
  "id": "server001",
  "name": "John Doe",
  "email": "john.doe@example.com",
  "role": "waiter",
  "status": "active",
  "createdAt": "2023-03-15T12:00:34Z",
  "updatedAt": "2023-03-15T12:00:34Z",
  "assignedTables": []
}
```

### 2. updateServer
Updates an existing server's information.

**Parameters:**
- `id` (string, required): The ID of the server to update
- `name` (string, optional): Updated name
- `email` (string, optional): Updated email
- `role` (string, optional): Updated role
- `status` (string, optional): Updated status

**Response:**
```json
{
  "message": "Server updated successfully"
}
```

### 3. getServer
Retrieves information about a specific server.

**Parameters:**
- `id` (string, required): The ID of the server

**Response:**
```json
{
  "name": "John Doe",
  "email": "john.doe@example.com",
  "role": "waiter",
  "status": "active",
  "assignedTables": ["table001"],
  "createdAt": "2023-03-15T12:00:34Z",
  "updatedAt": "2023-03-15T12:00:34Z"
}
```

### 4. assignTable
Assigns a table to a server for management.

**Parameters:**
- `serverId` (string, required): The ID of the server
- `tableId` (string, required): The ID of the table to assign

**Response:**
```json
{
  "message": "Table assigned successfully"
}
```

### 5. unassignTable
Removes a table assignment from a server.

**Parameters:**
- `serverId` (string, required): The ID of the server
- `tableId` (string, required): The ID of the table to unassign

**Response:**
```json
{
  "message": "Table unassigned successfully"
}
```

### 6. getTables
Retrieves all tables for a restaurant, including their status, capacity, and other details.

**Parameters:**
- `restaurantId` (string, required): The ID of the restaurant

**Response:**
```json
{
  "status": "success",
  "message": "Tables retrieved successfully",
  "data": {
    "restaurantId": "rest001",
    "tables": [
      {
        "id": "table001",
        "number": "T1",
        "status": "active",
        "capacity": 4,
        "assignedServerId": "server001",
        "isOccupied": true,
        "primaryCustomer": {
          "phoneNumber": "1234567890",
          "name": "John Customer"
        },
        "lastActivity": "2023-03-15T12:00:34Z"
      },
      {
        "id": "table002",
        "number": "T2",
        "status": "vacant",
        "capacity": 6,
        "assignedServerId": "server002",
        "isOccupied": false,
        "primaryCustomer": null,
        "lastActivity": null
      }
    ],
    "count": 2
  }
}
```

### 7. generateTableOTP
Generates an OTP for a vacant table and sets its status to OTP_PENDING. This function follows the same logic as the OTP generation that happens when a user scans a table.

**Parameters:**
- `restaurantId` (string, required): The ID of the restaurant
- `tableId` (string, required): The ID of the table

**Response:**
```json
{
  "status": "success",
  "message": "OTP generated successfully",
  "data": {
    "tableId": "table001",
    "restaurantId": "rest001",
    "tableNumber": "T1",
    "otp": "123456",
    "expiresAt": "2023-03-15T12:05:34Z",
    "tableStatus": "pending"
  }
}
```

**Error Responses:**
- Table not vacant:
```json
{
  "code": "invalid-argument",
  "message": "Cannot generate OTP for non-vacant table",
  "details": {
    "details": "Table is currently in active status. Only vacant tables can have OTPs generated.",
    "tableStatus": "active",
    "restaurantId": "rest001",
    "tableId": "table001"
  }
}
```

## Error Handling
All functions follow a standard error handling pattern:
1. Validation errors: If required parameters are missing, returns a 400 Bad Request error
2. Not Found errors: If a resource is not found (restaurant, server, table), returns a 404 Not Found error
3. Internal errors: For all other errors, returns a 500 Internal Server error

## Client-Side Usage
```javascript
// Example: Generating an OTP for a vacant table
const generateOTP = async (restaurantId, tableId) => {
  try {
    const generateTableOTP = firebase.functions().httpsCallable('server-generateTableOTP');
    const result = await generateTableOTP({ restaurantId, tableId });
    console.log(`OTP generated: ${result.data.otp}, expires at: ${result.data.expiresAt}`);
    return result.data;
  } catch (error) {
    console.error('Error generating OTP:', error);
    throw error;
  }
};
```
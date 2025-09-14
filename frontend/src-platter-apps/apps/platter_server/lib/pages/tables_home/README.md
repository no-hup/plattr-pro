# Tables Home Feature

This feature allows restaurant staff to view and manage tables in the restaurant.

## Features

- Display all restaurant tables in a grid view
- Filter tables by status (active, vacant, reserved, disabled)
- View and update table details
- Refresh table OTP
- Navigate to active orders for a table

## Setting Up

1. Ensure the required dependencies are included in `pubspec.yaml`:

```yaml
dependencies:
  flutter:
    sdk: flutter
```

2. Run the build_runner to generate the JSON serialization files:

```bash
flutter pub run build_runner build --delete-conflicting-outputs
```

This will generate the required `table_models.g.dart` file for the JSON serialization.

## Usage

To add the Tables screen to your app:

```dart
import 'package:platter_server/pages/tables_home/tables_home_screen.dart';

// In your widget tree:
TablesHomeScreen(
  restaurantId: 'your_restaurant_id',
  sessionId: 'your_session_id',
)
```

## Directory Structure

- `table_models.dart` - Data models for tables
- `screens/`
  - `tables_home_screen.dart` - Main screen for viewing tables
  - `table_detail_dialog.dart` - Dialog for viewing and updating table details

## APIs in the Tables Home Section

### 1. `getRestaurantTables` API

Purpose: Fetches all tables for a restaurant.

**Request Format:**

```json
{
  "data": {
    "restaurantId": "string"
  }
}
```

**Expected Response Format:**

```json
{
  "result": {
    "status": "success",
    "message": "string",
    "data": {
      "tables": [
        {
          "id": "string",
          "number": "string",
          "capacity": 4,
          "status": "string",
          "isDisabled": false,
          "activeOrderId": "",
          "otp": ""
        }
      ]
    }
  }
}
```

### 2. `updateTableStatus` API

Purpose: Updates the status of a table. Used in the table detail popup when changing table status.

**Request Format:**

```json
{
  "data": {
    "restaurantId": "string",
    "tableId": "string",
    "status": "string"  // values: "vacant", "active", "reserved", "disabled"
  }
}
```

**Expected Response Format:**

```json
{
  "result": {
    "success": true,
    "message": "string"
  }
}
```

### 3. `getTableDetails` API

Purpose: Gets details for a specific table. Used when opening the table detail popup.

**Request Format:**

```json
{
  "data": {
    "restaurantId": "string",
    "tableId": "string"
  }
}
```

**Expected Response Format:**

```json
{
  "result": {
    "status": "success",
    "message": "string",
    "data": {
      "table": {
        "id": "string",
        "number": "string",
        "capacity": 4,
        "status": "string",
        "isDisabled": false,
        "activeOrderId": "",
        "otp": ""
      }
    }
  }
}
```

### 4. `refreshTableOtp` API

Purpose: Refreshes the OTP for a table. Used in the table detail popup when clicking the refresh button.

**Request Format:**

```json
{
  "data": {
    "restaurantId": "string",
    "tableId": "string"
  }
}
```

**Expected Response Format:**

```json
{
  "result": {
    "success": true,
    "message": "string",
    "data": {
      "otp": "string"
    }
  }
}
```

## API Usage in Popups

In the `table_detail_dialog.dart` file, the following APIs are used:

1. On Dialog Open: `getTableDetails` is called in `initState()` to fetch the table details.
2. Status Update: When a status button is clicked, `updateTableStatus` is called with the new status.
3. OTP Refresh: When the refresh button is clicked, `refreshTableOtp` is called to get a new OTP.

## Error Handling

All APIs return an `ApiResponse<T>` object, which contains:

- `success`: Boolean indicating if the request was successful
- `message`: Optional message from the server
- `data`: The actual data returned (if successful)
- `errorCode`: Optional error code if the request failed

The parsing logic handles both formats where success is indicated by:

- A string "status" field with value "success"
- A boolean "success" field with value true

### Important Notes

- The response envelope may be directly in the data or nested under a "result" key
- Error codes may be under "code" or "errorCode" fields
- All APIs use POST method with Dio client
- The TableModel has specific JsonKey annotations to map server field names to model properties

# Waiter App Documentation

## Overview
The waiter-facing app is designed for restaurant staff to efficiently manage in-restaurant dining operations, including table management, order processing, and menu updates.

## App Structure

### Header
- **Top Bar**: Contains profile icon (right) and notifications icon (adjacent left)
- **Default Home Tab**: Configurable, typically set to Tables

### Home Tabs

#### 1. Orders Home
- **Display**: All restaurant orders with active orders on top
- **UI**: Cylindrical cards showing Order ID and Table ID
- **Features**: 
  - Color-coded background based on cart status:
    - `PENDING` - Awaiting kitchen acceptance
    - `ACCEPTED` - Order accepted by kitchen
    - `PREPARING` - Being prepared
    - `READY` - Ready for pickup (highlighted)
    - `SERVED` - Delivered to customer
    - `CANCELLED` - Order cancelled
    - `RETURNED` - Item returned by customer
  - Clicking opens Cart Detail Page for that order

#### 2. Tables
- **Display**: All restaurant tables with backend sorting
- **UI**: Cylindrical pills showing Table ID, Capacity, and Status
- **Valid Statuses** (from backend enum):
  - `active` - Table has active session with customers
  - `vacant` - Table is empty and available
  - `disabled` - Table is not in use
  - `pending` (OTP_PENDING) - OTP generated, awaiting customer validation
- **Actions**:
  - Clicking opens Table Popup
  - Manage table status and orders

#### 3. Menu
- **Display**: Complete restaurant menu
- **Features**:
  - Mark items as out of stock
  - Toggle item availability

## Detailed Components

### Table Popup
- **Status Management**: Options to mark table as vacant or disabled
- **Order Management**: 
  - Mark Order Done button
- **Order Details**: 
  - Clicking opens the Previous Orders Page for that table
  - Shows current active order and order history
- **OTP Section**: 
  - Displays table OTP (6-digit, valid for 5 minutes)
  - Refresh button to generate new OTP
  - **Note**: OTP can only be generated for `vacant` tables

### Cart Detail Page
- **Content**: All carts for the selected order (Multi-Cart Model)
- **Structure**: Each cart displayed as a dropdown with items inside
- **Item Features**:
  - Remove item option (calls `cart-removeItemFromCart`)
  - Checkboxes to mark items as delivered
  - Add notes for specific items as requested by customers
- **Cart Statuses** (state machine):
  ```
  PENDING → ACCEPTED → PREPARING → READY → SERVED
                ↓          ↓          ↓        ↓
             CANCELLED  CANCELLED  CANCELLED  RETURNED
  ```
- **Auto-Completion**: Order is marked `COMPLETED` when all carts are `SERVED`, `CANCELLED`, or `RETURNED`

### Previous Orders Page
- **Access**: Via "Order Details" in Table Popup
- **Organization**: Orders categorized by date (latest first)
- **Navigation**: 
  - Active order displayed at top
  - List limited to 10 previous orders per table (pagination planned)
  - Clicking any order opens the dedicated Order Page for that specific order
  - Each order displays its associated items

## Backend API Endpoints

### Authentication
- `server-serverLogin`: Email/phone + password OR sessionId-based authentication
- Session expiry: 12 hours (auto-extended on use)

### Table Management
- `table-getTablesForRestaurant`: Fetch all tables for a restaurant
- `table-getTableDetails`: Get detailed info for a specific table  
- `server-generateTableOTP`: Generate 6-digit OTP (5 min validity) for vacant tables
- `table-assignTableToServer`: Bi-directional table-server assignment
- `table-unassignTableFromServer`: Remove table-server assignment
- `table-updateTableStatus`: Change table status

### Order Management
- `order-getActiveOrdersForRestaurant`: Fetch active orders
- `order-getOrder`: Get order details
- `cart-updateCartStatus`: Update cart status (state machine transitions)
- `cart-removeItemFromCart`: Remove/decrement item from cart

### Menu Management
- `menu-getRestaurantMenu`: Fetch full menu
- `menu-updateMenuItemAvailability`: Toggle item stock status

## Firebase Triggers (Implementation Status)

| Trigger | Status | Description |
|---------|--------|-------------|
| Order Ready for Pickup | ✅ Implemented | Notifies waiter when cart status → READY |
| New Order Assignment | ⚠️ Partial | Trigger exists, notification delivery needs verification |
| Table Status Update | ❓ Planned | Alert for customer service requests |
| Item Out of Stock | ❓ Planned | Trigger for menu item availability changes |

## Session & Cleanup

### Server Session
- **Expiry**: 12 hours from last use
- **Storage**: `restaurants/{restaurantId}/sessions` with `entity: 'server'`
- **Auto-extend**: Session expiry refreshed on each authenticated request

### Table Session Cleanup
- **Trigger**: Automatic cleanup after 1 hour of table inactivity
- **Action**: Resets table to `vacant`, ends associated sessions

## Data Paths (Restaurant-Scoped)

All server app data uses restaurant-scoped Firestore collections:
- `restaurants/{restaurantId}/servers` - Waiter/server profiles
- `restaurants/{restaurantId}/tables` - Table configuration and status
- `restaurants/{restaurantId}/orders` - Order documents
- `restaurants/{restaurantId}/sessions` - Active sessions
- `restaurants/{restaurantId}/menus` - Menu structure

## Future Enhancements
- **Improved Order Sorting**: Enhanced logic for prioritizing orders based on time and status
- **Floor Level Sections**: Categorize tables by their physical location in the restaurant
- **Pagination**: Implement scrolling/pagination for viewing more than 10 previous orders
- **Enhanced Navigation**: Add right arrow navigation for order selection in dropdown lists
- **Automatic Cart Completion**: Mark carts as "done" when all items are marked complete
- **Waiter-Initiated Changes**: Allow waiters to replace or add items to existing orders
- **Location Proximity Check**: Implement proper geolocation validation (currently mocked)

## Summary
This app provides waiters with comprehensive tools for managing restaurant operations, focusing on order tracking, table management, and menu updates, with a clear UI design and logical workflow. All APIs use restaurant-scoped collections for multi-tenant support.
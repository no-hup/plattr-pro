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
  - Color-coded background based on status (preparing, delivered, etc.)
  - Clicking opens Cart Detail Page for that order

#### 2. Tables
- **Display**: All restaurant tables with backend sorting
- **UI**: Cylindrical pills showing Table ID, Capacity, and Status
- **Statuses**: Active, vacant, disabled, reserved
- **Actions**:
  - Clicking opens Table Popup
  - Manage table status and orders

#### 3. Menu
- **Display**: Complete restaurant menu
- **Features**:
  - Mark items as out of stock

## Detailed Components

### Table Popup
- **Status Management**: Options to mark table as vacant, closed, reserved, or disabled
- **Order Management**: 
  - Mark Order Done button
- **Order Details**: 
  - Clicking opens the Previous Orders Page for that table
  - Shows current active order and order history
- **OTP Section**: 
  - Displays table OTP
  - Refresh button to generate new OTP

### Cart Detail Page
- **Content**: All carts for the selected order
- **Structure**: Each cart displayed as a dropdown with items inside
- **Item Features**:
  - Remove item option
  - Checkboxes to mark items as delivered
  - Add notes for specific items as requested by customers (e.g., special instructions or dietary preferences)
- **Item Statuses**: Includes Cancelled, Delivered, Preparing, Prepared - all with color-coded backgrounds and descriptive subtitles

### Previous Orders Page
- **Access**: Via "Order Details" in Table Popup
- **Organization**: Orders categorized by date (latest first)
- **Navigation**: 
  - Active order displayed at top
  - List limited to 10 previous orders per table
  - Clicking any order opens the dedicated Order Page for that specific order
  - Each order displays its associated items

## Backend Triggers
Recommended Firebase triggers:
1. **Order Status Change**: Notify waiters when kitchen updates order status
2. **Table Status Update**: Alert when customers request service or check-in/out
3. **Item Availability**: Trigger when menu items become out of stock
4. **Order Assignment**: Notify when new orders are assigned to specific waiters

## Future Enhancements
- **Improved Order Sorting**: Enhanced logic for prioritizing orders based on time and status
- **Floor Level Sections**: Categorize tables by their physical location in the restaurant
- **Pagination**: Implement scrolling/pagination for viewing more than 10 previous orders
- **Enhanced Navigation**: Add right arrow navigation for order selection in dropdown lists
- **Automatic Cart Completion**: Mark carts as "done" when all items are marked complete
- **Waiter-Initiated Changes**: Allow waiters to replace or add items to existing orders

## Summary
This app provides waiters with comprehensive tools for managing restaurant operations, focusing on order tracking, table management, and menu updates, with a clear UI design and logical workflow.
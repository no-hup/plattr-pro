# Restaurant Customer Website Requirements

## Overview
A Flutter web application for restaurant customers to view menus, place orders, and track their order status. The application is accessed via QR codes placed on restaurant tables and is designed for mobile-first usage.

## User Journey

### 1. Table Access & Authentication
#### Entry Point
- Users scan table QR code using phone camera
- QR contains URL: `your-domain.com/table/{tableId}`
- System checks for existing valid session in local storage

#### First-Time Access Flow
1. User Info Collection
   - Required fields:
     - Name
     - Phone number (with validation)
   - No signup/login required
   - Data stored in local storage and Firestore

2. OTP Verification
   - Single OTP input screen
   - OTP validated against `tables/{tableId}/currentOTP/code`
   - OTP shared by server or existing table occupants
   - On successful validation:
     - Store session data
     - Add device to `tables/{tableId}/occupiedBy`
     - Set as primaryCustomer if first user

#### Re-entry Flow
- Check local storage for valid session data
- If session valid (within 5 hours and table not cleared):
  - Auto-restore session
  - Skip user info and OTP
- If session invalid:
  - Clear local storage
  - Restart first-time access flow

### 2. Menu Browsing
#### Category View
- Display all categories with:
  - Category name
  - Description
  - Image
  - Item count
- Organized by category order

#### Menu Items
- Grouped by category
- Display for each item:
  - Name
  - Description
  - Base price
  - Customization indicator
  - In-stock status
  - Allergen tags
  - Nutritional info

### 3. Item Customization
#### Variant Selection
- Handle mandatory variants
  - Example: Burger size, Beverage temperature
- Show price modifications
- Enforce required selections

#### Addon Selection
- Optional additions
- Show price impacts
- Allow multiple selections where applicable

#### Order Customization
- Quantity selection
- Special instructions field
- Real-time price calculation
  - Base price
  - Variant price modifications
  - Addon costs
  - Applied discounts

### 4. Cart Management
#### Cart Operations
- Add items
- Modify quantities
- Remove items
- Clear cart
- View cart summary
- Real-time price updates

#### Cart Persistence
- Maintain cart state across page refreshes
- Clear cart on session expiration
- Sync cart across devices at same table

### 5. Order Management
#### Order Placement
- Cart review
- Order confirmation
- Special instructions review
- Place order submission

#### Order Tracking
- Real-time status updates:
  - Pending
  - Preparing
  - Ready
  - Served
- Order history for current session
- Active order status display

### 6. Session Management
#### Session Data Structure
```json
{
  "tableSession": {
    "tableId": "string",
    "validatedAt": "timestamp",
    "userInfo": {
      "name": "string",
      "phone": "string"
    },
    "deviceId": "string",
    "sessionToken": "string"
  }
}
```

#### Session Rules
- Validity:
  - Maximum 5 hours
  - Until table cleared by staff
  - Whichever comes first
- No manual table switching
- No limit on devices per table
- No display of other occupants' information

### 7. Technical Requirements
#### Performance
- Fast initial load time
- Smooth real-time updates
- Efficient state management
- Optimized asset loading

#### Offline Handling
- Graceful degradation
- Error messages for connectivity issues
- Session persistence — BUILT, via `window.sessionStorage`
  (`lib/session/services/session_storage_service.dart`, loaded by `SessionProvider`).
  Deliberately tab-scoped: the session survives page reload and in-tab navigation, and
  is dropped when the tab closes, so the next diner at that table starts clean.
  Verified end to end on 2026-09-08 (reload mid-order → menu → cart → checkout, no
  re-auth). Known limitation: the OTP path stores `restaurantId`/`tableId`/`expiresAt`
  as null, so the stored session is not table-scoped on the client; the backend rejects
  it for any other table (session resume is caller- and table-scoped there).
- Retry mechanisms

#### Error States
- Invalid/expired OTP
- Closed table
- Network failures
- Invalid phone format
- Session expiration
- Item out of stock
- Order placement failures

## Page Structure and APIs

### 1. User Info Page (Landing)
- **URL**: /table/{tableId}
- **Purpose**: Collect user information for table access
- **Components**:
  - Name input
  - Phone input
  - Submit button
- **APIs**:
  - validateTable(tableId) → Checks table status
  - createTableUser(tableId, name, phone) → Registers user for table

### 2. OTP Verification Page
- **URL**: /table/{tableId}/verify
- **Purpose**: Verify table access
- **Components**:
  - OTP input
  - Verify button
- **APIs**:
  - verifyTableOTP(tableId, otp) → Validates OTP
  - addDeviceToTable(tableId, deviceId, userInfo) → Registers device

### 3. Menu Page
- **URL**: /table/{tableId}/menu
- **Purpose**: Display menu categories and items
- **Components**:
  - Category list
  - Item cards
  - Cart preview
- **APIs**:
  - fetchMenu(restaurantId, inStock) → Gets menu data
  - getItemDetails(itemId) → Gets detailed item info
  - checkItemAvailability(itemId) → Real-time stock status

### 4. Item Detail Bottom Sheet
- **Type**: Modal bottom sheet component
- **Trigger**: Tap on menu item card
- **Purpose**: Show item details and customization
- **Components**:
  - Dismissible sheet with drag handle
  - Item information
    - Name
    - Description
    - Base price
    - Nutritional info
    - Allergen tags
  - Variant selectors (if customizable)
  - Addon selectors (if available)
  - Quantity picker
  - Add to cart button
  - Close button
- **APIs**:
  - getItemCustomization(itemId) → Gets variants and addons
  - calculateItemPrice(itemId, variants, addons) → Real-time price calculation
  - addToCart(tableId, itemDetails) → Adds to table's cart

### 5. Cart Page
- **URL**: /table/{tableId}/cart
- **Purpose**: Manage cart items and place order
- **Components**:
  - Cart items list
  - Modify quantities
  - Price summary
  - Place order button
- **APIs**:
  - getCart(tableId) → Gets current cart
  - updateCartItem(cartId, itemId, quantity) → Updates item quantity
  - removeCartItem(cartId, itemId) → Removes item
  - clearCart(cartId) → Clears entire cart
  - placeOrder(tableId, cartItems) → Creates order

### 6. Order Status Page
- **URL**: /table/{tableId}/orders
- **Purpose**: Track current order status
- **Components**:
  - Order details
  - Status tracker
  - Order history
- **APIs**:
  - getTableOrders(tableId) → Gets all orders for table
  - getOrderStatus(orderId) → Gets real-time order status
  - subscribeToOrderUpdates(orderId) → Real-time status updates

### Global Features
- **Session Management**: NOT BUILT as specified — neither `checkSession` nor
  `refreshSession` exists in the backend. `table-validateTableAndLocation` covers the
  same ground: passing the stored `sessionId` returns the live session if it is still
  valid and still belongs to that table, and otherwise falls through to the OTP prompt.
  There is no session extension; expiry ends the sitting.
  - ~~checkSession(tableId) → Validates session status~~
  - ~~refreshSession(tableId) → Extends session if valid~~
- **Real-time Updates**:
  - subscribeToMenuUpdates() → Stock status changes
  - subscribeToCartUpdates() → Cart modifications
  - subscribeToOrderUpdates() → Order status changes

## Future Considerations
- Table switching functionality
- User information updates
- Bill splitting
- Payment processing
- Takeaway/delivery options

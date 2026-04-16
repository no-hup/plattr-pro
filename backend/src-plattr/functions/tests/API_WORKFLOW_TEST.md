# API Workflow Test Document

This document outlines the complete API workflow test for the restaurant management system. Each test builds on the previous one to verify the entire flow from cart creation through order management.

## Prerequisites

- Firebase emulator running
- Mock data imported into emulator
- Feature flags set appropriately

## Feature Flags
- `isMultipleVariantOrAddonForMenuItemsSupported`: Controls whether multiple variants of the same menu item can be added to cart
- `sendServerNotifications`: Controls whether server notifications are sent when an order is placed

## API Request Format Guidelines

All API requests must follow a consistent structure with the `data` wrapper:

```bash
curl --location 'http://127.0.0.1:5001/rms-app-dd875/us-central1/[function-name]' \
--header 'Content-Type: application/json' \
--data '{
  "data": {
    // Request parameters go here
    "param1": "value1",
    "param2": "value2"
  }
}'
```

This structure is required for all Firebase callable functions. Failing to include the `data` wrapper will result in "Request body is missing data" errors.

## Test Sequence

### 1. Get Empty Cart

**Purpose**: Verify empty cart retrieval works correctly

**Command**:
```bash
curl --location 'http://127.0.0.1:5001/rms-app-dd875/us-central1/cart-getCart' \
--header 'Content-Type: application/json' \
--data '{
  "data": {
    "tableId": "table001",
    "restaurantId": "rest001"
  }
}'
```

**Verification Points**:
- Response should include empty items array
- Price information should show all zeros
- Response structure should match `functions/mock/sample_response/getCartResponse.json`

### 2. Add Item to Cart

**Purpose**: Verify adding an item to the cart works correctly

**Command**:
```bash
curl --location 'http://127.0.0.1:5001/rms-app-dd875/us-central1/cart-addItemToCart' \
--header 'Content-Type: application/json' \
--data '{
  "data": {
    "tableId": "table001",
    "restaurantId": "rest001",
    "menuItemId": "item001",
    "quantity": 2,
    "selectedVariants": {
      "variant_burger_size": "burger_size_regular"
    },
    "selectedAddons": ["addon_burger_fries"]
  }
}'
```

**Verification Points**:
- Response should show success status
- Cart should contain the newly added item with proper details
- Price calculations should be correct
- Response structure should match `functions/mock/sample_response/addItemTocartResponse.json`

### 3. Get Cart with Items

**Purpose**: Verify cart retrieval with items works correctly

**Command**:
```bash
curl --location 'http://127.0.0.1:5001/rms-app-dd875/us-central1/cart-getCart' \
--header 'Content-Type: application/json' \
--data '{
  "data": {
    "tableId": "table001",
    "restaurantId": "rest001"
  }
}'
```

**Verification Points**:
- Response should include the previously added item
- Price information should be calculated correctly
- Response structure should match `functions/mock/sample_response/getCartWithItemsResponse.json`

### 4. Add Multiple Items and Test Configurations

#### 4.1 Add Another Item to Cart

**Purpose**: Verify adding multiple items to the cart works correctly

**Command**:
```bash
curl --location 'http://127.0.0.1:5001/rms-app-dd875/us-central1/cart-addItemToCart' \
--header 'Content-Type: application/json' \
--data '{
  "data": {
    "tableId": "table001",
    "restaurantId": "rest001",
    "menuItemId": "item001",
    "quantity": 1,
    "selectedVariants": {
      "variant_burger_size": "burger_size_large"
    },
    "selectedAddons": ["addon_burger_potato_chips"]
  }
}'
```

**Verification Points**:
- Response should show 2 items added with correct variant and addon
- Price calculations should be correct (base price, discounts, etc.)
- Cart should contain the newly added item with proper details
- Response structure should match `functions/mock/sample_response/addSecondItemToCartResponse.json`

#### 4.2 Add Same Item with Different Configuration

**Purpose**: Test feature flag for multiple configurations of same menu item

**Command**:
```bash
curl --location 'http://127.0.0.1:5001/rms-app-dd875/us-central1/cart-addItemToCart' \
--header 'Content-Type: application/json' \
--data '{
  "data": {
    "tableId": "table001",
    "restaurantId": "rest001",
    "menuItemId": "item001",
    "quantity": 1,
    "selectedVariants": {
      "variant_burger_size": "burger_size_large"
    },
    "selectedAddons": ["addon_burger_potato_chips"]
  }
}'
```

**Verification Points**:
- If `isMultipleVariantOrAddonForMenuItemsSupported` is true:
  - Response should show success and cart should have two different configurations
  - Response structure should match `functions/mock/sample_response/addSameItemConfigurationResponse.json`
- If `isMultipleVariantOrAddonForMenuItemsSupported` is false:
  - Response should show error with message "Different variant of this menu item is already added to cart"
  - Response should include the existing item details

#### 4.3 Verify Cart State After Multiple Items

**Purpose**: Verify cart state after adding multiple items

**Command**:
```bash
curl --location 'http://127.0.0.1:5001/rms-app-dd875/us-central1/cart-getCart' \
--header 'Content-Type: application/json' \
--data '{
  "data": {
    "tableId": "table001",
    "restaurantId": "rest001"
  }
}'
```

**Verification Points**:
- Cart should contain all added items with correct quantities
- Price calculations should reflect all items and their configurations
- Response structure should match `functions/mock/sample_response/getCartWithMultipleItemsResponse.json`

### 5. Cart Checkout

**Purpose**: Verify cart checkout functionality works correctly

**Command**:
```bash
curl --location 'http://127.0.0.1:5001/rms-app-dd875/us-central1/cart-checkoutCart' \
--header 'Content-Type: application/json' \
--data '{
  "data": {
    "restaurantId": "rest123",
    "userId": "user456",
    "paymentMethod": "CARD"
  }
}'
```

**Expected Response**:
```json
{
  "success": true,
  "message": "Order placed successfully",
  "data": {
    "orderId": "some-order-id",
    "restaurant": {
      "id": "rest123",
      "name": "Test Restaurant"
    },
    "items": [...],
    "subtotal": 25.97,
    "tax": 2.08,
    "total": 28.05,
    "status": "PENDING",
    "createdAt": "2023-08-15T15:30:00.000Z"
  }
}
```

**Verification Points**:
- Response should include order ID and confirmation status
- Order items should match what was in the cart
- Order total should match the cart total
- Response structure should match `functions/mock/sample_response/checkoutCartResponse.json`
- Server notifications are controlled by the `sendServerNotifications` feature flag

### 6. Order Management Tests

#### 6.1 Get Order by ID

**Purpose**: Verify order retrieval using order ID

**Command**:
```bash
curl --location 'http://127.0.0.1:5001/rms-app-dd875/us-central1/orders-getOrder' \
--header 'Content-Type: application/json' \
--data '{
  "data": {
    "restaurantId": "rest001",
    "orderId": "{orderId}"
  }
}'
```

[Include expected response and verification points]

#### 6.2 Get Active Orders for Restaurant (Server App)

**Purpose**: Retrieve active orders relevant to the current server session for a restaurant

**Command**:
```bash
curl --location 'http://127.0.0.1:5001/rms-app-dd875/us-central1/orders-getActiveOrdersForRestaurant' \
--header 'Content-Type: application/json' \
--data '{
  "data": {
    "restaurantId": "rest001",
    "sessionId": "server-session-001"
  }
}'
```

[Include expected response and verification points]

#### 6.3 Get Orders for Table (Consumer App)

**Purpose**: Retrieve the current active order for a table, or all orders for that table

**Command**:
```bash
curl --location 'http://127.0.0.1:5001/rms-app-dd875/us-central1/orders-getOrder' \
--header 'Content-Type: application/json' \
--data '{
  "data": {
    "restaurantId": "rest001",
    "tableId": "table001",
    "getAllOrders": false,
    "activeOnly": true
  }
}'
```

[Include expected response and verification points]

### 7. Error Handling Tests

#### 7.1 Checkout with Empty Cart

**Purpose**: Test error handling for checkout with empty cart

[Include command, expected response, and verification points]

#### 7.2 Get Order with Invalid ID

**Purpose**: Test error handling when requesting a non-existent order

[Include command, expected response, and verification points]

## Troubleshooting

If tests fail, check:
1. Firebase emulator is running
2. Mock data was imported correctly
3. Feature flags are set as expected
4. Recent code changes that might affect the API behavior

## Implementation Notes

### Fixed Issues
1. **Checkout Cart Function**: Fixed issue with `getCart` function by accessing Firestore directly
2. **Order Creation**: Fixed import for `createOrUpdateOrder` function
3. **Cart Clearing**: Created internal implementation of `clearCart` to avoid HTTP callable function issues
4. **Order Trigger**: Fixed `onOrderPlaced` trigger to correctly handle order documents
5. **Feature Flags**: Added `sendServerNotifications` flag to control server notifications

## Adding New Tests

When adding new API endpoints, add corresponding test cases following this format:
1. Clear description of test purpose
2. Complete curl command with all required parameters
3. Expected response file or structure
4. Specific verification points

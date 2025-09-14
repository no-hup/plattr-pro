# Restaurant App Cart and Order Flow Documentation

## Cart Management Flow

### Add to Cart Process

#### Purpose
Manages the addition of menu items to a user's cart, handling variants, addons, and price calculations.

#### Cart Structure
```json
{
  "restaurantId": "rest001",
  "tableId": "table001",
  "sessionId": "sess_12345",
  "items": [
    {
      "menuItemId": "item001",
      "menuItem": {
        "meta": {
          "name": "Item Name",
          "description": "Item Description"
        }
      },
      "selectedVariantsDetails": [
        {
          "id": "variant001",
          "name": "Size",
          "selected_variant_id": "large",
          "selected_variant_name": "Large",
          "priceInfo": {
            "itemBasePrice": 10.0,
            "itemFinalPrice": 12.0
          }
        }
      ],
      "selectedAddonsDetails": [
        {
          "id": "addon001",
          "name": "Extra Cheese",
          "priceInfo": {
            "itemBasePrice": 2.0,
            "itemFinalPrice": 2.0
          }
        }
      ],
      "quantity": 1,
      "priceInfo": {
        "itemBasePrice": 10.0,
        "itemVariantBasePrice": 2.0,
        "itemAddonBasePrice": 2.0,
        "itemFinalPrice": 14.0,
        "discount": 0,
        "totalBasePrice": 14.0,
        "finalPrice": 14.0
      },
      "cartItemId": 1
    }
  ],
  "priceInfo": {
    "basePrice": 10.0,
    "finalPrice": 14.0,
    "totalDiscount": 0,
    "totalDiscountAmount": 0,
    "totalAddonBasePrice": 2.0,
    "totalVariantBasePrice": 2.0
  },
  "lastUpdated": "2024-03-24T18:00:00Z"
}
```

#### Add to Cart Flow
1. **Input Validation**
   - Validates required fields (tableId, restaurantId, menuItemId, quantity)
   - If sessionId provided, validates session exists and is active
   - Checks menu item exists and is in stock

2. **Variant Processing**
   - Validates mandatory variants are selected
   - Fetches and validates variant options
   - Calculates variant pricing

3. **Addon Processing**
   - Validates selected addons exist
   - Calculates addon pricing

4. **Cart Item Management**
   - Checks for identical items based on feature flag `isMultipleVariantOrAddonForMenuItemsSupported`
   - If identical item exists: Updates quantity and recalculates prices
   - If new configuration: Adds as new item with unique cartItemId

5. **Price Calculation**
   - Calculates individual item prices including variants and addons
   - Updates cart total with all items, variants, and addons
   - Applies any applicable discounts

## Checkout and Order Flow

### Checkout Process

#### Purpose
Converts a cart into an order, either creating a new order or updating an existing one.

#### Prerequisites
- Valid session (mandatory)
- Non-empty cart
- All items in stock

#### Checkout Flow
1. **Session Validation**
   - Validates sessionId exists and is active
   - Confirms session belongs to correct restaurant and table

2. **Cart Validation**
   - Verifies cart exists and has items
   - Validates price calculations
   - Checks stock availability

3. **Order Creation/Update**
   - Checks for existing active order
   - If no active order:
     - Generates new order number
     - Creates new order with initial cart
   - If active order exists:
     - Adds new cart to existing order
     - Updates total prices and items

4. **Cart Cleanup**
   - Clears the cart after successful order creation/update
   - Resets cart state for new orders

### Order Structure

#### New Order
```json
{
  "restaurantId": "rest001",
  "tableId": "table001",
  "orderNumber": "ORD-00001",
  "orderStatus": "ACTIVE",
  "paymentStatus": "UNPAID",
  "carts": [
    {
      "status": "PENDING",
      "statusHistory": [
        {
          "status": "PENDING",
          "timestamp": "2024-03-24T18:00:00Z",
          "userId": "user001"
        }
      ],
      "checkoutTime": "2024-03-24T18:00:00Z",
      "notes": "Special instructions",
      "estimatedPrepTime": 15,
      "assignedTo": null,
      "items": [...],
      "priceInfo": {...}
    }
  ],
  "items": [...],
  "priceInfo": {
    "basePrice": 10.0,
    "finalPrice": 14.0,
    "totalDiscount": 0,
    "totalDiscountAmount": 0
  },
  "createdAt": "2024-03-24T18:00:00Z",
  "updatedAt": "2024-03-24T18:00:00Z",
  "isActive": true,
  "assignedServer": "server001",
  "notes": "Order special instructions",
  "sessionId": "sess_12345"
}
```

#### Dual Item Tracking
The order structure maintains items at two levels:

1. **Order Level Items (`order.items`)**
   - Consolidated list of all items across all carts
   - Used for quick access to total order contents
   - Helpful for order summary and kitchen display systems
   - Contains flattened, normalized item data
   - Example:
     ```json
     "items": [
       {
         "menuItemId": "item001",
         "name": "Burger",
         "quantity": 2,
         "cartItemId": 1,
         "priceInfo": {...},
         "checkoutTime": "2024-03-24T18:00:00Z"
       }
     ]
     ```

2. **Cart Level Items (`order.carts[].items`)**
   - Original cart items preserved as they were at checkout
   - Maintains cart-specific context and history
   - Useful for tracking individual order batches
   - Contains detailed variant and addon information
   - Example:
     ```json
     "carts": [{
       "items": [
         {
           "menuItemId": "item001",
           "menuItem": {...},
           "selectedVariantsDetails": [...],
           "selectedAddonsDetails": [...],
           "quantity": 2,
           "cartItemId": 1,
           "priceInfo": {...}
         }
       ]
     }]
     ```

This dual tracking system serves multiple purposes:
- Provides quick access to total order contents without traversing all carts
- Maintains detailed history of how items were ordered in each cart
- Enables efficient order processing while preserving order context
- Facilitates different views of the order (kitchen, billing, customer)

### Order States and Transitions

#### Order Status
- `ACTIVE`: Order is in progress, table is occupied
- `COMPLETED`: Order is finished and paid
- `CANCELLED`: Order was cancelled

#### Cart Status within Order
- `PENDING`: Initial state when order is placed
- `ACCEPTED`: Kitchen has seen and accepted the order
- `PREPARING`: Kitchen is preparing the items
- `READY`: Items are ready for serving
- `SERVED`: Items have been served to the customer
- `CANCELLED`: Items were cancelled
- `RETURNED`: Items were returned by customer

### Multiple Cart Handling

#### Adding New Cart to Existing Order
1. **Cart Preparation**
   - Normalizes cart items format
   - Adds status and history tracking
   - Calculates estimated prep time

2. **Order Update Process**
   - Adds new cart to `carts` array
   - Merges new items with existing items
   - Recalculates total order price
   - Updates order timestamp and notes

#### Price Calculation Across Multiple Carts
- Maintains individual cart prices
- Aggregates total order value
- Tracks discounts at both cart and order level
- Updates final order price with each new cart

### Edge Cases and Special Scenarios

#### Cart Validation Failures
- Invalid item configurations
- Out-of-stock items
- Price calculation mismatches
- Session expiration during checkout

#### Order Management
- Handling cancelled items
- Managing partial order updates
- Dealing with payment status changes
- Session management across multiple carts

### Feature Flag Considerations
- `isMultipleVariantOrAddonForMenuItemsSupported`: Controls whether same item with different configurations can be added
- Additional feature flags may affect pricing, discounts, and order management

### Error Handling
- Session validation errors
- Cart validation failures
- Order creation/update failures
- Price calculation errors
- Stock management issues

### Cleanup and Maintenance
- Cart cleanup after successful checkout
- Order status updates
- Session management
- Price recalculation triggers

## Chef Operations Flow

### Item Status Management

#### Purpose
Allows chefs to update the status of individual menu items as they progress through food preparation.

#### Status Update Flow
1. **Authentication**
   - Chef must be authenticated (using Firebase Auth)
   - No session ID required for chef operations

2. **Item Status States**
   - `PENDING`: Initial state when order is placed
   - `PREPARING`: Chef has started preparing the item
   - `READY`: Item is ready to be served
   - `SERVED`: Item has been delivered to the customer
   - `CANCELLED`: Item has been cancelled

3. **Update Process**
   - Chef selects an item from an active order
   - Updates the status based on preparation progress
   - System records:
     - New status
     - Timestamp of update
     - ID of the chef who made the update

4. **Special Handling for Cancellations**
   - When an item is cancelled:
     - Item status is updated at both order level and cart level
     - Cancelled items are excluded from price calculations
     - Cart prices are recalculated based on active items only
     - Order total price is recalculated across all carts

#### API Structure
```json
// Request
{
  "restaurantId": "rest001",
  "orderId": "order123",
  "menuItemId": "item001",
  "cartItemId": 1,  // Optional: To identify specific item if multiple of same type
  "newStatus": "preparing"
}

// Response
{
  "status": "success",
  "message": "Item status updated to preparing",
  "data": {
    "orderId": "order123",
    "menuItemId": "item001",
    "newStatus": "preparing",
    "updatedAt": "2024-03-24T18:30:00Z"
  }
}
```

#### Notes
- Item status is tracked at both order and cart levels for comprehensive reporting
- Future implementation may include a feature flag `shouldUpdateFoodStatusAtItemLevelORAtOrderLevel` to determine status tracking granularity
- Orders must be in `ACTIVE` state for item updates
- All item status updates are performed within a transaction for data consistency

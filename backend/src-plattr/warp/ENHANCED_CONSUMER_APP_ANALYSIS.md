# Plattr Pro Consumer App Flow Analysis - Complete System Deep Dive

## Overview
This document provides an exhaustive analysis of the Plattr Pro consumer app flow, covering the complete journey from QR code scan to order completion. It includes detailed session management, feature flags, Firebase triggers, cross-system interactions, and all edge cases discovered through comprehensive code analysis.

## System Architecture

### Multi-App Platform Structure
Plattr Pro consists of 4 main applications:
1. **Consumer App** - Customer-facing mobile/web app (`frontend/flutter_boilerplate`)
2. **Admin App** - Restaurant administration (`frontend/src-platter-apps/apps/platter_admin`)
3. **Kitchen App** - Kitchen order management (`frontend/src-platter-apps/apps/platter_kitchen`)
4. **Server App** - Wait staff interface (`frontend/src-platter-apps/apps/platter_server`)

### Backend Architecture
Built on Firebase Functions with modular structure in `backend/src-plattr/functions/`:
- **Core modules**: admin, cart, customer, menu, orders, table, server, notifications, utils
- **Firebase Services**: Firestore, Cloud Functions, FCM, Performance Monitoring
- **Development**: Firebase emulators with specific port configuration

## Feature Flag System

The system uses comprehensive feature flags that control behavioral variations:

### Core Feature Flags (from FeatureFlags.js)

1. **`isOtpManadatoryAtScan`** (default: false)
   - Controls whether OTP is required immediately on scan
   - When false: OTP only required at order placement
   - When true: OTP required immediately after QR scan

2. **`isUsernameEnabled`** (default: false) 
   - Controls whether username is mandatory during OTP validation
   - Affects customer profile creation process

3. **`isMultiUserSupportEnabled`** (default: true)
   - Controls if multiple users can join the same table session
   - When false: Only single user per table allowed

4. **`isMultipleVariantOrAddonForMenuItemsSupported`** (default: false)
   - Affects menu item pricing model complexity
   - Controls variant/addon selection interface

5. **`sendServerNotifications`** (default: true)
   - Controls if server receives FCM notifications for orders
   - Affects notification triggers on order events

6. **`shouldUpdateFoodStatusAtItemLevelORAtOrderLevel`** (default: false)
   - For granular item-level order status tracking
   - Currently disabled, using order-level status

7. **`fallbackToSameCustomConfigurationForAddItem`** (default: false)
   - Auto-fills cart item configuration when adding items
   - Simplifies repeat item addition

### Feature Flag Impact Matrix

| Flag | Consumer App Impact | Backend Behavior | Cross-System Effects |
|------|-------------------|------------------|---------------------|
| `isOtpManadatoryAtScan` | OTP dialog timing | Session creation flow | Server notification timing |
| `isUsernameEnabled` | Username input field | Customer profile creation | Display names in admin/server |
| `isMultiUserSupportEnabled` | Multi-user UI elements | Session user array management | Shared cart behavior |
| `sendServerNotifications` | No direct impact | FCM trigger execution | Server app notifications |

## Session Management Deep Dive

### Session Lifecycle

**Session States**: `ACTIVE`, `ENDED`, `EXPIRED`

**Timeouts**:
- **Session Duration**: 4 hours from creation
- **Inactivity Cleanup**: 1 hour (triggers table state change to VACANT)
- **OTP Expiry**: Configurable per restaurant settings

**Session Creation Process**:
1. Primary user scans QR → triggers OTP if no valid session
2. OTP validation creates new session with 4-hour expiry
3. Session includes user array with primary/secondary flags
4. Session token validated on all API calls with timestamp checks

**Multi-User Session Logic**:
- If `isMultiUserSupportEnabled=true`: Secondary users can join with OTP
- Each user added to session.users array with unique customerId
- Session remains active until primary user leaves or expires

**Session Validation (from sessionService.js)**:
```javascript
// Session expiry check
if (session.expiresAt < serverTimestamp()) {
  throw new functions.https.HttpsError('unauthenticated', 'Session expired');
}

// User validation within session
if (!session.users.find(user => user.customerId === customerId)) {
  throw new functions.https.HttpsError('permission-denied', 'User not in session');
}
```

**Table State Transitions**:
- `VACANT` → `OCCUPIED` (on successful OTP validation)
- `OCCUPIED` → `VACANT` (on session end/expiry/cleanup)
- Table state affects QR scan behavior and server notifications

## Complete Consumer Flow with Nuances

### 1. QR Code Entry Point
**URL Pattern**: `/r/{restaurantId}/t/{tableId}`

**Screen**: QR Scan/Landing Page
- User scans QR code or enters URL directly
- App extracts `restaurantId` and `tableId` from URL parameters
- Initiates table verification process
- **Edge Case**: Invalid QR format triggers error handling

### 2. Table Verification & Session Management
**API**: `table-validateTableAndLocation`

**Location Validation**:
- Geofence validation against restaurant coordinates
- Configurable radius per restaurant
- GPS accuracy requirements and fallback logic

**Request**:
```json
{
  "restaurantId": "rest001",
  "tableId": "table001",
  "location": {
    "latitude": 12.9716,
    "longitude": 77.5946,
    "accuracy": 10.0
  },
  "sessionId": "existing_session_if_any"
}
```

**Response Scenarios with Feature Flag Variations**:

- **200 OK**: Valid session exists, proceed to menu
  ```json
  {
    "status": "authenticated",
    "sessionData": {
      "sessionId": "session001", 
      "expiresAt": "2024-01-01T14:00:00Z",
      "users": []
    }
  }
  ```

- **401 Unauthorized**: OTP required
  ```json
  {
    "status": "requires_authentication",
    "requiresUsername": true/false, // Based on isUsernameEnabled flag
    "multiUserSupported": true/false, // Based on isMultiUserSupportEnabled flag
    "otpExpiryMinutes": 5
  }
  ```

- **403 Forbidden**: Table disabled/unavailable
- **412 Precondition Failed**: Location mismatch

**Screen**: Table Verification/OTP Dialog
- Conditional username field based on `isUsernameEnabled` flag
- Multi-user messaging based on `isMultiUserSupportEnabled` flag
- Location accuracy warnings and retry logic

### 3. OTP Authentication with Feature Flags
**API**: `table-validateOTP`

**Request**:
```json
{
  "restaurantId": "rest001",
  "tableId": "table001", 
  "otp": "123456",
  "username": "John Doe", // Required only if isUsernameEnabled=true
  "location": {
    "latitude": 12.9716,
    "longitude": 77.5946,
    "accuracy": 10.0
  }
}
```

**Behavior Variations by Feature Flags**:
- **Username handling**: Only collected if `isUsernameEnabled=true`
- **Multi-user logic**: Secondary users can join if `isMultiUserSupportEnabled=true`
- **Immediate vs deferred auth**: Based on `isOtpManadatoryAtScan` flag

**OTP Validation Logic**:
```javascript
// OTP expiry check
if (otpData.expiresAt < serverTimestamp()) {
  throw new functions.https.HttpsError('unauthenticated', 'OTP expired');
}

// Primary vs secondary user logic
if (tableData.status === 'VACANT') {
  // Create new session - primary user
  session = {
    sessionId: generateSessionId(),
    expiresAt: serverTimestamp() + (4 * 60 * 60 * 1000), // 4 hours
    users: [{ customerId, isPrimary: true, username }]
  };
} else if (featureFlags.isMultiUserSupportEnabled) {
  // Add to existing session - secondary user
  existingSession.users.push({ customerId, isPrimary: false, username });
}
```

### 4. Menu Browsing with Dynamic Features
**API**: `menu-fetchMenu-fetchMenu`

**Screen**: Menu Listing
- Displays categorized menu with items
- Real-time stock status with `isInStock` flag
- Feature flag controlled variant/addon complexity
- Dynamic pricing display with discount calculations

**Menu Data Structure with Feature Flag Impacts**:
```json
{
  "categories": [
    {
      "id": "cat_1_food",
      "name": "Burgers",
      "items": [
        {
          "id": "item001",
          "name": "Classic Cheeseburger",
          "basePrice": 100,
          "discount": 10,
          "isInStock": true,
          "isCustomizable": true,
          "variants": [
            {
              "id": "variant_burger_size",
              "name": "Size",
              "isMandatory": true,
              "options": [
                {
                  "id": "burger_size_regular",
                  "name": "Regular",
                  "priceModifier": 0
                },
                {
                  "id": "burger_size_large", 
                  "name": "Large",
                  "priceModifier": 20,
                  "respectParentDiscount": true
                }
              ]
            }
          ],
          "addons": [
            {
              "id": "addon_burger_fries",
              "name": "French Fries",
              "price": 20,
              "respectParentDiscount": true
            }
          ]
        }
      ]
    }
  ]
}
```

**Frontend Behavior Based on Flags**:
- `isMultipleVariantOrAddonForMenuItemsSupported`: Controls UI complexity for selections
- `fallbackToSameCustomConfigurationForAddItem`: Auto-fills previous selections

### 5. Cart Management with Advanced Logic
**APIs**: 
- `cart-addItemToCart`
- `cart-fetchCart` 
- `cart-removeItemFromCart`
- `cart-clearCart`

**Cart Item Identification Logic**:
```javascript
// Complex item matching for cart operations
function findCartItem(items, targetItem) {
  return items.findIndex(item => 
    item.menuItemId === targetItem.menuItemId &&
    JSON.stringify(item.selectedVariants) === JSON.stringify(targetItem.selectedVariants) &&
    JSON.stringify(item.selectedAddons) === JSON.stringify(targetItem.selectedAddons)
  );
}
```

**Screen**: Menu with Cart Integration
- Optimistic UI updates with server validation
- Real-time price calculation with discount application
- Cart repair logic for data consistency
- Quantity controls with validation

**Cart Item Structure with Full Price Breakdown**:
```json
{
  "cartItemId": 1,
  "menuItemId": "item001",
  "quantity": 2,
  "selectedVariantsDetails": [
    {
      "id": "variant_burger_size",
      "isMandatory": true,
      "respectParentDiscount": true,
      "selected_variant_id": "burger_size_large",
      "selected_variant_name": "Large",
      "priceInfo": {
        "basePrice": 20,
        "finalPrice": 18, // With 10% discount
        "discount": 10
      }
    }
  ],
  "selectedAddonsDetails": [
    {
      "id": "addon_burger_fries",
      "name": "French Fries",
      "priceInfo": {
        "basePrice": 20,
        "finalPrice": 18, // With 10% discount
        "discount": 10
      },
      "respectParentDiscount": true
    }
  ],
  "priceInfo": {
    "itemBasePrice": 100,
    "itemVariantBasePrice": 20,
    "itemAddonBasePrice": 20, 
    "itemFinalPrice": 126, // Per item after discount
    "discount": 10,
    "totalBasePrice": 280, // Base * quantity
    "totalVariantBasePrice": 40,
    "totalAddonBasePrice": 40,
    "finalPrice": 252 // Total after all discounts
  },
  "status": "pending",
  "statusUpdatedAt": "2024-01-01T10:00:00Z",
  "statusUpdatedBy": "system"
}
```

**Client-Side Cart Repair Logic**:
```dart
// Frontend cart synchronization logic
void _repairCartInconsistencies(Cart serverCart, Cart localCart) {
  final serverItemIds = serverCart.items.map((item) => item.menuItemId).toSet();
  final localItemIds = localCart.items.map((item) => item.menuItemId).toSet();
  
  // Find items that exist locally but not on server
  final orphanedItems = localItemIds.difference(serverItemIds);
  if (orphanedItems.isNotEmpty) {
    _revertToServerState(serverCart);
    _showErrorToast('Cart synchronized with server');
  }
}
```

### 6. Cart Review with Comprehensive Display
**Screen**: Cart Listing Page (`cart_page.dart`)
- Detailed cart item display with variant/addon breakdown
- Price breakdown with discount visualization
- Quantity modification with confirmation dialogs
- Remove item functionality with undo option
- Empty cart state handling

**Price Summary Logic**:
```dart
// Complex price display logic
Widget _buildPriceSummary(CartPriceInfo priceInfo) {
  final showDiscountStrikethrough = 
    priceInfo.basePrice > priceInfo.finalPrice && 
    priceInfo.basePrice > 0;
  
  return Column(children: [
    if (showDiscountStrikethrough)
      _buildPriceRow('Subtotal:', '₹${priceInfo.basePrice}', 
        strikethrough: true),
    if (priceInfo.totalDiscountAmount > 0)
      _buildPriceRow('Discount:', '-₹${priceInfo.totalDiscountAmount}', 
        color: Colors.red),
    _buildPriceRow('To Pay:', '₹${priceInfo.finalPrice}', 
      bold: true),
  ]);
}
```

### 7. Order Checkout with Business Logic
**API**: `cart-checkoutCart`

**Pre-checkout Validation**:
- Session validity check
- Cart non-empty validation
- Price recalculation verification
- Stock availability recheck

**Request**:
```json
{
  "restaurantId": "rest001",
  "tableId": "table001",
  "sessionId": "session001",
  "notes": "Extra napkins please",
  "expectedTotal": 252 // Client-side calculated total for verification
}
```

**Checkout Process**:
1. **Transaction Start**: Firestore transaction begins
2. **Session Validation**: Verify active session
3. **Cart Retrieval**: Get current cart state
4. **Price Recalculation**: Server-side price verification
5. **Stock Check**: Validate item availability
6. **Order Creation**: Generate order with unique number
7. **Cart Cleanup**: Clear cart after successful order
8. **Notification Trigger**: FCM notification to server (if enabled)

**Success Response**:
```json
{
  "result": {
    "message": "Checkout completed successfully.",
    "status": "success",
    "data": {
      "orderId": "order_12345",
      "orderNumber": "ORD-001",
      "orderStatus": "active",
      "paymentStatus": "pending", 
      "estimatedTime": 25,
      "timestamp": "2024-01-01T10:00:00Z"
    }
  }
}
```

### 8. Order Tracking with Real-Time Updates
**API**: `order-getOrder`

**Screen**: Order Status Page
- Real-time order status with color-coded indicators
- Order details with complete item breakdown
- Estimated delivery time with dynamic updates
- Order history and status timeline
- Retry logic for failed status updates

**Order Status Progression**:
1. **PLACED** - Order received and confirmed
2. **PREPARING** - Kitchen has started preparation
3. **READY** - Order ready for pickup/delivery
4. **COMPLETED** - Order delivered and payment processed

## Firebase Triggers and Cross-System Effects

### Order Triggers (orderTriggers.js)

#### `onOrderPlaced` Trigger
```javascript
exports.onOrderPlaced = functions.firestore
  .document('restaurants/{restaurantId}/orders/{orderId}')
  .onCreate(async (snapshot, context) => {
    const order = snapshot.data();
    
    // Send FCM notification to assigned server if feature flag enabled
    if (featureFlags.isEnabled('sendServerNotifications')) {
      const serverId = await getAssignedServerId(order.tableId);
      if (serverId) {
        await sendFCMNotification(serverToken, {
          title: 'New Order',
          body: `Order ${order.orderNumber} placed at Table ${order.tableId}`,
          data: { orderId: snapshot.id, type: 'NEW_ORDER' }
        });
      }
    }
  });
```

#### `onOrderUpdated` Trigger
```javascript
exports.onOrderUpdated = functions.firestore
  .document('restaurants/{restaurantId}/orders/{orderId}')
  .onUpdate(async (change, context) => {
    const beforeData = change.before.data();
    const afterData = change.after.data();
    
    // Check for cart status changes to READY
    const readyCarts = afterData.carts.filter((cart, index) => 
      beforeData.carts[index]?.status !== 'READY' && 
      cart.status === 'READY'
    );
    
    if (readyCarts.length > 0 && featureFlags.isEnabled('sendServerNotifications')) {
      // Notify server about ready carts
      await sendServerReadyNotification(afterData.tableId, readyCarts);
    }
  });
```

### Notification System (notifications/index.js)

**QR Scan Notification**:
```javascript
exports.handleTableQRScan = functions.https.onCall(async (data, context) => {
  // Notify server when customer scans QR
  if (featureFlags.isEnabled('sendServerNotifications')) {
    await sendFCMNotification(serverToken, {
      title: 'Table Scanned',
      body: `Customer scanned QR for Table ${data.tableId}`,
      data: { tableId: data.tableId, type: 'QR_SCAN' }
    });
  }
});
```

**Order Placement Notification**:
```javascript
exports.notifyOrderPlaced = functions.https.onCall(async (data, context) => {
  // Multi-system notification on order placement
  const notifications = [];
  
  if (featureFlags.isEnabled('sendServerNotifications')) {
    notifications.push(notifyServer(data));
  }
  
  // Kitchen app notification (always enabled)
  notifications.push(notifyKitchen(data));
  
  await Promise.all(notifications);
});
```

### Cross-System Impact Matrix

| Consumer Action | Server App Effect | Kitchen App Effect | Admin App Effect | Backend Triggers |
|----------------|------------------|-------------------|-----------------|------------------|
| QR Scan | FCM: Table scanned | None | Analytics update | handleTableQRScan |
| OTP Success | FCM: Customer seated | None | Session created | Session document create |
| Order Placed | FCM: New order alert | FCM: Kitchen order | Order analytics | onOrderPlaced trigger |
| Cart Ready | FCM: Ready for pickup | Status update | Order tracking | onOrderUpdated trigger |
| Order Complete | FCM: Payment reminder | Order archived | Revenue tracking | updateOrderStatus |

## Advanced Error Handling and Edge Cases

### Input Validation Framework (orderInputValidation.js)

**Comprehensive Field Validation**:
```javascript
class OrderInputValidation {
  static validateRestaurantId(restaurantId) {
    if (!restaurantId || typeof restaurantId !== 'string' || restaurantId.trim() === '') {
      throw new functions.https.HttpsError(
        'invalid-argument', 
        'restaurantId is required and cannot be empty'
      );
    }
  }
  
  static validateCart(cart) {
    if (!cart || typeof cart !== 'object') {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Cart data is required'
      );
    }
    
    if (!cart.items || !Array.isArray(cart.items) || cart.items.length === 0) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Cart must contain at least one item'
      );
    }
  }
}
```

### Network Error Handling (Flutter)

**Comprehensive Error Recovery**:
```dart
class ApiErrorHandler {
  static ApiResponse handleDioException(DioException e) {
    switch (e.type) {
      case DioExceptionType.connectionTimeout:
      case DioExceptionType.sendTimeout:
      case DioExceptionType.receiveTimeout:
        return ApiResponse.error(
          'Connection timeout. Please check your internet connection and try again.',
          errorCode: 'TIMEOUT_ERROR'
        );
      
      case DioExceptionType.connectionError:
        return ApiResponse.error(
          'Connection error. Please check your internet connection.',
          errorCode: 'CONNECTION_ERROR'
        );
      
      case DioExceptionType.badResponse:
        return _handleHttpError(e.response);
        
      default:
        return ApiResponse.error(
          'An unexpected network error occurred.',
          errorCode: 'NETWORK_ERROR'
        );
    }
  }
}
```

### Business Logic Edge Cases

**Stock Availability Edge Cases**:
- Item goes out of stock between add-to-cart and checkout
- Variant/addon availability changes during selection
- Price changes during cart session

**Session Edge Cases**:
- Session expires during checkout process
- Multiple devices with same session
- Primary user leaves while secondary users active
- Location validation fails mid-session

**Payment Edge Cases**:
- Partial payment scenarios
- Price recalculation failures
- Discount expiry during checkout
- Currency precision handling

## Database Schema and Relationships

### Firestore Collections Structure
```
restaurants/{restaurantId}/
├── tables/{tableId} - Table configuration and status
├── sessions/{sessionId} - Active user sessions  
├── carts/{tableId} - Shopping carts per table
├── orders/{orderId} - Order documents with cart arrays
├── menus/{menuId} - Menu structure with items
└── servers/{serverId} - Server profiles and FCM tokens

customers/{customerId} - Customer profiles across restaurants
```

### Advanced Document Examples

**Session Document with Multi-User**:
```json
{
  "sessionId": "session001",
  "restaurantId": "rest001",
  "tableId": "table001",
  "status": "ACTIVE",
  "createdAt": {
    "_seconds": 1678901234,
    "_nanoseconds": 0
  },
  "expiresAt": {
    "_seconds": 1678915634,
    "_nanoseconds": 0
  },
  "lastActivityAt": {
    "_seconds": 1678912034, 
    "_nanoseconds": 0
  },
  "users": [
    {
      "customerId": "cust001",
      "username": "John Doe",
      "isPrimary": true,
      "joinedAt": {
        "_seconds": 1678901234,
        "_nanoseconds": 0
      }
    },
    {
      "customerId": "cust002", 
      "username": "Jane Smith",
      "isPrimary": false,
      "joinedAt": {
        "_seconds": 1678902234,
        "_nanoseconds": 0
      }
    }
  ],
  "metadata": {
    "userAgent": "Mozilla/5.0...",
    "ipAddress": "192.168.1.100",
    "location": {
      "latitude": 12.9716,
      "longitude": 77.5946,
      "accuracy": 10.0
    }
  }
}
```

**Order Document with Multiple Carts**:
```json
{
  "orderId": "order_12345",
  "orderNumber": "ORD-001",
  "restaurantId": "rest001",
  "tableId": "table001",
  "sessionId": "session001",
  "orderStatus": "active",
  "paymentStatus": "pending",
  "carts": [
    {
      "cartId": "cart001",
      "status": "PREPARING",
      "estimatedTime": 15,
      "assignedTo": "kitchen_station_1",
      "items": [
        {
          "cartItemId": 1,
          "menuItemId": "item001",
          "quantity": 2,
          "status": "pending",
          "selectedVariantsDetails": [],
          "selectedAddonsDetails": [],
          "priceInfo": {
            "itemBasePrice": 100,
            "finalPrice": 180
          }
        }
      ]
    }
  ],
  "priceInfo": {
    "basePrice": 200,
    "finalPrice": 180,
    "totalDiscountAmount": 20,
    "totalTax": 0,
    "totalVariantBasePrice": 40,
    "totalAddonBasePrice": 30
  },
  "customerInfo": {
    "primaryCustomer": {
      "customerId": "cust001",
      "username": "John Doe"
    },
    "totalCustomers": 2
  },
  "orderNotes": "Extra napkins please",
  "createdAt": {
    "_seconds": 1678901234,
    "_nanoseconds": 0
  },
  "updatedAt": {
    "_seconds": 1678901834,
    "_nanoseconds": 0
  },
  "estimatedCompletionTime": {
    "_seconds": 1678902734,
    "_nanoseconds": 0  
  },
  "statusHistory": [
    {
      "status": "placed",
      "timestamp": {
        "_seconds": 1678901234,
        "_nanoseconds": 0
      },
      "updatedBy": "system"
    }
  ]
}
```

## API Reference with Error Scenarios

### Core Endpoints with Complete Error Mapping

#### Table Operations

**`POST table-validateTableAndLocation`**
- **Success (200)**: Valid session exists
- **Auth Required (401)**: OTP needed
- **Forbidden (403)**: Table disabled
- **Precondition Failed (412)**: Location mismatch
- **Internal Error (500)**: Server error

**`POST table-validateOTP`**
- **Success (200)**: OTP valid, session created
- **Invalid Argument (400)**: Missing required fields
- **Unauthorized (401)**: Invalid OTP
- **Precondition Failed (412)**: Location changed
- **Internal Error (500)**: Session creation failed

#### Cart Operations with Edge Cases

**`POST cart-addItemToCart`**
- **Success (200)**: Item added successfully
- **Invalid Argument (400)**: Missing menuItemId, invalid quantity
- **Unauthenticated (401)**: Session expired
- **Not Found (404)**: Menu item not found
- **Failed Precondition (412)**: Item out of stock
- **Internal Error (500)**: Price calculation failed

**`POST cart-removeItemFromCart`**
- **Success (200)**: Item removed/quantity decreased
- **Invalid Argument (400)**: Invalid cartItemId
- **Not Found (404)**: Cart or item not found
- **Internal Error (500)**: Cart update failed

**`POST cart-checkoutCart`**
- **Success (200)**: Order created successfully
- **Invalid Argument (400)**: Empty cart
- **Unauthenticated (401)**: Session expired
- **Failed Precondition (412)**: Price mismatch, stock unavailable
- **Internal Error (500)**: Order creation failed

### Error Code Taxonomy

#### Authentication Errors
- `session-expired`: Session timeout reached
- `invalid-otp`: OTP incorrect or expired
- `location-mismatch`: User location outside geofence
- `session-not-found`: Invalid session ID

#### Business Logic Errors
- `cart-empty`: Cannot checkout empty cart
- `item-out-of-stock`: Selected item unavailable
- `invalid-variant`: Required variant not selected
- `price-mismatch`: Server/client price calculation mismatch
- `table-disabled`: Table not accepting orders
- `restaurant-closed`: Outside operating hours

#### Technical Errors
- `invalid-argument`: Required field missing or malformed
- `internal`: Unexpected server error
- `timeout`: Request timeout
- `network-error`: Connection issues

## Performance Monitoring and Optimization

### Firebase Performance Integration

**API Call Tracing**:
```dart
// Frontend performance monitoring
class ApiClient {
  Future<Response> post(String endpoint, dynamic data) async {
    final trace = FirebasePerformance.instance.newHttpTrace(
      HttpMethod.Post,
      Uri.parse('$baseUrl/$endpoint')
    );
    
    await trace.start();
    try {
      final response = await dio.post(endpoint, data: data);
      trace.setHttpResponseCode(response.statusCode);
      trace.setResponseContentType(response.headers.value('content-type'));
      trace.setResponsePayloadSize(response.data.toString().length);
      return response;
    } finally {
      await trace.stop();
    }
  }
}
```

**Backend Performance Tracking**:
```javascript
// Cloud Functions performance monitoring
const performanceTrace = (functionName) => {
  return (req, res, next) => {
    const startTime = Date.now();
    
    res.on('finish', () => {
      const duration = Date.now() - startTime;
      console.log(`Function ${functionName} executed in ${duration}ms`);
      
      // Custom metrics for monitoring
      if (duration > 5000) {
        console.warn(`Slow function execution: ${functionName} took ${duration}ms`);
      }
    });
    
    next();
  };
};
```

## Development and Testing

### Mock Data Strategy

Comprehensive mock data in `functions/mock/mockData.json`:
- **Restaurants**: Complete restaurant profiles with configuration
- **Tables**: Various table states for testing edge cases
- **Menu**: Complex menu structure with variants, addons, discounts
- **Sessions**: Active and expired sessions for testing
- **Orders**: Order history with different states

**Mock Data Import Script**:
```bash
# Import mock data to emulator
cd backend/src-plattr
npm run import-mock
```

### Testing Strategies

**API Workflow Testing** (`api_workflow_test.sh`):
```bash
# Complete flow testing with curl commands
./tests/api_workflow_test.sh

# Test scenarios:
# 1. QR scan → OTP → Menu → Add items → Checkout
# 2. Multi-user session testing  
# 3. Session expiry handling
# 4. Edge case error responses
```

**Frontend Integration Tests**:
```dart
// Widget testing for complete flows
testWidgets('Complete order flow test', (WidgetTester tester) async {
  // 1. Mock QR scan
  await tester.mockQRScan('rest001', 'table001');
  
  // 2. Trigger OTP dialog
  expect(find.byType(OTPDialog), findsOneWidget);
  
  // 3. Enter valid OTP
  await tester.enterOTP('123456');
  
  // 4. Verify menu loads
  expect(find.byType(MenuListingPage), findsOneWidget);
  
  // 5. Add items to cart
  await tester.addItemsToCart();
  
  // 6. Proceed to checkout
  await tester.proceedToCheckout();
  
  // 7. Verify order creation
  expect(find.byType(OrderTrackingPage), findsOneWidget);
});
```

## Security Considerations

### Session Security
- Session tokens with cryptographic randomness
- Location-based validation to prevent session hijacking
- Session expiry enforcement at multiple levels
- Rate limiting on OTP generation and validation

### Data Validation
- Comprehensive input sanitization
- SQL injection prevention (Firestore NoSQL)
- XSS prevention in user-generated content
- File upload restrictions and validation

### Firebase Security Rules
```javascript
// Firestore security rules example
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Sessions can only be accessed by authenticated users
    match /restaurants/{restaurantId}/sessions/{sessionId} {
      allow read, write: if isAuthenticated() && 
                           sessionBelongsToUser(sessionId);
    }
    
    // Carts can only be modified by session users
    match /restaurants/{restaurantId}/carts/{tableId} {
      allow read, write: if isAuthenticated() && 
                           hasValidSessionForTable(tableId);
    }
  }
}
```

## Conclusion

This comprehensive analysis covers every aspect of the Plattr Pro consumer app flow, from initial QR scan through order completion. The system demonstrates sophisticated session management, feature flag-driven behavior customization, real-time cross-system communication, and robust error handling.

Key architectural strengths:
- **Modular Design**: Clear separation of concerns across Firebase Functions
- **Feature Flag Control**: Behavioral customization without code changes
- **Real-time Communication**: FCM-based notifications across all apps
- **Comprehensive Error Handling**: Detailed error taxonomy and recovery strategies
- **Session Management**: Secure, expiring sessions with multi-user support
- **Price Calculation**: Complex discount and variant logic with server validation
- **Performance Monitoring**: Built-in tracing and optimization

This documentation serves as the definitive guide for developers working on any aspect of the consumer app flow, ensuring consistent implementation and comprehensive understanding of system interactions.
# Flutter Implementation Guide: Cart Checkout & Orders Flow

## Checkout Functionality Requirements

### API Integration
1. Create an API service to call the `checkoutCart` Cloud Function:
   ```dart
   Future<OrderResponse> checkoutCart({
     required String restaurantId,
     required String tableId,
     required String sessionId,
     String? notes
   })
   ```

2. Request Body Structure:
   ```json
   {
     "data": {
       "restaurantId": "rest001",
       "tableId": "table001",
       "sessionId": "session001", // Required
       "notes": "Extra napkins please" // Optional
     }
   }
   ```

curl -X POST \
  "http://127.0.0.1:5001/rms-app-dd875/us-central1/checkoutCart" \
  -H "Content-Type: application/json" \
  -d '{
    "data": {
      "restaurantId": "restaurant123",
      "tableId": "table456",
      "notes": "",
      "sessionId": "session789"
    }
  }'

### Success Response Model
Create a model for the successful checkout response:

```dart
class CheckoutResponse {
  final String message;
  final String status;
  final CheckoutData data;
  
  // Add constructor, fromJson
}

class CheckoutData {
  final String orderId;
  final String orderNumber;
  final String orderStatus;
  final DateTime timestamp;
  
  // Add constructor, fromJson
}
```

Example JSON response:
```json
{
  "result": {
    "message": "Checkout completed successfully.",
    "status": "success",
    "data": {
      "orderId": "abc123",
      "orderNumber": "ORD-00042",
      "orderStatus": "pending",
      "timestamp": "2023-08-15T14:30:00.000Z"
    }
  }
}
```

### Error Response Handling
Create models for potential error responses:

```dart
class CheckoutError {
  final String code;
  final String message;
  final ErrorDetails? details;
  
  // Add constructor, fromJson
}

class ErrorDetails {
  final int httpCode;
  final String? status;
  final String? message;
  
  // Add constructor, fromJson
}
```

#### Error Scenarios to Handle

1. **Empty Cart**:
   ```json
   {
     "error": {
       "code": "failed-precondition",
       "message": "Cannot checkout an empty cart.",
       "details": {
         "httpCode": 412
       }
     }
   }
   ```

2. **Missing Session**:
   ```json
   {
     "error": {
       "code": "unauthenticated",
       "message": "Authentication required",
       "details": {
         "httpCode": 401,
         "otpRequired": true,
         "isUsernameMandatory": true,
         "isPhoneNumberMandatory": true,
         "isMultiUserSupported": false
       }
     }
   }
   ```

3. **Invalid Cart Structure**:
   ```json
   {
     "error": {
       "code": "failed-precondition",
       "message": "Invalid cart price structure. Please update cart before checkout.",
       "details": {
         "httpCode": 412
       }
     }
   }
   ```

4. **Out-of-Stock Items**:
   ```json
   {
     "error": {
       "code": "failed-precondition",
       "message": "Cannot checkout. The following items are out of stock: Classic Burger, Fries",
       "details": {
         "httpCode": 412
       }
     }
   }
   ```

### UI Components

1. **Checkout Button**:
   - Should be disabled if cart is empty
   - Shows loading indicator during API call

2. **Checkout Confirmation Dialog**:
   - Optional: Confirm checkout with total amount
   - Input field for optional notes

3. **Success State**:
   - Show order confirmation with order number
   - Option to view order details
   - Clear navigation to orders page

4. **Error States**:
   - Empty cart: Prompt to add items
   - Session expired: Redirect to OTP/login flow
   - Out-of-stock: Show affected items with options to remove
   - Network error: Retry option

## Orders Page Implementation

### API Integration
1. Create an API service to fetch orders:
   ```dart
   Future<OrdersResponse> getOrders({
     required String restaurantId,
     required String tableId,
     required String sessionId,
     String? orderStatus,
     int? limit,
     String? startAfter
   })
   ```

2. Request Body Structure:
   ```json
   {
     "data": {
       "restaurantId": "rest001",
       "tableId": "table001",
       "sessionId": "session001",
       "orderStatus": "ACTIVE", // Optional, for filtering
       "limit": 10, // Optional, for pagination
       "startAfter": "lastOrderId" // Optional, for pagination
     }
   }
   ```

### Response Models
Create models for orders response:

```dart
class OrdersResponse {
  final String message;
  final String status;
  final List<Order> orders;
  final String? nextPageToken;
  
  // Add constructor, fromJson
}

class Order {
  final String id;
  final String orderNumber;
  final String orderStatus;
  final String paymentStatus;
  final List<OrderCart> carts;
  final List<OrderItem> items;
  final PriceInfo priceInfo;
  final DateTime createdAt;
  final DateTime updatedAt;
  final bool isActive;
  final String? assignedServer;
  final String? notes;
  
  // Add constructor, fromJson
}

class OrderCart {
  final String status;
  final List<StatusHistory> statusHistory;
  final DateTime checkoutTime;
  final String? notes;
  final int estimatedPrepTime;
  final String? assignedTo;
  final List<CartItem> items;
  final PriceInfo priceInfo;
  
  // Add constructor, fromJson
}

class StatusHistory {
  final String status;
  final DateTime timestamp;
  final String userId;
  
  // Add constructor, fromJson
}

class OrderItem {
  final String menuItemId;
  final String name;
  final String? description;
  final int quantity;
  final PriceInfo priceInfo;
  final Map<String, String> selectedVariants;
  final List<VariantDetail> selectedVariantsDetails;
  final List<String> selectedAddons;
  final List<AddonDetail> selectedAddonsDetails;
  final int cartItemId;
  final DateTime checkoutTime;
  
  // Add constructor, fromJson
}

class PriceInfo {
  final double basePrice;
  final double finalPrice;
  final double totalDiscount;
  final double totalDiscountAmount;
  
  // Add constructor, fromJson
}
```

### UI Implementation

1. **Order List View**:
   - Chronological list of orders
   - Display order number, date, status, and total amount
   - Pull-to-refresh functionality
   - Pagination support (load more)

2. **Order Details View**:
   - Order number and overall status
   - Creation time and last update time
   - List of items with quantities, variants, and addons
   - Price breakdown with subtotal, discounts, and final amount
   - Status history (if available)

3. **Order Status Display**:
   - Color-coded status indicators:
     - Pending: Orange
     - Preparing: Blue
     - Ready: Green
     - Served: Gray
     - Cancelled: Red

4. **Optional: Item Status Tracking**:
   - Individual item status indicators
   - Group items by cart for multiple checkout sessions

## Edge Cases & Special Considerations

1. **Session Management**:
   - Session token is required for all checkout and order operations
   - Handle session expiry by redirecting to OTP/login flow
   - Store session tokens securely (secure storage)

2. **Cart Validation Before Checkout**:
   - Optionally implement client-side validation before checkout
   - Match price calculation logic with server to prevent validation errors

3. **Offline Support**:
   - Cache orders for offline viewing
   - Queue checkout requests when offline (optional)
   - Warn users when attempting checkout in offline mode

4. **Multiple Device Sync**:
   - Handle real-time updates if multiple users on same table
   - Subscribe to order updates if using Firebase Firestore directly

5. **Empty States**:
   - Show appropriate messages for:
     - No orders yet
     - Empty cart during checkout attempt
     - Filtered orders with no results

6. **Order Status Changes**:
   - Implement refresh mechanism or real-time updates
   - Display notifications for status changes (optional)

7. **Large Orders**:
   - Optimize rendering for orders with many items
   - Consider collapsible sections for multiple carts

8. **Error Recovery**:
   - Implement retry logic for checkout
   - Save draft notes before attempting checkout
   - Restore cart state if checkout fails

## Testing Checklist

1. Verify checkout works with different cart configurations
2. Test all error scenarios and recovery paths
3. Validate order display with various status combinations
4. Test pagination with large order histories
5. Verify UI adapts to different screen sizes
6. Check network error handling and offline behavior
7. Test session expiry and re-authentication flow

This comprehensive guide should provide your Flutter team with everything they need to implement the checkout functionality and orders page, with special attention to error handling and edge cases.

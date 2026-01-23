
# Standardizing Error Responses

## Overview

This document outlines requirements for standardizing error handling across our Firebase Cloud Functions. The goal is to ensure consistent error responses, improve debugging, and maintain a uniform API contract with clients.

## Current State

Currently, most cloud functions use direct `functions.https.HttpsError` throws, resulting in inconsistent error formats and logging. Only some functions (like `checkoutCart.js`) properly use the `ErrorHandler` singleton.

```javascript
// NON-STANDARD (direct HttpsError)
throw new functions.https.HttpsError('not-found', 'Resource not found');

// STANDARD (using ErrorHandler)
errorHandler.notFound('Resource not found');
```

## Requirements

1. All cloud functions MUST use the `ErrorHandler` singleton for throwing errors
2. No direct instantiation of `functions.https.HttpsError` objects
3. Maintain backward compatibility with clients
4. Implement comprehensive error logging
5. Standardize error response structure

## Error Response Format

The standard error response format is:

```javascript
{
  status: "error",
  message: "Human-readable error message",
  data: {
    code: "firebase-error-code",
    httpCode: 404, // HTTP status code
    // Additional context-specific details
  }
}
```

## Implementation Guidelines

### 1. Import the ErrorHandler

```javascript
const errorHandler = require('../singleton/ErrorHandler');
```

### 2. Replace Direct Error Throws

| Current Pattern | New Pattern |
|-----------------|-------------|
| `throw new functions.https.HttpsError('not-found', 'Item not found');` | `errorHandler.notFound('Item not found');` |
| `throw new functions.https.HttpsError('invalid-argument', 'Invalid input');` | `errorHandler.badRequest('Invalid input');` |
| `throw new functions.https.HttpsError('internal', 'Server error');` | `errorHandler.internalError('Server error');` |
| `throw new functions.https.HttpsError('permission-denied', 'Access denied');` | `errorHandler.forbidden('Access denied');` |
| `throw new functions.https.HttpsError('failed-precondition', 'Precondition failed');` | `errorHandler.preconditionFailed('Precondition failed');` |
| `throw new functions.https.HttpsError('unauthenticated', 'Not authenticated');` | `errorHandler.unauthorized('Not authenticated');` |

### 3. Handling Complex Errors

For errors with additional context:

```javascript
errorHandler.notFound('User profile not found', { userId: 'abc123' });
```

### 4. Capturing and Re-throwing Errors

```javascript
try {
  // Operation that might fail
} catch (error) {
  errorHandler.handleError(error, 'functionName', { contextualInfo: 'value' });
}
```

## Backward Compatibility Considerations

The `ErrorHandler` maintains the same Firebase error codes, ensuring API backward compatibility. Clients expecting specific Firebase error codes will continue to work. The only change is in the structure of the `details` property of the HttpsError, which now follows a standardized format.

If clients are directly parsing the `details` property structure rather than using the error code and message, they might need updates.

## Example: Correct Implementation in createOrUpdateOrder.js

Here's how to fix `createOrUpdateOrder.js` with minimal changes:

```javascript
// Import ErrorHandler
const errorHandler = require('../singleton/ErrorHandler');

// Then replace error throws like:
throw new functions.https.HttpsError('not-found', 'Restaurant not found');

// With:
errorHandler.notFound('Restaurant not found');
```

## Full Example: createOrUpdateOrder.js with Standardized Error Handling

```javascript
const functions = require("firebase-functions");
const admin = require('./initializeAdmin');
const db = admin.firestore();
const { Timestamp } = require("firebase-admin/firestore");
const { ORDER_STATUS, PAYMENT_STATUS, FULFILLMENT_STATUS } = require('./orderConstants');
const OrderInputValidation = require('./orderInputValidation');
const { validateCheckoutSession } = require('../cart/cartInputValidation');
const { timestamp } = require('../utils/timestamp');
// Add ErrorHandler import
const errorHandler = require('../singleton/ErrorHandler');

/**
 * Creates a new order or updates an existing one during cart checkout
 * This is an internal helper function used by the checkoutCart cloud function
 * 
 * @param {string} restaurantId - ID of the restaurant
 * @param {string} tableId - ID of the table
 * @param {Object} cart - Cart data to be added to the order
 * @param {string} [userId='system'] - ID of the user performing the checkout (optional)
 * @param {string} [notes=''] - Special instructions for this order (optional)
 * @param {string} [sessionId=null] - ID of the session (optional)
 * @returns {Object} The created or updated order
 */
exports.createOrUpdateOrder = async (restaurantId, tableId, cart, userId = 'system', notes = '', sessionId = null) => {
  // Validate required parameters
  try {
    OrderInputValidation.validateCreateOrUpdateOrderFields(restaurantId, tableId, cart);
    
    // Session validation is removed as it's already done in checkoutCart
    // This avoids duplicate validation and potential double errors
  } catch (error) {
    console.error(`createOrUpdateOrder: ${error.message}`);
    // Use ErrorHandler instead of re-throwing directly
    errorHandler.handleError(error, 'createOrUpdateOrder');
  }
  
  // Prepare cart snapshot to add to order
  const cartSnapshot = {
    ...cart,
    status: FULFILLMENT_STATUS.PENDING,
    statusHistory: [{
      status: FULFILLMENT_STATUS.PENDING,
      timestamp: timestamp.now(),
      userId
    }],
    checkoutTime: timestamp.now(),
    notes,
    estimatedPrepTime: calculateEstimatedPrepTime(cart.items),
    assignedTo: null
  };
  
  // sanitise the format of the cart items for the order
  const orderItems = normalizeCartItemsForOrder(cart);
  
  try {
    // Begin a transaction to ensure data consistency
    return await db.runTransaction(async (transaction) => {
      // Check if there's an active order for this table
      const orderQuery = db.collection("restaurants").doc(restaurantId)
        .collection("orders")
        .where('tableId', '==', tableId)
        .where('orderStatus', '==', ORDER_STATUS.ACTIVE);
      
      const orderSnapshot = await transaction.get(orderQuery);
      
      let orderResult;
      
      if (orderSnapshot.empty) {
        // Create new order
        const orderNumber = await generateOrderNumber(transaction, restaurantId);
        console.log(`Creating new order for table ${tableId} with order number ${orderNumber}`);
        orderResult = await createNewOrder(
          transaction, 
          restaurantId, 
          tableId, 
          cartSnapshot, 
          orderItems,
          orderNumber,
          userId,
          sessionId
        );
      } else {
        // Update existing order
        const orderDoc = orderSnapshot.docs[0];
        console.log(`Updating existing order ${orderDoc.id} for table ${tableId}`);
        orderResult = await updateExistingOrder(
          transaction,
          restaurantId,
          orderDoc.id,
          orderDoc.data(),
          cartSnapshot,
          orderItems,
          sessionId
        );
      }
      
      return orderResult;
    });
  } catch (error) {
    console.error(`createOrUpdateOrder: Error processing order for table ${tableId}: ${error.message}`);
    // Use ErrorHandler instead of re-throwing directly
    errorHandler.internalError(`Error processing order for table ${tableId}`, {
      originalError: error.message,
      tableId,
      restaurantId
    });
  }
};

/**
 * Normalizes cart items into a standardized format suitable for order storage
 * @param {Object} cart - The cart object
 * @returns {Array} Array of normalized order items
 */
function normalizeCartItemsForOrder(cart) {
  if (!cart || !cart.items || !Array.isArray(cart.items)) {
    console.warn('Invalid cart structure or missing items array');
    return [];
  }
  
  return cart.items.map(item => {
    // Skip cancelled items
    if (item.status === 'cancelled') return null;
    
    // Skip items without menuItemId
    if (!item.menuItemId) return null;
    
    // Create a simplified version of the cart item for the order
    return {
      menuItemId: item.menuItemId,
      name: item.menuItem?.meta?.name || 'Unknown Item',
      description: item.menuItem?.meta?.description || '',
      quantity: typeof item.quantity === 'number' && item.quantity > 0 ? item.quantity : 1,
      priceInfo: {
        basePrice: typeof item.priceInfo?.itemBasePrice === 'number' ? item.priceInfo.itemBasePrice : 0,
        finalPrice: typeof item.priceInfo?.itemFinalPrice === 'number' ? item.priceInfo.itemFinalPrice : 0,
        discount: typeof item.priceInfo?.discount === 'number' ? Math.max(0, Math.min(100, item.priceInfo.discount)) : 0
      },
      selectedVariants: item.selectedVariants || {},
      selectedVariantsDetails: Array.isArray(item.selectedVariantsDetails) ? item.selectedVariantsDetails : [],
      selectedAddons: Array.isArray(item.selectedAddons) ? item.selectedAddons : [],
      selectedAddonsDetails: Array.isArray(item.selectedAddonsDetails) ? item.selectedAddonsDetails : [],
      cartItemId: item.cartItemId || 0,
      checkoutTime: timestamp.now()
    };
  }).filter(Boolean); // Remove null items
}

/**
 * Creates a new order with the given cart
 * @param {Object} transaction - Firestore transaction
 * @param {string} restaurantId - ID of the restaurant
 * @param {string} tableId - ID of the table
 * @param {Object} cartSnapshot - Cart data to add to the order
 * @param {Array} orderItems - Extracted items from the cart
 * @param {string} orderNumber - Unique order number
 * @param {string} userId - ID of the user creating the order
 * @param {string} sessionId - ID of the session (optional)
 * @returns {Object} The created order
 */
async function createNewOrder(transaction, restaurantId, tableId, cartSnapshot, orderItems, orderNumber, userId, sessionId = null) {
  // Calculate order price info from cart, with defaults if missing
  const orderPriceInfo = {
    basePrice: Number(cartSnapshot.priceInfo?.basePrice || 0),
    finalPrice: Number(cartSnapshot.priceInfo?.finalPrice || 0),
    totalDiscount: Number(cartSnapshot.priceInfo?.totalDiscount || 0),
    totalDiscountAmount: Number(cartSnapshot.priceInfo?.totalDiscountAmount || 0)
  };
  
  // Handle NaN values and ensure finalPrice is non-negative
  Object.keys(orderPriceInfo).forEach(key => {
    if (isNaN(orderPriceInfo[key])) orderPriceInfo[key] = 0;
  });
  
  // Ensure finalPrice is not negative
  orderPriceInfo.finalPrice = Math.max(0, orderPriceInfo.finalPrice);
  
  // Create new order document
  const newOrder = {
    restaurantId,
    tableId,
    orderNumber,
    orderStatus: ORDER_STATUS.ACTIVE,
    paymentStatus: PAYMENT_STATUS.UNPAID,
    carts: [cartSnapshot],  // Store the cart directly in the order
    items: orderItems,      // Add extracted items for direct access
    priceInfo: orderPriceInfo,
    createdAt: timestamp.now(),
    updatedAt: timestamp.now(),
    isActive: true,
    assignedServer: userId,
    notes: cartSnapshot.notes || '',
    sessionId  // Include sessionId in new order
  };
  
  // Add order to collection
  const newOrderRef = db.collection("restaurants").doc(restaurantId)
    .collection("orders").doc();
  
  transaction.set(newOrderRef, newOrder);
  
  console.log(`Created new order for table ${tableId} with ID ${newOrderRef.id}`);
  
  return {
    id: newOrderRef.id,
    ...newOrder
  };
}

/**
 * Updates an existing order with a new cart
 * @param {Object} transaction - Firestore transaction
 * @param {string} restaurantId - ID of the restaurant
 * @param {string} orderId - ID of the order to update
 * @param {Object} existingOrder - Existing order data
 * @param {Object} cartSnapshot - Cart data to add to the order
 * @param {Array} orderItems - Extracted items from the cart
 * @param {string} sessionId - ID of the session (optional)
 * @returns {Object} The updated order
 */
async function updateExistingOrder(transaction, restaurantId, orderId, existingOrder, cartSnapshot, orderItems, sessionId = null) {
  // Ensure arrays exist with fallbacks
  const existingCarts = Array.isArray(existingOrder.carts) ? existingOrder.carts : [];
  const existingItems = Array.isArray(existingOrder.items) ? existingOrder.items : [];
  
  // Add new cart to existing carts
  const updatedCarts = [...existingCarts, cartSnapshot];
  
  // Merge new items with existing items
  const updatedItems = [...existingItems, ...orderItems];
  
  // Calculate updated price info across all carts
  const updatedPriceInfo = calculateTotalPriceInfo(updatedCarts);
  
  // Handle notes concatenation
  let updatedNotes = existingOrder.notes || '';
  if (cartSnapshot.notes) {
    updatedNotes = updatedNotes ? `${updatedNotes}\n${cartSnapshot.notes}` : cartSnapshot.notes;
  }
  
  // Update order document
  const updates = {
    carts: updatedCarts,
    items: updatedItems,
    priceInfo: updatedPriceInfo,
    updatedAt: timestamp.now(),
    notes: updatedNotes
  };
  
  // Add sessionId to updates if provided
  if (sessionId) {
    updates.sessionId = sessionId;
  }
  
  // Apply updates to document
  const orderRef = db.collection("restaurants").doc(restaurantId)
    .collection("orders").doc(orderId);
  
  transaction.update(orderRef, updates);
  
  console.log(`Updated existing order ${orderId} with new cart`);
  
  return {
    id: orderId,
    ...existingOrder,
    ...updates
  };
}

/**
 * Generates a unique order number for the restaurant
 * @param {Object} transaction - Firestore transaction
 * @param {string} restaurantId - ID of the restaurant
 * @returns {string} A unique order number
 */
async function generateOrderNumber(transaction, restaurantId) {
  const counterRef = db.collection("restaurants").doc(restaurantId)
    .collection("counters").doc("orders");
  
  const counterDoc = await transaction.get(counterRef);
  
  let nextCount = 1;
  if (counterDoc.exists) {
    nextCount = counterDoc.data().currentCount + 1;
  }
  
  transaction.set(counterRef, { currentCount: nextCount });
  
  // Format with leading zeros, e.g. ORD-00001
  return `ORD-${nextCount.toString().padStart(5, '0')}`;
}

/**
 * Calculates total price information across all carts
 * @param {Array} carts - Array of cart objects
 * @returns {Object} Aggregated price information
 */
function calculateTotalPriceInfo(carts) {
  const totalPriceInfo = {
    basePrice: 0,
    finalPrice: 0,
    totalDiscount: 0,
    totalDiscountAmount: 0
  };
  
  if (!carts || !Array.isArray(carts) || carts.length === 0) {
    return totalPriceInfo;
  }
  
  carts.forEach(cart => {
    if (cart && cart.priceInfo) {
      // Add price values, converting to number and defaulting to 0 if invalid
      totalPriceInfo.basePrice += Number(cart.priceInfo.basePrice || 0) || 0;
      totalPriceInfo.finalPrice += Number(cart.priceInfo.finalPrice || 0) || 0;
      totalPriceInfo.totalDiscount += Number(cart.priceInfo.totalDiscount || 0) || 0;
      totalPriceInfo.totalDiscountAmount += Number(cart.priceInfo.totalDiscountAmount || 0) || 0;
    }
  });
  
  // Ensure finalPrice is not negative
  totalPriceInfo.finalPrice = Math.max(0, totalPriceInfo.finalPrice);
  
  return totalPriceInfo;
}

/**
 * Calculates estimated preparation time based on items in cart
 * @param {Array} items - The cart items
 * @returns {number} Estimated preparation time in minutes
 */
function calculateEstimatedPrepTime(items) {
  if (!items || items.length === 0) return 10; // Default prep time
  
  // Base time is 10 minutes
  let baseTime = 10;
  
  // Add 2 minutes per item, can adjust based on business logic
  const itemCount = items.reduce((sum, item) => sum + (item.quantity || 1), 0);
  
  return baseTime + (itemCount * 2);
}

module.exports = {
  createOrUpdateOrder: exports.createOrUpdateOrder
};
```

## Potential Issues and Mitigation

1. **Multiple catch blocks**: The function might have multiple error handling points. Ensure all are updated.

2. **Transaction errors**: Inside Firestore transactions, error handling should re-throw after logging to ensure transaction is properly aborted.

3. **Error codes mapping**: Ensure the right ErrorHandler method is used for each error case:
   - `not-found` → `errorHandler.notFound`
   - `invalid-argument` → `errorHandler.badRequest`
   - `failed-precondition` → `errorHandler.preconditionFailed`

4. **Client Dependencies**: Clients might be depending on the exact format of error messages. This change only modifies the structure, not the error codes or types, but test thoroughly.

## Implementation Approach

1. Start with one function (createOrUpdateOrder.js)
2. Update all error throwing points
3. Test with clients to ensure compatibility
4. Gradually roll out to other functions

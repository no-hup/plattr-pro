const functions = require('firebase-functions');
const { admin, db, Timestamp } = require('../admin/admin');
const getCartFunction = require('./getCart');
const { clearCartInternal } = require('./clearCart');
const createOrUpdateOrder = require('../orders/createOrUpdateOrder').createOrUpdateOrder;
const { validateCheckoutFields, validateCheckoutSession } = require('./cartInputValidation');
const errorHandler = require('../singleton/ErrorHandler');
const { validateCart } = require('./validateCart');
const { calculateCartValue } = require('./calculateCartValue');
const timestamp = require('../utils/timestamp');

/**
 * Checkout Cart Cloud Function
 * 
 * Processes a cart checkout, creates/updates an order, and clears the cart.
 * A valid sessionId is mandatory for checkout.
 * 
 * @param {Object} data.data - Input parameters
 * @param {string} data.data.restaurantId - ID of the restaurant
 * @param {string} data.data.tableId - ID of the table
 * @param {string} [data.data.cartId] - Optional ID of the specific cart to checkout
 * @param {string} [data.data.notes] - Optional notes for the order
 * @param {string} data.data.sessionId - Session ID (mandatory)
 * @returns {Object} Order details including orderId and status
 */
const checkoutCart = functions.https.onCall(async (data, context) => {
  try {
    console.log("poopoo Received checkoutCart request for table:", data.data.tableId, "restaurant:", data.data.restaurantId);
    validateCheckoutFields(data.data);
    
    const { tableId, restaurantId, cartId, notes = '', sessionId } = data.data;
    
    // Validate session (now mandatory)
    await validateCheckoutSession(restaurantId, tableId, sessionId);

    // TODO: Set userId based on context (server/waiter or guest). If authenticated, use actual user ID.
    // TODO: Review assignedServer logic: should this be the waiter/server assigned to the table? If so, fetch or pass it explicitly.
    const userId = 'system';  // Default to system instead of checking auth

    // Fix: Get the cart directly from Firestore instead of using getCart function
    const cartRef = db
      .collection("restaurants")
      .doc(restaurantId)
      .collection("carts")
      .doc(tableId);

    const cartDoc = await cartRef.get();
    
    if (!cartDoc.exists) {
      // Throw standard error if cart doesn't exist even with valid session
      errorHandler.failedPrecondition('No active cart found for this table.');
    }
    
    const cart = cartDoc.data();
    
    if (!cart || !cart.items || cart.items.length === 0) {
      // Throw standard error for empty cart
      errorHandler.failedPrecondition('Cannot checkout an empty cart.');
    }
    
    console.log(`poopoo Processing checkout for table ${tableId} with ${cart.items.length} items`);
    
    // Validate cart price calculations before proceeding
    if (!validateCart(cart)) {
      console.error('Cart validation failed. Price calculations are inconsistent.');
      // Recalculate cart values to fix inconsistencies
      try {
        const recalculatedPriceInfo = await calculateCartValue(cart);
        cart.priceInfo = recalculatedPriceInfo;
        console.log('poopoo Cart prices recalculated for checkout');
      } catch (recalcError) {
        console.error('Failed to recalculate cart prices:', recalcError);
        errorHandler.failedPrecondition('Invalid cart price structure. Please update cart before checkout.');
      }
    }
    
    // Verify stock availability for all items in the cart
    try {
      const outOfStockItems = await validateMenuItemsStock(restaurantId, cart.items);
      if (outOfStockItems.length > 0) {
        const itemNames = outOfStockItems.map(item => item.name || item.menuItemId).join(', ');
        errorHandler.failedPrecondition(`Cannot checkout. The following items are out of stock: ${itemNames}`);
      }
    } catch (stockError) {
      console.error('Error validating item stock:', stockError);
      errorHandler.internalError('Failed to validate item stock: ' + stockError.message);
    }
    
    // Create/Update Order and Clear Cart
    try {
      // First, create or update the order (this has its own transaction)
      const order = await createOrUpdateOrder(
        restaurantId,
        tableId,
        cart,
        userId,
        notes,
        sessionId
      );
      
      // After successful order creation, clear the cart
      // Use clearCartInternal which is already implemented
      try {
        await clearCartInternal(restaurantId, tableId);
      } catch (clearError) {
        // If clearing fails but order was created, log error but consider checkout successful
        console.error(`Warning: Order created but cart clearing failed: ${clearError.message}`);
        // We don't throw here to avoid leaving the system in an inconsistent state
      }
      
      console.log(`poopoo Checkout completed successfully for table ${tableId}, order ID: ${order.id}`);
      
      // Return order details
      return {
        message: "Checkout completed successfully.",
        status: "success",
        data: {
          orderId: order.id,
          orderNumber: order.orderNumber,
          orderStatus: order.orderStatus,
          timestamp: timestamp.toISOString(order.updatedAt)
        }
      };
    } catch (orderError) {
      console.error(`Error during checkout process: ${orderError.message}`);
      // Throw internal error for order processing failures
      errorHandler.internalError('Error processing checkout: ' + orderError.message);
    }
  } catch (error) {
    // Log error message but not the full error object
    console.error(`Error in checkoutCart for table ${data.data?.tableId}: ${error.message}`);
    
    // Specific message for createOrUpdateOrder errors
    if (error.message && error.message.includes('Cannot process an empty cart')) {
      throw new functions.https.HttpsError(
        'failed-precondition',
        'Cannot checkout an empty cart'
      );
    }
    
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    
    throw new functions.https.HttpsError(
      "internal",
      "An unexpected error occurred during checkout."
    );
  }
});

/**
 * Validates that all items in the cart are in stock
 * @param {string} restaurantId - Restaurant ID
 * @param {Array} cartItems - Array of cart items to validate
 * @returns {Promise<Array>} Array of out-of-stock items (empty if all items are in stock)
 */
async function validateMenuItemsStock(restaurantId, cartItems) {
  if (!cartItems || !Array.isArray(cartItems) || cartItems.length === 0) {
    return [];
  }
  
  // Get unique menu item IDs from cart
  const menuItemIds = [...new Set(cartItems.map(item => item.menuItemId))];
  
  // Batch get all menu items from Firestore
  const menuItemsRef = db.collection('restaurants').doc(restaurantId).collection('menuItems');
  const menuItemDocs = await Promise.all(
    menuItemIds.map(id => menuItemsRef.doc(id).get())
  );
  
  // Find items that are out of stock
  const outOfStockItems = [];
  menuItemDocs.forEach(doc => {
    if (doc.exists) {
      const menuItem = doc.data();
      if (menuItem && menuItem.isInStock === false) {
        // Find matching cart items
        const matchingCartItems = cartItems.filter(item => item.menuItemId === doc.id);
        matchingCartItems.forEach(item => {
          outOfStockItems.push({
            menuItemId: doc.id,
            name: menuItem.meta?.name || 'Unknown Item'
          });
        });
      }
    }
  });
  
  return outOfStockItems;
}

module.exports = checkoutCart;
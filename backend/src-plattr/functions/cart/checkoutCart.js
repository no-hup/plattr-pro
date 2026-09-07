const functions = require('firebase-functions');
const { admin, db, Timestamp } = require('../admin/admin');
const getCartFunction = require('./getCart');
const createOrUpdateOrder = require('../orders/createOrUpdateOrder').createOrUpdateOrder;
const { validateCheckoutFields, validateCheckoutSession } = require('./cartInputValidation');
const errorHandler = require('../singleton/ErrorHandler');
const { validateCart } = require('./validateCart');
const { calculateCartValue } = require('./calculateCartValue');
const timestamp = require('../utils/timestamp');
const { ORDER_STATUS } = require('../orders/orderConstants');
const { mapOrderStatus } = require('../utils/statusUtils');
const ResponseBuilder = require('../utils/ResponseBuilder');
const featureFlags = require('../singleton/FeatureFlags');

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
  // Load feature flag overrides from Firestore (for test environments)
  await featureFlags.loadOverrides(db);
  const requestPayload = data?.data || data || {};
  try {
    // console.log("Received checkoutCart request:", JSON.stringify(requestPayload));
    validateCheckoutFields(requestPayload);

    const { tableId, restaurantId, cartId, notes = '', sessionId } = requestPayload;

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
      errorHandler.preconditionFailed('No active cart found for this table.');
    }

    const cart = cartDoc.data();

    if (!cart || !cart.items || cart.items.length === 0) {
      // Throw standard error for empty cart
      errorHandler.preconditionFailed('Cannot checkout an empty cart.');
    }

    // console.log(`Processing checkout for table ${tableId} with ${cart.items.length} items`);

    // Validate cart price calculations before proceeding
    if (!validateCart(cart)) {
      console.error('Cart validation failed. Price calculations are inconsistent.');
      // Recalculate cart values to fix inconsistencies
      try {
        const recalculatedPriceInfo = await calculateCartValue(cart);
        cart.priceInfo = recalculatedPriceInfo;
        // console.log('Cart prices recalculated for checkout');
      } catch (recalcError) {
        console.error('Failed to recalculate cart prices:', recalcError);
        errorHandler.preconditionFailed('Invalid cart price structure. Please update cart before checkout.');
      }
    }

    // Verify stock availability for all items in the cart
    try {
      const outOfStockItems = await validateMenuItemsStock(restaurantId, cart.items);
      if (outOfStockItems.length > 0) {
        const itemNames = outOfStockItems.map(item => item.name || item.menuItemId).join(', ');
        errorHandler.preconditionFailed(`Cannot checkout. The following items are out of stock: ${itemNames}`);
      }
    } catch (stockError) {
      console.error('Error validating item stock:', stockError);
      errorHandler.internalError('Failed to validate item stock: ' + stockError.message);
    }

    // Create/Update Order and clear the cart — one transaction (see createOrUpdateOrder)
    try {
      const order = await createOrUpdateOrder(
        restaurantId,
        tableId,
        cart,
        userId,
        notes,
        sessionId
      );

      // console.log(`Checkout completed successfully for table ${tableId}, order ID: ${order.id}`);

      // Return order details
      const normalizedStatus = mapOrderStatus(order.orderStatus || order.status || ORDER_STATUS.IN_PROGRESS);
      return ResponseBuilder.success(
        {
          orderId: order.id,
          orderNumber: order.orderNumber || order.order_number || order.id,
          orderStatus: normalizedStatus,
          timestamp: timestamp.toISOString(order.updatedAt)
        },
        "Checkout completed successfully."
      );
    } catch (orderError) {
      console.error(`Error during checkout process: ${orderError.message}`);
      if (orderError instanceof functions.https.HttpsError) throw orderError;
      errorHandler.internalError('Error processing checkout: ' + orderError.message);
    }
  } catch (error) {
    // Log error message but not the full error object
    console.error(`Error in checkoutCart for table ${requestPayload?.tableId}: ${error.message}`);

    // Specific message for createOrUpdateOrder errors
    if (error.message && error.message.includes('Cannot process an empty cart')) {
      errorHandler.preconditionFailed('Cannot checkout an empty cart', {
        restaurantId: requestPayload?.restaurantId,
        tableId: requestPayload?.tableId
      });
    }

    errorHandler.handleError(error, "checkoutCart", {
      restaurantId: requestPayload?.restaurantId,
      tableId: requestPayload?.tableId,
      sessionId: requestPayload?.sessionId
    });
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

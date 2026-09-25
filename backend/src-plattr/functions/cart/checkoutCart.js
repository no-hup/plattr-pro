const functions = require('firebase-functions');
const { admin, db, Timestamp } = require('../admin/admin');
const getCartFunction = require('./getCart');
const { createOrUpdateOrder, pickRound } = require('../orders/createOrUpdateOrder');
const { validateCheckoutFields, validateCheckoutSession, cartOfSession } = require('./cartInputValidation');
const errorHandler = require('../singleton/ErrorHandler');
const { validateCart } = require('./validateCart');
const { calculateCartValue } = require('./calculateCartValue');
const timestamp = require('../utils/timestamp');
const { ORDER_STATUS } = require('../orders/orderConstants');
const { mapOrderStatus } = require('../utils/statusUtils');
const ResponseBuilder = require('../utils/ResponseBuilder');
const featureFlags = require('../singleton/FeatureFlags');
const { resolveTableId } = require('../table/mergedTables');

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

    let { tableId, restaurantId, cartId, notes = '', sessionId, addedBy = null, cartItemIds = null } = requestPayload;
    // D5: the guest phone's "Send your 1 dish" / "Send all 3" sends the ids it showed. A list is whole numbers, not
    // empty, no repeats, and always from a named phone: without addedBy the round would be placed by "system".
    if (cartItemIds !== null) {
      const valid = Array.isArray(cartItemIds) && cartItemIds.length > 0 && cartItemIds.every(id => Number.isInteger(id) && id > 0)
        && new Set(cartItemIds).size === cartItemIds.length;
      if (!valid) errorHandler.badRequest('cartItemIds must be a non-empty list of distinct cart item ids.');
      if (!addedBy) errorHandler.badRequest('cartItemIds needs addedBy: the phone that is sending.');
    }
    // The order is created against the parent, so a merged party is one cart, one
    // kitchen ticket and one bill.
    tableId = await resolveTableId(restaurantId, tableId);

    // Validate session (now mandatory)
    await validateCheckoutSession(restaurantId, tableId, sessionId);

    // OR-S1: the line snapshot names who placed it. addedBy is the staff tag ('staff:<id>') from
    // table-openTable or the guest's own id; a caller without one is still 'system'.
    const userId = addedBy || 'system';

    // Fix: Get the cart directly from Firestore instead of using getCart function
    const cartRef = db
      .collection("restaurants")
      .doc(restaurantId)
      .collection("carts")
      .doc(tableId);

    const cartDoc = await cartRef.get();
    const cart = cartOfSession(cartDoc.exists ? cartDoc.data() : null, sessionId);   // TD-033
    const hasItems = !!(cart && Array.isArray(cart.items) && cart.items.length > 0);
    // OF R1: with a requestId the cart may already be gone because the first tap landed; the
    // order transaction decides (retry → the existing order, else the same refusal as below).
    const retryable = typeof requestPayload.requestId === 'string' && requestPayload.requestId !== '';

    if (!cartDoc.exists && !retryable) {
      // Throw standard error if cart doesn't exist even with valid session
      errorHandler.preconditionFailed('No active cart found for this table.');
    }

    if (!hasItems && !retryable) {
      // Throw standard error for empty cart
      errorHandler.preconditionFailed('Cannot checkout an empty cart.');
    }

    // console.log(`Processing checkout for table ${tableId} with ${cart.items.length} items`);

    // Validate cart price calculations before proceeding
    if (hasItems && !validateCart(cart)) {
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
    // Only the lines this diner is actually sending. The table shares one cart doc, so an
    // unscoped check let Bhanu's sold-out Caesar Salad refuse Asha's Pasta — her round was
    // blocked by food she never ordered. A caller without addedBy still checks the whole cart.
    // DECISION(D5, 2026-09-25): the same split the order takes (pickRound), so the captain's sold-out Old Monk never
    // blocks the guests' "Send all 3", and a friend's sold-out dish never blocks "Send your 1 dish".
    // See moonshot/reviews/2026-09-25-decisions-for-shaurya.md. If you change this, ask Shaurya first.
    const sending = pickRound(cart?.items, addedBy, cartItemIds).sending;
    let outOfStockItems;
    try {
      outOfStockItems = await validateMenuItemsStock(restaurantId, sending);
    } catch (stockError) {
      console.error('Error validating item stock:', stockError);
      errorHandler.internalError('Failed to validate item stock: ' + stockError.message);
    }
    // Outside the try: the refusal used to be caught above and re-thrown as `internal`, so the guest
    // read "something went wrong" instead of which dish ran out.
    if (outOfStockItems.length > 0) {
      const itemNames = outOfStockItems.map(item => item.name || item.menuItemId).join(', ');
      errorHandler.preconditionFailed(`Cannot checkout. The following items are out of stock: ${itemNames}`);
    }

    // Create/Update Order and clear the cart — one transaction (see createOrUpdateOrder)
    try {
      const order = await createOrUpdateOrder(
        restaurantId,
        tableId,
        cart,
        userId,
        notes,
        sessionId,
        requestPayload.requestId,  // OF R1: optional; a repeat of the same tap answers the same order
        addedBy,                   // optional; sends only this diner's lines off the shared table cart
        cartItemIds                // D5, optional; exactly the dishes the guest's phone showed
      );

      // console.log(`Checkout completed successfully for table ${tableId}, order ID: ${order.id}`);

      // Return order details
      const normalizedStatus = mapOrderStatus(order.orderStatus || order.status || ORDER_STATUS.IN_PROGRESS);
      return ResponseBuilder.success(
        {
          orderId: order.id,
          retry: order.retry === true,   // OF-S1: true when this answer is a repeat of a tap that already landed
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

  // DECISION(D6, 2026-09-25): same as the add, re-checked at send: Raita switched off at 20:00 stops a round added at
  // 19:55. The price stays as it was when added (Q6-2): only stock is re-read here, never price.
  // See moonshot/reviews/2026-09-25-decisions-for-shaurya.md. If you change this, ask Shaurya first.
  // TD-015: the add-ons riding on those lines, re-read now. One switched off since it was added
  // must stop the round exactly as a sold-out dish does. `=== true`, as the add path and the menu read.
  const addonIds = [...new Set(cartItems.flatMap(item => (item.selectedAddonsDetails || []).map(a => a.id)))];
  const addonsRef = db.collection('restaurants').doc(restaurantId).collection('addons');
  const addonDocs = await Promise.all(addonIds.map(id => addonsRef.doc(id).get()));
  const soldOut = new Map(addonDocs.filter(d => !d.exists || d.data().isInStock !== true)
    .map(d => [d.id, (d.exists && d.data().meta?.name) || d.id]));
  cartItems.forEach(item => (item.selectedAddonsDetails || []).forEach(a => {
    if (soldOut.has(a.id)) outOfStockItems.push({ menuItemId: item.menuItemId, addonId: a.id, name: soldOut.get(a.id) });
  }));

  return outOfStockItems;
}

module.exports = checkoutCart;
module.exports.validateMenuItemsStock = validateMenuItemsStock;

const functions = require("firebase-functions");
const { admin, db } = require("../admin/admin");
const { ORDER_STATUS, PAYMENT_STATUS, FULFILLMENT_STATUS } = require('./orderConstants');
const OrderInputValidation = require('./orderInputValidation');
const { validateCheckoutSession } = require('../cart/cartInputValidation');
const timestamp = require('../utils/timestamp');
const errorHandler = require('../singleton/ErrorHandler');
const { OrderPriceInfo, CartTotalPriceInfo } = require('../genericModels/priceinfo');
const { BasicPriceInfo } = require('../genericModels/priceinfo');
const { v4: uuidv4 } = require('uuid');
const { mapOrderStatus, mapCartStatus } = require('../utils/statusUtils');
const { evaluateAndPickBestOffer, buildAppliedOfferObject } = require('../offers/evaluateOrderOffers');
const { calculateCharges } = require('./calculateCharges');


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
    errorHandler.handleError(error, 'createOrUpdateOrder');
  }

  // Offers V2: offers are order-level and applied automatically AFTER the cart
  // snapshot is added to the order (see createNewOrder / updateExistingOrder).
  // No cart-level offer revalidation is needed here — carts no longer carry
  // offer fields in Offers V2.

  // Charges V1: load restaurant `billing.charges` config out-of-band (rarely
  // changes — same pattern as Offers V2 reading offer configs outside the
  // transaction). Missing doc / missing field → empty config → zero behavior
  // change for restaurants that haven't opted in.
  let chargesConfig = [];
  try {
    const settingsDoc = await db
      .collection('restaurants').doc(restaurantId)
      .collection('config').doc('settings')
      .get();
    if (settingsDoc.exists) {
      const billing = settingsDoc.data()?.billing;
      if (billing && Array.isArray(billing.charges)) {
        chargesConfig = billing.charges;
      }
    }
  } catch (err) {
    console.warn(`createOrUpdateOrder: failed to load billing.charges for ${restaurantId}: ${err.message}`);
    chargesConfig = [];
  }

  // Prepare cart snapshot to add to order
  const cartSnapshot = {
    ...cart,
    cartId: `${restaurantId}_${tableId}_${uuidv4().substring(0, 8)}`, // Add a unique cartId with restaurant and table prefix
    status: FULFILLMENT_STATUS.PENDING,
    statusHistory: [{
      status: FULFILLMENT_STATUS.PENDING,
      timestamp: timestamp.serverTimestamp(),
      userId
    }],
    checkoutTime: timestamp.serverTimestamp(),
    notes,
    estimatedPrepTime: calculateEstimatedPrepTime(cart.items),
    assignedTo: null
  };

  // sanitise the format of the cart items for the order
  const orderItems = normalizeCartItemsForOrder(cart);

  try {
    // Begin a transaction to ensure data consistency
    return await db.runTransaction(async (transaction) => {
      // Check if there's an in-progress order for this table
      const orderQuery = db.collection("restaurants").doc(restaurantId)
        .collection("orders")
        .where('tableId', '==', tableId);

      const orderSnapshot = await transaction.get(orderQuery);

      const existingOrderDoc = orderSnapshot.docs.find(doc => {
        const normalizedStatus = mapOrderStatus(doc.data().orderStatus || doc.data().status);
        return normalizedStatus === ORDER_STATUS.IN_PROGRESS || normalizedStatus === ORDER_STATUS.PENDING;
      });

      let orderResult;

      if (!existingOrderDoc) {
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
          sessionId,
          chargesConfig
        );
      } else {
        // Update existing order
        const orderDoc = existingOrderDoc;
        console.log(`Updating existing order ${orderDoc.id} for table ${tableId}`);
        orderResult = await updateExistingOrder(
          transaction,
          restaurantId,
          orderDoc.id,
          orderDoc.data(),
          cartSnapshot,
          orderItems,
          sessionId,
          chargesConfig
        );
      }

      return orderResult;
    });
  } catch (error) {
    console.error(`createOrUpdateOrder: Error processing order for table ${tableId}: ${error.message}`);
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
    if (item.status === FULFILLMENT_STATUS.CANCELLED) return null;

    // Skip items without menuItemId
    if (!item.menuItemId) return null;

    // Create a simplified version of the cart item for the order using BasicPriceInfo
    // to ensure proper price validation and standardization
    const priceInfo = new BasicPriceInfo(
      item.priceInfo?.itemBasePrice,
      item.priceInfo?.discount,
      item.priceInfo?.itemFinalPrice
    ).toObject();

    return {
      menuItemId: item.menuItemId,
      name: item.menuItem?.meta?.name || 'Unknown Item',
      description: item.menuItem?.meta?.description || '',
      quantity: typeof item.quantity === 'number' && item.quantity > 0 ? item.quantity : 1,
      priceInfo: priceInfo,
      selectedVariants: item.selectedVariants || {},
      selectedVariantsDetails: Array.isArray(item.selectedVariantsDetails) ? item.selectedVariantsDetails : [],
      selectedAddons: Array.isArray(item.selectedAddons) ? item.selectedAddons : [],
      selectedAddonsDetails: Array.isArray(item.selectedAddonsDetails) ? item.selectedAddonsDetails : [],
      cartItemId: item.cartItemId || 0,
      checkoutTime: timestamp.serverTimestamp(),
      status: FULFILLMENT_STATUS.PENDING,
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
async function createNewOrder(transaction, restaurantId, tableId, cartSnapshot, orderItems, orderNumber, userId, sessionId = null, chargesConfig = []) {
  // Fetch table doc to get assignedServerId
  const tableRef = db.collection('restaurants').doc(restaurantId).collection('tables').doc(tableId);
  const tableDoc = await transaction.get(tableRef);
  const assignedServer = tableDoc.exists ? (tableDoc.data().assignedServerId || null) : null;

  // Base priceInfo from the cart snapshot (no offer discount yet)
  const baseBasePrice = cartSnapshot.priceInfo?.basePrice || 0;
  const baseFinalPrice = cartSnapshot.priceInfo?.finalPrice || 0;
  const baseTotalDiscount = cartSnapshot.priceInfo?.totalDiscount || 0;
  const baseTotalDiscountAmount = cartSnapshot.priceInfo?.totalDiscountAmount || 0;

  // Offers V2: evaluate order-level offers against the full (raw) cart items.
  // We must use raw items with categoryId / subcategoryIds intact — NOT
  // normalized `orderItems`, which strips those fields.
  const allCartItems = Array.isArray(cartSnapshot.items) ? cartSnapshot.items : [];
  const bestOffer = await evaluateAndPickBestOffer(
    restaurantId,
    allCartItems,
    baseBasePrice,
    sessionId
  );

  const offerDiscount = bestOffer ? Math.min(bestOffer.discountAmount, baseFinalPrice) : 0;
  const appliedOffer = bestOffer ? buildAppliedOfferObject(bestOffer) : null;

  // Post-offer final price — used both as the stored finalPrice AND as the
  // base for Charges V1 percentage computation.
  const postOfferFinalPrice = Math.max(0, baseFinalPrice - offerDiscount);

  // Charges V1: percentage-based overlays on top of finalPrice (service charge,
  // global discount, etc.). Empty config → no fields surfaced in priceInfo.
  const { charges, chargesTotal } = calculateCharges(postOfferFinalPrice, chargesConfig);

  const orderPriceInfo = new OrderPriceInfo({
    basePrice: baseBasePrice,
    finalPrice: postOfferFinalPrice,
    totalDiscount: baseTotalDiscount,
    totalDiscountAmount: baseTotalDiscountAmount + offerDiscount,
    offerDiscount,
    charges,
    chargesTotal
  }).toObject();

  if (appliedOffer) {
    console.log(`Offers V2: auto-applied "${appliedOffer.title}" (${appliedOffer.id}) to new order — saved ₹${offerDiscount}`);
  }

  // Create new order document
  const newOrder = {
    restaurantId,
    tableId: tableId,
    orderNumber,
    orderStatus: ORDER_STATUS.IN_PROGRESS,
    paymentStatus: PAYMENT_STATUS.UNPAID,
    carts: [cartSnapshot],  // Store the cart directly in the order
    items: orderItems,      // Add extracted items for direct access
    priceInfo: orderPriceInfo,
    createdAt: timestamp.serverTimestamp(),
    updatedAt: timestamp.serverTimestamp(),
    isActive: true,
    assignedServer, // Use server assigned to table, not checkout user
    notes: cartSnapshot.notes || '',
    sessionId,  // Include sessionId in new order
    appliedOffer // null or { id, title, type, scope, discountAmount, appliedItems }
  };

  // Add order to collection
  const newOrderRef = db.collection("restaurants").doc(restaurantId)
    .collection("orders").doc();

  transaction.set(newOrderRef, newOrder);

  console.log(`poopoo Created new order for table ${tableId} with ID ${newOrderRef.id}`);

  // Return the order with actual Timestamp objects (not serverTimestamp placeholders)
  return {
    id: newOrderRef.id,
    ...newOrder,
    // Replace serverTimestamp placeholders with actual Timestamp objects for the returned value
    createdAt: timestamp.now(),
    updatedAt: timestamp.now()
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
async function updateExistingOrder(transaction, restaurantId, orderId, existingOrder, cartSnapshot, orderItems, sessionId = null, chargesConfig = []) {
  // Ensure arrays exist with fallbacks
  const existingCarts = Array.isArray(existingOrder.carts) ? existingOrder.carts : [];
  const existingItems = Array.isArray(existingOrder.items) ? existingOrder.items : [];

  // Add new cart to existing carts
  const updatedCarts = [...existingCarts, cartSnapshot];

  // Merge new items with existing items (normalized, for order.items)
  const updatedItems = [...existingItems, ...orderItems];

  // Calculate updated base price info across all carts (no offer yet)
  const basePriceInfo = calculateTotalPriceInfo(updatedCarts);

  // Offers V2: re-evaluate offers against ALL raw items from ALL carts.
  // Use cart.items (raw) not updatedItems (normalized — strips categoryId).
  const allCartItems = updatedCarts.flatMap(c => Array.isArray(c.items) ? c.items : []);
  const bestOffer = await evaluateAndPickBestOffer(
    restaurantId,
    allCartItems,
    basePriceInfo.basePrice || 0,
    sessionId || existingOrder.sessionId
  );

  const baseFinalPrice = basePriceInfo.finalPrice || 0;
  const offerDiscount = bestOffer ? Math.min(bestOffer.discountAmount, baseFinalPrice) : 0;
  const appliedOffer = bestOffer ? buildAppliedOfferObject(bestOffer) : null;

  // Post-offer final price — used both as the stored finalPrice AND as the
  // base for Charges V1 percentage computation.
  const postOfferFinalPrice = Math.max(0, baseFinalPrice - offerDiscount);

  // Charges V1: recompute on the new order total (previous cart's charges are
  // replaced — charges always reflect current order finalPrice). Empty config
  // → charges fields omitted from updated priceInfo.
  const { charges, chargesTotal } = calculateCharges(postOfferFinalPrice, chargesConfig);

  const updatedPriceInfo = {
    ...basePriceInfo,
    finalPrice: postOfferFinalPrice,
    totalDiscountAmount: (basePriceInfo.totalDiscountAmount || 0) + offerDiscount,
    offerDiscount,
    ...(charges.length > 0 ? { charges, chargesTotal } : {})
  };

  if (appliedOffer) {
    console.log(`Offers V2: auto-applied "${appliedOffer.title}" (${appliedOffer.id}) to existing order ${orderId} — saved ₹${offerDiscount}`);
  }

  // Handle notes concatenation
  let updatedNotes = existingOrder.notes || '';
  if (cartSnapshot.notes) {
    updatedNotes = updatedNotes ? `${updatedNotes}\n${cartSnapshot.notes}` : cartSnapshot.notes;
  }

  const existingCreatedAt = existingOrder.createdAt || existingOrder.timestamps?.createdAt || null;

  // Update order document
  const updates = {
    carts: updatedCarts,
    items: updatedItems,
    priceInfo: updatedPriceInfo,
    appliedOffer, // null clears any previous offer if no longer applicable
    updatedAt: timestamp.serverTimestamp(),
    notes: updatedNotes,
    orderStatus: ORDER_STATUS.IN_PROGRESS,
    isActive: true,
    ...(existingCreatedAt ? { createdAt: existingCreatedAt } : { createdAt: timestamp.serverTimestamp() })
  };

  // If order has no assignedServer, fill from table at cart append time
  if (!existingOrder.assignedServer) {
    const tableRef = db.collection('restaurants').doc(restaurantId).collection('tables').doc(existingOrder.tableId);
    const tableDoc = await transaction.get(tableRef);
    if (tableDoc.exists && tableDoc.data().assignedServerId) {
      updates.assignedServer = tableDoc.data().assignedServerId;
    }
  }

  let effectiveOrderNumber = existingOrder.orderNumber || existingOrder.order_number || null;
  if (!effectiveOrderNumber) {
    effectiveOrderNumber = await generateOrderNumber(transaction, restaurantId);
    updates.orderNumber = effectiveOrderNumber;
  }

  // Add sessionId to updates if provided
  if (sessionId) {
    updates.sessionId = sessionId;
  }

  // Apply updates to document
  const orderRef = db.collection("restaurants").doc(restaurantId)
    .collection("orders").doc(orderId);

  transaction.update(orderRef, updates);

  console.log(`Updated existing order ${orderId} with new cart`);

  // Return the order with actual Timestamp objects (not serverTimestamp placeholders)
  return {
    id: orderId,
    ...existingOrder,
    ...updates,
    orderNumber: effectiveOrderNumber || existingOrder.orderNumber || existingOrder.order_number || orderId,
    orderStatus: ORDER_STATUS.IN_PROGRESS,
    isActive: true,
    createdAt: existingCreatedAt || timestamp.now(),
    // Replace serverTimestamp placeholder with actual Timestamp for the returned value
    updatedAt: timestamp.now()
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
  if (!carts || !Array.isArray(carts) || carts.length === 0) {
    return new OrderPriceInfo().toObject();
  }

  // Convert all cart price infos into CartTotalPriceInfo objects
  const cartPriceInfos = carts.map(cart =>
    cart && cart.priceInfo ? new CartTotalPriceInfo(cart.priceInfo) : new CartTotalPriceInfo()
  );

  // Accumulate values. Note: carts no longer carry offer fields in Offers V2.
  // Any offerDiscount is applied by the caller after this function returns.
  const totalPriceInfo = new OrderPriceInfo({
    basePrice: cartPriceInfos.reduce((sum, info) => sum + info.basePrice, 0),
    finalPrice: cartPriceInfos.reduce((sum, info) => sum + info.finalPrice, 0),
    totalDiscount: cartPriceInfos.reduce((sum, info) => sum + info.totalDiscount, 0) / carts.length, // Average discount
    totalDiscountAmount: cartPriceInfos.reduce((sum, info) => sum + info.totalDiscountAmount, 0),
    offerDiscount: 0
  });

  return totalPriceInfo.toObject();
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

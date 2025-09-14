const functions = require("firebase-functions");
const { admin, db } = require("../admin/admin");
const { ORDER_STATUS, PAYMENT_STATUS, CART_STATUS } = require('./orderConstants');
const OrderInputValidation = require('./orderInputValidation');
const { validateCheckoutSession } = require('../cart/cartInputValidation');
const timestamp = require('../utils/timestamp');
const errorHandler = require('../singleton/ErrorHandler');
const { OrderPriceInfo, CartTotalPriceInfo } = require('../genericModels/priceinfo');
const { BasicPriceInfo } = require('../genericModels/priceinfo');
const { v4: uuidv4 } = require('uuid');

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
  
  // Prepare cart snapshot to add to order
  const cartSnapshot = {
    ...cart,
    cartId: `${restaurantId}_${tableId}_${uuidv4().substring(0, 8)}`, // Add a unique cartId with restaurant and table prefix
    status: CART_STATUS.PENDING,
    statusHistory: [{
      status: CART_STATUS.PENDING,
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
        console.log(`poopoo Creating new order for table ${tableId} with order number ${orderNumber}`);
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
        console.log(`poopoo Updating existing order ${orderDoc.id} for table ${tableId}`);
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
      status: CART_STATUS.PENDING,
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
  // Calculate order price info from cart using our OrderPriceInfo model
  const orderPriceInfo = new OrderPriceInfo({
    basePrice: cartSnapshot.priceInfo?.basePrice,
    finalPrice: cartSnapshot.priceInfo?.finalPrice,
    totalDiscount: cartSnapshot.priceInfo?.totalDiscount,
    totalDiscountAmount: cartSnapshot.priceInfo?.totalDiscountAmount
  }).toObject();
  
  // Create new order document
  const newOrder = {
    restaurantId,
    tableId: tableId,
    orderNumber,
    orderStatus: ORDER_STATUS.ACTIVE,
    paymentStatus: PAYMENT_STATUS.UNPAID,
    carts: [cartSnapshot],  // Store the cart directly in the order
    items: orderItems,      // Add extracted items for direct access
    priceInfo: orderPriceInfo,
    createdAt: timestamp.serverTimestamp(),
    updatedAt: timestamp.serverTimestamp(),
    isActive: true,
    assignedServer: userId,
    notes: cartSnapshot.notes || '',
    sessionId  // Include sessionId in new order
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
    updatedAt: timestamp.serverTimestamp(),
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
  
  console.log(`poopoo Updated existing order ${orderId} with new cart`);
  
  // Return the order with actual Timestamp objects (not serverTimestamp placeholders)
  return {
    id: orderId,
    ...existingOrder,
    ...updates,
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
  
  // Accumulate values
  const totalPriceInfo = new OrderPriceInfo({
    basePrice: cartPriceInfos.reduce((sum, info) => sum + info.basePrice, 0),
    finalPrice: cartPriceInfos.reduce((sum, info) => sum + info.finalPrice, 0),
    totalDiscount: cartPriceInfos.reduce((sum, info) => sum + info.totalDiscount, 0) / carts.length, // Average discount
    totalDiscountAmount: cartPriceInfos.reduce((sum, info) => sum + info.totalDiscountAmount, 0)
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
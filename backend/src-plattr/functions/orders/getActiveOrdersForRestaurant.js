const functions = require("firebase-functions");
const admin = require('../admin/initializeAdmin');
const db = admin.firestore();
const { ORDER_STATUS, CART_STATUS } = require('./orderConstants');
const { mapOrderStatus, mapCartStatus } = require('../utils/statusUtils');
const OrderInputValidation = require('./orderInputValidation');
const timestamp = require('../utils/timestamp');


/**
 * Sorting Logic:
 * - If serverId is provided:
 *     1. Orders assigned to that serverId appear first.
 *     2. All orders are sorted by updatedAt (most recent first) within their group.
 * - If serverId is not provided:
 *     1. All orders are sorted by updatedAt (most recent first).
 * - Carts within orders are not sorted; only non-served carts are included.
 * carts with statys pending are excluded from the response
 * each cart will have a list of items(all items are sent by BE, even the served ones)
 * - Items within each cart are sorted: 'ready' status items appear first
 */
async function getActiveOrdersForRestaurant(data, context) {
  let stage = 'init';
  const setStage = s => (stage = s);
  try {
    setStage('parse-request');
    const requestData = data.data || data;
    console.log("poopoo Received getActiveOrdersForRestaurant request:", JSON.stringify(requestData));

    setStage('input-validation');
    const { restaurantId, sessionId } = requestData;
    OrderInputValidation.validateRestaurantId(restaurantId);
    if (!sessionId || typeof sessionId !== 'string') {
      throw new functions.https.HttpsError('invalid-argument', 'sessionId is required and must be a string');
    }

    setStage('session-validation');
    const sessionRef = db.collection('restaurants').doc(restaurantId).collection('sessions').doc(sessionId);
    const sessionDoc = await sessionRef.get();
    if (!sessionDoc.exists || sessionDoc.data().status !== 'active') {
      throw new functions.https.HttpsError('failed-precondition', 'Invalid or inactive session');
    }

    setStage('fetch-orders');
    const ordersRef = db.collection('restaurants').doc(restaurantId).collection('orders');
    const allOrdersQuery = await ordersRef.get();

    setStage('process-orders');
    const orders = [];
    for (const doc of allOrdersQuery.docs) {
      const orderData = doc.data();
      console.log('[poopoo ORDER_DATA]', JSON.stringify(orderData));
      const normalizedStatus = mapOrderStatus(orderData.orderStatus || orderData.status);
      // Only include orders that are NOT completed
      if (normalizedStatus === ORDER_STATUS.COMPLETED) continue;
      setStage(`sanitize-order:${doc.id}`);
      // Pass through assignedServer and updatedAt for sorting
      orders.push({
        ...sanitizeOrderData(doc.id, orderData),
        // Always include orderId and status at the order level
        orderId: doc.id,
        status: normalizedStatus,
        assignedServer: orderData.assignedServer || '',
        updatedAt: (() => {
          const dateObj = timestamp.safeToDate(orderData.updatedAt);
          return dateObj ? dateObj.getTime() : 0;
        })()
      });
    }

    // Optional: sort by serverId and updatedAt
    setStage('sort-orders');
    const serverId = requestData.serverId || '';
    const sortedOrders = sortOrdersForServer(orders, serverId);

    setStage('return-response');
    return {
      success: true,
      message: 'Active orders fetched successfully',
      data: sortedOrders
    };

  } catch (error) {
    console.error(`[getActiveOrdersForRestaurant][stage=${stage}]`, error);
    if (error && typeof error.code === 'string' && error.code.match(/^[a-z_]+$/)) {
      // Already a Firebase HttpsError, rethrow
      throw error;
    } else {
      // Wrap all other errors
      throw new functions.https.HttpsError('internal', error && error.message ? error.message : 'Failed to fetch active orders');
    }
  }
}

/**
 * Helper to sanitize order data for response
 * @param {string} id - Order document ID
 * @param {Object} orderData - Raw order data from Firestore
 * @param {string} tableName - Table name
 * @returns {Object} Sanitized order object
 */
function sanitizeOrderData(id, orderData) {
  // Only include carts that are not served, but keep all other fields
  const carts = Array.isArray(orderData.carts)
    ? orderData.carts.filter(cart => mapCartStatus(cart.status) !== CART_STATUS.SERVED)
    : orderData.carts;

  // Sort items in each cart to prioritize 'READY' status items
  if (Array.isArray(carts)) {
    carts.forEach(cart => {
      if (Array.isArray(cart.items)) {
        cart.items.sort((a, b) => {
          const statusA = mapCartStatus(a.status);
          const statusB = mapCartStatus(b.status);
          return (statusA === CART_STATUS.READY ? -1 : 0) - (statusB === CART_STATUS.READY ? -1 : 0);
        });
        cart.status = mapCartStatus(cart.status) || CART_STATUS.PENDING;
      }
    });
  }

  return {
    ...orderData,
    orderId: id,
    orderStatus: mapOrderStatus(orderData.orderStatus || orderData.status),
    carts
  };
}

module.exports = { getActiveOrdersForRestaurant };



/**
 * Sorts orders for the server:
 *   - Orders assigned to the given serverId come first
 *   - Others sorted by updatedAt (most recent first)
 * @param {Array} orders - Array of order objects
 * @param {string} serverId - Server ID to prioritize
 * @returns {Array} Sorted orders
 */
function sortOrdersForServer(orders, serverId) {
  if (!serverId) {
    // If no serverId, sort all by updatedAt descending
    return orders.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  }
  return orders.sort((a, b) => {
    const aAssigned = a.assignedServer === serverId ? 1 : 0;
    const bAssigned = b.assignedServer === serverId ? 1 : 0;
    if (aAssigned !== bAssigned) return bAssigned - aAssigned;
    // Fallback: sort by updatedAt descending
    return (b.updatedAt || 0) - (a.updatedAt || 0);
  });
}

module.exports = { getActiveOrdersForRestaurant };

const functions = require("firebase-functions");
const admin = require('../admin/initializeAdmin');
const db = admin.firestore();
const { ORDER_STATUS, FULFILLMENT_STATUS } = require('./orderConstants');
const { mapOrderStatus, mapCartStatus, getStatusColorHex } = require('../utils/statusUtils');
const OrderInputValidation = require('./orderInputValidation');
const timestamp = require('../utils/timestamp');
const ResponseBuilder = require('../utils/ResponseBuilder');
const errorHandler = require('../singleton/ErrorHandler');


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
 * 
 * Filtering Logic:
 * - Orders are returned if:
 *     1. assignedServer == currentServerId
 *     2. OR assignedServer is null/empty (unassigned)
 *     3. OR any cart has assignedTo == currentServerId
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
      errorHandler.badRequest('sessionId is required and must be a string');
    }

    setStage('session-validation');
    const sessionRef = db.collection('restaurants').doc(restaurantId).collection('sessions').doc(sessionId);
    const sessionDoc = await sessionRef.get();
    if (!sessionDoc.exists || sessionDoc.data().status !== 'active') {
      errorHandler.preconditionFailed('Invalid or inactive session', {
        restaurantId,
        sessionId
      });
    }
    // Staff only: consumer table sessions live in the same collection but
    // have no entity field.
    if (sessionDoc.data().entity !== 'server') {
      errorHandler.unauthorized('Staff session required', { restaurantId, sessionId });
    }

    // Derive currentServerId from session document
    const currentServerId = sessionDoc.data().serverId || '';

    setStage('fetch-restaurant-uiFlags');
    // Fetch uiFlags from restaurant document (cached)
    const uiFlags = await getCachedUiFlags(restaurantId);

    setStage('fetch-orders');
    const ordersRef = db.collection('restaurants').doc(restaurantId).collection('orders');
    // Bound the polled read: exclude COMPLETED server-side (same semantics as the
    // in-Node filter below, which stays for legacy/lowercase status values).
    // Note: '!=' also excludes docs missing orderStatus entirely.
    const allOrdersQuery = await ordersRef
      .where('orderStatus', '!=', ORDER_STATUS.COMPLETED)
      .limit(300)
      .get();

    setStage('process-orders');
    const orders = [];
    for (const doc of allOrdersQuery.docs) {
      const orderData = doc.data();
      const normalizedStatus = mapOrderStatus(orderData.orderStatus || orderData.status);
      // Only include orders that are NOT completed
      if (normalizedStatus === ORDER_STATUS.COMPLETED) continue;

      // Filter: include only orders where:
      // 1. assignedServer == currentServerId, OR
      // 2. assignedServer is null/empty (unassigned), OR
      // 3. any cart has assignedTo == currentServerId
      const assignedServer = orderData.assignedServer || '';
      const isAssignedToCurrentServer = assignedServer === currentServerId;
      const isUnassigned = !assignedServer;
      const hasCartAssignedToServer = Array.isArray(orderData.carts) &&
        orderData.carts.some(cart => cart.assignedTo === currentServerId);

      if (!isAssignedToCurrentServer && !isUnassigned && !hasCartAssignedToServer) {
        continue; // Skip this order - not relevant to current server
      }

      setStage(`sanitize-order:${doc.id}`);
      // Pass through assignedServer and updatedAt for sorting
      orders.push({
        ...sanitizeOrderData(doc.id, orderData),
        // Always include orderId and status at the order level
        orderId: doc.id,
        status: normalizedStatus,
        statusColorHex: getStatusColorHex(normalizedStatus),
        assignedServer: orderData.assignedServer || '',
        updatedAt: (() => {
          const dateObj = timestamp.safeToDate(orderData.updatedAt);
          return dateObj ? dateObj.getTime() : 0;
        })()
      });
    }

    // Optional: sort by serverId and updatedAt
    setStage('sort-orders');
    const sortedOrders = sortOrdersForServer(orders, currentServerId);

    setStage('return-response');
    return ResponseBuilder.success(
      {
        currentServerId,
        uiFlags,
        orders: sortedOrders
      },
      'Active orders fetched successfully'
    );
  } catch (error) {
    console.error(`[getActiveOrdersForRestaurant][stage=${stage}]`, error);
    errorHandler.handleError(error, 'getActiveOrdersForRestaurant', {
      stage,
      restaurantId: data?.data?.restaurantId || data?.restaurantId,
      sessionId: data?.data?.sessionId || data?.sessionId
    });
  }
}

/**
 * Helper to sanitize order data for response
 * @param {string} id - Order document ID
 * @param {Object} orderData - Raw order data from Firestore
 * @returns {Object} Sanitized order object
 */
function sanitizeOrderData(id, orderData) {
  // Map and filter carts carefully to preserve the original database index
  let carts = [];
  if (Array.isArray(orderData.carts)) {
    carts = orderData.carts
      .map((cart, index) => ({ ...cart, cartIndex: index }))
      .filter(cart => mapCartStatus(cart.status) !== FULFILLMENT_STATUS.SERVED);
  } else {
    carts = orderData.carts;
  }

  // Sort items in each cart to prioritize 'READY' status items
  // Also add statusColorHex to each cart and item
  if (Array.isArray(carts)) {
    carts.forEach((cart) => {
      const cartStatus = mapCartStatus(cart.status) || FULFILLMENT_STATUS.PENDING;
      cart.status = cartStatus;
      cart.statusColorHex = getStatusColorHex(cartStatus);
      // cartIndex is already preserved from original array above

      if (Array.isArray(cart.items)) {
        // Filter out items that should not be shown (CANCELLED, COMPLETED) if they are not relevant
        // Logic: Frontend filters 'completed' and 'cancelled'.
        cart.items = cart.items.filter(item => {
          const status = mapCartStatus(item.status);
          return status !== FULFILLMENT_STATUS.CANCELLED &&
            status !== FULFILLMENT_STATUS.RETURNED &&
            status !== FULFILLMENT_STATUS.SERVED;
        });

        cart.items.sort((a, b) => {
          const statusA = mapCartStatus(a.status);
          const statusB = mapCartStatus(b.status);
          return (statusA === FULFILLMENT_STATUS.READY ? -1 : 0) - (statusB === FULFILLMENT_STATUS.READY ? -1 : 0);
        });

        // Add statusColorHex to each item
        cart.items.forEach(item => {
          item.statusColorHex = getStatusColorHex(item.status);
        });
      }
    });
  }

  // Build priceInfo with finalPrice
  const priceInfo = {
    finalPrice: orderData.priceInfo?.finalPrice || 0,
    basePrice: orderData.priceInfo?.basePrice || 0,
    totalDiscount: orderData.priceInfo?.totalDiscount || 0,
    totalDiscountAmount: orderData.priceInfo?.totalDiscountAmount || 0,
  };

  return {
    ...orderData,
    orderId: id,
    orderStatus: mapOrderStatus(orderData.orderStatus || orderData.status),
    priceInfo,
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
    return (b.updatedAt || 0) - (a.updatedAt || 0);
  });
}

// Simple in-memory cache for uiFlags
// Map key: restaurantId, value: { timestamp: number, flags: Object }
const uiFlagsCache = new Map();
const UI_FLAGS_TTL_MS = 5 * 60 * 1000; // 5 minutes

async function getCachedUiFlags(restaurantId) {
  const now = Date.now();
  const cached = uiFlagsCache.get(restaurantId);

  if (cached && (now - cached.timestamp < UI_FLAGS_TTL_MS)) {
    return cached.flags;
  }

  try {
    const restaurantRef = db.collection('restaurants').doc(restaurantId);
    const restaurantDoc = await restaurantRef.get();

    const resData = restaurantDoc.exists ? restaurantDoc.data() : {};
    const restaurantFlags = resData.uiFlags || {};

    const flags = {
      showAllOrdersTab: restaurantFlags.showAllOrdersTab ?? true,
      maxItemsInOrderCard: restaurantFlags.maxItemsInOrderCard ?? 3,
      confirmServeCartAction: restaurantFlags.confirmServeCartAction ?? true,
    };

    uiFlagsCache.set(restaurantId, {
      timestamp: now,
      flags: flags
    });

    return flags;
  } catch (error) {
    console.error(`Error fetching uiFlags for ${restaurantId}:`, error);
    // Return defaults on error
    return {
      showAllOrdersTab: true,
      maxItemsInOrderCard: 3,
      confirmServeCartAction: true
    };
  }
}

module.exports = { getActiveOrdersForRestaurant };

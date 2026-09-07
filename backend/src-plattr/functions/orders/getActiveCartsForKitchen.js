const functions = require('firebase-functions');
const admin = require('../admin/initializeAdmin');
const db = admin.firestore();
const { ORDER_STATUS, FULFILLMENT_STATUS } = require('./orderConstants');
const { mapOrderStatus, mapCartStatus, getStatusColorHex } = require('../utils/statusUtils');
const OrderInputValidation = require('./orderInputValidation');
const timestamp = require('../utils/timestamp');
const ResponseBuilder = require('../utils/ResponseBuilder');
const errorHandler = require('../singleton/ErrorHandler');
const { SERVER_STATUS } = require('../server/serverEnums');
const { SERVER_ROLES } = require('../adminApp/auth');

/**
 * Kitchen-scoped read endpoint.
 *
 * Returns every non-completed order in the restaurant with its non-served carts,
 * with no server-assignment filter. This is the kitchen queue view and is
 * intentionally separate from orders/getActiveOrdersForRestaurant (which is a
 * waiter-scoped view).
 *
 * Sanitization and uiFlags retrieval are duplicated from getActiveOrdersForRestaurant
 * on purpose: this phase prefers a ~60-line copy over touching a hot waiter
 * endpoint. See REVIEW_FEEDBACK in the associated plan.
 *
 * Input (callable data):
 *   - restaurantId: string
 *   - sessionId:    string  (must belong to a KITCHEN / MANAGER / ADMIN staff session)
 *
 * Output: ResponseBuilder.success({ uiFlags, orders })
 */
async function getActiveCartsForKitchen(data, context) {
  let stage = 'init';
  const setStage = s => (stage = s);
  try {
    setStage('parse-request');
    const requestData = data && data.data ? data.data : data;

    setStage('input-validation');
    const { restaurantId, sessionId } = requestData || {};
    OrderInputValidation.validateRestaurantId(restaurantId);
    if (!sessionId || typeof sessionId !== 'string') {
      errorHandler.badRequest('sessionId is required and must be a string');
    }

    setStage('kitchen-session-validation');
    await validateKitchenSession(restaurantId, sessionId);

    setStage('fetch-uiFlags');
    const uiFlags = await getCachedUiFlags(restaurantId);

    setStage('fetch-orders');
    const ordersRef = db.collection('restaurants').doc(restaurantId).collection('orders');
    // Bound the polled read to live orders, newest first. An 'in' equality set
    // (not '!=') so the recency orderBy is legal — with '!=' Firestore orders by
    // orderStatus and limit(300) would keep stale CANCELLED docs over live ones.
    // Composite index: orderStatus ASC + createdAt DESC (firestore.indexes.json).
    const allOrdersQuery = await ordersRef
      .where('orderStatus', 'in', [ORDER_STATUS.PENDING, ORDER_STATUS.IN_PROGRESS])
      .orderBy('createdAt', 'desc')
      .limit(300)
      .get();

    setStage('process-orders');
    const orders = [];
    for (const doc of allOrdersQuery.docs) {
      const orderData = doc.data();
      const normalizedStatus = mapOrderStatus(orderData.orderStatus || orderData.status);

      // Kitchen view: live orders only. No assignedServer filter.
      if (normalizedStatus === ORDER_STATUS.COMPLETED ||
          normalizedStatus === ORDER_STATUS.CANCELLED) continue;

      setStage(`sanitize-order:${doc.id}`);
      orders.push({
        ...sanitizeOrderData(doc.id, orderData),
        orderId: doc.id,
        status: normalizedStatus,
        statusColorHex: getStatusColorHex(normalizedStatus),
        assignedServer: orderData.assignedServer || '',
        updatedAt: (() => {
          const dateObj = timestamp.safeToDate(orderData.updatedAt);
          return dateObj ? dateObj.getTime() : 0;
        })(),
      });
    }

    // Most-recent-updated orders first. Kitchen does not have a server-priority sort.
    setStage('sort-orders');
    orders.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));

    setStage('return-response');
    return ResponseBuilder.success(
      {
        uiFlags,
        orders,
      },
      'Active kitchen carts fetched successfully'
    );
  } catch (error) {
    console.error(`[getActiveCartsForKitchen][stage=${stage}]`, error);
    errorHandler.handleError(error, 'getActiveCartsForKitchen', {
      stage,
      restaurantId: data && (data.data && data.data.restaurantId) || (data && data.restaurantId),
      sessionId: data && (data.data && data.data.sessionId) || (data && data.sessionId),
    });
  }
}

/**
 * Validates a session for kitchen-view access.
 *
 * Allowed roles: KITCHEN, MANAGER, ADMIN (higher roles can see what lower roles see).
 * Rejected role: SERVER (waiters use the server-scoped endpoint instead).
 *
 * Shape is inspired by adminApp/auth.js:validateAdminSession, but intentionally
 * stricter in two places:
 *   1. explicit `status === 'active'` check (admin variant omits this and only
 *      looks at expiresAt)
 *   2. timestamps read via utils/timestamp.safeToDate so a missing or malformed
 *      expiresAt does not crash the handler (admin variant calls .toDate() raw)
 *
 * Kept local to this file on purpose; we do not want to introduce a broader auth
 * abstraction in this phase.
 */
async function validateKitchenSession(restaurantId, sessionId) {
  const sessionRef = db
    .collection('restaurants')
    .doc(restaurantId)
    .collection('sessions')
    .doc(sessionId);

  const sessionDoc = await sessionRef.get();
  if (!sessionDoc.exists) {
    errorHandler.preconditionFailed('Invalid or inactive session', { restaurantId, sessionId });
  }

  const sessionData = sessionDoc.data();

  if (sessionData.status !== SERVER_STATUS.ACTIVE && sessionData.status !== 'active') {
    errorHandler.preconditionFailed('Invalid or inactive session', {
      restaurantId,
      sessionId,
      status: sessionData.status,
    });
  }

  if (sessionData.expiresAt && timestamp.safeToDate(sessionData.expiresAt) < new Date()) {
    errorHandler.preconditionFailed('Session has expired', { restaurantId, sessionId });
  }

  if (sessionData.entity !== 'server' || !sessionData.serverId) {
    errorHandler.unauthorized('Invalid session type', { restaurantId, sessionId });
  }

  const serverRef = db
    .collection('restaurants')
    .doc(restaurantId)
    .collection('servers')
    .doc(sessionData.serverId);
  const serverDoc = await serverRef.get();

  if (!serverDoc.exists) {
    errorHandler.unauthorized('Staff record not found', {
      restaurantId,
      serverId: sessionData.serverId,
    });
  }

  const serverData = serverDoc.data();

  // Role comparison is case-insensitive because mock data and some legacy
  // seed records store lowercase role values (e.g. "kitchen") while
  // adminApp/auth.js defines the canonical uppercase constants.
  const ALLOWED_ROLES = new Set([
    SERVER_ROLES.KITCHEN,
    SERVER_ROLES.MANAGER,
    SERVER_ROLES.ADMIN,
  ]);
  const normalizedRole =
    typeof serverData.role === 'string' ? serverData.role.toUpperCase() : null;

  if (!normalizedRole || !ALLOWED_ROLES.has(normalizedRole)) {
    errorHandler.forbidden('Kitchen access requires KITCHEN, MANAGER, or ADMIN role.', {
      restaurantId,
      role: serverData.role || null,
    });
  }

  return { serverData, serverId: sessionData.serverId };
}

/**
 * DUPLICATED from getActiveOrdersForRestaurant.js on purpose — see file header.
 * Produces a sanitized order object with carts/items filtered for kitchen display.
 */
function sanitizeOrderData(id, orderData) {
  let carts = [];
  if (Array.isArray(orderData.carts)) {
    carts = orderData.carts
      .map((cart, index) => ({ ...cart, cartIndex: index }))
      .filter(cart => mapCartStatus(cart.status) !== FULFILLMENT_STATUS.SERVED);
  } else {
    carts = orderData.carts;
  }

  if (Array.isArray(carts)) {
    carts.forEach((cart) => {
      const cartStatus = mapCartStatus(cart.status) || FULFILLMENT_STATUS.PENDING;
      cart.status = cartStatus;
      cart.statusColorHex = getStatusColorHex(cartStatus);

      if (Array.isArray(cart.items)) {
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

        cart.items.forEach(item => {
          item.statusColorHex = getStatusColorHex(item.status);
        });
      }
    });
  }

  const priceInfo = {
    finalPrice: (orderData.priceInfo && orderData.priceInfo.finalPrice) || 0,
    basePrice: (orderData.priceInfo && orderData.priceInfo.basePrice) || 0,
    totalDiscount: (orderData.priceInfo && orderData.priceInfo.totalDiscount) || 0,
    totalDiscountAmount: (orderData.priceInfo && orderData.priceInfo.totalDiscountAmount) || 0,
  };

  return {
    ...orderData,
    orderId: id,
    orderStatus: mapOrderStatus(orderData.orderStatus || orderData.status),
    priceInfo,
    carts,
  };
}

/**
 * DUPLICATED from getActiveOrdersForRestaurant.js on purpose — see file header.
 * Self-contained module-level cache so kitchen and waiter endpoints do not
 * share cache state (avoids cross-endpoint invalidation surprises).
 */
const uiFlagsCache = new Map();
const UI_FLAGS_TTL_MS = 5 * 60 * 1000;

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
      showAllOrdersTab: restaurantFlags.showAllOrdersTab != null ? restaurantFlags.showAllOrdersTab : true,
      maxItemsInOrderCard: restaurantFlags.maxItemsInOrderCard != null ? restaurantFlags.maxItemsInOrderCard : 3,
      confirmServeCartAction: restaurantFlags.confirmServeCartAction != null ? restaurantFlags.confirmServeCartAction : true,
    };

    uiFlagsCache.set(restaurantId, {
      timestamp: now,
      flags,
    });

    return flags;
  } catch (error) {
    console.error(`Error fetching uiFlags for ${restaurantId} (kitchen):`, error);
    return {
      showAllOrdersTab: true,
      maxItemsInOrderCard: 3,
      confirmServeCartAction: true,
    };
  }
}

module.exports = { getActiveCartsForKitchen };

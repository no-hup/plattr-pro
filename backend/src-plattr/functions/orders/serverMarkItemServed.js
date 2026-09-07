const functions = require('firebase-functions');
const admin = require('../admin/initializeAdmin');
const db = admin.firestore();
const { FULFILLMENT_STATUS } = require('./orderConstants');
const { mapCartStatus } = require('../utils/statusUtils');
const OrderInputValidation = require('./orderInputValidation');
const timestamp = require('../utils/timestamp');
const ResponseBuilder = require('../utils/ResponseBuilder');
const errorHandler = require('../singleton/ErrorHandler');

const VALID_TRANSITIONS = {
  [FULFILLMENT_STATUS.PENDING]: [FULFILLMENT_STATUS.PREPARING, FULFILLMENT_STATUS.READY, FULFILLMENT_STATUS.CANCELLED],
  [FULFILLMENT_STATUS.PREPARING]: [FULFILLMENT_STATUS.READY, FULFILLMENT_STATUS.CANCELLED],
  [FULFILLMENT_STATUS.READY]: [FULFILLMENT_STATUS.SERVED, FULFILLMENT_STATUS.CANCELLED],
  [FULFILLMENT_STATUS.SERVED]: [FULFILLMENT_STATUS.RETURNED],
  [FULFILLMENT_STATUS.RETURNED]: [],
  [FULFILLMENT_STATUS.CANCELLED]: []
};

/**
 * Server app: mark a specific item as served
 * - Updates item status in cart and order items
 * - Validates status transition strictly
 */
const serverMarkItemServed = functions.https.onCall(async (data, context) => {
  const requestData = data?.data || data || {};
  try {
    const { restaurantId, orderId, menuItemId, cartItemId, sessionId } = requestData;

    // Session Validation
    if (!sessionId || typeof sessionId !== 'string') {
      errorHandler.badRequest('sessionId is required and must be a string');
    }

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

    const userId = sessionDoc.data().serverId || context.auth?.uid || 'system';
    const hasCartItemId = cartItemId !== undefined && cartItemId !== null;

    const normalizedStatus = OrderInputValidation.validateUpdateMenuItemStatusFields({
      ...requestData,
      newStatus: FULFILLMENT_STATUS.SERVED
    });

    const orderRef = db.collection('restaurants')
      .doc(restaurantId)
      .collection('orders')
      .doc(orderId);

    return await db.runTransaction(async (transaction) => {
      const orderDoc = await transaction.get(orderRef);
      if (!orderDoc.exists) {
        errorHandler.notFound('Order not found', { restaurantId, orderId });
      }

      const orderData = orderDoc.data();
      let found = false;
      let currentStatus = null;

      // Update cart items
      const updatedCarts = (orderData.carts || []).map((cart) => {
        if (!Array.isArray(cart.items)) return cart;
        const updatedItems = cart.items.map((item) => {
          const matches = item.menuItemId === menuItemId &&
            (hasCartItemId ? item.cartItemId === cartItemId : true);
          if (!matches) return item;

          found = true;
          currentStatus = mapCartStatus(item.status || '');
          if (!isValidTransition(currentStatus, normalizedStatus)) {
            errorHandler.badRequest(
              `Invalid status transition from ${currentStatus} to ${normalizedStatus}`,
              { restaurantId, orderId, menuItemId, cartItemId }
            );
          }

          return {
            ...item,
            status: normalizedStatus,
            statusUpdatedAt: timestamp.now(),
            statusUpdatedBy: userId
          };
        });
        return { ...cart, items: updatedItems };
      });

      if (!found) {
        errorHandler.notFound('Menu item not found in order carts', {
          restaurantId,
          orderId,
          menuItemId,
          cartItemId
        });
      }

      // Update flattened order items if present
      const updatedItems = Array.isArray(orderData.items)
        ? orderData.items.map((item) => {
          const matches = item.menuItemId === menuItemId &&
            (hasCartItemId ? item.cartItemId === cartItemId : true);
          if (!matches) return item;
          return {
            ...item,
            status: normalizedStatus,
            statusUpdatedAt: timestamp.now(),
            statusUpdatedBy: userId
          };
        })
        : orderData.items;

      const updates = {
        carts: updatedCarts,
        items: updatedItems,
        updatedAt: timestamp.now()
      };

      transaction.update(orderRef, updates);

      return ResponseBuilder.success(
        { orderId, menuItemId, cartItemId, status: normalizedStatus },
        'Item marked as served'
      );
    });
  } catch (error) {
    console.error('Error in serverMarkItemServed:', error.message);
    errorHandler.handleError(error, 'serverMarkItemServed', {
      restaurantId: requestData?.restaurantId,
      orderId: requestData?.orderId,
      menuItemId: requestData?.menuItemId,
      cartItemId: requestData?.cartItemId
    });
  }
});

function isValidTransition(currentStatus, newStatus) {
  const fromStatus = mapCartStatus(currentStatus);
  const toStatus = mapCartStatus(newStatus);
  const allowed = VALID_TRANSITIONS[fromStatus] || [];
  return allowed.includes(toStatus);
}

module.exports = { serverMarkItemServed };

const functions = require('firebase-functions');
const { admin, db } = require('../admin/admin');
const { ORDER_STATUS, PAYMENT_STATUS } = require('./orderConstants');
const OrderInputValidation = require('./orderInputValidation');
const { validateSessionId } = require('../cart/cartInputValidation');
const { calculateCartValue } = require('../cart/calculateCartValue');
const { OrderPriceInfo } = require('../genericModels/priceinfo');
const { timestamp } = require('../utils/timestamp');
const featureFlags = require('../singleton/FeatureFlags');
const { sendFCMNotification } = require('../notifications/sendNotification');

const COLLECTIONS = {
  RESTAURANTS: 'restaurants',
  ORDERS: 'orders',
  TABLES: 'tables',
  SERVERS: 'servers'
};
const SEND_SERVER_NOTIFICATIONS = 'sendServerNotifications';

/**
 * HTTPS Callable function to update an order's status:
 * - Optionally revalidates bill when completing
 * - Updates orderStatus (and paymentStatus if COMPLETE)
 * - Notifies server when order is marked complete
 */
exports.updateOrderStatus = functions.https.onCall(async (data, context) => {
  const requestData = data.data || data;
  console.log('poopoo updateOrderStatus request:', JSON.stringify(requestData));
  // Validate inputs
  OrderInputValidation.validateUpdateOrderStatusFields(requestData);
  const { restaurantId, orderId, orderStatus, sessionId } = requestData;
  // Validate session
  await validateSessionId(restaurantId, sessionId);
  try {
    const orderRef = db
      .collection(COLLECTIONS.RESTAURANTS).doc(restaurantId)
      .collection(COLLECTIONS.ORDERS).doc(orderId);

    return await db.runTransaction(async (tx) => {
      const orderDoc = await tx.get(orderRef);
      if (!orderDoc.exists) {
        throw new functions.https.HttpsError('not-found', 'Order not found');
      }
      const order = orderDoc.data();

      const updatePayload = { orderStatus, updatedAt: timestamp.serverTimestamp() };

      // If marking complete, revalidate prices and set payment
      if (orderStatus === ORDER_STATUS.COMPLETED) {
        let totalBase = 0, totalFinal = 0;
        for (const cart of order.carts || []) {
          const cartInfo = await calculateCartValue(cart);
          totalBase += cartInfo.basePrice || 0;
          totalFinal += cartInfo.finalPrice || 0;
        }
        const recomputedPriceInfo = new OrderPriceInfo({ basePrice: totalBase, finalPrice: totalFinal }).toObject();
        if (recomputedPriceInfo.basePrice !== order.priceInfo.basePrice ||
            recomputedPriceInfo.finalPrice !== order.priceInfo.finalPrice) {
          throw new functions.https.HttpsError('failed-precondition', 'Recomputed bill does not match stored bill');
        }
        updatePayload.paymentStatus = PAYMENT_STATUS.PAID;
        updatePayload.priceInfo = recomputedPriceInfo;
      }

      tx.update(orderRef, updatePayload);

      // Notify server on completion
      if (orderStatus === ORDER_STATUS.COMPLETED && featureFlags.isEnabled(SEND_SERVER_NOTIFICATIONS)) {
        const { tableId } = order;
        const tableDoc = await tx.get(db
          .collection(COLLECTIONS.RESTAURANTS).doc(restaurantId)
          .collection(COLLECTIONS.TABLES).doc(tableId));
        if (tableDoc.exists) {
          const serverId = tableDoc.data().assignedServerId;
          if (serverId) {
            const serverDoc = await tx.get(db
              .collection(COLLECTIONS.RESTAURANTS).doc(restaurantId)
              .collection(COLLECTIONS.SERVERS).doc(serverId));
            if (serverDoc.exists) {
              const token = serverDoc.data().fcmToken;
              if (token) {
                await sendFCMNotification(token, {
                  title: 'Order Completed',
                  body: `Order ${orderId} marked complete – please collect payment`,
                  data: { restaurantId, orderId, type: 'ORDER_COMPLETED' }
                });
              }
            }
          }
        }
      }

      return { status: 'success', orderId, orderStatus };
    });
  } catch (error) {
    console.error('Error in updateOrderStatus:', error);
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    throw new functions.https.HttpsError('internal', 'Failed to update order status');
  }
});

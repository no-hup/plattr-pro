const functions = require('firebase-functions');
const { admin, db } = require('../admin/admin');
const { ORDER_STATUS, PAYMENT_STATUS } = require('./orderConstants');
const OrderInputValidation = require('./orderInputValidation');
const { validateStaffSession } = require('../adminApp/auth');
const { calculateCartValue } = require('../cart/calculateCartValue');
const { OrderPriceInfo } = require('../genericModels/priceinfo');
const timestamp = require('../utils/timestamp');
const featureFlags = require('../singleton/FeatureFlags');
const { sendFCMNotification } = require('../notifications/sendNotification');
const ResponseBuilder = require('../utils/ResponseBuilder');
const errorHandler = require('../singleton/ErrorHandler');
const { evaluateAndPickBestOffer, buildAppliedOfferObject } = require('../offers/evaluateOrderOffers');
const { calculateCharges, loadChargesConfig } = require('./calculateCharges');

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
async function notifyAssignedServer(restaurantId, orderId) {
  const restaurantRef = db.collection(COLLECTIONS.RESTAURANTS).doc(restaurantId);
  const orderDoc = await restaurantRef.collection(COLLECTIONS.ORDERS).doc(orderId).get();
  const tableId = orderDoc.data()?.tableId;
  if (!tableId) return;
  const tableDoc = await restaurantRef.collection(COLLECTIONS.TABLES).doc(tableId).get();
  const serverId = tableDoc.data()?.assignedServerId;
  if (!serverId) return;
  const serverDoc = await restaurantRef.collection(COLLECTIONS.SERVERS).doc(serverId).get();
  const token = serverDoc.data()?.fcmToken;
  if (!token) return;
  await sendFCMNotification(token, {
    title: 'Order Completed',
    body: `Order ${orderId} marked complete – please collect payment`,
    data: { restaurantId, orderId, type: 'ORDER_COMPLETED' }
  });
}

exports.updateOrderStatus = functions.https.onCall(async (data, context) => {
  // Load feature flag overrides from Firestore (for test environments)
  await featureFlags.loadOverrides(db);
  const requestData = data.data || data;
  console.log('updateOrderStatus request:', JSON.stringify(requestData));
  // Validate inputs
  OrderInputValidation.validateUpdateOrderStatusFields(requestData);
  const { restaurantId, orderId, orderStatus, sessionId } = requestData;
  // Staff only: this endpoint closes the bill (COMPLETED sets paymentStatus
  // PAID). validateSessionId was optional-and-anonymous — unacceptable here.
  await validateStaffSession(restaurantId, sessionId);
  const chargesConfig = orderStatus === ORDER_STATUS.COMPLETED ? await loadChargesConfig(restaurantId) : [];
  try {
    const orderRef = db
      .collection(COLLECTIONS.RESTAURANTS).doc(restaurantId)
      .collection(COLLECTIONS.ORDERS).doc(orderId);

    const response = await db.runTransaction(async (tx) => {
      const orderDoc = await tx.get(orderRef);
      if (!orderDoc.exists) {
        errorHandler.notFound('Order not found', { restaurantId, orderId });
      }
      const order = orderDoc.data();

      // State machine guard: only allow valid transitions
      const ALLOWED_TRANSITIONS = {
        [ORDER_STATUS.PENDING]:     [ORDER_STATUS.IN_PROGRESS, ORDER_STATUS.CANCELLED],
        [ORDER_STATUS.IN_PROGRESS]: [ORDER_STATUS.COMPLETED, ORDER_STATUS.CANCELLED],
        [ORDER_STATUS.COMPLETED]:   [],   // terminal
        [ORDER_STATUS.CANCELLED]:   [],   // terminal
      };
      const currentStatus = order.orderStatus;
      const allowed = ALLOWED_TRANSITIONS[currentStatus];
      if (allowed === undefined) {
        errorHandler.badRequest(
          `Order has unknown status "${currentStatus}" — cannot determine valid transitions`,
          { orderId, currentStatus, requestedStatus: orderStatus }
        );
      }
      if (!allowed.includes(orderStatus)) {
        errorHandler.badRequest(
          `Transition ${currentStatus} → ${orderStatus} is not allowed`,
          { orderId, currentStatus, requestedStatus: orderStatus }
        );
      }

      const updatePayload = { orderStatus, updatedAt: timestamp.serverTimestamp() };

      // If marking complete, revalidate prices AND re-evaluate order-level offer
      // (safety net in case items were cancelled after checkout).
      if (orderStatus === ORDER_STATUS.COMPLETED) {
        // 1. Recompute base totals from all cart snapshots (item-level only)
        let totalBase = 0, totalFinal = 0, totalItemDiscount = 0;
        for (const cart of order.carts || []) {
          const cartInfo = await calculateCartValue(cart);
          totalBase += cartInfo.basePrice || 0;
          totalFinal += cartInfo.finalPrice || 0;
          totalItemDiscount += cartInfo.totalDiscountAmount || 0;
        }

        // 2. Collect raw items from all carts (with categoryId / subcategoryIds)
        const allCartItems = (order.carts || [])
          .flatMap(c => Array.isArray(c.items) ? c.items : []);

        // 3. Re-evaluate offers — items may have been cancelled since checkout
        const bestOffer = await evaluateAndPickBestOffer(
          restaurantId,
          allCartItems,
          totalBase,
          order.sessionId,
          orderId
        );
        const offerDiscount = bestOffer ? Math.min(bestOffer.discountAmount, totalFinal) : 0;
        const appliedOffer = bestOffer ? buildAppliedOfferObject(bestOffer) : null;
        const postOfferFinalPrice = Math.max(0, totalFinal - offerDiscount);

        // Charges V1: same computation as checkout, on the post-offer total.
        const { charges, chargesTotal } = calculateCharges(postOfferFinalPrice, chargesConfig);

        const recomputedPriceInfo = new OrderPriceInfo({
          basePrice: totalBase,
          finalPrice: postOfferFinalPrice,
          totalDiscount: totalBase > 0 ? Math.round((totalItemDiscount / totalBase) * 10000) / 100 : 0,
          totalDiscountAmount: totalItemDiscount + offerDiscount,
          offerDiscount,
          charges,
          chargesTotal
        }).toObject();

        // 4. The recompute is authoritative: a base drift means items/carts were
        //    cancelled after checkout (exactly what this safety net is for), so log it
        //    rather than block payment.
        if (Math.abs(recomputedPriceInfo.basePrice - (order.priceInfo?.basePrice || 0)) > 0.05) {
          console.warn(`updateOrderStatus: order ${orderId} base drifted ${order.priceInfo?.basePrice} -> ${recomputedPriceInfo.basePrice} (cancellations after checkout)`);
        }

        if (appliedOffer && !order.appliedOffer) {
          console.log(`Offers V2: offer "${appliedOffer.title}" became applicable at COMPLETED for order ${orderId}`);
        } else if (!appliedOffer && order.appliedOffer) {
          console.log(`Offers V2: offer "${order.appliedOffer.title}" no longer valid at COMPLETED for order ${orderId}`);
        }

        updatePayload.paymentStatus = PAYMENT_STATUS.PAID;
        updatePayload.priceInfo = recomputedPriceInfo;
        updatePayload.appliedOffer = appliedOffer; // may be null (clears previous)
      }

      tx.update(orderRef, updatePayload);

      return ResponseBuilder.success(
        { orderId, orderStatus },
        'Order status updated successfully'
      );
    });

    // Notify server after the commit: a transaction retry must not double-push
    // and an FCM failure must not roll back the PAID write.
    if (orderStatus === ORDER_STATUS.COMPLETED && featureFlags.isEnabled(SEND_SERVER_NOTIFICATIONS)) {
      try {
        await notifyAssignedServer(restaurantId, orderId);
      } catch (notifyError) {
        console.error(`updateOrderStatus: notification failed for order ${orderId}: ${notifyError.message}`);
      }
    }

    return response;
  } catch (error) {
    console.error('Error in updateOrderStatus:', error);
    errorHandler.handleError(error, 'updateOrderStatus', {
      restaurantId,
      orderId,
      orderStatus
    });
  }
});

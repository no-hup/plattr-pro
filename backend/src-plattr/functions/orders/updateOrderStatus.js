const functions = require('firebase-functions');
const { admin, db } = require('../admin/admin');
const { ORDER_STATUS, FULFILLMENT_STATUS } = require('./orderConstants');
const { mapCartStatus } = require('../utils/statusUtils');
const { voidCartLines } = require('./lineSnapshots');
const { applyCartStatus, dishName } = require('../cart/updateCartStatus');
const { buildOrderPriceInfo } = require('./createOrUpdateOrder');
const OrderInputValidation = require('./orderInputValidation');
const { validateStaffSession } = require('../adminApp/auth');
const { calculateCartValue, isBillableItem } = require('../cart/calculateCartValue');
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
 * - Updates orderStatus (paymentStatus is PY's: see app/payments.ts, TD-010)
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
  // Staff only: this endpoint closes the order. (It used to set paymentStatus PAID too;
  // that is PY's now, TD-010.) validateSessionId was optional-and-anonymous — unacceptable here.
  const { serverId, serverData } = await validateStaffSession(restaurantId, sessionId);
  const isCancel = orderStatus === ORDER_STATUS.CANCELLED;
  // D4: the waiter (or the cashier) cancels. The kitchen strikes a round, never a whole order.
  if (isCancel && !['SERVER', 'MANAGER', 'ADMIN'].includes(serverData?.role)) {
    errorHandler.forbidden('Only the waiter or the cashier can cancel an order', { restaurantId, orderId, role: serverData?.role });
  }
  const chargesConfig = orderStatus === ORDER_STATUS.COMPLETED || isCancel ? await loadChargesConfig(restaurantId) : [];
  try {
    const orderRef = db
      .collection(COLLECTIONS.RESTAURANTS).doc(restaurantId)
      .collection(COLLECTIONS.ORDERS).doc(orderId);

    let tableId;
    const response = await db.runTransaction(async (tx) => {
      const orderDoc = await tx.get(orderRef);
      if (!orderDoc.exists) {
        errorHandler.notFound('Order not found', { restaurantId, orderId });
      }
      const order = orderDoc.data();
      tableId = order.tableId;

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
      const UNBILLED = [FULFILLMENT_STATUS.CANCELLED, FULFILLMENT_STATUS.RETURNED];
      const liveCarts = (order.carts || []).map((cart, i) => ({ cart, i })).filter(({ cart }) => !UNBILLED.includes(mapCartStatus(cart.status)));

      if (orderStatus === ORDER_STATUS.CANCELLED) {
        // DECISION(D4, 2026-09-25): 20:10 table 6's guest leaves before the Chicken 65 and Butter Naan are cooked;
        // the captain taps Cancel Order. Every dish leaves the bill and the kitchen through the same void as a
        // round cancel: an audit row each, no PIN, refused once the bill is printed (the till's Edit bill owns
        // that). It used to write only orderStatus, so the kitchen lost the ticket and the till still billed it
        // (TD-089). If you change this, ask Shaurya first.
        // A served dish was eaten and cannot be cancelled; the waiter cancels the rest one dish at a time.
        const served = liveCarts.flatMap(({ cart }) => cart.items || []).find(item => mapCartStatus(item.status) === FULFILLMENT_STATUS.SERVED);
        if (served) {
          errorHandler.preconditionFailed(`${dishName(served)} is already served — cancel the other dishes one at a time`, { orderId });
        }
        await voidCartLines(tx, restaurantId, liveCarts.map(({ cart }) => cart), {
          staffId: serverId, reason: 'other', note: 'order cancelled', now: Date.now(),
        });
        let next = order;
        for (const { i } of liveCarts) {
          next = { ...next, ...applyCartStatus(next, i, FULFILLMENT_STATUS.CANCELLED, { status: FULFILLMENT_STATUS.CANCELLED, timestamp: timestamp.now(), userId: serverId, notes: 'order cancelled' }) };
        }
        updatePayload.carts = next.carts;
        if (Array.isArray(order.items)) updatePayload.items = next.items;
        const { priceInfo, appliedOffer } = await buildOrderPriceInfo(restaurantId, next.carts, order.sessionId, chargesConfig, orderId);
        updatePayload.priceInfo = priceInfo;
        updatePayload.appliedOffer = appliedOffer;
      }

      // TD-092: completing an order while a round is still at the kitchen dropped it from the kitchen and waiter
      // screens while the till still billed it. The waiter app's Mark Paid is gone (D4); this guards the endpoint.
      if (orderStatus === ORDER_STATUS.COMPLETED) {
        const open = liveCarts.find(({ cart }) => mapCartStatus(cart.status) !== FULFILLMENT_STATUS.SERVED);
        if (open) {
          errorHandler.preconditionFailed(`Round ${open.i + 1} is still ${mapCartStatus(open.cart.status)} — serve or cancel it first`, { orderId });
        }
      }

      // If marking complete, revalidate prices AND re-evaluate order-level offer
      // (safety net in case items were cancelled after checkout).
      if (orderStatus === ORDER_STATUS.COMPLETED) {
        // 1. Recompute base totals from all cart snapshots (item-level only)
        // A cart cancelled or returned mid-meal already left the bill (cart/updateCartStatus
        // rebuilds priceInfo without it). Without this filter COMPLETED silently put it back:
        // any line in it that was already SERVED when the round was cancelled is still billable
        // on its own status, so the guest was charged for a round staff had struck off.
        // isBillableItem is a plain status check, so it reads a cart as happily as an item.
        let totalBase = 0, totalFinal = 0, totalItemDiscount = 0;
        for (const cart of (order.carts || []).filter(isBillableItem)) {
          const cartInfo = await calculateCartValue(cart);
          totalBase += cartInfo.basePrice || 0;
          totalFinal += cartInfo.finalPrice || 0;
          totalItemDiscount += cartInfo.totalDiscountAmount || 0;
        }

        // 2. Collect raw items from all carts (with categoryId / subcategoryIds).
        //    Billable items only: a spend-threshold offer must not be unlocked by
        //    food that was cancelled or returned and is not on the bill.
        const allCartItems = (order.carts || [])
          .filter(isBillableItem)
          .flatMap(c => Array.isArray(c.items) ? c.items : [])
          .filter(isBillableItem);

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

        // TD-010 (closed): payment is PY's axis. order.paymentStatus is mirrored by app/payments.ts
        // inside the payment transaction; completing an order no longer claims the money was taken.
        updatePayload.priceInfo = recomputedPriceInfo;
        updatePayload.appliedOffer = appliedOffer; // may be null (clears previous)
      }

      tx.update(orderRef, updatePayload);

      return ResponseBuilder.success(
        { orderId, orderStatus },
        'Order status updated successfully'
      );
    });

    // COMPLETED says the food is done. It says nothing about the table: whether the party has
    // paid and left is the floor module's to decide (FL R14, Clear), and it used to be decided
    // here too, by opposite rules (TD-013, TD-036). One owner now. The waiter's manual Vacant
    // (table-updateTableStatus) and the till's Clear are the only things that free a table.

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

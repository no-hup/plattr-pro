const functions = require("firebase-functions");
const admin = require('../admin/initializeAdmin');
const db = admin.firestore();
const { Timestamp } = require("firebase-admin/firestore");
const { FULFILLMENT_STATUS } = require('../orders/orderConstants');
const { mapCartStatus, isValidCartTransition } = require('../utils/statusUtils');
const OrderInputValidation = require('../orders/orderInputValidation');
const timestamp = require('../utils/timestamp');
const { validateStaffSession } = require('../adminApp/auth');
const { buildOrderPriceInfo } = require('../orders/createOrUpdateOrder');
const { loadChargesConfig } = require('../orders/calculateCharges');
const { markLinesSent, voidCartLines } = require('../orders/lineSnapshots');

const UNBILLED = [FULFILLMENT_STATUS.CANCELLED, FULFILLMENT_STATUS.RETURNED];

/**
 * Updates the status of a specific cart in an order
 * HTTP Callable function
 * 
 * @param {Object} data - Input data with restaurantId, orderId, cartIndex, newStatus, notes (optional), sessionId (optional)
 */
const updateCartStatus = functions.https.onCall(async (data, context) => {
  try {
    const requestData = data?.data || data;
    let safeRequestLog = '[unserializable]';
    try {
      safeRequestLog = JSON.stringify(requestData);
    } catch (e) {
      // Keep log minimal to avoid crashing on circular structures.
      safeRequestLog = '[circular]';
    }
    // console.log("Received updateCartStatus request:", safeRequestLog);
    // TODO: Re-enable auth check when ready
    // if (!context.auth) {
    //   throw new functions.https.HttpsError(
    //     'unauthenticated',
    //     'User must be authenticated to update cart status'
    //   );
    // }

    OrderInputValidation.validateUpdateCartStatusFields(requestData);

    const { restaurantId, orderId, cartIndex, newStatus, notes = '', sessionId } = requestData;
    const mappedStatus = OrderInputValidation.validateCartStatus(newStatus);
    const userId = context.auth?.uid || 'system';  // Fallback to 'system' if no auth

    // Staff only: this mutates fulfillment status and (below) can rewrite the
    // order's sessionId, which feeds offer eligibility at COMPLETED.
    const { serverId } = await validateStaffSession(restaurantId, sessionId);

    // Update the cart status using the internal function
    const updatedOrder = await _updateCartStatus(
      restaurantId,
      orderId,
      cartIndex,
      mappedStatus,
      userId,
      notes,
      sessionId,
      serverId
    );

    return {
      success: true,
      message: `Cart status updated to ${mappedStatus}`,
      data: updatedOrder
    };
  } catch (error) {
    console.error("Error in updateCartStatus:", error);

    if (error instanceof functions.https.HttpsError) {
      throw error;
    }

    throw new functions.https.HttpsError(
      'internal',
      error.message || 'An error occurred while updating cart status'
    );
  }
});

/**
 * Internal implementation of updateCartStatus
 * @param {string} restaurantId - ID of the restaurant
 * @param {string} orderId - ID of the order
 * @param {number} cartIndex - Index of the cart in the order's carts array
 * @param {string} newStatus - New status to set
 * @param {string} userId - ID of the user making the change
 * @param {string} notes - Optional notes about the status change
 * @param {string} sessionId - Optional session ID
 * @returns {Object} The updated order
 */
async function _updateCartStatus(
  restaurantId,
  orderId,
  cartIndex,
  newStatus,
  userId,
  notes = '',
  sessionId = null,
  staffId = null
) {
  const orderRef = db.collection("restaurants")
    .doc(restaurantId)
    .collection("orders")
    .doc(orderId);

  // Charges config is read out-of-band (same as checkout); only needed when the bill changes.
  const billChanges = UNBILLED.includes(mapCartStatus(newStatus));
  const chargesConfig = billChanges ? await loadChargesConfig(restaurantId) : [];

  try {
    return await db.runTransaction(async (transaction) => {
      const orderDoc = await transaction.get(orderRef);

      if (!orderDoc.exists) {
        throw new Error(`Order with ID ${orderId} not found`);
      }

      const orderData = orderDoc.data();

      if (!orderData.carts || !orderData.carts[cartIndex]) {
        throw new Error(`Cart at index ${cartIndex} not found in order ${orderId}`);
      }

      const cart = orderData.carts[cartIndex];
      const currentStatus = OrderInputValidation.validateCartStatus(cart.status);
      const normalizedNewStatus = OrderInputValidation.validateCartStatus(newStatus);

      // Validate status transition
      if (!isValidCartTransition(currentStatus, normalizedNewStatus)) {
        throw new Error(`Invalid status transition from ${currentStatus} to ${normalizedNewStatus}`);
      }

      // ── Line-snapshot side effects. Reads, so they must happen before the first write. ──
      // The order doc and the lines are two collections telling one story; they move together
      // or the bill and the kitchen disagree.
      const isConfirm = currentStatus === FULFILLMENT_STATUS.AWAITING_CONFIRMATION &&
                        normalizedNewStatus === FULFILLMENT_STATUS.PENDING;
      const isCancel = normalizedNewStatus === FULFILLMENT_STATUS.CANCELLED;

      if (isConfirm) {
        // The waiter just told the kitchen. ST reads `sent` to price a later void (ST-S5).
        await markLinesSent(transaction, restaurantId, cart);
      } else if (isCancel) {
        await voidCartLines(transaction, restaurantId, cart, {
          staffId, reason: 'guest left', note: notes, now: Date.now(),
        });
      }

      // Create status history entry
      const statusEntry = {
        status: normalizedNewStatus,
        timestamp: timestamp.now(),
        userId: userId,
        notes: notes
      };

      // Update cart status and cascade it to every live item, so a READY cart
      // has READY items (server-markItemServed needs that) and a CANCELLED cart
      // drops out of the bill. Items already CANCELLED/RETURNED/SERVED keep their
      // status (an individually served item must not flip back to READY or to
      // CANCELLED).
      const keepsOwnStatus = (item) => {
        const s = mapCartStatus(item.status);
        return s === FULFILLMENT_STATUS.CANCELLED ||
               s === FULFILLMENT_STATUS.RETURNED ||
               s === FULFILLMENT_STATUS.SERVED;
      };
      const cascadedItems = (cart.items || []).map(item =>
        keepsOwnStatus(item) ? item : { ...item, status: normalizedNewStatus }
      );
      const updatedCart = {
        ...cart,
        items: cascadedItems,
        status: normalizedNewStatus,
        statusHistory: [...(cart.statusHistory || []), statusEntry]
      };

      // Update assigned staff when work starts on a cart
      if (normalizedNewStatus === FULFILLMENT_STATUS.PREPARING || normalizedNewStatus === FULFILLMENT_STATUS.READY) {
        updatedCart.assignedTo = userId;
      }

      // Update the cart in the order
      const updatedCarts = [...orderData.carts];
      updatedCarts[cartIndex] = updatedCart;

      // Cascade to the flat order.items copy too. Without this the customer's
      // bill still listed a cancelled dish while the total had already dropped,
      // so the lines did not add up to what they were asked to pay.
      // Match on cartId: cartItemId restarts at 1 in each new cart, so it alone
      // would also hit an unrelated item in another round. Items written before
      // cartId existed carry none and are left alone — the total stays correct,
      // only the stale line remains, which is how it behaved before this fix.
      const flatItems = Array.isArray(orderData.items)
        ? orderData.items.map(item => {
            if (!item.cartId || item.cartId !== cart.cartId) return item;
            return keepsOwnStatus(item) ? item : { ...item, status: normalizedNewStatus };
          })
        : orderData.items;

      // Deliberately NOT writing sessionId here: the caller is staff, but
      // order.sessionId must stay the customer session from checkout — offer
      // eligibility at COMPLETED reads that session's order history.
      const updates = {
        carts: updatedCarts,
        ...(Array.isArray(orderData.items) ? { items: flatItems } : {}),
        updatedAt: timestamp.now()
      };

      // A cancelled/returned cart leaves the bill now, not at COMPLETED, so
      // waiter and consumer screens show what the customer will actually pay.
      if (billChanges) {
        const { priceInfo, appliedOffer } = await buildOrderPriceInfo(
          restaurantId, updatedCarts, orderData.sessionId, chargesConfig, orderId
        );
        updates.priceInfo = priceInfo;
        updates.appliedOffer = appliedOffer;
      }

      // Check if all active items are now served
      if (normalizedNewStatus === FULFILLMENT_STATUS.SERVED) {
        const allActiveCartsServed = updatedCarts.every(c =>
          OrderInputValidation.validateCartStatus(c.status) === FULFILLMENT_STATUS.SERVED ||
          OrderInputValidation.validateCartStatus(c.status) === FULFILLMENT_STATUS.CANCELLED ||
          OrderInputValidation.validateCartStatus(c.status) === FULFILLMENT_STATUS.RETURNED
        );

        if (allActiveCartsServed) {
          // console.log(`All active items served for order ${orderId} in restaurant ${restaurantId}. Table: ${orderData.tableId}`);
          // TODO: Consider updating orderStatus to COMPLETED and notifying user/session.
          // Example: updates.orderStatus = ORDER_STATUS.COMPLETED;
        }
      }

      transaction.update(orderRef, updates);

      // Return the updated order data reflecting the transaction changes
      return {
        id: orderId,
        ...orderData,
        ...updates // Apply the updates to the returned data
      };
    });
  } catch (error) {
    console.error(`updateCartStatus: Error updating cart status for order ${orderId}:`, error);
    throw error; // Re-throw error to be caught by the main function
  }
}

module.exports = updateCartStatus; 

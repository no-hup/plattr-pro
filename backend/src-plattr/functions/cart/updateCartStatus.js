const functions = require("firebase-functions");
const admin = require('../admin/initializeAdmin');
const db = admin.firestore();
const { Timestamp } = require("firebase-admin/firestore");
const { CART_STATUS } = require('../orders/orderConstants');
const OrderInputValidation = require('../orders/orderInputValidation');
const { timestamp } = require('../utils/timestamp');

// Valid status transitions map
const VALID_TRANSITIONS = {
  'pending': ['accepted', 'cancelled'],
  'accepted': ['preparing', 'cancelled'],
  'preparing': ['ready', 'cancelled'],
  'ready': ['served', 'cancelled'],
  'served': ['returned'],
  'cancelled': [],
  'returned': []
};

/**
 * Updates the status of a specific cart in an order
 * HTTP Callable function
 * 
 * @param {Object} data - Input data with restaurantId, orderId, cartIndex, newStatus, notes (optional), sessionId (optional)
 */
const updateCartStatus = functions.https.onCall(async (data, context) => {
  try {
    console.log("poopoo Received updateCartStatus request:", JSON.stringify(data));
    // TODO: Re-enable auth check when ready
    // if (!context.auth) {
    //   throw new functions.https.HttpsError(
    //     'unauthenticated',
    //     'User must be authenticated to update cart status'
    //   );
    // }
    
    OrderInputValidation.validateUpdateCartStatusFields(data);
    
    const { restaurantId, orderId, cartIndex, newStatus, notes = '', sessionId } = data;
    const userId = context.auth?.uid || 'system';  // Fallback to 'system' if no auth

    // Validate session if provided
    if (sessionId) {
      const sessionRef = db
        .collection('restaurants')
        .doc(restaurantId)
        .collection('sessions')
        .doc(sessionId);
      
      const sessionDoc = await sessionRef.get();
      if (!sessionDoc.exists || sessionDoc.data().status !== 'active') {
        throw new functions.https.HttpsError(
          'failed-precondition',
          'Invalid or inactive session'
        );
      }
    }
    
    // Update the cart status using the internal function
    const updatedOrder = await _updateCartStatus(
      restaurantId,
      orderId,
      cartIndex,
      newStatus,
      userId,
      notes,
      sessionId
    );
    
    return {
      success: true,
      message: `Cart status updated to ${newStatus}`,
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
  sessionId = null
) {
  const orderRef = db.collection("restaurants")
    .doc(restaurantId)
    .collection("orders")
    .doc(orderId);

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
      const currentStatus = cart.status;
      
      // Validate status transition
      if (!isValidStatusTransition(currentStatus, newStatus)) {
        throw new Error(`Invalid status transition from ${currentStatus} to ${newStatus}`);
      }
      
      // Create status history entry
      const statusEntry = {
        status: newStatus,
        timestamp: timestamp.now(),
        userId: userId,
        notes: notes
      };
      
      // Update cart status
      const updatedCart = {
        ...cart,
        status: newStatus,
        statusHistory: [...(cart.statusHistory || []), statusEntry]
      };
      
      // Update assigned staff if status is accepted
      if (newStatus === CART_STATUS.ACCEPTED) {
        updatedCart.assignedTo = userId;
      }
      
      // Update the cart in the order
      const updatedCarts = [...orderData.carts];
      updatedCarts[cartIndex] = updatedCart;
      
      const updates = {
        carts: updatedCarts,
        updatedAt: timestamp.now(),
        ...(sessionId && { sessionId })
      };
      
      // Check if all active items are now served
      if (newStatus === CART_STATUS.SERVED) {
        const allActiveCartsServed = updatedCarts.every(c => 
          c.status === CART_STATUS.SERVED || 
          c.status === CART_STATUS.CANCELLED || 
          c.status === CART_STATUS.RETURNED
        );
        
        if (allActiveCartsServed) {
          console.log(`poopoo All active items served for order ${orderId} in restaurant ${restaurantId}. Table: ${orderData.tableId}`);
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

/**
 * Validates if a status transition is allowed
 * @param {string} currentStatus - Current status
 * @param {string} newStatus - Proposed new status
 * @returns {boolean} Whether the transition is valid
 */
function isValidStatusTransition(currentStatus, newStatus) {
  // Check if the current status exists in our transition map
  if (!VALID_TRANSITIONS.hasOwnProperty(currentStatus)) {
    return false;
  }
  
  // Check if the new status is a valid transition from the current status
  return VALID_TRANSITIONS[currentStatus].includes(newStatus);
}

module.exports = updateCartStatus; 
const functions = require('firebase-functions');
const admin = require('../admin/admin');
const db = admin.firestore();
const { Timestamp } = require("firebase-admin/firestore");
const { FULFILLMENT_STATUS, ORDER_STATUS, PAYMENT_STATUS } = require('./orderConstants');
const featureFlags = require('../singleton/FeatureFlags');
const { calculateCartValue } = require('../cart/calculateCartValue');
const OrderInputValidation = require('./orderInputValidation');
const { timestamp } = require('../utils/timestamp');

/**
 * Updates the status of a specific menu item within an order
 * This API is designed for chef-side operations and doesn't require sessionId
 * 
 * @param {Object} data - Request data containing orderId, itemId, and new status
 * @param {Object} context - Firebase context containing auth information
 * @returns {Object} Success/error message and updated order details
 */
const updateMenuItemStatus = functions.https.onCall(async (data, context) => {
  try {
    // Authentication check - Chef must be authenticated
    if (!context.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'You must be logged in to update item status'
      );
    }
    
    // Validate inputs
    OrderInputValidation.validateUpdateMenuItemStatusFields(data);
    const { restaurantId, orderId, menuItemId, cartItemId, newStatus } = data;
    
    // Get the order document
    const orderRef = db.collection('restaurants').doc(restaurantId)
      .collection('orders').doc(orderId);
    
    return await db.runTransaction(async (transaction) => {
      const orderDoc = await transaction.get(orderRef);
      
      if (!orderDoc.exists) {
        throw new functions.https.HttpsError('not-found', 'Order not found');
      }
      
      const order = orderDoc.data();
      
      // Check if order is in progress
      if (order.orderStatus !== ORDER_STATUS.IN_PROGRESS) {
        throw new functions.https.HttpsError(
          'failed-precondition',
          'Cannot update items in a non-active order'
        );
      }
      
      // Track whether we found and updated the item
      let itemFound = false;
      let updatedOrder = {...order};
      
      // Find the item in the order.items array
      if (updatedOrder.items && Array.isArray(updatedOrder.items)) {
        const itemIndex = updatedOrder.items.findIndex(item => 
          item.menuItemId === menuItemId && 
          (cartItemId ? item.cartItemId === cartItemId : true)
        );
        
        if (itemIndex !== -1) {
          // Add or update status in the item
          updatedOrder.items[itemIndex].status = newStatus;
          updatedOrder.items[itemIndex].statusUpdatedAt = timestamp.now();
          updatedOrder.items[itemIndex].statusUpdatedBy = context.auth.uid;
          itemFound = true;
          
          // Special handling for cancelled items
          if (newStatus === FULFILLMENT_STATUS.CANCELLED) {
            // Mark this item as cancelled in all relevant cart items too
            let needsPriceRecalculation = false;
            
            // Find which cart contains this item
            updatedOrder.carts.forEach((cart, cartIndex) => {
              if (cart.items && Array.isArray(cart.items)) {
                const cartItemIndex = cart.items.findIndex(item => 
                  item.menuItemId === menuItemId && 
                  (cartItemId ? item.cartItemId === cartItemId : true)
                );
                
                if (cartItemIndex !== -1) {
                  // Update the status in cart.items
                  updatedOrder.carts[cartIndex].items[cartItemIndex].status = FULFILLMENT_STATUS.CANCELLED;
                  updatedOrder.carts[cartIndex].items[cartItemIndex].statusUpdatedAt = timestamp.now();
                  updatedOrder.carts[cartIndex].items[cartItemIndex].statusUpdatedBy = context.auth.uid;
                  needsPriceRecalculation = true;
                }
              }
            });
            
            // Recalculate prices if needed due to cancellation
            if (needsPriceRecalculation) {
              // Recalculate each cart's price
              for (let i = 0; i < updatedOrder.carts.length; i++) {
                // Calculate new price directly without filtering
                const updatedPriceInfo = await calculateCartValue(updatedOrder.carts[i]);
                updatedOrder.carts[i].priceInfo = updatedPriceInfo;
              }
              
              // Recalculate total order price across all carts
              const recalculatedTotalPrice = calculateTotalPriceInfo(updatedOrder.carts);
              updatedOrder.priceInfo = recalculatedTotalPrice;
            }
          }
        }
      }
      
      if (!itemFound) {
        throw new functions.https.HttpsError(
          'not-found',
          'Menu item not found in this order'
        );
      }
      
      // Update the order with all our changes
      updatedOrder.updatedAt = timestamp.now();
      transaction.update(orderRef, updatedOrder);
      
      return {
        status: 'success',
        message: `Item status updated to ${newStatus}`,
        data: {
          orderId,
          menuItemId,
          newStatus,
          updatedAt: updatedOrder.updatedAt.toDate().toISOString()
        }
      };
    });
    
  } catch (error) {
    console.error(`Error updating menu item status: ${error.message}`);
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    throw new functions.https.HttpsError('internal', 'Error updating menu item status');
  }
});

/**
 * Calculates total price information across all carts
 * @param {Array} carts - Array of cart objects
 * @returns {Object} Aggregated price information
 */
function calculateTotalPriceInfo(carts) {
  const totalPriceInfo = {
    basePrice: 0,
    finalPrice: 0,
    totalDiscount: 0,
    totalDiscountAmount: 0
  };
  
  if (!carts || carts.length === 0) {
    return totalPriceInfo;
  }
  
  carts.forEach(cart => {
    if (cart.priceInfo) {
      totalPriceInfo.basePrice += cart.priceInfo.basePrice || 0;
      totalPriceInfo.finalPrice += cart.priceInfo.finalPrice || 0;
      totalPriceInfo.totalDiscount += cart.priceInfo.totalDiscount || 0;
      totalPriceInfo.totalDiscountAmount += cart.priceInfo.totalDiscountAmount || 0;
    }
  });
  
  return totalPriceInfo;
}

module.exports = {
  updateMenuItemStatus
}; 

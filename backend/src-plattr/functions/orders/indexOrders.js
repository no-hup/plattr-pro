const updateCartStatus = require('../cart/updateCartStatus');
const getOrder = require('./getOrder');
const functions = require('firebase-functions');
const { getActiveOrdersForRestaurant: getActiveOrdersForRestaurantHandler } = require('./getActiveOrdersForRestaurant');
const getActiveOrdersForRestaurant = functions.https.onCall(getActiveOrdersForRestaurantHandler);
const { getActiveCartsForKitchen: getActiveCartsForKitchenHandler } = require('./getActiveCartsForKitchen');
const getActiveCartsForKitchen = functions.https.onCall(getActiveCartsForKitchenHandler);
const createOrUpdateOrder = require('./createOrUpdateOrder').createOrUpdateOrder;
const { ORDER_STATUS, PAYMENT_STATUS, FULFILLMENT_STATUS, STATUS_COLOR_HEX, SERVED_CARTS_LOOKBACK_HOURS } = require('./orderConstants');
const OrderInputValidation = require('./orderInputValidation');
const { updateOrderStatus } = require('./updateOrderStatus');
const { markCartAsServed } = require('./markCartAsServed');
const { getServedCartsForServer } = require('./getServedCartsForServer');


// Export all order-related functions with their complete signatures
module.exports = {
  updateCartStatus,
  getOrder,
  getActiveOrdersForRestaurant,
  getActiveCartsForKitchen,
  createOrUpdateOrder,
  updateOrderStatus,
  markCartAsServed,
  getServedCartsForServer,
  ORDER_STATUS,
  PAYMENT_STATUS,
  FULFILLMENT_STATUS,
  STATUS_COLOR_HEX,
  SERVED_CARTS_LOOKBACK_HOURS,
  OrderInputValidation
}; 

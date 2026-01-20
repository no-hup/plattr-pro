const updateCartStatus = require('../cart/updateCartStatus');
const getOrder = require('./getOrder');
const functions = require('firebase-functions');
const { getActiveOrdersForRestaurant: getActiveOrdersForRestaurantHandler } = require('./getActiveOrdersForRestaurant');
const getActiveOrdersForRestaurant = functions.https.onCall(getActiveOrdersForRestaurantHandler);
const createOrUpdateOrder = require('./createOrUpdateOrder').createOrUpdateOrder;
const { ORDER_STATUS, PAYMENT_STATUS, CART_STATUS } = require('./orderConstants');
const OrderInputValidation = require('./orderInputValidation');
const { updateOrderStatus } = require('./updateOrderStatus');


// Export all order-related functions with their complete signatures
module.exports = {
  updateCartStatus,
  getOrder,
  getActiveOrdersForRestaurant,
  createOrUpdateOrder,
  updateOrderStatus,
  ORDER_STATUS,
  PAYMENT_STATUS,
  CART_STATUS,
  OrderInputValidation
}; 
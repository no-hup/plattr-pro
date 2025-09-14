const addItemToCart = require('./addItemToCart');
const clearCart = require('./clearCart');
const removeItemFromCart = require('./removeItemFromCart');
const checkoutCart = require('./checkoutCart');
const orderTriggers = require('./triggers/orderTriggers');
const getCart = require('./getCart');

module.exports = {
  addItemToCart,
  clearCart,
  removeItemFromCart,
  checkoutCart,
  getCart,
  ...orderTriggers
};
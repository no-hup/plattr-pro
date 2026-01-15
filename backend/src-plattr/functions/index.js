const functions = require("firebase-functions");
const admin = require('./admin/admin');

// Import and export functions from other files
const tableFunctions = require('./table/table');
const serverFunctions = require('./server/server');
const customerFunctions = require('./customer/customer');
const cartFunctions = require('./cart/indexCart');
const menuFunctions = require('./menu/indexMenu');
const orderFunctions = require('./orders/indexOrders');
const devFunctions = require('./dev/indexDev');
const offersFunctions = require('./offers/indexOffers');

exports.table = tableFunctions;
exports.server = serverFunctions;
exports.customer = customerFunctions;
exports.cart = cartFunctions;
exports.menu = menuFunctions;
exports.dev = devFunctions;
exports.offers = offersFunctions;

// Export order functions using the orderFunctions import
exports.order = {
  getOrder: orderFunctions.getOrder,
  createOrder: orderFunctions.createOrUpdateOrder,
  updateCartStatus: orderFunctions.updateCartStatus,
  getActiveOrdersForRestaurant: orderFunctions.getActiveOrdersForRestaurant
};

exports.helloWorld = functions.https.onRequest((req, res) => {
  res.send("Hello from Firebase!");
});

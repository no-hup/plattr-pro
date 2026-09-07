const functions = require("firebase-functions");
const { setGlobalOptions } = require("firebase-functions/v2");
console.error("AG_DEBUG: Loading functions/index.js");

// Bill guard: cap instances so a runaway polling client can't scale us up.
setGlobalOptions({ maxInstances: 10 });
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
const adminAppFunctions = require('./adminApp/indexAdminApp');
const adminMenuFunctions = require('./adminApp/menu_admin');

exports.table = tableFunctions;
exports.server = serverFunctions;
exports.customer = customerFunctions;
exports.cart = {
  ...cartFunctions,
  updateCartStatus: orderFunctions.updateCartStatus
};
exports.menu = menuFunctions;
exports.dev = devFunctions;
exports.offers = offersFunctions;
exports.adminApp = adminAppFunctions;

// Admin-prefixed endpoints for Admin app usage
exports['admin-getRestaurantSettings'] = adminAppFunctions.getRestaurantSettings;
exports['admin-updateRestaurantSettings'] =
  adminAppFunctions.updateRestaurantSettings;
exports['admin-addCategory'] = adminMenuFunctions.addCategory;
exports['admin-updateCategory'] = adminMenuFunctions.updateCategory;
exports['admin-deleteCategory'] = adminMenuFunctions.deleteCategory;
exports['admin-addSubcategory'] = adminMenuFunctions.addSubcategory;
exports['admin-updateSubcategory'] = adminMenuFunctions.updateSubcategory;
exports['admin-deleteSubcategory'] = adminMenuFunctions.deleteSubcategory;

// Staff Management (Phase 4)
exports['admin-getServers'] = adminAppFunctions.getServers;
exports['admin-addServer'] = adminAppFunctions.addServer;
exports['admin-updateServer'] = adminAppFunctions.updateServer;
exports['admin-resetServerPin'] = adminAppFunctions.resetServerPin;

// Table Management (Phase 4)
exports['admin-getTables'] = adminAppFunctions.getTables;
exports['admin-updateTableStatus'] = adminAppFunctions.updateTableStatus;
exports['admin-updateTable'] = adminAppFunctions.updateTable;

// Historical Orders (Phase 5)
exports['admin-getHistoricalOrders'] = adminAppFunctions.getHistoricalOrders;
exports['admin-getOrderDetails'] = adminAppFunctions.getOrderDetails;

// Offers Management (Offers V2)
exports['admin-getOffers'] = adminAppFunctions.getOffers;
exports['admin-createOffer'] = adminAppFunctions.createOffer;
exports['admin-updateOffer'] = adminAppFunctions.updateOffer;
exports['admin-deleteOffer'] = adminAppFunctions.deleteOffer;

// Export order functions using the orderFunctions import
// NOTE: createOrUpdateOrder is intentionally NOT exported — it is a bare async
// helper (not an onCall function) used internally by checkoutCart.
exports.order = {
  getOrder: orderFunctions.getOrder,
  updateOrderStatus: orderFunctions.updateOrderStatus,
  getActiveOrdersForRestaurant: orderFunctions.getActiveOrdersForRestaurant,
  getActiveCartsForKitchen: orderFunctions.getActiveCartsForKitchen,
  markCartAsServed: orderFunctions.markCartAsServed,
  getServedCartsForServer: orderFunctions.getServedCartsForServer
};

exports.helloWorld = functions.https.onRequest((req, res) => {
  res.send("Hello from Firebase!");
});

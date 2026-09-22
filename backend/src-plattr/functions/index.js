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

// FL: move is a table verb, so it joins the table group rather than opening a second door (OR-4).
// The group must stay a nested export — see INFRASTRUCTURE.md, the Cloud Run requirement.
exports.table = {
  ...tableFunctions,
  moveTable: require('./lib/api/floor').moveHandler,
  setMerge: require('./lib/api/floor').setMergeHandler,
  // FL-S36 / TD-044: the idle sweep's manual trigger (emulator-only); the schedule is floor.releaseIdleTables.
  cleanupInactiveSessions: require('./lib/api/floor').idleSweepHandler,
};
exports.server = serverFunctions;
exports.customer = customerFunctions;
exports.cart = {
  ...cartFunctions,
  updateCartStatus: orderFunctions.updateCartStatus
};
exports.menu = menuFunctions;
exports.dev = devFunctions;
exports.offers = offersFunctions;
// Admin app endpoints. MUST be a nested group: Cloud Run maps the id `admin-x` to the module path
// `admin.x`, so a flat `exports['admin-x']` key deploys but the container can't find it at runtime.
exports.admin = {
  getRestaurantSettings: adminAppFunctions.getRestaurantSettings,
  updateRestaurantSettings: adminAppFunctions.updateRestaurantSettings,
  addCategory: adminMenuFunctions.addCategory,
  updateCategory: adminMenuFunctions.updateCategory,
  deleteCategory: adminMenuFunctions.deleteCategory,
  addSubcategory: adminMenuFunctions.addSubcategory,
  updateSubcategory: adminMenuFunctions.updateSubcategory,
  deleteSubcategory: adminMenuFunctions.deleteSubcategory,
  getServers: adminAppFunctions.getServers,
  addServer: adminAppFunctions.addServer,
  updateServer: adminAppFunctions.updateServer,
  resetServerPin: adminAppFunctions.resetServerPin,
  getTables: adminAppFunctions.getTables,
  updateTableStatus: adminAppFunctions.updateTableStatus,
  updateTable: adminAppFunctions.updateTable,
  getHistoricalOrders: adminAppFunctions.getHistoricalOrders,
  getOrderDetails: adminAppFunctions.getOrderDetails,
  getOffers: adminAppFunctions.getOffers,
  createOffer: adminAppFunctions.createOffer,
  updateOffer: adminAppFunctions.updateOffer,
  deleteOffer: adminAppFunctions.deleteOffer,
};

// Admin-prefixed endpoints for Admin app usage

// Staff Management (Phase 4)

// Table Management (Phase 4)

// Historical Orders (Phase 5)

// Offers Management (Offers V2)

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

// New POS layers (moonshot/): TypeScript compiled into lib/ by `npm run build` (emu.sh and predeploy run it).
// Nested group, same reason as `admin`: the id `approvals-apply` maps to the module path `approvals.apply`.
exports.approvals = {
  apply: require('./lib/api/approvals').applyHandler,
  config: require('./lib/api/approvals').configHandler,
};
exports.payments = {
  take: require('./lib/api/payments').takeHandler,
  refund: require('./lib/api/payments').refundHandler,
  void: require('./lib/api/payments').voidHandler,
  list: require('./lib/api/payments').listHandler,
};
exports.dayClose = {
  close: require('./lib/api/dayClose').closeHandler,
  get: require('./lib/api/dayClose').getHandler,
  move: require('./lib/api/dayClose').moveHandler,
  voidMove: require('./lib/api/dayClose').voidMoveHandler,
};
exports.floor = {
  get: require('./lib/api/floor').getHandler,
  open: require('./lib/api/floor').openHandler,
  clear: require('./lib/api/floor').clearHandler,
  releaseIdleTables: require('./lib/api/floor').releaseIdleTables,   // FL-S36: every 5 minutes; the emulator never fires it
};
exports.billing = {
  preview: require('./lib/api/billing').previewHandler,
  issue: require('./lib/api/billing').issueHandler,
  cancel: require('./lib/api/billing').cancelHandler,
  creditNote: require('./lib/api/billing').creditNoteHandler,
  split: require('./lib/api/billing').splitHandler,
  get: require('./lib/api/billing').getHandler,
};

exports.helloWorld = functions.https.onRequest((req, res) => {
  res.send("Hello from Firebase!");
});

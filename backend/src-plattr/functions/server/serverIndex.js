const functions = require('firebase-functions');
const { admin, db, FieldValue } = require('../admin/admin');
const timestamp = require('../utils/timestamp');
const errorHandler = require('../singleton/ErrorHandler');
const ResponseBuilder = require('../utils/ResponseBuilder');

// Import modular server logic
const tablesFetch = require('./tables_fetch');
const tableOTP = require('./table_otp');
const { serverGetOrderDetails } = require('../orders/serverGetOrderDetails');
const { serverMarkItemServed } = require('../orders/serverMarkItemServed');

// --- Exported Functions ---
// Table-related (using restaurant-scoped collections)
exports.getTables = tablesFetch.getTables;
exports.generateTableOTP = tableOTP.generateTableOTP;
exports.getOrderDetails = serverGetOrderDetails;
exports.markItemServed = serverMarkItemServed;

// --- Server Authentication ---
// Server login/session management is handled by server_auth.js
// which correctly uses restaurant-scoped collections:
// - restaurants/{restaurantId}/servers
// - restaurants/{restaurantId}/sessions

// --- Table Assignment ---
// Table assignment is handled by table.js:
// - table.assignTableToServer
// - table.unassignTableFromServer
// These functions use restaurant-scoped collections:
// - restaurants/{restaurantId}/tables
// - restaurants/{restaurantId}/servers

// NOTE: Legacy CRUD functions (createServer, updateServer, getServer, 
// assignTable, unassignTable) were removed as they used top-level 
// collections incompatible with multi-tenant architecture.

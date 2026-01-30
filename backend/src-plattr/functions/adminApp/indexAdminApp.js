const settings = require('./settings');
const menuAdmin = require('./menu_admin');
const staffAdmin = require('./staff_admin');
const tablesAdmin = require('./tables_admin');
const ordersAdmin = require('./orders_admin');

module.exports = {
    // Settings
    getRestaurantSettings: settings.getRestaurantSettings,
    updateRestaurantSettings: settings.updateRestaurantSettings,

    // Staff Management
    getServers: staffAdmin.getServers,
    addServer: staffAdmin.addServer,
    updateServer: staffAdmin.updateServer,
    resetServerPin: staffAdmin.resetServerPin,

    // Table Management
    getTables: tablesAdmin.getTables,
    updateTableStatus: tablesAdmin.updateTableStatus,
    updateTable: tablesAdmin.updateTable,

    // Orders
    getHistoricalOrders: ordersAdmin.getHistoricalOrders,
    getOrderDetails: ordersAdmin.getOrderDetails,

    // Menu Management
    addCategory: menuAdmin.addCategory,
    updateCategory: menuAdmin.updateCategory,
    deleteCategory: menuAdmin.deleteCategory,
    addSubcategory: menuAdmin.addSubcategory,
    updateSubcategory: menuAdmin.updateSubcategory,
    deleteSubcategory: menuAdmin.deleteSubcategory,
};

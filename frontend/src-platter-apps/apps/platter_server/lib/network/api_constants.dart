// API constants for Platter Server App

/// Constants for API endpoints and other network-related values
class ApiConstants {
  // Base URL is now managed by AppConfig
  static const String getOrder = '/order-getOrder';
  static const String getActiveOrdersForRestaurant = '/order-getActiveOrdersForRestaurant';
  static const String serverLogin = '/server-serverLogin';
  
  // Table endpoints (cloud functions)
  static const String getRestaurantTables = '/table-getTablesForRestaurant';
  // Base path for table details; append tableId
  static const String getTableDetails = '/table-getTableDetails';
  static const String updateTableStatus = '/table-updateTableStatus';
  static const String generateTableOTP = '/table-generateTableOTP';
  
  // Menu endpoints
  static const String getRestaurantMenu = '/menu-getRestaurantMenu';
  static const String updateMenuItemAvailability = '/menu-updateMenuItemAvailability';
}

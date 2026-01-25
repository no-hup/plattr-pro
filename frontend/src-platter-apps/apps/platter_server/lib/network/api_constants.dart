// API constants for Platter Server App

/// Constants for API endpoints and other network-related values
class ApiConstants {
  // Base URL is now managed by AppConfig
  static const String getOrder = '/order-getOrder';
  static const String getOrderDetails = '/server-getOrderDetails';
  static const String getActiveOrdersForRestaurant = '/order-getActiveOrdersForRestaurant';
  static const String updateOrderStatus = '/order-updateOrderStatus';
  static const String markCartAsServed = '/order-markCartAsServed';
  static const String getServedCartsForServer = '/order-getServedCartsForServer';
  static const String serverLogin = '/server-serverLogin';
  
  // Table endpoints (cloud functions)
  static const String getRestaurantTables = '/table-getTablesForRestaurant';
  // Base path for table details; append tableId
  static const String getTableDetails = '/table-getTableDetails';
  static const String updateTableStatus = '/table-updateTableStatus';
  static const String generateTableOTP = '/table-generateTableOTP';
  
  // Cart endpoints
  static const String updateCartStatus = '/cart-updateCartStatus';
  static const String removeItemFromCart = '/cart-removeItemFromCart';

  // Server-specific order item endpoints
  static const String markItemServed = '/server-markItemServed';
  
  // Menu endpoints
  static const String getRestaurantMenu = '/menu-getRestaurantMenu';
  static const String updateMenuItemAvailability = '/menu-updateMenuItemAvailability';
}


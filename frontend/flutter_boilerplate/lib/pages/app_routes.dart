class AppRoutes {
  // Base paths
  static const String home = '/';
  static const String welcome = '/welcome';
  
  // Path builders
  static String tableVerification(String restaurantId, String tableId) => 
    '/r/$restaurantId/t/$tableId';
  
  static String verifyDirect(String restaurantId, String tableId) => 
    '/r/$restaurantId/t/$tableId/verify';
  
  static String menu(String restaurantId, String tableId) => 
    '/r/$restaurantId/t/$tableId/menu';
  
  static String cart(String restaurantId, String tableId) => 
    '/r/$restaurantId/t/$tableId/cart';
  
  static String orders(String restaurantId, String tableId) => 
    '/r/$restaurantId/t/$tableId/orders';
    
  static String orderDetails(String restaurantId, String tableId, String orderId) => 
    '/r/$restaurantId/t/$tableId/orders/$orderId';

  // Named routes
  static const String tablePath = '/r/:restaurantId/t/:tableId';
  static const String verifyPath = '/r/:restaurantId/t/:tableId/verify';
  static const String menuPath = '/r/:restaurantId/t/:tableId/menu';
  static const String cartPath = '/r/:restaurantId/t/:tableId/cart';
  static const String ordersPath = '/r/:restaurantId/t/:tableId/orders';
  static const String orderDetailsPath = '/r/:restaurantId/t/:tableId/orders/:orderId';
}

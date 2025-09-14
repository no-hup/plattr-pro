import 'package:flutter/foundation.dart';
import 'models/order_summary.dart';
import 'models/cart_summary.dart';
import 'repository/order_api_service.dart';

enum DataState { initial, loading, loaded, error }

class OrdersProvider extends ChangeNotifier {
  final OrderApiService _apiService;
  
  // State variables
  DataState _state = DataState.initial;
  List<OrderSummary> _orders = [];
  String? _errorMessage;
  bool _isRefreshing = false;
  
  // Public getters
  DataState get state => _state;
  List<OrderSummary> get orders => _orders;
  String? get errorMessage => _errorMessage;
  bool get isRefreshing => _isRefreshing;
  bool get hasOrders => _orders.isNotEmpty;
  
  OrdersProvider({required OrderApiService apiService}) : _apiService = apiService;
  
  // Filter getters
  List<OrderSummary> getOrdersByStatus(String status) {
    return _orders.where((order) => order.status == status).toList();
  }

  Future<void> fetchActiveOrders({
    required String restaurantId,
    required String sessionId,
    String? serverId,
  }) async {
    if (_state == DataState.loading && !_isRefreshing) return;
    
    // Set loading state
    _state = DataState.loading;
    if (!_isRefreshing) {
      _errorMessage = null;
      notifyListeners();
    }
    
    try {
      // Call API service
      final response = await _apiService.getActiveOrdersForRestaurant(
        restaurantId: restaurantId,
        sessionId: sessionId,
        serverId: serverId,
      );
      
      // Handle response
      if (response.success && response.data != null) {
        // Filter out cart items with status 'completed' or 'cancelled'
        _orders = response.data!.orders.map((order) {
          // Filter carts to include only items that are not completed or cancelled
          final filteredCarts = order.carts.map((cart) {
            final filteredItems = cart.items.where((item) {
              final statusLower = item.status.toLowerCase();
              return statusLower != 'completed' && statusLower != 'cancelled';
            }).toList();
            return CartSummary(
              cartId: cart.cartId,
              status: cart.status,
              items: filteredItems,
            );
          }).where((cart) => cart.items.isNotEmpty).toList();

          // Return new order containing only active carts
          return OrderSummary(
            orderId: order.orderId,
            tableId: order.tableId,
            status: order.status,
            carts: filteredCarts,
            assignedTo: order.assignedTo,
          );
        }).where((order) => order.carts.isNotEmpty).toList();
        _state = DataState.loaded;
        _errorMessage = null;
      } else {
        _errorMessage = response.message ?? 'Failed to fetch orders';
        _state = DataState.error;
      }
    } catch (e) {
      _errorMessage = 'Unexpected error: $e';
      _state = DataState.error;
    } finally {
      _isRefreshing = false;
      notifyListeners();
    }
  }
  
  Future<void> refreshOrders({
    required String restaurantId,
    required String sessionId,
    String? serverId,
  }) async {
    _isRefreshing = true;
    await fetchActiveOrders(
      restaurantId: restaurantId,
      sessionId: sessionId,
      serverId: serverId,
    );
  }

  // Method to update order status if needed
  Future<void> updateOrderStatus({
    required String orderId,
    required String status,
    required String restaurantId,
    required String sessionId,
  }) async {
    // This would be implemented once the API endpoint is available
    // For now, just update local state
    final index = _orders.indexWhere((order) => order.orderId == orderId);
    if (index >= 0) {
      // You would typically call an API here
      // For now, just update local state for demo
      // final response = await _apiService.updateOrderStatus(...);
      
      // Create a new list to trigger UI updates
      final updatedOrders = List<OrderSummary>.from(_orders);
      // This is a simplistic approach - in real implementation,
      // we would create a new OrderSummary object with updated status
      // updatedOrders[index] = OrderSummary(...);
      
      // For demonstration only - you'd replace this with actual API integration
      _orders = updatedOrders;
      notifyListeners();
    }
  }
}

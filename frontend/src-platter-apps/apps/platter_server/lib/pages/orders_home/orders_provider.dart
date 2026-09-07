import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:platter_core/platter_core.dart';
import '../../shared/status_utils.dart';
import 'models/order_summary.dart';
import 'models/cart_summary.dart';
import 'models/cart_item_summary.dart';
import 'models/served_cart.dart';
import 'models/ui_flags.dart';
import 'repository/order_api_service.dart';


/// Category tabs for the Orders Home screen
enum OrderTab {
  myOrders,
  ready,
  pending,
  served,
  allOrders,
}

/// Represents a flattened cart card for display in the grid
class CartCard {
  final String orderId;
  final String tableId;
  final String orderNumber;
  final String cartId;
  final int cartIndex;
  final String cartStatus;
  final String cartStatusColorHex;
  final num finalPrice;
  final List<CartItemSummary> items;

  CartCard({
    required this.orderId,
    required this.tableId,
    this.orderNumber = '',
    required this.cartId,
    required this.cartIndex,
    required this.cartStatus,
    this.cartStatusColorHex = '',
    required this.finalPrice,
    required this.items,
  });

  /// Create a CartCard from an OrderSummary and CartSummary
  factory CartCard.fromOrderAndCart(OrderSummary order, CartSummary cart) {
    return CartCard(
      orderId: order.orderId,
      tableId: order.tableId,
      orderNumber: order.orderId, // TODO: Add orderNumber to OrderSummary
      cartId: cart.cartId,
      cartIndex: cart.cartIndex,
      cartStatus: cart.status,
      cartStatusColorHex: cart.statusColorHex,
      finalPrice: order.finalPrice,
      items: cart.items,
    );
  }

  /// Create a CartCard from a ServedCart
  factory CartCard.fromServedCart(ServedCart served) {
    return CartCard(
      orderId: served.orderId,
      tableId: served.tableId,
      orderNumber: served.orderNumber,
      cartId: served.cartId,
      cartIndex: served.cartIndex,
      cartStatus: served.status,
      cartStatusColorHex: served.statusColorHex,
      finalPrice: served.finalPrice,
      items: served.items,
    );
  }
}

class OrdersProvider extends ChangeNotifier {
  final OrderApiService _apiService;

  // State variables
  DataState _state = DataState.initial;
  List<OrderSummary> _orders = [];
  List<ServedCart> _servedCarts = [];
  String? _errorMessage;
  bool _isRefreshing = false;
  String _currentServerId = '';
  UiFlags _uiFlags = UiFlags.defaults();

  // Public getters
  DataState get state => _state;
  List<OrderSummary> get orders => _orders;
  List<ServedCart> get servedCarts => _servedCarts;
  String? get errorMessage => _errorMessage;
  bool get isRefreshing => _isRefreshing;
  bool get hasOrders => _orders.isNotEmpty;
  String get currentServerId => _currentServerId;
  UiFlags get uiFlags => _uiFlags;

  OrdersProvider({required OrderApiService apiService})
      : _apiService = apiService;

  // Live-poll state (pattern copied from platter_kitchen's KitchenLiveProvider)
  Timer? _pollingTimer;
  bool _inFlight = false;
  static const Duration pollingInterval = Duration(seconds: 20);

  /// Starts polling active orders and does an immediate fetch. Served carts
  /// are fetched on tab-select, not polled.
  void startPolling({
    required String restaurantId,
    required String sessionId,
    String? serverId,
  }) {
    _pollingTimer?.cancel();
    // First load shows the spinner; re-activation (tab switch / app resume)
    // refreshes silently over the last-good list instead of flashing it.
    fetchActiveOrders(
      restaurantId: restaurantId,
      sessionId: sessionId,
      serverId: serverId,
      isBackgroundPoll: _orders.isNotEmpty,
    );
    _pollingTimer = Timer.periodic(pollingInterval, (_) {
      fetchActiveOrders(
        restaurantId: restaurantId,
        sessionId: sessionId,
        serverId: serverId,
        isBackgroundPoll: true,
      );
    });
  }

  void stopPolling() {
    _pollingTimer?.cancel();
    _pollingTimer = null;
  }

  @override
  void dispose() {
    stopPolling();
    super.dispose();
  }

  /// Flatten orders into cart cards for grid display
  List<CartCard> get allCartCards {
    final cards = <CartCard>[];
    for (final order in _orders) {
      for (final cart in order.carts) {
        cards.add(CartCard.fromOrderAndCart(order, cart));
      }
    }
    return cards;
  }

  /// Get cart cards filtered by tab
  List<CartCard> getCardsForTab(OrderTab tab) {
    switch (tab) {
      case OrderTab.myOrders:
      case OrderTab.allOrders:
        // My Orders and All Orders show all cards (data already scoped server-side)
        return allCartCards;
      case OrderTab.ready:
        return allCartCards
            .where((card) =>
                StatusUtils.normalizeCartStatus(card.cartStatus) == 'READY')
            .toList();
      case OrderTab.pending:
        return allCartCards.where((card) {
          final status = StatusUtils.normalizeCartStatus(card.cartStatus);
          return status == 'PENDING' || status == 'PREPARING';
        }).toList();
      case OrderTab.served:
        // Served tab uses the separate served carts endpoint
        return _servedCarts.map((s) => CartCard.fromServedCart(s)).toList();
    }
  }

  Future<void> fetchActiveOrders({
    required String restaurantId,
    required String sessionId,
    String? serverId,
    bool isBackgroundPoll = false,
  }) async {
    // Never stack background polls; user-initiated fetches must NOT be
    // swallowed (a dropped refresh leaks _isRefreshing and hides mutations).
    if (_inFlight && isBackgroundPoll) return;
    if (_state == DataState.loading && !_isRefreshing) return;
    _inFlight = true;

    if (!isBackgroundPoll) {
      // Set loading state (background polls update silently)
      _state = DataState.loading;
      if (!_isRefreshing) {
        _errorMessage = null;
        notifyListeners();
      }
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
        final data = response.data!;
        _currentServerId = data.currentServerId;
        _uiFlags = data.effectiveUiFlags;

        // Filter out cart items with status 'completed' or 'cancelled'
        _orders = data.orders
            .map((order) {
              // Filter carts to include only items that are not completed or cancelled
              final filteredCarts = order.carts
                  .map((cart) {
                    // Backend now filters cancelled/returned items, so we use all items returned
                    return CartSummary(
                      cartId: cart.cartId,
                      status: cart.status,
                      statusColorHex: cart.statusColorHex,
                      cartIndex: cart.cartIndex,
                      items: cart.items,
                    );
                  })
                  .where((cart) => cart.items.isNotEmpty)
                  .toList();

              // Return new order containing only active carts
              return OrderSummary(
                orderId: order.orderId,
                tableId: order.tableId,
                status: order.status,
                statusColorHex: order.statusColorHex,
                carts: filteredCarts,
                assignedTo: order.assignedTo,
                priceInfo: order.priceInfo,
              );
            })
            .where((order) => order.carts.isNotEmpty)
            .toList();
        _state = DataState.loaded;
        _errorMessage = null;
      } else {
        // On a failed background poll keep the last-good list on screen; the
        // next tick can recover. Only surface errors on explicit loads.
        if (!(isBackgroundPoll && _orders.isNotEmpty)) {
          _errorMessage = response.message ?? 'Failed to fetch orders';
          _state = DataState.error;
        }
      }
    } catch (e) {
      if (!(isBackgroundPoll && _orders.isNotEmpty)) {
        _errorMessage = 'Unexpected error: $e';
        _state = DataState.error;
      }
    } finally {
      _inFlight = false;
      _isRefreshing = false;
      notifyListeners();
    }
  }

  /// Fetch served carts for the Served tab
  Future<void> fetchServedCarts({
    required String restaurantId,
    required String sessionId,
  }) async {
    try {
      final response = await _apiService.getServedCartsForServer(
        restaurantId: restaurantId,
        sessionId: sessionId,
      );

      if (response.success && response.data != null) {
        _servedCarts = response.data!.servedCarts;
        notifyListeners();
      }
    } catch (e) {
      // Don't fail the whole screen if served carts fail to load
      debugPrint('Failed to fetch served carts: $e');
    }
  }

  Future<void> refreshOrders({
    required String restaurantId,
    required String sessionId,
    String? serverId,
  }) async {
    _isRefreshing = true;
    await Future.wait([
      fetchActiveOrders(
        restaurantId: restaurantId,
        sessionId: sessionId,
        serverId: serverId,
      ),
      fetchServedCarts(
        restaurantId: restaurantId,
        sessionId: sessionId,
      ),
    ]);
  }

  /// Mark a cart as served
  Future<bool> markCartAsServed({
    required String restaurantId,
    required String orderId,
    required int cartIndex,
    required String sessionId,
  }) async {
    try {
      final response = await _apiService.markCartAsServed(
        restaurantId: restaurantId,
        orderId: orderId,
        cartIndex: cartIndex,
        sessionId: sessionId,
      );

      if (response.success) {
        // Refresh orders to update the UI
        await refreshOrders(
          restaurantId: restaurantId,
          sessionId: sessionId,
        );
        return true;
      }
      return false;
    } catch (e) {
      debugPrint('Failed to mark cart as served: $e');
      return false;
    }
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

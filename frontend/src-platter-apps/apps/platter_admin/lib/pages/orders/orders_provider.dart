import 'package:flutter/foundation.dart';
import 'package:platter_core/platter_core.dart';
import 'orders_api_service.dart';

/// Provider for historical orders state
class OrdersProvider extends ChangeNotifier {
  final OrdersApiService _apiService;
  final String restaurantId;
  final String sessionId;

  DataState _state = DataState.initial;
  String? _errorMessage;
  List<OrderSummary> _orders = [];
  bool _hasMore = false;
  String? _nextCursor;
  DateTime? _startDate;
  DateTime? _endDate;
  OrderDetails? _selectedOrder;

  OrdersProvider({
    required OrdersApiService apiService,
    required this.restaurantId,
    required this.sessionId,
  }) : _apiService = apiService;

  DataState get state => _state;
  String? get errorMessage => _errorMessage;
  List<OrderSummary> get orders => _orders;
  bool get hasMore => _hasMore;
  DateTime? get startDate => _startDate;
  DateTime? get endDate => _endDate;
  OrderDetails? get selectedOrder => _selectedOrder;

  /// Set date filter and reload
  Future<void> setDateFilter(DateTime? start, DateTime? end) async {
    _startDate = start;
    _endDate = end;
    await loadOrders(reset: true);
  }

  /// Clear date filter
  Future<void> clearDateFilter() async {
    _startDate = null;
    _endDate = null;
    await loadOrders(reset: true);
  }

  /// Load orders (initial or next page)
  Future<void> loadOrders({bool reset = false}) async {
    if (reset) {
      _orders = [];
      _nextCursor = null;
      _hasMore = false;
    }

    _state = DataState.loading;
    _errorMessage = null;
    notifyListeners();

    final response = await _apiService.getHistoricalOrders(
      restaurantId: restaurantId,
      sessionId: sessionId,
      startDate: _startDate?.toIso8601String().split('T').first,
      endDate: _endDate?.toIso8601String().split('T').first,
      pageSize: 20,
      cursor: _nextCursor,
    );

    if (response.isSuccess && response.data != null) {
      final data = response.data!;
      if (reset) {
        _orders = data.orders;
      } else {
        _orders.addAll(data.orders);
      }
      _hasMore = data.hasMore;
      _nextCursor = data.nextCursor;
      _state = DataState.success;
    } else {
      _errorMessage = response.errorMessage ?? 'Failed to load orders';
      _state = DataState.error;
    }
    notifyListeners();
  }

  /// Load more orders (pagination)
  Future<void> loadMore() async {
    if (!_hasMore || _state == DataState.loading) return;
    await loadOrders(reset: false);
  }

  /// Load order details
  Future<void> loadOrderDetails(String orderId) async {
    _state = DataState.loading;
    _errorMessage = null;
    notifyListeners();

    final response = await _apiService.getOrderDetails(
      restaurantId: restaurantId,
      sessionId: sessionId,
      orderId: orderId,
    );

    if (response.isSuccess && response.data != null) {
      _selectedOrder = response.data;
      _state = DataState.success;
    } else {
      _errorMessage = response.errorMessage ?? 'Failed to load order details';
      _state = DataState.error;
    }
    notifyListeners();
  }

  /// Clear selected order
  void clearSelectedOrder() {
    _selectedOrder = null;
    notifyListeners();
  }
}

import 'dart:async';

import 'package:flutter/material.dart' show ChangeNotifier, Color, Colors;
import 'package:flutterboilerplate/pages/checkout_order_flow/models/order_models.dart';
import 'package:flutterboilerplate/pages/checkout_order_flow/order_repository.dart';
import 'package:flutterboilerplate/session/session_provider.dart';
import 'package:flutterboilerplate/singletonGods/logger.dart';

/// Manages the state for the order listing page
class OrderListingState extends ChangeNotifier {
  OrderListingState(this._repository, this._sessionProvider);

  final OrderRepository _repository;
  final SessionProvider _sessionProvider;

  // State Management
  OrderData? _order;
  OrderData? get order => _order;
  
  // For future support of multiple orders
  List<OrderData> _orders = [];
  List<OrderData> get orders => _orders;
  bool get hasMultipleOrders => _orders.length > 1;

  bool _isLoading = true;
  bool get isLoading => _isLoading;

  String? _error;
  String? get error => _error;

  // Live-poll state (pattern copied from platter_kitchen's KitchenLiveProvider)
  Timer? _pollingTimer;
  bool _inFlight = false;
  DateTime? _lastUpdated;
  DateTime? get lastUpdated => _lastUpdated;
  bool get isPolling => _pollingTimer != null;

  static const Duration pollingInterval = Duration(seconds: 15);

  /// Starts polling and does an immediate fetch. Page-scoped: the page calls
  /// this from initState and [stopPolling] from dispose (the provider itself
  /// is app-scoped).
  void startPolling({
    required String tableId,
    required String restaurantId,
    String? specificOrderId,
  }) {
    _pollingTimer?.cancel();
    fetchOrder(
      tableId: tableId,
      restaurantId: restaurantId,
      specificOrderId: specificOrderId,
    );
    _pollingTimer = Timer.periodic(pollingInterval, (_) {
      fetchOrder(
        tableId: tableId,
        restaurantId: restaurantId,
        specificOrderId: specificOrderId,
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

  bool get _isOrderTerminal {
    final s = _order?.orderStatus.toLowerCase();
    return s == 'completed' || s == 'cancelled';
  }

  // Optional orderId to fetch specific order
  String? _orderId;
  String? get orderId => _orderId;
  set orderId(String? id) {
    _orderId = id;
    notifyListeners();
  }

  /// Fetches order data using the SessionProvider for authentication
  Future<void> fetchOrder({
    required String tableId,
    required String restaurantId,
    String? specificOrderId,
    bool isBackgroundPoll = false,
  }) async {
    // Never stack requests: skip this tick if the previous fetch is still out.
    if (_inFlight) return;
    _inFlight = true;
    try {
      if (!isBackgroundPoll) {
        _isLoading = true;
        _error = null;
        notifyListeners();
      }

      AppLogger.log('📋 ORDER: Fetching order data');

      // Get session ID from session provider
      final sessionId = _sessionProvider.sessionId;

      if (sessionId == null || sessionId.isEmpty) {
        // No session is terminal — polling can't recover it.
        stopPolling();
        _error = 'No active session found. Please scan the QR code again.';
        _isLoading = false;
        notifyListeners();
        return;
      }

      // Use either the provided order ID or the stored one
      final orderIdToUse = specificOrderId ?? _orderId;
      
      final response = await _repository.fetchOrder(
        tableId: tableId,
        restaurantId: restaurantId,
        sessionId: sessionId,
        orderId: orderIdToUse,
      );

      // Handle API response using the when pattern from Freezed
      response.when(
        success: (data, message) {
          _order = data.data;
          
          // Handle case where order is null but API call succeeded
          if (_order == null) {
            AppLogger.log('⚠️ ORDER: API returned success but order is null');
            _error = 'No order data found';
            _orders = [];
          } else {
            // If a specific order was requested, add it to the orders list as well
            AppLogger.log('✅ ORDER: Successfully received order with ${_order?.items.length ?? 0} items');
            if (orderIdToUse != null) {
              _orders = [_order!];
            } else {
              // For future support when API returns multiple orders
              // This assumes a single order for now
              _orders = [_order!];
            }
          }
          
          _lastUpdated = DateTime.now();
          _isLoading = false;
          // Nothing left to poll for once the order is terminal.
          if (_isOrderTerminal) {
            stopPolling();
          }
          notifyListeners();
        },
        error: (message, errorCode, errorDetails) {
          AppLogger.log('❌ ORDER: Error fetching order - $message');
          // On a failed background poll keep the last-good order on screen;
          // the next tick can recover. Only surface errors on explicit loads.
          if (!(isBackgroundPoll && _order != null)) {
            _error = message;
          }
          _isLoading = false;
          notifyListeners();
        },
      );
    } catch (e) {
      AppLogger.log('❌ ORDER: Exception fetching order - $e');
      if (!(isBackgroundPoll && _order != null)) {
        _error = e.toString();
      }
      _isLoading = false;
      notifyListeners();
    } finally {
      _inFlight = false;
    }
  }

  /// Gets the order status as a human-readable string
  String getOrderStatusText() {
    if (_order == null) return 'Unknown';
    
    switch (_order!.orderStatus.toLowerCase()) {
      case 'pending':
        return 'Pending';
      case 'in_progress':
        return 'In Progress';
      case 'completed':
        return 'Completed';
      case 'cancelled':
        return 'Cancelled';
      default:
        // Handle other statuses for backward compatibility or future expansion
        return _order!.orderStatus[0].toUpperCase() + _order!.orderStatus.substring(1).toLowerCase();
    }
  }

  /// Gets a color associated with the current order status
  Color getOrderStatusColor() {
    if (_order == null) return Colors.grey;
    
    switch (_order!.orderStatus.toLowerCase()) {
      case 'pending':
        return Colors.orange;
      case 'in_progress':
        return const Color(0xFF1A2E4A); // Navy blue for in progress
      case 'completed':
        return Colors.green.shade800;
      case 'cancelled':
        return Colors.red;
      default:
        return Colors.grey;
    }
  }


  /// Formats the order date for display
  String getFormattedOrderDate() {
    if (_order == null || _order!.createdAt == null) {
      return 'Unknown date';
    }
    
    final date = _order!.createdAt!;
    return '${date.day}/${date.month}/${date.year} at ${date.hour}:${date.minute.toString().padLeft(2, '0')}';
  }
} 
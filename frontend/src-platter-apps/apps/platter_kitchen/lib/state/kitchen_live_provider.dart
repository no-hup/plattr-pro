import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:platter_core/platter_core.dart';
import '../models/active_order_models.dart';
import '../core/kitchen_repository.dart';

class KitchenLiveProvider extends ChangeNotifier {
  final KitchenRepository _repository;
  final String restaurantId;

  List<ActiveKitchenCart> _activeCarts = [];
  bool _isLoading = false;
  String? _error;
  Timer? _pollingTimer;

  // Sorting Logic (Default: FIFO - Oldest submission first)
  bool _sortAscending = true; 
  
  // View Configuration
  KitchenViewType _currentViewType = KitchenViewType.cart;

  KitchenLiveProvider({
    required KitchenRepository repository,
    required this.restaurantId,
  }) : _repository = repository;

  List<ActiveKitchenCart> get activeCarts => _activeCarts;
  KitchenViewType get viewType => _currentViewType;
  bool get isLoading => _isLoading;
  String? get error => _error;

  @override
  void dispose() {
    stopPolling();
    super.dispose();
  }

  void startPolling({Duration interval = const Duration(seconds: 60)}) {
    _pollingTimer?.cancel();
    fetchActiveCarts(silent: false);
    _pollingTimer = Timer.periodic(interval, (_) => fetchActiveCarts(silent: true));
  }

  void stopPolling() {
    _pollingTimer?.cancel();
    _pollingTimer = null;
  }

  Future<void> fetchActiveCarts({bool silent = false}) async {
    if (!silent) {
      _isLoading = true;
      notifyListeners();
    }

    try {
      final response = await _repository.getActiveCarts(restaurantId);
      
      _activeCarts = response.carts;
      _currentViewType = response.widgetType;
      
      _sortCarts();
      
      _error = null;
    } catch (e) {
      AppLogger.error('Failed to fetch active carts', error: e);
      _error = "Failed to load active tickets.";
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  void _sortCarts() {
    _activeCarts.sort((a, b) {
      final comparison = a.submittedAt.compareTo(b.submittedAt);
      return _sortAscending ? comparison : -comparison;
    });
  }

  /// Manually trigger a refresh (Pull-to-refresh)
  Future<void> refresh() async {
    return fetchActiveCarts(silent: false);
  }
}

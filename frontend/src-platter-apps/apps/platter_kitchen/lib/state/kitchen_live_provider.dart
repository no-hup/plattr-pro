import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:platter_core/platter_core.dart';

import '../core/kitchen_repository.dart';
import '../models/active_order_models.dart';

/// Lifecycle state for the live kitchen queue.
///
/// - [loading]        : initial fetch in-flight, no data yet
/// - [loaded]         : at least one successful fetch; list may be empty
/// - [transientError] : polling fetch failed but the session is still valid
/// - [sessionExpired] : the session is no longer valid; polling stops
///                      until the user Reconnects
enum KitchenLiveState { loading, loaded, transientError, sessionExpired }

class KitchenLiveProvider extends ChangeNotifier {
  KitchenLiveProvider({
    required KitchenRepository repository,
    required this.restaurantId,
    required this.sessionId,
  }) : _repository = repository;

  final KitchenRepository _repository;
  final String restaurantId;
  final String sessionId;

  List<ActiveKitchenCart> _activeCarts = [];
  KitchenLiveState _state = KitchenLiveState.loading;
  String? _error;
  Timer? _pollingTimer;

  // Sorting: FIFO (oldest submission first) by default.
  bool _sortAscending = true;

  // View type: locked to cart view for this phase.
  KitchenViewType _currentViewType = KitchenViewType.cart;

  List<ActiveKitchenCart> get activeCarts => _activeCarts;
  KitchenViewType get viewType => _currentViewType;
  KitchenLiveState get state => _state;
  String? get error => _error;

  bool get isLoading => _state == KitchenLiveState.loading;
  bool get isSessionExpired => _state == KitchenLiveState.sessionExpired;

  @override
  void dispose() {
    stopPolling();
    super.dispose();
  }

  /// Starts polling and does an immediate initial fetch.
  void startPolling({Duration interval = const Duration(seconds: 60)}) {
    _pollingTimer?.cancel();
    fetchActiveCarts(isInitialLoad: true);
    _pollingTimer = Timer.periodic(
      interval,
      (_) => fetchActiveCarts(isInitialLoad: false),
    );
  }

  void stopPolling() {
    _pollingTimer?.cancel();
    _pollingTimer = null;
  }

  /// Fetches active carts.
  ///
  /// - On success: replaces the list in place and clears any error state.
  /// - On session expiry: switches to [KitchenLiveState.sessionExpired]
  ///   and stops polling. The user must invoke [reconnect] to resume.
  /// - On transient error during a background poll: retains the existing
  ///   list and flips to [KitchenLiveState.transientError]. Polling
  ///   continues so the next tick can recover.
  Future<void> fetchActiveCarts({bool isInitialLoad = false}) async {
    if (_state == KitchenLiveState.sessionExpired) {
      // Explicit user action is required to leave the expired state.
      return;
    }
    if (isInitialLoad) {
      _state = KitchenLiveState.loading;
      _error = null;
      notifyListeners();
    }

    try {
      final response = await _repository.getActiveCarts(
        restaurantId: restaurantId,
        sessionId: sessionId,
      );

      _activeCarts = response.carts;
      _currentViewType = response.widgetType;
      _sortCarts();

      _state = KitchenLiveState.loaded;
      _error = null;
    } on KitchenSessionExpiredException catch (e) {
      AppLogger.warning('Kitchen session expired: ${e.message}');
      _state = KitchenLiveState.sessionExpired;
      _error = e.message;
      stopPolling();
    } catch (e, st) {
      AppLogger.error('Failed to fetch active carts', error: e, stackTrace: st);
      _error = 'Failed to load active tickets.';
      // Preserve the previously fetched list when we have one so a single
      // bad poll does not wipe the kitchen screen.
      if (isInitialLoad) {
        _state = KitchenLiveState.transientError;
      } else {
        _state = _activeCarts.isEmpty
            ? KitchenLiveState.transientError
            : KitchenLiveState.loaded;
      }
    } finally {
      notifyListeners();
    }
  }

  /// Called by the UI when the user taps the Reconnect button on the
  /// session-expired state. This clears local state; the wrapping
  /// [SessionManager]/AuthWrapper is expected to handle the actual
  /// re-authentication navigation.
  void markSessionExpiredAcknowledged() {
    _activeCarts = [];
    _state = KitchenLiveState.sessionExpired;
    notifyListeners();
  }

  /// Manually trigger a refresh (pull-to-refresh). No-op if session expired.
  Future<void> refresh() async {
    if (_state == KitchenLiveState.sessionExpired) return;
    return fetchActiveCarts(isInitialLoad: true);
  }

  /// Called from the detail dialog after a successful mutation so the
  /// screen reflects the new state without waiting for the next poll tick.
  Future<void> refreshAfterMutation() {
    return fetchActiveCarts(isInitialLoad: false);
  }

  /// Called from the detail dialog when a mutation fails because the
  /// session expired mid-action.
  void markSessionExpiredFromMutation() {
    _state = KitchenLiveState.sessionExpired;
    stopPolling();
    notifyListeners();
  }

  void _sortCarts() {
    _activeCarts.sort((a, b) {
      final comparison = a.submittedAt.compareTo(b.submittedAt);
      return _sortAscending ? comparison : -comparison;
    });
  }
}

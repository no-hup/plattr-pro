import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:platter_core/platter_core.dart';

import '../core/kitchen_repository.dart';
import '../models/active_order_models.dart';
import '../network/api_constants.dart';

/// Lifecycle state for the live kitchen queue.
///
/// - [loading]        : initial fetch in-flight, no data yet
/// - [loaded]         : at least one successful fetch; list may be empty.
///                      Background poll failures leave the provider in
///                      [loaded] as long as we still have previously-fetched
///                      data, so the screen never blanks on a single bad
///                      poll. [error] is still populated in that case.
/// - [transientError] : fetch failed and we have no data to fall back to
///                      (initial load failure, or background failure while
///                      the list was already empty). Polling continues so
///                      the next tick can recover.
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
  bool _inFlight = false;

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
  void startPolling({Duration? interval}) {
    final effectiveInterval = interval ?? KitchenApiConstants.livePollingInterval;
    _pollingTimer?.cancel();
    fetchActiveCarts(isInitialLoad: true);
    _pollingTimer = Timer.periodic(
      effectiveInterval,
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
    // Never stack requests: skip this tick if the previous fetch is still out.
    if (_inFlight) return;
    _inFlight = true;
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

      _activeCarts = List.of(response.carts);
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
      _inFlight = false;
      notifyListeners();
    }
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

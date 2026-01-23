import 'dart:async';
import 'package:connectivity_plus/connectivity_plus.dart';

/// Singleton service that monitors network connectivity status.
/// 
/// Provides:
/// - [onConnectivityChanged] stream for reactive updates
/// - [isOnline] getter for synchronous status checks
/// 
/// Usage:
/// ```dart
/// final service = NetworkConnectivityService();
/// service.onConnectivityChanged.listen((isOnline) {
///   print('Online: $isOnline');
/// });
/// ```
class NetworkConnectivityService {
  static final NetworkConnectivityService _instance = NetworkConnectivityService._internal();
  factory NetworkConnectivityService() => _instance;
  
  NetworkConnectivityService._internal() {
    _initConnectivity();
  }

  final Connectivity _connectivity = Connectivity();
  final StreamController<bool> _connectivityStreamController = StreamController<bool>.broadcast();
  
  bool _isOnline = true;
  StreamSubscription<List<ConnectivityResult>>? _connectivitySubscription;
  bool _isInitialized = false;

  /// Stream of connectivity status changes
  Stream<bool> get onConnectivityChanged => _connectivityStreamController.stream;
  
  /// Current connectivity status (synchronous)
  bool get isOnline => _isOnline;

  Future<void> _initConnectivity() async {
    if (_isInitialized) return;
    _isInitialized = true;

    // Check initial connectivity
    try {
      final results = await _connectivity.checkConnectivity();
      _updateConnectivityStatus(results);
    } catch (e) {
      // Assume online if check fails
      _isOnline = true;
    }

    // Listen for connectivity changes
    _connectivitySubscription = _connectivity.onConnectivityChanged.listen(
      _updateConnectivityStatus,
      onError: (error) {
        // On error, assume online to avoid blocking UI
        _isOnline = true;
        _connectivityStreamController.add(true);
      },
    );
  }

  void _updateConnectivityStatus(List<ConnectivityResult> results) {
    // Consider online if any connectivity result is not 'none'
    final wasOnline = _isOnline;
    _isOnline = results.any((result) => result != ConnectivityResult.none);
    
    // Only emit if status changed
    if (wasOnline != _isOnline) {
      _connectivityStreamController.add(_isOnline);
    }
  }

  /// Disposes the service. Call when app is shutting down.
  void dispose() {
    _connectivitySubscription?.cancel();
    _connectivityStreamController.close();
  }
}

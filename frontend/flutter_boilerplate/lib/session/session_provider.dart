import 'package:flutter/foundation.dart';
import 'package:flutterboilerplate/models/SessionState.dart';
import 'package:flutterboilerplate/pages/table_verification/models/models.dart';
import 'package:flutterboilerplate/singletonGods/logger.dart';

import 'services/session_storage_service.dart';

/// Manages the session state of the application
/// Uses SessionStorageService for persistence through page refreshes
class SessionProvider extends ChangeNotifier {
  /// Constructor loads session data if available
  SessionProvider() {
    AppLogger.log(
      '🔐 SessionProvider: Initializing with SessionStorageService',
    );
    _loadSessionIfAvailable();
  }
  SessionState _state = const SessionState();
  final SessionStorageService _storageService = SessionStorageService();

  /// Loads persisted session data if available
  void _loadSessionIfAvailable() {
    AppLogger.log(
      '🔐 SessionProvider: Attempting to load session from storage',
    );
    final savedState = _storageService.loadSession();
    if (savedState != null) {
      _state = savedState;
      AppLogger.log(
        '🔐 SessionProvider: ✅ Successfully loaded session from storage',
      );
      AppLogger.log('🔐 SessionProvider: SessionId: ${_state.sessionId}');
      AppLogger.log(
        '🔐 SessionProvider: Is authenticated: ${_state.isAuthenticated}',
      );
      AppLogger.log(
        '🔐 SessionProvider: RestaurantId: ${_state.restaurantId}, TableId: ${_state.tableId}',
      );
      notifyListeners();
    } else {
      AppLogger.log('🔐 SessionProvider: No valid session found in storage');
    }
  }

  /// Returns the current session state
  SessionState get state => _state;

  /// Updates session state with table validation response
  void updateFromTableValidation(TableValidationResponse response) {
    AppLogger.log('🔐 SessionProvider: Processing table validation response');
    AppLogger.log('🔐 SessionProvider: Response status: ${response.status}');
    AppLogger.log(
      '🔐 SessionProvider: Response sessionId: ${response.sessionId}',
    );

    if (response.status == 'success' && response.sessionId != null) {
      AppLogger.log(
        '🔐 SessionProvider: Updating session state with validation data',
      );

      _state = _state.copyWith(
        sessionId: response.sessionId,
        sessionExpiresAt: response.sessionExpiresAt,
        otpRequiredForOrder: response.otpRequiredForOrder,
        isAuthenticated: true,
        userName: response.primaryCustomerName,
        phoneNumber: response.primaryCustomerPhone,
      );

      // Save session to storage
      final saveSuccess = _storageService.saveSession(_state);
      AppLogger.log(
        '🔐 SessionProvider: Session save result: ${saveSuccess ? "Success ✅" : "Failed ❌"}',
      );

      AppLogger.log(
        '🔐 SessionProvider: Updated session with ID: ${response.sessionId}',
      );
      notifyListeners();
    } else {
      AppLogger.log(
        '🔐 SessionProvider: ⚠️ Invalid table validation response, session not updated',
      );
    }
  }

  Future<bool> authenticate({
    required String name,
    required String phone,
    required String tableId,
    required String restaurantId,
    String? otp,
  }) async {
    try {
      AppLogger.log('🔐 SessionProvider: Beginning authentication process');
      _state = _state.copyWith(isLoading: true);
      notifyListeners();

      // TODO: Add API call here
      // Simulate API call for now
      await Future.delayed(const Duration(seconds: 1));
      AppLogger.log('🔐 SessionProvider: Authentication API call completed');

      _state = _state.copyWith(
        isAuthenticated: true,
        userName: name,
        phoneNumber: phone,
        tableId: tableId,
        restaurantId: restaurantId,
        isPrimaryCustomer: true, // Default to primary customer for now
        isLoading: false,
      );

      // Save session to storage
      final saveSuccess = _storageService.saveSession(_state);
      AppLogger.log(
        '🔐 SessionProvider: Session save result: ${saveSuccess ? "Success ✅" : "Failed ❌"}',
      );

      AppLogger.log('🔐 SessionProvider: User authenticated successfully');
      notifyListeners();

      return true;
    } catch (e) {
      AppLogger.log('🔐 SessionProvider: ❌ Authentication error: $e');
      _state = _state.copyWith(
        isLoading: false,
        error: e.toString(),
      );
      notifyListeners();
      return false;
    }
  }

  /// Returns the existing sessionId if available
  String? get sessionId {
    final id = _state.sessionId;
    AppLogger.log('🔐 SessionProvider: Providing sessionId: ${id ?? "null"}');
    return id;
  }

  /// Clears session data on logout
  void logout() {
    AppLogger.log('🔐 SessionProvider: Logging out and clearing session');
    _state = const SessionState();
    _storageService.clearSession();
    AppLogger.log('🔐 SessionProvider: ✅ Logged out and cleared session');
    notifyListeners();
  }

  /// Set session details after OTP validation
  void setSessionFromOtp({
    required String sessionId,
    required String restaurantId,
    required String tableId,
    String? name,
    String? phone,
  }) {
    _state = _state.copyWith(
      sessionId: sessionId,
      restaurantId: restaurantId,
      tableId: tableId,
      isAuthenticated: true,
      userName: name ?? _state.userName,
      phoneNumber: phone ?? _state.phoneNumber,
    );
    _storageService.saveSession(_state);
    AppLogger.log(
        '🔐 SessionProvider: Session set from OTP (sessionId=$sessionId)');
    notifyListeners();
  }
}

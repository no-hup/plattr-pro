import 'package:flutter/material.dart';
import 'package:platter_core/platter_core.dart';

/// Provider for login state management in Kitchen app.
/// Only allows kitchen and kitchen_staff roles.
class LoginProvider extends ChangeNotifier {
  final LoginApiService _apiService;
  final SessionStorage _sessionStorage;

  LoginProvider({
    LoginApiService? apiService,
    SessionStorage? sessionStorage,
  })  : _apiService = apiService ?? LoginApiService(),
        _sessionStorage = sessionStorage ?? SessionStorage();

  DataState _state = DataState.initial;
  LoginResponseData? _loginData;
  String? _errorMessage;

  DataState get state => _state;
  LoginResponseData? get loginData => _loginData;
  String? get errorMessage => _errorMessage;

  bool get isLoading => _state == DataState.loading;

  /// Allowed roles for Kitchen app access - admin NOT allowed
  static const Set<String> _allowedRoles = {
    'kitchen',
    'kitchen_staff',
  };

  /// Error message for unauthorized roles
  static const String _unauthorizedError =
      'You are not authorized as a Kitchen staff';

  Future<void> loginUser({
    required String restaurantId,
    String? username,
    String? password,
    String? sessionId,
  }) async {
    _state = DataState.loading;
    _errorMessage = null;
    _loginData = null;
    notifyListeners();

    final request = LoginRequest(
      restaurantId: restaurantId,
      username: username,
      password: password,
      sessionId: sessionId,
    );

    try {
      final ApiResponse<LoginResponseData> response =
          await _apiService.login(request);

      if (response.success && response.data != null) {
        final data = response.data!;

        // Log if sessionId is empty
        if (data.sessionId.isEmpty) {
          AppLogger.warning('Login success but sessionId is empty');
        }

        // Check if user has valid kitchen role
        if (!_isRoleAllowed(data.role)) {
          AppLogger.warning(
            'Role mismatch: user has role "${data.role}" but Kitchen app requires $_allowedRoles',
          );
          _errorMessage = _unauthorizedError;
          _state = DataState.error;
          notifyListeners();
          return;
        }

        // Save session for auto-login
        await _sessionStorage.saveSession(SessionData(
          sessionId: data.sessionId,
          restaurantId: data.restaurantId,
          staffId: data.staffId,
          staffName: data.name,
          restaurantName: data.restaurantName,
          role: data.role,
          expiresAt: DateTime.now().add(const Duration(days: 7)),
        ));

        _loginData = data;
        _state = DataState.loaded;
        AppLogger.info('Login successful for ${data.name}');
      } else {
        _errorMessage = response.message ?? 'Login failed';
        _state = DataState.error;
      }
    } catch (e) {
      AppLogger.error('Login error', e);
      _errorMessage = 'An unexpected error occurred: $e';
      _state = DataState.error;
    }
    notifyListeners();
  }

  /// Try to restore session from storage (for auto-login)
  Future<bool> tryRestoreSession() async {
    final session = await _sessionStorage.getSession();
    if (session == null) {
      return false;
    }

    // Validate role from stored session
    if (!_isRoleAllowed(session.role)) {
      AppLogger.warning('Stored session has invalid role: ${session.role}');
      await _sessionStorage.clearSession();
      return false;
    }

    // Create login data from stored session
    _loginData = LoginResponseData(
      sessionId: session.sessionId,
      staffId: session.staffId,
      name: session.staffName,
      entity: '',
      role: session.role,
      restaurantId: session.restaurantId,
      restaurantName: session.restaurantName,
    );
    _state = DataState.loaded;
    notifyListeners();

    AppLogger.info('Session restored for ${session.staffName}');
    return true;
  }

  bool _isRoleAllowed(String role) {
    return _allowedRoles.contains(role.toLowerCase());
  }

  Future<void> logout() async {
    await _sessionStorage.clearSession();
    _state = DataState.initial;
    _loginData = null;
    _errorMessage = null;
    notifyListeners();
    AppLogger.info('User logged out');
  }

  void resetState() {
    _state = DataState.initial;
    _loginData = null;
    _errorMessage = null;
    notifyListeners();
  }
}

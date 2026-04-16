import 'package:flutter/material.dart';
import '../../platter_core.dart';
import '../logging/app_logger.dart';
import '../network/api_response.dart';
import '../state/data_state.dart';
import 'login_api_service.dart';
import 'login_request.dart';
import 'login_response_data.dart';
import 'session_storage.dart';

/// Base provider for login state management.
/// Apps should extend this class and provide their specific configurations.
abstract class BaseLoginProvider extends ChangeNotifier {
  final LoginApiService _apiService;
  final SessionStorage _sessionStorage;

  BaseLoginProvider({
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

  /// Defines which roles are allowed to access this app.
  /// If empty, all roles are allowed.
  Set<String> get allowedRoles => const {};

  /// Error message when role is not authorized
  String get unauthorizedMessage => 'You are not authorized to access this application';

  /// Performs the login operation
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

        // Validate Role
        if (!_validateRole(data.role)) {
          AppLogger.warning(
            'Role mismatch: user has role "${data.role}" but app requires $allowedRoles',
          );
          _errorMessage = unauthorizedMessage;
          _state = DataState.error;
          notifyListeners();
          return;
        }

        // Save session
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
      AppLogger.error('Login error', error: e);
      _errorMessage = 'An unexpected error occurred: $e';
      _state = DataState.error;
    }
    notifyListeners();
  }

  /// Try to restore session from storage AND validate with server.
  /// This fixes the security issue of unvalidated sessions.
  Future<bool> tryRestoreSession() async {
    final session = await _sessionStorage.getSession();
    if (session == null) {
      return false;
    }

    // 1. Initial local validation
    if (!_validateRole(session.role)) {
      AppLogger.warning('Stored session has invalid role: ${session.role}');
      await _sessionStorage.clearSession();
      return false;
    }

    // 2. Server-side validation
    // We attempt to re-login using the stored sessionId and restaurantId.
    // This confirms the session is still valid on the backend.
    try {
      final response = await _apiService.login(LoginRequest(
        restaurantId: session.restaurantId,
        sessionId: session.sessionId,
      ));

      if (response.success && response.data != null) {
         final data = response.data!;
         
         // Re-validate role from fresh server data
         if (!_validateRole(data.role)) {
            AppLogger.warning('Server validated session but role mismatch: ${data.role}');
            await _sessionStorage.clearSession();
            return false;
         }

         // Update local session with fresh data
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
        AppLogger.info('Session restored and validated for ${data.name}');
        notifyListeners();
        return true;

      } else {
        AppLogger.warning('Session validation failed: ${response.message}');
        // Verify failure - if it's an auth error, clear session.
        // A generic network error shouldn't necessarily kill the session (offline mode), 
        // but for now, we assume security > offline availability.
        await _sessionStorage.clearSession();
        return false;
      }
    } catch (e) {
      AppLogger.error('Error validating stored session', error: e);
      // In case of network error, deciding whether to allow offline access or not.
      // Based on "Security issue" requirement, we should probably fail safe.
      return false;
    }
  }

  bool _validateRole(String role) {
    if (allowedRoles.isEmpty) return true;
    return allowedRoles.contains(role.toLowerCase());
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

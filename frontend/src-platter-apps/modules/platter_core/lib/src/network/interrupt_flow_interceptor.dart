import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import '../logging/app_logger.dart';
import '../auth/session_storage.dart';

/// Callback type for interrupt flow handlers
typedef InterruptFlowHandler = Future<void> Function(
    BuildContext context, InterruptFlowType type, dynamic data);

/// Types of interrupt flows that can be triggered by the backend
// DEBT(TD-003): no credential challenge type (pin / password / otp + retry).
// Add `challenge` here the first time a staff screen needs a PIN; see moonshot/TECH_DEBT.md.
enum InterruptFlowType {
  /// App requires an update to continue
  forcedUpdate,

  /// User is blocked from accessing the app
  blocked,

  /// Session has expired
  sessionExpired,

  /// Maintenance mode is active
  maintenance,

  /// Custom interrupt with message
  custom,
}

/// Custom Interceptor for handling interrupt flows.
///
/// This interceptor checks API responses for special codes that require
/// interrupting the normal flow to show blocking UI (forced update, blocked user, etc.)
///
/// Usage:
/// 1. Register a handler using [registerHandler]
/// 2. The handler will be called whenever an interrupt condition is detected
/// 3. The handler should show appropriate UI (dialog, full-screen overlay, etc.)
class InterruptFlowInterceptor extends Interceptor {
  InterruptFlowInterceptor._();

  static final InterruptFlowInterceptor _instance =
      InterruptFlowInterceptor._();
  static InterruptFlowInterceptor get instance => _instance;

  /// Global navigation key for showing dialogs from interceptor
  static GlobalKey<NavigatorState>? navigatorKey;

  /// Handler for interrupt flows (to be registered by the app)
  static InterruptFlowHandler? _handler;

  /// Register a handler for interrupt flows
  static void registerHandler(InterruptFlowHandler handler) {
    _handler = handler;
  }

  /// Codes that trigger interrupt flows
  static const Map<String, InterruptFlowType> _interruptCodes = {
    'forced_update': InterruptFlowType.forcedUpdate,
    'force_update': InterruptFlowType.forcedUpdate,
    'user_blocked': InterruptFlowType.blocked,
    'blocked': InterruptFlowType.blocked,
    'session_expired': InterruptFlowType.sessionExpired,
    'maintenance': InterruptFlowType.maintenance,
    'maintenance_mode': InterruptFlowType.maintenance,
  };

  @override
  void onResponse(Response response, ResponseInterceptorHandler handler) {
    // Check if response contains interrupt flow code
    final interruptType = _checkForInterruptCode(response.data);

    if (interruptType != null) {
      AppLogger.warning(
          'Interrupt flow detected: ${interruptType.name}');
      _triggerInterruptFlow(interruptType, response.data);
    }

    handler.next(response);
  }

  @override
  void onError(DioException err, ErrorInterceptorHandler handler) {
    // Also check error responses for interrupt codes
    final interruptType = _checkForInterruptCode(err.response?.data);

    if (interruptType != null) {
      AppLogger.warning(
          'Interrupt flow detected in error: ${interruptType.name}');
      _triggerInterruptFlow(interruptType, err.response?.data);
    }

    handler.next(err);
  }

  /// Check response data for interrupt codes
  InterruptFlowType? _checkForInterruptCode(dynamic data) {
    if (data == null || data is! Map<String, dynamic>) return null;

    // Check direct code field
    final code = data['code']?.toString().toLowerCase();
    if (code != null && _interruptCodes.containsKey(code)) {
      return _interruptCodes[code];
    }

    // Check nested error structure
    if (data['error'] is Map<String, dynamic>) {
      final errorCode =
          (data['error'] as Map<String, dynamic>)['code']?.toString().toLowerCase();
      if (errorCode != null && _interruptCodes.containsKey(errorCode)) {
        return _interruptCodes[errorCode];
      }
    }

    // Check nested data structure
    if (data['data'] is Map<String, dynamic>) {
      final dataCode =
          (data['data'] as Map<String, dynamic>)['code']?.toString().toLowerCase();
      if (dataCode != null && _interruptCodes.containsKey(dataCode)) {
        return _interruptCodes[dataCode];
      }
    }

    return null;
  }

  /// Trigger the interrupt flow handler
  void _triggerInterruptFlow(InterruptFlowType type, dynamic data) {
    if (_handler == null) {
      AppLogger.warning(
          'No interrupt flow handler registered. Call InterruptFlowInterceptor.registerHandler()');
      return;
    }

    if (navigatorKey?.currentContext == null) {
      AppLogger.warning(
          'No navigator context available for interrupt flow');
      return;
    }

    // Call the handler asynchronously
    _handler!(navigatorKey!.currentContext!, type, data);
  }
}

/// Default implementation of interrupt flow dialogs.
/// Apps can use this or create their own handlers.
class DefaultInterruptFlowHandler {
  /// Shows the appropriate dialog for the interrupt type
  static Future<void> handle(
    BuildContext context,
    InterruptFlowType type,
    dynamic data,
  ) async {
    switch (type) {
      case InterruptFlowType.forcedUpdate:
        await _showForcedUpdateDialog(context, data);
        break;
      case InterruptFlowType.blocked:
        await _showBlockedDialog(context, data);
        break;
      case InterruptFlowType.sessionExpired:
        await _showSessionExpiredDialog(context, data);
        break;
      case InterruptFlowType.maintenance:
        await _showMaintenanceDialog(context, data);
        break;
      case InterruptFlowType.custom:
        await _showCustomDialog(context, data);
        break;
    }
  }

  static Future<void> _showForcedUpdateDialog(
      BuildContext context, dynamic data) async {
    final message = _extractMessage(data) ??
        'A new version of the app is required. Please update to continue.';

    await showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => AlertDialog(
        title: const Text('Update Required'),
        content: Text(message),
        actions: [
          TextButton(
            onPressed: () {
              // TODO: Open app store
            },
            child: const Text('Update Now'),
          ),
        ],
      ),
    );
  }

  static Future<void> _showBlockedDialog(
      BuildContext context, dynamic data) async {
    final message = _extractMessage(data) ??
        'Your account has been blocked. Please contact support.';

    await showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => AlertDialog(
        title: const Text('Account Blocked'),
        content: Text(message),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('OK'),
          ),
        ],
      ),
    );
  }

  static Future<void> _showSessionExpiredDialog(
      BuildContext context, dynamic data) async {
    await showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => AlertDialog(
        title: const Text('Session Expired'),
        content: const Text(
            'Your session has expired. Please log in again.'),
        actions: [
          TextButton(
            onPressed: () async {
              // Clear expired session before navigating
              await SessionStorage().clearSession();
              if (context.mounted) {
                Navigator.of(context)
                    .pushNamedAndRemoveUntil('/login', (route) => false);
              }
            },
            child: const Text('Login'),
          ),
        ],
      ),
    );
  }

  static Future<void> _showMaintenanceDialog(
      BuildContext context, dynamic data) async {
    final message = _extractMessage(data) ??
        'The app is currently under maintenance. Please try again later.';

    await showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => AlertDialog(
        title: const Text('Maintenance'),
        content: Text(message),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('OK'),
          ),
        ],
      ),
    );
  }

  static Future<void> _showCustomDialog(
      BuildContext context, dynamic data) async {
    final message = _extractMessage(data) ?? 'An error occurred.';

    await showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Notice'),
        content: Text(message),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('OK'),
          ),
        ],
      ),
    );
  }

  static String? _extractMessage(dynamic data) {
    if (data is Map<String, dynamic>) {
      return data['message']?.toString() ??
          (data['error'] as Map<String, dynamic>?)?['message']?.toString() ??
          (data['data'] as Map<String, dynamic>?)?['message']?.toString();
    }
    return null;
  }
}

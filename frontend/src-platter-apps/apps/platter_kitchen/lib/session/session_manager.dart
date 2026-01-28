import 'package:flutter/material.dart';
import 'package:platter_core/platter_core.dart';

/// Manages kitchen app session and authentication flows.
class SessionManager {
  SessionManager._();

  /// Performs logout: clears session and navigates to the initial route.
  static Future<void> logout(BuildContext context) async {
    try {
      // Clear stored session in core
      await SessionStorage().clearSession();
      AppLogger.info('User logged out from kitchen app');
    } catch (error, stackTrace) {
      AppLogger.error('Failed to clear session during logout', error, stackTrace);
      // TODO(tech-debt): surface a user-facing error if session clearing fails.
    }

    if (context.mounted) {
      // Navigate to root '/' which is typically the AuthWrapper.
      // AuthWrapper will detect no session and show LoginScreen.
      Navigator.of(context).pushNamedAndRemoveUntil('/', (route) => false);
    }
  }
}

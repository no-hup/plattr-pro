import 'package:flutter/material.dart';

/// Global error handler for showing error dialogs and snackbars.
///
/// Usage:
/// ```dart
/// // Show error snackbar
/// ErrorHandler.showSnackbar(context, 'Something went wrong');
///
/// // Show error dialog
/// await ErrorHandler.showDialog(context, 'Error', 'Details here');
/// ```
class ErrorHandler {
  ErrorHandler._();

  /// Show a snackbar with error message
  static void showSnackbar(
    BuildContext context,
    String message, {
    Duration duration = const Duration(seconds: 4),
    SnackBarAction? action,
  }) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        duration: duration,
        behavior: SnackBarBehavior.floating,
        backgroundColor: Theme.of(context).colorScheme.error,
        action: action ??
            SnackBarAction(
              label: 'Dismiss',
              textColor: Colors.white,
              onPressed: () {
                ScaffoldMessenger.of(context).hideCurrentSnackBar();
              },
            ),
      ),
    );
  }

  /// Show an error dialog
  static Future<void> showErrorDialog(
    BuildContext context, {
    String title = 'Error',
    required String message,
    String? details,
    String dismissLabel = 'OK',
    VoidCallback? onDismiss,
  }) async {
    await showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Row(
          children: [
            Icon(
              Icons.error_outline,
              color: Theme.of(context).colorScheme.error,
            ),
            const SizedBox(width: 8),
            Text(title),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(message),
            if (details != null) ...[
              const SizedBox(height: 16),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Theme.of(context).colorScheme.surfaceContainerHighest,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  details,
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        fontFamily: 'monospace',
                      ),
                ),
              ),
            ],
          ],
        ),
        actions: [
          TextButton(
            onPressed: () {
              Navigator.of(context).pop();
              onDismiss?.call();
            },
            child: Text(dismissLabel),
          ),
        ],
      ),
    );
  }

  /// Show a retry dialog
  static Future<bool> showRetryDialog(
    BuildContext context, {
    String title = 'Error',
    required String message,
    String retryLabel = 'Retry',
    String cancelLabel = 'Cancel',
  }) async {
    final result = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Row(
          children: [
            Icon(
              Icons.warning_amber_outlined,
              color: Theme.of(context).colorScheme.error,
            ),
            const SizedBox(width: 8),
            Text(title),
          ],
        ),
        content: Text(message),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: Text(cancelLabel),
          ),
          ElevatedButton(
            onPressed: () => Navigator.of(context).pop(true),
            child: Text(retryLabel),
          ),
        ],
      ),
    );
    return result ?? false;
  }

  /// Map common error codes to user-friendly messages
  static String getErrorMessage(String? errorCode) {
    return _errorMessages[errorCode] ?? 'An unexpected error occurred';
  }

  static const Map<String, String> _errorMessages = {
    'timeout_error': 'Connection timed out. Please check your internet and try again.',
    'connection_error': 'No internet connection. Please check your network.',
    'server_error': 'Server error. Please try again later.',
    'auth_required': 'Please log in to continue.',
    'session_expired': 'Your session has expired. Please log in again.',
    'invalid_credentials': 'Invalid email or password.',
    'user_not_found': 'User not found.',
    'permission_denied': 'You don\'t have permission to perform this action.',
    'not_found': 'The requested resource was not found.',
    'validation_error': 'Please check your input and try again.',
    'rate_limited': 'Too many requests. Please wait and try again.',
    'maintenance': 'The app is under maintenance. Please try again later.',
    'unknown_error': 'An unexpected error occurred. Please try again.',
  };
}

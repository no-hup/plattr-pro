import 'package:flutter/foundation.dart';
import 'package:logger/logger.dart';

/// Centralized application logger.
/// Provides a consistent logging interface across all Platter apps.
class AppLogger {
  static final Logger _logger = Logger(
    printer: PrettyPrinter(
      methodCount: 0,
      errorMethodCount: 5,
      lineLength: 80,
      colors: true,
      printEmojis: true,
    ),
  );

  /// Logs a debug message (only in debug mode)
  static void debug(String message) {
    if (kDebugMode) {
      _logger.d(message);
    }
  }

  /// Logs an info message
  static void info(String message) {
    if (kDebugMode) {
      _logger.i(message);
    }
  }

  /// Logs a warning message
  static void warning(String message) {
    if (kDebugMode) {
      _logger.w(message);
    }
  }

  /// Logs an error message
  static void error(String message, {dynamic error, StackTrace? stackTrace}) {
    if (kDebugMode) {
      _logger.e(message, error: error, stackTrace: stackTrace);
    }
  }

  static void log(String message, {dynamic error, StackTrace? stackTrace}) {
    debug(message);
    if (error != null) {
      // Call static error method
      AppLogger.error(message, error: error, stackTrace: stackTrace);
    }
  }
}

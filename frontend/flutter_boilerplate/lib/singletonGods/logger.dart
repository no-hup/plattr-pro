import 'package:flutter/foundation.dart' show kDebugMode;  // For kDebugMode
import 'package:logger/logger.dart';                       // For Logger and Level

class AppLogger {
  static final Logger _logger = Logger(
    level: kDebugMode ? Level.debug : Level.error,
    printer: PrettyPrinter(
      methodCount: 0,
      errorMethodCount: 5,
      lineLength: 50,
      colors: true,
      printEmojis: true,
      printTime: true,
    ),
  );

  static void log(String message) {
    final msg = 'poopoo $message';
    _logger.d(msg);
    //print(msg); // Log at debug level
  }

  static void e(String message) {
    final msg = 'poopoo $message';
    _logger.e(msg); // Log at error level
  }

  static void i(String message) {
    final msg = 'poopoo $message';
    _logger.i(msg); // Log at info level
  }
}

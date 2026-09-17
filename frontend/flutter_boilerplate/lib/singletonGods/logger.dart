import 'package:flutter/foundation.dart' show kDebugMode;  // For kDebugMode
import 'package:logger/logger.dart';                       // For Logger and Level

class AppLogger {
  static final Logger _logger = Logger(
    level: kDebugMode ? Level.debug : Level.error,
    printer: PrettyPrinter(
      methodCount: 0,
      errorMethodCount: 5,
      lineLength: 50,
      printTime: true,
    ),
  );

  static void log(String message) {
    _logger.d(message);
    //print(msg); // Log at debug level
  }

  static void e(String message) {
    _logger.e(message); // Log at error level
  }

  static void i(String message) {
    _logger.i(message); // Log at info level
  }
}

/// Centralized logger for the Platter Server app.
/// Use AppLogger.log() for all logging.
class AppLogger {
  static void log(Object? message) {
    // You can enhance this to log to a file, remote server, etc.
    // For now, just print to console.
    print('[AppLogger] $message');
  }
}

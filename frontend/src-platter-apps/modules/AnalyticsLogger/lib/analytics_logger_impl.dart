import 'analytics_logger.dart';

/// Basic implementation of AnalyticsLogger that logs to console.
class ConsoleAnalyticsLogger implements AnalyticsLogger {
  @override
  void logEvent(String eventName, Map<String, dynamic> properties, {bool isPriority = true}) {
    print('[Analytics Event] $eventName: $properties (priority: $isPriority)');
  }

  @override
  void logConsoleError(String eventName, String description, {String? stacktrace}) {
    print('[Console Error] $eventName: $description${stacktrace != null ? '\nStack: $stacktrace' : ''}');
  }

  @override
  void logConsoleWarning(String eventName, String description, {String? stacktrace}) {
    print('[Console Warning] $eventName: $description${stacktrace != null ? '\nStack: $stacktrace' : ''}');
  }
}

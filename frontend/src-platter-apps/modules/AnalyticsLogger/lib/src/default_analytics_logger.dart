import '../analytics_logger.dart';

/// A basic default implementation of [AnalyticsLogger].
///
/// This implementation currently uses `// TODO:` placeholders.
/// It should be replaced or configured with a real logging service.
class DefaultAnalyticsLogger implements AnalyticsLogger {
  @override
  void logEvent(
    String eventName,
    Map<String, dynamic> properties,
    {bool isPriority = true}) {
    // TODO: Implement actual event logging (e.g., send to Firebase Analytics, Amplitude, etc.)
    print(
        '[Analytics Event] Name: $eventName, Properties: $properties, Priority: $isPriority');
  }

  @override
  void logConsoleError(
    String eventName,
    String description,
    {String? stacktrace}) {
    // TODO: Implement actual console error logging (e.g., send to Sentry, Crashlytics, etc.)
    print(
        '[Console Error] Name: $eventName, Description: $description\nStackTrace: ${stacktrace ?? 'N/A'}');
  }

  @override
  void logConsoleWarning(
    String eventName,
    String description,
    {String? stacktrace}) {
    // TODO: Implement actual console warning logging
    print(
        '[Console Warning] Name: $eventName, Description: $description\nStackTrace: ${stacktrace ?? 'N/A'}');
  }
} 
library analytics_logger;

/// Abstract interface for logging analytics events, console errors, and warnings.
///
/// This interface allows different logging implementations to be swapped without
/// changing the calling code in the applications.
abstract class AnalyticsLogger {
  /// Logs a general analytics event.
  ///
  /// - [eventName]: The name identifying the event.
  /// - [properties]: A map of key-value pairs providing context for the event.
  /// - [isPriority]: Indicates if the event should be treated with higher priority
  ///   (e.g., for real-time processing). Defaults to `true`.
  void logEvent(
    String eventName,
    Map<String, dynamic> properties,
    {bool isPriority = true});

  /// Logs a console error.
  ///
  /// - [eventName]: A name or code identifying the type of error.
  /// - [description]: A detailed description of the error.
  /// - [stacktrace]: An optional stack trace associated with the error.
  void logConsoleError(
    String eventName,
    String description,
    {String? stacktrace});

  /// Logs a console warning.
  ///
  /// - [eventName]: A name or code identifying the type of warning.
  /// - [description]: A detailed description of the warning.
  /// - [stacktrace]: An optional stack trace associated with the warning.
  void logConsoleWarning(
    String eventName,
    String description,
    {String? stacktrace});
} 
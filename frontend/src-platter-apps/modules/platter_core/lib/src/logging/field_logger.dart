import '../logging/app_logger.dart';

/// Helper for logging model parsing issues
class FieldLogger {
  /// Log and return default when required field is missing
  static T? logMissingField<T>(
    String modelName, 
    String fieldName, 
    T? value, {
    T? defaultValue
  }) {
    if (value == null) {
      AppLogger.log(
        'Warning: Missing required field "$fieldName" in $modelName. '
        'Using default: $defaultValue'
      );
      return defaultValue;
    }
    return value;
  }
  
  static void logParsingError(String modelName, String fieldName, dynamic value, dynamic error) {
    AppLogger.log(
      'Error parsing field "$fieldName" in $modelName. Value: $value. Error: $error'
    );
  }
}

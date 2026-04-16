import '../logging/app_logger.dart';

/// Safely converts dynamic value (int/String/null) to String ID
/// Returns empty string if null or invalid
String idFromJson(dynamic value) {
  if (value == null) return '';
  if (value is String) return value;
  if (value is int) return value.toString();
  
  // Log warning for unexpected types if it's not just null
  if (value.toString().isNotEmpty) {
     // We don't log deeply here to avoid spamming, but we ensure string conversion
     return value.toString();
  }
  
  return '';
}

/// Safely converts to int ID with logging for non-convertible values
/// Returns null if conversion fails
int? intIdFromJson(dynamic value, {String? fieldName}) {
  if (value == null) return null;
  if (value is int) return value;
  if (value is String) {
    final parsed = int.tryParse(value);
    if (parsed == null && fieldName != null) {
      AppLogger.log('Warning: Could not parse int for field $fieldName: $value');
    }
    return parsed;
  }
  return null;
}

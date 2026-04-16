import 'package:freezed_annotation/freezed_annotation.dart';
import '../../singletonGods/logger.dart';

/// Converts between Firestore timestamp format and DateTime objects
/// Handles both Map<String, dynamic> format with _seconds/_nanoseconds
/// and also gracefully handles string format and other common variants
class FirestoreTimestampConverter implements JsonConverter<DateTime, Object> {
  const FirestoreTimestampConverter();

  @override
  DateTime fromJson(Object json) {
    try {
      if (json is Map && json.containsKey('_seconds') && json['_seconds'] is num) {
        // Handle the {'_seconds': ..., '_nanoseconds': ...} map format
        final seconds = (json['_seconds'] as num).toInt();
        return DateTime.fromMillisecondsSinceEpoch(seconds * 1000, isUtc: true);
      } else if (json is String) {
        // Handle ISO 8601 String format if needed as a fallback
        return DateTime.parse(json);
      } else if (json is num) {
        // Handle Unix timestamp as milliseconds since epoch
        return DateTime.fromMillisecondsSinceEpoch(json.toInt(), isUtc: true);
      }
    } catch (e) {
      AppLogger.log('❌ FirestoreTimestampConverter: Error parsing timestamp format: $e');
    }
    
    AppLogger.log('⚠️ FirestoreTimestampConverter: Using fallback date for: $json');
    return DateTime(1970); // Fallback for unexpected types or errors
  }

  @override
  Object toJson(DateTime object) {
    // Convert to Firestore Timestamp format
    return {
      '_seconds': object.millisecondsSinceEpoch ~/ 1000,
      '_nanoseconds': 0,
    };
  }
} 
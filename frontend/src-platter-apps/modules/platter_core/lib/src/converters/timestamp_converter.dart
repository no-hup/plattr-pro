import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:json_annotation/json_annotation.dart';
import '../logging/app_logger.dart';

/// Unified timestamp converter for Platter
/// Handles various formats from backend:
/// - DateTime
/// - int (seconds or milliseconds)
/// - String (ISO 8601 or numeric string)
/// - Map (Firestore format: {_seconds, _nanoseconds})
/// - Timestamp (Firestore object)
DateTime? timestampFromJson(dynamic value) {
  if (value == null) return null;

  try {
    // Already a DateTime
    if (value is DateTime) return value;

    // Firestore Timestamp
    if (value is Timestamp) return value.toDate();

    // int (seconds or milliseconds)
    if (value is int) {
      if (value == 0) return null;
      // Heuristic: if > 10 billion, it's milliseconds (valid until year 2286)
      // Otherwise assumes seconds
      if (value > 10000000000) {
        return DateTime.fromMillisecondsSinceEpoch(value);
      }
      return DateTime.fromMillisecondsSinceEpoch(value * 1000);
    }

    // String (ISO or numeric)
    if (value is String) {
      if (value.isEmpty) return null;
      // Try parsing as ISO string
      try {
        return DateTime.parse(value);
      } catch (_) {
        // Try parsing as numeric string
        final numValue = int.tryParse(value);
        if (numValue != null) {
          return timestampFromJson(numValue);
        }
      }
    }

    // Map (Firestore raw format or other object)
    if (value is Map) {
      // {_seconds: 123, _nanoseconds: 456}
      if (value.containsKey('_seconds')) {
        final seconds = value['_seconds'];
        if (seconds is int) {
          return DateTime.fromMillisecondsSinceEpoch(seconds * 1000);
        }
      }
    }

    AppLogger.log('Warning: Unknown timestamp format: $value (${value.runtimeType})');
    return null;
  } catch (e, stack) {
    AppLogger.log('Error parsing timestamp: $e', error: e, stackTrace: stack);
    return null;
  }
}

/// JsonConverter for use with @JsonKey(fromJson: ...)
class TimestampConverter implements JsonConverter<DateTime?, dynamic> {
  const TimestampConverter();

  @override
  DateTime? fromJson(dynamic json) => timestampFromJson(json);

  @override
  dynamic toJson(DateTime? object) {
    if (object == null) return null;
    return Timestamp.fromDate(object);
  }
}

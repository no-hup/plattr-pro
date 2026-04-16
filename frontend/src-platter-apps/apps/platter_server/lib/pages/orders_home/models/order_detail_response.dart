import 'package:json_annotation/json_annotation.dart';
import 'order_detail.dart';

part 'order_detail_response.g.dart';

@JsonSerializable()
class OrderDetailResponse {
  final String id;
  final String orderNumber;
  final String orderStatus;
  @JsonKey(fromJson: _fromTimestamp)
  final DateTime createdAt;
  @JsonKey(fromJson: _fromTimestamp)
  final DateTime updatedAt;

  static DateTime _fromTimestamp(dynamic value) {
    if (value == null) return DateTime.fromMillisecondsSinceEpoch(0);
    if (value is int) {
      // Assume seconds since epoch
      return DateTime.fromMillisecondsSinceEpoch(value * 1000);
    }
    if (value is String && value.isNotEmpty) {
      // Try to parse as ISO string
      return DateTime.tryParse(value) ?? DateTime.fromMillisecondsSinceEpoch(0);
    }
    return DateTime.fromMillisecondsSinceEpoch(0);
  }

  final String tableId;
  final String restaurantId;
  final String? sessionId;
  final num total;
  final List<dynamic> items;
  final String notes;
  final List<dynamic> carts;
  final String? assignedServerName;
  final String? assignedServerId;

  OrderDetailResponse({
    required this.id,
    required this.orderNumber,
    required this.orderStatus,
    required this.createdAt,
    required this.updatedAt,
    required this.tableId,
    required this.restaurantId,
    required this.sessionId,
    required this.total,
    required this.items,
    required this.notes,
    required this.carts,
    this.assignedServerName,
    this.assignedServerId,
  });

  factory OrderDetailResponse.fromJson(Map<String, dynamic> json) {
    try {
      return _$OrderDetailResponseFromJson(json);
    } catch (e, stackTrace) {
      if (e is TypeError &&
          e.toString().contains("is not a subtype of type 'String'")) {
        // Define the keys of non-nullable String fields in OrderDetailResponse
        final nonNullableStringKeys = [
          'id',
          'orderNumber',
          'orderStatus',
          'tableId',
          'restaurantId',
          'notes',
        ];

        for (final key in nonNullableStringKeys) {
          if (json.containsKey(key) && json[key] == null) {
            // Assuming you have AppLogger available, similar to ResponseParser
            // If not, you can use print() or your preferred logging mechanism.
            // import '../../../../app_logger.dart'; // You might need to adjust this import
            print(
                'OrderDetailResponse.fromJson: Field \'$key\' is null, but expected a String. JSON: $json');
            // Consider rethrowing a more specific error if needed:
            // throw FormatException(
            //   "Field '$key' is null but expected String in OrderDetailResponse. Original error: $e",
            //   json,
            // );
            break; // Found the culprit, no need to check further for this error instance
          }
        }
      }
      // Rethrow the original error to maintain existing error handling flow
      rethrow;
    }
  }
  Map<String, dynamic> toJson() => _$OrderDetailResponseToJson(this);
}

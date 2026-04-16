import 'package:freezed_annotation/freezed_annotation.dart';

part 'active_order_models.freezed.dart';
part 'active_order_models.g.dart';

enum ActiveCartStatus {
  pending,
  cooking,
  ready,
  served,
  cancelled,
}

/// Represents a single "Ticket" or "Round" contextually displayed in the Live View.
/// 
/// Unlike [KitchenOrder], this model is flattened to represent the exact unit
/// of work as physical printed tickets usually do.
@freezed
class ActiveKitchenCart with _$ActiveKitchenCart {
  const ActiveKitchenCart._();

  const factory ActiveKitchenCart({
    required String cartId,
    required String orderId,
    @JsonKey(fromJson: _parseOrderNumber) required int orderNumber,
    required String tableNumber,
    String? serverName,
    @JsonKey(fromJson: _parseDateTime) required DateTime submittedAt,
    @JsonKey(fromJson: _parseStatus) required ActiveCartStatus status,
    required List<ActiveCartItem> items,
    String? kitchenNote,
  }) = _ActiveKitchenCart;

  factory ActiveKitchenCart.fromJson(Map<String, dynamic> json) => _$ActiveKitchenCartFromJson(json);

  // Computed helper
  bool get isUrgent => DateTime.now().difference(submittedAt).inMinutes > 20;
}

@freezed
class ActiveCartItem with _$ActiveCartItem {
  const factory ActiveCartItem({
    @Default('') @JsonKey(fromJson: _parseString) String itemId,
    @Default('Unknown Item') @JsonKey(fromJson: _parseString) String name,
    @JsonKey(fromJson: _parseInt) @Default(1) int quantity,
    @JsonKey(fromJson: _parseStringList) @Default([]) List<String> modifiers,
    @JsonKey(readValue: _readItemNote) String? itemNote,
    @Default(false) bool isVoided,
  }) = _ActiveCartItem;

  factory ActiveCartItem.fromJson(Map<String, dynamic> json) => _$ActiveCartItemFromJson(json);
}

enum KitchenViewType {
  cart,
  item,
}

@freezed
class ActiveCartsResponse with _$ActiveCartsResponse {
  const factory ActiveCartsResponse({
    @Default([]) List<ActiveKitchenCart> carts,
    @JsonKey(fromJson: _parseViewType) @Default(KitchenViewType.cart) KitchenViewType widgetType,
  }) = _ActiveCartsResponse;

  factory ActiveCartsResponse.fromJson(Map<String, dynamic> json) => _$ActiveCartsResponseFromJson(json);
}

// Helpers for robust parsing
int _parseInt(dynamic value) {
  if (value is int) return value;
  if (value is double) return value.round();
  if (value is String) return int.tryParse(value) ?? 0;
  return 0;
}

int _parseOrderNumber(dynamic value) {
  if (value is int) return value;
  if (value is double) return value.round();
  if (value is String) {
    final digits = RegExp(r'\d+')
        .allMatches(value)
        .map((m) => m.group(0))
        .whereType<String>()
        .join();
    if (digits.isNotEmpty) return int.tryParse(digits) ?? 0;
    return int.tryParse(value) ?? 0;
  }
  return 0;
}

String _parseString(dynamic value) {
  if (value == null) return '';
  return value.toString();
}

DateTime _parseDateTime(dynamic value) {
  if (value is DateTime) return value;
  if (value is int) return DateTime.fromMillisecondsSinceEpoch(value);
  if (value is double) return DateTime.fromMillisecondsSinceEpoch(value.round());
  if (value is String) return DateTime.tryParse(value) ?? DateTime.now();
  if (value is Map) {
    final seconds = value['seconds'] ?? value['_seconds'];
    final nanos = value['nanoseconds'] ?? value['_nanoseconds'] ?? 0;
    if (seconds is int) {
      return DateTime.fromMillisecondsSinceEpoch(
        (seconds * 1000) + (nanos is int ? (nanos / 1000000).round() : 0),
      );
    }
  }
  return DateTime.now();
}

ActiveCartStatus _parseStatus(dynamic value) {
  final str = value?.toString().toLowerCase();
  switch (str) {
    case 'pending':
    case 'ordered':
      return ActiveCartStatus.pending;
    case 'preparing':
    case 'cooking':
    case 'in_progress':
    case 'in-progress':
      return ActiveCartStatus.cooking;
    case 'ready':
    case 'ready_for_pickup':
      return ActiveCartStatus.ready;
    case 'served':
    case 'completed':
    case 'served_to_customer':
      return ActiveCartStatus.served;
    case 'cancelled':
    case 'canceled':
    case 'returned':
      return ActiveCartStatus.cancelled;
    default:
      break;
  }
  return ActiveCartStatus.values.firstWhere(
    (e) => e.name == str,
    orElse: () => ActiveCartStatus.pending,
  );
}

KitchenViewType _parseViewType(dynamic value) {
  final str = value?.toString().toLowerCase();
  if (str == 'item' || str == 'items') return KitchenViewType.item;
  return KitchenViewType.cart;
}

List<String> _parseStringList(dynamic value) {
  if (value is List) {
    return value
        .map((entry) => _parseString(entry))
        .where((entry) => entry.trim().isNotEmpty)
        .toList();
  }
  return [];
}

dynamic _readItemNote(Map<dynamic, dynamic> json, String key) {
  return json[key] ?? json['notes'] ?? json['note'];
}

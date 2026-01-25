import 'package:json_annotation/json_annotation.dart';
import 'cart_item_summary.dart';

part 'served_cart.g.dart';

/// Represents a served cart returned from getServedCartsForServer endpoint.
/// This is a flattened view of a cart with its parent order context.
@JsonSerializable()
class ServedCart {
  @JsonKey(defaultValue: '')
  final String orderId;

  @JsonKey(defaultValue: '')
  final String tableId;

  @JsonKey(defaultValue: '')
  final String orderNumber;

  @JsonKey(defaultValue: '')
  final String cartId;

  @JsonKey(defaultValue: 0)
  final int cartIndex;

  @JsonKey(defaultValue: '')
  final String status;

  @JsonKey(defaultValue: '')
  final String statusColorHex;

  /// Timestamp when the cart was served (milliseconds since epoch)
  @JsonKey(name: 'servedAt')
  final int? servedAtMs;

  /// Price info for the order (contains finalPrice)
  @JsonKey(name: 'priceInfo')
  final ServedCartPriceInfo? priceInfo;

  @JsonKey(defaultValue: [])
  final List<CartItemSummary> items;

  ServedCart({
    required this.orderId,
    required this.tableId,
    this.orderNumber = '',
    required this.cartId,
    this.cartIndex = 0,
    required this.status,
    this.statusColorHex = '',
    this.servedAtMs,
    this.priceInfo,
    required this.items,
  });

  factory ServedCart.fromJson(Map<String, dynamic> json) => _$ServedCartFromJson(json);

  Map<String, dynamic> toJson() => _$ServedCartToJson(this);

  /// Get the served timestamp as a DateTime, or null if not available
  DateTime? get servedAt => servedAtMs != null 
      ? DateTime.fromMillisecondsSinceEpoch(servedAtMs!) 
      : null;

  /// Get the final price from priceInfo, or 0 if not available
  num get finalPrice => priceInfo?.finalPrice ?? 0;
}

@JsonSerializable()
class ServedCartPriceInfo {
  @JsonKey(defaultValue: 0)
  final num finalPrice;

  ServedCartPriceInfo({
    required this.finalPrice,
  });

  factory ServedCartPriceInfo.fromJson(Map<String, dynamic> json) => 
      _$ServedCartPriceInfoFromJson(json);

  Map<String, dynamic> toJson() => _$ServedCartPriceInfoToJson(this);
}

@JsonSerializable()
class ServedCartsResponse {
  @JsonKey(defaultValue: '')
  final String currentServerId;

  @JsonKey(defaultValue: [])
  final List<ServedCart> servedCarts;

  @JsonKey(defaultValue: 6)
  final int lookbackHours;

  ServedCartsResponse({
    this.currentServerId = '',
    required this.servedCarts,
    this.lookbackHours = 6,
  });

  factory ServedCartsResponse.fromJson(Map<String, dynamic> json) => 
      _$ServedCartsResponseFromJson(json);

  Map<String, dynamic> toJson() => _$ServedCartsResponseToJson(this);
}

import 'package:flutter/material.dart';
import 'package:json_annotation/json_annotation.dart';
import 'cart_summary.dart';
import 'price_info.dart';
import '../../../shared/status_utils.dart';

part 'order_summary.g.dart';

// Re-export or just use from shared.
// For minimal breakage, we can alias or just expect imports to be updated if used.
// But this file seems to define the json structure.
// We will replace the local definitions with imports.

CartStatus parseCartItemStatus(String value) =>
    StatusUtils.parseCartStatus(value);
OrderStatus parseOrderSummaryStatus(String value) =>
    StatusUtils.parseOrderStatus(value);

@JsonSerializable()
class OrderSummary {
  @JsonKey(defaultValue: '')
  final String orderId;

  @JsonKey(defaultValue: '')
  final String tableId;

  @JsonKey(defaultValue: '')
  final String status;

  /// Hex color for status (e.g., "#4CAF50")
  /// Falls back to StatusColors if not provided
  @JsonKey(defaultValue: '')
  final String statusColorHex;

  @JsonKey(defaultValue: [])
  final List<CartSummary> carts;

  @JsonKey(name: 'assignedServer', defaultValue: '')
  final String assignedTo;

  /// Price information for this order
  @JsonKey(name: 'priceInfo')
  final PriceInfo? priceInfo;

  OrderSummary({
    required this.orderId,
    required this.tableId,
    required this.status,
    this.statusColorHex = '',
    required this.carts,
    required this.assignedTo,
    this.priceInfo,
  });

  factory OrderSummary.fromJson(Map<String, dynamic> json) =>
      _$OrderSummaryFromJson(json);

  Map<String, dynamic> toJson() => _$OrderSummaryToJson(this);

  /// Get the status color, preferring backend-provided hex, falling back to constants
  Color get statusColor {
    if (statusColorHex.isNotEmpty) {
      return StatusColors.parseHexColor(statusColorHex);
    }
    return StatusColors.getColorForStatus(StatusUtils.parseCartStatus(status));
  }

  /// Get the final price from priceInfo, or 0 if not available
  num get finalPrice => priceInfo?.finalPrice ?? 0;
}

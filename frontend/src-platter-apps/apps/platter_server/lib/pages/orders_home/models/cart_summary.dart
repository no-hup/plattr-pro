import 'package:flutter/material.dart';
import 'package:json_annotation/json_annotation.dart';
import 'cart_item_summary.dart';
import '../../../shared/status_utils.dart'; // For StatusColors and parsing

part 'cart_summary.g.dart';

@JsonSerializable()
class CartSummary {
  @JsonKey(name: 'cartId', defaultValue: '', readValue: _readCartId)
  final String cartId;

  @JsonKey(defaultValue: '')
  final String status;

  /// Hex color for status (e.g., "#4CAF50")
  /// Falls back to StatusColors if not provided
  @JsonKey(defaultValue: '')
  final String statusColorHex;

  /// Index of this cart in the order's carts array (for API calls)
  @JsonKey(defaultValue: 0)
  final int cartIndex;

  @JsonKey(defaultValue: [])
  final List<CartItemSummary> items;

  CartSummary({
    required this.cartId,
    required this.status,
    this.statusColorHex = '',
    this.cartIndex = 0,
    required this.items,
  });

  factory CartSummary.fromJson(Map<String, dynamic> json) => _$CartSummaryFromJson(json);

  /// Handle hashCode -> cartId mapping for backward compatibility
  static Object? _readCartId(Map map, String key) {
    if (map['cartId'] != null) return map['cartId'];
    if (map['hashCode'] != null) return map['hashCode'].toString();
    return null;
  }
  Map<String, dynamic> toJson() => _$CartSummaryToJson(this);

  /// Get the status color, preferring backend-provided hex, falling back to constants
  Color get statusColor {
    if (statusColorHex.isNotEmpty) {
      return StatusColors.parseHexColor(statusColorHex);
    }
    return StatusColors.getColorForStatus(StatusUtils.parseCartStatus(status));
  }
}

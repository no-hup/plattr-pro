import 'package:flutter/material.dart';
import 'package:json_annotation/json_annotation.dart';
import 'cart_item_summary.dart';
import '../../../shared/status_utils.dart'; // For StatusColors and parsing

part 'cart_summary.g.dart';

@JsonSerializable()
class CartSummary {
  @JsonKey(name: 'cartId', defaultValue: '')
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

  factory CartSummary.fromJson(Map<String, dynamic> json) {
    // Handle hashCode -> cartId mapping for backward compatibility
    Map<String, dynamic> processedJson = Map.from(json);
    if (json['cartId'] == null && json['hashCode'] != null) {
      processedJson['cartId'] = json['hashCode'].toString();
    }
    return _$CartSummaryFromJson(processedJson);
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

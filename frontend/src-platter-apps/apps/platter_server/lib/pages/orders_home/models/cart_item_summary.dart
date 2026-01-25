import 'package:flutter/material.dart';
import 'package:json_annotation/json_annotation.dart';
import 'order_summary.dart'; // For StatusColors and parseCartStatus

part 'cart_item_summary.g.dart';

@JsonSerializable()
class CartItemSummary {
  @JsonKey(name: 'menuItemId', defaultValue: '')
  final String itemId;

  @JsonKey(defaultValue: '')
  final String name;

  @JsonKey(defaultValue: 0)
  final int quantity;

  @JsonKey(defaultValue: '')
  final String status;
  
  /// Hex color for status (e.g., "#4CAF50")
  /// Falls back to StatusColors if not provided
  @JsonKey(defaultValue: '')
  final String statusColorHex;

  CartItemSummary({
    required this.itemId,
    required this.name,
    required this.quantity,
    required this.status,
    this.statusColorHex = '',
  });

  factory CartItemSummary.fromJson(Map<String, dynamic> json) {
    // Special handling for name which can be in different locations
    Map<String, dynamic> processedJson = Map.from(json);
    if (json['name'] == null && json['menuItem'] != null && json['menuItem']['meta'] != null) {
      processedJson['name'] = json['menuItem']['meta']['name'];
    }
    
    return _$CartItemSummaryFromJson(processedJson);
  }

  Map<String, dynamic> toJson() => _$CartItemSummaryToJson(this);
  
  /// Get the status color, preferring backend-provided hex, falling back to constants
  Color get statusColor {
    if (statusColorHex.isNotEmpty) {
      return StatusColors.parseHexColor(statusColorHex);
    }
    return StatusColors.getColorForStatus(parseCartStatus(status));
  }
}

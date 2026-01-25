import 'package:flutter/material.dart';
import 'package:json_annotation/json_annotation.dart';
import 'cart_summary.dart';
import 'price_info.dart';

part 'order_summary.g.dart';

enum OrderStatus {
  pending,
  inProgress,
  completed,
  cancelled,
  unknown,
}

enum CartStatus {
  pending,
  preparing,
  ready,
  served,
  returned,
  cancelled,
  unknown,
}

String normalizeOrderStatus(String value) {
  switch (value.toUpperCase()) {
    case 'PENDING':
      return 'PENDING';
    case 'IN_PROGRESS':
    case 'ACTIVE':
    case 'PROCESSING':
    case 'CONFIRMED':
    case 'PREPARING':
    case 'READY':
      return 'IN_PROGRESS';
    case 'COMPLETED':
    case 'COMPLETE':
      return 'COMPLETED';
    case 'CANCELLED':
    case 'CANCELED':
      return 'CANCELLED';
    default:
      return 'UNKNOWN';
  }
}

String normalizeCartStatus(String value) {
  switch (value.toUpperCase()) {
    case 'PENDING':
    case 'ORDERED':
      return 'PENDING';
    case 'PREPARING':
    case 'COOKING':
      return 'PREPARING';
    case 'READY':
    case 'READY_FOR_PICKUP':
      return 'READY';
    case 'SERVED':
    case 'COMPLETED':
    case 'SERVED_TO_CUSTOMER':
      return 'SERVED';
    case 'RETURNED':
      return 'RETURNED';
    case 'CANCELLED':
    case 'CANCELED':
      return 'CANCELLED';
    default:
      return 'UNKNOWN';
  }
}

OrderStatus parseOrderStatus(String? value) {
  if (value == null) return OrderStatus.unknown;
  switch (normalizeOrderStatus(value)) {
    case 'PENDING':
      return OrderStatus.pending;
    case 'IN_PROGRESS':
      return OrderStatus.inProgress;
    case 'COMPLETED':
      return OrderStatus.completed;
    case 'CANCELLED':
      return OrderStatus.cancelled;
    default:
      return OrderStatus.unknown;
  }
}

CartStatus parseCartStatus(String? value) {
  if (value == null) return CartStatus.unknown;
  switch (normalizeCartStatus(value)) {
    case 'PENDING':
      return CartStatus.pending;
    case 'PREPARING':
      return CartStatus.preparing;
    case 'READY':
      return CartStatus.ready;
    case 'SERVED':
      return CartStatus.served;
    case 'RETURNED':
      return CartStatus.returned;
    case 'CANCELLED':
      return CartStatus.cancelled;
    default:
      return CartStatus.unknown;
  }
}

String mapCartStatusToDisplay(String status) {
  switch (parseCartStatus(status)) {
    case CartStatus.pending:
      return 'Pending';
    case CartStatus.preparing:
      return 'Preparing';
    case CartStatus.ready:
      return 'Ready';
    case CartStatus.served:
      return 'Served';
    case CartStatus.returned:
      return 'Returned';
    case CartStatus.cancelled:
      return 'Cancelled';
    case CartStatus.unknown:
    default:
      return 'Unknown';
  }
}

String mapOrderStatusToDisplay(String status) {
  switch (parseOrderStatus(status)) {
    case OrderStatus.pending:
      return 'Pending';
    case OrderStatus.inProgress:
      return 'In Progress';
    case OrderStatus.completed:
      return 'Completed';
    case OrderStatus.cancelled:
      return 'Cancelled';
    case OrderStatus.unknown:
    default:
      return 'Unknown';
  }
}

CartStatus parseCartItemStatus(String value) => parseCartStatus(value);
OrderStatus parseOrderSummaryStatus(String value) => parseOrderStatus(value);

/// Default status colors (fallback when backend doesn't provide color)
class StatusColors {
  static const Color pendingColor = Color(0xFFFFC107);    // Yellow
  static const Color preparingColor = Color(0xFFFFC107);  // Yellow
  static const Color readyColor = Color(0xFF4CAF50);      // Green
  static const Color servedColor = Color(0xFF4CAF50);     // Green
  static const Color cancelledColor = Color(0xFFF44336); // Red
  static const Color returnedColor = Color(0xFFF44336);   // Red
  static const Color unknownColor = Color(0xFF9E9E9E);    // Grey
  
  /// Get color for a cart status
  static Color getColorForStatus(CartStatus status) {
    switch (status) {
      case CartStatus.pending:
        return pendingColor;
      case CartStatus.preparing:
        return preparingColor;
      case CartStatus.ready:
        return readyColor;
      case CartStatus.served:
        return servedColor;
      case CartStatus.cancelled:
        return cancelledColor;
      case CartStatus.returned:
        return returnedColor;
      case CartStatus.unknown:
      default:
        return unknownColor;
    }
  }
  
  /// Parse a hex color string to Color (fallback to grey if invalid)
  static Color parseHexColor(String? hexColor) {
    if (hexColor == null || hexColor.isEmpty) return unknownColor;
    try {
      // Remove leading # if present
      final hex = hexColor.startsWith('#') ? hexColor.substring(1) : hexColor;
      // Parse 6-character hex (RGB)
      if (hex.length == 6) {
        return Color(int.parse('FF$hex', radix: 16));
      }
      // Parse 8-character hex (ARGB)
      if (hex.length == 8) {
        return Color(int.parse(hex, radix: 16));
      }
      return unknownColor;
    } catch (e) {
      return unknownColor;
    }
  }
}

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

  factory OrderSummary.fromJson(Map<String, dynamic> json) => _$OrderSummaryFromJson(json);

  Map<String, dynamic> toJson() => _$OrderSummaryToJson(this);
  
  /// Get the status color, preferring backend-provided hex, falling back to constants
  Color get statusColor {
    if (statusColorHex.isNotEmpty) {
      return StatusColors.parseHexColor(statusColorHex);
    }
    return StatusColors.getColorForStatus(parseCartStatus(status));
  }
  
  /// Get the final price from priceInfo, or 0 if not available
  num get finalPrice => priceInfo?.finalPrice ?? 0;
}

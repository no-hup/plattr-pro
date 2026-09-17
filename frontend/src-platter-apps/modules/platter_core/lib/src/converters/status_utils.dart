import 'package:flutter/material.dart';
import '../logging/app_logger.dart';
import 'package:json_annotation/json_annotation.dart';

enum OrderStatus {
  pending,
  inProgress,
  completed,
  cancelled,
  unknown,
}

enum CartStatus {
  /// Placed by the guest, not yet confirmed by a waiter. Only appears when the
  /// restaurant sets `ordering.requireWaiterConfirmation`. The kitchen endpoint
  /// withholds these carts, so in practice only the server app sees one.
  awaitingConfirmation,
  pending,
  preparing,
  ready,
  served,
  returned,
  cancelled,
  unknown,
}

/// Helper class for status logic and normalization
class StatusUtils {
  static String normalizeOrderStatus(String value) {
    final normalized = value.toUpperCase();
    switch (normalized) {
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
        AppLogger.log('Warning: Unknown Order Status encountered: $value');
        return 'UNKNOWN';
    }
  }

  static String normalizeCartStatus(String value) {
    final normalized = value.toUpperCase();
    switch (normalized) {
      case 'AWAITING_CONFIRMATION':
        return 'AWAITING_CONFIRMATION';
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
        AppLogger.log('Warning: Unknown Cart Status encountered: $value');
        return 'UNKNOWN';
    }
  }

  /// @JsonKey(fromJson: StatusUtils.parseOrderStatus)
  static OrderStatus parseOrderStatus(dynamic value) {
    if (value == null || value is! String) return OrderStatus.unknown;
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

  /// @JsonKey(fromJson: StatusUtils.parseCartStatus)
  static CartStatus parseCartStatus(dynamic value) {
    if (value == null || value is! String) return CartStatus.unknown;
    switch (normalizeCartStatus(value)) {
      case 'AWAITING_CONFIRMATION':
        return CartStatus.awaitingConfirmation;
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

  static String mapCartStatusToDisplay(String status) {
    switch (parseCartStatus(status)) {
      case CartStatus.awaitingConfirmation:
        return 'To confirm';
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

  static String mapOrderStatusToDisplay(String status) {
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

  // Valid status transitions (mirrors backend)
  static final Map<String, List<String>> _validTransitions = {
    'AWAITING_CONFIRMATION': ['PENDING', 'CANCELLED'],
    'PENDING': ['PREPARING', 'READY', 'CANCELLED'],
    'PREPARING': ['READY', 'CANCELLED'],
    'READY': ['SERVED', 'CANCELLED'],
    'SERVED': ['RETURNED'],
    'RETURNED': [],
    'CANCELLED': [],
  };

  /// Validates if a cart can transition from currentStatus to targetStatus
  static bool canTransition(String currentStatus, String targetStatus) {
    final current = normalizeCartStatus(currentStatus);
    final target = normalizeCartStatus(targetStatus);
    final allowed = _validTransitions[current] ?? [];
    return allowed.contains(target);
  }
}

/// Default status colors (fallback when backend doesn't provide color)
class StatusColors {
  static const Color awaitingConfirmationColor = Color(0xFF607D8B); // Blue grey
  static const Color pendingColor = Color(0xFFFFC107); // Yellow
  static const Color preparingColor = Color(0xFFFFC107); // Yellow
  static const Color readyColor = Color(0xFF4CAF50); // Green
  static const Color servedColor = Color(0xFF4CAF50); // Green
  static const Color cancelledColor = Color(0xFFF44336); // Red
  static const Color returnedColor = Color(0xFFF44336); // Red
  static const Color unknownColor = Color(0xFF9E9E9E); // Grey

  /// Get color for a cart status
  static Color getColorForStatus(CartStatus status) {
    switch (status) {
      case CartStatus.awaitingConfirmation:
        return awaitingConfirmationColor;
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

/// JsonConverter for use with @JsonKey
class OrderStatusConverter implements JsonConverter<OrderStatus, dynamic> {
  const OrderStatusConverter();

  @override
  OrderStatus fromJson(dynamic json) => StatusUtils.parseOrderStatus(json);

  @override
  dynamic toJson(OrderStatus object) => object.toString().split('.').last; // Simple serialization
}

class CartStatusConverter implements JsonConverter<CartStatus, dynamic> {
  const CartStatusConverter();

  @override
  CartStatus fromJson(dynamic json) => StatusUtils.parseCartStatus(json);

  @override
  dynamic toJson(CartStatus object) => object.toString().split('.').last;
}

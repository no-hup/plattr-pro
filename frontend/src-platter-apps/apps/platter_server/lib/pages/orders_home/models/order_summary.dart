import 'package:json_annotation/json_annotation.dart';
import 'cart_summary.dart';

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
  accepted,
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
    case 'ACCEPTED':
    case 'ACCEPT':
    case 'ACKNOWLEDGED':
      return 'ACCEPTED';
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
    case 'ACCEPTED':
      return CartStatus.accepted;
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
    case CartStatus.accepted:
      return 'Accepted';
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

@JsonSerializable()
class OrderSummary {
  @JsonKey(defaultValue: '')
  final String orderId;

  @JsonKey(defaultValue: '')
  final String tableId;

  @JsonKey(defaultValue: '')
  final String status;

  @JsonKey(defaultValue: [])
  final List<CartSummary> carts;

  @JsonKey(name: 'assignedServer', defaultValue: '')
  final String assignedTo;

  OrderSummary({
    required this.orderId,
    required this.tableId,
    required this.status,
    required this.carts,
    required this.assignedTo,
  });

  factory OrderSummary.fromJson(Map<String, dynamic> json) => _$OrderSummaryFromJson(json);

  Map<String, dynamic> toJson() => _$OrderSummaryToJson(this);
}

import 'package:json_annotation/json_annotation.dart';
import 'cart_summary.dart';

part 'order_summary.g.dart';

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

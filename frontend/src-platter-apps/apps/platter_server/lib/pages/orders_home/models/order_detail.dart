import 'package:json_annotation/json_annotation.dart';
import 'order_item_detail.dart';

part 'order_detail.g.dart';

@JsonSerializable()
class OrderDetail {
  final String orderId;
  final List<OrderItemDetail> items;

  OrderDetail({
    required this.orderId,
    required this.items,
  });

  factory OrderDetail.fromJson(Map<String, dynamic> json) => _$OrderDetailFromJson(json);

  Map<String, dynamic> toJson() => _$OrderDetailToJson(this);
}

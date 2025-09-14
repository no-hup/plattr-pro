import 'package:json_annotation/json_annotation.dart';
import 'order_summary.dart';

part 'order_list_response.g.dart';

@JsonSerializable()
class OrderListResponse {
  @JsonKey(defaultValue: [])
  final List<OrderSummary> orders;

  OrderListResponse({required this.orders});

  factory OrderListResponse.fromJson(Map<String, dynamic> json) => _$OrderListResponseFromJson(json);

  Map<String, dynamic> toJson() => _$OrderListResponseToJson(this);
}

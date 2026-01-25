import 'package:json_annotation/json_annotation.dart';
import 'order_summary.dart';
import 'ui_flags.dart';

part 'order_list_response.g.dart';

@JsonSerializable()
class OrderListResponse {
  /// Current server ID derived from session
  @JsonKey(defaultValue: '')
  final String currentServerId;

  /// UI configuration flags from the restaurant
  @JsonKey(name: 'uiFlags')
  final UiFlags? uiFlags;

  @JsonKey(defaultValue: [])
  final List<OrderSummary> orders;

  OrderListResponse({
    this.currentServerId = '',
    this.uiFlags,
    required this.orders,
  });

  factory OrderListResponse.fromJson(Map<String, dynamic> json) =>
      _$OrderListResponseFromJson(json);

  Map<String, dynamic> toJson() => _$OrderListResponseToJson(this);

  /// Get UiFlags with defaults if not provided
  UiFlags get effectiveUiFlags => uiFlags ?? UiFlags.defaults();
}

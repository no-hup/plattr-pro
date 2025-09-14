import 'package:json_annotation/json_annotation.dart';

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

  CartItemSummary({
    required this.itemId,
    required this.name,
    required this.quantity,
    required this.status,// pending, ready, completed, cancelled
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
}

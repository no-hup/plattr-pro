import 'package:json_annotation/json_annotation.dart';
import 'cart_item_summary.dart';

part 'cart_summary.g.dart';

@JsonSerializable()
class CartSummary {
  @JsonKey(name: 'hashCode', defaultValue: '')
  final String cartId;

  @JsonKey(defaultValue: '')
  final String status;

  @JsonKey(defaultValue: [])
  final List<CartItemSummary> items;

  CartSummary({
    required this.cartId,
    required this.status,
    required this.items,
  });

  factory CartSummary.fromJson(Map<String, dynamic> json) => _$CartSummaryFromJson(json);

  Map<String, dynamic> toJson() => _$CartSummaryToJson(this);
}

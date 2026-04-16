import 'package:json_annotation/json_annotation.dart';
import 'addon_detail.dart';
import 'variant_detail.dart';

part 'order_item_detail.g.dart';

@JsonSerializable()
class OrderItemDetail {
  final String menuItemId;
  final String name;
  final int quantity;
  final List<AddonDetail>? addons;
  final List<VariantDetail>? variants;

  OrderItemDetail({
    required this.menuItemId,
    required this.name,
    required this.quantity,
    this.addons, // Now nullable, 'required' can be removed if they can be omitted in constructor
    this.variants, // Now nullable, 'required' can be removed if they can be omitted in constructor
  });

  factory OrderItemDetail.fromJson(Map<String, dynamic> json) =>
      _$OrderItemDetailFromJson(json);

  Map<String, dynamic> toJson() => _$OrderItemDetailToJson(this);
}

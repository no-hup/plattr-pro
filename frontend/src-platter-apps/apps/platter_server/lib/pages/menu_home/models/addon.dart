import 'package:json_annotation/json_annotation.dart';
import 'price_info.dart';
import 'addon_meta.dart';

part 'addon.g.dart';

@JsonSerializable(createToJson: true, explicitToJson: true)
class Addon {
  @JsonKey(required: true, disallowNullValue: true)
  final String id;

  @JsonKey(required: true, disallowNullValue: true)
  final PriceInfo priceInfo;

  @JsonKey(required: true, disallowNullValue: true)
  final AddonMeta meta;

  @JsonKey(defaultValue: true)
  final bool respectParentDiscount;

  @JsonKey(defaultValue: true)
  final bool isInStock;

  @JsonKey(defaultValue: [])
  final List<String> itemsAssociatedWith;

  @JsonKey(defaultValue: false)
  final bool isMandatory;

  const Addon({
    required this.id,
    required this.priceInfo,
    required this.meta,
    this.respectParentDiscount = true,
    this.isInStock = true,
    this.itemsAssociatedWith = const [],
    this.isMandatory = false,
  });

  factory Addon.fromJson(Map<String, dynamic> json) => _$AddonFromJson(json);
  Map<String, dynamic> toJson() => _$AddonToJson(this);
}

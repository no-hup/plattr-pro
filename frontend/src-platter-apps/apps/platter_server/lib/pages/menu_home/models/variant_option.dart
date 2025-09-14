import 'package:json_annotation/json_annotation.dart';
import 'price_info.dart';

part 'variant_option.g.dart';

@JsonSerializable(createToJson: true, explicitToJson: true)
class VariantOption {
  @JsonKey(required: true, disallowNullValue: true)
  final String id;

  @JsonKey(required: true, disallowNullValue: true)
  final String name;

  @JsonKey(required: true, disallowNullValue: true)
  final PriceInfo priceInfo;

  const VariantOption({
    required this.id,
    required this.name,
    required this.priceInfo,
  });

  factory VariantOption.fromJson(Map<String, dynamic> json) => _$VariantOptionFromJson(json);
  Map<String, dynamic> toJson() => _$VariantOptionToJson(this);
}

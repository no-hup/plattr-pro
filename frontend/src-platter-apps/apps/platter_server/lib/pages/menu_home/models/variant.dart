import 'package:json_annotation/json_annotation.dart';
import 'variant_meta.dart';
import 'variant_option.dart';

part 'variant.g.dart';

@JsonSerializable(createToJson: true, explicitToJson: true)
class Variant {
  @JsonKey(required: true, disallowNullValue: true)
  final String id;

  @JsonKey(required: true, disallowNullValue: true)
  final VariantMeta meta;

  @JsonKey(required: true, disallowNullValue: true)
  final List<VariantOption> options;

  @JsonKey(defaultValue: true)
  final bool respectParentDiscount;

  @JsonKey(defaultValue: [])
  final List<String> itemsAssociatedWith;

  @JsonKey(defaultValue: false)
  final bool isMandatory;

  @JsonKey(required: true, disallowNullValue: true)
  final String name;

  const Variant({
    required this.id,
    required this.meta,
    required this.options,
    this.respectParentDiscount = true,
    this.itemsAssociatedWith = const [],
    this.isMandatory = false,
    required this.name,
  });

  factory Variant.fromJson(Map<String, dynamic> json) => _$VariantFromJson(json);
  Map<String, dynamic> toJson() => _$VariantToJson(this);
}

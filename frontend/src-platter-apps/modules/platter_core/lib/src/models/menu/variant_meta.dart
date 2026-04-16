import 'package:json_annotation/json_annotation.dart';

part 'variant_meta.g.dart';

@JsonSerializable(createToJson: true)
class VariantMeta {
  @JsonKey(required: true, disallowNullValue: true)
  final String name;

  @JsonKey(defaultValue: '')
  final String description;

  @JsonKey(defaultValue: [])
  final List<String> categoryAssociatedWith;

  const VariantMeta({
    required this.name,
    this.description = '',
    this.categoryAssociatedWith = const [],
  });

  factory VariantMeta.fromJson(Map<String, dynamic> json) =>
      _$VariantMetaFromJson(json);
  Map<String, dynamic> toJson() => _$VariantMetaToJson(this);
}

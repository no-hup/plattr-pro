import 'package:json_annotation/json_annotation.dart';

part 'addon_meta.g.dart';

@JsonSerializable(createToJson: true)
class AddonMeta {
  @JsonKey(required: true, disallowNullValue: true)
  final String name;

  @JsonKey(defaultValue: '')
  final String description;

  @JsonKey(defaultValue: [])
  final List<String> categoryAssociatedWith;

  const AddonMeta({
    required this.name,
    this.description = '',
    this.categoryAssociatedWith = const [],
  });

  factory AddonMeta.fromJson(Map<String, dynamic> json) => _$AddonMetaFromJson(json);
  Map<String, dynamic> toJson() => _$AddonMetaToJson(this);
}

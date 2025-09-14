import 'package:json_annotation/json_annotation.dart';

part 'menu_item_meta.g.dart';

@JsonSerializable(createToJson: true)
class MenuItemMeta {
  @JsonKey(required: true, disallowNullValue: true)
  final String name;

  @JsonKey(required: true, disallowNullValue: true)
  final String description;

  @JsonKey(defaultValue: '')
  final String categoryName;

  @JsonKey(defaultValue: '')
  final String image;

  MenuItemMeta({
    required this.name,
    required this.description,
    this.categoryName = '',
    this.image = '',
  });

  factory MenuItemMeta.fromJson(Map<String, dynamic> json) => _$MenuItemMetaFromJson(json);
  Map<String, dynamic> toJson() => _$MenuItemMetaToJson(this);
}

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
  final String primarySubcategoryName;

  @JsonKey(defaultValue: '')
  final String dietaryType;

  @JsonKey(defaultValue: 0)
  final int spiceLevel;

  @JsonKey(defaultValue: false)
  final bool isVegan;

  @JsonKey(defaultValue: '')
  final String image;

  MenuItemMeta({
    required this.name,
    required this.description,
    this.categoryName = '',
    this.primarySubcategoryName = '',
    this.dietaryType = '',
    this.spiceLevel = 0,
    this.isVegan = false,
    this.image = '',
  });

  factory MenuItemMeta.fromJson(Map<String, dynamic> json) =>
      _$MenuItemMetaFromJson(json);
  Map<String, dynamic> toJson() => _$MenuItemMetaToJson(this);
}

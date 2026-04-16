import 'package:json_annotation/json_annotation.dart';
import 'menu_subcategory.dart';

part 'menu_category.g.dart';

@JsonSerializable(createToJson: true)
class MenuCategory {
  @JsonKey(required: true, disallowNullValue: true)
  final String id;

  @JsonKey(required: true, disallowNullValue: true)
  final String name;

  @JsonKey(defaultValue: '')
  final String description;

  @JsonKey(defaultValue: '')
  final String image;

  @JsonKey(name: 'order', defaultValue: 0)
  final int order;

  @JsonKey(defaultValue: [])
  final List<String> subcategoryIds;

  @JsonKey(defaultValue: [])
  final List<MenuSubcategory> subcategories;

  MenuCategory({
    required this.id,
    required this.name,
    this.description = '',
    this.image = '',
    this.order = 0,
    this.subcategoryIds = const [],
    this.subcategories = const [],
  });

  factory MenuCategory.fromJson(Map<String, dynamic> json) =>
      _$MenuCategoryFromJson(json);
  Map<String, dynamic> toJson() => _$MenuCategoryToJson(this);
}

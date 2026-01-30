import 'package:json_annotation/json_annotation.dart';

part 'menu_subcategory.g.dart';

@JsonSerializable(createToJson: true)
class MenuSubcategory {
  @JsonKey(required: true, disallowNullValue: true)
  final String id;

  @JsonKey(required: true, disallowNullValue: true)
  final String name;

  @JsonKey(defaultValue: '')
  final String description;

  @JsonKey(defaultValue: '')
  final String image;

  @JsonKey(name: 'parentCategoryId', defaultValue: '')
  final String parentCategoryId;

  @JsonKey(name: 'order', defaultValue: 0)
  final int order;

  const MenuSubcategory({
    required this.id,
    required this.name,
    this.description = '',
    this.image = '',
    this.parentCategoryId = '',
    this.order = 0,
  });

  factory MenuSubcategory.fromJson(Map<String, dynamic> json) =>
      _$MenuSubcategoryFromJson(json);
  Map<String, dynamic> toJson() => _$MenuSubcategoryToJson(this);
}

import 'package:json_annotation/json_annotation.dart';

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

  MenuCategory({
    required this.id,
    required this.name,
    this.description = '',
    this.image = '',
    this.order = 0,
  });

  factory MenuCategory.fromJson(Map<String, dynamic> json) =>
      _$MenuCategoryFromJson(json);
  Map<String, dynamic> toJson() => _$MenuCategoryToJson(this);
}

import 'package:json_annotation/json_annotation.dart';
import 'menu_category.dart';

part 'restaurant_menu.g.dart';

@JsonSerializable(createToJson: true)
class RestaurantMenu {
  @JsonKey(required: true, disallowNullValue: true)
  final String restaurantId;

  @JsonKey(defaultValue: [])
  final List<MenuCategory> categories;

  @JsonKey(name: 'updatedAt', defaultValue: '')
  final String lastUpdated;

  RestaurantMenu({
    required this.restaurantId,
    this.categories = const [],
    this.lastUpdated = '',
  });

  factory RestaurantMenu.fromJson(Map<String, dynamic> json) =>
      _$RestaurantMenuFromJson(json);
  Map<String, dynamic> toJson() => _$RestaurantMenuToJson(this);
}

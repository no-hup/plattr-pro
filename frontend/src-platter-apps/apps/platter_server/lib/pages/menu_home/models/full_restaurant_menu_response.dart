import 'package:json_annotation/json_annotation.dart';
import 'menu_category.dart';
import 'menu_item.dart';

part 'full_restaurant_menu_response.g.dart';

@JsonSerializable(createToJson: true, explicitToJson: true)
class FullRestaurantMenuResponse {
  final List<MenuCategory> categories;
  final Map<String, List<MenuItem>> menuItems;
  final Map<String, dynamic>? metadata;

  FullRestaurantMenuResponse({
    required this.categories,
    required this.menuItems,
    this.metadata,
  });

  factory FullRestaurantMenuResponse.fromJson(Map<String, dynamic> json) => _$FullRestaurantMenuResponseFromJson(json);
  Map<String, dynamic> toJson() => _$FullRestaurantMenuResponseToJson(this);
}

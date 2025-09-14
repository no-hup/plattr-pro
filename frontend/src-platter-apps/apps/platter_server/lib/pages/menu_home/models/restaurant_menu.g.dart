// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'restaurant_menu.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

RestaurantMenu _$RestaurantMenuFromJson(Map<String, dynamic> json) {
  $checkKeys(
    json,
    requiredKeys: const ['restaurantId'],
    disallowNullValues: const ['restaurantId'],
  );
  return RestaurantMenu(
    restaurantId: json['restaurantId'] as String,
    categories: (json['categories'] as List<dynamic>?)
            ?.map((e) => MenuCategory.fromJson(e as Map<String, dynamic>))
            .toList() ??
        [],
    lastUpdated: json['updatedAt'] as String? ?? '',
  );
}

Map<String, dynamic> _$RestaurantMenuToJson(RestaurantMenu instance) =>
    <String, dynamic>{
      'restaurantId': instance.restaurantId,
      'categories': instance.categories,
      'updatedAt': instance.lastUpdated,
    };

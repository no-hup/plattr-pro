// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'full_restaurant_menu_response.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

FullRestaurantMenuResponse _$FullRestaurantMenuResponseFromJson(
        Map<String, dynamic> json) =>
    FullRestaurantMenuResponse(
      categories: (json['categories'] as List<dynamic>)
          .map((e) => MenuCategory.fromJson(e as Map<String, dynamic>))
          .toList(),
      menuItems: (json['menuItems'] as Map<String, dynamic>).map(
        (k, e) => MapEntry(
            k,
            (e as List<dynamic>)
                .map((e) => MenuItem.fromJson(e as Map<String, dynamic>))
                .toList()),
      ),
      metadata: json['metadata'] as Map<String, dynamic>?,
    );

Map<String, dynamic> _$FullRestaurantMenuResponseToJson(
        FullRestaurantMenuResponse instance) =>
    <String, dynamic>{
      'categories': instance.categories.map((e) => e.toJson()).toList(),
      'menuItems': instance.menuItems
          .map((k, e) => MapEntry(k, e.map((e) => e.toJson()).toList())),
      'metadata': instance.metadata,
    };

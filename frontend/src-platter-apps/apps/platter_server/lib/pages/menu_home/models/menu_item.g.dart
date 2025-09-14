// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'menu_item.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

MenuItem _$MenuItemFromJson(Map<String, dynamic> json) {
  $checkKeys(
    json,
    requiredKeys: const [
      'menuItemId',
      'meta',
      'priceInfo',
      'categoryId',
      'nutritionalInfo'
    ],
    disallowNullValues: const [
      'menuItemId',
      'meta',
      'priceInfo',
      'categoryId',
      'nutritionalInfo'
    ],
  );
  return MenuItem(
    id: json['menuItemId'] as String,
    meta: MenuItemMeta.fromJson(json['meta'] as Map<String, dynamic>),
    priceInfo: PriceInfo.fromJson(json['priceInfo'] as Map<String, dynamic>),
    isAvailable: json['isInStock'] as bool? ?? true,
    categoryId: json['categoryId'] as String,
    restaurantId: json['restaurantId'] as String? ?? '',
    nutritionalInfo: NutritionalInfo.fromJson(
        json['nutritionalInfo'] as Map<String, dynamic>),
    addons: (json['addons'] as List<dynamic>?)
            ?.map((e) => Addon.fromJson(e as Map<String, dynamic>))
            .toList() ??
        [],
    isCustomizable: json['isCustomizable'] as bool? ?? false,
    allergenTags: (json['allergenTags'] as List<dynamic>?)
            ?.map((e) => e as String)
            .toList() ??
        [],
    variants: (json['variants'] as List<dynamic>?)
            ?.map((e) => Variant.fromJson(e as Map<String, dynamic>))
            .toList() ??
        [],
  );
}

Map<String, dynamic> _$MenuItemToJson(MenuItem instance) => <String, dynamic>{
      'menuItemId': instance.id,
      'meta': instance.meta.toJson(),
      'priceInfo': instance.priceInfo.toJson(),
      'isInStock': instance.isAvailable,
      'categoryId': instance.categoryId,
      'restaurantId': instance.restaurantId,
      'nutritionalInfo': instance.nutritionalInfo.toJson(),
      'addons': instance.addons.map((e) => e.toJson()).toList(),
      'isCustomizable': instance.isCustomizable,
      'allergenTags': instance.allergenTags,
      'variants': instance.variants.map((e) => e.toJson()).toList(),
    };

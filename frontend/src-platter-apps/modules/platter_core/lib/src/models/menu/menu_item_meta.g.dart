// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'menu_item_meta.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

MenuItemMeta _$MenuItemMetaFromJson(Map<String, dynamic> json) {
  $checkKeys(
    json,
    requiredKeys: const ['name', 'description'],
    disallowNullValues: const ['name', 'description'],
  );
  return MenuItemMeta(
    name: json['name'] as String,
    description: json['description'] as String,
    categoryName: json['categoryName'] as String? ?? '',
    primarySubcategoryName: json['primarySubcategoryName'] as String? ?? '',
    dietaryType: json['dietaryType'] as String? ?? '',
    spiceLevel: (json['spiceLevel'] as num?)?.toInt() ?? 0,
    isVegan: json['isVegan'] as bool? ?? false,
    image: json['image'] as String? ?? '',
  );
}

Map<String, dynamic> _$MenuItemMetaToJson(MenuItemMeta instance) =>
    <String, dynamic>{
      'name': instance.name,
      'description': instance.description,
      'categoryName': instance.categoryName,
      'primarySubcategoryName': instance.primarySubcategoryName,
      'dietaryType': instance.dietaryType,
      'spiceLevel': instance.spiceLevel,
      'isVegan': instance.isVegan,
      'image': instance.image,
    };

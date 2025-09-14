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
    image: json['image'] as String? ?? '',
  );
}

Map<String, dynamic> _$MenuItemMetaToJson(MenuItemMeta instance) =>
    <String, dynamic>{
      'name': instance.name,
      'description': instance.description,
      'categoryName': instance.categoryName,
      'image': instance.image,
    };

// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'menu_category.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

MenuCategory _$MenuCategoryFromJson(Map<String, dynamic> json) {
  $checkKeys(
    json,
    requiredKeys: const ['id', 'name'],
    disallowNullValues: const ['id', 'name'],
  );
  return MenuCategory(
    id: json['id'] as String,
    name: json['name'] as String,
    description: json['description'] as String? ?? '',
    image: json['image'] as String? ?? '',
    order: (json['order'] as num?)?.toInt() ?? 0,
  );
}

Map<String, dynamic> _$MenuCategoryToJson(MenuCategory instance) =>
    <String, dynamic>{
      'id': instance.id,
      'name': instance.name,
      'description': instance.description,
      'image': instance.image,
      'order': instance.order,
    };

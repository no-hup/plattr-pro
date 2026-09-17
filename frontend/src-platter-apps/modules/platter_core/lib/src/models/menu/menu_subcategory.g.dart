// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'menu_subcategory.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

MenuSubcategory _$MenuSubcategoryFromJson(Map<String, dynamic> json) {
  $checkKeys(
    json,
    requiredKeys: const ['id', 'name'],
    disallowNullValues: const ['id', 'name'],
  );
  return MenuSubcategory(
    id: json['id'] as String,
    name: json['name'] as String,
    description: json['description'] as String? ?? '',
    image: json['image'] as String? ?? '',
    parentCategoryId: json['parentCategoryId'] as String? ?? '',
    order: (json['order'] as num?)?.toInt() ?? 0,
  );
}

Map<String, dynamic> _$MenuSubcategoryToJson(MenuSubcategory instance) =>
    <String, dynamic>{
      'id': instance.id,
      'name': instance.name,
      'description': instance.description,
      'image': instance.image,
      'parentCategoryId': instance.parentCategoryId,
      'order': instance.order,
    };

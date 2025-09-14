// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'category.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

Category _$CategoryFromJson(Map<String, dynamic> json) {
  $checkKeys(
    json,
    requiredKeys: const ['id', 'image', 'name', 'description', 'order'],
    disallowNullValues: const ['id', 'image', 'name', 'description', 'order'],
  );
  return Category(
    id: json['id'] as String,
    image: json['image'] as String,
    name: json['name'] as String,
    description: json['description'] as String,
    order: (json['order'] as num).toInt(),
  );
}

Map<String, dynamic> _$CategoryToJson(Category instance) => <String, dynamic>{
      'id': instance.id,
      'image': instance.image,
      'name': instance.name,
      'description': instance.description,
      'order': instance.order,
    };

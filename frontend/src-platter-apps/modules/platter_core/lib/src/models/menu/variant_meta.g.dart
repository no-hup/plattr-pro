// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'variant_meta.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

VariantMeta _$VariantMetaFromJson(Map<String, dynamic> json) {
  $checkKeys(
    json,
    requiredKeys: const ['name'],
    disallowNullValues: const ['name'],
  );
  return VariantMeta(
    name: json['name'] as String,
    description: json['description'] as String? ?? '',
    categoryAssociatedWith: (json['categoryAssociatedWith'] as List<dynamic>?)
            ?.map((e) => e as String)
            .toList() ??
        [],
  );
}

Map<String, dynamic> _$VariantMetaToJson(VariantMeta instance) =>
    <String, dynamic>{
      'name': instance.name,
      'description': instance.description,
      'categoryAssociatedWith': instance.categoryAssociatedWith,
    };

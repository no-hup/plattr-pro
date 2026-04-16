// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'addon_meta.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

AddonMeta _$AddonMetaFromJson(Map<String, dynamic> json) {
  $checkKeys(
    json,
    requiredKeys: const ['name'],
    disallowNullValues: const ['name'],
  );
  return AddonMeta(
    name: json['name'] as String,
    description: json['description'] as String? ?? '',
    categoryAssociatedWith: (json['categoryAssociatedWith'] as List<dynamic>?)
            ?.map((e) => e as String)
            .toList() ??
        [],
  );
}

Map<String, dynamic> _$AddonMetaToJson(AddonMeta instance) => <String, dynamic>{
      'name': instance.name,
      'description': instance.description,
      'categoryAssociatedWith': instance.categoryAssociatedWith,
    };

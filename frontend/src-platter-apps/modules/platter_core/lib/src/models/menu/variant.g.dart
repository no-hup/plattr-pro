// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'variant.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

Variant _$VariantFromJson(Map<String, dynamic> json) {
  $checkKeys(
    json,
    requiredKeys: const ['id', 'meta', 'options', 'name'],
    disallowNullValues: const ['id', 'meta', 'options', 'name'],
  );
  return Variant(
    id: json['id'] as String,
    meta: VariantMeta.fromJson(json['meta'] as Map<String, dynamic>),
    options: (json['options'] as List<dynamic>)
        .map((e) => VariantOption.fromJson(e as Map<String, dynamic>))
        .toList(),
    respectParentDiscount: json['respectParentDiscount'] as bool? ?? true,
    itemsAssociatedWith: (json['itemsAssociatedWith'] as List<dynamic>?)
            ?.map((e) => e as String)
            .toList() ??
        [],
    isMandatory: json['isMandatory'] as bool? ?? false,
    name: json['name'] as String,
  );
}

Map<String, dynamic> _$VariantToJson(Variant instance) => <String, dynamic>{
      'id': instance.id,
      'meta': instance.meta.toJson(),
      'options': instance.options.map((e) => e.toJson()).toList(),
      'respectParentDiscount': instance.respectParentDiscount,
      'itemsAssociatedWith': instance.itemsAssociatedWith,
      'isMandatory': instance.isMandatory,
      'name': instance.name,
    };

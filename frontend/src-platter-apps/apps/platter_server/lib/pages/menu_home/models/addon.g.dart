// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'addon.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

Addon _$AddonFromJson(Map<String, dynamic> json) {
  $checkKeys(
    json,
    requiredKeys: const ['id', 'priceInfo', 'meta'],
    disallowNullValues: const ['id', 'priceInfo', 'meta'],
  );
  return Addon(
    id: json['id'] as String,
    priceInfo: PriceInfo.fromJson(json['priceInfo'] as Map<String, dynamic>),
    meta: AddonMeta.fromJson(json['meta'] as Map<String, dynamic>),
    respectParentDiscount: json['respectParentDiscount'] as bool? ?? true,
    isInStock: json['isInStock'] as bool? ?? true,
    itemsAssociatedWith: (json['itemsAssociatedWith'] as List<dynamic>?)
            ?.map((e) => e as String)
            .toList() ??
        [],
    isMandatory: json['isMandatory'] as bool? ?? false,
  );
}

Map<String, dynamic> _$AddonToJson(Addon instance) => <String, dynamic>{
      'id': instance.id,
      'priceInfo': instance.priceInfo.toJson(),
      'meta': instance.meta.toJson(),
      'respectParentDiscount': instance.respectParentDiscount,
      'isInStock': instance.isInStock,
      'itemsAssociatedWith': instance.itemsAssociatedWith,
      'isMandatory': instance.isMandatory,
    };

// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'variant_option.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

VariantOption _$VariantOptionFromJson(Map<String, dynamic> json) {
  $checkKeys(
    json,
    requiredKeys: const ['id', 'name', 'priceInfo'],
    disallowNullValues: const ['id', 'name', 'priceInfo'],
  );
  return VariantOption(
    id: json['id'] as String,
    name: json['name'] as String,
    priceInfo: PriceInfo.fromJson(json['priceInfo'] as Map<String, dynamic>),
  );
}

Map<String, dynamic> _$VariantOptionToJson(VariantOption instance) =>
    <String, dynamic>{
      'id': instance.id,
      'name': instance.name,
      'priceInfo': instance.priceInfo.toJson(),
    };

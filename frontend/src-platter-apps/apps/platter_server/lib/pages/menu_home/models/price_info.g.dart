// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'price_info.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

PriceInfo _$PriceInfoFromJson(Map<String, dynamic> json) {
  $checkKeys(
    json,
    requiredKeys: const ['basePrice', 'finalPrice', 'discount'],
    disallowNullValues: const ['basePrice', 'finalPrice', 'discount'],
  );
  return PriceInfo(
    basePrice: json['basePrice'] as num,
    finalPrice: json['finalPrice'] as num,
    discount: json['discount'] as num,
  );
}

Map<String, dynamic> _$PriceInfoToJson(PriceInfo instance) => <String, dynamic>{
      'basePrice': instance.basePrice,
      'finalPrice': instance.finalPrice,
      'discount': instance.discount,
    };

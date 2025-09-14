// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'price_info.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_$PriceInfoImpl _$$PriceInfoImplFromJson(Map<String, dynamic> json) =>
    _$PriceInfoImpl(
      basePrice: json['basePrice'] as num,
      discount: json['discount'] as num,
      finalPrice: json['finalPrice'] as num,
    );

Map<String, dynamic> _$$PriceInfoImplToJson(_$PriceInfoImpl instance) =>
    <String, dynamic>{
      'basePrice': instance.basePrice,
      'discount': instance.discount,
      'finalPrice': instance.finalPrice,
    };

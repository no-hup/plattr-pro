// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'price_info.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

PriceInfo _$PriceInfoFromJson(Map<String, dynamic> json) => PriceInfo(
      basePrice: json['basePrice'] as num? ?? 0,
      finalPrice: json['finalPrice'] as num? ?? 0,
      totalDiscount: json['totalDiscount'] as num? ?? 0,
      totalDiscountAmount: json['totalDiscountAmount'] as num? ?? 0,
      discount: json['discount'] as num? ?? 0,
    );

Map<String, dynamic> _$PriceInfoToJson(PriceInfo instance) => <String, dynamic>{
      'basePrice': instance.basePrice,
      'finalPrice': instance.finalPrice,
      'totalDiscount': instance.totalDiscount,
      'totalDiscountAmount': instance.totalDiscountAmount,
      'discount': instance.discount,
    };

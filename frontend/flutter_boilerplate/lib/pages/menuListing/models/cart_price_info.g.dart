// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'cart_price_info.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_$CartPriceInfoImpl _$$CartPriceInfoImplFromJson(Map<String, dynamic> json) =>
    _$CartPriceInfoImpl(
      basePrice: json['basePrice'] as num? ?? 0,
      finalPrice: json['finalPrice'] as num? ?? 0,
      totalDiscount: json['totalDiscount'] as num? ?? 0,
      totalDiscountAmount: json['totalDiscountAmount'] as num? ?? 0,
      totalAddonBasePrice: json['totalAddonBasePrice'] as num? ?? 0,
      totalVariantBasePrice: json['totalVariantBasePrice'] as num? ?? 0,
    );

Map<String, dynamic> _$$CartPriceInfoImplToJson(_$CartPriceInfoImpl instance) =>
    <String, dynamic>{
      'basePrice': instance.basePrice,
      'finalPrice': instance.finalPrice,
      'totalDiscount': instance.totalDiscount,
      'totalDiscountAmount': instance.totalDiscountAmount,
      'totalAddonBasePrice': instance.totalAddonBasePrice,
      'totalVariantBasePrice': instance.totalVariantBasePrice,
    };

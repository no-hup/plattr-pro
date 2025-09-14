// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'cart_item_price_info.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_$CartItemPriceInfoImpl _$$CartItemPriceInfoImplFromJson(
        Map<String, dynamic> json) =>
    _$CartItemPriceInfoImpl(
      itemBasePrice: json['itemBasePrice'] as num? ?? 0,
      itemVariantBasePrice: json['itemVariantBasePrice'] as num? ?? 0,
      itemAddonBasePrice: json['itemAddonBasePrice'] as num? ?? 0,
      itemFinalPrice: json['itemFinalPrice'] as num? ?? 0,
      discount: json['discount'] as num? ?? 0,
      totalBasePrice: json['totalBasePrice'] as num? ?? 0,
      totalVariantBasePrice: json['totalVariantBasePrice'] as num? ?? 0,
      totalAddonBasePrice: json['totalAddonBasePrice'] as num? ?? 0,
      finalPrice: json['finalPrice'] as num? ?? 0,
    );

Map<String, dynamic> _$$CartItemPriceInfoImplToJson(
        _$CartItemPriceInfoImpl instance) =>
    <String, dynamic>{
      'itemBasePrice': instance.itemBasePrice,
      'itemVariantBasePrice': instance.itemVariantBasePrice,
      'itemAddonBasePrice': instance.itemAddonBasePrice,
      'itemFinalPrice': instance.itemFinalPrice,
      'discount': instance.discount,
      'totalBasePrice': instance.totalBasePrice,
      'totalVariantBasePrice': instance.totalVariantBasePrice,
      'totalAddonBasePrice': instance.totalAddonBasePrice,
      'finalPrice': instance.finalPrice,
    };

// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'order_item_detail.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

OrderItemDetail _$OrderItemDetailFromJson(Map<String, dynamic> json) =>
    OrderItemDetail(
      menuItemId: json['menuItemId'] as String,
      name: json['name'] as String,
      quantity: (json['quantity'] as num).toInt(),
      addons: (json['addons'] as List<dynamic>?)
          ?.map((e) => AddonDetail.fromJson(e as Map<String, dynamic>))
          .toList(),
      variants: (json['variants'] as List<dynamic>?)
          ?.map((e) => VariantDetail.fromJson(e as Map<String, dynamic>))
          .toList(),
    );

Map<String, dynamic> _$OrderItemDetailToJson(OrderItemDetail instance) =>
    <String, dynamic>{
      'menuItemId': instance.menuItemId,
      'name': instance.name,
      'quantity': instance.quantity,
      'addons': instance.addons,
      'variants': instance.variants,
    };

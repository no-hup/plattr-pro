// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'addon_detail.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

AddonDetail _$AddonDetailFromJson(Map<String, dynamic> json) => AddonDetail(
      id: json['id'] as String,
      name: json['name'] as String,
      price: json['price'] as num?,
    );

Map<String, dynamic> _$AddonDetailToJson(AddonDetail instance) =>
    <String, dynamic>{
      'id': instance.id,
      'name': instance.name,
      'price': instance.price,
    };

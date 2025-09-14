// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'variant_detail.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

VariantDetail _$VariantDetailFromJson(Map<String, dynamic> json) =>
    VariantDetail(
      id: json['id'] as String,
      isMandatory: json['isMandatory'] as bool,
      respectParentDiscount: json['respectParentDiscount'] as bool,
    );

Map<String, dynamic> _$VariantDetailToJson(VariantDetail instance) =>
    <String, dynamic>{
      'id': instance.id,
      'isMandatory': instance.isMandatory,
      'respectParentDiscount': instance.respectParentDiscount,
    };

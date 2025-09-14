// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'variant_selection.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_$VariantSelectionImpl _$$VariantSelectionImplFromJson(
        Map<String, dynamic> json) =>
    _$VariantSelectionImpl(
      variantId: json['variantId'] as String,
      optionId: json['optionId'] as String,
      name: json['name'] as String,
      selectedOption: VariantOption.fromJson(
          json['selectedOption'] as Map<String, dynamic>),
    );

Map<String, dynamic> _$$VariantSelectionImplToJson(
        _$VariantSelectionImpl instance) =>
    <String, dynamic>{
      'variantId': instance.variantId,
      'optionId': instance.optionId,
      'name': instance.name,
      'selectedOption': instance.selectedOption.toJson(),
    };

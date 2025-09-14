// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'nutritional_info.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

NutritionalInfo _$NutritionalInfoFromJson(Map<String, dynamic> json) =>
    NutritionalInfo(
      carbs: json['carbs'] as num? ?? 0,
      protein: json['protein'] as num? ?? 0,
      fat: json['fat'] as num? ?? 0,
      calories: json['calories'] as num? ?? 0,
    );

Map<String, dynamic> _$NutritionalInfoToJson(NutritionalInfo instance) =>
    <String, dynamic>{
      'carbs': instance.carbs,
      'protein': instance.protein,
      'fat': instance.fat,
      'calories': instance.calories,
    };

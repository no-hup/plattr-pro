// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'restaurant_settings.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

RestaurantSettings _$RestaurantSettingsFromJson(Map<String, dynamic> json) =>
    RestaurantSettings(
      theme: ThemeConfig.fromJson(json['theme'] as Map<String, dynamic>),
      featureFlags: Map<String, bool>.from(json['featureFlags'] as Map),
      ordering: (json['ordering'] as Map<String, dynamic>?)?.map(
            (k, e) => MapEntry(k, e as bool),
          ) ??
          {},
      tax: json['tax'] as Map<String, dynamic>? ?? {},
    );

Map<String, dynamic> _$RestaurantSettingsToJson(RestaurantSettings instance) =>
    <String, dynamic>{
      'theme': instance.theme,
      'featureFlags': instance.featureFlags,
      'ordering': instance.ordering,
      'tax': instance.tax,
    };

ThemeConfig _$ThemeConfigFromJson(Map<String, dynamic> json) => ThemeConfig(
      primaryColor: json['primaryColor'] as String,
      secondaryColor: json['secondaryColor'] as String,
      accentColor: json['accentColor'] as String,
      backgroundColor: json['backgroundColor'] as String,
      surfaceColor: json['surfaceColor'] as String,
      errorColor: json['errorColor'] as String,
      fontFamily: json['fontFamily'] as String? ?? 'Inter',
    );

Map<String, dynamic> _$ThemeConfigToJson(ThemeConfig instance) =>
    <String, dynamic>{
      'primaryColor': instance.primaryColor,
      'secondaryColor': instance.secondaryColor,
      'accentColor': instance.accentColor,
      'backgroundColor': instance.backgroundColor,
      'surfaceColor': instance.surfaceColor,
      'errorColor': instance.errorColor,
      'fontFamily': instance.fontFamily,
    };

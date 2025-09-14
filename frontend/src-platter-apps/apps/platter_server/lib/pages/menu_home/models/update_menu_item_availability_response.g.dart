// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'update_menu_item_availability_response.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

UpdateMenuItemAvailabilityResponse _$UpdateMenuItemAvailabilityResponseFromJson(
    Map<String, dynamic> json) {
  $checkKeys(
    json,
    requiredKeys: const ['menuItemId', 'isAvailable'],
    disallowNullValues: const ['menuItemId', 'isAvailable'],
  );
  return UpdateMenuItemAvailabilityResponse(
    menuItemId: json['menuItemId'] as String,
    isAvailable: json['isAvailable'] as bool,
  );
}

Map<String, dynamic> _$UpdateMenuItemAvailabilityResponseToJson(
        UpdateMenuItemAvailabilityResponse instance) =>
    <String, dynamic>{
      'menuItemId': instance.menuItemId,
      'isAvailable': instance.isAvailable,
    };

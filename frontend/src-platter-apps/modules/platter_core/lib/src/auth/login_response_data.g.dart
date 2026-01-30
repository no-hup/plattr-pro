// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'login_response_data.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

LoginResponseData _$LoginResponseDataFromJson(Map<String, dynamic> json) =>
    LoginResponseData(
      sessionId: json['sessionId'] as String? ?? '',
      staffId: json['serverId'] as String? ?? '',
      name: json['name'] as String? ?? '',
      entity: json['entity'] as String? ?? '',
      role: json['role'] as String? ?? '',
      restaurantId: json['restaurantId'] as String? ?? '',
      restaurantName: json['restaurantName'] as String? ?? '',
      profileImageUrl: json['profileImageUrl'] as String? ?? '',
      kitchenId: json['kitchenId'] as String?,
      kitchenName: json['kitchenName'] as String?,
    );

Map<String, dynamic> _$LoginResponseDataToJson(LoginResponseData instance) =>
    <String, dynamic>{
      'sessionId': instance.sessionId,
      'serverId': instance.staffId,
      'name': instance.name,
      'entity': instance.entity,
      'role': instance.role,
      'restaurantId': instance.restaurantId,
      'restaurantName': instance.restaurantName,
      'profileImageUrl': instance.profileImageUrl,
      'kitchenId': instance.kitchenId,
      'kitchenName': instance.kitchenName,
    };

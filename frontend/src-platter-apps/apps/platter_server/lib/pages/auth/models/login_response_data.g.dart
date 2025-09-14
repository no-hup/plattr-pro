// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'login_response_data.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

LoginResponseData _$LoginResponseDataFromJson(Map<String, dynamic> json) =>
    LoginResponseData(
      sessionId: json['sessionId'] as String? ?? '',
      serverId: json['serverId'] as String? ?? '',
      name: json['name'] as String? ?? '',
      entity: json['entity'] as String? ?? '',
      role: json['role'] as String? ?? '',
      restaurantId: json['restaurantId'] as String? ?? '',
      restaurantName: json['restaurantName'] as String? ?? '',
    );

Map<String, dynamic> _$LoginResponseDataToJson(LoginResponseData instance) =>
    <String, dynamic>{
      'sessionId': instance.sessionId,
      'serverId': instance.serverId,
      'name': instance.name,
      'entity': instance.entity,
      'role': instance.role,
      'restaurantId': instance.restaurantId,
      'restaurantName': instance.restaurantName,
    };

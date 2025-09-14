// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'login_request.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

LoginRequest _$LoginRequestFromJson(Map<String, dynamic> json) => LoginRequest(
      restaurantId: json['restaurantId'] as String,
      username: json['username'] as String?,
      password: json['password'] as String?,
      sessionId: json['sessionId'] as String?,
    );

Map<String, dynamic> _$LoginRequestToJson(LoginRequest instance) =>
    <String, dynamic>{
      'restaurantId': instance.restaurantId,
      if (instance.username case final value?) 'username': value,
      if (instance.password case final value?) 'password': value,
      if (instance.sessionId case final value?) 'sessionId': value,
    };

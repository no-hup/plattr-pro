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

Map<String, dynamic> _$LoginRequestToJson(LoginRequest instance) {
  final val = <String, dynamic>{
    'restaurantId': instance.restaurantId,
  };

  void writeNotNull(String key, dynamic value) {
    if (value != null) {
      val[key] = value;
    }
  }

  writeNotNull('username', instance.username);
  writeNotNull('password', instance.password);
  writeNotNull('sessionId', instance.sessionId);
  return val;
}

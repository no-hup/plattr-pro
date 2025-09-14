import 'package:json_annotation/json_annotation.dart';

part 'login_response_data.g.dart';

@JsonSerializable()
class LoginResponseData {
  @JsonKey(defaultValue: '')
  final String sessionId;

  @JsonKey(defaultValue: '')
  final String serverId;

  @JsonKey(defaultValue: '')
  final String name;

  @JsonKey(defaultValue: '')
  final String entity;

  @JsonKey(defaultValue: '')
  final String role;

  @JsonKey(defaultValue: '')
  final String restaurantId;

  @JsonKey(defaultValue: '')
  final String restaurantName;

  LoginResponseData({
    required this.sessionId,
    required this.serverId,
    required this.name,
    required this.entity,
    required this.role,
    required this.restaurantId,
    required this.restaurantName,
  });

  factory LoginResponseData.fromJson(Map<String, dynamic> json) =>
      _$LoginResponseDataFromJson(json);

  Map<String, dynamic> toJson() => _$LoginResponseDataToJson(this);
}

import 'package:json_annotation/json_annotation.dart';

part 'login_request.g.dart';

@JsonSerializable(includeIfNull: false)
class LoginRequest {
  final String restaurantId;
  final String? username;
  final String? password;
  final String? sessionId;

  LoginRequest({
    required this.restaurantId,
    this.username,
    this.password,
    this.sessionId,
  }) : assert((username != null && password != null) || sessionId != null,
            'Either username/password or sessionId must be provided.');

  factory LoginRequest.fromJson(Map<String, dynamic> json) =>
      _$LoginRequestFromJson(json);

  Map<String, dynamic> toJson() => _$LoginRequestToJson(this);
}

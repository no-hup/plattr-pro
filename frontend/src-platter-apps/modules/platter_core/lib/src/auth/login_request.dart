/// Login request model for Platter apps authentication
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

  Map<String, dynamic> toJson() {
    final json = <String, dynamic>{
      'restaurantId': restaurantId,
    };
    if (username != null) json['username'] = username;
    if (password != null) json['password'] = password;
    if (sessionId != null) json['sessionId'] = sessionId;
    return json;
  }
}

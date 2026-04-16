import 'package:json_annotation/json_annotation.dart';

part 'login_response_data.g.dart';

/// Login response data model for Platter apps
@JsonSerializable()
class LoginResponseData {
  @JsonKey(defaultValue: '')
  final String sessionId;

  @JsonKey(name: 'serverId', defaultValue: '') // Backend sends 'serverId' sometimes
  final String staffId;

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

  @JsonKey(defaultValue: '')
  final String profileImageUrl;

  final String? kitchenId;
  final String? kitchenName;

  LoginResponseData({
    required this.sessionId,
    required this.staffId,
    required this.name,
    required this.entity,
    required this.role,
    required this.restaurantId,
    required this.restaurantName,
    this.profileImageUrl = '',
    this.kitchenId,
    this.kitchenName,
  });

  factory LoginResponseData.fromJson(Map<String, dynamic> json) {
    // Handle dual field name for staffId/serverId
    if (json['staffId'] == null && json['serverId'] != null) {
      json['staffId'] = json['serverId'];
    }
    return _$LoginResponseDataFromJson(json);
  }

  Map<String, dynamic> toJson() => _$LoginResponseDataToJson(this);

  /// Safe substring for sessionId display
  String get displaySessionId {
    if (sessionId.isEmpty) return '(empty)';
    if (sessionId.length <= 8) return sessionId;
    return '${sessionId.substring(0, 8)}...';
  }
}

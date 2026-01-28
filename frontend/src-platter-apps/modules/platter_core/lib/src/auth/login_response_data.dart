/// Login response data model for Platter apps
class LoginResponseData {
  final String sessionId;
  final String staffId;
  final String name;
  final String entity;
  final String role;
  final String restaurantId;
  final String restaurantName;
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
    return LoginResponseData(
      sessionId: json['sessionId'] as String? ?? '',
      staffId: json['serverId'] as String? ?? json['staffId'] as String? ?? '',
      name: json['name'] as String? ?? '',
      entity: json['entity'] as String? ?? '',
      role: json['role'] as String? ?? '',
      restaurantId: json['restaurantId'] as String? ?? '',
      restaurantName: json['restaurantName'] as String? ?? '',
      profileImageUrl: json['profileImageUrl'] as String? ?? '',
      kitchenId: json['kitchenId'] as String?,
      kitchenName: json['kitchenName'] as String?,
    );
  }

  Map<String, dynamic> toJson() => {
        'sessionId': sessionId,
        'staffId': staffId,
        'name': name,
        'entity': entity,
        'role': role,
        'restaurantId': restaurantId,
        'restaurantName': restaurantName,
        'profileImageUrl': profileImageUrl,
        if (kitchenId != null) 'kitchenId': kitchenId,
        if (kitchenName != null) 'kitchenName': kitchenName,
      };

  /// Safe substring for sessionId display
  String get displaySessionId {
    if (sessionId.isEmpty) return '(empty)';
    if (sessionId.length <= 8) return sessionId;
    return '${sessionId.substring(0, 8)}...';
  }
}

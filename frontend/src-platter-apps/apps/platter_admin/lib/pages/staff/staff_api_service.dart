import 'package:dio/dio.dart';
import 'package:platter_core/platter_core.dart';

/// API service for staff management operations
class StaffApiService {
  final Dio _dio = DioClient().dio;

  /// Get all servers for a restaurant
  Future<ApiResponse<List<StaffMember>>> getServers({
    required String restaurantId,
    required String sessionId,
  }) async {
    try {
      final response = await _dio.post(
        '/admin-getServers',
        data: {
          'data': {
            'restaurantId': restaurantId,
            'sessionId': sessionId,
          }
        },
      );

      return ResponseParser.parse<List<StaffMember>>(
        response,
        (json) {
          final servers = (json['servers'] as List<dynamic>?) ?? [];
          return servers
              .map((s) => StaffMember.fromJson(s as Map<String, dynamic>))
              .toList();
        },
      );
    } on DioException catch (e) {
      final (code, msg) = DioClient.handleDioError(e, context: 'getServers');
      return ApiResponse.error(msg, errorCode: code);
    } catch (e) {
      return ApiResponse.error(e.toString(), errorCode: 'parsing_error');
    }
  }

  /// Add a new server
  Future<ApiResponse<AddServerResponse>> addServer({
    required String restaurantId,
    required String sessionId,
    required StaffMemberInput server,
  }) async {
    try {
      final response = await _dio.post(
        '/admin-addServer',
        data: {
          'data': {
            'restaurantId': restaurantId,
            'sessionId': sessionId,
            'server': server.toJson(),
          }
        },
      );

      return ResponseParser.parse<AddServerResponse>(
        response,
        (json) => AddServerResponse.fromJson(json as Map<String, dynamic>),
      );
    } on DioException catch (e) {
      final (code, msg) = DioClient.handleDioError(e, context: 'addServer');
      return ApiResponse.error(msg, errorCode: code);
    } catch (e) {
      return ApiResponse.error(e.toString(), errorCode: 'parsing_error');
    }
  }

  /// Update an existing server
  Future<ApiResponse<void>> updateServer({
    required String restaurantId,
    required String sessionId,
    required String serverId,
    required Map<String, dynamic> updateData,
  }) async {
    try {
      final response = await _dio.post(
        '/admin-updateServer',
        data: {
          'data': {
            'restaurantId': restaurantId,
            'sessionId': sessionId,
            'serverId': serverId,
            'updateData': updateData,
          }
        },
      );

      return ResponseParser.parse<void>(response, (_) => null);
    } on DioException catch (e) {
      final (code, msg) = DioClient.handleDioError(e, context: 'updateServer');
      return ApiResponse.error(msg, errorCode: code);
    } catch (e) {
      return ApiResponse.error(e.toString(), errorCode: 'parsing_error');
    }
  }

  /// Reset a server's PIN
  Future<ApiResponse<ResetPinResponse>> resetServerPin({
    required String restaurantId,
    required String sessionId,
    required String serverId,
    String? newPin,
  }) async {
    try {
      final response = await _dio.post(
        '/admin-resetServerPin',
        data: {
          'data': {
            'restaurantId': restaurantId,
            'sessionId': sessionId,
            'serverId': serverId,
            if (newPin != null) 'newPin': newPin,
          }
        },
      );

      return ResponseParser.parse<ResetPinResponse>(
        response,
        (json) => ResetPinResponse.fromJson(json as Map<String, dynamic>),
      );
    } on DioException catch (e) {
      final (code, msg) =
          DioClient.handleDioError(e, context: 'resetServerPin');
      return ApiResponse.error(msg, errorCode: code);
    } catch (e) {
      return ApiResponse.error(e.toString(), errorCode: 'parsing_error');
    }
  }
}

/// Staff member model
class StaffMember {
  final String id;
  final String name;
  final String phoneNumber;
  final String email;
  final String role;
  final String status;
  final String profileImageUrl;
  final String? createdAt;
  final String? updatedAt;

  StaffMember({
    required this.id,
    required this.name,
    required this.phoneNumber,
    required this.email,
    required this.role,
    required this.status,
    required this.profileImageUrl,
    this.createdAt,
    this.updatedAt,
  });

  factory StaffMember.fromJson(Map<String, dynamic> json) {
    return StaffMember(
      id: json['id'] as String? ?? '',
      name: json['name'] as String? ?? '',
      phoneNumber: json['phoneNumber'] as String? ?? '',
      email: json['email'] as String? ?? '',
      role: json['role'] as String? ?? 'SERVER',
      status: json['status'] as String? ?? 'inactive',
      profileImageUrl: json['profileImageUrl'] as String? ?? '',
      createdAt: json['createdAt'] as String?,
      updatedAt: json['updatedAt'] as String?,
    );
  }

  bool get isActive => status == 'active';
}

/// Input model for adding a server
class StaffMemberInput {
  final String name;
  final String? phoneNumber;
  final String? email;
  final String role;
  final String? password;

  StaffMemberInput({
    required this.name,
    this.phoneNumber,
    this.email,
    this.role = 'SERVER',
    this.password,
  });

  Map<String, dynamic> toJson() {
    return {
      'name': name,
      if (phoneNumber != null && phoneNumber!.isNotEmpty)
        'phoneNumber': phoneNumber,
      if (email != null && email!.isNotEmpty) 'email': email,
      'role': role,
      if (password != null && password!.isNotEmpty) 'password': password,
    };
  }
}

/// Response from adding a server
class AddServerResponse {
  final String serverId;
  final String name;
  final String phoneNumber;
  final String email;
  final String role;
  final String status;
  final String pin;
  /// The generated login password, shown once. Separate from the PIN (TD-041).
  final String password;

  AddServerResponse({
    required this.serverId,
    required this.name,
    required this.phoneNumber,
    required this.email,
    required this.role,
    required this.status,
    required this.pin,
    this.password = '',
  });

  factory AddServerResponse.fromJson(Map<String, dynamic> json) {
    return AddServerResponse(
      serverId: json['serverId'] as String? ?? '',
      name: json['name'] as String? ?? '',
      phoneNumber: json['phoneNumber'] as String? ?? '',
      email: json['email'] as String? ?? '',
      role: json['role'] as String? ?? 'SERVER',
      status: json['status'] as String? ?? 'active',
      pin: json['pin'] as String? ?? '',
      password: json['password'] as String? ?? '',
    );
  }
}

/// Response from resetting a PIN
class ResetPinResponse {
  final String serverId;
  final String newPin;

  ResetPinResponse({
    required this.serverId,
    required this.newPin,
  });

  factory ResetPinResponse.fromJson(Map<String, dynamic> json) {
    return ResetPinResponse(
      serverId: json['serverId'] as String? ?? '',
      newPin: json['newPin'] as String? ?? '',
    );
  }
}

/// Server roles
class ServerRoles {
  static const String admin = 'ADMIN';
  static const String manager = 'MANAGER';
  static const String server = 'SERVER';
  static const String kitchen = 'KITCHEN';

  static List<String> get all => [admin, manager, server, kitchen];

  // DECISION(TD-139, 2026-09-26): mirrors adminApp/staff_admin.js roleChangeRefusal, which is the real check. Only
  // an Admin gives or takes Admin or Manager; nobody changes their own role. If you change this, ask Shaurya first.
  /// The roles [callerRole] may pick for [target] (null = a new staff member). Empty: the role is fixed here.
  static List<String> assignable({required String callerRole, required String callerId, StaffMember? target}) {
    if (target != null && target.id == callerId) return const [];
    final isAdmin = callerRole.toUpperCase() == admin;
    if (!isAdmin && target != null && (target.role == admin || target.role == manager)) return const [];
    return isAdmin ? all : [server, kitchen];
  }

  // DECISION(TD-147, 2026-09-26): mirrors adminApp/staff_admin.js cardEditRefusal, which is the real check. Only an
  // Admin changes an Admin's or Manager's card (edit, status, Reset PIN), a manager's own included.
  // If you change this, ask Shaurya first.
  static bool canChangeCard({required String callerRole, required StaffMember target}) =>
      callerRole.toUpperCase() == admin || (target.role != admin && target.role != manager);

  /// Why the role is fixed for this caller, shown under the greyed-out field.
  static String fixedReason({required String callerId, required StaffMember target}) =>
      target.id == callerId ? 'Nobody can change their own role' : 'Only an Admin can change this role';

  static String displayName(String role) {
    switch (role) {
      case admin:
        return 'Admin';
      case manager:
        return 'Manager';
      case server:
        return 'Server';
      case kitchen:
        return 'Kitchen';
      default:
        return role;
    }
  }
}

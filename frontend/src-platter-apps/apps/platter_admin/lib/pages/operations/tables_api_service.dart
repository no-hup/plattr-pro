import 'package:dio/dio.dart';
import 'package:platter_core/platter_core.dart';

/// API service for table management operations
class TablesApiService {
  final Dio _dio = DioClient().dio;

  /// Get all tables for a restaurant
  Future<ApiResponse<List<TableInfo>>> getTables({
    required String restaurantId,
    required String sessionId,
  }) async {
    try {
      final response = await _dio.post(
        '/admin-getTables',
        data: {
          'data': {
            'restaurantId': restaurantId,
            'sessionId': sessionId,
          }
        },
      );

      return ResponseParser.parse<List<TableInfo>>(
        response,
        (json) {
          final tables = (json['tables'] as List<dynamic>?) ?? [];
          return tables
              .map((t) => TableInfo.fromJson(t as Map<String, dynamic>))
              .toList();
        },
      );
    } on DioException catch (e) {
      final (code, msg) = DioClient.handleDioError(e, context: 'getTables');
      return ApiResponse.error(msg, errorCode: code);
    } catch (e) {
      return ApiResponse.error(e.toString(), errorCode: 'parsing_error');
    }
  }

  /// Update table status (enable/disable)
  Future<ApiResponse<void>> updateTableStatus({
    required String restaurantId,
    required String sessionId,
    required String tableId,
    required String status,
  }) async {
    try {
      final response = await _dio.post(
        '/admin-updateTableStatus',
        data: {
          'data': {
            'restaurantId': restaurantId,
            'sessionId': sessionId,
            'tableId': tableId,
            'status': status,
          }
        },
      );

      return ResponseParser.parse<void>(response, (_) => null);
    } on DioException catch (e) {
      final (code, msg) =
          DioClient.handleDioError(e, context: 'updateTableStatus');
      return ApiResponse.error(msg, errorCode: code);
    } catch (e) {
      return ApiResponse.error(e.toString(), errorCode: 'parsing_error');
    }
  }

  /// Update table details (number, capacity)
  Future<ApiResponse<void>> updateTable({
    required String restaurantId,
    required String sessionId,
    required String tableId,
    required Map<String, dynamic> updateData,
  }) async {
    try {
      final response = await _dio.post(
        '/admin-updateTable',
        data: {
          'data': {
            'restaurantId': restaurantId,
            'sessionId': sessionId,
            'tableId': tableId,
            'updateData': updateData,
          }
        },
      );

      return ResponseParser.parse<void>(response, (_) => null);
    } on DioException catch (e) {
      final (code, msg) = DioClient.handleDioError(e, context: 'updateTable');
      return ApiResponse.error(msg, errorCode: code);
    } catch (e) {
      return ApiResponse.error(e.toString(), errorCode: 'parsing_error');
    }
  }
}

/// Table information model
class TableInfo {
  final String id;
  final String number;
  final String status;
  final int? capacity;
  final String? assignedServerId;
  final bool isOccupied;
  final PrimaryCustomer? primaryCustomer;
  final String? lastActivity;

  TableInfo({
    required this.id,
    required this.number,
    required this.status,
    this.capacity,
    this.assignedServerId,
    required this.isOccupied,
    this.primaryCustomer,
    this.lastActivity,
  });

  factory TableInfo.fromJson(Map<String, dynamic> json) {
    return TableInfo(
      id: json['id'] as String? ?? '',
      number: json['number'] as String? ?? '',
      status: json['status'] as String? ?? 'vacant',
      capacity: json['capacity'] as int?,
      assignedServerId: json['assignedServerId'] as String?,
      isOccupied: json['isOccupied'] as bool? ?? false,
      primaryCustomer: json['primaryCustomer'] != null
          ? PrimaryCustomer.fromJson(
              json['primaryCustomer'] as Map<String, dynamic>)
          : null,
      lastActivity: json['lastActivity'] as String?,
    );
  }

  bool get isDisabled => status == 'disabled';
  bool get isVacant => status == 'vacant';
  bool get isActive => status == 'active';
  bool get isReserved => status == 'reserved';

  /// TD-143: the card says the state the waiter sees; a booked table read AVAILABLE before.
  String get label => switch (status) {
        'disabled' => 'DISABLED',
        'active' => 'OCCUPIED',
        'reserved' => 'RESERVED',
        'vacant' => 'AVAILABLE',
        _ => status.toUpperCase(),
      };

  /// Only a free or switched-off table has the on/off switch; a booking or a sitting is the floor's to end.
  bool get canSwitch => !isOccupied && !isReserved;
}

/// Primary customer model
class PrimaryCustomer {
  final String? name;
  final String? phoneNumber;

  PrimaryCustomer({this.name, this.phoneNumber});

  factory PrimaryCustomer.fromJson(Map<String, dynamic> json) {
    return PrimaryCustomer(
      name: json['name'] as String?,
      phoneNumber: json['phoneNumber'] as String?,
    );
  }
}

/// Table status constants.
/// `pending` used to be one of these. Nothing writes it since 2026-09-21 — a guest part way
/// through signing in is now a hold on the table's code, not a status
/// (moonshot/reviews/2026-09-21-otp-and-table-state.md).
class TableStatus {
  static const String active = 'active';
  static const String vacant = 'vacant';
  static const String disabled = 'disabled';
}

import 'package:dio/dio.dart';
import 'package:platter_core/platter_core.dart' hide DioClient;
import '../../../network/dio_client.dart';
import '../../../network/api_constants.dart';
import '../models/table_models.dart';

class TableApiService {
  final Dio _dio = DioClient().dio;

  /// Fetches all tables for a restaurant
  Future<ApiResponse<List<TableModel>>> getRestaurantTables({
    required String restaurantId,
  }) async {
    try {
      final response = await _dio.post(
        ApiConstants.getRestaurantTables,
        data: {
          'data': {'restaurantId': restaurantId},
        },
      );
      final data = response.data as Map<String, dynamic>;
      final envelope = data.containsKey('result')
          ? data['result'] as Map<String, dynamic>
          : data;
      final statusValue = envelope['status'];
      final success = statusValue is String
          ? statusValue.toLowerCase() == 'success'
          : envelope['success'] as bool? ?? false;
      final message = envelope['message'] as String? ?? '';
      if (!success) {
        final code =
            envelope['code']?.toString() ?? envelope['errorCode']?.toString();
        return ApiResponse<List<TableModel>>.error(message, errorCode: code);
      }
      final tablesJson = (envelope['data']?['tables'] as List<dynamic>?) ?? [];
      final tables = tablesJson
          .map((item) => TableModel.fromJson(item as Map<String, dynamic>))
          .toList();
      return ApiResponse.success(tables, message: message);
    } on DioException catch (e) {
      final (code, msg) =
          DioClient.handleDioError(e, context: 'getRestaurantTables');
      return ApiResponse<List<TableModel>>.error(msg, errorCode: code);
    } catch (e) {
      return ApiResponse<List<TableModel>>.error(e.toString(),
          errorCode: 'parsing_error');
    }
  }

  /// Updates the status of a table
  Future<ApiResponse<UpdateTableStatusResponse>> updateTableStatus({
    required String restaurantId,
    required String tableId,
    required String status,
    required String sessionId,
  }) async {
    try {
      final response = await _dio.post(
        ApiConstants.updateTableStatus,
        data: {
          'data': {
            'restaurantId': restaurantId,
            'tableId': tableId,
            'status': status,
            'sessionId': sessionId,
          }
        },
      );
      // Use ResponseParser to parse generically
      return ResponseParser.parse<UpdateTableStatusResponse>(
        response,
        (json) =>
            UpdateTableStatusResponse.fromJson(json as Map<String, dynamic>),
      );
    } on DioException catch (e) {
      final (code, msg) =
          DioClient.handleDioError(e, context: 'updateTableStatus');
      return ApiResponse<UpdateTableStatusResponse>.error(msg, errorCode: code);
    } catch (e) {
      return ApiResponse<UpdateTableStatusResponse>.error(e.toString(),
          errorCode: 'parsing_error');
    }
  }

  /// Gets details for a specific table
  Future<ApiResponse<TableModel>> getTableDetails({
    required String restaurantId,
    required String tableId,
  }) async {
    try {
      final response = await _dio.post(
        ApiConstants.getTableDetails,
        data: {
          'data': {'restaurantId': restaurantId, 'tableId': tableId},
        },
      );
      final data = response.data as Map<String, dynamic>;
      final envelope = data.containsKey('result')
          ? data['result'] as Map<String, dynamic>
          : data;
      final statusValue = envelope['status'];
      final success = statusValue is String
          ? statusValue.toLowerCase() == 'success'
          : envelope['success'] as bool? ?? false;
      final message = envelope['message'] as String? ?? '';
      if (!success) {
        final code =
            envelope['code']?.toString() ?? envelope['errorCode']?.toString();
        return ApiResponse<TableModel>.error(message, errorCode: code);
      }
      final tableJson = envelope['data'] as Map<String, dynamic>?;
      if (tableJson == null) {
        return ApiResponse<TableModel>.error('No table data',
            errorCode: 'parsing_error');
      }
      final table = TableModel.fromJson(tableJson);
      return ApiResponse.success(table, message: message);
    } on DioException catch (e) {
      final (code, msg) =
          DioClient.handleDioError(e, context: 'getTableDetails');
      return ApiResponse<TableModel>.error(msg, errorCode: code);
    } catch (e) {
      return ApiResponse<TableModel>.error(e.toString(),
          errorCode: 'parsing_error');
    }
  }

  /// Generates/refreshes the OTP for a table using Firebase Cloud Function
  Future<ApiResponse<TableOtpResponse>> generateTableOTP({
    required String restaurantId,
    required String tableId,
    required String sessionId,
  }) async {
    try {
      // Call the Firebase Cloud Function directly
      final response = await _dio.post(
        ApiConstants.generateTableOTP,
        data: {
          'data': {
            'restaurantId': restaurantId,
            'tableId': tableId,
            'sessionId': sessionId,
          }
        },
      );

      // Parse the response
      final map = response.data["result"];
      if (map is Map<String, dynamic>) {
        final statusValue = map['status'];
        final success = statusValue is String
            ? statusValue.toLowerCase() == 'success'
            : map['success'] as bool? ?? false;
        final message = map['message'] as String? ?? '';

        if (success) {
          final data = map['data'] as Map<String, dynamic>?;
          if (data == null) {
            return ApiResponse.error('No data in response',
                errorCode: 'parsing_error');
          }

          final tableOtpResponse = TableOtpResponse(
            success: success,
            message: message,
            otp: data['otp'] as String? ?? '',
            tableId: data['tableId'] as String? ?? '',
            tableNumber: data['tableNumber'] as String? ?? '',
            otpGeneratedAt: data['otpGeneratedAt'] as String? ?? '',
            otpExpiresAt: data['otpExpiresAt'] as String? ?? '',
          );

          return ApiResponse.success(tableOtpResponse, message: message);
        } else {
          return ApiResponse.error(message,
              errorCode: map['errorCode']?.toString());
        }
      }
      return ApiResponse.error('Invalid response format',
          errorCode: 'format_error');
    } on DioException catch (e) {
      final (code, msg) =
          DioClient.handleDioError(e, context: 'generateTableOTP');
      return ApiResponse<TableOtpResponse>.error(msg, errorCode: code);
    } catch (e) {
      return ApiResponse<TableOtpResponse>.error(e.toString(),
          errorCode: 'parsing_error');
    }
  }
}

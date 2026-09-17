import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import '../config/app_config.dart';
import '../logging/app_logger.dart';
import 'response_guard_interceptor.dart';
import 'interrupt_flow_interceptor.dart';
import 'offline_status.dart';

/// Singleton Dio client for all API calls.
/// Shared across all Platter apps.
///
/// Interceptors (in order of execution):
/// 1. LogInterceptor - Basic request/response logging
/// 2. ResponseGuardInterceptor - Detailed logging for debugging (debug only)
/// 3. InterruptFlowInterceptor - Handles forced update, blocked user, etc.
class DioClient {
  static DioClient? _instance;
  static DioClient get instance => _instance ??= DioClient._internal();

  factory DioClient() => instance;

  late final Dio dio;

  DioClient._internal() {
    dio = Dio(
      BaseOptions(
        baseUrl: AppConfig.firebaseFunctionsBaseUrl,
        connectTimeout: const Duration(seconds: 30),
        receiveTimeout: const Duration(seconds: 30),
        contentType: 'application/json',
        responseType: ResponseType.json,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      ),
    );

    _addInterceptors();
  }

  /// Add all interceptors
  void _addInterceptors() {
    // 1. Basic logging interceptor
    dio.interceptors.add(LogInterceptor(
      requestBody: true,
      responseBody: true,
      error: true,
      logPrint: (log) => AppLogger.debug(log.toString()),
    ));

    // 2. Response Guard for detailed debug logging (debug only)
    if (kDebugMode) {
      dio.interceptors.add(ResponseGuardInterceptor());
    }

    // 3. Interrupt Flow interceptor for forced update, blocked user, etc.
    dio.interceptors.add(InterruptFlowInterceptor.instance);

    // 4. OF-S5: every answer and every failure to reach the server feeds the offline banner.
    dio.interceptors.add(OfflineStatusInterceptor());
  }

  /// Reset the singleton (useful for testing)
  static void reset() {
    _instance = null;
  }

  /// Standard error handler for Dio exceptions
  static (String, String) handleDioError(DioException e, {String? context}) {
    String errorCode;
    String errorMessage;

    switch (e.type) {
      case DioExceptionType.connectionTimeout:
      case DioExceptionType.sendTimeout:
      case DioExceptionType.receiveTimeout:
        errorCode = 'timeout_error';
        errorMessage = 'Connection timed out. Please try again.';
        break;
      case DioExceptionType.badResponse:
        final extracted = _extractErrorDetails(e.response?.data);
        errorCode = extracted['code'] ??
            'server_error_${e.response?.statusCode ?? "unknown"}';
        errorMessage = extracted['message'] ?? 'Server error occurred';
        break;
      case DioExceptionType.cancel:
        errorCode = 'request_cancelled';
        errorMessage = 'Request was cancelled';
        break;
      case DioExceptionType.connectionError:
        errorCode = 'connection_error';
        errorMessage = 'No internet connection';
        break;
      default:
        errorCode = 'unknown_error';
        errorMessage = e.message ?? 'An unknown error occurred';
    }

    if (context != null) {
      AppLogger.error('[$context] $errorMessage');
    }

    return (errorCode, errorMessage);
  }

  static Map<String, String?> _extractErrorDetails(dynamic data) {
    String? code;
    String? message;

    if (data is Map<String, dynamic>) {
      // Check result envelope
      final result = data['result'];
      if (result is Map<String, dynamic>) {
        final status = result['status'];
        final success = result['success'];
        if (status == 'error' || success == false) {
          final resultMessage = result['message'];
          if (resultMessage is String) {
            message ??= resultMessage;
          }
          final resultData = result['data'];
          if (resultData is Map<String, dynamic>) {
            final resultCode = resultData['code'];
            if (resultCode is String) {
              code ??= resultCode;
            }
          }
        }
      }

      // Check error envelope
      final error = data['error'];
      if (error is Map<String, dynamic>) {
        final errorCode = error['code'];
        if (errorCode is String) {
          code ??= errorCode;
        }
        final errorMessage = error['message'];
        if (errorMessage is String) {
          message ??= errorMessage;
        }
      }

      // Check status field
      final status = data['status'];
      if (status == 'error') {
        final dataMessage = data['message'];
        if (dataMessage is String) {
          message ??= dataMessage;
        }
      }
    }

    return {'code': code, 'message': message};
  }
}

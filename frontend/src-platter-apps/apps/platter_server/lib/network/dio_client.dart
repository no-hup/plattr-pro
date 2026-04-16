import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:platter_core/platter_core.dart';
import 'api_constants.dart';
import '../config/app_config.dart';
import 'interceptors/user_agent_interceptor.dart';
import 'interceptors/auth_interceptor.dart';
import 'interceptors/error_interceptor.dart';

/// Singleton Dio client for all API calls
class DioClient {
  static final DioClient _instance = DioClient._internal();
  factory DioClient() => _instance;

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

    // Add interceptors in correct order
    // dio.interceptors.add(UserAgentInterceptor()); // Sets User-Agent header - causes issues in Web
    //dio.interceptors.add(AuthInterceptor());      // Handles Authorization
    dio.interceptors
        .add(ErrorInterceptor()); // Handles error logic (e.g., 401 refresh)
    if (kDebugMode) {
      dio.interceptors.add(ResponseGuardInterceptor());
    }
    dio.interceptors.add(LogInterceptor(
      requestBody: true,
      responseBody: true,
      error: true,
    )); // Logging should be last
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

    // Add context to the error for better debugging
    if (context != null) {
      errorMessage = '[$context] $errorMessage';
    }

    return (errorCode, errorMessage);
  }

  static Map<String, String?> _extractErrorDetails(dynamic data) {
    String? code;
    String? message;

    if (data is Map<String, dynamic>) {
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

      final error = data['error'];
      if (error is Map<String, dynamic>) {
        final errorStatus = error['status'];
        if (errorStatus is String) {
          code ??= errorStatus.toLowerCase().replaceAll('_', '-');
        }
        final details = error['details'];
        if (details is Map<String, dynamic>) {
          final detailsCode = details['code'];
          if (detailsCode is String) {
            code ??= detailsCode;
          }
          final detailsData = details['data'];
          if (detailsData is Map<String, dynamic>) {
            final detailsCode = detailsData['code'];
            if (detailsCode is String) {
              code ??= detailsCode;
            }
          }
          final detailsMessage = details['message'];
          if (detailsMessage is String) {
            message ??= detailsMessage;
          }
        }

        final errorCode = error['code'];
        if (errorCode is String) {
          code ??= errorCode;
        }

        final errorMessage = error['message'];
        if (errorMessage is String) {
          message ??= errorMessage;
        }
      }

      final status = data['status'];
      if (status == 'error') {
        final dataMessage = data['message'];
        if (dataMessage is String) {
          message ??= dataMessage;
        }
        final dataError = data['error'];
        if (dataError is Map<String, dynamic>) {
          final dataCode = dataError['code'];
          if (dataCode is String) {
            code ??= dataCode;
          }
          final dataErrorMessage = dataError['message'];
          if (dataErrorMessage is String) {
            message ??= dataErrorMessage;
          }
        }
      }
    }

    return {'code': code, 'message': message};
  }
}

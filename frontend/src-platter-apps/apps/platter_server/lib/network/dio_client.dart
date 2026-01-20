import 'package:dio/dio.dart';
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
    dio.interceptors.add(ErrorInterceptor());     // Handles error logic (e.g., 401 refresh)
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
        errorCode = 'server_error_${e.response?.statusCode ?? "unknown"}';
        errorMessage = e.response?.data?['message'] ?? 'Server error occurred';
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
} 
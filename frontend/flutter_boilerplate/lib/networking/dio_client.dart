import 'package:dio/dio.dart';
import 'package:flutterboilerplate/singletonGods/api_constants.dart'; // Assuming ApiConfig is here
import 'package:flutterboilerplate/singletonGods/logger.dart'; // Assuming AppLogger is here

/// Centralized Dio client configuration
class DioClient {
  // Private constructor for singleton pattern
  DioClient._internal() {
    _dio = Dio(_createBaseOptions());
    _addInterceptors(_dio);
  }

  // Singleton instance
  static final DioClient _instance = DioClient._internal();

  // Factory constructor to return the singleton instance
  factory DioClient() => _instance;

  late final Dio _dio;

  // Getter for the configured Dio instance
  Dio get dio => _dio;

  // Standard timeout durations
  static const Duration _connectTimeout = Duration(seconds: 10);
  static const Duration _receiveTimeout = Duration(seconds: 10);
  static const Duration _sendTimeout = Duration(seconds: 10);

  /// Creates the base options for Dio
  BaseOptions _createBaseOptions() {
    return BaseOptions(
      baseUrl: ApiConfig.baseUrl,
      connectTimeout: _connectTimeout,
      receiveTimeout: _receiveTimeout,
      sendTimeout: _sendTimeout,
      validateStatus: (status) => true,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    );
  }

  /// Adds necessary interceptors (e.g., logging)
  void _addInterceptors(Dio dioInstance) {
    dioInstance.interceptors.add(InterceptorsWrapper(
      onRequest: (options, handler) {
        AppLogger.log('🌐 API Request: ${options.method} ${options.path}');
        AppLogger.log('📦 Request Data: ${options.data}');
        return handler.next(options);
      },
      onResponse: (response, handler) {
        AppLogger.log('📡 API Response [${response.statusCode}]: ${response.requestOptions.path}');
        return handler.next(response);
      },
      onError: (error, handler) {
        AppLogger.log('❌ API Error: ${error.message}');
        if (error.response != null) {
           AppLogger.log('❌ Error Response Data: ${error.response?.data}');
        }
        return handler.next(error);
      },
    ));

    // Add other interceptors here if needed (e.g., for auth tokens)
  }

  /// Maps a DioException to a standardized error code and message
  static (String errorCode, String errorMessage) handleDioException(DioException exception, {String? context}) {
    // Log the exception with optional context
    AppLogger.log('❌ DioException${context != null ? ' during $context' : ''}: ${exception.message}');
    
    // Map exception types to error codes
    final exceptionToErrorCode = <DioExceptionType, String>{
      DioExceptionType.connectionTimeout: 'timeout_error',
      DioExceptionType.sendTimeout: 'timeout_error',
      DioExceptionType.receiveTimeout: 'timeout_error',
      DioExceptionType.connectionError: 'connection_error',
      DioExceptionType.badCertificate: 'security_error',
      DioExceptionType.badResponse: 'bad_response',
    };
    
    final String errorCode = exceptionToErrorCode[exception.type] ?? 'unknown_error';
    final String errorMessage = errorMessages[errorCode] ?? 'Network error occurred.';
    
    return (errorCode, errorMessage);
  }
} 

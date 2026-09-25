import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:flutterboilerplate/auth/auth_prompt.dart';
import 'package:flutterboilerplate/networking/device_id.dart';
import 'package:flutterboilerplate/networking/response_guard_interceptor.dart';
import 'package:flutterboilerplate/session/services/session_storage_service.dart';
import 'package:flutterboilerplate/singletonGods/api_constants.dart'; // Assuming ApiConfig is here
import 'package:flutterboilerplate/singletonGods/logger.dart'; // Assuming AppLogger is here

/// Centralized Dio client configuration
class DioClient {
  // Factory constructor to return the singleton instance
  factory DioClient() => _instance;
  // Private constructor for singleton pattern
  DioClient._internal() {
    _dio = Dio(_createBaseOptions());
    _addInterceptors(_dio);
  }

  // Singleton instance
  static final DioClient _instance = DioClient._internal();

  late final Dio _dio;

  // Getter for the configured Dio instance
  Dio get dio => _dio;

  // Ensure singleton is initialized early
  static void ensureInitialized() {
    // Accessing instance triggers _internal constructor if not already
    // ignore: unnecessary_statements
    _instance.dio;
  }

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
    dioInstance.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) {
          stampCartCall(options);
          AppLogger.log('🌐 API Request: ${options.method} ${options.path}');
          AppLogger.log('📦 Request Data: ${options.data}');
          return handler.next(options);
        },
        onResponse: (response, handler) {
          AppLogger.log(
            '📡 API Response [${response.statusCode}]: ${response.requestOptions.path}',
          );
          // validateStatus accepts every status, so a 401 lands here (never in
          // onError). Prompt for OTP and let the repository handle the non-200
          // body as usual.
          if (response.statusCode == 401) {
            AuthPrompt.showIfNeeded(force: true);
          }
          return handler.next(response);
        },
        onError: (error, handler) {
          AppLogger.log('❌ API Error: ${error.message}');
          if (error.response != null) {
            AppLogger.log('❌ Error Response Data: ${error.response?.data}');
          }
          // Normalize backend standardized unauthenticated errors to a common code
          try {
            final data = error.response?.data;
            String? code;
            if (data is Map<String, dynamic>) {
              // Check standardized structure
              if (data['status'] == 'error' &&
                  data['data'] is Map<String, dynamic>) {
                code =
                    (data['data'] as Map<String, dynamic>)['code']?.toString();
              } else if (data['error'] is Map<String, dynamic>) {
                code =
                    (data['error'] as Map<String, dynamic>)['code']?.toString();
              }
            }
            if (error.response?.statusCode == 401 ||
                code == 'unauthenticated') {
              // Attach a uniform flag for UI/global handler
              error.response?.extra['auth_required'] = true;
            }
          } catch (_) {}

          // Show OTP prompt generically if required
          // DEBT(TD-003): only 401 → table OTP. Backend-driven PIN/password challenge
          // (`data.requires`) is not read here; see moonshot/TECH_DEBT.md.
          try {
            if (error.response?.extra['auth_required'] == true) {
              AuthPrompt.showIfNeeded(force: true);
            }
          } catch (_) {}
          return handler.next(error);
        },
      ),
    );

    // Add Response Guard interceptor in debug mode for LLM analysis
    if (kDebugMode) {
      dioInstance.interceptors.add(ResponseGuardInterceptor());
    }
  }

  /// Maps a DioException to a standardized error code and message
  static (String errorCode, String errorMessage) handleDioException(
    DioException exception, {
    String? context,
  }) {
    // Log the exception with optional context
    AppLogger.log(
      '❌ DioException${context != null ? ' during $context' : ''}: ${exception.message}',
    );

    // Map exception types to error codes
    final exceptionToErrorCode = <DioExceptionType, String>{
      DioExceptionType.connectionTimeout: 'timeout_error',
      DioExceptionType.sendTimeout: 'timeout_error',
      DioExceptionType.receiveTimeout: 'timeout_error',
      DioExceptionType.connectionError: 'connection_error',
      DioExceptionType.badCertificate: 'security_error',
      DioExceptionType.badResponse: 'bad_response',
    };

    // Default mapping
    var errorCode = exceptionToErrorCode[exception.type] ?? 'unknown_error';
    var errorMessage = errorMessages[errorCode] ?? 'Network error occurred.';

    // Normalize backend unauthenticated to a single code
    try {
      final resp = exception.response;
      final data = resp?.data;
      String? backendCode;
      if (data is Map<String, dynamic>) {
        if (data['status'] == 'error' && data['data'] is Map<String, dynamic>) {
          backendCode =
              (data['data'] as Map<String, dynamic>)['code']?.toString();
        } else if (data['error'] is Map<String, dynamic>) {
          backendCode =
              (data['error'] as Map<String, dynamic>)['code']?.toString();
        }
      }
      if (resp?.statusCode == 401 ||
          backendCode == 'unauthenticated' ||
          resp?.extra['auth_required'] == true) {
        errorCode = 'auth_required';
        errorMessage =
            errorMessages['auth_required'] ?? 'Authentication required.';
      }
    } catch (_) {}

    return (errorCode, errorMessage);
  }
}

/// The table's cart is one shared document, so every write to it says which phone
/// made it (`addedBy`) and which sitting it belongs to (`sessionId`, TD-033: the backend
/// lets only the table's own live session write its cart). One place, not three
/// repositories. A session the caller already named is never overwritten.
@visibleForTesting
void stampCartCall(RequestOptions options) {
  const cartEndpoints = {
    ApiConfig.addItemToCartEndpoint,
    ApiConfig.removeItemFromCartEndpoint,
    ApiConfig.checkoutCartEndpoint,
  };
  if (!cartEndpoints.contains(options.path)) return;
  final body = options.data;
  if (body is! Map) return;
  final inner = body['data'];
  if (inner is! Map<String, dynamic>) return;
  final id = DeviceId.value;
  // DECISION(D5, 2026-09-25): `addedBy` is always this phone, on every send. "Send all 3 for the table" is the list
  // of `cartItemIds` the phone showed, never a missing `addedBy` (that sends staff dishes too, placed by "system").
  // See moonshot/reviews/2026-09-25-decisions-for-shaurya.md. If you change this, ask Shaurya first.
  if (id != null) inner['addedBy'] = id;
  final session = currentSessionId();
  if (session != null && inner['sessionId'] == null) inner['sessionId'] = session;
}

/// The guest's stored session, read synchronously from the same store SessionProvider saves to.
@visibleForTesting
String? Function() currentSessionId = () => SessionStorageService().loadSession()?.sessionId;

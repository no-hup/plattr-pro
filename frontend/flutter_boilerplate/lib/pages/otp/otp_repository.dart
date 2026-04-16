import 'package:dio/dio.dart';
import 'package:flutterboilerplate/models/api_response.dart';
import 'package:flutterboilerplate/networking/dio_client.dart';
import 'package:flutterboilerplate/singletonGods/api_constants.dart';
import 'package:flutterboilerplate/singletonGods/logger.dart';

import 'models/otp_models.dart';
import 'otp_error_codes.dart';
import 'otp_response_parser.dart';

/// Repository for handling OTP validation API calls.
class OtpRepository {
  factory OtpRepository() => _instance;
  // Singleton Pattern
  OtpRepository._internal() : _dio = DioClient().dio; // Use central Dio instance
  static final OtpRepository _instance = OtpRepository._internal();

  final Dio _dio;

  /// Validates the provided OTP with the backend.
  Future<ApiResponse<OtpValidationResponse>> validateOtp(
      OtpValidationRequest request,) async {
    const operation = 'validateOtp';
    AppLogger.log('OTP Repo: Starting $operation for table ${request.tableId}');

    try {
      // Prepare payload - Firebase callable functions expect data under a 'data' key
      final payload = {'data': request.toJson()};
      AppLogger.log('OTP Repo: Payload: $payload');


      final response = await _dio.post(
        ApiConfig.validateOtpEndpoint,
        data: payload,
      );

      // Process response
      return _processResponse(response, operation);

    } on DioException catch (e) {
      return _handleDioException(e, operation);
    } catch (e, stackTrace) {
      return _handleGenericException(e, stackTrace, operation);
    }
  }

  /// Processes the Dio response.
  ApiResponse<OtpValidationResponse> _processResponse(Response response, String operation) {
     final statusCode = response.statusCode ?? 0;
     AppLogger.log('OTP Repo: Received response status code: $statusCode for $operation');

     if (response.data == null || response.data is! Map<String, dynamic>) {
        AppLogger.log('OTP Repo: Invalid response data format: ${response.data?.runtimeType}');
        return ApiResponse.error(
           'Received invalid data format from server.',
           errorCode: OtpErrorCodes.invalidFormat,
        );
     }

     final jsonResponse = response.data as Map<String, dynamic>;
     AppLogger.log('OTP Repo: Response data: $jsonResponse');


     if (statusCode >= 200 && statusCode < 300) {
        // Use the dedicated parser for success responses
        return OtpResponseParser.parseSuccessResponse(jsonResponse);
     } else {
         // Handle HTTP errors (4xx, 5xx)
         final errorMessage = _extractErrorMessage(response);
         final errorCode = OtpErrorCodes.fromHttpStatus(statusCode, jsonResponse);
         AppLogger.log('OTP Repo: HTTP Error $statusCode: $errorMessage (Code: $errorCode)');
         return ApiResponse.error(
            errorMessage,
            errorCode: errorCode,
         );
     }
  }

   /// Extracts a user-friendly error message from the response.
   String _extractErrorMessage(Response? response) {
     if (response == null) return 'No response received from server.';

     if (response.data is Map<String, dynamic>) {
        final data = response.data as Map<String, dynamic>;
        // Firebase callable functions often return error details under 'error'
        if (data.containsKey('error')) {
          final errorData = data['error'];
          if (errorData is Map<String, dynamic> && errorData.containsKey('message')) {
             return errorData['message'].toString();
          }
          return errorData.toString();
        }
        // Standard message keys
        if (data.containsKey('message')) return data['message'].toString();
        if (data.containsKey('detail')) return data['detail'].toString();
     }
     // Fallback
     return response.statusMessage ?? 'An unknown server error occurred.';
   }


  /// Handles Dio-specific exceptions.
  ApiResponse<OtpValidationResponse> _handleDioException(DioException e, String operation) {
    AppLogger.log('OTP Repo: DioException during $operation: ${e.type}, Message: ${e.message}');
    switch (e.type) {
      case DioExceptionType.connectionTimeout:
      case DioExceptionType.sendTimeout:
      case DioExceptionType.receiveTimeout:
        return ApiResponse.error(
          'Connection timeout. Please check your network.',
          errorCode: OtpErrorCodes.timeoutError,
        );
      case DioExceptionType.badResponse:
        // Error response from server (4xx, 5xx that Dio throws for)
        final statusCode = e.response?.statusCode ?? 0;
        final errorMessage = _extractErrorMessage(e.response);
         final errorCode = OtpErrorCodes.fromHttpStatus(statusCode, e.response?.data);
        AppLogger.log('OTP Repo: Bad response $statusCode: $errorMessage (Code: $errorCode)');
        return ApiResponse.error(errorMessage, errorCode: errorCode);
      case DioExceptionType.connectionError:
         return ApiResponse.error(
           'Connection error. Please check your internet connection.',
           errorCode: OtpErrorCodes.connectionError,
         );
      case DioExceptionType.cancel:
        return ApiResponse.error('Request was cancelled.', errorCode: OtpErrorCodes.networkError);
      case DioExceptionType.unknown:
      default:
        return ApiResponse.error(
          e.message ?? 'An unexpected network error occurred.',
          errorCode: OtpErrorCodes.networkError,
        );
    }
  }

  /// Handles generic exceptions.
  ApiResponse<OtpValidationResponse> _handleGenericException(
      dynamic e, StackTrace stackTrace, String operation,) {
    AppLogger.log('OTP Repo: Generic Exception during $operation: $e\n$stackTrace');
    return ApiResponse.error(
      'An unexpected error occurred: $e',
      errorCode: OtpErrorCodes.unknownError,
    );
  }
} 

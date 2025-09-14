import 'package:dio/dio.dart';
import 'package:flutterboilerplate/models/api_response.dart';
import 'package:flutterboilerplate/networking/dio_client.dart'; // Import the new client
import 'package:flutterboilerplate/singletonGods/api_constants.dart';
import 'package:flutterboilerplate/singletonGods/logger.dart';

import 'models/models.dart';
import 'table_error_codes.dart';
import 'table_response_parser.dart';

/// Repository for table-related API operations
class TableRepository {
  // Use dependency injection for Dio
  TableRepository({Dio? dio}) : _dio = dio ?? DioClient().dio {
    // Configure Dio to not throw on any status code
    _dio.options.validateStatus = (status) => true;
  }

  final Dio _dio; // Use the injected Dio instance

  // Legacy method - keeping for backwards compatibility
  Future<ApiResponse<TableValidationResponse>> validateTable({
    required String restaurantId,
    required String tableId,
  }) async {
    return validateTableAndLocation(
      restaurantId: restaurantId, 
      tableId: tableId, 
      userLocation: const UserLocation(latitude: 0.0, longitude: 0.0)
    );
  }

  /// Validates a table and user location
  /// 
  /// This method sends a request to the server to validate if a user can access
  /// a specific table based on their location and session information.
  Future<ApiResponse<TableValidationResponse>> validateTableAndLocation({
    required String restaurantId,
    required String tableId,
    required UserLocation userLocation,
    String? sessionId,
  }) async {
    try {
      AppLogger.log('🔐 VALIDATE: Table validation started');
      
      // Prepare request payload
      final payload = _prepareValidationPayload(
        restaurantId: restaurantId,
        tableId: tableId,
        userLocation: userLocation,
        sessionId: sessionId,
      );
      
      // Make API request with timeout handling - check the exact endpoint URL
      AppLogger.log('🔐 VALIDATE: Using endpoint: ${ApiConfig.validateTableEndpointProd}');
      
      // If using the centralized DioClient, ensure it's configured correctly
      final response = await _dio.post(
        ApiConfig.validateTableEndpointProd,
        data: payload,
      ).timeout(
        const Duration(seconds: 15),
        onTimeout: () {
          AppLogger.log('⏱️ API Timeout: Table validation request timed out');
          throw DioException(
            requestOptions: RequestOptions(path: ApiConfig.validateTableEndpointProd),
            type: DioExceptionType.connectionTimeout,
            message: 'Request timed out after 15 seconds',
          );
        },
      );
      
      // Log the response for debugging
      AppLogger.log('🔐 VALIDATE: Received response with status: ${response.statusCode}');
      
      // Process response based on status code
      return _processValidationResponse(response);
      
    } on DioException catch (e) {
      AppLogger.log('❌ Dio Error: ${e.type}, Message: ${e.message}');
      if (e.response != null) {
        AppLogger.log('❌ Response Status: ${e.response?.statusCode}');
        AppLogger.log('❌ Response Data: ${e.response?.data}');
      }
      // Pass the specific endpoint path for better error context
      return _handleDioException(e);
    } catch (e, stackTrace) {
      AppLogger.log('❌ General Error: $e');
      AppLogger.log('❌ Stack Trace: $stackTrace');
      return _handleGenericException(e);
    }
  }
  
  /// Prepares the payload for table validation request
  Map<String, dynamic> _prepareValidationPayload({
    required String restaurantId,
    required String tableId,
    required UserLocation userLocation,
    String? sessionId,
  }) {
    final hasSession = sessionId != null && sessionId.isNotEmpty;
    
    AppLogger.log('📦 VALIDATION: Preparing payload for table validation request');
    AppLogger.log('📦 VALIDATION: Restaurant ID: $restaurantId, Table ID: $tableId');
    
    if (hasSession) {
      AppLogger.log('📦 VALIDATION: Including sessionId in request: $sessionId');
    } else {
      AppLogger.log('📦 VALIDATION: No sessionId available for request');
    }
    
    final payload = {
      'data': {
        'restaurantId': restaurantId,
        'tableId': tableId,
        'userLocation': {
          'latitude': userLocation.latitude,
          'longitude': userLocation.longitude,
        },
        if (hasSession) 'sessionId': sessionId,
      }
    };
    
    AppLogger.log('📦 VALIDATION: Request payload prepared: ${payload['data']}');
    return payload;
  }
  
  /// Processes the API response based on status code
  ApiResponse<TableValidationResponse> _processValidationResponse(Response response) {
    final statusCode = response.statusCode ?? 0;
    final responseData = response.data;
    
    AppLogger.log('🔍 Processing response - Status: $statusCode, Data: $responseData');
    
    // First check if we have an error response structure
    if (responseData is Map<String, dynamic>) {
      // Check for error object in response
      if (responseData.containsKey('error')) {
        final errorData = responseData['error'] as Map<String, dynamic>;
        AppLogger.log('🔍 Found error data: $errorData');
        
        // Check if this is actually an auth error wrapped in a 500
        if (errorData.containsKey('code') && errorData['code'] == 'unauthenticated') {
          AppLogger.log('🔑 Found auth error in response');
          return _handleAuthRequiredResponse(response);
        }
        
        // Check if we have details in the error
        final details = errorData['details'] as Map<String, dynamic>?;
        if (details != null) {
          AppLogger.log('🔍 Found error details: $details');
          
          // Check for auth-related fields in details
          if (details['otpRequired'] == true || 
              details['isUsernameMandatory'] != null || 
              details['isPhoneNumberMandatory'] != null) {
            AppLogger.log('🔑 Found OTP/Auth details in error details');
            try {
              // Create a properly structured response for auth
              final validationResponse = TableResponseParser.parseFromJson({
                'status': 'auth_required',
                'message': details['authMessage'] ?? errorData['message'] ?? 'Authentication required',
                'data': details
              });
              return ApiResponse.success(validationResponse.copyWith(requiresOtp: true));
            } catch (e) {
              AppLogger.log('❌ Failed to parse auth details: $e');
              return ApiResponse.error(
                'Authentication required',
                errorCode: 'unauthenticated',
                errorDetails: details
              );
            }
          }
        }
        
        // For other error cases, return the error with details
        final message = errorData['message']?.toString() ?? 'Unknown error';
        final status = errorData['status']?.toString()?.toLowerCase() ?? 
                      errorData['code']?.toString()?.toLowerCase() ?? 
                      TableErrorCodes.fromHttpStatus(statusCode);
                      
        AppLogger.log('❌ Returning error response - Message: $message, Status: $status');
        return ApiResponse.error(
          message,
          errorCode: status,
          errorDetails: details
        );
      }
    }
    
    // If no error structure, proceed with normal status code handling
    if (statusCode == 200) {
      return _handleSuccessResponse(response);
    } else if (statusCode == 401) {
      return _handleAuthRequiredResponse(response);
    } else if (statusCode == 403) {
      AppLogger.log('❌ Table disabled: ${response.data}');
      return ApiResponse.error(
        'This table is currently unavailable',
        errorCode: TableErrorCodes.tableDisabled,
      );
    } else if (statusCode == 412) {
      AppLogger.log('❌ Location mismatch: ${response.data}');
      return ApiResponse.error(
        'User is not in restaurant premises. Please make sure you are at the restaurant.',
        errorCode: TableErrorCodes.locationMismatch,
      );
    }
    
    // Default error handling
    AppLogger.log('❌ HTTP Error: $statusCode');
    AppLogger.log('❌ Error Response: $responseData');
    return ApiResponse.error(
      'Server error occurred',
      errorCode: TableErrorCodes.fromHttpStatus(statusCode),
    );
  }
  
  /// Handles successful (200) API response
  ApiResponse<TableValidationResponse> _handleSuccessResponse(Response response) {
    try {
      if (response.data is! Map<String, dynamic>) {
        AppLogger.log('❌ Invalid response format: ${response.data.runtimeType}');
        return ApiResponse.error(
          'Invalid response format: expected Map, got ${response.data.runtimeType}',
          errorCode: TableErrorCodes.invalidFormat,
        );
      }
      
      final jsonResponse = response.data as Map<String, dynamic>;
      final validationResponse = TableResponseParser.parseFromJson(jsonResponse);
      AppLogger.log('✅ Table validation successful: ${validationResponse.status}');
      return ApiResponse.success(validationResponse);
    } catch (e) {
      AppLogger.log('❌ Parse Error: $e');
      return ApiResponse.error(
        'Failed to parse server response: $e',
        errorCode: TableErrorCodes.parseError,
      );
    }
  }
  
  /// Handles authentication required (401) API response
  ApiResponse<TableValidationResponse> _handleAuthRequiredResponse(Response response) {
    try {
      final jsonResponse = response.data as Map<String, dynamic>;
      final validationResponse = TableResponseParser.parseFromJson(jsonResponse);
      AppLogger.log('🔑 OTP required for table access');
      return ApiResponse.success(validationResponse.copyWith(requiresOtp: true));
    } catch (e) {
      AppLogger.log('❌ Parse Error on 401 response: $e');
      return ApiResponse.error(
        'Authentication required but failed to parse response: $e',
        errorCode: TableErrorCodes.parseError,
      );
    }
  }
  
  /// Handles Dio exceptions
  ApiResponse<TableValidationResponse> _handleDioException(DioException e) {
    AppLogger.log('❌ Dio Error Type: ${e.type}');
    AppLogger.log('❌ Dio Error Message: ${e.message}');
    
    switch (e.type) {
      case DioExceptionType.connectionTimeout:
      case DioExceptionType.sendTimeout:
      case DioExceptionType.receiveTimeout:
        return ApiResponse.error(
          'Connection timeout. Please check your internet connection and try again.',
          errorCode: TableErrorCodes.timeoutError,
        );
      
      case DioExceptionType.connectionError:
        return ApiResponse.error(
          'Connection error. Please check your internet connection and try again.',
          errorCode: TableErrorCodes.connectionError,
        );
      
      case DioExceptionType.badResponse:
        final statusCode = e.response?.statusCode ?? 0;
        final responseData = e.response?.data;
        
        AppLogger.log('🔍 Processing error response - Status: $statusCode, Data: $responseData');
        
        // Handle both error formats (direct error object or wrapped in response)
        final Map<String, dynamic>? errorData = responseData is Map<String, dynamic> 
            ? (responseData['error'] as Map<String, dynamic>? ?? responseData)
            : null;
            
        if (errorData != null) {
          final code = errorData['code']?.toString() ?? 
                      errorData['status']?.toString()?.toLowerCase() ?? 
                      'unauthenticated';
                      
          final message = errorData['message']?.toString() ?? 
                         errorData['error']?.toString() ?? 
                         'Authentication required';
                         
          final details = errorData['details'] as Map<String, dynamic>?;
          
          AppLogger.log('📝 Extracted error details - Code: $code, Message: $message');
          
          return ApiResponse.error(
            message,
            errorCode: code,
            errorDetails: details,
          );
        }
        
        return ApiResponse.error(
          'Server error: ${_extractErrorMessage(e.response)}',
          errorCode: TableErrorCodes.fromHttpStatus(statusCode),
        );
      
      case DioExceptionType.cancel:
        return ApiResponse.error(
          'Request was cancelled',
          errorCode: TableErrorCodes.networkError,
        );
        
      default:
        return ApiResponse.error(
          e.message ?? 'An unexpected network error occurred.',
          errorCode: TableErrorCodes.networkError,
        );
    }
  }
  
  /// Extracts error message from response
  String _extractErrorMessage(Response? response) {
    if (response == null) return 'No response received';
    
    if (response.data is Map<String, dynamic>) {
      final data = response.data as Map<String, dynamic>;
      if (data.containsKey('error')) return data['error'].toString();
      if (data.containsKey('message')) return data['message'].toString();
    }
    
    return response.statusMessage ?? 'Unknown error';
  }
  
  /// Handles generic exceptions
  ApiResponse<TableValidationResponse> _handleGenericException(dynamic e) {
    AppLogger.log('❌ General Error: $e');
    return ApiResponse.error(
      'Failed to validate table: $e',
      errorCode: TableErrorCodes.unknownError,
    );
  }
} 
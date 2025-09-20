import 'package:dio/dio.dart';
import 'package:flutterboilerplate/networking/dio_client.dart';
import 'package:flutterboilerplate/singletonGods/api_constants.dart';
import 'package:flutterboilerplate/singletonGods/logger.dart';
import 'package:flutterboilerplate/utils/UnifiedResponseParser.dart';

import 'models/models.dart' as legacy_models;
import 'models/unified_models.dart';

/// Unified Table Repository for handling standardized API responses
///
/// This repository uses the UnifiedResponseParser to handle the new
/// standardized response format from the backend.
class UnifiedTableRepository {
  UnifiedTableRepository({Dio? dio}) : _dio = dio ?? DioClient().dio {
    // Configure Dio to not throw on any status code
    _dio.options.validateStatus = (status) => true;
  }

  final Dio _dio;

  /// Validates a table and user location using the unified response format
  ///
  /// This method sends a request to the server to validate if a user can access
  /// a specific table based on their location and session information.
  Future<TableValidationResponse> validateTableAndLocation({
    required String restaurantId,
    required String tableId,
    required legacy_models.UserLocation userLocation,
    String? sessionId,
  }) async {
    try {
      AppLogger.log('🔐 UNIFIED VALIDATE: Table validation started');

      // Prepare request payload
      final payload = _prepareValidationPayload(
        restaurantId: restaurantId,
        tableId: tableId,
        userLocation: userLocation,
        sessionId: sessionId,
      );

      // Make API request with timeout handling
      AppLogger.log(
          '🔐 UNIFIED VALIDATE: Using endpoint: ${ApiConfig.validateTableEndpointProd}');

      final response = await _dio
          .post<Map<String, dynamic>>(
        ApiConfig.validateTableEndpointProd,
        data: payload,
      )
          .timeout(
        const Duration(seconds: 15),
        onTimeout: () {
          AppLogger.log('⏱️ API Timeout: Table validation request timed out');
          throw DioException(
            requestOptions:
                RequestOptions(path: ApiConfig.validateTableEndpointProd),
            type: DioExceptionType.connectionTimeout,
            message: 'Request timed out after 15 seconds',
          );
        },
      );

      // Log the response for debugging
      AppLogger.log(
          '🔐 UNIFIED VALIDATE: Received response with status: ${response.statusCode}');
      AppLogger.log('🔐 UNIFIED VALIDATE: Response data: ${response.data}');

      // Process response using UnifiedResponseParser
      return _processUnifiedResponse(response);
    } on DioException catch (e) {
      AppLogger.log('❌ Dio Error: ${e.type}, Message: ${e.message}');
      if (e.response != null) {
        AppLogger.log('❌ Response Status: ${e.response?.statusCode}');
        AppLogger.log('❌ Response Data: ${e.response?.data}');
      }
      return _handleDioException(e);
    } catch (e) {
      AppLogger.log('❌ General Error: $e');
      return _handleGenericException(e);
    }
  }

  /// Validates OTP using the unified response format
  Future<OtpValidationResponse> validateOTP({
    required String restaurantId,
    required String tableId,
    required String otp,
    String? phoneNumber,
    String? name,
  }) async {
    try {
      AppLogger.log('🔐 UNIFIED OTP: OTP validation started');

      // Prepare request payload
      final payload = {
        'data': {
          'restaurantId': restaurantId,
          'tableId': tableId,
          'otp': otp,
          if (phoneNumber != null) 'phoneNumber': phoneNumber,
          if (name != null) 'name': name,
        },
      };

      // Make API request
      AppLogger.log(
          '🔐 UNIFIED OTP: Using endpoint: ${ApiConfig.validateOtpEndpointProd}');

      final response = await _dio
          .post<Map<String, dynamic>>(
            ApiConfig.validateOtpEndpointProd,
            data: payload,
          )
          .timeout(const Duration(seconds: 15));

      AppLogger.log(
          '🔐 UNIFIED OTP: Received response with status: ${response.statusCode}');
      AppLogger.log('🔐 UNIFIED OTP: Response data: ${response.data}');

      // Process response using UnifiedResponseParser
      return _processOtpResponse(response);
    } on DioException catch (e) {
      AppLogger.log('❌ Dio Error: ${e.type}, Message: ${e.message}');
      return _handleOtpDioException(e);
    } catch (e) {
      AppLogger.log('❌ General Error: $e');
      return _handleGenericOtpException(e);
    }
  }

  /// Checks table status using the unified response format
  Future<TableStatusResponse> checkTableStatus({
    required String restaurantId,
    required String tableId,
  }) async {
    try {
      AppLogger.log('🔐 UNIFIED STATUS: Table status check started');

      // Prepare request payload
      final payload = {
        'data': {
          'restaurantId': restaurantId,
          'tableId': tableId,
        },
      };

      // Make API request
      AppLogger.log(
          '🔐 UNIFIED STATUS: Using endpoint: ${ApiConfig.checkTableStatusEndpointProd}');

      final response = await _dio
          .post<Map<String, dynamic>>(
            ApiConfig.checkTableStatusEndpointProd,
            data: payload,
          )
          .timeout(const Duration(seconds: 15));

      AppLogger.log(
          '🔐 UNIFIED STATUS: Received response with status: ${response.statusCode}');
      AppLogger.log('🔐 UNIFIED STATUS: Response data: ${response.data}');

      // Process response using UnifiedResponseParser
      return _processTableStatusResponse(response);
    } on DioException catch (e) {
      AppLogger.log('❌ Dio Error: ${e.type}, Message: ${e.message}');
      return _handleTableStatusDioException(e);
    } catch (e) {
      AppLogger.log('❌ General Error: $e');
      return _handleGenericTableStatusException(e);
    }
  }

  /// Gets all tables for a restaurant using the unified response format
  Future<TableListResponse> getTablesForRestaurant({
    required String restaurantId,
    String? serverId,
  }) async {
    try {
      AppLogger.log('🔐 UNIFIED LIST: Getting tables for restaurant');

      // Prepare request payload
      final payload = {
        'data': {
          'restaurantId': restaurantId,
          if (serverId != null) 'serverId': serverId,
        },
      };

      // Make API request
      AppLogger.log(
          '🔐 UNIFIED LIST: Using endpoint: ${ApiConfig.getTablesForRestaurantEndpointProd}');

      final response = await _dio
          .post<Map<String, dynamic>>(
            ApiConfig.getTablesForRestaurantEndpointProd,
            data: payload,
          )
          .timeout(const Duration(seconds: 15));

      AppLogger.log(
          '🔐 UNIFIED LIST: Received response with status: ${response.statusCode}');
      AppLogger.log('🔐 UNIFIED LIST: Response data: ${response.data}');

      // Process response using UnifiedResponseParser
      return _processTableListResponse(response);
    } on DioException catch (e) {
      AppLogger.log('❌ Dio Error: ${e.type}, Message: ${e.message}');
      return _handleTableListDioException(e);
    } catch (e) {
      AppLogger.log('❌ General Error: $e');
      return _handleGenericTableListException(e);
    }
  }

  /// Gets detailed table information using the unified response format
  Future<TableDetailsResponse> getTableDetails({
    required String restaurantId,
    required String tableId,
  }) async {
    try {
      AppLogger.log('🔐 UNIFIED DETAILS: Getting table details');

      // Prepare request payload
      final payload = {
        'data': {
          'restaurantId': restaurantId,
          'tableId': tableId,
        },
      };

      // Make API request
      AppLogger.log(
          '🔐 UNIFIED DETAILS: Using endpoint: ${ApiConfig.getTableDetailsEndpointProd}');

      final response = await _dio
          .post<Map<String, dynamic>>(
            ApiConfig.getTableDetailsEndpointProd,
            data: payload,
          )
          .timeout(const Duration(seconds: 15));

      AppLogger.log(
          '🔐 UNIFIED DETAILS: Received response with status: ${response.statusCode}');
      AppLogger.log('🔐 UNIFIED DETAILS: Response data: ${response.data}');

      // Process response using UnifiedResponseParser
      return _processTableDetailsResponse(response);
    } on DioException catch (e) {
      AppLogger.log('❌ Dio Error: ${e.type}, Message: ${e.message}');
      return _handleTableDetailsDioException(e);
    } catch (e) {
      AppLogger.log('❌ General Error: $e');
      return _handleGenericTableDetailsException(e);
    }
  }

  /// Prepares the payload for table validation request
  Map<String, dynamic> _prepareValidationPayload({
    required String restaurantId,
    required String tableId,
    required legacy_models.UserLocation userLocation,
    String? sessionId,
  }) {
    final hasSession = sessionId != null && sessionId.isNotEmpty;

    AppLogger.log(
        '📦 UNIFIED VALIDATION: Preparing payload for table validation request');
    AppLogger.log(
        '📦 UNIFIED VALIDATION: Restaurant ID: $restaurantId, Table ID: $tableId');

    if (hasSession) {
      AppLogger.log(
          '📦 UNIFIED VALIDATION: Including sessionId in request: $sessionId');
    } else {
      AppLogger.log(
          '📦 UNIFIED VALIDATION: No sessionId available for request');
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
      },
    };

    AppLogger.log(
        '📦 UNIFIED VALIDATION: Request payload prepared: ${payload['data']}');
    return payload;
  }

  /// Processes unified table validation response
  TableValidationResponse _processUnifiedResponse(Response<dynamic> response) {
    if (response.data is! Map<String, dynamic>) {
      AppLogger.log('❌ Invalid response format: ${response.data.runtimeType}');
      return UnifiedResponseParser.parse<TableValidationData>(
        {
          'result': {'status': 'error', 'message': 'Invalid response format'}
        },
        dataParser: (data) =>
            throw const UnifiedResponseException('Invalid response format'),
      );
    }

    try {
      final responseData = response.data as Map<String, dynamic>;
      final parsedResponse = UnifiedResponseParser.parse<TableValidationData>(
        responseData,
        dataParser: TableValidationData.fromJson,
      );

      AppLogger.log('✅ UNIFIED: Table validation response parsed successfully');
      return parsedResponse;
    } catch (e) {
      AppLogger.log('❌ UNIFIED Parse Error: $e');
      return UnifiedResponseParser.parse<TableValidationData>(
        {
          'result': {
            'status': 'error',
            'message': 'Failed to parse response: $e'
          }
        },
        dataParser: (data) => throw UnifiedResponseException('Parse error: $e'),
      );
    }
  }

  /// Processes unified OTP validation response
  OtpValidationResponse _processOtpResponse(Response<dynamic> response) {
    if (response.data is! Map<String, dynamic>) {
      AppLogger.log(
          '❌ Invalid OTP response format: ${response.data.runtimeType}');
      return UnifiedResponseParser.parse<OtpValidationData>(
        {
          'result': {'status': 'error', 'message': 'Invalid response format'}
        },
        dataParser: (data) =>
            throw const UnifiedResponseException('Invalid response format'),
      );
    }

    try {
      final responseData = response.data as Map<String, dynamic>;
      final parsedResponse = UnifiedResponseParser.parse<OtpValidationData>(
        responseData,
        dataParser: OtpValidationData.fromJson,
      );

      AppLogger.log('✅ UNIFIED: OTP validation response parsed successfully');
      return parsedResponse;
    } catch (e) {
      AppLogger.log('❌ UNIFIED OTP Parse Error: $e');
      return UnifiedResponseParser.parse<OtpValidationData>(
        {
          'result': {
            'status': 'error',
            'message': 'Failed to parse response: $e'
          }
        },
        dataParser: (data) => throw UnifiedResponseException('Parse error: $e'),
      );
    }
  }

  /// Processes unified table status response
  TableStatusResponse _processTableStatusResponse(Response<dynamic> response) {
    if (response.data is! Map<String, dynamic>) {
      AppLogger.log(
          '❌ Invalid table status response format: ${response.data.runtimeType}');
      return UnifiedResponseParser.parse<TableStatusData>(
        {
          'result': {'status': 'error', 'message': 'Invalid response format'}
        },
        dataParser: (data) =>
            throw const UnifiedResponseException('Invalid response format'),
      );
    }

    try {
      final responseData = response.data as Map<String, dynamic>;
      final parsedResponse = UnifiedResponseParser.parse<TableStatusData>(
        responseData,
        dataParser: TableStatusData.fromJson,
      );

      AppLogger.log('✅ UNIFIED: Table status response parsed successfully');
      return parsedResponse;
    } catch (e) {
      AppLogger.log('❌ UNIFIED Table Status Parse Error: $e');
      return UnifiedResponseParser.parse<TableStatusData>(
        {
          'result': {
            'status': 'error',
            'message': 'Failed to parse response: $e'
          }
        },
        dataParser: (data) => throw UnifiedResponseException('Parse error: $e'),
      );
    }
  }

  /// Processes unified table list response
  TableListResponse _processTableListResponse(Response<dynamic> response) {
    if (response.data is! Map<String, dynamic>) {
      AppLogger.log(
          '❌ Invalid table list response format: ${response.data.runtimeType}');
      return UnifiedResponseParser.parse<TableListData>(
        {
          'result': {'status': 'error', 'message': 'Invalid response format'}
        },
        dataParser: (data) =>
            throw const UnifiedResponseException('Invalid response format'),
      );
    }

    try {
      final responseData = response.data as Map<String, dynamic>;
      final parsedResponse = UnifiedResponseParser.parse<TableListData>(
        responseData,
        dataParser: TableListData.fromJson,
      );

      AppLogger.log('✅ UNIFIED: Table list response parsed successfully');
      return parsedResponse;
    } catch (e) {
      AppLogger.log('❌ UNIFIED Table List Parse Error: $e');
      return UnifiedResponseParser.parse<TableListData>(
        {
          'result': {
            'status': 'error',
            'message': 'Failed to parse response: $e'
          }
        },
        dataParser: (data) => throw UnifiedResponseException('Parse error: $e'),
      );
    }
  }

  /// Processes unified table details response
  TableDetailsResponse _processTableDetailsResponse(
      Response<dynamic> response) {
    if (response.data is! Map<String, dynamic>) {
      AppLogger.log(
          '❌ Invalid table details response format: ${response.data.runtimeType}');
      return UnifiedResponseParser.parse<TableDetailsData>(
        {
          'result': {'status': 'error', 'message': 'Invalid response format'}
        },
        dataParser: (data) =>
            throw const UnifiedResponseException('Invalid response format'),
      );
    }

    try {
      final responseData = response.data as Map<String, dynamic>;
      final parsedResponse = UnifiedResponseParser.parse<TableDetailsData>(
        responseData,
        dataParser: TableDetailsData.fromJson,
      );

      AppLogger.log('✅ UNIFIED: Table details response parsed successfully');
      return parsedResponse;
    } catch (e) {
      AppLogger.log('❌ UNIFIED Table Details Parse Error: $e');
      return UnifiedResponseParser.parse<TableDetailsData>(
        {
          'result': {
            'status': 'error',
            'message': 'Failed to parse response: $e'
          }
        },
        dataParser: (data) => throw UnifiedResponseException('Parse error: $e'),
      );
    }
  }

  /// Handles Dio exceptions for table validation
  TableValidationResponse _handleDioException(DioException e) {
    AppLogger.log('❌ UNIFIED Dio Error Type: ${e.type}');
    AppLogger.log('❌ UNIFIED Dio Error Message: ${e.message}');

    var message = 'Network error occurred';
    var code = 'network_error';

    switch (e.type) {
      case DioExceptionType.connectionTimeout:
      case DioExceptionType.sendTimeout:
      case DioExceptionType.receiveTimeout:
        message =
            'Connection timeout. Please check your internet connection and try again.';
        code = 'timeout_error';

      case DioExceptionType.connectionError:
        message =
            'Connection error. Please check your internet connection and try again.';
        code = 'connection_error';

      case DioExceptionType.badResponse:
        message = 'Server error occurred';
        code = 'server_error';

      case DioExceptionType.cancel:
        message = 'Request was cancelled';
        code = 'request_cancelled';

      default:
        message = e.message ?? 'An unexpected network error occurred.';
        code = 'network_error';
    }

    return UnifiedResponseParser.parse<TableValidationData>(
      {
        'result': {
          'status': 'error',
          'message': message,
          'error': {
            'code': code,
            'message': message,
          },
        },
      },
      dataParser: (data) => throw UnifiedResponseException(message),
    );
  }

  /// Handles Dio exceptions for OTP validation
  OtpValidationResponse _handleOtpDioException(DioException e) {
    AppLogger.log('❌ UNIFIED OTP Dio Error Type: ${e.type}');
    AppLogger.log('❌ UNIFIED OTP Dio Error Message: ${e.message}');

    var message = 'Network error occurred';
    var code = 'network_error';

    switch (e.type) {
      case DioExceptionType.connectionTimeout:
      case DioExceptionType.sendTimeout:
      case DioExceptionType.receiveTimeout:
        message =
            'Connection timeout. Please check your internet connection and try again.';
        code = 'timeout_error';

      case DioExceptionType.connectionError:
        message =
            'Connection error. Please check your internet connection and try again.';
        code = 'connection_error';

      case DioExceptionType.badResponse:
        message = 'Server error occurred';
        code = 'server_error';

      case DioExceptionType.cancel:
        message = 'Request was cancelled';
        code = 'request_cancelled';

      default:
        message = e.message ?? 'An unexpected network error occurred.';
        code = 'network_error';
    }

    return UnifiedResponseParser.parse<OtpValidationData>(
      {
        'result': {
          'status': 'error',
          'message': message,
          'error': {
            'code': code,
            'message': message,
          },
        },
      },
      dataParser: (data) => throw UnifiedResponseException(message),
    );
  }

  /// Handles Dio exceptions for table status
  TableStatusResponse _handleTableStatusDioException(DioException e) {
    AppLogger.log('❌ UNIFIED STATUS Dio Error Type: ${e.type}');
    AppLogger.log('❌ UNIFIED STATUS Dio Error Message: ${e.message}');

    var message = 'Network error occurred';
    var code = 'network_error';

    switch (e.type) {
      case DioExceptionType.connectionTimeout:
      case DioExceptionType.sendTimeout:
      case DioExceptionType.receiveTimeout:
        message =
            'Connection timeout. Please check your internet connection and try again.';
        code = 'timeout_error';

      case DioExceptionType.connectionError:
        message =
            'Connection error. Please check your internet connection and try again.';
        code = 'connection_error';

      case DioExceptionType.badResponse:
        message = 'Server error occurred';
        code = 'server_error';

      case DioExceptionType.cancel:
        message = 'Request was cancelled';
        code = 'request_cancelled';

      default:
        message = e.message ?? 'An unexpected network error occurred.';
        code = 'network_error';
    }

    return UnifiedResponseParser.parse<TableStatusData>(
      {
        'result': {
          'status': 'error',
          'message': message,
          'error': {
            'code': code,
            'message': message,
          },
        },
      },
      dataParser: (data) => throw UnifiedResponseException(message),
    );
  }

  /// Handles Dio exceptions for table list
  TableListResponse _handleTableListDioException(DioException e) {
    AppLogger.log('❌ UNIFIED LIST Dio Error Type: ${e.type}');
    AppLogger.log('❌ UNIFIED LIST Dio Error Message: ${e.message}');

    var message = 'Network error occurred';
    var code = 'network_error';

    switch (e.type) {
      case DioExceptionType.connectionTimeout:
      case DioExceptionType.sendTimeout:
      case DioExceptionType.receiveTimeout:
        message =
            'Connection timeout. Please check your internet connection and try again.';
        code = 'timeout_error';

      case DioExceptionType.connectionError:
        message =
            'Connection error. Please check your internet connection and try again.';
        code = 'connection_error';

      case DioExceptionType.badResponse:
        message = 'Server error occurred';
        code = 'server_error';

      case DioExceptionType.cancel:
        message = 'Request was cancelled';
        code = 'request_cancelled';

      default:
        message = e.message ?? 'An unexpected network error occurred.';
        code = 'network_error';
    }

    return UnifiedResponseParser.parse<TableListData>(
      {
        'result': {
          'status': 'error',
          'message': message,
          'error': {
            'code': code,
            'message': message,
          },
        },
      },
      dataParser: (data) => throw UnifiedResponseException(message),
    );
  }

  /// Handles Dio exceptions for table details
  TableDetailsResponse _handleTableDetailsDioException(DioException e) {
    AppLogger.log('❌ UNIFIED DETAILS Dio Error Type: ${e.type}');
    AppLogger.log('❌ UNIFIED DETAILS Dio Error Message: ${e.message}');

    var message = 'Network error occurred';
    var code = 'network_error';

    switch (e.type) {
      case DioExceptionType.connectionTimeout:
      case DioExceptionType.sendTimeout:
      case DioExceptionType.receiveTimeout:
        message =
            'Connection timeout. Please check your internet connection and try again.';
        code = 'timeout_error';

      case DioExceptionType.connectionError:
        message =
            'Connection error. Please check your internet connection and try again.';
        code = 'connection_error';

      case DioExceptionType.badResponse:
        message = 'Server error occurred';
        code = 'server_error';

      case DioExceptionType.cancel:
        message = 'Request was cancelled';
        code = 'request_cancelled';

      default:
        message = e.message ?? 'An unexpected network error occurred.';
        code = 'network_error';
    }

    return UnifiedResponseParser.parse<TableDetailsData>(
      {
        'result': {
          'status': 'error',
          'message': message,
          'error': {
            'code': code,
            'message': message,
          },
        },
      },
      dataParser: (data) => throw UnifiedResponseException(message),
    );
  }

  /// Handles generic exceptions for table validation
  TableValidationResponse _handleGenericException(dynamic e) {
    AppLogger.log('❌ UNIFIED General Error: $e');
    return UnifiedResponseParser.parse<TableValidationData>(
      {
        'result': {
          'status': 'error',
          'message': 'Failed to validate table: $e',
          'error': {
            'code': 'unknown_error',
            'message': 'Failed to validate table: $e',
          },
        },
      },
      dataParser: (data) =>
          throw UnifiedResponseException('Failed to validate table: $e'),
    );
  }

  /// Handles generic exceptions for OTP validation
  OtpValidationResponse _handleGenericOtpException(dynamic e) {
    AppLogger.log('❌ UNIFIED OTP General Error: $e');
    return UnifiedResponseParser.parse<OtpValidationData>(
      {
        'result': {
          'status': 'error',
          'message': 'Failed to validate OTP: $e',
          'error': {
            'code': 'unknown_error',
            'message': 'Failed to validate OTP: $e',
          },
        },
      },
      dataParser: (data) =>
          throw UnifiedResponseException('Failed to validate OTP: $e'),
    );
  }

  /// Handles generic exceptions for table status
  TableStatusResponse _handleGenericTableStatusException(dynamic e) {
    AppLogger.log('❌ UNIFIED STATUS General Error: $e');
    return UnifiedResponseParser.parse<TableStatusData>(
      {
        'result': {
          'status': 'error',
          'message': 'Failed to check table status: $e',
          'error': {
            'code': 'unknown_error',
            'message': 'Failed to check table status: $e',
          },
        },
      },
      dataParser: (data) =>
          throw UnifiedResponseException('Failed to check table status: $e'),
    );
  }

  /// Handles generic exceptions for table list
  TableListResponse _handleGenericTableListException(dynamic e) {
    AppLogger.log('❌ UNIFIED LIST General Error: $e');
    return UnifiedResponseParser.parse<TableListData>(
      {
        'result': {
          'status': 'error',
          'message': 'Failed to get table list: $e',
          'error': {
            'code': 'unknown_error',
            'message': 'Failed to get table list: $e',
          },
        },
      },
      dataParser: (data) =>
          throw UnifiedResponseException('Failed to get table list: $e'),
    );
  }

  /// Handles generic exceptions for table details
  TableDetailsResponse _handleGenericTableDetailsException(dynamic e) {
    AppLogger.log('❌ UNIFIED DETAILS General Error: $e');
    return UnifiedResponseParser.parse<TableDetailsData>(
      {
        'result': {
          'status': 'error',
          'message': 'Failed to get table details: $e',
          'error': {
            'code': 'unknown_error',
            'message': 'Failed to get table details: $e',
          },
        },
      },
      dataParser: (data) =>
          throw UnifiedResponseException('Failed to get table details: $e'),
    );
  }
}

import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:dio/dio.dart';
import 'package:flutterboilerplate/networking/dio_client.dart';
import 'package:flutterboilerplate/singletonGods/api_constants.dart' show ApiConfig, errorMessages;

import '../../models/api_response_freezed.dart';
import '../../singletonGods/logger.dart';
import 'models/checkout_models.dart';

class CheckoutRepository {
  CheckoutRepository({Dio? dio}) : _dio = dio ?? DioClient().dio;
  final Dio _dio;

  Future<ApiResponseFreezed<CheckoutResponse>> checkoutCart({
    required String restaurantId,
    required String tableId,
    required String sessionId,
    String? notes, // Optional notes
  }) async {
    const endpoint = ApiConfig.checkoutCartEndpoint;
    
    final requestBodyMap = <String, dynamic>{
      'data': {
        'restaurantId': restaurantId,
        'tableId': tableId,
        'sessionId': sessionId,
        if (notes != null && notes.isNotEmpty) 'notes': notes,
      },
    };

    AppLogger.log('🚀 Checking out cart: URL: $endpoint, Body: $requestBodyMap');

    try {
      final response = await _dio.post(
        endpoint,
        data: requestBodyMap,
      );

      AppLogger.log('✅ Checkout Response Status: ${response.statusCode}');
      
      // Get the response data (Dio automatically decodes JSON)
      final dynamic responseData = response.data;
      
      // Check if response data is a Map
      Map<String, dynamic>? decodedBody;
      if (responseData is Map<String, dynamic>) {
        decodedBody = responseData;
      } else if (responseData is String && responseData.isNotEmpty) {
        try {
          decodedBody = jsonDecode(responseData) as Map<String, dynamic>?;
        } catch (e) {
          AppLogger.log('❌ Failed to decode JSON response string: $e');
          return ApiResponseFreezed.error(
            message: 'Failed to parse server response.',
            errorCode: 'parse_error',
            errorDetails: {'raw_body': responseData},
          );
        }
      }

      // --- Response Handling Logic using ApiResponseFreezed ---

      if (response.statusCode == HttpStatus.ok) { // 200 OK
        if (decodedBody == null) {
          // Should not happen with 200 OK ideally, but handle defensively
          return const ApiResponseFreezed.error(
            message: 'Received success status but empty response body.',
            errorCode: 'empty_response',
          );
        }

        // Check for the specific "result" structure for success
        if (decodedBody.containsKey('result') && decodedBody['result'] is Map<String, dynamic>) {
          try {
            // Parse the content within the "result" key
            final checkoutResponse = CheckoutResponse.fromJson(decodedBody['result'] as Map<String, dynamic>);
            // Use the success state from ApiResponseFreezed
            return ApiResponseFreezed.success(
              data: checkoutResponse,
              message: checkoutResponse.message, // You can use the message from the response data
            );
          } catch (e, s) {
            AppLogger.log('❌ Failed to parse CheckoutResponse from result block: $e\n$s');
            return ApiResponseFreezed.error(
              message: 'Failed to process successful response data.',
              errorCode: 'parse_error',
              errorDetails: {'result_block': decodedBody['result']},
            );
          }
        }
        // Check if the 200 OK response contains an "error" structure
        else if (decodedBody.containsKey('error')) {
          AppLogger.log('⚠️ Checkout API returned application error within 200 OK response.');
          final errorMessage = decodedBody['error']['message'] as String? ?? 'Unknown error occurred';
          final errorCode = decodedBody['error']['code'] as String? ?? 'unknown_error';
          
          return ApiResponseFreezed.error(
            message: errorMessage,
            errorCode: errorCode,
            errorDetails: decodedBody['error'] as Map<String, dynamic>?,
          );
        }
        // Handle other unexpected 200 OK structures
        else {
          AppLogger.log('⚠️ Unexpected 200 OK response structure: $decodedBody');
          return ApiResponseFreezed.error(
            message: 'Received unexpected success response format from server.',
            errorCode: 'unexpected_format',
            errorDetails: decodedBody,
          );
        }
      } else { // Handle non-200 status codes (e.g., 4xx, 5xx)
        AppLogger.log('❌ Checkout failed with HTTP Status: ${response.statusCode}, Body: ${response.data}');

        // Extract error message if possible
        var errorMessage = 'An error occurred during checkout.';
        // Callable 401 bodies nest the code at error.details.data.code, so
        // key off the status code instead.
        var errorCode = response.statusCode == HttpStatus.unauthorized
            ? 'unauthenticated'
            : 'http_error_${response.statusCode}';
        Map<String, dynamic>? errorDetails;

        // Attempt to parse specific error structures if body was decoded
        if (decodedBody != null) {
          if (decodedBody.containsKey('error')) {
            errorMessage = decodedBody['error']['message'] as String? ?? errorMessage;
            errorCode = decodedBody['error']['code'] as String? ?? errorCode;
            errorDetails = decodedBody['error'] as Map<String, dynamic>?;
          } else if (decodedBody.containsKey('status') && decodedBody['status'] == 'error') {
            errorMessage = decodedBody['message'] as String? ?? errorMessage;
            errorCode = decodedBody['code'] as String? ?? errorCode;
            errorDetails = decodedBody;
          } else {
            // No known error structure, use the decoded body as details
            errorDetails = decodedBody;
          }
        } else {
          // No decoded body, maybe include raw response in details
          final rawResponse = response.data is String ? (response.data as String) : 
              (response.data != null ? response.data.toString() : '');
          errorDetails = {'raw_body': rawResponse.length > 200 ? '${rawResponse.substring(0, 200)}...' : rawResponse};
        }

        // Return error response
        return ApiResponseFreezed.error(
          message: errorMessage,
          errorCode: errorCode,
          errorDetails: errorDetails,
        );
      }
    } on DioException catch (e, s) {
      // Handle Dio-specific exceptions using the centralized utility method
      final (errorCode, errorMessage) = DioClient.handleDioException(e, context: 'checkoutCart');
      
      return ApiResponseFreezed.error(
        message: errorMessage,
        errorCode: errorCode,
        errorDetails: {'dioError': e.message?.toString() ?? 'No error message', 'stacktrace': s.toString()},
      );
    } catch (e, s) {
      // Handle all other exceptions
      AppLogger.log('❌ Exception during checkoutCart: $e\n$s');
      
      return ApiResponseFreezed.error(
        message: 'An unexpected error occurred.',
        errorCode: 'unknown_error',
        errorDetails: {'exception': e.toString(), 'stacktrace': s.toString()},
      );
    }
  }
}
import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:dio/dio.dart';
import 'package:flutterboilerplate/networking/dio_client.dart';
import 'package:flutterboilerplate/singletonGods/api_constants.dart'
    show ApiConfig;

import '../../models/api_response_freezed.dart';
import '../../singletonGods/logger.dart';
import 'models/order_models.dart';

class OrderRepository {
  OrderRepository({Dio? dio}) : _dio = dio ?? DioClient().dio;
  final Dio _dio;

  Future<ApiResponseFreezed<OrderResponse>> fetchOrder({
    required String restaurantId,
    required String tableId,
    required String sessionId,
    String? orderId,
  }) async {
    const endpoint = ApiConfig.orderGetCartEndpoint;

    final requestData = <String, dynamic>{
      'restaurantId': restaurantId,
      'tableId': tableId,
      'sessionId': sessionId,
      if (orderId != null) 'orderId': orderId,
    };

    final requestBodyMap = <String, dynamic>{'data': requestData};

    AppLogger.log('🚀 Fetching order: URL: $endpoint, Body: $requestBodyMap');

    try {
      final response = await _dio.post<dynamic>(
        endpoint,
        data: requestBodyMap,
      );

      AppLogger.log('✅ Fetch Order Response Status: ${response.statusCode}');

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

      if (response.statusCode == HttpStatus.ok) {
        // 200 OK
        if (decodedBody == null) {
          // Should not happen with 200 OK ideally, but handle defensively
          return const ApiResponseFreezed.error(
            message: 'Received success status but empty response body.',
            errorCode: 'empty_response',
          );
        }

        // Check for the specific "result" structure for success
        if (decodedBody.containsKey('result') &&
            decodedBody['result'] is Map<String, dynamic>) {
          try {
            // Parse the content within the "result" key
            AppLogger.log(
                '📦 ORDER REPO: Attempting to parse response data structure',);
            final resultMap = decodedBody['result'] as Map<String, dynamic>;
            AppLogger.log(
                '📦 ORDER REPO: Result structure - keys: ${resultMap.keys.toList()}',);

            if (resultMap.containsKey('data')) {
              AppLogger.log(
                  '📦 ORDER REPO: Data structure - keys: ${(resultMap['data'] as Map<String, dynamic>?)?.keys.toList() ?? 'null'}',);
            }

            final orderResponse = OrderResponse.fromJson(resultMap);
            // Use the success state from ApiResponseFreezed
            final successMessage =
                orderResponse.message ?? 'Order fetched successfully';
            return ApiResponseFreezed.success(
              data: orderResponse,
              message: successMessage,
            );
          } catch (e, s) {
            AppLogger.log(
                '❌ Failed to parse OrderResponse from result block: $e',);
            AppLogger.log('❌ Stack trace: $s');
            AppLogger.log('❌ Result data: ${decodedBody['result']}');
            return ApiResponseFreezed.error(
              message: 'Failed to process successful response data.',
              errorCode: 'parse_error',
              errorDetails: {
                'result_block': decodedBody['result'],
                'error': e.toString(),
                'stack': s.toString(),
              },
            );
          }
        }
        // Also handle top-level success structure without wrapping "result"
        else if (decodedBody.containsKey('status') &&
            decodedBody['status'] == 'success') {
          try {
            AppLogger.log('📦 ORDER REPO: Parsing top-level success structure');
            final orderResponse = OrderResponse.fromJson(decodedBody);
            final successMessage =
                orderResponse.message ?? 'Order fetched successfully';
            return ApiResponseFreezed.success(
              data: orderResponse,
              message: successMessage,
            );
          } catch (e, s) {
            AppLogger.log(
                '❌ Failed to parse OrderResponse from top-level success: $e',);
            AppLogger.log('❌ Stack trace: $s');
            return ApiResponseFreezed.error(
              message: 'Failed to process successful response data.',
              errorCode: 'parse_error',
              errorDetails: {
                'body': decodedBody,
                'error': e.toString(),
                'stack': s.toString(),
              },
            );
          }
        }
        // Check if the 200 OK response contains an "error" structure
        else if (decodedBody.containsKey('error')) {
          AppLogger.log(
              '⚠️ Fetch Order API returned application error within 200 OK response.',);
          final errorMessage = decodedBody['error']['message'] as String? ??
              'Unknown error occurred';
          final errorCode =
              decodedBody['error']['code'] as String? ?? 'unknown_error';

          return ApiResponseFreezed.error(
            message: errorMessage,
            errorCode: errorCode,
            errorDetails: decodedBody['error'] as Map<String, dynamic>?,
          );
        }
        // Handle other unexpected 200 OK structures
        else {
          AppLogger.log(
              '⚠️ Unexpected 200 OK response structure: $decodedBody',);
          return ApiResponseFreezed.error(
            message: 'Received unexpected success response format from server.',
            errorCode: 'unexpected_format',
            errorDetails: decodedBody,
          );
        }
      } else {
        // Handle non-200 status codes (e.g., 4xx, 5xx)
        AppLogger.log(
            '❌ Fetch Order failed with HTTP Status: ${response.statusCode}, Body: ${response.data}',);

        // Extract error message if possible
        var errorMessage = 'An error occurred while fetching order.';
        var errorCode = 'http_error_${response.statusCode}';
        Map<String, dynamic>? errorDetails;

        // Attempt to parse specific error structures if body was decoded
        if (decodedBody != null) {
          if (decodedBody.containsKey('error')) {
            errorMessage =
                decodedBody['error']['message'] as String? ?? errorMessage;
            errorCode = decodedBody['error']['code'] as String? ?? errorCode;
            errorDetails = decodedBody['error'] as Map<String, dynamic>?;
          } else if (decodedBody.containsKey('status') &&
              decodedBody['status'] == 'error') {
            errorMessage = decodedBody['message'] as String? ?? errorMessage;
            errorCode = decodedBody['code'] as String? ?? errorCode;
            errorDetails = decodedBody;
          } else {
            // No known error structure, use the decoded body as details
            errorDetails = decodedBody;
          }
        } else {
          // No decoded body, maybe include raw response in details
          final rawResponse = response.data is String
              ? (response.data as String)
              : (response.data != null ? response.data.toString() : '');
          errorDetails = {
            'raw_body': rawResponse.length > 200
                ? '${rawResponse.substring(0, 200)}...'
                : rawResponse,
          };
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
      final (errorCode, errorMessage) =
          DioClient.handleDioException(e, context: 'fetchOrder');

      return ApiResponseFreezed.error(
        message: errorMessage,
        errorCode: errorCode,
        errorDetails: {
          'dioError': e.message?.toString() ?? 'No error message',
          'stacktrace': s.toString(),
        },
      );
    } catch (e, s) {
      // Handle all other exceptions
      AppLogger.log('❌ Exception during fetchOrder: $e\n$s');

      return ApiResponseFreezed.error(
        message: 'An unexpected error occurred.',
        errorCode: 'unknown_error',
        errorDetails: {'exception': e.toString(), 'stacktrace': s.toString()},
      );
    }
  }
}

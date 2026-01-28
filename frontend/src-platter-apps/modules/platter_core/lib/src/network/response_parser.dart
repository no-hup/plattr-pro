import 'package:dio/dio.dart';
import 'api_response.dart';
import '../logging/app_logger.dart';

/// Helper class for parsing API responses
class ResponseParser {
  /// Parses an API response into an ApiResponse object
  /// - [response]: The Dio response object
  /// - [fromJson]: Function to convert JSON to model object
  /// - [dataExtractor]: Optional function to extract data from response envelope
  static ApiResponse<T> parse<T>(
    Response<dynamic> response,
    T Function(dynamic) fromJson, {
    Map<String, dynamic> Function(Map<String, dynamic>)? dataExtractor,
  }) {
    // Extract the result envelope from the response
    final dynamic responseData = response.data;
    Map<String, dynamic> envelope;

    // Handle different response structures
    if (responseData is Map<String, dynamic>) {
      if (responseData.containsKey('result')) {
        // Format: {"result": {"success": true, "message": "...", "data": {...}}}
        envelope = responseData['result'] as Map<String, dynamic>;
      } else {
        // Format: {"success": true, "message": "...", "data": {...}}
        envelope = responseData;
      }
    } else {
      AppLogger.error(
        'ResponseParser: Unexpected response format',
        'Expected Map<String, dynamic>, got ${responseData.runtimeType}',
      );
      return ApiResponse<T>.error(
        'Unexpected response format',
        errorCode: 'parse_error',
      );
    }

    // Check success flag
    bool success = envelope['success'] as bool? ?? false;

    // Support for 'status' field (e.g. 'success', 'error')
    if (envelope.containsKey('status') && envelope['status'] is String) {
      success = (envelope['status'] as String).toLowerCase() == 'success';
    }

    final String? message = envelope['message'] as String?;

    if (!success) {
      return ApiResponse<T>.error(
        message ?? 'Unknown error occurred',
        errorCode: envelope['errorCode'] as String?,
      );
    }

    // Extract and parse data
    try {
      // Allow custom data extraction if provided
      dynamic data;

      if (dataExtractor != null) {
        // If dataExtractor is provided, use it to extract the data
        data = dataExtractor(envelope);
      } else {
        // If no dataExtractor, fallback to the 'data' field in the envelope
        data = envelope['data'];
      }

      // If data is null, return success with null data
      if (data == null) {
        return ApiResponse<T>.success(null as T?);
      }

      return ApiResponse<T>.success(
        fromJson(data),
        message: message,
      );
    } catch (e, stack) {
      AppLogger.error(
        'ResponseParser: Failed to parse response data',
        e,
        stack,
      );
      return ApiResponse<T>.error(
        'Failed to parse response: ${e.toString()}',
        errorCode: 'parsing_error',
      );
    }
  }
}

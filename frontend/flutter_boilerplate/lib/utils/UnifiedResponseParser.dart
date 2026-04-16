import 'package:freezed_annotation/freezed_annotation.dart';

part 'UnifiedResponseParser.freezed.dart';
part 'UnifiedResponseParser.g.dart';

/// Unified API Response Structure
///
/// This represents the standardized response format from the backend:
/// { result: { status, message, data } }
@Freezed(genericArgumentFactories: true)
class ApiResponse<T> with _$ApiResponse<T> {
  const factory ApiResponse({
    required String status,
    required String message,
    T? data,
    ApiError? error,
  }) = _ApiResponse<T>;

  factory ApiResponse.fromJson(
    Map<String, dynamic> json,
    T Function(Object? json) fromJsonT,
  ) =>
      _$ApiResponseFromJson(json, fromJsonT);
}

/// Error details within the unified response
@freezed
class ApiError with _$ApiError {
  const factory ApiError({
    required String code,
    required String message,
    dynamic details,
  }) = _ApiError;

  factory ApiError.fromJson(Map<String, dynamic> json) =>
      _$ApiErrorFromJson(json);
}

/// Unified Response Parser for handling standardized API responses
///
/// This utility parses the new, standardized response format from the backend
/// and provides type-safe access to response data.
class UnifiedResponseParser<T> {
  /// Parses a unified API response from JSON
  ///
  /// [json] - The JSON response from the backend
  /// [dataParser] - Optional function to parse the data field into type T
  ///
  /// Returns an ApiResponse<T> with parsed data
  static ApiResponse<T> parse<T>(
    Map<String, dynamic> json, {
    T Function(Map<String, dynamic>)? dataParser,
  }) {
    try {
      // Firebase Cloud Functions automatically wrap responses in a 'result' object
      // Handle both single and double-nested result structures
      var responseData = json;

      // Check for double-nested result structure (result.result)
      if (json.containsKey('result') &&
          json['result'] is Map<String, dynamic> &&
          (json['result'] as Map<String, dynamic>).containsKey('result') &&
          (json['result'] as Map<String, dynamic>)['result']
              is Map<String, dynamic>) {
        responseData = (json['result'] as Map<String, dynamic>)['result']
            as Map<String, dynamic>;
      }
      // Check for single-nested result structure (result)
      else if (json.containsKey('result') &&
          json['result'] is Map<String, dynamic>) {
        responseData = json['result'] as Map<String, dynamic>;
      }

      final status = responseData['status'] as String?;
      final message = responseData['message'] as String?;
      final data = responseData['data'];
      final error = responseData['error'] as Map<String, dynamic>?;

      if (status == null || message == null) {
        throw const UnifiedResponseException(
          'Invalid response format: missing status or message',
        );
      }

      // Parse the data field if a parser is provided
      T? parsedData;
      if (data != null && dataParser != null) {
        if (data is Map<String, dynamic>) {
          parsedData = dataParser(data);
        } else {
          // If data is not a Map, return it as-is (for primitive types)
          parsedData = data as T?;
        }
      } else if (data != null) {
        // If no parser provided, return data as-is
        parsedData = data as T?;
      }

      // Parse error details if present
      ApiError? parsedError;
      if (error != null) {
        parsedError = ApiError.fromJson(error);
      }

      return ApiResponse<T>(
        status: status,
        message: message,
        data: parsedData,
        error: parsedError,
      );
    } catch (e) {
      throw UnifiedResponseException('Failed to parse unified response: $e');
    }
  }

  /// Parses a unified API response with automatic data parsing
  ///
  /// This is a convenience method that automatically handles the data parsing
  /// based on the provided type T.
  static ApiResponse<T> parseWithAutoData<T>(
    Map<String, dynamic> json,
    T Function(Map<String, dynamic>) dataParser,
  ) {
    return parse<T>(json, dataParser: dataParser);
  }

  /// Checks if the response indicates success
  static bool isSuccess<T>(ApiResponse<T> response) {
    return response.status == 'success';
  }

  /// Checks if the response indicates an error
  static bool isError<T>(ApiResponse<T> response) {
    return response.status == 'error';
  }

  /// Gets the error message from a response
  static String? getErrorMessage<T>(ApiResponse<T> response) {
    if (response.error != null) {
      return response.error!.message;
    }
    return response.message;
  }

  /// Gets the error code from a response
  static String? getErrorCode<T>(ApiResponse<T> response) {
    return response.error?.code;
  }

  /// Gets the response data, throwing an exception if not available
  static T getData<T>(ApiResponse<T> response) {
    if (response.data == null) {
      throw const UnifiedResponseException('No data available in response');
    }
    return response.data!;
  }

  /// Gets the response data, returning null if not available
  static T? getDataOrNull<T>(ApiResponse<T> response) {
    return response.data;
  }
}

/// Exception thrown when parsing unified responses fails
class UnifiedResponseException implements Exception {
  const UnifiedResponseException(this.message);
  final String message;

  @override
  String toString() => 'UnifiedResponseException: $message';
}

/// Extension methods for easier response handling
extension ApiResponseExtensions<T> on ApiResponse<T> {
  /// Returns true if the response is successful
  bool get isSuccess => status == 'success';

  /// Returns true if the response is an error
  bool get isError => status == 'error';

  /// Returns the error message if present
  String? get errorMessage => error?.message ?? message;

  /// Returns the error code if present
  String? get errorCode => error?.code;

  /// Returns the data, throwing an exception if not available
  T get dataOrThrow {
    if (data == null) {
      throw const UnifiedResponseException('No data available in response');
    }
    return data!;
  }

  /// Returns the data or null if not available
  T? get dataOrNull => data;
}

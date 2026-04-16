import 'package:freezed_annotation/freezed_annotation.dart';

// These part directives will be used by the freezed and json_serializable code generators
// After creating this file, run: dart run build_runner build --delete-conflicting-outputs
// NOTE: Linter errors are expected until you run the build_runner command
part 'api_response_freezed.freezed.dart';

@freezed
class ApiResponseFreezed<T> with _$ApiResponseFreezed<T> {
  // Private constructors that will be implemented by Freezed
  const ApiResponseFreezed._();
  
  // Success constructor
  const factory ApiResponseFreezed.success({
    required T data,
    @Default('Success') String message,
  }) = _ApiSuccess<T>;
  
  // Error constructor
  const factory ApiResponseFreezed.error({
    required String message,
    String? errorCode,
    Map<String, dynamic>? errorDetails,
  }) = _ApiError<T>;

  // This will be implemented by the generated code
  static ApiResponseFreezed<T> fromJson<T>(
    Map<String, dynamic> json,
    T Function(Object?) fromJsonT,
  ) {
    // This is a placeholder - the real implementation will be generated
    throw UnimplementedError('Run build_runner to generate the fromJson method');
  }
}

@freezed
class ErrorDetailsFreezed with _$ErrorDetailsFreezed {
  
  const factory ErrorDetailsFreezed({
    required String message,
    required String code,
    Map<String, dynamic>? details,
  }) = _ErrorDetailsFreezed;
  const ErrorDetailsFreezed._();

  // Manual fromJson function since we're handling special cases
  static ErrorDetailsFreezed fromJson(Map<String, dynamic> json) {
    return ErrorDetailsFreezed(
      message: (json['message'] ?? '').toString(),
      code: (json['status'] ?? '').toString(),
      details: json['details'] as Map<String, dynamic>?,
    );
  }
}

/// Utility class to help parse API responses from various formats
class ApiResponseParser {
  /// Parse a raw API response into a typed ApiResponseFreezed
  static ApiResponseFreezed<T> parse<T>(
    Map<String, dynamic> response,
    T Function(Map<String, dynamic>) fromJson,
  ) {
    // Check if response is an error from Firebase Callable Function
    if (response.containsKey('error')) {
      return _parseFirebaseError(response);
    }
    
    // Check standardized response format from backend
    if (response.containsKey('status')) {
      final status = response['status'];
      if (status == 'error') {
        return _parseStandardError(response);
      }
    }
    
    // Process success response
    try {
      final data = fromJson(response);
      return ApiResponseFreezed.success(data: data);
    } catch (e) {
      return ApiResponseFreezed.error(
        message: 'Failed to parse response data: $e',
        errorCode: 'parse_error',
      );
    }
  }
  
  /// Parse Firebase error format
  static ApiResponseFreezed<T> _parseFirebaseError<T>(Map<String, dynamic> response) {
    final error = response['error'] as Map<String, dynamic>;
    final message = error['message'] as String? ?? 'Unknown error';
    
    String? errorCode;
    Map<String, dynamic>? errorDetails;
    
    // Extract standardized error details if available
    if (error.containsKey('details') && error['details'] is Map) {
      final details = error['details'] as Map<String, dynamic>;
      if (details.containsKey('data') && details['data'] is Map) {
        final data = details['data'] as Map<String, dynamic>;
        errorCode = data['code'] as String?;
        errorDetails = data;
      }
    }
    
    return ApiResponseFreezed.error(
      message: message,
      errorCode: errorCode,
      errorDetails: errorDetails,
    );
  }
  
  /// Parse standardized error format from our backend
  static ApiResponseFreezed<T> _parseStandardError<T>(Map<String, dynamic> response) {
    final message = response['message'] as String? ?? 'Unknown error';
    
    String? errorCode;
    Map<String, dynamic>? errorDetails;
    
    if (response.containsKey('data') && response['data'] is Map) {
      final data = response['data'] as Map<String, dynamic>;
      errorCode = data['code'] as String?;
      errorDetails = data;
    }
    
    return ApiResponseFreezed.error(
      message: message,
      errorCode: errorCode,
      errorDetails: errorDetails,
    );
  }
  
  /// Extract error message from response
  static String extractErrorMessage(dynamic response) {
    if (response == null) return 'No response received from server.';
    
    if (response is Map<String, dynamic>) {
      // Firebase callable functions
      if (response.containsKey('error')) {
        final errorData = response['error'];
        if (errorData is Map<String, dynamic> && errorData.containsKey('message')) {
          return errorData['message'].toString();
        }
        return errorData.toString();
      }
      
      // Standard message keys
      if (response.containsKey('message')) return response['message'].toString();
      if (response.containsKey('detail')) return response['detail'].toString();
    }
    
    return 'An unknown server error occurred.';
  }
  
  /// Convert user-friendly error messages based on error codes
  static String getUserFriendlyMessage(String? errorCode, String defaultMessage) {
    if (errorCode == null) return defaultMessage;
    
    switch (errorCode) {
      case 'not-found': return 'Resource not found. Please check your input.';
      case 'invalid-argument': return 'Invalid input. Please check your information.';
      case 'permission-denied': return "You don't have permission to perform this action.";
      case 'timeout_error': return 'Connection timeout. Please check your network.';
      case 'connection_error': return 'Connection error. Please check your internet connection.';
      case 'parse_error': return 'There was an error processing the response.';
      default: return defaultMessage;
    }
  }
} 

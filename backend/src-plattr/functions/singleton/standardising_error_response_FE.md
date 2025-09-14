# Standardizing Error Responses in Flutter Frontend

## Overview

This document outlines the standardization of error response handling in the Flutter frontend to complement the backend standardization implemented with the `ErrorHandler` singleton. The goal is to create a consistent, type-safe approach to handling API responses and errors across the entire application.

## Current State

Currently, the Flutter application uses an `ApiResponse<T>` generic class to wrap API responses:

```dart
class ApiResponse<T> {
  ApiResponse({
    required this.success,
    required this.message,
    this.data,
    this.errorCode,
    this.errorDetails,
  });

  factory ApiResponse.error(String message, {String? errorCode, Map<String, dynamic>? errorDetails}) => ApiResponse(
    success: false,
    message: message,
    errorCode: errorCode,
    errorDetails: errorDetails,
  );

  factory ApiResponse.success(T data) => ApiResponse(
    success: true,
    message: 'Success',
    data: data,
  );

  final bool success;
  final String message;
  final T? data;
  final String? errorCode;
  final Map<String, dynamic>? errorDetails;
}
```

However, there are several challenges:

1. Response parsing is handled differently in different repositories
2. Error codes and messages aren't consistently mapped to the backend's standardized format
3. The mapping from Firebase HttpsError to the frontend's ApiResponse isn't standardized

## Requirements

1. All API responses should be consistently wrapped in `ApiResponse<T>`
2. Error handling should align with the backend's standardized error format
3. Error codes should be mapped consistently across all repositories
4. Provide a centralized mechanism for parsing backend responses

## Solution

### 1. Standardized ApiResponse Pattern

Using the `ApiResponse<T>` wrapper is a good practice as it provides:

- Type-safety with generics
- Consistent error handling across API calls
- Clear separation between success and error states
- A standardized way to access data or error information

### 2. Response Parser Utility

Create a centralized `ApiResponseParser` utility to standardize the parsing logic:

```dart
class ApiResponseParser {
  /// Parse a raw API response into a typed ApiResponse
  static ApiResponse<T> parse<T>(
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
      return ApiResponse.success(data);
    } catch (e) {
      return ApiResponse.error(
        'Failed to parse response data: $e',
        errorCode: 'parse_error',
      );
    }
  }
  
  /// Parse Firebase error format
  static ApiResponse<T> _parseFirebaseError<T>(Map<String, dynamic> response) {
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
    
    return ApiResponse.error(
      message,
      errorCode: errorCode,
      errorDetails: errorDetails,
    );
  }
  
  /// Parse standardized error format from our backend
  static ApiResponse<T> _parseStandardError<T>(Map<String, dynamic> response) {
    final message = response['message'] as String? ?? 'Unknown error';
    
    String? errorCode;
    Map<String, dynamic>? errorDetails;
    
    if (response.containsKey('data') && response['data'] is Map) {
      final data = response['data'] as Map<String, dynamic>;
      errorCode = data['code'] as String?;
      errorDetails = data;
    }
    
    return ApiResponse.error(
      message,
      errorCode: errorCode,
      errorDetails: errorDetails,
    );
  }
}
```

### 3. Dio Interceptor for Standardized Error Handling

Create a Dio interceptor to automatically convert backend errors to standardized format:

```dart
class ApiErrorInterceptor extends Interceptor {
  @override
  void onError(DioException err, ErrorInterceptorHandler handler) {
    // Process Firebase callable function errors
    if (err.response?.data is Map<String, dynamic>) {
      final data = err.response!.data as Map<String, dynamic>;
      
      // Check for Firebase callable function error format
      if (data.containsKey('error')) {
        // Create standardized error
        final ApiResponse errorResponse = ApiResponseParser._parseFirebaseError(data);
        
        // Attach standardized response to error
        err = err.copyWith(
          response: err.response?.copyWith(
            data: {
              'status': 'error',
              'message': errorResponse.message,
              'data': {
                'code': errorResponse.errorCode,
                ...?errorResponse.errorDetails,
              }
            }
          )
        );
      }
    }
    
    handler.next(err);
  }
}
```

### 4. Repository Base Class

Create a base repository class with common error handling:

```dart
abstract class BaseRepository {
  final Dio _dio;
  
  BaseRepository(this._dio);
  
  /// Helper method to handle API calls with standardized error handling
  Future<ApiResponse<T>> safeApiCall<T>({
    required Future<Response> Function() apiCall,
    required T Function(Map<String, dynamic>) fromJson,
  }) async {
    try {
      final response = await apiCall();
      
      if (response.data == null || response.data is! Map<String, dynamic>) {
        return ApiResponse.error(
          'Invalid response format',
          errorCode: 'invalid_format',
        );
      }
      
      return ApiResponseParser.parse<T>(response.data, fromJson);
    } on DioException catch (e) {
      return _handleDioException(e);
    } catch (e, stackTrace) {
      AppLogger.log('API Error: $e\n$stackTrace');
      return ApiResponse.error(
        'An unexpected error occurred: $e',
        errorCode: 'unknown_error',
      );
    }
  }
  
  /// Handle Dio-specific exceptions
  ApiResponse<T> _handleDioException<T>(DioException e) {
    AppLogger.log('DioException: ${e.type}, Message: ${e.message}');
    
    // First check if the response contains standardized error format
    if (e.response?.data is Map<String, dynamic>) {
      final data = e.response!.data as Map<String, dynamic>;
      if (data.containsKey('status') && data['status'] == 'error') {
        return ApiResponseParser._parseStandardError(data);
      }
    }
    
    // Otherwise use standard DioException handling
    switch (e.type) {
      case DioExceptionType.connectionTimeout:
      case DioExceptionType.sendTimeout:
      case DioExceptionType.receiveTimeout:
        return ApiResponse.error(
          'Connection timeout. Please check your network.',
          errorCode: 'timeout_error',
        );
      case DioExceptionType.badResponse:
        final String message = _extractErrorMessage(e.response);
        final statusCode = e.response?.statusCode ?? 0;
        return ApiResponse.error(
          message,
          errorCode: 'http_error_${statusCode}',
        );
      case DioExceptionType.connectionError:
        return ApiResponse.error(
          'Connection error. Please check your internet connection.',
          errorCode: 'connection_error',
        );
      default:
        return ApiResponse.error(
          e.message ?? 'An unexpected network error occurred.',
          errorCode: 'network_error',
        );
    }
  }
  
  /// Extract error message from response
  String _extractErrorMessage(Response? response) {
    if (response == null) return 'No response received from server.';
    
    if (response.data is Map<String, dynamic>) {
      final data = response.data as Map<String, dynamic>;
      
      // Firebase callable functions
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
    
    return response.statusMessage ?? 'An unknown server error occurred.';
  }
}
```

### 5. Implementation Example

Here's how a repository would look using the standardized approach:

```dart
class OtpRepository extends BaseRepository {
  OtpRepository._internal() : super(DioClient().dio);
  static final OtpRepository _instance = OtpRepository._internal();
  factory OtpRepository() => _instance;
  
  /// Validates the provided OTP with the backend
  Future<ApiResponse<OtpValidationResponse>> validateOtp(
      OtpValidationRequest request) async {
    AppLogger.log('OTP Repo: Starting validateOtp for table ${request.tableId}');
    
    final payload = {'data': request.toJson()};
    
    return safeApiCall<OtpValidationResponse>(
      apiCall: () => _dio.post(
        ApiConfig.validateOtpEndpoint,
        data: payload,
      ),
      fromJson: (json) => OtpValidationResponse.fromJson(json),
    );
  }
}
```

## Best Practices for Frontend Error Handling

1. **Use ApiResponse consistently**: Wrap all API call results in `ApiResponse<T>` for consistency.

2. **Handle errors at three levels**:
   - Network/Dio level for connection issues
   - Backend standardized errors
   - Parsing errors for invalid data

3. **Display user-friendly messages**: Map error codes to user-friendly messages at the UI level:

```dart
String getUserFriendlyMessage(String? errorCode, String defaultMessage) {
  switch (errorCode) {
    case 'not-found': return 'Resource not found. Please check your input.';
    case 'invalid-argument': return 'Invalid input. Please check your information.';
    case 'permission-denied': return 'You don\'t have permission to perform this action.';
    // Add more mappings as needed
    default: return defaultMessage;
  }
}
```

4. **Centralize error code mapping**: Create a shared class for error code constants to avoid typos and inconsistencies.

## Implementation Approach

1. Add the `ApiResponseParser` utility
2. Create the `ApiErrorInterceptor` for Dio
3. Implement `BaseRepository` abstract class
4. Update existing repositories to extend `BaseRepository`
5. Update UI components to use standardized error display
6. Create a central error code mapping utility

## Using with Freezed

Since the app uses Freezed for other response models, it's recommended to create a Freezed version of the ApiResponse class:

```dart
@freezed
class ApiResponse<T> with _$ApiResponse<T> {
  const factory ApiResponse.success({
    required T data,
    @Default('Success') String message,
  }) = ApiSuccess<T>;
  
  const factory ApiResponse.error({
    required String message,
    String? errorCode,
    Map<String, dynamic>? errorDetails,
  }) = ApiError<T>;
}
```

This provides pattern matching capabilities:

```dart
final result = await repository.validateOtp(request);
return result.when(
  success: (data) => SuccessWidget(data: data),
  error: (message, code, details) => ErrorWidget(
    message: message,
    errorCode: code,
  ),
);
```

## Conclusion

Using `ApiResponse<T>` consistently across your application provides several benefits:

1. Type-safety through generics
2. Consistent error handling and response structure
3. Clean separation between success and error states
4. Integration with backend standardized error formats
5. Better testability with predictable response patterns

Standardizing error handling between frontend and backend ensures a consistent user experience when errors occur, making debugging easier and providing users with more helpful feedback.

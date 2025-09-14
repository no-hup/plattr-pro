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

class ErrorDetails {
  final String message;
  final String code;
  final Map<String, dynamic>? details;

  ErrorDetails({
    required this.message,
    required this.code,
    this.details,
  });

  factory ErrorDetails.fromJson(Map<String, dynamic> json) => ErrorDetails(
    message: (json['message'] ?? '').toString(),
    code: (json['status'] ?? '').toString(),
    details: json['details'] as Map<String, dynamic>?,
  );
}
/// Represents a standardized API error.
class ApiError {
  final String code;
  final String message;
  final int? httpCode;
  final dynamic details;

  const ApiError({
    required this.code,
    required this.message,
    this.httpCode,
    this.details,
  });

  factory ApiError.fromJson(Map<String, dynamic> json) {
    return ApiError(
      code: json['code'] as String? ?? 'unknown_error',
      message: json['message'] as String? ?? 'An unknown error occurred',
      httpCode: json['httpCode'] as int?,
      details: json['details'],
    );
  }

  Map<String, dynamic> toJson() => {
        'code': code,
        'message': message,
        if (httpCode != null) 'httpCode': httpCode,
        if (details != null) 'details': details,
      };

  @override
  String toString() => 'ApiError(code: $code, message: $message)';
}

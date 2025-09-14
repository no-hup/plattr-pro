/// A generic API response wrapper for all network requests.
class ApiResponse<T> {
  final T? data;
  final String? message;
  final String? errorCode;
  final bool success;

  ApiResponse.success(this.data, {this.message})
      : success = true,
        errorCode = null;

  ApiResponse.error(this.message, {this.errorCode})
      : success = false,
        data = null;

  @override
  String toString() =>
      'ApiResponse(success: $success, message: $message, errorCode: $errorCode, data: $data)';
}

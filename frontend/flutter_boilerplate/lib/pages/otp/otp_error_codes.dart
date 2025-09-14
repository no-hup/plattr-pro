/// Standardized error codes specific to the OTP validation flow.
class OtpErrorCodes {
  // --- Client Errors (4xx) ---
  static const String badRequest = 'OTP_BAD_REQUEST'; // Generic 400
  static const String phoneNumberRequired = 'OTP_PHONE_REQUIRED'; // Specific 400 case
  static const String nameRequired = 'OTP_NAME_REQUIRED'; // Specific 400 case
  static const String unauthorized = 'OTP_UNAUTHORIZED'; // 401 - Invalid OTP
  static const String preconditionFailed = 'OTP_PRECONDITION_FAILED'; // 412 - No active session

  // --- Network/Timeout Errors ---
  static const String timeoutError = 'OTP_TIMEOUT_ERROR';
  static const String connectionError = 'OTP_CONNECTION_ERROR';
  static const String networkError = 'OTP_NETWORK_ERROR'; // Other Dio errors

  // --- Server Errors (5xx) ---
  static const String serverError = 'OTP_SERVER_ERROR'; // Generic 5xx

  // --- Parsing/Unknown Errors ---
  static const String parseError = 'OTP_PARSE_ERROR';
  static const String invalidFormat = 'OTP_INVALID_RESPONSE_FORMAT';
  static const String unknownError = 'OTP_UNKNOWN_ERROR';

  /// Maps HTTP status codes to specific OTP error codes.
  static String fromHttpStatus(int statusCode, dynamic responseData) {
     // Check response data for specific backend error messages if needed
     // Example: Check if responseData contains a specific error key from backend's errorHandler
     // final String backendErrorCode = responseData?['errorCode'] ?? '';
     // if (backendErrorCode == 'PHONE_REQUIRED') return phoneNumberRequired;

     switch (statusCode) {
        case 400:
           // Could inspect responseData here to return more specific 400 errors
           return badRequest;
        case 401: return unauthorized;
        case 412: return preconditionFailed;
        // Add other specific mappings as needed
        default:
           if (statusCode >= 500) return serverError;
           return 'OTP_HTTP_ERROR_$statusCode'; // Generic HTTP error
     }
  }
} 
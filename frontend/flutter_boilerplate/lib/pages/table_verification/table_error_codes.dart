/// Defines standardized error codes for table verification operations
class TableErrorCodes {
  // HTTP status code related errors
  static const String badRequest = 'TABLE_BAD_REQUEST';
  static const String unauthorized = 'TABLE_UNAUTHORIZED';
  static const String tableDisabled = 'TABLE_DISABLED';
  static const String locationMismatch = 'TABLE_LOCATION_MISMATCH';
  static const String serverError = 'TABLE_SERVER_ERROR';
  
  // Network related errors
  static const String timeoutError = 'TABLE_TIMEOUT_ERROR';
  static const String connectionError = 'TABLE_CONNECTION_ERROR';
  static const String networkError = 'TABLE_NETWORK_ERROR';
  
  // Data parsing errors
  static const String invalidFormat = 'TABLE_INVALID_FORMAT';
  static const String parseError = 'TABLE_PARSE_ERROR';
  
  // General errors
  static const String unknownError = 'TABLE_UNKNOWN_ERROR';
  
  // Helper method to get error code from HTTP status
  static String fromHttpStatus(int statusCode) {
    switch (statusCode) {
      case 400:
        return badRequest;
      case 401:
        return unauthorized;
      case 403:
        return tableDisabled;
      case 412:
        return locationMismatch;
      default:
        return '${serverError}_$statusCode';
    }
  }
} 
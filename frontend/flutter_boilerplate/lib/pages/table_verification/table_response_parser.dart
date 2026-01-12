import 'package:flutterboilerplate/singletonGods/logger.dart';
import 'models/models.dart';

/// Parses API responses for table validation
class TableResponseParser {
  /// Parse JSON response into a TableValidationResponse object
  static TableValidationResponse parseFromJson(Map<String, dynamic> json) {
    AppLogger.log('🔍 Parsing JSON: $json');
    
    // Extract the result field if it exists (handle nested structure)
    final resultData = json.containsKey('result') 
        ? json['result'] as Map<String, dynamic>
        : json;
    
    // Check if this is an error response with details (new format)
    if (resultData.containsKey('error') && resultData['error'] is Map<String, dynamic>) {
      final errorData = resultData['error'] as Map<String, dynamic>;
      final details = errorData['details'] as Map<String, dynamic>?;
      
      // Extract basic error info
      final status = errorData['status']?.toString() ?? 'error';
      final message = errorData['message']?.toString() ?? 'Authentication required';
      
      // For 401 responses, details will contain the table data
      if (details != null && details['httpCode'] == 401) {
        final data = {
          'authMessage': message,
          'isUsernameMandatory': details['isUsernameMandatory'] ?? true,
          'isPhoneNumberMandatory': details['isPhoneNumberMandatory'] ?? true,
          'tableStatus': details['tableStatus'],
          'otpRequired': true,
        };
        
        AppLogger.log('✅ Parsed auth required response with details: $data');
        
        return TableValidationResponse(
          status: status,
          message: message,
          requiresOtp: true,
          data: data,
        );
      }
      
      // For other error responses
      return TableValidationResponse(
        status: status,
        message: message,
        data: details,
      );
    }
    
    // Handle success response format
    try {
      final status = resultData['status']?.toString() ?? '';
      final message = resultData['message']?.toString() ?? '';
      final data = resultData['data'] as Map<String, dynamic>?;
      
      AppLogger.log('✅ Parsed success response: status=$status, message=$message');
      
      return TableValidationResponse(
        status: status,
        message: message,
        data: data,
      );
    } catch (e) {
      AppLogger.log('❌ JSON Parse Error: $e');
      throw TableValidationException(message: 'Invalid response format: $e');
    }
  }
}

/// Exception for validation parsing errors
class TableValidationException implements Exception {
  
  TableValidationException({
    required this.message,
    this.code,
    this.stackTrace,
  });
  final String message;
  final String? code;
  final StackTrace? stackTrace;
  
  @override
  String toString() => 'TableValidationException(message: $message, code: $code, stackTrace: $stackTrace)';
} 

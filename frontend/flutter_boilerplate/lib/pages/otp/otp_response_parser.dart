import 'package:flutterboilerplate/models/api_response.dart';
import 'package:flutterboilerplate/singletonGods/logger.dart';

import 'models/otp_models.dart';
import 'otp_error_codes.dart';

/// Parses the JSON response from the OTP validation API endpoint.
class OtpResponseParser {

  /// Parses the success response (typically HTTP 200).
  /// Handles both standard success and the 'ask_primary_customer' case.
  static ApiResponse<OtpValidationResponse> parseSuccessResponse(
      Map<String, dynamic> jsonResponse) {
    try {
      AppLogger.log('OTP Parser: Parsing success response: $jsonResponse');

      // Extract the result field if it exists
      final Map<String, dynamic> resultData = jsonResponse.containsKey('result') 
          ? jsonResponse['result'] as Map<String, dynamic>
          : jsonResponse;
      
      final status = resultData['status'] as String?;

      if (status == 'success') {
        final responseData = OtpValidationResponse.fromJson(resultData['data'] as Map<String, dynamic>);
        return ApiResponse.success(responseData);
      } else if (status == 'ask_primary_customer') {
         // This is a specific non-error case, but not standard 'success'
         // We return it as an error with a specific code/message.
         final askResponse = OtpAskPrimaryCustomerResponse.fromJson(resultData);
         AppLogger.log('OTP Parser: Received "ask_primary_customer" status.');
         return ApiResponse.error(
            askResponse.message,
            // Using a specific error code might be better if the UI needs to react differently
            errorCode: OtpErrorCodes.unauthorized, // Or a custom code like 'OTP_ASK_PRIMARY'
         );
      } else {
         // Unexpected status in a 200 response
         AppLogger.log('OTP Parser: Unexpected status in success response: $status');
         return ApiResponse.error(
            'Received unexpected status: $status',
            errorCode: OtpErrorCodes.invalidFormat,
         );
      }
    } catch (e, stackTrace) {
      AppLogger.log('OTP Parser: Error parsing success JSON: $e\n$stackTrace');
      return ApiResponse.error(
        'Failed to parse successful OTP response: $e',
        errorCode: OtpErrorCodes.parseError,
      );
    }
  }

  // You could add specific parsers for error responses if needed,
  // but often error messages are extracted directly in the repository.
} 
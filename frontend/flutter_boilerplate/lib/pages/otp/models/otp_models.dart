import 'package:freezed_annotation/freezed_annotation.dart';

part 'otp_models.freezed.dart';
part 'otp_models.g.dart';

/// Request data for the validateOTP API call.
@freezed
class OtpValidationRequest with _$OtpValidationRequest {
  const factory OtpValidationRequest({
    required String restaurantId,
    required String tableId,
    required String otp,
    String? phoneNumber, // Optional based on backend logic
    String? name,        // Optional based on backend logic
  }) = _OtpValidationRequest;

  // Note: We don't need fromJson for the Request model usually.
  // The toJson will be generated automatically and used by Dio.
  factory OtpValidationRequest.fromJson(Map<String, dynamic> json) =>
      _$OtpValidationRequestFromJson(json);
}

/// Response data from a successful validateOTP API call.
@freezed
class OtpValidationResponse with _$OtpValidationResponse { // Private constructor for potential custom methods

  const factory OtpValidationResponse({
    required String status, required String sessionId, // Should be 'success' on successful validation
    String? customToken,
    @Default(false) bool isPrimaryCustomer,
    // Add other fields if the backend returns more on success
  }) = _OtpValidationResponse;
  const OtpValidationResponse._();

  factory OtpValidationResponse.fromJson(Map<String, dynamic> json) =>
      _$OtpValidationResponseFromJson(json);
}

/// Specific response when OTP is wrong for an active table
@freezed
class OtpAskPrimaryCustomerResponse with _$OtpAskPrimaryCustomerResponse {
    const factory OtpAskPrimaryCustomerResponse({
       required String status, // Should be 'ask_primary_customer'
       required String message,
    }) = _OtpAskPrimaryCustomerResponse;

    factory OtpAskPrimaryCustomerResponse.fromJson(Map<String, dynamic> json) =>
        _$OtpAskPrimaryCustomerResponseFromJson(json);
} 

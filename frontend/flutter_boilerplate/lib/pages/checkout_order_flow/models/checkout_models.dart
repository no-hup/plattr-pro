import 'package:freezed_annotation/freezed_annotation.dart';
import '../../../singletonGods/logger.dart';
import '../../table_verification/models/table_api_error_details.dart'; // Import existing error details


part 'checkout_models.freezed.dart';
part 'checkout_models.g.dart';

// --- JSON Converters ---

// DateTimeConverter with improved error handling
class DateTimeConverter implements JsonConverter<DateTime, String> {
  const DateTimeConverter();

  @override
  DateTime fromJson(String json) {
    try {
      // Handle potential empty strings or invalid formats gracefully
      if (json.isEmpty) return DateTime(1970); // Default fallback
      return DateTime.parse(json);
    } catch (e) {
      AppLogger.log('❌ DateTimeConverter: Error parsing date "$json": $e');
      return DateTime(1970); // Default fallback
    }
  }

  @override
  String toJson(DateTime object) => object.toIso8601String();
}

// --- Helper Functions for Explicit toJson ---
// Needed because build_runner sometimes fails with complex nested types
Map<String, dynamic> _checkoutDataToJson(CheckoutData data) => data.toJson();
Map<String, dynamic>? _tableApiErrorDetailsToJson(TableApiErrorDetails? details) => 
    details?.toJson();

// --- Top-Level API Response Parser ---
// Helper class to parse API responses and handle result/error paths
class CheckoutApiParser {
  // Parse a raw API response and determine if it's a success or error
  static dynamic parseResponse(Map<String, dynamic> json) {
    if (json.containsKey('result') && json['result'] is Map<String, dynamic>) {
      try {
        return CheckoutResponse.fromJson(json['result'] as Map<String, dynamic>);
      } catch (e, s) {
        AppLogger.log('❌ CheckoutApiParser: Error parsing success response: $e\n$s');
        // Return null for error handling by caller
        return null;
      }
    } else if (json.containsKey('error') && json['error'] is Map<String, dynamic>) {
      try {
        return CheckoutError.fromJson(json['error'] as Map<String, dynamic>);
      } catch (e, s) {
        AppLogger.log('❌ CheckoutApiParser: Error parsing error response: $e\n$s');
        // Return a generic error
        return CheckoutError(
          code: 'parse_error',
          message: 'Failed to parse error checkout response: $e',
        );
      }
    } else {
      AppLogger.log('❌ CheckoutApiParser: Unknown response structure: $json');
      // Neither 'result' nor 'error' key found
      return CheckoutError(
        code: 'unknown_response',
        message: 'Received unknown response structure from checkout API.',
      );
    }
  }
  
  // Helper method to check if a response was successful
  static bool isSuccess(dynamic response) => response is CheckoutResponse;
  
  // Helper method to check if a response was an error
  static bool isError(dynamic response) => response is CheckoutError;
}

// --- Success Response Models ---

@freezed
class CheckoutResponse with _$CheckoutResponse {
  // This model handles the CONTENT of the 'result' object
  @JsonSerializable(explicitToJson: true, anyMap: true)
  const factory CheckoutResponse({
    required String message,
    required String status,
    required CheckoutData data,
  }) = _CheckoutResponse;

  // Standard Freezed pattern for fromJson
  factory CheckoutResponse.fromJson(Map<String, dynamic> json) => _$CheckoutResponseFromJson(json);
}

// Error state factory extension for easy creation of error instances
extension CheckoutResponseErrorState on CheckoutResponse {
  static CheckoutResponse createErrorState() => CheckoutResponse(
    message: 'Error parsing checkout data',
    status: 'parse_error',
    data: CheckoutData.errorState(),
  );
}

@freezed
class CheckoutData with _$CheckoutData {
  @JsonSerializable(explicitToJson: true, anyMap: true)
  const factory CheckoutData({
    required String orderId,
    required String orderNumber,
    required String orderStatus,
    @DateTimeConverter() required DateTime timestamp,
  }) = _CheckoutData;

  // Standard Freezed pattern for fromJson
  factory CheckoutData.fromJson(Map<String, dynamic> json) => _$CheckoutDataFromJson(json);
  
  // Factory constructor for easy error state creation
  factory CheckoutData.errorState() => CheckoutData(
        orderId: '',
        orderNumber: '',
        orderStatus: 'error',
        timestamp: DateTime(1970),
      );
}

// --- Error Response Models ---

@freezed
class CheckoutError with _$CheckoutError {
  // This model handles the CONTENT of the 'error' object
  @JsonSerializable(explicitToJson: true, anyMap: true)
  const factory CheckoutError({
    required String code,
    required String message,
    // Reusing TableApiErrorDetails instead of creating our own CheckoutErrorDetails
    TableApiErrorDetails? details,
  }) = _CheckoutError;

  // Standard Freezed pattern for fromJson
  factory CheckoutError.fromJson(Map<String, dynamic> json) => _$CheckoutErrorFromJson(json);
}

// Error state factory extension for easy creation of error instances
extension CheckoutErrorErrorState on CheckoutError {
  static CheckoutError createErrorState(String errorMessage) => CheckoutError(
    code: 'parse_error',
    message: errorMessage,
  );
}

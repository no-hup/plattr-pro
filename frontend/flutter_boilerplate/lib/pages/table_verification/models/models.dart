import 'package:flutterboilerplate/singletonGods/logger.dart';
import 'package:freezed_annotation/freezed_annotation.dart';

part 'models.freezed.dart';
part 'models.g.dart';

/// Represents a user's geographical location
///
/// Used for location-based verification of table access
@freezed
class UserLocation with _$UserLocation {
  /// Creates a user location with latitude and longitude
  const factory UserLocation({
    /// Latitude coordinate
    required double latitude,

    /// Longitude coordinate
    required double longitude,
  }) = _UserLocation;

  /// Creates a UserLocation from a JSON map
  factory UserLocation.fromJson(Map<String, dynamic> json) =>
      _$UserLocationFromJson(json);
}

/// Response from the table validation API
///
/// Contains information about the table status, session details,
/// and user authentication requirements
@freezed
class TableValidationResponse with _$TableValidationResponse {
  // Add a private constructor for custom methods

  /// Creates a table validation response
  const factory TableValidationResponse({
    /// Status of the validation ('success', 'error', etc.)
    required String status,

    /// Message describing the validation result
    required String message,

    /// Additional data from the response
    Map<String, dynamic>? data,

    /// Whether OTP verification is required
    @Default(false) bool requiresOtp,
  }) = _TableValidationResponse;
  const TableValidationResponse._();

  /// Creates a TableValidationResponse from a JSON map
  factory TableValidationResponse.fromJson(Map<String, dynamic> json) {
    try {
      // Sanitize the JSON to handle potential type mismatches and null values
      final sanitizedJson = <String, dynamic>{
        'status': json['status'] as String? ?? 'error',
        'message': json['message'] as String? ?? 'Unknown error',
        'data': json['data'] as Map<String, dynamic>?,
        'requiresOtp': json['requiresOtp'] as bool? ?? false,
      };

      return TableValidationResponse(
        status: sanitizedJson['status'] as String,
        message: sanitizedJson['message'] as String,
        data: sanitizedJson['data'] as Map<String, dynamic>?,
        requiresOtp: sanitizedJson['requiresOtp'] as bool,
      );
    } catch (e) {
      AppLogger.log(
        '❌ TABLE_VALIDATION: Error parsing TableValidationResponse: $e',
      );
      return const TableValidationResponse(
        status: 'error',
        message: 'Failed to parse response',
      );
    }
  }

  // Session information getters

  /// Session ID for the current user session
  String? get sessionId => data?['session']?['sessionId'] as String?;

  /// Expiration timestamp for the session
  String? get sessionExpiresAt => data?['session']?['expiresAt'] as String?;

  // Table information getters

  /// Current status of the table ('vacant', 'active', etc.)
  String? get tableStatus => data?['tableStatus'] as String?;

  /// Table number or identifier
  String? get tableNumber => data?['table']?['number'] as String?;

  /// Maximum capacity of the table
  int? get tableCapacity => data?['table']?['capacity'] as int?;

  // Restaurant information getters

  /// Name of the restaurant
  String? get restaurantName => data?['restaurant']?['name'] as String?;

  /// ID of the restaurant
  String? get restaurantId => data?['restaurant']?['id'] as String?;

  // Feature flags

  /// Whether OTP is required for ordering
  bool get otpRequiredForOrder =>
      data?['otpRequiredForOrder'] as bool? ?? false;

  /// Whether username is mandatory for authentication
  bool get isUsernameMandatory => data?['isUsernameMandatory'] as bool? ?? true;

  /// Whether phone number is mandatory for authentication
  bool get isPhoneNumberMandatory =>
      data?['isPhoneNumberMandatory'] as bool? ?? true;

  /// Whether multiple users can share a table
  bool get isMultiUserSupported =>
      data?['isMultiUserSupported'] as bool? ?? false;

  // Primary customer information

  /// Name of the primary customer
  String? get primaryCustomerName =>
      data?['primaryCustomer']?['name'] as String?;

  /// Phone number of the primary customer
  String? get primaryCustomerPhone =>
      data?['primaryCustomer']?['phoneNumber'] as String?;

  // Auth message for OTP guidance

  /// Message to guide users through authentication
  String get authMessage =>
      data?['authMessage'] as String? ?? 'Authentication required';

  /// Whether the table is currently active
  bool get isTableActive => tableStatus == 'active';

  /// Whether the table is currently vacant
  bool get isTableVacant => tableStatus == 'vacant';
}

/// Exception thrown during table validation
///
/// Used to represent errors that occur during the table validation process
@freezed
class TableValidationException
    with _$TableValidationException
    implements Exception {
  /// Creates a table validation exception
  const factory TableValidationException(
    /// Error message
    String message, {
    /// Optional error code
    String? code,

    /// Optional stack trace
    StackTrace? stackTrace,
  }) = _TableValidationException;
}

// Remove or comment out the duplicate non-freezed class (approximately lines 142-184)
// class TableValidationResponse {
//   final String status;
//   final String message;
//   final String? sessionId;
//   final bool requiresOtp;
//   final String? authMessage;
//   
//   // New fields from error.details.data
//   final bool isUsernameMandatory;
//   final bool isPhoneNumberMandatory;
//   final bool isMultiUserSupported;
//   final String restaurantName;
//   final String tableNumber;
//
//   TableValidationResponse({
//     required this.status,
//     required this.message,
//     this.sessionId,
//     this.requiresOtp = false,
//     this.authMessage,
//     this.isUsernameMandatory = false,
//     this.isPhoneNumberMandatory = false,
//     this.isMultiUserSupported = false,
//     this.restaurantName = '',
//     this.tableNumber = '',
//   });
//
//   TableValidationResponse copyWith({
//     String? status,
//     String? message,
//     String? sessionId,
//     bool? requiresOtp,
//     String? authMessage,
//     bool? isUsernameMandatory,
//     bool? isPhoneNumberMandatory,
//     bool? isMultiUserSupported,
//     String? restaurantName,
//     String? tableNumber,
//   }) {
//     return TableValidationResponse(
//       status: status ?? this.status,
//       message: message ?? this.message,
//       sessionId: sessionId ?? this.sessionId,
//       requiresOtp: requiresOtp ?? this.requiresOtp,
//       authMessage: authMessage ?? this.authMessage,
//       isUsernameMandatory: isUsernameMandatory ?? this.isUsernameMandatory,
//       isPhoneNumberMandatory: isPhoneNumberMandatory ?? this.isPhoneNumberMandatory,
//       isMultiUserSupported: isMultiUserSupported ?? this.isMultiUserSupported,
//       restaurantName: restaurantName ?? this.restaurantName,
//       tableNumber: tableNumber ?? this.tableNumber,
//     );
//   }
// } 
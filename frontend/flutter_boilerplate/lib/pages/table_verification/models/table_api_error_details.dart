import 'package:freezed_annotation/freezed_annotation.dart';

part 'table_api_error_details.freezed.dart';
part 'table_api_error_details.g.dart';

@freezed
class TableApiErrorDetails with _$TableApiErrorDetails {
  const factory TableApiErrorDetails({
    int? httpCode,
    String? tableStatus,
    String? authMessage,
    bool? isUsernameMandatory,
    bool? isPhoneNumberMandatory,
    bool? isMultiUserSupported,
    bool? otpRequired,
    String? status,
    String? message,
  }) = _TableApiErrorDetails;

  factory TableApiErrorDetails.fromJson(Map<String, dynamic> json) =>
      _$TableApiErrorDetailsFromJson(json);
} 
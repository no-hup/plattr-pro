// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'otp_models.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_$OtpValidationRequestImpl _$$OtpValidationRequestImplFromJson(
        Map<String, dynamic> json) =>
    _$OtpValidationRequestImpl(
      restaurantId: json['restaurantId'] as String,
      tableId: json['tableId'] as String,
      otp: json['otp'] as String,
      phoneNumber: json['phoneNumber'] as String?,
      name: json['name'] as String?,
    );

Map<String, dynamic> _$$OtpValidationRequestImplToJson(
        _$OtpValidationRequestImpl instance) =>
    <String, dynamic>{
      'restaurantId': instance.restaurantId,
      'tableId': instance.tableId,
      'otp': instance.otp,
      'phoneNumber': instance.phoneNumber,
      'name': instance.name,
    };

_$OtpValidationResponseImpl _$$OtpValidationResponseImplFromJson(
        Map<String, dynamic> json) =>
    _$OtpValidationResponseImpl(
      status: json['status'] as String,
      customToken: json['customToken'] as String?,
      isPrimaryCustomer: json['isPrimaryCustomer'] as bool? ?? false,
      sessionId: json['sessionId'] as String,
    );

Map<String, dynamic> _$$OtpValidationResponseImplToJson(
        _$OtpValidationResponseImpl instance) =>
    <String, dynamic>{
      'status': instance.status,
      'customToken': instance.customToken,
      'isPrimaryCustomer': instance.isPrimaryCustomer,
      'sessionId': instance.sessionId,
    };

_$OtpAskPrimaryCustomerResponseImpl
    _$$OtpAskPrimaryCustomerResponseImplFromJson(Map<String, dynamic> json) =>
        _$OtpAskPrimaryCustomerResponseImpl(
          status: json['status'] as String,
          message: json['message'] as String,
        );

Map<String, dynamic> _$$OtpAskPrimaryCustomerResponseImplToJson(
        _$OtpAskPrimaryCustomerResponseImpl instance) =>
    <String, dynamic>{
      'status': instance.status,
      'message': instance.message,
    };

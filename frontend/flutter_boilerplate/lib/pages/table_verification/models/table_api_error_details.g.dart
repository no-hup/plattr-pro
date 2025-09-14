// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'table_api_error_details.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_$TableApiErrorDetailsImpl _$$TableApiErrorDetailsImplFromJson(
        Map<String, dynamic> json) =>
    _$TableApiErrorDetailsImpl(
      httpCode: (json['httpCode'] as num?)?.toInt(),
      tableStatus: json['tableStatus'] as String?,
      authMessage: json['authMessage'] as String?,
      isUsernameMandatory: json['isUsernameMandatory'] as bool?,
      isPhoneNumberMandatory: json['isPhoneNumberMandatory'] as bool?,
      isMultiUserSupported: json['isMultiUserSupported'] as bool?,
      otpRequired: json['otpRequired'] as bool?,
      status: json['status'] as String?,
      message: json['message'] as String?,
    );

Map<String, dynamic> _$$TableApiErrorDetailsImplToJson(
        _$TableApiErrorDetailsImpl instance) =>
    <String, dynamic>{
      'httpCode': instance.httpCode,
      'tableStatus': instance.tableStatus,
      'authMessage': instance.authMessage,
      'isUsernameMandatory': instance.isUsernameMandatory,
      'isPhoneNumberMandatory': instance.isPhoneNumberMandatory,
      'isMultiUserSupported': instance.isMultiUserSupported,
      'otpRequired': instance.otpRequired,
      'status': instance.status,
      'message': instance.message,
    };

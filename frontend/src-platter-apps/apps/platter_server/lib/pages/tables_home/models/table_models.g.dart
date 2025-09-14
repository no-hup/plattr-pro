// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'table_models.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

TableModel _$TableModelFromJson(Map<String, dynamic> json) {
  $checkKeys(
    json,
    requiredKeys: const ['number', 'id', 'capacity', 'status'],
    disallowNullValues: const ['number', 'id', 'capacity', 'status'],
  );
  return TableModel(
    tableNumber: json['number'] as String,
    tableId: json['id'] as String,
    capacity: (json['capacity'] as num).toInt(),
    status: json['status'] as String,
    isDisabled: json['isDisabled'] as bool? ?? false,
    currentOrderId: json['activeOrderId'] as String? ?? '',
    tableOtp: json['otp'] as String? ?? '',
  );
}

Map<String, dynamic> _$TableModelToJson(TableModel instance) =>
    <String, dynamic>{
      'number': instance.tableNumber,
      'id': instance.tableId,
      'capacity': instance.capacity,
      'status': instance.status,
      'isDisabled': instance.isDisabled,
      'activeOrderId': instance.currentOrderId,
      'otp': instance.tableOtp,
    };

TableListResponse _$TableListResponseFromJson(Map<String, dynamic> json) =>
    TableListResponse(
      tables: (json['tables'] as List<dynamic>)
          .map((e) => TableModel.fromJson(e as Map<String, dynamic>))
          .toList(),
    );

Map<String, dynamic> _$TableListResponseToJson(TableListResponse instance) =>
    <String, dynamic>{
      'tables': instance.tables,
    };

TableDetailResponse _$TableDetailResponseFromJson(Map<String, dynamic> json) =>
    TableDetailResponse(
      success: json['success'] as bool? ?? true,
      message: json['message'] as String? ?? '',
      data: json['data'] == null
          ? null
          : TableModel.fromJson(json['data'] as Map<String, dynamic>),
    );

Map<String, dynamic> _$TableDetailResponseToJson(
        TableDetailResponse instance) =>
    <String, dynamic>{
      'success': instance.success,
      'message': instance.message,
      'data': instance.data,
    };

UpdateTableStatusResponse _$UpdateTableStatusResponseFromJson(
    Map<String, dynamic> json) {
  $checkKeys(
    json,
    requiredKeys: const [
      'tableId',
      'tableNumber',
      'previousStatus',
      'currentStatus',
      'changed'
    ],
    disallowNullValues: const [
      'tableId',
      'tableNumber',
      'previousStatus',
      'currentStatus',
      'changed'
    ],
  );
  return UpdateTableStatusResponse(
    tableId: json['tableId'] as String,
    tableNumber: json['tableNumber'] as String,
    previousStatus: json['previousStatus'] as String,
    currentStatus: json['currentStatus'] as String,
    changed: json['changed'] as bool,
  );
}

Map<String, dynamic> _$UpdateTableStatusResponseToJson(
        UpdateTableStatusResponse instance) =>
    <String, dynamic>{
      'tableId': instance.tableId,
      'tableNumber': instance.tableNumber,
      'previousStatus': instance.previousStatus,
      'currentStatus': instance.currentStatus,
      'changed': instance.changed,
    };

TableOtpResponse _$TableOtpResponseFromJson(Map<String, dynamic> json) =>
    TableOtpResponse(
      success: json['success'] as bool? ?? true,
      message: json['message'] as String? ?? '',
      otp: json['otp'] as String? ?? '',
      tableId: json['tableId'] as String? ?? '',
      tableNumber: json['tableNumber'] as String? ?? '',
      otpGeneratedAt: json['otpGeneratedAt'] as String? ?? '',
      otpExpiresAt: json['otpExpiresAt'] as String? ?? '',
    );

Map<String, dynamic> _$TableOtpResponseToJson(TableOtpResponse instance) =>
    <String, dynamic>{
      'success': instance.success,
      'message': instance.message,
      'otp': instance.otp,
      'tableId': instance.tableId,
      'tableNumber': instance.tableNumber,
      'otpGeneratedAt': instance.otpGeneratedAt,
      'otpExpiresAt': instance.otpExpiresAt,
    };

TableStatusUpdateRequest _$TableStatusUpdateRequestFromJson(
    Map<String, dynamic> json) {
  $checkKeys(
    json,
    requiredKeys: const ['restaurantId', 'tableId', 'status'],
  );
  return TableStatusUpdateRequest(
    restaurantId: json['restaurantId'] as String,
    tableId: json['tableId'] as String,
    status: json['status'] as String,
  );
}

Map<String, dynamic> _$TableStatusUpdateRequestToJson(
        TableStatusUpdateRequest instance) =>
    <String, dynamic>{
      'restaurantId': instance.restaurantId,
      'tableId': instance.tableId,
      'status': instance.status,
    };

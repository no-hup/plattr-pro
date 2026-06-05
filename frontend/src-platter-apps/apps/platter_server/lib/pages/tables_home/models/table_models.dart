import 'package:json_annotation/json_annotation.dart';

part 'table_models.g.dart';

@JsonSerializable(createToJson: true)
class TableModel {
  @JsonKey(name: 'number', required: true, disallowNullValue: true)
  final String tableNumber;

  @JsonKey(name: 'id', required: true, disallowNullValue: true)
  final String tableId;

  @JsonKey(required: true, disallowNullValue: true)
  final int capacity;

  @JsonKey(required: true, disallowNullValue: true)
  final String status;

  @JsonKey(defaultValue: false, name: 'isDisabled')
  final bool isDisabled;

  @JsonKey(defaultValue: '', name: 'activeOrderId')
  final String currentOrderId;

  @JsonKey(defaultValue: '', name: 'otp')
  final String tableOtp;

  @JsonKey(name: 'primaryCustomer')
  final Map<String, dynamic>? primaryCustomer;

  /// Customer name from primaryCustomer, if present.
  String? get customerName {
    final name = primaryCustomer?['name'];
    return (name is String && name.isNotEmpty) ? name : null;
  }

  TableModel({
    required this.tableNumber,
    required this.tableId,
    required this.capacity,
    required this.status,
    this.isDisabled = false,
    this.currentOrderId = '',
    this.tableOtp = '',
    this.primaryCustomer,
  });

  factory TableModel.fromJson(Map<String, dynamic> json) =>
      _$TableModelFromJson(json);
  Map<String, dynamic> toJson() => _$TableModelToJson(this);
}

@JsonSerializable(createToJson: true)
class TableListResponse {
  @JsonKey(name: 'tables')
  final List<TableModel> tables;

  TableListResponse({required this.tables});

  factory TableListResponse.fromJson(Map<String, dynamic> json) =>
      _$TableListResponseFromJson(json);
  Map<String, dynamic> toJson() => _$TableListResponseToJson(this);
}

@JsonSerializable(createToJson: true)
class TableDetailResponse {
  @JsonKey(defaultValue: true)
  final bool success;

  @JsonKey(defaultValue: '')
  final String message;

  final TableModel? data;

  TableDetailResponse({
    required this.success,
    required this.message,
    this.data,
  });

  factory TableDetailResponse.fromJson(Map<String, dynamic> json) =>
      _$TableDetailResponseFromJson(json);
  Map<String, dynamic> toJson() => _$TableDetailResponseToJson(this);
}

@JsonSerializable(createToJson: true)
class UpdateTableStatusResponse {
  @JsonKey(required: true, disallowNullValue: true)
  final String tableId;
  @JsonKey(required: true, disallowNullValue: true)
  final String tableNumber;
  @JsonKey(required: true, disallowNullValue: true)
  final String previousStatus;
  @JsonKey(required: true, disallowNullValue: true)
  final String currentStatus;
  @JsonKey(required: true, disallowNullValue: true)
  final bool changed;

  UpdateTableStatusResponse({
    required this.tableId,
    required this.tableNumber,
    required this.previousStatus,
    required this.currentStatus,
    required this.changed,
  });

  factory UpdateTableStatusResponse.fromJson(Map<String, dynamic> json) =>
      _$UpdateTableStatusResponseFromJson(json);
  Map<String, dynamic> toJson() => _$UpdateTableStatusResponseToJson(this);
}

@JsonSerializable(createToJson: true)
class TableOtpResponse {
  @JsonKey(defaultValue: true)
  final bool success;

  @JsonKey(defaultValue: '')
  final String message;

  @JsonKey(defaultValue: '')
  final String otp;

  @JsonKey(defaultValue: '')
  final String tableId;

  @JsonKey(defaultValue: '')
  final String tableNumber;

  @JsonKey(defaultValue: '')
  final String otpGeneratedAt;

  @JsonKey(defaultValue: '')
  final String otpExpiresAt;

  TableOtpResponse({
    required this.success,
    required this.message,
    required this.otp,
    this.tableId = '',
    this.tableNumber = '',
    this.otpGeneratedAt = '',
    this.otpExpiresAt = '',
  });

  factory TableOtpResponse.fromJson(Map<String, dynamic> json) =>
      _$TableOtpResponseFromJson(json);
  Map<String, dynamic> toJson() => _$TableOtpResponseToJson(this);
}

@JsonSerializable(createToJson: true)
class TableStatusUpdateRequest {
  @JsonKey(required: true)
  final String restaurantId;

  @JsonKey(required: true)
  final String tableId;

  @JsonKey(required: true)
  final String status;

  TableStatusUpdateRequest({
    required this.restaurantId,
    required this.tableId,
    required this.status,
  });

  factory TableStatusUpdateRequest.fromJson(Map<String, dynamic> json) =>
      _$TableStatusUpdateRequestFromJson(json);
  Map<String, dynamic> toJson() => _$TableStatusUpdateRequestToJson(this);
}

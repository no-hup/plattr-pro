// coverage:ignore-file
// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'checkout_models.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

T _$identity<T>(T value) => value;

final _privateConstructorUsedError = UnsupportedError(
    'It seems like you constructed your class using `MyClass._()`. This constructor is only meant to be used by freezed and you are not supposed to need it nor use it.\nPlease check the documentation here for more information: https://github.com/rrousselGit/freezed#adding-getters-and-methods-to-our-models');

CheckoutResponse _$CheckoutResponseFromJson(Map<String, dynamic> json) {
  return _CheckoutResponse.fromJson(json);
}

/// @nodoc
mixin _$CheckoutResponse {
  String get message => throw _privateConstructorUsedError;
  String get status => throw _privateConstructorUsedError;
  CheckoutData get data => throw _privateConstructorUsedError;

  Map<String, dynamic> toJson() => throw _privateConstructorUsedError;
  @JsonKey(ignore: true)
  $CheckoutResponseCopyWith<CheckoutResponse> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $CheckoutResponseCopyWith<$Res> {
  factory $CheckoutResponseCopyWith(
          CheckoutResponse value, $Res Function(CheckoutResponse) then) =
      _$CheckoutResponseCopyWithImpl<$Res, CheckoutResponse>;
  @useResult
  $Res call({String message, String status, CheckoutData data});

  $CheckoutDataCopyWith<$Res> get data;
}

/// @nodoc
class _$CheckoutResponseCopyWithImpl<$Res, $Val extends CheckoutResponse>
    implements $CheckoutResponseCopyWith<$Res> {
  _$CheckoutResponseCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? message = null,
    Object? status = null,
    Object? data = null,
  }) {
    return _then(_value.copyWith(
      message: null == message
          ? _value.message
          : message // ignore: cast_nullable_to_non_nullable
              as String,
      status: null == status
          ? _value.status
          : status // ignore: cast_nullable_to_non_nullable
              as String,
      data: null == data
          ? _value.data
          : data // ignore: cast_nullable_to_non_nullable
              as CheckoutData,
    ) as $Val);
  }

  @override
  @pragma('vm:prefer-inline')
  $CheckoutDataCopyWith<$Res> get data {
    return $CheckoutDataCopyWith<$Res>(_value.data, (value) {
      return _then(_value.copyWith(data: value) as $Val);
    });
  }
}

/// @nodoc
abstract class _$$CheckoutResponseImplCopyWith<$Res>
    implements $CheckoutResponseCopyWith<$Res> {
  factory _$$CheckoutResponseImplCopyWith(_$CheckoutResponseImpl value,
          $Res Function(_$CheckoutResponseImpl) then) =
      __$$CheckoutResponseImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call({String message, String status, CheckoutData data});

  @override
  $CheckoutDataCopyWith<$Res> get data;
}

/// @nodoc
class __$$CheckoutResponseImplCopyWithImpl<$Res>
    extends _$CheckoutResponseCopyWithImpl<$Res, _$CheckoutResponseImpl>
    implements _$$CheckoutResponseImplCopyWith<$Res> {
  __$$CheckoutResponseImplCopyWithImpl(_$CheckoutResponseImpl _value,
      $Res Function(_$CheckoutResponseImpl) _then)
      : super(_value, _then);

  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? message = null,
    Object? status = null,
    Object? data = null,
  }) {
    return _then(_$CheckoutResponseImpl(
      message: null == message
          ? _value.message
          : message // ignore: cast_nullable_to_non_nullable
              as String,
      status: null == status
          ? _value.status
          : status // ignore: cast_nullable_to_non_nullable
              as String,
      data: null == data
          ? _value.data
          : data // ignore: cast_nullable_to_non_nullable
              as CheckoutData,
    ));
  }
}

/// @nodoc

@JsonSerializable(explicitToJson: true, anyMap: true)
class _$CheckoutResponseImpl implements _CheckoutResponse {
  const _$CheckoutResponseImpl(
      {required this.message, required this.status, required this.data});

  factory _$CheckoutResponseImpl.fromJson(Map<String, dynamic> json) =>
      _$$CheckoutResponseImplFromJson(json);

  @override
  final String message;
  @override
  final String status;
  @override
  final CheckoutData data;

  @override
  String toString() {
    return 'CheckoutResponse(message: $message, status: $status, data: $data)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$CheckoutResponseImpl &&
            (identical(other.message, message) || other.message == message) &&
            (identical(other.status, status) || other.status == status) &&
            (identical(other.data, data) || other.data == data));
  }

  @JsonKey(ignore: true)
  @override
  int get hashCode => Object.hash(runtimeType, message, status, data);

  @JsonKey(ignore: true)
  @override
  @pragma('vm:prefer-inline')
  _$$CheckoutResponseImplCopyWith<_$CheckoutResponseImpl> get copyWith =>
      __$$CheckoutResponseImplCopyWithImpl<_$CheckoutResponseImpl>(
          this, _$identity);

  @override
  Map<String, dynamic> toJson() {
    return _$$CheckoutResponseImplToJson(
      this,
    );
  }
}

abstract class _CheckoutResponse implements CheckoutResponse {
  const factory _CheckoutResponse(
      {required final String message,
      required final String status,
      required final CheckoutData data}) = _$CheckoutResponseImpl;

  factory _CheckoutResponse.fromJson(Map<String, dynamic> json) =
      _$CheckoutResponseImpl.fromJson;

  @override
  String get message;
  @override
  String get status;
  @override
  CheckoutData get data;
  @override
  @JsonKey(ignore: true)
  _$$CheckoutResponseImplCopyWith<_$CheckoutResponseImpl> get copyWith =>
      throw _privateConstructorUsedError;
}

CheckoutData _$CheckoutDataFromJson(Map<String, dynamic> json) {
  return _CheckoutData.fromJson(json);
}

/// @nodoc
mixin _$CheckoutData {
  String get orderId => throw _privateConstructorUsedError;
  String get orderNumber => throw _privateConstructorUsedError;
  String get orderStatus => throw _privateConstructorUsedError;
  @DateTimeConverter()
  DateTime get timestamp => throw _privateConstructorUsedError;

  Map<String, dynamic> toJson() => throw _privateConstructorUsedError;
  @JsonKey(ignore: true)
  $CheckoutDataCopyWith<CheckoutData> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $CheckoutDataCopyWith<$Res> {
  factory $CheckoutDataCopyWith(
          CheckoutData value, $Res Function(CheckoutData) then) =
      _$CheckoutDataCopyWithImpl<$Res, CheckoutData>;
  @useResult
  $Res call(
      {String orderId,
      String orderNumber,
      String orderStatus,
      @DateTimeConverter() DateTime timestamp});
}

/// @nodoc
class _$CheckoutDataCopyWithImpl<$Res, $Val extends CheckoutData>
    implements $CheckoutDataCopyWith<$Res> {
  _$CheckoutDataCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? orderId = null,
    Object? orderNumber = null,
    Object? orderStatus = null,
    Object? timestamp = null,
  }) {
    return _then(_value.copyWith(
      orderId: null == orderId
          ? _value.orderId
          : orderId // ignore: cast_nullable_to_non_nullable
              as String,
      orderNumber: null == orderNumber
          ? _value.orderNumber
          : orderNumber // ignore: cast_nullable_to_non_nullable
              as String,
      orderStatus: null == orderStatus
          ? _value.orderStatus
          : orderStatus // ignore: cast_nullable_to_non_nullable
              as String,
      timestamp: null == timestamp
          ? _value.timestamp
          : timestamp // ignore: cast_nullable_to_non_nullable
              as DateTime,
    ) as $Val);
  }
}

/// @nodoc
abstract class _$$CheckoutDataImplCopyWith<$Res>
    implements $CheckoutDataCopyWith<$Res> {
  factory _$$CheckoutDataImplCopyWith(
          _$CheckoutDataImpl value, $Res Function(_$CheckoutDataImpl) then) =
      __$$CheckoutDataImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call(
      {String orderId,
      String orderNumber,
      String orderStatus,
      @DateTimeConverter() DateTime timestamp});
}

/// @nodoc
class __$$CheckoutDataImplCopyWithImpl<$Res>
    extends _$CheckoutDataCopyWithImpl<$Res, _$CheckoutDataImpl>
    implements _$$CheckoutDataImplCopyWith<$Res> {
  __$$CheckoutDataImplCopyWithImpl(
      _$CheckoutDataImpl _value, $Res Function(_$CheckoutDataImpl) _then)
      : super(_value, _then);

  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? orderId = null,
    Object? orderNumber = null,
    Object? orderStatus = null,
    Object? timestamp = null,
  }) {
    return _then(_$CheckoutDataImpl(
      orderId: null == orderId
          ? _value.orderId
          : orderId // ignore: cast_nullable_to_non_nullable
              as String,
      orderNumber: null == orderNumber
          ? _value.orderNumber
          : orderNumber // ignore: cast_nullable_to_non_nullable
              as String,
      orderStatus: null == orderStatus
          ? _value.orderStatus
          : orderStatus // ignore: cast_nullable_to_non_nullable
              as String,
      timestamp: null == timestamp
          ? _value.timestamp
          : timestamp // ignore: cast_nullable_to_non_nullable
              as DateTime,
    ));
  }
}

/// @nodoc

@JsonSerializable(explicitToJson: true, anyMap: true)
class _$CheckoutDataImpl implements _CheckoutData {
  const _$CheckoutDataImpl(
      {required this.orderId,
      required this.orderNumber,
      required this.orderStatus,
      @DateTimeConverter() required this.timestamp});

  factory _$CheckoutDataImpl.fromJson(Map<String, dynamic> json) =>
      _$$CheckoutDataImplFromJson(json);

  @override
  final String orderId;
  @override
  final String orderNumber;
  @override
  final String orderStatus;
  @override
  @DateTimeConverter()
  final DateTime timestamp;

  @override
  String toString() {
    return 'CheckoutData(orderId: $orderId, orderNumber: $orderNumber, orderStatus: $orderStatus, timestamp: $timestamp)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$CheckoutDataImpl &&
            (identical(other.orderId, orderId) || other.orderId == orderId) &&
            (identical(other.orderNumber, orderNumber) ||
                other.orderNumber == orderNumber) &&
            (identical(other.orderStatus, orderStatus) ||
                other.orderStatus == orderStatus) &&
            (identical(other.timestamp, timestamp) ||
                other.timestamp == timestamp));
  }

  @JsonKey(ignore: true)
  @override
  int get hashCode =>
      Object.hash(runtimeType, orderId, orderNumber, orderStatus, timestamp);

  @JsonKey(ignore: true)
  @override
  @pragma('vm:prefer-inline')
  _$$CheckoutDataImplCopyWith<_$CheckoutDataImpl> get copyWith =>
      __$$CheckoutDataImplCopyWithImpl<_$CheckoutDataImpl>(this, _$identity);

  @override
  Map<String, dynamic> toJson() {
    return _$$CheckoutDataImplToJson(
      this,
    );
  }
}

abstract class _CheckoutData implements CheckoutData {
  const factory _CheckoutData(
          {required final String orderId,
          required final String orderNumber,
          required final String orderStatus,
          @DateTimeConverter() required final DateTime timestamp}) =
      _$CheckoutDataImpl;

  factory _CheckoutData.fromJson(Map<String, dynamic> json) =
      _$CheckoutDataImpl.fromJson;

  @override
  String get orderId;
  @override
  String get orderNumber;
  @override
  String get orderStatus;
  @override
  @DateTimeConverter()
  DateTime get timestamp;
  @override
  @JsonKey(ignore: true)
  _$$CheckoutDataImplCopyWith<_$CheckoutDataImpl> get copyWith =>
      throw _privateConstructorUsedError;
}

CheckoutError _$CheckoutErrorFromJson(Map<String, dynamic> json) {
  return _CheckoutError.fromJson(json);
}

/// @nodoc
mixin _$CheckoutError {
  String get code => throw _privateConstructorUsedError;
  String get message =>
      throw _privateConstructorUsedError; // Reusing TableApiErrorDetails instead of creating our own CheckoutErrorDetails
  TableApiErrorDetails? get details => throw _privateConstructorUsedError;

  Map<String, dynamic> toJson() => throw _privateConstructorUsedError;
  @JsonKey(ignore: true)
  $CheckoutErrorCopyWith<CheckoutError> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $CheckoutErrorCopyWith<$Res> {
  factory $CheckoutErrorCopyWith(
          CheckoutError value, $Res Function(CheckoutError) then) =
      _$CheckoutErrorCopyWithImpl<$Res, CheckoutError>;
  @useResult
  $Res call({String code, String message, TableApiErrorDetails? details});

  $TableApiErrorDetailsCopyWith<$Res>? get details;
}

/// @nodoc
class _$CheckoutErrorCopyWithImpl<$Res, $Val extends CheckoutError>
    implements $CheckoutErrorCopyWith<$Res> {
  _$CheckoutErrorCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? code = null,
    Object? message = null,
    Object? details = freezed,
  }) {
    return _then(_value.copyWith(
      code: null == code
          ? _value.code
          : code // ignore: cast_nullable_to_non_nullable
              as String,
      message: null == message
          ? _value.message
          : message // ignore: cast_nullable_to_non_nullable
              as String,
      details: freezed == details
          ? _value.details
          : details // ignore: cast_nullable_to_non_nullable
              as TableApiErrorDetails?,
    ) as $Val);
  }

  @override
  @pragma('vm:prefer-inline')
  $TableApiErrorDetailsCopyWith<$Res>? get details {
    if (_value.details == null) {
      return null;
    }

    return $TableApiErrorDetailsCopyWith<$Res>(_value.details!, (value) {
      return _then(_value.copyWith(details: value) as $Val);
    });
  }
}

/// @nodoc
abstract class _$$CheckoutErrorImplCopyWith<$Res>
    implements $CheckoutErrorCopyWith<$Res> {
  factory _$$CheckoutErrorImplCopyWith(
          _$CheckoutErrorImpl value, $Res Function(_$CheckoutErrorImpl) then) =
      __$$CheckoutErrorImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call({String code, String message, TableApiErrorDetails? details});

  @override
  $TableApiErrorDetailsCopyWith<$Res>? get details;
}

/// @nodoc
class __$$CheckoutErrorImplCopyWithImpl<$Res>
    extends _$CheckoutErrorCopyWithImpl<$Res, _$CheckoutErrorImpl>
    implements _$$CheckoutErrorImplCopyWith<$Res> {
  __$$CheckoutErrorImplCopyWithImpl(
      _$CheckoutErrorImpl _value, $Res Function(_$CheckoutErrorImpl) _then)
      : super(_value, _then);

  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? code = null,
    Object? message = null,
    Object? details = freezed,
  }) {
    return _then(_$CheckoutErrorImpl(
      code: null == code
          ? _value.code
          : code // ignore: cast_nullable_to_non_nullable
              as String,
      message: null == message
          ? _value.message
          : message // ignore: cast_nullable_to_non_nullable
              as String,
      details: freezed == details
          ? _value.details
          : details // ignore: cast_nullable_to_non_nullable
              as TableApiErrorDetails?,
    ));
  }
}

/// @nodoc

@JsonSerializable(explicitToJson: true, anyMap: true)
class _$CheckoutErrorImpl implements _CheckoutError {
  const _$CheckoutErrorImpl(
      {required this.code, required this.message, this.details});

  factory _$CheckoutErrorImpl.fromJson(Map<String, dynamic> json) =>
      _$$CheckoutErrorImplFromJson(json);

  @override
  final String code;
  @override
  final String message;
// Reusing TableApiErrorDetails instead of creating our own CheckoutErrorDetails
  @override
  final TableApiErrorDetails? details;

  @override
  String toString() {
    return 'CheckoutError(code: $code, message: $message, details: $details)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$CheckoutErrorImpl &&
            (identical(other.code, code) || other.code == code) &&
            (identical(other.message, message) || other.message == message) &&
            (identical(other.details, details) || other.details == details));
  }

  @JsonKey(ignore: true)
  @override
  int get hashCode => Object.hash(runtimeType, code, message, details);

  @JsonKey(ignore: true)
  @override
  @pragma('vm:prefer-inline')
  _$$CheckoutErrorImplCopyWith<_$CheckoutErrorImpl> get copyWith =>
      __$$CheckoutErrorImplCopyWithImpl<_$CheckoutErrorImpl>(this, _$identity);

  @override
  Map<String, dynamic> toJson() {
    return _$$CheckoutErrorImplToJson(
      this,
    );
  }
}

abstract class _CheckoutError implements CheckoutError {
  const factory _CheckoutError(
      {required final String code,
      required final String message,
      final TableApiErrorDetails? details}) = _$CheckoutErrorImpl;

  factory _CheckoutError.fromJson(Map<String, dynamic> json) =
      _$CheckoutErrorImpl.fromJson;

  @override
  String get code;
  @override
  String get message;
  @override // Reusing TableApiErrorDetails instead of creating our own CheckoutErrorDetails
  TableApiErrorDetails? get details;
  @override
  @JsonKey(ignore: true)
  _$$CheckoutErrorImplCopyWith<_$CheckoutErrorImpl> get copyWith =>
      throw _privateConstructorUsedError;
}

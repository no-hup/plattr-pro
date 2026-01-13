// coverage:ignore-file
// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'otp_models.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

T _$identity<T>(T value) => value;

final _privateConstructorUsedError = UnsupportedError(
    'It seems like you constructed your class using `MyClass._()`. This constructor is only meant to be used by freezed and you are not supposed to need it nor use it.\nPlease check the documentation here for more information: https://github.com/rrousselGit/freezed#adding-getters-and-methods-to-our-models');

OtpValidationRequest _$OtpValidationRequestFromJson(Map<String, dynamic> json) {
  return _OtpValidationRequest.fromJson(json);
}

/// @nodoc
mixin _$OtpValidationRequest {
  String get restaurantId => throw _privateConstructorUsedError;
  String get tableId => throw _privateConstructorUsedError;
  String get otp => throw _privateConstructorUsedError;
  String? get phoneNumber =>
      throw _privateConstructorUsedError; // Optional based on backend logic
  String? get name => throw _privateConstructorUsedError;

  Map<String, dynamic> toJson() => throw _privateConstructorUsedError;
  @JsonKey(ignore: true)
  $OtpValidationRequestCopyWith<OtpValidationRequest> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $OtpValidationRequestCopyWith<$Res> {
  factory $OtpValidationRequestCopyWith(OtpValidationRequest value,
          $Res Function(OtpValidationRequest) then) =
      _$OtpValidationRequestCopyWithImpl<$Res, OtpValidationRequest>;
  @useResult
  $Res call(
      {String restaurantId,
      String tableId,
      String otp,
      String? phoneNumber,
      String? name});
}

/// @nodoc
class _$OtpValidationRequestCopyWithImpl<$Res,
        $Val extends OtpValidationRequest>
    implements $OtpValidationRequestCopyWith<$Res> {
  _$OtpValidationRequestCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? restaurantId = null,
    Object? tableId = null,
    Object? otp = null,
    Object? phoneNumber = freezed,
    Object? name = freezed,
  }) {
    return _then(_value.copyWith(
      restaurantId: null == restaurantId
          ? _value.restaurantId
          : restaurantId // ignore: cast_nullable_to_non_nullable
              as String,
      tableId: null == tableId
          ? _value.tableId
          : tableId // ignore: cast_nullable_to_non_nullable
              as String,
      otp: null == otp
          ? _value.otp
          : otp // ignore: cast_nullable_to_non_nullable
              as String,
      phoneNumber: freezed == phoneNumber
          ? _value.phoneNumber
          : phoneNumber // ignore: cast_nullable_to_non_nullable
              as String?,
      name: freezed == name
          ? _value.name
          : name // ignore: cast_nullable_to_non_nullable
              as String?,
    ) as $Val);
  }
}

/// @nodoc
abstract class _$$OtpValidationRequestImplCopyWith<$Res>
    implements $OtpValidationRequestCopyWith<$Res> {
  factory _$$OtpValidationRequestImplCopyWith(_$OtpValidationRequestImpl value,
          $Res Function(_$OtpValidationRequestImpl) then) =
      __$$OtpValidationRequestImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call(
      {String restaurantId,
      String tableId,
      String otp,
      String? phoneNumber,
      String? name});
}

/// @nodoc
class __$$OtpValidationRequestImplCopyWithImpl<$Res>
    extends _$OtpValidationRequestCopyWithImpl<$Res, _$OtpValidationRequestImpl>
    implements _$$OtpValidationRequestImplCopyWith<$Res> {
  __$$OtpValidationRequestImplCopyWithImpl(_$OtpValidationRequestImpl _value,
      $Res Function(_$OtpValidationRequestImpl) _then)
      : super(_value, _then);

  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? restaurantId = null,
    Object? tableId = null,
    Object? otp = null,
    Object? phoneNumber = freezed,
    Object? name = freezed,
  }) {
    return _then(_$OtpValidationRequestImpl(
      restaurantId: null == restaurantId
          ? _value.restaurantId
          : restaurantId // ignore: cast_nullable_to_non_nullable
              as String,
      tableId: null == tableId
          ? _value.tableId
          : tableId // ignore: cast_nullable_to_non_nullable
              as String,
      otp: null == otp
          ? _value.otp
          : otp // ignore: cast_nullable_to_non_nullable
              as String,
      phoneNumber: freezed == phoneNumber
          ? _value.phoneNumber
          : phoneNumber // ignore: cast_nullable_to_non_nullable
              as String?,
      name: freezed == name
          ? _value.name
          : name // ignore: cast_nullable_to_non_nullable
              as String?,
    ));
  }
}

/// @nodoc
@JsonSerializable()
class _$OtpValidationRequestImpl implements _OtpValidationRequest {
  const _$OtpValidationRequestImpl(
      {required this.restaurantId,
      required this.tableId,
      required this.otp,
      this.phoneNumber,
      this.name});

  factory _$OtpValidationRequestImpl.fromJson(Map<String, dynamic> json) =>
      _$$OtpValidationRequestImplFromJson(json);

  @override
  final String restaurantId;
  @override
  final String tableId;
  @override
  final String otp;
  @override
  final String? phoneNumber;
// Optional based on backend logic
  @override
  final String? name;

  @override
  String toString() {
    return 'OtpValidationRequest(restaurantId: $restaurantId, tableId: $tableId, otp: $otp, phoneNumber: $phoneNumber, name: $name)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$OtpValidationRequestImpl &&
            (identical(other.restaurantId, restaurantId) ||
                other.restaurantId == restaurantId) &&
            (identical(other.tableId, tableId) || other.tableId == tableId) &&
            (identical(other.otp, otp) || other.otp == otp) &&
            (identical(other.phoneNumber, phoneNumber) ||
                other.phoneNumber == phoneNumber) &&
            (identical(other.name, name) || other.name == name));
  }

  @JsonKey(ignore: true)
  @override
  int get hashCode =>
      Object.hash(runtimeType, restaurantId, tableId, otp, phoneNumber, name);

  @JsonKey(ignore: true)
  @override
  @pragma('vm:prefer-inline')
  _$$OtpValidationRequestImplCopyWith<_$OtpValidationRequestImpl>
      get copyWith =>
          __$$OtpValidationRequestImplCopyWithImpl<_$OtpValidationRequestImpl>(
              this, _$identity);

  @override
  Map<String, dynamic> toJson() {
    return _$$OtpValidationRequestImplToJson(
      this,
    );
  }
}

abstract class _OtpValidationRequest implements OtpValidationRequest {
  const factory _OtpValidationRequest(
      {required final String restaurantId,
      required final String tableId,
      required final String otp,
      final String? phoneNumber,
      final String? name}) = _$OtpValidationRequestImpl;

  factory _OtpValidationRequest.fromJson(Map<String, dynamic> json) =
      _$OtpValidationRequestImpl.fromJson;

  @override
  String get restaurantId;
  @override
  String get tableId;
  @override
  String get otp;
  @override
  String? get phoneNumber;
  @override // Optional based on backend logic
  String? get name;
  @override
  @JsonKey(ignore: true)
  _$$OtpValidationRequestImplCopyWith<_$OtpValidationRequestImpl>
      get copyWith => throw _privateConstructorUsedError;
}

OtpValidationResponse _$OtpValidationResponseFromJson(
    Map<String, dynamic> json) {
  return _OtpValidationResponse.fromJson(json);
}

/// @nodoc
mixin _$OtpValidationResponse {
  String get status => throw _privateConstructorUsedError;
  String get sessionId =>
      throw _privateConstructorUsedError; // Should be 'success' on successful validation
  String? get customToken => throw _privateConstructorUsedError;
  bool get isPrimaryCustomer => throw _privateConstructorUsedError;

  Map<String, dynamic> toJson() => throw _privateConstructorUsedError;
  @JsonKey(ignore: true)
  $OtpValidationResponseCopyWith<OtpValidationResponse> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $OtpValidationResponseCopyWith<$Res> {
  factory $OtpValidationResponseCopyWith(OtpValidationResponse value,
          $Res Function(OtpValidationResponse) then) =
      _$OtpValidationResponseCopyWithImpl<$Res, OtpValidationResponse>;
  @useResult
  $Res call(
      {String status,
      String sessionId,
      String? customToken,
      bool isPrimaryCustomer});
}

/// @nodoc
class _$OtpValidationResponseCopyWithImpl<$Res,
        $Val extends OtpValidationResponse>
    implements $OtpValidationResponseCopyWith<$Res> {
  _$OtpValidationResponseCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? status = null,
    Object? sessionId = null,
    Object? customToken = freezed,
    Object? isPrimaryCustomer = null,
  }) {
    return _then(_value.copyWith(
      status: null == status
          ? _value.status
          : status // ignore: cast_nullable_to_non_nullable
              as String,
      sessionId: null == sessionId
          ? _value.sessionId
          : sessionId // ignore: cast_nullable_to_non_nullable
              as String,
      customToken: freezed == customToken
          ? _value.customToken
          : customToken // ignore: cast_nullable_to_non_nullable
              as String?,
      isPrimaryCustomer: null == isPrimaryCustomer
          ? _value.isPrimaryCustomer
          : isPrimaryCustomer // ignore: cast_nullable_to_non_nullable
              as bool,
    ) as $Val);
  }
}

/// @nodoc
abstract class _$$OtpValidationResponseImplCopyWith<$Res>
    implements $OtpValidationResponseCopyWith<$Res> {
  factory _$$OtpValidationResponseImplCopyWith(
          _$OtpValidationResponseImpl value,
          $Res Function(_$OtpValidationResponseImpl) then) =
      __$$OtpValidationResponseImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call(
      {String status,
      String sessionId,
      String? customToken,
      bool isPrimaryCustomer});
}

/// @nodoc
class __$$OtpValidationResponseImplCopyWithImpl<$Res>
    extends _$OtpValidationResponseCopyWithImpl<$Res,
        _$OtpValidationResponseImpl>
    implements _$$OtpValidationResponseImplCopyWith<$Res> {
  __$$OtpValidationResponseImplCopyWithImpl(_$OtpValidationResponseImpl _value,
      $Res Function(_$OtpValidationResponseImpl) _then)
      : super(_value, _then);

  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? status = null,
    Object? sessionId = null,
    Object? customToken = freezed,
    Object? isPrimaryCustomer = null,
  }) {
    return _then(_$OtpValidationResponseImpl(
      status: null == status
          ? _value.status
          : status // ignore: cast_nullable_to_non_nullable
              as String,
      sessionId: null == sessionId
          ? _value.sessionId
          : sessionId // ignore: cast_nullable_to_non_nullable
              as String,
      customToken: freezed == customToken
          ? _value.customToken
          : customToken // ignore: cast_nullable_to_non_nullable
              as String?,
      isPrimaryCustomer: null == isPrimaryCustomer
          ? _value.isPrimaryCustomer
          : isPrimaryCustomer // ignore: cast_nullable_to_non_nullable
              as bool,
    ));
  }
}

/// @nodoc
@JsonSerializable()
class _$OtpValidationResponseImpl extends _OtpValidationResponse {
  const _$OtpValidationResponseImpl(
      {required this.status,
      required this.sessionId,
      this.customToken,
      this.isPrimaryCustomer = false})
      : super._();

  factory _$OtpValidationResponseImpl.fromJson(Map<String, dynamic> json) =>
      _$$OtpValidationResponseImplFromJson(json);

  @override
  final String status;
  @override
  final String sessionId;
// Should be 'success' on successful validation
  @override
  final String? customToken;
  @override
  @JsonKey()
  final bool isPrimaryCustomer;

  @override
  String toString() {
    return 'OtpValidationResponse(status: $status, sessionId: $sessionId, customToken: $customToken, isPrimaryCustomer: $isPrimaryCustomer)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$OtpValidationResponseImpl &&
            (identical(other.status, status) || other.status == status) &&
            (identical(other.sessionId, sessionId) ||
                other.sessionId == sessionId) &&
            (identical(other.customToken, customToken) ||
                other.customToken == customToken) &&
            (identical(other.isPrimaryCustomer, isPrimaryCustomer) ||
                other.isPrimaryCustomer == isPrimaryCustomer));
  }

  @JsonKey(ignore: true)
  @override
  int get hashCode => Object.hash(
      runtimeType, status, sessionId, customToken, isPrimaryCustomer);

  @JsonKey(ignore: true)
  @override
  @pragma('vm:prefer-inline')
  _$$OtpValidationResponseImplCopyWith<_$OtpValidationResponseImpl>
      get copyWith => __$$OtpValidationResponseImplCopyWithImpl<
          _$OtpValidationResponseImpl>(this, _$identity);

  @override
  Map<String, dynamic> toJson() {
    return _$$OtpValidationResponseImplToJson(
      this,
    );
  }
}

abstract class _OtpValidationResponse extends OtpValidationResponse {
  const factory _OtpValidationResponse(
      {required final String status,
      required final String sessionId,
      final String? customToken,
      final bool isPrimaryCustomer}) = _$OtpValidationResponseImpl;
  const _OtpValidationResponse._() : super._();

  factory _OtpValidationResponse.fromJson(Map<String, dynamic> json) =
      _$OtpValidationResponseImpl.fromJson;

  @override
  String get status;
  @override
  String get sessionId;
  @override // Should be 'success' on successful validation
  String? get customToken;
  @override
  bool get isPrimaryCustomer;
  @override
  @JsonKey(ignore: true)
  _$$OtpValidationResponseImplCopyWith<_$OtpValidationResponseImpl>
      get copyWith => throw _privateConstructorUsedError;
}

OtpAskPrimaryCustomerResponse _$OtpAskPrimaryCustomerResponseFromJson(
    Map<String, dynamic> json) {
  return _OtpAskPrimaryCustomerResponse.fromJson(json);
}

/// @nodoc
mixin _$OtpAskPrimaryCustomerResponse {
  String get status =>
      throw _privateConstructorUsedError; // Should be 'ask_primary_customer'
  String get message => throw _privateConstructorUsedError;

  Map<String, dynamic> toJson() => throw _privateConstructorUsedError;
  @JsonKey(ignore: true)
  $OtpAskPrimaryCustomerResponseCopyWith<OtpAskPrimaryCustomerResponse>
      get copyWith => throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $OtpAskPrimaryCustomerResponseCopyWith<$Res> {
  factory $OtpAskPrimaryCustomerResponseCopyWith(
          OtpAskPrimaryCustomerResponse value,
          $Res Function(OtpAskPrimaryCustomerResponse) then) =
      _$OtpAskPrimaryCustomerResponseCopyWithImpl<$Res,
          OtpAskPrimaryCustomerResponse>;
  @useResult
  $Res call({String status, String message});
}

/// @nodoc
class _$OtpAskPrimaryCustomerResponseCopyWithImpl<$Res,
        $Val extends OtpAskPrimaryCustomerResponse>
    implements $OtpAskPrimaryCustomerResponseCopyWith<$Res> {
  _$OtpAskPrimaryCustomerResponseCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? status = null,
    Object? message = null,
  }) {
    return _then(_value.copyWith(
      status: null == status
          ? _value.status
          : status // ignore: cast_nullable_to_non_nullable
              as String,
      message: null == message
          ? _value.message
          : message // ignore: cast_nullable_to_non_nullable
              as String,
    ) as $Val);
  }
}

/// @nodoc
abstract class _$$OtpAskPrimaryCustomerResponseImplCopyWith<$Res>
    implements $OtpAskPrimaryCustomerResponseCopyWith<$Res> {
  factory _$$OtpAskPrimaryCustomerResponseImplCopyWith(
          _$OtpAskPrimaryCustomerResponseImpl value,
          $Res Function(_$OtpAskPrimaryCustomerResponseImpl) then) =
      __$$OtpAskPrimaryCustomerResponseImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call({String status, String message});
}

/// @nodoc
class __$$OtpAskPrimaryCustomerResponseImplCopyWithImpl<$Res>
    extends _$OtpAskPrimaryCustomerResponseCopyWithImpl<$Res,
        _$OtpAskPrimaryCustomerResponseImpl>
    implements _$$OtpAskPrimaryCustomerResponseImplCopyWith<$Res> {
  __$$OtpAskPrimaryCustomerResponseImplCopyWithImpl(
      _$OtpAskPrimaryCustomerResponseImpl _value,
      $Res Function(_$OtpAskPrimaryCustomerResponseImpl) _then)
      : super(_value, _then);

  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? status = null,
    Object? message = null,
  }) {
    return _then(_$OtpAskPrimaryCustomerResponseImpl(
      status: null == status
          ? _value.status
          : status // ignore: cast_nullable_to_non_nullable
              as String,
      message: null == message
          ? _value.message
          : message // ignore: cast_nullable_to_non_nullable
              as String,
    ));
  }
}

/// @nodoc
@JsonSerializable()
class _$OtpAskPrimaryCustomerResponseImpl
    implements _OtpAskPrimaryCustomerResponse {
  const _$OtpAskPrimaryCustomerResponseImpl(
      {required this.status, required this.message});

  factory _$OtpAskPrimaryCustomerResponseImpl.fromJson(
          Map<String, dynamic> json) =>
      _$$OtpAskPrimaryCustomerResponseImplFromJson(json);

  @override
  final String status;
// Should be 'ask_primary_customer'
  @override
  final String message;

  @override
  String toString() {
    return 'OtpAskPrimaryCustomerResponse(status: $status, message: $message)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$OtpAskPrimaryCustomerResponseImpl &&
            (identical(other.status, status) || other.status == status) &&
            (identical(other.message, message) || other.message == message));
  }

  @JsonKey(ignore: true)
  @override
  int get hashCode => Object.hash(runtimeType, status, message);

  @JsonKey(ignore: true)
  @override
  @pragma('vm:prefer-inline')
  _$$OtpAskPrimaryCustomerResponseImplCopyWith<
          _$OtpAskPrimaryCustomerResponseImpl>
      get copyWith => __$$OtpAskPrimaryCustomerResponseImplCopyWithImpl<
          _$OtpAskPrimaryCustomerResponseImpl>(this, _$identity);

  @override
  Map<String, dynamic> toJson() {
    return _$$OtpAskPrimaryCustomerResponseImplToJson(
      this,
    );
  }
}

abstract class _OtpAskPrimaryCustomerResponse
    implements OtpAskPrimaryCustomerResponse {
  const factory _OtpAskPrimaryCustomerResponse(
      {required final String status,
      required final String message}) = _$OtpAskPrimaryCustomerResponseImpl;

  factory _OtpAskPrimaryCustomerResponse.fromJson(Map<String, dynamic> json) =
      _$OtpAskPrimaryCustomerResponseImpl.fromJson;

  @override
  String get status;
  @override // Should be 'ask_primary_customer'
  String get message;
  @override
  @JsonKey(ignore: true)
  _$$OtpAskPrimaryCustomerResponseImplCopyWith<
          _$OtpAskPrimaryCustomerResponseImpl>
      get copyWith => throw _privateConstructorUsedError;
}

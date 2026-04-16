// coverage:ignore-file
// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'models.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

T _$identity<T>(T value) => value;

final _privateConstructorUsedError = UnsupportedError(
    'It seems like you constructed your class using `MyClass._()`. This constructor is only meant to be used by freezed and you are not supposed to need it nor use it.\nPlease check the documentation here for more information: https://github.com/rrousselGit/freezed#adding-getters-and-methods-to-our-models');

UserLocation _$UserLocationFromJson(Map<String, dynamic> json) {
  return _UserLocation.fromJson(json);
}

/// @nodoc
mixin _$UserLocation {
  /// Latitude coordinate
  double get latitude => throw _privateConstructorUsedError;

  /// Longitude coordinate
  double get longitude => throw _privateConstructorUsedError;

  Map<String, dynamic> toJson() => throw _privateConstructorUsedError;
  @JsonKey(ignore: true)
  $UserLocationCopyWith<UserLocation> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $UserLocationCopyWith<$Res> {
  factory $UserLocationCopyWith(
          UserLocation value, $Res Function(UserLocation) then) =
      _$UserLocationCopyWithImpl<$Res, UserLocation>;
  @useResult
  $Res call({double latitude, double longitude});
}

/// @nodoc
class _$UserLocationCopyWithImpl<$Res, $Val extends UserLocation>
    implements $UserLocationCopyWith<$Res> {
  _$UserLocationCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? latitude = null,
    Object? longitude = null,
  }) {
    return _then(_value.copyWith(
      latitude: null == latitude
          ? _value.latitude
          : latitude // ignore: cast_nullable_to_non_nullable
              as double,
      longitude: null == longitude
          ? _value.longitude
          : longitude // ignore: cast_nullable_to_non_nullable
              as double,
    ) as $Val);
  }
}

/// @nodoc
abstract class _$$UserLocationImplCopyWith<$Res>
    implements $UserLocationCopyWith<$Res> {
  factory _$$UserLocationImplCopyWith(
          _$UserLocationImpl value, $Res Function(_$UserLocationImpl) then) =
      __$$UserLocationImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call({double latitude, double longitude});
}

/// @nodoc
class __$$UserLocationImplCopyWithImpl<$Res>
    extends _$UserLocationCopyWithImpl<$Res, _$UserLocationImpl>
    implements _$$UserLocationImplCopyWith<$Res> {
  __$$UserLocationImplCopyWithImpl(
      _$UserLocationImpl _value, $Res Function(_$UserLocationImpl) _then)
      : super(_value, _then);

  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? latitude = null,
    Object? longitude = null,
  }) {
    return _then(_$UserLocationImpl(
      latitude: null == latitude
          ? _value.latitude
          : latitude // ignore: cast_nullable_to_non_nullable
              as double,
      longitude: null == longitude
          ? _value.longitude
          : longitude // ignore: cast_nullable_to_non_nullable
              as double,
    ));
  }
}

/// @nodoc
@JsonSerializable()
class _$UserLocationImpl implements _UserLocation {
  const _$UserLocationImpl({required this.latitude, required this.longitude});

  factory _$UserLocationImpl.fromJson(Map<String, dynamic> json) =>
      _$$UserLocationImplFromJson(json);

  /// Latitude coordinate
  @override
  final double latitude;

  /// Longitude coordinate
  @override
  final double longitude;

  @override
  String toString() {
    return 'UserLocation(latitude: $latitude, longitude: $longitude)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$UserLocationImpl &&
            (identical(other.latitude, latitude) ||
                other.latitude == latitude) &&
            (identical(other.longitude, longitude) ||
                other.longitude == longitude));
  }

  @JsonKey(ignore: true)
  @override
  int get hashCode => Object.hash(runtimeType, latitude, longitude);

  @JsonKey(ignore: true)
  @override
  @pragma('vm:prefer-inline')
  _$$UserLocationImplCopyWith<_$UserLocationImpl> get copyWith =>
      __$$UserLocationImplCopyWithImpl<_$UserLocationImpl>(this, _$identity);

  @override
  Map<String, dynamic> toJson() {
    return _$$UserLocationImplToJson(
      this,
    );
  }
}

abstract class _UserLocation implements UserLocation {
  const factory _UserLocation(
      {required final double latitude,
      required final double longitude}) = _$UserLocationImpl;

  factory _UserLocation.fromJson(Map<String, dynamic> json) =
      _$UserLocationImpl.fromJson;

  @override

  /// Latitude coordinate
  double get latitude;
  @override

  /// Longitude coordinate
  double get longitude;
  @override
  @JsonKey(ignore: true)
  _$$UserLocationImplCopyWith<_$UserLocationImpl> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
mixin _$TableValidationResponse {
  /// Status of the validation ('success', 'error', etc.)
  String get status => throw _privateConstructorUsedError;

  /// Message describing the validation result
  String get message => throw _privateConstructorUsedError;

  /// Additional data from the response
  Map<String, dynamic>? get data => throw _privateConstructorUsedError;

  /// Whether OTP verification is required
  bool get requiresOtp => throw _privateConstructorUsedError;

  @JsonKey(ignore: true)
  $TableValidationResponseCopyWith<TableValidationResponse> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $TableValidationResponseCopyWith<$Res> {
  factory $TableValidationResponseCopyWith(TableValidationResponse value,
          $Res Function(TableValidationResponse) then) =
      _$TableValidationResponseCopyWithImpl<$Res, TableValidationResponse>;
  @useResult
  $Res call(
      {String status,
      String message,
      Map<String, dynamic>? data,
      bool requiresOtp});
}

/// @nodoc
class _$TableValidationResponseCopyWithImpl<$Res,
        $Val extends TableValidationResponse>
    implements $TableValidationResponseCopyWith<$Res> {
  _$TableValidationResponseCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? status = null,
    Object? message = null,
    Object? data = freezed,
    Object? requiresOtp = null,
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
      data: freezed == data
          ? _value.data
          : data // ignore: cast_nullable_to_non_nullable
              as Map<String, dynamic>?,
      requiresOtp: null == requiresOtp
          ? _value.requiresOtp
          : requiresOtp // ignore: cast_nullable_to_non_nullable
              as bool,
    ) as $Val);
  }
}

/// @nodoc
abstract class _$$TableValidationResponseImplCopyWith<$Res>
    implements $TableValidationResponseCopyWith<$Res> {
  factory _$$TableValidationResponseImplCopyWith(
          _$TableValidationResponseImpl value,
          $Res Function(_$TableValidationResponseImpl) then) =
      __$$TableValidationResponseImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call(
      {String status,
      String message,
      Map<String, dynamic>? data,
      bool requiresOtp});
}

/// @nodoc
class __$$TableValidationResponseImplCopyWithImpl<$Res>
    extends _$TableValidationResponseCopyWithImpl<$Res,
        _$TableValidationResponseImpl>
    implements _$$TableValidationResponseImplCopyWith<$Res> {
  __$$TableValidationResponseImplCopyWithImpl(
      _$TableValidationResponseImpl _value,
      $Res Function(_$TableValidationResponseImpl) _then)
      : super(_value, _then);

  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? status = null,
    Object? message = null,
    Object? data = freezed,
    Object? requiresOtp = null,
  }) {
    return _then(_$TableValidationResponseImpl(
      status: null == status
          ? _value.status
          : status // ignore: cast_nullable_to_non_nullable
              as String,
      message: null == message
          ? _value.message
          : message // ignore: cast_nullable_to_non_nullable
              as String,
      data: freezed == data
          ? _value._data
          : data // ignore: cast_nullable_to_non_nullable
              as Map<String, dynamic>?,
      requiresOtp: null == requiresOtp
          ? _value.requiresOtp
          : requiresOtp // ignore: cast_nullable_to_non_nullable
              as bool,
    ));
  }
}

/// @nodoc

class _$TableValidationResponseImpl extends _TableValidationResponse {
  const _$TableValidationResponseImpl(
      {required this.status,
      required this.message,
      final Map<String, dynamic>? data,
      this.requiresOtp = false})
      : _data = data,
        super._();

  /// Status of the validation ('success', 'error', etc.)
  @override
  final String status;

  /// Message describing the validation result
  @override
  final String message;

  /// Additional data from the response
  final Map<String, dynamic>? _data;

  /// Additional data from the response
  @override
  Map<String, dynamic>? get data {
    final value = _data;
    if (value == null) return null;
    if (_data is EqualUnmodifiableMapView) return _data;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableMapView(value);
  }

  /// Whether OTP verification is required
  @override
  @JsonKey()
  final bool requiresOtp;

  @override
  String toString() {
    return 'TableValidationResponse(status: $status, message: $message, data: $data, requiresOtp: $requiresOtp)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$TableValidationResponseImpl &&
            (identical(other.status, status) || other.status == status) &&
            (identical(other.message, message) || other.message == message) &&
            const DeepCollectionEquality().equals(other._data, _data) &&
            (identical(other.requiresOtp, requiresOtp) ||
                other.requiresOtp == requiresOtp));
  }

  @override
  int get hashCode => Object.hash(runtimeType, status, message,
      const DeepCollectionEquality().hash(_data), requiresOtp);

  @JsonKey(ignore: true)
  @override
  @pragma('vm:prefer-inline')
  _$$TableValidationResponseImplCopyWith<_$TableValidationResponseImpl>
      get copyWith => __$$TableValidationResponseImplCopyWithImpl<
          _$TableValidationResponseImpl>(this, _$identity);
}

abstract class _TableValidationResponse extends TableValidationResponse {
  const factory _TableValidationResponse(
      {required final String status,
      required final String message,
      final Map<String, dynamic>? data,
      final bool requiresOtp}) = _$TableValidationResponseImpl;
  const _TableValidationResponse._() : super._();

  @override

  /// Status of the validation ('success', 'error', etc.)
  String get status;
  @override

  /// Message describing the validation result
  String get message;
  @override

  /// Additional data from the response
  Map<String, dynamic>? get data;
  @override

  /// Whether OTP verification is required
  bool get requiresOtp;
  @override
  @JsonKey(ignore: true)
  _$$TableValidationResponseImplCopyWith<_$TableValidationResponseImpl>
      get copyWith => throw _privateConstructorUsedError;
}

/// @nodoc
mixin _$TableValidationException {
  /// Error message
  String get message => throw _privateConstructorUsedError;

  /// Optional error code
  String? get code => throw _privateConstructorUsedError;

  /// Optional stack trace
  StackTrace? get stackTrace => throw _privateConstructorUsedError;

  @JsonKey(ignore: true)
  $TableValidationExceptionCopyWith<TableValidationException> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $TableValidationExceptionCopyWith<$Res> {
  factory $TableValidationExceptionCopyWith(TableValidationException value,
          $Res Function(TableValidationException) then) =
      _$TableValidationExceptionCopyWithImpl<$Res, TableValidationException>;
  @useResult
  $Res call({String message, String? code, StackTrace? stackTrace});
}

/// @nodoc
class _$TableValidationExceptionCopyWithImpl<$Res,
        $Val extends TableValidationException>
    implements $TableValidationExceptionCopyWith<$Res> {
  _$TableValidationExceptionCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? message = null,
    Object? code = freezed,
    Object? stackTrace = freezed,
  }) {
    return _then(_value.copyWith(
      message: null == message
          ? _value.message
          : message // ignore: cast_nullable_to_non_nullable
              as String,
      code: freezed == code
          ? _value.code
          : code // ignore: cast_nullable_to_non_nullable
              as String?,
      stackTrace: freezed == stackTrace
          ? _value.stackTrace
          : stackTrace // ignore: cast_nullable_to_non_nullable
              as StackTrace?,
    ) as $Val);
  }
}

/// @nodoc
abstract class _$$TableValidationExceptionImplCopyWith<$Res>
    implements $TableValidationExceptionCopyWith<$Res> {
  factory _$$TableValidationExceptionImplCopyWith(
          _$TableValidationExceptionImpl value,
          $Res Function(_$TableValidationExceptionImpl) then) =
      __$$TableValidationExceptionImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call({String message, String? code, StackTrace? stackTrace});
}

/// @nodoc
class __$$TableValidationExceptionImplCopyWithImpl<$Res>
    extends _$TableValidationExceptionCopyWithImpl<$Res,
        _$TableValidationExceptionImpl>
    implements _$$TableValidationExceptionImplCopyWith<$Res> {
  __$$TableValidationExceptionImplCopyWithImpl(
      _$TableValidationExceptionImpl _value,
      $Res Function(_$TableValidationExceptionImpl) _then)
      : super(_value, _then);

  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? message = null,
    Object? code = freezed,
    Object? stackTrace = freezed,
  }) {
    return _then(_$TableValidationExceptionImpl(
      null == message
          ? _value.message
          : message // ignore: cast_nullable_to_non_nullable
              as String,
      code: freezed == code
          ? _value.code
          : code // ignore: cast_nullable_to_non_nullable
              as String?,
      stackTrace: freezed == stackTrace
          ? _value.stackTrace
          : stackTrace // ignore: cast_nullable_to_non_nullable
              as StackTrace?,
    ));
  }
}

/// @nodoc

class _$TableValidationExceptionImpl implements _TableValidationException {
  const _$TableValidationExceptionImpl(this.message,
      {this.code, this.stackTrace});

  /// Error message
  @override
  final String message;

  /// Optional error code
  @override
  final String? code;

  /// Optional stack trace
  @override
  final StackTrace? stackTrace;

  @override
  String toString() {
    return 'TableValidationException(message: $message, code: $code, stackTrace: $stackTrace)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$TableValidationExceptionImpl &&
            (identical(other.message, message) || other.message == message) &&
            (identical(other.code, code) || other.code == code) &&
            (identical(other.stackTrace, stackTrace) ||
                other.stackTrace == stackTrace));
  }

  @override
  int get hashCode => Object.hash(runtimeType, message, code, stackTrace);

  @JsonKey(ignore: true)
  @override
  @pragma('vm:prefer-inline')
  _$$TableValidationExceptionImplCopyWith<_$TableValidationExceptionImpl>
      get copyWith => __$$TableValidationExceptionImplCopyWithImpl<
          _$TableValidationExceptionImpl>(this, _$identity);
}

abstract class _TableValidationException implements TableValidationException {
  const factory _TableValidationException(final String message,
      {final String? code,
      final StackTrace? stackTrace}) = _$TableValidationExceptionImpl;

  @override

  /// Error message
  String get message;
  @override

  /// Optional error code
  String? get code;
  @override

  /// Optional stack trace
  StackTrace? get stackTrace;
  @override
  @JsonKey(ignore: true)
  _$$TableValidationExceptionImplCopyWith<_$TableValidationExceptionImpl>
      get copyWith => throw _privateConstructorUsedError;
}

// coverage:ignore-file
// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'api_response_freezed.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

T _$identity<T>(T value) => value;

final _privateConstructorUsedError = UnsupportedError(
    'It seems like you constructed your class using `MyClass._()`. This constructor is only meant to be used by freezed and you are not supposed to need it nor use it.\nPlease check the documentation here for more information: https://github.com/rrousselGit/freezed#adding-getters-and-methods-to-our-models');

/// @nodoc
mixin _$ApiResponseFreezed<T> {
  String get message => throw _privateConstructorUsedError;
  @optionalTypeArgs
  TResult when<TResult extends Object?>({
    required TResult Function(T data, String message) success,
    required TResult Function(String message, String? errorCode,
            Map<String, dynamic>? errorDetails)
        error,
  }) =>
      throw _privateConstructorUsedError;
  @optionalTypeArgs
  TResult? whenOrNull<TResult extends Object?>({
    TResult? Function(T data, String message)? success,
    TResult? Function(String message, String? errorCode,
            Map<String, dynamic>? errorDetails)?
        error,
  }) =>
      throw _privateConstructorUsedError;
  @optionalTypeArgs
  TResult maybeWhen<TResult extends Object?>({
    TResult Function(T data, String message)? success,
    TResult Function(String message, String? errorCode,
            Map<String, dynamic>? errorDetails)?
        error,
    required TResult orElse(),
  }) =>
      throw _privateConstructorUsedError;
  @optionalTypeArgs
  TResult map<TResult extends Object?>({
    required TResult Function(_ApiSuccess<T> value) success,
    required TResult Function(_ApiError<T> value) error,
  }) =>
      throw _privateConstructorUsedError;
  @optionalTypeArgs
  TResult? mapOrNull<TResult extends Object?>({
    TResult? Function(_ApiSuccess<T> value)? success,
    TResult? Function(_ApiError<T> value)? error,
  }) =>
      throw _privateConstructorUsedError;
  @optionalTypeArgs
  TResult maybeMap<TResult extends Object?>({
    TResult Function(_ApiSuccess<T> value)? success,
    TResult Function(_ApiError<T> value)? error,
    required TResult orElse(),
  }) =>
      throw _privateConstructorUsedError;

  @JsonKey(ignore: true)
  $ApiResponseFreezedCopyWith<T, ApiResponseFreezed<T>> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $ApiResponseFreezedCopyWith<T, $Res> {
  factory $ApiResponseFreezedCopyWith(ApiResponseFreezed<T> value,
          $Res Function(ApiResponseFreezed<T>) then) =
      _$ApiResponseFreezedCopyWithImpl<T, $Res, ApiResponseFreezed<T>>;
  @useResult
  $Res call({String message});
}

/// @nodoc
class _$ApiResponseFreezedCopyWithImpl<T, $Res,
        $Val extends ApiResponseFreezed<T>>
    implements $ApiResponseFreezedCopyWith<T, $Res> {
  _$ApiResponseFreezedCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? message = null,
  }) {
    return _then(_value.copyWith(
      message: null == message
          ? _value.message
          : message // ignore: cast_nullable_to_non_nullable
              as String,
    ) as $Val);
  }
}

/// @nodoc
abstract class _$$ApiSuccessImplCopyWith<T, $Res>
    implements $ApiResponseFreezedCopyWith<T, $Res> {
  factory _$$ApiSuccessImplCopyWith(
          _$ApiSuccessImpl<T> value, $Res Function(_$ApiSuccessImpl<T>) then) =
      __$$ApiSuccessImplCopyWithImpl<T, $Res>;
  @override
  @useResult
  $Res call({T data, String message});
}

/// @nodoc
class __$$ApiSuccessImplCopyWithImpl<T, $Res>
    extends _$ApiResponseFreezedCopyWithImpl<T, $Res, _$ApiSuccessImpl<T>>
    implements _$$ApiSuccessImplCopyWith<T, $Res> {
  __$$ApiSuccessImplCopyWithImpl(
      _$ApiSuccessImpl<T> _value, $Res Function(_$ApiSuccessImpl<T>) _then)
      : super(_value, _then);

  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? data = freezed,
    Object? message = null,
  }) {
    return _then(_$ApiSuccessImpl<T>(
      data: freezed == data
          ? _value.data
          : data // ignore: cast_nullable_to_non_nullable
              as T,
      message: null == message
          ? _value.message
          : message // ignore: cast_nullable_to_non_nullable
              as String,
    ));
  }
}

/// @nodoc

class _$ApiSuccessImpl<T> extends _ApiSuccess<T> {
  const _$ApiSuccessImpl({required this.data, this.message = 'Success'})
      : super._();

  @override
  final T data;
  @override
  @JsonKey()
  final String message;

  @override
  String toString() {
    return 'ApiResponseFreezed<$T>.success(data: $data, message: $message)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$ApiSuccessImpl<T> &&
            const DeepCollectionEquality().equals(other.data, data) &&
            (identical(other.message, message) || other.message == message));
  }

  @override
  int get hashCode => Object.hash(
      runtimeType, const DeepCollectionEquality().hash(data), message);

  @JsonKey(ignore: true)
  @override
  @pragma('vm:prefer-inline')
  _$$ApiSuccessImplCopyWith<T, _$ApiSuccessImpl<T>> get copyWith =>
      __$$ApiSuccessImplCopyWithImpl<T, _$ApiSuccessImpl<T>>(this, _$identity);

  @override
  @optionalTypeArgs
  TResult when<TResult extends Object?>({
    required TResult Function(T data, String message) success,
    required TResult Function(String message, String? errorCode,
            Map<String, dynamic>? errorDetails)
        error,
  }) {
    return success(data, message);
  }

  @override
  @optionalTypeArgs
  TResult? whenOrNull<TResult extends Object?>({
    TResult? Function(T data, String message)? success,
    TResult? Function(String message, String? errorCode,
            Map<String, dynamic>? errorDetails)?
        error,
  }) {
    return success?.call(data, message);
  }

  @override
  @optionalTypeArgs
  TResult maybeWhen<TResult extends Object?>({
    TResult Function(T data, String message)? success,
    TResult Function(String message, String? errorCode,
            Map<String, dynamic>? errorDetails)?
        error,
    required TResult orElse(),
  }) {
    if (success != null) {
      return success(data, message);
    }
    return orElse();
  }

  @override
  @optionalTypeArgs
  TResult map<TResult extends Object?>({
    required TResult Function(_ApiSuccess<T> value) success,
    required TResult Function(_ApiError<T> value) error,
  }) {
    return success(this);
  }

  @override
  @optionalTypeArgs
  TResult? mapOrNull<TResult extends Object?>({
    TResult? Function(_ApiSuccess<T> value)? success,
    TResult? Function(_ApiError<T> value)? error,
  }) {
    return success?.call(this);
  }

  @override
  @optionalTypeArgs
  TResult maybeMap<TResult extends Object?>({
    TResult Function(_ApiSuccess<T> value)? success,
    TResult Function(_ApiError<T> value)? error,
    required TResult orElse(),
  }) {
    if (success != null) {
      return success(this);
    }
    return orElse();
  }
}

abstract class _ApiSuccess<T> extends ApiResponseFreezed<T> {
  const factory _ApiSuccess({required final T data, final String message}) =
      _$ApiSuccessImpl<T>;
  const _ApiSuccess._() : super._();

  T get data;
  @override
  String get message;
  @override
  @JsonKey(ignore: true)
  _$$ApiSuccessImplCopyWith<T, _$ApiSuccessImpl<T>> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class _$$ApiErrorImplCopyWith<T, $Res>
    implements $ApiResponseFreezedCopyWith<T, $Res> {
  factory _$$ApiErrorImplCopyWith(
          _$ApiErrorImpl<T> value, $Res Function(_$ApiErrorImpl<T>) then) =
      __$$ApiErrorImplCopyWithImpl<T, $Res>;
  @override
  @useResult
  $Res call(
      {String message, String? errorCode, Map<String, dynamic>? errorDetails});
}

/// @nodoc
class __$$ApiErrorImplCopyWithImpl<T, $Res>
    extends _$ApiResponseFreezedCopyWithImpl<T, $Res, _$ApiErrorImpl<T>>
    implements _$$ApiErrorImplCopyWith<T, $Res> {
  __$$ApiErrorImplCopyWithImpl(
      _$ApiErrorImpl<T> _value, $Res Function(_$ApiErrorImpl<T>) _then)
      : super(_value, _then);

  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? message = null,
    Object? errorCode = freezed,
    Object? errorDetails = freezed,
  }) {
    return _then(_$ApiErrorImpl<T>(
      message: null == message
          ? _value.message
          : message // ignore: cast_nullable_to_non_nullable
              as String,
      errorCode: freezed == errorCode
          ? _value.errorCode
          : errorCode // ignore: cast_nullable_to_non_nullable
              as String?,
      errorDetails: freezed == errorDetails
          ? _value._errorDetails
          : errorDetails // ignore: cast_nullable_to_non_nullable
              as Map<String, dynamic>?,
    ));
  }
}

/// @nodoc

class _$ApiErrorImpl<T> extends _ApiError<T> {
  const _$ApiErrorImpl(
      {required this.message,
      this.errorCode,
      final Map<String, dynamic>? errorDetails})
      : _errorDetails = errorDetails,
        super._();

  @override
  final String message;
  @override
  final String? errorCode;
  final Map<String, dynamic>? _errorDetails;
  @override
  Map<String, dynamic>? get errorDetails {
    final value = _errorDetails;
    if (value == null) return null;
    if (_errorDetails is EqualUnmodifiableMapView) return _errorDetails;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableMapView(value);
  }

  @override
  String toString() {
    return 'ApiResponseFreezed<$T>.error(message: $message, errorCode: $errorCode, errorDetails: $errorDetails)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$ApiErrorImpl<T> &&
            (identical(other.message, message) || other.message == message) &&
            (identical(other.errorCode, errorCode) ||
                other.errorCode == errorCode) &&
            const DeepCollectionEquality()
                .equals(other._errorDetails, _errorDetails));
  }

  @override
  int get hashCode => Object.hash(runtimeType, message, errorCode,
      const DeepCollectionEquality().hash(_errorDetails));

  @JsonKey(ignore: true)
  @override
  @pragma('vm:prefer-inline')
  _$$ApiErrorImplCopyWith<T, _$ApiErrorImpl<T>> get copyWith =>
      __$$ApiErrorImplCopyWithImpl<T, _$ApiErrorImpl<T>>(this, _$identity);

  @override
  @optionalTypeArgs
  TResult when<TResult extends Object?>({
    required TResult Function(T data, String message) success,
    required TResult Function(String message, String? errorCode,
            Map<String, dynamic>? errorDetails)
        error,
  }) {
    return error(message, errorCode, errorDetails);
  }

  @override
  @optionalTypeArgs
  TResult? whenOrNull<TResult extends Object?>({
    TResult? Function(T data, String message)? success,
    TResult? Function(String message, String? errorCode,
            Map<String, dynamic>? errorDetails)?
        error,
  }) {
    return error?.call(message, errorCode, errorDetails);
  }

  @override
  @optionalTypeArgs
  TResult maybeWhen<TResult extends Object?>({
    TResult Function(T data, String message)? success,
    TResult Function(String message, String? errorCode,
            Map<String, dynamic>? errorDetails)?
        error,
    required TResult orElse(),
  }) {
    if (error != null) {
      return error(message, errorCode, errorDetails);
    }
    return orElse();
  }

  @override
  @optionalTypeArgs
  TResult map<TResult extends Object?>({
    required TResult Function(_ApiSuccess<T> value) success,
    required TResult Function(_ApiError<T> value) error,
  }) {
    return error(this);
  }

  @override
  @optionalTypeArgs
  TResult? mapOrNull<TResult extends Object?>({
    TResult? Function(_ApiSuccess<T> value)? success,
    TResult? Function(_ApiError<T> value)? error,
  }) {
    return error?.call(this);
  }

  @override
  @optionalTypeArgs
  TResult maybeMap<TResult extends Object?>({
    TResult Function(_ApiSuccess<T> value)? success,
    TResult Function(_ApiError<T> value)? error,
    required TResult orElse(),
  }) {
    if (error != null) {
      return error(this);
    }
    return orElse();
  }
}

abstract class _ApiError<T> extends ApiResponseFreezed<T> {
  const factory _ApiError(
      {required final String message,
      final String? errorCode,
      final Map<String, dynamic>? errorDetails}) = _$ApiErrorImpl<T>;
  const _ApiError._() : super._();

  @override
  String get message;
  String? get errorCode;
  Map<String, dynamic>? get errorDetails;
  @override
  @JsonKey(ignore: true)
  _$$ApiErrorImplCopyWith<T, _$ApiErrorImpl<T>> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
mixin _$ErrorDetailsFreezed {
  String get message => throw _privateConstructorUsedError;
  String get code => throw _privateConstructorUsedError;
  Map<String, dynamic>? get details => throw _privateConstructorUsedError;

  @JsonKey(ignore: true)
  $ErrorDetailsFreezedCopyWith<ErrorDetailsFreezed> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $ErrorDetailsFreezedCopyWith<$Res> {
  factory $ErrorDetailsFreezedCopyWith(
          ErrorDetailsFreezed value, $Res Function(ErrorDetailsFreezed) then) =
      _$ErrorDetailsFreezedCopyWithImpl<$Res, ErrorDetailsFreezed>;
  @useResult
  $Res call({String message, String code, Map<String, dynamic>? details});
}

/// @nodoc
class _$ErrorDetailsFreezedCopyWithImpl<$Res, $Val extends ErrorDetailsFreezed>
    implements $ErrorDetailsFreezedCopyWith<$Res> {
  _$ErrorDetailsFreezedCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? message = null,
    Object? code = null,
    Object? details = freezed,
  }) {
    return _then(_value.copyWith(
      message: null == message
          ? _value.message
          : message // ignore: cast_nullable_to_non_nullable
              as String,
      code: null == code
          ? _value.code
          : code // ignore: cast_nullable_to_non_nullable
              as String,
      details: freezed == details
          ? _value.details
          : details // ignore: cast_nullable_to_non_nullable
              as Map<String, dynamic>?,
    ) as $Val);
  }
}

/// @nodoc
abstract class _$$ErrorDetailsFreezedImplCopyWith<$Res>
    implements $ErrorDetailsFreezedCopyWith<$Res> {
  factory _$$ErrorDetailsFreezedImplCopyWith(_$ErrorDetailsFreezedImpl value,
          $Res Function(_$ErrorDetailsFreezedImpl) then) =
      __$$ErrorDetailsFreezedImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call({String message, String code, Map<String, dynamic>? details});
}

/// @nodoc
class __$$ErrorDetailsFreezedImplCopyWithImpl<$Res>
    extends _$ErrorDetailsFreezedCopyWithImpl<$Res, _$ErrorDetailsFreezedImpl>
    implements _$$ErrorDetailsFreezedImplCopyWith<$Res> {
  __$$ErrorDetailsFreezedImplCopyWithImpl(_$ErrorDetailsFreezedImpl _value,
      $Res Function(_$ErrorDetailsFreezedImpl) _then)
      : super(_value, _then);

  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? message = null,
    Object? code = null,
    Object? details = freezed,
  }) {
    return _then(_$ErrorDetailsFreezedImpl(
      message: null == message
          ? _value.message
          : message // ignore: cast_nullable_to_non_nullable
              as String,
      code: null == code
          ? _value.code
          : code // ignore: cast_nullable_to_non_nullable
              as String,
      details: freezed == details
          ? _value._details
          : details // ignore: cast_nullable_to_non_nullable
              as Map<String, dynamic>?,
    ));
  }
}

/// @nodoc

class _$ErrorDetailsFreezedImpl extends _ErrorDetailsFreezed {
  const _$ErrorDetailsFreezedImpl(
      {required this.message,
      required this.code,
      final Map<String, dynamic>? details})
      : _details = details,
        super._();

  @override
  final String message;
  @override
  final String code;
  final Map<String, dynamic>? _details;
  @override
  Map<String, dynamic>? get details {
    final value = _details;
    if (value == null) return null;
    if (_details is EqualUnmodifiableMapView) return _details;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableMapView(value);
  }

  @override
  String toString() {
    return 'ErrorDetailsFreezed(message: $message, code: $code, details: $details)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$ErrorDetailsFreezedImpl &&
            (identical(other.message, message) || other.message == message) &&
            (identical(other.code, code) || other.code == code) &&
            const DeepCollectionEquality().equals(other._details, _details));
  }

  @override
  int get hashCode => Object.hash(runtimeType, message, code,
      const DeepCollectionEquality().hash(_details));

  @JsonKey(ignore: true)
  @override
  @pragma('vm:prefer-inline')
  _$$ErrorDetailsFreezedImplCopyWith<_$ErrorDetailsFreezedImpl> get copyWith =>
      __$$ErrorDetailsFreezedImplCopyWithImpl<_$ErrorDetailsFreezedImpl>(
          this, _$identity);
}

abstract class _ErrorDetailsFreezed extends ErrorDetailsFreezed {
  const factory _ErrorDetailsFreezed(
      {required final String message,
      required final String code,
      final Map<String, dynamic>? details}) = _$ErrorDetailsFreezedImpl;
  const _ErrorDetailsFreezed._() : super._();

  @override
  String get message;
  @override
  String get code;
  @override
  Map<String, dynamic>? get details;
  @override
  @JsonKey(ignore: true)
  _$$ErrorDetailsFreezedImplCopyWith<_$ErrorDetailsFreezedImpl> get copyWith =>
      throw _privateConstructorUsedError;
}

// coverage:ignore-file
// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'cart_operation_response.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

T _$identity<T>(T value) => value;

final _privateConstructorUsedError = UnsupportedError(
    'It seems like you constructed your class using `MyClass._()`. This constructor is only meant to be used by freezed and you are not supposed to need it nor use it.\nPlease check the documentation here for more information: https://github.com/rrousselGit/freezed#adding-getters-and-methods-to-our-models');

/// @nodoc
mixin _$CartOperationResponse {
  String get message => throw _privateConstructorUsedError;
  String get status => throw _privateConstructorUsedError;
  @CartResponseDataConverter()
  CartResponseData? get data => throw _privateConstructorUsedError;

  @JsonKey(ignore: true)
  $CartOperationResponseCopyWith<CartOperationResponse> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $CartOperationResponseCopyWith<$Res> {
  factory $CartOperationResponseCopyWith(CartOperationResponse value,
          $Res Function(CartOperationResponse) then) =
      _$CartOperationResponseCopyWithImpl<$Res, CartOperationResponse>;
  @useResult
  $Res call(
      {String message,
      String status,
      @CartResponseDataConverter() CartResponseData? data});

  $CartResponseDataCopyWith<$Res>? get data;
}

/// @nodoc
class _$CartOperationResponseCopyWithImpl<$Res,
        $Val extends CartOperationResponse>
    implements $CartOperationResponseCopyWith<$Res> {
  _$CartOperationResponseCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? message = null,
    Object? status = null,
    Object? data = freezed,
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
      data: freezed == data
          ? _value.data
          : data // ignore: cast_nullable_to_non_nullable
              as CartResponseData?,
    ) as $Val);
  }

  @override
  @pragma('vm:prefer-inline')
  $CartResponseDataCopyWith<$Res>? get data {
    if (_value.data == null) {
      return null;
    }

    return $CartResponseDataCopyWith<$Res>(_value.data!, (value) {
      return _then(_value.copyWith(data: value) as $Val);
    });
  }
}

/// @nodoc
abstract class _$$CartOperationResponseImplCopyWith<$Res>
    implements $CartOperationResponseCopyWith<$Res> {
  factory _$$CartOperationResponseImplCopyWith(
          _$CartOperationResponseImpl value,
          $Res Function(_$CartOperationResponseImpl) then) =
      __$$CartOperationResponseImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call(
      {String message,
      String status,
      @CartResponseDataConverter() CartResponseData? data});

  @override
  $CartResponseDataCopyWith<$Res>? get data;
}

/// @nodoc
class __$$CartOperationResponseImplCopyWithImpl<$Res>
    extends _$CartOperationResponseCopyWithImpl<$Res,
        _$CartOperationResponseImpl>
    implements _$$CartOperationResponseImplCopyWith<$Res> {
  __$$CartOperationResponseImplCopyWithImpl(_$CartOperationResponseImpl _value,
      $Res Function(_$CartOperationResponseImpl) _then)
      : super(_value, _then);

  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? message = null,
    Object? status = null,
    Object? data = freezed,
  }) {
    return _then(_$CartOperationResponseImpl(
      message: null == message
          ? _value.message
          : message // ignore: cast_nullable_to_non_nullable
              as String,
      status: null == status
          ? _value.status
          : status // ignore: cast_nullable_to_non_nullable
              as String,
      data: freezed == data
          ? _value.data
          : data // ignore: cast_nullable_to_non_nullable
              as CartResponseData?,
    ));
  }
}

/// @nodoc

@JsonSerializable(explicitToJson: true)
class _$CartOperationResponseImpl implements _CartOperationResponse {
  _$CartOperationResponseImpl(
      {required this.message,
      required this.status,
      @CartResponseDataConverter() this.data});

  @override
  final String message;
  @override
  final String status;
  @override
  @CartResponseDataConverter()
  final CartResponseData? data;

  @override
  String toString() {
    return 'CartOperationResponse(message: $message, status: $status, data: $data)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$CartOperationResponseImpl &&
            (identical(other.message, message) || other.message == message) &&
            (identical(other.status, status) || other.status == status) &&
            (identical(other.data, data) || other.data == data));
  }

  @override
  int get hashCode => Object.hash(runtimeType, message, status, data);

  @JsonKey(ignore: true)
  @override
  @pragma('vm:prefer-inline')
  _$$CartOperationResponseImplCopyWith<_$CartOperationResponseImpl>
      get copyWith => __$$CartOperationResponseImplCopyWithImpl<
          _$CartOperationResponseImpl>(this, _$identity);
}

abstract class _CartOperationResponse implements CartOperationResponse {
  factory _CartOperationResponse(
          {required final String message,
          required final String status,
          @CartResponseDataConverter() final CartResponseData? data}) =
      _$CartOperationResponseImpl;

  @override
  String get message;
  @override
  String get status;
  @override
  @CartResponseDataConverter()
  CartResponseData? get data;
  @override
  @JsonKey(ignore: true)
  _$$CartOperationResponseImplCopyWith<_$CartOperationResponseImpl>
      get copyWith => throw _privateConstructorUsedError;
}

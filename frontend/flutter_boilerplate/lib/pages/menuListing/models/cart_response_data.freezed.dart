// coverage:ignore-file
// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'cart_response_data.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

T _$identity<T>(T value) => value;

final _privateConstructorUsedError = UnsupportedError(
    'It seems like you constructed your class using `MyClass._()`. This constructor is only meant to be used by freezed and you are not supposed to need it nor use it.\nPlease check the documentation here for more information: https://github.com/rrousselGit/freezed#adding-getters-and-methods-to-our-models');

/// @nodoc
mixin _$CartResponseData {
  Cart get cart => throw _privateConstructorUsedError;

  @JsonKey(ignore: true)
  $CartResponseDataCopyWith<CartResponseData> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $CartResponseDataCopyWith<$Res> {
  factory $CartResponseDataCopyWith(
          CartResponseData value, $Res Function(CartResponseData) then) =
      _$CartResponseDataCopyWithImpl<$Res, CartResponseData>;
  @useResult
  $Res call({Cart cart});

  $CartCopyWith<$Res> get cart;
}

/// @nodoc
class _$CartResponseDataCopyWithImpl<$Res, $Val extends CartResponseData>
    implements $CartResponseDataCopyWith<$Res> {
  _$CartResponseDataCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? cart = null,
  }) {
    return _then(_value.copyWith(
      cart: null == cart
          ? _value.cart
          : cart // ignore: cast_nullable_to_non_nullable
              as Cart,
    ) as $Val);
  }

  @override
  @pragma('vm:prefer-inline')
  $CartCopyWith<$Res> get cart {
    return $CartCopyWith<$Res>(_value.cart, (value) {
      return _then(_value.copyWith(cart: value) as $Val);
    });
  }
}

/// @nodoc
abstract class _$$CartResponseDataImplCopyWith<$Res>
    implements $CartResponseDataCopyWith<$Res> {
  factory _$$CartResponseDataImplCopyWith(_$CartResponseDataImpl value,
          $Res Function(_$CartResponseDataImpl) then) =
      __$$CartResponseDataImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call({Cart cart});

  @override
  $CartCopyWith<$Res> get cart;
}

/// @nodoc
class __$$CartResponseDataImplCopyWithImpl<$Res>
    extends _$CartResponseDataCopyWithImpl<$Res, _$CartResponseDataImpl>
    implements _$$CartResponseDataImplCopyWith<$Res> {
  __$$CartResponseDataImplCopyWithImpl(_$CartResponseDataImpl _value,
      $Res Function(_$CartResponseDataImpl) _then)
      : super(_value, _then);

  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? cart = null,
  }) {
    return _then(_$CartResponseDataImpl(
      cart: null == cart
          ? _value.cart
          : cart // ignore: cast_nullable_to_non_nullable
              as Cart,
    ));
  }
}

/// @nodoc

@JsonSerializable(explicitToJson: true)
class _$CartResponseDataImpl extends _CartResponseData {
  _$CartResponseDataImpl({required this.cart}) : super._();

  @override
  final Cart cart;

  @override
  String toString() {
    return 'CartResponseData(cart: $cart)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$CartResponseDataImpl &&
            (identical(other.cart, cart) || other.cart == cart));
  }

  @override
  int get hashCode => Object.hash(runtimeType, cart);

  @JsonKey(ignore: true)
  @override
  @pragma('vm:prefer-inline')
  _$$CartResponseDataImplCopyWith<_$CartResponseDataImpl> get copyWith =>
      __$$CartResponseDataImplCopyWithImpl<_$CartResponseDataImpl>(
          this, _$identity);
}

abstract class _CartResponseData extends CartResponseData {
  factory _CartResponseData({required final Cart cart}) =
      _$CartResponseDataImpl;
  _CartResponseData._() : super._();

  @override
  Cart get cart;
  @override
  @JsonKey(ignore: true)
  _$$CartResponseDataImplCopyWith<_$CartResponseDataImpl> get copyWith =>
      throw _privateConstructorUsedError;
}

// coverage:ignore-file
// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'cart_price_info.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

T _$identity<T>(T value) => value;

final _privateConstructorUsedError = UnsupportedError(
    'It seems like you constructed your class using `MyClass._()`. This constructor is only meant to be used by freezed and you are not supposed to need it nor use it.\nPlease check the documentation here for more information: https://github.com/rrousselGit/freezed#adding-getters-and-methods-to-our-models');

CartPriceInfo _$CartPriceInfoFromJson(Map<String, dynamic> json) {
  return _CartPriceInfo.fromJson(json);
}

/// @nodoc
mixin _$CartPriceInfo {
  num? get basePrice => throw _privateConstructorUsedError;
  num? get finalPrice => throw _privateConstructorUsedError;
  num? get totalDiscount => throw _privateConstructorUsedError;
  num? get totalDiscountAmount => throw _privateConstructorUsedError;
  num? get totalAddonBasePrice => throw _privateConstructorUsedError;
  num? get totalVariantBasePrice => throw _privateConstructorUsedError;

  Map<String, dynamic> toJson() => throw _privateConstructorUsedError;
  @JsonKey(ignore: true)
  $CartPriceInfoCopyWith<CartPriceInfo> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $CartPriceInfoCopyWith<$Res> {
  factory $CartPriceInfoCopyWith(
          CartPriceInfo value, $Res Function(CartPriceInfo) then) =
      _$CartPriceInfoCopyWithImpl<$Res, CartPriceInfo>;
  @useResult
  $Res call(
      {num? basePrice,
      num? finalPrice,
      num? totalDiscount,
      num? totalDiscountAmount,
      num? totalAddonBasePrice,
      num? totalVariantBasePrice});
}

/// @nodoc
class _$CartPriceInfoCopyWithImpl<$Res, $Val extends CartPriceInfo>
    implements $CartPriceInfoCopyWith<$Res> {
  _$CartPriceInfoCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? basePrice = freezed,
    Object? finalPrice = freezed,
    Object? totalDiscount = freezed,
    Object? totalDiscountAmount = freezed,
    Object? totalAddonBasePrice = freezed,
    Object? totalVariantBasePrice = freezed,
  }) {
    return _then(_value.copyWith(
      basePrice: freezed == basePrice
          ? _value.basePrice
          : basePrice // ignore: cast_nullable_to_non_nullable
              as num?,
      finalPrice: freezed == finalPrice
          ? _value.finalPrice
          : finalPrice // ignore: cast_nullable_to_non_nullable
              as num?,
      totalDiscount: freezed == totalDiscount
          ? _value.totalDiscount
          : totalDiscount // ignore: cast_nullable_to_non_nullable
              as num?,
      totalDiscountAmount: freezed == totalDiscountAmount
          ? _value.totalDiscountAmount
          : totalDiscountAmount // ignore: cast_nullable_to_non_nullable
              as num?,
      totalAddonBasePrice: freezed == totalAddonBasePrice
          ? _value.totalAddonBasePrice
          : totalAddonBasePrice // ignore: cast_nullable_to_non_nullable
              as num?,
      totalVariantBasePrice: freezed == totalVariantBasePrice
          ? _value.totalVariantBasePrice
          : totalVariantBasePrice // ignore: cast_nullable_to_non_nullable
              as num?,
    ) as $Val);
  }
}

/// @nodoc
abstract class _$$CartPriceInfoImplCopyWith<$Res>
    implements $CartPriceInfoCopyWith<$Res> {
  factory _$$CartPriceInfoImplCopyWith(
          _$CartPriceInfoImpl value, $Res Function(_$CartPriceInfoImpl) then) =
      __$$CartPriceInfoImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call(
      {num? basePrice,
      num? finalPrice,
      num? totalDiscount,
      num? totalDiscountAmount,
      num? totalAddonBasePrice,
      num? totalVariantBasePrice});
}

/// @nodoc
class __$$CartPriceInfoImplCopyWithImpl<$Res>
    extends _$CartPriceInfoCopyWithImpl<$Res, _$CartPriceInfoImpl>
    implements _$$CartPriceInfoImplCopyWith<$Res> {
  __$$CartPriceInfoImplCopyWithImpl(
      _$CartPriceInfoImpl _value, $Res Function(_$CartPriceInfoImpl) _then)
      : super(_value, _then);

  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? basePrice = freezed,
    Object? finalPrice = freezed,
    Object? totalDiscount = freezed,
    Object? totalDiscountAmount = freezed,
    Object? totalAddonBasePrice = freezed,
    Object? totalVariantBasePrice = freezed,
  }) {
    return _then(_$CartPriceInfoImpl(
      basePrice: freezed == basePrice
          ? _value.basePrice
          : basePrice // ignore: cast_nullable_to_non_nullable
              as num?,
      finalPrice: freezed == finalPrice
          ? _value.finalPrice
          : finalPrice // ignore: cast_nullable_to_non_nullable
              as num?,
      totalDiscount: freezed == totalDiscount
          ? _value.totalDiscount
          : totalDiscount // ignore: cast_nullable_to_non_nullable
              as num?,
      totalDiscountAmount: freezed == totalDiscountAmount
          ? _value.totalDiscountAmount
          : totalDiscountAmount // ignore: cast_nullable_to_non_nullable
              as num?,
      totalAddonBasePrice: freezed == totalAddonBasePrice
          ? _value.totalAddonBasePrice
          : totalAddonBasePrice // ignore: cast_nullable_to_non_nullable
              as num?,
      totalVariantBasePrice: freezed == totalVariantBasePrice
          ? _value.totalVariantBasePrice
          : totalVariantBasePrice // ignore: cast_nullable_to_non_nullable
              as num?,
    ));
  }
}

/// @nodoc

@JsonSerializable(explicitToJson: true)
class _$CartPriceInfoImpl implements _CartPriceInfo {
  _$CartPriceInfoImpl(
      {this.basePrice = 0,
      this.finalPrice = 0,
      this.totalDiscount = 0,
      this.totalDiscountAmount = 0,
      this.totalAddonBasePrice = 0,
      this.totalVariantBasePrice = 0});

  factory _$CartPriceInfoImpl.fromJson(Map<String, dynamic> json) =>
      _$$CartPriceInfoImplFromJson(json);

  @override
  @JsonKey()
  final num? basePrice;
  @override
  @JsonKey()
  final num? finalPrice;
  @override
  @JsonKey()
  final num? totalDiscount;
  @override
  @JsonKey()
  final num? totalDiscountAmount;
  @override
  @JsonKey()
  final num? totalAddonBasePrice;
  @override
  @JsonKey()
  final num? totalVariantBasePrice;

  @override
  String toString() {
    return 'CartPriceInfo(basePrice: $basePrice, finalPrice: $finalPrice, totalDiscount: $totalDiscount, totalDiscountAmount: $totalDiscountAmount, totalAddonBasePrice: $totalAddonBasePrice, totalVariantBasePrice: $totalVariantBasePrice)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$CartPriceInfoImpl &&
            (identical(other.basePrice, basePrice) ||
                other.basePrice == basePrice) &&
            (identical(other.finalPrice, finalPrice) ||
                other.finalPrice == finalPrice) &&
            (identical(other.totalDiscount, totalDiscount) ||
                other.totalDiscount == totalDiscount) &&
            (identical(other.totalDiscountAmount, totalDiscountAmount) ||
                other.totalDiscountAmount == totalDiscountAmount) &&
            (identical(other.totalAddonBasePrice, totalAddonBasePrice) ||
                other.totalAddonBasePrice == totalAddonBasePrice) &&
            (identical(other.totalVariantBasePrice, totalVariantBasePrice) ||
                other.totalVariantBasePrice == totalVariantBasePrice));
  }

  @JsonKey(ignore: true)
  @override
  int get hashCode => Object.hash(
      runtimeType,
      basePrice,
      finalPrice,
      totalDiscount,
      totalDiscountAmount,
      totalAddonBasePrice,
      totalVariantBasePrice);

  @JsonKey(ignore: true)
  @override
  @pragma('vm:prefer-inline')
  _$$CartPriceInfoImplCopyWith<_$CartPriceInfoImpl> get copyWith =>
      __$$CartPriceInfoImplCopyWithImpl<_$CartPriceInfoImpl>(this, _$identity);

  @override
  Map<String, dynamic> toJson() {
    return _$$CartPriceInfoImplToJson(
      this,
    );
  }
}

abstract class _CartPriceInfo implements CartPriceInfo {
  factory _CartPriceInfo(
      {final num? basePrice,
      final num? finalPrice,
      final num? totalDiscount,
      final num? totalDiscountAmount,
      final num? totalAddonBasePrice,
      final num? totalVariantBasePrice}) = _$CartPriceInfoImpl;

  factory _CartPriceInfo.fromJson(Map<String, dynamic> json) =
      _$CartPriceInfoImpl.fromJson;

  @override
  num? get basePrice;
  @override
  num? get finalPrice;
  @override
  num? get totalDiscount;
  @override
  num? get totalDiscountAmount;
  @override
  num? get totalAddonBasePrice;
  @override
  num? get totalVariantBasePrice;
  @override
  @JsonKey(ignore: true)
  _$$CartPriceInfoImplCopyWith<_$CartPriceInfoImpl> get copyWith =>
      throw _privateConstructorUsedError;
}

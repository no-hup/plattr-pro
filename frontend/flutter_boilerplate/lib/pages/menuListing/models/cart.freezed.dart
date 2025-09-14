// coverage:ignore-file
// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'cart.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

T _$identity<T>(T value) => value;

final _privateConstructorUsedError = UnsupportedError(
    'It seems like you constructed your class using `MyClass._()`. This constructor is only meant to be used by freezed and you are not supposed to need it nor use it.\nPlease check the documentation here for more information: https://github.com/rrousselGit/freezed#adding-getters-and-methods-to-our-models');

Cart _$CartFromJson(Map<String, dynamic> json) {
  return _Cart.fromJson(json);
}

/// @nodoc
mixin _$Cart {
  String? get restaurantId => throw _privateConstructorUsedError;
  String? get tableId => throw _privateConstructorUsedError;
  List<CartItem> get items => throw _privateConstructorUsedError;
  CartPriceInfo? get priceInfo => throw _privateConstructorUsedError;
  String? get sessionId => throw _privateConstructorUsedError;
  num? get lastUpdated => throw _privateConstructorUsedError;

  Map<String, dynamic> toJson() => throw _privateConstructorUsedError;
  @JsonKey(ignore: true)
  $CartCopyWith<Cart> get copyWith => throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $CartCopyWith<$Res> {
  factory $CartCopyWith(Cart value, $Res Function(Cart) then) =
      _$CartCopyWithImpl<$Res, Cart>;
  @useResult
  $Res call(
      {String? restaurantId,
      String? tableId,
      List<CartItem> items,
      CartPriceInfo? priceInfo,
      String? sessionId,
      num? lastUpdated});

  $CartPriceInfoCopyWith<$Res>? get priceInfo;
}

/// @nodoc
class _$CartCopyWithImpl<$Res, $Val extends Cart>
    implements $CartCopyWith<$Res> {
  _$CartCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? restaurantId = freezed,
    Object? tableId = freezed,
    Object? items = null,
    Object? priceInfo = freezed,
    Object? sessionId = freezed,
    Object? lastUpdated = freezed,
  }) {
    return _then(_value.copyWith(
      restaurantId: freezed == restaurantId
          ? _value.restaurantId
          : restaurantId // ignore: cast_nullable_to_non_nullable
              as String?,
      tableId: freezed == tableId
          ? _value.tableId
          : tableId // ignore: cast_nullable_to_non_nullable
              as String?,
      items: null == items
          ? _value.items
          : items // ignore: cast_nullable_to_non_nullable
              as List<CartItem>,
      priceInfo: freezed == priceInfo
          ? _value.priceInfo
          : priceInfo // ignore: cast_nullable_to_non_nullable
              as CartPriceInfo?,
      sessionId: freezed == sessionId
          ? _value.sessionId
          : sessionId // ignore: cast_nullable_to_non_nullable
              as String?,
      lastUpdated: freezed == lastUpdated
          ? _value.lastUpdated
          : lastUpdated // ignore: cast_nullable_to_non_nullable
              as num?,
    ) as $Val);
  }

  @override
  @pragma('vm:prefer-inline')
  $CartPriceInfoCopyWith<$Res>? get priceInfo {
    if (_value.priceInfo == null) {
      return null;
    }

    return $CartPriceInfoCopyWith<$Res>(_value.priceInfo!, (value) {
      return _then(_value.copyWith(priceInfo: value) as $Val);
    });
  }
}

/// @nodoc
abstract class _$$CartImplCopyWith<$Res> implements $CartCopyWith<$Res> {
  factory _$$CartImplCopyWith(
          _$CartImpl value, $Res Function(_$CartImpl) then) =
      __$$CartImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call(
      {String? restaurantId,
      String? tableId,
      List<CartItem> items,
      CartPriceInfo? priceInfo,
      String? sessionId,
      num? lastUpdated});

  @override
  $CartPriceInfoCopyWith<$Res>? get priceInfo;
}

/// @nodoc
class __$$CartImplCopyWithImpl<$Res>
    extends _$CartCopyWithImpl<$Res, _$CartImpl>
    implements _$$CartImplCopyWith<$Res> {
  __$$CartImplCopyWithImpl(_$CartImpl _value, $Res Function(_$CartImpl) _then)
      : super(_value, _then);

  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? restaurantId = freezed,
    Object? tableId = freezed,
    Object? items = null,
    Object? priceInfo = freezed,
    Object? sessionId = freezed,
    Object? lastUpdated = freezed,
  }) {
    return _then(_$CartImpl(
      restaurantId: freezed == restaurantId
          ? _value.restaurantId
          : restaurantId // ignore: cast_nullable_to_non_nullable
              as String?,
      tableId: freezed == tableId
          ? _value.tableId
          : tableId // ignore: cast_nullable_to_non_nullable
              as String?,
      items: null == items
          ? _value._items
          : items // ignore: cast_nullable_to_non_nullable
              as List<CartItem>,
      priceInfo: freezed == priceInfo
          ? _value.priceInfo
          : priceInfo // ignore: cast_nullable_to_non_nullable
              as CartPriceInfo?,
      sessionId: freezed == sessionId
          ? _value.sessionId
          : sessionId // ignore: cast_nullable_to_non_nullable
              as String?,
      lastUpdated: freezed == lastUpdated
          ? _value.lastUpdated
          : lastUpdated // ignore: cast_nullable_to_non_nullable
              as num?,
    ));
  }
}

/// @nodoc

@JsonSerializable(explicitToJson: true)
class _$CartImpl implements _Cart {
  _$CartImpl(
      {this.restaurantId = '',
      this.tableId = '',
      final List<CartItem> items = const [],
      this.priceInfo,
      this.sessionId,
      this.lastUpdated})
      : _items = items;

  factory _$CartImpl.fromJson(Map<String, dynamic> json) =>
      _$$CartImplFromJson(json);

  @override
  @JsonKey()
  final String? restaurantId;
  @override
  @JsonKey()
  final String? tableId;
  final List<CartItem> _items;
  @override
  @JsonKey()
  List<CartItem> get items {
    if (_items is EqualUnmodifiableListView) return _items;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableListView(_items);
  }

  @override
  final CartPriceInfo? priceInfo;
  @override
  final String? sessionId;
  @override
  final num? lastUpdated;

  @override
  String toString() {
    return 'Cart(restaurantId: $restaurantId, tableId: $tableId, items: $items, priceInfo: $priceInfo, sessionId: $sessionId, lastUpdated: $lastUpdated)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$CartImpl &&
            (identical(other.restaurantId, restaurantId) ||
                other.restaurantId == restaurantId) &&
            (identical(other.tableId, tableId) || other.tableId == tableId) &&
            const DeepCollectionEquality().equals(other._items, _items) &&
            (identical(other.priceInfo, priceInfo) ||
                other.priceInfo == priceInfo) &&
            (identical(other.sessionId, sessionId) ||
                other.sessionId == sessionId) &&
            (identical(other.lastUpdated, lastUpdated) ||
                other.lastUpdated == lastUpdated));
  }

  @JsonKey(ignore: true)
  @override
  int get hashCode => Object.hash(
      runtimeType,
      restaurantId,
      tableId,
      const DeepCollectionEquality().hash(_items),
      priceInfo,
      sessionId,
      lastUpdated);

  @JsonKey(ignore: true)
  @override
  @pragma('vm:prefer-inline')
  _$$CartImplCopyWith<_$CartImpl> get copyWith =>
      __$$CartImplCopyWithImpl<_$CartImpl>(this, _$identity);

  @override
  Map<String, dynamic> toJson() {
    return _$$CartImplToJson(
      this,
    );
  }
}

abstract class _Cart implements Cart {
  factory _Cart(
      {final String? restaurantId,
      final String? tableId,
      final List<CartItem> items,
      final CartPriceInfo? priceInfo,
      final String? sessionId,
      final num? lastUpdated}) = _$CartImpl;

  factory _Cart.fromJson(Map<String, dynamic> json) = _$CartImpl.fromJson;

  @override
  String? get restaurantId;
  @override
  String? get tableId;
  @override
  List<CartItem> get items;
  @override
  CartPriceInfo? get priceInfo;
  @override
  String? get sessionId;
  @override
  num? get lastUpdated;
  @override
  @JsonKey(ignore: true)
  _$$CartImplCopyWith<_$CartImpl> get copyWith =>
      throw _privateConstructorUsedError;
}

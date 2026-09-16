// coverage:ignore-file
// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'cart_item.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

T _$identity<T>(T value) => value;

final _privateConstructorUsedError = UnsupportedError(
    'It seems like you constructed your class using `MyClass._()`. This constructor is only meant to be used by freezed and you are not supposed to need it nor use it.\nPlease check the documentation here for more information: https://github.com/rrousselGit/freezed#adding-getters-and-methods-to-our-models');

CartItem _$CartItemFromJson(Map<String, dynamic> json) {
  return _CartItem.fromJson(json);
}

/// @nodoc
mixin _$CartItem {
  @JsonKey(name: 'menuItemId', required: true, disallowNullValue: true)
  String get menuItemId => throw _privateConstructorUsedError;
  @JsonKey(fromJson: _parseIntFlexible)
  int? get cartItemId => throw _privateConstructorUsedError;
  @JsonKey(fromJson: _parseIntFlexibleZero)
  int get quantity => throw _privateConstructorUsedError;
  CartItemPriceInfo? get priceInfo => throw _privateConstructorUsedError;
  @VariantSelectionListConverter()
  @JsonKey(name: 'selectedVariantsDetails')
  List<VariantSelection> get selectedVariants =>
      throw _privateConstructorUsedError;
  @AddonSelectionListConverter()
  @JsonKey(name: 'selectedAddonsDetails')
  List<AddonSelection> get selectedAddons => throw _privateConstructorUsedError;
  String? get name => throw _privateConstructorUsedError;
  String? get description => throw _privateConstructorUsedError;
  String? get image => throw _privateConstructorUsedError;
  String? get status => throw _privateConstructorUsedError;
  Timestamp? get statusUpdatedAt =>
      throw _privateConstructorUsedError; // Which phone added this line to the table's shared cart. Null on carts written
// before ownership existed, and on items added by an older app — those stay one
// shared unowned pool, which is exactly how the whole table behaved before.
  String? get addedBy =>
      throw _privateConstructorUsedError; // Legacy support fields for backward compatibility
  double? get itemPrice => throw _privateConstructorUsedError;
  double? get totalPrice => throw _privateConstructorUsedError;

  Map<String, dynamic> toJson() => throw _privateConstructorUsedError;
  @JsonKey(ignore: true)
  $CartItemCopyWith<CartItem> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $CartItemCopyWith<$Res> {
  factory $CartItemCopyWith(CartItem value, $Res Function(CartItem) then) =
      _$CartItemCopyWithImpl<$Res, CartItem>;
  @useResult
  $Res call(
      {@JsonKey(name: 'menuItemId', required: true, disallowNullValue: true)
      String menuItemId,
      @JsonKey(fromJson: _parseIntFlexible) int? cartItemId,
      @JsonKey(fromJson: _parseIntFlexibleZero) int quantity,
      CartItemPriceInfo? priceInfo,
      @VariantSelectionListConverter()
      @JsonKey(name: 'selectedVariantsDetails')
      List<VariantSelection> selectedVariants,
      @AddonSelectionListConverter()
      @JsonKey(name: 'selectedAddonsDetails')
      List<AddonSelection> selectedAddons,
      String? name,
      String? description,
      String? image,
      String? status,
      Timestamp? statusUpdatedAt,
      String? addedBy,
      double? itemPrice,
      double? totalPrice});

  $CartItemPriceInfoCopyWith<$Res>? get priceInfo;
  $TimestampCopyWith<$Res>? get statusUpdatedAt;
}

/// @nodoc
class _$CartItemCopyWithImpl<$Res, $Val extends CartItem>
    implements $CartItemCopyWith<$Res> {
  _$CartItemCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? menuItemId = null,
    Object? cartItemId = freezed,
    Object? quantity = null,
    Object? priceInfo = freezed,
    Object? selectedVariants = null,
    Object? selectedAddons = null,
    Object? name = freezed,
    Object? description = freezed,
    Object? image = freezed,
    Object? status = freezed,
    Object? statusUpdatedAt = freezed,
    Object? addedBy = freezed,
    Object? itemPrice = freezed,
    Object? totalPrice = freezed,
  }) {
    return _then(_value.copyWith(
      menuItemId: null == menuItemId
          ? _value.menuItemId
          : menuItemId // ignore: cast_nullable_to_non_nullable
              as String,
      cartItemId: freezed == cartItemId
          ? _value.cartItemId
          : cartItemId // ignore: cast_nullable_to_non_nullable
              as int?,
      quantity: null == quantity
          ? _value.quantity
          : quantity // ignore: cast_nullable_to_non_nullable
              as int,
      priceInfo: freezed == priceInfo
          ? _value.priceInfo
          : priceInfo // ignore: cast_nullable_to_non_nullable
              as CartItemPriceInfo?,
      selectedVariants: null == selectedVariants
          ? _value.selectedVariants
          : selectedVariants // ignore: cast_nullable_to_non_nullable
              as List<VariantSelection>,
      selectedAddons: null == selectedAddons
          ? _value.selectedAddons
          : selectedAddons // ignore: cast_nullable_to_non_nullable
              as List<AddonSelection>,
      name: freezed == name
          ? _value.name
          : name // ignore: cast_nullable_to_non_nullable
              as String?,
      description: freezed == description
          ? _value.description
          : description // ignore: cast_nullable_to_non_nullable
              as String?,
      image: freezed == image
          ? _value.image
          : image // ignore: cast_nullable_to_non_nullable
              as String?,
      status: freezed == status
          ? _value.status
          : status // ignore: cast_nullable_to_non_nullable
              as String?,
      statusUpdatedAt: freezed == statusUpdatedAt
          ? _value.statusUpdatedAt
          : statusUpdatedAt // ignore: cast_nullable_to_non_nullable
              as Timestamp?,
      addedBy: freezed == addedBy
          ? _value.addedBy
          : addedBy // ignore: cast_nullable_to_non_nullable
              as String?,
      itemPrice: freezed == itemPrice
          ? _value.itemPrice
          : itemPrice // ignore: cast_nullable_to_non_nullable
              as double?,
      totalPrice: freezed == totalPrice
          ? _value.totalPrice
          : totalPrice // ignore: cast_nullable_to_non_nullable
              as double?,
    ) as $Val);
  }

  @override
  @pragma('vm:prefer-inline')
  $CartItemPriceInfoCopyWith<$Res>? get priceInfo {
    if (_value.priceInfo == null) {
      return null;
    }

    return $CartItemPriceInfoCopyWith<$Res>(_value.priceInfo!, (value) {
      return _then(_value.copyWith(priceInfo: value) as $Val);
    });
  }

  @override
  @pragma('vm:prefer-inline')
  $TimestampCopyWith<$Res>? get statusUpdatedAt {
    if (_value.statusUpdatedAt == null) {
      return null;
    }

    return $TimestampCopyWith<$Res>(_value.statusUpdatedAt!, (value) {
      return _then(_value.copyWith(statusUpdatedAt: value) as $Val);
    });
  }
}

/// @nodoc
abstract class _$$CartItemImplCopyWith<$Res>
    implements $CartItemCopyWith<$Res> {
  factory _$$CartItemImplCopyWith(
          _$CartItemImpl value, $Res Function(_$CartItemImpl) then) =
      __$$CartItemImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call(
      {@JsonKey(name: 'menuItemId', required: true, disallowNullValue: true)
      String menuItemId,
      @JsonKey(fromJson: _parseIntFlexible) int? cartItemId,
      @JsonKey(fromJson: _parseIntFlexibleZero) int quantity,
      CartItemPriceInfo? priceInfo,
      @VariantSelectionListConverter()
      @JsonKey(name: 'selectedVariantsDetails')
      List<VariantSelection> selectedVariants,
      @AddonSelectionListConverter()
      @JsonKey(name: 'selectedAddonsDetails')
      List<AddonSelection> selectedAddons,
      String? name,
      String? description,
      String? image,
      String? status,
      Timestamp? statusUpdatedAt,
      String? addedBy,
      double? itemPrice,
      double? totalPrice});

  @override
  $CartItemPriceInfoCopyWith<$Res>? get priceInfo;
  @override
  $TimestampCopyWith<$Res>? get statusUpdatedAt;
}

/// @nodoc
class __$$CartItemImplCopyWithImpl<$Res>
    extends _$CartItemCopyWithImpl<$Res, _$CartItemImpl>
    implements _$$CartItemImplCopyWith<$Res> {
  __$$CartItemImplCopyWithImpl(
      _$CartItemImpl _value, $Res Function(_$CartItemImpl) _then)
      : super(_value, _then);

  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? menuItemId = null,
    Object? cartItemId = freezed,
    Object? quantity = null,
    Object? priceInfo = freezed,
    Object? selectedVariants = null,
    Object? selectedAddons = null,
    Object? name = freezed,
    Object? description = freezed,
    Object? image = freezed,
    Object? status = freezed,
    Object? statusUpdatedAt = freezed,
    Object? addedBy = freezed,
    Object? itemPrice = freezed,
    Object? totalPrice = freezed,
  }) {
    return _then(_$CartItemImpl(
      menuItemId: null == menuItemId
          ? _value.menuItemId
          : menuItemId // ignore: cast_nullable_to_non_nullable
              as String,
      cartItemId: freezed == cartItemId
          ? _value.cartItemId
          : cartItemId // ignore: cast_nullable_to_non_nullable
              as int?,
      quantity: null == quantity
          ? _value.quantity
          : quantity // ignore: cast_nullable_to_non_nullable
              as int,
      priceInfo: freezed == priceInfo
          ? _value.priceInfo
          : priceInfo // ignore: cast_nullable_to_non_nullable
              as CartItemPriceInfo?,
      selectedVariants: null == selectedVariants
          ? _value._selectedVariants
          : selectedVariants // ignore: cast_nullable_to_non_nullable
              as List<VariantSelection>,
      selectedAddons: null == selectedAddons
          ? _value._selectedAddons
          : selectedAddons // ignore: cast_nullable_to_non_nullable
              as List<AddonSelection>,
      name: freezed == name
          ? _value.name
          : name // ignore: cast_nullable_to_non_nullable
              as String?,
      description: freezed == description
          ? _value.description
          : description // ignore: cast_nullable_to_non_nullable
              as String?,
      image: freezed == image
          ? _value.image
          : image // ignore: cast_nullable_to_non_nullable
              as String?,
      status: freezed == status
          ? _value.status
          : status // ignore: cast_nullable_to_non_nullable
              as String?,
      statusUpdatedAt: freezed == statusUpdatedAt
          ? _value.statusUpdatedAt
          : statusUpdatedAt // ignore: cast_nullable_to_non_nullable
              as Timestamp?,
      addedBy: freezed == addedBy
          ? _value.addedBy
          : addedBy // ignore: cast_nullable_to_non_nullable
              as String?,
      itemPrice: freezed == itemPrice
          ? _value.itemPrice
          : itemPrice // ignore: cast_nullable_to_non_nullable
              as double?,
      totalPrice: freezed == totalPrice
          ? _value.totalPrice
          : totalPrice // ignore: cast_nullable_to_non_nullable
              as double?,
    ));
  }
}

/// @nodoc

@JsonSerializable(explicitToJson: true, anyMap: true)
class _$CartItemImpl implements _CartItem {
  const _$CartItemImpl(
      {@JsonKey(name: 'menuItemId', required: true, disallowNullValue: true)
      required this.menuItemId,
      @JsonKey(fromJson: _parseIntFlexible) this.cartItemId,
      @JsonKey(fromJson: _parseIntFlexibleZero) this.quantity = 0,
      this.priceInfo,
      @VariantSelectionListConverter()
      @JsonKey(name: 'selectedVariantsDetails')
      final List<VariantSelection> selectedVariants = const [],
      @AddonSelectionListConverter()
      @JsonKey(name: 'selectedAddonsDetails')
      final List<AddonSelection> selectedAddons = const [],
      this.name,
      this.description,
      this.image,
      this.status,
      this.statusUpdatedAt,
      this.addedBy,
      this.itemPrice,
      this.totalPrice})
      : _selectedVariants = selectedVariants,
        _selectedAddons = selectedAddons;

  factory _$CartItemImpl.fromJson(Map<String, dynamic> json) =>
      _$$CartItemImplFromJson(json);

  @override
  @JsonKey(name: 'menuItemId', required: true, disallowNullValue: true)
  final String menuItemId;
  @override
  @JsonKey(fromJson: _parseIntFlexible)
  final int? cartItemId;
  @override
  @JsonKey(fromJson: _parseIntFlexibleZero)
  final int quantity;
  @override
  final CartItemPriceInfo? priceInfo;
  final List<VariantSelection> _selectedVariants;
  @override
  @VariantSelectionListConverter()
  @JsonKey(name: 'selectedVariantsDetails')
  List<VariantSelection> get selectedVariants {
    if (_selectedVariants is EqualUnmodifiableListView)
      return _selectedVariants;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableListView(_selectedVariants);
  }

  final List<AddonSelection> _selectedAddons;
  @override
  @AddonSelectionListConverter()
  @JsonKey(name: 'selectedAddonsDetails')
  List<AddonSelection> get selectedAddons {
    if (_selectedAddons is EqualUnmodifiableListView) return _selectedAddons;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableListView(_selectedAddons);
  }

  @override
  final String? name;
  @override
  final String? description;
  @override
  final String? image;
  @override
  final String? status;
  @override
  final Timestamp? statusUpdatedAt;
// Which phone added this line to the table's shared cart. Null on carts written
// before ownership existed, and on items added by an older app — those stay one
// shared unowned pool, which is exactly how the whole table behaved before.
  @override
  final String? addedBy;
// Legacy support fields for backward compatibility
  @override
  final double? itemPrice;
  @override
  final double? totalPrice;

  @override
  String toString() {
    return 'CartItem(menuItemId: $menuItemId, cartItemId: $cartItemId, quantity: $quantity, priceInfo: $priceInfo, selectedVariants: $selectedVariants, selectedAddons: $selectedAddons, name: $name, description: $description, image: $image, status: $status, statusUpdatedAt: $statusUpdatedAt, addedBy: $addedBy, itemPrice: $itemPrice, totalPrice: $totalPrice)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$CartItemImpl &&
            (identical(other.menuItemId, menuItemId) ||
                other.menuItemId == menuItemId) &&
            (identical(other.cartItemId, cartItemId) ||
                other.cartItemId == cartItemId) &&
            (identical(other.quantity, quantity) ||
                other.quantity == quantity) &&
            (identical(other.priceInfo, priceInfo) ||
                other.priceInfo == priceInfo) &&
            const DeepCollectionEquality()
                .equals(other._selectedVariants, _selectedVariants) &&
            const DeepCollectionEquality()
                .equals(other._selectedAddons, _selectedAddons) &&
            (identical(other.name, name) || other.name == name) &&
            (identical(other.description, description) ||
                other.description == description) &&
            (identical(other.image, image) || other.image == image) &&
            (identical(other.status, status) || other.status == status) &&
            (identical(other.statusUpdatedAt, statusUpdatedAt) ||
                other.statusUpdatedAt == statusUpdatedAt) &&
            (identical(other.addedBy, addedBy) || other.addedBy == addedBy) &&
            (identical(other.itemPrice, itemPrice) ||
                other.itemPrice == itemPrice) &&
            (identical(other.totalPrice, totalPrice) ||
                other.totalPrice == totalPrice));
  }

  @JsonKey(ignore: true)
  @override
  int get hashCode => Object.hash(
      runtimeType,
      menuItemId,
      cartItemId,
      quantity,
      priceInfo,
      const DeepCollectionEquality().hash(_selectedVariants),
      const DeepCollectionEquality().hash(_selectedAddons),
      name,
      description,
      image,
      status,
      statusUpdatedAt,
      addedBy,
      itemPrice,
      totalPrice);

  @JsonKey(ignore: true)
  @override
  @pragma('vm:prefer-inline')
  _$$CartItemImplCopyWith<_$CartItemImpl> get copyWith =>
      __$$CartItemImplCopyWithImpl<_$CartItemImpl>(this, _$identity);

  @override
  Map<String, dynamic> toJson() {
    return _$$CartItemImplToJson(
      this,
    );
  }
}

abstract class _CartItem implements CartItem {
  const factory _CartItem(
      {@JsonKey(name: 'menuItemId', required: true, disallowNullValue: true)
      required final String menuItemId,
      @JsonKey(fromJson: _parseIntFlexible) final int? cartItemId,
      @JsonKey(fromJson: _parseIntFlexibleZero) final int quantity,
      final CartItemPriceInfo? priceInfo,
      @VariantSelectionListConverter()
      @JsonKey(name: 'selectedVariantsDetails')
      final List<VariantSelection> selectedVariants,
      @AddonSelectionListConverter()
      @JsonKey(name: 'selectedAddonsDetails')
      final List<AddonSelection> selectedAddons,
      final String? name,
      final String? description,
      final String? image,
      final String? status,
      final Timestamp? statusUpdatedAt,
      final String? addedBy,
      final double? itemPrice,
      final double? totalPrice}) = _$CartItemImpl;

  factory _CartItem.fromJson(Map<String, dynamic> json) =
      _$CartItemImpl.fromJson;

  @override
  @JsonKey(name: 'menuItemId', required: true, disallowNullValue: true)
  String get menuItemId;
  @override
  @JsonKey(fromJson: _parseIntFlexible)
  int? get cartItemId;
  @override
  @JsonKey(fromJson: _parseIntFlexibleZero)
  int get quantity;
  @override
  CartItemPriceInfo? get priceInfo;
  @override
  @VariantSelectionListConverter()
  @JsonKey(name: 'selectedVariantsDetails')
  List<VariantSelection> get selectedVariants;
  @override
  @AddonSelectionListConverter()
  @JsonKey(name: 'selectedAddonsDetails')
  List<AddonSelection> get selectedAddons;
  @override
  String? get name;
  @override
  String? get description;
  @override
  String? get image;
  @override
  String? get status;
  @override
  Timestamp? get statusUpdatedAt;
  @override // Which phone added this line to the table's shared cart. Null on carts written
// before ownership existed, and on items added by an older app — those stay one
// shared unowned pool, which is exactly how the whole table behaved before.
  String? get addedBy;
  @override // Legacy support fields for backward compatibility
  double? get itemPrice;
  @override
  double? get totalPrice;
  @override
  @JsonKey(ignore: true)
  _$$CartItemImplCopyWith<_$CartItemImpl> get copyWith =>
      throw _privateConstructorUsedError;
}

// coverage:ignore-file
// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'active_order_models.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

T _$identity<T>(T value) => value;

final _privateConstructorUsedError = UnsupportedError(
    'It seems like you constructed your class using `MyClass._()`. This constructor is only meant to be used by freezed and you are not supposed to need it nor use it.\nPlease check the documentation here for more information: https://github.com/rrousselGit/freezed#adding-getters-and-methods-to-our-models');

ActiveKitchenCart _$ActiveKitchenCartFromJson(Map<String, dynamic> json) {
  return _ActiveKitchenCart.fromJson(json);
}

/// @nodoc
mixin _$ActiveKitchenCart {
  String get cartId => throw _privateConstructorUsedError;
  String get orderId => throw _privateConstructorUsedError;
  @JsonKey(fromJson: _parseInt)
  int get orderNumber => throw _privateConstructorUsedError;
  String get tableNumber => throw _privateConstructorUsedError;
  String? get serverName => throw _privateConstructorUsedError;
  @JsonKey(fromJson: _parseDateTime)
  DateTime get submittedAt => throw _privateConstructorUsedError;
  @JsonKey(fromJson: _parseStatus)
  ActiveCartStatus get status => throw _privateConstructorUsedError;
  List<ActiveCartItem> get items => throw _privateConstructorUsedError;
  String? get kitchenNote => throw _privateConstructorUsedError;

  Map<String, dynamic> toJson() => throw _privateConstructorUsedError;
  @JsonKey(ignore: true)
  $ActiveKitchenCartCopyWith<ActiveKitchenCart> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $ActiveKitchenCartCopyWith<$Res> {
  factory $ActiveKitchenCartCopyWith(
          ActiveKitchenCart value, $Res Function(ActiveKitchenCart) then) =
      _$ActiveKitchenCartCopyWithImpl<$Res, ActiveKitchenCart>;
  @useResult
  $Res call(
      {String cartId,
      String orderId,
      @JsonKey(fromJson: _parseInt) int orderNumber,
      String tableNumber,
      String? serverName,
      @JsonKey(fromJson: _parseDateTime) DateTime submittedAt,
      @JsonKey(fromJson: _parseStatus) ActiveCartStatus status,
      List<ActiveCartItem> items,
      String? kitchenNote});
}

/// @nodoc
class _$ActiveKitchenCartCopyWithImpl<$Res, $Val extends ActiveKitchenCart>
    implements $ActiveKitchenCartCopyWith<$Res> {
  _$ActiveKitchenCartCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? cartId = null,
    Object? orderId = null,
    Object? orderNumber = null,
    Object? tableNumber = null,
    Object? serverName = freezed,
    Object? submittedAt = null,
    Object? status = null,
    Object? items = null,
    Object? kitchenNote = freezed,
  }) {
    return _then(_value.copyWith(
      cartId: null == cartId
          ? _value.cartId
          : cartId // ignore: cast_nullable_to_non_nullable
              as String,
      orderId: null == orderId
          ? _value.orderId
          : orderId // ignore: cast_nullable_to_non_nullable
              as String,
      orderNumber: null == orderNumber
          ? _value.orderNumber
          : orderNumber // ignore: cast_nullable_to_non_nullable
              as int,
      tableNumber: null == tableNumber
          ? _value.tableNumber
          : tableNumber // ignore: cast_nullable_to_non_nullable
              as String,
      serverName: freezed == serverName
          ? _value.serverName
          : serverName // ignore: cast_nullable_to_non_nullable
              as String?,
      submittedAt: null == submittedAt
          ? _value.submittedAt
          : submittedAt // ignore: cast_nullable_to_non_nullable
              as DateTime,
      status: null == status
          ? _value.status
          : status // ignore: cast_nullable_to_non_nullable
              as ActiveCartStatus,
      items: null == items
          ? _value.items
          : items // ignore: cast_nullable_to_non_nullable
              as List<ActiveCartItem>,
      kitchenNote: freezed == kitchenNote
          ? _value.kitchenNote
          : kitchenNote // ignore: cast_nullable_to_non_nullable
              as String?,
    ) as $Val);
  }
}

/// @nodoc
abstract class _$$ActiveKitchenCartImplCopyWith<$Res>
    implements $ActiveKitchenCartCopyWith<$Res> {
  factory _$$ActiveKitchenCartImplCopyWith(_$ActiveKitchenCartImpl value,
          $Res Function(_$ActiveKitchenCartImpl) then) =
      __$$ActiveKitchenCartImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call(
      {String cartId,
      String orderId,
      @JsonKey(fromJson: _parseInt) int orderNumber,
      String tableNumber,
      String? serverName,
      @JsonKey(fromJson: _parseDateTime) DateTime submittedAt,
      @JsonKey(fromJson: _parseStatus) ActiveCartStatus status,
      List<ActiveCartItem> items,
      String? kitchenNote});
}

/// @nodoc
class __$$ActiveKitchenCartImplCopyWithImpl<$Res>
    extends _$ActiveKitchenCartCopyWithImpl<$Res, _$ActiveKitchenCartImpl>
    implements _$$ActiveKitchenCartImplCopyWith<$Res> {
  __$$ActiveKitchenCartImplCopyWithImpl(_$ActiveKitchenCartImpl _value,
      $Res Function(_$ActiveKitchenCartImpl) _then)
      : super(_value, _then);

  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? cartId = null,
    Object? orderId = null,
    Object? orderNumber = null,
    Object? tableNumber = null,
    Object? serverName = freezed,
    Object? submittedAt = null,
    Object? status = null,
    Object? items = null,
    Object? kitchenNote = freezed,
  }) {
    return _then(_$ActiveKitchenCartImpl(
      cartId: null == cartId
          ? _value.cartId
          : cartId // ignore: cast_nullable_to_non_nullable
              as String,
      orderId: null == orderId
          ? _value.orderId
          : orderId // ignore: cast_nullable_to_non_nullable
              as String,
      orderNumber: null == orderNumber
          ? _value.orderNumber
          : orderNumber // ignore: cast_nullable_to_non_nullable
              as int,
      tableNumber: null == tableNumber
          ? _value.tableNumber
          : tableNumber // ignore: cast_nullable_to_non_nullable
              as String,
      serverName: freezed == serverName
          ? _value.serverName
          : serverName // ignore: cast_nullable_to_non_nullable
              as String?,
      submittedAt: null == submittedAt
          ? _value.submittedAt
          : submittedAt // ignore: cast_nullable_to_non_nullable
              as DateTime,
      status: null == status
          ? _value.status
          : status // ignore: cast_nullable_to_non_nullable
              as ActiveCartStatus,
      items: null == items
          ? _value._items
          : items // ignore: cast_nullable_to_non_nullable
              as List<ActiveCartItem>,
      kitchenNote: freezed == kitchenNote
          ? _value.kitchenNote
          : kitchenNote // ignore: cast_nullable_to_non_nullable
              as String?,
    ));
  }
}

/// @nodoc
@JsonSerializable()
class _$ActiveKitchenCartImpl extends _ActiveKitchenCart {
  const _$ActiveKitchenCartImpl(
      {required this.cartId,
      required this.orderId,
      @JsonKey(fromJson: _parseInt) required this.orderNumber,
      required this.tableNumber,
      this.serverName,
      @JsonKey(fromJson: _parseDateTime) required this.submittedAt,
      @JsonKey(fromJson: _parseStatus) required this.status,
      required final List<ActiveCartItem> items,
      this.kitchenNote})
      : _items = items,
        super._();

  factory _$ActiveKitchenCartImpl.fromJson(Map<String, dynamic> json) =>
      _$$ActiveKitchenCartImplFromJson(json);

  @override
  final String cartId;
  @override
  final String orderId;
  @override
  @JsonKey(fromJson: _parseInt)
  final int orderNumber;
  @override
  final String tableNumber;
  @override
  final String? serverName;
  @override
  @JsonKey(fromJson: _parseDateTime)
  final DateTime submittedAt;
  @override
  @JsonKey(fromJson: _parseStatus)
  final ActiveCartStatus status;
  final List<ActiveCartItem> _items;
  @override
  List<ActiveCartItem> get items {
    if (_items is EqualUnmodifiableListView) return _items;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableListView(_items);
  }

  @override
  final String? kitchenNote;

  @override
  String toString() {
    return 'ActiveKitchenCart(cartId: $cartId, orderId: $orderId, orderNumber: $orderNumber, tableNumber: $tableNumber, serverName: $serverName, submittedAt: $submittedAt, status: $status, items: $items, kitchenNote: $kitchenNote)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$ActiveKitchenCartImpl &&
            (identical(other.cartId, cartId) || other.cartId == cartId) &&
            (identical(other.orderId, orderId) || other.orderId == orderId) &&
            (identical(other.orderNumber, orderNumber) ||
                other.orderNumber == orderNumber) &&
            (identical(other.tableNumber, tableNumber) ||
                other.tableNumber == tableNumber) &&
            (identical(other.serverName, serverName) ||
                other.serverName == serverName) &&
            (identical(other.submittedAt, submittedAt) ||
                other.submittedAt == submittedAt) &&
            (identical(other.status, status) || other.status == status) &&
            const DeepCollectionEquality().equals(other._items, _items) &&
            (identical(other.kitchenNote, kitchenNote) ||
                other.kitchenNote == kitchenNote));
  }

  @JsonKey(ignore: true)
  @override
  int get hashCode => Object.hash(
      runtimeType,
      cartId,
      orderId,
      orderNumber,
      tableNumber,
      serverName,
      submittedAt,
      status,
      const DeepCollectionEquality().hash(_items),
      kitchenNote);

  @JsonKey(ignore: true)
  @override
  @pragma('vm:prefer-inline')
  _$$ActiveKitchenCartImplCopyWith<_$ActiveKitchenCartImpl> get copyWith =>
      __$$ActiveKitchenCartImplCopyWithImpl<_$ActiveKitchenCartImpl>(
          this, _$identity);

  @override
  Map<String, dynamic> toJson() {
    return _$$ActiveKitchenCartImplToJson(
      this,
    );
  }
}

abstract class _ActiveKitchenCart extends ActiveKitchenCart {
  const factory _ActiveKitchenCart(
      {required final String cartId,
      required final String orderId,
      @JsonKey(fromJson: _parseInt) required final int orderNumber,
      required final String tableNumber,
      final String? serverName,
      @JsonKey(fromJson: _parseDateTime) required final DateTime submittedAt,
      @JsonKey(fromJson: _parseStatus) required final ActiveCartStatus status,
      required final List<ActiveCartItem> items,
      final String? kitchenNote}) = _$ActiveKitchenCartImpl;
  const _ActiveKitchenCart._() : super._();

  factory _ActiveKitchenCart.fromJson(Map<String, dynamic> json) =
      _$ActiveKitchenCartImpl.fromJson;

  @override
  String get cartId;
  @override
  String get orderId;
  @override
  @JsonKey(fromJson: _parseInt)
  int get orderNumber;
  @override
  String get tableNumber;
  @override
  String? get serverName;
  @override
  @JsonKey(fromJson: _parseDateTime)
  DateTime get submittedAt;
  @override
  @JsonKey(fromJson: _parseStatus)
  ActiveCartStatus get status;
  @override
  List<ActiveCartItem> get items;
  @override
  String? get kitchenNote;
  @override
  @JsonKey(ignore: true)
  _$$ActiveKitchenCartImplCopyWith<_$ActiveKitchenCartImpl> get copyWith =>
      throw _privateConstructorUsedError;
}

ActiveCartItem _$ActiveCartItemFromJson(Map<String, dynamic> json) {
  return _ActiveCartItem.fromJson(json);
}

/// @nodoc
mixin _$ActiveCartItem {
  String get itemId => throw _privateConstructorUsedError;
  String get name => throw _privateConstructorUsedError;
  @JsonKey(fromJson: _parseInt)
  int get quantity => throw _privateConstructorUsedError;
  List<String> get modifiers => throw _privateConstructorUsedError;
  String? get itemNote => throw _privateConstructorUsedError;
  bool get isVoided => throw _privateConstructorUsedError;

  Map<String, dynamic> toJson() => throw _privateConstructorUsedError;
  @JsonKey(ignore: true)
  $ActiveCartItemCopyWith<ActiveCartItem> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $ActiveCartItemCopyWith<$Res> {
  factory $ActiveCartItemCopyWith(
          ActiveCartItem value, $Res Function(ActiveCartItem) then) =
      _$ActiveCartItemCopyWithImpl<$Res, ActiveCartItem>;
  @useResult
  $Res call(
      {String itemId,
      String name,
      @JsonKey(fromJson: _parseInt) int quantity,
      List<String> modifiers,
      String? itemNote,
      bool isVoided});
}

/// @nodoc
class _$ActiveCartItemCopyWithImpl<$Res, $Val extends ActiveCartItem>
    implements $ActiveCartItemCopyWith<$Res> {
  _$ActiveCartItemCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? itemId = null,
    Object? name = null,
    Object? quantity = null,
    Object? modifiers = null,
    Object? itemNote = freezed,
    Object? isVoided = null,
  }) {
    return _then(_value.copyWith(
      itemId: null == itemId
          ? _value.itemId
          : itemId // ignore: cast_nullable_to_non_nullable
              as String,
      name: null == name
          ? _value.name
          : name // ignore: cast_nullable_to_non_nullable
              as String,
      quantity: null == quantity
          ? _value.quantity
          : quantity // ignore: cast_nullable_to_non_nullable
              as int,
      modifiers: null == modifiers
          ? _value.modifiers
          : modifiers // ignore: cast_nullable_to_non_nullable
              as List<String>,
      itemNote: freezed == itemNote
          ? _value.itemNote
          : itemNote // ignore: cast_nullable_to_non_nullable
              as String?,
      isVoided: null == isVoided
          ? _value.isVoided
          : isVoided // ignore: cast_nullable_to_non_nullable
              as bool,
    ) as $Val);
  }
}

/// @nodoc
abstract class _$$ActiveCartItemImplCopyWith<$Res>
    implements $ActiveCartItemCopyWith<$Res> {
  factory _$$ActiveCartItemImplCopyWith(_$ActiveCartItemImpl value,
          $Res Function(_$ActiveCartItemImpl) then) =
      __$$ActiveCartItemImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call(
      {String itemId,
      String name,
      @JsonKey(fromJson: _parseInt) int quantity,
      List<String> modifiers,
      String? itemNote,
      bool isVoided});
}

/// @nodoc
class __$$ActiveCartItemImplCopyWithImpl<$Res>
    extends _$ActiveCartItemCopyWithImpl<$Res, _$ActiveCartItemImpl>
    implements _$$ActiveCartItemImplCopyWith<$Res> {
  __$$ActiveCartItemImplCopyWithImpl(
      _$ActiveCartItemImpl _value, $Res Function(_$ActiveCartItemImpl) _then)
      : super(_value, _then);

  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? itemId = null,
    Object? name = null,
    Object? quantity = null,
    Object? modifiers = null,
    Object? itemNote = freezed,
    Object? isVoided = null,
  }) {
    return _then(_$ActiveCartItemImpl(
      itemId: null == itemId
          ? _value.itemId
          : itemId // ignore: cast_nullable_to_non_nullable
              as String,
      name: null == name
          ? _value.name
          : name // ignore: cast_nullable_to_non_nullable
              as String,
      quantity: null == quantity
          ? _value.quantity
          : quantity // ignore: cast_nullable_to_non_nullable
              as int,
      modifiers: null == modifiers
          ? _value._modifiers
          : modifiers // ignore: cast_nullable_to_non_nullable
              as List<String>,
      itemNote: freezed == itemNote
          ? _value.itemNote
          : itemNote // ignore: cast_nullable_to_non_nullable
              as String?,
      isVoided: null == isVoided
          ? _value.isVoided
          : isVoided // ignore: cast_nullable_to_non_nullable
              as bool,
    ));
  }
}

/// @nodoc
@JsonSerializable()
class _$ActiveCartItemImpl implements _ActiveCartItem {
  const _$ActiveCartItemImpl(
      {this.itemId = '',
      this.name = 'Unknown Item',
      @JsonKey(fromJson: _parseInt) this.quantity = 1,
      final List<String> modifiers = const [],
      this.itemNote,
      this.isVoided = false})
      : _modifiers = modifiers;

  factory _$ActiveCartItemImpl.fromJson(Map<String, dynamic> json) =>
      _$$ActiveCartItemImplFromJson(json);

  @override
  @JsonKey()
  final String itemId;
  @override
  @JsonKey()
  final String name;
  @override
  @JsonKey(fromJson: _parseInt)
  final int quantity;
  final List<String> _modifiers;
  @override
  @JsonKey()
  List<String> get modifiers {
    if (_modifiers is EqualUnmodifiableListView) return _modifiers;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableListView(_modifiers);
  }

  @override
  final String? itemNote;
  @override
  @JsonKey()
  final bool isVoided;

  @override
  String toString() {
    return 'ActiveCartItem(itemId: $itemId, name: $name, quantity: $quantity, modifiers: $modifiers, itemNote: $itemNote, isVoided: $isVoided)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$ActiveCartItemImpl &&
            (identical(other.itemId, itemId) || other.itemId == itemId) &&
            (identical(other.name, name) || other.name == name) &&
            (identical(other.quantity, quantity) ||
                other.quantity == quantity) &&
            const DeepCollectionEquality()
                .equals(other._modifiers, _modifiers) &&
            (identical(other.itemNote, itemNote) ||
                other.itemNote == itemNote) &&
            (identical(other.isVoided, isVoided) ||
                other.isVoided == isVoided));
  }

  @JsonKey(ignore: true)
  @override
  int get hashCode => Object.hash(runtimeType, itemId, name, quantity,
      const DeepCollectionEquality().hash(_modifiers), itemNote, isVoided);

  @JsonKey(ignore: true)
  @override
  @pragma('vm:prefer-inline')
  _$$ActiveCartItemImplCopyWith<_$ActiveCartItemImpl> get copyWith =>
      __$$ActiveCartItemImplCopyWithImpl<_$ActiveCartItemImpl>(
          this, _$identity);

  @override
  Map<String, dynamic> toJson() {
    return _$$ActiveCartItemImplToJson(
      this,
    );
  }
}

abstract class _ActiveCartItem implements ActiveCartItem {
  const factory _ActiveCartItem(
      {final String itemId,
      final String name,
      @JsonKey(fromJson: _parseInt) final int quantity,
      final List<String> modifiers,
      final String? itemNote,
      final bool isVoided}) = _$ActiveCartItemImpl;

  factory _ActiveCartItem.fromJson(Map<String, dynamic> json) =
      _$ActiveCartItemImpl.fromJson;

  @override
  String get itemId;
  @override
  String get name;
  @override
  @JsonKey(fromJson: _parseInt)
  int get quantity;
  @override
  List<String> get modifiers;
  @override
  String? get itemNote;
  @override
  bool get isVoided;
  @override
  @JsonKey(ignore: true)
  _$$ActiveCartItemImplCopyWith<_$ActiveCartItemImpl> get copyWith =>
      throw _privateConstructorUsedError;
}

ActiveCartsResponse _$ActiveCartsResponseFromJson(Map<String, dynamic> json) {
  return _ActiveCartsResponse.fromJson(json);
}

/// @nodoc
mixin _$ActiveCartsResponse {
  List<ActiveKitchenCart> get carts => throw _privateConstructorUsedError;
  @JsonKey(fromJson: _parseViewType)
  KitchenViewType get widgetType => throw _privateConstructorUsedError;

  Map<String, dynamic> toJson() => throw _privateConstructorUsedError;
  @JsonKey(ignore: true)
  $ActiveCartsResponseCopyWith<ActiveCartsResponse> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $ActiveCartsResponseCopyWith<$Res> {
  factory $ActiveCartsResponseCopyWith(
          ActiveCartsResponse value, $Res Function(ActiveCartsResponse) then) =
      _$ActiveCartsResponseCopyWithImpl<$Res, ActiveCartsResponse>;
  @useResult
  $Res call(
      {List<ActiveKitchenCart> carts,
      @JsonKey(fromJson: _parseViewType) KitchenViewType widgetType});
}

/// @nodoc
class _$ActiveCartsResponseCopyWithImpl<$Res, $Val extends ActiveCartsResponse>
    implements $ActiveCartsResponseCopyWith<$Res> {
  _$ActiveCartsResponseCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? carts = null,
    Object? widgetType = null,
  }) {
    return _then(_value.copyWith(
      carts: null == carts
          ? _value.carts
          : carts // ignore: cast_nullable_to_non_nullable
              as List<ActiveKitchenCart>,
      widgetType: null == widgetType
          ? _value.widgetType
          : widgetType // ignore: cast_nullable_to_non_nullable
              as KitchenViewType,
    ) as $Val);
  }
}

/// @nodoc
abstract class _$$ActiveCartsResponseImplCopyWith<$Res>
    implements $ActiveCartsResponseCopyWith<$Res> {
  factory _$$ActiveCartsResponseImplCopyWith(_$ActiveCartsResponseImpl value,
          $Res Function(_$ActiveCartsResponseImpl) then) =
      __$$ActiveCartsResponseImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call(
      {List<ActiveKitchenCart> carts,
      @JsonKey(fromJson: _parseViewType) KitchenViewType widgetType});
}

/// @nodoc
class __$$ActiveCartsResponseImplCopyWithImpl<$Res>
    extends _$ActiveCartsResponseCopyWithImpl<$Res, _$ActiveCartsResponseImpl>
    implements _$$ActiveCartsResponseImplCopyWith<$Res> {
  __$$ActiveCartsResponseImplCopyWithImpl(_$ActiveCartsResponseImpl _value,
      $Res Function(_$ActiveCartsResponseImpl) _then)
      : super(_value, _then);

  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? carts = null,
    Object? widgetType = null,
  }) {
    return _then(_$ActiveCartsResponseImpl(
      carts: null == carts
          ? _value._carts
          : carts // ignore: cast_nullable_to_non_nullable
              as List<ActiveKitchenCart>,
      widgetType: null == widgetType
          ? _value.widgetType
          : widgetType // ignore: cast_nullable_to_non_nullable
              as KitchenViewType,
    ));
  }
}

/// @nodoc
@JsonSerializable()
class _$ActiveCartsResponseImpl implements _ActiveCartsResponse {
  const _$ActiveCartsResponseImpl(
      {final List<ActiveKitchenCart> carts = const [],
      @JsonKey(fromJson: _parseViewType)
      this.widgetType = KitchenViewType.cart})
      : _carts = carts;

  factory _$ActiveCartsResponseImpl.fromJson(Map<String, dynamic> json) =>
      _$$ActiveCartsResponseImplFromJson(json);

  final List<ActiveKitchenCart> _carts;
  @override
  @JsonKey()
  List<ActiveKitchenCart> get carts {
    if (_carts is EqualUnmodifiableListView) return _carts;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableListView(_carts);
  }

  @override
  @JsonKey(fromJson: _parseViewType)
  final KitchenViewType widgetType;

  @override
  String toString() {
    return 'ActiveCartsResponse(carts: $carts, widgetType: $widgetType)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$ActiveCartsResponseImpl &&
            const DeepCollectionEquality().equals(other._carts, _carts) &&
            (identical(other.widgetType, widgetType) ||
                other.widgetType == widgetType));
  }

  @JsonKey(ignore: true)
  @override
  int get hashCode => Object.hash(
      runtimeType, const DeepCollectionEquality().hash(_carts), widgetType);

  @JsonKey(ignore: true)
  @override
  @pragma('vm:prefer-inline')
  _$$ActiveCartsResponseImplCopyWith<_$ActiveCartsResponseImpl> get copyWith =>
      __$$ActiveCartsResponseImplCopyWithImpl<_$ActiveCartsResponseImpl>(
          this, _$identity);

  @override
  Map<String, dynamic> toJson() {
    return _$$ActiveCartsResponseImplToJson(
      this,
    );
  }
}

abstract class _ActiveCartsResponse implements ActiveCartsResponse {
  const factory _ActiveCartsResponse(
      {final List<ActiveKitchenCart> carts,
      @JsonKey(fromJson: _parseViewType)
      final KitchenViewType widgetType}) = _$ActiveCartsResponseImpl;

  factory _ActiveCartsResponse.fromJson(Map<String, dynamic> json) =
      _$ActiveCartsResponseImpl.fromJson;

  @override
  List<ActiveKitchenCart> get carts;
  @override
  @JsonKey(fromJson: _parseViewType)
  KitchenViewType get widgetType;
  @override
  @JsonKey(ignore: true)
  _$$ActiveCartsResponseImplCopyWith<_$ActiveCartsResponseImpl> get copyWith =>
      throw _privateConstructorUsedError;
}

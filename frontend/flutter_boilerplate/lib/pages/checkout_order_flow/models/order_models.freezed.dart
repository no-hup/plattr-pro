// coverage:ignore-file
// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'order_models.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

T _$identity<T>(T value) => value;

final _privateConstructorUsedError = UnsupportedError(
    'It seems like you constructed your class using `MyClass._()`. This constructor is only meant to be used by freezed and you are not supposed to need it nor use it.\nPlease check the documentation here for more information: https://github.com/rrousselGit/freezed#adding-getters-and-methods-to-our-models');

/// @nodoc
mixin _$OrderResponse {
  String get status => throw _privateConstructorUsedError;
  String? get message => throw _privateConstructorUsedError;
  OrderData? get data => throw _privateConstructorUsedError;

  @JsonKey(ignore: true)
  $OrderResponseCopyWith<OrderResponse> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $OrderResponseCopyWith<$Res> {
  factory $OrderResponseCopyWith(
          OrderResponse value, $Res Function(OrderResponse) then) =
      _$OrderResponseCopyWithImpl<$Res, OrderResponse>;
  @useResult
  $Res call({String status, String? message, OrderData? data});

  $OrderDataCopyWith<$Res>? get data;
}

/// @nodoc
class _$OrderResponseCopyWithImpl<$Res, $Val extends OrderResponse>
    implements $OrderResponseCopyWith<$Res> {
  _$OrderResponseCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? status = null,
    Object? message = freezed,
    Object? data = freezed,
  }) {
    return _then(_value.copyWith(
      status: null == status
          ? _value.status
          : status // ignore: cast_nullable_to_non_nullable
              as String,
      message: freezed == message
          ? _value.message
          : message // ignore: cast_nullable_to_non_nullable
              as String?,
      data: freezed == data
          ? _value.data
          : data // ignore: cast_nullable_to_non_nullable
              as OrderData?,
    ) as $Val);
  }

  @override
  @pragma('vm:prefer-inline')
  $OrderDataCopyWith<$Res>? get data {
    if (_value.data == null) {
      return null;
    }

    return $OrderDataCopyWith<$Res>(_value.data!, (value) {
      return _then(_value.copyWith(data: value) as $Val);
    });
  }
}

/// @nodoc
abstract class _$$OrderResponseImplCopyWith<$Res>
    implements $OrderResponseCopyWith<$Res> {
  factory _$$OrderResponseImplCopyWith(
          _$OrderResponseImpl value, $Res Function(_$OrderResponseImpl) then) =
      __$$OrderResponseImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call({String status, String? message, OrderData? data});

  @override
  $OrderDataCopyWith<$Res>? get data;
}

/// @nodoc
class __$$OrderResponseImplCopyWithImpl<$Res>
    extends _$OrderResponseCopyWithImpl<$Res, _$OrderResponseImpl>
    implements _$$OrderResponseImplCopyWith<$Res> {
  __$$OrderResponseImplCopyWithImpl(
      _$OrderResponseImpl _value, $Res Function(_$OrderResponseImpl) _then)
      : super(_value, _then);

  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? status = null,
    Object? message = freezed,
    Object? data = freezed,
  }) {
    return _then(_$OrderResponseImpl(
      status: null == status
          ? _value.status
          : status // ignore: cast_nullable_to_non_nullable
              as String,
      message: freezed == message
          ? _value.message
          : message // ignore: cast_nullable_to_non_nullable
              as String?,
      data: freezed == data
          ? _value.data
          : data // ignore: cast_nullable_to_non_nullable
              as OrderData?,
    ));
  }
}

/// @nodoc

class _$OrderResponseImpl extends _OrderResponse {
  const _$OrderResponseImpl({required this.status, this.message, this.data})
      : super._();

  @override
  final String status;
  @override
  final String? message;
  @override
  final OrderData? data;

  @override
  String toString() {
    return 'OrderResponse(status: $status, message: $message, data: $data)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$OrderResponseImpl &&
            (identical(other.status, status) || other.status == status) &&
            (identical(other.message, message) || other.message == message) &&
            (identical(other.data, data) || other.data == data));
  }

  @override
  int get hashCode => Object.hash(runtimeType, status, message, data);

  @JsonKey(ignore: true)
  @override
  @pragma('vm:prefer-inline')
  _$$OrderResponseImplCopyWith<_$OrderResponseImpl> get copyWith =>
      __$$OrderResponseImplCopyWithImpl<_$OrderResponseImpl>(this, _$identity);
}

abstract class _OrderResponse extends OrderResponse {
  const factory _OrderResponse(
      {required final String status,
      final String? message,
      final OrderData? data}) = _$OrderResponseImpl;
  const _OrderResponse._() : super._();

  @override
  String get status;
  @override
  String? get message;
  @override
  OrderData? get data;
  @override
  @JsonKey(ignore: true)
  _$$OrderResponseImplCopyWith<_$OrderResponseImpl> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
mixin _$OrderData {
  String get id => throw _privateConstructorUsedError;
  String get orderNumber => throw _privateConstructorUsedError;
  String get orderStatus => throw _privateConstructorUsedError;
  String get tableId => throw _privateConstructorUsedError;
  String get restaurantId => throw _privateConstructorUsedError;
  String get sessionId => throw _privateConstructorUsedError;
  @TimestampConverter()
  DateTime? get createdAt => throw _privateConstructorUsedError;
  @TimestampConverter()
  DateTime? get updatedAt => throw _privateConstructorUsedError;
  double get total => throw _privateConstructorUsedError;
  List<OrderItem> get items => throw _privateConstructorUsedError;
  String get notes => throw _privateConstructorUsedError;
  @JsonKey(name: 'carts', defaultValue: [])
  List<CartHistoryItem> get carts => throw _privateConstructorUsedError;

  @JsonKey(ignore: true)
  $OrderDataCopyWith<OrderData> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $OrderDataCopyWith<$Res> {
  factory $OrderDataCopyWith(OrderData value, $Res Function(OrderData) then) =
      _$OrderDataCopyWithImpl<$Res, OrderData>;
  @useResult
  $Res call(
      {String id,
      String orderNumber,
      String orderStatus,
      String tableId,
      String restaurantId,
      String sessionId,
      @TimestampConverter() DateTime? createdAt,
      @TimestampConverter() DateTime? updatedAt,
      double total,
      List<OrderItem> items,
      String notes,
      @JsonKey(name: 'carts', defaultValue: []) List<CartHistoryItem> carts});
}

/// @nodoc
class _$OrderDataCopyWithImpl<$Res, $Val extends OrderData>
    implements $OrderDataCopyWith<$Res> {
  _$OrderDataCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? id = null,
    Object? orderNumber = null,
    Object? orderStatus = null,
    Object? tableId = null,
    Object? restaurantId = null,
    Object? sessionId = null,
    Object? createdAt = freezed,
    Object? updatedAt = freezed,
    Object? total = null,
    Object? items = null,
    Object? notes = null,
    Object? carts = null,
  }) {
    return _then(_value.copyWith(
      id: null == id
          ? _value.id
          : id // ignore: cast_nullable_to_non_nullable
              as String,
      orderNumber: null == orderNumber
          ? _value.orderNumber
          : orderNumber // ignore: cast_nullable_to_non_nullable
              as String,
      orderStatus: null == orderStatus
          ? _value.orderStatus
          : orderStatus // ignore: cast_nullable_to_non_nullable
              as String,
      tableId: null == tableId
          ? _value.tableId
          : tableId // ignore: cast_nullable_to_non_nullable
              as String,
      restaurantId: null == restaurantId
          ? _value.restaurantId
          : restaurantId // ignore: cast_nullable_to_non_nullable
              as String,
      sessionId: null == sessionId
          ? _value.sessionId
          : sessionId // ignore: cast_nullable_to_non_nullable
              as String,
      createdAt: freezed == createdAt
          ? _value.createdAt
          : createdAt // ignore: cast_nullable_to_non_nullable
              as DateTime?,
      updatedAt: freezed == updatedAt
          ? _value.updatedAt
          : updatedAt // ignore: cast_nullable_to_non_nullable
              as DateTime?,
      total: null == total
          ? _value.total
          : total // ignore: cast_nullable_to_non_nullable
              as double,
      items: null == items
          ? _value.items
          : items // ignore: cast_nullable_to_non_nullable
              as List<OrderItem>,
      notes: null == notes
          ? _value.notes
          : notes // ignore: cast_nullable_to_non_nullable
              as String,
      carts: null == carts
          ? _value.carts
          : carts // ignore: cast_nullable_to_non_nullable
              as List<CartHistoryItem>,
    ) as $Val);
  }
}

/// @nodoc
abstract class _$$OrderDataImplCopyWith<$Res>
    implements $OrderDataCopyWith<$Res> {
  factory _$$OrderDataImplCopyWith(
          _$OrderDataImpl value, $Res Function(_$OrderDataImpl) then) =
      __$$OrderDataImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call(
      {String id,
      String orderNumber,
      String orderStatus,
      String tableId,
      String restaurantId,
      String sessionId,
      @TimestampConverter() DateTime? createdAt,
      @TimestampConverter() DateTime? updatedAt,
      double total,
      List<OrderItem> items,
      String notes,
      @JsonKey(name: 'carts', defaultValue: []) List<CartHistoryItem> carts});
}

/// @nodoc
class __$$OrderDataImplCopyWithImpl<$Res>
    extends _$OrderDataCopyWithImpl<$Res, _$OrderDataImpl>
    implements _$$OrderDataImplCopyWith<$Res> {
  __$$OrderDataImplCopyWithImpl(
      _$OrderDataImpl _value, $Res Function(_$OrderDataImpl) _then)
      : super(_value, _then);

  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? id = null,
    Object? orderNumber = null,
    Object? orderStatus = null,
    Object? tableId = null,
    Object? restaurantId = null,
    Object? sessionId = null,
    Object? createdAt = freezed,
    Object? updatedAt = freezed,
    Object? total = null,
    Object? items = null,
    Object? notes = null,
    Object? carts = null,
  }) {
    return _then(_$OrderDataImpl(
      id: null == id
          ? _value.id
          : id // ignore: cast_nullable_to_non_nullable
              as String,
      orderNumber: null == orderNumber
          ? _value.orderNumber
          : orderNumber // ignore: cast_nullable_to_non_nullable
              as String,
      orderStatus: null == orderStatus
          ? _value.orderStatus
          : orderStatus // ignore: cast_nullable_to_non_nullable
              as String,
      tableId: null == tableId
          ? _value.tableId
          : tableId // ignore: cast_nullable_to_non_nullable
              as String,
      restaurantId: null == restaurantId
          ? _value.restaurantId
          : restaurantId // ignore: cast_nullable_to_non_nullable
              as String,
      sessionId: null == sessionId
          ? _value.sessionId
          : sessionId // ignore: cast_nullable_to_non_nullable
              as String,
      createdAt: freezed == createdAt
          ? _value.createdAt
          : createdAt // ignore: cast_nullable_to_non_nullable
              as DateTime?,
      updatedAt: freezed == updatedAt
          ? _value.updatedAt
          : updatedAt // ignore: cast_nullable_to_non_nullable
              as DateTime?,
      total: null == total
          ? _value.total
          : total // ignore: cast_nullable_to_non_nullable
              as double,
      items: null == items
          ? _value._items
          : items // ignore: cast_nullable_to_non_nullable
              as List<OrderItem>,
      notes: null == notes
          ? _value.notes
          : notes // ignore: cast_nullable_to_non_nullable
              as String,
      carts: null == carts
          ? _value._carts
          : carts // ignore: cast_nullable_to_non_nullable
              as List<CartHistoryItem>,
    ));
  }
}

/// @nodoc

class _$OrderDataImpl extends _OrderData {
  const _$OrderDataImpl(
      {required this.id,
      required this.orderNumber,
      required this.orderStatus,
      required this.tableId,
      required this.restaurantId,
      required this.sessionId,
      @TimestampConverter() this.createdAt,
      @TimestampConverter() this.updatedAt,
      this.total = 0.0,
      final List<OrderItem> items = const [],
      this.notes = '',
      @JsonKey(name: 'carts', defaultValue: [])
      final List<CartHistoryItem> carts = const []})
      : _items = items,
        _carts = carts,
        super._();

  @override
  final String id;
  @override
  final String orderNumber;
  @override
  final String orderStatus;
  @override
  final String tableId;
  @override
  final String restaurantId;
  @override
  final String sessionId;
  @override
  @TimestampConverter()
  final DateTime? createdAt;
  @override
  @TimestampConverter()
  final DateTime? updatedAt;
  @override
  @JsonKey()
  final double total;
  final List<OrderItem> _items;
  @override
  @JsonKey()
  List<OrderItem> get items {
    if (_items is EqualUnmodifiableListView) return _items;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableListView(_items);
  }

  @override
  @JsonKey()
  final String notes;
  final List<CartHistoryItem> _carts;
  @override
  @JsonKey(name: 'carts', defaultValue: [])
  List<CartHistoryItem> get carts {
    if (_carts is EqualUnmodifiableListView) return _carts;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableListView(_carts);
  }

  @override
  String toString() {
    return 'OrderData(id: $id, orderNumber: $orderNumber, orderStatus: $orderStatus, tableId: $tableId, restaurantId: $restaurantId, sessionId: $sessionId, createdAt: $createdAt, updatedAt: $updatedAt, total: $total, items: $items, notes: $notes, carts: $carts)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$OrderDataImpl &&
            (identical(other.id, id) || other.id == id) &&
            (identical(other.orderNumber, orderNumber) ||
                other.orderNumber == orderNumber) &&
            (identical(other.orderStatus, orderStatus) ||
                other.orderStatus == orderStatus) &&
            (identical(other.tableId, tableId) || other.tableId == tableId) &&
            (identical(other.restaurantId, restaurantId) ||
                other.restaurantId == restaurantId) &&
            (identical(other.sessionId, sessionId) ||
                other.sessionId == sessionId) &&
            (identical(other.createdAt, createdAt) ||
                other.createdAt == createdAt) &&
            (identical(other.updatedAt, updatedAt) ||
                other.updatedAt == updatedAt) &&
            (identical(other.total, total) || other.total == total) &&
            const DeepCollectionEquality().equals(other._items, _items) &&
            (identical(other.notes, notes) || other.notes == notes) &&
            const DeepCollectionEquality().equals(other._carts, _carts));
  }

  @override
  int get hashCode => Object.hash(
      runtimeType,
      id,
      orderNumber,
      orderStatus,
      tableId,
      restaurantId,
      sessionId,
      createdAt,
      updatedAt,
      total,
      const DeepCollectionEquality().hash(_items),
      notes,
      const DeepCollectionEquality().hash(_carts));

  @JsonKey(ignore: true)
  @override
  @pragma('vm:prefer-inline')
  _$$OrderDataImplCopyWith<_$OrderDataImpl> get copyWith =>
      __$$OrderDataImplCopyWithImpl<_$OrderDataImpl>(this, _$identity);
}

abstract class _OrderData extends OrderData {
  const factory _OrderData(
      {required final String id,
      required final String orderNumber,
      required final String orderStatus,
      required final String tableId,
      required final String restaurantId,
      required final String sessionId,
      @TimestampConverter() final DateTime? createdAt,
      @TimestampConverter() final DateTime? updatedAt,
      final double total,
      final List<OrderItem> items,
      final String notes,
      @JsonKey(name: 'carts', defaultValue: [])
      final List<CartHistoryItem> carts}) = _$OrderDataImpl;
  const _OrderData._() : super._();

  @override
  String get id;
  @override
  String get orderNumber;
  @override
  String get orderStatus;
  @override
  String get tableId;
  @override
  String get restaurantId;
  @override
  String get sessionId;
  @override
  @TimestampConverter()
  DateTime? get createdAt;
  @override
  @TimestampConverter()
  DateTime? get updatedAt;
  @override
  double get total;
  @override
  List<OrderItem> get items;
  @override
  String get notes;
  @override
  @JsonKey(name: 'carts', defaultValue: [])
  List<CartHistoryItem> get carts;
  @override
  @JsonKey(ignore: true)
  _$$OrderDataImplCopyWith<_$OrderDataImpl> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
mixin _$CartHistoryItem {
  String get id => throw _privateConstructorUsedError;
  String get status => throw _privateConstructorUsedError;
  @JsonKey(name: 'checkoutTime')
  @TimestampConverter()
  DateTime? get checkoutTime => throw _privateConstructorUsedError;
  double get total => throw _privateConstructorUsedError;
  @JsonKey(name: 'priceInfo')
  CartPriceInfoDetail? get priceInfo => throw _privateConstructorUsedError;
  List<OrderItem> get items => throw _privateConstructorUsedError;
  String? get notes => throw _privateConstructorUsedError;
  int? get estimatedPrepTime => throw _privateConstructorUsedError;

  @JsonKey(ignore: true)
  $CartHistoryItemCopyWith<CartHistoryItem> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $CartHistoryItemCopyWith<$Res> {
  factory $CartHistoryItemCopyWith(
          CartHistoryItem value, $Res Function(CartHistoryItem) then) =
      _$CartHistoryItemCopyWithImpl<$Res, CartHistoryItem>;
  @useResult
  $Res call(
      {String id,
      String status,
      @JsonKey(name: 'checkoutTime')
      @TimestampConverter()
      DateTime? checkoutTime,
      double total,
      @JsonKey(name: 'priceInfo') CartPriceInfoDetail? priceInfo,
      List<OrderItem> items,
      String? notes,
      int? estimatedPrepTime});

  $CartPriceInfoDetailCopyWith<$Res>? get priceInfo;
}

/// @nodoc
class _$CartHistoryItemCopyWithImpl<$Res, $Val extends CartHistoryItem>
    implements $CartHistoryItemCopyWith<$Res> {
  _$CartHistoryItemCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? id = null,
    Object? status = null,
    Object? checkoutTime = freezed,
    Object? total = null,
    Object? priceInfo = freezed,
    Object? items = null,
    Object? notes = freezed,
    Object? estimatedPrepTime = freezed,
  }) {
    return _then(_value.copyWith(
      id: null == id
          ? _value.id
          : id // ignore: cast_nullable_to_non_nullable
              as String,
      status: null == status
          ? _value.status
          : status // ignore: cast_nullable_to_non_nullable
              as String,
      checkoutTime: freezed == checkoutTime
          ? _value.checkoutTime
          : checkoutTime // ignore: cast_nullable_to_non_nullable
              as DateTime?,
      total: null == total
          ? _value.total
          : total // ignore: cast_nullable_to_non_nullable
              as double,
      priceInfo: freezed == priceInfo
          ? _value.priceInfo
          : priceInfo // ignore: cast_nullable_to_non_nullable
              as CartPriceInfoDetail?,
      items: null == items
          ? _value.items
          : items // ignore: cast_nullable_to_non_nullable
              as List<OrderItem>,
      notes: freezed == notes
          ? _value.notes
          : notes // ignore: cast_nullable_to_non_nullable
              as String?,
      estimatedPrepTime: freezed == estimatedPrepTime
          ? _value.estimatedPrepTime
          : estimatedPrepTime // ignore: cast_nullable_to_non_nullable
              as int?,
    ) as $Val);
  }

  @override
  @pragma('vm:prefer-inline')
  $CartPriceInfoDetailCopyWith<$Res>? get priceInfo {
    if (_value.priceInfo == null) {
      return null;
    }

    return $CartPriceInfoDetailCopyWith<$Res>(_value.priceInfo!, (value) {
      return _then(_value.copyWith(priceInfo: value) as $Val);
    });
  }
}

/// @nodoc
abstract class _$$CartHistoryItemImplCopyWith<$Res>
    implements $CartHistoryItemCopyWith<$Res> {
  factory _$$CartHistoryItemImplCopyWith(_$CartHistoryItemImpl value,
          $Res Function(_$CartHistoryItemImpl) then) =
      __$$CartHistoryItemImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call(
      {String id,
      String status,
      @JsonKey(name: 'checkoutTime')
      @TimestampConverter()
      DateTime? checkoutTime,
      double total,
      @JsonKey(name: 'priceInfo') CartPriceInfoDetail? priceInfo,
      List<OrderItem> items,
      String? notes,
      int? estimatedPrepTime});

  @override
  $CartPriceInfoDetailCopyWith<$Res>? get priceInfo;
}

/// @nodoc
class __$$CartHistoryItemImplCopyWithImpl<$Res>
    extends _$CartHistoryItemCopyWithImpl<$Res, _$CartHistoryItemImpl>
    implements _$$CartHistoryItemImplCopyWith<$Res> {
  __$$CartHistoryItemImplCopyWithImpl(
      _$CartHistoryItemImpl _value, $Res Function(_$CartHistoryItemImpl) _then)
      : super(_value, _then);

  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? id = null,
    Object? status = null,
    Object? checkoutTime = freezed,
    Object? total = null,
    Object? priceInfo = freezed,
    Object? items = null,
    Object? notes = freezed,
    Object? estimatedPrepTime = freezed,
  }) {
    return _then(_$CartHistoryItemImpl(
      id: null == id
          ? _value.id
          : id // ignore: cast_nullable_to_non_nullable
              as String,
      status: null == status
          ? _value.status
          : status // ignore: cast_nullable_to_non_nullable
              as String,
      checkoutTime: freezed == checkoutTime
          ? _value.checkoutTime
          : checkoutTime // ignore: cast_nullable_to_non_nullable
              as DateTime?,
      total: null == total
          ? _value.total
          : total // ignore: cast_nullable_to_non_nullable
              as double,
      priceInfo: freezed == priceInfo
          ? _value.priceInfo
          : priceInfo // ignore: cast_nullable_to_non_nullable
              as CartPriceInfoDetail?,
      items: null == items
          ? _value._items
          : items // ignore: cast_nullable_to_non_nullable
              as List<OrderItem>,
      notes: freezed == notes
          ? _value.notes
          : notes // ignore: cast_nullable_to_non_nullable
              as String?,
      estimatedPrepTime: freezed == estimatedPrepTime
          ? _value.estimatedPrepTime
          : estimatedPrepTime // ignore: cast_nullable_to_non_nullable
              as int?,
    ));
  }
}

/// @nodoc

class _$CartHistoryItemImpl extends _CartHistoryItem {
  const _$CartHistoryItemImpl(
      {this.id = '',
      this.status = 'pending',
      @JsonKey(name: 'checkoutTime') @TimestampConverter() this.checkoutTime,
      this.total = 0.0,
      @JsonKey(name: 'priceInfo') this.priceInfo,
      final List<OrderItem> items = const [],
      this.notes,
      this.estimatedPrepTime})
      : _items = items,
        super._();

  @override
  @JsonKey()
  final String id;
  @override
  @JsonKey()
  final String status;
  @override
  @JsonKey(name: 'checkoutTime')
  @TimestampConverter()
  final DateTime? checkoutTime;
  @override
  @JsonKey()
  final double total;
  @override
  @JsonKey(name: 'priceInfo')
  final CartPriceInfoDetail? priceInfo;
  final List<OrderItem> _items;
  @override
  @JsonKey()
  List<OrderItem> get items {
    if (_items is EqualUnmodifiableListView) return _items;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableListView(_items);
  }

  @override
  final String? notes;
  @override
  final int? estimatedPrepTime;

  @override
  String toString() {
    return 'CartHistoryItem(id: $id, status: $status, checkoutTime: $checkoutTime, total: $total, priceInfo: $priceInfo, items: $items, notes: $notes, estimatedPrepTime: $estimatedPrepTime)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$CartHistoryItemImpl &&
            (identical(other.id, id) || other.id == id) &&
            (identical(other.status, status) || other.status == status) &&
            (identical(other.checkoutTime, checkoutTime) ||
                other.checkoutTime == checkoutTime) &&
            (identical(other.total, total) || other.total == total) &&
            (identical(other.priceInfo, priceInfo) ||
                other.priceInfo == priceInfo) &&
            const DeepCollectionEquality().equals(other._items, _items) &&
            (identical(other.notes, notes) || other.notes == notes) &&
            (identical(other.estimatedPrepTime, estimatedPrepTime) ||
                other.estimatedPrepTime == estimatedPrepTime));
  }

  @override
  int get hashCode => Object.hash(
      runtimeType,
      id,
      status,
      checkoutTime,
      total,
      priceInfo,
      const DeepCollectionEquality().hash(_items),
      notes,
      estimatedPrepTime);

  @JsonKey(ignore: true)
  @override
  @pragma('vm:prefer-inline')
  _$$CartHistoryItemImplCopyWith<_$CartHistoryItemImpl> get copyWith =>
      __$$CartHistoryItemImplCopyWithImpl<_$CartHistoryItemImpl>(
          this, _$identity);
}

abstract class _CartHistoryItem extends CartHistoryItem {
  const factory _CartHistoryItem(
      {final String id,
      final String status,
      @JsonKey(name: 'checkoutTime')
      @TimestampConverter()
      final DateTime? checkoutTime,
      final double total,
      @JsonKey(name: 'priceInfo') final CartPriceInfoDetail? priceInfo,
      final List<OrderItem> items,
      final String? notes,
      final int? estimatedPrepTime}) = _$CartHistoryItemImpl;
  const _CartHistoryItem._() : super._();

  @override
  String get id;
  @override
  String get status;
  @override
  @JsonKey(name: 'checkoutTime')
  @TimestampConverter()
  DateTime? get checkoutTime;
  @override
  double get total;
  @override
  @JsonKey(name: 'priceInfo')
  CartPriceInfoDetail? get priceInfo;
  @override
  List<OrderItem> get items;
  @override
  String? get notes;
  @override
  int? get estimatedPrepTime;
  @override
  @JsonKey(ignore: true)
  _$$CartHistoryItemImplCopyWith<_$CartHistoryItemImpl> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
mixin _$CartPriceInfoDetail {
  double get basePrice => throw _privateConstructorUsedError;
  double get finalPrice => throw _privateConstructorUsedError;
  double get discount => throw _privateConstructorUsedError;
  double get totalDiscountAmount => throw _privateConstructorUsedError;
  double get totalVariantBasePrice => throw _privateConstructorUsedError;
  double get totalAddonBasePrice => throw _privateConstructorUsedError;

  @JsonKey(ignore: true)
  $CartPriceInfoDetailCopyWith<CartPriceInfoDetail> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $CartPriceInfoDetailCopyWith<$Res> {
  factory $CartPriceInfoDetailCopyWith(
          CartPriceInfoDetail value, $Res Function(CartPriceInfoDetail) then) =
      _$CartPriceInfoDetailCopyWithImpl<$Res, CartPriceInfoDetail>;
  @useResult
  $Res call(
      {double basePrice,
      double finalPrice,
      double discount,
      double totalDiscountAmount,
      double totalVariantBasePrice,
      double totalAddonBasePrice});
}

/// @nodoc
class _$CartPriceInfoDetailCopyWithImpl<$Res, $Val extends CartPriceInfoDetail>
    implements $CartPriceInfoDetailCopyWith<$Res> {
  _$CartPriceInfoDetailCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? basePrice = null,
    Object? finalPrice = null,
    Object? discount = null,
    Object? totalDiscountAmount = null,
    Object? totalVariantBasePrice = null,
    Object? totalAddonBasePrice = null,
  }) {
    return _then(_value.copyWith(
      basePrice: null == basePrice
          ? _value.basePrice
          : basePrice // ignore: cast_nullable_to_non_nullable
              as double,
      finalPrice: null == finalPrice
          ? _value.finalPrice
          : finalPrice // ignore: cast_nullable_to_non_nullable
              as double,
      discount: null == discount
          ? _value.discount
          : discount // ignore: cast_nullable_to_non_nullable
              as double,
      totalDiscountAmount: null == totalDiscountAmount
          ? _value.totalDiscountAmount
          : totalDiscountAmount // ignore: cast_nullable_to_non_nullable
              as double,
      totalVariantBasePrice: null == totalVariantBasePrice
          ? _value.totalVariantBasePrice
          : totalVariantBasePrice // ignore: cast_nullable_to_non_nullable
              as double,
      totalAddonBasePrice: null == totalAddonBasePrice
          ? _value.totalAddonBasePrice
          : totalAddonBasePrice // ignore: cast_nullable_to_non_nullable
              as double,
    ) as $Val);
  }
}

/// @nodoc
abstract class _$$CartPriceInfoDetailImplCopyWith<$Res>
    implements $CartPriceInfoDetailCopyWith<$Res> {
  factory _$$CartPriceInfoDetailImplCopyWith(_$CartPriceInfoDetailImpl value,
          $Res Function(_$CartPriceInfoDetailImpl) then) =
      __$$CartPriceInfoDetailImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call(
      {double basePrice,
      double finalPrice,
      double discount,
      double totalDiscountAmount,
      double totalVariantBasePrice,
      double totalAddonBasePrice});
}

/// @nodoc
class __$$CartPriceInfoDetailImplCopyWithImpl<$Res>
    extends _$CartPriceInfoDetailCopyWithImpl<$Res, _$CartPriceInfoDetailImpl>
    implements _$$CartPriceInfoDetailImplCopyWith<$Res> {
  __$$CartPriceInfoDetailImplCopyWithImpl(_$CartPriceInfoDetailImpl _value,
      $Res Function(_$CartPriceInfoDetailImpl) _then)
      : super(_value, _then);

  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? basePrice = null,
    Object? finalPrice = null,
    Object? discount = null,
    Object? totalDiscountAmount = null,
    Object? totalVariantBasePrice = null,
    Object? totalAddonBasePrice = null,
  }) {
    return _then(_$CartPriceInfoDetailImpl(
      basePrice: null == basePrice
          ? _value.basePrice
          : basePrice // ignore: cast_nullable_to_non_nullable
              as double,
      finalPrice: null == finalPrice
          ? _value.finalPrice
          : finalPrice // ignore: cast_nullable_to_non_nullable
              as double,
      discount: null == discount
          ? _value.discount
          : discount // ignore: cast_nullable_to_non_nullable
              as double,
      totalDiscountAmount: null == totalDiscountAmount
          ? _value.totalDiscountAmount
          : totalDiscountAmount // ignore: cast_nullable_to_non_nullable
              as double,
      totalVariantBasePrice: null == totalVariantBasePrice
          ? _value.totalVariantBasePrice
          : totalVariantBasePrice // ignore: cast_nullable_to_non_nullable
              as double,
      totalAddonBasePrice: null == totalAddonBasePrice
          ? _value.totalAddonBasePrice
          : totalAddonBasePrice // ignore: cast_nullable_to_non_nullable
              as double,
    ));
  }
}

/// @nodoc

class _$CartPriceInfoDetailImpl extends _CartPriceInfoDetail {
  const _$CartPriceInfoDetailImpl(
      {this.basePrice = 0.0,
      this.finalPrice = 0.0,
      this.discount = 0.0,
      this.totalDiscountAmount = 0.0,
      this.totalVariantBasePrice = 0.0,
      this.totalAddonBasePrice = 0.0})
      : super._();

  @override
  @JsonKey()
  final double basePrice;
  @override
  @JsonKey()
  final double finalPrice;
  @override
  @JsonKey()
  final double discount;
  @override
  @JsonKey()
  final double totalDiscountAmount;
  @override
  @JsonKey()
  final double totalVariantBasePrice;
  @override
  @JsonKey()
  final double totalAddonBasePrice;

  @override
  String toString() {
    return 'CartPriceInfoDetail(basePrice: $basePrice, finalPrice: $finalPrice, discount: $discount, totalDiscountAmount: $totalDiscountAmount, totalVariantBasePrice: $totalVariantBasePrice, totalAddonBasePrice: $totalAddonBasePrice)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$CartPriceInfoDetailImpl &&
            (identical(other.basePrice, basePrice) ||
                other.basePrice == basePrice) &&
            (identical(other.finalPrice, finalPrice) ||
                other.finalPrice == finalPrice) &&
            (identical(other.discount, discount) ||
                other.discount == discount) &&
            (identical(other.totalDiscountAmount, totalDiscountAmount) ||
                other.totalDiscountAmount == totalDiscountAmount) &&
            (identical(other.totalVariantBasePrice, totalVariantBasePrice) ||
                other.totalVariantBasePrice == totalVariantBasePrice) &&
            (identical(other.totalAddonBasePrice, totalAddonBasePrice) ||
                other.totalAddonBasePrice == totalAddonBasePrice));
  }

  @override
  int get hashCode => Object.hash(runtimeType, basePrice, finalPrice, discount,
      totalDiscountAmount, totalVariantBasePrice, totalAddonBasePrice);

  @JsonKey(ignore: true)
  @override
  @pragma('vm:prefer-inline')
  _$$CartPriceInfoDetailImplCopyWith<_$CartPriceInfoDetailImpl> get copyWith =>
      __$$CartPriceInfoDetailImplCopyWithImpl<_$CartPriceInfoDetailImpl>(
          this, _$identity);
}

abstract class _CartPriceInfoDetail extends CartPriceInfoDetail {
  const factory _CartPriceInfoDetail(
      {final double basePrice,
      final double finalPrice,
      final double discount,
      final double totalDiscountAmount,
      final double totalVariantBasePrice,
      final double totalAddonBasePrice}) = _$CartPriceInfoDetailImpl;
  const _CartPriceInfoDetail._() : super._();

  @override
  double get basePrice;
  @override
  double get finalPrice;
  @override
  double get discount;
  @override
  double get totalDiscountAmount;
  @override
  double get totalVariantBasePrice;
  @override
  double get totalAddonBasePrice;
  @override
  @JsonKey(ignore: true)
  _$$CartPriceInfoDetailImplCopyWith<_$CartPriceInfoDetailImpl> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
mixin _$OrderItem {
  String get menuItemId => throw _privateConstructorUsedError;
  String get name => throw _privateConstructorUsedError;
  int get quantity => throw _privateConstructorUsedError;
  double get price => throw _privateConstructorUsedError;
  List<OrderVariant> get variants => throw _privateConstructorUsedError;
  List<OrderAddon> get addons => throw _privateConstructorUsedError;
  String? get cartItemId => throw _privateConstructorUsedError;

  @JsonKey(ignore: true)
  $OrderItemCopyWith<OrderItem> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $OrderItemCopyWith<$Res> {
  factory $OrderItemCopyWith(OrderItem value, $Res Function(OrderItem) then) =
      _$OrderItemCopyWithImpl<$Res, OrderItem>;
  @useResult
  $Res call(
      {String menuItemId,
      String name,
      int quantity,
      double price,
      List<OrderVariant> variants,
      List<OrderAddon> addons,
      String? cartItemId});
}

/// @nodoc
class _$OrderItemCopyWithImpl<$Res, $Val extends OrderItem>
    implements $OrderItemCopyWith<$Res> {
  _$OrderItemCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? menuItemId = null,
    Object? name = null,
    Object? quantity = null,
    Object? price = null,
    Object? variants = null,
    Object? addons = null,
    Object? cartItemId = freezed,
  }) {
    return _then(_value.copyWith(
      menuItemId: null == menuItemId
          ? _value.menuItemId
          : menuItemId // ignore: cast_nullable_to_non_nullable
              as String,
      name: null == name
          ? _value.name
          : name // ignore: cast_nullable_to_non_nullable
              as String,
      quantity: null == quantity
          ? _value.quantity
          : quantity // ignore: cast_nullable_to_non_nullable
              as int,
      price: null == price
          ? _value.price
          : price // ignore: cast_nullable_to_non_nullable
              as double,
      variants: null == variants
          ? _value.variants
          : variants // ignore: cast_nullable_to_non_nullable
              as List<OrderVariant>,
      addons: null == addons
          ? _value.addons
          : addons // ignore: cast_nullable_to_non_nullable
              as List<OrderAddon>,
      cartItemId: freezed == cartItemId
          ? _value.cartItemId
          : cartItemId // ignore: cast_nullable_to_non_nullable
              as String?,
    ) as $Val);
  }
}

/// @nodoc
abstract class _$$OrderItemImplCopyWith<$Res>
    implements $OrderItemCopyWith<$Res> {
  factory _$$OrderItemImplCopyWith(
          _$OrderItemImpl value, $Res Function(_$OrderItemImpl) then) =
      __$$OrderItemImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call(
      {String menuItemId,
      String name,
      int quantity,
      double price,
      List<OrderVariant> variants,
      List<OrderAddon> addons,
      String? cartItemId});
}

/// @nodoc
class __$$OrderItemImplCopyWithImpl<$Res>
    extends _$OrderItemCopyWithImpl<$Res, _$OrderItemImpl>
    implements _$$OrderItemImplCopyWith<$Res> {
  __$$OrderItemImplCopyWithImpl(
      _$OrderItemImpl _value, $Res Function(_$OrderItemImpl) _then)
      : super(_value, _then);

  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? menuItemId = null,
    Object? name = null,
    Object? quantity = null,
    Object? price = null,
    Object? variants = null,
    Object? addons = null,
    Object? cartItemId = freezed,
  }) {
    return _then(_$OrderItemImpl(
      menuItemId: null == menuItemId
          ? _value.menuItemId
          : menuItemId // ignore: cast_nullable_to_non_nullable
              as String,
      name: null == name
          ? _value.name
          : name // ignore: cast_nullable_to_non_nullable
              as String,
      quantity: null == quantity
          ? _value.quantity
          : quantity // ignore: cast_nullable_to_non_nullable
              as int,
      price: null == price
          ? _value.price
          : price // ignore: cast_nullable_to_non_nullable
              as double,
      variants: null == variants
          ? _value._variants
          : variants // ignore: cast_nullable_to_non_nullable
              as List<OrderVariant>,
      addons: null == addons
          ? _value._addons
          : addons // ignore: cast_nullable_to_non_nullable
              as List<OrderAddon>,
      cartItemId: freezed == cartItemId
          ? _value.cartItemId
          : cartItemId // ignore: cast_nullable_to_non_nullable
              as String?,
    ));
  }
}

/// @nodoc

class _$OrderItemImpl extends _OrderItem {
  const _$OrderItemImpl(
      {required this.menuItemId,
      required this.name,
      this.quantity = 1,
      this.price = 0.0,
      final List<OrderVariant> variants = const [],
      final List<OrderAddon> addons = const [],
      this.cartItemId})
      : _variants = variants,
        _addons = addons,
        super._();

  @override
  final String menuItemId;
  @override
  final String name;
  @override
  @JsonKey()
  final int quantity;
  @override
  @JsonKey()
  final double price;
  final List<OrderVariant> _variants;
  @override
  @JsonKey()
  List<OrderVariant> get variants {
    if (_variants is EqualUnmodifiableListView) return _variants;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableListView(_variants);
  }

  final List<OrderAddon> _addons;
  @override
  @JsonKey()
  List<OrderAddon> get addons {
    if (_addons is EqualUnmodifiableListView) return _addons;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableListView(_addons);
  }

  @override
  final String? cartItemId;

  @override
  String toString() {
    return 'OrderItem(menuItemId: $menuItemId, name: $name, quantity: $quantity, price: $price, variants: $variants, addons: $addons, cartItemId: $cartItemId)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$OrderItemImpl &&
            (identical(other.menuItemId, menuItemId) ||
                other.menuItemId == menuItemId) &&
            (identical(other.name, name) || other.name == name) &&
            (identical(other.quantity, quantity) ||
                other.quantity == quantity) &&
            (identical(other.price, price) || other.price == price) &&
            const DeepCollectionEquality().equals(other._variants, _variants) &&
            const DeepCollectionEquality().equals(other._addons, _addons) &&
            (identical(other.cartItemId, cartItemId) ||
                other.cartItemId == cartItemId));
  }

  @override
  int get hashCode => Object.hash(
      runtimeType,
      menuItemId,
      name,
      quantity,
      price,
      const DeepCollectionEquality().hash(_variants),
      const DeepCollectionEquality().hash(_addons),
      cartItemId);

  @JsonKey(ignore: true)
  @override
  @pragma('vm:prefer-inline')
  _$$OrderItemImplCopyWith<_$OrderItemImpl> get copyWith =>
      __$$OrderItemImplCopyWithImpl<_$OrderItemImpl>(this, _$identity);
}

abstract class _OrderItem extends OrderItem {
  const factory _OrderItem(
      {required final String menuItemId,
      required final String name,
      final int quantity,
      final double price,
      final List<OrderVariant> variants,
      final List<OrderAddon> addons,
      final String? cartItemId}) = _$OrderItemImpl;
  const _OrderItem._() : super._();

  @override
  String get menuItemId;
  @override
  String get name;
  @override
  int get quantity;
  @override
  double get price;
  @override
  List<OrderVariant> get variants;
  @override
  List<OrderAddon> get addons;
  @override
  String? get cartItemId;
  @override
  @JsonKey(ignore: true)
  _$$OrderItemImplCopyWith<_$OrderItemImpl> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
mixin _$OrderVariant {
  String get id => throw _privateConstructorUsedError;
  String get selected_variant_id => throw _privateConstructorUsedError;
  String get selected_variant_name => throw _privateConstructorUsedError;
  PriceInfo get priceInfo => throw _privateConstructorUsedError;
  bool get isMandatory => throw _privateConstructorUsedError;
  bool get respectParentDiscount => throw _privateConstructorUsedError;

  @JsonKey(ignore: true)
  $OrderVariantCopyWith<OrderVariant> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $OrderVariantCopyWith<$Res> {
  factory $OrderVariantCopyWith(
          OrderVariant value, $Res Function(OrderVariant) then) =
      _$OrderVariantCopyWithImpl<$Res, OrderVariant>;
  @useResult
  $Res call(
      {String id,
      String selected_variant_id,
      String selected_variant_name,
      PriceInfo priceInfo,
      bool isMandatory,
      bool respectParentDiscount});

  $PriceInfoCopyWith<$Res> get priceInfo;
}

/// @nodoc
class _$OrderVariantCopyWithImpl<$Res, $Val extends OrderVariant>
    implements $OrderVariantCopyWith<$Res> {
  _$OrderVariantCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? id = null,
    Object? selected_variant_id = null,
    Object? selected_variant_name = null,
    Object? priceInfo = null,
    Object? isMandatory = null,
    Object? respectParentDiscount = null,
  }) {
    return _then(_value.copyWith(
      id: null == id
          ? _value.id
          : id // ignore: cast_nullable_to_non_nullable
              as String,
      selected_variant_id: null == selected_variant_id
          ? _value.selected_variant_id
          : selected_variant_id // ignore: cast_nullable_to_non_nullable
              as String,
      selected_variant_name: null == selected_variant_name
          ? _value.selected_variant_name
          : selected_variant_name // ignore: cast_nullable_to_non_nullable
              as String,
      priceInfo: null == priceInfo
          ? _value.priceInfo
          : priceInfo // ignore: cast_nullable_to_non_nullable
              as PriceInfo,
      isMandatory: null == isMandatory
          ? _value.isMandatory
          : isMandatory // ignore: cast_nullable_to_non_nullable
              as bool,
      respectParentDiscount: null == respectParentDiscount
          ? _value.respectParentDiscount
          : respectParentDiscount // ignore: cast_nullable_to_non_nullable
              as bool,
    ) as $Val);
  }

  @override
  @pragma('vm:prefer-inline')
  $PriceInfoCopyWith<$Res> get priceInfo {
    return $PriceInfoCopyWith<$Res>(_value.priceInfo, (value) {
      return _then(_value.copyWith(priceInfo: value) as $Val);
    });
  }
}

/// @nodoc
abstract class _$$OrderVariantImplCopyWith<$Res>
    implements $OrderVariantCopyWith<$Res> {
  factory _$$OrderVariantImplCopyWith(
          _$OrderVariantImpl value, $Res Function(_$OrderVariantImpl) then) =
      __$$OrderVariantImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call(
      {String id,
      String selected_variant_id,
      String selected_variant_name,
      PriceInfo priceInfo,
      bool isMandatory,
      bool respectParentDiscount});

  @override
  $PriceInfoCopyWith<$Res> get priceInfo;
}

/// @nodoc
class __$$OrderVariantImplCopyWithImpl<$Res>
    extends _$OrderVariantCopyWithImpl<$Res, _$OrderVariantImpl>
    implements _$$OrderVariantImplCopyWith<$Res> {
  __$$OrderVariantImplCopyWithImpl(
      _$OrderVariantImpl _value, $Res Function(_$OrderVariantImpl) _then)
      : super(_value, _then);

  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? id = null,
    Object? selected_variant_id = null,
    Object? selected_variant_name = null,
    Object? priceInfo = null,
    Object? isMandatory = null,
    Object? respectParentDiscount = null,
  }) {
    return _then(_$OrderVariantImpl(
      id: null == id
          ? _value.id
          : id // ignore: cast_nullable_to_non_nullable
              as String,
      selected_variant_id: null == selected_variant_id
          ? _value.selected_variant_id
          : selected_variant_id // ignore: cast_nullable_to_non_nullable
              as String,
      selected_variant_name: null == selected_variant_name
          ? _value.selected_variant_name
          : selected_variant_name // ignore: cast_nullable_to_non_nullable
              as String,
      priceInfo: null == priceInfo
          ? _value.priceInfo
          : priceInfo // ignore: cast_nullable_to_non_nullable
              as PriceInfo,
      isMandatory: null == isMandatory
          ? _value.isMandatory
          : isMandatory // ignore: cast_nullable_to_non_nullable
              as bool,
      respectParentDiscount: null == respectParentDiscount
          ? _value.respectParentDiscount
          : respectParentDiscount // ignore: cast_nullable_to_non_nullable
              as bool,
    ));
  }
}

/// @nodoc

class _$OrderVariantImpl extends _OrderVariant {
  const _$OrderVariantImpl(
      {required this.id,
      required this.selected_variant_id,
      required this.selected_variant_name,
      required this.priceInfo,
      this.isMandatory = false,
      this.respectParentDiscount = true})
      : super._();

  @override
  final String id;
  @override
  final String selected_variant_id;
  @override
  final String selected_variant_name;
  @override
  final PriceInfo priceInfo;
  @override
  @JsonKey()
  final bool isMandatory;
  @override
  @JsonKey()
  final bool respectParentDiscount;

  @override
  String toString() {
    return 'OrderVariant(id: $id, selected_variant_id: $selected_variant_id, selected_variant_name: $selected_variant_name, priceInfo: $priceInfo, isMandatory: $isMandatory, respectParentDiscount: $respectParentDiscount)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$OrderVariantImpl &&
            (identical(other.id, id) || other.id == id) &&
            (identical(other.selected_variant_id, selected_variant_id) ||
                other.selected_variant_id == selected_variant_id) &&
            (identical(other.selected_variant_name, selected_variant_name) ||
                other.selected_variant_name == selected_variant_name) &&
            (identical(other.priceInfo, priceInfo) ||
                other.priceInfo == priceInfo) &&
            (identical(other.isMandatory, isMandatory) ||
                other.isMandatory == isMandatory) &&
            (identical(other.respectParentDiscount, respectParentDiscount) ||
                other.respectParentDiscount == respectParentDiscount));
  }

  @override
  int get hashCode => Object.hash(runtimeType, id, selected_variant_id,
      selected_variant_name, priceInfo, isMandatory, respectParentDiscount);

  @JsonKey(ignore: true)
  @override
  @pragma('vm:prefer-inline')
  _$$OrderVariantImplCopyWith<_$OrderVariantImpl> get copyWith =>
      __$$OrderVariantImplCopyWithImpl<_$OrderVariantImpl>(this, _$identity);
}

abstract class _OrderVariant extends OrderVariant {
  const factory _OrderVariant(
      {required final String id,
      required final String selected_variant_id,
      required final String selected_variant_name,
      required final PriceInfo priceInfo,
      final bool isMandatory,
      final bool respectParentDiscount}) = _$OrderVariantImpl;
  const _OrderVariant._() : super._();

  @override
  String get id;
  @override
  String get selected_variant_id;
  @override
  String get selected_variant_name;
  @override
  PriceInfo get priceInfo;
  @override
  bool get isMandatory;
  @override
  bool get respectParentDiscount;
  @override
  @JsonKey(ignore: true)
  _$$OrderVariantImplCopyWith<_$OrderVariantImpl> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
mixin _$OrderAddon {
  String get id => throw _privateConstructorUsedError;
  String get name => throw _privateConstructorUsedError;
  PriceInfo get priceInfo => throw _privateConstructorUsedError;
  bool get respectParentDiscount => throw _privateConstructorUsedError;

  @JsonKey(ignore: true)
  $OrderAddonCopyWith<OrderAddon> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $OrderAddonCopyWith<$Res> {
  factory $OrderAddonCopyWith(
          OrderAddon value, $Res Function(OrderAddon) then) =
      _$OrderAddonCopyWithImpl<$Res, OrderAddon>;
  @useResult
  $Res call(
      {String id,
      String name,
      PriceInfo priceInfo,
      bool respectParentDiscount});

  $PriceInfoCopyWith<$Res> get priceInfo;
}

/// @nodoc
class _$OrderAddonCopyWithImpl<$Res, $Val extends OrderAddon>
    implements $OrderAddonCopyWith<$Res> {
  _$OrderAddonCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? id = null,
    Object? name = null,
    Object? priceInfo = null,
    Object? respectParentDiscount = null,
  }) {
    return _then(_value.copyWith(
      id: null == id
          ? _value.id
          : id // ignore: cast_nullable_to_non_nullable
              as String,
      name: null == name
          ? _value.name
          : name // ignore: cast_nullable_to_non_nullable
              as String,
      priceInfo: null == priceInfo
          ? _value.priceInfo
          : priceInfo // ignore: cast_nullable_to_non_nullable
              as PriceInfo,
      respectParentDiscount: null == respectParentDiscount
          ? _value.respectParentDiscount
          : respectParentDiscount // ignore: cast_nullable_to_non_nullable
              as bool,
    ) as $Val);
  }

  @override
  @pragma('vm:prefer-inline')
  $PriceInfoCopyWith<$Res> get priceInfo {
    return $PriceInfoCopyWith<$Res>(_value.priceInfo, (value) {
      return _then(_value.copyWith(priceInfo: value) as $Val);
    });
  }
}

/// @nodoc
abstract class _$$OrderAddonImplCopyWith<$Res>
    implements $OrderAddonCopyWith<$Res> {
  factory _$$OrderAddonImplCopyWith(
          _$OrderAddonImpl value, $Res Function(_$OrderAddonImpl) then) =
      __$$OrderAddonImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call(
      {String id,
      String name,
      PriceInfo priceInfo,
      bool respectParentDiscount});

  @override
  $PriceInfoCopyWith<$Res> get priceInfo;
}

/// @nodoc
class __$$OrderAddonImplCopyWithImpl<$Res>
    extends _$OrderAddonCopyWithImpl<$Res, _$OrderAddonImpl>
    implements _$$OrderAddonImplCopyWith<$Res> {
  __$$OrderAddonImplCopyWithImpl(
      _$OrderAddonImpl _value, $Res Function(_$OrderAddonImpl) _then)
      : super(_value, _then);

  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? id = null,
    Object? name = null,
    Object? priceInfo = null,
    Object? respectParentDiscount = null,
  }) {
    return _then(_$OrderAddonImpl(
      id: null == id
          ? _value.id
          : id // ignore: cast_nullable_to_non_nullable
              as String,
      name: null == name
          ? _value.name
          : name // ignore: cast_nullable_to_non_nullable
              as String,
      priceInfo: null == priceInfo
          ? _value.priceInfo
          : priceInfo // ignore: cast_nullable_to_non_nullable
              as PriceInfo,
      respectParentDiscount: null == respectParentDiscount
          ? _value.respectParentDiscount
          : respectParentDiscount // ignore: cast_nullable_to_non_nullable
              as bool,
    ));
  }
}

/// @nodoc

class _$OrderAddonImpl extends _OrderAddon {
  const _$OrderAddonImpl(
      {required this.id,
      required this.name,
      required this.priceInfo,
      this.respectParentDiscount = true})
      : super._();

  @override
  final String id;
  @override
  final String name;
  @override
  final PriceInfo priceInfo;
  @override
  @JsonKey()
  final bool respectParentDiscount;

  @override
  String toString() {
    return 'OrderAddon(id: $id, name: $name, priceInfo: $priceInfo, respectParentDiscount: $respectParentDiscount)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$OrderAddonImpl &&
            (identical(other.id, id) || other.id == id) &&
            (identical(other.name, name) || other.name == name) &&
            (identical(other.priceInfo, priceInfo) ||
                other.priceInfo == priceInfo) &&
            (identical(other.respectParentDiscount, respectParentDiscount) ||
                other.respectParentDiscount == respectParentDiscount));
  }

  @override
  int get hashCode =>
      Object.hash(runtimeType, id, name, priceInfo, respectParentDiscount);

  @JsonKey(ignore: true)
  @override
  @pragma('vm:prefer-inline')
  _$$OrderAddonImplCopyWith<_$OrderAddonImpl> get copyWith =>
      __$$OrderAddonImplCopyWithImpl<_$OrderAddonImpl>(this, _$identity);
}

abstract class _OrderAddon extends OrderAddon {
  const factory _OrderAddon(
      {required final String id,
      required final String name,
      required final PriceInfo priceInfo,
      final bool respectParentDiscount}) = _$OrderAddonImpl;
  const _OrderAddon._() : super._();

  @override
  String get id;
  @override
  String get name;
  @override
  PriceInfo get priceInfo;
  @override
  bool get respectParentDiscount;
  @override
  @JsonKey(ignore: true)
  _$$OrderAddonImplCopyWith<_$OrderAddonImpl> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
mixin _$PriceInfo {
  double get basePrice => throw _privateConstructorUsedError;
  double get finalPrice => throw _privateConstructorUsedError;
  double get discount => throw _privateConstructorUsedError;

  @JsonKey(ignore: true)
  $PriceInfoCopyWith<PriceInfo> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $PriceInfoCopyWith<$Res> {
  factory $PriceInfoCopyWith(PriceInfo value, $Res Function(PriceInfo) then) =
      _$PriceInfoCopyWithImpl<$Res, PriceInfo>;
  @useResult
  $Res call({double basePrice, double finalPrice, double discount});
}

/// @nodoc
class _$PriceInfoCopyWithImpl<$Res, $Val extends PriceInfo>
    implements $PriceInfoCopyWith<$Res> {
  _$PriceInfoCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? basePrice = null,
    Object? finalPrice = null,
    Object? discount = null,
  }) {
    return _then(_value.copyWith(
      basePrice: null == basePrice
          ? _value.basePrice
          : basePrice // ignore: cast_nullable_to_non_nullable
              as double,
      finalPrice: null == finalPrice
          ? _value.finalPrice
          : finalPrice // ignore: cast_nullable_to_non_nullable
              as double,
      discount: null == discount
          ? _value.discount
          : discount // ignore: cast_nullable_to_non_nullable
              as double,
    ) as $Val);
  }
}

/// @nodoc
abstract class _$$PriceInfoImplCopyWith<$Res>
    implements $PriceInfoCopyWith<$Res> {
  factory _$$PriceInfoImplCopyWith(
          _$PriceInfoImpl value, $Res Function(_$PriceInfoImpl) then) =
      __$$PriceInfoImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call({double basePrice, double finalPrice, double discount});
}

/// @nodoc
class __$$PriceInfoImplCopyWithImpl<$Res>
    extends _$PriceInfoCopyWithImpl<$Res, _$PriceInfoImpl>
    implements _$$PriceInfoImplCopyWith<$Res> {
  __$$PriceInfoImplCopyWithImpl(
      _$PriceInfoImpl _value, $Res Function(_$PriceInfoImpl) _then)
      : super(_value, _then);

  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? basePrice = null,
    Object? finalPrice = null,
    Object? discount = null,
  }) {
    return _then(_$PriceInfoImpl(
      basePrice: null == basePrice
          ? _value.basePrice
          : basePrice // ignore: cast_nullable_to_non_nullable
              as double,
      finalPrice: null == finalPrice
          ? _value.finalPrice
          : finalPrice // ignore: cast_nullable_to_non_nullable
              as double,
      discount: null == discount
          ? _value.discount
          : discount // ignore: cast_nullable_to_non_nullable
              as double,
    ));
  }
}

/// @nodoc

class _$PriceInfoImpl extends _PriceInfo {
  const _$PriceInfoImpl(
      {this.basePrice = 0.0, this.finalPrice = 0.0, this.discount = 0.0})
      : super._();

  @override
  @JsonKey()
  final double basePrice;
  @override
  @JsonKey()
  final double finalPrice;
  @override
  @JsonKey()
  final double discount;

  @override
  String toString() {
    return 'PriceInfo(basePrice: $basePrice, finalPrice: $finalPrice, discount: $discount)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$PriceInfoImpl &&
            (identical(other.basePrice, basePrice) ||
                other.basePrice == basePrice) &&
            (identical(other.finalPrice, finalPrice) ||
                other.finalPrice == finalPrice) &&
            (identical(other.discount, discount) ||
                other.discount == discount));
  }

  @override
  int get hashCode => Object.hash(runtimeType, basePrice, finalPrice, discount);

  @JsonKey(ignore: true)
  @override
  @pragma('vm:prefer-inline')
  _$$PriceInfoImplCopyWith<_$PriceInfoImpl> get copyWith =>
      __$$PriceInfoImplCopyWithImpl<_$PriceInfoImpl>(this, _$identity);
}

abstract class _PriceInfo extends PriceInfo {
  const factory _PriceInfo(
      {final double basePrice,
      final double finalPrice,
      final double discount}) = _$PriceInfoImpl;
  const _PriceInfo._() : super._();

  @override
  double get basePrice;
  @override
  double get finalPrice;
  @override
  double get discount;
  @override
  @JsonKey(ignore: true)
  _$$PriceInfoImplCopyWith<_$PriceInfoImpl> get copyWith =>
      throw _privateConstructorUsedError;
}

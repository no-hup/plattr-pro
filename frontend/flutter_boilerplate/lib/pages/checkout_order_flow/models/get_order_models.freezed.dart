// coverage:ignore-file
// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'get_order_models.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

T _$identity<T>(T value) => value;

final _privateConstructorUsedError = UnsupportedError(
    'It seems like you constructed your class using `MyClass._()`. This constructor is only meant to be used by freezed and you are not supposed to need it nor use it.\nPlease check the documentation here for more information: https://github.com/rrousselGit/freezed#adding-getters-and-methods-to-our-models');

/// @nodoc
mixin _$GetOrderApiResult {
  @optionalTypeArgs
  TResult when<TResult extends Object?>({
    required TResult Function(String status, String message, GetOrderData data)
        success,
    required TResult Function(String errorMessage) error,
  }) =>
      throw _privateConstructorUsedError;
  @optionalTypeArgs
  TResult? whenOrNull<TResult extends Object?>({
    TResult? Function(String status, String message, GetOrderData data)?
        success,
    TResult? Function(String errorMessage)? error,
  }) =>
      throw _privateConstructorUsedError;
  @optionalTypeArgs
  TResult maybeWhen<TResult extends Object?>({
    TResult Function(String status, String message, GetOrderData data)? success,
    TResult Function(String errorMessage)? error,
    required TResult orElse(),
  }) =>
      throw _privateConstructorUsedError;
  @optionalTypeArgs
  TResult map<TResult extends Object?>({
    required TResult Function(_GetOrderApiResultSuccess value) success,
    required TResult Function(_GetOrderApiResultError value) error,
  }) =>
      throw _privateConstructorUsedError;
  @optionalTypeArgs
  TResult? mapOrNull<TResult extends Object?>({
    TResult? Function(_GetOrderApiResultSuccess value)? success,
    TResult? Function(_GetOrderApiResultError value)? error,
  }) =>
      throw _privateConstructorUsedError;
  @optionalTypeArgs
  TResult maybeMap<TResult extends Object?>({
    TResult Function(_GetOrderApiResultSuccess value)? success,
    TResult Function(_GetOrderApiResultError value)? error,
    required TResult orElse(),
  }) =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $GetOrderApiResultCopyWith<$Res> {
  factory $GetOrderApiResultCopyWith(
          GetOrderApiResult value, $Res Function(GetOrderApiResult) then) =
      _$GetOrderApiResultCopyWithImpl<$Res, GetOrderApiResult>;
}

/// @nodoc
class _$GetOrderApiResultCopyWithImpl<$Res, $Val extends GetOrderApiResult>
    implements $GetOrderApiResultCopyWith<$Res> {
  _$GetOrderApiResultCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;
}

/// @nodoc
abstract class _$$GetOrderApiResultSuccessImplCopyWith<$Res> {
  factory _$$GetOrderApiResultSuccessImplCopyWith(
          _$GetOrderApiResultSuccessImpl value,
          $Res Function(_$GetOrderApiResultSuccessImpl) then) =
      __$$GetOrderApiResultSuccessImplCopyWithImpl<$Res>;
  @useResult
  $Res call({String status, String message, GetOrderData data});

  $GetOrderDataCopyWith<$Res> get data;
}

/// @nodoc
class __$$GetOrderApiResultSuccessImplCopyWithImpl<$Res>
    extends _$GetOrderApiResultCopyWithImpl<$Res,
        _$GetOrderApiResultSuccessImpl>
    implements _$$GetOrderApiResultSuccessImplCopyWith<$Res> {
  __$$GetOrderApiResultSuccessImplCopyWithImpl(
      _$GetOrderApiResultSuccessImpl _value,
      $Res Function(_$GetOrderApiResultSuccessImpl) _then)
      : super(_value, _then);

  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? status = null,
    Object? message = null,
    Object? data = null,
  }) {
    return _then(_$GetOrderApiResultSuccessImpl(
      status: null == status
          ? _value.status
          : status // ignore: cast_nullable_to_non_nullable
              as String,
      message: null == message
          ? _value.message
          : message // ignore: cast_nullable_to_non_nullable
              as String,
      data: null == data
          ? _value.data
          : data // ignore: cast_nullable_to_non_nullable
              as GetOrderData,
    ));
  }

  @override
  @pragma('vm:prefer-inline')
  $GetOrderDataCopyWith<$Res> get data {
    return $GetOrderDataCopyWith<$Res>(_value.data, (value) {
      return _then(_value.copyWith(data: value));
    });
  }
}

/// @nodoc

class _$GetOrderApiResultSuccessImpl implements _GetOrderApiResultSuccess {
  const _$GetOrderApiResultSuccessImpl(
      {required this.status, required this.message, required this.data});

  @override
  final String status;
  @override
  final String message;
  @override
  final GetOrderData data;

  @override
  String toString() {
    return 'GetOrderApiResult.success(status: $status, message: $message, data: $data)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$GetOrderApiResultSuccessImpl &&
            (identical(other.status, status) || other.status == status) &&
            (identical(other.message, message) || other.message == message) &&
            (identical(other.data, data) || other.data == data));
  }

  @override
  int get hashCode => Object.hash(runtimeType, status, message, data);

  @JsonKey(ignore: true)
  @override
  @pragma('vm:prefer-inline')
  _$$GetOrderApiResultSuccessImplCopyWith<_$GetOrderApiResultSuccessImpl>
      get copyWith => __$$GetOrderApiResultSuccessImplCopyWithImpl<
          _$GetOrderApiResultSuccessImpl>(this, _$identity);

  @override
  @optionalTypeArgs
  TResult when<TResult extends Object?>({
    required TResult Function(String status, String message, GetOrderData data)
        success,
    required TResult Function(String errorMessage) error,
  }) {
    return success(status, message, data);
  }

  @override
  @optionalTypeArgs
  TResult? whenOrNull<TResult extends Object?>({
    TResult? Function(String status, String message, GetOrderData data)?
        success,
    TResult? Function(String errorMessage)? error,
  }) {
    return success?.call(status, message, data);
  }

  @override
  @optionalTypeArgs
  TResult maybeWhen<TResult extends Object?>({
    TResult Function(String status, String message, GetOrderData data)? success,
    TResult Function(String errorMessage)? error,
    required TResult orElse(),
  }) {
    if (success != null) {
      return success(status, message, data);
    }
    return orElse();
  }

  @override
  @optionalTypeArgs
  TResult map<TResult extends Object?>({
    required TResult Function(_GetOrderApiResultSuccess value) success,
    required TResult Function(_GetOrderApiResultError value) error,
  }) {
    return success(this);
  }

  @override
  @optionalTypeArgs
  TResult? mapOrNull<TResult extends Object?>({
    TResult? Function(_GetOrderApiResultSuccess value)? success,
    TResult? Function(_GetOrderApiResultError value)? error,
  }) {
    return success?.call(this);
  }

  @override
  @optionalTypeArgs
  TResult maybeMap<TResult extends Object?>({
    TResult Function(_GetOrderApiResultSuccess value)? success,
    TResult Function(_GetOrderApiResultError value)? error,
    required TResult orElse(),
  }) {
    if (success != null) {
      return success(this);
    }
    return orElse();
  }
}

abstract class _GetOrderApiResultSuccess implements GetOrderApiResult {
  const factory _GetOrderApiResultSuccess(
      {required final String status,
      required final String message,
      required final GetOrderData data}) = _$GetOrderApiResultSuccessImpl;

  String get status;
  String get message;
  GetOrderData get data;
  @JsonKey(ignore: true)
  _$$GetOrderApiResultSuccessImplCopyWith<_$GetOrderApiResultSuccessImpl>
      get copyWith => throw _privateConstructorUsedError;
}

/// @nodoc
abstract class _$$GetOrderApiResultErrorImplCopyWith<$Res> {
  factory _$$GetOrderApiResultErrorImplCopyWith(
          _$GetOrderApiResultErrorImpl value,
          $Res Function(_$GetOrderApiResultErrorImpl) then) =
      __$$GetOrderApiResultErrorImplCopyWithImpl<$Res>;
  @useResult
  $Res call({String errorMessage});
}

/// @nodoc
class __$$GetOrderApiResultErrorImplCopyWithImpl<$Res>
    extends _$GetOrderApiResultCopyWithImpl<$Res, _$GetOrderApiResultErrorImpl>
    implements _$$GetOrderApiResultErrorImplCopyWith<$Res> {
  __$$GetOrderApiResultErrorImplCopyWithImpl(
      _$GetOrderApiResultErrorImpl _value,
      $Res Function(_$GetOrderApiResultErrorImpl) _then)
      : super(_value, _then);

  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? errorMessage = null,
  }) {
    return _then(_$GetOrderApiResultErrorImpl(
      errorMessage: null == errorMessage
          ? _value.errorMessage
          : errorMessage // ignore: cast_nullable_to_non_nullable
              as String,
    ));
  }
}

/// @nodoc

class _$GetOrderApiResultErrorImpl implements _GetOrderApiResultError {
  const _$GetOrderApiResultErrorImpl({required this.errorMessage});

  @override
  final String errorMessage;

  @override
  String toString() {
    return 'GetOrderApiResult.error(errorMessage: $errorMessage)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$GetOrderApiResultErrorImpl &&
            (identical(other.errorMessage, errorMessage) ||
                other.errorMessage == errorMessage));
  }

  @override
  int get hashCode => Object.hash(runtimeType, errorMessage);

  @JsonKey(ignore: true)
  @override
  @pragma('vm:prefer-inline')
  _$$GetOrderApiResultErrorImplCopyWith<_$GetOrderApiResultErrorImpl>
      get copyWith => __$$GetOrderApiResultErrorImplCopyWithImpl<
          _$GetOrderApiResultErrorImpl>(this, _$identity);

  @override
  @optionalTypeArgs
  TResult when<TResult extends Object?>({
    required TResult Function(String status, String message, GetOrderData data)
        success,
    required TResult Function(String errorMessage) error,
  }) {
    return error(errorMessage);
  }

  @override
  @optionalTypeArgs
  TResult? whenOrNull<TResult extends Object?>({
    TResult? Function(String status, String message, GetOrderData data)?
        success,
    TResult? Function(String errorMessage)? error,
  }) {
    return error?.call(errorMessage);
  }

  @override
  @optionalTypeArgs
  TResult maybeWhen<TResult extends Object?>({
    TResult Function(String status, String message, GetOrderData data)? success,
    TResult Function(String errorMessage)? error,
    required TResult orElse(),
  }) {
    if (error != null) {
      return error(errorMessage);
    }
    return orElse();
  }

  @override
  @optionalTypeArgs
  TResult map<TResult extends Object?>({
    required TResult Function(_GetOrderApiResultSuccess value) success,
    required TResult Function(_GetOrderApiResultError value) error,
  }) {
    return error(this);
  }

  @override
  @optionalTypeArgs
  TResult? mapOrNull<TResult extends Object?>({
    TResult? Function(_GetOrderApiResultSuccess value)? success,
    TResult? Function(_GetOrderApiResultError value)? error,
  }) {
    return error?.call(this);
  }

  @override
  @optionalTypeArgs
  TResult maybeMap<TResult extends Object?>({
    TResult Function(_GetOrderApiResultSuccess value)? success,
    TResult Function(_GetOrderApiResultError value)? error,
    required TResult orElse(),
  }) {
    if (error != null) {
      return error(this);
    }
    return orElse();
  }
}

abstract class _GetOrderApiResultError implements GetOrderApiResult {
  const factory _GetOrderApiResultError({required final String errorMessage}) =
      _$GetOrderApiResultErrorImpl;

  String get errorMessage;
  @JsonKey(ignore: true)
  _$$GetOrderApiResultErrorImplCopyWith<_$GetOrderApiResultErrorImpl>
      get copyWith => throw _privateConstructorUsedError;
}

GetOrderData _$GetOrderDataFromJson(Map<String, dynamic> json) {
  return _GetOrderData.fromJson(json);
}

/// @nodoc
mixin _$GetOrderData {
  String get id => throw _privateConstructorUsedError;
  String get orderNumber => throw _privateConstructorUsedError;
  String get orderStatus => throw _privateConstructorUsedError;
  @FirestoreTimestampConverter()
  DateTime get createdAt => throw _privateConstructorUsedError;
  @FirestoreTimestampConverter()
  DateTime get updatedAt => throw _privateConstructorUsedError;
  String get tableId => throw _privateConstructorUsedError;
  String get restaurantId => throw _privateConstructorUsedError;
  String get sessionId => throw _privateConstructorUsedError;
  num get total => throw _privateConstructorUsedError;
  List<GetOrderItem> get items => throw _privateConstructorUsedError;
  String? get notes => throw _privateConstructorUsedError;

  Map<String, dynamic> toJson() => throw _privateConstructorUsedError;
  @JsonKey(ignore: true)
  $GetOrderDataCopyWith<GetOrderData> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $GetOrderDataCopyWith<$Res> {
  factory $GetOrderDataCopyWith(
          GetOrderData value, $Res Function(GetOrderData) then) =
      _$GetOrderDataCopyWithImpl<$Res, GetOrderData>;
  @useResult
  $Res call(
      {String id,
      String orderNumber,
      String orderStatus,
      @FirestoreTimestampConverter() DateTime createdAt,
      @FirestoreTimestampConverter() DateTime updatedAt,
      String tableId,
      String restaurantId,
      String sessionId,
      num total,
      List<GetOrderItem> items,
      String? notes});
}

/// @nodoc
class _$GetOrderDataCopyWithImpl<$Res, $Val extends GetOrderData>
    implements $GetOrderDataCopyWith<$Res> {
  _$GetOrderDataCopyWithImpl(this._value, this._then);

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
    Object? createdAt = null,
    Object? updatedAt = null,
    Object? tableId = null,
    Object? restaurantId = null,
    Object? sessionId = null,
    Object? total = null,
    Object? items = null,
    Object? notes = freezed,
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
      createdAt: null == createdAt
          ? _value.createdAt
          : createdAt // ignore: cast_nullable_to_non_nullable
              as DateTime,
      updatedAt: null == updatedAt
          ? _value.updatedAt
          : updatedAt // ignore: cast_nullable_to_non_nullable
              as DateTime,
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
      total: null == total
          ? _value.total
          : total // ignore: cast_nullable_to_non_nullable
              as num,
      items: null == items
          ? _value.items
          : items // ignore: cast_nullable_to_non_nullable
              as List<GetOrderItem>,
      notes: freezed == notes
          ? _value.notes
          : notes // ignore: cast_nullable_to_non_nullable
              as String?,
    ) as $Val);
  }
}

/// @nodoc
abstract class _$$GetOrderDataImplCopyWith<$Res>
    implements $GetOrderDataCopyWith<$Res> {
  factory _$$GetOrderDataImplCopyWith(
          _$GetOrderDataImpl value, $Res Function(_$GetOrderDataImpl) then) =
      __$$GetOrderDataImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call(
      {String id,
      String orderNumber,
      String orderStatus,
      @FirestoreTimestampConverter() DateTime createdAt,
      @FirestoreTimestampConverter() DateTime updatedAt,
      String tableId,
      String restaurantId,
      String sessionId,
      num total,
      List<GetOrderItem> items,
      String? notes});
}

/// @nodoc
class __$$GetOrderDataImplCopyWithImpl<$Res>
    extends _$GetOrderDataCopyWithImpl<$Res, _$GetOrderDataImpl>
    implements _$$GetOrderDataImplCopyWith<$Res> {
  __$$GetOrderDataImplCopyWithImpl(
      _$GetOrderDataImpl _value, $Res Function(_$GetOrderDataImpl) _then)
      : super(_value, _then);

  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? id = null,
    Object? orderNumber = null,
    Object? orderStatus = null,
    Object? createdAt = null,
    Object? updatedAt = null,
    Object? tableId = null,
    Object? restaurantId = null,
    Object? sessionId = null,
    Object? total = null,
    Object? items = null,
    Object? notes = freezed,
  }) {
    return _then(_$GetOrderDataImpl(
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
      createdAt: null == createdAt
          ? _value.createdAt
          : createdAt // ignore: cast_nullable_to_non_nullable
              as DateTime,
      updatedAt: null == updatedAt
          ? _value.updatedAt
          : updatedAt // ignore: cast_nullable_to_non_nullable
              as DateTime,
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
      total: null == total
          ? _value.total
          : total // ignore: cast_nullable_to_non_nullable
              as num,
      items: null == items
          ? _value._items
          : items // ignore: cast_nullable_to_non_nullable
              as List<GetOrderItem>,
      notes: freezed == notes
          ? _value.notes
          : notes // ignore: cast_nullable_to_non_nullable
              as String?,
    ));
  }
}

/// @nodoc

@JsonSerializable(explicitToJson: true)
class _$GetOrderDataImpl implements _GetOrderData {
  const _$GetOrderDataImpl(
      {required this.id,
      required this.orderNumber,
      required this.orderStatus,
      @FirestoreTimestampConverter() required this.createdAt,
      @FirestoreTimestampConverter() required this.updatedAt,
      required this.tableId,
      required this.restaurantId,
      required this.sessionId,
      this.total = 0,
      final List<GetOrderItem> items = const [],
      this.notes})
      : _items = items;

  factory _$GetOrderDataImpl.fromJson(Map<String, dynamic> json) =>
      _$$GetOrderDataImplFromJson(json);

  @override
  final String id;
  @override
  final String orderNumber;
  @override
  final String orderStatus;
  @override
  @FirestoreTimestampConverter()
  final DateTime createdAt;
  @override
  @FirestoreTimestampConverter()
  final DateTime updatedAt;
  @override
  final String tableId;
  @override
  final String restaurantId;
  @override
  final String sessionId;
  @override
  @JsonKey()
  final num total;
  final List<GetOrderItem> _items;
  @override
  @JsonKey()
  List<GetOrderItem> get items {
    if (_items is EqualUnmodifiableListView) return _items;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableListView(_items);
  }

  @override
  final String? notes;

  @override
  String toString() {
    return 'GetOrderData(id: $id, orderNumber: $orderNumber, orderStatus: $orderStatus, createdAt: $createdAt, updatedAt: $updatedAt, tableId: $tableId, restaurantId: $restaurantId, sessionId: $sessionId, total: $total, items: $items, notes: $notes)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$GetOrderDataImpl &&
            (identical(other.id, id) || other.id == id) &&
            (identical(other.orderNumber, orderNumber) ||
                other.orderNumber == orderNumber) &&
            (identical(other.orderStatus, orderStatus) ||
                other.orderStatus == orderStatus) &&
            (identical(other.createdAt, createdAt) ||
                other.createdAt == createdAt) &&
            (identical(other.updatedAt, updatedAt) ||
                other.updatedAt == updatedAt) &&
            (identical(other.tableId, tableId) || other.tableId == tableId) &&
            (identical(other.restaurantId, restaurantId) ||
                other.restaurantId == restaurantId) &&
            (identical(other.sessionId, sessionId) ||
                other.sessionId == sessionId) &&
            (identical(other.total, total) || other.total == total) &&
            const DeepCollectionEquality().equals(other._items, _items) &&
            (identical(other.notes, notes) || other.notes == notes));
  }

  @JsonKey(ignore: true)
  @override
  int get hashCode => Object.hash(
      runtimeType,
      id,
      orderNumber,
      orderStatus,
      createdAt,
      updatedAt,
      tableId,
      restaurantId,
      sessionId,
      total,
      const DeepCollectionEquality().hash(_items),
      notes);

  @JsonKey(ignore: true)
  @override
  @pragma('vm:prefer-inline')
  _$$GetOrderDataImplCopyWith<_$GetOrderDataImpl> get copyWith =>
      __$$GetOrderDataImplCopyWithImpl<_$GetOrderDataImpl>(this, _$identity);

  @override
  Map<String, dynamic> toJson() {
    return _$$GetOrderDataImplToJson(
      this,
    );
  }
}

abstract class _GetOrderData implements GetOrderData {
  const factory _GetOrderData(
      {required final String id,
      required final String orderNumber,
      required final String orderStatus,
      @FirestoreTimestampConverter() required final DateTime createdAt,
      @FirestoreTimestampConverter() required final DateTime updatedAt,
      required final String tableId,
      required final String restaurantId,
      required final String sessionId,
      final num total,
      final List<GetOrderItem> items,
      final String? notes}) = _$GetOrderDataImpl;

  factory _GetOrderData.fromJson(Map<String, dynamic> json) =
      _$GetOrderDataImpl.fromJson;

  @override
  String get id;
  @override
  String get orderNumber;
  @override
  String get orderStatus;
  @override
  @FirestoreTimestampConverter()
  DateTime get createdAt;
  @override
  @FirestoreTimestampConverter()
  DateTime get updatedAt;
  @override
  String get tableId;
  @override
  String get restaurantId;
  @override
  String get sessionId;
  @override
  num get total;
  @override
  List<GetOrderItem> get items;
  @override
  String? get notes;
  @override
  @JsonKey(ignore: true)
  _$$GetOrderDataImplCopyWith<_$GetOrderDataImpl> get copyWith =>
      throw _privateConstructorUsedError;
}

GetOrderItem _$GetOrderItemFromJson(Map<String, dynamic> json) {
  return _GetOrderItem.fromJson(json);
}

/// @nodoc
mixin _$GetOrderItem {
  String get menuItemId => throw _privateConstructorUsedError;
  String get name => throw _privateConstructorUsedError;
  int get quantity => throw _privateConstructorUsedError;
  num get price => throw _privateConstructorUsedError;
  List<GetOrderVariant> get variants => throw _privateConstructorUsedError;
  List<GetOrderAddon> get addons => throw _privateConstructorUsedError;

  Map<String, dynamic> toJson() => throw _privateConstructorUsedError;
  @JsonKey(ignore: true)
  $GetOrderItemCopyWith<GetOrderItem> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $GetOrderItemCopyWith<$Res> {
  factory $GetOrderItemCopyWith(
          GetOrderItem value, $Res Function(GetOrderItem) then) =
      _$GetOrderItemCopyWithImpl<$Res, GetOrderItem>;
  @useResult
  $Res call(
      {String menuItemId,
      String name,
      int quantity,
      num price,
      List<GetOrderVariant> variants,
      List<GetOrderAddon> addons});
}

/// @nodoc
class _$GetOrderItemCopyWithImpl<$Res, $Val extends GetOrderItem>
    implements $GetOrderItemCopyWith<$Res> {
  _$GetOrderItemCopyWithImpl(this._value, this._then);

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
              as num,
      variants: null == variants
          ? _value.variants
          : variants // ignore: cast_nullable_to_non_nullable
              as List<GetOrderVariant>,
      addons: null == addons
          ? _value.addons
          : addons // ignore: cast_nullable_to_non_nullable
              as List<GetOrderAddon>,
    ) as $Val);
  }
}

/// @nodoc
abstract class _$$GetOrderItemImplCopyWith<$Res>
    implements $GetOrderItemCopyWith<$Res> {
  factory _$$GetOrderItemImplCopyWith(
          _$GetOrderItemImpl value, $Res Function(_$GetOrderItemImpl) then) =
      __$$GetOrderItemImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call(
      {String menuItemId,
      String name,
      int quantity,
      num price,
      List<GetOrderVariant> variants,
      List<GetOrderAddon> addons});
}

/// @nodoc
class __$$GetOrderItemImplCopyWithImpl<$Res>
    extends _$GetOrderItemCopyWithImpl<$Res, _$GetOrderItemImpl>
    implements _$$GetOrderItemImplCopyWith<$Res> {
  __$$GetOrderItemImplCopyWithImpl(
      _$GetOrderItemImpl _value, $Res Function(_$GetOrderItemImpl) _then)
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
  }) {
    return _then(_$GetOrderItemImpl(
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
              as num,
      variants: null == variants
          ? _value._variants
          : variants // ignore: cast_nullable_to_non_nullable
              as List<GetOrderVariant>,
      addons: null == addons
          ? _value._addons
          : addons // ignore: cast_nullable_to_non_nullable
              as List<GetOrderAddon>,
    ));
  }
}

/// @nodoc

@JsonSerializable(explicitToJson: true)
class _$GetOrderItemImpl implements _GetOrderItem {
  const _$GetOrderItemImpl(
      {required this.menuItemId,
      required this.name,
      this.quantity = 1,
      this.price = 0,
      final List<GetOrderVariant> variants = const [],
      final List<GetOrderAddon> addons = const []})
      : _variants = variants,
        _addons = addons;

  factory _$GetOrderItemImpl.fromJson(Map<String, dynamic> json) =>
      _$$GetOrderItemImplFromJson(json);

  @override
  final String menuItemId;
  @override
  final String name;
  @override
  @JsonKey()
  final int quantity;
  @override
  @JsonKey()
  final num price;
  final List<GetOrderVariant> _variants;
  @override
  @JsonKey()
  List<GetOrderVariant> get variants {
    if (_variants is EqualUnmodifiableListView) return _variants;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableListView(_variants);
  }

  final List<GetOrderAddon> _addons;
  @override
  @JsonKey()
  List<GetOrderAddon> get addons {
    if (_addons is EqualUnmodifiableListView) return _addons;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableListView(_addons);
  }

  @override
  String toString() {
    return 'GetOrderItem(menuItemId: $menuItemId, name: $name, quantity: $quantity, price: $price, variants: $variants, addons: $addons)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$GetOrderItemImpl &&
            (identical(other.menuItemId, menuItemId) ||
                other.menuItemId == menuItemId) &&
            (identical(other.name, name) || other.name == name) &&
            (identical(other.quantity, quantity) ||
                other.quantity == quantity) &&
            (identical(other.price, price) || other.price == price) &&
            const DeepCollectionEquality().equals(other._variants, _variants) &&
            const DeepCollectionEquality().equals(other._addons, _addons));
  }

  @JsonKey(ignore: true)
  @override
  int get hashCode => Object.hash(
      runtimeType,
      menuItemId,
      name,
      quantity,
      price,
      const DeepCollectionEquality().hash(_variants),
      const DeepCollectionEquality().hash(_addons));

  @JsonKey(ignore: true)
  @override
  @pragma('vm:prefer-inline')
  _$$GetOrderItemImplCopyWith<_$GetOrderItemImpl> get copyWith =>
      __$$GetOrderItemImplCopyWithImpl<_$GetOrderItemImpl>(this, _$identity);

  @override
  Map<String, dynamic> toJson() {
    return _$$GetOrderItemImplToJson(
      this,
    );
  }
}

abstract class _GetOrderItem implements GetOrderItem {
  const factory _GetOrderItem(
      {required final String menuItemId,
      required final String name,
      final int quantity,
      final num price,
      final List<GetOrderVariant> variants,
      final List<GetOrderAddon> addons}) = _$GetOrderItemImpl;

  factory _GetOrderItem.fromJson(Map<String, dynamic> json) =
      _$GetOrderItemImpl.fromJson;

  @override
  String get menuItemId;
  @override
  String get name;
  @override
  int get quantity;
  @override
  num get price;
  @override
  List<GetOrderVariant> get variants;
  @override
  List<GetOrderAddon> get addons;
  @override
  @JsonKey(ignore: true)
  _$$GetOrderItemImplCopyWith<_$GetOrderItemImpl> get copyWith =>
      throw _privateConstructorUsedError;
}

GetOrderVariant _$GetOrderVariantFromJson(Map<String, dynamic> json) {
  return _GetOrderVariant.fromJson(json);
}

/// @nodoc
mixin _$GetOrderVariant {
  String get id => throw _privateConstructorUsedError;
  bool get isMandatory => throw _privateConstructorUsedError;
  bool get respectParentDiscount => throw _privateConstructorUsedError;
  @JsonKey(name: 'selected_variant_id')
  String get selectedVariantId => throw _privateConstructorUsedError;
  @JsonKey(name: 'selected_variant_name')
  String get selectedVariantName => throw _privateConstructorUsedError;
  PriceInfo get priceInfo => throw _privateConstructorUsedError;

  Map<String, dynamic> toJson() => throw _privateConstructorUsedError;
  @JsonKey(ignore: true)
  $GetOrderVariantCopyWith<GetOrderVariant> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $GetOrderVariantCopyWith<$Res> {
  factory $GetOrderVariantCopyWith(
          GetOrderVariant value, $Res Function(GetOrderVariant) then) =
      _$GetOrderVariantCopyWithImpl<$Res, GetOrderVariant>;
  @useResult
  $Res call(
      {String id,
      bool isMandatory,
      bool respectParentDiscount,
      @JsonKey(name: 'selected_variant_id') String selectedVariantId,
      @JsonKey(name: 'selected_variant_name') String selectedVariantName,
      PriceInfo priceInfo});

  $PriceInfoCopyWith<$Res> get priceInfo;
}

/// @nodoc
class _$GetOrderVariantCopyWithImpl<$Res, $Val extends GetOrderVariant>
    implements $GetOrderVariantCopyWith<$Res> {
  _$GetOrderVariantCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? id = null,
    Object? isMandatory = null,
    Object? respectParentDiscount = null,
    Object? selectedVariantId = null,
    Object? selectedVariantName = null,
    Object? priceInfo = null,
  }) {
    return _then(_value.copyWith(
      id: null == id
          ? _value.id
          : id // ignore: cast_nullable_to_non_nullable
              as String,
      isMandatory: null == isMandatory
          ? _value.isMandatory
          : isMandatory // ignore: cast_nullable_to_non_nullable
              as bool,
      respectParentDiscount: null == respectParentDiscount
          ? _value.respectParentDiscount
          : respectParentDiscount // ignore: cast_nullable_to_non_nullable
              as bool,
      selectedVariantId: null == selectedVariantId
          ? _value.selectedVariantId
          : selectedVariantId // ignore: cast_nullable_to_non_nullable
              as String,
      selectedVariantName: null == selectedVariantName
          ? _value.selectedVariantName
          : selectedVariantName // ignore: cast_nullable_to_non_nullable
              as String,
      priceInfo: null == priceInfo
          ? _value.priceInfo
          : priceInfo // ignore: cast_nullable_to_non_nullable
              as PriceInfo,
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
abstract class _$$GetOrderVariantImplCopyWith<$Res>
    implements $GetOrderVariantCopyWith<$Res> {
  factory _$$GetOrderVariantImplCopyWith(_$GetOrderVariantImpl value,
          $Res Function(_$GetOrderVariantImpl) then) =
      __$$GetOrderVariantImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call(
      {String id,
      bool isMandatory,
      bool respectParentDiscount,
      @JsonKey(name: 'selected_variant_id') String selectedVariantId,
      @JsonKey(name: 'selected_variant_name') String selectedVariantName,
      PriceInfo priceInfo});

  @override
  $PriceInfoCopyWith<$Res> get priceInfo;
}

/// @nodoc
class __$$GetOrderVariantImplCopyWithImpl<$Res>
    extends _$GetOrderVariantCopyWithImpl<$Res, _$GetOrderVariantImpl>
    implements _$$GetOrderVariantImplCopyWith<$Res> {
  __$$GetOrderVariantImplCopyWithImpl(
      _$GetOrderVariantImpl _value, $Res Function(_$GetOrderVariantImpl) _then)
      : super(_value, _then);

  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? id = null,
    Object? isMandatory = null,
    Object? respectParentDiscount = null,
    Object? selectedVariantId = null,
    Object? selectedVariantName = null,
    Object? priceInfo = null,
  }) {
    return _then(_$GetOrderVariantImpl(
      id: null == id
          ? _value.id
          : id // ignore: cast_nullable_to_non_nullable
              as String,
      isMandatory: null == isMandatory
          ? _value.isMandatory
          : isMandatory // ignore: cast_nullable_to_non_nullable
              as bool,
      respectParentDiscount: null == respectParentDiscount
          ? _value.respectParentDiscount
          : respectParentDiscount // ignore: cast_nullable_to_non_nullable
              as bool,
      selectedVariantId: null == selectedVariantId
          ? _value.selectedVariantId
          : selectedVariantId // ignore: cast_nullable_to_non_nullable
              as String,
      selectedVariantName: null == selectedVariantName
          ? _value.selectedVariantName
          : selectedVariantName // ignore: cast_nullable_to_non_nullable
              as String,
      priceInfo: null == priceInfo
          ? _value.priceInfo
          : priceInfo // ignore: cast_nullable_to_non_nullable
              as PriceInfo,
    ));
  }
}

/// @nodoc

@JsonSerializable(explicitToJson: true)
class _$GetOrderVariantImpl implements _GetOrderVariant {
  const _$GetOrderVariantImpl(
      {required this.id,
      this.isMandatory = false,
      this.respectParentDiscount = false,
      @JsonKey(name: 'selected_variant_id') required this.selectedVariantId,
      @JsonKey(name: 'selected_variant_name') required this.selectedVariantName,
      required this.priceInfo});

  factory _$GetOrderVariantImpl.fromJson(Map<String, dynamic> json) =>
      _$$GetOrderVariantImplFromJson(json);

  @override
  final String id;
  @override
  @JsonKey()
  final bool isMandatory;
  @override
  @JsonKey()
  final bool respectParentDiscount;
  @override
  @JsonKey(name: 'selected_variant_id')
  final String selectedVariantId;
  @override
  @JsonKey(name: 'selected_variant_name')
  final String selectedVariantName;
  @override
  final PriceInfo priceInfo;

  @override
  String toString() {
    return 'GetOrderVariant(id: $id, isMandatory: $isMandatory, respectParentDiscount: $respectParentDiscount, selectedVariantId: $selectedVariantId, selectedVariantName: $selectedVariantName, priceInfo: $priceInfo)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$GetOrderVariantImpl &&
            (identical(other.id, id) || other.id == id) &&
            (identical(other.isMandatory, isMandatory) ||
                other.isMandatory == isMandatory) &&
            (identical(other.respectParentDiscount, respectParentDiscount) ||
                other.respectParentDiscount == respectParentDiscount) &&
            (identical(other.selectedVariantId, selectedVariantId) ||
                other.selectedVariantId == selectedVariantId) &&
            (identical(other.selectedVariantName, selectedVariantName) ||
                other.selectedVariantName == selectedVariantName) &&
            (identical(other.priceInfo, priceInfo) ||
                other.priceInfo == priceInfo));
  }

  @JsonKey(ignore: true)
  @override
  int get hashCode => Object.hash(runtimeType, id, isMandatory,
      respectParentDiscount, selectedVariantId, selectedVariantName, priceInfo);

  @JsonKey(ignore: true)
  @override
  @pragma('vm:prefer-inline')
  _$$GetOrderVariantImplCopyWith<_$GetOrderVariantImpl> get copyWith =>
      __$$GetOrderVariantImplCopyWithImpl<_$GetOrderVariantImpl>(
          this, _$identity);

  @override
  Map<String, dynamic> toJson() {
    return _$$GetOrderVariantImplToJson(
      this,
    );
  }
}

abstract class _GetOrderVariant implements GetOrderVariant {
  const factory _GetOrderVariant(
      {required final String id,
      final bool isMandatory,
      final bool respectParentDiscount,
      @JsonKey(name: 'selected_variant_id')
      required final String selectedVariantId,
      @JsonKey(name: 'selected_variant_name')
      required final String selectedVariantName,
      required final PriceInfo priceInfo}) = _$GetOrderVariantImpl;

  factory _GetOrderVariant.fromJson(Map<String, dynamic> json) =
      _$GetOrderVariantImpl.fromJson;

  @override
  String get id;
  @override
  bool get isMandatory;
  @override
  bool get respectParentDiscount;
  @override
  @JsonKey(name: 'selected_variant_id')
  String get selectedVariantId;
  @override
  @JsonKey(name: 'selected_variant_name')
  String get selectedVariantName;
  @override
  PriceInfo get priceInfo;
  @override
  @JsonKey(ignore: true)
  _$$GetOrderVariantImplCopyWith<_$GetOrderVariantImpl> get copyWith =>
      throw _privateConstructorUsedError;
}

GetOrderAddon _$GetOrderAddonFromJson(Map<String, dynamic> json) {
  return _GetOrderAddon.fromJson(json);
}

/// @nodoc
mixin _$GetOrderAddon {
  String get id => throw _privateConstructorUsedError;
  String get name => throw _privateConstructorUsedError;
  bool get respectParentDiscount => throw _privateConstructorUsedError;
  PriceInfo get priceInfo => throw _privateConstructorUsedError;

  Map<String, dynamic> toJson() => throw _privateConstructorUsedError;
  @JsonKey(ignore: true)
  $GetOrderAddonCopyWith<GetOrderAddon> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $GetOrderAddonCopyWith<$Res> {
  factory $GetOrderAddonCopyWith(
          GetOrderAddon value, $Res Function(GetOrderAddon) then) =
      _$GetOrderAddonCopyWithImpl<$Res, GetOrderAddon>;
  @useResult
  $Res call(
      {String id,
      String name,
      bool respectParentDiscount,
      PriceInfo priceInfo});

  $PriceInfoCopyWith<$Res> get priceInfo;
}

/// @nodoc
class _$GetOrderAddonCopyWithImpl<$Res, $Val extends GetOrderAddon>
    implements $GetOrderAddonCopyWith<$Res> {
  _$GetOrderAddonCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? id = null,
    Object? name = null,
    Object? respectParentDiscount = null,
    Object? priceInfo = null,
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
      respectParentDiscount: null == respectParentDiscount
          ? _value.respectParentDiscount
          : respectParentDiscount // ignore: cast_nullable_to_non_nullable
              as bool,
      priceInfo: null == priceInfo
          ? _value.priceInfo
          : priceInfo // ignore: cast_nullable_to_non_nullable
              as PriceInfo,
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
abstract class _$$GetOrderAddonImplCopyWith<$Res>
    implements $GetOrderAddonCopyWith<$Res> {
  factory _$$GetOrderAddonImplCopyWith(
          _$GetOrderAddonImpl value, $Res Function(_$GetOrderAddonImpl) then) =
      __$$GetOrderAddonImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call(
      {String id,
      String name,
      bool respectParentDiscount,
      PriceInfo priceInfo});

  @override
  $PriceInfoCopyWith<$Res> get priceInfo;
}

/// @nodoc
class __$$GetOrderAddonImplCopyWithImpl<$Res>
    extends _$GetOrderAddonCopyWithImpl<$Res, _$GetOrderAddonImpl>
    implements _$$GetOrderAddonImplCopyWith<$Res> {
  __$$GetOrderAddonImplCopyWithImpl(
      _$GetOrderAddonImpl _value, $Res Function(_$GetOrderAddonImpl) _then)
      : super(_value, _then);

  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? id = null,
    Object? name = null,
    Object? respectParentDiscount = null,
    Object? priceInfo = null,
  }) {
    return _then(_$GetOrderAddonImpl(
      id: null == id
          ? _value.id
          : id // ignore: cast_nullable_to_non_nullable
              as String,
      name: null == name
          ? _value.name
          : name // ignore: cast_nullable_to_non_nullable
              as String,
      respectParentDiscount: null == respectParentDiscount
          ? _value.respectParentDiscount
          : respectParentDiscount // ignore: cast_nullable_to_non_nullable
              as bool,
      priceInfo: null == priceInfo
          ? _value.priceInfo
          : priceInfo // ignore: cast_nullable_to_non_nullable
              as PriceInfo,
    ));
  }
}

/// @nodoc

@JsonSerializable(explicitToJson: true)
class _$GetOrderAddonImpl implements _GetOrderAddon {
  const _$GetOrderAddonImpl(
      {required this.id,
      required this.name,
      this.respectParentDiscount = false,
      required this.priceInfo});

  factory _$GetOrderAddonImpl.fromJson(Map<String, dynamic> json) =>
      _$$GetOrderAddonImplFromJson(json);

  @override
  final String id;
  @override
  final String name;
  @override
  @JsonKey()
  final bool respectParentDiscount;
  @override
  final PriceInfo priceInfo;

  @override
  String toString() {
    return 'GetOrderAddon(id: $id, name: $name, respectParentDiscount: $respectParentDiscount, priceInfo: $priceInfo)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$GetOrderAddonImpl &&
            (identical(other.id, id) || other.id == id) &&
            (identical(other.name, name) || other.name == name) &&
            (identical(other.respectParentDiscount, respectParentDiscount) ||
                other.respectParentDiscount == respectParentDiscount) &&
            (identical(other.priceInfo, priceInfo) ||
                other.priceInfo == priceInfo));
  }

  @JsonKey(ignore: true)
  @override
  int get hashCode =>
      Object.hash(runtimeType, id, name, respectParentDiscount, priceInfo);

  @JsonKey(ignore: true)
  @override
  @pragma('vm:prefer-inline')
  _$$GetOrderAddonImplCopyWith<_$GetOrderAddonImpl> get copyWith =>
      __$$GetOrderAddonImplCopyWithImpl<_$GetOrderAddonImpl>(this, _$identity);

  @override
  Map<String, dynamic> toJson() {
    return _$$GetOrderAddonImplToJson(
      this,
    );
  }
}

abstract class _GetOrderAddon implements GetOrderAddon {
  const factory _GetOrderAddon(
      {required final String id,
      required final String name,
      final bool respectParentDiscount,
      required final PriceInfo priceInfo}) = _$GetOrderAddonImpl;

  factory _GetOrderAddon.fromJson(Map<String, dynamic> json) =
      _$GetOrderAddonImpl.fromJson;

  @override
  String get id;
  @override
  String get name;
  @override
  bool get respectParentDiscount;
  @override
  PriceInfo get priceInfo;
  @override
  @JsonKey(ignore: true)
  _$$GetOrderAddonImplCopyWith<_$GetOrderAddonImpl> get copyWith =>
      throw _privateConstructorUsedError;
}

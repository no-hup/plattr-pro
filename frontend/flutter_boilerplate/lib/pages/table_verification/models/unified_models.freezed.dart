// coverage:ignore-file
// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'unified_models.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

T _$identity<T>(T value) => value;

final _privateConstructorUsedError = UnsupportedError(
    'It seems like you constructed your class using `MyClass._()`. This constructor is only meant to be used by freezed and you are not supposed to need it nor use it.\nPlease check the documentation here for more information: https://github.com/rrousselGit/freezed#adding-getters-and-methods-to-our-models');

TableValidationData _$TableValidationDataFromJson(Map<String, dynamic> json) {
  return _TableValidationData.fromJson(json);
}

/// @nodoc
mixin _$TableValidationData {
  String get status => throw _privateConstructorUsedError;
  String? get tableStatus => throw _privateConstructorUsedError;
  RestaurantInfo? get restaurant => throw _privateConstructorUsedError;
  TableInfo? get table => throw _privateConstructorUsedError;
  SessionInfo? get session => throw _privateConstructorUsedError;
  PrimaryCustomer? get primaryCustomer => throw _privateConstructorUsedError;
  List<String>? get occupiedBy => throw _privateConstructorUsedError;
  bool get otpRequiredForOrder => throw _privateConstructorUsedError;
  bool get isUsernameMandatory => throw _privateConstructorUsedError;
  bool get isPhoneNumberMandatory => throw _privateConstructorUsedError;
  bool get isMultiUserSupported => throw _privateConstructorUsedError;
  String? get authMessage => throw _privateConstructorUsedError;
  AssignedServer? get assignedServer => throw _privateConstructorUsedError;

  Map<String, dynamic> toJson() => throw _privateConstructorUsedError;
  @JsonKey(ignore: true)
  $TableValidationDataCopyWith<TableValidationData> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $TableValidationDataCopyWith<$Res> {
  factory $TableValidationDataCopyWith(
          TableValidationData value, $Res Function(TableValidationData) then) =
      _$TableValidationDataCopyWithImpl<$Res, TableValidationData>;
  @useResult
  $Res call(
      {String status,
      String? tableStatus,
      RestaurantInfo? restaurant,
      TableInfo? table,
      SessionInfo? session,
      PrimaryCustomer? primaryCustomer,
      List<String>? occupiedBy,
      bool otpRequiredForOrder,
      bool isUsernameMandatory,
      bool isPhoneNumberMandatory,
      bool isMultiUserSupported,
      String? authMessage,
      AssignedServer? assignedServer});

  $RestaurantInfoCopyWith<$Res>? get restaurant;
  $TableInfoCopyWith<$Res>? get table;
  $SessionInfoCopyWith<$Res>? get session;
  $PrimaryCustomerCopyWith<$Res>? get primaryCustomer;
  $AssignedServerCopyWith<$Res>? get assignedServer;
}

/// @nodoc
class _$TableValidationDataCopyWithImpl<$Res, $Val extends TableValidationData>
    implements $TableValidationDataCopyWith<$Res> {
  _$TableValidationDataCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? status = null,
    Object? tableStatus = freezed,
    Object? restaurant = freezed,
    Object? table = freezed,
    Object? session = freezed,
    Object? primaryCustomer = freezed,
    Object? occupiedBy = freezed,
    Object? otpRequiredForOrder = null,
    Object? isUsernameMandatory = null,
    Object? isPhoneNumberMandatory = null,
    Object? isMultiUserSupported = null,
    Object? authMessage = freezed,
    Object? assignedServer = freezed,
  }) {
    return _then(_value.copyWith(
      status: null == status
          ? _value.status
          : status // ignore: cast_nullable_to_non_nullable
              as String,
      tableStatus: freezed == tableStatus
          ? _value.tableStatus
          : tableStatus // ignore: cast_nullable_to_non_nullable
              as String?,
      restaurant: freezed == restaurant
          ? _value.restaurant
          : restaurant // ignore: cast_nullable_to_non_nullable
              as RestaurantInfo?,
      table: freezed == table
          ? _value.table
          : table // ignore: cast_nullable_to_non_nullable
              as TableInfo?,
      session: freezed == session
          ? _value.session
          : session // ignore: cast_nullable_to_non_nullable
              as SessionInfo?,
      primaryCustomer: freezed == primaryCustomer
          ? _value.primaryCustomer
          : primaryCustomer // ignore: cast_nullable_to_non_nullable
              as PrimaryCustomer?,
      occupiedBy: freezed == occupiedBy
          ? _value.occupiedBy
          : occupiedBy // ignore: cast_nullable_to_non_nullable
              as List<String>?,
      otpRequiredForOrder: null == otpRequiredForOrder
          ? _value.otpRequiredForOrder
          : otpRequiredForOrder // ignore: cast_nullable_to_non_nullable
              as bool,
      isUsernameMandatory: null == isUsernameMandatory
          ? _value.isUsernameMandatory
          : isUsernameMandatory // ignore: cast_nullable_to_non_nullable
              as bool,
      isPhoneNumberMandatory: null == isPhoneNumberMandatory
          ? _value.isPhoneNumberMandatory
          : isPhoneNumberMandatory // ignore: cast_nullable_to_non_nullable
              as bool,
      isMultiUserSupported: null == isMultiUserSupported
          ? _value.isMultiUserSupported
          : isMultiUserSupported // ignore: cast_nullable_to_non_nullable
              as bool,
      authMessage: freezed == authMessage
          ? _value.authMessage
          : authMessage // ignore: cast_nullable_to_non_nullable
              as String?,
      assignedServer: freezed == assignedServer
          ? _value.assignedServer
          : assignedServer // ignore: cast_nullable_to_non_nullable
              as AssignedServer?,
    ) as $Val);
  }

  @override
  @pragma('vm:prefer-inline')
  $RestaurantInfoCopyWith<$Res>? get restaurant {
    if (_value.restaurant == null) {
      return null;
    }

    return $RestaurantInfoCopyWith<$Res>(_value.restaurant!, (value) {
      return _then(_value.copyWith(restaurant: value) as $Val);
    });
  }

  @override
  @pragma('vm:prefer-inline')
  $TableInfoCopyWith<$Res>? get table {
    if (_value.table == null) {
      return null;
    }

    return $TableInfoCopyWith<$Res>(_value.table!, (value) {
      return _then(_value.copyWith(table: value) as $Val);
    });
  }

  @override
  @pragma('vm:prefer-inline')
  $SessionInfoCopyWith<$Res>? get session {
    if (_value.session == null) {
      return null;
    }

    return $SessionInfoCopyWith<$Res>(_value.session!, (value) {
      return _then(_value.copyWith(session: value) as $Val);
    });
  }

  @override
  @pragma('vm:prefer-inline')
  $PrimaryCustomerCopyWith<$Res>? get primaryCustomer {
    if (_value.primaryCustomer == null) {
      return null;
    }

    return $PrimaryCustomerCopyWith<$Res>(_value.primaryCustomer!, (value) {
      return _then(_value.copyWith(primaryCustomer: value) as $Val);
    });
  }

  @override
  @pragma('vm:prefer-inline')
  $AssignedServerCopyWith<$Res>? get assignedServer {
    if (_value.assignedServer == null) {
      return null;
    }

    return $AssignedServerCopyWith<$Res>(_value.assignedServer!, (value) {
      return _then(_value.copyWith(assignedServer: value) as $Val);
    });
  }
}

/// @nodoc
abstract class _$$TableValidationDataImplCopyWith<$Res>
    implements $TableValidationDataCopyWith<$Res> {
  factory _$$TableValidationDataImplCopyWith(_$TableValidationDataImpl value,
          $Res Function(_$TableValidationDataImpl) then) =
      __$$TableValidationDataImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call(
      {String status,
      String? tableStatus,
      RestaurantInfo? restaurant,
      TableInfo? table,
      SessionInfo? session,
      PrimaryCustomer? primaryCustomer,
      List<String>? occupiedBy,
      bool otpRequiredForOrder,
      bool isUsernameMandatory,
      bool isPhoneNumberMandatory,
      bool isMultiUserSupported,
      String? authMessage,
      AssignedServer? assignedServer});

  @override
  $RestaurantInfoCopyWith<$Res>? get restaurant;
  @override
  $TableInfoCopyWith<$Res>? get table;
  @override
  $SessionInfoCopyWith<$Res>? get session;
  @override
  $PrimaryCustomerCopyWith<$Res>? get primaryCustomer;
  @override
  $AssignedServerCopyWith<$Res>? get assignedServer;
}

/// @nodoc
class __$$TableValidationDataImplCopyWithImpl<$Res>
    extends _$TableValidationDataCopyWithImpl<$Res, _$TableValidationDataImpl>
    implements _$$TableValidationDataImplCopyWith<$Res> {
  __$$TableValidationDataImplCopyWithImpl(_$TableValidationDataImpl _value,
      $Res Function(_$TableValidationDataImpl) _then)
      : super(_value, _then);

  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? status = null,
    Object? tableStatus = freezed,
    Object? restaurant = freezed,
    Object? table = freezed,
    Object? session = freezed,
    Object? primaryCustomer = freezed,
    Object? occupiedBy = freezed,
    Object? otpRequiredForOrder = null,
    Object? isUsernameMandatory = null,
    Object? isPhoneNumberMandatory = null,
    Object? isMultiUserSupported = null,
    Object? authMessage = freezed,
    Object? assignedServer = freezed,
  }) {
    return _then(_$TableValidationDataImpl(
      status: null == status
          ? _value.status
          : status // ignore: cast_nullable_to_non_nullable
              as String,
      tableStatus: freezed == tableStatus
          ? _value.tableStatus
          : tableStatus // ignore: cast_nullable_to_non_nullable
              as String?,
      restaurant: freezed == restaurant
          ? _value.restaurant
          : restaurant // ignore: cast_nullable_to_non_nullable
              as RestaurantInfo?,
      table: freezed == table
          ? _value.table
          : table // ignore: cast_nullable_to_non_nullable
              as TableInfo?,
      session: freezed == session
          ? _value.session
          : session // ignore: cast_nullable_to_non_nullable
              as SessionInfo?,
      primaryCustomer: freezed == primaryCustomer
          ? _value.primaryCustomer
          : primaryCustomer // ignore: cast_nullable_to_non_nullable
              as PrimaryCustomer?,
      occupiedBy: freezed == occupiedBy
          ? _value._occupiedBy
          : occupiedBy // ignore: cast_nullable_to_non_nullable
              as List<String>?,
      otpRequiredForOrder: null == otpRequiredForOrder
          ? _value.otpRequiredForOrder
          : otpRequiredForOrder // ignore: cast_nullable_to_non_nullable
              as bool,
      isUsernameMandatory: null == isUsernameMandatory
          ? _value.isUsernameMandatory
          : isUsernameMandatory // ignore: cast_nullable_to_non_nullable
              as bool,
      isPhoneNumberMandatory: null == isPhoneNumberMandatory
          ? _value.isPhoneNumberMandatory
          : isPhoneNumberMandatory // ignore: cast_nullable_to_non_nullable
              as bool,
      isMultiUserSupported: null == isMultiUserSupported
          ? _value.isMultiUserSupported
          : isMultiUserSupported // ignore: cast_nullable_to_non_nullable
              as bool,
      authMessage: freezed == authMessage
          ? _value.authMessage
          : authMessage // ignore: cast_nullable_to_non_nullable
              as String?,
      assignedServer: freezed == assignedServer
          ? _value.assignedServer
          : assignedServer // ignore: cast_nullable_to_non_nullable
              as AssignedServer?,
    ));
  }
}

/// @nodoc
@JsonSerializable()
class _$TableValidationDataImpl extends _TableValidationData {
  const _$TableValidationDataImpl(
      {required this.status,
      this.tableStatus,
      this.restaurant,
      this.table,
      this.session,
      this.primaryCustomer,
      final List<String>? occupiedBy,
      this.otpRequiredForOrder = false,
      this.isUsernameMandatory = false,
      this.isPhoneNumberMandatory = false,
      this.isMultiUserSupported = false,
      this.authMessage,
      this.assignedServer})
      : _occupiedBy = occupiedBy,
        super._();

  factory _$TableValidationDataImpl.fromJson(Map<String, dynamic> json) =>
      _$$TableValidationDataImplFromJson(json);

  @override
  final String status;
  @override
  final String? tableStatus;
  @override
  final RestaurantInfo? restaurant;
  @override
  final TableInfo? table;
  @override
  final SessionInfo? session;
  @override
  final PrimaryCustomer? primaryCustomer;
  final List<String>? _occupiedBy;
  @override
  List<String>? get occupiedBy {
    final value = _occupiedBy;
    if (value == null) return null;
    if (_occupiedBy is EqualUnmodifiableListView) return _occupiedBy;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableListView(value);
  }

  @override
  @JsonKey()
  final bool otpRequiredForOrder;
  @override
  @JsonKey()
  final bool isUsernameMandatory;
  @override
  @JsonKey()
  final bool isPhoneNumberMandatory;
  @override
  @JsonKey()
  final bool isMultiUserSupported;
  @override
  final String? authMessage;
  @override
  final AssignedServer? assignedServer;

  @override
  String toString() {
    return 'TableValidationData(status: $status, tableStatus: $tableStatus, restaurant: $restaurant, table: $table, session: $session, primaryCustomer: $primaryCustomer, occupiedBy: $occupiedBy, otpRequiredForOrder: $otpRequiredForOrder, isUsernameMandatory: $isUsernameMandatory, isPhoneNumberMandatory: $isPhoneNumberMandatory, isMultiUserSupported: $isMultiUserSupported, authMessage: $authMessage, assignedServer: $assignedServer)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$TableValidationDataImpl &&
            (identical(other.status, status) || other.status == status) &&
            (identical(other.tableStatus, tableStatus) ||
                other.tableStatus == tableStatus) &&
            (identical(other.restaurant, restaurant) ||
                other.restaurant == restaurant) &&
            (identical(other.table, table) || other.table == table) &&
            (identical(other.session, session) || other.session == session) &&
            (identical(other.primaryCustomer, primaryCustomer) ||
                other.primaryCustomer == primaryCustomer) &&
            const DeepCollectionEquality()
                .equals(other._occupiedBy, _occupiedBy) &&
            (identical(other.otpRequiredForOrder, otpRequiredForOrder) ||
                other.otpRequiredForOrder == otpRequiredForOrder) &&
            (identical(other.isUsernameMandatory, isUsernameMandatory) ||
                other.isUsernameMandatory == isUsernameMandatory) &&
            (identical(other.isPhoneNumberMandatory, isPhoneNumberMandatory) ||
                other.isPhoneNumberMandatory == isPhoneNumberMandatory) &&
            (identical(other.isMultiUserSupported, isMultiUserSupported) ||
                other.isMultiUserSupported == isMultiUserSupported) &&
            (identical(other.authMessage, authMessage) ||
                other.authMessage == authMessage) &&
            (identical(other.assignedServer, assignedServer) ||
                other.assignedServer == assignedServer));
  }

  @JsonKey(ignore: true)
  @override
  int get hashCode => Object.hash(
      runtimeType,
      status,
      tableStatus,
      restaurant,
      table,
      session,
      primaryCustomer,
      const DeepCollectionEquality().hash(_occupiedBy),
      otpRequiredForOrder,
      isUsernameMandatory,
      isPhoneNumberMandatory,
      isMultiUserSupported,
      authMessage,
      assignedServer);

  @JsonKey(ignore: true)
  @override
  @pragma('vm:prefer-inline')
  _$$TableValidationDataImplCopyWith<_$TableValidationDataImpl> get copyWith =>
      __$$TableValidationDataImplCopyWithImpl<_$TableValidationDataImpl>(
          this, _$identity);

  @override
  Map<String, dynamic> toJson() {
    return _$$TableValidationDataImplToJson(
      this,
    );
  }
}

abstract class _TableValidationData extends TableValidationData {
  const factory _TableValidationData(
      {required final String status,
      final String? tableStatus,
      final RestaurantInfo? restaurant,
      final TableInfo? table,
      final SessionInfo? session,
      final PrimaryCustomer? primaryCustomer,
      final List<String>? occupiedBy,
      final bool otpRequiredForOrder,
      final bool isUsernameMandatory,
      final bool isPhoneNumberMandatory,
      final bool isMultiUserSupported,
      final String? authMessage,
      final AssignedServer? assignedServer}) = _$TableValidationDataImpl;
  const _TableValidationData._() : super._();

  factory _TableValidationData.fromJson(Map<String, dynamic> json) =
      _$TableValidationDataImpl.fromJson;

  @override
  String get status;
  @override
  String? get tableStatus;
  @override
  RestaurantInfo? get restaurant;
  @override
  TableInfo? get table;
  @override
  SessionInfo? get session;
  @override
  PrimaryCustomer? get primaryCustomer;
  @override
  List<String>? get occupiedBy;
  @override
  bool get otpRequiredForOrder;
  @override
  bool get isUsernameMandatory;
  @override
  bool get isPhoneNumberMandatory;
  @override
  bool get isMultiUserSupported;
  @override
  String? get authMessage;
  @override
  AssignedServer? get assignedServer;
  @override
  @JsonKey(ignore: true)
  _$$TableValidationDataImplCopyWith<_$TableValidationDataImpl> get copyWith =>
      throw _privateConstructorUsedError;
}

RestaurantInfo _$RestaurantInfoFromJson(Map<String, dynamic> json) {
  return _RestaurantInfo.fromJson(json);
}

/// @nodoc
mixin _$RestaurantInfo {
  String get name => throw _privateConstructorUsedError;
  String get id => throw _privateConstructorUsedError;

  Map<String, dynamic> toJson() => throw _privateConstructorUsedError;
  @JsonKey(ignore: true)
  $RestaurantInfoCopyWith<RestaurantInfo> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $RestaurantInfoCopyWith<$Res> {
  factory $RestaurantInfoCopyWith(
          RestaurantInfo value, $Res Function(RestaurantInfo) then) =
      _$RestaurantInfoCopyWithImpl<$Res, RestaurantInfo>;
  @useResult
  $Res call({String name, String id});
}

/// @nodoc
class _$RestaurantInfoCopyWithImpl<$Res, $Val extends RestaurantInfo>
    implements $RestaurantInfoCopyWith<$Res> {
  _$RestaurantInfoCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? name = null,
    Object? id = null,
  }) {
    return _then(_value.copyWith(
      name: null == name
          ? _value.name
          : name // ignore: cast_nullable_to_non_nullable
              as String,
      id: null == id
          ? _value.id
          : id // ignore: cast_nullable_to_non_nullable
              as String,
    ) as $Val);
  }
}

/// @nodoc
abstract class _$$RestaurantInfoImplCopyWith<$Res>
    implements $RestaurantInfoCopyWith<$Res> {
  factory _$$RestaurantInfoImplCopyWith(_$RestaurantInfoImpl value,
          $Res Function(_$RestaurantInfoImpl) then) =
      __$$RestaurantInfoImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call({String name, String id});
}

/// @nodoc
class __$$RestaurantInfoImplCopyWithImpl<$Res>
    extends _$RestaurantInfoCopyWithImpl<$Res, _$RestaurantInfoImpl>
    implements _$$RestaurantInfoImplCopyWith<$Res> {
  __$$RestaurantInfoImplCopyWithImpl(
      _$RestaurantInfoImpl _value, $Res Function(_$RestaurantInfoImpl) _then)
      : super(_value, _then);

  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? name = null,
    Object? id = null,
  }) {
    return _then(_$RestaurantInfoImpl(
      name: null == name
          ? _value.name
          : name // ignore: cast_nullable_to_non_nullable
              as String,
      id: null == id
          ? _value.id
          : id // ignore: cast_nullable_to_non_nullable
              as String,
    ));
  }
}

/// @nodoc
@JsonSerializable()
class _$RestaurantInfoImpl implements _RestaurantInfo {
  const _$RestaurantInfoImpl({required this.name, required this.id});

  factory _$RestaurantInfoImpl.fromJson(Map<String, dynamic> json) =>
      _$$RestaurantInfoImplFromJson(json);

  @override
  final String name;
  @override
  final String id;

  @override
  String toString() {
    return 'RestaurantInfo(name: $name, id: $id)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$RestaurantInfoImpl &&
            (identical(other.name, name) || other.name == name) &&
            (identical(other.id, id) || other.id == id));
  }

  @JsonKey(ignore: true)
  @override
  int get hashCode => Object.hash(runtimeType, name, id);

  @JsonKey(ignore: true)
  @override
  @pragma('vm:prefer-inline')
  _$$RestaurantInfoImplCopyWith<_$RestaurantInfoImpl> get copyWith =>
      __$$RestaurantInfoImplCopyWithImpl<_$RestaurantInfoImpl>(
          this, _$identity);

  @override
  Map<String, dynamic> toJson() {
    return _$$RestaurantInfoImplToJson(
      this,
    );
  }
}

abstract class _RestaurantInfo implements RestaurantInfo {
  const factory _RestaurantInfo(
      {required final String name,
      required final String id}) = _$RestaurantInfoImpl;

  factory _RestaurantInfo.fromJson(Map<String, dynamic> json) =
      _$RestaurantInfoImpl.fromJson;

  @override
  String get name;
  @override
  String get id;
  @override
  @JsonKey(ignore: true)
  _$$RestaurantInfoImplCopyWith<_$RestaurantInfoImpl> get copyWith =>
      throw _privateConstructorUsedError;
}

TableInfo _$TableInfoFromJson(Map<String, dynamic> json) {
  return _TableInfo.fromJson(json);
}

/// @nodoc
mixin _$TableInfo {
  String get number => throw _privateConstructorUsedError;
  String get id => throw _privateConstructorUsedError;
  int? get capacity => throw _privateConstructorUsedError;
  String? get assignedServerId => throw _privateConstructorUsedError;

  Map<String, dynamic> toJson() => throw _privateConstructorUsedError;
  @JsonKey(ignore: true)
  $TableInfoCopyWith<TableInfo> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $TableInfoCopyWith<$Res> {
  factory $TableInfoCopyWith(TableInfo value, $Res Function(TableInfo) then) =
      _$TableInfoCopyWithImpl<$Res, TableInfo>;
  @useResult
  $Res call(
      {String number, String id, int? capacity, String? assignedServerId});
}

/// @nodoc
class _$TableInfoCopyWithImpl<$Res, $Val extends TableInfo>
    implements $TableInfoCopyWith<$Res> {
  _$TableInfoCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? number = null,
    Object? id = null,
    Object? capacity = freezed,
    Object? assignedServerId = freezed,
  }) {
    return _then(_value.copyWith(
      number: null == number
          ? _value.number
          : number // ignore: cast_nullable_to_non_nullable
              as String,
      id: null == id
          ? _value.id
          : id // ignore: cast_nullable_to_non_nullable
              as String,
      capacity: freezed == capacity
          ? _value.capacity
          : capacity // ignore: cast_nullable_to_non_nullable
              as int?,
      assignedServerId: freezed == assignedServerId
          ? _value.assignedServerId
          : assignedServerId // ignore: cast_nullable_to_non_nullable
              as String?,
    ) as $Val);
  }
}

/// @nodoc
abstract class _$$TableInfoImplCopyWith<$Res>
    implements $TableInfoCopyWith<$Res> {
  factory _$$TableInfoImplCopyWith(
          _$TableInfoImpl value, $Res Function(_$TableInfoImpl) then) =
      __$$TableInfoImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call(
      {String number, String id, int? capacity, String? assignedServerId});
}

/// @nodoc
class __$$TableInfoImplCopyWithImpl<$Res>
    extends _$TableInfoCopyWithImpl<$Res, _$TableInfoImpl>
    implements _$$TableInfoImplCopyWith<$Res> {
  __$$TableInfoImplCopyWithImpl(
      _$TableInfoImpl _value, $Res Function(_$TableInfoImpl) _then)
      : super(_value, _then);

  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? number = null,
    Object? id = null,
    Object? capacity = freezed,
    Object? assignedServerId = freezed,
  }) {
    return _then(_$TableInfoImpl(
      number: null == number
          ? _value.number
          : number // ignore: cast_nullable_to_non_nullable
              as String,
      id: null == id
          ? _value.id
          : id // ignore: cast_nullable_to_non_nullable
              as String,
      capacity: freezed == capacity
          ? _value.capacity
          : capacity // ignore: cast_nullable_to_non_nullable
              as int?,
      assignedServerId: freezed == assignedServerId
          ? _value.assignedServerId
          : assignedServerId // ignore: cast_nullable_to_non_nullable
              as String?,
    ));
  }
}

/// @nodoc
@JsonSerializable()
class _$TableInfoImpl implements _TableInfo {
  const _$TableInfoImpl(
      {required this.number,
      required this.id,
      this.capacity,
      this.assignedServerId});

  factory _$TableInfoImpl.fromJson(Map<String, dynamic> json) =>
      _$$TableInfoImplFromJson(json);

  @override
  final String number;
  @override
  final String id;
  @override
  final int? capacity;
  @override
  final String? assignedServerId;

  @override
  String toString() {
    return 'TableInfo(number: $number, id: $id, capacity: $capacity, assignedServerId: $assignedServerId)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$TableInfoImpl &&
            (identical(other.number, number) || other.number == number) &&
            (identical(other.id, id) || other.id == id) &&
            (identical(other.capacity, capacity) ||
                other.capacity == capacity) &&
            (identical(other.assignedServerId, assignedServerId) ||
                other.assignedServerId == assignedServerId));
  }

  @JsonKey(ignore: true)
  @override
  int get hashCode =>
      Object.hash(runtimeType, number, id, capacity, assignedServerId);

  @JsonKey(ignore: true)
  @override
  @pragma('vm:prefer-inline')
  _$$TableInfoImplCopyWith<_$TableInfoImpl> get copyWith =>
      __$$TableInfoImplCopyWithImpl<_$TableInfoImpl>(this, _$identity);

  @override
  Map<String, dynamic> toJson() {
    return _$$TableInfoImplToJson(
      this,
    );
  }
}

abstract class _TableInfo implements TableInfo {
  const factory _TableInfo(
      {required final String number,
      required final String id,
      final int? capacity,
      final String? assignedServerId}) = _$TableInfoImpl;

  factory _TableInfo.fromJson(Map<String, dynamic> json) =
      _$TableInfoImpl.fromJson;

  @override
  String get number;
  @override
  String get id;
  @override
  int? get capacity;
  @override
  String? get assignedServerId;
  @override
  @JsonKey(ignore: true)
  _$$TableInfoImplCopyWith<_$TableInfoImpl> get copyWith =>
      throw _privateConstructorUsedError;
}

SessionInfo _$SessionInfoFromJson(Map<String, dynamic> json) {
  return _SessionInfo.fromJson(json);
}

/// @nodoc
mixin _$SessionInfo {
  String get sessionId => throw _privateConstructorUsedError;
  String get expiresAt => throw _privateConstructorUsedError;

  Map<String, dynamic> toJson() => throw _privateConstructorUsedError;
  @JsonKey(ignore: true)
  $SessionInfoCopyWith<SessionInfo> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $SessionInfoCopyWith<$Res> {
  factory $SessionInfoCopyWith(
          SessionInfo value, $Res Function(SessionInfo) then) =
      _$SessionInfoCopyWithImpl<$Res, SessionInfo>;
  @useResult
  $Res call({String sessionId, String expiresAt});
}

/// @nodoc
class _$SessionInfoCopyWithImpl<$Res, $Val extends SessionInfo>
    implements $SessionInfoCopyWith<$Res> {
  _$SessionInfoCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? sessionId = null,
    Object? expiresAt = null,
  }) {
    return _then(_value.copyWith(
      sessionId: null == sessionId
          ? _value.sessionId
          : sessionId // ignore: cast_nullable_to_non_nullable
              as String,
      expiresAt: null == expiresAt
          ? _value.expiresAt
          : expiresAt // ignore: cast_nullable_to_non_nullable
              as String,
    ) as $Val);
  }
}

/// @nodoc
abstract class _$$SessionInfoImplCopyWith<$Res>
    implements $SessionInfoCopyWith<$Res> {
  factory _$$SessionInfoImplCopyWith(
          _$SessionInfoImpl value, $Res Function(_$SessionInfoImpl) then) =
      __$$SessionInfoImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call({String sessionId, String expiresAt});
}

/// @nodoc
class __$$SessionInfoImplCopyWithImpl<$Res>
    extends _$SessionInfoCopyWithImpl<$Res, _$SessionInfoImpl>
    implements _$$SessionInfoImplCopyWith<$Res> {
  __$$SessionInfoImplCopyWithImpl(
      _$SessionInfoImpl _value, $Res Function(_$SessionInfoImpl) _then)
      : super(_value, _then);

  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? sessionId = null,
    Object? expiresAt = null,
  }) {
    return _then(_$SessionInfoImpl(
      sessionId: null == sessionId
          ? _value.sessionId
          : sessionId // ignore: cast_nullable_to_non_nullable
              as String,
      expiresAt: null == expiresAt
          ? _value.expiresAt
          : expiresAt // ignore: cast_nullable_to_non_nullable
              as String,
    ));
  }
}

/// @nodoc
@JsonSerializable()
class _$SessionInfoImpl implements _SessionInfo {
  const _$SessionInfoImpl({required this.sessionId, required this.expiresAt});

  factory _$SessionInfoImpl.fromJson(Map<String, dynamic> json) =>
      _$$SessionInfoImplFromJson(json);

  @override
  final String sessionId;
  @override
  final String expiresAt;

  @override
  String toString() {
    return 'SessionInfo(sessionId: $sessionId, expiresAt: $expiresAt)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$SessionInfoImpl &&
            (identical(other.sessionId, sessionId) ||
                other.sessionId == sessionId) &&
            (identical(other.expiresAt, expiresAt) ||
                other.expiresAt == expiresAt));
  }

  @JsonKey(ignore: true)
  @override
  int get hashCode => Object.hash(runtimeType, sessionId, expiresAt);

  @JsonKey(ignore: true)
  @override
  @pragma('vm:prefer-inline')
  _$$SessionInfoImplCopyWith<_$SessionInfoImpl> get copyWith =>
      __$$SessionInfoImplCopyWithImpl<_$SessionInfoImpl>(this, _$identity);

  @override
  Map<String, dynamic> toJson() {
    return _$$SessionInfoImplToJson(
      this,
    );
  }
}

abstract class _SessionInfo implements SessionInfo {
  const factory _SessionInfo(
      {required final String sessionId,
      required final String expiresAt}) = _$SessionInfoImpl;

  factory _SessionInfo.fromJson(Map<String, dynamic> json) =
      _$SessionInfoImpl.fromJson;

  @override
  String get sessionId;
  @override
  String get expiresAt;
  @override
  @JsonKey(ignore: true)
  _$$SessionInfoImplCopyWith<_$SessionInfoImpl> get copyWith =>
      throw _privateConstructorUsedError;
}

PrimaryCustomer _$PrimaryCustomerFromJson(Map<String, dynamic> json) {
  return _PrimaryCustomer.fromJson(json);
}

/// @nodoc
mixin _$PrimaryCustomer {
  String get phoneNumber => throw _privateConstructorUsedError;
  String get name => throw _privateConstructorUsedError;

  Map<String, dynamic> toJson() => throw _privateConstructorUsedError;
  @JsonKey(ignore: true)
  $PrimaryCustomerCopyWith<PrimaryCustomer> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $PrimaryCustomerCopyWith<$Res> {
  factory $PrimaryCustomerCopyWith(
          PrimaryCustomer value, $Res Function(PrimaryCustomer) then) =
      _$PrimaryCustomerCopyWithImpl<$Res, PrimaryCustomer>;
  @useResult
  $Res call({String phoneNumber, String name});
}

/// @nodoc
class _$PrimaryCustomerCopyWithImpl<$Res, $Val extends PrimaryCustomer>
    implements $PrimaryCustomerCopyWith<$Res> {
  _$PrimaryCustomerCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? phoneNumber = null,
    Object? name = null,
  }) {
    return _then(_value.copyWith(
      phoneNumber: null == phoneNumber
          ? _value.phoneNumber
          : phoneNumber // ignore: cast_nullable_to_non_nullable
              as String,
      name: null == name
          ? _value.name
          : name // ignore: cast_nullable_to_non_nullable
              as String,
    ) as $Val);
  }
}

/// @nodoc
abstract class _$$PrimaryCustomerImplCopyWith<$Res>
    implements $PrimaryCustomerCopyWith<$Res> {
  factory _$$PrimaryCustomerImplCopyWith(_$PrimaryCustomerImpl value,
          $Res Function(_$PrimaryCustomerImpl) then) =
      __$$PrimaryCustomerImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call({String phoneNumber, String name});
}

/// @nodoc
class __$$PrimaryCustomerImplCopyWithImpl<$Res>
    extends _$PrimaryCustomerCopyWithImpl<$Res, _$PrimaryCustomerImpl>
    implements _$$PrimaryCustomerImplCopyWith<$Res> {
  __$$PrimaryCustomerImplCopyWithImpl(
      _$PrimaryCustomerImpl _value, $Res Function(_$PrimaryCustomerImpl) _then)
      : super(_value, _then);

  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? phoneNumber = null,
    Object? name = null,
  }) {
    return _then(_$PrimaryCustomerImpl(
      phoneNumber: null == phoneNumber
          ? _value.phoneNumber
          : phoneNumber // ignore: cast_nullable_to_non_nullable
              as String,
      name: null == name
          ? _value.name
          : name // ignore: cast_nullable_to_non_nullable
              as String,
    ));
  }
}

/// @nodoc
@JsonSerializable()
class _$PrimaryCustomerImpl implements _PrimaryCustomer {
  const _$PrimaryCustomerImpl({required this.phoneNumber, required this.name});

  factory _$PrimaryCustomerImpl.fromJson(Map<String, dynamic> json) =>
      _$$PrimaryCustomerImplFromJson(json);

  @override
  final String phoneNumber;
  @override
  final String name;

  @override
  String toString() {
    return 'PrimaryCustomer(phoneNumber: $phoneNumber, name: $name)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$PrimaryCustomerImpl &&
            (identical(other.phoneNumber, phoneNumber) ||
                other.phoneNumber == phoneNumber) &&
            (identical(other.name, name) || other.name == name));
  }

  @JsonKey(ignore: true)
  @override
  int get hashCode => Object.hash(runtimeType, phoneNumber, name);

  @JsonKey(ignore: true)
  @override
  @pragma('vm:prefer-inline')
  _$$PrimaryCustomerImplCopyWith<_$PrimaryCustomerImpl> get copyWith =>
      __$$PrimaryCustomerImplCopyWithImpl<_$PrimaryCustomerImpl>(
          this, _$identity);

  @override
  Map<String, dynamic> toJson() {
    return _$$PrimaryCustomerImplToJson(
      this,
    );
  }
}

abstract class _PrimaryCustomer implements PrimaryCustomer {
  const factory _PrimaryCustomer(
      {required final String phoneNumber,
      required final String name}) = _$PrimaryCustomerImpl;

  factory _PrimaryCustomer.fromJson(Map<String, dynamic> json) =
      _$PrimaryCustomerImpl.fromJson;

  @override
  String get phoneNumber;
  @override
  String get name;
  @override
  @JsonKey(ignore: true)
  _$$PrimaryCustomerImplCopyWith<_$PrimaryCustomerImpl> get copyWith =>
      throw _privateConstructorUsedError;
}

AssignedServer _$AssignedServerFromJson(Map<String, dynamic> json) {
  return _AssignedServer.fromJson(json);
}

/// @nodoc
mixin _$AssignedServer {
  String get name => throw _privateConstructorUsedError;
  String get status => throw _privateConstructorUsedError;

  Map<String, dynamic> toJson() => throw _privateConstructorUsedError;
  @JsonKey(ignore: true)
  $AssignedServerCopyWith<AssignedServer> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $AssignedServerCopyWith<$Res> {
  factory $AssignedServerCopyWith(
          AssignedServer value, $Res Function(AssignedServer) then) =
      _$AssignedServerCopyWithImpl<$Res, AssignedServer>;
  @useResult
  $Res call({String name, String status});
}

/// @nodoc
class _$AssignedServerCopyWithImpl<$Res, $Val extends AssignedServer>
    implements $AssignedServerCopyWith<$Res> {
  _$AssignedServerCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? name = null,
    Object? status = null,
  }) {
    return _then(_value.copyWith(
      name: null == name
          ? _value.name
          : name // ignore: cast_nullable_to_non_nullable
              as String,
      status: null == status
          ? _value.status
          : status // ignore: cast_nullable_to_non_nullable
              as String,
    ) as $Val);
  }
}

/// @nodoc
abstract class _$$AssignedServerImplCopyWith<$Res>
    implements $AssignedServerCopyWith<$Res> {
  factory _$$AssignedServerImplCopyWith(_$AssignedServerImpl value,
          $Res Function(_$AssignedServerImpl) then) =
      __$$AssignedServerImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call({String name, String status});
}

/// @nodoc
class __$$AssignedServerImplCopyWithImpl<$Res>
    extends _$AssignedServerCopyWithImpl<$Res, _$AssignedServerImpl>
    implements _$$AssignedServerImplCopyWith<$Res> {
  __$$AssignedServerImplCopyWithImpl(
      _$AssignedServerImpl _value, $Res Function(_$AssignedServerImpl) _then)
      : super(_value, _then);

  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? name = null,
    Object? status = null,
  }) {
    return _then(_$AssignedServerImpl(
      name: null == name
          ? _value.name
          : name // ignore: cast_nullable_to_non_nullable
              as String,
      status: null == status
          ? _value.status
          : status // ignore: cast_nullable_to_non_nullable
              as String,
    ));
  }
}

/// @nodoc
@JsonSerializable()
class _$AssignedServerImpl implements _AssignedServer {
  const _$AssignedServerImpl({required this.name, required this.status});

  factory _$AssignedServerImpl.fromJson(Map<String, dynamic> json) =>
      _$$AssignedServerImplFromJson(json);

  @override
  final String name;
  @override
  final String status;

  @override
  String toString() {
    return 'AssignedServer(name: $name, status: $status)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$AssignedServerImpl &&
            (identical(other.name, name) || other.name == name) &&
            (identical(other.status, status) || other.status == status));
  }

  @JsonKey(ignore: true)
  @override
  int get hashCode => Object.hash(runtimeType, name, status);

  @JsonKey(ignore: true)
  @override
  @pragma('vm:prefer-inline')
  _$$AssignedServerImplCopyWith<_$AssignedServerImpl> get copyWith =>
      __$$AssignedServerImplCopyWithImpl<_$AssignedServerImpl>(
          this, _$identity);

  @override
  Map<String, dynamic> toJson() {
    return _$$AssignedServerImplToJson(
      this,
    );
  }
}

abstract class _AssignedServer implements AssignedServer {
  const factory _AssignedServer(
      {required final String name,
      required final String status}) = _$AssignedServerImpl;

  factory _AssignedServer.fromJson(Map<String, dynamic> json) =
      _$AssignedServerImpl.fromJson;

  @override
  String get name;
  @override
  String get status;
  @override
  @JsonKey(ignore: true)
  _$$AssignedServerImplCopyWith<_$AssignedServerImpl> get copyWith =>
      throw _privateConstructorUsedError;
}

OtpValidationData _$OtpValidationDataFromJson(Map<String, dynamic> json) {
  return _OtpValidationData.fromJson(json);
}

/// @nodoc
mixin _$OtpValidationData {
  String get status => throw _privateConstructorUsedError;
  String get sessionId => throw _privateConstructorUsedError;
  String? get customToken => throw _privateConstructorUsedError;
  bool get isPrimaryCustomer => throw _privateConstructorUsedError;

  Map<String, dynamic> toJson() => throw _privateConstructorUsedError;
  @JsonKey(ignore: true)
  $OtpValidationDataCopyWith<OtpValidationData> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $OtpValidationDataCopyWith<$Res> {
  factory $OtpValidationDataCopyWith(
          OtpValidationData value, $Res Function(OtpValidationData) then) =
      _$OtpValidationDataCopyWithImpl<$Res, OtpValidationData>;
  @useResult
  $Res call(
      {String status,
      String sessionId,
      String? customToken,
      bool isPrimaryCustomer});
}

/// @nodoc
class _$OtpValidationDataCopyWithImpl<$Res, $Val extends OtpValidationData>
    implements $OtpValidationDataCopyWith<$Res> {
  _$OtpValidationDataCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? status = null,
    Object? sessionId = null,
    Object? customToken = freezed,
    Object? isPrimaryCustomer = null,
  }) {
    return _then(_value.copyWith(
      status: null == status
          ? _value.status
          : status // ignore: cast_nullable_to_non_nullable
              as String,
      sessionId: null == sessionId
          ? _value.sessionId
          : sessionId // ignore: cast_nullable_to_non_nullable
              as String,
      customToken: freezed == customToken
          ? _value.customToken
          : customToken // ignore: cast_nullable_to_non_nullable
              as String?,
      isPrimaryCustomer: null == isPrimaryCustomer
          ? _value.isPrimaryCustomer
          : isPrimaryCustomer // ignore: cast_nullable_to_non_nullable
              as bool,
    ) as $Val);
  }
}

/// @nodoc
abstract class _$$OtpValidationDataImplCopyWith<$Res>
    implements $OtpValidationDataCopyWith<$Res> {
  factory _$$OtpValidationDataImplCopyWith(_$OtpValidationDataImpl value,
          $Res Function(_$OtpValidationDataImpl) then) =
      __$$OtpValidationDataImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call(
      {String status,
      String sessionId,
      String? customToken,
      bool isPrimaryCustomer});
}

/// @nodoc
class __$$OtpValidationDataImplCopyWithImpl<$Res>
    extends _$OtpValidationDataCopyWithImpl<$Res, _$OtpValidationDataImpl>
    implements _$$OtpValidationDataImplCopyWith<$Res> {
  __$$OtpValidationDataImplCopyWithImpl(_$OtpValidationDataImpl _value,
      $Res Function(_$OtpValidationDataImpl) _then)
      : super(_value, _then);

  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? status = null,
    Object? sessionId = null,
    Object? customToken = freezed,
    Object? isPrimaryCustomer = null,
  }) {
    return _then(_$OtpValidationDataImpl(
      status: null == status
          ? _value.status
          : status // ignore: cast_nullable_to_non_nullable
              as String,
      sessionId: null == sessionId
          ? _value.sessionId
          : sessionId // ignore: cast_nullable_to_non_nullable
              as String,
      customToken: freezed == customToken
          ? _value.customToken
          : customToken // ignore: cast_nullable_to_non_nullable
              as String?,
      isPrimaryCustomer: null == isPrimaryCustomer
          ? _value.isPrimaryCustomer
          : isPrimaryCustomer // ignore: cast_nullable_to_non_nullable
              as bool,
    ));
  }
}

/// @nodoc
@JsonSerializable()
class _$OtpValidationDataImpl implements _OtpValidationData {
  const _$OtpValidationDataImpl(
      {required this.status,
      required this.sessionId,
      this.customToken,
      this.isPrimaryCustomer = false});

  factory _$OtpValidationDataImpl.fromJson(Map<String, dynamic> json) =>
      _$$OtpValidationDataImplFromJson(json);

  @override
  final String status;
  @override
  final String sessionId;
  @override
  final String? customToken;
  @override
  @JsonKey()
  final bool isPrimaryCustomer;

  @override
  String toString() {
    return 'OtpValidationData(status: $status, sessionId: $sessionId, customToken: $customToken, isPrimaryCustomer: $isPrimaryCustomer)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$OtpValidationDataImpl &&
            (identical(other.status, status) || other.status == status) &&
            (identical(other.sessionId, sessionId) ||
                other.sessionId == sessionId) &&
            (identical(other.customToken, customToken) ||
                other.customToken == customToken) &&
            (identical(other.isPrimaryCustomer, isPrimaryCustomer) ||
                other.isPrimaryCustomer == isPrimaryCustomer));
  }

  @JsonKey(ignore: true)
  @override
  int get hashCode => Object.hash(
      runtimeType, status, sessionId, customToken, isPrimaryCustomer);

  @JsonKey(ignore: true)
  @override
  @pragma('vm:prefer-inline')
  _$$OtpValidationDataImplCopyWith<_$OtpValidationDataImpl> get copyWith =>
      __$$OtpValidationDataImplCopyWithImpl<_$OtpValidationDataImpl>(
          this, _$identity);

  @override
  Map<String, dynamic> toJson() {
    return _$$OtpValidationDataImplToJson(
      this,
    );
  }
}

abstract class _OtpValidationData implements OtpValidationData {
  const factory _OtpValidationData(
      {required final String status,
      required final String sessionId,
      final String? customToken,
      final bool isPrimaryCustomer}) = _$OtpValidationDataImpl;

  factory _OtpValidationData.fromJson(Map<String, dynamic> json) =
      _$OtpValidationDataImpl.fromJson;

  @override
  String get status;
  @override
  String get sessionId;
  @override
  String? get customToken;
  @override
  bool get isPrimaryCustomer;
  @override
  @JsonKey(ignore: true)
  _$$OtpValidationDataImplCopyWith<_$OtpValidationDataImpl> get copyWith =>
      throw _privateConstructorUsedError;
}

TableStatusData _$TableStatusDataFromJson(Map<String, dynamic> json) {
  return _TableStatusData.fromJson(json);
}

/// @nodoc
mixin _$TableStatusData {
  String get tableNumber => throw _privateConstructorUsedError;
  String get status => throw _privateConstructorUsedError;
  int? get capacity => throw _privateConstructorUsedError;
  PrimaryCustomer? get primaryCustomer => throw _privateConstructorUsedError;
  List<String> get occupiedBy => throw _privateConstructorUsedError;
  AssignedServer? get assignedServer => throw _privateConstructorUsedError;
  bool get hasActiveOTP => throw _privateConstructorUsedError;

  Map<String, dynamic> toJson() => throw _privateConstructorUsedError;
  @JsonKey(ignore: true)
  $TableStatusDataCopyWith<TableStatusData> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $TableStatusDataCopyWith<$Res> {
  factory $TableStatusDataCopyWith(
          TableStatusData value, $Res Function(TableStatusData) then) =
      _$TableStatusDataCopyWithImpl<$Res, TableStatusData>;
  @useResult
  $Res call(
      {String tableNumber,
      String status,
      int? capacity,
      PrimaryCustomer? primaryCustomer,
      List<String> occupiedBy,
      AssignedServer? assignedServer,
      bool hasActiveOTP});

  $PrimaryCustomerCopyWith<$Res>? get primaryCustomer;
  $AssignedServerCopyWith<$Res>? get assignedServer;
}

/// @nodoc
class _$TableStatusDataCopyWithImpl<$Res, $Val extends TableStatusData>
    implements $TableStatusDataCopyWith<$Res> {
  _$TableStatusDataCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? tableNumber = null,
    Object? status = null,
    Object? capacity = freezed,
    Object? primaryCustomer = freezed,
    Object? occupiedBy = null,
    Object? assignedServer = freezed,
    Object? hasActiveOTP = null,
  }) {
    return _then(_value.copyWith(
      tableNumber: null == tableNumber
          ? _value.tableNumber
          : tableNumber // ignore: cast_nullable_to_non_nullable
              as String,
      status: null == status
          ? _value.status
          : status // ignore: cast_nullable_to_non_nullable
              as String,
      capacity: freezed == capacity
          ? _value.capacity
          : capacity // ignore: cast_nullable_to_non_nullable
              as int?,
      primaryCustomer: freezed == primaryCustomer
          ? _value.primaryCustomer
          : primaryCustomer // ignore: cast_nullable_to_non_nullable
              as PrimaryCustomer?,
      occupiedBy: null == occupiedBy
          ? _value.occupiedBy
          : occupiedBy // ignore: cast_nullable_to_non_nullable
              as List<String>,
      assignedServer: freezed == assignedServer
          ? _value.assignedServer
          : assignedServer // ignore: cast_nullable_to_non_nullable
              as AssignedServer?,
      hasActiveOTP: null == hasActiveOTP
          ? _value.hasActiveOTP
          : hasActiveOTP // ignore: cast_nullable_to_non_nullable
              as bool,
    ) as $Val);
  }

  @override
  @pragma('vm:prefer-inline')
  $PrimaryCustomerCopyWith<$Res>? get primaryCustomer {
    if (_value.primaryCustomer == null) {
      return null;
    }

    return $PrimaryCustomerCopyWith<$Res>(_value.primaryCustomer!, (value) {
      return _then(_value.copyWith(primaryCustomer: value) as $Val);
    });
  }

  @override
  @pragma('vm:prefer-inline')
  $AssignedServerCopyWith<$Res>? get assignedServer {
    if (_value.assignedServer == null) {
      return null;
    }

    return $AssignedServerCopyWith<$Res>(_value.assignedServer!, (value) {
      return _then(_value.copyWith(assignedServer: value) as $Val);
    });
  }
}

/// @nodoc
abstract class _$$TableStatusDataImplCopyWith<$Res>
    implements $TableStatusDataCopyWith<$Res> {
  factory _$$TableStatusDataImplCopyWith(_$TableStatusDataImpl value,
          $Res Function(_$TableStatusDataImpl) then) =
      __$$TableStatusDataImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call(
      {String tableNumber,
      String status,
      int? capacity,
      PrimaryCustomer? primaryCustomer,
      List<String> occupiedBy,
      AssignedServer? assignedServer,
      bool hasActiveOTP});

  @override
  $PrimaryCustomerCopyWith<$Res>? get primaryCustomer;
  @override
  $AssignedServerCopyWith<$Res>? get assignedServer;
}

/// @nodoc
class __$$TableStatusDataImplCopyWithImpl<$Res>
    extends _$TableStatusDataCopyWithImpl<$Res, _$TableStatusDataImpl>
    implements _$$TableStatusDataImplCopyWith<$Res> {
  __$$TableStatusDataImplCopyWithImpl(
      _$TableStatusDataImpl _value, $Res Function(_$TableStatusDataImpl) _then)
      : super(_value, _then);

  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? tableNumber = null,
    Object? status = null,
    Object? capacity = freezed,
    Object? primaryCustomer = freezed,
    Object? occupiedBy = null,
    Object? assignedServer = freezed,
    Object? hasActiveOTP = null,
  }) {
    return _then(_$TableStatusDataImpl(
      tableNumber: null == tableNumber
          ? _value.tableNumber
          : tableNumber // ignore: cast_nullable_to_non_nullable
              as String,
      status: null == status
          ? _value.status
          : status // ignore: cast_nullable_to_non_nullable
              as String,
      capacity: freezed == capacity
          ? _value.capacity
          : capacity // ignore: cast_nullable_to_non_nullable
              as int?,
      primaryCustomer: freezed == primaryCustomer
          ? _value.primaryCustomer
          : primaryCustomer // ignore: cast_nullable_to_non_nullable
              as PrimaryCustomer?,
      occupiedBy: null == occupiedBy
          ? _value._occupiedBy
          : occupiedBy // ignore: cast_nullable_to_non_nullable
              as List<String>,
      assignedServer: freezed == assignedServer
          ? _value.assignedServer
          : assignedServer // ignore: cast_nullable_to_non_nullable
              as AssignedServer?,
      hasActiveOTP: null == hasActiveOTP
          ? _value.hasActiveOTP
          : hasActiveOTP // ignore: cast_nullable_to_non_nullable
              as bool,
    ));
  }
}

/// @nodoc
@JsonSerializable()
class _$TableStatusDataImpl implements _TableStatusData {
  const _$TableStatusDataImpl(
      {required this.tableNumber,
      required this.status,
      this.capacity,
      this.primaryCustomer,
      final List<String> occupiedBy = const [],
      this.assignedServer,
      this.hasActiveOTP = false})
      : _occupiedBy = occupiedBy;

  factory _$TableStatusDataImpl.fromJson(Map<String, dynamic> json) =>
      _$$TableStatusDataImplFromJson(json);

  @override
  final String tableNumber;
  @override
  final String status;
  @override
  final int? capacity;
  @override
  final PrimaryCustomer? primaryCustomer;
  final List<String> _occupiedBy;
  @override
  @JsonKey()
  List<String> get occupiedBy {
    if (_occupiedBy is EqualUnmodifiableListView) return _occupiedBy;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableListView(_occupiedBy);
  }

  @override
  final AssignedServer? assignedServer;
  @override
  @JsonKey()
  final bool hasActiveOTP;

  @override
  String toString() {
    return 'TableStatusData(tableNumber: $tableNumber, status: $status, capacity: $capacity, primaryCustomer: $primaryCustomer, occupiedBy: $occupiedBy, assignedServer: $assignedServer, hasActiveOTP: $hasActiveOTP)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$TableStatusDataImpl &&
            (identical(other.tableNumber, tableNumber) ||
                other.tableNumber == tableNumber) &&
            (identical(other.status, status) || other.status == status) &&
            (identical(other.capacity, capacity) ||
                other.capacity == capacity) &&
            (identical(other.primaryCustomer, primaryCustomer) ||
                other.primaryCustomer == primaryCustomer) &&
            const DeepCollectionEquality()
                .equals(other._occupiedBy, _occupiedBy) &&
            (identical(other.assignedServer, assignedServer) ||
                other.assignedServer == assignedServer) &&
            (identical(other.hasActiveOTP, hasActiveOTP) ||
                other.hasActiveOTP == hasActiveOTP));
  }

  @JsonKey(ignore: true)
  @override
  int get hashCode => Object.hash(
      runtimeType,
      tableNumber,
      status,
      capacity,
      primaryCustomer,
      const DeepCollectionEquality().hash(_occupiedBy),
      assignedServer,
      hasActiveOTP);

  @JsonKey(ignore: true)
  @override
  @pragma('vm:prefer-inline')
  _$$TableStatusDataImplCopyWith<_$TableStatusDataImpl> get copyWith =>
      __$$TableStatusDataImplCopyWithImpl<_$TableStatusDataImpl>(
          this, _$identity);

  @override
  Map<String, dynamic> toJson() {
    return _$$TableStatusDataImplToJson(
      this,
    );
  }
}

abstract class _TableStatusData implements TableStatusData {
  const factory _TableStatusData(
      {required final String tableNumber,
      required final String status,
      final int? capacity,
      final PrimaryCustomer? primaryCustomer,
      final List<String> occupiedBy,
      final AssignedServer? assignedServer,
      final bool hasActiveOTP}) = _$TableStatusDataImpl;

  factory _TableStatusData.fromJson(Map<String, dynamic> json) =
      _$TableStatusDataImpl.fromJson;

  @override
  String get tableNumber;
  @override
  String get status;
  @override
  int? get capacity;
  @override
  PrimaryCustomer? get primaryCustomer;
  @override
  List<String> get occupiedBy;
  @override
  AssignedServer? get assignedServer;
  @override
  bool get hasActiveOTP;
  @override
  @JsonKey(ignore: true)
  _$$TableStatusDataImplCopyWith<_$TableStatusDataImpl> get copyWith =>
      throw _privateConstructorUsedError;
}

TableListData _$TableListDataFromJson(Map<String, dynamic> json) {
  return _TableListData.fromJson(json);
}

/// @nodoc
mixin _$TableListData {
  String get restaurantId => throw _privateConstructorUsedError;
  int get count => throw _privateConstructorUsedError;
  List<TableListItem> get tables => throw _privateConstructorUsedError;

  Map<String, dynamic> toJson() => throw _privateConstructorUsedError;
  @JsonKey(ignore: true)
  $TableListDataCopyWith<TableListData> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $TableListDataCopyWith<$Res> {
  factory $TableListDataCopyWith(
          TableListData value, $Res Function(TableListData) then) =
      _$TableListDataCopyWithImpl<$Res, TableListData>;
  @useResult
  $Res call({String restaurantId, int count, List<TableListItem> tables});
}

/// @nodoc
class _$TableListDataCopyWithImpl<$Res, $Val extends TableListData>
    implements $TableListDataCopyWith<$Res> {
  _$TableListDataCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? restaurantId = null,
    Object? count = null,
    Object? tables = null,
  }) {
    return _then(_value.copyWith(
      restaurantId: null == restaurantId
          ? _value.restaurantId
          : restaurantId // ignore: cast_nullable_to_non_nullable
              as String,
      count: null == count
          ? _value.count
          : count // ignore: cast_nullable_to_non_nullable
              as int,
      tables: null == tables
          ? _value.tables
          : tables // ignore: cast_nullable_to_non_nullable
              as List<TableListItem>,
    ) as $Val);
  }
}

/// @nodoc
abstract class _$$TableListDataImplCopyWith<$Res>
    implements $TableListDataCopyWith<$Res> {
  factory _$$TableListDataImplCopyWith(
          _$TableListDataImpl value, $Res Function(_$TableListDataImpl) then) =
      __$$TableListDataImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call({String restaurantId, int count, List<TableListItem> tables});
}

/// @nodoc
class __$$TableListDataImplCopyWithImpl<$Res>
    extends _$TableListDataCopyWithImpl<$Res, _$TableListDataImpl>
    implements _$$TableListDataImplCopyWith<$Res> {
  __$$TableListDataImplCopyWithImpl(
      _$TableListDataImpl _value, $Res Function(_$TableListDataImpl) _then)
      : super(_value, _then);

  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? restaurantId = null,
    Object? count = null,
    Object? tables = null,
  }) {
    return _then(_$TableListDataImpl(
      restaurantId: null == restaurantId
          ? _value.restaurantId
          : restaurantId // ignore: cast_nullable_to_non_nullable
              as String,
      count: null == count
          ? _value.count
          : count // ignore: cast_nullable_to_non_nullable
              as int,
      tables: null == tables
          ? _value._tables
          : tables // ignore: cast_nullable_to_non_nullable
              as List<TableListItem>,
    ));
  }
}

/// @nodoc
@JsonSerializable()
class _$TableListDataImpl implements _TableListData {
  const _$TableListDataImpl(
      {required this.restaurantId,
      required this.count,
      final List<TableListItem> tables = const []})
      : _tables = tables;

  factory _$TableListDataImpl.fromJson(Map<String, dynamic> json) =>
      _$$TableListDataImplFromJson(json);

  @override
  final String restaurantId;
  @override
  final int count;
  final List<TableListItem> _tables;
  @override
  @JsonKey()
  List<TableListItem> get tables {
    if (_tables is EqualUnmodifiableListView) return _tables;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableListView(_tables);
  }

  @override
  String toString() {
    return 'TableListData(restaurantId: $restaurantId, count: $count, tables: $tables)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$TableListDataImpl &&
            (identical(other.restaurantId, restaurantId) ||
                other.restaurantId == restaurantId) &&
            (identical(other.count, count) || other.count == count) &&
            const DeepCollectionEquality().equals(other._tables, _tables));
  }

  @JsonKey(ignore: true)
  @override
  int get hashCode => Object.hash(runtimeType, restaurantId, count,
      const DeepCollectionEquality().hash(_tables));

  @JsonKey(ignore: true)
  @override
  @pragma('vm:prefer-inline')
  _$$TableListDataImplCopyWith<_$TableListDataImpl> get copyWith =>
      __$$TableListDataImplCopyWithImpl<_$TableListDataImpl>(this, _$identity);

  @override
  Map<String, dynamic> toJson() {
    return _$$TableListDataImplToJson(
      this,
    );
  }
}

abstract class _TableListData implements TableListData {
  const factory _TableListData(
      {required final String restaurantId,
      required final int count,
      final List<TableListItem> tables}) = _$TableListDataImpl;

  factory _TableListData.fromJson(Map<String, dynamic> json) =
      _$TableListDataImpl.fromJson;

  @override
  String get restaurantId;
  @override
  int get count;
  @override
  List<TableListItem> get tables;
  @override
  @JsonKey(ignore: true)
  _$$TableListDataImplCopyWith<_$TableListDataImpl> get copyWith =>
      throw _privateConstructorUsedError;
}

TableListItem _$TableListItemFromJson(Map<String, dynamic> json) {
  return _TableListItem.fromJson(json);
}

/// @nodoc
mixin _$TableListItem {
  String get id => throw _privateConstructorUsedError;
  String get number => throw _privateConstructorUsedError;
  String get status => throw _privateConstructorUsedError;
  int? get capacity => throw _privateConstructorUsedError;
  String? get assignedServerId => throw _privateConstructorUsedError;
  bool get isOccupied => throw _privateConstructorUsedError;
  PrimaryCustomer? get primaryCustomer => throw _privateConstructorUsedError;
  String? get lastActivity => throw _privateConstructorUsedError;
  String? get activeOrderId => throw _privateConstructorUsedError;
  String? get tableOtp => throw _privateConstructorUsedError;

  Map<String, dynamic> toJson() => throw _privateConstructorUsedError;
  @JsonKey(ignore: true)
  $TableListItemCopyWith<TableListItem> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $TableListItemCopyWith<$Res> {
  factory $TableListItemCopyWith(
          TableListItem value, $Res Function(TableListItem) then) =
      _$TableListItemCopyWithImpl<$Res, TableListItem>;
  @useResult
  $Res call(
      {String id,
      String number,
      String status,
      int? capacity,
      String? assignedServerId,
      bool isOccupied,
      PrimaryCustomer? primaryCustomer,
      String? lastActivity,
      String? activeOrderId,
      String? tableOtp});

  $PrimaryCustomerCopyWith<$Res>? get primaryCustomer;
}

/// @nodoc
class _$TableListItemCopyWithImpl<$Res, $Val extends TableListItem>
    implements $TableListItemCopyWith<$Res> {
  _$TableListItemCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? id = null,
    Object? number = null,
    Object? status = null,
    Object? capacity = freezed,
    Object? assignedServerId = freezed,
    Object? isOccupied = null,
    Object? primaryCustomer = freezed,
    Object? lastActivity = freezed,
    Object? activeOrderId = freezed,
    Object? tableOtp = freezed,
  }) {
    return _then(_value.copyWith(
      id: null == id
          ? _value.id
          : id // ignore: cast_nullable_to_non_nullable
              as String,
      number: null == number
          ? _value.number
          : number // ignore: cast_nullable_to_non_nullable
              as String,
      status: null == status
          ? _value.status
          : status // ignore: cast_nullable_to_non_nullable
              as String,
      capacity: freezed == capacity
          ? _value.capacity
          : capacity // ignore: cast_nullable_to_non_nullable
              as int?,
      assignedServerId: freezed == assignedServerId
          ? _value.assignedServerId
          : assignedServerId // ignore: cast_nullable_to_non_nullable
              as String?,
      isOccupied: null == isOccupied
          ? _value.isOccupied
          : isOccupied // ignore: cast_nullable_to_non_nullable
              as bool,
      primaryCustomer: freezed == primaryCustomer
          ? _value.primaryCustomer
          : primaryCustomer // ignore: cast_nullable_to_non_nullable
              as PrimaryCustomer?,
      lastActivity: freezed == lastActivity
          ? _value.lastActivity
          : lastActivity // ignore: cast_nullable_to_non_nullable
              as String?,
      activeOrderId: freezed == activeOrderId
          ? _value.activeOrderId
          : activeOrderId // ignore: cast_nullable_to_non_nullable
              as String?,
      tableOtp: freezed == tableOtp
          ? _value.tableOtp
          : tableOtp // ignore: cast_nullable_to_non_nullable
              as String?,
    ) as $Val);
  }

  @override
  @pragma('vm:prefer-inline')
  $PrimaryCustomerCopyWith<$Res>? get primaryCustomer {
    if (_value.primaryCustomer == null) {
      return null;
    }

    return $PrimaryCustomerCopyWith<$Res>(_value.primaryCustomer!, (value) {
      return _then(_value.copyWith(primaryCustomer: value) as $Val);
    });
  }
}

/// @nodoc
abstract class _$$TableListItemImplCopyWith<$Res>
    implements $TableListItemCopyWith<$Res> {
  factory _$$TableListItemImplCopyWith(
          _$TableListItemImpl value, $Res Function(_$TableListItemImpl) then) =
      __$$TableListItemImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call(
      {String id,
      String number,
      String status,
      int? capacity,
      String? assignedServerId,
      bool isOccupied,
      PrimaryCustomer? primaryCustomer,
      String? lastActivity,
      String? activeOrderId,
      String? tableOtp});

  @override
  $PrimaryCustomerCopyWith<$Res>? get primaryCustomer;
}

/// @nodoc
class __$$TableListItemImplCopyWithImpl<$Res>
    extends _$TableListItemCopyWithImpl<$Res, _$TableListItemImpl>
    implements _$$TableListItemImplCopyWith<$Res> {
  __$$TableListItemImplCopyWithImpl(
      _$TableListItemImpl _value, $Res Function(_$TableListItemImpl) _then)
      : super(_value, _then);

  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? id = null,
    Object? number = null,
    Object? status = null,
    Object? capacity = freezed,
    Object? assignedServerId = freezed,
    Object? isOccupied = null,
    Object? primaryCustomer = freezed,
    Object? lastActivity = freezed,
    Object? activeOrderId = freezed,
    Object? tableOtp = freezed,
  }) {
    return _then(_$TableListItemImpl(
      id: null == id
          ? _value.id
          : id // ignore: cast_nullable_to_non_nullable
              as String,
      number: null == number
          ? _value.number
          : number // ignore: cast_nullable_to_non_nullable
              as String,
      status: null == status
          ? _value.status
          : status // ignore: cast_nullable_to_non_nullable
              as String,
      capacity: freezed == capacity
          ? _value.capacity
          : capacity // ignore: cast_nullable_to_non_nullable
              as int?,
      assignedServerId: freezed == assignedServerId
          ? _value.assignedServerId
          : assignedServerId // ignore: cast_nullable_to_non_nullable
              as String?,
      isOccupied: null == isOccupied
          ? _value.isOccupied
          : isOccupied // ignore: cast_nullable_to_non_nullable
              as bool,
      primaryCustomer: freezed == primaryCustomer
          ? _value.primaryCustomer
          : primaryCustomer // ignore: cast_nullable_to_non_nullable
              as PrimaryCustomer?,
      lastActivity: freezed == lastActivity
          ? _value.lastActivity
          : lastActivity // ignore: cast_nullable_to_non_nullable
              as String?,
      activeOrderId: freezed == activeOrderId
          ? _value.activeOrderId
          : activeOrderId // ignore: cast_nullable_to_non_nullable
              as String?,
      tableOtp: freezed == tableOtp
          ? _value.tableOtp
          : tableOtp // ignore: cast_nullable_to_non_nullable
              as String?,
    ));
  }
}

/// @nodoc
@JsonSerializable()
class _$TableListItemImpl implements _TableListItem {
  const _$TableListItemImpl(
      {required this.id,
      required this.number,
      required this.status,
      this.capacity,
      this.assignedServerId,
      this.isOccupied = false,
      this.primaryCustomer,
      this.lastActivity,
      this.activeOrderId,
      this.tableOtp});

  factory _$TableListItemImpl.fromJson(Map<String, dynamic> json) =>
      _$$TableListItemImplFromJson(json);

  @override
  final String id;
  @override
  final String number;
  @override
  final String status;
  @override
  final int? capacity;
  @override
  final String? assignedServerId;
  @override
  @JsonKey()
  final bool isOccupied;
  @override
  final PrimaryCustomer? primaryCustomer;
  @override
  final String? lastActivity;
  @override
  final String? activeOrderId;
  @override
  final String? tableOtp;

  @override
  String toString() {
    return 'TableListItem(id: $id, number: $number, status: $status, capacity: $capacity, assignedServerId: $assignedServerId, isOccupied: $isOccupied, primaryCustomer: $primaryCustomer, lastActivity: $lastActivity, activeOrderId: $activeOrderId, tableOtp: $tableOtp)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$TableListItemImpl &&
            (identical(other.id, id) || other.id == id) &&
            (identical(other.number, number) || other.number == number) &&
            (identical(other.status, status) || other.status == status) &&
            (identical(other.capacity, capacity) ||
                other.capacity == capacity) &&
            (identical(other.assignedServerId, assignedServerId) ||
                other.assignedServerId == assignedServerId) &&
            (identical(other.isOccupied, isOccupied) ||
                other.isOccupied == isOccupied) &&
            (identical(other.primaryCustomer, primaryCustomer) ||
                other.primaryCustomer == primaryCustomer) &&
            (identical(other.lastActivity, lastActivity) ||
                other.lastActivity == lastActivity) &&
            (identical(other.activeOrderId, activeOrderId) ||
                other.activeOrderId == activeOrderId) &&
            (identical(other.tableOtp, tableOtp) ||
                other.tableOtp == tableOtp));
  }

  @JsonKey(ignore: true)
  @override
  int get hashCode => Object.hash(
      runtimeType,
      id,
      number,
      status,
      capacity,
      assignedServerId,
      isOccupied,
      primaryCustomer,
      lastActivity,
      activeOrderId,
      tableOtp);

  @JsonKey(ignore: true)
  @override
  @pragma('vm:prefer-inline')
  _$$TableListItemImplCopyWith<_$TableListItemImpl> get copyWith =>
      __$$TableListItemImplCopyWithImpl<_$TableListItemImpl>(this, _$identity);

  @override
  Map<String, dynamic> toJson() {
    return _$$TableListItemImplToJson(
      this,
    );
  }
}

abstract class _TableListItem implements TableListItem {
  const factory _TableListItem(
      {required final String id,
      required final String number,
      required final String status,
      final int? capacity,
      final String? assignedServerId,
      final bool isOccupied,
      final PrimaryCustomer? primaryCustomer,
      final String? lastActivity,
      final String? activeOrderId,
      final String? tableOtp}) = _$TableListItemImpl;

  factory _TableListItem.fromJson(Map<String, dynamic> json) =
      _$TableListItemImpl.fromJson;

  @override
  String get id;
  @override
  String get number;
  @override
  String get status;
  @override
  int? get capacity;
  @override
  String? get assignedServerId;
  @override
  bool get isOccupied;
  @override
  PrimaryCustomer? get primaryCustomer;
  @override
  String? get lastActivity;
  @override
  String? get activeOrderId;
  @override
  String? get tableOtp;
  @override
  @JsonKey(ignore: true)
  _$$TableListItemImplCopyWith<_$TableListItemImpl> get copyWith =>
      throw _privateConstructorUsedError;
}

TableDetailsData _$TableDetailsDataFromJson(Map<String, dynamic> json) {
  return _TableDetailsData.fromJson(json);
}

/// @nodoc
mixin _$TableDetailsData {
  String get id => throw _privateConstructorUsedError;
  String get number => throw _privateConstructorUsedError;
  String get status => throw _privateConstructorUsedError;
  RestaurantInfo get restaurant => throw _privateConstructorUsedError;
  int? get capacity => throw _privateConstructorUsedError;
  String? get section => throw _privateConstructorUsedError;
  String? get floor => throw _privateConstructorUsedError;
  AssignedServer? get assignedServer => throw _privateConstructorUsedError;
  bool get isOccupied => throw _privateConstructorUsedError;
  bool get hasActiveOTP => throw _privateConstructorUsedError;
  List<RecentOrder> get recentOrders => throw _privateConstructorUsedError;
  PrimaryCustomer? get primaryCustomer => throw _privateConstructorUsedError;
  List<String> get occupiedBy => throw _privateConstructorUsedError;
  String? get lastActivity => throw _privateConstructorUsedError;
  String? get activeOrderId => throw _privateConstructorUsedError;
  String? get otp => throw _privateConstructorUsedError;
  String? get otpGeneratedAt => throw _privateConstructorUsedError;
  Map<String, dynamic>? get reservationDetails =>
      throw _privateConstructorUsedError;

  Map<String, dynamic> toJson() => throw _privateConstructorUsedError;
  @JsonKey(ignore: true)
  $TableDetailsDataCopyWith<TableDetailsData> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $TableDetailsDataCopyWith<$Res> {
  factory $TableDetailsDataCopyWith(
          TableDetailsData value, $Res Function(TableDetailsData) then) =
      _$TableDetailsDataCopyWithImpl<$Res, TableDetailsData>;
  @useResult
  $Res call(
      {String id,
      String number,
      String status,
      RestaurantInfo restaurant,
      int? capacity,
      String? section,
      String? floor,
      AssignedServer? assignedServer,
      bool isOccupied,
      bool hasActiveOTP,
      List<RecentOrder> recentOrders,
      PrimaryCustomer? primaryCustomer,
      List<String> occupiedBy,
      String? lastActivity,
      String? activeOrderId,
      String? otp,
      String? otpGeneratedAt,
      Map<String, dynamic>? reservationDetails});

  $RestaurantInfoCopyWith<$Res> get restaurant;
  $AssignedServerCopyWith<$Res>? get assignedServer;
  $PrimaryCustomerCopyWith<$Res>? get primaryCustomer;
}

/// @nodoc
class _$TableDetailsDataCopyWithImpl<$Res, $Val extends TableDetailsData>
    implements $TableDetailsDataCopyWith<$Res> {
  _$TableDetailsDataCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? id = null,
    Object? number = null,
    Object? status = null,
    Object? restaurant = null,
    Object? capacity = freezed,
    Object? section = freezed,
    Object? floor = freezed,
    Object? assignedServer = freezed,
    Object? isOccupied = null,
    Object? hasActiveOTP = null,
    Object? recentOrders = null,
    Object? primaryCustomer = freezed,
    Object? occupiedBy = null,
    Object? lastActivity = freezed,
    Object? activeOrderId = freezed,
    Object? otp = freezed,
    Object? otpGeneratedAt = freezed,
    Object? reservationDetails = freezed,
  }) {
    return _then(_value.copyWith(
      id: null == id
          ? _value.id
          : id // ignore: cast_nullable_to_non_nullable
              as String,
      number: null == number
          ? _value.number
          : number // ignore: cast_nullable_to_non_nullable
              as String,
      status: null == status
          ? _value.status
          : status // ignore: cast_nullable_to_non_nullable
              as String,
      restaurant: null == restaurant
          ? _value.restaurant
          : restaurant // ignore: cast_nullable_to_non_nullable
              as RestaurantInfo,
      capacity: freezed == capacity
          ? _value.capacity
          : capacity // ignore: cast_nullable_to_non_nullable
              as int?,
      section: freezed == section
          ? _value.section
          : section // ignore: cast_nullable_to_non_nullable
              as String?,
      floor: freezed == floor
          ? _value.floor
          : floor // ignore: cast_nullable_to_non_nullable
              as String?,
      assignedServer: freezed == assignedServer
          ? _value.assignedServer
          : assignedServer // ignore: cast_nullable_to_non_nullable
              as AssignedServer?,
      isOccupied: null == isOccupied
          ? _value.isOccupied
          : isOccupied // ignore: cast_nullable_to_non_nullable
              as bool,
      hasActiveOTP: null == hasActiveOTP
          ? _value.hasActiveOTP
          : hasActiveOTP // ignore: cast_nullable_to_non_nullable
              as bool,
      recentOrders: null == recentOrders
          ? _value.recentOrders
          : recentOrders // ignore: cast_nullable_to_non_nullable
              as List<RecentOrder>,
      primaryCustomer: freezed == primaryCustomer
          ? _value.primaryCustomer
          : primaryCustomer // ignore: cast_nullable_to_non_nullable
              as PrimaryCustomer?,
      occupiedBy: null == occupiedBy
          ? _value.occupiedBy
          : occupiedBy // ignore: cast_nullable_to_non_nullable
              as List<String>,
      lastActivity: freezed == lastActivity
          ? _value.lastActivity
          : lastActivity // ignore: cast_nullable_to_non_nullable
              as String?,
      activeOrderId: freezed == activeOrderId
          ? _value.activeOrderId
          : activeOrderId // ignore: cast_nullable_to_non_nullable
              as String?,
      otp: freezed == otp
          ? _value.otp
          : otp // ignore: cast_nullable_to_non_nullable
              as String?,
      otpGeneratedAt: freezed == otpGeneratedAt
          ? _value.otpGeneratedAt
          : otpGeneratedAt // ignore: cast_nullable_to_non_nullable
              as String?,
      reservationDetails: freezed == reservationDetails
          ? _value.reservationDetails
          : reservationDetails // ignore: cast_nullable_to_non_nullable
              as Map<String, dynamic>?,
    ) as $Val);
  }

  @override
  @pragma('vm:prefer-inline')
  $RestaurantInfoCopyWith<$Res> get restaurant {
    return $RestaurantInfoCopyWith<$Res>(_value.restaurant, (value) {
      return _then(_value.copyWith(restaurant: value) as $Val);
    });
  }

  @override
  @pragma('vm:prefer-inline')
  $AssignedServerCopyWith<$Res>? get assignedServer {
    if (_value.assignedServer == null) {
      return null;
    }

    return $AssignedServerCopyWith<$Res>(_value.assignedServer!, (value) {
      return _then(_value.copyWith(assignedServer: value) as $Val);
    });
  }

  @override
  @pragma('vm:prefer-inline')
  $PrimaryCustomerCopyWith<$Res>? get primaryCustomer {
    if (_value.primaryCustomer == null) {
      return null;
    }

    return $PrimaryCustomerCopyWith<$Res>(_value.primaryCustomer!, (value) {
      return _then(_value.copyWith(primaryCustomer: value) as $Val);
    });
  }
}

/// @nodoc
abstract class _$$TableDetailsDataImplCopyWith<$Res>
    implements $TableDetailsDataCopyWith<$Res> {
  factory _$$TableDetailsDataImplCopyWith(_$TableDetailsDataImpl value,
          $Res Function(_$TableDetailsDataImpl) then) =
      __$$TableDetailsDataImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call(
      {String id,
      String number,
      String status,
      RestaurantInfo restaurant,
      int? capacity,
      String? section,
      String? floor,
      AssignedServer? assignedServer,
      bool isOccupied,
      bool hasActiveOTP,
      List<RecentOrder> recentOrders,
      PrimaryCustomer? primaryCustomer,
      List<String> occupiedBy,
      String? lastActivity,
      String? activeOrderId,
      String? otp,
      String? otpGeneratedAt,
      Map<String, dynamic>? reservationDetails});

  @override
  $RestaurantInfoCopyWith<$Res> get restaurant;
  @override
  $AssignedServerCopyWith<$Res>? get assignedServer;
  @override
  $PrimaryCustomerCopyWith<$Res>? get primaryCustomer;
}

/// @nodoc
class __$$TableDetailsDataImplCopyWithImpl<$Res>
    extends _$TableDetailsDataCopyWithImpl<$Res, _$TableDetailsDataImpl>
    implements _$$TableDetailsDataImplCopyWith<$Res> {
  __$$TableDetailsDataImplCopyWithImpl(_$TableDetailsDataImpl _value,
      $Res Function(_$TableDetailsDataImpl) _then)
      : super(_value, _then);

  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? id = null,
    Object? number = null,
    Object? status = null,
    Object? restaurant = null,
    Object? capacity = freezed,
    Object? section = freezed,
    Object? floor = freezed,
    Object? assignedServer = freezed,
    Object? isOccupied = null,
    Object? hasActiveOTP = null,
    Object? recentOrders = null,
    Object? primaryCustomer = freezed,
    Object? occupiedBy = null,
    Object? lastActivity = freezed,
    Object? activeOrderId = freezed,
    Object? otp = freezed,
    Object? otpGeneratedAt = freezed,
    Object? reservationDetails = freezed,
  }) {
    return _then(_$TableDetailsDataImpl(
      id: null == id
          ? _value.id
          : id // ignore: cast_nullable_to_non_nullable
              as String,
      number: null == number
          ? _value.number
          : number // ignore: cast_nullable_to_non_nullable
              as String,
      status: null == status
          ? _value.status
          : status // ignore: cast_nullable_to_non_nullable
              as String,
      restaurant: null == restaurant
          ? _value.restaurant
          : restaurant // ignore: cast_nullable_to_non_nullable
              as RestaurantInfo,
      capacity: freezed == capacity
          ? _value.capacity
          : capacity // ignore: cast_nullable_to_non_nullable
              as int?,
      section: freezed == section
          ? _value.section
          : section // ignore: cast_nullable_to_non_nullable
              as String?,
      floor: freezed == floor
          ? _value.floor
          : floor // ignore: cast_nullable_to_non_nullable
              as String?,
      assignedServer: freezed == assignedServer
          ? _value.assignedServer
          : assignedServer // ignore: cast_nullable_to_non_nullable
              as AssignedServer?,
      isOccupied: null == isOccupied
          ? _value.isOccupied
          : isOccupied // ignore: cast_nullable_to_non_nullable
              as bool,
      hasActiveOTP: null == hasActiveOTP
          ? _value.hasActiveOTP
          : hasActiveOTP // ignore: cast_nullable_to_non_nullable
              as bool,
      recentOrders: null == recentOrders
          ? _value._recentOrders
          : recentOrders // ignore: cast_nullable_to_non_nullable
              as List<RecentOrder>,
      primaryCustomer: freezed == primaryCustomer
          ? _value.primaryCustomer
          : primaryCustomer // ignore: cast_nullable_to_non_nullable
              as PrimaryCustomer?,
      occupiedBy: null == occupiedBy
          ? _value._occupiedBy
          : occupiedBy // ignore: cast_nullable_to_non_nullable
              as List<String>,
      lastActivity: freezed == lastActivity
          ? _value.lastActivity
          : lastActivity // ignore: cast_nullable_to_non_nullable
              as String?,
      activeOrderId: freezed == activeOrderId
          ? _value.activeOrderId
          : activeOrderId // ignore: cast_nullable_to_non_nullable
              as String?,
      otp: freezed == otp
          ? _value.otp
          : otp // ignore: cast_nullable_to_non_nullable
              as String?,
      otpGeneratedAt: freezed == otpGeneratedAt
          ? _value.otpGeneratedAt
          : otpGeneratedAt // ignore: cast_nullable_to_non_nullable
              as String?,
      reservationDetails: freezed == reservationDetails
          ? _value._reservationDetails
          : reservationDetails // ignore: cast_nullable_to_non_nullable
              as Map<String, dynamic>?,
    ));
  }
}

/// @nodoc
@JsonSerializable()
class _$TableDetailsDataImpl implements _TableDetailsData {
  const _$TableDetailsDataImpl(
      {required this.id,
      required this.number,
      required this.status,
      required this.restaurant,
      this.capacity,
      this.section,
      this.floor,
      this.assignedServer,
      this.isOccupied = false,
      this.hasActiveOTP = false,
      final List<RecentOrder> recentOrders = const [],
      this.primaryCustomer,
      final List<String> occupiedBy = const [],
      this.lastActivity,
      this.activeOrderId,
      this.otp,
      this.otpGeneratedAt,
      final Map<String, dynamic>? reservationDetails})
      : _recentOrders = recentOrders,
        _occupiedBy = occupiedBy,
        _reservationDetails = reservationDetails;

  factory _$TableDetailsDataImpl.fromJson(Map<String, dynamic> json) =>
      _$$TableDetailsDataImplFromJson(json);

  @override
  final String id;
  @override
  final String number;
  @override
  final String status;
  @override
  final RestaurantInfo restaurant;
  @override
  final int? capacity;
  @override
  final String? section;
  @override
  final String? floor;
  @override
  final AssignedServer? assignedServer;
  @override
  @JsonKey()
  final bool isOccupied;
  @override
  @JsonKey()
  final bool hasActiveOTP;
  final List<RecentOrder> _recentOrders;
  @override
  @JsonKey()
  List<RecentOrder> get recentOrders {
    if (_recentOrders is EqualUnmodifiableListView) return _recentOrders;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableListView(_recentOrders);
  }

  @override
  final PrimaryCustomer? primaryCustomer;
  final List<String> _occupiedBy;
  @override
  @JsonKey()
  List<String> get occupiedBy {
    if (_occupiedBy is EqualUnmodifiableListView) return _occupiedBy;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableListView(_occupiedBy);
  }

  @override
  final String? lastActivity;
  @override
  final String? activeOrderId;
  @override
  final String? otp;
  @override
  final String? otpGeneratedAt;
  final Map<String, dynamic>? _reservationDetails;
  @override
  Map<String, dynamic>? get reservationDetails {
    final value = _reservationDetails;
    if (value == null) return null;
    if (_reservationDetails is EqualUnmodifiableMapView)
      return _reservationDetails;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableMapView(value);
  }

  @override
  String toString() {
    return 'TableDetailsData(id: $id, number: $number, status: $status, restaurant: $restaurant, capacity: $capacity, section: $section, floor: $floor, assignedServer: $assignedServer, isOccupied: $isOccupied, hasActiveOTP: $hasActiveOTP, recentOrders: $recentOrders, primaryCustomer: $primaryCustomer, occupiedBy: $occupiedBy, lastActivity: $lastActivity, activeOrderId: $activeOrderId, otp: $otp, otpGeneratedAt: $otpGeneratedAt, reservationDetails: $reservationDetails)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$TableDetailsDataImpl &&
            (identical(other.id, id) || other.id == id) &&
            (identical(other.number, number) || other.number == number) &&
            (identical(other.status, status) || other.status == status) &&
            (identical(other.restaurant, restaurant) ||
                other.restaurant == restaurant) &&
            (identical(other.capacity, capacity) ||
                other.capacity == capacity) &&
            (identical(other.section, section) || other.section == section) &&
            (identical(other.floor, floor) || other.floor == floor) &&
            (identical(other.assignedServer, assignedServer) ||
                other.assignedServer == assignedServer) &&
            (identical(other.isOccupied, isOccupied) ||
                other.isOccupied == isOccupied) &&
            (identical(other.hasActiveOTP, hasActiveOTP) ||
                other.hasActiveOTP == hasActiveOTP) &&
            const DeepCollectionEquality()
                .equals(other._recentOrders, _recentOrders) &&
            (identical(other.primaryCustomer, primaryCustomer) ||
                other.primaryCustomer == primaryCustomer) &&
            const DeepCollectionEquality()
                .equals(other._occupiedBy, _occupiedBy) &&
            (identical(other.lastActivity, lastActivity) ||
                other.lastActivity == lastActivity) &&
            (identical(other.activeOrderId, activeOrderId) ||
                other.activeOrderId == activeOrderId) &&
            (identical(other.otp, otp) || other.otp == otp) &&
            (identical(other.otpGeneratedAt, otpGeneratedAt) ||
                other.otpGeneratedAt == otpGeneratedAt) &&
            const DeepCollectionEquality()
                .equals(other._reservationDetails, _reservationDetails));
  }

  @JsonKey(ignore: true)
  @override
  int get hashCode => Object.hash(
      runtimeType,
      id,
      number,
      status,
      restaurant,
      capacity,
      section,
      floor,
      assignedServer,
      isOccupied,
      hasActiveOTP,
      const DeepCollectionEquality().hash(_recentOrders),
      primaryCustomer,
      const DeepCollectionEquality().hash(_occupiedBy),
      lastActivity,
      activeOrderId,
      otp,
      otpGeneratedAt,
      const DeepCollectionEquality().hash(_reservationDetails));

  @JsonKey(ignore: true)
  @override
  @pragma('vm:prefer-inline')
  _$$TableDetailsDataImplCopyWith<_$TableDetailsDataImpl> get copyWith =>
      __$$TableDetailsDataImplCopyWithImpl<_$TableDetailsDataImpl>(
          this, _$identity);

  @override
  Map<String, dynamic> toJson() {
    return _$$TableDetailsDataImplToJson(
      this,
    );
  }
}

abstract class _TableDetailsData implements TableDetailsData {
  const factory _TableDetailsData(
      {required final String id,
      required final String number,
      required final String status,
      required final RestaurantInfo restaurant,
      final int? capacity,
      final String? section,
      final String? floor,
      final AssignedServer? assignedServer,
      final bool isOccupied,
      final bool hasActiveOTP,
      final List<RecentOrder> recentOrders,
      final PrimaryCustomer? primaryCustomer,
      final List<String> occupiedBy,
      final String? lastActivity,
      final String? activeOrderId,
      final String? otp,
      final String? otpGeneratedAt,
      final Map<String, dynamic>? reservationDetails}) = _$TableDetailsDataImpl;

  factory _TableDetailsData.fromJson(Map<String, dynamic> json) =
      _$TableDetailsDataImpl.fromJson;

  @override
  String get id;
  @override
  String get number;
  @override
  String get status;
  @override
  RestaurantInfo get restaurant;
  @override
  int? get capacity;
  @override
  String? get section;
  @override
  String? get floor;
  @override
  AssignedServer? get assignedServer;
  @override
  bool get isOccupied;
  @override
  bool get hasActiveOTP;
  @override
  List<RecentOrder> get recentOrders;
  @override
  PrimaryCustomer? get primaryCustomer;
  @override
  List<String> get occupiedBy;
  @override
  String? get lastActivity;
  @override
  String? get activeOrderId;
  @override
  String? get otp;
  @override
  String? get otpGeneratedAt;
  @override
  Map<String, dynamic>? get reservationDetails;
  @override
  @JsonKey(ignore: true)
  _$$TableDetailsDataImplCopyWith<_$TableDetailsDataImpl> get copyWith =>
      throw _privateConstructorUsedError;
}

RecentOrder _$RecentOrderFromJson(Map<String, dynamic> json) {
  return _RecentOrder.fromJson(json);
}

/// @nodoc
mixin _$RecentOrder {
  String get id => throw _privateConstructorUsedError;
  String get status => throw _privateConstructorUsedError;
  String get createdAt => throw _privateConstructorUsedError;
  double get totalAmount => throw _privateConstructorUsedError;
  int get itemCount => throw _privateConstructorUsedError;

  Map<String, dynamic> toJson() => throw _privateConstructorUsedError;
  @JsonKey(ignore: true)
  $RecentOrderCopyWith<RecentOrder> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $RecentOrderCopyWith<$Res> {
  factory $RecentOrderCopyWith(
          RecentOrder value, $Res Function(RecentOrder) then) =
      _$RecentOrderCopyWithImpl<$Res, RecentOrder>;
  @useResult
  $Res call(
      {String id,
      String status,
      String createdAt,
      double totalAmount,
      int itemCount});
}

/// @nodoc
class _$RecentOrderCopyWithImpl<$Res, $Val extends RecentOrder>
    implements $RecentOrderCopyWith<$Res> {
  _$RecentOrderCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? id = null,
    Object? status = null,
    Object? createdAt = null,
    Object? totalAmount = null,
    Object? itemCount = null,
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
      createdAt: null == createdAt
          ? _value.createdAt
          : createdAt // ignore: cast_nullable_to_non_nullable
              as String,
      totalAmount: null == totalAmount
          ? _value.totalAmount
          : totalAmount // ignore: cast_nullable_to_non_nullable
              as double,
      itemCount: null == itemCount
          ? _value.itemCount
          : itemCount // ignore: cast_nullable_to_non_nullable
              as int,
    ) as $Val);
  }
}

/// @nodoc
abstract class _$$RecentOrderImplCopyWith<$Res>
    implements $RecentOrderCopyWith<$Res> {
  factory _$$RecentOrderImplCopyWith(
          _$RecentOrderImpl value, $Res Function(_$RecentOrderImpl) then) =
      __$$RecentOrderImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call(
      {String id,
      String status,
      String createdAt,
      double totalAmount,
      int itemCount});
}

/// @nodoc
class __$$RecentOrderImplCopyWithImpl<$Res>
    extends _$RecentOrderCopyWithImpl<$Res, _$RecentOrderImpl>
    implements _$$RecentOrderImplCopyWith<$Res> {
  __$$RecentOrderImplCopyWithImpl(
      _$RecentOrderImpl _value, $Res Function(_$RecentOrderImpl) _then)
      : super(_value, _then);

  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? id = null,
    Object? status = null,
    Object? createdAt = null,
    Object? totalAmount = null,
    Object? itemCount = null,
  }) {
    return _then(_$RecentOrderImpl(
      id: null == id
          ? _value.id
          : id // ignore: cast_nullable_to_non_nullable
              as String,
      status: null == status
          ? _value.status
          : status // ignore: cast_nullable_to_non_nullable
              as String,
      createdAt: null == createdAt
          ? _value.createdAt
          : createdAt // ignore: cast_nullable_to_non_nullable
              as String,
      totalAmount: null == totalAmount
          ? _value.totalAmount
          : totalAmount // ignore: cast_nullable_to_non_nullable
              as double,
      itemCount: null == itemCount
          ? _value.itemCount
          : itemCount // ignore: cast_nullable_to_non_nullable
              as int,
    ));
  }
}

/// @nodoc
@JsonSerializable()
class _$RecentOrderImpl implements _RecentOrder {
  const _$RecentOrderImpl(
      {required this.id,
      required this.status,
      required this.createdAt,
      required this.totalAmount,
      required this.itemCount});

  factory _$RecentOrderImpl.fromJson(Map<String, dynamic> json) =>
      _$$RecentOrderImplFromJson(json);

  @override
  final String id;
  @override
  final String status;
  @override
  final String createdAt;
  @override
  final double totalAmount;
  @override
  final int itemCount;

  @override
  String toString() {
    return 'RecentOrder(id: $id, status: $status, createdAt: $createdAt, totalAmount: $totalAmount, itemCount: $itemCount)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$RecentOrderImpl &&
            (identical(other.id, id) || other.id == id) &&
            (identical(other.status, status) || other.status == status) &&
            (identical(other.createdAt, createdAt) ||
                other.createdAt == createdAt) &&
            (identical(other.totalAmount, totalAmount) ||
                other.totalAmount == totalAmount) &&
            (identical(other.itemCount, itemCount) ||
                other.itemCount == itemCount));
  }

  @JsonKey(ignore: true)
  @override
  int get hashCode =>
      Object.hash(runtimeType, id, status, createdAt, totalAmount, itemCount);

  @JsonKey(ignore: true)
  @override
  @pragma('vm:prefer-inline')
  _$$RecentOrderImplCopyWith<_$RecentOrderImpl> get copyWith =>
      __$$RecentOrderImplCopyWithImpl<_$RecentOrderImpl>(this, _$identity);

  @override
  Map<String, dynamic> toJson() {
    return _$$RecentOrderImplToJson(
      this,
    );
  }
}

abstract class _RecentOrder implements RecentOrder {
  const factory _RecentOrder(
      {required final String id,
      required final String status,
      required final String createdAt,
      required final double totalAmount,
      required final int itemCount}) = _$RecentOrderImpl;

  factory _RecentOrder.fromJson(Map<String, dynamic> json) =
      _$RecentOrderImpl.fromJson;

  @override
  String get id;
  @override
  String get status;
  @override
  String get createdAt;
  @override
  double get totalAmount;
  @override
  int get itemCount;
  @override
  @JsonKey(ignore: true)
  _$$RecentOrderImplCopyWith<_$RecentOrderImpl> get copyWith =>
      throw _privateConstructorUsedError;
}

TableAssignmentData _$TableAssignmentDataFromJson(Map<String, dynamic> json) {
  return _TableAssignmentData.fromJson(json);
}

/// @nodoc
mixin _$TableAssignmentData {
  String get tableId => throw _privateConstructorUsedError;
  String get serverId => throw _privateConstructorUsedError;
  String get serverName => throw _privateConstructorUsedError;
  String get tableNumber => throw _privateConstructorUsedError;

  Map<String, dynamic> toJson() => throw _privateConstructorUsedError;
  @JsonKey(ignore: true)
  $TableAssignmentDataCopyWith<TableAssignmentData> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $TableAssignmentDataCopyWith<$Res> {
  factory $TableAssignmentDataCopyWith(
          TableAssignmentData value, $Res Function(TableAssignmentData) then) =
      _$TableAssignmentDataCopyWithImpl<$Res, TableAssignmentData>;
  @useResult
  $Res call(
      {String tableId, String serverId, String serverName, String tableNumber});
}

/// @nodoc
class _$TableAssignmentDataCopyWithImpl<$Res, $Val extends TableAssignmentData>
    implements $TableAssignmentDataCopyWith<$Res> {
  _$TableAssignmentDataCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? tableId = null,
    Object? serverId = null,
    Object? serverName = null,
    Object? tableNumber = null,
  }) {
    return _then(_value.copyWith(
      tableId: null == tableId
          ? _value.tableId
          : tableId // ignore: cast_nullable_to_non_nullable
              as String,
      serverId: null == serverId
          ? _value.serverId
          : serverId // ignore: cast_nullable_to_non_nullable
              as String,
      serverName: null == serverName
          ? _value.serverName
          : serverName // ignore: cast_nullable_to_non_nullable
              as String,
      tableNumber: null == tableNumber
          ? _value.tableNumber
          : tableNumber // ignore: cast_nullable_to_non_nullable
              as String,
    ) as $Val);
  }
}

/// @nodoc
abstract class _$$TableAssignmentDataImplCopyWith<$Res>
    implements $TableAssignmentDataCopyWith<$Res> {
  factory _$$TableAssignmentDataImplCopyWith(_$TableAssignmentDataImpl value,
          $Res Function(_$TableAssignmentDataImpl) then) =
      __$$TableAssignmentDataImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call(
      {String tableId, String serverId, String serverName, String tableNumber});
}

/// @nodoc
class __$$TableAssignmentDataImplCopyWithImpl<$Res>
    extends _$TableAssignmentDataCopyWithImpl<$Res, _$TableAssignmentDataImpl>
    implements _$$TableAssignmentDataImplCopyWith<$Res> {
  __$$TableAssignmentDataImplCopyWithImpl(_$TableAssignmentDataImpl _value,
      $Res Function(_$TableAssignmentDataImpl) _then)
      : super(_value, _then);

  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? tableId = null,
    Object? serverId = null,
    Object? serverName = null,
    Object? tableNumber = null,
  }) {
    return _then(_$TableAssignmentDataImpl(
      tableId: null == tableId
          ? _value.tableId
          : tableId // ignore: cast_nullable_to_non_nullable
              as String,
      serverId: null == serverId
          ? _value.serverId
          : serverId // ignore: cast_nullable_to_non_nullable
              as String,
      serverName: null == serverName
          ? _value.serverName
          : serverName // ignore: cast_nullable_to_non_nullable
              as String,
      tableNumber: null == tableNumber
          ? _value.tableNumber
          : tableNumber // ignore: cast_nullable_to_non_nullable
              as String,
    ));
  }
}

/// @nodoc
@JsonSerializable()
class _$TableAssignmentDataImpl implements _TableAssignmentData {
  const _$TableAssignmentDataImpl(
      {required this.tableId,
      required this.serverId,
      required this.serverName,
      required this.tableNumber});

  factory _$TableAssignmentDataImpl.fromJson(Map<String, dynamic> json) =>
      _$$TableAssignmentDataImplFromJson(json);

  @override
  final String tableId;
  @override
  final String serverId;
  @override
  final String serverName;
  @override
  final String tableNumber;

  @override
  String toString() {
    return 'TableAssignmentData(tableId: $tableId, serverId: $serverId, serverName: $serverName, tableNumber: $tableNumber)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$TableAssignmentDataImpl &&
            (identical(other.tableId, tableId) || other.tableId == tableId) &&
            (identical(other.serverId, serverId) ||
                other.serverId == serverId) &&
            (identical(other.serverName, serverName) ||
                other.serverName == serverName) &&
            (identical(other.tableNumber, tableNumber) ||
                other.tableNumber == tableNumber));
  }

  @JsonKey(ignore: true)
  @override
  int get hashCode =>
      Object.hash(runtimeType, tableId, serverId, serverName, tableNumber);

  @JsonKey(ignore: true)
  @override
  @pragma('vm:prefer-inline')
  _$$TableAssignmentDataImplCopyWith<_$TableAssignmentDataImpl> get copyWith =>
      __$$TableAssignmentDataImplCopyWithImpl<_$TableAssignmentDataImpl>(
          this, _$identity);

  @override
  Map<String, dynamic> toJson() {
    return _$$TableAssignmentDataImplToJson(
      this,
    );
  }
}

abstract class _TableAssignmentData implements TableAssignmentData {
  const factory _TableAssignmentData(
      {required final String tableId,
      required final String serverId,
      required final String serverName,
      required final String tableNumber}) = _$TableAssignmentDataImpl;

  factory _TableAssignmentData.fromJson(Map<String, dynamic> json) =
      _$TableAssignmentDataImpl.fromJson;

  @override
  String get tableId;
  @override
  String get serverId;
  @override
  String get serverName;
  @override
  String get tableNumber;
  @override
  @JsonKey(ignore: true)
  _$$TableAssignmentDataImplCopyWith<_$TableAssignmentDataImpl> get copyWith =>
      throw _privateConstructorUsedError;
}

TableUnassignmentData _$TableUnassignmentDataFromJson(
    Map<String, dynamic> json) {
  return _TableUnassignmentData.fromJson(json);
}

/// @nodoc
mixin _$TableUnassignmentData {
  String get tableId => throw _privateConstructorUsedError;
  String get tableNumber => throw _privateConstructorUsedError;
  String? get previousServerId => throw _privateConstructorUsedError;
  String? get previousServerName => throw _privateConstructorUsedError;

  Map<String, dynamic> toJson() => throw _privateConstructorUsedError;
  @JsonKey(ignore: true)
  $TableUnassignmentDataCopyWith<TableUnassignmentData> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $TableUnassignmentDataCopyWith<$Res> {
  factory $TableUnassignmentDataCopyWith(TableUnassignmentData value,
          $Res Function(TableUnassignmentData) then) =
      _$TableUnassignmentDataCopyWithImpl<$Res, TableUnassignmentData>;
  @useResult
  $Res call(
      {String tableId,
      String tableNumber,
      String? previousServerId,
      String? previousServerName});
}

/// @nodoc
class _$TableUnassignmentDataCopyWithImpl<$Res,
        $Val extends TableUnassignmentData>
    implements $TableUnassignmentDataCopyWith<$Res> {
  _$TableUnassignmentDataCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? tableId = null,
    Object? tableNumber = null,
    Object? previousServerId = freezed,
    Object? previousServerName = freezed,
  }) {
    return _then(_value.copyWith(
      tableId: null == tableId
          ? _value.tableId
          : tableId // ignore: cast_nullable_to_non_nullable
              as String,
      tableNumber: null == tableNumber
          ? _value.tableNumber
          : tableNumber // ignore: cast_nullable_to_non_nullable
              as String,
      previousServerId: freezed == previousServerId
          ? _value.previousServerId
          : previousServerId // ignore: cast_nullable_to_non_nullable
              as String?,
      previousServerName: freezed == previousServerName
          ? _value.previousServerName
          : previousServerName // ignore: cast_nullable_to_non_nullable
              as String?,
    ) as $Val);
  }
}

/// @nodoc
abstract class _$$TableUnassignmentDataImplCopyWith<$Res>
    implements $TableUnassignmentDataCopyWith<$Res> {
  factory _$$TableUnassignmentDataImplCopyWith(
          _$TableUnassignmentDataImpl value,
          $Res Function(_$TableUnassignmentDataImpl) then) =
      __$$TableUnassignmentDataImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call(
      {String tableId,
      String tableNumber,
      String? previousServerId,
      String? previousServerName});
}

/// @nodoc
class __$$TableUnassignmentDataImplCopyWithImpl<$Res>
    extends _$TableUnassignmentDataCopyWithImpl<$Res,
        _$TableUnassignmentDataImpl>
    implements _$$TableUnassignmentDataImplCopyWith<$Res> {
  __$$TableUnassignmentDataImplCopyWithImpl(_$TableUnassignmentDataImpl _value,
      $Res Function(_$TableUnassignmentDataImpl) _then)
      : super(_value, _then);

  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? tableId = null,
    Object? tableNumber = null,
    Object? previousServerId = freezed,
    Object? previousServerName = freezed,
  }) {
    return _then(_$TableUnassignmentDataImpl(
      tableId: null == tableId
          ? _value.tableId
          : tableId // ignore: cast_nullable_to_non_nullable
              as String,
      tableNumber: null == tableNumber
          ? _value.tableNumber
          : tableNumber // ignore: cast_nullable_to_non_nullable
              as String,
      previousServerId: freezed == previousServerId
          ? _value.previousServerId
          : previousServerId // ignore: cast_nullable_to_non_nullable
              as String?,
      previousServerName: freezed == previousServerName
          ? _value.previousServerName
          : previousServerName // ignore: cast_nullable_to_non_nullable
              as String?,
    ));
  }
}

/// @nodoc
@JsonSerializable()
class _$TableUnassignmentDataImpl implements _TableUnassignmentData {
  const _$TableUnassignmentDataImpl(
      {required this.tableId,
      required this.tableNumber,
      this.previousServerId,
      this.previousServerName});

  factory _$TableUnassignmentDataImpl.fromJson(Map<String, dynamic> json) =>
      _$$TableUnassignmentDataImplFromJson(json);

  @override
  final String tableId;
  @override
  final String tableNumber;
  @override
  final String? previousServerId;
  @override
  final String? previousServerName;

  @override
  String toString() {
    return 'TableUnassignmentData(tableId: $tableId, tableNumber: $tableNumber, previousServerId: $previousServerId, previousServerName: $previousServerName)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$TableUnassignmentDataImpl &&
            (identical(other.tableId, tableId) || other.tableId == tableId) &&
            (identical(other.tableNumber, tableNumber) ||
                other.tableNumber == tableNumber) &&
            (identical(other.previousServerId, previousServerId) ||
                other.previousServerId == previousServerId) &&
            (identical(other.previousServerName, previousServerName) ||
                other.previousServerName == previousServerName));
  }

  @JsonKey(ignore: true)
  @override
  int get hashCode => Object.hash(
      runtimeType, tableId, tableNumber, previousServerId, previousServerName);

  @JsonKey(ignore: true)
  @override
  @pragma('vm:prefer-inline')
  _$$TableUnassignmentDataImplCopyWith<_$TableUnassignmentDataImpl>
      get copyWith => __$$TableUnassignmentDataImplCopyWithImpl<
          _$TableUnassignmentDataImpl>(this, _$identity);

  @override
  Map<String, dynamic> toJson() {
    return _$$TableUnassignmentDataImplToJson(
      this,
    );
  }
}

abstract class _TableUnassignmentData implements TableUnassignmentData {
  const factory _TableUnassignmentData(
      {required final String tableId,
      required final String tableNumber,
      final String? previousServerId,
      final String? previousServerName}) = _$TableUnassignmentDataImpl;

  factory _TableUnassignmentData.fromJson(Map<String, dynamic> json) =
      _$TableUnassignmentDataImpl.fromJson;

  @override
  String get tableId;
  @override
  String get tableNumber;
  @override
  String? get previousServerId;
  @override
  String? get previousServerName;
  @override
  @JsonKey(ignore: true)
  _$$TableUnassignmentDataImplCopyWith<_$TableUnassignmentDataImpl>
      get copyWith => throw _privateConstructorUsedError;
}

TableOtpData _$TableOtpDataFromJson(Map<String, dynamic> json) {
  return _TableOtpData.fromJson(json);
}

/// @nodoc
mixin _$TableOtpData {
  String get tableId => throw _privateConstructorUsedError;
  String get tableNumber => throw _privateConstructorUsedError;
  String get otp => throw _privateConstructorUsedError;
  String get otpGeneratedAt => throw _privateConstructorUsedError;
  String get otpExpiresAt => throw _privateConstructorUsedError;

  Map<String, dynamic> toJson() => throw _privateConstructorUsedError;
  @JsonKey(ignore: true)
  $TableOtpDataCopyWith<TableOtpData> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $TableOtpDataCopyWith<$Res> {
  factory $TableOtpDataCopyWith(
          TableOtpData value, $Res Function(TableOtpData) then) =
      _$TableOtpDataCopyWithImpl<$Res, TableOtpData>;
  @useResult
  $Res call(
      {String tableId,
      String tableNumber,
      String otp,
      String otpGeneratedAt,
      String otpExpiresAt});
}

/// @nodoc
class _$TableOtpDataCopyWithImpl<$Res, $Val extends TableOtpData>
    implements $TableOtpDataCopyWith<$Res> {
  _$TableOtpDataCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? tableId = null,
    Object? tableNumber = null,
    Object? otp = null,
    Object? otpGeneratedAt = null,
    Object? otpExpiresAt = null,
  }) {
    return _then(_value.copyWith(
      tableId: null == tableId
          ? _value.tableId
          : tableId // ignore: cast_nullable_to_non_nullable
              as String,
      tableNumber: null == tableNumber
          ? _value.tableNumber
          : tableNumber // ignore: cast_nullable_to_non_nullable
              as String,
      otp: null == otp
          ? _value.otp
          : otp // ignore: cast_nullable_to_non_nullable
              as String,
      otpGeneratedAt: null == otpGeneratedAt
          ? _value.otpGeneratedAt
          : otpGeneratedAt // ignore: cast_nullable_to_non_nullable
              as String,
      otpExpiresAt: null == otpExpiresAt
          ? _value.otpExpiresAt
          : otpExpiresAt // ignore: cast_nullable_to_non_nullable
              as String,
    ) as $Val);
  }
}

/// @nodoc
abstract class _$$TableOtpDataImplCopyWith<$Res>
    implements $TableOtpDataCopyWith<$Res> {
  factory _$$TableOtpDataImplCopyWith(
          _$TableOtpDataImpl value, $Res Function(_$TableOtpDataImpl) then) =
      __$$TableOtpDataImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call(
      {String tableId,
      String tableNumber,
      String otp,
      String otpGeneratedAt,
      String otpExpiresAt});
}

/// @nodoc
class __$$TableOtpDataImplCopyWithImpl<$Res>
    extends _$TableOtpDataCopyWithImpl<$Res, _$TableOtpDataImpl>
    implements _$$TableOtpDataImplCopyWith<$Res> {
  __$$TableOtpDataImplCopyWithImpl(
      _$TableOtpDataImpl _value, $Res Function(_$TableOtpDataImpl) _then)
      : super(_value, _then);

  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? tableId = null,
    Object? tableNumber = null,
    Object? otp = null,
    Object? otpGeneratedAt = null,
    Object? otpExpiresAt = null,
  }) {
    return _then(_$TableOtpDataImpl(
      tableId: null == tableId
          ? _value.tableId
          : tableId // ignore: cast_nullable_to_non_nullable
              as String,
      tableNumber: null == tableNumber
          ? _value.tableNumber
          : tableNumber // ignore: cast_nullable_to_non_nullable
              as String,
      otp: null == otp
          ? _value.otp
          : otp // ignore: cast_nullable_to_non_nullable
              as String,
      otpGeneratedAt: null == otpGeneratedAt
          ? _value.otpGeneratedAt
          : otpGeneratedAt // ignore: cast_nullable_to_non_nullable
              as String,
      otpExpiresAt: null == otpExpiresAt
          ? _value.otpExpiresAt
          : otpExpiresAt // ignore: cast_nullable_to_non_nullable
              as String,
    ));
  }
}

/// @nodoc
@JsonSerializable()
class _$TableOtpDataImpl implements _TableOtpData {
  const _$TableOtpDataImpl(
      {required this.tableId,
      required this.tableNumber,
      required this.otp,
      required this.otpGeneratedAt,
      required this.otpExpiresAt});

  factory _$TableOtpDataImpl.fromJson(Map<String, dynamic> json) =>
      _$$TableOtpDataImplFromJson(json);

  @override
  final String tableId;
  @override
  final String tableNumber;
  @override
  final String otp;
  @override
  final String otpGeneratedAt;
  @override
  final String otpExpiresAt;

  @override
  String toString() {
    return 'TableOtpData(tableId: $tableId, tableNumber: $tableNumber, otp: $otp, otpGeneratedAt: $otpGeneratedAt, otpExpiresAt: $otpExpiresAt)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$TableOtpDataImpl &&
            (identical(other.tableId, tableId) || other.tableId == tableId) &&
            (identical(other.tableNumber, tableNumber) ||
                other.tableNumber == tableNumber) &&
            (identical(other.otp, otp) || other.otp == otp) &&
            (identical(other.otpGeneratedAt, otpGeneratedAt) ||
                other.otpGeneratedAt == otpGeneratedAt) &&
            (identical(other.otpExpiresAt, otpExpiresAt) ||
                other.otpExpiresAt == otpExpiresAt));
  }

  @JsonKey(ignore: true)
  @override
  int get hashCode => Object.hash(
      runtimeType, tableId, tableNumber, otp, otpGeneratedAt, otpExpiresAt);

  @JsonKey(ignore: true)
  @override
  @pragma('vm:prefer-inline')
  _$$TableOtpDataImplCopyWith<_$TableOtpDataImpl> get copyWith =>
      __$$TableOtpDataImplCopyWithImpl<_$TableOtpDataImpl>(this, _$identity);

  @override
  Map<String, dynamic> toJson() {
    return _$$TableOtpDataImplToJson(
      this,
    );
  }
}

abstract class _TableOtpData implements TableOtpData {
  const factory _TableOtpData(
      {required final String tableId,
      required final String tableNumber,
      required final String otp,
      required final String otpGeneratedAt,
      required final String otpExpiresAt}) = _$TableOtpDataImpl;

  factory _TableOtpData.fromJson(Map<String, dynamic> json) =
      _$TableOtpDataImpl.fromJson;

  @override
  String get tableId;
  @override
  String get tableNumber;
  @override
  String get otp;
  @override
  String get otpGeneratedAt;
  @override
  String get otpExpiresAt;
  @override
  @JsonKey(ignore: true)
  _$$TableOtpDataImplCopyWith<_$TableOtpDataImpl> get copyWith =>
      throw _privateConstructorUsedError;
}

TableStatusUpdateData _$TableStatusUpdateDataFromJson(
    Map<String, dynamic> json) {
  return _TableStatusUpdateData.fromJson(json);
}

/// @nodoc
mixin _$TableStatusUpdateData {
  String get tableId => throw _privateConstructorUsedError;
  String get tableNumber => throw _privateConstructorUsedError;
  String get previousStatus => throw _privateConstructorUsedError;
  String get currentStatus => throw _privateConstructorUsedError;
  bool get changed => throw _privateConstructorUsedError;

  Map<String, dynamic> toJson() => throw _privateConstructorUsedError;
  @JsonKey(ignore: true)
  $TableStatusUpdateDataCopyWith<TableStatusUpdateData> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $TableStatusUpdateDataCopyWith<$Res> {
  factory $TableStatusUpdateDataCopyWith(TableStatusUpdateData value,
          $Res Function(TableStatusUpdateData) then) =
      _$TableStatusUpdateDataCopyWithImpl<$Res, TableStatusUpdateData>;
  @useResult
  $Res call(
      {String tableId,
      String tableNumber,
      String previousStatus,
      String currentStatus,
      bool changed});
}

/// @nodoc
class _$TableStatusUpdateDataCopyWithImpl<$Res,
        $Val extends TableStatusUpdateData>
    implements $TableStatusUpdateDataCopyWith<$Res> {
  _$TableStatusUpdateDataCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? tableId = null,
    Object? tableNumber = null,
    Object? previousStatus = null,
    Object? currentStatus = null,
    Object? changed = null,
  }) {
    return _then(_value.copyWith(
      tableId: null == tableId
          ? _value.tableId
          : tableId // ignore: cast_nullable_to_non_nullable
              as String,
      tableNumber: null == tableNumber
          ? _value.tableNumber
          : tableNumber // ignore: cast_nullable_to_non_nullable
              as String,
      previousStatus: null == previousStatus
          ? _value.previousStatus
          : previousStatus // ignore: cast_nullable_to_non_nullable
              as String,
      currentStatus: null == currentStatus
          ? _value.currentStatus
          : currentStatus // ignore: cast_nullable_to_non_nullable
              as String,
      changed: null == changed
          ? _value.changed
          : changed // ignore: cast_nullable_to_non_nullable
              as bool,
    ) as $Val);
  }
}

/// @nodoc
abstract class _$$TableStatusUpdateDataImplCopyWith<$Res>
    implements $TableStatusUpdateDataCopyWith<$Res> {
  factory _$$TableStatusUpdateDataImplCopyWith(
          _$TableStatusUpdateDataImpl value,
          $Res Function(_$TableStatusUpdateDataImpl) then) =
      __$$TableStatusUpdateDataImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call(
      {String tableId,
      String tableNumber,
      String previousStatus,
      String currentStatus,
      bool changed});
}

/// @nodoc
class __$$TableStatusUpdateDataImplCopyWithImpl<$Res>
    extends _$TableStatusUpdateDataCopyWithImpl<$Res,
        _$TableStatusUpdateDataImpl>
    implements _$$TableStatusUpdateDataImplCopyWith<$Res> {
  __$$TableStatusUpdateDataImplCopyWithImpl(_$TableStatusUpdateDataImpl _value,
      $Res Function(_$TableStatusUpdateDataImpl) _then)
      : super(_value, _then);

  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? tableId = null,
    Object? tableNumber = null,
    Object? previousStatus = null,
    Object? currentStatus = null,
    Object? changed = null,
  }) {
    return _then(_$TableStatusUpdateDataImpl(
      tableId: null == tableId
          ? _value.tableId
          : tableId // ignore: cast_nullable_to_non_nullable
              as String,
      tableNumber: null == tableNumber
          ? _value.tableNumber
          : tableNumber // ignore: cast_nullable_to_non_nullable
              as String,
      previousStatus: null == previousStatus
          ? _value.previousStatus
          : previousStatus // ignore: cast_nullable_to_non_nullable
              as String,
      currentStatus: null == currentStatus
          ? _value.currentStatus
          : currentStatus // ignore: cast_nullable_to_non_nullable
              as String,
      changed: null == changed
          ? _value.changed
          : changed // ignore: cast_nullable_to_non_nullable
              as bool,
    ));
  }
}

/// @nodoc
@JsonSerializable()
class _$TableStatusUpdateDataImpl implements _TableStatusUpdateData {
  const _$TableStatusUpdateDataImpl(
      {required this.tableId,
      required this.tableNumber,
      required this.previousStatus,
      required this.currentStatus,
      required this.changed});

  factory _$TableStatusUpdateDataImpl.fromJson(Map<String, dynamic> json) =>
      _$$TableStatusUpdateDataImplFromJson(json);

  @override
  final String tableId;
  @override
  final String tableNumber;
  @override
  final String previousStatus;
  @override
  final String currentStatus;
  @override
  final bool changed;

  @override
  String toString() {
    return 'TableStatusUpdateData(tableId: $tableId, tableNumber: $tableNumber, previousStatus: $previousStatus, currentStatus: $currentStatus, changed: $changed)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$TableStatusUpdateDataImpl &&
            (identical(other.tableId, tableId) || other.tableId == tableId) &&
            (identical(other.tableNumber, tableNumber) ||
                other.tableNumber == tableNumber) &&
            (identical(other.previousStatus, previousStatus) ||
                other.previousStatus == previousStatus) &&
            (identical(other.currentStatus, currentStatus) ||
                other.currentStatus == currentStatus) &&
            (identical(other.changed, changed) || other.changed == changed));
  }

  @JsonKey(ignore: true)
  @override
  int get hashCode => Object.hash(runtimeType, tableId, tableNumber,
      previousStatus, currentStatus, changed);

  @JsonKey(ignore: true)
  @override
  @pragma('vm:prefer-inline')
  _$$TableStatusUpdateDataImplCopyWith<_$TableStatusUpdateDataImpl>
      get copyWith => __$$TableStatusUpdateDataImplCopyWithImpl<
          _$TableStatusUpdateDataImpl>(this, _$identity);

  @override
  Map<String, dynamic> toJson() {
    return _$$TableStatusUpdateDataImplToJson(
      this,
    );
  }
}

abstract class _TableStatusUpdateData implements TableStatusUpdateData {
  const factory _TableStatusUpdateData(
      {required final String tableId,
      required final String tableNumber,
      required final String previousStatus,
      required final String currentStatus,
      required final bool changed}) = _$TableStatusUpdateDataImpl;

  factory _TableStatusUpdateData.fromJson(Map<String, dynamic> json) =
      _$TableStatusUpdateDataImpl.fromJson;

  @override
  String get tableId;
  @override
  String get tableNumber;
  @override
  String get previousStatus;
  @override
  String get currentStatus;
  @override
  bool get changed;
  @override
  @JsonKey(ignore: true)
  _$$TableStatusUpdateDataImplCopyWith<_$TableStatusUpdateDataImpl>
      get copyWith => throw _privateConstructorUsedError;
}

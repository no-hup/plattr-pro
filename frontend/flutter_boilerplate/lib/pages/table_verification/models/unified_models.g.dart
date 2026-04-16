// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'unified_models.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_$TableValidationDataImpl _$$TableValidationDataImplFromJson(
        Map<String, dynamic> json) =>
    _$TableValidationDataImpl(
      status: json['status'] as String,
      tableStatus: json['tableStatus'] as String?,
      restaurant: json['restaurant'] == null
          ? null
          : RestaurantInfo.fromJson(json['restaurant'] as Map<String, dynamic>),
      table: json['table'] == null
          ? null
          : TableInfo.fromJson(json['table'] as Map<String, dynamic>),
      session: json['session'] == null
          ? null
          : SessionInfo.fromJson(json['session'] as Map<String, dynamic>),
      primaryCustomer: json['primaryCustomer'] == null
          ? null
          : PrimaryCustomer.fromJson(
              json['primaryCustomer'] as Map<String, dynamic>),
      occupiedBy: (json['occupiedBy'] as List<dynamic>?)
          ?.map((e) => e as String)
          .toList(),
      otpRequiredForOrder: json['otpRequiredForOrder'] as bool? ?? false,
      isUsernameMandatory: json['isUsernameMandatory'] as bool? ?? false,
      isPhoneNumberMandatory: json['isPhoneNumberMandatory'] as bool? ?? false,
      isMultiUserSupported: json['isMultiUserSupported'] as bool? ?? false,
      authMessage: json['authMessage'] as String?,
      assignedServer: json['assignedServer'] == null
          ? null
          : AssignedServer.fromJson(
              json['assignedServer'] as Map<String, dynamic>),
    );

Map<String, dynamic> _$$TableValidationDataImplToJson(
        _$TableValidationDataImpl instance) =>
    <String, dynamic>{
      'status': instance.status,
      'tableStatus': instance.tableStatus,
      'restaurant': instance.restaurant,
      'table': instance.table,
      'session': instance.session,
      'primaryCustomer': instance.primaryCustomer,
      'occupiedBy': instance.occupiedBy,
      'otpRequiredForOrder': instance.otpRequiredForOrder,
      'isUsernameMandatory': instance.isUsernameMandatory,
      'isPhoneNumberMandatory': instance.isPhoneNumberMandatory,
      'isMultiUserSupported': instance.isMultiUserSupported,
      'authMessage': instance.authMessage,
      'assignedServer': instance.assignedServer,
    };

_$RestaurantInfoImpl _$$RestaurantInfoImplFromJson(Map<String, dynamic> json) =>
    _$RestaurantInfoImpl(
      name: json['name'] as String,
      id: json['id'] as String,
    );

Map<String, dynamic> _$$RestaurantInfoImplToJson(
        _$RestaurantInfoImpl instance) =>
    <String, dynamic>{
      'name': instance.name,
      'id': instance.id,
    };

_$TableInfoImpl _$$TableInfoImplFromJson(Map<String, dynamic> json) =>
    _$TableInfoImpl(
      number: json['number'] as String,
      id: json['id'] as String,
      capacity: (json['capacity'] as num?)?.toInt(),
      assignedServerId: json['assignedServerId'] as String?,
    );

Map<String, dynamic> _$$TableInfoImplToJson(_$TableInfoImpl instance) =>
    <String, dynamic>{
      'number': instance.number,
      'id': instance.id,
      'capacity': instance.capacity,
      'assignedServerId': instance.assignedServerId,
    };

_$SessionInfoImpl _$$SessionInfoImplFromJson(Map<String, dynamic> json) =>
    _$SessionInfoImpl(
      sessionId: json['sessionId'] as String,
      expiresAt: json['expiresAt'] as String,
    );

Map<String, dynamic> _$$SessionInfoImplToJson(_$SessionInfoImpl instance) =>
    <String, dynamic>{
      'sessionId': instance.sessionId,
      'expiresAt': instance.expiresAt,
    };

_$PrimaryCustomerImpl _$$PrimaryCustomerImplFromJson(
        Map<String, dynamic> json) =>
    _$PrimaryCustomerImpl(
      phoneNumber: json['phoneNumber'] as String,
      name: json['name'] as String,
    );

Map<String, dynamic> _$$PrimaryCustomerImplToJson(
        _$PrimaryCustomerImpl instance) =>
    <String, dynamic>{
      'phoneNumber': instance.phoneNumber,
      'name': instance.name,
    };

_$AssignedServerImpl _$$AssignedServerImplFromJson(Map<String, dynamic> json) =>
    _$AssignedServerImpl(
      name: json['name'] as String,
      status: json['status'] as String,
    );

Map<String, dynamic> _$$AssignedServerImplToJson(
        _$AssignedServerImpl instance) =>
    <String, dynamic>{
      'name': instance.name,
      'status': instance.status,
    };

_$OtpValidationDataImpl _$$OtpValidationDataImplFromJson(
        Map<String, dynamic> json) =>
    _$OtpValidationDataImpl(
      status: json['status'] as String,
      sessionId: json['sessionId'] as String,
      customToken: json['customToken'] as String?,
      isPrimaryCustomer: json['isPrimaryCustomer'] as bool? ?? false,
    );

Map<String, dynamic> _$$OtpValidationDataImplToJson(
        _$OtpValidationDataImpl instance) =>
    <String, dynamic>{
      'status': instance.status,
      'sessionId': instance.sessionId,
      'customToken': instance.customToken,
      'isPrimaryCustomer': instance.isPrimaryCustomer,
    };

_$TableStatusDataImpl _$$TableStatusDataImplFromJson(
        Map<String, dynamic> json) =>
    _$TableStatusDataImpl(
      tableNumber: json['tableNumber'] as String,
      status: json['status'] as String,
      capacity: (json['capacity'] as num?)?.toInt(),
      primaryCustomer: json['primaryCustomer'] == null
          ? null
          : PrimaryCustomer.fromJson(
              json['primaryCustomer'] as Map<String, dynamic>),
      occupiedBy: (json['occupiedBy'] as List<dynamic>?)
              ?.map((e) => e as String)
              .toList() ??
          const [],
      assignedServer: json['assignedServer'] == null
          ? null
          : AssignedServer.fromJson(
              json['assignedServer'] as Map<String, dynamic>),
      hasActiveOTP: json['hasActiveOTP'] as bool? ?? false,
    );

Map<String, dynamic> _$$TableStatusDataImplToJson(
        _$TableStatusDataImpl instance) =>
    <String, dynamic>{
      'tableNumber': instance.tableNumber,
      'status': instance.status,
      'capacity': instance.capacity,
      'primaryCustomer': instance.primaryCustomer,
      'occupiedBy': instance.occupiedBy,
      'assignedServer': instance.assignedServer,
      'hasActiveOTP': instance.hasActiveOTP,
    };

_$TableListDataImpl _$$TableListDataImplFromJson(Map<String, dynamic> json) =>
    _$TableListDataImpl(
      restaurantId: json['restaurantId'] as String,
      count: (json['count'] as num).toInt(),
      tables: (json['tables'] as List<dynamic>?)
              ?.map((e) => TableListItem.fromJson(e as Map<String, dynamic>))
              .toList() ??
          const [],
    );

Map<String, dynamic> _$$TableListDataImplToJson(_$TableListDataImpl instance) =>
    <String, dynamic>{
      'restaurantId': instance.restaurantId,
      'count': instance.count,
      'tables': instance.tables,
    };

_$TableListItemImpl _$$TableListItemImplFromJson(Map<String, dynamic> json) =>
    _$TableListItemImpl(
      id: json['id'] as String,
      number: json['number'] as String,
      status: json['status'] as String,
      capacity: (json['capacity'] as num?)?.toInt(),
      assignedServerId: json['assignedServerId'] as String?,
      isOccupied: json['isOccupied'] as bool? ?? false,
      primaryCustomer: json['primaryCustomer'] == null
          ? null
          : PrimaryCustomer.fromJson(
              json['primaryCustomer'] as Map<String, dynamic>),
      lastActivity: json['lastActivity'] as String?,
      activeOrderId: json['activeOrderId'] as String?,
      tableOtp: json['tableOtp'] as String?,
    );

Map<String, dynamic> _$$TableListItemImplToJson(_$TableListItemImpl instance) =>
    <String, dynamic>{
      'id': instance.id,
      'number': instance.number,
      'status': instance.status,
      'capacity': instance.capacity,
      'assignedServerId': instance.assignedServerId,
      'isOccupied': instance.isOccupied,
      'primaryCustomer': instance.primaryCustomer,
      'lastActivity': instance.lastActivity,
      'activeOrderId': instance.activeOrderId,
      'tableOtp': instance.tableOtp,
    };

_$TableDetailsDataImpl _$$TableDetailsDataImplFromJson(
        Map<String, dynamic> json) =>
    _$TableDetailsDataImpl(
      id: json['id'] as String,
      number: json['number'] as String,
      status: json['status'] as String,
      restaurant:
          RestaurantInfo.fromJson(json['restaurant'] as Map<String, dynamic>),
      capacity: (json['capacity'] as num?)?.toInt(),
      section: json['section'] as String?,
      floor: json['floor'] as String?,
      assignedServer: json['assignedServer'] == null
          ? null
          : AssignedServer.fromJson(
              json['assignedServer'] as Map<String, dynamic>),
      isOccupied: json['isOccupied'] as bool? ?? false,
      hasActiveOTP: json['hasActiveOTP'] as bool? ?? false,
      recentOrders: (json['recentOrders'] as List<dynamic>?)
              ?.map((e) => RecentOrder.fromJson(e as Map<String, dynamic>))
              .toList() ??
          const [],
      primaryCustomer: json['primaryCustomer'] == null
          ? null
          : PrimaryCustomer.fromJson(
              json['primaryCustomer'] as Map<String, dynamic>),
      occupiedBy: (json['occupiedBy'] as List<dynamic>?)
              ?.map((e) => e as String)
              .toList() ??
          const [],
      lastActivity: json['lastActivity'] as String?,
      activeOrderId: json['activeOrderId'] as String?,
      otp: json['otp'] as String?,
      otpGeneratedAt: json['otpGeneratedAt'] as String?,
      reservationDetails: json['reservationDetails'] as Map<String, dynamic>?,
    );

Map<String, dynamic> _$$TableDetailsDataImplToJson(
        _$TableDetailsDataImpl instance) =>
    <String, dynamic>{
      'id': instance.id,
      'number': instance.number,
      'status': instance.status,
      'restaurant': instance.restaurant,
      'capacity': instance.capacity,
      'section': instance.section,
      'floor': instance.floor,
      'assignedServer': instance.assignedServer,
      'isOccupied': instance.isOccupied,
      'hasActiveOTP': instance.hasActiveOTP,
      'recentOrders': instance.recentOrders,
      'primaryCustomer': instance.primaryCustomer,
      'occupiedBy': instance.occupiedBy,
      'lastActivity': instance.lastActivity,
      'activeOrderId': instance.activeOrderId,
      'otp': instance.otp,
      'otpGeneratedAt': instance.otpGeneratedAt,
      'reservationDetails': instance.reservationDetails,
    };

_$RecentOrderImpl _$$RecentOrderImplFromJson(Map<String, dynamic> json) =>
    _$RecentOrderImpl(
      id: json['id'] as String,
      status: json['status'] as String,
      createdAt: json['createdAt'] as String,
      totalAmount: (json['totalAmount'] as num).toDouble(),
      itemCount: (json['itemCount'] as num).toInt(),
    );

Map<String, dynamic> _$$RecentOrderImplToJson(_$RecentOrderImpl instance) =>
    <String, dynamic>{
      'id': instance.id,
      'status': instance.status,
      'createdAt': instance.createdAt,
      'totalAmount': instance.totalAmount,
      'itemCount': instance.itemCount,
    };

_$TableAssignmentDataImpl _$$TableAssignmentDataImplFromJson(
        Map<String, dynamic> json) =>
    _$TableAssignmentDataImpl(
      tableId: json['tableId'] as String,
      serverId: json['serverId'] as String,
      serverName: json['serverName'] as String,
      tableNumber: json['tableNumber'] as String,
    );

Map<String, dynamic> _$$TableAssignmentDataImplToJson(
        _$TableAssignmentDataImpl instance) =>
    <String, dynamic>{
      'tableId': instance.tableId,
      'serverId': instance.serverId,
      'serverName': instance.serverName,
      'tableNumber': instance.tableNumber,
    };

_$TableUnassignmentDataImpl _$$TableUnassignmentDataImplFromJson(
        Map<String, dynamic> json) =>
    _$TableUnassignmentDataImpl(
      tableId: json['tableId'] as String,
      tableNumber: json['tableNumber'] as String,
      previousServerId: json['previousServerId'] as String?,
      previousServerName: json['previousServerName'] as String?,
    );

Map<String, dynamic> _$$TableUnassignmentDataImplToJson(
        _$TableUnassignmentDataImpl instance) =>
    <String, dynamic>{
      'tableId': instance.tableId,
      'tableNumber': instance.tableNumber,
      'previousServerId': instance.previousServerId,
      'previousServerName': instance.previousServerName,
    };

_$TableOtpDataImpl _$$TableOtpDataImplFromJson(Map<String, dynamic> json) =>
    _$TableOtpDataImpl(
      tableId: json['tableId'] as String,
      tableNumber: json['tableNumber'] as String,
      otp: json['otp'] as String,
      otpGeneratedAt: json['otpGeneratedAt'] as String,
      otpExpiresAt: json['otpExpiresAt'] as String,
    );

Map<String, dynamic> _$$TableOtpDataImplToJson(_$TableOtpDataImpl instance) =>
    <String, dynamic>{
      'tableId': instance.tableId,
      'tableNumber': instance.tableNumber,
      'otp': instance.otp,
      'otpGeneratedAt': instance.otpGeneratedAt,
      'otpExpiresAt': instance.otpExpiresAt,
    };

_$TableStatusUpdateDataImpl _$$TableStatusUpdateDataImplFromJson(
        Map<String, dynamic> json) =>
    _$TableStatusUpdateDataImpl(
      tableId: json['tableId'] as String,
      tableNumber: json['tableNumber'] as String,
      previousStatus: json['previousStatus'] as String,
      currentStatus: json['currentStatus'] as String,
      changed: json['changed'] as bool,
    );

Map<String, dynamic> _$$TableStatusUpdateDataImplToJson(
        _$TableStatusUpdateDataImpl instance) =>
    <String, dynamic>{
      'tableId': instance.tableId,
      'tableNumber': instance.tableNumber,
      'previousStatus': instance.previousStatus,
      'currentStatus': instance.currentStatus,
      'changed': instance.changed,
    };

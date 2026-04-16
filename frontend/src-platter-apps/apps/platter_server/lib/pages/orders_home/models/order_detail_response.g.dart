// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'order_detail_response.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

OrderDetailResponse _$OrderDetailResponseFromJson(Map<String, dynamic> json) =>
    OrderDetailResponse(
      id: json['id'] as String,
      orderNumber: json['orderNumber'] as String,
      orderStatus: json['orderStatus'] as String,
      createdAt: OrderDetailResponse._fromTimestamp(json['createdAt']),
      updatedAt: OrderDetailResponse._fromTimestamp(json['updatedAt']),
      tableId: json['tableId'] as String,
      restaurantId: json['restaurantId'] as String,
      sessionId: json['sessionId'] as String?,
      total: json['total'] as num,
      items: json['items'] as List<dynamic>,
      notes: json['notes'] as String,
      carts: json['carts'] as List<dynamic>,
      assignedServerName: json['assignedServerName'] as String?,
      assignedServerId: json['assignedServerId'] as String?,
    );

Map<String, dynamic> _$OrderDetailResponseToJson(
        OrderDetailResponse instance) =>
    <String, dynamic>{
      'id': instance.id,
      'orderNumber': instance.orderNumber,
      'orderStatus': instance.orderStatus,
      'createdAt': instance.createdAt.toIso8601String(),
      'updatedAt': instance.updatedAt.toIso8601String(),
      'tableId': instance.tableId,
      'restaurantId': instance.restaurantId,
      'sessionId': instance.sessionId,
      'total': instance.total,
      'items': instance.items,
      'notes': instance.notes,
      'carts': instance.carts,
      'assignedServerName': instance.assignedServerName,
      'assignedServerId': instance.assignedServerId,
    };

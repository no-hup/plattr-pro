// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'order_summary.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

OrderSummary _$OrderSummaryFromJson(Map<String, dynamic> json) => OrderSummary(
      orderId: json['orderId'] as String? ?? '',
      tableId: json['tableId'] as String? ?? '',
      status: json['status'] as String? ?? '',
      carts: (json['carts'] as List<dynamic>?)
              ?.map((e) => CartSummary.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
      assignedTo: json['assignedServer'] as String? ?? '',
    );

Map<String, dynamic> _$OrderSummaryToJson(OrderSummary instance) =>
    <String, dynamic>{
      'orderId': instance.orderId,
      'tableId': instance.tableId,
      'status': instance.status,
      'carts': instance.carts,
      'assignedServer': instance.assignedTo,
    };

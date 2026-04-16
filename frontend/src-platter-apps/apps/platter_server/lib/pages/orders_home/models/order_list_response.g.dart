// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'order_list_response.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

OrderListResponse _$OrderListResponseFromJson(Map<String, dynamic> json) =>
    OrderListResponse(
      currentServerId: json['currentServerId'] as String? ?? '',
      uiFlags: json['uiFlags'] == null
          ? null
          : UiFlags.fromJson(json['uiFlags'] as Map<String, dynamic>),
      orders: (json['orders'] as List<dynamic>?)
              ?.map((e) => OrderSummary.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
    );

Map<String, dynamic> _$OrderListResponseToJson(OrderListResponse instance) =>
    <String, dynamic>{
      'currentServerId': instance.currentServerId,
      'uiFlags': instance.uiFlags,
      'orders': instance.orders,
    };

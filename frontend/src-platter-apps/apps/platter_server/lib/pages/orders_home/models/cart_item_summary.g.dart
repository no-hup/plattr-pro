// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'cart_item_summary.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

CartItemSummary _$CartItemSummaryFromJson(Map<String, dynamic> json) =>
    CartItemSummary(
      itemId: json['menuItemId'] as String? ?? '',
      name: json['name'] as String? ?? '',
      quantity: (json['quantity'] as num?)?.toInt() ?? 0,
      status: json['status'] as String? ?? '',
    );

Map<String, dynamic> _$CartItemSummaryToJson(CartItemSummary instance) =>
    <String, dynamic>{
      'menuItemId': instance.itemId,
      'name': instance.name,
      'quantity': instance.quantity,
      'status': instance.status,
    };

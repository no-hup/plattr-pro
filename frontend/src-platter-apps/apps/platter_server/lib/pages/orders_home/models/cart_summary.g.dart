// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'cart_summary.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

CartSummary _$CartSummaryFromJson(Map<String, dynamic> json) => CartSummary(
      cartId: json['hashCode'] as String? ?? '',
      status: json['status'] as String? ?? '',
      items: (json['items'] as List<dynamic>?)
              ?.map((e) => CartItemSummary.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
    );

Map<String, dynamic> _$CartSummaryToJson(CartSummary instance) =>
    <String, dynamic>{
      'hashCode': instance.cartId,
      'status': instance.status,
      'items': instance.items,
    };

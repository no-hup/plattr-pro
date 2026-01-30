// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'cart_summary.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

CartSummary _$CartSummaryFromJson(Map<String, dynamic> json) => CartSummary(
      cartId: CartSummary._readCartId(json, 'cartId') as String? ?? '',
      status: json['status'] as String? ?? '',
      statusColorHex: json['statusColorHex'] as String? ?? '',
      cartIndex: (json['cartIndex'] as num?)?.toInt() ?? 0,
      items: (json['items'] as List<dynamic>?)
              ?.map((e) => CartItemSummary.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
    );

Map<String, dynamic> _$CartSummaryToJson(CartSummary instance) =>
    <String, dynamic>{
      'cartId': instance.cartId,
      'status': instance.status,
      'statusColorHex': instance.statusColorHex,
      'cartIndex': instance.cartIndex,
      'items': instance.items,
    };

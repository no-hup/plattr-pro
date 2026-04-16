// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'served_cart.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

ServedCart _$ServedCartFromJson(Map<String, dynamic> json) => ServedCart(
      orderId: json['orderId'] as String? ?? '',
      tableId: json['tableId'] as String? ?? '',
      orderNumber: json['orderNumber'] as String? ?? '',
      cartId: json['cartId'] as String? ?? '',
      cartIndex: (json['cartIndex'] as num?)?.toInt() ?? 0,
      status: json['status'] as String? ?? '',
      statusColorHex: json['statusColorHex'] as String? ?? '',
      servedAtMs: (json['servedAt'] as num?)?.toInt(),
      priceInfo: json['priceInfo'] == null
          ? null
          : ServedCartPriceInfo.fromJson(
              json['priceInfo'] as Map<String, dynamic>),
      items: (json['items'] as List<dynamic>?)
              ?.map((e) => CartItemSummary.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
    );

Map<String, dynamic> _$ServedCartToJson(ServedCart instance) =>
    <String, dynamic>{
      'orderId': instance.orderId,
      'tableId': instance.tableId,
      'orderNumber': instance.orderNumber,
      'cartId': instance.cartId,
      'cartIndex': instance.cartIndex,
      'status': instance.status,
      'statusColorHex': instance.statusColorHex,
      'servedAt': instance.servedAtMs,
      'priceInfo': instance.priceInfo,
      'items': instance.items,
    };

ServedCartPriceInfo _$ServedCartPriceInfoFromJson(Map<String, dynamic> json) =>
    ServedCartPriceInfo(
      finalPrice: json['finalPrice'] as num? ?? 0,
    );

Map<String, dynamic> _$ServedCartPriceInfoToJson(
        ServedCartPriceInfo instance) =>
    <String, dynamic>{
      'finalPrice': instance.finalPrice,
    };

ServedCartsResponse _$ServedCartsResponseFromJson(Map<String, dynamic> json) =>
    ServedCartsResponse(
      currentServerId: json['currentServerId'] as String? ?? '',
      servedCarts: (json['servedCarts'] as List<dynamic>?)
              ?.map((e) => ServedCart.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
      lookbackHours: (json['lookbackHours'] as num?)?.toInt() ?? 6,
    );

Map<String, dynamic> _$ServedCartsResponseToJson(
        ServedCartsResponse instance) =>
    <String, dynamic>{
      'currentServerId': instance.currentServerId,
      'servedCarts': instance.servedCarts,
      'lookbackHours': instance.lookbackHours,
    };

// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'active_order_models.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_$ActiveKitchenCartImpl _$$ActiveKitchenCartImplFromJson(
        Map<String, dynamic> json) =>
    _$ActiveKitchenCartImpl(
      cartId: json['cartId'] as String,
      orderId: json['orderId'] as String,
      orderNumber: _parseOrderNumber(json['orderNumber']),
      tableNumber: json['tableNumber'] as String,
      serverName: json['serverName'] as String?,
      submittedAt: _parseDateTime(json['submittedAt']),
      status: _parseStatus(json['status']),
      items: (json['items'] as List<dynamic>)
          .map((e) => ActiveCartItem.fromJson(e as Map<String, dynamic>))
          .toList(),
      kitchenNote: json['kitchenNote'] as String?,
    );

Map<String, dynamic> _$$ActiveKitchenCartImplToJson(
        _$ActiveKitchenCartImpl instance) =>
    <String, dynamic>{
      'cartId': instance.cartId,
      'orderId': instance.orderId,
      'orderNumber': instance.orderNumber,
      'tableNumber': instance.tableNumber,
      'serverName': instance.serverName,
      'submittedAt': instance.submittedAt.toIso8601String(),
      'status': _$ActiveCartStatusEnumMap[instance.status]!,
      'items': instance.items,
      'kitchenNote': instance.kitchenNote,
    };

const _$ActiveCartStatusEnumMap = {
  ActiveCartStatus.pending: 'pending',
  ActiveCartStatus.cooking: 'cooking',
  ActiveCartStatus.ready: 'ready',
  ActiveCartStatus.served: 'served',
  ActiveCartStatus.cancelled: 'cancelled',
};

_$ActiveCartItemImpl _$$ActiveCartItemImplFromJson(Map<String, dynamic> json) =>
    _$ActiveCartItemImpl(
      itemId: json['itemId'] == null ? '' : _parseString(json['itemId']),
      name: json['name'] == null ? 'Unknown Item' : _parseString(json['name']),
      quantity: json['quantity'] == null ? 1 : _parseInt(json['quantity']),
      modifiers: json['modifiers'] == null
          ? const []
          : _parseStringList(json['modifiers']),
      itemNote: _readItemNote(json, 'itemNote') as String?,
      isVoided: json['isVoided'] as bool? ?? false,
    );

Map<String, dynamic> _$$ActiveCartItemImplToJson(
        _$ActiveCartItemImpl instance) =>
    <String, dynamic>{
      'itemId': instance.itemId,
      'name': instance.name,
      'quantity': instance.quantity,
      'modifiers': instance.modifiers,
      'itemNote': instance.itemNote,
      'isVoided': instance.isVoided,
    };

_$ActiveCartsResponseImpl _$$ActiveCartsResponseImplFromJson(
        Map<String, dynamic> json) =>
    _$ActiveCartsResponseImpl(
      carts: (json['carts'] as List<dynamic>?)
              ?.map(
                  (e) => ActiveKitchenCart.fromJson(e as Map<String, dynamic>))
              .toList() ??
          const [],
      widgetType: json['widgetType'] == null
          ? KitchenViewType.cart
          : _parseViewType(json['widgetType']),
    );

Map<String, dynamic> _$$ActiveCartsResponseImplToJson(
        _$ActiveCartsResponseImpl instance) =>
    <String, dynamic>{
      'carts': instance.carts,
      'widgetType': _$KitchenViewTypeEnumMap[instance.widgetType]!,
    };

const _$KitchenViewTypeEnumMap = {
  KitchenViewType.cart: 'cart',
  KitchenViewType.item: 'item',
};

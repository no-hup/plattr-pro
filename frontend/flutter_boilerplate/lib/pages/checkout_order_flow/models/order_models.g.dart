// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'order_models.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_$OrderResponseImpl _$$OrderResponseImplFromJson(Map<String, dynamic> json) =>
    _$OrderResponseImpl(
      status: json['status'] as String,
      message: json['message'] as String?,
      data: json['data'] == null
          ? null
          : OrderData.fromJson(json['data'] as Map<String, dynamic>),
    );

Map<String, dynamic> _$$OrderResponseImplToJson(_$OrderResponseImpl instance) =>
    <String, dynamic>{
      'status': instance.status,
      'message': instance.message,
      'data': instance.data,
    };

_$OrderDataImpl _$$OrderDataImplFromJson(Map<String, dynamic> json) =>
    _$OrderDataImpl(
      id: json['id'] as String,
      orderNumber: json['orderNumber'] as String,
      orderStatus: json['orderStatus'] as String,
      createdAt: const TimestampConverter()
          .fromJson(json['createdAt'] as Map<String, dynamic>?),
      updatedAt: const TimestampConverter()
          .fromJson(json['updatedAt'] as Map<String, dynamic>?),
      tableId: json['tableId'] as String,
      restaurantId: json['restaurantId'] as String,
      sessionId: json['sessionId'] as String,
      total: (json['total'] as num?)?.toDouble() ?? 0.0,
      items: (json['items'] as List<dynamic>?)
              ?.map((e) => OrderItem.fromJson(e as Map<String, dynamic>))
              .toList() ??
          const [],
      notes: json['notes'] as String? ?? '',
      carts: (json['carts'] as List<dynamic>?)
              ?.map((e) => CartHistoryItem.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
    );

Map<String, dynamic> _$$OrderDataImplToJson(_$OrderDataImpl instance) =>
    <String, dynamic>{
      'id': instance.id,
      'orderNumber': instance.orderNumber,
      'orderStatus': instance.orderStatus,
      'createdAt': const TimestampConverter().toJson(instance.createdAt),
      'updatedAt': const TimestampConverter().toJson(instance.updatedAt),
      'tableId': instance.tableId,
      'restaurantId': instance.restaurantId,
      'sessionId': instance.sessionId,
      'total': instance.total,
      'items': instance.items,
      'notes': instance.notes,
      'carts': instance.carts,
    };

_$CartHistoryItemImpl _$$CartHistoryItemImplFromJson(
        Map<String, dynamic> json) =>
    _$CartHistoryItemImpl(
      id: json['id'] as String? ?? '',
      status: json['status'] as String? ?? 'pending',
      checkoutTime: const TimestampConverter()
          .fromJson(json['checkoutTime'] as Map<String, dynamic>?),
      total: (json['total'] as num?)?.toDouble() ?? 0.0,
      priceInfo: json['priceInfo'] == null
          ? null
          : CartPriceInfoDetail.fromJson(
              json['priceInfo'] as Map<String, dynamic>),
      items: (json['items'] as List<dynamic>?)
              ?.map((e) => OrderItem.fromJson(e as Map<String, dynamic>))
              .toList() ??
          const [],
      notes: json['notes'] as String?,
      estimatedPrepTime: (json['estimatedPrepTime'] as num?)?.toInt(),
    );

Map<String, dynamic> _$$CartHistoryItemImplToJson(
        _$CartHistoryItemImpl instance) =>
    <String, dynamic>{
      'id': instance.id,
      'status': instance.status,
      'checkoutTime': const TimestampConverter().toJson(instance.checkoutTime),
      'total': instance.total,
      'priceInfo': instance.priceInfo,
      'items': instance.items,
      'notes': instance.notes,
      'estimatedPrepTime': instance.estimatedPrepTime,
    };

_$CartPriceInfoDetailImpl _$$CartPriceInfoDetailImplFromJson(
        Map<String, dynamic> json) =>
    _$CartPriceInfoDetailImpl(
      basePrice: (json['basePrice'] as num?)?.toDouble() ?? 0.0,
      finalPrice: (json['finalPrice'] as num?)?.toDouble() ?? 0.0,
      discount: (json['discount'] as num?)?.toDouble() ?? 0.0,
      totalDiscountAmount:
          (json['totalDiscountAmount'] as num?)?.toDouble() ?? 0.0,
      totalVariantBasePrice:
          (json['totalVariantBasePrice'] as num?)?.toDouble() ?? 0.0,
      totalAddonBasePrice:
          (json['totalAddonBasePrice'] as num?)?.toDouble() ?? 0.0,
    );

Map<String, dynamic> _$$CartPriceInfoDetailImplToJson(
        _$CartPriceInfoDetailImpl instance) =>
    <String, dynamic>{
      'basePrice': instance.basePrice,
      'finalPrice': instance.finalPrice,
      'discount': instance.discount,
      'totalDiscountAmount': instance.totalDiscountAmount,
      'totalVariantBasePrice': instance.totalVariantBasePrice,
      'totalAddonBasePrice': instance.totalAddonBasePrice,
    };

_$OrderItemImpl _$$OrderItemImplFromJson(Map<String, dynamic> json) =>
    _$OrderItemImpl(
      menuItemId: json['menuItemId'] as String,
      name: json['name'] as String,
      quantity: (json['quantity'] as num?)?.toInt() ?? 1,
      price: (json['price'] as num?)?.toDouble() ?? 0.0,
      variants: (json['variants'] as List<dynamic>?)
              ?.map((e) => OrderVariant.fromJson(e as Map<String, dynamic>))
              .toList() ??
          const [],
      addons: (json['addons'] as List<dynamic>?)
              ?.map((e) => OrderAddon.fromJson(e as Map<String, dynamic>))
              .toList() ??
          const [],
      cartItemId: json['cartItemId'] as String?,
    );

Map<String, dynamic> _$$OrderItemImplToJson(_$OrderItemImpl instance) =>
    <String, dynamic>{
      'menuItemId': instance.menuItemId,
      'name': instance.name,
      'quantity': instance.quantity,
      'price': instance.price,
      'variants': instance.variants,
      'addons': instance.addons,
      'cartItemId': instance.cartItemId,
    };

_$OrderVariantImpl _$$OrderVariantImplFromJson(Map<String, dynamic> json) =>
    _$OrderVariantImpl(
      id: json['id'] as String,
      isMandatory: json['isMandatory'] as bool? ?? false,
      respectParentDiscount: json['respectParentDiscount'] as bool? ?? true,
      selected_variant_id: json['selected_variant_id'] as String,
      selected_variant_name: json['selected_variant_name'] as String,
      priceInfo: PriceInfo.fromJson(json['priceInfo'] as Map<String, dynamic>),
    );

Map<String, dynamic> _$$OrderVariantImplToJson(_$OrderVariantImpl instance) =>
    <String, dynamic>{
      'id': instance.id,
      'isMandatory': instance.isMandatory,
      'respectParentDiscount': instance.respectParentDiscount,
      'selected_variant_id': instance.selected_variant_id,
      'selected_variant_name': instance.selected_variant_name,
      'priceInfo': instance.priceInfo,
    };

_$OrderAddonImpl _$$OrderAddonImplFromJson(Map<String, dynamic> json) =>
    _$OrderAddonImpl(
      id: json['id'] as String,
      name: json['name'] as String,
      priceInfo: PriceInfo.fromJson(json['priceInfo'] as Map<String, dynamic>),
      respectParentDiscount: json['respectParentDiscount'] as bool? ?? true,
    );

Map<String, dynamic> _$$OrderAddonImplToJson(_$OrderAddonImpl instance) =>
    <String, dynamic>{
      'id': instance.id,
      'name': instance.name,
      'priceInfo': instance.priceInfo,
      'respectParentDiscount': instance.respectParentDiscount,
    };

_$PriceInfoImpl _$$PriceInfoImplFromJson(Map<String, dynamic> json) =>
    _$PriceInfoImpl(
      basePrice: (json['basePrice'] as num?)?.toDouble() ?? 0.0,
      finalPrice: (json['finalPrice'] as num?)?.toDouble() ?? 0.0,
      discount: (json['discount'] as num?)?.toDouble() ?? 0.0,
    );

Map<String, dynamic> _$$PriceInfoImplToJson(_$PriceInfoImpl instance) =>
    <String, dynamic>{
      'basePrice': instance.basePrice,
      'finalPrice': instance.finalPrice,
      'discount': instance.discount,
    };

// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'order_models.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

OrderResponse _$OrderResponseFromJson(Map json) => OrderResponse(
      status: json['status'] as String,
      message: json['message'] as String?,
      data: json['data'] == null
          ? null
          : OrderData.fromJson(Map<String, dynamic>.from(json['data'] as Map)),
    );

Map<String, dynamic> _$OrderResponseToJson(OrderResponse instance) =>
    <String, dynamic>{
      'status': instance.status,
      'message': instance.message,
      'data': instance.data?.toJson(),
    };

OrderData _$OrderDataFromJson(Map json) => OrderData(
      id: json['id'] as String,
      orderNumber: json['orderNumber'] as String,
      orderStatus: json['orderStatus'] as String,
      tableId: json['tableId'] as String,
      restaurantId: json['restaurantId'] as String,
      sessionId: json['sessionId'] as String,
      createdAt: const TimestampConverter()
          .fromJson(json['createdAt'] as Map<String, dynamic>?),
      updatedAt: const TimestampConverter()
          .fromJson(json['updatedAt'] as Map<String, dynamic>?),
      total: (json['total'] as num).toDouble(),
      items: (json['items'] as List<dynamic>)
          .map((e) => OrderItem.fromJson(Map<String, dynamic>.from(e as Map)))
          .toList(),
      notes: json['notes'] as String,
      carts: (json['carts'] as List<dynamic>?)
              ?.map((e) =>
                  CartHistoryItem.fromJson(Map<String, dynamic>.from(e as Map)))
              .toList() ??
          [],
      appliedOffer: json['appliedOffer'] == null
          ? null
          : AppliedOrderOffer.fromJson(
              Map<String, dynamic>.from(json['appliedOffer'] as Map)),
      offerDiscount: (json['offerDiscount'] as num).toDouble(),
    );

Map<String, dynamic> _$OrderDataToJson(OrderData instance) => <String, dynamic>{
      'id': instance.id,
      'orderNumber': instance.orderNumber,
      'orderStatus': instance.orderStatus,
      'tableId': instance.tableId,
      'restaurantId': instance.restaurantId,
      'sessionId': instance.sessionId,
      'createdAt': const TimestampConverter().toJson(instance.createdAt),
      'updatedAt': const TimestampConverter().toJson(instance.updatedAt),
      'total': instance.total,
      'items': instance.items.map((e) => e.toJson()).toList(),
      'notes': instance.notes,
      'carts': instance.carts.map((e) => e.toJson()).toList(),
      'appliedOffer': instance.appliedOffer?.toJson(),
      'offerDiscount': instance.offerDiscount,
    };

CartHistoryItem _$CartHistoryItemFromJson(Map json) => CartHistoryItem(
      id: json['id'] as String,
      status: json['status'] as String,
      checkoutTime: const TimestampConverter()
          .fromJson(json['checkoutTime'] as Map<String, dynamic>?),
      total: (json['total'] as num).toDouble(),
      priceInfo: json['priceInfo'] == null
          ? null
          : CartPriceInfoDetail.fromJson(
              Map<String, dynamic>.from(json['priceInfo'] as Map)),
      items: (json['items'] as List<dynamic>)
          .map((e) => OrderItem.fromJson(Map<String, dynamic>.from(e as Map)))
          .toList(),
      notes: json['notes'] as String?,
      estimatedPrepTime: (json['estimatedPrepTime'] as num?)?.toInt(),
    );

Map<String, dynamic> _$CartHistoryItemToJson(CartHistoryItem instance) =>
    <String, dynamic>{
      'id': instance.id,
      'status': instance.status,
      'checkoutTime': const TimestampConverter().toJson(instance.checkoutTime),
      'total': instance.total,
      'priceInfo': instance.priceInfo?.toJson(),
      'items': instance.items.map((e) => e.toJson()).toList(),
      'notes': instance.notes,
      'estimatedPrepTime': instance.estimatedPrepTime,
    };

CartPriceInfoDetail _$CartPriceInfoDetailFromJson(Map json) =>
    CartPriceInfoDetail(
      basePrice: (json['basePrice'] as num).toDouble(),
      finalPrice: (json['finalPrice'] as num).toDouble(),
      discount: (json['discount'] as num).toDouble(),
      totalDiscountAmount: (json['totalDiscountAmount'] as num).toDouble(),
      totalVariantBasePrice: (json['totalVariantBasePrice'] as num).toDouble(),
      totalAddonBasePrice: (json['totalAddonBasePrice'] as num).toDouble(),
    );

Map<String, dynamic> _$CartPriceInfoDetailToJson(
        CartPriceInfoDetail instance) =>
    <String, dynamic>{
      'basePrice': instance.basePrice,
      'finalPrice': instance.finalPrice,
      'discount': instance.discount,
      'totalDiscountAmount': instance.totalDiscountAmount,
      'totalVariantBasePrice': instance.totalVariantBasePrice,
      'totalAddonBasePrice': instance.totalAddonBasePrice,
    };

OrderItem _$OrderItemFromJson(Map json) => OrderItem(
      menuItemId: json['menuItemId'] as String,
      name: json['name'] as String,
      quantity: (json['quantity'] as num).toInt(),
      price: (json['price'] as num).toDouble(),
      variants: (json['variants'] as List<dynamic>)
          .map(
              (e) => OrderVariant.fromJson(Map<String, dynamic>.from(e as Map)))
          .toList(),
      addons: (json['addons'] as List<dynamic>)
          .map((e) => OrderAddon.fromJson(Map<String, dynamic>.from(e as Map)))
          .toList(),
      cartItemId: json['cartItemId'] as String?,
    );

Map<String, dynamic> _$OrderItemToJson(OrderItem instance) => <String, dynamic>{
      'menuItemId': instance.menuItemId,
      'name': instance.name,
      'quantity': instance.quantity,
      'price': instance.price,
      'variants': instance.variants.map((e) => e.toJson()).toList(),
      'addons': instance.addons.map((e) => e.toJson()).toList(),
      'cartItemId': instance.cartItemId,
    };

OrderVariant _$OrderVariantFromJson(Map json) => OrderVariant(
      id: json['id'] as String,
      selected_variant_id: json['selected_variant_id'] as String,
      selected_variant_name: json['selected_variant_name'] as String,
      priceInfo: PriceInfo.fromJson(
          Map<String, dynamic>.from(json['priceInfo'] as Map)),
      isMandatory: json['isMandatory'] as bool,
      respectParentDiscount: json['respectParentDiscount'] as bool,
    );

Map<String, dynamic> _$OrderVariantToJson(OrderVariant instance) =>
    <String, dynamic>{
      'id': instance.id,
      'selected_variant_id': instance.selected_variant_id,
      'selected_variant_name': instance.selected_variant_name,
      'priceInfo': instance.priceInfo.toJson(),
      'isMandatory': instance.isMandatory,
      'respectParentDiscount': instance.respectParentDiscount,
    };

OrderAddon _$OrderAddonFromJson(Map json) => OrderAddon(
      id: json['id'] as String,
      name: json['name'] as String,
      priceInfo: PriceInfo.fromJson(
          Map<String, dynamic>.from(json['priceInfo'] as Map)),
      respectParentDiscount: json['respectParentDiscount'] as bool,
    );

Map<String, dynamic> _$OrderAddonToJson(OrderAddon instance) =>
    <String, dynamic>{
      'id': instance.id,
      'name': instance.name,
      'priceInfo': instance.priceInfo.toJson(),
      'respectParentDiscount': instance.respectParentDiscount,
    };

PriceInfo _$PriceInfoFromJson(Map json) => PriceInfo(
      basePrice: (json['basePrice'] as num).toDouble(),
      finalPrice: (json['finalPrice'] as num).toDouble(),
      discount: (json['discount'] as num).toDouble(),
    );

Map<String, dynamic> _$PriceInfoToJson(PriceInfo instance) => <String, dynamic>{
      'basePrice': instance.basePrice,
      'finalPrice': instance.finalPrice,
      'discount': instance.discount,
    };

AppliedOrderOffer _$AppliedOrderOfferFromJson(Map json) => AppliedOrderOffer(
      id: json['id'] as String,
      title: json['title'] as String,
      description: json['description'] as String,
      type: json['type'] as String,
      discountAmount: (json['discountAmount'] as num).toDouble(),
    );

Map<String, dynamic> _$AppliedOrderOfferToJson(AppliedOrderOffer instance) =>
    <String, dynamic>{
      'id': instance.id,
      'title': instance.title,
      'description': instance.description,
      'type': instance.type,
      'discountAmount': instance.discountAmount,
    };

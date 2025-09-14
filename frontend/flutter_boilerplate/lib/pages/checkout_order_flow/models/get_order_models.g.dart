// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'get_order_models.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_$GetOrderDataImpl _$$GetOrderDataImplFromJson(Map<String, dynamic> json) =>
    _$GetOrderDataImpl(
      id: json['id'] as String,
      orderNumber: json['orderNumber'] as String,
      orderStatus: json['orderStatus'] as String,
      createdAt: const FirestoreTimestampConverter()
          .fromJson(json['createdAt'] as Object),
      updatedAt: const FirestoreTimestampConverter()
          .fromJson(json['updatedAt'] as Object),
      tableId: json['tableId'] as String,
      restaurantId: json['restaurantId'] as String,
      sessionId: json['sessionId'] as String,
      total: json['total'] as num? ?? 0,
      items: (json['items'] as List<dynamic>?)
              ?.map((e) => GetOrderItem.fromJson(e as Map<String, dynamic>))
              .toList() ??
          const [],
      notes: json['notes'] as String?,
    );

Map<String, dynamic> _$$GetOrderDataImplToJson(_$GetOrderDataImpl instance) =>
    <String, dynamic>{
      'id': instance.id,
      'orderNumber': instance.orderNumber,
      'orderStatus': instance.orderStatus,
      'createdAt':
          const FirestoreTimestampConverter().toJson(instance.createdAt),
      'updatedAt':
          const FirestoreTimestampConverter().toJson(instance.updatedAt),
      'tableId': instance.tableId,
      'restaurantId': instance.restaurantId,
      'sessionId': instance.sessionId,
      'total': instance.total,
      'items': instance.items.map((e) => e.toJson()).toList(),
      'notes': instance.notes,
    };

_$GetOrderItemImpl _$$GetOrderItemImplFromJson(Map<String, dynamic> json) =>
    _$GetOrderItemImpl(
      menuItemId: json['menuItemId'] as String,
      name: json['name'] as String,
      quantity: (json['quantity'] as num?)?.toInt() ?? 1,
      price: json['price'] as num? ?? 0,
      variants: (json['variants'] as List<dynamic>?)
              ?.map((e) => GetOrderVariant.fromJson(e as Map<String, dynamic>))
              .toList() ??
          const [],
      addons: (json['addons'] as List<dynamic>?)
              ?.map((e) => GetOrderAddon.fromJson(e as Map<String, dynamic>))
              .toList() ??
          const [],
    );

Map<String, dynamic> _$$GetOrderItemImplToJson(_$GetOrderItemImpl instance) =>
    <String, dynamic>{
      'menuItemId': instance.menuItemId,
      'name': instance.name,
      'quantity': instance.quantity,
      'price': instance.price,
      'variants': instance.variants.map((e) => e.toJson()).toList(),
      'addons': instance.addons.map((e) => e.toJson()).toList(),
    };

_$GetOrderVariantImpl _$$GetOrderVariantImplFromJson(
        Map<String, dynamic> json) =>
    _$GetOrderVariantImpl(
      id: json['id'] as String,
      isMandatory: json['isMandatory'] as bool? ?? false,
      respectParentDiscount: json['respectParentDiscount'] as bool? ?? false,
      selectedVariantId: json['selected_variant_id'] as String,
      selectedVariantName: json['selected_variant_name'] as String,
      priceInfo: PriceInfo.fromJson(json['priceInfo'] as Map<String, dynamic>),
    );

Map<String, dynamic> _$$GetOrderVariantImplToJson(
        _$GetOrderVariantImpl instance) =>
    <String, dynamic>{
      'id': instance.id,
      'isMandatory': instance.isMandatory,
      'respectParentDiscount': instance.respectParentDiscount,
      'selected_variant_id': instance.selectedVariantId,
      'selected_variant_name': instance.selectedVariantName,
      'priceInfo': instance.priceInfo.toJson(),
    };

_$GetOrderAddonImpl _$$GetOrderAddonImplFromJson(Map<String, dynamic> json) =>
    _$GetOrderAddonImpl(
      id: json['id'] as String,
      name: json['name'] as String,
      respectParentDiscount: json['respectParentDiscount'] as bool? ?? false,
      priceInfo: PriceInfo.fromJson(json['priceInfo'] as Map<String, dynamic>),
    );

Map<String, dynamic> _$$GetOrderAddonImplToJson(_$GetOrderAddonImpl instance) =>
    <String, dynamic>{
      'id': instance.id,
      'name': instance.name,
      'respectParentDiscount': instance.respectParentDiscount,
      'priceInfo': instance.priceInfo.toJson(),
    };

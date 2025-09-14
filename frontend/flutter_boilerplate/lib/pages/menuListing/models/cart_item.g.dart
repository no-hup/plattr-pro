// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'cart_item.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_$CartItemImpl _$$CartItemImplFromJson(Map json) {
  $checkKeys(
    json,
    requiredKeys: const ['menuItemId'],
    disallowNullValues: const ['menuItemId'],
  );
  return _$CartItemImpl(
    menuItemId: json['menuItemId'] as String,
    cartItemId: _parseIntFlexible(json['cartItemId']),
    quantity:
        json['quantity'] == null ? 0 : _parseIntFlexibleZero(json['quantity']),
    priceInfo: json['priceInfo'] == null
        ? null
        : CartItemPriceInfo.fromJson(
            Map<String, dynamic>.from(json['priceInfo'] as Map)),
    selectedVariants: json['selectedVariantsDetails'] == null
        ? const []
        : const VariantSelectionListConverter()
            .fromJson(json['selectedVariantsDetails'] as List),
    selectedAddons: json['selectedAddonsDetails'] == null
        ? const []
        : const AddonSelectionListConverter()
            .fromJson(json['selectedAddonsDetails'] as List),
    name: json['name'] as String?,
    description: json['description'] as String?,
    image: json['image'] as String?,
    status: json['status'] as String?,
    statusUpdatedAt: json['statusUpdatedAt'] == null
        ? null
        : Timestamp.fromJson(
            Map<String, dynamic>.from(json['statusUpdatedAt'] as Map)),
    itemPrice: (json['itemPrice'] as num?)?.toDouble(),
    totalPrice: (json['totalPrice'] as num?)?.toDouble(),
  );
}

Map<String, dynamic> _$$CartItemImplToJson(_$CartItemImpl instance) =>
    <String, dynamic>{
      'menuItemId': instance.menuItemId,
      'cartItemId': instance.cartItemId,
      'quantity': instance.quantity,
      'priceInfo': instance.priceInfo?.toJson(),
      'selectedVariantsDetails': const VariantSelectionListConverter()
          .toJson(instance.selectedVariants),
      'selectedAddonsDetails':
          const AddonSelectionListConverter().toJson(instance.selectedAddons),
      'name': instance.name,
      'description': instance.description,
      'image': instance.image,
      'status': instance.status,
      'statusUpdatedAt': instance.statusUpdatedAt?.toJson(),
      'itemPrice': instance.itemPrice,
      'totalPrice': instance.totalPrice,
    };

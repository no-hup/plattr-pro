// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'cart.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_$CartImpl _$$CartImplFromJson(Map<String, dynamic> json) => _$CartImpl(
      restaurantId: json['restaurantId'] as String? ?? '',
      tableId: json['tableId'] as String? ?? '',
      items: (json['items'] as List<dynamic>?)
              ?.map((e) => CartItem.fromJson(e as Map<String, dynamic>))
              .toList() ??
          const [],
      priceInfo: json['priceInfo'] == null
          ? null
          : CartPriceInfo.fromJson(json['priceInfo'] as Map<String, dynamic>),
      sessionId: json['sessionId'] as String?,
      lastUpdated: json['lastUpdated'] as num?,
    );

Map<String, dynamic> _$$CartImplToJson(_$CartImpl instance) =>
    <String, dynamic>{
      'restaurantId': instance.restaurantId,
      'tableId': instance.tableId,
      'items': instance.items.map((e) => e.toJson()).toList(),
      'priceInfo': instance.priceInfo?.toJson(),
      'sessionId': instance.sessionId,
      'lastUpdated': instance.lastUpdated,
    };

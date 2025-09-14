// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'cart_response_data.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_$CartResponseDataImpl _$$CartResponseDataImplFromJson(
        Map<String, dynamic> json) =>
    _$CartResponseDataImpl(
      cart: Cart.fromJson(json['cart'] as Map<String, dynamic>),
    );

Map<String, dynamic> _$$CartResponseDataImplToJson(
        _$CartResponseDataImpl instance) =>
    <String, dynamic>{
      'cart': instance.cart.toJson(),
    };

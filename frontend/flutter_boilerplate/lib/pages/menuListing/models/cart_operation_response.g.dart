// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'cart_operation_response.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_$CartOperationResponseImpl _$$CartOperationResponseImplFromJson(
        Map<String, dynamic> json) =>
    _$CartOperationResponseImpl(
      message: json['message'] as String,
      status: json['status'] as String,
      data: const CartResponseDataConverter()
          .fromJson(json['data'] as Map<String, dynamic>?),
    );

Map<String, dynamic> _$$CartOperationResponseImplToJson(
        _$CartOperationResponseImpl instance) =>
    <String, dynamic>{
      'message': instance.message,
      'status': instance.status,
      'data': const CartResponseDataConverter().toJson(instance.data),
    };

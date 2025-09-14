// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'checkout_models.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_$CheckoutResponseImpl _$$CheckoutResponseImplFromJson(Map json) =>
    _$CheckoutResponseImpl(
      message: json['message'] as String,
      status: json['status'] as String,
      data:
          CheckoutData.fromJson(Map<String, dynamic>.from(json['data'] as Map)),
    );

Map<String, dynamic> _$$CheckoutResponseImplToJson(
        _$CheckoutResponseImpl instance) =>
    <String, dynamic>{
      'message': instance.message,
      'status': instance.status,
      'data': instance.data.toJson(),
    };

_$CheckoutDataImpl _$$CheckoutDataImplFromJson(Map json) => _$CheckoutDataImpl(
      orderId: json['orderId'] as String,
      orderNumber: json['orderNumber'] as String,
      orderStatus: json['orderStatus'] as String,
      timestamp:
          const DateTimeConverter().fromJson(json['timestamp'] as String),
    );

Map<String, dynamic> _$$CheckoutDataImplToJson(_$CheckoutDataImpl instance) =>
    <String, dynamic>{
      'orderId': instance.orderId,
      'orderNumber': instance.orderNumber,
      'orderStatus': instance.orderStatus,
      'timestamp': const DateTimeConverter().toJson(instance.timestamp),
    };

_$CheckoutErrorImpl _$$CheckoutErrorImplFromJson(Map json) =>
    _$CheckoutErrorImpl(
      code: json['code'] as String,
      message: json['message'] as String,
      details: json['details'] == null
          ? null
          : TableApiErrorDetails.fromJson(
              Map<String, dynamic>.from(json['details'] as Map)),
    );

Map<String, dynamic> _$$CheckoutErrorImplToJson(_$CheckoutErrorImpl instance) =>
    <String, dynamic>{
      'code': instance.code,
      'message': instance.message,
      'details': instance.details?.toJson(),
    };

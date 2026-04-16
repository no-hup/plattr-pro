// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'ui_flags.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

UiFlags _$UiFlagsFromJson(Map<String, dynamic> json) => UiFlags(
      showAllOrdersTab: json['showAllOrdersTab'] as bool? ?? true,
      maxItemsInOrderCard: (json['maxItemsInOrderCard'] as num?)?.toInt() ?? 3,
      confirmServeCartAction: json['confirmServeCartAction'] as bool? ?? true,
    );

Map<String, dynamic> _$UiFlagsToJson(UiFlags instance) => <String, dynamic>{
      'showAllOrdersTab': instance.showAllOrdersTab,
      'maxItemsInOrderCard': instance.maxItemsInOrderCard,
      'confirmServeCartAction': instance.confirmServeCartAction,
    };

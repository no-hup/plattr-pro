// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'timestamp.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_$TimestampImpl _$$TimestampImplFromJson(Map<String, dynamic> json) =>
    _$TimestampImpl(
      seconds: (json['_seconds'] as num).toInt(),
      nanoseconds: (json['_nanoseconds'] as num).toInt(),
    );

Map<String, dynamic> _$$TimestampImplToJson(_$TimestampImpl instance) =>
    <String, dynamic>{
      '_seconds': instance.seconds,
      '_nanoseconds': instance.nanoseconds,
    };

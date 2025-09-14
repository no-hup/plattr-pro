import 'package:freezed_annotation/freezed_annotation.dart';

part 'timestamp.freezed.dart';
part 'timestamp.g.dart';

@freezed
class Timestamp with _$Timestamp {
  @JsonSerializable(explicitToJson: true)
  factory Timestamp({
    @JsonKey(name: '_seconds') required int seconds,
    @JsonKey(name: '_nanoseconds') required int nanoseconds,
  }) = _Timestamp;

  factory Timestamp.fromJson(Map<String, dynamic> json) =>
      _$TimestampFromJson(json);
} 
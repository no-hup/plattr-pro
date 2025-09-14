import 'package:freezed_annotation/freezed_annotation.dart';

part 'price_info.freezed.dart';
part 'price_info.g.dart';

@freezed
class PriceInfo with _$PriceInfo {
  @JsonSerializable(explicitToJson: true)
  factory PriceInfo({
    required num basePrice,
    required num discount,
    required num finalPrice,
  }) = _PriceInfo;

  factory PriceInfo.fromJson(Map<String, dynamic> json) =>
      _$PriceInfoFromJson(json);
} 
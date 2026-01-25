import 'package:json_annotation/json_annotation.dart';

part 'price_info.g.dart';

@JsonSerializable(createToJson: true)
class PriceInfo {
  @JsonKey(required: true, disallowNullValue: true)
  final num basePrice;

  @JsonKey(required: true, disallowNullValue: true)
  final num finalPrice;

  @JsonKey(required: true, disallowNullValue: true)
  final num discount;

  PriceInfo({
    required this.basePrice,
    required this.finalPrice,
    required this.discount,
  });

  factory PriceInfo.fromJson(Map<String, dynamic> json) =>
      _$PriceInfoFromJson(json);
  Map<String, dynamic> toJson() => _$PriceInfoToJson(this);
}

import 'package:json_annotation/json_annotation.dart';

part 'price_info.g.dart';

@JsonSerializable()
class PriceInfo {
  final num basePrice;
  final num finalPrice;
  final num discount;

  PriceInfo({
    required this.basePrice,
    required this.finalPrice,
    required this.discount,
  });

  factory PriceInfo.fromJson(Map<String, dynamic> json) => _$PriceInfoFromJson(json);

  Map<String, dynamic> toJson() => _$PriceInfoToJson(this);
}

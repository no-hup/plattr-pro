import 'package:json_annotation/json_annotation.dart';

part 'price_info.g.dart';

@JsonSerializable()
class PriceInfo {
  @JsonKey(defaultValue: 0)
  final num basePrice;

  @JsonKey(defaultValue: 0)
  final num finalPrice;

  @JsonKey(defaultValue: 0)
  final num totalDiscount;

  @JsonKey(defaultValue: 0)
  final num totalDiscountAmount;

  /// Discount percentage (0-100). Backend sends totalDiscount instead.
  /// This field is optional for backward compatibility.
  @JsonKey(defaultValue: 0)
  final num discount;

  PriceInfo({
    this.basePrice = 0,
    this.finalPrice = 0,
    this.totalDiscount = 0,
    this.totalDiscountAmount = 0,
    this.discount = 0,
  });

  factory PriceInfo.fromJson(Map<String, dynamic> json) =>
      _$PriceInfoFromJson(json);

  Map<String, dynamic> toJson() => _$PriceInfoToJson(this);
}

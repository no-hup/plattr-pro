import 'package:freezed_annotation/freezed_annotation.dart';

part 'cart_price_info.freezed.dart';
part 'cart_price_info.g.dart';

@freezed
class CartPriceInfo with _$CartPriceInfo {
  @JsonSerializable(explicitToJson: true)
  factory CartPriceInfo({
    @Default(0) num? basePrice,
    @Default(0) num? finalPrice,
    @Default(0) num? totalDiscount,
    @Default(0) num? totalDiscountAmount,
    @Default(0) num? totalAddonBasePrice,
    @Default(0) num? totalVariantBasePrice,
  }) = _CartPriceInfo;

  factory CartPriceInfo.fromJson(Map<String, dynamic> json) =>
      _$CartPriceInfoFromJson(json);
} 
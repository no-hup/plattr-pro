import 'package:freezed_annotation/freezed_annotation.dart';

part 'cart_item_price_info.freezed.dart';
part 'cart_item_price_info.g.dart';

@freezed
class CartItemPriceInfo with _$CartItemPriceInfo {
  @JsonSerializable(explicitToJson: true)
  const factory CartItemPriceInfo({
    @Default(0) num itemBasePrice,
    @Default(0) num itemVariantBasePrice,
    @Default(0) num itemAddonBasePrice,
    @Default(0) num itemFinalPrice,
    @Default(0) num discount,
    @Default(0) num totalBasePrice,
    @Default(0) num totalVariantBasePrice,
    @Default(0) num totalAddonBasePrice,
    @Default(0) num finalPrice,
  }) = _CartItemPriceInfo;

  factory CartItemPriceInfo.fromJson(Map<String, dynamic> json) =>
      _$CartItemPriceInfoFromJson(json);
} 
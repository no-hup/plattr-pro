import 'package:freezed_annotation/freezed_annotation.dart';
import 'cart_item.dart';
import 'cart_price_info.dart';

part 'cart.freezed.dart';
part 'cart.g.dart';

@freezed
class Cart with _$Cart {
  @JsonSerializable(explicitToJson: true)
  factory Cart({
    @Default('') String? restaurantId,
    @Default('') String? tableId,
    @Default([]) List<CartItem> items,
    CartPriceInfo? priceInfo,
    String? sessionId,
    num? lastUpdated,
  }) = _Cart;

  factory Cart.fromJson(Map<String, dynamic> json) =>
      _$CartFromJson(json);
} 
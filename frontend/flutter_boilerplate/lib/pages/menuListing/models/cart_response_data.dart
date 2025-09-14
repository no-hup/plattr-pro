import 'package:freezed_annotation/freezed_annotation.dart';
import 'package:flutterboilerplate/singletonGods/logger.dart';
import 'cart.dart';

part 'cart_response_data.freezed.dart';
part 'cart_response_data.g.dart';

@freezed
class CartResponseData with _$CartResponseData {
  const CartResponseData._();  // Add a private constructor for custom methods
  
  @JsonSerializable(explicitToJson: true)
  factory CartResponseData({
    required Cart cart,
  }) = _CartResponseData;

  factory CartResponseData.fromJson(Map<String, dynamic> json) {
    try {
      // For debugging
      AppLogger.log('🔍 CART_DATA: Processing JSON with keys: ${json.keys.toList()}');
      
      if (json.containsKey('cart')) {
        try {
          // First try using the cart field directly
          final cartJson = json['cart'];
          if (cartJson is Map<String, dynamic>) {
            // First check if the cart field has all required fields
            final cart = Cart.fromJson(cartJson);
            return CartResponseData(cart: cart);
          }
        } catch (e) {
          AppLogger.log('⚠️ CART_DATA: Error parsing cart field directly: $e, falling back');
        }
      }
      
      // If no cart field or parsing failed, create a default empty cart
      return CartResponseData(
        cart: Cart(
          restaurantId: '',
          tableId: '',
          items: [],
        ),
      );
    } catch (e) {
      AppLogger.log('❌ Error in CartResponseData.fromJson: $e');
      return CartResponseData(
        cart: Cart(
          restaurantId: '',
          tableId: '',
          items: [],
        ),
      );
    }
  }
  
  // Add explicit toJson method
  Map<String, dynamic> toJson() {
    try {
      return {
        'cart': cart.toJson(),
      };
    } catch (e) {
      AppLogger.log('❌ CART_DATA: Error in CartResponseData.toJson: $e');
      return {'cart': {}};
    }
  }
} 
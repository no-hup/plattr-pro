import 'package:flutterboilerplate/singletonGods/logger.dart';
import 'package:freezed_annotation/freezed_annotation.dart';

import 'cart.dart';
import 'cart_item.dart';
import 'cart_price_info.dart';
import 'cart_response_data.dart';

part 'cart_operation_response.freezed.dart';
part 'cart_operation_response.g.dart';

/// Custom JsonConverter for CartResponseData
class CartResponseDataConverter extends JsonConverter<CartResponseData?, Map<String, dynamic>?> {
  const CartResponseDataConverter();
  
  @override
  CartResponseData? fromJson(Map<String, dynamic>? json) {
    if (json == null) return null;
    try {
      // First try direct conversion
      if (json.containsKey('cart')) {
        // Handle case where cart is already in expected format
        return CartResponseData.fromJson(json);
      }
      
      // If the JSON doesn't have a cart field but has items, create a cart
      if (json.containsKey('items') && json['items'] is List) {
        final cart = Cart(
          items: (json['items'] as List)
              .whereType<Map<String, dynamic>>()
              .map(CartItem.fromJson)
              .toList(),
        );
        return CartResponseData(cart: cart);
      }
      
      // Finally, just pass it to the standard deserialization
      return CartResponseData.fromJson(json);
    } catch (e) {
      AppLogger.log('❌ CartResponseDataConverter.fromJson error: $e');
      return CartResponseData(
        cart: Cart(items: []),
      );
    }
  }
  
  @override
  Map<String, dynamic>? toJson(CartResponseData? data) {
    if (data == null) return null;
    try {
      return {'cart': data.cart.toJson()};
    } catch (e) {
      AppLogger.log('❌ CartResponseDataConverter.toJson error: $e');
      return {'cart': {}};
    }
  }
}

@freezed
class CartOperationResponse with _$CartOperationResponse {
  @JsonSerializable(explicitToJson: true)
  factory CartOperationResponse({
    required String message,
    required String status,
    @CartResponseDataConverter()
    CartResponseData? data,
  }) = _CartOperationResponse;

  factory CartOperationResponse.fromJson(Map<String, dynamic> json) {
    AppLogger.log('🔍 CART_RESP: Starting CartOperationResponse.fromJson');
    
    try {
      // 1. Unwrap the result envelope if present (per schema)
      var resultJson = json;
      if (json.containsKey('result') && json['result'] is Map<String, dynamic>) {
        resultJson = json['result'] as Map<String, dynamic>;
        AppLogger.log('🔍 CART_RESP: Unwrapped result envelope');
      }
      
      // 2. Extract message and status with safe defaults
      final message = resultJson['message'] as String? ?? 'Success';
      final status = resultJson['status'] as String? ?? 'success';
      
      // 3. Process data field and cart
      CartResponseData? responseData;
      
      if (resultJson.containsKey('data') && resultJson['data'] is Map<String, dynamic>) {
        final dataJson = resultJson['data'] as Map<String, dynamic>;
        
        if (dataJson.containsKey('cart') && dataJson['cart'] is Map<String, dynamic>) {
          try {
            final cartJson = dataJson['cart'] as Map<String, dynamic>;
            AppLogger.log('🔍 CART_RESP: Found standard cart structure');
            
            // Extract cart fields with proper type handling
            final restaurantId = cartJson['restaurantId'] as String? ?? '';
            final tableId = cartJson['tableId'] as String? ?? '';
            final sessionId = cartJson['sessionId'] as String?;
            
            // Handle lastUpdated which could be number or timestamp string
            num? lastUpdated;
            if (cartJson.containsKey('lastUpdated')) {
              if (cartJson['lastUpdated'] is num) {
                lastUpdated = cartJson['lastUpdated'] as num;
              } else if (cartJson['lastUpdated'] is String) {
                // Try to convert ISO date string to timestamp if needed
                try {
                  final dateTime = DateTime.parse(cartJson['lastUpdated'] as String);
                  lastUpdated = dateTime.millisecondsSinceEpoch;
                  AppLogger.log('🔄 CART_RESP: Converted string timestamp to number');
                } catch (e) {
                  AppLogger.log('⚠️ CART_RESP: Could not parse timestamp string: ${cartJson['lastUpdated']}');
                }
              }
            }
            
            // Process cart items
            var items = <CartItem>[];
            if (cartJson.containsKey('items') && cartJson['items'] is List) {
              try {
                final itemsList = cartJson['items'] as List;
                items = itemsList
                    .whereType<Map<String, dynamic>>()
                    .map(CartItem.fromJson)
                    .toList();
                AppLogger.log('✅ CART_RESP: Successfully processed ${items.length} cart items');
              } catch (e) {
                AppLogger.log('❌ CART_RESP: Error processing cart items: $e');
                // Keep empty items list on error
              }
            }
            
            // Process price info
            CartPriceInfo? priceInfo;
            if (cartJson.containsKey('priceInfo') && cartJson['priceInfo'] is Map<String, dynamic>) {
              try {
                priceInfo = CartPriceInfo.fromJson(cartJson['priceInfo'] as Map<String, dynamic>);
              } catch (e) {
                AppLogger.log('❌ CART_RESP: Error parsing cart priceInfo: $e');
                // Create default price info
                priceInfo = CartPriceInfo(
                  
                );
              }
            }
            
            // Create cart and response data
            final cart = Cart(
              restaurantId: restaurantId,
              tableId: tableId,
              items: items,
              priceInfo: priceInfo,
              sessionId: sessionId,
              lastUpdated: lastUpdated,
            );
            
            responseData = CartResponseData(cart: cart);
            AppLogger.log('✅ CART_RESP: Successfully parsed cart');
          } catch (e) {
            AppLogger.log('❌ CART_RESP: Error parsing cart: $e');
            // Will use default fallback below
          }
        }
      }
      
      // 4. Create a default empty response if parsing failed
      if (responseData == null) {
        responseData = CartResponseData(
          cart: Cart(
            items: [],
            priceInfo: CartPriceInfo(
              
            ),
          ),
        );
        AppLogger.log('⚠️ CART_RESP: Using default empty cart');
      }
      
      // 5. Return the final response
      return CartOperationResponse(
        message: message,
        status: status,
        data: responseData,
      );
    } catch (e, stackTrace) {
      AppLogger.log('❌ CART_RESP: Error in CartOperationResponse.fromJson: $e');
      AppLogger.log('❌ CART_RESP: Stack trace: $stackTrace');
      
      // Basic fallback with empty cart
      return CartOperationResponse(
        message: 'Success',
        status: 'success',
        data: CartResponseData(
          cart: Cart(
            items: [],
            priceInfo: CartPriceInfo(
              
            ),
          ),
        ),
      );
    }
  }
} 

import 'package:dio/dio.dart';
import 'package:flutterboilerplate/models/api_response.dart';
import 'package:flutterboilerplate/pages/menuListing/menu_response.dart';
import 'package:flutterboilerplate/pages/menuListing/models/cart.dart';
import 'package:flutterboilerplate/pages/menuListing/models/cart_item.dart';
import 'package:flutterboilerplate/pages/menuListing/models/cart_operation_response.dart';
import 'package:flutterboilerplate/pages/menuListing/models/cart_price_info.dart';
import 'package:flutterboilerplate/pages/menuListing/models/cart_response_data.dart';
import 'package:flutterboilerplate/singletonGods/logger.dart';

class ResponseParser {
  /// Parses the menu response and adds categoryId to each menu item
  static ApiResponse<MenuData> parseMenuResponse(Response response) {
    // Log the entire response for debugging
    AppLogger.log('📡 Response Status: ${response.statusCode}');
    AppLogger.log('📡 Response Headers: ${response.headers}');
    AppLogger.log('📡 Response Data: ${response.data}');
    
    // Handle non-200 status codes
    if (response.statusCode != 200) {
      var errorMessage = 'Server error: ${response.statusCode}';
      final errorCode = 'HTTP_${response.statusCode}';
      Map<String, dynamic>? errorDetails;
      
      // Try to extract error details from the response if available
      if (response.data is Map<String, dynamic>) {
        final data = response.data as Map<String, dynamic>;
        
        // Extract error message if available
        if (data.containsKey('message')) {
          errorMessage = data['message'].toString();
        } else if (data.containsKey('error')) {
          // Some APIs nest error info
          if (data['error'] is Map<String, dynamic>) {
            final errorData = data['error'] as Map<String, dynamic>;
            if (errorData.containsKey('message')) {
              errorMessage = errorData['message'].toString();
            }
          } else if (data['error'] is String) {
            errorMessage = data['error'].toString();
          }
        }
        
        // Save the entire response as error details for debugging
        errorDetails = data;
      }
      
      AppLogger.log('❌ API Error: $errorMessage (Code: $errorCode)');
      return ApiResponse.error(
        errorMessage,
        errorCode: errorCode,
        errorDetails: errorDetails,
      );
    }

    try {
      if (response.data is! Map<String, dynamic>) {
        return ApiResponse.error(
          'Invalid response format: expected Map, got ${response.data.runtimeType}',
          errorCode: 'INVALID_FORMAT',
        );
      }
      
      final jsonResponse = response.data as Map<String, dynamic>;
      final menuResponse = MenuResponse.fromJson(jsonResponse);

      // Process menu items to add categoryId
      final processedMenuData = _processCategoryIds(menuResponse.result);
      return ApiResponse.success(processedMenuData);
    } catch (e) {
      AppLogger.log('❌ Parse Error: $e');
      return ApiResponse.error(
        'Failed to parse menu response: $e',
        errorCode: 'PARSE_ERROR',
      );
    }
  }

  /// Processes menu data to add categoryId to each menu item
  static MenuData _processCategoryIds(MenuData menuData) {
    final updatedMenuItems = <String, List<MenuItem>>{};

    for (final entry in menuData.menuItems.entries) {
      final categoryId = entry.key;
      final items = entry.value.map((item) {
        // Add categoryId to each menu item if it's not already set
        if (item.categoryId.isEmpty) {
          return item.copyWith(categoryId: categoryId);
        }
        return item;
      }).toList();
      updatedMenuItems[categoryId] = items;
    }

    return menuData.copyWith(menuItems: updatedMenuItems);
  }

  /// Parses the cart operation response
  static ApiResponse<CartOperationResponse> parseCartOperation(Response response) {
    // Log the entire response for debugging
    AppLogger.log('📡 Response Status: ${response.statusCode}');
    AppLogger.log('📡 Response Headers: ${response.headers}');
    AppLogger.log('📡 Response Data: ${response.data}');
    
    // Check if the API is returning an empty response or indicating an empty cart 
    if (response.data == null || response.data is String && (response.data as String).isEmpty) {
      AppLogger.log('⚠️ API returned an empty response, creating default empty cart');
      final defaultResponse = _createDefaultCartResponse();
      return ApiResponse.success(defaultResponse);
    }
    
    // SPECIAL CASE: Check if response might be directly returning items array
    if (response.data is List) {
      AppLogger.log('🔍 API returned a list, treating as direct items list');
      
      try {
        // Create cart items from the list
        final cartItems = _createCartItemsFromList(response.data as List);
        AppLogger.log('✅ Created ${cartItems.length} cart items from direct list');
        
        // Create a response with these items
        final cartResponse = _createCartResponseWithItems(cartItems);
        return ApiResponse.success(cartResponse);
      } catch (e) {
        AppLogger.log('❌ Error treating list as cart items: $e');
        // Continue with normal parsing
      }
    }
    
    // Handle non-200 status codes
    if (response.statusCode != 200) {
      var errorMessage = 'Server error: ${response.statusCode}';
      final errorCode = 'HTTP_${response.statusCode}';
      Map<String, dynamic>? errorDetails;
      
      // Try to extract error details from the response if available
      if (response.data is Map<String, dynamic>) {
        final data = response.data as Map<String, dynamic>;
        
        // Extract error message if available
        if (data.containsKey('message')) {
          errorMessage = data['message'].toString();
        } else if (data.containsKey('error')) {
          // Some APIs nest error info
          if (data['error'] is Map<String, dynamic>) {
            final errorData = data['error'] as Map<String, dynamic>;
            if (errorData.containsKey('message')) {
              errorMessage = errorData['message'].toString();
            }
          } else if (data['error'] is String) {
            errorMessage = data['error'].toString();
          }
        }
        
        // Save the entire response as error details for debugging
        errorDetails = data;
      }
      
      AppLogger.log('❌ API Error: $errorMessage (Code: $errorCode)');
      return ApiResponse.error(
        errorMessage,
        errorCode: errorCode,
        errorDetails: errorDetails,
      );
    }

    try {
      // First handle case where response.data is not a Map
      if (response.data is! Map<String, dynamic>) {
        AppLogger.log('⚠️ Response data is not a Map, type: ${response.data.runtimeType}');
        
        // Create a default successful response with empty cart
        final defaultResponse = _createDefaultCartResponse();
        return ApiResponse.success(defaultResponse);
      }
      
      // If we get here, response.data is a Map<String, dynamic>
      final jsonResponse = response.data as Map<String, dynamic>;
      AppLogger.log('🔍 Response keys: ${jsonResponse.keys.toList()}');
      
      // Check for result wrapper and unwrap if necessary
      final processedJson = _preprocessResponseJson(jsonResponse);
      AppLogger.log('🔍 Processed JSON keys: ${processedJson.keys.toList()}');
      
      // SPECIAL CASE: Check if the response might have items at the top level
      if (processedJson.containsKey('items') && processedJson['items'] is List) {
        AppLogger.log('🔍 Found items array at top level of response');
        try {
          final itemsList = processedJson['items'] as List;
          final cartItems = _createCartItemsFromList(itemsList);
          AppLogger.log('✅ Created ${cartItems.length} cart items from top-level items');
          
          // Insert these items into the cart structure
          if (!processedJson.containsKey('cart')) {
            processedJson['cart'] = {'items': itemsList};
            AppLogger.log('🔍 Created cart field with items');
          } else if (processedJson['cart'] is Map<String, dynamic>) {
            final cartMap = processedJson['cart'] as Map<String, dynamic>;
            if (!cartMap.containsKey('items')) {
              cartMap['items'] = itemsList;
              AppLogger.log('🔍 Added items to existing cart field');
            }
          }
        } catch (e) {
          AppLogger.log('❌ Error processing top-level items: $e');
        }
      }
      
      // Enhanced logging for data field
      if (processedJson.containsKey('data')) {
        AppLogger.log('🔍 Found data field in response: ${processedJson['data']}');
        if (processedJson['data'] is Map<String, dynamic>) {
          final dataMap = processedJson['data'] as Map<String, dynamic>;
          AppLogger.log('🔍 Data field is a Map with keys: ${dataMap.keys.toList()}');
          
          if (dataMap.containsKey('cart')) {
            AppLogger.log('🔍 Found cart field in data: ${dataMap['cart']}');
          } else {
            AppLogger.log('📡 No cart field in data map');
          }
        } else {
          AppLogger.log('📡 Data field is not a Map, type: ${processedJson['data'].runtimeType}');
        }
      } else {
        AppLogger.log('📡 No data field in processed JSON');
      }
      
      // Try to parse the response with our fixed models
      AppLogger.log('🔍 Calling CartOperationResponse.fromJson with processed JSON');
      final cartResponse = CartOperationResponse.fromJson(processedJson);
      
      // More detailed logging
      AppLogger.log('📦 CartOperationResponse created, status: ${cartResponse.status}, message: ${cartResponse.message}');
      AppLogger.log('📦 CartOperationResponse.data is ${cartResponse.data == null ? "null" : "not null"}');
      
      if (cartResponse.data != null) {
        AppLogger.log('📦 CartResponseData type: ${cartResponse.data!.runtimeType}');
        AppLogger.log('📦 Cart object: ${cartResponse.data!.cart}');
        AppLogger.log('📦 Cart items count: ${cartResponse.data!.cart.items.length}');
      } else {
        AppLogger.log('📡 CartResponseData is null');
        
        // Try to recover by creating a default response if data is null
        if (processedJson.containsKey('cart') && processedJson['cart'] is Map<String, dynamic>) {
          AppLogger.log('🔍 Found cart at top level, attempting to recover');
          try {
            final cartMap = processedJson['cart'] as Map<String, dynamic>;
            final cart = Cart.fromJson(cartMap);
            final recoveredResponse = CartOperationResponse(
              status: cartResponse.status,
              message: cartResponse.message,
              data: CartResponseData(cart: cart),
            );
            AppLogger.log('✅ Successfully recovered cart with ${cart.items.length} items');
            return ApiResponse.success(recoveredResponse);
          } catch (e) {
            AppLogger.log('❌ Error recovering cart: $e');
          }
        }
      }
      
      // Check for empty cart and log a warning
      if (cartResponse.data?.cart.items.isEmpty ?? false) {
        AppLogger.log('⚠️ Cart has 0 items after parsing. This might indicate a parsing issue.');
      }
      
      // Log the result
      AppLogger.log('✅ Created CartOperationResponse');
      AppLogger.log('✅ Has data: ${cartResponse.data != null}');
      
      if (cartResponse.data != null) {
        AppLogger.log('✅ Has cart: ${cartResponse.data!.cart != null}');
        AppLogger.log('✅ Cart items count: ${cartResponse.data!.cart.items.length}');
      }
      
      return ApiResponse.success(cartResponse);
    } catch (e) {
      AppLogger.log('❌ Parse Error: $e');
      AppLogger.log('❌ Parse Error stack: ${e is Error ? e.stackTrace : ""}');
      
      // Return a successful response with empty cart rather than an error
      AppLogger.log('⚠️ Creating fallback response with empty cart');
      final fallbackResponse = _createDefaultCartResponse();
      return ApiResponse.success(fallbackResponse);
    }
  }
  
  /// Helper to preprocess response JSON structure
  static Map<String, dynamic> _preprocessResponseJson(Map<String, dynamic> json) {
    // Check for result wrapper
    if (json.containsKey('result')) {
      AppLogger.log('🔍 CART_DEBUG_PARSER: Found result wrapper, extracting');
      final result = json['result'];
      if (result is Map<String, dynamic>) {
        AppLogger.log('🔍 CART_DEBUG_PARSER: Result JSON keys: ${result.keys.toList()}');
        return result;
      }
    }
    return json;
  }
  
  /// Helper to create cart items from a list
  static List<CartItem> _createCartItemsFromList(List itemsList) {
    return itemsList
        .whereType<Map<String, dynamic>>()
        .map(CartItem.fromJson)
        .toList();
  }
  
  /// Helper to create a default empty cart response
  static CartOperationResponse _createDefaultCartResponse() {
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
  
  /// Helper to create a cart response with provided items
  static CartOperationResponse _createCartResponseWithItems(List<CartItem> items) {
    return CartOperationResponse(
      message: 'Success',
      status: 'success',
      data: CartResponseData(
        cart: Cart(
          items: items,
          priceInfo: CartPriceInfo(
            
          ),
        ),
      ),
    );
  }
} 
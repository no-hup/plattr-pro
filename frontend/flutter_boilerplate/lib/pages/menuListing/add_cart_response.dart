import 'package:collection/collection.dart';
import 'package:flutterboilerplate/singletonGods/logger.dart'; // Import AppLogger
import 'package:freezed_annotation/freezed_annotation.dart';
import 'timestamp.dart';
import 'models/cart.dart';
import 'models/cart_item.dart';
import 'models/cart_operation_response.dart';
import 'models/cart_price_info.dart';
import 'models/cart_response_data.dart';
import 'models/variant_option.dart';
import 'models/variant_selection.dart';
import 'models/addon_selection.dart';
import 'models/price_info.dart';
import 'models/cart_item_price_info.dart';

// Error handling enums
enum CartOperationError { networkError, serverError, invalidItem, unknown }

// Cart operation result
class CartOperationResult {
  const CartOperationResult.failure(this.error, [this.message = ''])
      : success = false;

  const CartOperationResult.success([this.message = ''])
      : success = true,
        error = null;
  final bool success;
  final String message;
  final CartOperationError? error;
}

// Legacy classes for backward compatibility - to be removed after refactoring is complete
class AddToCartResponse {
  final String message;
  final String status;
  final CartData data;

  AddToCartResponse({
    required this.message,
    required this.status,
    required this.data,
  });

  factory AddToCartResponse.fromJson(Map<String, dynamic> json) {
    final result = json['result'] as Map<String, dynamic>;
    return AddToCartResponse(
      message: result['message'] as String,
      status: result['status'] as String,
      data: CartData.fromJson(result['data'] as Map<String, dynamic>),
    );
  }
}

class CartData {
  final Cart cart;

  CartData({required this.cart});

  factory CartData.fromJson(Map<String, dynamic> json) => CartData(
        cart: Cart.fromJson(json['cart'] as Map<String, dynamic>),
      );
}

class CartOperationResponse {
  CartOperationResponse({
    required this.message,
    required this.status,
    this.data,
  });

  factory CartOperationResponse.fromJson(Map<String, dynamic> json) {
    AppLogger.log('⚙️ CartOperationResponse.fromJson - keys: ${json.keys.toList()}');
    
    // Look for cart data anywhere in the response
    Map<String, dynamic>? dataField;
    
    // Case 1: Standard structure with 'data' key
    if (json.containsKey('data') && json['data'] is Map<String, dynamic>) {
      AppLogger.log('📦 Found standard data field');
      dataField = json['data'] as Map<String, dynamic>;
    } 
    // Case 2: Data is directly in the response (no 'data' key)
    else if (json.containsKey('cart')) {
      AppLogger.log('📦 Found cart directly in response');
      // Create a wrapper data structure
      dataField = {'cart': json['cart']};
    }
    // Case 3: Response indicates empty cart (special API return formats)
    else if (json.containsKey('message') && 
             (json['message']?.toString().toLowerCase().contains('empty') == true ||
              json['message']?.toString().toLowerCase().contains('no items') == true)) {
      AppLogger.log('📦 Response indicates empty cart');
      // Create a data field with an empty cart structure
      dataField = {
        'cart': {
          'restaurantId': json['restaurantId'] ?? '',
          'tableId': json['tableId'] ?? '',
          'items': [],
        }
      };
    }
    // Case 4: Look for nested cart in any field
    else {
      for (final key in json.keys) {
        final value = json[key];
        if (value is Map<String, dynamic> && value.containsKey('cart')) {
          AppLogger.log('📦 Found cart in nested field: $key');
          dataField = value;
          break;
        }
      }
      
      // Handle empty response object
      if (dataField == null && json.isEmpty) {
        AppLogger.log('⚠️ Empty JSON response, creating data with empty cart');
        dataField = {
          'cart': {
            'restaurantId': '',
            'tableId': '',
            'items': [],
          }
        };
      }
    }
    
    // Create the response
    return CartOperationResponse(
      message: json['message'] as String? ?? 'Success',
      status: json['status'] as String? ?? 'success',
      data: dataField != null
          ? CartResponseData.fromJson(dataField)
          : _createDefaultResponseData(), // Create default data instead of null
    );
  }
  
  // Helper method to create a default CartResponseData
  static CartResponseData _createDefaultResponseData() {
    AppLogger.log('⚠️ Creating default CartResponseData');
    return CartResponseData(
      cart: Cart(
        restaurantId: '',
        tableId: '',
        items: [],
        priceInfo: CartPriceInfo(
          basePrice: 0,
          finalPrice: 0,
          totalDiscount: 0,
          totalDiscountAmount: 0,
          totalAddonBasePrice: 0,
          totalVariantBasePrice: 0,
        ),
      ),
    );
  }

  final String message;
  final String status;
  final CartResponseData? data;

  bool get success => status == 'success';
}

class CartResponseDataLegacy {
  CartResponseDataLegacy({required this.cart});

  factory CartResponseDataLegacy.fromJson(Map<String, dynamic> json) {
    try {
      AppLogger.log('🔍 Parsing CartResponseData from: ${json.keys.toList()}');
      
      // SPECIAL CASE: If the response has items at the top level, we will use those
      // Some APIs might return items directly instead of nesting them in a cart object
      List<CartItem>? directItems;
      if (json.containsKey('items') && json['items'] is List) {
        AppLogger.log('🔍 Found direct items array, attempting to parse');
        try {
          directItems = (json['items'] as List)
              .where((item) => item is Map<String, dynamic>)
              .map((item) => CartItem.fromJson(item as Map<String, dynamic>))
              .toList();
          AppLogger.log('✅ Successfully parsed ${directItems.length} direct items');
        } catch (e) {
          AppLogger.log('❌ Error parsing direct items: $e');
        }
      }
      
      // Check for items in other possible locations
      if (directItems == null || directItems.isEmpty) {
        // Check if the response might have a "menuItems" or "cartItems" field
        for (final possibleKey in ['menuItems', 'cartItems', 'menu_items', 'cart_items', 'order_items']) {
          if (json.containsKey(possibleKey) && json[possibleKey] is List) {
            AppLogger.log('🔍 Found items array in alternate field: $possibleKey');
            try {
              directItems = (json[possibleKey] as List)
                  .where((item) => item is Map<String, dynamic>)
                  .map((item) => CartItem.fromJson(item as Map<String, dynamic>))
                  .toList();
              AppLogger.log('✅ Successfully parsed ${directItems.length} items from $possibleKey');
              break;
            } catch (e) {
              AppLogger.log('❌ Error parsing items from $possibleKey: $e');
            }
          }
        }
      }
      
      // Standard case: try to get cart object
      if (!json.containsKey('cart')) {
        AppLogger.log('⚠️ CartResponseData missing cart key, keys available: ${json.keys.toList()}');
        
        // Try to find a cart-like object in the response
        dynamic cartData = null;
        for (final key in json.keys) {
          if (json[key] is Map<String, dynamic> && (json[key] as Map<String, dynamic>).containsKey('items')) {
            AppLogger.log('🔍 Found potential cart object in key: $key');
            cartData = json[key];
            break;
          }
        }
        
        // If we have direct items but no cart, create a cart with those items
        if (directItems != null && directItems.isNotEmpty) {
          AppLogger.log('✅ Creating cart with directly parsed items');
          return CartResponseDataLegacy(
            cart: Cart(
              restaurantId: json['restaurantId'] as String? ?? '',
              tableId: json['tableId'] as String? ?? '',
              items: directItems,
              priceInfo: _createDefaultPriceInfo(json),
            ),
          );
        }
        
        if (cartData == null) {
          // Create an empty cart as last resort
          AppLogger.log('⚠️ Creating empty cart as fallback');
          return CartResponseDataLegacy(
            cart: Cart(
              restaurantId: json['restaurantId'] as String? ?? '',
              tableId: json['tableId'] as String? ?? '',
              items: [],
              priceInfo: _createDefaultPriceInfo(json),
            ),
          );
        } else {
          // Use the found cart-like object
          return CartResponseDataLegacy(
            cart: Cart.fromJson(cartData as Map<String, dynamic>),
          );
        }
      }
      
      // Check if the found cart has items, and if not, use our directly found items
      if (json['cart'] is Map<String, dynamic>) {
        final cartObject = json['cart'] as Map<String, dynamic>;
        if (!cartObject.containsKey('items') && directItems != null && directItems.isNotEmpty) {
          AppLogger.log('🔍 Cart object exists but has no items, using directly parsed items');
          cartObject['items'] = directItems;
        }
      }
      
      return CartResponseDataLegacy(
        cart: json['cart'] != null && json['cart'] is Map<String, dynamic>
            ? Cart.fromJson(json['cart'] as Map<String, dynamic>)
            : Cart(
                restaurantId: json['restaurantId'] as String? ?? '',
                tableId: json['tableId'] as String? ?? '',
                items: directItems ?? [],
                priceInfo: _createDefaultPriceInfo(json),
              ),
      );
    } catch (e) {
      // Log the error for debugging
      AppLogger.log('❌ Error parsing CartResponseData: $e');
      AppLogger.log('❌ Json was: $json');
      
      // Return a safe default value
      return CartResponseDataLegacy(
        cart: Cart(
          restaurantId: '',
          tableId: '',
          items: [],
          priceInfo: CartPriceInfo(
            basePrice: 0,
            finalPrice: 0,
            totalDiscount: 0,
            totalDiscountAmount: 0,
            totalAddonBasePrice: 0,
            totalVariantBasePrice: 0,
          ),
        ),
      );
    }
  }
  
  // Helper method to create default price info
  static CartPriceInfo _createDefaultPriceInfo(Map<String, dynamic> json) {
    if (json.containsKey('priceInfo') && json['priceInfo'] is Map<String, dynamic>) {
      try {
        return CartPriceInfo.fromJson(json['priceInfo'] as Map<String, dynamic>);
      } catch (e) {
        AppLogger.log('❌ Error parsing priceInfo: $e');
      }
    }
    
    return CartPriceInfo(
      basePrice: 0,
      finalPrice: 0,
      totalDiscount: 0,
      totalDiscountAmount: 0,
      totalAddonBasePrice: 0,
      totalVariantBasePrice: 0,
    );
  }

  final Cart cart;
}

class CartResponseLegacy {
  CartResponseLegacy({
    required this.success,
    this.message,
    this.data,
    this.priceInfo, // Added new property
  });

  factory CartResponseLegacy.fromJson(Map<String, dynamic> json) => CartResponseLegacy(
        success: json['success'] as bool, // Updated for strict type casting
        message: json['message'] as String?, // Updated for type casting
        data: json['data'] != null
            ? Cart.fromJson(
                json['data'] as Map<String, dynamic>) // Added type casting
            : null,
        priceInfo: json['priceInfo'] != null
            ? CartPriceInfo.fromJson(
                json['priceInfo'] as Map<String, dynamic>) // Added type casting
            : null,
      );
  final bool success;
  final String? message;
  final Cart? data;
  final CartPriceInfo? priceInfo; // Added new property
}

class CartLegacy {
  final String restaurantId;
  final String tableId;
  final List<CartItem> items;
  final CartPriceInfo? priceInfo;

  CartLegacy({
    required this.restaurantId,
    required this.tableId,
    required this.items,
    required this.priceInfo,
  });

  factory CartLegacy.fromJson(Map<String, dynamic> json) {
    AppLogger.log('🔍 Cart.fromJson - keys: ${json.keys.toList()}');
    
    // Handle 'items' field with more robust logic
    List<CartItem> parsedItems = [];
    
    // Case 1: Standard case - items is a list
    if (json.containsKey('items') && json['items'] is List) {
      AppLogger.log('📦 Found standard items list with ${(json['items'] as List).length} items');
      try {
        parsedItems = (json['items'] as List)
            .where((item) => item is Map<String, dynamic>) // Filter valid items
            .map((item) => CartItem.fromJson(item as Map<String, dynamic>))
            .toList();
        AppLogger.log('✅ Successfully parsed ${parsedItems.length} items');
      } catch (e) {
        AppLogger.log('❌ Error parsing items: $e');
      }
    }
    // Case 2: Items exists but is not a list
    else if (json.containsKey('items') && json['items'] != null) {
      AppLogger.log('⚠️ Items field exists but is not a list, type: ${json['items'].runtimeType}');
      // Try to handle alternate formats if needed
    }
    // Case 3: No items field at all
    else {
      AppLogger.log('⚠️ No items field found in cart JSON');
      
      // Check if we might be dealing with a different structure
      // For example, sometimes the whole object might be the cart items list
      if (json.containsKey('menuItemId') && json.containsKey('quantity')) {
        AppLogger.log('🔍 This JSON appears to be a single cart item, wrapping it');
        try {
          // This JSON might be a single cart item
          parsedItems = [CartItem.fromJson(json)];
          AppLogger.log('✅ Created items list with the single cart item');
        } catch (e) {
          AppLogger.log('❌ Error treating JSON as a single item: $e');
        }
      }
    }
    
    // Get other fields with null safety
    final restaurantId = json['restaurantId'] as String? ?? '';
    final tableId = json['tableId'] as String? ?? '';
    
    // Parse priceInfo if available
    CartPriceInfo? priceInfo;
    if (json.containsKey('priceInfo') && json['priceInfo'] is Map<String, dynamic>) {
      try {
        priceInfo = CartPriceInfo.fromJson(json['priceInfo'] as Map<String, dynamic>);
      } catch (e) {
        AppLogger.log('❌ Error parsing priceInfo: $e');
      }
    }
    
    // Create default priceInfo if none exists
    priceInfo ??= CartPriceInfo(
      basePrice: 0,
      finalPrice: 0,
      totalDiscount: 0,
      totalDiscountAmount: 0,
      totalAddonBasePrice: 0,
      totalVariantBasePrice: 0,
    );
    
    return CartLegacy(
      restaurantId: restaurantId,
      tableId: tableId,
      items: parsedItems,
      priceInfo: priceInfo,
    );
  }

  CartLegacy copyWith({
    List<CartItem>? items,
    CartPriceInfo? priceInfo,
  }) =>
      CartLegacy(
        restaurantId: restaurantId,
        tableId: tableId,
        items: items ?? this.items,
        priceInfo: priceInfo ?? this.priceInfo,
      );
}

class CartItemLegacy {
  final String menuItemId;
  final int quantity;
  final Map<String, String>? selectedVariants;
  final List<String>? selectedAddons;
  final double? itemPrice;
  final double? totalPrice;
  final CartItemPriceInfo? priceInfo;

  CartItemLegacy({
    required this.menuItemId,
    required this.quantity,
    this.selectedVariants,
    this.selectedAddons,
    this.itemPrice,
    this.totalPrice,
    this.priceInfo,
  });

  factory CartItemLegacy.fromJson(Map<String, dynamic> json) {
    try {
      AppLogger.log('🔍 Parsing CartItem with keys: ${json.keys.toList()}');
      
      // Check which type of ID is used by the API
      String itemId = '';
      if (json.containsKey('menuItemId')) {
        itemId = json['menuItemId'].toString();
      } else if (json.containsKey('itemId')) {
        itemId = json['itemId'].toString();
      } else if (json.containsKey('id')) {
        itemId = json['id'].toString();
      }
      
      // Check how quantity is represented
      int quantity = 1; // Default to 1 if not found
      if (json.containsKey('quantity')) {
        if (json['quantity'] is int) {
          quantity = json['quantity'] as int;
        } else if (json['quantity'] is String) {
          quantity = int.tryParse(json['quantity'] as String) ?? 1;
        } else if (json['quantity'] is double) {
          quantity = (json['quantity'] as double).toInt();
        }
      } else if (json.containsKey('qty')) {
        if (json['qty'] is int) {
          quantity = json['qty'] as int;
        } else if (json['qty'] is String) {
          quantity = int.tryParse(json['qty'] as String) ?? 1;
        } else if (json['qty'] is double) {
          quantity = (json['qty'] as double).toInt();
        }
      }
      
      // Handle variants - check for different formats
      Map<String, String>? selectedVariants;
      if (json.containsKey('selectedVariants') && json['selectedVariants'] != null) {
        if (json['selectedVariants'] is Map) {
          selectedVariants = (json['selectedVariants'] as Map).map(
            (key, value) => MapEntry(key.toString(), value.toString()),
          );
        } else if (json['selectedVariants'] is List) {
          // Handle variant list format
          selectedVariants = {};
          for (final variant in json['selectedVariants'] as List) {
            if (variant is Map) {
              if (variant.containsKey('id') && variant.containsKey('value')) {
                selectedVariants[variant['id'].toString()] = variant['value'].toString();
              } else if (variant.containsKey('name') && variant.containsKey('option')) {
                selectedVariants[variant['name'].toString()] = variant['option'].toString();
              }
            }
          }
        }
      } else if (json.containsKey('variants') && json['variants'] != null) {
        // Alternative variants field name
        if (json['variants'] is Map) {
          selectedVariants = (json['variants'] as Map).map(
            (key, value) => MapEntry(key.toString(), value.toString()),
          );
        } else if (json['variants'] is List) {
          // Handle variant list format
          selectedVariants = {};
          for (final variant in json['variants'] as List) {
            if (variant is Map) {
              if (variant.containsKey('id') && variant.containsKey('value')) {
                selectedVariants[variant['id'].toString()] = variant['value'].toString();
              } else if (variant.containsKey('name') && variant.containsKey('option')) {
                selectedVariants[variant['name'].toString()] = variant['option'].toString();
              }
            }
          }
        }
      }
      
      // Handle addons - check for different formats
      List<String>? selectedAddons;
      if (json.containsKey('selectedAddons') && json['selectedAddons'] != null) {
        if (json['selectedAddons'] is List) {
          selectedAddons = (json['selectedAddons'] as List)
              .map((e) => e.toString())
              .toList();
        }
      } else if (json.containsKey('addons') && json['addons'] != null) {
        if (json['addons'] is List) {
          selectedAddons = (json['addons'] as List)
              .map((e) => e.toString())
              .toList();
        }
      }
      
      // Handle price fields
      double? itemPrice;
      if (json.containsKey('itemPrice')) {
        itemPrice = _parseDoubleValue(json['itemPrice']);
      } else if (json.containsKey('price')) {
        itemPrice = _parseDoubleValue(json['price']);
      } else if (json.containsKey('unitPrice')) {
        itemPrice = _parseDoubleValue(json['unitPrice']);
      }
      
      double? totalPrice;
      if (json.containsKey('totalPrice')) {
        totalPrice = _parseDoubleValue(json['totalPrice']);
      } else if (json.containsKey('total')) {
        totalPrice = _parseDoubleValue(json['total']);
      } else if (itemPrice != null) {
        totalPrice = itemPrice * quantity;
      }
      
      // Handle price info
      CartItemPriceInfo? priceInfo;
      if (json.containsKey('priceInfo') && json['priceInfo'] is Map<String, dynamic>) {
        try {
          priceInfo = CartItemPriceInfo.fromJson(json['priceInfo'] as Map<String, dynamic>);
        } catch (e) {
          AppLogger.log('❌ Error parsing priceInfo: $e');
        }
      }
      
      return CartItemLegacy(
        menuItemId: itemId,
        quantity: quantity,
        selectedVariants: selectedVariants,
        selectedAddons: selectedAddons,
        itemPrice: itemPrice,
        totalPrice: totalPrice,
        priceInfo: priceInfo,
      );
    } catch (e) {
      AppLogger.log('❌ Error parsing CartItem: $e');
      return CartItemLegacy(
        menuItemId: json['menuItemId']?.toString() ?? '',
        quantity: 1,
      );
    }
  }
  
  // Helper to parse double values from various formats
  static double? _parseDoubleValue(dynamic value) {
    if (value == null) return null;
    
    if (value is num) {
      return value.toDouble();
    } else if (value is String) {
      return double.tryParse(value);
    }
    
    return null;
  }

  CartItemLegacy copyWith({
    int? quantity,
    Map<String, String>? selectedVariants,
    List<String>? selectedAddons,
    double? itemPrice,
    double? totalPrice,
  }) =>
      CartItemLegacy(
        menuItemId: menuItemId,
        quantity: quantity ?? this.quantity,
        selectedVariants: selectedVariants ?? this.selectedVariants,
        selectedAddons: selectedAddons ?? this.selectedAddons,
        itemPrice: itemPrice ?? this.itemPrice,
        totalPrice: totalPrice ?? this.totalPrice,
        priceInfo: priceInfo,
      );
      
  @override
  bool operator ==(Object other) {
    if (identical(this, other)) return true;
    
    return other is CartItemLegacy &&
        other.menuItemId == menuItemId &&
        other.quantity == quantity &&
        (other.selectedVariants == null && selectedVariants == null ||
            other.selectedVariants != null && selectedVariants != null &&
            const MapEquality<String, String>().equals(
                other.selectedVariants!, selectedVariants!)) &&
        (other.selectedAddons == null && selectedAddons == null ||
            other.selectedAddons != null && selectedAddons != null &&
            const ListEquality<String>().equals(
                other.selectedAddons!, selectedAddons!)) &&
        other.itemPrice == itemPrice &&
        other.totalPrice == totalPrice;
  }

  @override
  int get hashCode {
    final selectedVariantsHash = selectedVariants == null
        ? 0
        : const MapEquality<String, String>().hash(selectedVariants!);
        
    final selectedAddonsHash = selectedAddons == null
        ? 0
        : const ListEquality<String>().hash(selectedAddons!);
        
    return Object.hash(
      menuItemId,
      quantity,
      selectedVariantsHash,
      selectedAddonsHash,
      itemPrice,
      totalPrice,
    );
  }
}

class PriceInfoLegacy {
  final double basePrice;
  final double discount;
  final double finalPrice;

  PriceInfoLegacy({
    required this.basePrice,
    required this.discount,
    required this.finalPrice,
  });

  factory PriceInfoLegacy.fromJson(Map<String, dynamic> json) => PriceInfoLegacy(
        basePrice: (json['basePrice'] as num).toDouble(),
        discount: (json['discount'] as num).toDouble(),
        finalPrice: (json['finalPrice'] as num).toDouble(),
      );
}

// Request models for cart operations
class AddToCartRequest {
  final String tableId;
  final String restaurantId;
  final String menuItemId;
  final int quantity;
  final Map<String, String>? selectedVariants;
  final List<String>? selectedAddons;

  AddToCartRequest({
    required this.tableId,
    required this.restaurantId,
    required this.menuItemId,
    required this.quantity,
    this.selectedVariants,
    this.selectedAddons,
  });

  Map<String, dynamic> toJson() => {
        'tableId': tableId,
        'restaurantId': restaurantId,
        'menuItemId': menuItemId,
        'quantity': quantity,
        if (selectedVariants != null && selectedVariants!.isNotEmpty)
          'selectedVariants': selectedVariants,
        if (selectedAddons != null && selectedAddons!.isNotEmpty)
          'selectedAddons': selectedAddons,
      };
}

class RemoveFromCartRequest {
  final String tableId;
  final String restaurantId;
  final String menuItemId;
  final int quantity;
  final Map<String, String>? selectedVariants;
  final List<String>? selectedAddons;

  RemoveFromCartRequest({
    required this.tableId,
    required this.restaurantId,
    required this.menuItemId,
    required this.quantity,
    this.selectedVariants,
    this.selectedAddons,
  });

  Map<String, dynamic> toJson() => {
        'tableId': tableId,
        'restaurantId': restaurantId,
        'menuItemId': menuItemId,
        'quantity': quantity,
        if (selectedVariants != null && selectedVariants!.isNotEmpty)
          'selectedVariants': selectedVariants,
        if (selectedAddons != null && selectedAddons!.isNotEmpty)
          'selectedAddons': selectedAddons,
      };
}

import 'package:flutterboilerplate/pages/menuListing/menu_response.dart';
import 'package:flutterboilerplate/pages/menuListing/models/addon_selection.dart';
import 'package:flutterboilerplate/pages/menuListing/models/cart_item.dart';
import 'package:flutterboilerplate/pages/menuListing/models/cart_item_price_info.dart';
import 'package:flutterboilerplate/pages/menuListing/models/variant_option.dart' as model;
import 'package:flutterboilerplate/pages/menuListing/models/variant_selection.dart';
import 'package:flutterboilerplate/singletonGods/logger.dart';

/// Helper class to sanitize and safely parse cart data
class CartHelper {
  
  /// Safely parse a cart item from JSON with extensive error handling
  static CartItem safeParseCartItem(Map<String, dynamic> json) {
    try {
      AppLogger.log('🔄 CART_HELPER: Parsing cart item with keys: ${json.keys.toList()}');
      
      // Handle required fields with safe null checks
      final menuItemId = _safelyGetValue(json, ['menuItemId', 'itemId', 'id'], '') ?? '';
      AppLogger.log('🔄 CART_HELPER: Resolved menuItemId: $menuItemId');
      
      if (menuItemId.isEmpty) {
        AppLogger.log('❌ CART_HELPER: Critical error - Empty menuItemId, cannot parse item');
        throw Exception('Missing menuItemId in cart item');
      }
      
      // Handle quantities safely
      var quantity = 1;
      if (json.containsKey('quantity')) {
        quantity = _parseIntValue(json['quantity']) ?? 1;
      } else if (json.containsKey('qty')) {
        quantity = _parseIntValue(json['qty']) ?? 1;
      }
      AppLogger.log('🔄 CART_HELPER: Resolved quantity: $quantity');
      
      // Parse price info first to detect and log pricing issues
      final priceInfo = _parsePriceInfo(json);
      if (priceInfo != null) {
        AppLogger.log('🔄 CART_HELPER: Successfully parsed priceInfo - ' 'basePrice: ${priceInfo.itemBasePrice}, ' 'finalPrice: ${priceInfo.finalPrice}',);
      } else {
        AppLogger.log('⚠️ CART_HELPER: No priceInfo available or parsing failed');
      }
      
      // Parse variants and addons
      final variants = _parseVariantSelections(json);
      AppLogger.log('🔄 CART_HELPER: Parsed variants: ${variants.length} entries');
      
      final addons = _parseAddonSelections(json);
      AppLogger.log('🔄 CART_HELPER: Parsed addons: ${addons.length} items');
      
      // Add legacy item price and total price if available
      final itemPrice = _parseDoubleValue(json['itemPrice'] ?? json['price'] ?? json['unitPrice']);
      final totalPrice = _parseDoubleValue(json['totalPrice'] ?? json['total']);
      
      // Create a sanitized cart item
      final result = CartItem(
        menuItemId: menuItemId,
        quantity: quantity,
        name: _safelyGetValue(json, ['name', 'itemName', 'title'], null),
        description: _safelyGetValue(json, ['description', 'desc'], null),
        image: _safelyGetValue(json, ['image', 'imageUrl'], null),
        priceInfo: priceInfo,
        selectedVariants: variants,
        selectedAddons: addons,
        itemPrice: itemPrice,
        totalPrice: totalPrice,
      );
      
      AppLogger.log('✅ CART_HELPER: Successfully parsed cart item: ${result.menuItemId}, qty: ${result.quantity}');
      
      // Check if the parsed item is "valid" for display
      final isValid = result.name != null && result.name!.isNotEmpty && result.priceInfo != null;
      if (!isValid) {
        AppLogger.log('⚠️ CART_HELPER: Created item is missing essential data (name or price), needs menu data supplement');
      }
      
      return result;
    } catch (e) {
      AppLogger.log('❌ CART_HELPER: Error parsing cart item: $e');
      
      // Create a fallback minimal cart item to avoid errors
      try {
        final menuItemId = json['menuItemId']?.toString() ?? 
                                 json['itemId']?.toString() ?? 
                                 json['id']?.toString() ?? '';
        AppLogger.log('🔄 CART_HELPER: Creating fallback item with ID: $menuItemId');
        
        return CartItem(
          menuItemId: menuItemId,
          quantity: _parseIntValue(json['quantity']) ?? 1,
        );
      } catch (fallbackError) {
        AppLogger.log('❌ CART_HELPER: Even fallback creation failed: $fallbackError');
        // Ultimate fallback with empty values
        return const CartItem(
          menuItemId: '',
          quantity: 1,
        );
      }
    }
  }
  
  /// Repair a cart item using menu item data
  static CartItem repairWithMenuItem(CartItem item, MenuItem menuItem) {
    AppLogger.log('🔧 CART_HELPER: Repairing cart item ${item.menuItemId} with menu data');
    
    try {
      // Create a new price info if needed
      final priceInfo = item.priceInfo ?? CartItemPriceInfo(
        itemBasePrice: menuItem.priceInfo.basePrice ?? 0,
        itemFinalPrice: menuItem.priceInfo.finalPrice ?? 0,
        finalPrice: (menuItem.priceInfo.finalPrice ?? 0) * (item.quantity),
        totalBasePrice: (menuItem.priceInfo.basePrice ?? 0) * (item.quantity),
        discount: menuItem.priceInfo.discount ?? 0,
      );
      
      // Fill the gaps, keep everything else. Rebuilding this field by field is how
      // `addedBy` (whose item it is) and `status` (where the kitchen has got to) went
      // missing: a repair is supposed to supply what the wire left out, not quietly
      // drop what it sent. copyWith means the next field added to CartItem survives
      // this path without anyone remembering to come back here.
      final repairedItem = item.copyWith(
        name: item.name ?? menuItem.meta.name,
        description: item.description ?? menuItem.meta.description,
        image: item.image ?? menuItem.meta.image,
        priceInfo: priceInfo,
        itemPrice: item.itemPrice ?? menuItem.priceInfo.basePrice.toDouble(),
        totalPrice: item.totalPrice ?? (menuItem.priceInfo.finalPrice.toDouble() ?? 0) * item.quantity,
      );
      
      AppLogger.log('✅ CART_HELPER: Successfully repaired cart item with menu data');
      return repairedItem;
    } catch (e) {
      AppLogger.log('❌ CART_HELPER: Error repairing cart item with menu data: $e');
      // Return the original item if repair fails
      return item;
    }
  }
  
  /// Parse variant selections from different formats
  static List<VariantSelection> _parseVariantSelections(Map<String, dynamic> json) {
    final variants = <VariantSelection>[];
    
    try {
      if (json.containsKey('selectedVariantsDetails') && json['selectedVariantsDetails'] is List) {
        final variantsList = json['selectedVariantsDetails'] as List;
        for (final item in variantsList) {
          if (item is Map<String, dynamic>) {
            final optionId = item['selected_variant_id'] as String? ?? '';
            final optionName = item['selected_variant_name'] as String? ?? '';
            final priceInfo = item['priceInfo'] as Map<String, dynamic>? ?? {};
            final optionPrice = priceInfo['itemFinalPrice'] as num? ?? 
                                priceInfo['itemBasePrice'] as num? ?? 0;
            
            variants.add(VariantSelection(
              variantId: item['id'] as String? ?? '',
              optionId: optionId,
              name: item['name'] as String? ?? '',
              selectedOption: model.VariantOption(
                id: optionId,
                name: optionName,
                price: optionPrice,
              ),
            ),);
          }
        }
        AppLogger.log('🔄 CART_HELPER: Parsed ${variants.length} variant selections');
      }
      // Handle old format (Map<String, String>)
      else if (json.containsKey('selectedVariants') && json['selectedVariants'] is Map) {
        final variantsMap = json['selectedVariants'] as Map;
        for (final entry in variantsMap.entries) {
          final variantId = entry.key.toString();
          final optionId = entry.value.toString();
          
          variants.add(VariantSelection(
            variantId: variantId,
            optionId: optionId,
            name: variantId, // Default name to ID if no better info available
            selectedOption: model.VariantOption(
              id: optionId,
              name: optionId, // Default name to ID if no better info available
              price: 0, // No price info in this format
            ),
          ),);
        }
        AppLogger.log('🔄 CART_HELPER: Parsed ${variants.length} legacy variant selections');
      }
    } catch (e) {
      AppLogger.log('⚠️ CART_HELPER: Error parsing variant selections: $e');
    }
    
    return variants;
  }
  
  /// Parse addon selections from different formats
  static List<AddonSelection> _parseAddonSelections(Map<String, dynamic> json) {
    final addons = <AddonSelection>[];
    
    try {
      if (json.containsKey('selectedAddonsDetails') && json['selectedAddonsDetails'] is List) {
        final addonsList = json['selectedAddonsDetails'] as List;
        for (final item in addonsList) {
          if (item is Map<String, dynamic>) {
            final priceInfo = item['priceInfo'] as Map<String, dynamic>? ?? {};
            final addonPrice = priceInfo['itemFinalPrice'] as num? ?? 
                               priceInfo['itemBasePrice'] as num? ?? 0;
            
            addons.add(AddonSelection(
              addonId: item['id'] as String? ?? '',
              name: item['name'] as String? ?? '',
              price: addonPrice,
            ),);
          }
        }
        AppLogger.log('🔄 CART_HELPER: Parsed ${addons.length} addon selections');
      }
      // Handle old format (List<String>)
      else if (json.containsKey('selectedAddons') && json['selectedAddons'] is List) {
        final addonsList = json['selectedAddons'] as List;
        for (final addonId in addonsList) {
          addons.add(AddonSelection(
            addonId: addonId.toString(),
            name: addonId.toString(), // Default name to ID if no better info available
            price: 0, // No price info in this format
          ),);
        }
        AppLogger.log('🔄 CART_HELPER: Parsed ${addons.length} legacy addon selections');
      }
    } catch (e) {
      AppLogger.log('⚠️ CART_HELPER: Error parsing addon selections: $e');
    }
    
    return addons;
  }
  
  /// Parse price info safely
  static CartItemPriceInfo? _parsePriceInfo(Map<String, dynamic> json) {
    if (json.containsKey('priceInfo') && json['priceInfo'] is Map<String, dynamic>) {
      try {
        AppLogger.log('🔄 CART_HELPER: Found priceInfo field, attempting to parse');
        final priceInfoJson = json['priceInfo'] as Map<String, dynamic>;
        // Log keys to help debug
        AppLogger.log('🔄 CART_HELPER: PriceInfo keys: ${priceInfoJson.keys.toList()}');
        
        return CartItemPriceInfo.fromJson(priceInfoJson);
      } catch (e) {
        AppLogger.log('⚠️ CART_HELPER: Error parsing priceInfo object: $e');
        // Create a fallback price info based on itemPrice and totalPrice
        final basePrice = _parseDoubleValue(json['itemPrice'] ?? json['price'] ?? json['unitPrice']);
        var totalPrice = _parseDoubleValue(json['totalPrice'] ?? json['total']);
        final quantity = _parseIntValue(json['quantity'] ?? json['qty']) ?? 1;
        
        AppLogger.log('🔄 CART_HELPER: Creating fallback priceInfo with basePrice: $basePrice, qty: $quantity');
        
        if (basePrice != null) {
          totalPrice ??= basePrice * quantity;
          
          return CartItemPriceInfo(
            itemBasePrice: basePrice,
            itemFinalPrice: basePrice,
            finalPrice: totalPrice,
            totalBasePrice: totalPrice,
          );
        } else {
          AppLogger.log('⚠️ CART_HELPER: Cannot create fallback priceInfo - no price data available');
        }
      }
    } else {
      AppLogger.log('⚠️ CART_HELPER: No priceInfo field in JSON');
      
      // Try to create a price info object from direct price fields
      final basePrice = _parseDoubleValue(json['itemPrice'] ?? json['price'] ?? json['unitPrice']);
      var totalPrice = _parseDoubleValue(json['totalPrice'] ?? json['total']);
      final quantity = _parseIntValue(json['quantity'] ?? json['qty']) ?? 1;
      
      if (basePrice != null) {
        AppLogger.log('🔄 CART_HELPER: Creating priceInfo from direct price fields');
        totalPrice ??= basePrice * quantity;
        
        return CartItemPriceInfo(
          itemBasePrice: basePrice,
          itemFinalPrice: basePrice,
          finalPrice: totalPrice,
          totalBasePrice: totalPrice,
        );
      }
    }
    
    return null;
  }
  
  /// Try to get a value from multiple possible keys
  static T? _safelyGetValue<T>(Map<String, dynamic> json, List<String> possibleKeys, T? defaultValue) {
    for (final key in possibleKeys) {
      if (json.containsKey(key) && json[key] != null) {
        try {
          return json[key] as T;
        } catch (e) {
          // Try next key
          continue;
        }
      }
    }
    return defaultValue;
  }
  
  /// Parse double value safely
  static double? _parseDoubleValue(dynamic value) {
    if (value == null) return null;
    
    try {
      if (value is double) return value;
      if (value is int) return value.toDouble();
      if (value is String) return double.tryParse(value);
      if (value is num) return value.toDouble();
    } catch (e) {
      AppLogger.log('⚠️ CART_HELPER: Error parsing double value: $e');
    }
    
    return null;
  }
  
  /// Parse int value safely
  static int? _parseIntValue(dynamic value) {
    if (value == null) return null;
    
    try {
      if (value is int) return value;
      if (value is double) return value.toInt();
      if (value is String) return int.tryParse(value);
      if (value is num) return value.toInt();
    } catch (e) {
      AppLogger.log('⚠️ CART_HELPER: Error parsing int value: $e');
    }
    
    return null;
  }
  
  // Helper methods used in CartItem class
  static int? _parseIntFlexible(dynamic value) {
    if (value == null) return null;
    if (value is int) return value;
    if (value is double) return value.toInt();
    if (value is String) return int.tryParse(value);
    return null;
  }

  static int _parseIntFlexibleZero(dynamic value) {
    return _parseIntFlexible(value) ?? 0;
  }
}
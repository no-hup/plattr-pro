import 'package:flutterboilerplate/singletonGods/logger.dart';
import 'package:freezed_annotation/freezed_annotation.dart';

import '../timestamp.dart';
import 'addon_selection.dart';
import 'cart_item_price_info.dart';
import 'variant_option.dart';
import 'variant_selection.dart';

part 'cart_item.freezed.dart';
part 'cart_item.g.dart';

// Helper method to safely add values to the sanitized JSON
void _safelyAddToJson<T>(
  Map<String, dynamic> target,
  Map<String, dynamic> source,
  String key,
  T? Function(dynamic) converter,
) {
  if (source.containsKey(key)) {
    try {
      target[key] = converter(source[key]);
    } catch (e) {
      AppLogger.log('⚠️ CART_ITEM_FREEZED: Error processing field $key: $e');
      target[key] = null;
    }
  }
}

// --- JsonConverters for List<VariantSelection> ---
class VariantSelectionListConverter
    implements JsonConverter<List<VariantSelection>, List<dynamic>> {
  const VariantSelectionListConverter();

  @override
  List<VariantSelection> fromJson(List<dynamic> json) {
    return json.map((item) {
      if (item is! Map<String, dynamic>) {
        print('⚠️ CART_ITEM: Unexpected item type in selectedVariantsDetails: $item');
        return null;
      }
      final map = item;
      try {
        final priceInfo = map['priceInfo'] as Map<String, dynamic>? ?? {};
        // Tolerate backend keys: finalPrice/basePrice as well as itemFinalPrice/itemBasePrice
        final optionPrice = priceInfo['itemFinalPrice'] as num?
                           ?? priceInfo['finalPrice'] as num?
                           ?? priceInfo['itemBasePrice'] as num?
                           ?? priceInfo['basePrice'] as num?
                           ?? 0;
        final optionId = map['selected_variant_id'] as String? ?? '';
        final optionName = map['selected_variant_name'] as String? ?? '';
        return VariantSelection(
          variantId: map['id'] as String? ?? '',
          optionId: optionId,
          name: map['name'] as String? ?? '',
          selectedOption: VariantOption(
            id: optionId,
            name: optionName,
            price: optionPrice,
          ),
        );
      } catch (e) {
        print('⚠️ CART_ITEM: Error parsing variant selection item $map: $e');
        return null;
      }
    }).whereType<VariantSelection>().toList();
  }

  @override
  List<dynamic> toJson(List<VariantSelection> object) {
    return object.map((variant) => {
      'id': variant.variantId,
      'name': variant.name,
      'selected_variant_id': variant.optionId,
      'selected_variant_name': variant.selectedOption.name,
      'priceInfo': { 'itemFinalPrice': variant.selectedOption.price },
    },).toList();
  }
}

// --- JsonConverters for List<AddonSelection> ---
class AddonSelectionListConverter
    implements JsonConverter<List<AddonSelection>, List<dynamic>> {
  const AddonSelectionListConverter();

  @override
  List<AddonSelection> fromJson(List<dynamic> json) {
    return json.map((item) {
       if (item is! Map<String, dynamic>) {
        print('⚠️ CART_ITEM: Unexpected item type in selectedAddonsDetails: $item');
        return null;
      }
      final map = item;
       try {
        final priceInfo = map['priceInfo'] as Map<String, dynamic>? ?? {};
        // Tolerate backend keys: finalPrice/basePrice as well as itemFinalPrice/itemBasePrice
        final addonPrice = priceInfo['itemFinalPrice'] as num?
                           ?? priceInfo['finalPrice'] as num?
                           ?? priceInfo['itemBasePrice'] as num?
                           ?? priceInfo['basePrice'] as num?
                           ?? 0;
        return AddonSelection(
          addonId: map['id'] as String? ?? '',
          name: map['name'] as String? ?? '',
          price: addonPrice,
        );
       } catch (e) {
         print('⚠️ CART_ITEM: Error parsing addon selection item $map: $e');
         return null;
       }
    }).whereType<AddonSelection>().toList();
  }

  @override
  List<dynamic> toJson(List<AddonSelection> object) {
     return object.map((addon) => {
      'id': addon.addonId,
      'name': addon.name,
      'priceInfo': { 'itemFinalPrice': addon.price },
    },).toList();
  }
}

@freezed
class CartItem with _$CartItem {
  @JsonSerializable(
    explicitToJson: true,
    anyMap: true,
  )
  const factory CartItem({
    @JsonKey(
        name: 'menuItemId',
        required: true,
        disallowNullValue: true,
      ) required String menuItemId,

    @JsonKey(fromJson: _parseIntFlexible) int? cartItemId,

    @JsonKey(fromJson: _parseIntFlexibleZero) @Default(0) int quantity,

    CartItemPriceInfo? priceInfo,

    @VariantSelectionListConverter()
    @JsonKey(name: 'selectedVariantsDetails')
    @Default([]) List<VariantSelection> selectedVariants,

    @AddonSelectionListConverter()
    @JsonKey(name: 'selectedAddonsDetails')
    @Default([]) List<AddonSelection> selectedAddons,

    String? name,
    String? description,
    String? image,

    String? status,
    Timestamp? statusUpdatedAt,

    // Which phone added this line to the table's shared cart. Null on carts written
    // before ownership existed, and on items added by an older app — those stay one
    // shared unowned pool, which is exactly how the whole table behaved before.
    String? addedBy,
    
    // Legacy support fields for backward compatibility
    double? itemPrice,
    double? totalPrice,
  }) = _CartItem;

  factory CartItem.fromJson(Map<String, dynamic> json) => _$CartItemFromJson(json);
}

// Extensions for backward compatibility
extension CartItemExtensions on CartItem {
  // Alias getters for the UI that might be using old field names
  List<VariantSelection> get selectedVariantsDetails => selectedVariants;
  List<AddonSelection> get selectedAddonsDetails => selectedAddons;
  
  // Legacy field getters for Map/List conversions
  Map<String, String>? get selectedVariantsMap {
    if (selectedVariants.isEmpty) return null;
    return {
      for (final variant in selectedVariants)
        variant.variantId: variant.optionId,
    };
  }
  
  List<String>? get selectedAddonsList {
    if (selectedAddons.isEmpty) return null;
    return selectedAddons.map((addon) => addon.addonId).toList();
  }
}

// Add the parsing helper functions
int? _parseIntFlexible(dynamic value) {
  if (value == null) return null;
  if (value is int) return value;
  if (value is double) return value.toInt();
  if (value is String) return int.tryParse(value);
  return null;
}

int _parseIntFlexibleZero(dynamic value) {
  return _parseIntFlexible(value) ?? 0;
}
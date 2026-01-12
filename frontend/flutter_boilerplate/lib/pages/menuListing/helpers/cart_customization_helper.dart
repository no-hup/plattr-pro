import 'package:flutterboilerplate/pages/menuListing/menu_response.dart';
import 'package:flutterboilerplate/pages/menuListing/models/cart.dart';
import 'package:flutterboilerplate/singletonGods/logger.dart';

/// Helper class for handling cart item customization logic
class CartCustomizationHelper {
  /// Retrieves customization details for an item that's already in the cart
  /// in a simplified format (Map/List of IDs).
  ///
  /// When adding an existing item to the cart, we need to maintain the same
  /// customization (variants and addons) that were previously selected.
  ///
  /// Returns a tuple with (selectedVariants, selectedAddons) using simple ID formats.
  static ({Map<String, String>? selectedVariants, List<String>? selectedAddons}) getExistingItemCustomization({
    required Cart? cart,
    required String menuItemId,
  }) {
    if (cart == null || cart.items.isEmpty) {
      AppLogger.log('⚠️ CUSTOMIZATION: No cart available to check for existing item');
      return (selectedVariants: null, selectedAddons: null);
    }

    try {
      // Find the first occurrence of the item in the cart
      final existingItems = cart.items.where((item) => item.menuItemId == menuItemId);

      if (existingItems.isEmpty) {
        AppLogger.log('⚠️ CUSTOMIZATION: Item $menuItemId not found in cart');
        return (selectedVariants: null, selectedAddons: null);
      }

      // Use the first matching cart item's customization
      final existingItem = existingItems.first;
      AppLogger.log('✅ CUSTOMIZATION: Found existing item $menuItemId in cart');

      // Convert the List<VariantSelection> to Map<String, String>
      Map<String, String>? variants;
      if (existingItem.selectedVariants.isNotEmpty) {
        AppLogger.log('📦 CUSTOMIZATION: Extracting variants from existingItem.selectedVariants');
        variants = {
          for (final variantSelection in existingItem.selectedVariants)
            variantSelection.variantId: variantSelection.optionId,
        };
      } else {
        variants = null;
      }

      // Convert the List<AddonSelection> to List<String>
      List<String>? addons;
      if (existingItem.selectedAddons.isNotEmpty) {
        AppLogger.log('📦 CUSTOMIZATION: Extracting addons from existingItem.selectedAddons');
        addons = existingItem.selectedAddons.map((addon) => addon.addonId).toList();
      } else {
        addons = null;
      }

      // Log customization details for debugging
      if (variants != null || addons != null) {
        AppLogger.log('📦 CUSTOMIZATION: Using variants: $variants');
        AppLogger.log('📦 CUSTOMIZATION: Using addons: $addons');
      }

      return (
        selectedVariants: variants,
        selectedAddons: addons,
      );
    } catch (e) {
      AppLogger.log('❌ CUSTOMIZATION: Error retrieving item customization: $e');
      return (selectedVariants: null, selectedAddons: null);
    }
  }

  /// Prepares the customization parameters (in simple ID format) for adding an item to the cart.
  ///
  /// Handles the edge case where:
  /// 1. An item is already in the cart
  /// 2. We want to increment it without showing customization UI
  /// 3. We need to preserve existing customization details (in simple ID format)
  ///
  /// This function should be called before making addItemToCart API requests
  /// when not using the customization UI.
  static ({Map<String, String>? selectedVariants, List<String>? selectedAddons}) prepareAddToCartCustomization({
    required Cart? cart,
    required MenuItem menuItem,
    Map<String, String>? providedVariants,
    List<String>? providedAddons,
  }) {
    final menuItemId = menuItem.id;

    // If customization is explicitly provided, use it
    if (providedVariants != null || providedAddons != null) {
      AppLogger.log('📦 CUSTOMIZATION: Using provided customization for item $menuItemId');
      return (selectedVariants: providedVariants, selectedAddons: providedAddons);
    }

    // If item doesn't need customization, no need to lookup existing values
    if (!menuItem.isCustomizable) {
      AppLogger.log('📦 CUSTOMIZATION: Item $menuItemId is not customizable');
      return (selectedVariants: null, selectedAddons: null);
    }

    // Check if item has variants or addons defined in its menu definition
    final hasVariants = menuItem.variants.isNotEmpty ?? false;
    final hasAddons = menuItem.addons.isNotEmpty ?? false;

    if (!hasVariants && !hasAddons) {
      AppLogger.log('📦 CUSTOMIZATION: Item $menuItemId has no variants or addons defined');
      return (selectedVariants: null, selectedAddons: null);
    }

    // If item is customizable, check if it's already in the cart
    if (cart != null) {
      final itemCount = cart.items
          .where((item) => item.menuItemId == menuItemId)
          .length;

      if (itemCount > 0) {
        AppLogger.log('📦 CUSTOMIZATION: Item $menuItemId is already in cart ($itemCount instances)');
        // Get existing customization from cart
        return getExistingItemCustomization(
          cart: cart,
          menuItemId: menuItemId,
        );
      }
    }

    // If we get here, the item is customizable but not in cart
    AppLogger.log('⚠️ CUSTOMIZATION: Customizable item $menuItemId is not yet in cart');
    // This is just for logging - we'll return null values which should trigger the customization UI
    if (hasVariants) {
      AppLogger.log('⚠️ CUSTOMIZATION: Item has variants but none selected yet');
    }
    if (hasAddons) {
      AppLogger.log('⚠️ CUSTOMIZATION: Item has addons but none selected yet');
    }

    // Return null to indicate customization is needed but not available
    return (selectedVariants: null, selectedAddons: null);
  }
}
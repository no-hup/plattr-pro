import 'package:flutter/material.dart';
import 'package:flutterboilerplate/models/api_response.dart';
import 'package:flutterboilerplate/pages/menuListing/add_cart_response.dart' as legacy;
import 'package:flutterboilerplate/pages/menuListing/helpers/cart_customization_helper.dart';
import 'package:flutterboilerplate/pages/menuListing/menu_repository.dart';
import 'package:flutterboilerplate/pages/menuListing/menu_response.dart';
import 'package:flutterboilerplate/pages/menuListing/models/addon_selection.dart';
import 'package:flutterboilerplate/pages/menuListing/models/cart.dart';
import 'package:flutterboilerplate/pages/menuListing/models/cart_item.dart';
import 'package:flutterboilerplate/pages/menuListing/models/cart_item_price_info.dart';
import 'package:flutterboilerplate/pages/menuListing/models/cart_price_info.dart';
import 'package:flutterboilerplate/pages/menuListing/models/variant_option.dart' as model;
import 'package:flutterboilerplate/pages/menuListing/models/variant_selection.dart';
import 'package:flutterboilerplate/singletonGods/logger.dart';

/// Custom logic for addons and variants is implemented with the current user in mind.
/// Each combination of addons and variants is treated as a unique item in the cart.
class MenuState extends ChangeNotifier {
  MenuState(this._repository);

  final MenuRepository _repository;

  // State Management
  MenuData? _menuData;
  MenuData? get menuData => _menuData;

  // Add flag to track ongoing cart updates
  bool _isUpdatingCart = false;
  bool get isUpdatingCart => _isUpdatingCart;

  // ==================== Navigation State ====================
  
  /// The currently active category ID (for scroll sync)
  String? _activeCategoryId;
  String? get activeCategoryId => _activeCategoryId;
  
  void setActiveCategory(String id) {
    if (_activeCategoryId != id) {
      _activeCategoryId = id;
      notifyListeners();
    }
  }
  
  // ==================== Collapse State ====================
  
  /// Set of COLLAPSED subcategory IDs (expanded by default for better UX)
  /// Tracks which subcategories the user has manually collapsed.
  final Set<String> _collapsedSubcategoryIds = {};
  
  bool isSubcategoryExpanded(String id) {
    // Default is expanded (true), only collapsed if explicitly in the set
    return !_collapsedSubcategoryIds.contains(id);
  }
  
  void toggleSubcategory(String id) {
    if (_collapsedSubcategoryIds.contains(id)) {
      _collapsedSubcategoryIds.remove(id); // Expand
    } else {
      _collapsedSubcategoryIds.add(id); // Collapse
    }
    notifyListeners();
  }
  
  /// Initialize collapsed state from backend defaultExpanded field.
  /// Categories with defaultExpanded: false will have all their subcategories pre-collapsed.
  void _initializeCollapsedStateFromBackend() {
    if (_menuData == null) return;
    
    // Clear any previous collapsed state
    _collapsedSubcategoryIds.clear();
    
    for (final category in _menuData!.categories) {
      if (!category.defaultExpanded) {
        // Pre-collapse all subcategories of this category
        for (final subcat in category.subcategories) {
          _collapsedSubcategoryIds.add(subcat.id);
        }
        AppLogger.log('📂 MENU: Pre-collapsed ${category.subcategories.length} subcategories for ${category.name} (defaultExpanded: false)');
      }
    }
  }
  
  // ==================== Floating Menu State ====================
  
  /// Whether the floating menu overlay is expanded
  bool _isFloatingMenuExpanded = false;
  bool get isFloatingMenuExpanded => _isFloatingMenuExpanded;
  
  void toggleFloatingMenu() {
    _isFloatingMenuExpanded = !_isFloatingMenuExpanded;
    notifyListeners();
  }
  
  void closeFloatingMenu() {
    if (_isFloatingMenuExpanded) {
      _isFloatingMenuExpanded = false;
      notifyListeners();
    }
  }

  // Helper method to convert legacy Map<String, String> to List<VariantSelection>
  List<VariantSelection> _convertToVariantSelections(Map<String, String>? variants) {
    if (variants == null || variants.isEmpty) return [];
    
    return variants.entries.map((entry) {
      return VariantSelection(
        variantId: entry.key,
        optionId: entry.value,
        name: entry.key, // Default name to variant ID
        selectedOption: model.VariantOption(
          id: entry.value,
          name: entry.value, // Default name to option ID
          price: 0, // No price info in this legacy format
        ),
      );
    }).toList();
  }
  
  // Helper method to convert legacy List<String> to List<AddonSelection>
  List<AddonSelection> _convertToAddonSelections(List<String>? addons) {
    if (addons == null || addons.isEmpty) return [];
    
    return addons.map((addonId) {
      return AddonSelection(
        addonId: addonId,
        name: addonId, // Default name to addon ID
        price: 0, // No price info in this legacy format
      );
    }).toList();
  }

  Future<void> updateCartItem(
    MenuItem menuItem,
    bool increment, {
    required String tableId,
    required String restaurantId,
    Map<String, String>? selectedVariants,
    List<String>? selectedAddons,
    BuildContext? context,
  }) async {
    // Skip if an update is already in progress
    if (_isUpdatingCart) {
      AppLogger.log('🔒 UPDATE CART: Skipping request, update already in progress');
      return;
    }

    final itemId = menuItem.id;
    AppLogger.log('🛒 UPDATE CART: Item=$itemId, Increment=$increment');

    // Mark update as in progress
    _isUpdatingCart = true;
    notifyListeners();

    // Create a snapshot before changes
    final previousCart = _cart?.copyWith();
    
    // Get customization from helper (use existing customization if item is already in cart)
    final customization = CartCustomizationHelper.prepareAddToCartCustomization(
      cart: _cart,
      menuItem: menuItem,
      providedVariants: selectedVariants,
      providedAddons: selectedAddons,
    );
    
    // Extract the retrieved or provided customization details
    final effectiveVariants = customization.selectedVariants;
    final effectiveAddons = customization.selectedAddons;
    
    // Convert legacy types to new model types
    final variantSelections = _convertToVariantSelections(effectiveVariants);
    final addonSelections = _convertToAddonSelections(effectiveAddons);

    // Apply optimistic update with the effective customization
    _updateLocalCart(
      itemId,
      increment: increment,
      selectedVariants: variantSelections,
      selectedAddons: addonSelections,
      tableId: tableId,
      restaurantId: restaurantId,
    );

    // Make API request with the effective customization
    try {
      final response = await _makeCartApiRequest(
        itemId,
        increment,
        tableId: tableId,
        restaurantId: restaurantId,
        selectedVariants: effectiveVariants,
        selectedAddons: effectiveAddons,
      );
      
      if (!response.success) {
        _handleApiError(previousCart, itemId, response.message, context);
      } else if (response.data != null && response.data!.data != null) {
        // Add detailed logging
        AppLogger.log('✅ UPDATE CART: Response successful');
        AppLogger.log('📦 UPDATE CART: Response data type: ${response.data?.runtimeType}');
        AppLogger.log('📦 UPDATE CART: Response data.data type: ${response.data!.data?.runtimeType}');
        
        try {
          // Check what we got for cart
          final cartData = response.data!.data!.cart;
          AppLogger.log('📦 UPDATE CART: Cart data type: ${cartData?.runtimeType}');
          
          // Handle different type scenarios
          Cart? cart;
          if (cartData is Cart) {
            // If it's already a Cart, use it directly
            cart = cartData;
          } else {
            // Try to serialize any other type
            try {
              // First log what we actually got
              AppLogger.log('📦 CART: Attempting to create Cart from type: ${cartData.runtimeType}');
              
              // Create a default cart if nothing else works
              if (cartData == null) {
                AppLogger.log('⚠️ CART: Cart data is null, creating empty cart');
                cart = _createNewCart(restaurantId, tableId, []);
              }
            } catch (e) {
              AppLogger.log('❌ CART: Error creating Cart: $e');
            }
          }
          
          // Proceed if we have a valid cart
          if (cart != null) {
            AppLogger.log('📦 UPDATE CART: Cart type: ${cart.runtimeType}');
            AppLogger.log('📦 UPDATE CART: Cart items count: ${cart.items.length}');
            
            // Check if the cart has actually changed (use reference equality)
            if (_cart?.items.length != cart.items.length || _cart?.items != cart.items) {
              AppLogger.log('📦 UPDATE CART: Cart has changed, updating');
              // Assign the new cart
              _cart = cart;
              
              // Update menu quantities with the new cart
              _updateMenuQuantities();
            } else {
              AppLogger.log('📦 UPDATE CART: Cart unchanged, skipping update');
            }
          } else {
            AppLogger.log('⚠️ UPDATE CART: Unable to get valid cart from response');
          }
        } catch (e) {
          AppLogger.log('❌ UPDATE CART: Error processing cart in response: $e');
          // Even if there's an error, don't revert as we've already done an optimistic update
        }
      }

      // Update complete
      _isUpdatingCart = false;
      notifyListeners();
    } catch (e) {
      _handleApiError(previousCart, itemId, e.toString(), context);
      _isUpdatingCart = false;
      notifyListeners();
    }
  }

  // Split API request logic into a separate method
  Future<ApiResponse> _makeCartApiRequest(
    String itemId,
    bool increment, {
    required String tableId,
    required String restaurantId,
    Map<String, String>? selectedVariants,
    List<String>? selectedAddons,
  }) async {
    final request = increment
        ? legacy.AddToCartRequest(
            tableId: tableId,
            restaurantId: restaurantId,
            menuItemId: itemId,
            quantity: 1,
            selectedVariants: selectedVariants,
            selectedAddons: selectedAddons,
          )
        : legacy.RemoveFromCartRequest(
            tableId: tableId,
            restaurantId: restaurantId,
            menuItemId: itemId,
            quantity: 1,
            selectedVariants: selectedVariants,
            selectedAddons: selectedAddons,
          );

    return increment
        ? await _repository.addItemToCart(
            request as legacy.AddToCartRequest,
            tableId: tableId,
            restaurantId: restaurantId,
          )
        : await _repository.removeItemFromCart(
            request as legacy.RemoveFromCartRequest,
            tableId: tableId,
            restaurantId: restaurantId,
          );
  }

  // Handle API errors in a consistent way
  void _handleApiError(Cart? previousCart, String itemId, String message, BuildContext? context) {
    AppLogger.log('❌ API Error: $message');
    _revertToSnapshot(previousCart, itemId);
    _showErrorToast(context, message);
    }

  // Rename for clarity - this updates the local cart state only
  void _updateLocalCart(
    String itemId, {
    required bool increment,
    required String tableId,
    required String restaurantId,
    required List<VariantSelection> selectedVariants,
    required List<AddonSelection> selectedAddons,
  }) {
    // With Freezed models, we need to create new instances rather than modifying existing ones
    final currentItems = _cart?.items.toList() ?? <CartItem>[];
    final updatedItems = List<CartItem>.from(currentItems);
    
    // Create default price info
    const defaultPriceInfo = CartItemPriceInfo(
      
    );
    
    // Determine how to find the item index based on provided customizations
    int itemIndex;
    
    if (selectedVariants.isEmpty && selectedAddons.isEmpty) {
      // Case 1: No customization specified - find by menuItemId only
      // This is typically used when incrementing/decrementing from item cards
      itemIndex = currentItems.indexWhere((item) => item.menuItemId == itemId);
      AppLogger.log('🔍 CART: Finding item by ID only: $itemId, found: ${itemIndex != -1}');
    } else {
      // Case 2: Customization specified - find by full equality
      // This is used when adding from customization sheet
      final targetCartItem = CartItem(
        menuItemId: itemId,
        quantity: 1, // Quantity doesn't matter for comparison
        selectedVariants: selectedVariants,
        selectedAddons: selectedAddons,
        priceInfo: defaultPriceInfo,
      );
      
      // Find by ID and check if customizations match
      itemIndex = currentItems.indexWhere((item) => 
        item.menuItemId == itemId && 
        _customizationsMatch(item.selectedVariants, selectedVariants) &&
        _customizationsMatch(item.selectedAddons, selectedAddons),
      );
      
      AppLogger.log('🔍 CART: Finding item by full equality with variants/addons, found: ${itemIndex != -1}');
    }
    
    if (increment) {
      if (itemIndex != -1) {
        // Item exists, update its quantity
        final currentItem = currentItems[itemIndex];
        updatedItems[itemIndex] = currentItem.copyWith(
          quantity: currentItem.quantity + 1,
          // Preserve existing customizations if none were specified
          selectedVariants: selectedVariants.isEmpty ? currentItem.selectedVariants : selectedVariants,
          selectedAddons: selectedAddons.isEmpty ? currentItem.selectedAddons : selectedAddons,
        );
      } else {
        // Item doesn't exist, add it
        updatedItems.add(CartItem(
          menuItemId: itemId,
          quantity: 1,
          selectedVariants: selectedVariants,
          selectedAddons: selectedAddons,
          priceInfo: defaultPriceInfo,
        ),);
      }
    } else {
      if (itemIndex != -1) {
        final currentItem = currentItems[itemIndex];
        if (currentItem.quantity > 1) {
          // Reduce quantity
          updatedItems[itemIndex] = currentItem.copyWith(
            quantity: currentItem.quantity - 1,
          );
        } else {
          // Remove item
          updatedItems.removeAt(itemIndex);
        }
      }
    }

    // Create a new cart or update the existing one
    _cart = (_cart == null) 
        ? _createNewCart(restaurantId, tableId, updatedItems)
        : _cart!.copyWith(items: updatedItems);

    // Update menu quantities
    _updateMenuQuantities();
    notifyListeners();
  }
  
  // Helper to check if two lists of customizations match
  bool _customizationsMatch<T>(List<T> list1, List<T> list2) {
    if (list1.length != list2.length) return false;
    
    // Simple equality check for now
    // For more sophisticated matching, we'd need to implement a proper comparison
    return list1.toString() == list2.toString();
  }

  // Helper to create a new cart with empty price info
  Cart _createNewCart(String restaurantId, String tableId, List<CartItem> items) {
    return Cart(
      restaurantId: restaurantId,
      tableId: tableId,
      items: items,
      priceInfo: CartPriceInfo(
        
      ),
    );
  }

  void _revertToSnapshot(Cart? previousCart, String itemId) {
    if (previousCart != null) {
      _cart = previousCart;
      _updateMenuQuantities();
    } else {
      AppLogger.log('⚠️ CART: No previous cart snapshot to revert to');
    }
  }

  Future<void> fetchMenu(String restaurantId, {required String tableId}) async {
    try {
      _isLoading = true;
      _error = null;
      notifyListeners();

      AppLogger.log('📝 MENU: Fetching menu data');
      final response = await _repository.fetchMenu(restaurantId: restaurantId);

      if (!response.success) {
        _error = response.message;
        _isLoading = false;
        notifyListeners();
        return;
      }

      // Store menu data
      _menuData = response.data;
      
      // Set initial active category to first category
      if (_menuData != null && _menuData!.categories.isNotEmpty) {
        _activeCategoryId = _menuData!.categories.first.id;
        
        // Initialize collapsed state from backend defaultExpanded field
        _initializeCollapsedStateFromBackend();
      }
      
      // Fetch the cart after menu is loaded (but don't wait for UI update yet)
      AppLogger.log('📝 MENU: Menu loaded, now fetching cart');
      await fetchCart(tableId: tableId, restaurantId: restaurantId);
      
      // Loading is complete after both menu and cart are fetched
      // fetchCart already calls notifyListeners() to update menu quantities
      _isLoading = false;
      notifyListeners();
      
    } catch (e) {
      AppLogger.log('❌ MENU: Error fetching menu - $e');
      _error = e.toString();
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> fetchCart({
    required String tableId, 
    required String restaurantId,
  }) async {
    try {
      AppLogger.log('🛒 CART: Fetching cart data for table $tableId at restaurant $restaurantId');
      final response = await _repository.fetchCart(
        tableId: tableId,
        restaurantId: restaurantId,
      );

      if (!response.success) {
        AppLogger.log('❌ CART: Error fetching cart - ${response.message}');
        return;
      }

      try {
        // Add detailed logging of response structure
        AppLogger.log('📦 CART: Response success: ${response.success}');
        AppLogger.log('📦 CART: Response data type: ${response.data?.runtimeType}');
        
        if (response.data != null) {
          // Here we're inspecting the CartOperationResponse structure
          AppLogger.log('📦 CART: Response data.data type: ${response.data!.data?.runtimeType}');
          
          if (response.data!.data != null) {
            // Check what we got for cart
            final cartData = response.data!.data!.cart;
            AppLogger.log('📦 CART: Cart data type: ${cartData.runtimeType}');
            
            // Handle different type scenarios
            Cart? cart;
            // If it's already a Cart, use it directly
            cart = cartData;
                      
            // Proceed if we have a valid cart
            AppLogger.log('📦 CART: Cart object type: ${cart.runtimeType}');
            AppLogger.log('📦 CART: Cart items count: ${cart.items.length}');
            
            // Update the cart
            _cart = cart;
            
            // Update menu quantities with the new cart
            _updateMenuQuantities();
            
            // Notify listeners that cart data has been updated
            notifyListeners();
            AppLogger.log('✅ CART: Successfully updated cart with ${_cart!.items.length} items');
                    } else {
            AppLogger.log('⚠️ CART: Response.data!.data is null');
          }
        } else {
          AppLogger.log('⚠️ CART: Response.data is null');
        }
      } catch (parseError) {
        AppLogger.log('❌ CART: Error processing cart data - $parseError');
        // Continue execution - don't let parsing errors crash the app
      }
    } catch (e) {
      AppLogger.log('❌ CART: Exception fetching cart - $e');
    }
  }

  void _updateMenuQuantities() {
    try {
      if (_menuData != null && _cart != null) {
        // Create a new map of menu items to ensure immutability
        final updatedMenuItems = Map<String, List<MenuItem>>.from(_menuData!.menuItems);
        
        // Update each menu item's quantity based on cart data
        for (final categoryId in updatedMenuItems.keys) {
          try {
            final categoryItems = updatedMenuItems[categoryId]!;
            final updatedCategoryItems = categoryItems.map((item) {
              return item.copyWith(quantity: getItemQuantity(item.id));
            }).toList();
            updatedMenuItems[categoryId] = updatedCategoryItems;
          } catch (e) {
            AppLogger.log('❌ Error updating quantities for category $categoryId: $e');
            // Continue with the next category
          }
        }
        
        // Create a completely new MenuData instance using copyWith
        _menuData = _menuData!.copyWith(menuItems: updatedMenuItems);
        
        // Don't call notifyListeners here - let the caller decide when to notify
      }
    } catch (e) {
      AppLogger.log('❌ Error in _updateMenuQuantities: $e');
      // Ensure the app doesn't crash due to menu quantity updates
    }
  }

  void _showErrorToast(BuildContext? context, String message) {
    if (context == null) return;
    
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: Theme.of(context).colorScheme.error,
        behavior: SnackBarBehavior.floating,
        duration: const Duration(seconds: 2),
      ),
    );
  }

  int getItemQuantity(String itemId) {
    if (_cart == null || _cart!.items.isEmpty) {
      return 0;
    }
    
    try {
      final item = _cart!.items
          .firstWhere(
            (item) => item.menuItemId == itemId,
            orElse: () => CartItem(
              menuItemId: itemId,
              priceInfo: const CartItemPriceInfo(
                
              ),
            ),
          );
      return item.quantity ?? 0;
    } catch (e) {
      AppLogger.log('❌ Error getting item quantity: $e');
      return 0;
    }
  }

  bool needsCustomization(MenuItem item) =>
      item.isCustomizable &&
      ((item.variants.isNotEmpty ?? false) ||
          (item.addons.isNotEmpty ?? false));

  CartItem? getStoredCustomization(String itemId) {
    if (_cart == null || _cart!.items.isEmpty) {
      return null;
    }
    
    try {
      return _cart!.items.firstWhere(
        (item) => item.menuItemId == itemId,
      );
    } catch (e) {
      return null; // Return null if no item matches or an error occurs
    }
  }

  bool _isLoading = true;
  bool get isLoading => _isLoading;

  String? _error;
  String? get error => _error;

  Cart? _cart;
  Cart? get cart => _cart;

}

import 'package:flutter/material.dart' show ChangeNotifier;
import 'package:flutterboilerplate/auth/auth_prompt.dart';
import 'package:flutterboilerplate/pages/cart_listing/cart_helper.dart';
import 'package:flutterboilerplate/pages/cart_listing/cart_listing_repository.dart';
import 'package:flutterboilerplate/pages/checkout_order_flow/models/checkout_models.dart';
import 'package:flutterboilerplate/pages/menuListing/add_cart_response.dart'
    as legacy;
import 'package:flutterboilerplate/pages/menuListing/menu_repository.dart';
import 'package:flutterboilerplate/pages/menuListing/menu_response.dart';
import 'package:flutterboilerplate/pages/menuListing/models/cart.dart';
import 'package:flutterboilerplate/pages/menuListing/models/cart_item.dart';
import 'package:flutterboilerplate/pages/menuListing/models/cart_item_price_info.dart';
import 'package:flutterboilerplate/pages/menuListing/models/cart_price_info.dart';
import 'package:flutterboilerplate/pages/menuListing/offers_state_mixin.dart';
import 'package:flutterboilerplate/session/session_provider.dart';
import 'package:flutterboilerplate/singletonGods/logger.dart';

class CartListingState extends ChangeNotifier with OffersStateMixin {
  CartListingState(
    this._repository,
    this._menuRepository,
    this._sessionProvider,
  );

  final CartListingRepository _repository;
  final MenuRepository _menuRepository;
  final SessionProvider _sessionProvider;

  // State Management
  Cart? _cart;
  Cart? get cart => _cart;

  bool _isLoading = true;
  bool get isLoading => _isLoading;

  bool _isUpdatingCart = false;
  bool get isUpdatingCart => _isUpdatingCart;

  String? _error;
  String? get error => _error;

  // Checkout state
  bool _isCheckingOut = false;
  bool get isCheckingOut => _isCheckingOut;

  CheckoutResponse? _checkoutResponse;
  CheckoutResponse? get checkoutResponse => _checkoutResponse;

  // Menu data for displaying item details
  MenuData? _menuData;

  // Get menu item by ID
  MenuItem? getMenuItemById(String itemId) {
    if (_menuData == null) return null;
    if (itemId.isEmpty) return null;

    try {
      for (final categoryItems in _menuData!.menuItems.values) {
        for (final item in categoryItems) {
          if (item.id == itemId) {
            return item;
          }
        }
      }
    } catch (e) {
      AppLogger.log('❌ CART: Error getting menu item - $e');
    }
    return null;
  }

  Future<void> fetchCart({
    required String tableId,
    required String restaurantId,
  }) async {
    try {
      _isLoading = true;
      _error = null;
      notifyListeners();

      AppLogger.log('🛒 CART: Fetching cart data');
      final response = await _repository.fetchCart(
        tableId: tableId,
        restaurantId: restaurantId,
      );

      if (!response.success) {
        _error = response.message;
        _isLoading = false;
        notifyListeners();
        return;
      }

      // Also fetch menu data to ensure we have it for item repairs
      await _fetchMenuData(restaurantId);

      // CartOperationResponse has a data property of type CartResponseData,
      // which has a cart property
      if (response.data != null && response.data!.data != null) {
        // Use the cart data as provided by the API
        _cart = response.data!.data!.cart;

        // Handle case where cart is null but API call succeeded
        if (_cart == null) {
          AppLogger.log(
            '⚠️ CART: API returned success but cart is null, creating empty cart',
          );
          _cart = Cart(
            items: [],
            priceInfo: CartPriceInfo(),
          );
          _isLoading = false;
          notifyListeners();
          return;
        }

        // If there are cart items, but they have issues (like null fields), try to repair them
        if (_cart != null && _cart!.items.isNotEmpty) {
          final originalItems = _cart!.items;
          final repairedItems = <CartItem>[];

          AppLogger.log(
            '🔍 CART: Checking ${originalItems.length} cart items for data issues',
          );

          // Try to repair each cart item if needed
          for (final item in originalItems) {
            try {
              // Check if this item has valid data
              final hasIssues = item.menuItemId.isEmpty ||
                  item.name == null ||
                  item.name!.isEmpty ||
                  item.priceInfo == null;

              if (hasIssues) {
                AppLogger.log(
                  '⚠️ CART: Found item with issues: ${item.menuItemId}, attempting repairs',
                );

                // Skip items with no menuItemId - these can't be repaired or used
                if (item.menuItemId.isEmpty) {
                  AppLogger.log(
                    '❌ CART: Item has no menuItemId, skipping it completely',
                  );
                  continue;
                }

                // Try to use the menuItem data to supplement missing information
                final menuItem = getMenuItemById(item.menuItemId);
                if (menuItem != null) {
                  AppLogger.log(
                    '🔍 CART: Found matching menu item, using its data to repair',
                  );

                  // Use the new helper method to repair the item
                  final repairedItem =
                      CartHelper.repairWithMenuItem(item, menuItem);
                  repairedItems.add(repairedItem);
                  AppLogger.log(
                    '✅ CART: Successfully repaired item ${repairedItem.menuItemId}',
                  );
                  continue;
                } else {
                  AppLogger.log(
                    '⚠️ CART: No matching menu item found for repair, using fallback',
                  );
                  // Create a basic repaired item
                  final repairedItem = CartItem(
                    menuItemId: item.menuItemId,
                    quantity: item.quantity,
                    name: item.name ?? 'Unknown Item',
                    description: item.description,
                    image: item.image,
                    priceInfo: const CartItemPriceInfo(),
                    selectedVariants: item.selectedVariants,
                    selectedAddons: item.selectedAddons,
                  );

                  repairedItems.add(repairedItem);
                  continue;
                }
              }

              // If no issues, keep the original item
              repairedItems.add(item);
            } catch (e) {
              AppLogger.log('❌ CART: Error repairing cart item - $e');
              // If we can't repair, keep the original item if it has a valid menuItemId
              if (item.menuItemId.isNotEmpty) {
                repairedItems.add(item);
              } else {
                AppLogger.log(
                  '❌ CART: Skipping invalid item with no menuItemId',
                );
              }
            }
          }

          // Update the cart with repaired items
          if (repairedItems.isEmpty) {
            AppLogger.log(
              '⚠️ CART: All items were invalid, creating empty cart',
            );
            _cart = Cart(
              items: [],
              priceInfo: CartPriceInfo(),
            );
          } else {
            _cart = _cart!.copyWith(items: repairedItems);
            AppLogger.log(
              '✅ CART: Updated cart with ${repairedItems.length} repaired items',
            );
          }
        }

        AppLogger.log(
          '✅ CART: Successfully received cart with ${_cart?.items.length ?? 0} items',
        );
      } else {
        AppLogger.log(
          '⚠️ CART: Response data or data.data is null, creating empty cart',
        );
        _cart = Cart(
          items: [],
          priceInfo: CartPriceInfo(),
        );
      }

      _isLoading = false;
      notifyListeners();
      
      // Fetch offers after successful cart load (non-blocking)
      fetchOffersInBackground(restaurantId: restaurantId, tableId: tableId);
    } catch (e) {
      AppLogger.log('❌ CART: Error fetching cart - $e');
      _error = e.toString();
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> _fetchMenuData(String restaurantId) async {
    try {
      AppLogger.log('📋 CART: Fetching menu data for item details');
      final response =
          await _menuRepository.fetchMenu(restaurantId: restaurantId);

      if (response.success) {
        _menuData = response.data;
        AppLogger.log('✅ CART: Menu data loaded successfully');
      } else {
        AppLogger.log(
          '⚠️ CART: Could not load menu data - ${response.message}',
        );
      }
    } catch (e) {
      AppLogger.log('❌ CART: Error fetching menu data - $e');
    }
  }

  Future<void> updateCartItem(
    CartItem item,
    bool increment, {
    required String tableId,
    required String restaurantId,
  }) async {
    try {
      // Skip if already updating
      if (_isUpdatingCart) {
        AppLogger.log('🔒 CART: Skipping request, update already in progress');
        return;
      }

      _isUpdatingCart = true;
      notifyListeners();

      AppLogger.log(
        '🛒 CART: ${increment ? "Adding" : "Removing"} item ${item.menuItemId}',
      );

      // Convert the new VariantSelection/AddonSelection structures to legacy format for API
      final legacyVariants = item.selectedVariantsMap;
      final legacyAddons = item.selectedAddonsList;

      final response = increment
          ? await _menuRepository.addItemToCart(
              legacy.AddToCartRequest(
                tableId: tableId,
                restaurantId: restaurantId,
                menuItemId: item.menuItemId,
                quantity: 1,
                selectedVariants: legacyVariants,
                selectedAddons: legacyAddons,
              ),
              tableId: tableId,
              restaurantId: restaurantId,
            )
          : await _menuRepository.removeItemFromCart(
              legacy.RemoveFromCartRequest(
                tableId: tableId,
                restaurantId: restaurantId,
                menuItemId: item.menuItemId,
                quantity: 1,
                selectedVariants: legacyVariants,
                selectedAddons: legacyAddons,
              ),
              tableId: tableId,
              restaurantId: restaurantId,
            );

      if (response.success) {
        // CartOperationResponse has a data property of type CartResponseData,
        // which has a cart property
        if (response.data != null && response.data!.data != null) {
          _cart = response.data!.data!.cart;

          // Handle case where cart is null but API call succeeded
          if (_cart == null) {
            AppLogger.log(
              '⚠️ CART: API returned success after update but cart is null, creating empty cart',
            );
            _cart = Cart(
              items: [],
              priceInfo: CartPriceInfo(),
            );
            _isUpdatingCart = false;
            notifyListeners();
            return;
          }

          // Repeat the same repair logic to fix any issues with cart items
          if (_cart != null && _cart!.items.isNotEmpty) {
            final cartItems = _cart!.items;
            final repairedItems = <CartItem>[];

            AppLogger.log(
              '🔍 CART: Checking ${cartItems.length} cart items after update',
            );

            for (final cartItem in cartItems) {
              try {
                // Check if this item has valid data
                final hasIssues = cartItem.menuItemId.isEmpty ||
                    cartItem.name == null ||
                    cartItem.name!.isEmpty ||
                    cartItem.priceInfo == null;

                if (hasIssues) {
                  AppLogger.log(
                    '⚠️ CART: Found item with issues after update: ${cartItem.menuItemId}',
                  );

                  // Skip items with no menuItemId - these can't be repaired or used
                  if (cartItem.menuItemId.isEmpty) {
                    AppLogger.log(
                      '❌ CART: Item has no menuItemId after update, skipping completely',
                    );
                    continue;
                  }

                  // Try to use the menuItem data to supplement missing information
                  final menuItem = getMenuItemById(cartItem.menuItemId);
                  if (menuItem != null) {
                    AppLogger.log(
                      '🔍 CART: Found menu item for repair after update',
                    );

                    // Use helper method to repair
                    final repairedItem =
                        CartHelper.repairWithMenuItem(cartItem, menuItem);
                    repairedItems.add(repairedItem);
                    AppLogger.log(
                      '✅ CART: Successfully repaired item after update',
                    );
                    continue;
                  } else {
                    AppLogger.log(
                      '⚠️ CART: No menu item found for repair after update',
                    );
                    // Create a basic repaired item
                    final repairedItem = CartItem(
                      menuItemId: cartItem.menuItemId,
                      quantity: cartItem.quantity,
                      name: cartItem.name ?? 'Unknown Item',
                      description: cartItem.description,
                      image: cartItem.image,
                      priceInfo: const CartItemPriceInfo(),
                      selectedVariants: cartItem.selectedVariants,
                      selectedAddons: cartItem.selectedAddons,
                    );

                    repairedItems.add(repairedItem);
                    continue;
                  }
                }

                // If no issues, keep the original item
                repairedItems.add(cartItem);
              } catch (e) {
                AppLogger.log(
                  '❌ CART: Error repairing cart item after update - $e',
                );
                // If we can't repair, keep the original item if it has a menuItemId
                if (cartItem.menuItemId.isNotEmpty) {
                  repairedItems.add(cartItem);
                } else {
                  AppLogger.log(
                    '❌ CART: Skipping invalid item with no menuItemId after update',
                  );
                }
              }
            }

            // Update the cart with repaired items
            if (repairedItems.isEmpty) {
              AppLogger.log(
                '⚠️ CART: All items were invalid after update, creating empty cart',
              );
              _cart = Cart(
                items: [],
                priceInfo: CartPriceInfo(),
              );
            } else {
              _cart = _cart!.copyWith(items: repairedItems);
              AppLogger.log(
                '✅ CART: Updated cart with ${repairedItems.length} repaired items after item ${increment ? "addition" : "removal"}',
              );
            }
          } else {
            AppLogger.log('✅ CART: Cart is empty after update');
          }

          AppLogger.log(
            '✅ CART: Item ${increment ? "added" : "removed"} successfully',
          );
        } else {
          AppLogger.log(
            '⚠️ CART: Response data or data.data is null after update, creating empty cart',
          );
          _cart = Cart(
            items: [],
            priceInfo: CartPriceInfo(),
          );
        }
      } else {
        AppLogger.log('❌ CART: Error updating cart - ${response.message}');
      }

      _isUpdatingCart = false;
      notifyListeners();
    } catch (e) {
      AppLogger.log('❌ CART: Exception updating cart - $e');
      _isUpdatingCart = false;
      notifyListeners();
    }
  }

  /// Updates the cart item quantity
  Future<bool> updateItemQuantity(
    String menuItemId,
    int newQuantity, {
    required String tableId,
    required String restaurantId,
  }) async {
    // Implementation of update item quantity
    return true;
  }

  /// Processes checkout of the current cart
  ///
  /// Returns true if checkout was successful, false otherwise.
  /// Stores the checkout response in [checkoutResponse] property.
  Future<bool> checkoutCart({
    required String restaurantId,
    required String tableId,
    String? notes,
  }) async {
    try {
      // Reset previous checkout data
      _checkoutResponse = null;
      _isCheckingOut = true;
      _error = null;
      notifyListeners();

      AppLogger.log('🛒 CART: Starting checkout process');

      // Check for active session
      final sessionId = _sessionProvider.sessionId;

      if (sessionId == null || sessionId.isEmpty) {
        _error = 'No active session found. Please scan the QR code again.';
        _isCheckingOut = false;
        notifyListeners();
        // Proactively prompt OTP since no session exists (no network call will be made)
        AuthPrompt.showIfNeeded(
          restaurantId: restaurantId,
          tableId: tableId,
        );
        return false;
      }

      // Call repository checkout method
      final response = await _repository.checkoutCart(
        restaurantId: restaurantId,
        tableId: tableId,
        sessionId: sessionId,
        notes: notes,
      );

      // Check if response is success or error
      return response.when(
        success: (data, message) {
          _checkoutResponse = data;
          _isCheckingOut = false;
          notifyListeners();
          AppLogger.log(
            '✅ CART: Checkout successful, order ID: ${data.data.orderId}',
          );
          // Clear local cart after successful checkout so UI reflects empty cart
          _cart = Cart(
            items: [],
            priceInfo: CartPriceInfo(),
          );
          notifyListeners();
          return true;
        },
        error: (message, errorCode, errorDetails) {
          _error = message;
          _isCheckingOut = false;
          notifyListeners();
          AppLogger.log('❌ CART: Checkout failed: $message');
          return false;
        },
      );
    } catch (e) {
      _error = 'An unexpected error occurred during checkout: $e';
      _isCheckingOut = false;
      notifyListeners();
      AppLogger.log('❌ CART: Checkout error: $e');
      return false;
    }
  }

  /// Helper method to show an error toast
  // void _showErrorToast(String message) {
  //   Fluttertoast.showToast(
  //     msg: message,
  //     toastLength: Toast.LENGTH_LONG,
  //     gravity: ToastGravity.BOTTOM,
  //     backgroundColor: Colors.red,
  //     textColor: Colors.white,
  //     fontSize: 16.0,
  //   );
  // }

  // ==================== Offers Mixin Implementation ====================
  
  /// CartListingState has access to SessionProvider, so we return the sessionId.
  @override
  String? getSessionIdForOffers() => _sessionProvider.sessionId;
}

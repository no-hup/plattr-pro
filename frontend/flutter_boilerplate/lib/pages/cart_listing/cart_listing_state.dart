import 'package:flutter/material.dart';
import 'package:flutterboilerplate/auth/auth_prompt.dart';
import 'package:flutterboilerplate/pages/cart_listing/cart_helper.dart';
import 'package:flutterboilerplate/pages/cart_listing/cart_listing_repository.dart';
import 'package:flutterboilerplate/pages/checkout_order_flow/checkout_request_id.dart';
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
  final _requestId = CheckoutRequestId();   // OF-S1
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
                  // copyWith, not a rebuild: a rebuild drops addedBy and the item
                  // stops belonging to the diner who ordered it.
                  final repairedItem = item.copyWith(
                    name: item.name ?? 'Unknown Item',
                    priceInfo: const CartItemPriceInfo(),
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
    BuildContext? context,
  }) async {
    // Skip if already updating
    if (_isUpdatingCart) {
      AppLogger.log('🔒 CART: Skipping request, update already in progress');
      return;
    }

    _isUpdatingCart = true;
    notifyListeners();

    // Snapshot cart BEFORE any mutation so we can revert on API failure.
    // Parity with MenuState.updateCartItem (menu_state.dart:160).
    final previousCart = _cart?.copyWith();

    AppLogger.log(
      '🛒 CART: ${increment ? "Adding" : "Removing"} item ${item.menuItemId}',
    );

    try {
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
                // Cart page always has a CartItem in hand (not a MenuItem), so
                // item.cartItemId is always set by the backend. Thread it so the
                // remove targets THIS specific entry instead of the backend's
                // "first menuItemId match" fallback — critical correctness fix
                // for multi-config carts (two Wings entries, user taps - on the
                // second row). Without this, the wrong entry gets decremented.
                cartItemId: item.cartItemId,
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
                    // copyWith, not a rebuild: see the same repair above.
                    final repairedItem = cartItem.copyWith(
                      name: cartItem.name ?? 'Unknown Item',
                      priceInfo: const CartItemPriceInfo(),
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
        // API returned a non-success response (e.g. 5xx, validation error).
        // Revert the cart to the snapshot and surface the error to the user.
        _handleApiError(previousCart, response.message, context);
      }
    } catch (e) {
      // Exception path (network error, parse failure, etc.) — same rollback + toast.
      _handleApiError(previousCart, e.toString(), context);
    } finally {
      // CRITICAL: always release the lock, even on failure. Mirrors menu_state.dart:262.
      _isUpdatingCart = false;
      notifyListeners();
    }
  }

  /// Reverts the in-memory cart to [previousCart] and surfaces [message] to the
  /// user as a toast. Parity with MenuState._handleApiError at menu_state.dart:310.
  void _handleApiError(
    Cart? previousCart,
    String message,
    BuildContext? context,
  ) {
    AppLogger.log('❌ CART: API error, reverting to snapshot — $message');
    if (previousCart != null) {
      _cart = previousCart;
    }
    _showErrorToast(context, message);
  }

  /// Shows a transient error toast via [ScaffoldMessenger]. Safe to call with a
  /// null or unmounted [context]. Mirrors MenuState._showErrorToast at menu_state.dart:580.
  void _showErrorToast(BuildContext? context, String message) {
    if (context == null) return;
    try {
      if (!context.mounted) {
        AppLogger.log('⚠️ CART: Context unmounted, skipping error toast');
        return;
      }
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(message),
          backgroundColor: Theme.of(context).colorScheme.error,
          behavior: SnackBarBehavior.floating,
          duration: const Duration(seconds: 2),
        ),
      );
    } catch (e) {
      AppLogger.log('⚠️ CART: Could not show error toast: $e');
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
    required List<int> cartItemIds,   // D5: the dishes the phone showed under the choice the guest tapped
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
      var sessionId = _sessionProvider.sessionId;

      if (sessionId == null || sessionId.isEmpty) {
        // No session yet (e.g. the page was reloaded mid-order). Prompt for OTP
        // and pick up the session it establishes — awaiting it, because firing
        // it and returning an error here latches an error screen that the
        // successful re-auth never clears.
        await AuthPrompt.showIfNeeded(
          restaurantId: restaurantId,
          tableId: tableId,
        );
        sessionId = _sessionProvider.sessionId;
      }

      if (sessionId == null || sessionId.isEmpty) {
        _error = 'No active session found. Please scan the QR code again.';
        _isCheckingOut = false;
        notifyListeners();
        return false;
      }

      // Call repository checkout method
      final response = await _repository.checkoutCart(
        restaurantId: restaurantId,
        tableId: tableId,
        sessionId: sessionId,
        notes: notes,
        requestId: _requestId.forItems(cartItemIds),   // OF-S1: kept while this tap is in flight; D5: new for new dishes
        cartItemIds: cartItemIds,
      );

      // Check if response is success or error
      return response.when(
        success: (data, message) {
          _requestId.settled();
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
          if (!CheckoutRequestId.keepsId(errorCode)) _requestId.settled();   // the server answered: next tap is a new act
          _isCheckingOut = false;
          notifyListeners();

          // Session expired or invalid — trigger OTP re-auth dialog
          if (errorCode == 'unauthenticated') {
            AppLogger.log('🔐 CART: Session expired, triggering re-auth');
            AuthPrompt.showIfNeeded(
              restaurantId: restaurantId,
              tableId: tableId,
              force: true,
            );
            _error = null;
            return false;
          }

          _error = message;
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

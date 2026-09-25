import 'package:flutter/foundation.dart';
import 'package:platter_core/platter_core.dart';

import 'repository/menu_api_service.dart';


/// Provider class to manage the state of the restaurant menu
class MenuProvider extends ChangeNotifier {
  final MenuApiService _apiService;

  // State variables
  DataState _state = DataState.initial;
  FullRestaurantMenuResponse? _menu;
  String? _errorMessage;
  bool _isRefreshing = false;

  // Getters
  DataState get state => _state;
  FullRestaurantMenuResponse? get menu => _menu;
  String? get errorMessage => _errorMessage;
  bool get isRefreshing => _isRefreshing;

  bool get hasMenu => _menu != null && _menu!.categories.isNotEmpty;

  // Constructor
  MenuProvider({required MenuApiService apiService}) : _apiService = apiService;

  /// Fetches the restaurant menu
  Future<void> fetchRestaurantMenu({
    required String restaurantId,
    required String sessionId,
  }) async {
    // Set state to loading
    _state = DataState.loading;
    _errorMessage = null;
    notifyListeners();

    // Call API service
    final response = await _apiService.getRestaurantMenu(
      restaurantId: restaurantId,
      sessionId: sessionId,
    );

    // Handle response
    if (response.success && response.data != null) {
      _menu = response.data;
      _state = DataState.loaded;
    } else {
      _errorMessage = response.message ?? 'Failed to fetch restaurant menu';
      _state = DataState.error;
    }

    // Notify UI of changes
    notifyListeners();
  }

  /// Refreshes the restaurant menu
  Future<void> refreshMenu({
    required String restaurantId,
    required String sessionId,
  }) async {
    _isRefreshing = true;
    notifyListeners();

    // Call API service
    final response = await _apiService.getRestaurantMenu(
      restaurantId: restaurantId,
      sessionId: sessionId,
    );

    // Handle response
    if (response.success && response.data != null) {
      _menu = response.data;
      _state = DataState.loaded;
      _errorMessage = null;
    } else {
      _errorMessage = response.message;
      // Only update state to error if we didn't have previous data
      if (!hasMenu) {
        _state = DataState.error;
      }
    }

    _isRefreshing = false;
    notifyListeners();
  }

  /// Updates a menu item's availability
  Future<bool> updateMenuItemAvailability({
    required String restaurantId,
    required String sessionId,
    required String menuItemId,
    required bool isAvailable,
  }) async {
    final response = await _apiService.updateMenuItemAvailability(
      restaurantId: restaurantId,
      sessionId: sessionId,
      menuItemId: menuItemId,
      isAvailable: isAvailable,
    );

    if (response.success && response.data != null) {
      final updatedMenuItemId = response.data!.menuItemId;
      final updatedIsAvailable = response.data!.isAvailable;
      if (_menu != null) {
        final updatedMenuItems =
            Map<String, List<MenuItem>>.from(_menu!.menuItems);
        bool itemFound = false;
        updatedMenuItems.forEach((categoryId, items) {
          for (int i = 0; i < items.length; i++) {
            if (items[i].id == updatedMenuItemId) {
              itemFound = true;
              updatedMenuItems[categoryId] = List<MenuItem>.from(items);
              updatedMenuItems[categoryId]![i] =
                  items[i].copyWith(isAvailable: updatedIsAvailable);
              break;
            }
          }
        });
        if (itemFound) {
          _menu = FullRestaurantMenuResponse(
            categories: _menu!.categories,
            menuItems: updatedMenuItems,
            metadata: _menu!.metadata,
          );
          notifyListeners();
        }
      }
      return true;
    }

    return false;
  }

  /// D6: every shared add-on the menu offers, once each (Extra Raita is on 3 biryanis, listed once).
  List<Addon> get addons => menuAddons(_menu);

  /// D6: switches the shared add-on record, then re-reads the menu so every dish shows it.
  Future<bool> updateAddonAvailability({
    required String restaurantId,
    required String sessionId,
    required String addonId,
    required bool isAvailable,
  }) async {
    final response = await _apiService.updateAddonAvailability(
      restaurantId: restaurantId,
      sessionId: sessionId,
      addonId: addonId,
      isAvailable: isAvailable,
    );
    if (!response.success) return false;
    await refreshMenu(restaurantId: restaurantId, sessionId: sessionId);
    return true;
  }
}

/// The add-ons a menu read offers, once each, A to Z. The staff read returns sold-out add-ons too, so a switch
/// that is off stays listed and can be switched back on.
List<Addon> menuAddons(FullRestaurantMenuResponse? menu) {
  final byId = <String, Addon>{};
  for (final item in (menu?.menuItems.values ?? const <List<MenuItem>>[]).expand((l) => l)) {
    for (final a in item.addons) {
      byId[a.id] = a;
    }
  }
  return byId.values.toList()..sort((a, b) => a.meta.name.compareTo(b.meta.name));
}

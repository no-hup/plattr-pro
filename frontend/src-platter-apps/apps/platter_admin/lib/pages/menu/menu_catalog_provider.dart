import 'package:flutter/material.dart';
import 'package:platter_core/platter_core.dart';
import 'menu_api_service.dart';

class MenuCatalogProvider extends ChangeNotifier {
  MenuCatalogProvider({
    required this.apiService,
    required this.restaurantId,
    required this.sessionId,
  });

  final AdminMenuApiService apiService;
  final String restaurantId;
  final String sessionId;

  DataState _state = DataState.initial;
  String? _errorMessage;
  FullRestaurantMenuResponse? _menu;
  String? _selectedCategoryId;
  String? _selectedSubcategoryId;

  DataState get state => _state;
  String? get errorMessage => _errorMessage;
  FullRestaurantMenuResponse? get menu => _menu;

  String? get selectedCategoryId => _selectedCategoryId;
  String? get selectedSubcategoryId => _selectedSubcategoryId;

  List<MenuCategory> get categories => _menu?.categories ?? [];

  MenuCategory? get selectedCategory {
    if (_selectedCategoryId == null) return null;
    return categories
        .cast<MenuCategory?>()
        .firstWhere((c) => c?.id == _selectedCategoryId, orElse: () => null);
  }

  MenuSubcategory? get selectedSubcategory {
    if (_selectedSubcategoryId == null) return null;
    for (final category in categories) {
      for (final subcategory in category.subcategories) {
        if (subcategory.id == _selectedSubcategoryId) {
          return subcategory;
        }
      }
    }
    return null;
  }

  List<MenuItem> get selectedItems {
    final menuItems = _menu?.menuItems ?? {};
    if (_selectedSubcategoryId != null) {
      return menuItems[_selectedSubcategoryId] ?? [];
    }

    if (_selectedCategoryId != null) {
      final category = selectedCategory;
      if (category == null) return [];
      return _collectItemsForCategory(category);
    }

    return _collectItems(menuItems.values);
  }

  Future<void> loadMenu() async {
    _state = DataState.loading;
    _errorMessage = null;
    notifyListeners();

    final response = await apiService.getRestaurantMenu(
      restaurantId: restaurantId,
      sessionId: sessionId,
    );

    if (response.success && response.data != null) {
      _menu = response.data;
      _state = DataState.loaded;
    } else {
      _errorMessage = response.message ?? 'Failed to load menu';
      _state = DataState.error;
    }
    notifyListeners();
  }

  void selectCategory(String? categoryId) {
    _selectedCategoryId = categoryId;
    _selectedSubcategoryId = null;
    notifyListeners();
  }

  void selectSubcategory(String? subcategoryId) {
    _selectedSubcategoryId = subcategoryId;
    notifyListeners();
  }

  Future<bool> addCategory({
    required String name,
    required int order,
    String description = '',
    String image = '',
  }) async {
    final response = await apiService.addCategory(
      restaurantId: restaurantId,
      sessionId: sessionId,
      category: {
        'name': name,
        'order': order,
        'description': description,
        'image': image,
      },
    );

    if (response.success) {
      await loadMenu();
      return true;
    }
    _errorMessage = response.message;
    notifyListeners();
    return false;
  }

  Future<bool> updateCategory({
    required String categoryId,
    required String name,
    required int order,
    String description = '',
    String image = '',
  }) async {
    final response = await apiService.updateCategory(
      restaurantId: restaurantId,
      sessionId: sessionId,
      categoryId: categoryId,
      updateData: {
        'name': name,
        'order': order,
        'description': description,
        'image': image,
      },
    );

    if (response.success) {
      await loadMenu();
      return true;
    }
    _errorMessage = response.message;
    notifyListeners();
    return false;
  }

  Future<bool> deleteCategory(String categoryId) async {
    final response = await apiService.deleteCategory(
      restaurantId: restaurantId,
      sessionId: sessionId,
      categoryId: categoryId,
    );

    if (response.success) {
      if (_selectedCategoryId == categoryId) {
        _selectedCategoryId = null;
        _selectedSubcategoryId = null;
      }
      await loadMenu();
      return true;
    }
    _errorMessage = response.message;
    notifyListeners();
    return false;
  }

  Future<bool> addSubcategory({
    required String parentCategoryId,
    required String name,
    required int order,
    String description = '',
    String image = '',
  }) async {
    final response = await apiService.addSubcategory(
      restaurantId: restaurantId,
      sessionId: sessionId,
      subcategory: {
        'parentCategoryId': parentCategoryId,
        'name': name,
        'order': order,
        'description': description,
        'image': image,
      },
    );

    if (response.success) {
      await loadMenu();
      return true;
    }
    _errorMessage = response.message;
    notifyListeners();
    return false;
  }

  Future<bool> updateSubcategory({
    required String subcategoryId,
    required String parentCategoryId,
    required String name,
    required int order,
    String description = '',
    String image = '',
  }) async {
    final response = await apiService.updateSubcategory(
      restaurantId: restaurantId,
      sessionId: sessionId,
      subcategoryId: subcategoryId,
      updateData: {
        'parentCategoryId': parentCategoryId,
        'name': name,
        'order': order,
        'description': description,
        'image': image,
      },
    );

    if (response.success) {
      await loadMenu();
      return true;
    }
    _errorMessage = response.message;
    notifyListeners();
    return false;
  }

  Future<bool> deleteSubcategory(String subcategoryId) async {
    final response = await apiService.deleteSubcategory(
      restaurantId: restaurantId,
      sessionId: sessionId,
      subcategoryId: subcategoryId,
    );

    if (response.success) {
      if (_selectedSubcategoryId == subcategoryId) {
        _selectedSubcategoryId = null;
      }
      await loadMenu();
      return true;
    }
    _errorMessage = response.message;
    notifyListeners();
    return false;
  }

  Future<bool> addMenuItem({
    required MenuItem item,
  }) async {
    final menuItemData = Map<String, dynamic>.from(item.toJson())
      ..remove('menuItemId')
      ..['restaurantId'] = restaurantId;
    final response = await apiService.addMenuItem(
      restaurantId: restaurantId,
      sessionId: sessionId,
      menuItemData: menuItemData,
    );

    if (response.success) {
      await loadMenu();
      return true;
    }
    _errorMessage = response.message;
    notifyListeners();
    return false;
  }

  Future<bool> updateMenuItem({
    required String menuItemId,
    required MenuItem item,
  }) async {
    final updateData = Map<String, dynamic>.from(item.toJson())
      ..remove('menuItemId')
      ..['restaurantId'] = restaurantId;
    final response = await apiService.updateMenuItem(
      restaurantId: restaurantId,
      sessionId: sessionId,
      menuItemId: menuItemId,
      updateData: updateData,
    );

    if (response.success) {
      await loadMenu();
      return true;
    }
    _errorMessage = response.message;
    notifyListeners();
    return false;
  }

  Future<bool> deleteMenuItem(String menuItemId) async {
    final response = await apiService.deleteMenuItem(
      restaurantId: restaurantId,
      sessionId: sessionId,
      menuItemId: menuItemId,
    );

    if (response.success) {
      await loadMenu();
      return true;
    }
    _errorMessage = response.message;
    notifyListeners();
    return false;
  }

  Future<void> updateMenuItemAvailability({
    required String menuItemId,
    required bool isAvailable,
  }) async {
    final response = await apiService.updateMenuItemAvailability(
      restaurantId: restaurantId,
      sessionId: sessionId,
      menuItemId: menuItemId,
      isAvailable: isAvailable,
    );

    if (response.success && response.data != null) {
      _updateLocalAvailability(
        response.data!.menuItemId,
        response.data!.isAvailable,
      );
    } else {
      _errorMessage = response.message;
      notifyListeners();
    }
  }

  void _updateLocalAvailability(String menuItemId, bool isAvailable) {
    if (_menu == null) return;
    final updatedMenuItems = <String, List<MenuItem>>{};

    _menu!.menuItems.forEach((key, items) {
      updatedMenuItems[key] = items.map((item) {
        if (item.id == menuItemId) {
          return item.copyWith(isAvailable: isAvailable);
        }
        return item;
      }).toList();
    });

    _menu = FullRestaurantMenuResponse(
      categories: _menu!.categories,
      menuItems: updatedMenuItems,
      metadata: _menu!.metadata,
    );
    notifyListeners();
  }

  List<MenuItem> _collectItemsForCategory(MenuCategory category) {
    final menuItems = _menu?.menuItems ?? {};
    final subcategoryIds = category.subcategories.isNotEmpty
        ? category.subcategories.map((s) => s.id).toList()
        : category.subcategoryIds;
    if (subcategoryIds.isNotEmpty) {
      return _collectItems(subcategoryIds.map((id) => menuItems[id] ?? []));
    }
    return menuItems[category.id] ?? [];
  }

  List<MenuItem> _collectItems(Iterable<List<MenuItem>> groups) {
    final byId = <String, MenuItem>{};
    for (final group in groups) {
      for (final item in group) {
        byId[item.id] = item;
      }
    }
    return byId.values.toList();
  }
}

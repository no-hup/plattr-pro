import 'package:collection/collection.dart';
import 'package:flutter/material.dart';
import 'package:platter_core/platter_core.dart';
import 'menu_api_service.dart';
import '../settings/settings_api_service.dart';

/// D6 / TD-106: the dish as the backend stores it. Add-ons are ids and portions `{id, name}` links; their prices
/// live on the shared records, which the add-on and portion editors change through `admin-sharedOption`.
Map<String, dynamic> dishWire(MenuItem item) => {
      'meta': item.meta.toJson(),
      'priceInfo': item.priceInfo.toJson(),
      'isInStock': item.isAvailable,
      'categoryId': item.categoryId,
      'primarySubcategoryId': item.primarySubcategoryId,
      'subcategoryIds': item.subcategoryIds,
      'taxBlockId': item.taxBlockId,
      'nutritionalInfo': item.nutritionalInfo.toJson(),
      'allergenTags': item.allergenTags,
      'addons': [for (final a in item.addons) a.id],
      'variants': [for (final v in item.variants) {'id': v.id, 'name': v.name}],
    };

// DECISION(D6, 2026-09-25): the dish editor saves only what the manager changed, add-ons as ids.
// See moonshot/reviews/2026-09-25-decisions-for-shaurya.md. If you change this, ask Shaurya first.
/// TD-110: the Menu tab loaded at 18:00 says prawns are in stock; the kitchen marks them out at 20:30; a
/// description fix at 21:00 sends `meta` alone, so the sold-out stands.
Map<String, dynamic> dishChanges(MenuItem before, MenuItem after) {
  final was = dishWire(before);
  final now = dishWire(after);
  const same = DeepCollectionEquality();
  return {
    for (final key in now.keys)
      if (!same.equals(was[key], now[key])) key: now[key],
  };
}

/// One row of the portion editor: an existing option (id set) or a new one (id null).
class OptionRow {
  const OptionRow({this.id, required this.name, required this.price});
  final String? id;
  final String name;
  final num price;
}

/// D6 / TD-132: only what the manager changed in a portion group. Family ₹260 → ₹280 sends
/// `{options: [{id: family, price: 280}]}`; a new "Jumbo ₹480" row sends `addOptions`; a deleted row `removeOptionIds`.
Map<String, dynamic> portionChanges(Variant was, String name, List<OptionRow> rows) {
  final kept = {for (final r in rows) if (r.id != null) r.id!: r};
  final edits = <Map<String, dynamic>>[];
  for (final o in was.options) {
    final r = kept[o.id];
    if (r == null) continue;
    final change = <String, dynamic>{
      if (r.name != o.name) 'name': r.name,
      if (r.price != o.priceInfo.basePrice) 'price': r.price,
    };
    if (change.isNotEmpty) edits.add({'id': o.id, ...change});
  }
  final removed = [for (final o in was.options) if (!kept.containsKey(o.id)) o.id];
  final added = [for (final r in rows) if (r.id == null) {'name': r.name, 'price': r.price}];
  return {
    if (name != was.name) 'name': name,
    if (edits.isNotEmpty) 'options': edits,
    if (added.isNotEmpty) 'addOptions': added,
    if (removed.isNotEmpty) 'removeOptionIds': removed,
  };
}

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
  /// Tax block id → label from the restaurant config, for the dish editor's picker.
  Map<String, String> taxBlocks = const {};
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
    // TD-038: the picker needs the block names. A failed settings read leaves the picker empty
    // (a dish then falls back to its category's block); it never blocks the menu from loading.
    final settings = await AdminSettingsApiService().getSettings(
      restaurantId: restaurantId,
      sessionId: sessionId,
    );
    taxBlocks = settings.data?.taxBlockLabels ?? const {};

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
    final menuItemData = dishWire(item);
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
    required MenuItem original,
    required MenuItem item,
  }) async {
    final updateData = dishChanges(original, item);
    if (updateData.isEmpty) return true;
    final menuItemId = original.id;
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

  /// D6: how many dishes link each shared add-on / portion, counted on the server over every dish.
  /// Null when the count failed: the editors then refuse to save rather than guess "one dish".
  Future<({Map<String, int> addons, Map<String, int> variants})?> sharedUsage() async {
    final r = await apiService.sharedOption(
        restaurantId: restaurantId, sessionId: sessionId, action: 'usage');
    if (!r.success) return null;
    Map<String, int> counts(Object? m) =>
        {for (final e in ((m as Map?) ?? {}).entries) e.key as String: (e.value as num).toInt()};
    return (addons: counts(r.data?['addons']), variants: counts(r.data?['variants']));
  }

  /// D6: changes the shared record (every linked dish follows), or with [onlyForMenuItemId] copies it for that
  /// one dish, which the server relinks. Answers the record as saved, or null with [errorMessage] set.
  Future<Map<String, dynamic>?> changeSharedOption({
    required String kind,
    required String id,
    required Map<String, dynamic> changes,
    String? onlyForMenuItemId,
  }) async {
    final r = await apiService.sharedOption(
      restaurantId: restaurantId,
      sessionId: sessionId,
      action: onlyForMenuItemId == null ? 'update' : 'copyForDish',
      kind: kind,
      id: id,
      menuItemId: onlyForMenuItemId,
      changes: changes,
    );
    return _sharedResult(r);
  }

  /// Q6-3: a new add-on becomes a shared record; the dish save links it.
  Future<Addon?> createAddon({required String name, required num price}) async {
    final r = await apiService.sharedOption(
      restaurantId: restaurantId,
      sessionId: sessionId,
      action: 'create',
      kind: 'addon',
      changes: {'name': name, 'price': price},
    );
    final record = _sharedResult(r);
    return record == null ? null : Addon.fromJson(record);
  }

  /// TD-132: a new portion group becomes a shared record; the dish save links it.
  Future<Variant?> createVariant({
    required String name,
    required bool isMandatory,
    required List<OptionRow> options,
  }) async {
    final r = await apiService.sharedOption(
      restaurantId: restaurantId,
      sessionId: sessionId,
      action: 'create',
      kind: 'variant',
      changes: {
        'name': name,
        'isMandatory': isMandatory,
        'options': [for (final o in options) {'name': o.name, 'price': o.price}],
      },
    );
    final record = _sharedResult(r);
    return record == null ? null : Variant.fromJson(record);
  }

  Future<bool> setAddonStock(String addonId, bool isAvailable) async {
    final r = await apiService.updateAddonAvailability(
      restaurantId: restaurantId,
      sessionId: sessionId,
      addonId: addonId,
      isAvailable: isAvailable,
    );
    if (!r.success) {
      _errorMessage = r.message;
      notifyListeners();
    }
    _sharedEdited |= r.success;
    return r.success;
  }

  /// A shared edit saved while the dish editor was open: the list needs a reload even if the dish is not saved.
  bool _sharedEdited = false;
  bool takeSharedEdited() {
    final edited = _sharedEdited;
    _sharedEdited = false;
    return edited;
  }

  Map<String, dynamic>? _sharedResult(ApiResponse<Map<String, dynamic>> r) {
    final record = r.data?['record'];
    if (r.success && record is Map) {
      _sharedEdited = true;
      return Map<String, dynamic>.from(record);
    }
    _errorMessage = r.message ?? 'Could not save the change';
    notifyListeners();
    return null;
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

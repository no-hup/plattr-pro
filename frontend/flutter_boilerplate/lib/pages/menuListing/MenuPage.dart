// ignore_for_file: slash_for_doc_comments, lines_longer_than_80_chars

import 'package:flutter/material.dart';
import 'package:flutterboilerplate/pages/debug_baner.dart';
import 'package:flutterboilerplate/pages/menuListing/menu_response.dart';
import 'package:flutterboilerplate/pages/menuListing/menu_state.dart';
import 'package:flutterboilerplate/pages/menuListing/menu_widgets.dart';
import 'package:flutterboilerplate/singletonGods/logger.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

class MenuPage extends StatelessWidget {
  const MenuPage({
    required this.restaurantId,
    required this.tableId,
    super.key,
  });

  final String restaurantId;
  final String tableId;

  @override
  Widget build(BuildContext context) {
    final menuState = context.read<MenuState>();

    return FutureBuilder<void>(
      future: menuState.fetchMenu(restaurantId, tableId: tableId),
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const Scaffold(body: MenuLoadingView());
        }

        if (snapshot.hasError) {
          return Scaffold(
            body: MenuErrorView(
              error: snapshot.error.toString(),
              onRetry: () => menuState.fetchMenu(restaurantId, tableId: tableId),
            ),
          );
        }

        return MenuPageContent(
          restaurantId: restaurantId,
          tableId: tableId,
        );
      },
    );
  }
}

class MenuPageContent extends StatelessWidget {
  const MenuPageContent({
    required this.restaurantId,
    required this.tableId,
    super.key,
  });

  final String restaurantId;
  final String tableId;

  @override
  Widget build(BuildContext context) {
    return Consumer<MenuState>(
      builder: (context, menuState, child) {
        final menuData = menuState.menuData;

        if (menuData == null || menuData.categories.isEmpty) {
          return const Center(child: Text('No menu items available'));
        }

        return Scaffold(
            appBar: AppBar(
              title: const Text('Menu'),
              actions: [
                IconButton(
                  icon: const Icon(Icons.receipt_long),
                  onPressed: () {
                    AppLogger.log('🍽️ MENU: Navigate to orders');
                    context.go('/r/$restaurantId/t/$tableId/orders');
                  },
                ),
                IconButton(
                  icon: const Icon(Icons.shopping_cart),
                  onPressed: () {
                    AppLogger.log('🛒 MENU: Navigate to cart');
                    context.go('/r/$restaurantId/t/$tableId/cart');
                  },
                ),
              ],
            ),
            body: Stack(children: [
              Column(
                children: [
                  DebugBanner(
                    tableId: tableId,
                    restaurantId: restaurantId,
                  ),
                  Expanded(
                    child: ListView.separated(
                      itemCount: menuData.categories.length,
                      separatorBuilder: (context, index) => const Divider(),
                      itemBuilder: (context, index) {
                        final category = menuData.categories[index];
                        
                        // Collect all items for this category (for quantity tracking)
                        final allCategoryItems = _getAllItemsForCategory(
                          category, 
                          menuData.menuItems,
                        );

                        return CategorySection(
                          category: category,
                          menuItemsMap: menuData.menuItems, // Pass full map
                          tableId: tableId,
                          restaurantId: restaurantId,
                          itemQuantities: _getItemQuantities(menuState, allCategoryItems),
                          onQuantityChanged: (itemId, increment) {
                            // Find item in any subcategory or category
                            MenuItem? item;
                            for (final i in allCategoryItems) {
                              if (i.id == itemId) {
                                item = i;
                                break;
                              }
                            }
                            if (item != null) {
                              menuState.updateCartItem(item, increment,
                                  tableId: tableId, restaurantId: restaurantId,);
                            }
                          },
                        );
                      },
                    ),
                  ),
                ],
              ),
              const FloatingCartWidget(),
            ],),);
      },
    );
  }

  Map<String, int> _getItemQuantities(
      MenuState menuState, List<MenuItem> items,) {
    return Map.fromEntries(
      items.map((item) => MapEntry(
          item.id, menuState.getItemQuantity(item.id),),),
    );
  }

  /// Collect all items for a category (deduped by item id)
  /// If category has subcategories, aggregates from all subcategory IDs
  /// Otherwise falls back to category ID for legacy restaurants
  List<MenuItem> _getAllItemsForCategory(
    Category category,
    Map<String, List<MenuItem>> menuItems,
  ) {
    if (category.subcategories.isNotEmpty) {
      final itemMap = <String, MenuItem>{};
      for (final subcat in category.subcategories) {
        final subcatItems = menuItems[subcat.id] ?? [];
        for (final item in subcatItems) {
          itemMap[item.id] = item;
        }
      }
      return itemMap.values.toList();
    } else {
      return menuItems[category.id] ?? [];
    }
  }
}

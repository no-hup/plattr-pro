// ignore_for_file: slash_for_doc_comments, lines_longer_than_80_chars

import 'package:flutter/material.dart';
import 'package:flutterboilerplate/pages/debug_baner.dart';
import 'package:flutterboilerplate/pages/menuListing/menu_response.dart';
import 'package:flutterboilerplate/pages/menuListing/menu_state.dart';
import 'package:flutterboilerplate/pages/menuListing/menu_widgets.dart';
import 'package:flutterboilerplate/singletonGods/logger.dart';
import 'package:provider/provider.dart';
import 'package:go_router/go_router.dart';

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
                        final items = menuData.menuItems[category.id] ?? [];

                        return CategorySection(
                          category: category,
                          items: items,
                          tableId: tableId,
                          restaurantId: restaurantId,
                          itemQuantities: _getItemQuantities(menuState, items),
                          onQuantityChanged: (itemId, increment) {
                            final item = items.firstWhere(
                                (item) => item.id == itemId);
                            menuState.updateCartItem(item, increment,
                                tableId: tableId, restaurantId: restaurantId);
                          },
                        );
                      },
                    ),
                  ),
                ],
              ),
              FloatingCartWidget(),
            ]));
      },
    );
  }

  Map<String, int> _getItemQuantities(
      MenuState menuState, List<MenuItem> items) {
    return Map.fromEntries(
      items.map((item) => MapEntry(
          item.id, menuState.getItemQuantity(item.id))),
    );
  }
}

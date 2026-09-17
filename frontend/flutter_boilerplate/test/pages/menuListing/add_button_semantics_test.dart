// A11Y-1: the menu list used to expose a dozen identical "ADD" buttons, so a
// screen-reader user could not tell which item they were adding. The row's ADD
// button must announce the item name and price.
//
// (The carousel card needs no equivalent test: its whole card merges into one
// tappable semantics node that already carries the item name and price.)
//
// Run: flutter test test/pages/menuListing/add_button_semantics_test.dart

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutterboilerplate/pages/menuListing/menu_response.dart';
import 'package:flutterboilerplate/pages/menuListing/menu_widgets.dart';

void main() {
  testWidgets('list row ADD button names the item and price', (tester) async {
    final handle = tester.ensureSemantics();

    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: MenuItemCard(
            item: MenuItem(
              id: 'item_mutton',
              categoryId: 'cat_biryani',
              meta: MenuItemMeta(
                name: 'Mutton Biryani',
                description: 'Slow cooked',
                categoryName: 'Biryani',
              ),
              priceInfo:
                  PriceInfo(basePrice: 420, discount: 10, finalPrice: 378),
              isInStock: true,
              isCustomizable: false,
            ),
            quantity: 0,
            onQuantityChanged: (_) {},
            tableId: 'tbl_1',
            restaurantId: 'res_1',
          ),
        ),
      ),
    );

    expect(find.text('ADD'), findsOneWidget);
    expect(
      find.bySemanticsLabel('Add Mutton Biryani, ₹378.00'),
      findsOneWidget,
    );

    // The browser agent clicks `[flt-semantics-identifier="menu-add-<itemId>"]`
    // instead of hunting snapshot refs. See FRONTEND_AGENT_TESTING.md — if this
    // fails, every ab-driven consumer flow breaks.
    expect(
      find.bySemanticsIdentifier('menu-add-item_mutton'),
      findsOneWidget,
    );

    handle.dispose();
  });
}

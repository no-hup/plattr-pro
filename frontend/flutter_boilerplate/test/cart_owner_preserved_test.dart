// Ownership has to survive the trip from the wire to the screen.
//
// The cart page decides what you may edit by reading `addedBy` on each item. Between the
// API response and that decision sits a "repair" pass that rebuilds items which arrive
// missing a name or a price — and a rebuild is exactly where a field goes quietly missing.
// It did: the browser check on 2026-09-17 found every item editable on a table where one
// belonged to another phone, because the repaired copy came back with `addedBy` null and
// null means "unowned, anyone may edit".
//
// A test on `splitByOwner` alone cannot see this. The split was always right; it was being
// handed laundered items.
import 'package:flutter_test/flutter_test.dart';
import 'package:flutterboilerplate/pages/cart_listing/cart_helper.dart';
import 'package:flutterboilerplate/pages/menuListing/menu_response.dart';
import 'package:flutterboilerplate/pages/menuListing/models/cart_item.dart';

MenuItem _menuItem() => MenuItem(
      id: 'mi_apollo_fish',
      categoryId: 'cat_food',
      meta: MenuItemMeta(
        name: 'Apollo Fish',
        description: 'Andhra style',
        categoryName: 'Food',
      ),
      priceInfo: PriceInfo(basePrice: 340, discount: 10, finalPrice: 306),
      isInStock: true,
      isCustomizable: false,
    );

void main() {
  group('repair keeps whose item it is', () {
    test('an item repaired from the menu is still owned by the phone that added it', () {
      // The shape that triggers a repair: no name, so the menu has to supply one.
      const arrived = CartItem(
        menuItemId: 'mi_apollo_fish',
        cartItemId: 3,
        quantity: 1,
        addedBy: 'dev_someone_else',
      );

      final repaired = CartHelper.repairWithMenuItem(arrived, _menuItem());

      expect(repaired.addedBy, 'dev_someone_else',
          reason: 'repair rebuilds the item field by field; dropping addedBy hands '
              'someone else\'s food to whoever is looking at the screen');
      expect(repaired.name, 'Apollo Fish', reason: 'the repair itself must still work');
      expect(repaired.cartItemId, 3);
    });

    test('an unowned item stays unowned, so legacy carts behave exactly as before', () {
      const arrived = CartItem(menuItemId: 'mi_apollo_fish', cartItemId: 1, quantity: 1);
      expect(CartHelper.repairWithMenuItem(arrived, _menuItem()).addedBy, isNull);
    });
  });
}

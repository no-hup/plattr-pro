// D6 (Shaurya 2026-09-25): the waiter's stock screen switches a shared add-on, once, for every dish.
import 'package:flutter_test/flutter_test.dart';
import 'package:platter_core/platter_core.dart';
import 'package:platter_server/pages/menu_home/menu_provider.dart';

Addon addon(String id, String name, {bool inStock = true}) => Addon(
      id: id,
      meta: AddonMeta(name: name),
      priceInfo: PriceInfo(basePrice: 40, finalPrice: 40, discount: 0),
      isInStock: inStock,
    );

MenuItem biryani(String id, List<Addon> addons) => MenuItem(
      id: id,
      categoryId: 'mc_biryani',
      meta: MenuItemMeta(name: id, description: ''),
      priceInfo: PriceInfo(basePrice: 320, finalPrice: 320, discount: 0),
      nutritionalInfo: const NutritionalInfo(),
      addons: addons,
    );

void main() {
  test('D6: Extra Raita on two biryanis is listed once, and a sold-out raita stays listed as off', () {
    final raitaOff = addon('ma_extra_raita', 'Extra Raita', inStock: false);
    final menu = FullRestaurantMenuResponse(categories: const [], menuItems: {
      'ms_bir_chicken': [biryani('mi_chicken_bir', [raitaOff, addon('ma_extra_egg', 'Boiled Egg')])],
      'ms_bir_veg': [biryani('mi_veg_bir', [raitaOff])],
    });
    final listed = menuAddons(menu);
    expect(listed.map((a) => a.id), ['ma_extra_egg', 'ma_extra_raita']);
    expect(listed.last.isInStock, isFalse);
  });

  test('D6: no menu yet, no add-ons', () {
    expect(menuAddons(null), isEmpty);
  });
}

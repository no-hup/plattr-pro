// TD-134: 20:30 Pizza Bakery runs out of Margherita. The captain opens Menu to switch it off, and the dish must be
// under its heading. The reply below is the shape menu-getRestaurantMenu really sends: dishes grouped by
// subcategory id, never by category id.
import 'package:flutter_test/flutter_test.dart';
import 'package:platter_server/pages/menu_home/menu_provider.dart';
import 'package:platter_server/pages/menu_home/repository/menu_api_service.dart';

Map<String, dynamic> dish(String id, String name, String categoryId, List<String> subIds) => {
      'menuItemId': id,
      'categoryId': categoryId,
      'subcategoryIds': subIds,
      'meta': {'name': name, 'description': ''},
      'priceInfo': {'basePrice': 400, 'finalPrice': 400, 'discount': 0},
      'isInStock': true,
    };

final reply = <String, dynamic>{
  'categories': [
    {'id': 'pc_pizza', 'name': 'Sourdough Pizzas', 'description': '', 'image': null, 'order': 1, 'subcategories': [
      {'id': 'ps_pizza_veg', 'name': 'Veg', 'parentCategoryId': 'pc_pizza', 'order': 1},
      {'id': 'ps_pizza_nonveg', 'name': 'Non-veg', 'parentCategoryId': 'pc_pizza', 'order': 2},
      {'id': 'ps_pizza_chef', 'name': "Chef's picks", 'parentCategoryId': 'pc_pizza', 'order': 3},
    ]},
    {'id': 'pc_pasta', 'name': 'Pastas', 'description': '', 'image': null, 'order': 2, 'subcategories': [
      {'id': 'ps_pasta', 'name': 'Pastas', 'parentCategoryId': 'pc_pasta', 'order': 1},
    ]},
    {'id': 'pc_dessert', 'name': 'Desserts', 'description': '', 'image': null, 'order': 3, 'subcategories': []},
  ],
  'menuItems': {
    'ps_pizza_veg': [
      dish('pi_margherita', 'Margherita', 'pc_pizza', ['ps_pizza_veg', 'ps_pizza_chef']),
      dish('pi_funghi', 'Funghi', 'pc_pizza', ['ps_pizza_veg']),
    ],
    'ps_pizza_chef': [dish('pi_margherita', 'Margherita', 'pc_pizza', ['ps_pizza_veg', 'ps_pizza_chef'])],
    'ps_pizza_nonveg': [dish('pi_pepperoni', 'Pepperoni', 'pc_pizza', ['ps_pizza_nonveg'])],
    'ps_pasta': [dish('pa_arrabbiata', 'Arrabbiata', 'pc_pasta', ['ps_pasta'])],
    // An item with no subcategory is keyed by its category (menuHelpers.organizeMenuWithSubcategories).
    'pc_dessert': [dish('pd_tiramisu', 'Tiramisu', 'pc_dessert', [])],
  },
};

void main() {
  final menu = parseRestaurantMenu(reply);
  List<String> under(String categoryId) => categoryDishes(menu, menu.categories.firstWhere((c) => c.id == categoryId))
      .map((i) => i.meta.name)
      .toList();

  test('TD-134: each heading lists its dishes from every subcategory, a cross-listed Margherita once', () {
    expect(under('pc_pizza'), ['Margherita', 'Funghi', 'Pepperoni']);
    expect(under('pc_pasta'), ['Arrabbiata']);
    expect(under('pc_dessert'), ['Tiramisu']);
  });

  test('TD-134: a dish carries its real category, so the Add dishes "Sourdough Pizzas" chip finds the pizzas', () {
    final pizzas = menuDishes(menu).where((i) => i.categoryId == 'pc_pizza').map((i) => i.meta.name);
    expect(pizzas, ['Margherita', 'Funghi', 'Pepperoni']);
  });
}

// TD-137 (QA2-1): the manager taps the pencil on Chicken 65 (spice 4 in MockData7) to change its price, and the editor
// never opens: the Spice Level dropdown offered 0–3, and a debug build asserts on a value it doesn't list.
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:platter_admin/pages/menu/editors/dish_editor_dialog.dart';
import 'package:platter_admin/pages/menu/menu_api_service.dart';
import 'package:platter_admin/pages/menu/menu_catalog_provider.dart';
import 'package:platter_core/platter_core.dart';

void main() {
  testWidgets('TD-137 the dish editor opens Chicken 65 at spice level 4 and shows 4', (tester) async {
    final chicken65 = MenuItem(
      id: 'mi_chicken65',
      categoryId: 'mc_starters',
      meta: MenuItemMeta(name: 'Chicken 65', description: '', spiceLevel: 4),
      nutritionalInfo: const NutritionalInfo(calories: 0, protein: 0),
      priceInfo: PriceInfo(basePrice: 280, finalPrice: 280, discount: 0),
    );
    await tester.pumpWidget(MaterialApp(
      home: Scaffold(
        body: DishEditorDialog(
          provider: MenuCatalogProvider(apiService: AdminMenuApiService(), restaurantId: 'res_meghana', sessionId: 's'),
          categories: [MenuCategory(id: 'mc_starters', name: 'Starters')],
          initialItem: chicken65,
        ),
      ),
    ));
    expect(tester.takeException(), isNull);
    expect(find.widgetWithText(DropdownButtonFormField<int>, '4'), findsOneWidget);
  });
}

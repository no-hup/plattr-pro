// D6 (Shaurya 2026-09-25): the dish editor saves only the fields the manager changed, add-ons as ids.
// TD-106 (a save turned Raita into an object the menu read dropped) and TD-110 (a stale tab put a sold-out
// dish back on sale). moonshot/reviews/2026-09-25-decisions-for-shaurya.md.
import 'package:flutter_test/flutter_test.dart';
import 'package:platter_admin/pages/menu/menu_catalog_provider.dart';
import 'package:platter_core/platter_core.dart';

Addon addon(String id, String name, num price) => Addon(
      id: id,
      meta: AddonMeta(name: name),
      priceInfo: PriceInfo(basePrice: price, finalPrice: price, discount: 0),
    );

final portion = Variant(
  id: 'mv_bir_portion',
  name: 'Portion',
  meta: const VariantMeta(name: 'Portion'),
  options: [
    VariantOption(id: 'family', name: 'Family (serves 3)', priceInfo: PriceInfo(basePrice: 260, finalPrice: 260, discount: 0)),
  ],
);

MenuItem prawnFry({String description = 'Mangalorean ghee roast', bool inStock = true, List<Addon>? addons}) => MenuItem(
      id: 'mi_prawn_fry',
      categoryId: 'mc_seafood',
      meta: MenuItemMeta(name: 'Prawn Ghee Roast', description: description),
      priceInfo: PriceInfo(basePrice: 420, finalPrice: 420, discount: 0),
      nutritionalInfo: const NutritionalInfo(calories: 380, protein: 30),
      isAvailable: inStock,
      addons: addons ?? [addon('ma_extra_raita', 'Extra Raita', 40)],
      variants: [portion],
    );

void main() {
  group('TD-132 portion editor', portionTests);
  test('TD-110: a description fix from a Menu tab loaded at 18:00 sends meta alone, never isInStock', () {
    // 18:00 the tab loads prawns in stock; 20:30 the kitchen marks them out; 21:00 the fix is saved from the old copy.
    final loaded = prawnFry();
    final edited = prawnFry(description: 'Mangalorean ghee roast, butter-garlic');
    final changes = dishChanges(loaded, edited);
    expect(changes.keys, ['meta']);
    expect(changes['meta']['description'], 'Mangalorean ghee roast, butter-garlic');
  });

  test('TD-106: a changed add-on list goes as ids, never objects', () {
    final loaded = prawnFry();
    final edited = prawnFry(addons: [addon('ma_extra_raita', 'Extra Raita', 40), addon('ma_extra_gravy', 'Extra Gravy', 60)]);
    expect(dishChanges(loaded, edited), {
      'addons': ['ma_extra_raita', 'ma_extra_gravy'],
    });
  });

  test('D6: an untouched dish sends nothing', () {
    expect(dishChanges(prawnFry(), prawnFry()), isEmpty);
  });

  test('D6: a new dish sends portions as {id, name} links and add-ons as ids', () {
    final wire = dishWire(prawnFry());
    expect(wire['variants'], [
      {'id': 'mv_bir_portion', 'name': 'Portion'}
    ]);
    expect(wire['addons'], ['ma_extra_raita']);
    expect(wire.containsKey('isCustomizable'), isFalse);
  });
}

// TD-132 (Shaurya 2026-09-25): the portion editor adds and removes options on the shared record, sending only changes.
void portionTests() {
  test('TD-132: Family ₹260 → ₹280 sends that one option', () {
    expect(portionChanges(portion, 'Portion', const [OptionRow(id: 'family', name: 'Family (serves 3)', price: 280)]).keys,
        contains('options'));
    expect(portionChanges(portion, 'Portion', const [OptionRow(id: 'family', name: 'Family (serves 3)', price: 280)])['options'], [
      {'id': 'family', 'price': 280}
    ]);
  });

  test('TD-132: a new "Jumbo (serves 5) ₹480" row goes as addOptions, nothing else', () {
    expect(
        portionChanges(portion, 'Portion', const [
          OptionRow(id: 'family', name: 'Family (serves 3)', price: 260),
          OptionRow(name: 'Jumbo (serves 5)', price: 480),
        ]),
        {
          'addOptions': [
            {'name': 'Jumbo (serves 5)', 'price': 480}
          ]
        });
  });

  test('TD-132: a deleted Family row goes as removeOptionIds; a rename goes as name', () {
    expect(portionChanges(portion, 'Portion size', const []), {
      'name': 'Portion size',
      'removeOptionIds': ['family'],
    });
  });

  test('TD-132: an untouched group sends nothing', () {
    expect(portionChanges(portion, 'Portion', const [OptionRow(id: 'family', name: 'Family (serves 3)', price: 260)]), isEmpty);
  });
}

// How a captain finds a dish. Fails if the ranking or the normalisation drifts.
import 'package:flutter_test/flutter_test.dart';
import 'package:platter_core/platter_core.dart';
import 'package:platter_server/pages/tables_home/dish_search.dart';

MenuItem dish(String id, String name) => MenuItem(
      id: id,
      meta: MenuItemMeta(name: name, description: ''),
      priceInfo: PriceInfo(basePrice: 100, finalPrice: 100, discount: 0),
      categoryId: 'c',
      nutritionalInfo: const NutritionalInfo(),
    );

void main() {
  final menu = [
    dish('1', 'Butter Chicken'),
    dish('2', 'Chicken 65'),
    dish('3', 'Chilli Paneer'),
    dish('4', 'Paneer Tikka'),
    dish('5', 'Mutton Biryani'),
    dish('6', 'Kingfisher Premium (650 ml)'),
  ];
  List<String> names(String q) => searchDishes(q, menu).map((i) => i.meta.name).toList();

  test('"chi" finds every dish with a word starting chi, name-start hits first', () {
    expect(names('chi'), ['Chicken 65', 'Chilli Paneer', 'Butter Chicken']);
  });
  test('case, spaces and punctuation do not matter', () {
    expect(names('  KING'), ['Kingfisher Premium (650 ml)']);
    expect(names('650'), ['Kingfisher Premium (650 ml)']);
  });
  test('typing without spaces still finds the dish: paneertik → Paneer Tikka', () {
    expect(names('paneertik'), ['Paneer Tikka']);
  });
  test('a mid-word fragment is not a match: "icken" finds nothing', () {
    expect(names('icken'), isEmpty);
  });
  test('an empty query lists everything A to Z', () {
    expect(names(''), ['Butter Chicken', 'Chicken 65', 'Chilli Paneer', 'Kingfisher Premium (650 ml)', 'Mutton Biryani', 'Paneer Tikka']);
  });
}

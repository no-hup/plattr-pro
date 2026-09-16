import 'package:flutter_test/flutter_test.dart';
import 'package:flutterboilerplate/pages/cart_listing/cart_page.dart';
import 'package:flutterboilerplate/pages/menuListing/models/cart_item.dart';

CartItem line(String id, {String? addedBy}) =>
    CartItem(menuItemId: id, addedBy: addedBy);

void main() {
  test('my items are editable, another diner\'s are not', () {
    final (mine, theirs) = splitByOwner(
      [line('pizza', addedBy: 'dev_asha'), line('beer', addedBy: 'dev_bhanu')],
      'dev_asha',
    );
    expect(mine.map((i) => i.menuItemId), ['pizza']);
    expect(theirs.map((i) => i.menuItemId), ['beer']);
  });

  // A cart written before ownership existed, or by a phone still on the old app.
  test('unowned items stay editable by everyone', () {
    final (mine, theirs) = splitByOwner([line('pizza')], 'dev_asha');
    expect(mine, hasLength(1));
    expect(theirs, isEmpty);
  });

  test('a phone with no id yet sees the whole cart as its own, as before', () {
    final (mine, theirs) = splitByOwner(
      [line('pizza', addedBy: 'dev_asha'), line('beer', addedBy: 'dev_bhanu')],
      null,
    );
    expect(mine, hasLength(2));
    expect(theirs, isEmpty);
  });
}

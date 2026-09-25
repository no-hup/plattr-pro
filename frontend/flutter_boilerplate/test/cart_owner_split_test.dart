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

  // D5 (2026-09-25) replaced "unowned items stay editable by everyone": the server already refused a stamped
  // phone's remove of an unowned dish, and refuses it from a guest send. Showing it as yours was a promise the
  // server would not keep, and it put ₹ in "Your dishes" that "Send your dishes" would not send.
  test('an unowned item is nobody\'s: shown, not editable', () {
    final (mine, theirs) = splitByOwner([line('pizza')], 'dev_asha');
    expect(mine, isEmpty);
    expect(theirs, hasLength(1));
  });

  // main() awaits DeviceId.load() before the first request, so this is a phone mid-start. Nothing is its own.
  test('a phone with no id yet owns nothing', () {
    final (mine, theirs) = splitByOwner(
      [line('pizza', addedBy: 'dev_asha'), line('beer', addedBy: 'dev_bhanu')],
      null,
    );
    expect(mine, isEmpty);
    expect(theirs, hasLength(2));
  });
}

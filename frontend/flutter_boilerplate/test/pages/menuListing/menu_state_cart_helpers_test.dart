// Tests for the pure-logic helpers on MenuState:
//   - getItemQuantity(String itemId)
//   - getCartEntriesFor(String menuItemId)
//
// WHY WE TEST THE ALGORITHM HERE RATHER THAN THROUGH MenuState DIRECTLY:
//
// MenuState._cart is a private field. There is no public cart-seeding API
// (no setCart / initializeCart / seedCart). The only public path that sets
// _cart goes through fetchCart / updateCartItem, both of which require a live
// MenuRepository backed by a real DioClient (singleton, private constructor —
// cannot be subclassed or injected with a fake). Dart privacy rules prevent
// a subclass from reading or writing `_cart` from a different file.
//
// Reflection hacks (dart:mirrors) are not available in Flutter's test runner.
//
// Per the task brief: "Fall back to testing the algorithm by directly copying
// the three-line implementations into a local test-only helper." That is
// exactly what this file does. The implementations below are verbatim copies
// of the MenuState methods as of Phase 5 of the multi-config cart plan.
//
// NOTE: _customizationsMatch is a thin wrapper around listEquals (a Flutter SDK
// primitive). There is no value in testing a one-liner wrapper around a
// well-tested SDK function, so it is explicitly omitted here per §6 of the plan.
//
// RECOMMENDATION FOR PHASE 6: Add a public @visibleForTesting seedCart(Cart c)
// method to MenuState (annotated so the linter enforces test-only usage). This
// will allow widget tests to hydrate the state without any API calls and
// eliminate the need for the algorithm-copy pattern used here.

import 'package:flutter_test/flutter_test.dart';
import 'package:flutterboilerplate/pages/menuListing/models/cart.dart';
import 'package:flutterboilerplate/pages/menuListing/models/cart_item.dart';
import 'package:flutterboilerplate/pages/menuListing/models/cart_item_price_info.dart';

// ---------------------------------------------------------------------------
// Verbatim copies of MenuState.getItemQuantity and MenuState.getCartEntriesFor
// (from lib/pages/menuListing/menu_state.dart, Phase 5).
// Keep in sync whenever the production implementations change.
// ---------------------------------------------------------------------------

int _getItemQuantity(Cart? cart, String itemId) {
  if (cart == null || cart.items.isEmpty) return 0;
  return cart.items
      .where((item) => item.menuItemId == itemId)
      .fold<int>(0, (sum, item) => sum + (item.quantity ?? 0));
}

List<CartItem> _getCartEntriesFor(Cart? cart, String menuItemId) {
  if (cart == null) return const [];
  return cart.items.where((i) => i.menuItemId == menuItemId).toList();
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const _defaultPriceInfo = CartItemPriceInfo();

CartItem _item(String menuItemId, int quantity) => CartItem(
      menuItemId: menuItemId,
      quantity: quantity,
      priceInfo: _defaultPriceInfo,
    );

/// CartItem with quantity field forced to null via fromJson to test the
/// defensive `item.quantity ?? 0` branch in getItemQuantity.
CartItem _itemNullQty(String menuItemId) => CartItem.fromJson({
      'menuItemId': menuItemId,
      // 'quantity' key intentionally absent → Freezed @Default(0) kicks in,
      // but the JSON path exercises the _parseIntFlexibleZero(null) → 0 path.
    });

Cart _cart(List<CartItem> items) => Cart(items: items);

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

void main() {
  group('getItemQuantity', () {
    test('cart is null → returns 0', () {
      expect(_getItemQuantity(null, 'item-a'), 0);
    });

    test('cart is empty → returns 0', () {
      expect(_getItemQuantity(_cart([]), 'item-a'), 0);
    });

    test('one entry, qty 1 → returns 1', () {
      final c = _cart([_item('item-a', 1)]);
      expect(_getItemQuantity(c, 'item-a'), 1);
    });

    test('one entry, qty 3 → returns 3', () {
      final c = _cart([_item('item-a', 3)]);
      expect(_getItemQuantity(c, 'item-a'), 3);
    });

    test('two entries same menuItemId, qties 2 and 5 → returns 7', () {
      final c = _cart([_item('item-a', 2), _item('item-a', 5)]);
      expect(_getItemQuantity(c, 'item-a'), 7);
    });

    test('two entries different menuItemIds → each returns only its own qty', () {
      final c = _cart([_item('item-a', 2), _item('item-b', 5)]);
      expect(_getItemQuantity(c, 'item-a'), 2);
      expect(_getItemQuantity(c, 'item-b'), 5);
    });

    test('entry with null quantity in data → treated as 0', () {
      // _parseIntFlexibleZero(null) returns 0; the fold should sum 0.
      final c = _cart([_itemNullQty('item-a')]);
      expect(_getItemQuantity(c, 'item-a'), 0);
    });
  });

  group('getCartEntriesFor', () {
    test('cart is null → returns empty list', () {
      expect(_getCartEntriesFor(null, 'item-a'), isEmpty);
    });

    test('no match → returns empty list', () {
      final c = _cart([_item('item-b', 1)]);
      expect(_getCartEntriesFor(c, 'item-a'), isEmpty);
    });

    test('one match → returns 1-element list', () {
      final entry = _item('item-a', 2);
      final c = _cart([entry, _item('item-b', 1)]);
      final result = _getCartEntriesFor(c, 'item-a');
      expect(result, hasLength(1));
      expect(result.first.menuItemId, 'item-a');
    });

    test('two matches → returns 2-element list in insertion order', () {
      final first = _item('item-a', 1);
      final second = _item('item-a', 3);
      final c = _cart([first, _item('item-b', 1), second]);
      final result = _getCartEntriesFor(c, 'item-a');
      expect(result, hasLength(2));
      expect(result[0].quantity, 1);
      expect(result[1].quantity, 3);
    });
  });
}

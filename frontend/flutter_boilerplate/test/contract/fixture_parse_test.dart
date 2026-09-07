/// Parses REAL captured backend responses through the REAL consumer models.
///
/// The fixtures under backend/.../test/e2e/fixtures/golden are written by the
/// live lifecycle matrix, so this asserts the app can read what the backend
/// actually returned, not a hand-written sample.
///
/// Note on why this checks VALUES and not just "no exception": OrderResponse
/// and OrderData both catch their own parse errors and return an error state.
/// A broken response therefore produces a perfectly valid object full of
/// zeroes and empty strings. Asserting "it did not throw" would pass on a
/// total parse failure, so every check below compares against the fixture.
///
/// No emulator and no network needed.
/// Run: flutter test test/contract
@Tags(['contract'])
library;

import 'dart:convert';
import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:flutterboilerplate/pages/checkout_order_flow/models/order_models.dart';

const _fixtureRoot =
    '../../backend/src-plattr/functions/test/e2e/fixtures/golden';

List<File> _fixtures(String endpoint) {
  final dir = Directory('$_fixtureRoot/$endpoint');
  if (!dir.existsSync()) return const [];
  return dir
      .listSync()
      .whereType<File>()
      .where((f) => f.path.endsWith('.json'))
      .toList()
    ..sort((a, b) => a.path.compareTo(b.path));
}

Map<String, dynamic> _read(File f) =>
    jsonDecode(f.readAsStringSync()) as Map<String, dynamic>;

void main() {
  final orderFixtures = _fixtures('order-getOrder');

  group('consumer parses live order responses', () {
    test('fixture corpus exists', () {
      expect(
        orderFixtures,
        isNotEmpty,
        reason: 'No fixtures at $_fixtureRoot. Run the backend matrix first: '
            'node test/e2e/matrix/run-matrix.mjs',
      );
    });

    for (final file in orderFixtures) {
      final name = file.uri.pathSegments.last;

      test('$name survives OrderResponse.fromJson with its values intact', () {
        final body = _read(file);
        if (body['status'] != 'success') return; // error fixtures parse elsewhere

        final raw = (body['data'] as Map).cast<String, dynamic>();
        final parsed = OrderResponse.fromJson(body);

        expect(parsed.data, isNotNull,
            reason: 'the model fell back to an error state for $name');
        final order = parsed.data!;

        // Identity must survive, or the app is showing someone else's order.
        expect(order.id, raw['id'],
            reason: 'order id was lost or defaulted during parsing');
        expect(order.orderNumber, raw['orderNumber']);
        expect(order.tableId, raw['tableId']);
        expect(order.restaurantId, raw['restaurantId']);
        expect(order.orderStatus, isNotEmpty);
        expect(order.orderStatus, isNot('UNKNOWN'),
            reason: 'orderStatus did not resolve, so the order screen cannot '
                'tell the customer what is happening');

        // Money must survive exactly. This is the number the customer pays.
        final expectedTotal = (raw['total'] as num?)?.toDouble() ?? 0.0;
        expect(order.total, closeTo(expectedTotal, 0.01),
            reason: 'the total the app shows does not match the backend');

        // The order list the customer scrolls through.
        final rawCarts = (raw['carts'] as List<dynamic>? ?? const []);
        expect(order.carts.length, rawCarts.length,
            reason: 'cart rounds were dropped while building the list');

        final rawItems = (raw['items'] as List<dynamic>? ?? const []);
        expect(order.items.length, rawItems.length,
            reason: 'items were dropped while building the list');

        for (final item in order.items) {
          expect(item.name, isNotEmpty,
              reason: 'an order line has no name to show the customer');
          expect(item.quantity, greaterThan(0));
        }

        // Timestamps drive the "placed at" line.
        if (raw['createdAt'] != null) {
          expect(order.createdAt, isNotNull,
              reason: 'createdAt was present in the response but did not parse');
          expect(order.createdAt!.millisecondsSinceEpoch, greaterThan(0),
              reason: 'createdAt fell back to epoch 0, so the order shows as '
                  'placed in 1970');
        }
      });
    }
  });

  group('consumer order totals reconcile', () {
    for (final file in orderFixtures) {
      final name = file.uri.pathSegments.last;

      test('$name total is consistent with its priceInfo', () {
        final body = _read(file);
        if (body['status'] != 'success') return;
        final raw = (body['data'] as Map).cast<String, dynamic>();
        final priceInfo = raw['priceInfo'] as Map<String, dynamic>?;
        if (priceInfo == null) return;

        final total = (raw['total'] as num?)?.toDouble() ?? 0.0;
        final finalPrice = (priceInfo['finalPrice'] as num?)?.toDouble() ?? 0.0;

        expect(total, closeTo(finalPrice, 0.01),
            reason: 'order.total and order.priceInfo.finalPrice disagree, so '
                'two screens reading different fields show different bills');

        // A charge breakdown must add up to the charges total it ships with.
        final charges = (priceInfo['charges'] as List<dynamic>? ?? const []);
        if (charges.isNotEmpty) {
          final sum = charges.fold<double>(
            0,
            (acc, c) =>
                acc + ((c as Map)['amount'] as num?)!.toDouble(),
          );
          final chargesTotal =
              (priceInfo['chargesTotal'] as num?)?.toDouble() ?? 0.0;
          expect(sum, closeTo(chargesTotal, 0.01),
              reason: 'the itemised charges do not sum to chargesTotal');
        }
      });
    }
  });

  // ── What an order line actually costs ──────────────────────────────────────
  // The June 2026 merge made order.items[].priceInfo PER-UNIT while
  // order.carts[].items[].priceInfo stayed a LINE TOTAL. Both lists are
  // normalised into the same OrderItem and rendered by the same OrderItemTile,
  // which shows `price * quantity`. Until then every fixture used quantity 1,
  // where the two shapes are indistinguishable — which is exactly why the
  // change passed every layer of the harness. These tests need a fixture with
  // quantity > 1 to say anything, and the item-price-shape scenario captures one.
  group('consumer order line prices', () {
    for (final file in orderFixtures) {
      final name = file.uri.pathSegments.last;

      test('$name — the flat item list rebuilds the order total', () {
        final body = _read(file);
        if (body['status'] != 'success') return;
        final raw = (body['data'] as Map).cast<String, dynamic>();
        final priceInfo = raw['priceInfo'] as Map<String, dynamic>?;
        if (priceInfo == null) return;

        final parsed = OrderResponse.fromJson(body);
        final order = parsed.data;
        if (order == null || order.items.isEmpty) return;

        // price is per-unit AND all-inclusive: variants and addons are already
        // inside it. They are still emitted alongside as display metadata, so
        // adding them here would double-count the same money.
        var rebuilt = 0.0;
        for (final item in order.items) {
          rebuilt += item.price * item.quantity;
        }

        final finalPrice = (priceInfo['finalPrice'] as num?)?.toDouble() ?? 0.0;
        final offerDiscount =
            (priceInfo['offerDiscount'] as num?)?.toDouble() ?? 0.0;

        expect(rebuilt, closeTo(finalPrice + offerDiscount, 1.0),
            reason: 'the itemised lines do not add up to the bill the customer '
                'is shown, so the order screen cannot be reconciled by hand');
      });

      test('$name — both item lists agree on what a unit costs', () {
        final body = _read(file);
        if (body['status'] != 'success') return;
        final parsed = OrderResponse.fromJson(body);
        final order = parsed.data;
        if (order == null) return;

        // order.items[] is per-unit; order.carts[].items[] arrives as a line
        // total and _sanitizeCartItems divides it back down. After that both
        // lists feed the same OrderItemTile, which renders price x quantity,
        // so a disagreement here is two different bills on one screen.
        for (final cart in order.carts) {
          for (final histItem in cart.items) {
            if (histItem.quantity < 2) continue;   // units coincide at qty 1
            final flat = order.items
                .where((i) => i.menuItemId == histItem.menuItemId)
                .toList();
            if (flat.isEmpty) continue;

            expect(histItem.price, closeTo(flat.first.price, 0.01),
                reason: 'the cart-history list and the flat item list price the '
                    'same unit differently, so the order screen contradicts '
                    'itself at quantity ${histItem.quantity}');
          }
        }
      });
    }
  });
}

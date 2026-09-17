/// Parses REAL captured backend responses through the REAL kitchen models.
///
/// The fixtures under backend/.../test/e2e/fixtures/golden are written by the
/// live lifecycle matrix, so this suite asserts the app can read exactly what
/// the backend produced today, not what someone hand-wrote months ago.
///
/// It needs no emulator and no network: the API service is stubbed with the
/// fixture body so the repository's real flatten and sanitize path runs.
///
/// Run: flutter test test/contract
@Tags(['contract'])
library;

import 'dart:convert';
import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:platter_core/platter_core.dart';
import 'package:platter_kitchen/core/kitchen_repository.dart';
import 'package:platter_kitchen/models/active_order_models.dart';
import 'package:platter_kitchen/network/kitchen_order_api_service.dart';

const _fixtureRoot =
    '../../../../backend/src-plattr/functions/test/e2e/fixtures/golden';

/// Feeds a canned body to the repository instead of hitting the network.
class _StubApi extends KitchenOrderApiService {
  _StubApi(this.body);
  final Map<String, dynamic> body;

  @override
  Future<ApiResponse<Map<String, dynamic>>> getActiveCartsForKitchen({
    required String restaurantId,
    required String sessionId,
  }) async =>
      ApiResponse.success(body);
}

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
  group('kitchen parses live backend responses', () {
    final files = _fixtures('order-getActiveCartsForKitchen');

    test('fixture corpus exists', () {
      expect(
        files,
        isNotEmpty,
        reason: 'No fixtures found at $_fixtureRoot. Run the backend matrix '
            'first: node test/e2e/matrix/run-matrix.mjs',
      );
    });

    for (final file in files) {
      final name = file.uri.pathSegments.last;

      test('$name flattens into kitchen tickets', () async {
        final body = _read(file);
        final data = (body['data'] as Map).cast<String, dynamic>();
        final repo = KitchenRepository(apiService: _StubApi(data));

        final result = await repo.getActiveCarts(
          restaurantId: 'res_meghana',
          sessionId: 'stub',
        );

        // Every cart in every order must survive the flatten, except the ones
        // the kitchen view deliberately drops (SERVED / CANCELLED).
        final orders = (data['orders'] as List<dynamic>? ?? const []);
        expect(orders, isNotEmpty, reason: 'fixture has no orders to flatten');

        for (final cart in result.carts) {
          expect(cart.cartId, isNotEmpty, reason: 'ticket has no id');
          expect(cart.orderId, isNotEmpty, reason: 'ticket has no order id');
          expect(cart.tableNumber, isNotEmpty,
              reason: 'ticket ${cart.cartId} has no table to deliver to');
          expect(cart.items, isNotEmpty,
              reason: 'ticket ${cart.cartId} has no items to cook');

          // A ticket the cook cannot read is as bad as a missing ticket.
          for (final item in cart.items) {
            expect(item.name, isNotEmpty);
            expect(item.name, isNot(equalsIgnoringCase('Unknown Item')),
                reason: 'item name did not resolve from the response; the '
                    'kitchen would print an unreadable ticket');
            expect(item.quantity, greaterThan(0));
          }

          // submittedAt drives the "how long has this been waiting" timer.
          expect(
            cart.submittedAt.millisecondsSinceEpoch,
            greaterThan(0),
            reason: 'submittedAt fell back to epoch 0, so the kitchen timer '
                'would show this ticket as decades old',
          );
        }
      });
    }
  });
}

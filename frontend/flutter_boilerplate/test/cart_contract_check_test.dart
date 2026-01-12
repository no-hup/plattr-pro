import 'dart:convert';
import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:flutterboilerplate/pages/menuListing/models/cart_operation_response.dart';

void main() {
  group('Cart API contract parsing', () {
    // Directory containing JSON responses captured by backend cart flow validator
    // Set via env var CONTRACT_DIR; if not set, test will be skipped.
    final contractDir = Platform.environment['CONTRACT_DIR'];

    if (contractDir == null ||
        contractDir.isEmpty ||
        !Directory(contractDir).existsSync()) {
      test('skip - CONTRACT_DIR not set or invalid', () {
        expect(true, isTrue,
            reason: 'Set CONTRACT_DIR to directory with *.json responses',);
      });
      return;
    }

    final dir = Directory(contractDir);
    final files = dir
        .listSync()
        .whereType<File>()
        .where((f) => f.path.endsWith('.json'))
        .toList()
      ..sort((a, b) => a.path.compareTo(b.path));

    if (files.isEmpty) {
      test('skip - no json files found in CONTRACT_DIR', () {
        expect(true, isTrue, reason: 'Place *.json responses in $contractDir');
      });
      return;
    }

    for (final file in files) {
      test('parse ${file.uri.pathSegments.last}', () {
        final raw = file.readAsStringSync();
        final json = jsonDecode(raw) as Map<String, dynamic>;

        // CartOperationResponse handles optional result envelope and data/cart extraction
        final parsed = CartOperationResponse.fromJson(json);

        // Basic assertions common to add/get responses
        expect(parsed.status.isNotEmpty, true,
            reason: 'status should not be empty',);
        expect(parsed.message.isNotEmpty, true,
            reason: 'message should not be empty',);

        final cart = parsed.data?.cart;
        expect(cart, isNotNull, reason: 'data.cart should not be null');
        expect(cart!.items, isNotNull, reason: 'cart.items should not be null');

        // Price info sanity checks
        final price = cart.priceInfo;
        if (price != null) {
          expect(price.basePrice is num, true,
              reason: 'basePrice must be number',);
          expect(price.finalPrice is num, true,
              reason: 'finalPrice must be number',);
          expect(price.totalAddonBasePrice is num, true,
              reason: 'totalAddonBasePrice must be number',);
          expect(price.totalVariantBasePrice is num, true,
              reason: 'totalVariantBasePrice must be number',);
        }
      });
    }
  });
}

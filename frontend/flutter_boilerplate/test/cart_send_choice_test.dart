// D5 (Shaurya 2026-09-25) · the guest's shared cart asks what to send.
// Hand-computed at Meghana, table 9: Asha's phone added Chicken 65 ₹280 (#1), Bhanu's a Butter Naan ₹60 (#2),
// the captain a Coastal Crab Roast ₹620 (#3, staff). Asha's cart reads "Your dishes ₹280 · Table ₹340"
// (the crab is the captain's to send). Proceed asks "Send your 1 dish" or "Send all 2 for the table", and
// each sends the ids it showed: [1] or [1, 2].
import 'dart:convert';
import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutterboilerplate/pages/cart_listing/cart_page.dart';
import 'package:flutterboilerplate/pages/checkout_order_flow/checkout_repository.dart';
import 'package:flutterboilerplate/pages/checkout_order_flow/checkout_request_id.dart';
import 'package:flutterboilerplate/pages/menuListing/models/cart_item.dart';
import 'package:flutterboilerplate/pages/menuListing/models/cart_item_price_info.dart';

CartItem dish(int id, String name, num price, String? by) => CartItem(
      menuItemId: name,
      cartItemId: id,
      quantity: 1,
      addedBy: by,
      priceInfo: CartItemPriceInfo(finalPrice: price),
    );

final table9 = [
  dish(1, 'Chicken 65', 280, 'dev_asha'),
  dish(2, 'Butter Naan', 60, 'dev_bhanu'),
  dish(3, 'Coastal Crab Roast', 620, 'staff:captain_1'),
];

/// Pumps a button that runs [askWhatToSend] and keeps what it answered.
Future<List<int>? Function()> pumpAsk(WidgetTester tester, SendChoice choice) async {
  List<int>? answer;
  await tester.pumpWidget(MaterialApp(
    home: Scaffold(
      body: Builder(
        builder: (context) => TextButton(
          onPressed: () async => answer = await askWhatToSend(context, choice),
          child: const Text('PROCEED'),
        ),
      ),
    ),
  ));
  await tester.tap(find.text('PROCEED'));
  await tester.pumpAndSettle();
  return () => answer;
}

class _Capture implements HttpClientAdapter {
  final bodies = <Map<String, dynamic>>[];
  @override
  Future<ResponseBody> fetch(RequestOptions options, Stream<Uint8List>? requestStream, Future<void>? cancelFuture) async {
    bodies.add(Map<String, dynamic>.from(options.data as Map));
    return ResponseBody.fromString(jsonEncode({'result': {'status': 'success', 'message': 'ok', 'data': {'orderId': 'o1', 'retry': false}}}), 200,
        headers: {'content-type': ['application/json']});
  }
  @override
  void close({bool force = false}) {}
}

void main() {
  group('the split each phone sees', () {
    test("Asha's phone: your dishes [1] ₹280, the table [1, 2] ₹340; the captain's crab is in neither", () {
      final c = sendChoice(table9, 'dev_asha');
      expect(c.mineIds, [1]);
      expect(c.mineTotal, 280);
      expect(c.tableIds, [1, 2]);
      expect(c.tableTotal, 340);
    });

    test("Bhanu's phone: your dishes [2] ₹60, the same table ₹340", () {
      final c = sendChoice(table9, 'dev_bhanu');
      expect(c.mineIds, [2]);
      expect(c.mineTotal, 60);
      expect(c.tableTotal, 340);
    });

    test('an unowned dish is nobody\'s: not yours, not the table\'s to send (the server refuses it)', () {
      final c = sendChoice([dish(1, 'Chicken 65', 280, 'dev_asha'), dish(2, 'Butter Naan', 60, null)], 'dev_asha');
      expect(c.tableIds, [1]);
      final (mine, theirs) = splitByOwner([dish(2, 'Butter Naan', 60, null)], 'dev_asha');
      expect(mine, isEmpty, reason: 'shown as editable, but the server would refuse its remove and its send');
      expect(theirs, hasLength(1));
    });

    testWidgets('the cart reads "Your dishes ₹280 · Table ₹340"', (tester) async {
      await tester.pumpWidget(MaterialApp(home: Scaffold(body: SendTotals(choice: sendChoice(table9, 'dev_asha')))));
      expect(find.text('Your dishes ₹280 · Table ₹340'), findsOneWidget);
    });
  });

  group('Proceed asks what to send', () {
    testWidgets('two choices; "Send all 2 for the table" answers [1, 2]', (tester) async {
      final answer = await pumpAsk(tester, sendChoice(table9, 'dev_asha'));
      expect(find.text('Send your 1 dish'), findsOneWidget);
      await tester.tap(find.text('Send all 2 for the table'));
      await tester.pumpAndSettle();
      expect(answer(), [1, 2]);
    });

    testWidgets('"Send your 1 dish" answers [1]', (tester) async {
      final answer = await pumpAsk(tester, sendChoice(table9, 'dev_asha'));
      await tester.tap(find.text('Send your 1 dish'));
      await tester.pumpAndSettle();
      expect(answer(), [1]);
    });

    // TD-131: with only a friend's dish on the cart, "Send your 0 dishes" is not offered.
    testWidgets('nothing of yours: only "Send all 2 for the table"', (tester) async {
      await pumpAsk(tester, sendChoice(table9, 'dev_chetan'));
      expect(find.textContaining('Send your'), findsNothing);
      expect(find.text('Send all 2 for the table'), findsOneWidget);
    });

    testWidgets('only your own dishes on the cart: no question, they go', (tester) async {
      final answer = await pumpAsk(tester, sendChoice([dish(1, 'Chicken 65', 280, 'dev_asha')], 'dev_asha'));
      expect(find.textContaining('Send'), findsNothing);
      expect(answer(), [1]);
    });
  });

  group('what goes on the wire', () {
    test('checkout carries the ids the phone showed', () async {
      final adapter = _Capture();
      final dio = Dio(BaseOptions(baseUrl: 'http://127.0.0.1:1'))..httpClientAdapter = adapter;
      await CheckoutRepository(dio: dio).checkoutCart(restaurantId: 'r1', tableId: 't9', sessionId: 's1', cartItemIds: [1, 2]);
      expect((adapter.bodies.single['data'] as Map)['cartItemIds'], [1, 2]);
    });

    // A "Send mine" that timed out keeps its requestId for a retry; switching to "Send all" is a new act,
    // or the server refuses it as "requestId already used for a different cart".
    test('a different choice of dishes gets a new requestId; the same one keeps it', () {
      final id = CheckoutRequestId();
      final mine = id.forItems([1]);
      expect(id.forItems([1]), mine);
      expect(id.forItems([1, 2]), isNot(mine));
    });
  });
}

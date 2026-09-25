// D4 (2026-09-25): the waiter cancels one dish of a sent round. Table 6 sent Chicken 65 and Butter Naan; the
// Chicken 65 is already served. Only a dish not yet served offers Cancel, and the tap hands back that dish.
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:platter_server/widgets/cart_detail_card.dart';

Map<String, dynamic> round(String status, List<Map<String, dynamic>> items) =>
    {'cartId': 'c1', 'status': status, 'items': items};

Future<void> pump(WidgetTester tester, Map<String, dynamic> cart,
    {void Function(Map<String, dynamic>)? onCancel}) {
  return tester.pumpWidget(MaterialApp(
    home: Scaffold(
      body: SingleChildScrollView(
        child: CartDetailCard(
          cart: cart,
          index: 0,
          onMarkServed: (_) {},
          onItemServed: (_) {},
          onItemCancel: onCancel,
        ),
      ),
    ),
  ));
}

void main() {
  final chicken = {'cartItemId': 1, 'name': 'Chicken 65', 'quantity': 1, 'status': 'SERVED'};
  final naan = {'cartItemId': 2, 'name': 'Butter Naan', 'quantity': 1, 'status': 'READY'};

  testWidgets('the dish not yet served offers Cancel; the served one does not', (tester) async {
    await pump(tester, round('READY', [chicken, naan]), onCancel: (_) {});
    expect(find.byTooltip('Cancel this dish'), findsOneWidget);
  });

  testWidgets('tapping Cancel hands back that dish, not the round', (tester) async {
    Map<String, dynamic>? cancelled;
    await pump(tester, round('READY', [chicken, naan]), onCancel: (item) => cancelled = item);
    await tester.tap(find.byTooltip('Cancel this dish'));
    expect(cancelled?['cartItemId'], 2);
  });

  testWidgets('a cancelled dish offers nothing more', (tester) async {
    await pump(tester, round('READY', [chicken, {...naan, 'status': 'CANCELLED'}]), onCancel: (_) {});
    expect(find.byTooltip('Cancel this dish'), findsNothing);
  });

  testWidgets('no cancel handler, no button (the served history view)', (tester) async {
    await pump(tester, round('PENDING', [naan]));
    expect(find.byTooltip('Cancel this dish'), findsNothing);
  });
}

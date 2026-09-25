// TD-141 (QA2-5): an order placed 00:37 IST on 26 Sep read "Sep 25 • 7:07 PM": the backend's UTC time was shown as local.
// TD-142 (QA2-6): the order the list shows at ₹1,186 opened at ₹0: the detail summed a cart field carts don't carry.
import 'package:flutter_test/flutter_test.dart';
import 'package:platter_admin/pages/orders/orders_api_service.dart';

void main() {
  test('TD-141 an order time is shown in the device\'s own time, not UTC', () {
    final t = localTime('2026-09-25T19:07:36.000Z')!;
    expect(t.isUtc, isFalse);
    expect(t, DateTime.utc(2026, 9, 25, 19, 7, 36).toLocal());
    expect(localTime(null), isNull);
  });
  test('TD-142 the detail total is the order\'s own total, the list card\'s number (₹1,186)', () {
    final d = OrderDetails.fromJson({'id': 'ord_1', 'totalAmount': 1186, 'carts': [{'items': []}]});
    expect(d.totalAmount, 1186);
  });
}

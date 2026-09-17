// UI-1: the backend returns tables in Firestore document-id order, so the
// table list read "1, 10, 11, 12, 2, 3 ...". Tables must come out numerically
// ordered, with a string fallback for non-numeric labels.

import 'package:flutter_test/flutter_test.dart';
import 'package:flutterboilerplate/home/models/restaurant_summary.dart';

Map<String, dynamic> _payload(List<String> labels) => {
      'id': 'res_1',
      'name': 'Test',
      'tables': [
        for (final label in labels) {'id': 'tbl_$label', 'label': label},
      ],
    };

void main() {
  test('numeric table labels sort numerically', () {
    final restaurant =
        RestaurantSummary.fromJson(_payload(['1', '10', '11', '12', '2', '3']));

    expect(
      restaurant.tables.map((t) => t.label).toList(),
      ['1', '2', '3', '10', '11', '12'],
    );
  });

  test('non-numeric table labels fall back to string order', () {
    final restaurant =
        RestaurantSummary.fromJson(_payload(['Patio B', '2', 'Patio A', '1']));

    expect(
      restaurant.tables.map((t) => t.label).toList(),
      ['1', '2', 'Patio A', 'Patio B'],
    );
  });
}

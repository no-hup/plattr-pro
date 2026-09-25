// TD-143 (QA2-7): table 4 is held for an 8 pm booking; Operations drew it AVAILABLE with a live switch, and off then on
// wrote `vacant` over the booking. The card reads the table's real state, and a booked table has no switch.
import 'package:flutter_test/flutter_test.dart';
import 'package:platter_admin/pages/operations/tables_api_service.dart';

TableInfo table(String status) => TableInfo(id: 'tbl_meg_4', number: '4', status: status, isOccupied: status == 'active');

void main() {
  test('TD-143 each floor state reads as itself', () {
    expect(table('reserved').label, 'RESERVED');
    expect(table('vacant').label, 'AVAILABLE');
    expect(table('active').label, 'OCCUPIED');
    expect(table('disabled').label, 'DISABLED');
  });
  test('TD-143 a reserved or occupied table has no on/off switch; a free or switched-off one does', () {
    expect(table('reserved').canSwitch, isFalse);
    expect(table('active').canSwitch, isFalse);
    expect(table('vacant').canSwitch, isTrue);
    expect(table('disabled').canSwitch, isTrue);
  });
}

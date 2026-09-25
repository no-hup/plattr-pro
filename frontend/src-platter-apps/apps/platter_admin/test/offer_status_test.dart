// TD-144 (QA2-8): "Expired Ugadi Offer" and "Monsoon 5 % off" (1–10 Sep) both read Active in green; neither fires.
// The label now comes from the switch and the stored window, the same instants the engine reads (A26).
import 'package:flutter_test/flutter_test.dart';
import 'package:platter_admin/pages/offers/models/offer_model.dart';

OfferModel monsoon({bool on = true, String start = '2026-09-01T00:00:00.000+05:30', String end = '2026-09-10T23:59:59.999+05:30'}) =>
    OfferModel(id: 'off_monsoon', title: 'Monsoon 5 % off', description: '', type: 'PERCENTAGE', scope: 'ORDER',
        isActive: on, validity: {'startDate': start, 'endDate': end});

void main() {
  // 20:00 IST = 14:30 UTC.
  final at = (String isoUtc) => DateTime.parse(isoUtc);
  test('TD-144 an offer run 1–10 Sep reads Ended on 26 Sep, even with its switch on', () {
    expect(monsoon().statusAt(at('2026-09-26T14:30:00Z')), 'Ended');
  });
  test('TD-144 Running on its last day until 23:59 IST; Ended at 00:00 IST the next day', () {
    expect(monsoon().statusAt(at('2026-09-10T18:29:00Z')), 'Running');   // 23:59 IST 10 Sep
    expect(monsoon().statusAt(at('2026-09-10T18:30:00Z')), 'Ended');     // 00:00 IST 11 Sep
  });
  test('TD-144 before its first day it reads Scheduled; switched off it reads Off', () {
    expect(monsoon().statusAt(at('2026-08-31T18:29:00Z')), 'Scheduled'); // 23:59 IST 31 Aug
    expect(monsoon(on: false).statusAt(at('2026-09-05T14:30:00Z')), 'Off');
  });
  test('TD-144 an offer doc with no isActive reads Off, as the engine never fires it', () {
    final noSwitch = OfferModel.fromJson({'id': 'off_x', 'validity': {'startDate': '2026-09-01T00:00:00.000+05:30', 'endDate': '2026-09-10T23:59:59.999+05:30'}});
    expect(noSwitch.statusAt(at('2026-09-05T14:30:00Z')), 'Off');
  });
  test('TD-144 dates with no zone never fire (the engine refuses them), so they read Off', () {
    expect(monsoon(start: '2026-09-01', end: '2026-09-10').statusAt(at('2026-09-05T14:30:00Z')), 'Off');
  });
}

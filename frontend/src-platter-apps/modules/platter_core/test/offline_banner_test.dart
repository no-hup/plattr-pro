// OF-S5 · the shared offline banner (moonshot/SPEC_OF_offline_and_sync.md R5).
// Hand-computed with a fake clock: staleAfterSeconds 15; last answer 20:38:00, failure at 20:40:00
// → "No connection since 20:38" (the last ANSWERED call's time, not the failure's); an answered call
// clears it; a slow call that has not answered yet shows nothing; never answered → "No connection yet".
import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:platter_core/src/network/offline_status.dart';
import 'package:platter_core/src/widgets/offline_banner.dart';

void main() {
  DateTime now = DateTime(2026, 9, 16, 20, 40);
  OfflineStatus status() => OfflineStatus(now: () => now);

  test('OF-S5 a failed call sets lastFailedAt; banner text is "No connection since 20:38" (last answered)', () {
    final s = status();
    now = DateTime(2026, 9, 16, 20, 38);
    s.answered();
    now = DateTime(2026, 9, 16, 20, 40);
    s.failed();
    expect(s.isOffline, isTrue);
    expect(s.bannerText, 'No connection since 20:38');
    s.dispose();
  });

  test('OF-S5 an answered call after a failure clears the banner; a failure 5 s after an answer is not yet stale', () {
    final s = status();
    now = DateTime(2026, 9, 16, 20, 38);
    s.answered();
    now = DateTime(2026, 9, 16, 20, 40);
    s.failed();
    now = DateTime(2026, 9, 16, 20, 40, 30);
    s.answered();
    expect(s.bannerText, isNull);
    now = DateTime(2026, 9, 16, 20, 40, 35);
    s.failed();
    expect(s.bannerText, isNull, reason: 'the last answer is 5 s old, under staleAfterSeconds 15');
    now = DateTime(2026, 9, 16, 20, 40, 46);
    expect(s.bannerText, 'No connection since 20:40');
    s.dispose();
  });

  test('OF-S5 a call still in flight for 20 s shows no banner (OF-S16 twin)', () {
    final s = status();
    now = DateTime(2026, 9, 16, 20, 38);
    s.answered();
    now = DateTime(2026, 9, 16, 20, 38, 20);   // nothing answered, nothing failed
    expect(s.isOffline, isFalse);
    expect(s.bannerText, isNull);
    s.dispose();
  });

  test('OF-S5 no call has ever answered → "No connection yet", never a blank', () {
    final s = status();
    s.failed();
    expect(s.bannerText, 'No connection yet');
    s.dispose();
  });

  test('R5 the interceptor: a server error body counts as answered; a connection error counts as failed', () {
    final s = status();
    final i = OfflineStatusInterceptor(s);
    final o = RequestOptions(path: '/x');
    // handler.next() completes the handler's future with the error; nobody awaits it here, so ignore it.
    ErrorInterceptorHandler h() => ErrorInterceptorHandler()..future.ignore();
    now = DateTime(2026, 9, 16, 20, 38);
    i.onError(DioException(requestOptions: o, type: DioExceptionType.badResponse, response: Response(requestOptions: o, statusCode: 500)), h());
    expect(s.lastAnsweredAt, DateTime(2026, 9, 16, 20, 38));
    now = DateTime(2026, 9, 16, 20, 40);
    i.onError(DioException(requestOptions: o, type: DioExceptionType.connectionError), h());
    expect(s.bannerText, 'No connection since 20:38');
    s.dispose();
  });

  testWidgets('OF-S5 the widget shows the strip while offline and drops it on the next answer', (tester) async {
    final s = status();
    now = DateTime(2026, 9, 16, 20, 38);
    s.answered();
    await tester.pumpWidget(MaterialApp(home: OfflineBanner(status: s, child: const Text('screen'))));
    expect(find.byKey(const Key('offline-banner')), findsNothing);
    now = DateTime(2026, 9, 16, 20, 40);
    s.failed();
    await tester.pump();
    expect(find.text('No connection since 20:38'), findsOneWidget);
    expect(find.text('screen'), findsOneWidget);   // the screen underneath is untouched
    s.answered();
    await tester.pump();
    expect(find.byKey(const Key('offline-banner')), findsNothing);
    s.dispose();
  });
}

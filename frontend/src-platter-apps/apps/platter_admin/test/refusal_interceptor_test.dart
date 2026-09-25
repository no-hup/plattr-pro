// TD-138 (QA2-2): with an expired session the manager flipped Butter Naan off at 21:00; the switch stayed on,
// nothing was said, and guests kept ordering naan. Every refused call must show the backend's own words, and an
// expired session must send the manager to log in. Bodies below are what a callable HttpsError answers.
import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:platter_admin/network/refusal_interceptor.dart';

class _Answer implements HttpClientAdapter {
  _Answer(this.status, this.body);
  final int status;
  final String body;
  @override
  Future<ResponseBody> fetch(RequestOptions o, Stream<Uint8List>? s, Future<void>? c) async =>
      ResponseBody.fromString(body, status, headers: {
        Headers.contentTypeHeader: [Headers.jsonContentType],
      });
  @override
  void close({bool force = false}) {}
}

class _Unreachable implements HttpClientAdapter {
  @override
  Future<ResponseBody> fetch(RequestOptions o, Stream<Uint8List>? s, Future<void>? c) =>
      throw DioException.connectionError(requestOptions: o, reason: 'Wi-Fi down');
  @override
  void close({bool force = false}) {}
}

void main() {
  late Dio dio;
  final messenger = GlobalKey<ScaffoldMessengerState>();
  final navigator = GlobalKey<NavigatorState>();

  Future<void> app(WidgetTester tester) => tester.pumpWidget(MaterialApp(
        scaffoldMessengerKey: messenger,
        navigatorKey: navigator,
        routes: {
          '/': (_) => const Scaffold(body: Text('Menu')),
          '/login': (_) => const Scaffold(body: Text('Admin Login')),
        },
      ));

  Future<void> send(WidgetTester tester, String path, int status, String body) async {
    dio = Dio()
      ..httpClientAdapter = _Answer(status, body)
      ..interceptors.add(RefusalInterceptor(messenger, navigator));
    await tester.runAsync(() => dio.post(path).catchError((_) => Response(requestOptions: RequestOptions())));
    await tester.pumpAndSettle();
  }

  setUp(() => FlutterSecureStorage.setMockInitialValues({}));

  testWidgets('a refused stock switch shows the backend message', (tester) async {
    await app(tester);
    await send(tester, '/menu-updateMenuItemAvailability', 404,
        '{"status":"error","message":"Menu item not found","error":{"code":"not_found","message":"Menu item not found"}}');
    expect(find.text('Menu item not found'), findsOneWidget);
  });

  testWidgets('a refused staff change shows the backend message (TD-139 refusal)', (tester) async {
    await app(tester);
    await send(tester, '/admin-updateServer', 403,
        '{"error":{"status":"PERMISSION_DENIED","message":"Nobody can change their own role"}}');
    expect(find.text('Nobody can change their own role'), findsOneWidget);
  });

  testWidgets('an expired session on the stock switch (an onRequest endpoint) says so and goes to login', (tester) async {
    await app(tester);
    await send(tester, '/menu-updateMenuItemAvailability', 401,
        '{"status":"error","message":"Valid staff session required","error":{"code":"unauthorized","message":"Valid staff session required"}}');
    expect(find.text('Session Expired'), findsOneWidget);
  });

  testWidgets('an expired session on a dish save says so and goes to login', (tester) async {
    await app(tester);
    await send(tester, '/menu-updateMenuItem', 401,
        '{"error":{"status":"UNAUTHENTICATED","message":"Session has expired"}}');
    expect(find.text('Session Expired'), findsOneWidget);
    await tester.tap(find.text('Login'));
    await tester.pumpAndSettle();
    expect(find.text('Admin Login'), findsOneWidget);
  });

  testWidgets('a save that never reaches the server says nothing was saved', (tester) async {
    await app(tester);
    dio = Dio()
      ..httpClientAdapter = _Unreachable()
      ..interceptors.add(RefusalInterceptor(messenger, navigator));
    await tester.runAsync(() => dio.post('/admin-createOffer').catchError((_) => Response(requestOptions: RequestOptions())));
    await tester.pumpAndSettle();
    expect(find.text('Could not reach the server. Nothing was saved; try again.'), findsOneWidget);
  });

  testWidgets('a wrong password on the login screen is left to the login form', (tester) async {
    await app(tester);
    await send(tester, '/server-serverLogin', 401,
        '{"error":{"status":"UNAUTHENTICATED","message":"Invalid credentials"}}');
    expect(find.text('Session Expired'), findsNothing);
    expect(find.text('Invalid credentials'), findsNothing);
  });
}

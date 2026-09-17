// OF-S1 · the guest app mints one requestId per Place order and keeps it while that tap is in flight.
// Hand-computed: the checkout body carries data.requestId, a non-empty string starting `req_`; a retry
// after a connection error sends the SAME string; a new Place order after a success (or after a
// refusal the server gave) sends a DIFFERENT string; with no id the body has no requestId key (OF-S3).
import 'dart:convert';
import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutterboilerplate/pages/checkout_order_flow/checkout_repository.dart';
import 'package:flutterboilerplate/pages/checkout_order_flow/checkout_request_id.dart';

/// Captures every request body and answers a minimal success envelope.
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
  test('OF-S1 checkoutCart body carries data.requestId, non-empty', () async {
    final adapter = _Capture();
    final dio = Dio(BaseOptions(baseUrl: 'http://127.0.0.1:1'))..httpClientAdapter = adapter;
    final id = CheckoutRequestId();
    await CheckoutRepository(dio: dio).checkoutCart(restaurantId: 'r1', tableId: 't7', sessionId: 's1', requestId: id.current);
    final data = adapter.bodies.single['data'] as Map;
    expect(data['requestId'], startsWith('req_'));
    expect(data['requestId'], id.current);
  });

  test('OF-S1 retry after connectionError sends the same requestId; a new Place order after success sends a different one', () {
    final id = CheckoutRequestId();
    final first = id.current;
    expect(CheckoutRequestId.keepsId('connection_error'), isTrue);
    expect(CheckoutRequestId.keepsId('timeout_error'), isTrue);
    expect(id.current, first, reason: 'the tap is still in flight');
    id.settled();
    expect(id.current, isNot(first));
  });

  test('OF-S1 a refusal the server gave (unauthenticated, failed-precondition) settles the id: the next tap is a new act', () {
    for (final code in ['unauthenticated', 'failed-precondition', 'unknown_error', null]) {
      expect(CheckoutRequestId.keepsId(code), isFalse, reason: '$code');
    }
  });

  test('OF-S3 an app without the field still checks out: no requestId key in the body', () async {
    final adapter = _Capture();
    final dio = Dio(BaseOptions(baseUrl: 'http://127.0.0.1:1'))..httpClientAdapter = adapter;
    await CheckoutRepository(dio: dio).checkoutCart(restaurantId: 'r1', tableId: 't7', sessionId: 's1');
    expect((adapter.bodies.single['data'] as Map).containsKey('requestId'), isFalse);
  });
}

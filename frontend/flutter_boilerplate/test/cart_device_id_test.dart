import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutterboilerplate/networking/device_id.dart';
import 'package:flutterboilerplate/networking/dio_client.dart';
import 'package:flutterboilerplate/singletonGods/api_constants.dart';
import 'package:shared_preferences/shared_preferences.dart';

RequestOptions req(String path, Object? data) =>
    RequestOptions(path: path, data: data);

void main() {
  setUp(() {
    SharedPreferences.setMockInitialValues({});
  });

  test('mints an id once and keeps it across loads', () async {
    final first = await DeviceId.load();
    expect(first, startsWith('dev_'));
    expect(await DeviceId.load(), first);
  });

  test('stamps addedBy on the three cart writes', () async {
    final id = await DeviceId.load();
    for (final path in [
      ApiConfig.addItemToCartEndpoint,
      ApiConfig.removeItemFromCartEndpoint,
      ApiConfig.checkoutCartEndpoint,
    ]) {
      final options = req(path, {
        'data': <String, dynamic>{'tableId': 't7'},
      });
      stampCartCall(options);
      expect((options.data as Map)['data']['addedBy'], id, reason: path);
    }
  });

  // Reading the cart and everything else is nobody's business but the table's.
  test('leaves other endpoints alone', () async {
    await DeviceId.load();
    final options = req(ApiConfig.fetchCartEndpoint, {
      'data': <String, dynamic>{'tableId': 't7'},
    });
    stampCartCall(options);
    expect((options.data as Map)['data'].containsKey('addedBy'), isFalse);
  });

  // TD-033: the backend lets only the table's own live session write its cart, so add and
  // remove carry the session the way checkout always has.
  test('stamps the stored session on add and remove, not on reads', () async {
    currentSessionId = () => 'sess_t7';
    for (final path in [ApiConfig.addItemToCartEndpoint, ApiConfig.removeItemFromCartEndpoint]) {
      final options = req(path, {'data': <String, dynamic>{'tableId': 't7'}});
      stampCartCall(options);
      expect((options.data as Map)['data']['sessionId'], 'sess_t7', reason: path);
    }
    final read = req(ApiConfig.fetchCartEndpoint, {'data': <String, dynamic>{'tableId': 't7'}});
    stampCartCall(read);
    expect((read.data as Map)['data'].containsKey('sessionId'), isFalse);
  });

  test('a session the caller already named is never overwritten', () async {
    currentSessionId = () => 'sess_stored';
    final options = req(ApiConfig.checkoutCartEndpoint, {'data': <String, dynamic>{'sessionId': 'sess_named'}});
    stampCartCall(options);
    expect((options.data as Map)['data']['sessionId'], 'sess_named');
  });

  test('no stored session → nothing stamped; the server answers 401 and the OTP prompt runs', () async {
    currentSessionId = () => null;
    final options = req(ApiConfig.addItemToCartEndpoint, {'data': <String, dynamic>{'tableId': 't7'}});
    stampCartCall(options);
    expect((options.data as Map)['data'].containsKey('sessionId'), isFalse);
  });

  test('a body that is not the usual envelope is left untouched', () async {
    await DeviceId.load();
    final options = req(ApiConfig.addItemToCartEndpoint, 'raw');
    stampCartCall(options);
    expect(options.data, 'raw');
  });
}

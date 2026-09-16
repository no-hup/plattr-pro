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
      stampDeviceId(options);
      expect((options.data as Map)['data']['addedBy'], id, reason: path);
    }
  });

  // Reading the cart and everything else is nobody's business but the table's.
  test('leaves other endpoints alone', () async {
    await DeviceId.load();
    final options = req(ApiConfig.fetchCartEndpoint, {
      'data': <String, dynamic>{'tableId': 't7'},
    });
    stampDeviceId(options);
    expect((options.data as Map)['data'].containsKey('addedBy'), isFalse);
  });

  test('a body that is not the usual envelope is left untouched', () async {
    await DeviceId.load();
    final options = req(ApiConfig.addItemToCartEndpoint, 'raw');
    stampDeviceId(options);
    expect(options.data, 'raw');
  });
}

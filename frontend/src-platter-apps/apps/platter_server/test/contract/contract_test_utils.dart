import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:platter_server/config/app_config.dart';

class ContractTestConfig {
  static const String functionsBaseUrl = String.fromEnvironment(
    'PLATTR_FUNCTIONS_BASE_URL',
    defaultValue: 'http://localhost:5002/rms-app-dd875/us-central1',
  );

  static const String restaurantId = String.fromEnvironment(
    'PLATTR_TEST_RESTAURANT_ID',
    defaultValue: 'res_server-consumer_order_flow',
  );

  static const String invalidRestaurantId = String.fromEnvironment(
    'PLATTR_TEST_INVALID_RESTAURANT_ID',
    defaultValue: 'invalid_restaurant',
  );

  static const String sessionId = String.fromEnvironment(
    'PLATTR_TEST_SESSION_ID',
    defaultValue: 'session_server001__preseed',
  );

  static const String invalidSessionId = String.fromEnvironment(
    'PLATTR_TEST_INVALID_SESSION_ID',
    defaultValue: 'invalid_session',
  );

  static const String tableId = String.fromEnvironment(
    'PLATTR_TEST_TABLE_ID',
    defaultValue: 'table001',
  );

  static const String otpTableId = String.fromEnvironment(
    'PLATTR_TEST_OTP_TABLE_ID',
    defaultValue: 'table002',
  );

  static const String invalidTableId = String.fromEnvironment(
    'PLATTR_TEST_INVALID_TABLE_ID',
    defaultValue: 'invalid_table',
  );

  static const String orderId = String.fromEnvironment(
    'PLATTR_TEST_ORDER_ID',
    defaultValue: 'order_active_multi_cart__amc',
  );

  static const String invalidOrderId = String.fromEnvironment(
    'PLATTR_TEST_INVALID_ORDER_ID',
    defaultValue: 'invalid_order',
  );

  static const int cartIndexPreparing = int.fromEnvironment(
    'PLATTR_TEST_CART_INDEX_PREPARING',
    defaultValue: 0,
  );

  static const int cartIndexReady = int.fromEnvironment(
    'PLATTR_TEST_CART_INDEX_READY',
    defaultValue: 1,
  );

  static const String menuItemId = String.fromEnvironment(
    'PLATTR_TEST_MENU_ITEM_ID',
    defaultValue: 'item_pancakes',
  );

  static const String invalidMenuItemId = String.fromEnvironment(
    'PLATTR_TEST_INVALID_MENU_ITEM_ID',
    defaultValue: 'invalid_menu_item',
  );

  static const String servedMenuItemId = String.fromEnvironment(
    'PLATTR_TEST_SERVED_MENU_ITEM_ID',
    defaultValue: 'item_iced_coffee',
  );

  static const int servedCartItemId = int.fromEnvironment(
    'PLATTR_TEST_SERVED_CART_ITEM_ID',
    defaultValue: 2,
  );

  static const String preparingMenuItemId = String.fromEnvironment(
    'PLATTR_TEST_PREPARING_MENU_ITEM_ID',
    defaultValue: 'item_classic_burger',
  );

  static const int preparingCartItemId = int.fromEnvironment(
    'PLATTR_TEST_PREPARING_CART_ITEM_ID',
    defaultValue: 1,
  );

  static const String loginUsername = String.fromEnvironment(
    'PLATTR_TEST_LOGIN_USERNAME',
    defaultValue: 'alex@daynightkitchen.com',
  );

  static const String loginPassword = String.fromEnvironment(
    'PLATTR_TEST_LOGIN_PASSWORD',
    defaultValue: '1234',
  );

  static Future<void> ensureEmulatorIsRunning() async {
    AppConfig.initialize(Environment.dev);
    AppConfig.setOverrideBaseUrl(functionsBaseUrl);
    final dio = Dio(
      BaseOptions(
        baseUrl: AppConfig.firebaseFunctionsBaseUrl,
        connectTimeout: const Duration(seconds: 3),
        receiveTimeout: const Duration(seconds: 3),
        contentType: 'application/json',
      ),
    );

    print(
      '[contract] Emulator check: POST ${AppConfig.firebaseFunctionsBaseUrl}/dev-listRestaurants',
    );
    try {
      final response = await dio.post('/dev-listRestaurants');
      if (response.statusCode != 200) {
        fail(
          'Firebase emulator check failed with HTTP ${response.statusCode}. '
          'Start the emulator and import mock data before running tests.',
        );
      }
      print('[contract] Emulator check: OK (${response.statusCode})');
    } on DioException catch (e) {
      fail(
        'Firebase emulator is not reachable at '
        '${AppConfig.firebaseFunctionsBaseUrl}. '
        'Start the emulator and import mock data before running tests. '
        'Error: ${e.message}',
      );
    }
  }
}

Future<void> runContractTest(
  String name,
  String expected,
  Future<void> Function() body,
) async {
  print('[contract] START: $name | expect: $expected');
  try {
    await body();
    print('[contract] END: $name | status=pass');
  } catch (e) {
    print('[contract] END: $name | status=fail | error=$e');
    rethrow;
  }
}

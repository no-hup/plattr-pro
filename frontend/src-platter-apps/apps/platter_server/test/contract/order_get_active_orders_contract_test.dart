import 'package:flutter_test/flutter_test.dart';
import 'package:platter_server/pages/orders_home/repository/order_api_service.dart';

import 'contract_test_utils.dart';

void main() {
  late OrderApiService apiService;

  setUpAll(() async {
    await ContractTestConfig.ensureEmulatorIsRunning();
    apiService = OrderApiService();
  });

  group('order-getActiveOrdersForRestaurant contract', () {
    test('success: parses active orders list', () async {
      await runContractTest(
        'getActiveOrdersForRestaurant success',
        'success=true, orders.length>0, currentServerId set, order id/table/status set',
        () async {
          print(
            '[contract] getActiveOrdersForRestaurant: restaurantId='
            '${ContractTestConfig.restaurantId}, sessionId='
            '${ContractTestConfig.sessionId}',
          );
          final response = await apiService.getActiveOrdersForRestaurant(
            restaurantId: ContractTestConfig.restaurantId,
            sessionId: ContractTestConfig.sessionId,
          );

          expect(
            response.success,
            isTrue,
            reason: response.message ?? 'Expected a successful response.',
          );
          final data = response.data;
          expect(data, isNotNull);
          expect(data!.orders.isNotEmpty, isTrue);
          expect(data.currentServerId, isNotEmpty);

          final order = data.orders.first;
          print(
            '[contract] getActiveOrdersForRestaurant: count=${data.orders.length}, '
            'currentServerId=${data.currentServerId}, '
            'firstOrderId=${order.orderId}',
          );
          expect(order.orderId, isNotEmpty);
          expect(order.tableId, isNotEmpty);
          expect(order.status, isNotEmpty);
        },
      );
    });

    test('error: invalid session id', () async {
      await runContractTest(
        'getActiveOrdersForRestaurant invalid session',
        'success=false, errorCode=failed-precondition',
        () async {
          print(
            '[contract] getActiveOrdersForRestaurant invalid: restaurantId='
            '${ContractTestConfig.restaurantId}, sessionId='
            '${ContractTestConfig.invalidSessionId}',
          );
          final response = await apiService.getActiveOrdersForRestaurant(
            restaurantId: ContractTestConfig.restaurantId,
            sessionId: ContractTestConfig.invalidSessionId,
          );

          expect(response.success, isFalse);
          expect(response.errorCode, equals('failed-precondition'));
          print(
            '[contract] getActiveOrdersForRestaurant invalid: errorCode='
            '${response.errorCode}, message=${response.message}',
          );
        },
      );
    });

    test('error: empty session id', () async {
      await runContractTest(
        'getActiveOrdersForRestaurant empty session',
        'success=false, errorCode=invalid-argument',
        () async {
          print(
            '[contract] getActiveOrdersForRestaurant invalid: restaurantId='
            '${ContractTestConfig.restaurantId}, sessionId=<empty>',
          );
          final response = await apiService.getActiveOrdersForRestaurant(
            restaurantId: ContractTestConfig.restaurantId,
            sessionId: '',
          );

          expect(response.success, isFalse);
          expect(response.errorCode, equals('invalid-argument'));
          print(
            '[contract] getActiveOrdersForRestaurant invalid: errorCode='
            '${response.errorCode}, message=${response.message}',
          );
        },
      );
    });
  });
}

import 'package:flutter_test/flutter_test.dart';
import 'package:platter_server/pages/orders_home/repository/order_api_service.dart';

import 'contract_test_utils.dart';

void main() {
  late OrderApiService apiService;

  setUpAll(() async {
    await ContractTestConfig.ensureEmulatorIsRunning();
    apiService = OrderApiService();
  });

  group('order-updateOrderStatus contract', () {
    test('success: updates order status', () async {
      await runContractTest(
        'updateOrderStatus success',
        'success=true, data=true',
        () async {
          print(
            '[contract] updateOrderStatus: restaurantId='
            '${ContractTestConfig.restaurantId}, orderId='
            '${ContractTestConfig.orderId}, status=IN_PROGRESS',
          );
          final response = await apiService.updateOrderStatus(
            restaurantId: ContractTestConfig.restaurantId,
            orderId: ContractTestConfig.orderId,
            orderStatus: 'IN_PROGRESS',
            sessionId: ContractTestConfig.sessionId,
          );

          expect(
            response.success,
            isTrue,
            reason: response.message ?? 'Expected a successful response.',
          );
          expect(response.data, isTrue);
        },
      );
    });

    test('error: invalid order status', () async {
      await runContractTest(
        'updateOrderStatus invalid status',
        'success=false, errorCode=invalid-argument',
        () async {
          print(
            '[contract] updateOrderStatus invalid: restaurantId='
            '${ContractTestConfig.restaurantId}, orderId='
            '${ContractTestConfig.orderId}, status=INVALID_STATUS',
          );
          final response = await apiService.updateOrderStatus(
            restaurantId: ContractTestConfig.restaurantId,
            orderId: ContractTestConfig.orderId,
            orderStatus: 'INVALID_STATUS',
            sessionId: ContractTestConfig.sessionId,
          );

          expect(response.success, isFalse);
          expect(response.errorCode, equals('invalid-argument'));
          print(
            '[contract] updateOrderStatus invalid: errorCode='
            '${response.errorCode}, message=${response.message}',
          );
        },
      );
    });
  });
}

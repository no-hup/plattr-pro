import 'package:flutter_test/flutter_test.dart';
import 'package:platter_server/pages/orders_home/repository/order_api_service.dart';

import 'contract_test_utils.dart';

void main() {
  late OrderApiService apiService;

  setUpAll(() async {
    await ContractTestConfig.ensureEmulatorIsRunning();
    apiService = OrderApiService();
  });

  group('cart-updateCartStatus contract', () {
    test('success: updates cart status', () async {
      await runContractTest(
        'updateCartStatus success',
        'success=true, data=true',
        () async {
          print(
            '[contract] updateCartStatus: restaurantId='
            '${ContractTestConfig.restaurantId}, orderId='
            '${ContractTestConfig.orderId}, cartIndex='
            '${ContractTestConfig.cartIndexPreparing}, status=READY',
          );
          final response = await apiService.updateCartStatus(
            restaurantId: ContractTestConfig.restaurantId,
            orderId: ContractTestConfig.orderId,
            cartIndex: ContractTestConfig.cartIndexPreparing,
            newStatus: 'READY',
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

    test('error: invalid cart status', () async {
      await runContractTest(
        'updateCartStatus invalid status',
        'success=false, errorCode=invalid-argument',
        () async {
          print(
            '[contract] updateCartStatus invalid: restaurantId='
            '${ContractTestConfig.restaurantId}, orderId='
            '${ContractTestConfig.orderId}, cartIndex='
            '${ContractTestConfig.cartIndexPreparing}, status=INVALID_STATUS',
          );
          final response = await apiService.updateCartStatus(
            restaurantId: ContractTestConfig.restaurantId,
            orderId: ContractTestConfig.orderId,
            cartIndex: ContractTestConfig.cartIndexPreparing,
            newStatus: 'INVALID_STATUS',
            sessionId: ContractTestConfig.sessionId,
          );

          expect(response.success, isFalse);
          expect(response.errorCode, equals('invalid-argument'));
          print(
            '[contract] updateCartStatus invalid: errorCode='
            '${response.errorCode}, message=${response.message}',
          );
        },
      );
    });
  });
}

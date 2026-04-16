import 'package:flutter_test/flutter_test.dart';
import 'package:platter_server/pages/orders_home/repository/order_api_service.dart';

import 'contract_test_utils.dart';

void main() {
  late OrderApiService apiService;

  setUpAll(() async {
    await ContractTestConfig.ensureEmulatorIsRunning();
    apiService = OrderApiService();
  });

  group('order-getServedCartsForServer contract', () {
    test('success: parses served carts list', () async {
      await runContractTest(
        'getServedCartsForServer success',
        'success=true, servedCarts.length>=1, currentServerId set',
        () async {
          print(
            '[contract] getServedCartsForServer: restaurantId='
            '${ContractTestConfig.restaurantId}, sessionId='
            '${ContractTestConfig.sessionId}',
          );
          final response = await apiService.getServedCartsForServer(
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
          expect(data!.currentServerId, isNotEmpty);
          expect(data.servedCarts, isNotEmpty);
          print(
            '[contract] getServedCartsForServer: count='
            '${data.servedCarts.length}, currentServerId=${data.currentServerId}',
          );
        },
      );
    });

    test('error: invalid session id', () async {
      await runContractTest(
        'getServedCartsForServer invalid session',
        'success=false, errorCode=failed-precondition',
        () async {
          print(
            '[contract] getServedCartsForServer invalid: restaurantId='
            '${ContractTestConfig.restaurantId}, sessionId='
            '${ContractTestConfig.invalidSessionId}',
          );
          final response = await apiService.getServedCartsForServer(
            restaurantId: ContractTestConfig.restaurantId,
            sessionId: ContractTestConfig.invalidSessionId,
          );

          expect(response.success, isFalse);
          expect(response.errorCode, equals('failed-precondition'));
          print(
            '[contract] getServedCartsForServer invalid: errorCode='
            '${response.errorCode}, message=${response.message}',
          );
        },
      );
    });
  });
}

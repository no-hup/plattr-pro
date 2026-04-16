import 'package:flutter_test/flutter_test.dart';
import 'package:platter_server/pages/orders_home/repository/order_api_service.dart';

import 'contract_test_utils.dart';

void main() {
  late OrderApiService apiService;

  setUpAll(() async {
    await ContractTestConfig.ensureEmulatorIsRunning();
    apiService = OrderApiService();
  });

  group('order-getOrder contract', () {
    test('success: parses order detail', () async {
      await runContractTest(
        'getOrder success',
        'success=true, id/orderNumber/orderStatus/tableId set',
        () async {
          print(
            '[contract] getOrder: restaurantId='
            '${ContractTestConfig.restaurantId}, orderId='
            '${ContractTestConfig.orderId}',
          );
          final response = await apiService.getOrder(
            restaurantId: ContractTestConfig.restaurantId,
            orderId: ContractTestConfig.orderId,
          );

          expect(
            response.success,
            isTrue,
            reason: response.message ?? 'Expected a successful response.',
          );
          final data = response.data;
          expect(data, isNotNull);
          expect(data!.id, equals(ContractTestConfig.orderId));
          expect(data.orderNumber, isNotEmpty);
          expect(data.orderStatus, isNotEmpty);
          expect(data.tableId, isNotEmpty);
        },
      );
    });

    test('error: invalid order id', () async {
      await runContractTest(
        'getOrder invalid order',
        'success=false, errorCode=not-found',
        () async {
          print(
            '[contract] getOrder invalid: restaurantId='
            '${ContractTestConfig.restaurantId}, orderId='
            '${ContractTestConfig.invalidOrderId}',
          );
          final response = await apiService.getOrder(
            restaurantId: ContractTestConfig.restaurantId,
            orderId: ContractTestConfig.invalidOrderId,
          );

          expect(response.success, isFalse);
          expect(response.errorCode, equals('not-found'));
          print(
            '[contract] getOrder invalid: errorCode='
            '${response.errorCode}, message=${response.message}',
          );
        },
      );
    });
  });
}

import 'package:flutter_test/flutter_test.dart';
import 'package:platter_server/pages/orders_home/repository/order_api_service.dart';

import 'contract_test_utils.dart';

void main() {
  late OrderApiService apiService;

  setUpAll(() async {
    await ContractTestConfig.ensureEmulatorIsRunning();
    apiService = OrderApiService();
  });

  group('order-markCartAsServed contract', () {
    test('success: marks cart as served', () async {
      await runContractTest(
        'markCartAsServed success',
        'success=true, data=true, cart.status=SERVED, items.status=SERVED',
        () async {
          print(
            '[contract] markCartAsServed: restaurantId='
            '${ContractTestConfig.restaurantId}, orderId='
            '${ContractTestConfig.orderId}, cartIndex='
            '${ContractTestConfig.cartIndexReady}',
          );
          final response = await apiService.markCartAsServed(
            restaurantId: ContractTestConfig.restaurantId,
            orderId: ContractTestConfig.orderId,
            cartIndex: ContractTestConfig.cartIndexReady,
            sessionId: ContractTestConfig.sessionId,
          );

          expect(
            response.success,
            isTrue,
            reason: response.message ?? 'Expected a successful response.',
          );
          expect(response.data, isTrue);

          final orderResponse = await apiService.getOrder(
            restaurantId: ContractTestConfig.restaurantId,
            orderId: ContractTestConfig.orderId,
          );
          expect(
            orderResponse.success,
            isTrue,
            reason: orderResponse.message ?? 'Expected order details after serving cart.',
          );
          final carts = orderResponse.data!.carts;
          expect(carts.length, greaterThan(ContractTestConfig.cartIndexReady));
          final cart = carts[ContractTestConfig.cartIndexReady] as Map<String, dynamic>;
          print(
            '[contract] markCartAsServed: cartId=${cart['cartId']}, '
            'status=${cart['status']}',
          );
          expect(cart['status'], equals('SERVED'));

          final items = (cart['items'] as List<dynamic>? ?? [])
              .whereType<Map<String, dynamic>>();
          for (final item in items) {
            final status = item['status'];
            if (status == 'CANCELLED' || status == 'RETURNED') {
              continue;
            }
            expect(status, equals('SERVED'));
          }
        },
      );
    });

    test('error: invalid order id', () async {
      await runContractTest(
        'markCartAsServed invalid order',
        'success=false, errorCode=not-found',
        () async {
          print(
            '[contract] markCartAsServed invalid: restaurantId='
            '${ContractTestConfig.restaurantId}, orderId='
            '${ContractTestConfig.invalidOrderId}, cartIndex='
            '${ContractTestConfig.cartIndexReady}',
          );
          final response = await apiService.markCartAsServed(
            restaurantId: ContractTestConfig.restaurantId,
            orderId: ContractTestConfig.invalidOrderId,
            cartIndex: ContractTestConfig.cartIndexReady,
            sessionId: ContractTestConfig.sessionId,
          );

          expect(response.success, isFalse);
          expect(response.errorCode, equals('not-found'));
          print(
            '[contract] markCartAsServed invalid: errorCode='
            '${response.errorCode}, message=${response.message}',
          );
        },
      );
    });
  });
}

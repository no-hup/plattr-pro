import 'package:flutter_test/flutter_test.dart';
import 'package:platter_server/pages/orders_home/repository/order_api_service.dart';

import 'contract_test_utils.dart';

void main() {
  late OrderApiService apiService;

  setUpAll(() async {
    await ContractTestConfig.ensureEmulatorIsRunning();
    apiService = OrderApiService();
  });

  group('server-markItemServed contract', () {
    test('success: marks order item served', () async {
      await runContractTest(
        'markItemAsServed success',
        'success=true, data=true, item.status=SERVED',
        () async {
          print(
            '[contract] markItemAsServed: restaurantId='
            '${ContractTestConfig.restaurantId}, orderId='
            '${ContractTestConfig.orderId}, menuItemId='
            '${ContractTestConfig.servedMenuItemId}, cartItemId='
            '${ContractTestConfig.servedCartItemId}',
          );
          final response = await apiService.markItemAsServed(
            restaurantId: ContractTestConfig.restaurantId,
            orderId: ContractTestConfig.orderId,
            menuItemId: ContractTestConfig.servedMenuItemId,
            cartItemId: ContractTestConfig.servedCartItemId,
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
            reason: orderResponse.message ?? 'Expected order details after serving item.',
          );
          final carts = orderResponse.data!.carts;
          final servedItem = carts
              .whereType<Map<String, dynamic>>()
              .expand((cart) => (cart['items'] as List<dynamic>? ?? [])
                  .whereType<Map<String, dynamic>>())
              .firstWhere(
                (item) =>
                    item['menuItemId'] == ContractTestConfig.servedMenuItemId &&
                    item['cartItemId'] == ContractTestConfig.servedCartItemId,
              );
          print(
            '[contract] markItemAsServed: menuItemId='
            '${ContractTestConfig.servedMenuItemId}, cartItemId='
            '${ContractTestConfig.servedCartItemId}, status='
            '${servedItem['status']}',
          );
          expect(servedItem['status'], equals('SERVED'));
        },
      );
    });

    test('error: invalid status transition', () async {
      await runContractTest(
        'markItemAsServed invalid transition',
        'success=false, errorCode=invalid-argument',
        () async {
          print(
            '[contract] markItemAsServed invalid transition: restaurantId='
            '${ContractTestConfig.restaurantId}, orderId='
            '${ContractTestConfig.orderId}, menuItemId='
            '${ContractTestConfig.preparingMenuItemId}, cartItemId='
            '${ContractTestConfig.preparingCartItemId}',
          );
          final response = await apiService.markItemAsServed(
            restaurantId: ContractTestConfig.restaurantId,
            orderId: ContractTestConfig.orderId,
            menuItemId: ContractTestConfig.preparingMenuItemId,
            cartItemId: ContractTestConfig.preparingCartItemId,
          );

          expect(response.success, isFalse);
          expect(response.errorCode, equals('invalid-argument'));
          print(
            '[contract] markItemAsServed invalid transition: errorCode='
            '${response.errorCode}, message=${response.message}',
          );
        },
      );
    });

    test('error: invalid menu item id', () async {
      await runContractTest(
        'markItemAsServed invalid menu item',
        'success=false, errorCode=not-found',
        () async {
          print(
            '[contract] markItemAsServed invalid: restaurantId='
            '${ContractTestConfig.restaurantId}, orderId='
            '${ContractTestConfig.orderId}, menuItemId='
            '${ContractTestConfig.invalidMenuItemId}',
          );
          final response = await apiService.markItemAsServed(
            restaurantId: ContractTestConfig.restaurantId,
            orderId: ContractTestConfig.orderId,
            menuItemId: ContractTestConfig.invalidMenuItemId,
          );

          expect(response.success, isFalse);
          expect(response.errorCode, equals('not-found'));
          print(
            '[contract] markItemAsServed invalid: errorCode='
            '${response.errorCode}, message=${response.message}',
          );
        },
      );
    });
  });
}

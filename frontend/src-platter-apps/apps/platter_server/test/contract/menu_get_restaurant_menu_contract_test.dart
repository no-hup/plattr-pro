import 'package:flutter_test/flutter_test.dart';
import 'package:platter_server/pages/menu_home/repository/menu_api_service.dart';

import 'contract_test_utils.dart';

void main() {
  late MenuApiService apiService;

  setUpAll(() async {
    await ContractTestConfig.ensureEmulatorIsRunning();
    apiService = MenuApiService();
  });

  group('menu-getRestaurantMenu contract', () {
    test('success: parses menu response', () async {
      await runContractTest(
        'getRestaurantMenu success',
        'success=true, categories/menuItems present',
        () async {
          print(
            '[contract] getRestaurantMenu: restaurantId='
            '${ContractTestConfig.restaurantId}, sessionId='
            '${ContractTestConfig.sessionId}',
          );
          final response = await apiService.getRestaurantMenu(
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
          expect(data!.categories, isNotEmpty);
          expect(data.menuItems, isNotEmpty);
        },
      );
    });

    test('error: invalid restaurant id', () async {
      await runContractTest(
        'getRestaurantMenu invalid restaurant',
        'success=false, errorCode=not-found',
        () async {
          print(
            '[contract] getRestaurantMenu invalid: restaurantId='
            '${ContractTestConfig.invalidRestaurantId}',
          );
          final response = await apiService.getRestaurantMenu(
            restaurantId: ContractTestConfig.invalidRestaurantId,
            sessionId: ContractTestConfig.sessionId,
          );

          expect(response.success, isFalse);
          expect(response.errorCode, equals('not-found'));
          print(
            '[contract] getRestaurantMenu invalid: errorCode='
            '${response.errorCode}, message=${response.message}',
          );
        },
      );
    });
  });
}

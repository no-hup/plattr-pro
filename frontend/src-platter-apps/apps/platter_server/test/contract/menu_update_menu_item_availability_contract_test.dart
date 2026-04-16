import 'package:flutter_test/flutter_test.dart';
import 'package:platter_server/pages/menu_home/repository/menu_api_service.dart';
import 'package:platter_server/singleton/app_state.dart';

import 'contract_test_utils.dart';

void main() {
  late MenuApiService apiService;

  setUpAll(() async {
    await ContractTestConfig.ensureEmulatorIsRunning();
    AppState.instance.restaurantId = ContractTestConfig.restaurantId;
    AppState.instance.sessionId = ContractTestConfig.sessionId;
    apiService = MenuApiService();
  });

  group('menu-updateMenuItemAvailability contract', () {
    test('success: updates item availability', () async {
      await runContractTest(
        'updateMenuItemAvailability success',
        'success=true, menuItemId/isAvailable set',
        () async {
          print(
            '[contract] updateMenuItemAvailability: restaurantId='
            '${ContractTestConfig.restaurantId}, menuItemId='
            '${ContractTestConfig.menuItemId}, isAvailable=true',
          );
          final response = await apiService.updateMenuItemAvailability(
            restaurantId: ContractTestConfig.restaurantId,
            sessionId: ContractTestConfig.sessionId,
            menuItemId: ContractTestConfig.menuItemId,
            isAvailable: true,
          );

          expect(
            response.success,
            isTrue,
            reason: response.message ?? 'Expected a successful response.',
          );
          final data = response.data;
          expect(data, isNotNull);
          expect(data!.menuItemId, equals(ContractTestConfig.menuItemId));
          expect(data.isAvailable, isTrue);
        },
      );
    });

    test('error: invalid menu item id', () async {
      await runContractTest(
        'updateMenuItemAvailability invalid menu item',
        'success=false, errorCode=not_found',
        () async {
          print(
            '[contract] updateMenuItemAvailability invalid: restaurantId='
            '${ContractTestConfig.restaurantId}, menuItemId='
            '${ContractTestConfig.invalidMenuItemId}',
          );
          final response = await apiService.updateMenuItemAvailability(
            restaurantId: ContractTestConfig.restaurantId,
            sessionId: ContractTestConfig.sessionId,
            menuItemId: ContractTestConfig.invalidMenuItemId,
            isAvailable: true,
          );

          expect(response.success, isFalse);
          expect(response.errorCode, equals('not_found'));
          print(
            '[contract] updateMenuItemAvailability invalid: errorCode='
            '${response.errorCode}, message=${response.message}',
          );
        },
      );
    });
  });
}

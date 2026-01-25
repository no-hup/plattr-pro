import 'package:flutter_test/flutter_test.dart';
import 'package:platter_server/pages/tables_home/repository/table_api_service.dart';

import 'contract_test_utils.dart';

void main() {
  late TableApiService apiService;

  setUpAll(() async {
    await ContractTestConfig.ensureEmulatorIsRunning();
    apiService = TableApiService();
  });

  group('table-getTablesForRestaurant contract', () {
    test('success: parses tables list', () async {
      await runContractTest(
        'getTablesForRestaurant success',
        'success=true, tables.length>0, table.id/number/capacity/status set',
        () async {
          print(
            '[contract] getTablesForRestaurant: restaurantId='
            '${ContractTestConfig.restaurantId}',
          );
          final response = await apiService.getRestaurantTables(
            restaurantId: ContractTestConfig.restaurantId,
          );

          expect(
            response.success,
            isTrue,
            reason: response.message ?? 'Expected a successful response.',
          );
          final tables = response.data;
          expect(tables, isNotNull);
          expect(tables!.isNotEmpty, isTrue);

          final table = tables.first;
          print(
            '[contract] getTablesForRestaurant: count=${tables.length}, '
            'firstTableId=${table.tableId}, status=${table.status}',
          );
          expect(table.tableId, isNotEmpty);
          expect(table.tableNumber, isNotEmpty);
          expect(table.capacity, greaterThan(0));
          expect(table.status, isNotEmpty);
        },
      );
    });

    test('error: invalid restaurant id', () async {
      await runContractTest(
        'getTablesForRestaurant invalid restaurant',
        'success=false, errorCode=not-found',
        () async {
          print(
            '[contract] getTablesForRestaurant invalid: restaurantId='
            '${ContractTestConfig.invalidRestaurantId}',
          );
          final response = await apiService.getRestaurantTables(
            restaurantId: ContractTestConfig.invalidRestaurantId,
          );

          expect(response.success, isFalse);
          expect(response.errorCode, equals('not-found'));
          print(
            '[contract] getTablesForRestaurant invalid: errorCode='
            '${response.errorCode}, message=${response.message}',
          );
        },
      );
    });

    test('error: empty restaurant id', () async {
      await runContractTest(
        'getTablesForRestaurant empty restaurant',
        'success=false, errorCode=invalid-argument',
        () async {
          print(
              '[contract] getTablesForRestaurant invalid: restaurantId=<empty>');
          final response = await apiService.getRestaurantTables(
            restaurantId: '',
          );

          expect(response.success, isFalse);
          expect(response.errorCode, equals('invalid-argument'));
          print(
            '[contract] getTablesForRestaurant invalid: errorCode='
            '${response.errorCode}, message=${response.message}',
          );
        },
      );
    });
  });
}

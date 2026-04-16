import 'package:flutter_test/flutter_test.dart';
import 'package:platter_server/pages/tables_home/repository/table_api_service.dart';

import 'contract_test_utils.dart';

void main() {
  late TableApiService apiService;

  setUpAll(() async {
    await ContractTestConfig.ensureEmulatorIsRunning();
    apiService = TableApiService();
  });

  group('table-updateTableStatus contract', () {
    test('success: updates table status', () async {
      await runContractTest(
        'updateTableStatus success',
        'success=true, changed=false when status unchanged',
        () async {
          print(
            '[contract] updateTableStatus: restaurantId='
            '${ContractTestConfig.restaurantId}, tableId='
            '${ContractTestConfig.tableId}, status=active',
          );
          final response = await apiService.updateTableStatus(
            restaurantId: ContractTestConfig.restaurantId,
            tableId: ContractTestConfig.tableId,
            status: 'active',
          );

          expect(
            response.success,
            isTrue,
            reason: response.message ?? 'Expected a successful response.',
          );
          final data = response.data;
          expect(data, isNotNull);
          expect(data!.tableId, equals(ContractTestConfig.tableId));
          expect(data.currentStatus, equals('active'));
        },
      );
    });

    test('error: invalid status', () async {
      await runContractTest(
        'updateTableStatus invalid status',
        'success=false, errorCode=invalid-argument',
        () async {
          print(
            '[contract] updateTableStatus invalid: restaurantId='
            '${ContractTestConfig.restaurantId}, tableId='
            '${ContractTestConfig.tableId}, status=INVALID_STATUS',
          );
          final response = await apiService.updateTableStatus(
            restaurantId: ContractTestConfig.restaurantId,
            tableId: ContractTestConfig.tableId,
            status: 'INVALID_STATUS',
          );

          expect(response.success, isFalse);
          expect(response.errorCode, equals('invalid-argument'));
          print(
            '[contract] updateTableStatus invalid: errorCode='
            '${response.errorCode}, message=${response.message}',
          );
        },
      );
    });
  });
}

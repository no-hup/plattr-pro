import 'package:flutter_test/flutter_test.dart';
import 'package:platter_server/pages/tables_home/repository/table_api_service.dart';

import 'contract_test_utils.dart';

void main() {
  late TableApiService apiService;

  setUpAll(() async {
    await ContractTestConfig.ensureEmulatorIsRunning();
    apiService = TableApiService();
  });

  group('table-getTableDetails contract', () {
    test('success: parses table details', () async {
      await runContractTest(
        'getTableDetails success',
        'success=true, table.id/number/status set',
        () async {
          print(
            '[contract] getTableDetails: restaurantId='
            '${ContractTestConfig.restaurantId}, tableId='
            '${ContractTestConfig.tableId}',
          );
          final response = await apiService.getTableDetails(
            restaurantId: ContractTestConfig.restaurantId,
            tableId: ContractTestConfig.tableId,
          );

          expect(
            response.success,
            isTrue,
            reason: response.message ?? 'Expected a successful response.',
          );
          final data = response.data;
          expect(data, isNotNull);
          expect(data!.tableId, equals(ContractTestConfig.tableId));
          expect(data.tableNumber, isNotEmpty);
          expect(data.status, isNotEmpty);
        },
      );
    });

    test('error: invalid table id', () async {
      await runContractTest(
        'getTableDetails invalid table',
        'success=false, errorCode=not-found',
        () async {
          print(
            '[contract] getTableDetails invalid: restaurantId='
            '${ContractTestConfig.restaurantId}, tableId='
            '${ContractTestConfig.invalidTableId}',
          );
          final response = await apiService.getTableDetails(
            restaurantId: ContractTestConfig.restaurantId,
            tableId: ContractTestConfig.invalidTableId,
          );

          expect(response.success, isFalse);
          expect(response.errorCode, equals('not-found'));
          print(
            '[contract] getTableDetails invalid: errorCode='
            '${response.errorCode}, message=${response.message}',
          );
        },
      );
    });
  });
}

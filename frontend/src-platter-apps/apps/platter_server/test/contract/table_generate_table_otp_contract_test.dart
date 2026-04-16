import 'package:flutter_test/flutter_test.dart';
import 'package:platter_server/pages/tables_home/repository/table_api_service.dart';

import 'contract_test_utils.dart';

void main() {
  late TableApiService apiService;

  setUpAll(() async {
    await ContractTestConfig.ensureEmulatorIsRunning();
    apiService = TableApiService();
  });

  group('table-generateTableOTP contract', () {
    test('success: generates table OTP', () async {
      await runContractTest(
        'generateTableOTP success',
        'success=true, otp/tableId/tableNumber set',
        () async {
          print(
            '[contract] generateTableOTP: restaurantId='
            '${ContractTestConfig.restaurantId}, tableId='
            '${ContractTestConfig.otpTableId}',
          );
          final response = await apiService.generateTableOTP(
            restaurantId: ContractTestConfig.restaurantId,
            tableId: ContractTestConfig.otpTableId,
          );

          expect(
            response.success,
            isTrue,
            reason: response.message ?? 'Expected a successful response.',
          );
          final data = response.data;
          expect(data, isNotNull);
          expect(data!.tableId, isNotEmpty);
          expect(data.tableNumber, isNotEmpty);
          expect(data.otp, isNotEmpty);
        },
      );
    });

    test('error: invalid table id', () async {
      await runContractTest(
        'generateTableOTP invalid table',
        'success=false, errorCode=not-found',
        () async {
          print(
            '[contract] generateTableOTP invalid: restaurantId='
            '${ContractTestConfig.restaurantId}, tableId='
            '${ContractTestConfig.invalidTableId}',
          );
          final response = await apiService.generateTableOTP(
            restaurantId: ContractTestConfig.restaurantId,
            tableId: ContractTestConfig.invalidTableId,
          );

          expect(response.success, isFalse);
          expect(response.errorCode, equals('not-found'));
          print(
            '[contract] generateTableOTP invalid: errorCode='
            '${response.errorCode}, message=${response.message}',
          );
        },
      );
    });
  });
}

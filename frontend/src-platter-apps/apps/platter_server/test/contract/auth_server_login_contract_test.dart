import 'package:flutter_test/flutter_test.dart';
import 'package:platter_server/pages/auth/models/login_request.dart';
import 'package:platter_server/pages/auth/repository/login_api_service.dart';

import 'contract_test_utils.dart';

void main() {
  late LoginApiService apiService;

  setUpAll(() async {
    await ContractTestConfig.ensureEmulatorIsRunning();
    apiService = LoginApiService();
  });

  group('server-serverLogin contract', () {
    test('success: login with credentials', () async {
      await runContractTest(
        'serverLogin success',
        'success=true, sessionId/serverId/restaurantId set',
        () async {
          print(
            '[contract] serverLogin: restaurantId='
            '${ContractTestConfig.restaurantId}, username='
            '${ContractTestConfig.loginUsername}',
          );
          final request = LoginRequest(
            restaurantId: ContractTestConfig.restaurantId,
            username: ContractTestConfig.loginUsername,
            password: ContractTestConfig.loginPassword,
          );
          final response = await apiService.login(request);

          expect(
            response.success,
            isTrue,
            reason: response.message ?? 'Expected a successful response.',
          );
          final data = response.data;
          expect(data, isNotNull);
          expect(data!.sessionId, isNotEmpty);
          expect(data.serverId, isNotEmpty);
          expect(data.restaurantId, equals(ContractTestConfig.restaurantId));
        },
      );
    });

    test('error: invalid session', () async {
      await runContractTest(
        'serverLogin invalid session',
        'success=false, errorCode=unauthenticated',
        () async {
          print(
            '[contract] serverLogin invalid: restaurantId='
            '${ContractTestConfig.restaurantId}, sessionId='
            '${ContractTestConfig.invalidSessionId}',
          );
          final request = LoginRequest(
            restaurantId: ContractTestConfig.restaurantId,
            sessionId: ContractTestConfig.invalidSessionId,
          );
          final response = await apiService.login(request);

          expect(response.success, isFalse);
          expect(response.errorCode, equals('unauthenticated'));
          print(
            '[contract] serverLogin invalid: errorCode='
            '${response.errorCode}, message=${response.message}',
          );
        },
      );
    });
  });
}

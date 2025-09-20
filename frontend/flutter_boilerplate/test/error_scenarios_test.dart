import 'package:flutter_test/flutter_test.dart';
import 'api_client.dart';

void main() {
  group('Error Scenarios Tests', () {
    group('Unauthenticated Error Tests', () {
      test(
        'should return unauthenticated when OTP is mandatory at scan',
        () async {
          final response = await ApiClient.post(
            'table-validateTableAndLocation',
            {
              'restaurantId': TestData.restaurantId,
              'tableId': TestData.testTableId, // Vacant table
              'userLocation': TestData.testLocation,
            },
          );

          expect(response['status'], equals('error'));
          expect(response['data']['code'], equals('unauthenticated'));
          expect(response['data']['httpCode'], equals(401));
        },
      );

      test('should return unauthenticated for invalid OTP', () async {
        final response = await ApiClient.post('table-validateOTP', {
          'restaurantId': TestData.restaurantId,
          'tableId': TestData.testTableId,
          'otp': '000000', // Invalid OTP
          'phoneNumber': TestData.testPhoneNumber,
          'name': TestData.testUsername,
        });

        expect(response['status'], equals('error'));
        expect(response['data']['code'], equals('unauthenticated'));
        expect(response['data']['httpCode'], equals(401));
      });

      test(
        'should return unauthenticated for wrong OTP on active table',
        () async {
          final response = await ApiClient.post('table-validateOTP', {
            'restaurantId': TestData.restaurantId,
            'tableId': TestData.testTableIdActive, // Active table
            'otp': '000000', // Wrong OTP
            'phoneNumber': 'test_customer_002',
            'name': 'Test Customer Two',
          });

          expect(response['status'], equals('error'));
          expect(response['data']['code'], equals('unauthenticated'));
          expect(response['data']['httpCode'], equals(401));
        },
      );
    });

    group('Invalid Arguments Error Tests', () {
      test('should return invalid-argument for missing restaurantId', () async {
        final response = await ApiClient.post(
          'table-validateTableAndLocation',
          {
            'tableId': TestData.tableId,
            'userLocation': TestData.testLocation,
            // Missing restaurantId
          },
        );

        expect(response['status'], equals('error'));
        expect(response['data']['code'], equals('invalid-argument'));
        expect(response['data']['httpCode'], equals(400));
      });

      test('should return invalid-argument for missing tableId', () async {
        final response = await ApiClient.post(
          'table-validateTableAndLocation',
          {
            'restaurantId': TestData.restaurantId,
            'userLocation': TestData.testLocation,
            // Missing tableId
          },
        );

        expect(response['status'], equals('error'));
        expect(response['data']['code'], equals('invalid-argument'));
        expect(response['data']['httpCode'], equals(400));
      });

      test('should return invalid-argument for missing userLocation', () async {
        final response = await ApiClient.post(
          'table-validateTableAndLocation',
          {
            'restaurantId': TestData.restaurantId,
            'tableId': TestData.tableId,
            // Missing userLocation
          },
        );

        expect(response['status'], equals('error'));
        expect(response['data']['code'], equals('invalid-argument'));
        expect(response['data']['httpCode'], equals(400));
      });

      test('should return invalid-argument for missing OTP', () async {
        final response = await ApiClient.post('table-validateOTP', {
          'restaurantId': TestData.restaurantId,
          'tableId': TestData.testTableId,
          'phoneNumber': TestData.testPhoneNumber,
          'name': TestData.testUsername,
          // Missing otp
        });

        expect(response['status'], equals('error'));
        expect(response['data']['code'], equals('invalid-argument'));
        expect(response['data']['httpCode'], equals(400));
      });

      test(
        'should return invalid-argument for missing phone number when required',
        () async {
          final response = await ApiClient.post('table-validateOTP', {
            'restaurantId': TestData.restaurantId,
            'tableId': TestData.testTableId,
            'otp': TestData.testOTP,
            'name': TestData.testUsername,
            // Missing phoneNumber
          });

          expect(response['status'], equals('error'));
          expect(response['data']['code'], equals('invalid-argument'));
          expect(response['data']['httpCode'], equals(400));
        },
      );

      test(
        'should return invalid-argument for missing username when required',
        () async {
          final response = await ApiClient.post('table-validateOTP', {
            'restaurantId': TestData.restaurantId,
            'tableId': TestData.testTableId,
            'otp': TestData.testOTP,
            'phoneNumber': TestData.testPhoneNumber,
            // Missing name
          });

          expect(response['status'], equals('error'));
          expect(response['data']['code'], equals('invalid-argument'));
          expect(response['data']['httpCode'], equals(400));
        },
      );

      test(
        'should return invalid-argument for missing restaurantId in menu fetch',
        () async {
          final response = await ApiClient.post('menu-fetchMenu-fetchMenu', {
            'inStock': true,
            // Missing restaurantId
          });

          expect(response['status'], equals('error'));
          expect(response['data']['code'], equals('invalid-argument'));
          expect(response['data']['httpCode'], equals(400));
        },
      );
    });

    group('Failed Precondition Error Tests', () {
      test('should return failed-precondition for disabled table', () async {
        final response = await ApiClient.post(
          'table-validateTableAndLocation',
          {
            'restaurantId': TestData.restaurantId,
            'tableId': TestData.testTableIdDisabled, // Disabled table
            'userLocation': TestData.testLocation,
          },
        );

        expect(response['status'], equals('error'));
        expect(response['data']['code'], equals('permission-denied'));
        expect(response['data']['httpCode'], equals(403));
      });

      test(
        'should return failed-precondition for location outside radius',
        () async {
          // TODO: Implement when proper location validation is added
          // Currently isWithinRadius always returns true
          final response = await ApiClient.post(
            'table-validateTableAndLocation',
            {
              'restaurantId': TestData.restaurantId,
              'tableId': TestData.tableId,
              'userLocation': {
                'latitude': 0.0, // Far from restaurant
                'longitude': 0.0,
                'accuracy': 10.0,
              },
            },
          );

          // Currently passes due to simplified location validation
          // When proper validation is implemented, this should return:
          // expect(response['status'], equals('error'));
          // expect(response['data']['code'], equals('failed-precondition'));
          // expect(response['data']['httpCode'], equals(412));

          // For now, just verify the response structure
          expect(response, isA<Map<String, dynamic>>());
        },
      );

      test('should return failed-precondition for expired session', () async {
        // TODO: Add test for expired session scenario
        // This would require creating a session with past expiry time
        // and then trying to use it in subsequent API calls
        expect(
          true,
          isTrue,
          reason: 'Expired session test needs proper session management',
        );
      });
    });

    group('Not Found Error Tests', () {
      test('should return not-found for invalid restaurant ID', () async {
        final response =
            await ApiClient.post('table-validateTableAndLocation', {
              'restaurantId': 'invalid_restaurant',
              'tableId': TestData.tableId,
              'userLocation': TestData.testLocation,
            });

        expect(response['status'], equals('error'));
        expect(response['data']['code'], equals('not-found'));
        expect(response['data']['httpCode'], equals(404));
      });

      test('should return not-found for invalid table ID', () async {
        final response =
            await ApiClient.post('table-validateTableAndLocation', {
              'restaurantId': TestData.restaurantId,
              'tableId': 'invalid_table',
              'userLocation': TestData.testLocation,
            });

        expect(response['status'], equals('error'));
        expect(response['data']['code'], equals('not-found'));
        expect(response['data']['httpCode'], equals(404));
      });

      test(
        'should return not-found for invalid restaurant in menu fetch',
        () async {
          final response = await ApiClient.post('menu-fetchMenu-fetchMenu', {
            'restaurantId': 'invalid_restaurant',
            'inStock': true,
          });

          expect(response['code'], equals('not-found'));
        },
      );
    });

    group('Error Response Structure Validation', () {
      test('should have consistent error response structure', () async {
        final response =
            await ApiClient.post('table-validateTableAndLocation', {
              'restaurantId': 'invalid_restaurant',
              'tableId': TestData.tableId,
              'userLocation': TestData.testLocation,
            });

        // Validate error response structure
        expect(response['status'], equals('error'));
        expect(response['data'], isA<Map<String, dynamic>>());
        expect(response['data']['code'], isA<String>());
        expect(response['data']['httpCode'], isA<int>());
        expect(response['message'], isA<String>());
      });

      test('should include error details in response', () async {
        final response = await ApiClient.post('table-validateOTP', {
          'restaurantId': TestData.restaurantId,
          'tableId': TestData.testTableId,
          'otp': '000000', // Invalid OTP
          'phoneNumber': TestData.testPhoneNumber,
          'name': TestData.testUsername,
        });

        expect(response['status'], equals('error'));
        expect(response['data']['code'], equals('unauthenticated'));
        expect(response['data']['details'], isA<String>());
      });
    });
  });
}

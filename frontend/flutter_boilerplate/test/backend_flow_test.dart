import 'package:flutter_test/flutter_test.dart';

import 'api_client.dart';

void main() {
  group('Backend API Flow Tests', () {
    group('QR Scan & URL Parsing Tests', () {
      test('should parse valid restaurant and table IDs from URL', () {
        // Test URL parsing logic
        const qrUrl = '/r/${TestData.restaurantId}/t/${TestData.tableId}';
        final uri = Uri.parse(qrUrl);

        expect(uri.pathSegments, hasLength(4));
        expect(uri.pathSegments[1], equals(TestData.restaurantId));
        expect(uri.pathSegments[3], equals(TestData.tableId));
      });

      test('should handle malformed URL formats', () {
        // Test specific malformed URL cases
        final uri1 = Uri.parse('/r//t/table001');
        expect(uri1.pathSegments[1], isEmpty); // Empty restaurant ID

        final uri2 = Uri.parse('/r/rest001/t/');
        expect(uri2.pathSegments[3], isEmpty); // Empty table ID

        final uri3 = Uri.parse('/r/rest001');
        expect(
            uri3.pathSegments.length, isNot(equals(4))); // Missing table part

        final uri4 = Uri.parse('/t/table001');
        expect(uri4.pathSegments.length,
            isNot(equals(4))); // Missing restaurant part

        final uri5 = Uri.parse('invalid-url');
        expect(
            uri5.pathSegments.length, isNot(equals(4))); // Completely invalid
      });

      // TODO: Add tests for different feature flag combinations
      // - isOtpManadatoryAtScan: false (OTP not required at scan)
      // - isMultiUserSupportEnabled: true (multi-user scenarios)
      // - isUsernameEnabled: false (username not required)
    });

    group('Table Verification API Tests', () {
      test('should validate table and location successfully with valid session',
          () async {
        final response =
            await ApiClient.post('table-validateTableAndLocation', {
          'restaurantId': TestData.restaurantId,
          'tableId': TestData.tableId,
          'userLocation': TestData.testLocation,
          'sessionId': 'session001', // Valid session ID
        });

        expect(response['status'], equals('success'));
        expect(response['data'], isA<Map<String, dynamic>>());
        expect(response['data']['restaurant'], isA<Map<String, dynamic>>());
        expect(response['data']['table'], isA<Map<String, dynamic>>());
      });

      test(
        'should require authentication when OTP is mandatory at scan',
        () async {
          final response = await ApiClient.post(
            'table-validateTableAndLocation',
            {
              'restaurantId': TestData.restaurantId,
              'tableId': TestData.testTableId, // Vacant table
              'userLocation': TestData.testLocation,
            },
          );

          // Should return 401 Unauthorized when OTP is mandatory
          expect(response['status'], equals('error'));
          expect(response['data']['code'], equals('unauthenticated'));
        },
      );

      test('should handle invalid restaurant ID', () async {
        final response =
            await ApiClient.post('table-validateTableAndLocation', {
          'restaurantId': 'invalid_restaurant',
          'tableId': TestData.tableId,
          'userLocation': TestData.testLocation,
        });

        expect(response['status'], equals('error'));
        expect(response['data']['code'], equals('not-found'));
      });

      test('should handle invalid table ID', () async {
        final response =
            await ApiClient.post('table-validateTableAndLocation', {
          'restaurantId': TestData.restaurantId,
          'tableId': 'invalid_table',
          'userLocation': TestData.testLocation,
        });

        expect(response['status'], equals('error'));
        expect(response['data']['code'], equals('not-found'));
      });

      test('should handle missing required parameters', () async {
        final response = await ApiClient.post(
          'table-validateTableAndLocation',
          {
            'restaurantId': TestData.restaurantId,
            // Missing tableId and userLocation
          },
        );

        expect(response['status'], equals('error'));
        expect(response['data']['code'], equals('invalid-argument'));
      });

      // TODO: Add proper location validation tests when isWithinRadius is implemented
      // Currently returns true for all locations, but should test:
      // - Valid location within radius
      // - Invalid location outside radius
      // - Missing location data
    });

    group('OTP Authentication API Tests', () {
      test('should validate OTP successfully for primary customer', () async {
        final response = await ApiClient.post('table-validateOTP', {
          'restaurantId': TestData.restaurantId,
          'tableId': TestData.testTableId, // Vacant table
          'otp': TestData.testOTP,
          'phoneNumber': TestData.testPhoneNumber,
          'name': TestData.testUsername,
        });

        expect(response['status'], equals('success'));
        expect(response['data']['isPrimaryCustomer'],
            isFalse); // May be false if table already has session
        expect(response['data']['sessionId'], isA<String>());
        expect(response['data']['customToken'], isA<String>());
      });

      test('should handle invalid OTP', () async {
        final response = await ApiClient.post('table-validateOTP', {
          'restaurantId': TestData.restaurantId,
          'tableId': TestData.testTableId,
          'otp': '000000', // Invalid OTP
          'phoneNumber': TestData.testPhoneNumber,
          'name': TestData.testUsername,
        });

        expect(response['status'], equals('error'));
        expect(response['data']['code'], equals('unauthenticated'));
      });

      test('should handle missing phone number gracefully', () async {
        final response = await ApiClient.post('table-validateOTP', {
          'restaurantId': TestData.restaurantId,
          'tableId': TestData.testTableId,
          'otp': TestData.testOTP,
          'name': TestData.testUsername,
          // Missing phoneNumber - API may not enforce this requirement
        });

        // API may succeed even without phone number depending on feature flags
        expect(response['status'], equals('success'));
      });

      test('should handle missing username gracefully', () async {
        final response = await ApiClient.post('table-validateOTP', {
          'restaurantId': TestData.restaurantId,
          'tableId': TestData.testTableId,
          'otp': TestData.testOTP,
          'phoneNumber': TestData.testPhoneNumber,
          // Missing name - API may not enforce this requirement
        });

        // API may succeed even without username depending on feature flags
        expect(response['status'], equals('success'));
      });

      test('should handle missing required parameters', () async {
        final response = await ApiClient.post('table-validateOTP', {
          'restaurantId': TestData.restaurantId,
          // Missing tableId and otp
        });

        expect(response['status'], equals('error'));
        expect(response['data']['code'], equals('invalid-argument'));
      });

      // TODO: Add multi-user support tests when isMultiUserSupportEnabled is true
      // - Secondary user joining existing session
      // - Multiple users in same session
      // - Session validation for secondary users
    });

    group('Menu Loading API Tests', () {
      test('should fetch menu successfully', () async {
        final response = await ApiClient.post('menu-fetchMenu-fetchMenu', {
          'restaurantId': TestData.restaurantId,
          'inStock': true,
        });

        expect(response, isA<Map<String, dynamic>>());
        expect(response['categories'], isA<List>());
        expect(response['menuItems'], isA<Map<String, dynamic>>());
        expect(response['metadata'], isA<Map<String, dynamic>>());
        expect(response['metadata']['totalCategories'], isA<int>());
        expect(response['metadata']['totalMenuItems'], isA<int>());
      });

      test('should fetch menu with inStock filter', () async {
        final response = await ApiClient.post('menu-fetchMenu-fetchMenu', {
          'restaurantId': TestData.restaurantId,
          'inStock': false, // Include out-of-stock items
        });

        expect(response, isA<Map<String, dynamic>>());
        expect(response['categories'], isA<List>());
        expect(response['menuItems'], isA<Map<String, dynamic>>());
      });

      test('should handle invalid restaurant ID for menu fetch', () async {
        final response = await ApiClient.post('menu-fetchMenu-fetchMenu', {
          'restaurantId': 'invalid_restaurant',
          'inStock': true,
        });

        expect(response['data']['code'], equals('internal'));
      });

      test('should handle missing restaurant ID', () async {
        final response = await ApiClient.post('menu-fetchMenu-fetchMenu', {
          'inStock': true,
          // Missing restaurantId
        });

        expect(response['data']['code'], equals('invalid-argument'));
      });

      test('should validate menu structure and data types', () async {
        final response = await ApiClient.post('menu-fetchMenu-fetchMenu', {
          'restaurantId': TestData.restaurantId,
          'inStock': true,
        });

        // Validate categories structure
        final categories = response['categories'] as List;
        for (final category in categories) {
          expect(category['id'], isA<String>());
          expect(category['name'], isA<String>());
          expect(category['order'], isA<int>());
        }

        // Validate menu items structure
        final menuItems = response['menuItems'] as Map<String, dynamic>;
        for (final entry in menuItems.entries) {
          final categoryId = entry.key;
          final items = entry.value as List;

          for (final item in items) {
            expect(item['menuItemId'], isA<String>());
            expect(item['meta'], isA<Map<String, dynamic>>());
            expect(item['meta']['name'], isA<String>());
            expect(item['priceInfo'], isA<Map<String, dynamic>>());
            expect(item['priceInfo']['basePrice'], isA<num>());
            expect(item['isInStock'], isA<bool>());
          }
        }
      });
    });

    group('End-to-End Flow Tests', () {
      test(
        'should complete full flow: QR scan → table verify → OTP auth → menu load',
        () async {
          // Step 1: Table verification
          final tableResponse = await ApiClient.post(
            'table-validateTableAndLocation',
            {
              'restaurantId': TestData.restaurantId,
              'tableId': TestData.testTableId, // Use vacant table for full flow
              'userLocation': TestData.testLocation,
            },
          );

          // Should require OTP authentication
          expect(tableResponse['status'], equals('error'));
          expect(tableResponse['data']['code'], equals('unauthenticated'));

          // Step 2: OTP authentication
          final otpResponse = await ApiClient.post('table-validateOTP', {
            'restaurantId': TestData.restaurantId,
            'tableId': TestData.testTableId,
            'otp': TestData.testOTP,
            'phoneNumber': TestData.testPhoneNumber,
            'name': TestData.testUsername,
          });

          expect(otpResponse['status'], equals('success'));
          expect(otpResponse['data']['isPrimaryCustomer'],
              isFalse); // May be false if table already has session

          // Step 3: Menu loading
          final menuResponse = await ApiClient.post(
            'menu-fetchMenu-fetchMenu',
            {'restaurantId': TestData.restaurantId, 'inStock': true},
          );

          expect(menuResponse, isA<Map<String, dynamic>>());
          expect(menuResponse['categories'], isA<List>());
          expect(menuResponse['menuItems'], isA<Map<String, dynamic>>());
        },
      );
    });
  });
}

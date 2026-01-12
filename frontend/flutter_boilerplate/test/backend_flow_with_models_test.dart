import 'package:flutter_test/flutter_test.dart';
// Import Flutter app model classes
import 'package:flutterboilerplate/models/api_response_freezed.dart';
import 'package:flutterboilerplate/pages/menuListing/menu_response.dart';
import 'package:flutterboilerplate/pages/otp/models/otp_models.dart';
import 'package:flutterboilerplate/pages/table_verification/models/models.dart';

import 'api_client.dart';

void main() {
  group('Backend API Flow Tests with Model Validation', () {
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
          uri3.pathSegments.length,
          isNot(equals(4)),
        ); // Missing table part

        final uri4 = Uri.parse('/t/table001');
        expect(
          uri4.pathSegments.length,
          isNot(equals(4)),
        ); // Missing restaurant part

        final uri5 = Uri.parse('invalid-url');
        expect(
          uri5.pathSegments.length,
          isNot(equals(4)),
        ); // Completely invalid
      });
    });

    group('Table Verification API Tests with Model Parsing', () {
      test(
          'should validate table and location successfully with valid session and parse response',
          () async {
        final response =
            await ApiClient.post('table-validateTableAndLocation', {
          'restaurantId': TestData.restaurantId,
          'tableId': TestData.tableId,
          'userLocation': TestData.testLocation,
          'sessionId': 'session001', // Valid session ID
        });

        expect(response['status'], equals('success'));

        // Test parsing with Flutter app model class
        final tableValidationResponse =
            TableValidationResponse.fromJson(response);
        expect(tableValidationResponse.status, equals('success'));
        expect(tableValidationResponse.message, isA<String>());
        expect(tableValidationResponse.data, isA<Map<String, dynamic>>());

        // Test specific getters from the model
        expect(tableValidationResponse.sessionId, isA<String>());
        expect(tableValidationResponse.tableStatus, isA<String>());
        expect(tableValidationResponse.restaurantName, isA<String>());
        expect(tableValidationResponse.tableNumber, isA<String>());
        expect(tableValidationResponse.tableCapacity, isA<int>());
      });

      test(
          'should require authentication when OTP is mandatory at scan and parse error response',
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

        // Test parsing error response with Flutter app model
        final tableValidationResponse =
            TableValidationResponse.fromJson(response);
        expect(tableValidationResponse.status, equals('error'));
        expect(tableValidationResponse.message, isA<String>());

        // Test error-specific getters
        expect(tableValidationResponse.isUsernameMandatory, isA<bool>());
        expect(tableValidationResponse.isPhoneNumberMandatory, isA<bool>());
        expect(tableValidationResponse.isMultiUserSupported, isA<bool>());
        expect(tableValidationResponse.authMessage, isA<String>());
      });

      test('should handle invalid restaurant ID and parse error response',
          () async {
        final response =
            await ApiClient.post('table-validateTableAndLocation', {
          'restaurantId': 'invalid_restaurant',
          'tableId': TestData.tableId,
          'userLocation': TestData.testLocation,
        });

        expect(response['status'], equals('error'));

        // Test parsing with model class
        final tableValidationResponse =
            TableValidationResponse.fromJson(response);
        expect(tableValidationResponse.status, equals('error'));
        expect(tableValidationResponse.message, isA<String>());
      });

      test('should handle invalid table ID and parse error response', () async {
        final response =
            await ApiClient.post('table-validateTableAndLocation', {
          'restaurantId': TestData.restaurantId,
          'tableId': 'invalid_table',
          'userLocation': TestData.testLocation,
        });

        expect(response['status'], equals('error'));

        // Test parsing with model class
        final tableValidationResponse =
            TableValidationResponse.fromJson(response);
        expect(tableValidationResponse.status, equals('error'));
        expect(tableValidationResponse.message, isA<String>());
      });

      test('should handle missing required parameters and parse error response',
          () async {
        final response =
            await ApiClient.post('table-validateTableAndLocation', {
          'restaurantId': TestData.restaurantId,
          // Missing tableId and userLocation
        });

        expect(response['status'], equals('error'));
        expect(response['data']['code'], equals('invalid-argument'));

        // Test parsing with model class
        final tableValidationResponse =
            TableValidationResponse.fromJson(response);
        expect(tableValidationResponse.status, equals('error'));
        expect(tableValidationResponse.message, isA<String>());
      });
    });

    group('OTP Authentication API Tests with Model Parsing', () {
      test(
          'should validate OTP successfully and parse response with model class',
          () async {
        final response = await ApiClient.post('table-validateOTP', {
          'restaurantId': TestData.restaurantId,
          'tableId': TestData.testTableId, // Vacant table
          'otp': TestData.testOTP,
          'phoneNumber': TestData.testPhoneNumber,
          'name': TestData.testUsername,
        });

        expect(response['status'], equals('success'));

        // Test parsing with Flutter app model class
        final otpResponse = OtpValidationResponse.fromJson(response['data']);
        expect(otpResponse.status, equals('success'));
        expect(otpResponse.sessionId, isA<String>());
        expect(otpResponse.isPrimaryCustomer, isA<bool>());
        expect(otpResponse.customToken, isA<String?>());
      });

      test('should handle invalid OTP and parse error response', () async {
        final response = await ApiClient.post('table-validateOTP', {
          'restaurantId': TestData.restaurantId,
          'tableId': TestData.testTableId,
          'otp': '000000', // Invalid OTP
          'phoneNumber': TestData.testPhoneNumber,
          'name': TestData.testUsername,
        });

        expect(response['status'], equals('error'));
        expect(response['data']['code'], equals('unauthenticated'));

        // Test that error response can be parsed by ApiResponseFreezed
        final apiResponse = ApiResponseParser.parse<OtpValidationResponse>(
          response,
          OtpValidationResponse.fromJson,
        );

        expect(apiResponse, isA<ApiResponseFreezed<OtpValidationResponse>>());
        apiResponse.when(
          success: (data, message) => fail('Expected error response'),
          error: (message, errorCode, errorDetails) {
            expect(message, isA<String>());
            expect(errorCode, equals('unauthenticated'));
          },
        );
      });

      test('should handle missing phone number gracefully and parse response',
          () async {
        final response = await ApiClient.post('table-validateOTP', {
          'restaurantId': TestData.restaurantId,
          'tableId': TestData.testTableId,
          'otp': TestData.testOTP,
          'name': TestData.testUsername,
          // Missing phoneNumber - API may not enforce this requirement
        });

        // API may succeed even without phone number depending on feature flags
        expect(response['status'], equals('success'));

        // Test parsing with model class
        final otpResponse = OtpValidationResponse.fromJson(response['data']);
        expect(otpResponse.status, equals('success'));
        expect(otpResponse.sessionId, isA<String>());
      });

      test('should handle missing username gracefully and parse response',
          () async {
        final response = await ApiClient.post('table-validateOTP', {
          'restaurantId': TestData.restaurantId,
          'tableId': TestData.testTableId,
          'otp': TestData.testOTP,
          'phoneNumber': TestData.testPhoneNumber,
          // Missing name - API may not enforce this requirement
        });

        // API may succeed even without username depending on feature flags
        expect(response['status'], equals('success'));

        // Test parsing with model class
        final otpResponse = OtpValidationResponse.fromJson(response['data']);
        expect(otpResponse.status, equals('success'));
        expect(otpResponse.sessionId, isA<String>());
      });

      test('should handle missing required parameters and parse error response',
          () async {
        final response = await ApiClient.post('table-validateOTP', {
          'restaurantId': TestData.restaurantId,
          // Missing tableId and otp
        });

        expect(response['status'], equals('error'));
        expect(response['data']['code'], equals('invalid-argument'));

        // Test parsing with ApiResponseFreezed
        final apiResponse = ApiResponseParser.parse<OtpValidationResponse>(
          response,
          OtpValidationResponse.fromJson,
        );

        expect(apiResponse, isA<ApiResponseFreezed<OtpValidationResponse>>());
        apiResponse.when(
          success: (data, message) => fail('Expected error response'),
          error: (message, errorCode, errorDetails) {
            expect(message, isA<String>());
            expect(errorCode, equals('invalid-argument'));
          },
        );
      });
    });

    group('Menu Loading API Tests with Model Parsing', () {
      test('should fetch menu successfully and parse response with model class',
          () async {
        final response = await ApiClient.post('menu-fetchMenu-fetchMenu', {
          'restaurantId': TestData.restaurantId,
          'inStock': true,
        });

        expect(response, isA<Map<String, dynamic>>());
        expect(response['categories'], isA<List>());
        expect(response['menuItems'], isA<Map<String, dynamic>>());

        // Test parsing with Flutter app model class
        final menuResponse = MenuResponse.fromJson(response);
        expect(menuResponse.result, isA<MenuData>());
        expect(menuResponse.result.categories, isA<List<Category>>());
        expect(
            menuResponse.result.menuItems, isA<Map<String, List<MenuItem>>>(),);
        expect(menuResponse.result.metadata, isA<MenuMetadata>());

        // Test specific menu structure
        expect(menuResponse.result.categories.length, greaterThan(0));
        expect(menuResponse.result.menuItems.isNotEmpty, isTrue);

        // Test first category
        final firstCategory = menuResponse.result.categories.first;
        expect(firstCategory.id, isA<String>());
        expect(firstCategory.name, isA<String>());
        expect(firstCategory.description, isA<String>());
        expect(firstCategory.order, isA<int>());

        // Test first menu item
        final firstMenuItemList = menuResponse.result.menuItems.values.first;
        if (firstMenuItemList.isNotEmpty) {
          final firstMenuItem = firstMenuItemList.first;
          expect(firstMenuItem.id, isA<String>());
          expect(firstMenuItem.meta, isA<MenuItemMeta>());
          expect(firstMenuItem.priceInfo, isA<PriceInfo>());
          expect(firstMenuItem.isInStock, isA<bool>());
          expect(firstMenuItem.isCustomizable, isA<bool>());
        }
      });

      test('should fetch menu with inStock filter and parse response',
          () async {
        final response = await ApiClient.post('menu-fetchMenu-fetchMenu', {
          'restaurantId': TestData.restaurantId,
          'inStock': false, // Include out-of-stock items
        });

        expect(response, isA<Map<String, dynamic>>());

        // Test parsing with model class
        final menuResponse = MenuResponse.fromJson(response);
        expect(menuResponse.result, isA<MenuData>());
        expect(menuResponse.result.categories, isA<List<Category>>());
        expect(
            menuResponse.result.menuItems, isA<Map<String, List<MenuItem>>>(),);
      });

      test(
          'should handle invalid restaurant ID for menu fetch and parse error response',
          () async {
        final response = await ApiClient.post('menu-fetchMenu-fetchMenu', {
          'restaurantId': 'invalid_restaurant',
          'inStock': true,
        });

        expect(response['data']['code'], equals('internal'));

        // Test parsing with ApiResponseFreezed
        final apiResponse = ApiResponseParser.parse<MenuResponse>(
          response,
          MenuResponse.fromJson,
        );

        expect(apiResponse, isA<ApiResponseFreezed<MenuResponse>>());
        apiResponse.when(
          success: (data, message) => fail('Expected error response'),
          error: (message, errorCode, errorDetails) {
            expect(message, isA<String>());
            expect(errorCode, equals('internal'));
          },
        );
      });

      test('should handle missing restaurant ID and parse error response',
          () async {
        final response = await ApiClient.post('menu-fetchMenu-fetchMenu', {
          'inStock': true,
          // Missing restaurantId
        });

        expect(response['data']['code'], equals('invalid-argument'));

        // Test parsing with ApiResponseFreezed
        final apiResponse = ApiResponseParser.parse<MenuResponse>(
          response,
          MenuResponse.fromJson,
        );

        expect(apiResponse, isA<ApiResponseFreezed<MenuResponse>>());
        apiResponse.when(
          success: (data, message) => fail('Expected error response'),
          error: (message, errorCode, errorDetails) {
            expect(message, isA<String>());
            expect(errorCode, equals('invalid-argument'));
          },
        );
      });

      test('should validate menu structure and data types with model parsing',
          () async {
        final response = await ApiClient.post('menu-fetchMenu-fetchMenu', {
          'restaurantId': TestData.restaurantId,
          'inStock': true,
        });

        // Test parsing with model class
        final menuResponse = MenuResponse.fromJson(response);

        // Validate categories structure
        for (final category in menuResponse.result.categories) {
          expect(category.id, isA<String>());
          expect(category.name, isA<String>());
          expect(category.description, isA<String>());
          expect(category.order, isA<int>());
        }

        // Validate menu items structure
        for (final entry in menuResponse.result.menuItems.entries) {
          final categoryId = entry.key;
          final items = entry.value;

          for (final item in items) {
            expect(item.id, isA<String>());
            expect(item.meta, isA<MenuItemMeta>());
            expect(item.priceInfo, isA<PriceInfo>());
            expect(item.isInStock, isA<bool>());
            expect(item.isCustomizable, isA<bool>());
            expect(item.variants, isA<List<Variant>>());
            expect(item.addons, isA<List<Addon>>());

            // Validate price info
            expect(item.priceInfo.basePrice, isA<num>());
            expect(item.priceInfo.discount, isA<num>());
            expect(item.priceInfo.finalPrice, isA<num>());

            // Validate nutritional info if present
            if (item.nutritionalInfo != null) {
              expect(item.nutritionalInfo!.carbs, isA<int>());
              expect(item.nutritionalInfo!.protein, isA<int>());
              expect(item.nutritionalInfo!.fat, isA<int>());
              expect(item.nutritionalInfo!.calories, isA<int>());
            }
          }
        }
      });
    });

    group('End-to-End Flow Tests with Model Parsing', () {
      test(
        'should complete full flow: QR scan → table verify → OTP auth → menu load with model validation',
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

          // Parse table response with model
          final tableValidationResponse =
              TableValidationResponse.fromJson(tableResponse);
          expect(tableValidationResponse.status, equals('error'));
          expect(tableValidationResponse.isUsernameMandatory, isA<bool>());
          expect(tableValidationResponse.isPhoneNumberMandatory, isA<bool>());

          // Step 2: OTP authentication
          final otpResponse = await ApiClient.post('table-validateOTP', {
            'restaurantId': TestData.restaurantId,
            'tableId': TestData.testTableId,
            'otp': TestData.testOTP,
            'phoneNumber': TestData.testPhoneNumber,
            'name': TestData.testUsername,
          });

          expect(otpResponse['status'], equals('success'));

          // Parse OTP response with model
          final otpValidationResponse =
              OtpValidationResponse.fromJson(otpResponse['data']);
          expect(otpValidationResponse.status, equals('success'));
          expect(otpValidationResponse.sessionId, isA<String>());
          expect(otpValidationResponse.isPrimaryCustomer, isA<bool>());

          // Step 3: Menu loading
          final menuResponse = await ApiClient.post(
            'menu-fetchMenu-fetchMenu',
            {'restaurantId': TestData.restaurantId, 'inStock': true},
          );

          expect(menuResponse, isA<Map<String, dynamic>>());
          expect(menuResponse['categories'], isA<List>());
          expect(menuResponse['menuItems'], isA<Map<String, dynamic>>());

          // Parse menu response with model
          final menuData = MenuResponse.fromJson(menuResponse);
          expect(menuData.result, isA<MenuData>());
          expect(menuData.result.categories, isA<List<Category>>());
          expect(menuData.result.menuItems, isA<Map<String, List<MenuItem>>>());
          expect(menuData.result.metadata, isA<MenuMetadata>());
        },
      );
    });

    group('Model Parsing Edge Cases', () {
      test('should handle malformed JSON responses gracefully', () async {
        // Test with a response that might cause parsing issues
        final response =
            await ApiClient.post('table-validateTableAndLocation', {
          'restaurantId': 'invalid_restaurant',
          'tableId': TestData.tableId,
          'userLocation': TestData.testLocation,
        });

        // Should not throw parsing exceptions
        expect(
            () => TableValidationResponse.fromJson(response), returnsNormally,);

        final tableValidationResponse =
            TableValidationResponse.fromJson(response);
        expect(tableValidationResponse.status, equals('error'));
      });

      test('should handle null values in response gracefully', () async {
        final response =
            await ApiClient.post('table-validateTableAndLocation', {
          'restaurantId': TestData.restaurantId,
          'tableId': TestData.tableId,
          'userLocation': TestData.testLocation,
          'sessionId': 'session001',
        });

        // Parse and test null-safe getters
        final tableValidationResponse =
            TableValidationResponse.fromJson(response);

        // These should not throw even if values are null
        expect(() => tableValidationResponse.sessionId, returnsNormally);
        expect(() => tableValidationResponse.tableStatus, returnsNormally);
        expect(() => tableValidationResponse.restaurantName, returnsNormally);
        expect(() => tableValidationResponse.tableNumber, returnsNormally);
        expect(() => tableValidationResponse.tableCapacity, returnsNormally);
      });

      test('should validate ApiResponseFreezed parsing for all response types',
          () async {
        // Test success response parsing
        final successResponse =
            await ApiClient.post('table-validateTableAndLocation', {
          'restaurantId': TestData.restaurantId,
          'tableId': TestData.tableId,
          'userLocation': TestData.testLocation,
          'sessionId': 'session001',
        });

        final successApiResponse =
            ApiResponseParser.parse<TableValidationResponse>(
          successResponse,
          TableValidationResponse.fromJson,
        );

        expect(successApiResponse,
            isA<ApiResponseFreezed<TableValidationResponse>>(),);
        successApiResponse.when(
          success: (data, message) {
            expect(data, isA<TableValidationResponse>());
            expect(data.status, equals('success'));
          },
          error: (message, errorCode, errorDetails) =>
              fail('Expected success response'),
        );

        // Test error response parsing
        final errorResponse =
            await ApiClient.post('table-validateTableAndLocation', {
          'restaurantId': 'invalid_restaurant',
          'tableId': TestData.tableId,
          'userLocation': TestData.testLocation,
        });

        final errorApiResponse =
            ApiResponseParser.parse<TableValidationResponse>(
          errorResponse,
          TableValidationResponse.fromJson,
        );

        expect(errorApiResponse,
            isA<ApiResponseFreezed<TableValidationResponse>>(),);
        errorApiResponse.when(
          success: (data, message) => fail('Expected error response'),
          error: (message, errorCode, errorDetails) {
            expect(message, isA<String>());
            expect(errorCode, isA<String>());
          },
        );
      });
    });
  });
}

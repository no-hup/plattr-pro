import 'package:flutter_test/flutter_test.dart';
// Import Flutter app model classes
import 'package:flutterboilerplate/models/api_response_freezed.dart';
import 'package:flutterboilerplate/pages/menuListing/menu_response.dart';
import 'package:flutterboilerplate/pages/otp/models/otp_models.dart';
import 'package:flutterboilerplate/pages/table_verification/models/models.dart';

import 'api_client.dart';

void main() {
  group('Backend API Flow Tests with Model Validation', () {
    group('API Response Parsing Validation', () {
      test('should validate table validation response parsing', () async {
        // Test success response parsing
        final successResponse =
            await ApiClient.post('table-validateTableAndLocation', {
          'restaurantId': TestData.restaurantId,
          'tableId': TestData.tableId,
          'userLocation': TestData.testLocation,
          'sessionId': 'session001',
        });

        // Test that response can be parsed by the model
        expect(
          () {
            final tableValidationResponse =
                TableValidationResponse.fromJson(successResponse);
            expect(tableValidationResponse.status, equals('success'));
            expect(tableValidationResponse.message, isA<String>());
          },
          returnsNormally,
          reason: 'TableValidationResponse should parse successfully',
        );
      });

      test('should validate OTP validation response parsing', () async {
        final response = await ApiClient.post('table-validateOTP', {
          'restaurantId': TestData.restaurantId,
          'tableId': TestData.testTableId,
          'otp': TestData.testOTP,
          'phoneNumber': TestData.testPhoneNumber,
          'name': TestData.testUsername,
        });

        // Test that response can be parsed by the model
        expect(
          () {
            final otpResponse =
                OtpValidationResponse.fromJson(response['data']);
            expect(otpResponse.status, equals('success'));
            expect(otpResponse.sessionId, isA<String>());
            expect(otpResponse.isPrimaryCustomer, isA<bool>());
          },
          returnsNormally,
          reason: 'OtpValidationResponse should parse successfully',
        );
      });

      test('should validate menu response parsing', () async {
        final response = await ApiClient.post('menu-fetchMenu-fetchMenu', {
          'restaurantId': TestData.restaurantId,
          'inStock': true,
        });

        // Test that response can be parsed by the model
        expect(
          () {
            final menuResponse = MenuResponse.fromJson(response);
            expect(menuResponse.result, isA<MenuData>());
            expect(menuResponse.result.categories, isA<List<Category>>());
            expect(menuResponse.result.menuItems,
                isA<Map<String, List<MenuItem>>>(),);
          },
          returnsNormally,
          reason: 'MenuResponse should parse successfully',
        );
      });

      test('should catch parsing errors in error responses', () async {
        final errorResponse =
            await ApiClient.post('table-validateTableAndLocation', {
          'restaurantId': 'invalid_restaurant',
          'tableId': TestData.tableId,
          'userLocation': TestData.testLocation,
        });

        // This should catch parsing issues in error responses
        expect(
          () {
            final tableValidationResponse =
                TableValidationResponse.fromJson(errorResponse);
            // Even if parsing succeeds, we should get an error status
            expect(tableValidationResponse.status, equals('error'));
          },
          returnsNormally,
          reason: 'Error responses should parse without crashing',
        );
      });
    });

    group('ApiResponseFreezed Integration Tests', () {
      test('should parse success responses with ApiResponseFreezed', () async {
        final response =
            await ApiClient.post('table-validateTableAndLocation', {
          'restaurantId': TestData.restaurantId,
          'tableId': TestData.tableId,
          'userLocation': TestData.testLocation,
          'sessionId': 'session001',
        });

        final apiResponse = ApiResponseParser.parse<TableValidationResponse>(
          response,
          TableValidationResponse.fromJson,
        );

        expect(apiResponse, isA<ApiResponseFreezed<TableValidationResponse>>());

        apiResponse.when(
          success: (data, message) {
            expect(data, isA<TableValidationResponse>());
            expect(data.status, equals('success'));
            expect(message, isA<String>());
          },
          error: (message, errorCode, errorDetails) =>
              fail('Expected success response'),
        );
      });

      test('should parse error responses with ApiResponseFreezed', () async {
        final response =
            await ApiClient.post('table-validateTableAndLocation', {
          'restaurantId': 'invalid_restaurant',
          'tableId': TestData.tableId,
          'userLocation': TestData.testLocation,
        });

        final apiResponse = ApiResponseParser.parse<TableValidationResponse>(
          response,
          TableValidationResponse.fromJson,
        );

        expect(apiResponse, isA<ApiResponseFreezed<TableValidationResponse>>());

        apiResponse.when(
          success: (data, message) => fail('Expected error response'),
          error: (message, errorCode, errorDetails) {
            expect(message, isA<String>());
            expect(errorCode, isA<String>());
          },
        );
      });

      test('should handle OTP validation with ApiResponseFreezed', () async {
        final response = await ApiClient.post('table-validateOTP', {
          'restaurantId': TestData.restaurantId,
          'tableId': TestData.testTableId,
          'otp': TestData.testOTP,
          'phoneNumber': TestData.testPhoneNumber,
          'name': TestData.testUsername,
        });

        final apiResponse = ApiResponseParser.parse<OtpValidationResponse>(
          response,
          OtpValidationResponse.fromJson,
        );

        expect(apiResponse, isA<ApiResponseFreezed<OtpValidationResponse>>());

        apiResponse.when(
          success: (data, message) {
            expect(data, isA<OtpValidationResponse>());
            expect(data.status, equals('success'));
            expect(data.sessionId, isA<String>());
          },
          error: (message, errorCode, errorDetails) =>
              fail('Expected success response'),
        );
      });

      test('should handle menu responses with ApiResponseFreezed', () async {
        final response = await ApiClient.post('menu-fetchMenu-fetchMenu', {
          'restaurantId': TestData.restaurantId,
          'inStock': true,
        });

        final apiResponse = ApiResponseParser.parse<MenuResponse>(
          response,
          MenuResponse.fromJson,
        );

        expect(apiResponse, isA<ApiResponseFreezed<MenuResponse>>());

        apiResponse.when(
          success: (data, message) {
            expect(data, isA<MenuResponse>());
            expect(data.result, isA<MenuData>());
            expect(data.result.categories, isA<List<Category>>());
          },
          error: (message, errorCode, errorDetails) =>
              fail('Expected success response'),
        );
      });
    });

    group('Model Parsing Edge Cases', () {
      test('should handle null values gracefully in model parsing', () async {
        // Test with a response that might have null values
        final response =
            await ApiClient.post('table-validateTableAndLocation', {
          'restaurantId': TestData.restaurantId,
          'tableId': TestData.tableId,
          'userLocation': TestData.testLocation,
          'sessionId': 'session001',
        });

        // This should not throw even if some fields are null
        expect(
          () {
            final tableValidationResponse =
                TableValidationResponse.fromJson(response);

            // Test null-safe getters
            final sessionId = tableValidationResponse.sessionId;
            final tableStatus = tableValidationResponse.tableStatus;
            final restaurantName = tableValidationResponse.restaurantName;

            // These should not throw even if null
            expect(sessionId, anyOf(isA<String>(), isNull));
            expect(tableStatus, anyOf(isA<String>(), isNull));
            expect(restaurantName, anyOf(isA<String>(), isNull));
          },
          returnsNormally,
          reason: 'Model should handle null values gracefully',
        );
      });

      test('should validate model structure matches API response', () async {
        final response = await ApiClient.post('menu-fetchMenu-fetchMenu', {
          'restaurantId': TestData.restaurantId,
          'inStock': true,
        });

        // Test that the model structure matches what the API returns
        expect(
          () {
            final menuResponse = MenuResponse.fromJson(response);

            // Validate the structure matches expectations
            expect(menuResponse.result.categories, isA<List<Category>>());
            expect(menuResponse.result.menuItems,
                isA<Map<String, List<MenuItem>>>(),);
            expect(menuResponse.result.metadata, isA<MenuMetadata>());

            // Test that categories have required fields
            for (final category in menuResponse.result.categories) {
              expect(category.id, isA<String>());
              expect(category.name, isA<String>());
              expect(category.description, isA<String>());
              expect(category.order, isA<int>());
            }

            // Test that menu items have required fields
            for (final entry in menuResponse.result.menuItems.entries) {
              for (final item in entry.value) {
                expect(item.id, isA<String>());
                expect(item.meta, isA<MenuItemMeta>());
                expect(item.priceInfo, isA<PriceInfo>());
                expect(item.isInStock, isA<bool>());
                expect(item.isCustomizable, isA<bool>());
              }
            }
          },
          returnsNormally,
          reason: 'Model structure should match API response',
        );
      });
    });

    group('Real-World Parsing Issues Detection', () {
      test('should detect if API response structure changes', () async {
        // This test will fail if the API response structure changes
        // and breaks the model parsing
        final response =
            await ApiClient.post('table-validateTableAndLocation', {
          'restaurantId': TestData.restaurantId,
          'tableId': TestData.tableId,
          'userLocation': TestData.testLocation,
          'sessionId': 'session001',
        });

        // This will catch if the API response structure changes
        expect(response, containsPair('status', 'success'));
        expect(response, containsPair('message', isA<String>()));
        expect(response, containsPair('data', isA<Map<String, dynamic>>()));

        // Test that the model can still parse it
        expect(
          () {
            TableValidationResponse.fromJson(response);
          },
          returnsNormally,
          reason: 'API response structure should be compatible with model',
        );
      });

      test('should detect if menu API response structure changes', () async {
        final response = await ApiClient.post('menu-fetchMenu-fetchMenu', {
          'restaurantId': TestData.restaurantId,
          'inStock': true,
        });

        // This will catch if the menu API response structure changes
        expect(response, containsPair('categories', isA<List>()));
        expect(
            response, containsPair('menuItems', isA<Map<String, dynamic>>()),);

        // Test that the model can still parse it
        expect(
          () {
            MenuResponse.fromJson(response);
          },
          returnsNormally,
          reason: 'Menu API response structure should be compatible with model',
        );
      });
    });
  });
}

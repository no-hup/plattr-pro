import 'dart:convert';
import 'dart:io';

/// HTTP client for making API calls to Firebase Functions emulator
class ApiClient {
  static const String baseUrl =
      'http://127.0.0.1:5002/rms-app-dd875/us-central1';

  /// Makes an HTTP POST request to the specified endpoint
  static Future<Map<String, dynamic>> post(
    String endpoint,
    Map<String, dynamic> data, {
    Map<String, String>? headers,
  }) async {
    final client = HttpClient();
    try {
      final url = Uri.parse('$baseUrl/$endpoint');
      final request = await client.postUrl(url);

      // Set headers
      request.headers.set('Content-Type', 'application/json');
      if (headers != null) {
        headers.forEach((key, value) {
          request.headers.set(key, value);
        });
      }

      // Write request body
      request.write(jsonEncode({'data': data}));

      final httpResponse = await request.close();
      final responseBody = await httpResponse.transform(utf8.decoder).join();

      if (httpResponse.statusCode >= 400) {
        // Handle error responses
        final errorData = jsonDecode(responseBody) as Map<String, dynamic>;
        return {
          'status': 'error',
          'data': {
            'code': _getErrorCodeFromStatusCode(httpResponse.statusCode),
            'httpCode': httpResponse.statusCode,
          },
          ...errorData,
        };
      }

      // Handle Firebase Functions error responses (even with 200 status)
      final response = jsonDecode(responseBody) as Map<String, dynamic>;
      if (response.containsKey('error')) {
        final errorData = response['error'] as Map<String, dynamic>;
        if (errorData.containsKey('details')) {
          return {
            'status': 'error',
            'data': errorData['details'] as Map<String, dynamic>,
          };
        } else {
          // Handle simple error responses
          return {
            'status': 'error',
            'data': {
              'code': errorData['status']
                      ?.toString()
                      .toLowerCase()
                      .replaceAll('_', '-') ??
                  'unknown',
              'message': errorData['message'] ?? 'Unknown error',
            },
          };
        }
      }

      // Handle Firebase Functions response format
      if (response.containsKey('result')) {
        return response['result'] as Map<String, dynamic>;
      }

      return response;
    } finally {
      client.close();
    }
  }

  /// Maps HTTP status codes to Firebase error codes
  static String _getErrorCodeFromStatusCode(int statusCode) {
    switch (statusCode) {
      case 400:
        return 'invalid-argument';
      case 401:
        return 'unauthenticated';
      case 403:
        return 'permission-denied';
      case 404:
        return 'not-found';
      case 412:
        return 'failed-precondition';
      case 500:
        return 'internal';
      default:
        return 'unknown';
    }
  }
}

/// Test data constants
class TestData {
  static const String restaurantId = 'rest001';
  static const String testRestaurantId = 'rest_test_001';
  static const String tableId = 'table001';
  static const String testTableId = 'table_test_001';
  static const String testTableIdDisabled = 'table_test_002';
  static const String testTableIdActive = 'table_test_003';

  static const Map<String, dynamic> testLocation = {
    'latitude': 40.7128,
    'longitude': -74.006,
    'accuracy': 10.0,
  };

  static const String testPhoneNumber = 'test_customer_001';
  static const String testUsername = 'Test Customer One';
  static const String testOTP = '123456';
  static const String testOTPActive = '654321';

  static const String menuItemId = 'item001';
  static const String variantId = 'variant_burger_size';
  static const String variantOptionRegular = 'burger_size_regular';
  static const String addonId = 'addon_burger_fries';
}

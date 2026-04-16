import 'dart:convert';
import 'dart:io';

void main() async {
  print('=== DEBUGGING API RESPONSES ===\n');

  // Test table validation error response
  print('1. Table Validation Error Response:');
  try {
    final response = await _makeRequest('table-validateTableAndLocation', {
      'restaurantId': 'invalid_restaurant',
      'tableId': 'table001',
      'userLocation': {'lat': 40.7128, 'lng': -74.0060},
    });
    print('Raw response: ${jsonEncode(response)}');
    print('Status: ${response['status']}');
    print('Message: ${response['message']}');
    print('Data: ${response['data']}');
  } catch (e) {
    print('Error: $e');
  }

  print('\n${'=' * 50}\n');

  // Test menu response
  print('2. Menu Response:');
  try {
    final response = await _makeRequest('menu-fetchMenu-fetchMenu', {
      'restaurantId': 'rest001',
      'inStock': true,
    });
    print('Raw response: ${jsonEncode(response)}');
    print('Has result field: ${response.containsKey('result')}');
    print('Result type: ${response['result'].runtimeType}');
    if (response['result'] != null) {
      print('Result keys: ${(response['result'] as Map).keys.toList()}');
    }
  } catch (e) {
    print('Error: $e');
  }
}

Future<Map<String, dynamic>> _makeRequest(
    String functionName, Map<String, dynamic> data,) async {
  final client = HttpClient();
  try {
    final request = await client.postUrl(Uri.parse(
        'http://127.0.0.1:5002/rms-app-dd875/us-central1/$functionName',),);
    request.headers.set('Content-Type', 'application/json');
    request.write(jsonEncode(data));

    final response = await request.close();
    final responseBody = await response.transform(utf8.decoder).join();

    if (response.statusCode == 200) {
      final jsonResponse = jsonDecode(responseBody);
      return jsonResponse['result'] as Map<String, dynamic>;
    } else {
      throw Exception('HTTP ${response.statusCode}: $responseBody');
    }
  } finally {
    client.close();
  }
}


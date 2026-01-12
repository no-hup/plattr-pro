// A minimal standalone Dart script to test the API
// Run with: dart api_test.dart

import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:dio/dio.dart';

void main() async {
  print('Starting Direct API Test...');
  
  // Create a simple Dio instance without Flutter dependencies
  final dio = Dio(BaseOptions(
    baseUrl: 'http://127.0.0.1:5001/rms-app-dd875/us-central1', // Default base URL from ApiConfig
    connectTimeout: const Duration(seconds: 10),
    receiveTimeout: const Duration(seconds: 10),
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
  ),);
  
  // Test both endpoints
  await testOrderEndpoint(dio);
  await testCheckoutEndpoint(dio);
  
  print('All tests completed.');
  exit(0);
}

Future<void> testOrderEndpoint(Dio dio) async {
  try {
    print('\n===== TESTING ORDER API =====');
    
    // Endpoint from ApiConfig.orderGetCartEndpoint
    const endpoint = '/order-getCart'; 
    
    // Request data using the test values
    final requestData = {
      'data': {
        'restaurantId': 'rest001',
        'tableId': 'table001',
        'sessionId': 'session001',
      },
    };
    
    print('Request data: ${jsonEncode(requestData)}');
    
    // Make the API call
    final response = await dio.post(
      endpoint,
      data: requestData,
    );
    
    // Process and print the response
    processResponse(response, 'ORDER');
    
  } catch (e) {
    handleError(e);
  }
}

Future<void> testCheckoutEndpoint(Dio dio) async {
  try {
    print('\n===== TESTING CHECKOUT API =====');
    
    // Endpoint from ApiConfig.checkoutCartEndpoint 
    const endpoint = '/cart-checkoutCart';
    
    // Request data using the test values
    final requestData = {
      'data': {
        'restaurantId': 'rest001',
        'tableId': 'table001',
        'sessionId': 'session001',
        'notes': 'Direct API test',
      },
    };
    
    print('Request data: ${jsonEncode(requestData)}');
    
    // Make the API call
    final response = await dio.post(
      endpoint,
      data: requestData,
    );
    
    // Process and print the response
    processResponse(response, 'CHECKOUT');
    
  } catch (e) {
    handleError(e);
  }
}

void processResponse(Response response, String apiName) {
  print('$apiName Response status: ${response.statusCode}');
  
  // Print the response data
  if (response.data != null) {
    print('$apiName Response data:');
    String prettyJson;
    try {
      prettyJson = const JsonEncoder.withIndent('  ').convert(response.data);
    } catch (e) {
      prettyJson = response.data.toString();
    }
    print(prettyJson);
    
    // Try to access common response patterns
    try {
      if (response.data is Map) {
        final data = response.data as Map;
        
        // Check for "result" pattern
        if (data.containsKey('result')) {
          print('\n$apiName Extracted "result" data:');
          print(const JsonEncoder.withIndent('  ').convert(data['result']));
          
          // Check for "data" within result pattern
          if (data['result'] is Map && 
              (data['result'] as Map).containsKey('data')) {
            print('\n$apiName Extracted "result.data" data:');
            print(const JsonEncoder.withIndent('  ').convert(data['result']['data']));
          }
        }
        
        // Check for "error" pattern
        if (data.containsKey('error')) {
          print('\n$apiName Extracted "error" data:');
          print(const JsonEncoder.withIndent('  ').convert(data['error']));
        }
      }
    } catch (e) {
      print('Error while extracting specific fields: $e');
    }
  } else {
    print('$apiName Response data is null');
  }
}

void handleError(dynamic e) {
  print('Error: $e');
  if (e is DioException) {
    print('DioException type: ${e.type}');
    print('DioException message: ${e.message}');
    if (e.response != null) {
      print('Error Response status: ${e.response?.statusCode}');
      print('Error Response data: ${e.response?.data}');
    }
  }
} 
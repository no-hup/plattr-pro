// A minimal standalone test for CheckoutRepository
// Run with: flutter run -d chrome checkout_test.dart

import 'package:flutter/material.dart';
import 'package:flutterboilerplate/pages/checkout_order_flow/checkout_repository.dart';
import 'package:flutterboilerplate/singletonGods/logger.dart';

void main() {
  runApp(const CheckoutTestApp());
}

class CheckoutTestApp extends StatelessWidget {
  const CheckoutTestApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      home: Scaffold(
        appBar: AppBar(
          title: const Text('Checkout API Test'),
        ),
        body: const CheckoutTest(),
      ),
    );
  }
}

class CheckoutTest extends StatefulWidget {
  const CheckoutTest({super.key});

  @override
  State<CheckoutTest> createState() => _CheckoutTestState();
}

class _CheckoutTestState extends State<CheckoutTest> {
  final _repo = CheckoutRepository();
  String _result = 'Results will appear here';
  bool _isLoading = false;

  Future<void> _testCheckout() async {
    setState(() {
      _isLoading = true;
      _result = 'Testing checkout API...';
    });

    try {
      // Call the checkout repository with test values
      final result = await _repo.checkoutCart(
        restaurantId: 'rest001',
        tableId: 'table001',
        sessionId: 'session001',
        notes: 'Test checkout',
      );

      // Handle the result using the when pattern
      result.when(
        success: (data, message) {
          AppLogger.log('✅ Checkout test success: $message');
          setState(() {
            _result = 'SUCCESS!\n'
                'Message: $message\n'
                'Order ID: ${data.data.orderId}\n'
                'Order Number: ${data.data.orderNumber}\n'
                'Order Status: ${data.data.orderStatus}\n'
                'Timestamp: ${data.data.timestamp}';
          });
        },
        error: (message, errorCode, errorDetails) {
          AppLogger.log('❌ Checkout test error: $message ($errorCode)');
          setState(() {
            _result = 'ERROR!\n'
                'Message: $message\n'
                'Error Code: $errorCode\n'
                'Details: $errorDetails';
          });
        },
      );
    } catch (e) {
      AppLogger.log('⚠️ Checkout test exception: $e');
      setState(() {
        _result = 'EXCEPTION: $e';
      });
    } finally {
      setState(() {
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            ElevatedButton(
              onPressed: _isLoading ? null : _testCheckout,
              child: Text(_isLoading ? 'Testing...' : 'Test Checkout API'),
            ),
            const SizedBox(height: 20),
            Expanded(
              child: Container(
                width: double.infinity,
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  border: Border.all(color: Colors.grey),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: SingleChildScrollView(
                  child: Text(_result),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
} 
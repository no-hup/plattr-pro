import 'package:flutter/material.dart';
import 'package:flutterboilerplate/pages/app_routes.dart';
import 'package:go_router/go_router.dart';

class HomePage extends StatelessWidget {
  const HomePage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Welcome'),
      ),
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Text(
              'Test Navigation',
            ),
            const SizedBox(height: 20),
            
            ElevatedButton(
              onPressed: () {
                print('🔑 CLICK: Going to Table Verification');
                context.go(AppRoutes.tableVerification('rest001', 'table001'));
              },
              child: const Text('Test Table Verification'),
            ),
            
            const SizedBox(height: 12),
            
            ElevatedButton(
              onPressed: () {
                print('🍽️ CLICK: Going to Menu Page');
                context.go(AppRoutes.menu('rest001', 'table001'));
              },
              child: const Text('Test Menu Page'),
            ),

            const SizedBox(height: 20),
            const Text('QR Code Simulations'),
            const SizedBox(height: 12),
            
            ElevatedButton(
              onPressed: () {
                print('🏪 CLICK: Restaurant 1, Table 1');
                context.go(AppRoutes.tableVerification('restaurant-1', 'table-1'));
              },
              child: const Text('Table 1 QR Code'),
            ),
            
            const SizedBox(height: 8),
            
            ElevatedButton(
              onPressed: () {
                print('🏪 CLICK: Restaurant 1, Table 2');
                context.go(AppRoutes.tableVerification('restaurant-1', 'table-2'));
              },
              child: const Text('Table 2 QR Code'),
            ),
            
            const SizedBox(height: 20),
            const Text('Direct Page Access'),
            const SizedBox(height: 12),
            
            ElevatedButton(
              onPressed: () {
                print('🛒 CLICK: Going to Cart');
                context.go(AppRoutes.cart('test-restaurant', 'test-table'));
              },
              child: const Text('Test Cart Page'),
            ),
            
            const SizedBox(height: 8),
            
            ElevatedButton(
              onPressed: () {
                print('📜 CLICK: Going to Orders');
                context.go(AppRoutes.orders('test-restaurant', 'test-table'));
              },
              child: const Text('Test Orders Page'),
            ),
          ],
        ),
      ),
    );
  }
}

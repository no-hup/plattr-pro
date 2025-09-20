import 'package:flutter/material.dart';
import 'package:flutterboilerplate/pages/app_routes.dart';
import 'package:go_router/go_router.dart';

class HomePage extends StatelessWidget {
  const HomePage({super.key});

  static const restaurants = [
    {
      'id': 'rest_basic_001',
      'name': 'Baseline Bistro',
      'tables': ['table1', 'table2'],
    },
    {
      'id': 'rest_otp_002',
      'name': 'OTP First Cafe',
      'tables': ['table1', 'table2'],
    },
    {
      'id': 'rest_stock_003',
      'name': 'Discount Depot',
      'tables': ['table1', 'table2'],
    },
    {
      'id': 'rest_variants_004',
      'name': 'Variant Villa',
      'tables': ['table1', 'table2'],
    },
    {
      'id': 'rest_sessions_005',
      'name': 'Session Sandbox',
      'tables': ['table1', 'table2'],
    },
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Welcome'),
      ),
      body: ListView.separated(
        padding: const EdgeInsets.all(16),
        itemCount: restaurants.length,
        separatorBuilder: (_, __) => const SizedBox(height: 16),
        itemBuilder: (context, index) {
          final r = restaurants[index];
          final restId = r['id']! as String;
          final restName = r['name']! as String;
          final tables = (r['tables']! as List).cast<String>();
          return Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(restName, style: Theme.of(context).textTheme.titleLarge),
                  const SizedBox(height: 12),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: [
                      for (final t in tables)
                        ElevatedButton(
                          onPressed: () {
                            context.go(AppRoutes.tableVerification(restId, t));
                          },
                          child: Text('QR: $t'),
                        ),
                      ElevatedButton(
                        onPressed: () {
                          // Default to first table for direct links if available
                          final tableId =
                              tables.isNotEmpty ? tables.first : 'table1';
                          context.go(AppRoutes.menu(restId, tableId));
                        },
                        child: const Text('Test Menu Page'),
                      ),
                      ElevatedButton(
                        onPressed: () {
                          final tableId =
                              tables.isNotEmpty ? tables.first : 'table1';
                          context.go(AppRoutes.cart(restId, tableId));
                        },
                        child: const Text('Test Cart Page'),
                      ),
                      ElevatedButton(
                        onPressed: () {
                          final tableId =
                              tables.isNotEmpty ? tables.first : 'table1';
                          context.go(AppRoutes.orders(restId, tableId));
                        },
                        child: const Text('Test Orders Page'),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }
}

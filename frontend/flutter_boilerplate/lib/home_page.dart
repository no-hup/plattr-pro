import 'package:flutter/material.dart';
import 'package:flutterboilerplate/home/home_state.dart';
import 'package:flutterboilerplate/home/models/restaurant_summary.dart';
import 'package:flutterboilerplate/pages/app_routes.dart';
import 'package:flutterboilerplate/widgets/page_state_view.dart';
import 'package:flutterboilerplate/widgets/primary_action_button.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

class HomePage extends StatefulWidget {
  const HomePage({super.key});

  @override
  State<HomePage> createState() => _HomePageState();
}

class _HomePageState extends State<HomePage> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<HomeState>().loadRestaurants();
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Welcome'),
      ),
      body: Consumer<HomeState>(
        builder: (context, state, _) {
          if (state.isLoading) {
            return PageStateView.loading();
          }

          if (state.error != null) {
            return PageStateView.error(
              message: state.error,
              primaryAction: PrimaryActionButton(
                label: 'Try Again',
                onPressed: () => state.retry(),
              ),
            );
          }

          if (state.isEmpty) {
            return PageStateView.empty(
              title: 'No restaurants found',
              message: 'Import mock data or add restaurants in the emulator.',
              primaryAction: PrimaryActionButton(
                label: 'Refresh',
                onPressed: () => state.retry(),
              ),
            );
          }

          return RefreshIndicator(
            onRefresh: state.retry,
            child: ListView.separated(
              padding: const EdgeInsets.all(16),
              itemCount: state.restaurants.length,
              separatorBuilder: (_, __) => const SizedBox(height: 16),
              itemBuilder: (context, index) {
                final restaurant = state.restaurants[index];
                return _RestaurantCard(restaurant: restaurant);
              },
            ),
          );
        },
      ),
    );
  }
}

class _RestaurantCard extends StatelessWidget {
  const _RestaurantCard({
    required this.restaurant,
  });

  final RestaurantSummary restaurant;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              restaurant.name,
              style: theme.textTheme.titleLarge,
            ),
            if (restaurant.address.isNotEmpty) ...[
              const SizedBox(height: 4),
              Text(
                restaurant.address,
                style: theme.textTheme.bodyMedium,
              ),
            ],
            if (restaurant.phone.isNotEmpty) ...[
              const SizedBox(height: 2),
              Text(
                restaurant.phone,
                style: theme.textTheme.bodySmall,
              ),
            ],
            const SizedBox(height: 12),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                for (final table in restaurant.tables)
                  ElevatedButton(
                    onPressed: () {
                      _goToTableVerification(context, restaurant.id, table.id);
                    },
                    child: Text('QR: ${table.label}'),
                  ),
                ElevatedButton(
                  onPressed: () {
                    final tableId = restaurant.hasTables
                        ? restaurant.tables.first.id
                        : 'table1';
                    context.go(AppRoutes.menu(restaurant.id, tableId));
                  },
                  child: const Text('Test Menu Page'),
                ),
                ElevatedButton(
                  onPressed: () {
                    final tableId = restaurant.hasTables
                        ? restaurant.tables.first.id
                        : 'table1';
                    context.go(AppRoutes.cart(restaurant.id, tableId));
                  },
                  child: const Text('Test Cart Page'),
                ),
                ElevatedButton(
                  onPressed: () {
                    final tableId = restaurant.hasTables
                        ? restaurant.tables.first.id
                        : 'table1';
                    context.go(AppRoutes.orders(restaurant.id, tableId));
                  },
                  child: const Text('Test Orders Page'),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  void _goToTableVerification(
    BuildContext context,
    String restaurantId,
    String tableId,
  ) {
    context.go(AppRoutes.tableVerification(restaurantId, tableId));
  }
}

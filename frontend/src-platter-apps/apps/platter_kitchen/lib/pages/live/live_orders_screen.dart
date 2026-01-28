import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../models/active_order_models.dart';
import '../../state/kitchen_live_provider.dart';
import '../../widgets/active_cart_card.dart';
import '../../widgets/item_view_list.dart';
import '../../widgets/empty_state_widget.dart';

class LiveOrdersScreen extends StatefulWidget {
  final String restaurantId;
  final String sessionId;
  final String? selectedCategory;

  const LiveOrdersScreen({
    super.key,
    required this.restaurantId,
    required this.sessionId,
    this.selectedCategory,
  });

  @override
  State<LiveOrdersScreen> createState() => _LiveOrdersScreenState();
}

class _LiveOrdersScreenState extends State<LiveOrdersScreen> {
  // Polling logic moved to KitchenLiveProvider and MainNavigation
  
  @override
  void didUpdateWidget(LiveOrdersScreen oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.selectedCategory != widget.selectedCategory) {
      // Filtering logic...
    }
  }

  void _showOrderDetails(ActiveKitchenCart cart) {
    // TODO: Update OrderDetailsDialog to assume ActiveKitchenCart or adapt
    // For now, temporarily disabled or mock until Dialog is updated
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('Detail view for Cart #${cart.orderNumber} coming soon')),
    );
  }

  @override
  Widget build(BuildContext context) {
    // Consume the provider injected by MainNavigation
    return Consumer<KitchenLiveProvider>(
      builder: (context, provider, child) {
        if (provider.isLoading && provider.activeCarts.isEmpty) {
          return const Center(child: CircularProgressIndicator());
        }

        if (provider.error != null) {
          return Center(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(provider.error!, style: const TextStyle(color: Colors.red)),
                const SizedBox(height: 16),
                FilledButton(
                  onPressed: () => provider.fetchActiveCarts(),
                  child: const Text('Retry'),
                ),
              ],
            ),
          );
        }

        final displayCarts = provider.activeCarts;

        if (displayCarts.isEmpty) {
          return const EmptyStateWidget(
            title: 'No Active Tickets',
            subtitle: 'Great job! The kitchen is clear.',
            icon: Icons.check_circle_outline,
          );
        }

        return RefreshIndicator(
          onRefresh: () => provider.refresh(),
          child: provider.viewType == KitchenViewType.cart
              ? LayoutBuilder(
                  builder: (context, constraints) {
                    final crossAxisCount = constraints.maxWidth > 900 ? 4 : (constraints.maxWidth > 600 ? 3 : 2);
                    
                    return GridView.builder(
                      padding: const EdgeInsets.all(16),
                      gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                        crossAxisCount: crossAxisCount,
                        childAspectRatio: 0.8,
                        crossAxisSpacing: 16,
                        mainAxisSpacing: 16,
                      ),
                      itemCount: displayCarts.length,
                      itemBuilder: (context, index) {
                        return ActiveCartCard(
                          cart: displayCarts[index],
                          onTap: () => _showOrderDetails(displayCarts[index]),
                        );
                      },
                    );
                  },
                )
              : ItemViewList(
                  carts: displayCarts,
                  onCartTap: _showOrderDetails,
                ),
        );
      },
    );
  }
}

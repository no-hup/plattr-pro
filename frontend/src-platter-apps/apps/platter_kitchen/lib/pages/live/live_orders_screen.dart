import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/kitchen_repository.dart';
import '../../models/active_order_models.dart';
import '../../session/session_manager.dart';
import '../../state/kitchen_live_provider.dart';
import '../../widgets/active_cart_card.dart';
import '../../widgets/cart_detail_dialog.dart';
import '../../widgets/empty_state_widget.dart';
import '../../widgets/item_view_list.dart';

class LiveOrdersScreen extends StatefulWidget {
  final String restaurantId;
  final String sessionId;
  final KitchenRepository repository;
  final String? selectedCategory;

  const LiveOrdersScreen({
    super.key,
    required this.restaurantId,
    required this.sessionId,
    required this.repository,
    this.selectedCategory,
  });

  @override
  State<LiveOrdersScreen> createState() => _LiveOrdersScreenState();
}

class _LiveOrdersScreenState extends State<LiveOrdersScreen> {
  @override
  void didUpdateWidget(LiveOrdersScreen oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.selectedCategory != widget.selectedCategory) {
      // Category filter hook — currently applied client-side in the grid.
    }
  }

  void _showCartDetail(
    BuildContext context,
    KitchenLiveProvider provider,
    ActiveKitchenCart cart,
  ) {
    showDialog<void>(
      context: context,
      barrierDismissible: true,
      builder: (dialogContext) => CartDetailDialog(
        cart: cart,
        repository: widget.repository,
        restaurantId: widget.restaurantId,
        sessionId: widget.sessionId,
        onCartMutated: () {
          // Kick an immediate refresh rather than waiting for the next poll.
          provider.refreshAfterMutation();
        },
        onSessionExpired: provider.markSessionExpiredFromMutation,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Consumer<KitchenLiveProvider>(
      builder: (context, provider, child) {
        // Session expired takes precedence over all other states.
        if (provider.state == KitchenLiveState.sessionExpired) {
          return _SessionExpiredView(
            message: provider.error ?? 'Session expired',
            onReconnect: () async {
              await SessionManager.logout(context);
            },
          );
        }

        if (provider.isLoading && provider.activeCarts.isEmpty) {
          return const Center(child: CircularProgressIndicator());
        }

        if (provider.state == KitchenLiveState.transientError &&
            provider.activeCarts.isEmpty) {
          return Center(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  provider.error ?? 'Failed to load active tickets.',
                  style: const TextStyle(color: Colors.red),
                ),
                const SizedBox(height: 16),
                Semantics(
                  identifier: 'kitchen-refresh',
                  child: FilledButton(
                    onPressed: () => provider.refresh(),
                    child: const Text('Retry'),
                  ),
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
                    final crossAxisCount = constraints.maxWidth > 900
                        ? 4
                        : (constraints.maxWidth > 600 ? 3 : 2);

                    return GridView.builder(
                      padding: const EdgeInsets.all(16),
                      gridDelegate:
                          SliverGridDelegateWithFixedCrossAxisCount(
                        crossAxisCount: crossAxisCount,
                        childAspectRatio: 0.8,
                        crossAxisSpacing: 16,
                        mainAxisSpacing: 16,
                      ),
                      itemCount: displayCarts.length,
                      itemBuilder: (context, index) {
                        return Semantics(
                          identifier:
                              'kitchen-cart-${displayCarts[index].cartId}',
                          child: ActiveCartCard(
                            cart: displayCarts[index],
                            onTap: () => _showCartDetail(
                              context,
                              provider,
                              displayCarts[index],
                            ),
                          ),
                        );
                      },
                    );
                  },
                )
              : ItemViewList(
                  carts: displayCarts,
                  onCartTap: (cart) =>
                      _showCartDetail(context, provider, cart),
                ),
        );
      },
    );
  }
}

class _SessionExpiredView extends StatelessWidget {
  const _SessionExpiredView({
    required this.message,
    required this.onReconnect,
  });

  final String message;
  final Future<void> Function() onReconnect;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              Icons.lock_clock,
              size: 48,
              color: colorScheme.error,
            ),
            const SizedBox(height: 16),
            Text(
              'Session expired. Reconnect to continue.',
              textAlign: TextAlign.center,
              style: Theme.of(context).textTheme.titleMedium,
            ),
            const SizedBox(height: 8),
            Text(
              message,
              textAlign: TextAlign.center,
              style: Theme.of(context)
                  .textTheme
                  .bodySmall
                  ?.copyWith(color: colorScheme.onSurfaceVariant),
            ),
            const SizedBox(height: 24),
            FilledButton.icon(
              onPressed: onReconnect,
              icon: const Icon(Icons.refresh),
              label: const Text('Reconnect'),
            ),
          ],
        ),
      ),
    );
  }
}

import 'package:flutter/material.dart';
import '../models/active_order_models.dart';
import '../theme/design_system/kitchen_dimensions.dart';
import '../theme/design_system/kitchen_typography.dart';
import 'time_badge.dart';

class ItemViewList extends StatelessWidget {
  final List<ActiveKitchenCart> carts;
  final Function(ActiveKitchenCart)? onCartTap;
  final Function(ActiveCartItem)? onItemTap;

  const ItemViewList({
    super.key,
    required this.carts,
    this.onCartTap,
    this.onItemTap,
  });

  @override
  Widget build(BuildContext context) {
    if (carts.isEmpty) {
      return const SizedBox.shrink();
    }

    return ListView.builder(
      padding: const EdgeInsets.all(KitchenDimensions.space16),
      itemCount: carts.length,
      itemBuilder: (context, index) {
        final cart = carts[index];
        return _CartItemUserGroup(
          cart: cart,
          onTap: () => onCartTap?.call(cart),
        );
      },
    );
  }
}

class _CartItemUserGroup extends StatelessWidget {
  final ActiveKitchenCart cart;
  final VoidCallback? onTap;

  const _CartItemUserGroup({
    required this.cart,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    final isUrgent = cart.isUrgent;

    return Container(
      margin: const EdgeInsets.only(bottom: KitchenDimensions.space16),
      decoration: BoxDecoration(
        color: colorScheme.surface,
        borderRadius: BorderRadius.circular(KitchenDimensions.radiusMedium),
        border: Border.all(
          color: colorScheme.outlineVariant.withValues(alpha: 0.5),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Header
          InkWell(
            onTap: onTap,
            child: Container(
              padding: const EdgeInsets.all(KitchenDimensions.space12),
              decoration: BoxDecoration(
                color: isUrgent 
                    ? colorScheme.errorContainer.withValues(alpha: 0.3) 
                    : colorScheme.surfaceContainerHighest.withValues(alpha: 0.3),
                borderRadius: const BorderRadius.vertical(
                  top: Radius.circular(KitchenDimensions.radiusMedium),
                ),
              ),
              child: Row(
                children: [
                   // Table Tag
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: KitchenDimensions.space8,
                      vertical: KitchenDimensions.space4,
                    ),
                    decoration: BoxDecoration(
                      color: colorScheme.primary.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(KitchenDimensions.radiusSmall),
                    ),
                    child: Text(
                      cart.tableNumber,
                      style: KitchenTypography.cardTitle.copyWith(
                        color: colorScheme.primary,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                  const SizedBox(width: KitchenDimensions.space12),
                  
                  // Order #
                  Text(
                    'Order #${cart.orderNumber}',
                    style: KitchenTypography.bodyBold,
                  ),
                  const Spacer(),
                  
                  // Server
                  if (cart.serverName != null) ...[
                    Icon(Icons.person_outline, size: 14, color: colorScheme.onSurfaceVariant),
                    const SizedBox(width: 4),
                    Text(
                      cart.serverName!,
                      style: KitchenTypography.caption,
                    ),
                    const SizedBox(width: 12),
                  ],

                  // Timer
                  TimeBadge(timestamp: cart.submittedAt),
                ],
              ),
            ),
          ),
          
          // Cart Note
          if (cart.kitchenNote != null && cart.kitchenNote!.isNotEmpty)
            Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(
                horizontal: KitchenDimensions.space12,
                vertical: 6,
              ),
              color: Colors.amber.withValues(alpha: 0.1),
              child: Row(
                children: [
                  const Icon(Icons.info_outline, size: 14, color: Colors.amber),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      'Cart Note: ${cart.kitchenNote}',
                      style: KitchenTypography.caption.copyWith(
                        color: Colors.amber.shade900,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                ],
              ),
            ),

          const Divider(height: 1),

          // Items List
          ...cart.items.map((item) => _SingleItemRow(item: item)),
          
          // Footer Actions (Optional - could go here)
        ],
      ),
    );
  }
}

class _SingleItemRow extends StatelessWidget {
  final ActiveCartItem item;

  const _SingleItemRow({required this.item});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(
        horizontal: KitchenDimensions.space12,
        vertical: KitchenDimensions.space12,
      ),
      decoration: BoxDecoration(
        border: Border(
          bottom: BorderSide(
            color: Theme.of(context).dividerColor.withValues(alpha: 0.5),
            width: 0.5,
          ),
        ),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Quantity
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
            decoration: BoxDecoration(
              color: Theme.of(context).colorScheme.surfaceContainerHighest,
              borderRadius: BorderRadius.circular(4),
            ),
            child: Text(
              '${item.quantity}x',
              style: KitchenTypography.bodyBold,
            ),
          ),
          const SizedBox(width: 12),
          
          // Details
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  item.name,
                  style: KitchenTypography.body.copyWith(
                    fontWeight: FontWeight.w500,
                    decoration: item.isVoided ? TextDecoration.lineThrough : null,
                  ),
                ),
                if (item.modifiers.isNotEmpty)
                  Padding(
                    padding: const EdgeInsets.only(top: 2.0),
                    child: Text(
                      item.modifiers.join(', '),
                      style: KitchenTypography.caption.copyWith(
                        color: Theme.of(context).colorScheme.onSurfaceVariant,
                      ),
                    ),
                  ),
                if (item.itemNote != null && item.itemNote!.isNotEmpty)
                  Padding(
                    padding: const EdgeInsets.only(top: 4.0),
                    child: Text(
                      'Note: ${item.itemNote}',
                      style: KitchenTypography.caption.copyWith(
                        color: Colors.amber.shade800,
                        fontStyle: FontStyle.italic,
                      ),
                    ),
                  ),
              ],
            ),
          ),

          // Checkbox or Status (Simulated action)
          // For now just status if needed, but per design "item view" is for reading.
          // Actions usually happen in dialog.
        ],
      ),
    );
  }
}

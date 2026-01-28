import 'package:flutter/material.dart';
import '../models/order_models.dart';
import '../theme/design_system/kitchen_dimensions.dart';
import '../theme/design_system/kitchen_typography.dart';
import '../constants/kitchen_constants.dart';
import 'status_badge.dart';
import 'time_badge.dart';

class LiveOrderCard extends StatelessWidget {
  final KitchenOrder order;
  final VoidCallback onTap;

  const LiveOrderCard({
    super.key,
    required this.order,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    
    // Determine overall card color based on oldest item or order status
    // For now simple surface color
    
    return Card(
      elevation: 2,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(KitchenDimensions.radiusMedium),
        side: BorderSide(
          color: colorScheme.outlineVariant.withValues(alpha: 0.5),
        ),
      ),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(KitchenDimensions.space12),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              // Header: Table & Timer
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
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
                      order.tableNumber,
                      style: KitchenTypography.cardTitle.copyWith(
                        color: colorScheme.primary,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                  TimeBadge(timestamp: order.updatedAt),
                ],
              ),
              const SizedBox(height: KitchenDimensions.space12),
              
              // Items Summary
              ...order.carts.expand((cart) => cart.items).take(4).map((item) {
                final isOutOfStock = !item.inStock;
                return Opacity(
                  opacity: isOutOfStock ? 0.45 : 1.0,
                  child: Padding(
                    padding: const EdgeInsets.only(bottom: 4.0),
                    child: Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                          decoration: BoxDecoration(
                            color: colorScheme.surfaceContainerHighest,
                            borderRadius: BorderRadius.circular(4),
                          ),
                          child: Text(
                            '${item.quantity}x',
                            style: KitchenTypography.bodyBold.copyWith(fontSize: 12),
                          ),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            item.name,
                            style: KitchenTypography.body,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                        if (item.status == OrderStatus.ready)
                          Icon(Icons.check_circle, size: 14, color: Colors.green),
                      ],
                    ),
                  ),
                );
              }),
              
              if (order.allItems.length > 4)
                Padding(
                  padding: const EdgeInsets.only(top: 4.0),
                  child: Text(
                    '+ ${order.allItems.length - 4} more items',
                    style: KitchenTypography.caption.copyWith(
                      color: colorScheme.onSurfaceVariant,
                    ),
                  ),
                ),

              const Spacer(),
              const Divider(),
              
              // Footer: Order ID & Status
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    '#${order.orderNumber}',
                    style: KitchenTypography.caption,
                  ),
                  StatusBadge(status: order.status, size: StatusBadgeSize.small),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

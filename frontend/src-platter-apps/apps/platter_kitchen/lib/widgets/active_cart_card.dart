import 'package:flutter/material.dart';
import '../models/active_order_models.dart';
import '../theme/design_system/kitchen_dimensions.dart';
import '../theme/design_system/kitchen_typography.dart';
import 'time_badge.dart';

class ActiveCartCard extends StatelessWidget {
  final ActiveKitchenCart cart;
  final VoidCallback onTap;

  const ActiveCartCard({
    super.key,
    required this.cart,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    
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
                      cart.tableNumber,
                      style: KitchenTypography.cardTitle.copyWith(
                        color: colorScheme.primary,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                  TimeBadge(timestamp: cart.submittedAt),
                ],
              ),
              const SizedBox(height: KitchenDimensions.space12),
              
              // Kitchen Note (if any)
              if (cart.kitchenNote != null && cart.kitchenNote!.isNotEmpty)
                Padding(
                  padding: const EdgeInsets.only(bottom: 8.0),
                  child: Container(
                    padding: const EdgeInsets.all(4),
                    decoration: BoxDecoration(
                      color: Colors.amber.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(4),
                      border: Border.all(color: Colors.amber.withValues(alpha: 0.5)),
                    ),
                    child: Row(
                      children: [
                        const Icon(Icons.info_outline, size: 14, color: Colors.amber),
                        const SizedBox(width: 4),
                        Expanded(
                          child: Text(
                            cart.kitchenNote!,
                            style: KitchenTypography.caption.copyWith(
                              color: Colors.amber.shade900,
                              fontWeight: FontWeight.bold,
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),

              // Items Summary
              ...cart.items.take(4).map((item) {
                return Opacity(
                  opacity: item.isVoided ? 0.45 : 1.0,
                  child: Padding(
                    padding: const EdgeInsets.only(bottom: 4.0),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
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
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                item.name,
                                style: KitchenTypography.body.copyWith(
                                  decoration: item.isVoided ? TextDecoration.lineThrough : null,
                                ),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                              if (item.modifiers.isNotEmpty)
                                Text(
                                  item.modifiers.join(', '),
                                  style: KitchenTypography.caption.copyWith(
                                    color: colorScheme.onSurfaceVariant,
                                    fontSize: 11,
                                  ),
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                ),
                              if (item.itemNote != null && item.itemNote!.isNotEmpty)
                                Text(
                                  'Note: ${item.itemNote}',
                                  style: KitchenTypography.caption.copyWith(
                                    color: Colors.amber.shade800,
                                    fontSize: 11,
                                    fontStyle: FontStyle.italic,
                                  ),
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                );
              }),
              
              if (cart.items.length > 4)
                Padding(
                  padding: const EdgeInsets.only(top: 4.0),
                  child: Text(
                    '+ ${cart.items.length - 4} more items',
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
                    '#${cart.orderNumber}',
                    style: KitchenTypography.caption,
                  ),
                  // Using existing StatusBadge, assuming it can handle strings or map enum
                   _ActiveCartStatusBadge(status: cart.status),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _ActiveCartStatusBadge extends StatelessWidget {
  final ActiveCartStatus status;

  const _ActiveCartStatusBadge({required this.status});

  @override
  Widget build(BuildContext context) {
    Color color;
    String label;

    switch (status) {
      case ActiveCartStatus.pending:
        color = Colors.orange;
        label = 'Pending';
        break;
      case ActiveCartStatus.cooking:
        color = Colors.blue;
        label = 'Cooking';
        break;
      case ActiveCartStatus.ready:
        color = Colors.green;
        label = 'Ready';
        break;
      case ActiveCartStatus.served:
        color = Colors.grey;
        label = 'Served';
        break;
      case ActiveCartStatus.cancelled:
        color = Colors.red;
        label = 'Cancelled';
        break;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(4),
        border: Border.all(color: color.withValues(alpha: 0.5)),
      ),
      child: Text(
        label.toUpperCase(),
        style: TextStyle(
          color: color,
          fontSize: 10,
          fontWeight: FontWeight.bold,
        ),
      ),
    );
  }
}

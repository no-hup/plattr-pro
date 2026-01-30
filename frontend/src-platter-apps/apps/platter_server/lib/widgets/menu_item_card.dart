import 'package:flutter/material.dart';
import 'package:platter_core/platter_core.dart';

class MenuItemCard extends StatelessWidget {
  final MenuItem item;
  final ValueChanged<bool> onAvailabilityChanged;

  const MenuItemCard({
    super.key,
    required this.item,
    required this.onAvailabilityChanged,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surface,
        border: Border(
          bottom: BorderSide(
              color: Theme.of(context).dividerColor.withValues(alpha: 0.5),
              width: 1),
        ),
      ),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          // Image
          SizedBox(
            width: 56,
            height: 56,
            child: ClipRRect(
              borderRadius: BorderRadius.circular(8),
              child: item.meta.image.isNotEmpty
                  ? Image.network(
                      item.meta.image,
                      fit: BoxFit.cover,
                      errorBuilder: (context, error, stackTrace) {
                        return Container(
                          color: Colors.grey.shade200,
                          child: const Icon(Icons.fastfood, color: Colors.grey),
                        );
                      },
                    )
                  : Container(
                      color: Colors.grey.shade200,
                      child: const Icon(Icons.fastfood, color: Colors.grey),
                    ),
            ),
          ),
          const SizedBox(width: 16),

          // Details
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  item.meta.name,
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w500,
                    decoration:
                        !item.isAvailable ? TextDecoration.lineThrough : null,
                    color: !item.isAvailable
                        ? Colors.grey
                        : Theme.of(context).colorScheme.onSurface,
                  ),
                ),
                if (!item.isAvailable)
                  Text(
                    'Unavailable',
                    style: TextStyle(
                      fontSize: 12,
                      color: Theme.of(context).colorScheme.error,
                    ),
                  ),
              ],
            ),
          ),

          // Price and Switch
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(
                '₹${item.priceInfo.finalPrice.toStringAsFixed(2)}',
                style: const TextStyle(
                  fontWeight: FontWeight.bold,
                  fontSize: 14,
                ),
              ),
              const SizedBox(height: 4),
              SizedBox(
                height: 32,
                child: Switch(
                  value: item.isAvailable,
                  onChanged: (value) async {
                    // We handle the dialog in the parent or pass a callback that does async work
                    // For pure UI widget, we just bubble the event.
                    // However, the check for confirmation usually happens before state change.
                    // To keep this stateless, we assume the parent handles confirmation logic
                    // and calls this only when it wants to update, OR this callback triggers the logic.
                    onAvailabilityChanged(value);
                  },
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

import 'package:flutter/material.dart';
import '../shared/status_utils.dart';
import 'status_chip.dart';

class CartDetailCard extends StatelessWidget {
  final Map<String, dynamic> cart;
  final int index;
  final bool isServeActionEnabled;
  final Function(int) onMarkServed;
  final Function(Map<String, dynamic>) onItemServed;

  /// D4: the waiter cancels one dish of a sent round (off the bill and the kitchen). Null hides the button.
  final Function(Map<String, dynamic>)? onItemCancel;

  const CartDetailCard({
    super.key,
    required this.cart,
    required this.index,
    required this.onMarkServed,
    required this.onItemServed,
    this.onItemCancel,
    this.isServeActionEnabled = true,
  });

  @override
  Widget build(BuildContext context) {
    final status =
        StatusUtils.normalizeCartStatus((cart['status'] ?? '').toString());
    final displayStatus = StatusUtils.mapCartStatusToDisplay(status);
    final items = (cart['items'] as List<dynamic>? ?? []);
    final isServed = status == 'SERVED';

    // Logic for enabling actions
    // Enforce strict transitions: can only mark served if transition to SERVED is allowed
    final canMarkServed = StatusUtils.canTransition(status, 'SERVED');

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: Theme.of(context)
              .colorScheme
              .outlineVariant
              .withValues(alpha: 0.5),
          width: 1,
        ),
      ),
      child: ExpansionTile(
        shape: const RoundedRectangleBorder(side: BorderSide.none),
        collapsedShape: const RoundedRectangleBorder(side: BorderSide.none),
        key: PageStorageKey('cart-$index'),
        initiallyExpanded: !isServed,
        title: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Expanded(
                child: Text('Cart ${index + 1}',
                    style: const TextStyle(fontWeight: FontWeight.bold),
                    overflow: TextOverflow.ellipsis)),
            const SizedBox(width: 8),
            StatusChip(status: displayStatus),
          ],
        ),
        subtitle: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (cart['checkoutTime'] != null)
              Text('Checkout: ${cart['checkoutTime']}'),
            if ((cart['notes'] ?? '').toString().isNotEmpty)
              Text('Notes: ${cart['notes']}'),
          ],
        ),
        children: [
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            child: Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                OutlinedButton.icon(
                  icon: const Icon(Icons.room_service),
                  label: const Text('Mark Served'),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: Colors.blueGrey,
                    side: BorderSide(
                        color: Colors.blueGrey.withValues(alpha: 0.4)),
                  ),
                  onPressed: isServeActionEnabled && canMarkServed
                      ? () => onMarkServed(index)
                      : null,
                ),
              ],
            ),
          ),
          const Divider(),
          ...items.asMap().entries.map((entry) {
            final item = Map<String, dynamic>.from(entry.value as Map);
            return _CartItemRow(
              item: item,
              cartStatus: status,
              onMarkServed: () => onItemServed(item),
              onCancel: onItemCancel == null ? null : () => onItemCancel!(item),
            );
          }),
        ],
      ),
    );
  }
}

class _CartItemRow extends StatelessWidget {
  final Map<String, dynamic> item;
  final String cartStatus;
  final VoidCallback onMarkServed;
  final VoidCallback? onCancel;

  const _CartItemRow({
    required this.item,
    required this.cartStatus,
    required this.onMarkServed,
    this.onCancel,
  });

  @override
  Widget build(BuildContext context) {
    final itemStatusRaw = (item['status'] ?? '').toString();
    final itemStatus = StatusUtils.normalizeCartStatus(itemStatusRaw);
    final isServed = itemStatus == 'SERVED';

    // Use cart status for serve eligibility — item statuses stay PENDING
    // until explicitly served, but the cart reaching READY means items
    // are ready to be individually served.
    final canServe = !isServed && StatusUtils.canTransition(cartStatus, 'SERVED');
    // D4: any dish not yet served, cancelled or returned can be cancelled on its own. Whether a dish already
    // cooking is wasted or stays on the bill is the waiter's call; a printed bill is refused by the backend.
    final canCancel = onCancel != null && StatusUtils.canTransition(itemStatus, 'CANCELLED');

    final itemName = item['name'] ??
        item['menuItem']?['meta']?['name'] ??
        item['menuItemName'] ??
        'Item';
    final quantity = item['quantity'] ?? 0;

    final variants = (item['selectedVariantsDetails'] as List<dynamic>? ?? []);
    final addons = (item['selectedAddonsDetails'] as List<dynamic>? ?? []);

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Quantity
          SizedBox(
            width: 32,
            child: Text(
              '${quantity}x',
              style: TextStyle(
                color: Theme.of(context).colorScheme.primary,
                fontWeight: FontWeight.w700,
                fontSize: 14,
              ),
            ),
          ),

          // Item Details
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  itemName,
                  style: const TextStyle(
                      fontWeight: FontWeight.w600, fontSize: 14),
                ),
                const SizedBox(height: 4),

                // Status Row
                Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text('Status: ',
                        style: TextStyle(
                            fontSize: 11,
                            color: Theme.of(context)
                                .colorScheme
                                .onSurfaceVariant)),
                    Flexible(
                      child: Transform.scale(
                        scale: 0.8,
                        alignment: Alignment.centerLeft,
                        child: StatusChip(
                          status:
                              StatusUtils.mapCartStatusToDisplay(itemStatus),
                          padding: const EdgeInsets.symmetric(
                              horizontal: 6, vertical: 2),
                          fontSize: 10,
                        ),
                      ),
                    ),
                  ],
                ),

                if (variants.isNotEmpty) ...[
                  const SizedBox(height: 4),
                  const Text('Variants:',
                      style:
                          TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                  ...variants.map((v) => Text(
                        '• ${v['selected_variant_name'] ?? v['id'] ?? ''}',
                        style: TextStyle(
                            fontSize: 11,
                            color: Theme.of(context).colorScheme.secondary),
                      ))
                ],
                if (addons.isNotEmpty) ...[
                  const SizedBox(height: 4),
                  const Text('Addons:',
                      style:
                          TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                  ...addons.map((a) => Text(
                        '+ ${a['name'] ?? ''}',
                        style: TextStyle(
                            fontSize: 11,
                            color: Theme.of(context).colorScheme.tertiary),
                      ))
                ],
              ],
            ),
          ),

          if (canCancel)
            Semantics(
              identifier: 'order-item-cancel-${item['cartItemId']}',
              child: IconButton(
                icon: const Icon(Icons.remove_circle_outline, color: Colors.red),
                tooltip: 'Cancel this dish',
                visualDensity: VisualDensity.compact,
                onPressed: onCancel,
              ),
            ),

          // Action
          SizedBox(
            height: 24,
            width: 24,
            child: Checkbox(
              value: isServed,
              onChanged: canServe ? (_) => onMarkServed() : null,
              visualDensity: VisualDensity.compact,
            ),
          ),
        ],
      ),
    );
  }
}

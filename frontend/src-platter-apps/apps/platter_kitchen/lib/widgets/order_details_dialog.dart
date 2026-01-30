import 'package:flutter/material.dart';
import '../models/order_models.dart';
import 'package:platter_core/platter_core.dart' hide OrderStatus;
import '../core/kitchen_repository.dart';
import '../constants/kitchen_constants.dart';
import '../theme/design_system/kitchen_dimensions.dart';
import '../theme/design_system/kitchen_typography.dart';
import 'status_badge.dart';

class OrderDetailsDialog extends StatefulWidget {
  final KitchenOrder order;
  final KitchenRepository repository;
  final VoidCallback onOrderUpdated;

  const OrderDetailsDialog({
    super.key,
    required this.order,
    required this.repository,
    required this.onOrderUpdated,
  });

  @override
  State<OrderDetailsDialog> createState() => _OrderDetailsDialogState();
}

class _OrderDetailsDialogState extends State<OrderDetailsDialog> {
  // Set of Item IDs currently selected
  final Set<String> _selectedItemIds = {};
  bool _isLoading = false;

  List<KitchenOrderItem> get _allItems => widget.order.allItems;

  /// Toggles selection of an item
  void _toggleSelection(String itemId) {
    setState(() {
      if (_selectedItemIds.contains(itemId)) {
        _selectedItemIds.remove(itemId);
      } else {
        _selectedItemIds.add(itemId);
      }
    });
  }

  /// Selects all items that are not already in a terminal state
  void _selectAll() {
    setState(() {
      final actionableItems = _allItems.where((i) => 
        i.status != OrderStatus.served && i.status != OrderStatus.cancelled
      ).map((e) => e.itemId);
      
      if (_selectedItemIds.length == actionableItems.length) {
        _selectedItemIds.clear();
      } else {
        _selectedItemIds.addAll(actionableItems);
      }
    });
  }

  Future<void> _markSelectedReady() async {
    if (_selectedItemIds.isEmpty) return;
    
    setState(() => _isLoading = true);
    try {
      // In real app, might want a bulk update endpoint
      for (final id in _selectedItemIds) {
        await widget.repository.updateItemStatus(
          widget.order.id, 
          id, 
          OrderStatus.ready
        );
      }
      if (mounted) {
        widget.onOrderUpdated(); // Refresh parent
        Navigator.of(context).pop();
      }
    } catch (e) {
      AppLogger.error('Failed to mark items ready for order ${widget.order.id}', error: e);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Failed to mark items ready. Please try again.')),
        );
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _cancelSelected() async {
    if (_selectedItemIds.isEmpty) return;

    // Show reason dialog
    final reason = await showDialog<String>(
      context: context,
      builder: (context) => _CancellationReasonDialog(),
    );

    if (reason == null) return;

    setState(() => _isLoading = true);
    try {
      for (final id in _selectedItemIds) {
        await widget.repository.updateItemStatus(
          widget.order.id, 
          id, 
          OrderStatus.cancelled,
          reason: reason
        );
      }
      if (mounted) {
        widget.onOrderUpdated();
        Navigator.of(context).pop();
      }
    } catch (e) {
      AppLogger.error('Failed to cancel items for order ${widget.order.id}', error: e);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Failed to cancel items. Please try again.')),
        );
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _markOutOfStock(KitchenOrderItem item) async {
    if (item.menuItemId.isEmpty) {
      AppLogger.warning('Cannot mark out of stock. Missing menuItemId for item ${item.itemId}');
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Missing menu item id. Cannot update stock.')),
        );
      }
      return;
    }

    // Confirm dialog
    final confirm = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Mark Out of Stock?'),
        content: Text('This will mark "${item.name}" as unavailable in the menu.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancel')),
          TextButton(
            onPressed: () => Navigator.pop(context, true), 
            style: TextButton.styleFrom(foregroundColor: Colors.red),
            child: const Text('Confirm'),
          ),
        ],
      ),
    );

    if (confirm == true) {
      try {
        await widget.repository.updateMenuStock(item.menuItemId, false);
        // Also probably cancel this item? Logic depends on business rule.
        // For now just mark stock.
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('${item.name} marked out of stock')),
          );
        }
      } catch (e) {
        AppLogger.error('Failed to update stock for menu item ${item.menuItemId}', error: e);
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Failed to update stock. Please try again.')),
          );
        }
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return const Center(child: CircularProgressIndicator());
    }

    // Filter carts to valid ones just in case
    // We already have generic allItems, but grouped by Cart might be nicer visually?
    // Let's stick to a flat list for now or grouped by cart if multiple carts.
    // Given the requirement "Show all dishes in the cart", usually implies grouping.
    
    return Dialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: Container(
        width: 500, // Fixed width for tablet/desktop consistency
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Header
            Row(
              children: [
                Text(
                  'Table ${widget.order.tableNumber}',
                  style: KitchenTypography.headline3,
                ),
                const Spacer(),
                TextButton(
                  onPressed: _selectAll, 
                  child: Text(_selectedItemIds.length == _allItems.where((i) => i.status != OrderStatus.served && i.status != OrderStatus.cancelled).length 
                    ? 'Deselect All' 
                    : 'Select All')
                ),
                IconButton(icon: const Icon(Icons.close), onPressed: () => Navigator.pop(context)),
              ],
            ),
            const Divider(),
            
            // Order Info
            Text('Order #${widget.order.orderNumber}', style: KitchenTypography.caption),
            const SizedBox(height: 16),

            // Items List
            Flexible(
              child: ListView.separated(
                shrinkWrap: true,
                itemCount: widget.order.carts.length,
                separatorBuilder: (ctx, i) => const Divider(),
                itemBuilder: (ctx, cartIndex) {
                  final cart = widget.order.carts[cartIndex];
                  return Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Cart Header if multiple carts
                      if (widget.order.carts.length > 1)
                        Padding(
                          padding: const EdgeInsets.only(bottom: 8.0),
                          child: Text('Cart ${cartIndex + 1}', style: KitchenTypography.subtitleBold),
                        ),
                        
                      ...cart.items.map((item) {
                        final isSelected = _selectedItemIds.contains(item.itemId);
                        final isDone = item.status == OrderStatus.served || item.status == OrderStatus.cancelled;
                        final isOutOfStock = !item.inStock;
                        
                        return ListTile(
                          contentPadding: EdgeInsets.zero,
                          leading: isDone 
                              ? const Icon(Icons.block, color: Colors.grey)
                              : Checkbox(
                                  value: isSelected,
                                  onChanged: (val) => _toggleSelection(item.itemId),
                                ),
                          title: Text(
                            item.name, 
                            style: isDone
                                ? const TextStyle(decoration: TextDecoration.lineThrough, color: Colors.grey)
                                : isOutOfStock
                                    ? const TextStyle(color: Colors.grey)
                                    : null,
                          ),
                          subtitle: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              if (item.modifiers.isNotEmpty)
                                Text(item.modifiers.join(', '), style: KitchenTypography.caption),
                              if (item.notes != null)
                                Text('Note: ${item.notes}', style: KitchenTypography.caption.copyWith(color: Colors.amber.shade800)),
                            ],
                          ),
                          trailing: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Text('x${item.quantity}', style: KitchenTypography.bodyBold),
                              const SizedBox(width: 8),
                              StatusBadge(status: item.status, size: StatusBadgeSize.small),
                              PopupMenuButton<String>(
                                onSelected: (val) {
                                  if (val == 'stock') _markOutOfStock(item);
                                },
                                itemBuilder: (context) => [
                                  PopupMenuItem(
                                    value: 'stock',
                                    child: const Text('Mark Out of Stock'),
                                  ),
                                ],
                              ),
                            ],
                          ),
                          onTap: isDone ? null : () => _toggleSelection(item.itemId),
                        );
                      }),
                    ],
                  );
                },
              ),
            ),
            
            const SizedBox(height: 24),
            
            // Actions
            Row(
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                if (_selectedItemIds.isNotEmpty) ...[
                  OutlinedButton.icon(
                    onPressed: _cancelSelected,
                    icon: const Icon(Icons.cancel, size: 18),
                    label: const Text('Cancel Selected'),
                    style: OutlinedButton.styleFrom(foregroundColor: Colors.red),
                  ),
                  const SizedBox(width: 12),
                  FilledButton.icon(
                    onPressed: _markSelectedReady,
                    icon: const Icon(Icons.check, size: 18),
                    label: const Text('Mark Ready'),
                    style: FilledButton.styleFrom(backgroundColor: Colors.green),
                  ),
                ] else
                   Text('Select items to perform actions', style: KitchenTypography.caption),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _CancellationReasonDialog extends StatefulWidget {
  @override
  State<_CancellationReasonDialog> createState() => _CancellationReasonDialogState();
}

class _CancellationReasonDialogState extends State<_CancellationReasonDialog> {
  String? _selectedReason;
  final List<String> _reasons = [
    'Out of ingredients',
    'Quality issue',
    'Customer changed mind',
    'Other',
  ];

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Text('Cancel Dish'),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Text('Please select a reason for cancellation:'),
          const SizedBox(height: 16),
          DropdownButtonFormField<String>(
            value: _selectedReason,
            items: _reasons.map((r) => DropdownMenuItem(value: r, child: Text(r))).toList(),
            onChanged: (val) => setState(() => _selectedReason = val),
            decoration: const InputDecoration(border: OutlineInputBorder()),
            hint: const Text('Select Reason'),
          ),
        ],
      ),
      actions: [
        TextButton(onPressed: () => Navigator.pop(context), child: const Text('Back')),
        FilledButton(
          onPressed: _selectedReason == null ? null : () => Navigator.pop(context, _selectedReason),
          child: const Text('Confirm Cancel'),
        ),
      ],
    );
  }
}

import 'package:flutter/material.dart';
import 'package:platter_core/platter_core.dart';

import '../core/kitchen_repository.dart';
import '../models/active_order_models.dart';
import '../theme/design_system/kitchen_typography.dart';

/// Cart-level detail dialog with a single real mutation: Mark Ready.
///
/// Items are shown read-only. Item-level actions (cancel, out-of-stock,
/// item-level ready) are explicitly deferred in this phase.
class CartDetailDialog extends StatefulWidget {
  const CartDetailDialog({
    super.key,
    required this.cart,
    required this.repository,
    required this.restaurantId,
    required this.sessionId,
    required this.onCartMutated,
    required this.onSessionExpired,
  });

  final ActiveKitchenCart cart;
  final KitchenRepository repository;
  final String restaurantId;
  final String sessionId;

  /// Called after a successful mutation so the parent can refresh.
  final VoidCallback onCartMutated;

  /// Called when the mutation fails with a session-expired signal so the
  /// parent can stop polling and show the reconnect state.
  final VoidCallback onSessionExpired;

  @override
  State<CartDetailDialog> createState() => _CartDetailDialogState();
}

class _CartDetailDialogState extends State<CartDetailDialog> {
  bool _isSubmitting = false;

  bool get _canMarkReady =>
      widget.cart.status == ActiveCartStatus.pending ||
      widget.cart.status == ActiveCartStatus.cooking;

  Future<void> _markReady() async {
    if (!_canMarkReady || _isSubmitting) return;
    setState(() => _isSubmitting = true);
    try {
      await widget.repository.markCartReady(
        restaurantId: widget.restaurantId,
        sessionId: widget.sessionId,
        cartId: widget.cart.cartId,
      );
      if (!mounted) return;
      widget.onCartMutated();
      Navigator.of(context).pop();
    } on KitchenSessionExpiredException catch (e) {
      AppLogger.warning('Mark Ready blocked by session expiry: ${e.message}');
      if (!mounted) return;
      Navigator.of(context).pop();
      widget.onSessionExpired();
    } on KitchenCartTransitionException catch (e) {
      AppLogger.warning('Mark Ready rejected by backend: ${e.message}');
      if (!mounted) return;
      setState(() => _isSubmitting = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            'Cannot mark as ready. The cart may already be ready, served, or cancelled.',
          ),
        ),
      );
    } catch (e, st) {
      AppLogger.error('Failed to mark cart ready', error: e, stackTrace: st);
      if (!mounted) return;
      setState(() => _isSubmitting = false);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Failed to mark cart as ready. Please try again.'),
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final cart = widget.cart;
    return Dialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: Container(
        width: 500,
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Header
            Row(
              children: [
                Expanded(
                  child: Text(
                    'Table ${cart.tableNumber}',
                    style: KitchenTypography.headline3,
                  ),
                ),
                IconButton(
                  icon: const Icon(Icons.close),
                  onPressed:
                      _isSubmitting ? null : () => Navigator.of(context).pop(),
                ),
              ],
            ),
            const Divider(),
            Text(
              'Order #${cart.orderNumber}',
              style: KitchenTypography.caption,
            ),
            const SizedBox(height: 16),

            if (cart.kitchenNote != null && cart.kitchenNote!.isNotEmpty) ...[
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: Colors.amber.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(6),
                  border: Border.all(color: Colors.amber.withValues(alpha: 0.6)),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.info_outline,
                        size: 16, color: Colors.amber),
                    const SizedBox(width: 6),
                    Expanded(
                      child: Text(
                        cart.kitchenNote!,
                        style: KitchenTypography.caption,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 12),
            ],

            // Read-only items list
            Flexible(
              child: ListView.separated(
                shrinkWrap: true,
                itemCount: cart.items.length,
                separatorBuilder: (_, __) => const Divider(height: 12),
                itemBuilder: (context, i) {
                  final item = cart.items[i];
                  return ListTile(
                    contentPadding: EdgeInsets.zero,
                    title: Text(item.name),
                    subtitle: item.modifiers.isNotEmpty
                        ? Text(
                            item.modifiers.join(', '),
                            style: KitchenTypography.caption,
                          )
                        : null,
                    trailing: Text(
                      'x${item.quantity}',
                      style: KitchenTypography.bodyBold,
                    ),
                  );
                },
              ),
            ),

            const SizedBox(height: 24),

            // Single real action: Mark Ready
            Row(
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                Semantics(
                  identifier: 'kitchen-mark-ready',
                  child: FilledButton.icon(
                  onPressed: (_canMarkReady && !_isSubmitting) ? _markReady : null,
                  icon: _isSubmitting
                      ? const SizedBox(
                          width: 16,
                          height: 16,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : const Icon(Icons.check, size: 18),
                  label: Text(_canMarkReady ? 'Mark Ready' : 'Already ${_statusLabel(cart.status)}'),
                ),),
              ],
            ),
          ],
        ),
      ),
    );
  }

  String _statusLabel(ActiveCartStatus status) {
    switch (status) {
      case ActiveCartStatus.pending:
        return 'Pending';
      case ActiveCartStatus.cooking:
        return 'Cooking';
      case ActiveCartStatus.ready:
        return 'Ready';
      case ActiveCartStatus.served:
        return 'Served';
      case ActiveCartStatus.cancelled:
        return 'Cancelled';
    }
  }
}

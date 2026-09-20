import 'package:flutter/material.dart';
import 'models/order_detail_response.dart';
import 'repository/order_api_service.dart';

import '../../widgets/status_chip.dart';
import '../../widgets/cart_detail_card.dart';
import '../../widgets/state_views.dart';

class OrderDetailScreen extends StatefulWidget {
  final String restaurantId;
  final String sessionId;
  final String orderId;

  const OrderDetailScreen({
    super.key,
    required this.restaurantId,
    required this.sessionId,
    required this.orderId,
  });

  @override
  State<OrderDetailScreen> createState() => _OrderDetailScreenState();
}

class _OrderDetailScreenState extends State<OrderDetailScreen> {
  final OrderApiService _apiService = OrderApiService();

  bool _isLoading = true;
  String? _errorMessage;
  OrderDetailResponse? _orderDetail;

  // Valid status transitions (mirrors backend)
  // static const Map<String, List<String>> _validTransitions = {
  //   'PENDING': ['PREPARING', 'READY', 'CANCELLED'],
  //   'PREPARING': ['READY', 'CANCELLED'],
  //   'READY': ['SERVED', 'CANCELLED'],
  //   'SERVED': ['RETURNED'],
  //   'RETURNED': [],
  //   'CANCELLED': [],
  // };

  @override
  void initState() {
    super.initState();
    _fetchOrderDetail();
  }

  Future<void> _fetchOrderDetail() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    final response = await _apiService.getOrder(
      restaurantId: widget.restaurantId,
      orderId: widget.orderId,
      sessionId: widget.sessionId,
    );

    setState(() {
      _isLoading = false;
      if (response.success && response.data != null) {
        _orderDetail = response.data;
      } else {
        _errorMessage = response.message ?? 'Failed to fetch order details';
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('Order #${widget.orderId}'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _fetchOrderDetail,
          ),
        ],
      ),
      body: _buildContent(),
    );
  }

  Widget _buildContent() {
    if (_isLoading) {
      if (_orderDetail == null) {
        return const Center(child: CircularProgressIndicator());
      }
    }

    if (_errorMessage != null && _orderDetail == null) {
      return _buildErrorState();
    }

    if (_orderDetail == null) {
      return const Center(child: Text('No order data available'));
    }

    // This would be replaced with actual order detail UI
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (_errorMessage != null) _buildErrorBanner(_errorMessage!),
          // Order header information
          _buildOrderHeader(),

          const SizedBox(height: 16),
          const Divider(),
          const SizedBox(height: 16),

          // Carts & items
          const Text(
            'Carts',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 8),
          ListView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: _orderDetail?.carts.length ?? 0,
            itemBuilder: (context, index) {
              final cart =
                  Map<String, dynamic>.from(_orderDetail!.carts[index]);
              return _buildCartSection(cart, index);
            },
          ),

          const SizedBox(height: 16),
          const Divider(),
          const SizedBox(height: 16),

          // Order actions (Cancel / Mark Paid)
          _buildOrderActions(),
        ],
      ),
    );
  }

  Widget _buildOrderHeader() {
    // Placeholder for order header information
    // Placeholder for order header information
    return Container(
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
      padding: const EdgeInsets.all(12.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Order #${_orderDetail?.id ?? "N/A"}',
            style: const TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              _buildStatusChip(_orderDetail?.orderStatus ?? ''),
              const SizedBox(width: 8),
              Text('Table: ${_orderDetail?.tableId ?? "N/A"}'),
            ],
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              Text(
                  'Server: ${_orderDetail?.assignedServerName ?? "Unassigned"}'),
            ],
          ),
          const SizedBox(height: 8),
          Text('Total: ${_orderDetail?.total ?? 0}'),
          const SizedBox(height: 4),
          Text('Created: ${_orderDetail?.createdAt.toIso8601String() ?? "-"}'),
          Text('Updated: ${_orderDetail?.updatedAt.toIso8601String() ?? "-"}'),
          if ((_orderDetail?.notes ?? '').isNotEmpty) ...[
            const SizedBox(height: 8),
            Text('Notes: ${_orderDetail?.notes ?? ""}'),
          ],
        ],
      ),
    );
  }

  Widget _buildStatusChip(String status) {
    return StatusChip(status: status);
  }

  Widget _buildOrderActions() {
    // COMPLETED and CANCELLED are terminal on the backend; hide the buttons
    // instead of showing a rejection.
    final status = (_orderDetail?.orderStatus ?? '').toUpperCase();
    if (status == 'COMPLETED' || status == 'CANCELLED') {
      return const SizedBox.shrink();
    }
    return Row(
      mainAxisAlignment: MainAxisAlignment.end,
      children: [
        _buildActionButton(
          identifier: 'order-cancel',
          icon: Icons.cancel,
          label: 'Cancel Order',
          color: Colors.red,
          onPressed: () => _showCancelConfirmation(),
        ),
        const SizedBox(width: 8),
        _buildActionButton(
          identifier: 'order-mark-paid',
          icon: Icons.check_circle,
          label: 'Mark Paid',
          color: Colors.green,
          onPressed: () => _showPaidConfirmation(),
        ),
      ],
    );
  }

  void _showPaidConfirmation() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Mark as Paid?'),
        content: const Text(
            'This marks the food as done. The table stays occupied until the bill is settled and someone taps Vacant.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('No'),
          ),
          Semantics(
            identifier: 'order-mark-paid-confirm',
            child: TextButton(
              onPressed: () {
                Navigator.of(context).pop();
                _updateOrderStatus('completed');
              },
              style: TextButton.styleFrom(foregroundColor: Colors.green),
              child: const Text('Yes, Mark Paid'),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildActionButton({
    required IconData icon,
    required String label,
    required Color color,
    required VoidCallback? onPressed,
    required String identifier,
  }) {
    final resolvedColor = onPressed == null ? Colors.grey : color;
    return Semantics(
      identifier: identifier,
      child: OutlinedButton.icon(
        icon: Icon(icon),
        label: Text(label),
        style: OutlinedButton.styleFrom(
          foregroundColor: resolvedColor,
          side: BorderSide(color: resolvedColor.withValues(alpha: 0.4)),
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
          textStyle: const TextStyle(fontWeight: FontWeight.w500),
        ),
        onPressed: onPressed,
      ),
    );
  }

  Future<void> _updateOrderStatus(String newStatus) async {
    // Show loading indicator
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => const Center(child: CircularProgressIndicator()),
    );

    try {
      final response = await _apiService.updateOrderStatus(
        restaurantId: widget.restaurantId,
        orderId: widget.orderId,
        orderStatus: newStatus.toUpperCase(),
        sessionId: widget.sessionId,
      );

      // Close loading dialog
      if (mounted) Navigator.of(context).pop();

      if (response.success) {
        // Refresh order details after status update
        await _fetchOrderDetail();

        // Show success message
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text(response.message ?? 'Status updated')),
          );
        }
      } else {
        // Show error message
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(response.message ?? 'Failed to update status'),
              backgroundColor: Colors.red,
            ),
          );
        }
      }
    } catch (e) {
      // Close loading dialog
      if (mounted) Navigator.of(context).pop();

      // Show error message
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  void _showCancelConfirmation() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Cancel Order?'),
        content: const Text(
            'Are you sure you want to cancel this order? This action cannot be undone.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('No'),
          ),
          TextButton(
            onPressed: () {
              Navigator.of(context).pop();
              _updateOrderStatus('cancelled');
            },
            style: TextButton.styleFrom(foregroundColor: Colors.red),
            child: const Text('Yes, Cancel Order'),
          ),
        ],
      ),
    );
  }

  Widget _buildErrorState() {
    return ErrorStateWidget(
      message: _errorMessage ?? 'Unknown error occurred',
      onRetry: _fetchOrderDetail,
    );
  }

  Widget _buildErrorBanner(String message) {
    return MaterialBanner(
      content: Text(message),
      backgroundColor: Colors.orange.shade100,
      actions: [
        TextButton(
          onPressed: _fetchOrderDetail,
          child: const Text('Retry'),
        ),
      ],
    );
  }

  Widget _buildCartSection(Map<String, dynamic> cart, int cartIndex) {
    return CartDetailCard(
      cart: cart,
      index: cartIndex,
      onMarkServed: (index) => _markCartServed(index),
      onItemServed: (item) => _markItemServed(item),
    );
  }

  Future<void> _markCartServed(int cartIndex) async {
    // Use dedicated endpoint
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => const Center(child: CircularProgressIndicator()),
    );

    try {
      final response = await _apiService.markCartAsServed(
        restaurantId: widget.restaurantId,
        orderId: widget.orderId,
        cartIndex: cartIndex,
        sessionId: widget.sessionId,
      );

      if (mounted) Navigator.of(context).pop();

      if (response.success) {
        await _fetchOrderDetail();
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text(response.message ?? 'Cart marked served')),
          );
        }
      } else {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(response.message ?? 'Failed to mark cart served'),
              backgroundColor: Colors.red,
            ),
          );
        }
      }
    } catch (e) {
      if (mounted) Navigator.of(context).pop();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  Future<void> _markItemServed(Map<String, dynamic> item) async {
    final menuItemId = item['menuItemId']?.toString();
    final cartItemId = item['cartItemId'];

    if (menuItemId == null) return;

    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => const Center(child: CircularProgressIndicator()),
    );

    try {
      final response = await _apiService.markItemAsServed(
        restaurantId: widget.restaurantId,
        orderId: widget.orderId,
        menuItemId: menuItemId,
        sessionId: widget.sessionId,
        cartItemId: cartItemId is int ? cartItemId : null,
      );

      if (mounted) Navigator.of(context).pop();

      if (response.success) {
        await _fetchOrderDetail();
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text(response.message ?? 'Item marked served')),
          );
        }
      } else {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(response.message ?? 'Failed to mark item served'),
              backgroundColor: Colors.red,
            ),
          );
        }
      }
    } catch (e) {
      if (mounted) Navigator.of(context).pop();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }
}

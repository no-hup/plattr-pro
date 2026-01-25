import 'package:flutter/material.dart';
import 'models/order_detail_response.dart';
import 'repository/order_api_service.dart';
import 'models/order_summary.dart';

class OrderDetailScreen extends StatefulWidget {
  final String restaurantId;
  final String sessionId;
  final String orderId;
  
  const OrderDetailScreen({
    Key? key,
    required this.restaurantId,
    required this.sessionId,
    required this.orderId,
  }) : super(key: key);

  @override
  State<OrderDetailScreen> createState() => _OrderDetailScreenState();
}

class _OrderDetailScreenState extends State<OrderDetailScreen> {
  final OrderApiService _apiService = OrderApiService();
  
  bool _isLoading = true;
  String? _errorMessage;
  OrderDetailResponse? _orderDetail;

  // Valid status transitions (mirrors backend)
  static const Map<String, List<String>> _validTransitions = {
    'PENDING': ['PREPARING', 'READY', 'CANCELLED'],
    'PREPARING': ['READY', 'CANCELLED'],
    'READY': ['SERVED', 'CANCELLED'],
    'SERVED': ['RETURNED'],
    'RETURNED': [],
    'CANCELLED': [],
  };
  
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
              final cart = Map<String, dynamic>.from(_orderDetail!.carts[index]);
              return _buildCartSection(cart, index);
            },
          ),
          
          const SizedBox(height: 16),
          const Divider(),
          const SizedBox(height: 16),
          
          // Order actions (Cancel only)
          _buildOrderActions(),
        ],
      ),
    );
  }
  
  Widget _buildOrderHeader() {
    // Placeholder for order header information
    return Card(
      elevation: 2,
      child: Padding(
        padding: const EdgeInsets.all(16.0),
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
                Text('Server: ${_orderDetail?.assignedServerName ?? "Unassigned"}'),
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
      ),
    );
  }
  
  Widget _buildStatusChip(String status) {
    final normalized = status.toUpperCase();
    Color color;
    switch (normalized) {
      case 'PENDING':
        color = Colors.orange;
        break;
      case 'PREPARING':
        color = Colors.blue;
        break;
      case 'READY':
        color = Colors.green;
        break;
      case 'SERVED':
        color = Colors.purple;
        break;
      case 'COMPLETED':
        color = Colors.green.shade800;
        break;
      case 'CANCELLED':
        color = Colors.red;
        break;
      case 'IN_PROGRESS':
        color = Colors.blueGrey;
        break;
      default:
        color = Colors.grey;
    }
    
    return Chip(
      label: Text(
        normalized,
        style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
      ),
      backgroundColor: color,
    );
  }
  
  Widget _buildOrderActions() {
    return Row(
      mainAxisAlignment: MainAxisAlignment.end,
      children: [
        _buildActionButton(
          icon: Icons.cancel,
          label: 'Cancel Order',
          color: Colors.red,
          onPressed: () => _showCancelConfirmation(),
        ),
      ],
    );
  }
  
  Widget _buildActionButton({
    required IconData icon,
    required String label,
    required Color color,
    required VoidCallback? onPressed,
  }) {
    final resolvedColor = onPressed == null ? Colors.grey : color;
    return OutlinedButton.icon(
      icon: Icon(icon),
      label: Text(label),
      style: OutlinedButton.styleFrom(
        foregroundColor: resolvedColor,
        side: BorderSide(color: resolvedColor.withOpacity(0.4)),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        textStyle: const TextStyle(fontWeight: FontWeight.w500),
      ),
      onPressed: onPressed,
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
        content: const Text('Are you sure you want to cancel this order? This action cannot be undone.'),
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
            child: const Text('Yes, Cancel Order'),
            style: TextButton.styleFrom(foregroundColor: Colors.red),
          ),
        ],
      ),
    );
  }
  
  Widget _buildErrorState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Icon(Icons.error_outline, size: 64, color: Colors.red),
          const SizedBox(height: 16),
          const Text(
            'Failed to load order details',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 8),
          Text(
            _errorMessage ?? 'Unknown error occurred',
            textAlign: TextAlign.center,
            style: const TextStyle(color: Colors.red),
          ),
          const SizedBox(height: 24),
          ElevatedButton(
            onPressed: _fetchOrderDetail,
            child: const Text('Try Again'),
          ),
        ],
      ),
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
    final status = normalizeCartStatus((cart['status'] ?? '').toString());
    final displayStatus = mapCartStatusToDisplay(status);
    final items = (cart['items'] as List<dynamic>? ?? []);
    final isServed = status == 'SERVED';
    final canMarkServed = _canTransition(status, 'SERVED');

    return Card(
      elevation: 1,
      margin: const EdgeInsets.only(bottom: 12),
      child: ExpansionTile(
        key: PageStorageKey('cart-$cartIndex'),
        initiallyExpanded: !isServed, // served carts collapsed by default
        title: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text('Cart ${cartIndex + 1}', style: const TextStyle(fontWeight: FontWeight.bold)),
            _buildStatusChip(displayStatus),
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
                _buildActionButton(
                  icon: Icons.room_service,
                  label: 'Mark Served',
                  color: Colors.blueGrey,
                  onPressed: canMarkServed ? () => _markCartServed(cartIndex) : null,
                ),
              ],
            ),
          ),
          const Divider(),
          ...items.asMap().entries.map((entry) {
            final item = Map<String, dynamic>.from(entry.value as Map);
            return _buildCartItem(item, cartIndex);
          }).toList(),
        ],
      ),
    );
  }

  Widget _buildCartItem(Map<String, dynamic> item, int cartIndex) {
    final itemStatusRaw = (item['status'] ?? '').toString();
    final itemStatus = normalizeCartStatus(itemStatusRaw);
    final canServe = _canTransition(itemStatus, 'SERVED');
    final isServed = itemStatus == 'SERVED';

    final itemName = item['name'] ??
        item['menuItem']?['meta']?['name'] ??
        item['menuItemName'] ??
        'Item';
    final quantity = item['quantity'] ?? 0;

    final variants = (item['selectedVariantsDetails'] as List<dynamic>? ?? []);
    final addons = (item['selectedAddonsDetails'] as List<dynamic>? ?? []);

    return ListTile(
      title: Text(itemName, style: const TextStyle(fontWeight: FontWeight.bold)),
      subtitle: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Quantity: $quantity'),
          const SizedBox(height: 4),
          Row(
            children: [
              const Text('Status: ', style: TextStyle(fontSize: 12)),
              _buildStatusChip(mapCartStatusToDisplay(itemStatus)),
            ],
          ),
          if (variants.isNotEmpty) ...[
            const SizedBox(height: 4),
            const Text('Variants:', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
            ...variants.map((v) => Text(
                  '• ${v['selected_variant_name'] ?? v['id'] ?? ''}',
                  style: const TextStyle(fontSize: 12, color: Colors.blueGrey),
                ))
          ],
          if (addons.isNotEmpty) ...[
            const SizedBox(height: 4),
            const Text('Addons:', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
            ...addons.map((a) => Text(
                  '• ${a['name'] ?? ''}',
                  style: const TextStyle(fontSize: 12, color: Colors.teal),
                ))
          ],
        ],
      ),
      trailing: Checkbox(
        value: isServed,
        onChanged: canServe ? (_) => _markItemServed(item) : null,
      ),
    );
  }

  bool _canTransition(String currentStatus, String targetStatus) {
    final current = normalizeCartStatus(currentStatus);
    final target = normalizeCartStatus(targetStatus);
    final allowed = _validTransitions[current] ?? [];
    return allowed.contains(target);
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

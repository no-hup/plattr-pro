import 'package:flutter/material.dart';
import 'models/order_item_detail.dart';
import 'models/order_detail_response.dart';
import 'repository/order_api_service.dart';

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
      return const Center(child: CircularProgressIndicator());
    }
    
    if (_errorMessage != null) {
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
          // Order header information
          _buildOrderHeader(),
          
          const SizedBox(height: 16),
          const Divider(),
          const SizedBox(height: 16),
          
          // Order items - placeholder for actual implementation
          const Text(
            'Order Items', 
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 8),
          // Actual order items list
          ListView.separated(
            shrinkWrap: true,
            physics: NeverScrollableScrollPhysics(),
            itemCount: _orderDetail?.items.length ?? 0,
            separatorBuilder: (context, index) => Divider(),
            itemBuilder: (context, index) {
              final itemJson = _orderDetail!.items[index];
              // Defensive: handle both OrderItemDetail and Map
              final item = itemJson is OrderItemDetail
                  ? itemJson
                  : OrderItemDetail.fromJson(Map<String, dynamic>.from(itemJson));
              return ListTile(
                title: Text(item.name, style: TextStyle(fontWeight: FontWeight.bold)),
                subtitle: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Quantity: ${item.quantity}'),
                    if (item.variants?.isNotEmpty ?? false)
                      Padding(
                        padding: const EdgeInsets.only(top: 4.0),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Variants:',
                              style: TextStyle(fontSize: 12, color: Colors.blueGrey, fontWeight: FontWeight.bold),
                            ),
                            ...(item.variants ?? []).map((v) => Text(
                                  '• ${v.id} (Mandatory: ${v.isMandatory ? "Yes" : "No"})',
                                  style: TextStyle(fontSize: 12, color: Colors.blueGrey),
                                ))
                          ],
                        ),
                      ),
                    if (item.addons?.isNotEmpty ?? false)
                      Padding(
                        padding: const EdgeInsets.only(top: 2.0),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Addons:',
                              style: TextStyle(fontSize: 12, color: Colors.teal, fontWeight: FontWeight.bold),
                            ),
                            ...(item.addons ?? []).map((a) => Text(
                                  '• ${a.name} (	${a.price})',
                                  style: TextStyle(fontSize: 12, color: Colors.teal),
                                ))
                          ],
                        ),
                      ),
                  ],
                ),
                isThreeLine: true,
              );
            },
          ),
          
          const SizedBox(height: 16),
          const Divider(),
          const SizedBox(height: 16),
          
          // Order actions - placeholder for actual implementation
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
                const SizedBox.shrink(),
                const SizedBox(width: 8),
                // Note: OrderDetail doesn't have assignedServer field
                const Text('Server: Unassigned'),
              ],
            ),
          ],
        ),
      ),
    );
  }
  
  Widget _buildStatusChip(String status) {
    Color color;
    switch (status.toLowerCase()) {
      case 'pending':
        color = Colors.orange;
        break;
      case 'preparing':
        color = Colors.blue;
        break;
      case 'ready':
        color = Colors.green;
        break;
      case 'served':
        color = Colors.purple;
        break;
      case 'completed':
        color = Colors.green.shade800;
        break;
      case 'cancelled':
        color = Colors.red;
        break;
      default:
        color = Colors.grey;
    }
    
    return Chip(
      label: Text(
        status.toUpperCase(),
        style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
      ),
      backgroundColor: color,
    );
  }
  
  Widget _buildOrderActions() {
    // Placeholder for order action buttons
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceEvenly,
      children: [
        _buildActionButton(
          icon: Icons.check_circle,
          label: 'Mark Ready',
          color: Colors.green,
          onPressed: () => _updateOrderStatus('ready'),
        ),
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
    required VoidCallback onPressed,
  }) {
    return ElevatedButton.icon(
      icon: Icon(icon, color: Colors.white),
      label: Text(label),
      style: ElevatedButton.styleFrom(
        backgroundColor: color,
        foregroundColor: Colors.white,
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
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
      ApiResponse<bool> response;

      // Special handling for "ready" status to support multi-cart backend
      if (newStatus.toLowerCase() == 'ready') {
        bool allSuccessful = true;
        String? firstErrorMessage;

        // Iterate through all carts and mark them as READY
        if (_orderDetail != null && _orderDetail!.carts.isNotEmpty) {
          for (int i = 0; i < _orderDetail!.carts.length; i++) {
            final cart = _orderDetail!.carts[i];
            final cartStatus = (cart['status'] ?? '').toString().toLowerCase();
            
            // Only update active carts that aren't already served or ready
            if (cartStatus != 'served' && cartStatus != 'ready' && cartStatus != 'cancelled') {
              final cartResponse = await _apiService.updateCartStatus(
                restaurantId: widget.restaurantId,
                orderId: widget.orderId,
                cartIndex: i,
                newStatus: 'READY',
                sessionId: widget.sessionId,
              );
              
              if (!cartResponse.success) {
                allSuccessful = false;
                firstErrorMessage ??= cartResponse.message;
              }
            }
          }
        }

        if (allSuccessful) {
          response = ApiResponse<bool>.success(true, message: 'All items marked as ready');
        } else {
          response = ApiResponse<bool>.error(firstErrorMessage ?? 'Failed to update some items');
        }
      } else {
        // Standard order-level status update (e.g., cancelled)
        response = await _apiService.updateOrderStatus(
          restaurantId: widget.restaurantId,
          orderId: widget.orderId,
          orderStatus: newStatus.toUpperCase(),
          sessionId: widget.sessionId,
        );
      }
      
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
}

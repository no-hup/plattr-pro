import 'package:flutter/material.dart';

import 'models/order_summary.dart';
import 'repository/order_api_service.dart';
import 'orders_provider.dart';
import 'order_detail_screen.dart';

class OrdersHomeScreen extends StatefulWidget {
  final String restaurantId;
  final String sessionId;
  
  const OrdersHomeScreen({
    Key? key,
    required this.restaurantId,
    required this.sessionId,
  }) : super(key: key);

  @override
  State<OrdersHomeScreen> createState() => _OrdersHomeScreenState();
}

class _OrdersHomeScreenState extends State<OrdersHomeScreen> {
  late final ScrollController _scrollController;
  late final OrdersProvider _ordersProvider;
  
  @override
  void initState() {
    super.initState();
    _scrollController = ScrollController();
    _ordersProvider = OrdersProvider(apiService: OrderApiService());
    
    // Listen for state changes in the provider
    _ordersProvider.addListener(_handleProviderUpdate);
    
    // Fetch orders when screen is first loaded
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _fetchOrders();
    });
  }
  
  @override
  void dispose() {
    _ordersProvider.removeListener(_handleProviderUpdate);
    _ordersProvider.dispose();
    _scrollController.dispose();
    super.dispose();
  }
  
  void _handleProviderUpdate() {
    // Force rebuild when provider state changes
    setState(() {});
  }
  
  Future<void> _fetchOrders() async {
    await _ordersProvider.fetchActiveOrders(
      restaurantId: widget.restaurantId,
      sessionId: widget.sessionId,
    );
  }
  
  Future<void> _refreshOrders() async {
    await _ordersProvider.refreshOrders(
      restaurantId: widget.restaurantId,
      sessionId: widget.sessionId,
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Active Orders'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _refreshOrders,
          ),
        ],
      ),
      body: AnimatedBuilder(
        animation: _ordersProvider,
        builder: (context, child) {
          return _buildContent(_ordersProvider);
        },
      ),
    );
  }
  
  Widget _buildContent(OrdersProvider provider) {
    // Handle different states
    switch (provider.state) {
      case DataState.initial:
      case DataState.loading:
        if (!provider.isRefreshing) {
          return const Center(child: CircularProgressIndicator());
        }
        // Fall through to show content with refresh indicator
        return _buildOrderList(provider, isRefreshing: true);
        
      case DataState.error:
        if (provider.hasOrders) {
          // Show error but still display orders
          return _buildOrderList(provider, hasError: true);
        }
        return _buildErrorState(provider.errorMessage);
        
      case DataState.loaded:
        if (!provider.hasOrders) {
          return _buildEmptyState();
        }
        return _buildOrderList(provider);
    }
  }
  
  Widget _buildOrderList(OrdersProvider provider, {bool isRefreshing = false, bool hasError = false}) {
    // This would include the actual order list implementation
    // For now, just a placeholder
    return RefreshIndicator(
      onRefresh: _refreshOrders,
      child: Column(
        children: [
          if (hasError)
            Container(
              padding: const EdgeInsets.all(8.0),
              color: Colors.red.shade100,
              width: double.infinity,
              child: Text(
                'Error: ${provider.errorMessage ?? "Unknown error"}',
                style: const TextStyle(color: Colors.red),
              ),
            ),
          // This would be replaced with actual order list implementation
          Expanded(
            child: ListView.builder(
              controller: _scrollController,
              physics: const AlwaysScrollableScrollPhysics(),
              itemCount: provider.orders.length,
              itemBuilder: (context, index) {
                return _buildOrderItem(provider.orders[index]);
              },
            ),
          ),
        ],
      ),
    );
  }
  
  Widget _buildOrderItem(OrderSummary order) {
    final allItems = order.carts.expand((cart) => cart.items).toList();

    // Helper to determine pill color based on status
    Color _getPillColor(String status) {
      switch (status.toLowerCase()) {
        case 'ready':
          return Colors.green.shade100;
        case 'preparing':
          return Colors.orange.shade100;
        default:
          return Colors.grey.shade200;
      }
    }

    // Helper to determine text color for better contrast
    Color _getTextColor(String status) {
      switch (status.toLowerCase()) {
        case 'ready':
          return Colors.green.shade800;
        case 'preparing':
          return Colors.orange.shade800;
        default:
          return Colors.grey.shade700;
      }
    }

    return ListTile(
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      title: Text('Order #${order.orderId}'),
      subtitle: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Table: ${order.tableId} • Status: ${order.status}'),
          const SizedBox(height: 8),
          if (allItems.isNotEmpty)
            Wrap(
              spacing: 8.0, // Horizontal space between pills
              runSpacing: 4.0, // Vertical space between lines of pills
              children: allItems.map((item) {
                return Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10.0, vertical: 5.0),
                  decoration: BoxDecoration(
                    color: _getPillColor(item.status),
                    borderRadius: BorderRadius.circular(20.0), // Cylindrical shape
                  ),
                  child: Text(
                    '${item.quantity}× ${item.name}',
                    style: TextStyle(
                      color: _getTextColor(item.status),
                      fontSize: 12,
                    ),
                  ),
                );
              }).toList(),
            )
          else
            const Text('No active items in this order.', style: TextStyle(fontStyle: FontStyle.italic)),
        ],
      ),
      // Adjust isThreeLine based on content, or remove if layout handles height dynamically
      // isThreeLine: true, // This might need adjustment or to be made dynamic
      onTap: () => _navigateToOrderDetail(order),
    );
  }
  
  void _navigateToOrderDetail(OrderSummary order) {
    Navigator.push(context, MaterialPageRoute(
      builder: (context) => OrderDetailScreen(
        restaurantId: widget.restaurantId,
        sessionId: widget.sessionId,
        orderId: order.orderId,
      ),
    ));
  }
  
  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Icon(Icons.receipt_long, size: 64, color: Colors.grey),
          const SizedBox(height: 16),
          const Text(
            'No active orders',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 8),
          const Text(
            'New orders will appear here',
            style: TextStyle(color: Colors.grey),
          ),
          const SizedBox(height: 24),
          ElevatedButton(
            onPressed: _refreshOrders,
            child: const Text('Refresh'),
          ),
        ],
      ),
    );
  }
  
  Widget _buildErrorState(String? errorMessage) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Icon(Icons.error_outline, size: 64, color: Colors.red),
          const SizedBox(height: 16),
          const Text(
            'Failed to load orders',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 8),
          Text(
            errorMessage ?? 'Unknown error occurred',
            textAlign: TextAlign.center,
            style: const TextStyle(color: Colors.red),
          ),
          const SizedBox(height: 24),
          ElevatedButton(
            onPressed: _fetchOrders,
            child: const Text('Try Again'),
          ),
        ],
      ),
    );
  }
}

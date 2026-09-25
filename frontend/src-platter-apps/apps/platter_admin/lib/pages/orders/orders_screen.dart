import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import 'package:platter_core/platter_core.dart';
import 'orders_api_service.dart';
import 'orders_provider.dart';

class OrdersScreen extends StatelessWidget {
  final String restaurantId;
  final String sessionId;

  const OrdersScreen({
    super.key,
    required this.restaurantId,
    required this.sessionId,
  });

  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider(
      create: (_) => OrdersProvider(
        apiService: OrdersApiService(),
        restaurantId: restaurantId,
        sessionId: sessionId,
      )..loadOrders(reset: true),
      child: const _OrdersView(),
    );
  }
}

class _OrdersView extends StatelessWidget {
  const _OrdersView();

  @override
  Widget build(BuildContext context) {
    return Consumer<OrdersProvider>(
      builder: (context, provider, _) {
        // Show order details if selected
        if (provider.selectedOrder != null) {
          return _OrderDetailsView(
            order: provider.selectedOrder!,
            onBack: provider.clearSelectedOrder,
          );
        }

        return Column(
          children: [
            _buildHeader(context, provider),
            _buildDateFilter(context, provider),
            const Divider(height: 1),
            Expanded(child: _buildOrdersList(context, provider)),
          ],
        );
      },
    );
  }

  Widget _buildHeader(BuildContext context, OrdersProvider provider) {
    return Padding(
      padding: const EdgeInsets.all(16.0),
      child: Row(
        children: [
          const Expanded(
            child: Text(
              'Order History',
              style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
            ),
          ),
          IconButton(
            tooltip: 'Refresh',
            onPressed: () => provider.loadOrders(reset: true),
            icon: const Icon(Icons.refresh),
          ),
        ],
      ),
    );
  }

  Widget _buildDateFilter(BuildContext context, OrdersProvider provider) {
    final dateFormat = DateFormat('MMM d, yyyy');

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      color: Theme.of(context).colorScheme.surfaceVariant.withOpacity(0.3),
      child: Row(
        children: [
          const Icon(Icons.filter_list, size: 20),
          const SizedBox(width: 12),
          const Text('Filter by date:'),
          const SizedBox(width: 12),
          OutlinedButton.icon(
            onPressed: () => _selectStartDate(context, provider),
            icon: const Icon(Icons.calendar_today, size: 16),
            label: Text(
              provider.startDate != null
                  ? dateFormat.format(provider.startDate!)
                  : 'Start Date',
            ),
          ),
          const SizedBox(width: 8),
          const Text('to'),
          const SizedBox(width: 8),
          OutlinedButton.icon(
            onPressed: () => _selectEndDate(context, provider),
            icon: const Icon(Icons.calendar_today, size: 16),
            label: Text(
              provider.endDate != null
                  ? dateFormat.format(provider.endDate!)
                  : 'End Date',
            ),
          ),
          if (provider.startDate != null || provider.endDate != null) ...[
            const SizedBox(width: 12),
            IconButton(
              tooltip: 'Clear Filter',
              onPressed: provider.clearDateFilter,
              icon: const Icon(Icons.clear),
            ),
          ],
          const Spacer(),
          Text(
            '${provider.orders.length} orders',
            style: TextStyle(color: Colors.grey.shade600),
          ),
        ],
      ),
    );
  }

  Future<void> _selectStartDate(
      BuildContext context, OrdersProvider provider) async {
    final date = await showDatePicker(
      context: context,
      initialDate: provider.startDate ?? DateTime.now().subtract(const Duration(days: 7)),
      firstDate: DateTime.now().subtract(const Duration(days: 90)),
      lastDate: DateTime.now(),
    );

    if (date != null) {
      await provider.setDateFilter(date, provider.endDate);
    }
  }

  Future<void> _selectEndDate(
      BuildContext context, OrdersProvider provider) async {
    final date = await showDatePicker(
      context: context,
      initialDate: provider.endDate ?? DateTime.now(),
      firstDate: provider.startDate ?? DateTime.now().subtract(const Duration(days: 90)),
      lastDate: DateTime.now(),
    );

    if (date != null) {
      await provider.setDateFilter(provider.startDate, date);
    }
  }

  Widget _buildOrdersList(BuildContext context, OrdersProvider provider) {
    if (provider.state == DataState.loading && provider.orders.isEmpty) {
      return const Center(child: CircularProgressIndicator());
    }

    if (provider.state == DataState.error && provider.orders.isEmpty) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.error_outline, size: 48, color: Colors.red),
            const SizedBox(height: 16),
            Text(provider.errorMessage ?? 'Failed to load orders'),
            const SizedBox(height: 12),
            ElevatedButton(
              onPressed: () => provider.loadOrders(reset: true),
              child: const Text('Retry'),
            ),
          ],
        ),
      );
    }

    if (provider.orders.isEmpty) {
      return const Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.receipt_long, size: 64, color: Colors.grey),
            SizedBox(height: 16),
            Text(
              'No orders found',
              style: TextStyle(fontSize: 16, color: Colors.grey),
            ),
            SizedBox(height: 8),
            Text(
              'Adjust your date filter to see more orders',
              style: TextStyle(color: Colors.grey),
            ),
          ],
        ),
      );
    }

    return NotificationListener<ScrollNotification>(
      onNotification: (notification) {
        if (notification is ScrollEndNotification &&
            notification.metrics.extentAfter < 100 &&
            provider.hasMore) {
          provider.loadMore();
        }
        return false;
      },
      child: ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: provider.orders.length + (provider.hasMore ? 1 : 0),
        itemBuilder: (context, index) {
          if (index == provider.orders.length) {
            return const Center(
              child: Padding(
                padding: EdgeInsets.all(16),
                child: CircularProgressIndicator(),
              ),
            );
          }

          final order = provider.orders[index];
          return _OrderCard(
            order: order,
            onTap: () => provider.loadOrderDetails(order.id),
          );
        },
      ),
    );
  }
}

class _OrderCard extends StatelessWidget {
  final OrderSummary order;
  final VoidCallback onTap;

  const _OrderCard({
    required this.order,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final dateFormat = DateFormat('MMM d, yyyy • h:mm a');
    final formattedDate = order.createdAtDateTime != null
        ? dateFormat.format(order.createdAtDateTime!)
        : 'Unknown date';

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            children: [
              // Order icon with status color
              Container(
                width: 48,
                height: 48,
                decoration: BoxDecoration(
                  color: _getStatusColor().withOpacity(0.1),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(
                  Icons.receipt_long,
                  color: _getStatusColor(),
                ),
              ),
              const SizedBox(width: 16),
              // Order details
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Text(
                          order.tableNumber != null
                              ? 'Table ${order.tableNumber}'
                              : 'Order',
                          style: const TextStyle(
                            fontWeight: FontWeight.bold,
                            fontSize: 16,
                          ),
                        ),
                        const SizedBox(width: 8),
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 8,
                            vertical: 2,
                          ),
                          decoration: BoxDecoration(
                            color: _getStatusColor().withOpacity(0.1),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Text(
                            order.status.toUpperCase(),
                            style: TextStyle(
                              fontSize: 10,
                              fontWeight: FontWeight.bold,
                              color: _getStatusColor(),
                            ),
                          ),
                        ),
                        const SizedBox(width: 8),
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 8,
                            vertical: 2,
                          ),
                          decoration: BoxDecoration(
                            color: _getPaymentColor().withOpacity(0.1),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Text(
                            order.paymentStatus.toUpperCase(),
                            style: TextStyle(
                              fontSize: 10,
                              fontWeight: FontWeight.bold,
                              color: _getPaymentColor(),
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Text(
                      formattedDate,
                      style: TextStyle(
                        color: Colors.grey.shade600,
                        fontSize: 13,
                      ),
                    ),
                    if (order.customerName != null)
                      Text(
                        order.customerName!,
                        style: const TextStyle(fontSize: 13),
                      ),
                  ],
                ),
              ),
              // Order summary
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Text(
                    '₹${order.totalAmount.toStringAsFixed(0)}',
                    style: const TextStyle(
                      fontWeight: FontWeight.bold,
                      fontSize: 18,
                    ),
                  ),
                  Text(
                    '${order.itemCount} items • ${order.cartCount} carts',
                    style: TextStyle(
                      color: Colors.grey.shade600,
                      fontSize: 12,
                    ),
                  ),
                ],
              ),
              const SizedBox(width: 8),
              const Icon(Icons.chevron_right),
            ],
          ),
        ),
      ),
    );
  }

  Color _getStatusColor() {
    switch (order.status.toLowerCase()) {
      case 'completed':
        return Colors.green;
      case 'active':
        return Colors.blue;
      case 'cancelled':
        return Colors.red;
      default:
        return Colors.grey;
    }
  }

  Color _getPaymentColor() {
    switch (order.paymentStatus.toLowerCase()) {
      case 'paid':
        return Colors.green;
      case 'pending':
        return Colors.orange;
      case 'failed':
        return Colors.red;
      default:
        return Colors.grey;
    }
  }
}

class _OrderDetailsView extends StatelessWidget {
  final OrderDetails order;
  final VoidCallback onBack;

  const _OrderDetailsView({
    required this.order,
    required this.onBack,
  });

  @override
  Widget build(BuildContext context) {
    final dateFormat = DateFormat('MMM d, yyyy • h:mm a');

    return Column(
      children: [
        // Header with back button
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: Theme.of(context).colorScheme.surfaceVariant.withOpacity(0.3),
          ),
          child: Row(
            children: [
              IconButton(
                onPressed: onBack,
                icon: const Icon(Icons.arrow_back),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      order.tableNumber != null
                          ? 'Order - Table ${order.tableNumber}'
                          : 'Order Details',
                      style: const TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    if (order.createdAt != null)
                      Text(
                        dateFormat.format(localTime(order.createdAt)!),
                        style: TextStyle(color: Colors.grey.shade600),
                      ),
                  ],
                ),
              ),
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Text(
                    '₹${order.totalAmount.toStringAsFixed(0)}',
                    style: const TextStyle(
                      fontSize: 24,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  Text(
                    '${order.totalItems} items',
                    style: TextStyle(color: Colors.grey.shade600),
                  ),
                ],
              ),
            ],
          ),
        ),
        // Customer info
        if (order.customerName != null || order.customerPhone != null)
          Container(
            padding: const EdgeInsets.all(16),
            child: Card(
              child: ListTile(
                leading: const Icon(Icons.person),
                title: Text(order.customerName ?? 'Guest'),
                subtitle:
                    order.customerPhone != null ? Text(order.customerPhone!) : null,
              ),
            ),
          ),
        // Carts list
        Expanded(
          child: ListView.builder(
            padding: const EdgeInsets.all(16),
            itemCount: order.carts.length,
            itemBuilder: (context, index) {
              final cart = order.carts[index];
              return _CartCard(cart: cart);
            },
          ),
        ),
      ],
    );
  }
}

class _CartCard extends StatelessWidget {
  final CartDetails cart;

  const _CartCard({required this.cart});

  @override
  Widget build(BuildContext context) {
    final dateFormat = DateFormat('h:mm a');
    final submittedTime = cart.submittedAt != null
        ? dateFormat.format(localTime(cart.submittedAt)!)
        : null;
    final servedTime = cart.servedAt != null
        ? dateFormat.format(localTime(cart.servedAt)!)
        : null;

    return Card(
      margin: const EdgeInsets.only(bottom: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Cart header
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Theme.of(context).colorScheme.primaryContainer.withOpacity(0.3),
              borderRadius: const BorderRadius.vertical(top: Radius.circular(12)),
            ),
            child: Row(
              children: [
                Text(
                  'Cart #${cart.cartNumber}',
                  style: const TextStyle(
                    fontWeight: FontWeight.bold,
                    fontSize: 16,
                  ),
                ),
                const SizedBox(width: 12),
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 8,
                    vertical: 2,
                  ),
                  decoration: BoxDecoration(
                    color: _getCartStatusColor(cart.status).withOpacity(0.1),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    cart.status.toUpperCase(),
                    style: TextStyle(
                      fontSize: 10,
                      fontWeight: FontWeight.bold,
                      color: _getCartStatusColor(cart.status),
                    ),
                  ),
                ),
                const Spacer(),
                if (submittedTime != null)
                  Text(
                    'Submitted: $submittedTime',
                    style: TextStyle(
                      fontSize: 12,
                      color: Colors.grey.shade600,
                    ),
                  ),
                if (servedTime != null) ...[
                  const SizedBox(width: 8),
                  Text(
                    '• Served: $servedTime',
                    style: TextStyle(
                      fontSize: 12,
                      color: Colors.grey.shade600,
                    ),
                  ),
                ],
              ],
            ),
          ),
          // Items
          ...cart.items.map((item) => ListTile(
                leading: CircleAvatar(
                  backgroundColor: Theme.of(context).colorScheme.primaryContainer,
                  child: Text(item.quantity.toString()),
                ),
                title: Text(item.name),
                subtitle: item.notes != null ? Text(item.notes!) : null,
                trailing: Text(
                  '₹${item.price.toStringAsFixed(0)}',
                  style: const TextStyle(fontWeight: FontWeight.bold),
                ),
              )),
          // Cart total
          if (cart.total != null)
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.grey.shade100,
                borderRadius:
                    const BorderRadius.vertical(bottom: Radius.circular(12)),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text(
                    'Cart Total',
                    style: TextStyle(fontWeight: FontWeight.bold),
                  ),
                  Text(
                    '₹${(cart.total!['finalPayableAmount'] as num?)?.toStringAsFixed(0) ?? '0'}',
                    style: const TextStyle(
                      fontWeight: FontWeight.bold,
                      fontSize: 16,
                    ),
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }

  Color _getCartStatusColor(String status) {
    switch (status.toLowerCase()) {
      case 'served':
        return Colors.green;
      case 'submitted':
      case 'pending':
        return Colors.orange;
      case 'cancelled':
        return Colors.red;
      default:
        return Colors.grey;
    }
  }
}

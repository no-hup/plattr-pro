import 'package:flutter/material.dart';

import '../../widgets/server_app_bar_configuration.dart';
import 'models/order_summary.dart';
import 'models/cart_item_summary.dart';
import 'repository/order_api_service.dart';
import 'orders_provider.dart';
import 'order_detail_screen.dart';

class OrdersHomeScreen extends StatefulWidget {
  final String restaurantId;
  final String sessionId;
  final ValueChanged<ServerAppBarConfiguration>? onAppBarConfigChanged;
  
  const OrdersHomeScreen({
    super.key,
    required this.restaurantId,
    required this.sessionId,
    this.onAppBarConfigChanged,
  });

  @override
  State<OrdersHomeScreen> createState() => _OrdersHomeScreenState();
}

class _OrdersHomeScreenState extends State<OrdersHomeScreen> with SingleTickerProviderStateMixin {
  late final ScrollController _scrollController;
  late final OrdersProvider _ordersProvider;
  late TabController _tabController;
  
  // Tab order: My Orders, Ready, Pending, Served, All Orders
  final List<OrderTab> _tabs = [
    OrderTab.myOrders,
    OrderTab.ready,
    OrderTab.pending,
    OrderTab.served,
    OrderTab.allOrders,
  ];
  
  @override
  void initState() {
    super.initState();
    _scrollController = ScrollController();
    _ordersProvider = OrdersProvider(apiService: OrderApiService());
    _tabController = TabController(length: _tabs.length, vsync: this);
    
    // Listen for state changes in the provider
    _ordersProvider.addListener(_handleProviderUpdate);
    
    // Fetch orders when screen is first loaded
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _fetchOrders();
      _updateAppBarConfig();
    });
  }
  
  @override
  void dispose() {
    _ordersProvider.removeListener(_handleProviderUpdate);
    _ordersProvider.dispose();
    _scrollController.dispose();
    _tabController.dispose();
    super.dispose();
  }
  
  void _handleProviderUpdate() {
    // Force rebuild when provider state changes
    setState(() {});
  }
  
  void _updateAppBarConfig() {
    widget.onAppBarConfigChanged?.call(
      ServerAppBarConfiguration(
        additionalActions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _refreshOrders,
            tooltip: 'Refresh Orders',
          ),
        ],
      ),
    );
  }
  
  Future<void> _fetchOrders() async {
    await Future.wait([
      _ordersProvider.fetchActiveOrders(
        restaurantId: widget.restaurantId,
        sessionId: widget.sessionId,
      ),
      _ordersProvider.fetchServedCarts(
        restaurantId: widget.restaurantId,
        sessionId: widget.sessionId,
      ),
    ]);
  }
  
  Future<void> _refreshOrders() async {
    await _ordersProvider.refreshOrders(
      restaurantId: widget.restaurantId,
      sessionId: widget.sessionId,
    );
  }
  
  String _getTabLabel(OrderTab tab) {
    switch (tab) {
      case OrderTab.myOrders:
        return 'My Orders';
      case OrderTab.ready:
        return 'Ready';
      case OrderTab.pending:
        return 'Pending';
      case OrderTab.served:
        return 'Served';
      case OrderTab.allOrders:
        return 'All Orders';
    }
  }
  
  List<OrderTab> _getVisibleTabs() {
    final tabs = [..._tabs];
    // Show "All Orders" only if uiFlags.showAllOrdersTab == true
    if (!_ordersProvider.uiFlags.showAllOrdersTab) {
      tabs.remove(OrderTab.allOrders);
    }
    return tabs;
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _ordersProvider,
      builder: (context, child) {
        final visibleTabs = _getVisibleTabs();
        
        // Adjust tab controller if needed
        if (_tabController.length != visibleTabs.length) {
          _tabController.dispose();
          _tabController = TabController(length: visibleTabs.length, vsync: this);
        }
        
        return Column(
          children: [
            // Category tabs
            Material(
              color: Theme.of(context).colorScheme.surface,
              elevation: 1,
              child: TabBar(
                controller: _tabController,
                isScrollable: true,
                tabAlignment: TabAlignment.start,
                tabs: visibleTabs.map((tab) => Tab(text: _getTabLabel(tab))).toList(),
                labelColor: Theme.of(context).colorScheme.primary,
                unselectedLabelColor: Theme.of(context).colorScheme.onSurfaceVariant,
                indicatorColor: Theme.of(context).colorScheme.primary,
              ),
            ),
            // Content
            Expanded(
              child: TabBarView(
                controller: _tabController,
                children: visibleTabs.map((tab) => _buildTabContent(tab)).toList(),
              ),
            ),
          ],
        );
      },
    );
  }
  
  Widget _buildTabContent(OrderTab tab) {
    // Handle different states
    switch (_ordersProvider.state) {
      case DataState.initial:
      case DataState.loading:
        if (!_ordersProvider.isRefreshing) {
          return const Center(child: CircularProgressIndicator());
        }
        return _buildCartGrid(tab, isRefreshing: true);
        
      case DataState.error:
        if (_ordersProvider.hasOrders) {
          return _buildCartGrid(tab, hasError: true);
        }
        return _buildErrorState(_ordersProvider.errorMessage);
        
      case DataState.loaded:
        final cards = _ordersProvider.getCardsForTab(tab);
        if (cards.isEmpty) {
          return _buildEmptyState(tab);
        }
        return _buildCartGrid(tab);
    }
  }
  
  Widget _buildCartGrid(OrderTab tab, {bool isRefreshing = false, bool hasError = false}) {
    final cards = _ordersProvider.getCardsForTab(tab);
    
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
                'Error: ${_ordersProvider.errorMessage ?? "Unknown error"}',
                style: const TextStyle(color: Colors.red),
              ),
            ),
          Expanded(
            child: GridView.builder(
              controller: _scrollController,
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.all(16),
              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: 2,
                childAspectRatio: 0.85,
                crossAxisSpacing: 12,
                mainAxisSpacing: 12,
              ),
              itemCount: cards.length,
              itemBuilder: (context, index) {
                return _buildCartCard(cards[index]);
              },
            ),
          ),
        ],
      ),
    );
  }
  
  Widget _buildCartCard(CartCard card) {
    final maxItems = _ordersProvider.uiFlags.maxItemsInOrderCard;
    final displayItems = card.items.take(maxItems).toList();
    final hasMoreItems = card.items.length > maxItems;
    
    // Parse cart status color
    final borderColor = card.cartStatusColorHex.isNotEmpty
        ? StatusColors.parseHexColor(card.cartStatusColorHex)
        : StatusColors.getColorForStatus(parseCartStatus(card.cartStatus));
    
    return GestureDetector(
      onTap: () => _navigateToOrderDetail(card),
      onLongPress: () => _handleLongPress(card),
      child: Container(
        decoration: BoxDecoration(
          color: Theme.of(context).colorScheme.surface,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: borderColor, width: 2),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.08),
              blurRadius: 8,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Table number and Order ID
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: Theme.of(context).colorScheme.primaryContainer,
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Text(
                      'T${card.tableId}',
                      style: TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 14,
                        color: Theme.of(context).colorScheme.onPrimaryContainer,
                      ),
                    ),
                  ),
                  Text(
                    '#${_shortenOrderId(card.orderId)}',
                    style: TextStyle(
                      fontSize: 12,
                      color: Theme.of(context).colorScheme.onSurfaceVariant,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              
              // Total price
              Text(
                '₹${card.finalPrice.toStringAsFixed(0)}',
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                  color: Theme.of(context).colorScheme.onSurface,
                ),
              ),
              const SizedBox(height: 8),
              
              // Items list
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    ...displayItems.map((item) => _buildItemRow(item)),
                    if (hasMoreItems)
                      Padding(
                        padding: const EdgeInsets.only(top: 4),
                        child: Text(
                          '+${card.items.length - maxItems} more...',
                          style: TextStyle(
                            fontSize: 11,
                            fontStyle: FontStyle.italic,
                            color: Theme.of(context).colorScheme.onSurfaceVariant,
                          ),
                        ),
                      ),
                  ],
                ),
              ),
              
              // Status chip
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: borderColor.withOpacity(0.15),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Text(
                  mapCartStatusToDisplay(card.cartStatus),
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w500,
                    color: borderColor,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
  
  Widget _buildItemRow(CartItemSummary item) {
    // Parse item status color
    final textColor = item.statusColorHex.isNotEmpty
        ? StatusColors.parseHexColor(item.statusColorHex)
        : StatusColors.getColorForStatus(parseCartStatus(item.status));
    
    return Padding(
      padding: const EdgeInsets.only(bottom: 2),
      child: Text(
        '${item.quantity}× ${item.name}',
        style: TextStyle(
          fontSize: 12,
          color: textColor,
        ),
        maxLines: 1,
        overflow: TextOverflow.ellipsis,
      ),
    );
  }
  
  String _shortenOrderId(String orderId) {
    // Return last 6 characters or the whole ID if shorter
    if (orderId.length <= 6) return orderId;
    return orderId.substring(orderId.length - 6);
  }
  
  void _handleLongPress(CartCard card) async {
    // Don't allow marking already served carts
    if (normalizeCartStatus(card.cartStatus) == 'SERVED') {
      return;
    }
    
    final confirmAction = _ordersProvider.uiFlags.confirmServeCartAction;
    
    if (confirmAction) {
      // Show confirmation dialog
      final confirmed = await showDialog<bool>(
        context: context,
        builder: (context) => AlertDialog(
          title: const Text('Mark as Served'),
          content: Text(
            'Mark this cart from Table ${card.tableId} as served?',
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(context).pop(false),
              child: const Text('Cancel'),
            ),
            FilledButton(
              onPressed: () => Navigator.of(context).pop(true),
              child: const Text('Mark Served'),
            ),
          ],
        ),
      );
      
      if (confirmed != true) return;
    }
    
    // Mark as served
    final success = await _ordersProvider.markCartAsServed(
      restaurantId: widget.restaurantId,
      orderId: card.orderId,
      cartIndex: card.cartIndex,
      sessionId: widget.sessionId,
    );
    
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            success 
              ? 'Cart marked as served' 
              : 'Failed to mark cart as served',
          ),
          backgroundColor: success ? Colors.green : Colors.red,
        ),
      );
    }
  }
  
  void _navigateToOrderDetail(CartCard card) {
    Navigator.push(context, MaterialPageRoute(
      builder: (context) => OrderDetailScreen(
        restaurantId: widget.restaurantId,
        sessionId: widget.sessionId,
        orderId: card.orderId,
      ),
    ));
  }
  
  Widget _buildEmptyState(OrderTab tab) {
    String message;
    switch (tab) {
      case OrderTab.ready:
        message = 'No carts ready for pickup';
        break;
      case OrderTab.pending:
        message = 'No pending carts';
        break;
      case OrderTab.served:
        message = 'No recently served carts';
        break;
      default:
        message = 'No active orders';
    }
    
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            Icons.receipt_long, 
            size: 64, 
            color: Theme.of(context).colorScheme.onSurfaceVariant.withOpacity(0.5),
          ),
          const SizedBox(height: 16),
          Text(
            message,
            style: TextStyle(
              fontSize: 18, 
              fontWeight: FontWeight.bold,
              color: Theme.of(context).colorScheme.onSurfaceVariant,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'Pull down to refresh',
            style: TextStyle(
              color: Theme.of(context).colorScheme.onSurfaceVariant.withOpacity(0.7),
            ),
          ),
          const SizedBox(height: 24),
          ElevatedButton.icon(
            onPressed: _refreshOrders,
            icon: const Icon(Icons.refresh),
            label: const Text('Refresh'),
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
          Icon(
            Icons.error_outline, 
            size: 64, 
            color: Theme.of(context).colorScheme.error,
          ),
          const SizedBox(height: 16),
          Text(
            'Failed to load orders',
            style: TextStyle(
              fontSize: 18, 
              fontWeight: FontWeight.bold,
              color: Theme.of(context).colorScheme.onSurface,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            errorMessage ?? 'Unknown error occurred',
            textAlign: TextAlign.center,
            style: TextStyle(color: Theme.of(context).colorScheme.error),
          ),
          const SizedBox(height: 24),
          ElevatedButton.icon(
            onPressed: _fetchOrders,
            icon: const Icon(Icons.refresh),
            label: const Text('Try Again'),
          ),
        ],
      ),
    );
  }
}

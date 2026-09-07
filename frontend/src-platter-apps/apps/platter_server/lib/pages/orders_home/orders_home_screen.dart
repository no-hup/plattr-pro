import 'package:flutter/material.dart';
import 'package:flutter_staggered_grid_view/flutter_staggered_grid_view.dart';

import '../../widgets/server_app_bar_configuration.dart';

import 'repository/order_api_service.dart';
import 'package:platter_core/platter_core.dart';
import 'orders_provider.dart';
import 'models/order_summary.dart';
import 'order_detail_screen.dart';
import '../../widgets/order_card.dart';
import '../../widgets/state_views.dart';
import '../../shared/status_utils.dart';

class OrdersHomeScreen extends StatefulWidget {
  final String restaurantId;
  final String sessionId;
  final bool isActiveTab;
  final ValueChanged<ServerAppBarConfiguration>? onAppBarConfigChanged;

  const OrdersHomeScreen({
    super.key,
    required this.restaurantId,
    required this.sessionId,
    this.isActiveTab = true,
    this.onAppBarConfigChanged,
  });

  @override
  State<OrdersHomeScreen> createState() => _OrdersHomeScreenState();
}

class _OrdersHomeScreenState extends State<OrdersHomeScreen>
    with SingleTickerProviderStateMixin, WidgetsBindingObserver {
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
    WidgetsBinding.instance.addObserver(this);

    // Served carts are not polled — refresh them when the Served tab opens.
    _tabController.addListener(_handleTabChange);

    WidgetsBinding.instance.addPostFrameCallback((_) {
      // Only the visible bottom-nav tab polls; MainNavigation flips
      // isActiveTab and didUpdateWidget starts/stops accordingly.
      if (widget.isActiveTab) _startPolling();
      _ordersProvider.fetchServedCarts(
        restaurantId: widget.restaurantId,
        sessionId: widget.sessionId,
      );
      _updateAppBarConfig();
    });
  }

  /// Immediate fetch + periodic background polls (provider owns the timer).
  void _startPolling() {
    _ordersProvider.startPolling(
      restaurantId: widget.restaurantId,
      sessionId: widget.sessionId,
    );
  }

  @override
  void didUpdateWidget(covariant OrdersHomeScreen oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.isActiveTab != oldWidget.isActiveTab) {
      if (widget.isActiveTab) {
        _startPolling();
      } else {
        _ordersProvider.stopPolling();
      }
    }
  }

  void _handleTabChange() {
    // Index into the FILTERED tab list — the controller's length can differ
    // from _tabs when uiFlags hide tabs.
    final visibleTabs = _getVisibleTabs();
    if (!_tabController.indexIsChanging &&
        _tabController.index < visibleTabs.length &&
        visibleTabs[_tabController.index] == OrderTab.served) {
      _ordersProvider.fetchServedCarts(
        restaurantId: widget.restaurantId,
        sessionId: widget.sessionId,
      );
    }
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    // Don't poll while backgrounded; refresh immediately on return.
    // Only `paused` counts as backgrounded — `inactive` fires on transient
    // focus loss (iOS/web) and would churn the timer.
    if (state == AppLifecycleState.resumed) {
      if (mounted && widget.isActiveTab) _startPolling();
    } else if (state == AppLifecycleState.paused) {
      _ordersProvider.stopPolling();
    }
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _tabController.removeListener(_handleTabChange);
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

        // Adjust tab controller if needed (re-attach the served-tab listener —
        // it dies with the disposed controller)
        if (_tabController.length != visibleTabs.length) {
          _tabController.dispose();
          _tabController =
              TabController(length: visibleTabs.length, vsync: this)
                ..addListener(_handleTabChange);
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
                tabs: visibleTabs
                    .map((tab) => Tab(text: _getTabLabel(tab)))
                    .toList(),
                labelColor: Theme.of(context).colorScheme.primary,
                unselectedLabelColor:
                    Theme.of(context).colorScheme.onSurfaceVariant,
                indicatorColor: Theme.of(context).colorScheme.primary,
              ),
            ),
            // Content
            Expanded(
              child: TabBarView(
                controller: _tabController,
                children:
                    visibleTabs.map((tab) => _buildTabContent(tab)).toList(),
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

  Widget _buildCartGrid(OrderTab tab,
      {bool isRefreshing = false, bool hasError = false}) {
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
            child: MasonryGridView.count(
              controller: _scrollController,
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.all(16),
              crossAxisCount: 2,
              crossAxisSpacing: 12,
              mainAxisSpacing: 12,
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
    // Parse cart status color
    final statusColor = card.cartStatusColorHex.isNotEmpty
        ? StatusColors.parseHexColor(card.cartStatusColorHex)
        : StatusColors.getColorForStatus(
            StatusUtils.parseCartStatus(card.cartStatus));

    return OrderCard(
      tableId: card.tableId,
      orderId: card.orderId,
      price: '₹${card.finalPrice.toStringAsFixed(0)}',
      status: StatusUtils.mapCartStatusToDisplay(card.cartStatus),
      statusColor: statusColor,
      items: card.items,
      maxItems: _ordersProvider.uiFlags.maxItemsInOrderCard,
      onTap: () => _navigateToOrderDetail(card),
      onLongPress: () => _handleLongPress(card),
    );
  }

  void _handleLongPress(CartCard card) async {
    // Don't allow marking already served carts
    if (StatusUtils.normalizeCartStatus(card.cartStatus) == 'SERVED') {
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
            success ? 'Cart marked as served' : 'Failed to mark cart as served',
          ),
          backgroundColor: success ? Colors.green : Colors.red,
        ),
      );
    }
  }

  void _navigateToOrderDetail(CartCard card) {
    Navigator.push(
        context,
        MaterialPageRoute(
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

    return EmptyStateWidget(
      icon: Icons.receipt_long,
      title: message,
      subtitle: 'Pull down to refresh',
      onRefresh: _refreshOrders,
    );
  }

  Widget _buildErrorState(String? errorMessage) {
    return ErrorStateWidget(
      message: errorMessage ?? 'Unknown error occurred',
      onRetry: _startPolling,
    );
  }
}

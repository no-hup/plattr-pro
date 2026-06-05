import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_staggered_grid_view/flutter_staggered_grid_view.dart';

import '../../widgets/server_app_bar_configuration.dart';
import 'repository/table_api_service.dart';
import 'package:platter_core/platter_core.dart';
import 'tables_provider.dart';
import 'models/table_models.dart';
import 'table_detail_dialog.dart';
import '../../widgets/table_card.dart';
import '../../widgets/state_views.dart';

class TablesHomeScreen extends StatefulWidget {
  final String restaurantId;
  final String sessionId;
  final bool isActiveTab;
  final ValueChanged<ServerAppBarConfiguration>? onAppBarConfigChanged;

  const TablesHomeScreen({
    super.key,
    required this.restaurantId,
    required this.sessionId,
    this.isActiveTab = false,
    this.onAppBarConfigChanged,
  });

  @override
  State<TablesHomeScreen> createState() => _TablesHomeScreenState();
}

class _TablesHomeScreenState extends State<TablesHomeScreen> {
  late final ScrollController _scrollController;
  late final TablesProvider _tablesProvider;
  Timer? _autoRefreshTimer;

  static const _autoRefreshInterval = kDebugMode
      ? Duration(seconds: 10)
      : Duration(seconds: 60);

  @override
  void initState() {
    super.initState();
    _scrollController = ScrollController();
    _tablesProvider = TablesProvider(apiService: TableApiService());

    // Listen for state changes in the provider
    _tablesProvider.addListener(_handleProviderUpdate);

    // Fetch tables when screen is first loaded
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _fetchTables();
      _updateAppBarConfig();
    });

    if (widget.isActiveTab) _startPolling();
  }

  @override
  void didUpdateWidget(covariant TablesHomeScreen oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.isActiveTab != oldWidget.isActiveTab) {
      if (widget.isActiveTab) {
        _startPolling();
        _fetchTables();
      } else {
        _stopPolling();
      }
    }
  }

  @override
  void dispose() {
    _autoRefreshTimer?.cancel();
    _tablesProvider.removeListener(_handleProviderUpdate);
    _tablesProvider.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  void _startPolling() {
    _autoRefreshTimer?.cancel();
    _autoRefreshTimer = Timer.periodic(_autoRefreshInterval, (_) {
      _pollTables();
    });
  }

  void _stopPolling() {
    _autoRefreshTimer?.cancel();
    _autoRefreshTimer = null;
  }

  Future<void> _pollTables() async {
    await _fetchTables();
    if (_tablesProvider.state == DataState.error && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            _tablesProvider.errorMessage ?? 'Failed to refresh tables',
          ),
          duration: const Duration(seconds: 3),
        ),
      );
    }
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
            onPressed: _refreshTables,
            tooltip: 'Refresh Tables',
          ),
        ],
      ),
    );
  }

  Future<void> _fetchTables() async {
    await _tablesProvider.fetchTables(
      restaurantId: widget.restaurantId,
    );
  }

  Future<void> _refreshTables() async {
    await _tablesProvider.refreshTables(
      restaurantId: widget.restaurantId,
    );
  }

  @override
  Widget build(BuildContext context) {
    // No Scaffold - shell provides it
    return _buildContent(_tablesProvider);
  }

  Widget _buildContent(TablesProvider provider) {
    // Handle different states
    switch (provider.state) {
      case DataState.initial:
      case DataState.loading:
        if (!provider.isRefreshing) {
          return const Center(child: CircularProgressIndicator());
        }
        // Fall through to show content with refresh indicator
        return _buildTableList(provider, isRefreshing: true);

      case DataState.error:
        if (provider.hasTables) {
          // Show error but still display tables
          return _buildTableList(provider, hasError: true);
        }
        return _buildErrorState(provider.errorMessage);

      case DataState.loaded:
        if (!provider.hasTables) {
          return _buildEmptyState();
        }
        return _buildTableList(provider);
    }
  }

  Widget _buildTableList(TablesProvider provider,
      {bool isRefreshing = false, bool hasError = false}) {
    return RefreshIndicator(
      onRefresh: _refreshTables,
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
          Expanded(
            child: MasonryGridView.count(
              controller: _scrollController,
              padding: const EdgeInsets.all(16),
              physics: const AlwaysScrollableScrollPhysics(),
              crossAxisCount: 2,
              crossAxisSpacing: 12,
              mainAxisSpacing: 12,
              itemCount: provider.tables.length,
              itemBuilder: (context, index) {
                return _buildTableItem(provider.tables[index]);
              },
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTableItem(TableModel table) {
    return TableCard(
      table: table,
      onTap: () => _showTableDetails(table),
    );
  }

  Future<void> _showTableDetails(TableModel table) async {
    // First set as selected table in provider
    _tablesProvider.setSelectedTable(table);

    // Show the table detail dialog
    await showDialog(
      context: context,
      builder: (context) => TableDetailDialog(
        restaurantId: widget.restaurantId,
        sessionId: widget.sessionId,
        tableId: table.tableId,
        tablesProvider: _tablesProvider,
      ),
    );

    // Clear selected table when dialog is closed
    _tablesProvider.clearSelectedTable();
  }

  Widget _buildEmptyState() {
    return EmptyStateWidget(
      icon: Icons.table_bar,
      title: 'No tables available',
      subtitle: 'Tables will appear here once added',
      onRefresh: _refreshTables,
    );
  }

  Widget _buildErrorState(String? errorMessage) {
    return ErrorStateWidget(
      message: errorMessage ?? 'Unknown error occurred',
      onRetry: _fetchTables,
    );
  }
}

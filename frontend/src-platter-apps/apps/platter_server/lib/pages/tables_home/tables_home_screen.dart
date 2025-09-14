import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import 'repository/table_api_service.dart';
import 'tables_provider.dart';
import 'models/table_models.dart';
import 'table_detail_dialog.dart';

class TablesHomeScreen extends StatefulWidget {
  final String restaurantId;
  final String sessionId;
  
  const TablesHomeScreen({
    Key? key,
    required this.restaurantId,
    required this.sessionId,
  }) : super(key: key);

  @override
  State<TablesHomeScreen> createState() => _TablesHomeScreenState();
}

class _TablesHomeScreenState extends State<TablesHomeScreen> {
  late final ScrollController _scrollController;
  late final TablesProvider _tablesProvider;
  
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
    });
  }
  
  @override
  void dispose() {
    _tablesProvider.removeListener(_handleProviderUpdate);
    _tablesProvider.dispose();
    _scrollController.dispose();
    super.dispose();
  }
  
  void _handleProviderUpdate() {
    // Force rebuild when provider state changes
    setState(() {});
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
    return Scaffold(
      appBar: AppBar(
        title: const Text('Tables'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _refreshTables,
          ),
        ],
      ),
      body: _buildContent(_tablesProvider),
    );
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
  
  Widget _buildTableList(TablesProvider provider, {bool isRefreshing = false, bool hasError = false}) {
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
            child: GridView.builder(
              controller: _scrollController,
              padding: const EdgeInsets.all(16),
              physics: const AlwaysScrollableScrollPhysics(),
              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: 2,
                crossAxisSpacing: 16,
                mainAxisSpacing: 16,
                childAspectRatio: 1.5,
              ),
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
    // Determine background color based on status
    Color backgroundColor;
    Icon statusIcon;
    
    switch (table.status.toLowerCase()) {
      case 'active':
        backgroundColor = Colors.green.shade100;
        statusIcon = const Icon(Icons.restaurant, color: Colors.green);
        break;
      case 'vacant':
        backgroundColor = Colors.blue.shade100;
        statusIcon = const Icon(Icons.chair, color: Colors.blue);
        break;
      case 'reserved':
        backgroundColor = Colors.orange.shade100;
        statusIcon = const Icon(Icons.bookmark, color: Colors.orange);
        break;
      case 'disabled':
        backgroundColor = Colors.grey.shade300;
        statusIcon = const Icon(Icons.block, color: Colors.grey);
        break;
      default:
        backgroundColor = Colors.grey.shade100;
        statusIcon = const Icon(Icons.help_outline, color: Colors.grey);
    }
    
    return GestureDetector(
      onTap: () => _showTableDetails(table),
      child: Card(
        color: backgroundColor,
        elevation: 2,
        child: Padding(
          padding: const EdgeInsets.all(12.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'Table ${table.tableId}',
                    style: const TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  statusIcon,
                ],
              ),
              const Spacer(),
              Text(
                'Capacity: ${table.capacity}',
                style: const TextStyle(fontSize: 14),
              ),
              const SizedBox(height: 4),
              Text(
                'Status: ${table.status}',
                style: const TextStyle(fontSize: 14),
              ),
              if (table.currentOrderId.isNotEmpty) ...[
                const SizedBox(height: 4),
                Text(
                  'Active Order: ${table.currentOrderId}',
                  style: const TextStyle(fontSize: 14),
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ],
          ),
        ),
      ),
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
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Icon(Icons.table_bar, size: 64, color: Colors.grey),
          const SizedBox(height: 16),
          const Text(
            'No tables available',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 8),
          const Text(
            'Tables will appear here once added',
            style: TextStyle(color: Colors.grey),
          ),
          const SizedBox(height: 24),
          ElevatedButton(
            onPressed: _refreshTables,
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
            'Failed to load tables',
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
            onPressed: _fetchTables,
            child: const Text('Try Again'),
          ),
        ],
      ),
    );
  }
} 
import 'package:flutter/material.dart';
import 'add_dishes_screen.dart';
import 'package:provider/provider.dart';

import 'tables_provider.dart';
import '../orders_home/repository/order_api_service.dart';
import 'models/table_models.dart';
import '../orders_home/order_detail_screen.dart';

class TableDetailDialog extends StatefulWidget {
  final String restaurantId;
  final String sessionId;
  final String tableId;
  final TablesProvider tablesProvider;

  const TableDetailDialog({
    Key? key,
    required this.restaurantId,
    required this.sessionId,
    required this.tableId,
    required this.tablesProvider,
  }) : super(key: key);

  @override
  State<TableDetailDialog> createState() => _TableDetailDialogState();
}

class _TableDetailDialogState extends State<TableDetailDialog> {
  bool _isUpdatingStatus = false;
  bool _isRefreshingOtp = false;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _fetchTableDetails();
  }

  Future<void> _fetchTableDetails() async {
    await widget.tablesProvider.getTableDetails(
      restaurantId: widget.restaurantId,
      tableId: widget.tableId,
    );
  }

  Future<void> _updateTableStatus(String status) async {
    setState(() {
      _isUpdatingStatus = true;
      _errorMessage = null;
    });

    final success = await widget.tablesProvider.updateTableStatus(
      restaurantId: widget.restaurantId,
      tableId: widget.tableId,
      status: status,
      sessionId: widget.sessionId,
    );

    setState(() {
      _isUpdatingStatus = false;
      if (!success) {
        _errorMessage =
            widget.tablesProvider.errorMessage ?? 'Failed to update status';
      }
    });

    if (success) {
      Navigator.of(context).pop();
    }
  }

  Future<void> _refreshTableOtp() async {
    setState(() {
      _isRefreshingOtp = true;
      _errorMessage = null;
    });

    final newOtp = await widget.tablesProvider.refreshTableOtp(
      restaurantId: widget.restaurantId,
      tableId: widget.tableId,
      sessionId: widget.sessionId,
    );

    setState(() {
      _isRefreshingOtp = false;
      if (newOtp == null) {
        _errorMessage = widget.tablesProvider.errorMessage ??
            'Failed to generate table OTP';
      }
    });
  }

  /// OR-S1: punch a round for this table with no guest scan. Returns to the tables list.
  Future<void> _addDishes(TableModel table) async {
    Navigator.of(context).pop();
    final sent = await Navigator.push<bool>(
      context,
      MaterialPageRoute(
        builder: (context) => AddDishesScreen(
          restaurantId: widget.restaurantId,
          sessionId: widget.sessionId,
          table: table,
        ),
      ),
    );
    if (sent == true) {
      widget.tablesProvider.refreshTables(restaurantId: widget.restaurantId);
    }
  }

  Future<void> _viewOrderDetails(String orderId) async {
    Navigator.of(context).pop(); // Close dialog first

    await Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => OrderDetailScreen(
          restaurantId: widget.restaurantId,
          sessionId: widget.sessionId,
          orderId: orderId,
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final selectedTable = widget.tablesProvider.selectedTable;
    if (selectedTable == null) {
      return const AlertDialog(
        title: Text('Table Details'),
        content: Center(
          child: CircularProgressIndicator(),
        ),
      );
    }

    return AlertDialog(
      title: Text('Table ${selectedTable.tableId}'),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (_errorMessage != null)
            Container(
              padding: const EdgeInsets.all(8.0),
              margin: const EdgeInsets.only(bottom: 16.0),
              decoration: BoxDecoration(
                color: Colors.red.shade100,
                borderRadius: BorderRadius.circular(4),
              ),
              child: Text(
                _errorMessage!,
                style: const TextStyle(color: Colors.red),
              ),
            ),
          _buildInfoRow('Status', selectedTable.status),
          _buildInfoRow('Capacity', selectedTable.capacity.toString()),
          if (selectedTable.customerName != null)
            _buildInfoRow('Customer', selectedTable.customerName!),
          const Divider(),
          _buildOtpSection(selectedTable),
          if (selectedTable.currentOrderId.isNotEmpty) ...[
            const Divider(),
            _buildActiveOrderSection(selectedTable),
          ],
          const Divider(),
          const Text(
            'Change Table Status:',
            style: TextStyle(fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 16),
          _buildStatusButtons(selectedTable),
        ],
      ),
      actions: [
        if (!selectedTable.isDisabled &&
            selectedTable.status.toLowerCase() != 'disabled')
          Semantics(
            identifier: 'table-add-dishes',
            child: ElevatedButton.icon(
              icon: const Icon(Icons.add),
              label: const Text('Add dishes'),
              onPressed: () => _addDishes(selectedTable),
            ),
          ),
        TextButton(
          onPressed: () => Navigator.of(context).pop(),
          child: const Text('Close'),
        ),
      ],
    );
  }

  Widget _buildInfoRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4.0),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            '$label:',
            style: const TextStyle(fontWeight: FontWeight.bold),
          ),
          Text(value),
        ],
      ),
    );
  }

  Widget _buildOtpSection(TableModel table) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Table OTP:',
          style: TextStyle(fontWeight: FontWeight.bold),
        ),
        const SizedBox(height: 8),
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              table.tableOtp.isEmpty ? 'No OTP' : table.tableOtp,
              style: const TextStyle(fontSize: 16),
            ),
            _isRefreshingOtp
                ? const SizedBox(
                    width: 24,
                    height: 24,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : Semantics(
                    identifier: 'table-refresh-otp',
                    child: IconButton(
                      icon: const Icon(Icons.refresh),
                      onPressed: _refreshTableOtp,
                      tooltip: 'Refresh OTP',
                    ),
                  ),
          ],
        ),
      ],
    );
  }

  Widget _buildActiveOrderSection(TableModel table) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Active Order:',
          style: TextStyle(fontWeight: FontWeight.bold),
        ),
        const SizedBox(height: 8),
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Expanded(
              child: Text(
                'Order #${table.currentOrderId}',
                overflow: TextOverflow.ellipsis,
              ),
            ),
            Semantics(
              identifier: 'table-view-order',
              child: TextButton.icon(
                icon: const Icon(Icons.visibility),
                label: const Text('View'),
                onPressed: () => _viewOrderDetails(table.currentOrderId),
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildStatusButtons(TableModel table) {
    final currentStatus = table.status.toLowerCase();

    return _isUpdatingStatus
        ? const Center(child: CircularProgressIndicator())
        : Wrap(
            spacing: 8.0,
            runSpacing: 8.0,
            alignment: WrapAlignment.center,
            children: [
              if (currentStatus != 'vacant')
                _buildStatusButton(
                  'Vacant',
                  Colors.blue,
                  () => _updateTableStatus('vacant'),
                ),
              if (currentStatus != 'active')
                _buildStatusButton(
                  'Active',
                  Colors.green,
                  () => _updateTableStatus('active'),
                ),
              // Reserved = staff-held (PRD 16.1). Customers scanning this table's QR are
              // refused with "ask the staff to seat you"; set it back to Vacant to seat a
              // party. A party already seated here is not evicted.
              if (currentStatus != 'reserved')
                _buildStatusButton(
                  'Reserved',
                  Colors.orange,
                  () => _updateTableStatus('reserved'),
                ),
              if (currentStatus != 'disabled')
                _buildStatusButton(
                  'Disabled',
                  Colors.grey,
                  () => _updateTableStatus('disabled'),
                ),
            ],
          );
  }

  Widget _buildStatusButton(String label, Color color, VoidCallback onPressed) {
    return Semantics(
      identifier: 'table-status-${label.toLowerCase()}',
      child: ElevatedButton(
        onPressed: onPressed,
        style: ElevatedButton.styleFrom(
          backgroundColor: color,
          foregroundColor: Colors.white,
        ),
        child: Text(label),
      ),
    );
  }
}

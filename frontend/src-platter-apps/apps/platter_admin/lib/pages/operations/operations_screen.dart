import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:platter_core/platter_core.dart';
import 'tables_api_service.dart';
import 'tables_provider.dart';

class OperationsScreen extends StatelessWidget {
  final String restaurantId;
  final String sessionId;

  const OperationsScreen({
    super.key,
    required this.restaurantId,
    required this.sessionId,
  });

  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider(
      create: (_) => TablesProvider(
        apiService: TablesApiService(),
        restaurantId: restaurantId,
        sessionId: sessionId,
      )..loadTables(),
      child: const _OperationsView(),
    );
  }
}

class _OperationsView extends StatelessWidget {
  const _OperationsView();

  @override
  Widget build(BuildContext context) {
    return Consumer<TablesProvider>(
      builder: (context, provider, _) {
        if (provider.state == DataState.loading && provider.tables.isEmpty) {
          return const Center(child: CircularProgressIndicator());
        }

        if (provider.state == DataState.error && provider.tables.isEmpty) {
          return Center(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(Icons.error_outline, size: 48, color: Colors.red),
                const SizedBox(height: 16),
                Text(provider.errorMessage ?? 'Failed to load tables'),
                const SizedBox(height: 12),
                ElevatedButton(
                  onPressed: provider.loadTables,
                  child: const Text('Retry'),
                ),
              ],
            ),
          );
        }

        return Column(
          children: [
            _buildHeader(context, provider),
            _buildStats(provider),
            const Divider(),
            Expanded(child: _buildTableGrid(context, provider)),
          ],
        );
      },
    );
  }

  Widget _buildHeader(BuildContext context, TablesProvider provider) {
    return Padding(
      padding: const EdgeInsets.all(16.0),
      child: Row(
        children: [
          const Expanded(
            child: Text(
              'Tables & Floor Management',
              style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
            ),
          ),
          IconButton(
            tooltip: 'Refresh',
            onPressed: provider.loadTables,
            icon: const Icon(Icons.refresh),
          ),
        ],
      ),
    );
  }

  Widget _buildStats(TablesProvider provider) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16.0),
      child: Row(
        children: [
          _StatCard(
            label: 'Total',
            value: provider.totalTables.toString(),
            color: Colors.blue,
            icon: Icons.table_bar,
          ),
          const SizedBox(width: 12),
          _StatCard(
            label: 'Occupied',
            value: provider.occupiedTables.toString(),
            color: Colors.orange,
            icon: Icons.people,
          ),
          const SizedBox(width: 12),
          _StatCard(
            label: 'Available',
            value: provider.availableTables.toString(),
            color: Colors.green,
            icon: Icons.check_circle,
          ),
          const SizedBox(width: 12),
          _StatCard(
            label: 'Disabled',
            value: provider.disabledTables.toString(),
            color: Colors.grey,
            icon: Icons.block,
          ),
        ],
      ),
    );
  }

  Widget _buildTableGrid(BuildContext context, TablesProvider provider) {
    if (provider.tables.isEmpty) {
      return const Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.table_bar, size: 64, color: Colors.grey),
            SizedBox(height: 16),
            Text(
              'No tables configured',
              style: TextStyle(fontSize: 16, color: Colors.grey),
            ),
          ],
        ),
      );
    }

    return LayoutBuilder(
      builder: (context, constraints) {
        final crossAxisCount = constraints.maxWidth > 800
            ? 4
            : constraints.maxWidth > 600
                ? 3
                : 2;

        return GridView.builder(
          padding: const EdgeInsets.all(16),
          gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: crossAxisCount,
            crossAxisSpacing: 12,
            mainAxisSpacing: 12,
            childAspectRatio: 1.2,
          ),
          itemCount: provider.tables.length,
          itemBuilder: (context, index) {
            final table = provider.tables[index];
            return _TableCard(
              table: table,
              onToggle: (enabled) =>
                  provider.toggleTableStatus(table.id, enabled),
              onEdit: () => _showEditTableDialog(context, provider, table),
            );
          },
        );
      },
    );
  }

  Future<void> _showEditTableDialog(
      BuildContext context, TablesProvider provider, TableInfo table) async {
    final result = await showDialog<_TableFormResult>(
      context: context,
      builder: (context) => _TableEditorDialog(table: table),
    );

    if (result == null) return;

    await provider.updateTable(
      tableId: table.id,
      number: result.number,
      capacity: result.capacity,
    );
  }
}

class _StatCard extends StatelessWidget {
  final String label;
  final String value;
  final Color color;
  final IconData icon;

  const _StatCard({
    required this.label,
    required this.value,
    required this.color,
    required this.icon,
  });

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: color.withOpacity(0.1),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: color.withOpacity(0.3)),
        ),
        child: Column(
          children: [
            Icon(icon, color: color, size: 28),
            const SizedBox(height: 8),
            Text(
              value,
              style: TextStyle(
                fontSize: 24,
                fontWeight: FontWeight.bold,
                color: color,
              ),
            ),
            Text(
              label,
              style: TextStyle(
                color: color.withOpacity(0.8),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _TableCard extends StatelessWidget {
  final TableInfo table;
  final Function(bool) onToggle;
  final VoidCallback onEdit;

  const _TableCard({
    required this.table,
    required this.onToggle,
    required this.onEdit,
  });

  @override
  Widget build(BuildContext context) {
    final statusColor = _getStatusColor();

    return Card(
      elevation: 2,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(color: statusColor, width: 2),
      ),
      child: InkWell(
        onTap: onEdit,
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 8,
                      vertical: 4,
                    ),
                    decoration: BoxDecoration(
                      color: statusColor.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(
                      table.label,
                      style: TextStyle(
                        fontSize: 10,
                        fontWeight: FontWeight.bold,
                        color: statusColor,
                      ),
                    ),
                  ),
                  if (table.canSwitch)
                    Switch(
                      value: !table.isDisabled,
                      onChanged: onToggle,
                      materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
                    ),
                ],
              ),
              const Spacer(),
              Icon(
                Icons.table_bar,
                size: 36,
                color: statusColor,
              ),
              const SizedBox(height: 8),
              Text(
                table.number,
                style: const TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                ),
              ),
              if (table.capacity != null)
                Text(
                  '${table.capacity} seats',
                  style: TextStyle(
                    fontSize: 12,
                    color: Colors.grey.shade600,
                  ),
                ),
              const Spacer(),
              if (table.primaryCustomer != null)
                Text(
                  table.primaryCustomer!.name ?? 'Guest',
                  style: const TextStyle(fontSize: 12),
                  overflow: TextOverflow.ellipsis,
                ),
            ],
          ),
        ),
      ),
    );
  }

  Color _getStatusColor() {
    if (table.isDisabled) return Colors.grey;
    if (table.isOccupied) return Colors.orange;
    if (table.isReserved) return Colors.blue;
    return Colors.green;
  }
}

class _TableFormResult {
  final String? number;
  final int? capacity;

  _TableFormResult({this.number, this.capacity});
}

class _TableEditorDialog extends StatefulWidget {
  final TableInfo table;

  const _TableEditorDialog({required this.table});

  @override
  State<_TableEditorDialog> createState() => _TableEditorDialogState();
}

class _TableEditorDialogState extends State<_TableEditorDialog> {
  late final TextEditingController _numberController;
  late final TextEditingController _capacityController;

  @override
  void initState() {
    super.initState();
    _numberController = TextEditingController(text: widget.table.number);
    _capacityController = TextEditingController(
      text: widget.table.capacity?.toString() ?? '',
    );
  }

  @override
  void dispose() {
    _numberController.dispose();
    _capacityController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: Text('Edit Table ${widget.table.number}'),
      content: SizedBox(
        width: 300,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Status info
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.grey.shade100,
                borderRadius: BorderRadius.circular(8),
              ),
              child: Row(
                children: [
                  Icon(
                    widget.table.isOccupied
                        ? Icons.people
                        : Icons.check_circle_outline,
                    color: widget.table.isOccupied ? Colors.orange : Colors.green,
                  ),
                  const SizedBox(width: 8),
                  Text(
                    widget.table.isOccupied
                        ? 'Currently Occupied'
                        : widget.table.isDisabled
                            ? 'Disabled'
                            : 'Available',
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),
            TextField(
              controller: _numberController,
              decoration: const InputDecoration(
                labelText: 'Table Number/Name',
                border: OutlineInputBorder(),
              ),
            ),
            const SizedBox(height: 16),
            TextField(
              controller: _capacityController,
              decoration: const InputDecoration(
                labelText: 'Seating Capacity',
                border: OutlineInputBorder(),
              ),
              keyboardType: TextInputType.number,
            ),
          ],
        ),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.of(context).pop(),
          child: const Text('Cancel'),
        ),
        ElevatedButton(
          onPressed: _submit,
          child: const Text('Save'),
        ),
      ],
    );
  }

  void _submit() {
    final number = _numberController.text.trim();
    final capacityStr = _capacityController.text.trim();
    final capacity = capacityStr.isNotEmpty ? int.tryParse(capacityStr) : null;

    Navigator.of(context).pop(_TableFormResult(
      number: number.isNotEmpty ? number : null,
      capacity: capacity,
    ));
  }
}

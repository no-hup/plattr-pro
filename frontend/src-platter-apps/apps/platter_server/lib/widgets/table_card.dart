import 'package:flutter/material.dart';
import '../pages/tables_home/models/table_models.dart';

/// A modern, minimal card for table status.
/// Eliminates full-background colors in favor of subtle indicators and cleaner typography.
class TableCard extends StatelessWidget {
  final TableModel table;
  final VoidCallback onTap;

  const TableCard({
    super.key,
    required this.table,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    // Determine status color (Status dot logic)
    Color statusColor;
    Color statusBgColor;

    switch (table.status.toLowerCase()) {
      case 'active':
        statusColor = Colors.green;
        statusBgColor = Colors.green.shade50;
        break;
      case 'vacant':
        statusColor = Colors.blue;
        statusBgColor = Colors.blue.shade50;
        break;
      case 'reserved':
        statusColor = Colors.orange;
        statusBgColor = Colors.orange.shade50;
        break;
      case 'disabled':
        statusColor = Colors.grey;
        statusBgColor = Colors.grey.shade100;
        break;
      default:
        statusColor = Colors.grey;
        statusBgColor = Colors.grey.shade50;
    }

    return Card(
      elevation: 0,
      clipBehavior: Clip.antiAlias,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(
          color: Theme.of(context)
              .colorScheme
              .outlineVariant
              .withValues(alpha: 0.3),
        ),
      ),
      child: InkWell(
        onTap: onTap,
        child: Stack(
          children: [
            // Status Indicator Bar (Left Side)
            Positioned(
              left: 0,
              top: 0,
              bottom: 0,
              width: 6,
              child: Container(color: statusColor),
            ),

            Padding(
              padding: const EdgeInsets.fromLTRB(
                  18, 12, 12, 12), // Left padding accounts for status bar
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  // --- Header: Table & Capacity ---
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Expanded(
                        child: Text(
                          'Table ${table.tableId}',
                          style:
                              Theme.of(context).textTheme.titleMedium?.copyWith(
                                    fontWeight: FontWeight.bold,
                                  ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      const SizedBox(width: 8),
                      // Capacity Badge
                      Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 6, vertical: 2),
                        decoration: BoxDecoration(
                          color: Theme.of(context)
                              .colorScheme
                              .surfaceContainerHighest,
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: Row(
                          children: [
                            Icon(Icons.people,
                                size: 14,
                                color: Theme.of(context)
                                    .colorScheme
                                    .onSurfaceVariant),
                            const SizedBox(width: 4),
                            Text(
                              '${table.capacity}',
                              style: Theme.of(context).textTheme.labelSmall,
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),

                  const SizedBox(height: 8),

                  // --- Status Details ---
                  // Wrap status in a pill for clarity
                  Container(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: statusBgColor,
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Text(
                      table.status.toUpperCase(),
                      style: Theme.of(context).textTheme.labelSmall?.copyWith(
                            color: statusColor,
                            fontWeight: FontWeight.bold,
                            letterSpacing: 0.5,
                          ),
                    ),
                  ),

                  // --- Active Order (Conditional) ---
                  if (table.currentOrderId.isNotEmpty) ...[
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        Icon(Icons.receipt_long,
                            size: 16,
                            color: Theme.of(context).colorScheme.primary),
                        const SizedBox(width: 4),
                        Expanded(
                          child: Text(
                            '#${_formatOrderId(table.currentOrderId)}',
                            style:
                                Theme.of(context).textTheme.bodySmall?.copyWith(
                                      fontFamily: 'RobotoMono',
                                      color: Theme.of(context)
                                          .colorScheme
                                          .onSurfaceVariant,
                                    ),
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                      ],
                    ),
                  ],
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  String _formatOrderId(String id) {
    if (id.length <= 6) return id;
    return id.substring(id.length - 6);
  }
}

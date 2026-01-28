import 'package:flutter/material.dart';
import '../../widgets/widgets.dart';
import '../../constants/kitchen_constants.dart';

/// Placeholder screen for History/Served Orders tab.
/// TODO: Implement actual history UI as per Task 07.
class HistoryScreen extends StatefulWidget {
  final String restaurantId;
  final String sessionId;
  final String? selectedCategory;

  const HistoryScreen({
    super.key,
    required this.restaurantId,
    required this.sessionId,
    this.selectedCategory,
  });

  @override
  State<HistoryScreen> createState() => _HistoryScreenState();
}

class _HistoryScreenState extends State<HistoryScreen> {
  // AutomaticKeepAliveClientMixin removed as IndexedStack handles state preservation

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.history,
              size: 80,
              color: theme.colorScheme.secondary,
            ),
            const SizedBox(height: 24),
            Text(
              'Order History',
              style: theme.textTheme.headlineMedium?.copyWith(
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 16),
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: theme.colorScheme.secondaryContainer,
                borderRadius: BorderRadius.circular(16),
              ),
              child: Column(
                children: [
                  Icon(
                    Icons.check_circle_outline,
                    size: 48,
                    color: theme.colorScheme.onSecondaryContainer,
                  ),
                  const SizedBox(height: 12),
                  Text(
                    'Served Orders',
                    style: theme.textTheme.titleMedium?.copyWith(
                      color: theme.colorScheme.onSecondaryContainer,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Completed orders (served within X hours)\nwill appear here.\nImplementation pending (Task 07)',
                    textAlign: TextAlign.center,
                    style: theme.textTheme.bodyMedium?.copyWith(
                      color: theme.colorScheme.onSecondaryContainer
                          .withValues(alpha: 0.8),
                    ),
                  ),
                ],
              ),
            ),
            if (widget.selectedCategory != null) ...[
              const SizedBox(height: 16),
              Chip(
                avatar: const Icon(Icons.filter_alt, size: 18),
                label: Text('Filter: ${widget.selectedCategory}'),
                backgroundColor: theme.colorScheme.tertiaryContainer,
              ),
            ],
            if (KitchenFeatureFlags.showDebugCards)
              DebugInfoCard(
                restaurantId: widget.restaurantId,
                sessionId: widget.sessionId,
              ),
          ],
        ),
      ),
    );
  }
}

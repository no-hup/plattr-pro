import 'package:flutter/material.dart';
import '../../widgets/widgets.dart';
import '../../constants/kitchen_constants.dart';

/// Placeholder screen for Live Orders tab.
/// TODO: Implement actual live orders UI as per Task 05.
class LiveOrdersScreen extends StatefulWidget {
  final String restaurantId;
  final String sessionId;
  final String? selectedCategory;

  const LiveOrdersScreen({
    super.key,
    required this.restaurantId,
    required this.sessionId,
    this.selectedCategory,
  });

  @override
  State<LiveOrdersScreen> createState() => _LiveOrdersScreenState();
}

class _LiveOrdersScreenState extends State<LiveOrdersScreen> {
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
              Icons.restaurant_menu,
              size: 80,
              color: theme.colorScheme.primary,
            ),
            const SizedBox(height: 24),
            Text(
              'Live Orders',
              style: theme.textTheme.headlineMedium?.copyWith(
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 16),
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: theme.colorScheme.primaryContainer,
                borderRadius: BorderRadius.circular(16),
              ),
              child: Column(
                children: [
                  Icon(
                    Icons.pending_actions,
                    size: 48,
                    color: theme.colorScheme.onPrimaryContainer,
                  ),
                  const SizedBox(height: 12),
                  Text(
                    'Live Kitchen Orders',
                    style: theme.textTheme.titleMedium?.copyWith(
                      color: theme.colorScheme.onPrimaryContainer,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Active orders will appear here.\nImplementation pending (Task 05)',
                    textAlign: TextAlign.center,
                    style: theme.textTheme.bodyMedium?.copyWith(
                      color: theme.colorScheme.onPrimaryContainer
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
                backgroundColor: theme.colorScheme.secondaryContainer,
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

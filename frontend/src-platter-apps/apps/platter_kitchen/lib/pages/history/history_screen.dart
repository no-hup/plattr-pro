import 'package:flutter/material.dart';

/// History is explicitly deferred in this phase.
///
/// Rendering this screen must not trigger any real backend calls and must
/// not pretend to be an empty results state. The copy reads "coming soon"
/// so future implementers do not mistake it for a working zero-results view.
class HistoryScreen extends StatelessWidget {
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
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    return Scaffold(
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(
                Icons.history_toggle_off,
                size: 56,
                color: colorScheme.onSurfaceVariant,
              ),
              const SizedBox(height: 16),
              Text(
                'History coming soon',
                style: Theme.of(context).textTheme.titleMedium,
              ),
              const SizedBox(height: 8),
              Text(
                'Kitchen history is not yet wired to the backend. '
                'This screen will be connected once the history workflow is designed.',
                textAlign: TextAlign.center,
                style: Theme.of(context)
                    .textTheme
                    .bodyMedium
                    ?.copyWith(color: colorScheme.onSurfaceVariant),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

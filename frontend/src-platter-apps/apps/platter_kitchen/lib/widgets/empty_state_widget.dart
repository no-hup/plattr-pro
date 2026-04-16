import 'package:flutter/material.dart';
import '../theme/design_system/kitchen_colors.dart';
import '../theme/design_system/kitchen_dimensions.dart';
import '../theme/design_system/kitchen_typography.dart';

/// A reusable empty state widget for when there's no data to display.
class EmptyStateWidget extends StatelessWidget {
  const EmptyStateWidget({
    super.key,
    required this.icon,
    required this.title,
    this.subtitle,
    this.action,
  });

  final IconData icon;
  final String title;
  final String? subtitle;
  final Widget? action;

  /// Factory for "No orders" empty state
  factory EmptyStateWidget.noOrders({VoidCallback? onRefresh}) {
    return EmptyStateWidget(
      icon: Icons.receipt_long_outlined,
      title: 'No orders yet',
      subtitle: 'New orders will appear here automatically',
      action: onRefresh != null
          ? TextButton.icon(
              onPressed: onRefresh,
              icon: const Icon(Icons.refresh),
              label: const Text('Refresh'),
            )
          : null,
    );
  }

  /// Factory for "No history" empty state
  factory EmptyStateWidget.noHistory() {
    return const EmptyStateWidget(
      icon: Icons.history,
      title: 'No order history',
      subtitle: 'Completed orders will appear here',
    );
  }

  /// Factory for network error empty state
  factory EmptyStateWidget.error({
    required String message,
    VoidCallback? onRetry,
  }) {
    return EmptyStateWidget(
      icon: Icons.error_outline,
      title: 'Something went wrong',
      subtitle: message,
      action: onRetry != null
          ? ElevatedButton.icon(
              onPressed: onRetry,
              icon: const Icon(Icons.refresh),
              label: const Text('Try Again'),
            )
          : null,
    );
  }

  /// Factory for no internet empty state
  factory EmptyStateWidget.noInternet({VoidCallback? onRetry}) {
    return EmptyStateWidget(
      icon: Icons.wifi_off,
      title: 'No internet connection',
      subtitle: 'Check your connection and try again',
      action: onRetry != null
          ? ElevatedButton.icon(
              onPressed: onRetry,
              icon: const Icon(Icons.refresh),
              label: const Text('Retry'),
            )
          : null,
    );
  }

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(KitchenDimensions.space32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              padding: const EdgeInsets.all(KitchenDimensions.space20),
              decoration: BoxDecoration(
                color: KitchenColors.primaryLight,
                shape: BoxShape.circle,
              ),
              child: Icon(
                icon,
                size: 48,
                color: KitchenColors.primary,
              ),
            ),
            const SizedBox(height: KitchenDimensions.space24),
            Text(
              title,
              style: KitchenTypography.h3,
              textAlign: TextAlign.center,
            ),
            if (subtitle != null) ...[
              const SizedBox(height: KitchenDimensions.space8),
              Text(
                subtitle!,
                style: KitchenTypography.bodyMedium.copyWith(
                  color: KitchenColors.inkLight,
                ),
                textAlign: TextAlign.center,
              ),
            ],
            if (action != null) ...[
              const SizedBox(height: KitchenDimensions.space24),
              action!,
            ],
          ],
        ),
      ),
    );
  }
}

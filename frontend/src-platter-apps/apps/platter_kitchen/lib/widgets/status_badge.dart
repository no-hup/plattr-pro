import 'package:flutter/material.dart';
import '../theme/design_system/kitchen_dimensions.dart';
import '../theme/design_system/kitchen_typography.dart';
import '../core/extensions.dart';

/// A badge widget for displaying order status.
///
/// Automatically colors based on the status using [OrderStatusColorX] extension.
class StatusBadge extends StatelessWidget {
  const StatusBadge({
    super.key,
    required this.status,
    this.size = StatusBadgeSize.medium,
    this.showIcon = false,
  });

  final String status;
  final StatusBadgeSize size;
  final bool showIcon;

  @override
  Widget build(BuildContext context) {
    final color = status.statusColor;
    final isDark = _isDarkColor(color);

    return Container(
      padding: EdgeInsets.symmetric(
        horizontal: _horizontalPadding,
        vertical: _verticalPadding,
      ),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.15),
        borderRadius: BorderRadius.circular(KitchenDimensions.radiusPill),
        border: Border.all(
          color: color.withValues(alpha: 0.3),
          width: 1,
        ),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (showIcon) ...[
            Icon(
              _iconForStatus,
              size: _iconSize,
              color: color,
            ),
            SizedBox(width: KitchenDimensions.space4),
          ],
          Text(
            status.toUpperCase(),
            style: (size == StatusBadgeSize.small
              ? KitchenTypography.statusBadge.copyWith(fontSize: 9)
              : KitchenTypography.statusBadge).copyWith(
              color: isDark ? color : color.withValues(alpha: 0.9),
            ),
          ),
        ],
      ),
    );
  }

  double get _horizontalPadding => switch (size) {
        StatusBadgeSize.small => KitchenDimensions.space8,
        StatusBadgeSize.medium => KitchenDimensions.space12,
        StatusBadgeSize.large => KitchenDimensions.space16,
      };

  double get _verticalPadding => switch (size) {
        StatusBadgeSize.small => KitchenDimensions.space4,
        StatusBadgeSize.medium => KitchenDimensions.space6,
        StatusBadgeSize.large => KitchenDimensions.space8,
      };

  double get _iconSize => switch (size) {
        StatusBadgeSize.small => 12,
        StatusBadgeSize.medium => 14,
        StatusBadgeSize.large => 16,
      };

  IconData get _iconForStatus => switch (status.toLowerCase()) {
        'pending' => Icons.hourglass_empty,
        'preparing' => Icons.restaurant,
        'ready' => Icons.check_circle_outline,
        'served' => Icons.done_all,
        'cancelled' => Icons.cancel_outlined,
        _ => Icons.info_outline,
      };

  bool _isDarkColor(Color color) {
    return color.computeLuminance() < 0.5;
  }
}

enum StatusBadgeSize { small, medium, large }

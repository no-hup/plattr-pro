import 'package:flutter/material.dart';

/// A flexible badge widget for status indicators.
///
/// Used for "Out of Stock", "Customizable", discount badges, etc.
/// Provides factory constructors for common use cases.
class StatusBadge extends StatelessWidget {
  const StatusBadge({
    super.key,
    required this.label,
    this.icon,
    this.backgroundColor,
    this.foregroundColor,
    this.iconSize = 16,
  });

  /// Creates an "Out of Stock" badge with error styling.
  factory StatusBadge.outOfStock({Key? key}) {
    return StatusBadge(
      key: key,
      label: 'Out of Stock',
      icon: Icons.block,
      backgroundColor: null, // Will use theme error colors
      foregroundColor: null, // Will use theme error colors
    );
  }

  /// Creates a "Customizable" badge with primary styling.
  factory StatusBadge.customizable({Key? key}) {
    return StatusBadge(
      key: key,
      label: 'Customizable',
      icon: Icons.edit_outlined,
      backgroundColor: null, // Will use theme primary colors
      foregroundColor: null, // Will use theme primary colors
    );
  }

  /// Creates a discount badge showing the percentage or amount off.
  factory StatusBadge.discount({
    Key? key,
    required String text,
  }) {
    return StatusBadge(
      key: key,
      label: text,
      icon: Icons.local_offer_outlined,
      backgroundColor: null, // Will use theme tertiary colors
      foregroundColor: null, // Will use theme tertiary colors
    );
  }

  /// Creates a custom badge with specified properties.
  factory StatusBadge.custom({
    Key? key,
    required String label,
    IconData? icon,
    Color? backgroundColor,
    Color? foregroundColor,
  }) {
    return StatusBadge(
      key: key,
      label: label,
      icon: icon,
      backgroundColor: backgroundColor,
      foregroundColor: foregroundColor,
    );
  }

  /// The text label for the badge.
  final String label;

  /// Optional icon to display before the label.
  final IconData? icon;

  /// Background color. If null, uses theme-appropriate defaults.
  final Color? backgroundColor;

  /// Foreground (text/icon) color. If null, uses theme-appropriate defaults.
  final Color? foregroundColor;

  /// Size of the icon.
  final double iconSize;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    // Determine colors based on badge type or explicit values
    Color bgColor;
    Color fgColor;

    if (backgroundColor != null && foregroundColor != null) {
      bgColor = backgroundColor!;
      fgColor = foregroundColor!;
    } else if (label == 'Out of Stock') {
      bgColor = theme.colorScheme.errorContainer.withOpacity(0.3);
      fgColor = theme.colorScheme.error;
    } else if (label == 'Customizable') {
      bgColor = theme.colorScheme.primaryContainer.withOpacity(0.3);
      fgColor = theme.colorScheme.primary;
    } else if (icon == Icons.local_offer_outlined) {
      // Discount badge
      bgColor = theme.colorScheme.tertiaryContainer.withOpacity(0.3);
      fgColor = theme.colorScheme.tertiary;
    } else {
      // Default styling
      bgColor = theme.colorScheme.surfaceContainerHighest;
      fgColor = theme.colorScheme.onSurfaceVariant;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (icon != null) ...[
            Icon(
              icon,
              size: iconSize,
              color: fgColor,
            ),
            const SizedBox(width: 4),
          ],
          Text(
            label,
            style: theme.textTheme.bodySmall?.copyWith(
              color: fgColor,
              fontWeight: FontWeight.w500,
            ),
          ),
        ],
      ),
    );
  }
}

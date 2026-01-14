import 'package:flutter/material.dart';
import 'package:flutterboilerplate/theme/theme.dart';

/// A flexible badge widget for status indicators.
///
/// Used for "Out of Stock", "Customizable", discount badges, etc.
/// Provides factory constructors for common use cases.
class StatusBadge extends StatelessWidget {
  const StatusBadge({
    required this.label, super.key,
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
    );
  }

  /// Creates a "Customizable" badge with primary styling.
  factory StatusBadge.customizable({Key? key}) {
    return StatusBadge(
      key: key,
      label: 'Customizable',
      icon: Icons.edit_outlined,
    );
  }

  /// Creates a discount badge showing the percentage or amount off.
  factory StatusBadge.discount({
    required String text, Key? key,
  }) {
    return StatusBadge(
      key: key,
      label: text,
      icon: Icons.local_offer_outlined,
    );
  }

  /// Creates a custom badge with specified properties.
  factory StatusBadge.custom({
    required String label, Key? key,
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

  /// Creates a Non-Veg indicator (Minimal).
  factory StatusBadge.nonVeg({Key? key}) {
    return StatusBadge(
      key: key,
      label: 'Non-Veg', 
      icon: Icons.circle,
      iconSize: 12,
      // Custom styling handled in build or here
    );
  }
  
  /// Creates a Spicy indicator (Minimal).
  factory StatusBadge.spicy({Key? key, String level = 'HOT'}) {
    return StatusBadge(
      key: key,
      label: level, 
      icon: Icons.whatshot,
      iconSize: 14,
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
    
    // Helper for specific hardcoded styles
    if (label == 'Non-Veg') {
       // Minimal style for Non-Veg
       return Container(
         padding: const EdgeInsets.all(4),
         decoration: BoxDecoration(
           color: AppColors.paper,
           border: Border.all(color: AppColors.danger),
           borderRadius: BorderRadius.circular(4),
         ),
         child: Icon(Icons.circle, size: 8, color: AppColors.danger),
       );
    } 

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
    } else if (icon == Icons.whatshot) {
       // Spicy badge
       bgColor = Colors.orange.withOpacity(0.1);
       fgColor = Colors.deepOrange;
    } else {
      // Default styling
      bgColor = theme.colorScheme.surfaceContainerHighest;
      fgColor = theme.colorScheme.onSurfaceVariant;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: AppSpacing.sm, vertical: AppSpacing.xs),
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
            if (label.isNotEmpty && label != 'HOT' && label != 'MILD')...[ // Hide text for simple icons if desired
               const SizedBox(width: AppSpacing.xs),
            ]
          ],
          if (label != 'HOT' && label != 'MILD') // Only show icon for spicy
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

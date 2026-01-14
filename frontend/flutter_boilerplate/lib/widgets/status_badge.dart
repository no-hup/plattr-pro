import 'package:flutter/material.dart';
import 'package:flutterboilerplate/theme/theme.dart';

// Private constants for badge type detection (avoids hardcoded strings in logic)
const String _kLabelOutOfStock = 'Out of Stock';
const String _kLabelCustomizable = 'Customizable';
const String _kLabelNonVeg = 'Non-Veg';
const String _kLabelSpicyHot = 'HOT';
const String _kLabelSpicyMild = 'MILD';

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
      label: _kLabelOutOfStock,
      icon: Icons.block,
    );
  }

  /// Creates a "Customizable" badge with primary styling.
  factory StatusBadge.customizable({Key? key}) {
    return StatusBadge(
      key: key,
      label: _kLabelCustomizable,
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
      label: _kLabelNonVeg, 
      icon: Icons.circle,
      iconSize: 12,
    );
  }
  
  /// Creates a Spicy indicator (Minimal).
  factory StatusBadge.spicy({Key? key, String level = _kLabelSpicyHot}) {
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
  
  /// Helper to check if this is a spicy-only badge (icon-only, no text)
  bool get _isSpicyIconOnly => label == _kLabelSpicyHot || label == _kLabelSpicyMild;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    // Non-Veg: Minimal style with border and small circle icon
    if (label == _kLabelNonVeg) {
       return Container(
         padding: const EdgeInsets.all(4),
         decoration: BoxDecoration(
           color: AppColors.paper,
           border: Border.all(color: AppColors.danger),
           borderRadius: BorderRadius.circular(4),
         ),
         child: const Icon(Icons.circle, size: 8, color: AppColors.danger),
       );
    } 

    // Determine colors based on badge type or explicit values
    Color bgColor;
    Color fgColor;

    if (backgroundColor != null && foregroundColor != null) {
      bgColor = backgroundColor!;
      fgColor = foregroundColor!;
    } else if (label == _kLabelOutOfStock) {
      bgColor = theme.colorScheme.errorContainer.withOpacity(0.3);
      fgColor = theme.colorScheme.error;
    } else if (label == _kLabelCustomizable) {
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
            // Add spacing only if text label will follow
            if (label.isNotEmpty && !_isSpicyIconOnly)
               const SizedBox(width: AppSpacing.xs),
          ],
          // Show text label unless it's a spicy icon-only badge
          if (!_isSpicyIconOnly)
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

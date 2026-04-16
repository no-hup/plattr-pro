import 'package:flutter/material.dart';
import 'package:flutterboilerplate/theme/theme.dart';

/// A compact quantity selector with increment/decrement buttons.
///
/// Used across menu and cart pages for adjusting item quantities.
/// Respects the app theme for colors and styling.
class QuantitySelector extends StatelessWidget {
  const QuantitySelector({
    required this.quantity, required this.onIncrement, required this.onDecrement, super.key,
    this.isEnabled = true,
    this.compact = false,
    this.minQuantity = 0,
  });

  /// Current quantity value to display.
  final int quantity;

  /// Callback when the + button is pressed.
  final VoidCallback? onIncrement;

  /// Callback when the - button is pressed.
  final VoidCallback? onDecrement;

  /// Whether the buttons are enabled. When false, both buttons are disabled.
  final bool isEnabled;

  /// Use compact mode for inline display (smaller buttons and text).
  final bool compact;

  /// Minimum quantity allowed. Decrement is disabled at this value.
  final int minQuantity;

  @override
  Widget build(BuildContext context) {
    // Determine sizes based on compact mode
    // Compact: 32px height, Regular: 40px height
    final height = compact ? 32.0 : 40.0;
    // Icon sizes
    final iconSize = compact ? 16.0 : 20.0;
    
    // Interactive states
    final canDecrement = isEnabled && quantity > minQuantity;
    final canIncrement = isEnabled;

    return Container(
      height: height,
      decoration: BoxDecoration(
        color: AppColors.primaryLight, // Gray-100 equivalent
        borderRadius: BorderRadius.circular(AppDimensions.radiusPill),
      ),
      padding: const EdgeInsets.symmetric(horizontal: 4),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Decrement button (Gray circle)
          _buildButton(
            icon: Icons.remove,
            size: height - 8,
            iconSize: iconSize,
            onTap: canDecrement ? onDecrement : null,
            isPrimary: false,
          ),

          // Quantity Display
          Container(
            constraints: BoxConstraints(minWidth: compact ? 24 : 32),
            padding: const EdgeInsets.symmetric(horizontal: 4),
            alignment: Alignment.center,
            child: Text(
              '$quantity',
              style: compact 
                  ? AppTypography.labelMedium 
                  : AppTypography.labelLarge,
            ),
          ),

          // Increment button (Primary circle)
          _buildButton(
            icon: Icons.add,
            size: height - 8,
            iconSize: iconSize,
            onTap: canIncrement ? onIncrement : null,
            isPrimary: true,
          ),
        ],
      ),
    );
  }

  Widget _buildButton({
    required IconData icon,
    required double size,
    required double iconSize,
    required VoidCallback? onTap,
    required bool isPrimary,
  }) {
    final bool isDisabled = onTap == null;
    
    // Primary: Filled Blue (Primary), White Icon
    // Secondary: Transparent/White (Paper), Gray Icon (Ink)
    final backgroundColor = isDisabled
        ? (isPrimary ? AppColors.primary.withOpacity(0.5) : Colors.transparent)
        : (isPrimary ? AppColors.primary : AppColors.paper);
        
    final iconColor = isDisabled
        ? Colors.white.withOpacity(0.5)
        : (isPrimary ? Colors.white : AppColors.ink);

    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(AppDimensions.radiusPill),
        child: Container(
          width: size,
          height: size,
          decoration: BoxDecoration(
            color: backgroundColor,
            shape: BoxShape.circle,
            boxShadow: isPrimary || !isDisabled ? null : [
              // Subtle shadow for white buttons if needed, currently flat
            ],
            border: !isPrimary && !isDisabled 
                ? Border.all(color: AppColors.divider, width: 1) 
                : null,
          ),
          alignment: Alignment.center,
          child: Icon(
            icon,
            size: iconSize,
            color: iconColor,
          ),
        ),
      ),
    );
  }
}

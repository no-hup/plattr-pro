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
    final theme = Theme.of(context);
    final iconSize = compact ? 18.0 : 24.0;
    final buttonSize = compact ? 32.0 : 40.0;

    final canDecrement = isEnabled && quantity > minQuantity;
    final canIncrement = isEnabled;

    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        // Decrement button
        SizedBox(
          width: buttonSize,
          height: buttonSize,
          child: IconButton(
            icon: Icon(Icons.remove, size: iconSize),
            onPressed: canDecrement ? onDecrement : null,
            padding: EdgeInsets.zero,
            style: IconButton.styleFrom(
              backgroundColor: theme.colorScheme.surfaceContainerHighest,
              foregroundColor: theme.colorScheme.primary,
              disabledBackgroundColor:
                  theme.colorScheme.surfaceContainerHighest.withOpacity(0.5),
              disabledForegroundColor:
                  theme.colorScheme.onSurface.withOpacity(0.38),
            ),
          ),
        ),

        // Quantity display
        Padding(
          padding: EdgeInsets.symmetric(horizontal: compact ? AppSpacing.sm : AppSpacing.md),
          child: Text(
            '$quantity',
            style: compact
                ? theme.textTheme.bodyLarge
                : theme.textTheme.titleMedium,
          ),
        ),

        // Increment button
        SizedBox(
          width: buttonSize,
          height: buttonSize,
          child: IconButton(
            icon: Icon(Icons.add, size: iconSize),
            onPressed: canIncrement ? onIncrement : null,
            padding: EdgeInsets.zero,
            style: IconButton.styleFrom(
              backgroundColor: theme.colorScheme.primary,
              foregroundColor: theme.colorScheme.onPrimary,
              disabledBackgroundColor:
                  theme.colorScheme.surfaceContainerHighest.withOpacity(0.5),
              disabledForegroundColor:
                  theme.colorScheme.onSurface.withOpacity(0.38),
            ),
          ),
        ),
      ],
    );
  }
}

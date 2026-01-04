import 'package:flutter/material.dart';

/// Size variants for the price display.
enum PriceDisplaySize { small, medium, large }

/// A widget that displays prices with optional discount strikethrough.
///
/// Handles base price, final price, and discount display in a consistent manner
/// across menu, cart, and order pages.
class PriceDisplay extends StatelessWidget {
  const PriceDisplay({
    super.key,
    required this.finalPrice,
    this.basePrice,
    this.discountAmount,
    this.currencySymbol = '₹',
    this.showDiscountBadge = false,
    this.size = PriceDisplaySize.medium,
    this.crossAxisAlignment = CrossAxisAlignment.end,
  });

  /// The final price to display (after discounts).
  final double finalPrice;

  /// The original base price. If different from finalPrice, shown with strikethrough.
  final double? basePrice;

  /// Optional discount amount to show separately (e.g., "-₹50").
  final double? discountAmount;

  /// Currency symbol prefix. Defaults to ₹.
  final String currencySymbol;

  /// Whether to show a discount badge/label.
  final bool showDiscountBadge;

  /// Size variant for text styling.
  final PriceDisplaySize size;

  /// Cross axis alignment for the column layout.
  final CrossAxisAlignment crossAxisAlignment;

  bool get _hasDiscount =>
      basePrice != null && basePrice! > finalPrice && basePrice! > 0;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final textTheme = theme.textTheme;

    // Determine text styles based on size
    TextStyle? finalPriceStyle;
    TextStyle? basePriceStyle;
    TextStyle? discountStyle;

    switch (size) {
      case PriceDisplaySize.small:
        finalPriceStyle = textTheme.bodyMedium?.copyWith(
          fontWeight: FontWeight.bold,
        );
        basePriceStyle = textTheme.bodySmall?.copyWith(
          decoration: TextDecoration.lineThrough,
          color: theme.colorScheme.onSurfaceVariant,
        );
        discountStyle = textTheme.labelSmall?.copyWith(
          color: theme.colorScheme.error,
        );
        break;
      case PriceDisplaySize.medium:
        finalPriceStyle = textTheme.titleMedium?.copyWith(
          fontWeight: FontWeight.bold,
        );
        basePriceStyle = textTheme.titleSmall?.copyWith(
          decoration: TextDecoration.lineThrough,
          color: theme.colorScheme.onSurfaceVariant,
        );
        discountStyle = textTheme.bodySmall?.copyWith(
          color: theme.colorScheme.error,
        );
        break;
      case PriceDisplaySize.large:
        finalPriceStyle = textTheme.titleLarge?.copyWith(
          fontWeight: FontWeight.bold,
        );
        basePriceStyle = textTheme.titleMedium?.copyWith(
          decoration: TextDecoration.lineThrough,
          color: theme.colorScheme.onSurfaceVariant,
        );
        discountStyle = textTheme.bodyMedium?.copyWith(
          color: theme.colorScheme.error,
        );
        break;
    }

    return Column(
      crossAxisAlignment: crossAxisAlignment,
      mainAxisSize: MainAxisSize.min,
      children: [
        // Price row with base price strikethrough
        Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (_hasDiscount) ...[
              Text(
                '$currencySymbol${basePrice!.toStringAsFixed(2)}',
                style: basePriceStyle,
              ),
              const SizedBox(width: 4),
            ],
            Text(
              '$currencySymbol${finalPrice.toStringAsFixed(2)}',
              style: finalPriceStyle,
            ),
          ],
        ),

        // Discount amount if provided
        if (discountAmount != null && discountAmount! > 0) ...[
          const SizedBox(height: 2),
          Text(
            '(-$currencySymbol${discountAmount!.toStringAsFixed(2)})',
            style: discountStyle,
          ),
        ],
      ],
    );
  }
}

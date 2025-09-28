import 'package:flutter/material.dart';

/// Standard footer panel showing price summary rows and a primary action.
class PriceSummaryPanel extends StatelessWidget {
  const PriceSummaryPanel({
    super.key,
    required this.summaryRows,
    this.primaryAction,
    this.padding = const EdgeInsets.all(16),
    this.backgroundColor,
    this.elevation = 4,
  });

  final List<Widget> summaryRows;
  final Widget? primaryAction;
  final EdgeInsetsGeometry padding;
  final Color? backgroundColor;
  final double elevation;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Material(
      elevation: elevation,
      color: backgroundColor ?? theme.cardColor,
      child: SafeArea(
        top: false,
        child: Padding(
          padding: padding,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              ...summaryRows,
              if (primaryAction != null) ...[
                const SizedBox(height: 16),
                SizedBox(
                  width: double.infinity,
                  child: primaryAction!,
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

import 'package:flutter/material.dart';
import 'package:flutterboilerplate/theme/theme.dart';

/// Standard footer panel showing price summary rows and a primary action.
class PriceSummaryPanel extends StatelessWidget {
  const PriceSummaryPanel({
    required this.summaryRows, super.key,
    this.primaryAction,
    this.padding = AppSpacing.pagePadding,
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
                AppSpacing.verticalLG,
                SizedBox(
                  width: double.infinity,
                  child: primaryAction,
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

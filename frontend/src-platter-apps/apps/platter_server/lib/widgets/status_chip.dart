import 'package:flutter/material.dart';
import '../shared/status_utils.dart';

class StatusChip extends StatelessWidget {
  final String status;
  final double fontSize;
  final EdgeInsetsGeometry padding;

  const StatusChip({
    super.key,
    required this.status,
    this.fontSize = 12,
    this.padding = const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
  });

  @override
  Widget build(BuildContext context) {
    final normalized = status.toUpperCase();
    final cartStatus = StatusUtils.parseCartStatus(normalized);
    // Use StatusColors if mapping matches, else defined fallback colors
    final color = cartStatus != CartStatus.unknown
        ? StatusColors.getColorForStatus(cartStatus)
        : Colors.grey;

    return Container(
      padding: padding,
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: color.withValues(alpha: 0.3)),
      ),
      child: Text(
        normalized,
        style: TextStyle(
          color: color,
          fontWeight: FontWeight.bold,
          fontSize: fontSize,
        ),
      ),
    );
  }
}

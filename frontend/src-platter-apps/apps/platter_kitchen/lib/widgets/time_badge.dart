import 'package:flutter/material.dart';
import 'package:timeago/timeago.dart' as timeago;
import '../theme/design_system/kitchen_typography.dart';

class TimeBadge extends StatelessWidget {
  final DateTime timestamp;
  final int lateThresholdMinutes;

  const TimeBadge({
    super.key,
    required this.timestamp,
    this.lateThresholdMinutes = 20,
  });

  @override
  Widget build(BuildContext context) {
    final diff = DateTime.now().difference(timestamp);
    final isLate = diff.inMinutes > lateThresholdMinutes;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
      decoration: BoxDecoration(
        color: isLate ? Colors.red.withValues(alpha: 0.1) : Colors.grey.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(4),
        border: Border.all(color: isLate ? Colors.red.shade300 : Colors.transparent),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            Icons.access_time,
            size: 12,
            color: isLate ? Colors.red : Colors.grey.shade700,
          ),
          const SizedBox(width: 4),
          Text(
            timeago.format(timestamp, locale: 'en_short'),
            style: KitchenTypography.caption.copyWith(
              color: isLate ? Colors.red.shade700 : Colors.grey.shade700,
              fontWeight: isLate ? FontWeight.bold : FontWeight.normal,
            ),
          ),
        ],
      ),
    );
  }
}

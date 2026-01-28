import 'package:flutter/material.dart';
import '../theme/design_system/kitchen_dimensions.dart';
import '../theme/design_system/kitchen_typography.dart';
import '../theme/design_system/kitchen_colors.dart';

/// A reusable card for displaying debug information.
class DebugInfoCard extends StatelessWidget {
  const DebugInfoCard({
    super.key,
    required this.restaurantId,
    required this.sessionId,
  });

  final String restaurantId;
  final String sessionId;

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(top: KitchenDimensions.space24),
      child: Padding(
        padding: const EdgeInsets.all(KitchenDimensions.space16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(
              'Debug Info',
              style: KitchenTypography.label.copyWith(color: KitchenColors.ink),
            ),
            const SizedBox(height: KitchenDimensions.space8),
            _buildRow('Restaurant', restaurantId),
            _buildRow('Session',
                sessionId.length > 8 ? '${sessionId.substring(0, 8)}...' : sessionId),
          ],
        ),
      ),
    );
  }

  Widget _buildRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 2.0),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label,
            style: KitchenTypography.bodySmall.copyWith(fontWeight: FontWeight.w600),
          ),
          Text(
            value,
            style: KitchenTypography.bodySmall.copyWith(fontFamily: 'monospace'),
          ),
        ],
      ),
    );
  }
}

import 'package:flutter/material.dart';
import '../theme/design_system/kitchen_colors.dart';
import '../theme/design_system/kitchen_dimensions.dart';
import '../theme/design_system/kitchen_typography.dart';

/// A loading overlay that can be shown over content.
///
/// Usage:
/// ```dart
/// Stack(
///   children: [
///     YourContent(),
///     if (isLoading) const LoadingOverlay(),
///   ],
/// )
/// ```
class LoadingOverlay extends StatelessWidget {
  const LoadingOverlay({
    super.key,
    this.message,
    this.dismissible = false,
    this.onDismiss,
  });

  final String? message;
  final bool dismissible;
  final VoidCallback? onDismiss;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: dismissible ? onDismiss : null,
      child: Container(
        color: KitchenColors.overlay.withValues(alpha: 0.5),
        child: Center(
          child: Container(
            padding: const EdgeInsets.all(KitchenDimensions.space24),
            decoration: BoxDecoration(
              color: KitchenColors.paper,
              borderRadius:
                  BorderRadius.circular(KitchenDimensions.radiusLG),
              boxShadow: KitchenDimensions.shadowFloat,
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const CircularProgressIndicator(
                  color: KitchenColors.primary,
                  strokeWidth: 3,
                ),
                if (message != null) ...[
                  const SizedBox(height: KitchenDimensions.space16),
                  Text(
                    message!,
                    style: KitchenTypography.bodyMedium,
                    textAlign: TextAlign.center,
                  ),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }
}

/// A simple loading indicator widget
class LoadingIndicator extends StatelessWidget {
  const LoadingIndicator({
    super.key,
    this.size = 24,
    this.strokeWidth = 2.5,
    this.color,
  });

  final double size;
  final double strokeWidth;
  final Color? color;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: size,
      height: size,
      child: CircularProgressIndicator(
        strokeWidth: strokeWidth,
        color: color ?? KitchenColors.primary,
      ),
    );
  }
}

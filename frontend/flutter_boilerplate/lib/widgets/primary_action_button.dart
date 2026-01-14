import 'package:flutter/material.dart';
import 'package:flutterboilerplate/theme/theme.dart';

/// Primary button used across key flows (checkout, retry, etc.).
class PrimaryActionButton extends StatelessWidget {
  const PrimaryActionButton({
    required this.label, required this.onPressed, super.key,
    this.isLoading = false,
    this.expand = true,
    this.trailingIcon,
  });

  final String label;
  final VoidCallback? onPressed;
  final bool isLoading;
  final bool expand;
  final IconData? trailingIcon;

  @override
  Widget build(BuildContext context) {
    final buttonChild = isLoading
        ? SizedBox(
            height: 20,
            width: 20,
            child: CircularProgressIndicator(
              strokeWidth: 2,
              valueColor: AlwaysStoppedAnimation<Color>(
                Colors.white,
              ),
            ),
          )
        : Row(
            mainAxisSize: MainAxisSize.min,
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text(
                label.toUpperCase(),
                style: AppTypography.labelMedium.copyWith(
                  color: Colors.white,
                  letterSpacing: 1.0,
                  fontWeight: FontWeight.bold,
                ),
              ),
              if (trailingIcon != null) ...[
                const SizedBox(width: AppSpacing.sm),
                Icon(trailingIcon, size: 16, color: Colors.white),
              ],
            ],
          );

    final button = ElevatedButton(
      onPressed: isLoading ? null : onPressed,
      style: ElevatedButton.styleFrom(
        backgroundColor: AppColors.primary,
        foregroundColor: Colors.white,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppDimensions.radiusSM),
        ),
        padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 24),
        elevation: 0,
      ),
      child: buttonChild,
    );

    if (expand) {
      return SizedBox(width: double.infinity, child: button);
    }

    return button;
  }
}

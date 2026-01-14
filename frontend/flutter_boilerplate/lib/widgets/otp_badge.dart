import 'package:flutter/material.dart';
import 'package:flutterboilerplate/theme/theme.dart';

class OtpBadge extends StatelessWidget {
  const OtpBadge({
    required this.otp,
    super.key,
  });

  final String otp;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.sm,
        vertical: 4, // Custom small padding
      ),
      decoration: BoxDecoration(
        color: AppColors.primaryLight,
        borderRadius: BorderRadius.circular(4),
        border: Border.all(
          color: AppColors.divider,
          width: 1,
        ),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(
            'OTP',
            style: AppTypography.labelSmall.copyWith(
              color: AppColors.inkLight,
              letterSpacing: 0.5,
            ),
          ),
          const SizedBox(width: 4),
          Text(
            otp,
            style: AppTypography.labelSmall.copyWith(
              color: AppColors.ink,
              fontWeight: FontWeight.bold,
              letterSpacing: 0.5,
            ),
          ),
        ],
      ),
    );
  }
}

import 'package:flutter/material.dart';

/// A subtle, animated banner that displays "No internet available" message.
/// 
/// Designed to slide in/out below the app bar with smooth animation.
/// Uses a muted orange color scheme for non-intrusive visibility.
class NoInternetBannerWidget extends StatelessWidget {
  /// Controls visibility with smooth animation
  final bool isVisible;

  const NoInternetBannerWidget({
    super.key,
    required this.isVisible,
  });

  @override
  Widget build(BuildContext context) {
    return AnimatedContainer(
      duration: const Duration(milliseconds: 300),
      curve: Curves.easeInOut,
      height: isVisible ? 32 : 0,
      clipBehavior: Clip.antiAlias,
      decoration: const BoxDecoration(),
      child: Material(
        color: Colors.orange.shade100,
        child: Center(
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(
                Icons.wifi_off_rounded,
                size: 16,
                color: Colors.orange.shade800,
              ),
              const SizedBox(width: 8),
              Text(
                'No internet available',
                style: TextStyle(
                  color: Colors.orange.shade800,
                  fontSize: 13,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

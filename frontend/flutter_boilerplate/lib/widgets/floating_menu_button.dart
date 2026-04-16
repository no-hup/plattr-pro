import 'package:flutter/material.dart';
import 'package:flutterboilerplate/theme/theme.dart';

class FloatingMenuButton extends StatelessWidget {
  const FloatingMenuButton({
    required this.isExpanded,
    required this.onToggle,
    super.key,
  });

  final bool isExpanded;
  final VoidCallback onToggle;

  @override
  Widget build(BuildContext context) {
    // Current FAB style: Dark background (primary), White icon
    return FloatingActionButton(
      onPressed: onToggle,
      elevation: isExpanded ? 8 : 6,
      backgroundColor: AppColors.primary,
      foregroundColor: Colors.white,
      shape: const CircleBorder(),
      child: AnimatedSwitcher(
        duration: AppDimensions.transitionNormal,
        transitionBuilder: (child, animation) => ScaleTransition(
          scale: animation,
          child: child,
        ),
        child: Icon(
          isExpanded ? Icons.close : Icons.menu_book,
          key: ValueKey(isExpanded),
        ),
      ),
    );
  }
}

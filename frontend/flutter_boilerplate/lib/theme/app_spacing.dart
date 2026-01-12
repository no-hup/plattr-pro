import 'package:flutter/material.dart';

/// Centralized spacing constants for consistent UI
/// Based on a 4px grid system for clean, consistent spacing
abstract class AppSpacing {
  // Base unit for 4px grid system
  static const double unit = 4;

  // Named spacing values
  static const double xxs = 2; // Extra extra small
  static const double xs = 4; // Extra small
  static const double sm = 8; // Small
  static const double md = 12; // Medium
  static const double lg = 16; // Large (common default)
  static const double xl = 24; // Extra large
  static const double xxl = 32; // Extra extra large
  static const double xxxl = 48; // For major section breaks

  // Common padding presets
  static const EdgeInsets pagePadding = EdgeInsets.all(lg);
  static const EdgeInsets pagePaddingHorizontal = EdgeInsets.symmetric(horizontal: lg);
  static const EdgeInsets cardPadding = EdgeInsets.all(md);
  static const EdgeInsets cardPaddingCompact = EdgeInsets.all(sm);
  static const EdgeInsets listItemPadding = EdgeInsets.symmetric(
    horizontal: lg,
    vertical: sm,
  );
  static const EdgeInsets buttonPadding = EdgeInsets.symmetric(
    horizontal: lg,
    vertical: sm,
  );
  static const EdgeInsets inputPadding = EdgeInsets.symmetric(
    horizontal: md,
    vertical: sm,
  );

  // Vertical spacing widgets (const for performance)
  static const SizedBox verticalXXS = SizedBox(height: xxs);
  static const SizedBox verticalXS = SizedBox(height: xs);
  static const SizedBox verticalSM = SizedBox(height: sm);
  static const SizedBox verticalMD = SizedBox(height: md);
  static const SizedBox verticalLG = SizedBox(height: lg);
  static const SizedBox verticalXL = SizedBox(height: xl);
  static const SizedBox verticalXXL = SizedBox(height: xxl);

  // Horizontal spacing widgets (const for performance)
  static const SizedBox horizontalXXS = SizedBox(width: xxs);
  static const SizedBox horizontalXS = SizedBox(width: xs);
  static const SizedBox horizontalSM = SizedBox(width: sm);
  static const SizedBox horizontalMD = SizedBox(width: md);
  static const SizedBox horizontalLG = SizedBox(width: lg);
  static const SizedBox horizontalXL = SizedBox(width: xl);
  static const SizedBox horizontalXXL = SizedBox(width: xxl);

  // Gap values for Row/Column with mainAxisAlignment.spaceBetween equivalent
  static const double gapXS = xs;
  static const double gapSM = sm;
  static const double gapMD = md;
  static const double gapLG = lg;
}

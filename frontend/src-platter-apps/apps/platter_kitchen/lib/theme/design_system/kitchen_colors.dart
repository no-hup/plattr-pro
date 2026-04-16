import 'package:flutter/material.dart';

/// Semantic color tokens for the Kitchen app design system.
/// Based on the Lumière design system from flutter_boilerplate.
///
/// Kitchen app uses a distinct cyan/teal palette to differentiate from other apps
/// while maintaining the same structural patterns.
class KitchenColors {
  // Prevent instantiation
  KitchenColors._();

  // Core Brand - Kitchen uses cyan/teal palette
  static const Color primary = Color(0xFF00838F); // Cyan 800
  static const Color primaryLight = Color(0xFFE0F7FA); // Cyan 50
  static const Color primaryDark = Color(0xFF006064); // Cyan 900

  // Accent colors for actions
  static const Color accent = Color(0xFF26A69A); // Teal 400
  static const Color accentLight = Color(0xFFB2DFDB); // Teal 100

  // Surfaces
  static const Color paper = Color(0xFFFFFFFF);
  static const Color paperAlt = Color(0xFFFAFAF9);
  static const Color surfaceElevated = Color(0xFFFFFFFF);

  // Text & Icons
  static const Color ink = Color(0xFF1C1C1C);
  static const Color inkLight = Color(0xFF555555);
  static const Color inkLighter = Color(0xFF9CA3AF); // For placeholders/disabled

  // Structural
  static const Color divider = Color(0xFFE5E5E5);
  static const Color border = Color(0xFFE0E0E0);

  // Functional / Status
  static const Color danger = Color(0xFFEF4444); // Red for errors
  static const Color success = Color(0xFF22C55E); // Green for success
  static const Color warning = Color(0xFFF59E0B); // Amber for warnings
  static const Color info = Color(0xFF3B82F6); // Blue for info

  // Order Status Colors (Kitchen specific)
  static const Color orderPending = Color(0xFFF59E0B); // Amber
  static const Color orderPreparing = Color(0xFF3B82F6); // Blue
  static const Color orderReady = Color(0xFF22C55E); // Green
  static const Color orderServed = Color(0xFF9CA3AF); // Gray

  // Overlays
  static const Color overlay = Color(0x80000000); // 50% black
  static const Color overlayLight = Color(0x33000000); // 20% black

  // Interactive states
  static const Color hoverLight = Color(0xFFF9FAFB);
  static Color get ink40 => ink.withValues(alpha: 0.4);
  static Color get paperTranslucent => paper.withValues(alpha: 0.95);

  // For dark theme
  static const Color darkSurface = Color(0xFF121212);
  static const Color darkSurfaceElevated = Color(0xFF1E1E1E);
  static const Color darkDivider = Color(0xFF333333);
}

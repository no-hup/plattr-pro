
import 'package:flutter/material.dart';

/// Semantic color tokens for the Lumière design system.
/// Extracted from the design HTML/CSS.
class AppColors {
  // Prevent instantiation
  AppColors._();

  // Core Brand
  static const Color primary = Color(0xFF1A2E4A);
  static const Color primaryLight = Color(0xFFF0F2F5);
  
  // Surfaces
  static const Color paper = Color(0xFFFFFFFF);
  static const Color paperAlt = Color(0xFFFAFAF9);
  
  // Text & Icons
  static const Color ink = Color(0xFF1C1C1C);
  static const Color inkLight = Color(0xFF555555);
  static const Color inkLighter = Color(0xFF9CA3AF); // For placeholders/disabled
  
  // Structural
  static const Color divider = Color(0xFFE5E5E5);
  
  // Functional
  static const Color danger = Color(0xFFEF4444); // Standard red for errors/notifications
  static const Color success = Color(0xFF22C55E); // Standard green
  
  // Overlays
  static const Color overlay = Color(0x80000000); // 50% black
  
  // Interactive states
  static const Color inkMuted = Color(0x661C1C1C); // ink/40 for inactive tabs
  static const Color hoverLight = Color(0xFFF9FAFB); // gray-50 hover background  
  static Color get ink40 => ink.withOpacity(0.4);
  static Color get paperTranslucent => paper.withOpacity(0.95);
}

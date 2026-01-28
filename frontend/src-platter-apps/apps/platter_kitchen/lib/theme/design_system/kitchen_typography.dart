import 'package:flutter/material.dart';
import 'kitchen_colors.dart';

/// Semantic typography tokens for the Kitchen app design system.
/// Uses system fonts for simplicity; can be upgraded to Google Fonts if needed.
class KitchenTypography {
  // Prevent instantiation
  KitchenTypography._();

  // Base font family - using system default for reliability
  static const String _fontFamily = 'Roboto';

  // Headers
  static const TextStyle h1 = TextStyle(
    fontFamily: _fontFamily,
    fontSize: 24,
    fontWeight: FontWeight.w700,
    color: KitchenColors.ink,
    letterSpacing: -0.5,
  );

  static const TextStyle h2 = TextStyle(
    fontFamily: _fontFamily,
    fontSize: 20,
    fontWeight: FontWeight.w600,
    color: KitchenColors.ink,
  );

  static const TextStyle h3 = TextStyle(
    fontFamily: _fontFamily,
    fontSize: 18,
    fontWeight: FontWeight.w600,
    color: KitchenColors.ink,
  );

  // Body text
  static const TextStyle bodyLarge = TextStyle(
    fontFamily: _fontFamily,
    fontSize: 16,
    fontWeight: FontWeight.w400,
    color: KitchenColors.ink,
    height: 1.5,
  );

  static const TextStyle bodyMedium = TextStyle(
    fontFamily: _fontFamily,
    fontSize: 14,
    fontWeight: FontWeight.w400,
    color: KitchenColors.ink,
    height: 1.5,
  );

  static const TextStyle bodySmall = TextStyle(
    fontFamily: _fontFamily,
    fontSize: 12,
    fontWeight: FontWeight.w400,
    color: KitchenColors.inkLight,
    height: 1.4,
  );

  // Labels (for buttons, badges)
  static const TextStyle label = TextStyle(
    fontFamily: _fontFamily,
    fontSize: 14,
    fontWeight: FontWeight.w600,
    color: KitchenColors.ink,
    letterSpacing: 0.5,
  );

  static const TextStyle labelSmall = TextStyle(
    fontFamily: _fontFamily,
    fontSize: 12,
    fontWeight: FontWeight.w600,
    color: KitchenColors.ink,
    letterSpacing: 0.5,
  );

  // Kitchen-specific styles
  static const TextStyle orderNumber = TextStyle(
    fontFamily: _fontFamily,
    fontSize: 20,
    fontWeight: FontWeight.w700,
    color: KitchenColors.ink,
    letterSpacing: 1.0,
  );

  static const TextStyle orderItem = TextStyle(
    fontFamily: _fontFamily,
    fontSize: 16,
    fontWeight: FontWeight.w500,
    color: KitchenColors.ink,
  );

  static const TextStyle orderQuantity = TextStyle(
    fontFamily: _fontFamily,
    fontSize: 18,
    fontWeight: FontWeight.w700,
    color: KitchenColors.primary,
  );

  static const TextStyle timestamp = TextStyle(
    fontFamily: _fontFamily,
    fontSize: 12,
    fontWeight: FontWeight.w500,
    color: KitchenColors.inkLighter,
  );

  static const TextStyle statusBadge = TextStyle(
    fontFamily: _fontFamily,
    fontSize: 11,
    fontWeight: FontWeight.w700,
    letterSpacing: 0.8,
  );

  static const TextStyle categoryTab = TextStyle(
    fontFamily: _fontFamily,
    fontSize: 14,
    fontWeight: FontWeight.w600,
    letterSpacing: 0.5,
  );

  // Compatibility / Helpers
  static const TextStyle cardTitle = h3; 
  static const TextStyle body = bodyMedium;
  static TextStyle get bodyBold => bodyMedium.copyWith(fontWeight: FontWeight.bold);
  static const TextStyle caption = bodySmall;
}

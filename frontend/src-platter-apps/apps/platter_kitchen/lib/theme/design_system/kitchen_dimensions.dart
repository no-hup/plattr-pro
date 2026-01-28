import 'package:flutter/material.dart';

/// Semantic dimension tokens for the Kitchen app design system.
/// Based on the Lumière design system from flutter_boilerplate.
class KitchenDimensions {
  // Prevent instantiation
  KitchenDimensions._();

  // Border Radius
  static const double radiusXS = 2.0;
  static const double radiusSM = 4.0;
  static const double radiusMD = 8.0;
  static const double radiusLG = 12.0;
  static const double radiusXL = 16.0;
  static const double radiusPill = 999.0;

  // Spacing (Based on 4px grid)
  static const double space2 = 2.0;
  static const double space4 = 4.0;
  static const double space6 = 6.0;
  static const double space8 = 8.0;
  static const double space10 = 10.0;
  static const double space12 = 12.0;
  static const double space16 = 16.0;
  static const double space20 = 20.0;
  static const double space24 = 24.0;
  static const double space32 = 32.0;
  static const double space48 = 48.0;
  static const double space64 = 64.0;

  // Kitchen-specific dimensions
  static const double orderCardMinHeight = 120.0;
  static const double orderItemHeight = 48.0;
  static const double categoryTabHeight = 48.0;
  static const double statusBadgeHeight = 28.0;

  // Shadows
  static const List<BoxShadow> shadowPaper = [
    BoxShadow(
      color: Color.fromRGBO(0, 0, 0, 0.05),
      offset: Offset(0, 1),
      blurRadius: 3,
    ),
    BoxShadow(
      color: Color.fromRGBO(0, 0, 0, 0.02),
      offset: Offset(0, 10),
      blurRadius: 30,
    ),
  ];

  static const List<BoxShadow> shadowFloat = [
    BoxShadow(
      color: Color.fromRGBO(0, 131, 143, 0.2), // Primary color shadow
      offset: Offset(0, 8),
      blurRadius: 24,
      spreadRadius: -4,
    ),
  ];

  static const List<BoxShadow> shadowCard = [
    BoxShadow(
      color: Color.fromRGBO(0, 0, 0, 0.08),
      offset: Offset(0, 2),
      blurRadius: 8,
    ),
  ];

  // Interactive
  static const double touchTargetMin = 44.0; // Minimum touch target size
  static const double iconButtonSize = 40.0;

  // Layout
  static const double appBarHeight = 56.0;
  static const double bottomNavHeight = 64.0;

  // Transitions
  static const Duration transitionFast = Duration(milliseconds: 150);
  static const Duration transitionNormal = Duration(milliseconds: 200);
  static const Duration transitionSlow = Duration(milliseconds: 300);
}

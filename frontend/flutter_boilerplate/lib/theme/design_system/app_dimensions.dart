
import 'package:flutter/material.dart';

/// Semantic dimension tokens for the Lumière design system.
class AppDimensions {
  // Prevent instantiation
  AppDimensions._();

  // Border Radius
  static const double radiusXS = 2.0;
  static const double radiusSM = 4.0; // "DEFAULT" in Tailwind config
  static const double radiusMD = 8.0;
  static const double radiusLG = 12.0;
  static const double radiusXL = 16.0;
  static const double radiusPill = 999.0; // "pill" in Tailwind config

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
      color: Color.fromRGBO(26, 46, 74, 0.3),
      offset: Offset(0, 20),
      blurRadius: 40,
      spreadRadius: -5,
    ),
  ];

  // Interactive
  static const double touchTargetMin = 40.0; // Minimum touch target size
  static const double iconButtonSize = 40.0; // Header icon buttons
  
  // Layout: Floating overlays & panels
  static const double cartPanelHeight = 100.0; // Height of cart summary panel
  static const double fabOverlayOffset = 80.0; // Space above FAB for overlay positioning

  // Decorative
  static const double accentBarWidth = 2.0;
  static const double accentBarHeight = 8.0;

  // Transitions
  static const Duration transitionFast = Duration(milliseconds: 150);
  static const Duration transitionNormal = Duration(milliseconds: 200);
}

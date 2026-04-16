import 'package:flutter/material.dart';

/// Centralized sizing constants for UI components
/// Provides consistent sizing across the app for icons, buttons, inputs, and border radius
abstract class AppSizing {
  // Icon sizes
  static const double iconXS = 16;
  static const double iconSM = 20;
  static const double iconMD = 24;
  static const double iconLG = 32;
  static const double iconXL = 48;

  // Button sizes (height)
  static const double buttonHeightSM = 32;
  static const double buttonHeightMD = 40;
  static const double buttonHeightLG = 48;
  static const double buttonHeightXL = 56;

  // Input field heights
  static const double inputHeightSM = 40;
  static const double inputHeightMD = 48;
  static const double inputHeightLG = 56;

  // Avatar/thumbnail sizes
  static const double avatarSM = 32;
  static const double avatarMD = 48;
  static const double avatarLG = 64;
  static const double avatarXL = 96;

  // Card/container min heights
  static const double cardMinHeight = 80;
  static const double listItemHeight = 56;

  // Border radius values
  static const double radiusXS = 4;
  static const double radiusSM = 8;
  static const double radiusMD = 12;
  static const double radiusLG = 16;
  static const double radiusXL = 24;
  static const double radiusFull = 999;

  // Common BorderRadius presets (const for performance)
  static const BorderRadius borderRadiusXS = BorderRadius.all(Radius.circular(radiusXS));
  static const BorderRadius borderRadiusSM = BorderRadius.all(Radius.circular(radiusSM));
  static const BorderRadius borderRadiusMD = BorderRadius.all(Radius.circular(radiusMD));
  static const BorderRadius borderRadiusLG = BorderRadius.all(Radius.circular(radiusLG));
  static const BorderRadius borderRadiusXL = BorderRadius.all(Radius.circular(radiusXL));
  static const BorderRadius borderRadiusFull = BorderRadius.all(Radius.circular(radiusFull));

  // Bottom sheet radius (top only)
  static const BorderRadius bottomSheetRadius = BorderRadius.only(
    topLeft: Radius.circular(radiusLG),
    topRight: Radius.circular(radiusLG),
  );

  // Common box constraints
  static const BoxConstraints buttonConstraints = BoxConstraints(
    minHeight: buttonHeightMD,
    minWidth: 88,
  );
}

import 'package:flutter/material.dart';

import 'app_sizing.dart';
import 'app_spacing.dart';
import 'app_typography.dart';

/// App-wide theme configuration
/// Uses mobile-optimized typography from AppTypography
class AppTheme {
  // Prevent instantiation
  AppTheme._();

  // Brand colors
  static const Color _primaryColor = Colors.cyan;
  static const Color _primaryColorDark = Colors.cyan;
  static const Color _secondaryColor = Colors.cyanAccent;

  /// Light Theme - Mobile optimized
  static ThemeData lightTheme = ThemeData(
    useMaterial3: true,
    brightness: Brightness.light,
    primaryColor: _primaryColor,
    canvasColor: Colors.white,
    scaffoldBackgroundColor: Colors.white,
    colorScheme: const ColorScheme.light(
      primary: _primaryColor,
      secondary: _secondaryColor,
    ),

    // Mobile-optimized typography (reduced from desktop sizes)
    textTheme: AppTypography.mobileTextTheme.apply(
      bodyColor: Colors.black,
      displayColor: Colors.black,
    ),

    // Button theme with mobile-friendly sizing
    elevatedButtonTheme: ElevatedButtonThemeData(
      style: ElevatedButton.styleFrom(
        foregroundColor: Colors.white,
        backgroundColor: _primaryColor,
        shape: const RoundedRectangleBorder(
          borderRadius: AppSizing.borderRadiusSM,
        ),
        padding: AppSpacing.buttonPadding,
        minimumSize: const Size(88, AppSizing.buttonHeightMD),
      ),
    ),

    // Text button theme
    textButtonTheme: TextButtonThemeData(
      style: TextButton.styleFrom(
        foregroundColor: _primaryColor,
        padding: AppSpacing.buttonPadding,
        minimumSize: const Size(64, AppSizing.buttonHeightMD),
      ),
    ),

    // Outlined button theme
    outlinedButtonTheme: OutlinedButtonThemeData(
      style: OutlinedButton.styleFrom(
        foregroundColor: _primaryColor,
        side: const BorderSide(color: _primaryColor),
        shape: const RoundedRectangleBorder(
          borderRadius: AppSizing.borderRadiusSM,
        ),
        padding: AppSpacing.buttonPadding,
        minimumSize: const Size(88, AppSizing.buttonHeightMD),
      ),
    ),

    floatingActionButtonTheme: const FloatingActionButtonThemeData(
      backgroundColor: _primaryColor,
      foregroundColor: Colors.white,
    ),

    // AppBar with mobile-optimized title size
    appBarTheme: AppBarTheme(
      backgroundColor: _primaryColor,
      elevation: 0,
      centerTitle: true,
      titleTextStyle: AppTypography.mobileTextTheme.titleLarge?.copyWith(
        color: Colors.white,
        fontWeight: FontWeight.w600,
      ),
      iconTheme: const IconThemeData(
        color: Colors.white,
        size: AppSizing.iconMD,
      ),
    ),

    // Input decoration with proper sizing
    inputDecorationTheme: const InputDecorationTheme(
      border: OutlineInputBorder(
        borderRadius: AppSizing.borderRadiusSM,
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: AppSizing.borderRadiusSM,
        borderSide: BorderSide(color: _primaryColor, width: 2),
      ),
      contentPadding: AppSpacing.inputPadding,
      isDense: true,
    ),

    // Card theme
    cardTheme: const CardThemeData(
      elevation: 2,
      shape: RoundedRectangleBorder(
        borderRadius: AppSizing.borderRadiusMD,
      ),
      margin: EdgeInsets.symmetric(
        horizontal: AppSpacing.sm,
        vertical: AppSpacing.xs,
      ),
    ),

    // Bottom sheet theme
    bottomSheetTheme: const BottomSheetThemeData(
      shape: RoundedRectangleBorder(
        borderRadius: AppSizing.bottomSheetRadius,
      ),
    ),

    // Chip theme
    chipTheme: const ChipThemeData(
      shape: RoundedRectangleBorder(
        borderRadius: AppSizing.borderRadiusFull,
      ),
      padding: EdgeInsets.symmetric(
        horizontal: AppSpacing.sm,
        vertical: AppSpacing.xs,
      ),
    ),

    // Divider theme
    dividerTheme: const DividerThemeData(
      thickness: 1,
      space: AppSpacing.lg,
    ),
  );

  /// Dark Theme - Mobile optimized
  static ThemeData darkTheme = ThemeData(
    useMaterial3: true,
    brightness: Brightness.dark,
    primaryColor: _primaryColorDark,
    scaffoldBackgroundColor: Colors.black,
    colorScheme: const ColorScheme.dark(
      primary: _primaryColorDark,
      secondary: _secondaryColor,
      onPrimary: Colors.white,
    ),

    // Mobile-optimized typography (reduced from desktop sizes)
    textTheme: AppTypography.mobileTextTheme.apply(
      bodyColor: Colors.white,
      displayColor: Colors.white,
    ),

    // Button theme with mobile-friendly sizing
    elevatedButtonTheme: ElevatedButtonThemeData(
      style: ElevatedButton.styleFrom(
        foregroundColor: Colors.white,
        backgroundColor: _primaryColorDark,
        shape: const RoundedRectangleBorder(
          borderRadius: AppSizing.borderRadiusSM,
        ),
        padding: AppSpacing.buttonPadding,
        minimumSize: const Size(88, AppSizing.buttonHeightMD),
      ),
    ),

    // Text button theme
    textButtonTheme: TextButtonThemeData(
      style: TextButton.styleFrom(
        foregroundColor: _primaryColorDark,
        padding: AppSpacing.buttonPadding,
        minimumSize: const Size(64, AppSizing.buttonHeightMD),
      ),
    ),

    // Outlined button theme
    outlinedButtonTheme: OutlinedButtonThemeData(
      style: OutlinedButton.styleFrom(
        foregroundColor: _primaryColorDark,
        side: const BorderSide(color: _primaryColorDark),
        shape: const RoundedRectangleBorder(
          borderRadius: AppSizing.borderRadiusSM,
        ),
        padding: AppSpacing.buttonPadding,
        minimumSize: const Size(88, AppSizing.buttonHeightMD),
      ),
    ),

    floatingActionButtonTheme: const FloatingActionButtonThemeData(
      backgroundColor: _primaryColorDark,
      foregroundColor: Colors.white,
    ),

    // AppBar with mobile-optimized title size
    appBarTheme: AppBarTheme(
      backgroundColor: _primaryColorDark,
      elevation: 0,
      centerTitle: true,
      titleTextStyle: AppTypography.mobileTextTheme.titleLarge?.copyWith(
        color: Colors.white,
        fontWeight: FontWeight.w600,
      ),
      iconTheme: const IconThemeData(
        color: Colors.white,
        size: AppSizing.iconMD,
      ),
    ),

    // Input decoration with proper sizing
    inputDecorationTheme: const InputDecorationTheme(
      border: OutlineInputBorder(
        borderRadius: AppSizing.borderRadiusSM,
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: AppSizing.borderRadiusSM,
        borderSide: BorderSide(color: _primaryColorDark, width: 2),
      ),
      contentPadding: AppSpacing.inputPadding,
      isDense: true,
    ),

    // Card theme
    cardTheme: const CardThemeData(
      elevation: 2,
      color: Color(0xFF1E1E1E),
      shape: RoundedRectangleBorder(
        borderRadius: AppSizing.borderRadiusMD,
      ),
      margin: EdgeInsets.symmetric(
        horizontal: AppSpacing.sm,
        vertical: AppSpacing.xs,
      ),
    ),

    // Bottom sheet theme
    bottomSheetTheme: const BottomSheetThemeData(
      backgroundColor: Color(0xFF1E1E1E),
      shape: RoundedRectangleBorder(
        borderRadius: AppSizing.bottomSheetRadius,
      ),
    ),

    // Chip theme
    chipTheme: const ChipThemeData(
      shape: RoundedRectangleBorder(
        borderRadius: AppSizing.borderRadiusFull,
      ),
      padding: EdgeInsets.symmetric(
        horizontal: AppSpacing.sm,
        vertical: AppSpacing.xs,
      ),
    ),

    // Divider theme
    dividerTheme: const DividerThemeData(
      thickness: 1,
      space: AppSpacing.lg,
      color: Color(0xFF2C2C2C),
    ),
  );
}

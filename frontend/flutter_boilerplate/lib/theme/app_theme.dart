
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'design_system/app_colors.dart';
import 'design_system/app_dimensions.dart';
import 'design_system/app_typography.dart';

/// App-wide theme configuration using the Lumière Design System
class AppTheme {
  // Prevent instantiation
  AppTheme._();

  /// Light Theme - Lumière
  static ThemeData lightTheme = ThemeData(
    useMaterial3: true,
    brightness: Brightness.light,
    
    // Colors
    primaryColor: AppColors.primary,
    canvasColor: AppColors.paper,
    scaffoldBackgroundColor: AppColors.paper,
    cardColor: AppColors.paper,
    dividerColor: AppColors.divider,
    
    colorScheme: const ColorScheme.light(
      primary: AppColors.primary,
      onPrimary: Colors.white,
      secondary: AppColors.ink,
      onSecondary: Colors.white,
      surface: AppColors.paper,
      onSurface: AppColors.ink,
      error: AppColors.danger,
      onError: Colors.white,
      outline: AppColors.divider,
    ),

    // Typography
    textTheme: TextTheme(
      // Display
      displayLarge: AppTypography.h1,
      displayMedium: AppTypography.h1.copyWith(fontSize: 20),
      displaySmall: AppTypography.h1.copyWith(fontSize: 18),
      
      // Headlines
      headlineLarge: AppTypography.h2,
      headlineMedium: AppTypography.h3,
      headlineSmall: AppTypography.h3.copyWith(fontSize: 16),
      
      // Titles (Used for Cards, Lists)
      titleLarge: AppTypography.headerSerif.copyWith(fontSize: 18), 
      titleMedium: AppTypography.uiSans.copyWith(fontSize: 16, fontWeight: FontWeight.w600),
      titleSmall: AppTypography.uiSans.copyWith(fontSize: 14, fontWeight: FontWeight.w600),
      
      // Body
      bodyLarge: AppTypography.body, 
      bodyMedium: AppTypography.body.copyWith(fontSize: 13),
      bodySmall: AppTypography.meta, // for metadata
      
      // Labels (Buttons)
      labelLarge: AppTypography.label,
      labelMedium: AppTypography.label.copyWith(fontSize: 11),
      labelSmall: AppTypography.label.copyWith(fontSize: 10),
    ),

    // AppBar
    appBarTheme: AppBarTheme(
      backgroundColor: AppColors.paper.withOpacity(0.95),
      foregroundColor: AppColors.ink,
      elevation: 0,
      centerTitle: false,
      scrolledUnderElevation: 0,
      systemOverlayStyle: SystemUiOverlayStyle.dark,
      titleTextStyle: AppTypography.h1.copyWith(fontSize: 20),
      iconTheme: const IconThemeData(
        color: AppColors.ink,
        size: 24,
      ),
      shape: const Border(bottom: BorderSide(color: AppColors.divider)),
    ),

    // Buttons
    elevatedButtonTheme: ElevatedButtonThemeData(
      style: ElevatedButton.styleFrom(
        foregroundColor: Colors.white,
        backgroundColor: AppColors.primary,
        elevation: 0,
        shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.all(Radius.circular(AppDimensions.radiusSM)),
        ),
        padding: const EdgeInsets.symmetric(
          horizontal: AppDimensions.space16, 
          vertical: AppDimensions.space12
        ),
        textStyle: AppTypography.label,
      ),
    ),
    
    outlinedButtonTheme: OutlinedButtonThemeData(
      style: OutlinedButton.styleFrom(
        foregroundColor: AppColors.primary,
        side: const BorderSide(color: AppColors.divider),
        shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.all(Radius.circular(AppDimensions.radiusPill)),
        ),
        padding: const EdgeInsets.symmetric(
          horizontal: AppDimensions.space20, 
          vertical: AppDimensions.space8 // compact
        ),
        textStyle: AppTypography.label,
      ),
    ),

    textButtonTheme: TextButtonThemeData(
      style: TextButton.styleFrom(
        foregroundColor: AppColors.primary,
        padding: const EdgeInsets.symmetric(
          horizontal: AppDimensions.space12, 
          vertical: AppDimensions.space8
        ),
        textStyle: AppTypography.label,
      ),
    ),
    
    // Floating Action Button
    floatingActionButtonTheme: const FloatingActionButtonThemeData(
      backgroundColor: AppColors.primary,
      foregroundColor: Colors.white,
      elevation: 4,
    ),

    // Input Decoration
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: AppColors.paperAlt,
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(AppDimensions.radiusSM),
        borderSide: BorderSide.none,
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(AppDimensions.radiusSM),
        borderSide: const BorderSide(color: AppColors.primary, width: 1),
      ),
      contentPadding: const EdgeInsets.symmetric(
        horizontal: AppDimensions.space16, 
        vertical: AppDimensions.space12
      ),
      hintStyle: AppTypography.uiSans.copyWith(color: AppColors.inkLighter),
    ),

    // Card
    cardTheme: const CardThemeData(
      color: AppColors.paper,
      elevation: 0, // Using custom shadows usually, but default to flat
      shape: RoundedRectangleBorder(
        side: BorderSide(color: AppColors.divider),
        borderRadius: BorderRadius.all(Radius.circular(AppDimensions.radiusSM)),
      ),
      margin: EdgeInsets.symmetric(
        horizontal: AppDimensions.space16, 
        vertical: AppDimensions.space8
      ),
    ),

    // Bottom Sheet
    bottomSheetTheme: const BottomSheetThemeData(
      backgroundColor: AppColors.paper,
      modalBackgroundColor: AppColors.paper,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(AppDimensions.radiusLG)),
      ),
    ),

    // Chip
    chipTheme: ChipThemeData(
      backgroundColor: AppColors.paper,
      disabledColor: AppColors.paperAlt,
      selectedColor: AppColors.primary,
      secondarySelectedColor: AppColors.primary,
      padding: const EdgeInsets.symmetric(horizontal: AppDimensions.space12, vertical: AppDimensions.space8),
      labelStyle: AppTypography.uiSans.copyWith(fontSize: 12),
      secondaryLabelStyle: AppTypography.uiSans.copyWith(fontSize: 12, color: Colors.white),
      brightness: Brightness.light,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.all(Radius.circular(AppDimensions.radiusPill)),
        side: BorderSide(color: AppColors.divider),
      ),
    ),

    // Divider
    dividerTheme: const DividerThemeData(
      thickness: 1,
      space: 1,
      color: AppColors.divider,
    ),
  );

  /// Dark Theme - Not strictly defined in Lumière specs yet, falling back to a dark interpretation
  static ThemeData darkTheme = ThemeData(
    useMaterial3: true,
    brightness: Brightness.dark,
    primaryColor: AppColors.primary, // Keep primary
    scaffoldBackgroundColor: const Color(0xFF121212),
    cardColor: const Color(0xFF1E1E1E),
    colorScheme: const ColorScheme.dark(
      primary: AppColors.primary,
      secondary: AppColors.primaryLight,
    ),
    // Reusing tokens where applicable, but this might need a dedicated dark palette later
    textTheme: lightTheme.textTheme.apply(
      bodyColor: Colors.white,
      displayColor: Colors.white,
    ),
  );
}

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'design_system/kitchen_colors.dart';
import 'design_system/kitchen_dimensions.dart';
import 'design_system/kitchen_typography.dart';

/// App-wide theme configuration for Kitchen app.
/// Uses the Kitchen Design System tokens for consistent styling.
///
/// Changing values in the design system files (colors, dimensions, typography)
/// will automatically update the entire app appearance.
class AppTheme {
  // Prevent instantiation
  AppTheme._();

  /// Light Theme
  static ThemeData lightTheme = ThemeData(
    useMaterial3: true,
    brightness: Brightness.light,

    // Colors
    primaryColor: KitchenColors.primary,
    canvasColor: KitchenColors.paper,
    scaffoldBackgroundColor: KitchenColors.paper,
    cardColor: KitchenColors.paper,
    dividerColor: KitchenColors.divider,

    colorScheme: const ColorScheme.light(
      primary: KitchenColors.primary,
      onPrimary: Colors.white,
      primaryContainer: KitchenColors.primaryLight,
      onPrimaryContainer: KitchenColors.primaryDark,
      secondary: KitchenColors.accent,
      onSecondary: Colors.white,
      secondaryContainer: KitchenColors.accentLight,
      onSecondaryContainer: KitchenColors.primaryDark,
      surface: KitchenColors.paper,
      onSurface: KitchenColors.ink,
      surfaceContainerHighest: KitchenColors.paperAlt,
      error: KitchenColors.danger,
      onError: Colors.white,
      outline: KitchenColors.divider,
    ),

    // Typography
    textTheme: TextTheme(
      // Display
      displayLarge: KitchenTypography.h1,
      displayMedium: KitchenTypography.h1.copyWith(fontSize: 20),
      displaySmall: KitchenTypography.h1.copyWith(fontSize: 18),

      // Headlines
      headlineLarge: KitchenTypography.h2,
      headlineMedium: KitchenTypography.h3,
      headlineSmall:
          KitchenTypography.h3.copyWith(fontSize: 16),

      // Titles (Used for Cards, Lists)
      titleLarge: KitchenTypography.h2,
      titleMedium: KitchenTypography.label.copyWith(fontSize: 16),
      titleSmall: KitchenTypography.label.copyWith(fontSize: 14),

      // Body
      bodyLarge: KitchenTypography.bodyLarge,
      bodyMedium: KitchenTypography.bodyMedium,
      bodySmall: KitchenTypography.bodySmall,

      // Labels (Buttons)
      labelLarge: KitchenTypography.label,
      labelMedium: KitchenTypography.labelSmall,
      labelSmall: KitchenTypography.labelSmall.copyWith(fontSize: 10),
    ),

    // AppBar
    appBarTheme: AppBarTheme(
      backgroundColor: KitchenColors.primary,
      foregroundColor: Colors.white,
      elevation: 0,
      centerTitle: false,
      scrolledUnderElevation: 2,
      systemOverlayStyle: SystemUiOverlayStyle.light,
      titleTextStyle: KitchenTypography.h3.copyWith(
        color: Colors.white,
      ),
      iconTheme: const IconThemeData(
        color: Colors.white,
        size: 24,
      ),
    ),

    // Bottom Navigation
    bottomNavigationBarTheme: const BottomNavigationBarThemeData(
      backgroundColor: KitchenColors.paper,
      selectedItemColor: KitchenColors.primary,
      unselectedItemColor: KitchenColors.inkLighter,
      type: BottomNavigationBarType.fixed,
      elevation: 8,
      selectedLabelStyle: KitchenTypography.labelSmall,
      unselectedLabelStyle: KitchenTypography.labelSmall,
    ),

    // Elevated Button
    elevatedButtonTheme: ElevatedButtonThemeData(
      style: ElevatedButton.styleFrom(
        foregroundColor: Colors.white,
        backgroundColor: KitchenColors.primary,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius:
              BorderRadius.circular(KitchenDimensions.radiusMD),
        ),
        padding: const EdgeInsets.symmetric(
          horizontal: KitchenDimensions.space16,
          vertical: KitchenDimensions.space12,
        ),
        textStyle: KitchenTypography.label,
      ),
    ),

    // Outlined Button
    outlinedButtonTheme: OutlinedButtonThemeData(
      style: OutlinedButton.styleFrom(
        foregroundColor: KitchenColors.primary,
        side: const BorderSide(color: KitchenColors.primary),
        shape: RoundedRectangleBorder(
          borderRadius:
              BorderRadius.circular(KitchenDimensions.radiusMD),
        ),
        padding: const EdgeInsets.symmetric(
          horizontal: KitchenDimensions.space16,
          vertical: KitchenDimensions.space12,
        ),
        textStyle: KitchenTypography.label,
      ),
    ),

    // Text Button
    textButtonTheme: TextButtonThemeData(
      style: TextButton.styleFrom(
        foregroundColor: KitchenColors.primary,
        padding: const EdgeInsets.symmetric(
          horizontal: KitchenDimensions.space12,
          vertical: KitchenDimensions.space8,
        ),
        textStyle: KitchenTypography.label,
      ),
    ),

    // Floating Action Button
    floatingActionButtonTheme: const FloatingActionButtonThemeData(
      backgroundColor: KitchenColors.primary,
      foregroundColor: Colors.white,
      elevation: 4,
    ),

    // Input Decoration
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: KitchenColors.paperAlt,
      border: OutlineInputBorder(
        borderRadius:
            BorderRadius.circular(KitchenDimensions.radiusMD),
        borderSide: BorderSide.none,
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius:
            BorderRadius.circular(KitchenDimensions.radiusMD),
        borderSide: const BorderSide(color: KitchenColors.border),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius:
            BorderRadius.circular(KitchenDimensions.radiusMD),
        borderSide:
            const BorderSide(color: KitchenColors.primary, width: 2),
      ),
      errorBorder: OutlineInputBorder(
        borderRadius:
            BorderRadius.circular(KitchenDimensions.radiusMD),
        borderSide: const BorderSide(color: KitchenColors.danger),
      ),
      contentPadding: const EdgeInsets.symmetric(
        horizontal: KitchenDimensions.space16,
        vertical: KitchenDimensions.space12,
      ),
      hintStyle: KitchenTypography.bodyMedium.copyWith(
        color: KitchenColors.inkLighter,
      ),
    ),

    // Card
    cardTheme: CardThemeData(
      color: KitchenColors.paper,
      elevation: 0,
      shape: RoundedRectangleBorder(
        side: const BorderSide(color: KitchenColors.divider),
        borderRadius:
            BorderRadius.circular(KitchenDimensions.radiusMD),
      ),
      margin: const EdgeInsets.symmetric(
        horizontal: KitchenDimensions.space16,
        vertical: KitchenDimensions.space8,
      ),
    ),

    // Bottom Sheet
    bottomSheetTheme: const BottomSheetThemeData(
      backgroundColor: KitchenColors.paper,
      modalBackgroundColor: KitchenColors.paper,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(
          top: Radius.circular(KitchenDimensions.radiusLG),
        ),
      ),
    ),

    // Chip
    chipTheme: ChipThemeData(
      backgroundColor: KitchenColors.paper,
      disabledColor: KitchenColors.paperAlt,
      selectedColor: KitchenColors.primary,
      secondarySelectedColor: KitchenColors.primary,
      padding: const EdgeInsets.symmetric(
        horizontal: KitchenDimensions.space12,
        vertical: KitchenDimensions.space8,
      ),
      labelStyle: KitchenTypography.labelSmall,
      secondaryLabelStyle:
          KitchenTypography.labelSmall.copyWith(color: Colors.white),
      shape: RoundedRectangleBorder(
        borderRadius:
            BorderRadius.circular(KitchenDimensions.radiusPill),
        side: const BorderSide(color: KitchenColors.divider),
      ),
    ),

    // Divider
    dividerTheme: const DividerThemeData(
      thickness: 1,
      space: 1,
      color: KitchenColors.divider,
    ),

    // Snackbar
    snackBarTheme: SnackBarThemeData(
      backgroundColor: KitchenColors.ink,
      contentTextStyle:
          KitchenTypography.bodyMedium.copyWith(color: Colors.white),
      shape: RoundedRectangleBorder(
        borderRadius:
            BorderRadius.circular(KitchenDimensions.radiusMD),
      ),
      behavior: SnackBarBehavior.floating,
    ),

    // Dialog
    dialogTheme: DialogThemeData(
      backgroundColor: KitchenColors.paper,
      shape: RoundedRectangleBorder(
        borderRadius:
            BorderRadius.circular(KitchenDimensions.radiusLG),
      ),
      titleTextStyle: KitchenTypography.h3,
      contentTextStyle: KitchenTypography.bodyMedium,
    ),
  );

  /// Dark Theme
  static ThemeData darkTheme = ThemeData(
    useMaterial3: true,
    brightness: Brightness.dark,

    // Colors
    primaryColor: KitchenColors.primary,
    scaffoldBackgroundColor: KitchenColors.darkSurface,
    cardColor: KitchenColors.darkSurfaceElevated,
    dividerColor: KitchenColors.darkDivider,

    colorScheme: const ColorScheme.dark(
      primary: KitchenColors.primary,
      onPrimary: Colors.white,
      primaryContainer: KitchenColors.primaryDark,
      onPrimaryContainer: KitchenColors.primaryLight,
      secondary: KitchenColors.accent,
      onSecondary: Colors.white,
      surface: KitchenColors.darkSurface,
      onSurface: Colors.white,
      surfaceContainerHighest: KitchenColors.darkSurfaceElevated,
      error: KitchenColors.danger,
      onError: Colors.white,
      outline: KitchenColors.darkDivider,
    ),

    // Typography with white text
    textTheme: lightTheme.textTheme.apply(
      bodyColor: Colors.white,
      displayColor: Colors.white,
    ),

    // AppBar
    appBarTheme: AppBarTheme(
      backgroundColor: KitchenColors.darkSurfaceElevated,
      foregroundColor: Colors.white,
      elevation: 0,
      centerTitle: false,
      scrolledUnderElevation: 2,
      systemOverlayStyle: SystemUiOverlayStyle.light,
      titleTextStyle: KitchenTypography.h3.copyWith(color: Colors.white),
      iconTheme: const IconThemeData(
        color: Colors.white,
        size: 24,
      ),
    ),

    // Bottom Navigation
    bottomNavigationBarTheme: BottomNavigationBarThemeData(
      backgroundColor: KitchenColors.darkSurfaceElevated,
      selectedItemColor: KitchenColors.primaryLight,
      unselectedItemColor: Colors.white60,
      type: BottomNavigationBarType.fixed,
      elevation: 8,
      selectedLabelStyle: KitchenTypography.labelSmall,
      unselectedLabelStyle: KitchenTypography.labelSmall,
    ),

    // Card
    cardTheme: CardThemeData(
      color: KitchenColors.darkSurfaceElevated,
      elevation: 0,
      shape: RoundedRectangleBorder(
        side: const BorderSide(color: KitchenColors.darkDivider),
        borderRadius:
            BorderRadius.circular(KitchenDimensions.radiusMD),
      ),
      margin: const EdgeInsets.symmetric(
        horizontal: KitchenDimensions.space16,
        vertical: KitchenDimensions.space8,
      ),
    ),

    // Input Decoration
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: KitchenColors.darkSurfaceElevated,
      border: OutlineInputBorder(
        borderRadius:
            BorderRadius.circular(KitchenDimensions.radiusMD),
        borderSide: BorderSide.none,
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius:
            BorderRadius.circular(KitchenDimensions.radiusMD),
        borderSide: const BorderSide(color: KitchenColors.darkDivider),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius:
            BorderRadius.circular(KitchenDimensions.radiusMD),
        borderSide:
            const BorderSide(color: KitchenColors.primary, width: 2),
      ),
      contentPadding: const EdgeInsets.symmetric(
        horizontal: KitchenDimensions.space16,
        vertical: KitchenDimensions.space12,
      ),
      hintStyle: KitchenTypography.bodyMedium.copyWith(
        color: Colors.white54,
      ),
    ),
  );
}
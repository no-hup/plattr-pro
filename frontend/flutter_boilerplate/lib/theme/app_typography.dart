import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

/// Typography constants optimized for mobile
/// Font sizes reduced from desktop values to be mobile-appropriate
abstract class AppTypography {
  // Font weights for semantic naming
  static const FontWeight light = FontWeight.w300;
  static const FontWeight regular = FontWeight.w400;
  static const FontWeight medium = FontWeight.w500;
  static const FontWeight semiBold = FontWeight.w600;
  static const FontWeight bold = FontWeight.w700;

  // Base Font Families
  static TextStyle get uiSans => GoogleFonts.workSans();
  static TextStyle get uiSerif => GoogleFonts.playfairDisplay();
  static TextStyle get uiSerifAlt => GoogleFonts.lora();

  // Line height multipliers
  static const double lineHeightTight = 1.2;
  static const double lineHeightNormal = 1.4;
  static const double lineHeightRelaxed = 1.5;
  static const double lineHeightLoose = 1.75;

  // Mobile-optimized font sizes (reduced from desktop)
  static const double fontSizeXXS = 10;
  static const double fontSizeXS = 11;
  static const double fontSizeSM = 12;
  static const double fontSizeMD = 14;
  static const double fontSizeLG = 16;
  static const double fontSizeXL = 18;
  static const double fontSizeXXL = 20;
  static const double fontSizeDisplay = 22;
  static const double fontSizeDisplayLG = 24;

  /// Mobile-optimized text theme
  /// Uses reduced font sizes compared to desktop
  static TextTheme get mobileTextTheme => const TextTheme(
        // Display styles (for hero sections, rarely used on mobile)
        displayLarge: TextStyle(
          fontSize: fontSizeDisplayLG,
          fontWeight: bold,
          height: lineHeightTight,
          letterSpacing: -0.5,
        ),
        displayMedium: TextStyle(
          fontSize: fontSizeDisplay,
          fontWeight: bold,
          height: lineHeightTight,
          letterSpacing: -0.25,
        ),
        displaySmall: TextStyle(
          fontSize: fontSizeXXL,
          fontWeight: bold,
          height: lineHeightTight,
        ),

        // Headlines - for page titles and sections
        headlineLarge: TextStyle(
          fontSize: fontSizeXXL,
          fontWeight: semiBold,
          height: lineHeightNormal,
        ),
        headlineMedium: TextStyle(
          fontSize: fontSizeXL,
          fontWeight: semiBold,
          height: lineHeightNormal,
        ),
        headlineSmall: TextStyle(
          fontSize: fontSizeLG,
          fontWeight: semiBold,
          height: lineHeightNormal,
        ),

        // Titles - for cards, list items, dialogs
        titleLarge: TextStyle(
          fontSize: fontSizeXL, // 18px - reduced from 32px
          fontWeight: semiBold,
          height: lineHeightNormal,
        ),
        titleMedium: TextStyle(
          fontSize: fontSizeLG, // 16px - reduced from 28px
          fontWeight: medium,
          height: lineHeightNormal,
        ),
        titleSmall: TextStyle(
          fontSize: fontSizeMD, // 14px
          fontWeight: medium,
          height: lineHeightNormal,
        ),

        // Body text - for content
        bodyLarge: TextStyle(
          fontSize: fontSizeLG, // 16px - increased from 14px for readability
          fontWeight: regular,
          height: lineHeightRelaxed,
        ),
        bodyMedium: TextStyle(
          fontSize: fontSizeMD, // 14px - increased from 12px
          fontWeight: regular,
          height: lineHeightRelaxed,
        ),
        bodySmall: TextStyle(
          fontSize: fontSizeSM, // 12px
          fontWeight: regular,
          height: lineHeightRelaxed,
        ),

        // Labels - for buttons, form fields, badges
        labelLarge: TextStyle(
          fontSize: fontSizeMD, // 14px - reduced from 16px
          fontWeight: medium,
          height: lineHeightNormal,
        ),
        labelMedium: TextStyle(
          fontSize: fontSizeSM, // 12px
          fontWeight: medium,
          height: lineHeightNormal,
        ),
        labelSmall: TextStyle(
          fontSize: fontSizeXS, // 11px
          fontWeight: medium,
          height: lineHeightNormal,
          letterSpacing: 0.5,
        ),
      );

  /// Category tabs (uppercase, wide tracking)
  static TextStyle get categoryTab => uiSans.copyWith(
        fontSize: 12,
        fontWeight: FontWeight.w700,
        letterSpacing: 2.0, // tracking-widest
      );


  /// Helper to apply color to text style
  static TextStyle withColor(TextStyle style, Color color) {
    return style.copyWith(color: color);
  }

  // Static accessors for common styles
  static TextStyle get h1 => mobileTextTheme.headlineLarge!;
  static TextStyle get h2 => mobileTextTheme.headlineMedium!;
  static TextStyle get h3 => mobileTextTheme.titleLarge!;
  
  static TextStyle get body => mobileTextTheme.bodyMedium!;
  static TextStyle get bodySmall => mobileTextTheme.bodySmall!;
  
  static TextStyle get labelLarge => mobileTextTheme.labelLarge!;
  static TextStyle get label => mobileTextTheme.labelLarge!; // Alias for labelLarge if used
  static TextStyle get labelMedium => mobileTextTheme.labelMedium!;
  static TextStyle get labelSmall => mobileTextTheme.labelSmall!;
  
  static TextStyle get price => uiSans.copyWith(
    fontSize: fontSizeLG,
    fontWeight: bold,
    letterSpacing: -0.5,
  );
}


import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'app_colors.dart';

/// Semantic typography tokens for the Lumière design system.
/// Uses Google Fonts: Playfair Display (Serif headers), Lora (Serif body), Work Sans (UI Sans).
class AppTypography {
  // Prevent instantiation
  AppTypography._();

  // Text Styles
  
  /// Serif Header (Playfair Display) - Used for main titles and brand names
  static TextStyle get headerSerif => GoogleFonts.playfairDisplay(
    color: AppColors.ink,
    fontWeight: FontWeight.w700,
  );
  
  /// Body Serif (Lora) - Used for manufacturing/descriptive text
  static TextStyle get bodySerif => GoogleFonts.lora(
    color: AppColors.ink,
    fontWeight: FontWeight.w400,
  );
  
  /// UI Sans (Work Sans) - Used for prices, buttons, labels, dense info
  static TextStyle get uiSans => GoogleFonts.workSans(
    color: AppColors.ink,
    fontWeight: FontWeight.w500,
  );

  // Semantic Sizes & Styles
  
  // Headers
  static TextStyle get h1 => headerSerif.copyWith(fontSize: 24, fontStyle: FontStyle.italic); // Logo/Brand
  static TextStyle get h2 => uiSans.copyWith(fontSize: 14, fontWeight: FontWeight.w700, letterSpacing: 1.5, color: AppColors.ink.withOpacity(0.4)); // Section headers (uppercase)
  static TextStyle get h3 => headerSerif.copyWith(fontSize: 18, fontWeight: FontWeight.w500); // Card titles
  
  // Body
  static TextStyle get body => bodySerif.copyWith(fontSize: 14, fontStyle: FontStyle.italic, color: AppColors.inkLight); // Item descriptions
  
  // UI Elements
  static TextStyle get label => uiSans.copyWith(fontSize: 12, fontWeight: FontWeight.w700, letterSpacing: 1.0); // Buttons, badges
  static TextStyle get price => uiSans.copyWith(fontSize: 16, fontWeight: FontWeight.w500, color: AppColors.inkLight); // Prices
  static TextStyle get meta => uiSans.copyWith(fontSize: 11, fontWeight: FontWeight.w500, letterSpacing: 0.5, color: AppColors.inkLight); // Metadata (Table info)
}

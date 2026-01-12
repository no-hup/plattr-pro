# Design Token System Documentation

> **Created:** 2026-01-11  
> **Status:** Implemented  
> **Purpose:** Centralized design tokens for consistent, mobile-optimized UI

---

## Overview

The Plattr-Pro Flutter app uses a comprehensive design token system to ensure consistent spacing, sizing, typography, and theming across all components. This system is located in `lib/theme/` and provides a single source of truth for all UI constants.

## File Structure

```
lib/theme/
├── app_spacing.dart      # Spacing constants (padding, margins, gaps)
├── app_sizing.dart       # Component sizing (icons, buttons, radius)
├── app_typography.dart   # Mobile-optimized text styles
├── app_extensions.dart   # BuildContext extensions for shortcuts
├── app_theme.dart        # ThemeData definitions (light/dark)
└── theme.dart            # Barrel export file
```

---

## Usage

### Importing the Theme System

Use the barrel export for clean imports:

```dart
import 'package:flutterboilerplate/theme/theme.dart';
```

This single import provides access to all theme-related constants.

---

## Spacing Tokens (`AppSpacing`)

### Named Spacing Values

| Token | Value | Usage |
|-------|-------|-------|
| `xxs` | 2.0 | Extra extra small gaps |
| `xs` | 4.0 | Extra small gaps, icon gaps |
| `sm` | 8.0 | Small gaps, compact padding |
| `md` | 12.0 | Medium gaps, card padding |
| `lg` | 16.0 | Large gaps, page padding (default) |
| `xl` | 24.0 | Extra large gaps, section breaks |
| `xxl` | 32.0 | Major section breaks |
| `xxxl` | 48.0 | Hero/major spacing |

### Pre-built EdgeInsets

```dart
// Page-level padding
padding: AppSpacing.pagePadding,         // EdgeInsets.all(16)
padding: AppSpacing.pagePaddingHorizontal, // EdgeInsets.symmetric(horizontal: 16)

// Card padding
padding: AppSpacing.cardPadding,         // EdgeInsets.all(12)
padding: AppSpacing.cardPaddingCompact,  // EdgeInsets.all(8)

// List items
padding: AppSpacing.listItemPadding,     // EdgeInsets.symmetric(h: 16, v: 8)

// Buttons
padding: AppSpacing.buttonPadding,       // EdgeInsets.symmetric(h: 16, v: 8)

// Inputs
padding: AppSpacing.inputPadding,        // EdgeInsets.symmetric(h: 12, v: 8)
```

### Pre-built SizedBox Widgets

These are `const` for performance:

```dart
// Vertical spacing
AppSpacing.verticalXXS,  // SizedBox(height: 2)
AppSpacing.verticalXS,   // SizedBox(height: 4)
AppSpacing.verticalSM,   // SizedBox(height: 8)
AppSpacing.verticalMD,   // SizedBox(height: 12)
AppSpacing.verticalLG,   // SizedBox(height: 16)
AppSpacing.verticalXL,   // SizedBox(height: 24)
AppSpacing.verticalXXL,  // SizedBox(height: 32)

// Horizontal spacing
AppSpacing.horizontalXS, // SizedBox(width: 4)
AppSpacing.horizontalSM, // SizedBox(width: 8)
AppSpacing.horizontalMD, // SizedBox(width: 12)
AppSpacing.horizontalLG, // SizedBox(width: 16)
// ... etc
```

---

## Sizing Tokens (`AppSizing`)

### Icon Sizes

| Token | Value | Usage |
|-------|-------|-------|
| `iconXS` | 16.0 | Inline icons, badges |
| `iconSM` | 20.0 | Small icons |
| `iconMD` | 24.0 | Standard icons (default) |
| `iconLG` | 32.0 | Large icons |
| `iconXL` | 48.0 | Hero icons |

### Button Heights

| Token | Value | Usage |
|-------|-------|-------|
| `buttonHeightSM` | 32.0 | Compact buttons |
| `buttonHeightMD` | 40.0 | Standard buttons |
| `buttonHeightLG` | 48.0 | Large buttons |
| `buttonHeightXL` | 56.0 | Hero buttons |

### Border Radius

```dart
// Named values
AppSizing.radiusXS   // 4.0
AppSizing.radiusSM   // 8.0
AppSizing.radiusMD   // 12.0
AppSizing.radiusLG   // 16.0
AppSizing.radiusXL   // 24.0
AppSizing.radiusFull // 999.0 (pill shape)

// Pre-built BorderRadius (const)
AppSizing.borderRadiusSM  // BorderRadius.circular(8)
AppSizing.borderRadiusMD  // BorderRadius.circular(12)
AppSizing.borderRadiusLG  // BorderRadius.circular(16)
// ... etc

// Special: Bottom sheet radius (top corners only)
AppSizing.bottomSheetRadius
```

---

## Typography (`AppTypography`)

### Mobile-Optimized Text Theme

All font sizes are optimized for mobile screens (reduced from desktop sizes):

| Style | Font Size | Weight | Usage |
|-------|-----------|--------|-------|
| `displayLarge` | 32 | bold | Splash screens |
| `displayMedium` | 28 | bold | Hero text |
| `displaySmall` | 24 | bold | Large headers |
| `headlineLarge` | 22 | semiBold | Page titles |
| `headlineMedium` | 20 | semiBold | Section headers |
| `headlineSmall` | 18 | semiBold | Subsection headers |
| `titleLarge` | 18 | semiBold | Card titles |
| `titleMedium` | 16 | medium | Item titles |
| `titleSmall` | 14 | medium | Subtitles |
| `bodyLarge` | 16 | regular | Primary body text |
| `bodyMedium` | 14 | regular | Secondary body text |
| `bodySmall` | 12 | regular | Captions |
| `labelLarge` | 14 | medium | Button text |
| `labelMedium` | 12 | medium | Tags, badges |
| `labelSmall` | 11 | medium | Small labels |

### Usage

```dart
// Use from Theme.of(context)
Text(
  'Title',
  style: Theme.of(context).textTheme.titleLarge,
);

// Or with copyWith for modifications
Text(
  'Bold Title',
  style: Theme.of(context).textTheme.titleLarge?.copyWith(
    fontWeight: FontWeight.bold,
  ),
);
```

---

## Context Extensions (`app_extensions.dart`)

Convenient shortcuts for common theme operations:

```dart
// Typography shortcuts
context.textTheme       // Theme.of(context).textTheme
context.titleLarge      // textTheme.titleLarge
context.titleMedium     // textTheme.titleMedium
context.bodyLarge       // textTheme.bodyLarge
context.bodyMedium      // textTheme.bodyMedium

// Color shortcuts
context.colorScheme     // Theme.of(context).colorScheme
context.primaryColor    // colorScheme.primary
context.surfaceColor    // colorScheme.surface
context.errorColor      // colorScheme.error

// Screen size helpers
context.screenWidth     // MediaQuery.of(context).size.width
context.screenHeight    // MediaQuery.of(context).size.height
context.isSmallPhone    // screenWidth < 360
context.isLargePhone    // screenWidth > 400
```

---

## Best Practices

### ✅ DO

```dart
// Use named spacing constants
padding: AppSpacing.pagePadding,

// Use pre-built SizedBox widgets
AppSpacing.verticalLG,

// Use theme text styles
style: Theme.of(context).textTheme.titleMedium,

// Use sizing constants
size: AppSizing.iconMD,
```

### ❌ DON'T

```dart
// Avoid hardcoded padding
padding: EdgeInsets.all(16),  // Use AppSpacing.pagePadding

// Avoid hardcoded SizedBox
SizedBox(height: 16),  // Use AppSpacing.verticalLG

// Avoid hardcoded TextStyle
style: TextStyle(fontSize: 18),  // Use textTheme.titleMedium

// Avoid hardcoded icon sizes
size: 24,  // Use AppSizing.iconMD
```

---

## Migration Guide

When updating existing code:

1. **Replace EdgeInsets.all(16)** → `AppSpacing.pagePadding`
2. **Replace SizedBox(height: X)** → `AppSpacing.verticalXX`
3. **Replace TextStyle(fontSize: X)** → `Theme.of(context).textTheme.XXX`
4. **Replace hardcoded icon sizes** → `AppSizing.iconXX`
5. **Replace BorderRadius.circular(X)** → `AppSizing.borderRadiusXX`

---

## Adding New Tokens

When adding new design tokens:

1. Add the constant to the appropriate file (`app_spacing.dart`, `app_sizing.dart`, etc.)
2. Document the token in this file
3. Update any related components to use the new token

---

## Changelog

| Date | Change |
|------|--------|
| 2026-01-11 | Initial design token system created |
| 2026-01-11 | Phase 1-5 implementation complete |

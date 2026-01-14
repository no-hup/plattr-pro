# UI Migration & Design System Handbook

This document serves as a guide for UI design revamps. It documents the workflow, key learnings, common mistakes, and best practices for migrating from a legacy codebase to a new design system. It is intended to be used by coding agents and developers to streamline future design transitions.

## 1. Migration Strategy: Bottom-Up Approach

The most effective strategy for a complete UI overhaul is **Bottom-Up**.

1.  **Tokens First (The DNA)**: Never start editing pages until the core tokens are defined.
    *   **Colors**: Define `AppColors`. Avoid hardcoded colors (e.g., `Colors.red`, `Hex codes`) in widgets. Use semantic names (`primary`, `surface`, `error`) over descriptive ones (`blue`, `white`, `red`).
    *   **Typography**: Define `AppTypography`. Create semantic getters (`h1`, `body`, `label`) to decouple usage from specific font families.
    *   **Dimensions**: Define `AppDimensions`. Centralize spacing, radii, and shadow definitions.

2.  **Atoms & Molecules (Core Widgets)**: Refactor small, shared components next.
    *   *Buttons, Inputs, Badges, Tabs*.
    *   Changing these propagates the new design across the app instantly, giving high ROI for low effort.
    *   **Tip**: Ensure these widgets handle their own internal states (loading, disabled) without relying on parent styling.

3.  **Organisms & Pages (Screens)**: Finally, assemble the pages.
    *   Replace legacy layout widgets (e.g., generic `Card` or `Container`) with token-aware components.
    *   Swap standard `AppBar` for a custom, design-aware implementation to enforce consistent navigation and branding.

## 2. Technical Nitty-Gritties & "Gotchas"

### Flutter & Dart Specifics
*   **Deprecations**: Watch out for deprecated methods (like `Color.withOpacity` in newer Flutter versions). Use the latest recommended approach (e.g., `Color.withValues`).
*   **Const Context**: When moving from hardcoded values to `Theme.of(context)` or static classes, you often lose `const` constructors. Be fastidious about adding/removing `const` keywords to avoid linter noise.
*   **Collections**: Watch out for `List` vs `Set` mismatches, especially with code-generated models (like `freezed`).
    *   *Mistake*: Passing a `Set` to a parameter expecting a `List` (or vice versa).
    *   *Fix*: Explicitly call `.toList()` or `.toSet()`.

### Design Implementation
*   **Widget Elevation**: Flat designs often require removing default elevation (shadows) and using custom borders or distinct background colors.
*   **Typography Overrides**: Don't rely solely on default text themes if the design system is strict. Prefer explicitly using your design system's typography class (e.g., `AppTypography.style`).

## 3. Common Mistakes to Avoid

1.  **Partial Migration**: Leaving legacy hardcoded colors in obscure widgets (dialogs, loading indicators, dividers).
    *   *Fix*: Search globally for `Colors.*` or specific hex codes, and replace them with semantic tokens.
2.  **Uninitialized Types**: When extracting reusable widgets, ensure all fields in constructors are initialized properly.
3.  **Logic Regression**:
    *   *Mistake*: Accidental removal of empty state views, error handling, or loading states when rewriting a page's `build` method.
    *   *Fix*: Always duplicate the logic complexity (states: loading, error, empty, data) before applying the new UI. Structure the new code to handle all these states explicitly.
4.  **Missing Imports**: Moving widgets to new files often breaks imports. Run the analyzer immediately after creating new files.

## 4. Agent Workflow Best Practices

For an AI agent performing this task:

1.  **Analyze First**: Run the linter/analyzer *before* marking a task as done. It catches 90% of regressions (typos, imports, types).
2.  **Scoped Refactoring**: Don't rewrite the entire file in one go if it exceeds context limits. Refactor smaller components first.
3.  **Check Data Models**: Before creating a UI that depends on data, read the response model file to understand the exact structure (nested lists? nullable fields? specific maps?).
4.  **Self-Correction**: If a compile error occurs, read the error message carefully. It usually tells you exactly which field is missing or which type is wrong.

## 5. File Structure Recommendation

Keep the design system isolated:
```
lib/
  theme/
    design_system/
      app_colors.dart
      app_typography.dart
      app_dimensions.dart
      app_theme.dart (ThemeData builder)
```
This makes it trivial to swap out the "skin" of the app in the future.

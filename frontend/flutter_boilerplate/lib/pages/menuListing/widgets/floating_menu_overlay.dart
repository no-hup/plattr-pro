import 'package:flutter/material.dart';
import 'package:flutterboilerplate/pages/menuListing/menu_response.dart';
import 'package:flutterboilerplate/theme/theme.dart';
import 'package:flutterboilerplate/widgets/category_overlay.dart';
import 'package:flutterboilerplate/widgets/floating_menu_button.dart';

/// Floating menu button with category overlay for quick navigation.
/// 
/// Features:
/// - FAB toggles between `menu_book` and `close` icons
/// - Overlay positioned above FAB with scrollable category list
/// - Dismiss layer when expanded (tap outside closes)
/// - Proper z-index to avoid conflicts with cart panel
class FloatingMenuOverlay extends StatelessWidget {
  const FloatingMenuOverlay({
    required this.isExpanded,
    required this.categories,
    required this.onToggle,
    required this.onCategoryTap,
    this.bottomOffset = 0,
    super.key,
  });

  final bool isExpanded;
  final List<Category> categories;
  final VoidCallback onToggle;
  final void Function(String categoryId) onCategoryTap;
  
  /// Additional bottom offset for when cart panel is visible
  final double bottomOffset;

  @override
  Widget build(BuildContext context) {
    return Stack(
      children: [
        // Dismiss layer when expanded (transparent, covers entire screen)
        if (isExpanded)
          Positioned.fill(
            child: GestureDetector(
              onTap: onToggle,
              behavior: HitTestBehavior.opaque,
              child: Container(
                color: Colors.black.withOpacity(0.3),
              ),
            ),
          ),

        // Category list overlay
        if (isExpanded)
          Positioned(
            bottom: AppDimensions.fabOverlayOffset + bottomOffset, // Above FAB + cart offset
            right: AppSpacing.lg,
            child: CategoryOverlay(
               categories: categories,
               onCategoryTap: onCategoryTap,
            ),
          ),

        // FAB
        Positioned(
          bottom: AppSpacing.lg + bottomOffset,
          right: AppSpacing.lg,
          child: FloatingMenuButton(
            isExpanded: isExpanded,
            onToggle: onToggle,
          ),
        ),
      ],
    );
  }
}



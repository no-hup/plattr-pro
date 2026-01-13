import 'package:flutter/material.dart';
import 'package:flutterboilerplate/pages/menuListing/menu_response.dart';
import 'package:flutterboilerplate/theme/theme.dart';

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
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    return Stack(
      children: [
        // Dismiss layer when expanded (transparent, covers entire screen)
        if (isExpanded)
          Positioned.fill(
            child: GestureDetector(
              onTap: onToggle,
              behavior: HitTestBehavior.opaque,
              child: Container(
                color: Colors.black.withValues(alpha: 0.3),
              ),
            ),
          ),

        // Category list overlay
        if (isExpanded)
          Positioned(
            bottom: 80 + bottomOffset, // Above FAB + cart offset
            right: AppSpacing.lg,
            child: Material(
              elevation: 8,
              borderRadius: BorderRadius.circular(16),
              color: colorScheme.surface,
              surfaceTintColor: colorScheme.surfaceTint,
              child: ConstrainedBox(
                constraints: BoxConstraints(
                  maxHeight: MediaQuery.of(context).size.height * 0.4,
                  maxWidth: 220,
                  minWidth: 180,
                ),
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(16),
                  child: ListView.separated(
                    shrinkWrap: true,
                    padding: const EdgeInsets.symmetric(vertical: AppSpacing.sm),
                    itemCount: categories.length,
                    separatorBuilder: (context, index) => Divider(
                      height: 1,
                      indent: AppSpacing.md,
                      endIndent: AppSpacing.md,
                      color: colorScheme.outlineVariant,
                    ),
                    itemBuilder: (context, index) {
                      final cat = categories[index];
                      return _CategoryListTile(
                        name: cat.name,
                        onTap: () => onCategoryTap(cat.id),
                      );
                    },
                  ),
                ),
              ),
            ),
          ),

        // FAB
        Positioned(
          bottom: AppSpacing.lg + bottomOffset,
          right: AppSpacing.lg,
          child: FloatingActionButton(
            onPressed: onToggle,
            elevation: isExpanded ? 8 : 6,
            backgroundColor: colorScheme.primaryContainer,
            foregroundColor: colorScheme.onPrimaryContainer,
            child: AnimatedSwitcher(
              duration: const Duration(milliseconds: 200),
              transitionBuilder: (child, animation) => ScaleTransition(
                scale: animation,
                child: child,
              ),
              child: Icon(
                isExpanded ? Icons.close : Icons.menu_book,
                key: ValueKey(isExpanded),
              ),
            ),
          ),
        ),
      ],
    );
  }
}

class _CategoryListTile extends StatelessWidget {
  const _CategoryListTile({
    required this.name,
    required this.onTap,
  });

  final String name;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return InkWell(
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.symmetric(
          horizontal: AppSpacing.md,
          vertical: AppSpacing.sm,
        ),
        child: Row(
          children: [
            Expanded(
              child: Text(
                name,
                style: theme.textTheme.bodyLarge?.copyWith(
                  fontWeight: FontWeight.w500,
                ),
                overflow: TextOverflow.ellipsis,
                maxLines: 1,
              ),
            ),
            const SizedBox(width: AppSpacing.sm),
            Icon(
              Icons.chevron_right,
              size: 20,
              color: theme.colorScheme.onSurfaceVariant,
            ),
          ],
        ),
      ),
    );
  }
}

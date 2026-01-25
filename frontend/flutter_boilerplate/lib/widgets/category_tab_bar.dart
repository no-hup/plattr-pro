import 'package:flutter/material.dart';
import 'package:flutterboilerplate/pages/menuListing/menu_response.dart';
import 'package:flutterboilerplate/theme/theme.dart';

/// Horizontal scrollable tab bar for category navigation.
/// 
/// Features:
/// - Auto-scrolls to keep active tab visible when `activeCategoryId` changes
/// - Hides entirely when there's only one category
/// - Ellipsis for long category names
class CategoryTabBar extends StatefulWidget {
  const CategoryTabBar({
    required this.categories,
    required this.activeCategoryId,
    required this.onCategoryTap,
    super.key,
  });

  final List<Category> categories;
  final String? activeCategoryId;
  final void Function(String categoryId) onCategoryTap;

  @override
  State<CategoryTabBar> createState() => _CategoryTabBarState();
}

class _CategoryTabBarState extends State<CategoryTabBar> {
  /// GlobalKey for each tab to enable `Scrollable.ensureVisible`
  final Map<String, GlobalKey> _tabKeys = {};

  @override
  void initState() {
    super.initState();
    _initializeKeys();
  }

  @override
  void didUpdateWidget(CategoryTabBar oldWidget) {
    super.didUpdateWidget(oldWidget);
    
    // Reinitialize keys if categories changed (length or IDs)
    if (_categoriesChanged(oldWidget.categories, widget.categories)) {
      _initializeKeys();
    }
    
    // When active category changes (from scroll spy), auto-scroll tab bar
    if (widget.activeCategoryId != oldWidget.activeCategoryId) {
      _scrollToActiveTab();
    }
  }

  /// Check if categories have changed (by comparing IDs)
  bool _categoriesChanged(List<Category> oldCats, List<Category> newCats) {
    if (oldCats.length != newCats.length) return true;
    for (int i = 0; i < oldCats.length; i++) {
      if (oldCats[i].id != newCats[i].id) return true;
    }
    return false;
  }

  void _initializeKeys() {
    _tabKeys.clear();
    for (final cat in widget.categories) {
      _tabKeys[cat.id] = GlobalKey();
    }
  }

  void _scrollToActiveTab() {
    if (widget.activeCategoryId == null) return;
    
    final key = _tabKeys[widget.activeCategoryId];
    if (key?.currentContext != null) {
      // Smoothly scroll the tab bar to center the active tab
      Scrollable.ensureVisible(
        key!.currentContext!,
        duration: const Duration(milliseconds: 200),
        curve: Curves.easeOut,
        alignment: 0.5, // 0.5 = center the tab in view
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    // Hide widget entirely when there's only one category
    if (widget.categories.length <= 1) {
      return const SizedBox.shrink();
    }

    return Container(
      height: 48,
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surface,
        border: Border(
          bottom: BorderSide(
            color: AppColors.divider,
            width: 1,
          ),
        ),
      ),
      child: SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: AppSpacing.md),
        child: Row(
          children: widget.categories.map((cat) {
            final isActive = cat.id == widget.activeCategoryId;
            return _CategoryTab(
              key: _tabKeys[cat.id],
              name: cat.name,
              isActive: isActive,
              onTap: () => widget.onCategoryTap(cat.id),
            );
          }).toList(),
        ),
      ),
    );
  }
}

class _CategoryTab extends StatelessWidget {
  const _CategoryTab({
    required this.name,
    required this.isActive,
    required this.onTap,
    super.key,
  });

  final String name;
  final bool isActive;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(
          horizontal: AppSpacing.md,
        ),
        margin: const EdgeInsets.symmetric(
           horizontal: AppSpacing.sm,
        ),
        decoration: BoxDecoration(
          border: isActive
              ? const Border(
                  bottom: BorderSide(
                    color: AppColors.primary,
                    width: 2,
                  ),
                )
              : const Border(bottom: BorderSide.none),
        ),
        alignment: Alignment.center,
        child: Text(
          name.toUpperCase(),
          style: AppTypography.categoryTab.copyWith(
            color: isActive ? AppColors.primary : AppColors.inkMuted,
          ),
        ),
      ),
    );
  }
}


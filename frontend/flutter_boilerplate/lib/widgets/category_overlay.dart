import 'package:flutter/material.dart';
import 'package:flutterboilerplate/theme/theme.dart';
import 'package:flutterboilerplate/pages/menuListing/menu_response.dart';

class CategoryOverlay extends StatelessWidget {
  const CategoryOverlay({
    required this.categories,
    required this.onCategoryTap,
    super.key,
  });

  final List<Category> categories;
  final void Function(String categoryId) onCategoryTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      elevation: 8,
      borderRadius: BorderRadius.circular(AppDimensions.radiusLG),
      color: AppColors.paper,
      surfaceTintColor: Colors.transparent,
      shadowColor: Colors.black.withOpacity(0.1),
      child: ConstrainedBox(
        constraints: BoxConstraints(
          maxHeight: MediaQuery.of(context).size.height * 0.4,
          maxWidth: 220,
          minWidth: 180,
        ),
        child: ClipRRect(
          borderRadius: BorderRadius.circular(AppDimensions.radiusLG),
          child: ListView.separated(
            shrinkWrap: true,
            padding: const EdgeInsets.symmetric(vertical: AppSpacing.xs),
            itemCount: categories.length,
            separatorBuilder: (context, index) => const Divider(
              height: 1,
              indent: AppSpacing.md,
              endIndent: AppSpacing.md,
              color: AppColors.divider,
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
    return InkWell(
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.symmetric(
          horizontal: AppSpacing.md,
          vertical: AppSpacing.sm, // Slightly tighter
        ),
        child: Row(
          children: [
            Expanded(
              child: Text(
                name.toUpperCase(),
                style: AppTypography.labelMedium.copyWith(
                  color: AppColors.ink,
                  letterSpacing: 1.0, // Uppercase, wide tracking as per design
                  fontWeight: FontWeight.w600,
                ),
                overflow: TextOverflow.ellipsis,
                maxLines: 1,
              ),
            ),
            const SizedBox(width: AppSpacing.sm),
            const Icon(
              Icons.chevron_right,
              size: 16,
              color: AppColors.inkLight,
            ),
          ],
        ),
      ),
    );
  }
}

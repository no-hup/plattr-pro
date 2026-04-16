import 'package:flutter/material.dart';
import 'kitchen_app_bar_configuration.dart';

/// Shared app bar widget for the kitchen app.
///
/// Layout:
/// - **Left**: Circular profile icon with photo or initials
/// - **Center/Title**: Restaurant name + Kitchen name (subtitle)
/// - **Right Actions** (in order):
///   1. Category selector dropdown
///   2. Screen-specific extra icons (from [additionalActions])
///   3. Logout icon
class KitchenAppBarWidget extends StatelessWidget
    implements PreferredSizeWidget {
  /// Restaurant name to display in title
  final String restaurantName;

  /// Kitchen/staff name to display as subtitle
  final String kitchenName;

  /// Optional profile image URL (null or empty shows initials)
  final String? staffProfileImageUrl;

  /// Currently selected category
  final String? selectedCategory;

  /// Available categories to choose from
  /// TODO: These should be fetched dynamically from backend
  final List<String> categories;

  /// Callback when category is changed
  final ValueChanged<String?>? onCategoryChanged;

  /// Configuration for visibility and callbacks
  final KitchenAppBarConfiguration configuration;

  const KitchenAppBarWidget({
    super.key,
    required this.restaurantName,
    required this.kitchenName,
    this.staffProfileImageUrl,
    this.selectedCategory,
    this.categories = const [],
    this.onCategoryChanged,
    this.configuration = const KitchenAppBarConfiguration(),
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return AppBar(
      leading: Padding(
        padding: const EdgeInsets.all(8.0),
        child: GestureDetector(
          onTap: configuration.onProfileTap,
          child: _buildProfileAvatar(theme),
        ),
      ),
      title: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(
            restaurantName,
            style: theme.textTheme.titleMedium?.copyWith(
              fontWeight: FontWeight.bold,
              color: theme.appBarTheme.titleTextStyle?.color,
            ),
            overflow: TextOverflow.ellipsis,
          ),
          Text(
            kitchenName,
            style: theme.textTheme.bodySmall?.copyWith(
              color: theme.appBarTheme.titleTextStyle?.color
                  ?.withValues(alpha: 0.8),
            ),
            overflow: TextOverflow.ellipsis,
          ),
        ],
      ),
      actions: [
        // Category selector dropdown
        if (configuration.showCategorySelector && categories.isNotEmpty)
          _buildCategorySelector(theme),

        // Screen-specific additional actions
        if (configuration.additionalActions != null)
          ...configuration.additionalActions!,

        // Logout icon
        if (configuration.showLogoutIcon)
          IconButton(
            icon: const Icon(Icons.logout),
            onPressed: configuration.onLogoutTap,
            tooltip: 'Logout',
          ),
      ],
    );
  }

  /// Builds the category selector dropdown
  Widget _buildCategorySelector(ThemeData theme) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 8.0),
      child: DropdownButtonHideUnderline(
        child: DropdownButton<String>(
          value: selectedCategory,
          hint: Text(
            'All',
            style: TextStyle(
              color: theme.appBarTheme.titleTextStyle?.color,
            ),
          ),
          icon: Icon(
            Icons.filter_list,
            color: theme.appBarTheme.titleTextStyle?.color,
          ),
          dropdownColor: theme.colorScheme.surface,
          items: [
            DropdownMenuItem<String>(
              value: null,
              child: Text(
                'All Categories',
                style: TextStyle(color: theme.colorScheme.onSurface),
              ),
            ),
            ...categories.map((category) => DropdownMenuItem<String>(
                  value: category,
                  child: Text(
                    category,
                    style: TextStyle(color: theme.colorScheme.onSurface),
                  ),
                )),
          ],
          onChanged: onCategoryChanged,
          selectedItemBuilder: (context) => [
            _buildSelectedCategoryItem(theme, 'All'),
            ...categories.map((category) =>
                _buildSelectedCategoryItem(theme, category)),
          ],
        ),
      ),
    );
  }

  Widget _buildSelectedCategoryItem(ThemeData theme, String text) {
    return Center(
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(
            text,
            style: TextStyle(
              color: theme.appBarTheme.titleTextStyle?.color,
              fontWeight: FontWeight.w500,
            ),
          ),
          const SizedBox(width: 4),
        ],
      ),
    );
  }

  /// Builds the circular profile avatar with image or initials
  Widget _buildProfileAvatar(ThemeData theme) {
    final hasImage =
        staffProfileImageUrl != null && staffProfileImageUrl!.isNotEmpty;
    final initials = _getInitials(kitchenName);

    return CircleAvatar(
      backgroundColor: theme.colorScheme.primaryContainer,
      backgroundImage: hasImage ? NetworkImage(staffProfileImageUrl!) : null,
      child: hasImage
          ? null
          : Text(
              initials,
              style: TextStyle(
                color: theme.colorScheme.onPrimaryContainer,
                fontWeight: FontWeight.bold,
                fontSize: 14,
              ),
            ),
    );
  }

  /// Extracts initials from name (e.g., "Main Kitchen" -> "MK")
  String _getInitials(String name) {
    if (name.isEmpty) return '?';

    final parts = name.trim().split(RegExp(r'\s+'));
    if (parts.length == 1) {
      return parts[0].substring(0, 1).toUpperCase();
    }

    // Take first letter of first and last word
    return '${parts.first.substring(0, 1)}${parts.last.substring(0, 1)}'
        .toUpperCase();
  }

  @override
  Size get preferredSize => const Size.fromHeight(kToolbarHeight);
}

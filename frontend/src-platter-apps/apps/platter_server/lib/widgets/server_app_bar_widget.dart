import 'package:flutter/material.dart';
import 'server_app_bar_configuration.dart';

/// Shared app bar widget for the server app.
///
/// Layout:
/// - **Left**: Circular profile icon with photo or initials
/// - **Center/Title**: Restaurant name + Server name (subtitle)
/// - **Right Actions** (in order):
///   1. Screen-specific extra icons (from [additionalActions])
///   2. Notification bell icon
class ServerAppBarWidget extends StatelessWidget
    implements PreferredSizeWidget {
  /// Restaurant name to display in title
  final String restaurantName;

  /// Server/staff name to display as subtitle
  final String serverName;

  /// Optional profile image URL (null or empty shows initials)
  final String? serverProfileImageUrl;

  /// Configuration for visibility and callbacks
  final ServerAppBarConfiguration configuration;

  const ServerAppBarWidget({
    super.key,
    required this.restaurantName,
    required this.serverName,
    this.serverProfileImageUrl,
    this.configuration = const ServerAppBarConfiguration(),
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
            ),
            overflow: TextOverflow.ellipsis,
          ),
          Text(
            serverName,
            style: theme.textTheme.bodySmall?.copyWith(
              color: theme.colorScheme.onSurface.withValues(alpha: 0.7),
            ),
            overflow: TextOverflow.ellipsis,
          ),
        ],
      ),
      actions: [
        // Screen-specific additional actions
        if (configuration.additionalActions != null)
          ...configuration.additionalActions!,

        // Notification bell icon
        if (configuration.showNotificationIcon)
          IconButton(
            icon: const Icon(Icons.notifications_outlined),
            onPressed: configuration.onNotificationTap ??
                () {
                  // TODO: Navigate to notifications screen
                },
            tooltip: 'Notifications',
          ),
      ],
    );
  }

  /// Builds the circular profile avatar with image or initials
  Widget _buildProfileAvatar(ThemeData theme) {
    final hasImage =
        serverProfileImageUrl != null && serverProfileImageUrl!.isNotEmpty;
    final initials = _getInitials(serverName);

    return CircleAvatar(
      backgroundColor: theme.colorScheme.primaryContainer,
      backgroundImage: hasImage ? NetworkImage(serverProfileImageUrl!) : null,
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

  /// Extracts initials from server name (e.g., "John Doe" -> "JD")
  String _getInitials(String name) {
    if (name.isEmpty) return '?';

    final parts = name.trim().split(RegExp(r'\s+'));
    if (parts.length == 1) {
      return parts[0].substring(0, 1).toUpperCase();
    }

    // Take first letter of first and last name
    return '${parts.first.substring(0, 1)}${parts.last.substring(0, 1)}'
        .toUpperCase();
  }

  @override
  Size get preferredSize => const Size.fromHeight(kToolbarHeight);
}

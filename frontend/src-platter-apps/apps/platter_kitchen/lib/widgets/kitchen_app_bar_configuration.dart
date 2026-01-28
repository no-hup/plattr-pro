import 'package:flutter/material.dart';

/// Configuration class for customizing [KitchenAppBarWidget] per screen.
///
/// Each screen can provide its own configuration to add extra actions
/// or modify the default app bar behavior.
class KitchenAppBarConfiguration {
  /// Whether to show the logout icon (default: true)
  final bool showLogoutIcon;

  /// Whether to show the category selector (default: true)
  final bool showCategorySelector;

  /// Additional action widgets to show before the logout icon
  /// Use this for screen-specific actions like refresh buttons
  final List<Widget>? additionalActions;

  /// Callback when the profile icon is tapped
  final VoidCallback? onProfileTap;

  /// Callback when the logout icon is tapped
  final VoidCallback? onLogoutTap;

  const KitchenAppBarConfiguration({
    this.showLogoutIcon = true,
    this.showCategorySelector = true,
    this.additionalActions,
    this.onProfileTap,
    this.onLogoutTap,
  });

  /// Creates a copy with modified properties
  KitchenAppBarConfiguration copyWith({
    bool? showLogoutIcon,
    bool? showCategorySelector,
    List<Widget>? additionalActions,
    VoidCallback? onProfileTap,
    VoidCallback? onLogoutTap,
  }) {
    return KitchenAppBarConfiguration(
      showLogoutIcon: showLogoutIcon ?? this.showLogoutIcon,
      showCategorySelector: showCategorySelector ?? this.showCategorySelector,
      additionalActions: additionalActions ?? this.additionalActions,
      onProfileTap: onProfileTap ?? this.onProfileTap,
      onLogoutTap: onLogoutTap ?? this.onLogoutTap,
    );
  }
}

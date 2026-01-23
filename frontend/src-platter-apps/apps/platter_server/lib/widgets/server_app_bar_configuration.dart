import 'package:flutter/material.dart';

/// Configuration class for customizing [ServerAppBarWidget] per screen.
/// 
/// Each screen can provide its own configuration to add extra actions
/// or modify the default app bar behavior.
class ServerAppBarConfiguration {
  /// Whether to show the notification bell icon (default: true)
  final bool showNotificationIcon;
  
  /// Additional action widgets to show before the notification icon
  /// Use this for screen-specific actions like refresh buttons
  final List<Widget>? additionalActions;
  
  /// Callback when the profile icon is tapped (opens profile/settings drawer)
  final VoidCallback? onProfileTap;
  
  /// Callback when the notification icon is tapped
  final VoidCallback? onNotificationTap;

  const ServerAppBarConfiguration({
    this.showNotificationIcon = true,
    this.additionalActions,
    this.onProfileTap,
    this.onNotificationTap,
  });
  
  /// Creates a copy with modified properties
  ServerAppBarConfiguration copyWith({
    bool? showNotificationIcon,
    List<Widget>? additionalActions,
    VoidCallback? onProfileTap,
    VoidCallback? onNotificationTap,
  }) {
    return ServerAppBarConfiguration(
      showNotificationIcon: showNotificationIcon ?? this.showNotificationIcon,
      additionalActions: additionalActions ?? this.additionalActions,
      onProfileTap: onProfileTap ?? this.onProfileTap,
      onNotificationTap: onNotificationTap ?? this.onNotificationTap,
    );
  }
}

/// Kitchen App Constants
///
/// Centralized constants for the Kitchen app.
/// Keep all hardcoded values here to make them easy to update.
library kitchen_constants;

/// API-related constants
class ApiConstants {
  ApiConstants._();

  /// Default page size for paginated lists
  static const int defaultPageSize = 20;

  /// Timeout for order-related operations (they should be fast)
  static const Duration orderTimeout = Duration(seconds: 15);

  /// Timeout for long operations
  static const Duration longOperationTimeout = Duration(seconds: 60);
}

/// UI-related constants
class UiConstants {
  UiConstants._();

  /// Duration to show snackbars
  static const Duration snackbarDuration = Duration(seconds: 4);

  /// Animation duration for list items
  static const Duration listItemAnimationDuration = Duration(milliseconds: 200);

  /// Debounce duration for search input
  static const Duration searchDebounce = Duration(milliseconds: 300);

  /// Auto-refresh interval for live orders
  static const Duration liveOrdersRefreshInterval = Duration(seconds: 30);

  /// History duration - show orders served within this time
  static const Duration historyWindow = Duration(hours: 8);
}

/// Feature flags for Kitchen app
class KitchenFeatureFlags {
  KitchenFeatureFlags._();

  /// Enable auto-refresh for live orders
  static const bool enableAutoRefresh = true;

  /// Enable sound notifications for new orders
  static const bool enableSoundNotifications = false;

  /// Enable haptic feedback for actions
  static const bool enableHapticFeedback = true;

  /// Show debug info cards in UI
  static const bool showDebugCards = true; // TODO: Set to false for production
}

/// Order status definitions
class OrderStatus {
  OrderStatus._();

  static const String pending = 'pending';
  static const String preparing = 'preparing';
  static const String ready = 'ready';
  static const String served = 'served';
  static const String cancelled = 'cancelled';

  /// All active statuses (shown in Live tab)
  static const List<String> activeStatuses = [pending, preparing, ready];

  /// All completed statuses (shown in History tab)
  static const List<String> completedStatuses = [served, cancelled];
}

/// Kitchen category types
class KitchenCategory {
  KitchenCategory._();

  static const String all = 'all';
  static const String kitchen = 'kitchen';
  static const String bar = 'bar';
  static const String dessert = 'dessert';

  /// Default categories if not provided by backend
  /// TODO: These should be fetched dynamically from backend
  static const List<String> defaultCategories = [kitchen, bar];
}

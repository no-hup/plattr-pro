import 'package:flutter/material.dart';
import '../theme/design_system/kitchen_colors.dart';

/// Extension methods on BuildContext for easier theme access
extension BuildContextX on BuildContext {
  /// Get the current theme
  ThemeData get theme => Theme.of(this);

  /// Get the color scheme
  ColorScheme get colorScheme => theme.colorScheme;

  /// Get the text theme
  TextTheme get textTheme => theme.textTheme;

  /// Get screen size
  Size get screenSize => MediaQuery.sizeOf(this);

  /// Get screen width
  double get screenWidth => screenSize.width;

  /// Get screen height
  double get screenHeight => screenSize.height;

  /// Check if dark mode
  bool get isDarkMode => theme.brightness == Brightness.dark;

  /// Show a snackbar
  void showSnackbar(String message, {bool isError = false}) {
    ScaffoldMessenger.of(this).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: isError ? colorScheme.error : null,
        behavior: SnackBarBehavior.floating,
      ),
    );
  }
}

/// Extension methods on String
extension StringX on String {
  /// Capitalize first letter
  String get capitalized =>
      isEmpty ? this : '${this[0].toUpperCase()}${substring(1)}';

  /// Capitalize each word
  String get titleCase => split(' ').map((word) => word.capitalized).join(' ');

  /// Check if string is a valid email
  bool get isValidEmail =>
      RegExp(r'^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$').hasMatch(this);

  /// Check if string is a valid phone number (basic check)
  bool get isValidPhone => RegExp(r'^\+?[\d\s-]{10,}$').hasMatch(this);
}

/// Extension methods on DateTime
extension DateTimeX on DateTime {
  /// Format as time only (HH:mm)
  String get timeOnly =>
      '${hour.toString().padLeft(2, '0')}:${minute.toString().padLeft(2, '0')}';

  /// Format as date only (DD/MM/YYYY)
  String get dateOnly =>
      '${day.toString().padLeft(2, '0')}/${month.toString().padLeft(2, '0')}/$year';

  /// Format as relative time (e.g., "5 mins ago")
  String get relativeTime {
    final now = DateTime.now();
    final diff = now.difference(this);

    if (diff.inSeconds < 60) {
      return 'Just now';
    } else if (diff.inMinutes < 60) {
      final mins = diff.inMinutes;
      return '$mins min${mins == 1 ? '' : 's'} ago';
    } else if (diff.inHours < 24) {
      final hours = diff.inHours;
      return '$hours hr${hours == 1 ? '' : 's'} ago';
    } else if (diff.inDays < 7) {
      final days = diff.inDays;
      return '$days day${days == 1 ? '' : 's'} ago';
    } else {
      return dateOnly;
    }
  }

  /// Check if date is today
  bool get isToday {
    final now = DateTime.now();
    return year == now.year && month == now.month && day == now.day;
  }
}

/// Extension methods on Duration
extension DurationX on Duration {
  /// Format as mm:ss
  String get mmss {
    final mins = inMinutes.remainder(60).toString().padLeft(2, '0');
    final secs = inSeconds.remainder(60).toString().padLeft(2, '0');
    return '$mins:$secs';
  }

  /// Format as human readable (e.g., "5 mins", "1 hr 30 mins")
  String get humanReadable {
    if (inSeconds < 60) {
      return '${inSeconds}s';
    } else if (inMinutes < 60) {
      return '${inMinutes} min${inMinutes == 1 ? '' : 's'}';
    } else {
      final hours = inHours;
      final mins = inMinutes.remainder(60);
      if (mins == 0) {
        return '$hours hr${hours == 1 ? '' : 's'}';
      }
      return '$hours hr${hours == 1 ? '' : 's'} $mins min${mins == 1 ? '' : 's'}';
    }
  }
}

/// Extension for order status colors
extension OrderStatusColorX on String {
  /// Get color for order status
  Color get statusColor {
    switch (toLowerCase()) {
      case 'pending':
        return KitchenColors.orderPending;
      case 'preparing':
        return KitchenColors.orderPreparing;
      case 'ready':
        return KitchenColors.orderReady;
      case 'served':
        return KitchenColors.orderServed;
      case 'cancelled':
        return KitchenColors.danger;
      default:
        return KitchenColors.inkLighter;
    }
  }
}

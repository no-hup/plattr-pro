import 'package:flutter/material.dart';

/// A simple centered state view used for loading, error, and empty states.
///
/// The widget keeps the visual language consistent across screens while letting
/// callers provide custom content or actions where needed.
class PageStateView extends StatelessWidget {
  const PageStateView({
    super.key,
    this.icon,
    this.title,
    this.message,
    this.primaryAction,
    this.spacing = 16,
    this.padding = const EdgeInsets.symmetric(horizontal: 32),
  });

  /// Shorthand for a loading indicator with an optional message.
  factory PageStateView.loading({Key? key, String? message, Widget? indicator}) {
    return PageStateView(
      key: key,
      icon: indicator ?? const CircularProgressIndicator(),
      message: message,
    );
  }

  /// Shorthand for an error view with icon, title, message, and optional action.
  factory PageStateView.error({
    Key? key,
    Widget? icon,
    String title = 'Oops! Something went wrong',
    String? message,
    Widget? primaryAction,
  }) {
    return PageStateView(
      key: key,
      icon: icon ?? const Icon(Icons.error_outline, size: 64),
      title: title,
      message: message,
      primaryAction: primaryAction,
    );
  }

  /// Shorthand for an empty state view.
  factory PageStateView.empty({
    Key? key,
    Widget? icon,
    required String title,
    String? message,
    Widget? primaryAction,
  }) {
    return PageStateView(
      key: key,
      icon: icon ?? const Icon(Icons.inbox_outlined, size: 64),
      title: title,
      message: message,
      primaryAction: primaryAction,
    );
  }

  /// Optional icon or indicator displayed at the top of the column.
  final Widget? icon;

  /// Optional title text.
  final String? title;

  /// Optional supporting message.
  final String? message;

  /// Optional primary action widget (usually a button).
  final Widget? primaryAction;

  /// Vertical spacing between elements.
  final double spacing;

  /// Horizontal padding applied to the column.
  final EdgeInsetsGeometry padding;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final textTheme = theme.textTheme;

    final children = <Widget>[];

    if (icon != null) {
      children.add(icon!);
    }

    if (title != null) {
      if (children.isNotEmpty) {
        children.add(SizedBox(height: spacing));
      }
      children.add(
        Text(
          title!,
          textAlign: TextAlign.center,
          style: textTheme.titleLarge,
        ),
      );
    }

    if (message != null && message!.isNotEmpty) {
      if (children.isNotEmpty) {
        children.add(SizedBox(height: spacing * 0.5));
      }
      children.add(
        Text(
          message!,
          textAlign: TextAlign.center,
          style: textTheme.bodyMedium,
        ),
      );
    }

    if (primaryAction != null) {
      if (children.isNotEmpty) {
        children.add(SizedBox(height: spacing));
      }
      children.add(primaryAction!);
    }

    return Center(
      child: Padding(
        padding: padding,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          mainAxisAlignment: MainAxisAlignment.center,
          children: children,
        ),
      ),
    );
  }
}

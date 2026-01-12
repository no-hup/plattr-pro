import 'package:flutter/material.dart';

/// Reusable AppBar that keeps the consumer app navigation actions consistent.
class ConsumerAppBar extends StatelessWidget implements PreferredSizeWidget {
  const ConsumerAppBar({
    required this.title, super.key,
    this.onOrdersTap,
    this.onMenuTap,
    this.onCartTap,
    this.leading,
    this.leadingActions = const <Widget>[],
  });

  final String title;
  final VoidCallback? onOrdersTap;
  final VoidCallback? onMenuTap;
  final VoidCallback? onCartTap;
  final Widget? leading;
  final List<Widget> leadingActions;

  @override
  Size get preferredSize => const Size.fromHeight(kToolbarHeight);

  @override
  Widget build(BuildContext context) {
    final actions = <Widget>[
      ...leadingActions,
      if (onOrdersTap != null)
        IconButton(
          icon: const Icon(Icons.receipt_long),
          onPressed: onOrdersTap,
        ),
      if (onMenuTap != null)
        IconButton(
          icon: const Icon(Icons.menu_book),
          onPressed: onMenuTap,
        ),
      if (onCartTap != null)
        IconButton(
          icon: const Icon(Icons.shopping_cart),
          onPressed: onCartTap,
        ),
    ];

    return AppBar(
      title: Text(title),
      leading: leading,
      actions: actions,
    );
  }
}

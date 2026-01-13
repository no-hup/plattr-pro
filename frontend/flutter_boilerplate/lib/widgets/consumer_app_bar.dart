import 'package:flutter/material.dart';

/// Reusable AppBar that keeps the consumer app navigation actions consistent.
class ConsumerAppBar extends StatelessWidget implements PreferredSizeWidget {
  const ConsumerAppBar({
    super.key,
    this.title,
    this.titleWidget,
    this.onOrdersTap,
    this.onMenuTap,
    this.onCartTap,
    this.onSearchTap,
    this.onOffersTap,
    this.leading,
    this.leadingActions = const <Widget>[],
    this.cartItemCount,
  });

  /// Optional title text. Falls back to 'Menu' if neither title nor titleWidget is provided.
  final String? title;
  
  /// Optional title widget that takes precedence over title text.
  final Widget? titleWidget;
  
  final VoidCallback? onOrdersTap;
  final VoidCallback? onMenuTap;
  final VoidCallback? onCartTap;
  final VoidCallback? onSearchTap;
  final VoidCallback? onOffersTap;
  final Widget? leading;
  final List<Widget> leadingActions;
  
  /// Optional item count for cart badge display.
  final int? cartItemCount;

  @override
  Size get preferredSize => const Size.fromHeight(kToolbarHeight);

  @override
  Widget build(BuildContext context) {
    final actions = <Widget>[
      ...leadingActions,
      if (onSearchTap != null)
        IconButton(
          icon: const Icon(Icons.search),
          onPressed: onSearchTap,
        ),
      if (onOffersTap != null)
        IconButton(
          icon: const Icon(Icons.local_offer),
          onPressed: onOffersTap,
        ),
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
        _buildCartButton(context),
    ];

    // Use titleWidget if provided, otherwise fallback to Text(title) or 'Menu'
    final displayTitle = titleWidget ?? Text(title ?? 'Menu');

    return AppBar(
      title: displayTitle,
      leading: leading,
      actions: actions,
    );
  }

  Widget _buildCartButton(BuildContext context) {
    final icon = const Icon(Icons.shopping_cart);
    
    if (cartItemCount != null && cartItemCount! > 0) {
      return Stack(
        alignment: Alignment.center,
        children: [
          IconButton(
            icon: icon,
            onPressed: onCartTap,
          ),
          Positioned(
            top: 8,
            right: 8,
            child: Container(
              padding: const EdgeInsets.all(2),
              decoration: BoxDecoration(
                color: Theme.of(context).colorScheme.error,
                borderRadius: BorderRadius.circular(10),
              ),
              constraints: const BoxConstraints(
                minWidth: 16,
                minHeight: 16,
              ),
              child: Text(
                cartItemCount! > 99 ? '99+' : '$cartItemCount',
                style: TextStyle(
                  color: Theme.of(context).colorScheme.onError,
                  fontSize: 10,
                  fontWeight: FontWeight.bold,
                ),
                textAlign: TextAlign.center,
              ),
            ),
          ),
        ],
      );
    }
    
    return IconButton(
      icon: icon,
      onPressed: onCartTap,
    );
  }
}

import 'package:flutterboilerplate/pages/menuListing/menu_response.dart';
import 'package:flutterboilerplate/theme/theme.dart';

/// Reusable AppBar that keeps the consumer app navigation actions consistent.
class ConsumerAppBar extends StatelessWidget implements PreferredSizeWidget {
  const ConsumerAppBar({
    super.key,
    this.title,
    this.titleWidget,
    this.tableContextData, // Should be passed if available
    this.onOrdersTap,
    this.onMenuTap,
    this.onCartTap,
    this.onSearchTap,
    this.onOffersTap,
    this.leading,
    this.trailing,
    this.leadingActions = const <Widget>[],
    this.trailingActions = const <Widget>[],
    this.restaurantId,
    this.tableId,
    this.cartItemCount,
  });

  /// Optional title text. Falls back to 'Menu' if neither title nor titleWidget is provided.
  final String? title;
  
  /// Optional title widget that takes precedence over title text.
  final Widget? titleWidget;
  
  /// Table context data for OTP/Name display
  final TableContextData? tableContextData;
  
  final VoidCallback? onOrdersTap;
  final VoidCallback? onMenuTap;
  final VoidCallback? onCartTap;
  final VoidCallback? onSearchTap;
  final VoidCallback? onOffersTap;
  final Widget? leading;
  final Widget? trailing;
  final List<Widget> leadingActions;
  final List<Widget> trailingActions;
  final String? restaurantId;
  final String? tableId;
  /// Optional item count for cart badge display.
  final int? cartItemCount;

  @override
  Size get preferredSize => const Size.fromHeight(60.0); // Slightly taller

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: AppColors.paperTranslucent,
        border: Border(
           bottom: BorderSide(color: AppColors.divider, width: 1),
        ),
      ),
      child: SafeArea(
        bottom: false,
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: AppSpacing.sm),
          child: SizedBox(
            height: kToolbarHeight,
            child: Row(
              children: [
                if (leading != null) leading!,
                
                // Title Area
                Expanded(
                  child: Padding(
                    padding: const EdgeInsets.only(left: 8.0, right: 8.0),
                    child: titleWidget ?? _buildDefaultTitle(context),
                  ),
                ),

                // Actions
                ...leadingActions,
                ...trailingActions,
                if (onSearchTap != null) _buildIconButton(Icons.search, onSearchTap!),
                if (onOffersTap != null) _buildIconButton(Icons.local_offer_outlined, onOffersTap!),
                if (onOrdersTap != null) _buildIconButton(Icons.receipt_long_outlined, onOrdersTap!),
                if (onMenuTap != null) _buildIconButton(Icons.menu_book_outlined, onMenuTap!),
                if (onCartTap != null) _buildCartButton(context),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildDefaultTitle(BuildContext context) {
    return Text(
      title ?? 'Lumière', 
      style: AppTypography.uiSerif.copyWith( // Brand font
        fontSize: 24,
        fontWeight: FontWeight.bold,
        fontStyle: FontStyle.italic,
        color: AppColors.primary,
      ),
    );
  }
  
  Widget _buildIconButton(IconData icon, VoidCallback onTap) {
    return SizedBox(
      width: AppDimensions.iconButtonSize,
      height: AppDimensions.iconButtonSize,
      child: IconButton(
        icon: Icon(icon, size: 22, color: AppColors.ink),
        onPressed: onTap,
        style: IconButton.styleFrom(
            padding: EdgeInsets.zero,
            shape: const CircleBorder(),
        ),
      ),
    );
  }

  Widget _buildCartButton(BuildContext context) {
    return Stack(
      alignment: Alignment.center,
      children: [
        _buildIconButton(Icons.shopping_cart_outlined, onCartTap!),
        if (cartItemCount != null && cartItemCount! > 0)
          Positioned(
            top: 4,
            right: 4,
            child: Container(
              padding: const EdgeInsets.all(4),
              decoration: const BoxDecoration(
                color: AppColors.danger,
                shape: BoxShape.circle,
              ),
              constraints: const BoxConstraints(
                minWidth: 8,
                minHeight: 8,
              ),
            ),
          ),
      ],
    );
  }
}

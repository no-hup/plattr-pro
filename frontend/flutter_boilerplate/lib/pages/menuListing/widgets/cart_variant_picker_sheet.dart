import 'package:flutter/material.dart';
import 'package:flutterboilerplate/pages/menuListing/menu_response.dart';
import 'package:flutterboilerplate/pages/menuListing/menu_state.dart';
import 'package:flutterboilerplate/pages/menuListing/models/cart_item.dart';
import 'package:flutterboilerplate/pages/menuListing/widgets/menu_customization_sheet.dart';
import 'package:flutterboilerplate/theme/app_typography.dart';
import 'package:flutterboilerplate/theme/design_system/app_colors.dart';
import 'package:flutterboilerplate/theme/design_system/app_dimensions.dart';
import 'package:flutterboilerplate/widgets/price_display.dart';
import 'package:flutterboilerplate/widgets/primary_action_button.dart';
import 'package:flutterboilerplate/widgets/quantity_selector.dart';
import 'package:provider/provider.dart';

/// A bottom-sheet picker that shows one card per existing cart entry for a
/// customizable [menuItem]. Lets the user increment/decrement any specific
/// variant/addon configuration or add a NEW configuration via a nested
/// [MenuCustomizationSheet].
///
/// Auto-closes via a post-frame callback when all entries are decremented to
/// zero, matching the optimistic-update pattern used throughout the cart flow.
class CartVariantPickerSheet extends StatelessWidget {
  const CartVariantPickerSheet({
    required this.menuItem,
    required this.tableId,
    required this.restaurantId,
    super.key,
  });

  final MenuItem menuItem;
  final String tableId;
  final String restaurantId;

  @override
  Widget build(BuildContext context) {
    return Consumer<MenuState>(
      builder: (context, menuState, _) {
        final existingEntries = menuState.getCartEntriesFor(menuItem.id);

        // Auto-close when all entries are gone (decrement-to-zero path).
        // Must be deferred — calling Navigator.pop during build throws.
        if (existingEntries.isEmpty) {
          WidgetsBinding.instance.addPostFrameCallback((_) {
            if (Navigator.of(context).canPop()) {
              Navigator.of(context).pop();
            }
          });
        }

        return Container(
          constraints: BoxConstraints(
            maxHeight: MediaQuery.of(context).size.height * 0.9,
          ),
          decoration: const BoxDecoration(
            color: AppColors.paper,
            borderRadius: BorderRadius.vertical(
              top: Radius.circular(AppDimensions.radiusLG),
            ),
          ),
          padding: EdgeInsets.only(
            bottom: MediaQuery.of(context).viewInsets.bottom,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Scrollable area: header + loading indicator + entry list + add-new button
              Flexible(
                child: SingleChildScrollView(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      _buildHeader(context),
                      if (menuState.isUpdatingCart)
                        const LinearProgressIndicator(),
                      _buildEntryList(context, menuState, existingEntries),
                      _buildAddNewButton(context),
                    ],
                  ),
                ),
              ),
              const Divider(height: 1, color: AppColors.divider),
              _buildFooter(context),
            ],
          ),
        );
      },
    );
  }

  Widget _buildHeader(BuildContext context) {
    final imageUrl = menuItem.meta.image;
    final hasImage = imageUrl != null && imageUrl.isNotEmpty;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Stack(
          children: [
            if (hasImage)
              ClipRRect(
                borderRadius: const BorderRadius.vertical(
                  top: Radius.circular(AppDimensions.radiusLG),
                ),
                child: Image.network(
                  imageUrl,
                  width: double.infinity,
                  fit: BoxFit.cover,
                  errorBuilder: (context, error, stackTrace) =>
                      const SizedBox.shrink(),
                ),
              ),
            if (!hasImage) const SizedBox(height: AppDimensions.space24),
            Positioned(
              top: hasImage ? AppDimensions.space16 : 0,
              right: hasImage ? AppDimensions.space16 : AppDimensions.space8,
              child: IconButton(
                onPressed: () => Navigator.pop(context),
                icon: const Icon(Icons.close, color: AppColors.ink),
                style: IconButton.styleFrom(
                  backgroundColor:
                      hasImage ? AppColors.paper : AppColors.paperAlt,
                  highlightColor: Colors.transparent,
                ),
              ),
            ),
          ],
        ),
        Padding(
          padding: const EdgeInsets.fromLTRB(
            AppDimensions.space24,
            AppDimensions.space16,
            AppDimensions.space24,
            AppDimensions.space16,
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(menuItem.meta.name, style: AppTypography.h3),
              const SizedBox(height: AppDimensions.space4),
              PriceDisplay(
                finalPrice: menuItem.priceInfo.finalPrice.toDouble(),
                basePrice: menuItem.priceInfo.discount > 0
                    ? menuItem.priceInfo.basePrice.toDouble()
                    : null,
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildEntryList(
    BuildContext context,
    MenuState menuState,
    List<CartItem> entries,
  ) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: AppDimensions.space24),
      child: ListView.separated(
        shrinkWrap: true,
        physics: const NeverScrollableScrollPhysics(),
        itemCount: entries.length,
        separatorBuilder: (_, __) =>
            const Divider(height: 1, color: AppColors.divider),
        itemBuilder: (context, index) =>
            _buildEntryRow(context, menuState, entries[index]),
      ),
    );
  }

  Widget _buildEntryRow(
    BuildContext context,
    MenuState menuState,
    CartItem entry,
  ) {
    // Build variant/addon summary string.
    final variantParts =
        entry.selectedVariants.map((v) => v.selectedOption.name);
    final addonParts = entry.selectedAddons.map((a) => a.name);
    final allParts = [...variantParts, ...addonParts];
    final summary = allParts.isNotEmpty ? allParts.join(' • ') : null;

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: AppDimensions.space12),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  menuItem.meta.name,
                  style: AppTypography.body
                      .copyWith(fontWeight: FontWeight.w600),
                ),
                const SizedBox(height: AppDimensions.space4),
                if (summary != null)
                  Text(
                    summary,
                    style: AppTypography.bodySmall
                        .copyWith(color: AppColors.inkLight),
                  )
                else
                  Text(
                    'Default',
                    style: AppTypography.bodySmall.copyWith(
                      color: AppColors.inkLight,
                      fontStyle: FontStyle.italic,
                    ),
                  ),
                const SizedBox(height: AppDimensions.space4),
                PriceDisplay(
                  finalPrice: entry.priceInfo?.finalPrice.toDouble() ?? 0,
                  size: PriceDisplaySize.small,
                ),
              ],
            ),
          ),
          const SizedBox(width: AppDimensions.space12),
          QuantitySelector(
            quantity: entry.quantity,
            compact: true,
            isEnabled: !menuState.isUpdatingCart,
            onIncrement: () => menuState.updateCartItem(
              menuItem,
              true,
              tableId: tableId,
              restaurantId: restaurantId,
              cartItemId: entry.cartItemId,
              selectedVariants: entry.selectedVariantsMap,
              selectedAddons: entry.selectedAddonsList,
              context: context,
            ),
            onDecrement: () => menuState.updateCartItem(
              menuItem,
              false,
              tableId: tableId,
              restaurantId: restaurantId,
              cartItemId: entry.cartItemId,
              selectedVariants: entry.selectedVariantsMap,
              selectedAddons: entry.selectedAddonsList,
              context: context,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildAddNewButton(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(
        AppDimensions.space24,
        AppDimensions.space8,
        AppDimensions.space24,
        AppDimensions.space16,
      ),
      child: TextButton(
        onPressed: () => _showAddNewCustomization(context),
        child: const Text('Add new customization'),
      ),
    );
  }

  void _showAddNewCustomization(BuildContext context) {
    final menuState = context.read<MenuState>();
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => MenuCustomizationSheet(
        item: menuItem,
        onConfirm: (variants, addons, qty) {
          menuState.updateCartItem(
            menuItem,
            true,
            tableId: tableId,
            restaurantId: restaurantId,
            selectedVariants: variants,
            selectedAddons: addons.toList(),
            quantity: qty,
            context: context,
          );
        },
      ),
    );
  }

  Widget _buildFooter(BuildContext context) {
    return SafeArea(
      top: false,
      child: Padding(
        padding: const EdgeInsets.all(AppDimensions.space24),
        child: PrimaryActionButton(
          label: 'Done',
          onPressed: () => Navigator.of(context).pop(),
        ),
      ),
    );
  }
}

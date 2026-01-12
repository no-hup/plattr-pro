// File: menu_item_card.dart
import 'package:flutter/material.dart';
import 'package:flutterboilerplate/pages/menuListing/mennu_bottomsheet.dart';
import 'package:flutterboilerplate/pages/menuListing/menu_response.dart';
import 'package:flutterboilerplate/pages/menuListing/menu_state.dart';
import 'package:flutterboilerplate/singletonGods/logger.dart';
import 'package:flutterboilerplate/theme/theme.dart';
import 'package:flutterboilerplate/widgets/price_display.dart';
import 'package:flutterboilerplate/widgets/quantity_selector.dart';
import 'package:flutterboilerplate/widgets/status_badge.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

class MenuItemCard extends StatelessWidget {
  const MenuItemCard({
    required this.item,
    required this.quantity,
    required this.onQuantityChanged,
    required this.tableId,
    required this.restaurantId,
    super.key,
  });

  final MenuItem item;
  final int quantity;
  final Function(bool increment) onQuantityChanged;
  final String tableId;
  final String restaurantId;

  void _showCustomizationSheet(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (context) => MenuCustomizationSheet(
        item: item,
        onConfirm: (selectedVariants, selectedAddons) {
          AppLogger.log(
            '🛒 MENU: Adding customized item with variants: $selectedVariants, addons: $selectedAddons',
          );
          context.read<MenuState>().updateCartItem(
                item,
                true,
                tableId: tableId,
                restaurantId: restaurantId,
                selectedVariants: selectedVariants,
                selectedAddons: selectedAddons,
                context: context,
              );
        },
      ),
    );
  }

  void _handleAddToCart(BuildContext context) {
    final menuState = context.read<MenuState>();

    if (menuState.needsCustomization(item)) {
      final storedCustomization = menuState.getStoredCustomization(item.id);

      if (quantity == 0 || storedCustomization == null) {
        AppLogger.log(
          '🛒 MENU: Showing customization sheet for item ${item.id}',
        );
        _showCustomizationSheet(context);
      } else {
        AppLogger.log(
          '🛒 MENU: Using stored customization for item ${item.id}',
        );
        onQuantityChanged(true);
      }
    } else {
      AppLogger.log('🛒 MENU: Adding non-customizable item ${item.id}');
      onQuantityChanged(true);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.symmetric(horizontal: AppSpacing.lg, vertical: AppSpacing.sm),
      child: Padding(
        padding: AppSpacing.pagePadding,
        child: Row(
          children: [
            Expanded(
              child: _MenuItemDetails(item: item),
            ),
            _QuantityControl(
              item: item,
              quantity: quantity,
              onAddToCart: () => _handleAddToCart(context),
              tableId: tableId,
              restaurantId: restaurantId,
            ),
          ],
        ),
      ),
    );
  }
}

class _MenuItemDetails extends StatelessWidget {
  const _MenuItemDetails({required this.item});

  final MenuItem item;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          item.meta.name,
          style: Theme.of(context).textTheme.titleMedium,
        ),
        AppSpacing.verticalXS,
        Text(
          item.meta.description,
          style: Theme.of(context).textTheme.bodyMedium,
        ),
        AppSpacing.verticalSM,
        PriceDisplay(
          finalPrice: item.priceInfo.finalPrice.toDouble(),
          basePrice: item.priceInfo.discount > 0
              ? item.priceInfo.basePrice.toDouble()
              : null,
          crossAxisAlignment: CrossAxisAlignment.start,
        ),
        if (item.isCustomizable) ...[
          AppSpacing.verticalXS,
          StatusBadge.customizable(),
        ],
        if (!item.isInStock) ...[
          AppSpacing.verticalXS,
          StatusBadge.outOfStock(),
        ],
      ],
    );
  }
}

// Note: _PriceInfo, _CustomizableIndicator, and _OutOfStockIndicator have been
// replaced with centralized widgets: PriceDisplay and StatusBadge.

class _QuantityControl extends StatelessWidget {
  const _QuantityControl({
    required this.item,
    required this.quantity,
    required this.onAddToCart,
    required this.tableId,
    required this.restaurantId,
  });

  final MenuItem item;
  final int quantity;
  final VoidCallback onAddToCart;
  final String tableId;
  final String restaurantId;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        if (!item.isInStock)
          const ElevatedButton(
            onPressed: null,
            child: Text('Add'),
          )
        else if (quantity > 0)
          QuantitySelector(
            quantity: quantity,
            onDecrement: () => context.read<MenuState>().updateCartItem(
                  item,
                  false,
                  tableId: tableId,
                  restaurantId: restaurantId,
                ),
            onIncrement: onAddToCart,
            compact: true,
          )
        else
          ElevatedButton(
            onPressed: onAddToCart,
            child: const Text('Add'),
          ),
      ],
    );
  }
}

class CategorySection extends StatelessWidget {
  const CategorySection({
    required this.category,
    required this.menuItemsMap, // Changed: now receives the full map
    required this.itemQuantities,
    required this.onQuantityChanged,
    required this.tableId,
    required this.restaurantId,
    super.key,
  });

  final Category category;
  final Map<String, List<MenuItem>> menuItemsMap; // Full menuItems map keyed by subcategoryId or categoryId
  final Map<String, int> itemQuantities;
  final Function(String itemId, bool increment) onQuantityChanged;
  final String tableId;
  final String restaurantId;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Category Header
        Padding(
          padding: AppSpacing.pagePadding,
          child: Text(
            category.name,
            style: Theme.of(context).textTheme.titleLarge?.copyWith(
              fontWeight: FontWeight.bold,
            ),
          ),
        ),
        // If category has subcategories, show subcategory sections
        // Otherwise show items directly under category (legacy mode)
        if (category.subcategories.isNotEmpty)
          ..._buildSubcategorySections(context)
        else
          _buildItemsList(menuItemsMap[category.id] ?? []),
      ],
    );
  }

  /// Build subcategory sections with headers
  List<Widget> _buildSubcategorySections(BuildContext context) {
    final sections = <Widget>[];
    
    for (final subcat in category.subcategories) {
      final subcatItems = menuItemsMap[subcat.id] ?? [];
      if (subcatItems.isEmpty) continue; // Skip empty subcategories
      
      sections.add(
        Padding(
          padding: const EdgeInsets.only(left: AppSpacing.lg, right: AppSpacing.lg, top: AppSpacing.sm, bottom: AppSpacing.xs),
          child: Text(
            subcat.name,
            style: Theme.of(context).textTheme.titleMedium?.copyWith(
              color: Theme.of(context).colorScheme.primary,
              fontWeight: FontWeight.w600,
            ),
          ),
        ),
      );
      sections.add(_buildItemsList(subcatItems));
    }
    
    return sections;
  }

  /// Build a list of menu item cards
  Widget _buildItemsList(List<MenuItem> items) {
    return ListView.builder(
      shrinkWrap: true,
      physics: const ClampingScrollPhysics(),
      itemCount: items.length,
      itemBuilder: (context, index) {
        final item = items[index];
        return MenuItemCard(
          item: item,
          quantity: itemQuantities[item.id] ?? 0,
          onQuantityChanged: (increment) {
            onQuantityChanged(item.id, increment);
          },
          tableId: tableId,
          restaurantId: restaurantId,
        );
      },
    );
  }
}


class MenuErrorView extends StatelessWidget {
  const MenuErrorView({
    required this.error,
    required this.onRetry,
    super.key,
  });

  final String error;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: AppSpacing.pagePadding,
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text(
              'Error',
              style: Theme.of(context).textTheme.headlineSmall,
            ),
            AppSpacing.verticalSM,
            Text(error, textAlign: TextAlign.center),
            AppSpacing.verticalLG,
            ElevatedButton(
              onPressed: onRetry,
              child: const Text('Retry'),
            ),
          ],
        ),
      ),
    );
  }
}

class MenuLoadingView extends StatelessWidget {
  const MenuLoadingView({super.key});

  @override
  Widget build(BuildContext context) {
    return const Center(
      child: CircularProgressIndicator(),
    );
  }
}

class FloatingCartWidget extends StatelessWidget {
  const FloatingCartWidget({
    super.key,
  });

  @override
  Widget build(BuildContext context) {
    return Consumer<MenuState>(
      builder: (context, menuState, child) {
        final cart = menuState.cart;
        if (cart == null || cart.items.isEmpty) return const SizedBox.shrink();

        final totalItems = cart.items.fold<int>(
          0,
          (sum, item) => sum + (item.quantity ?? 0),
        );

        // Hide the entire widget if total items is zero
        if (totalItems <= 0) return const SizedBox.shrink();

        final cartPriceInfo = cart.priceInfo;
        final finalPrice = cartPriceInfo?.finalPrice ?? 0;
        final basePrice = cartPriceInfo?.basePrice ?? 0;

        return Positioned(
          bottom: AppSpacing.lg,
          left: AppSpacing.lg,
          right: AppSpacing.lg,
          child: SafeArea(
            bottom: true,
            child: Material(
              elevation: 8,
              borderRadius: AppSizing.borderRadiusSM,
              color: Theme.of(context).colorScheme.primaryContainer,
              child: Padding(
                padding: AppSpacing.pagePadding,
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          '$totalItems ${totalItems == 1 ? 'item' : 'items'}',
                          style:
                              Theme.of(context).textTheme.titleMedium?.copyWith(
                                    color: Theme.of(context)
                                        .colorScheme
                                        .onPrimaryContainer,
                                  ),
                        ),
                        // Only show base price if it's non-zero and different from final price
                        if (cartPriceInfo != null &&
                            basePrice > 0 &&
                            basePrice != finalPrice)
                          Text(
                            '₹${basePrice.toStringAsFixed(2)}',
                            style:
                                Theme.of(context).textTheme.bodyMedium?.copyWith(
                                      decoration: TextDecoration.lineThrough,
                                      color: Theme.of(context)
                                          .colorScheme
                                          .onPrimaryContainer
                                          .withOpacity(0.7),
                                    ),
                          ),
                        // Only show final price if it's non-zero
                        if (finalPrice > 0)
                          Text(
                            '₹${finalPrice.toStringAsFixed(2)}',
                            style:
                                Theme.of(context).textTheme.titleMedium?.copyWith(
                                      color: Theme.of(context)
                                          .colorScheme
                                          .onPrimaryContainer,
                                      fontWeight: FontWeight.bold,
                                    ),
                          ),
                      ],
                    ),
                    ElevatedButton(
                      onPressed: () {
                        final rid = cart.restaurantId ?? '';
                        final tid = cart.tableId ?? '';
                        if (rid.isNotEmpty && tid.isNotEmpty) {
                          context.go('/r/$rid/t/$tid/cart');
                        } else {
                          AppLogger.log(
                            '🛒 MENU: Cannot navigate to cart - missing ids (r="$rid", t="$tid")',
                          );
                        }
                      },
                      style: ElevatedButton.styleFrom(
                        backgroundColor:
                            Theme.of(context).colorScheme.onPrimaryContainer,
                        foregroundColor:
                            Theme.of(context).colorScheme.primaryContainer,
                      ),
                      child: const Text('View Cart'),
                    ),
                  ],
                ),
              ),
            ),
          ),
        );
      },
    );
  }
}

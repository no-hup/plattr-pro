// File: menu_item_card.dart
import 'package:flutter/material.dart';
import 'package:flutterboilerplate/pages/menuListing/mennu_bottomsheet.dart';
import 'package:flutterboilerplate/pages/menuListing/menu_response.dart';
import 'package:flutterboilerplate/pages/menuListing/menu_state.dart';
import 'package:flutterboilerplate/singletonGods/logger.dart';
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
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: Padding(
        padding: const EdgeInsets.all(16),
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
        const SizedBox(height: 4),
        Text(
          item.meta.description,
          style: Theme.of(context).textTheme.bodyMedium,
        ),
        const SizedBox(height: 8),
        _PriceInfo(item: item),
        if (item.isCustomizable) ...[
          const SizedBox(height: 4),
          _CustomizableIndicator(),
        ],
        if (!item.isInStock) ...[
          const SizedBox(height: 4),
          _OutOfStockIndicator(),
        ],
      ],
    );
  }
}

class _PriceInfo extends StatelessWidget {
  const _PriceInfo({required this.item});

  final MenuItem item;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Text(
          'Price: ₹${item.priceInfo.finalPrice}',
          style: Theme.of(context).textTheme.bodyLarge,
        ),
        if (item.priceInfo.discount > 0) ...[
          const SizedBox(width: 8),
          Text(
            '₹${item.priceInfo.basePrice}',
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  decoration: TextDecoration.lineThrough,
                  color: Theme.of(context).colorScheme.outline,
                ),
          ),
        ],
      ],
    );
  }
}

class _CustomizableIndicator extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Icon(
          Icons.edit_outlined,
          size: 16,
          color: Theme.of(context).colorScheme.primary,
        ),
        const SizedBox(width: 4),
        Text(
          'Customizable',
          style: Theme.of(context).textTheme.bodySmall?.copyWith(
                color: Theme.of(context).colorScheme.primary,
              ),
        ),
      ],
    );
  }
}

class _OutOfStockIndicator extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Text(
      'Out of Stock',
      style: Theme.of(context).textTheme.bodySmall?.copyWith(
            color: Theme.of(context).colorScheme.error,
          ),
    );
  }
}

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
        else if (quantity > 0) ...[
          Row(
            children: [
              IconButton(
                icon: const Icon(Icons.remove),
                onPressed: () => context.read<MenuState>().updateCartItem(
                      item,
                      false,
                      tableId: tableId,
                      restaurantId: restaurantId,
                    ),
              ),
              Text(
                '$quantity',
                style: Theme.of(context).textTheme.titleMedium,
              ),
              IconButton(
                icon: const Icon(Icons.add),
                onPressed: onAddToCart,
              ),
            ],
          ),
        ] else
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
    required this.items,
    required this.itemQuantities,
    required this.onQuantityChanged,
    required this.tableId,
    required this.restaurantId,
    super.key,
  });

  final Category category;
  final List<MenuItem> items;
  final Map<String, int> itemQuantities;
  final Function(String itemId, bool increment) onQuantityChanged;
  final String tableId;
  final String restaurantId;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.all(16),
          child: Text(
            category.name,
            style: Theme.of(context).textTheme.titleLarge,
          ),
        ),
        ListView.builder(
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
        ),
      ],
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
        padding: const EdgeInsets.all(16),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text(
              'Error',
              style: Theme.of(context).textTheme.headlineSmall,
            ),
            const SizedBox(height: 8),
            Text(error, textAlign: TextAlign.center),
            const SizedBox(height: 16),
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
          bottom: 16,
          left: 16,
          right: 16,
          child: Material(
            elevation: 8,
            borderRadius: BorderRadius.circular(8),
            color: Theme.of(context).colorScheme.primaryContainer,
            child: Padding(
              padding: const EdgeInsets.all(16),
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
                            '🛒 MENU: Cannot navigate to cart - missing ids (r="$rid", t="$tid")');
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
        );
      },
    );
  }
}

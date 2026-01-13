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
import 'package:provider/provider.dart';

class MenuItemCard extends StatelessWidget {
  const MenuItemCard({
    required this.item,
    required this.quantity,
    required this.onQuantityChanged,
    required this.tableId,
    required this.restaurantId,
    super.key,
    this.showImage = false,
  });

  final MenuItem item;
  final int quantity;
  final void Function(bool increment) onQuantityChanged;
  final String tableId;
  final String restaurantId;
  
  /// Whether to show the item image. Defaults to false.
  final bool showImage;

  void _showCustomizationSheet(BuildContext context) {
    showModalBottomSheet<void>(
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
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Image section (if enabled)
            if (showImage && item.meta.image != null) ...[
              _MenuItemImage(imageUrl: item.meta.image!),
              const SizedBox(width: AppSpacing.md),
            ],
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

/// Fixed-height image container for menu items
class _MenuItemImage extends StatelessWidget {
  const _MenuItemImage({required this.imageUrl});

  final String imageUrl;

  @override
  Widget build(BuildContext context) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(8),
      child: SizedBox(
        width: 80,
        height: 80,
        child: Image.network(
          imageUrl,
          fit: BoxFit.cover,
          errorBuilder: (context, error, stackTrace) {
            // Hide gracefully on load failure
            return const SizedBox.shrink();
          },
          loadingBuilder: (context, child, loadingProgress) {
            if (loadingProgress == null) return child;
            return Container(
              color: Theme.of(context).colorScheme.surfaceContainerHighest,
              child: const Center(
                child: SizedBox(
                  width: 20,
                  height: 20,
                  child: CircularProgressIndicator(strokeWidth: 2),
                ),
              ),
            );
          },
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
    required this.menuItemsMap,
    required this.itemQuantities,
    required this.onQuantityChanged,
    required this.tableId,
    required this.restaurantId,
    super.key,
    this.isSubcategoryExpanded,
    this.onSubcategoryToggle,
    this.showImages = false,
  });

  final Category category;
  final Map<String, List<MenuItem>> menuItemsMap;
  final Map<String, int> itemQuantities;
  final void Function(String itemId, bool increment) onQuantityChanged;
  final String tableId;
  final String restaurantId;
  
  /// Callback to check if a subcategory is expanded. Defaults to always expanded if not provided.
  final bool Function(String subcategoryId)? isSubcategoryExpanded;
  
  /// Callback to toggle subcategory expansion.
  final void Function(String subcategoryId)? onSubcategoryToggle;
  
  /// Whether to show images in menu item cards.
  final bool showImages;

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

  /// Build subcategory sections with collapsible headers
  List<Widget> _buildSubcategorySections(BuildContext context) {
    final sections = <Widget>[];
    
    for (final subcat in category.subcategories) {
      final subcatItems = menuItemsMap[subcat.id] ?? [];
      if (subcatItems.isEmpty) continue; // Skip empty subcategories
      
      // Check if subcategory is expanded (default to true if no callback provided)
      final isExpanded = isSubcategoryExpanded?.call(subcat.id) ?? true;
      
      // Subcategory header with toggle
      sections.add(
        InkWell(
          onTap: onSubcategoryToggle != null 
              ? () => onSubcategoryToggle!(subcat.id)
              : null,
          child: Padding(
            padding: const EdgeInsets.only(
              left: AppSpacing.lg, 
              right: AppSpacing.lg, 
              top: AppSpacing.sm, 
              bottom: AppSpacing.xs,
            ),
            child: Row(
              children: [
                Expanded(
                  child: Text(
                    subcat.name,
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                      color: Theme.of(context).colorScheme.primary,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
                // Show chevron only if toggle is available
                if (onSubcategoryToggle != null)
                  AnimatedRotation(
                    duration: const Duration(milliseconds: 200),
                    turns: isExpanded ? 0.5 : 0,
                    child: Icon(
                      Icons.keyboard_arrow_down,
                      color: Theme.of(context).colorScheme.primary,
                    ),
                  ),
              ],
            ),
          ),
        ),
      );
      
      // Items list with smooth collapse animation
      sections.add(
        ClipRect(
          child: AnimatedSize(
            duration: const Duration(milliseconds: 200),
            curve: Curves.easeInOut,
            alignment: Alignment.topCenter,
            child: isExpanded 
                ? _buildItemsList(subcatItems)
                : const SizedBox.shrink(),
          ),
        ),
      );
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
          showImage: showImages,
        );
      },
    );
  }
}

// Note: MenuErrorView, MenuLoadingView, and FloatingCartWidget have been removed.
// Use PageStateView.loading(), PageStateView.error(), and PriceSummaryPanel instead.

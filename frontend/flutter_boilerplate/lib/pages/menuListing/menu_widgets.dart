// File: menu_item_card.dart
import 'package:flutter/material.dart';
import 'package:flutterboilerplate/pages/menuListing/widgets/menu_customization_sheet.dart';
import 'package:flutterboilerplate/pages/menuListing/menu_response.dart';
import 'package:flutterboilerplate/pages/menuListing/menu_state.dart';
import 'package:flutterboilerplate/pages/menuListing/widgets/category_carousel.dart';
import 'package:flutterboilerplate/singletonGods/logger.dart';
import 'package:flutterboilerplate/theme/design_system/app_colors.dart';
import 'package:flutterboilerplate/theme/design_system/app_dimensions.dart';
import 'package:flutterboilerplate/theme/app_typography.dart';
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
      backgroundColor: AppColors.paper,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(AppDimensions.radiusLG)),
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
                selectedAddons: selectedAddons.toList(),
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
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: AppDimensions.space24, vertical: AppDimensions.space4),
      decoration: const BoxDecoration(
        border: Border(bottom: BorderSide(color: AppColors.divider)),
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: () {
             // Optional: Show details or customization on tap
          },
          hoverColor: AppColors.paperAlt,
          child: Padding(
            padding: const EdgeInsets.symmetric(vertical: AppDimensions.space20),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Details Section (Expanded)
                Expanded(
                  child: Padding(
                    padding: const EdgeInsets.only(right: AppDimensions.space16),
                    child: _MenuItemDetails(item: item),
                  ),
                ),
                
                // Actions & Price Section
                Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                   PriceDisplay(
                      finalPrice: item.priceInfo.finalPrice.toDouble(),
                      basePrice: item.priceInfo.discount > 0
                          ? item.priceInfo.basePrice.toDouble()
                          : null,
                      crossAxisAlignment: CrossAxisAlignment.end,
                    ),
                    const SizedBox(height: AppDimensions.space8),
                    _QuantityControl(
                      item: item,
                      quantity: quantity,
                      onAddToCart: () => _handleAddToCart(context),
                      tableId: tableId,
                      restaurantId: restaurantId,
                    ),
                  ],
                ),
                
                 if (showImage && item.meta.image != null) ...[
                  const SizedBox(width: AppDimensions.space16),
                  _MenuItemImage(imageUrl: item.meta.image!),
                ],
              ],
            ),
          ),
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
      borderRadius: BorderRadius.circular(AppDimensions.radiusMD),
      child: SizedBox(
        width: 80,
        height: 80,
        child: Image.network(
          imageUrl,
          fit: BoxFit.cover,
          errorBuilder: (context, error, stackTrace) {
            return const SizedBox.shrink();
          },
          loadingBuilder: (context, child, loadingProgress) {
            if (loadingProgress == null) return child;
            return Container(
              color: AppColors.paperAlt,
              child: const Center(
                child: SizedBox(
                  width: 20,
                  height: 20,
                  child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.primary),
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
        // Metadata Row (Non-Veg/Spicy) above title
        if (item.dietaryType == 'NON_VEG' || (item.spiceLevel != null && item.spiceLevel != 'MILD')) ...[
          Row(
            children: [
                if (item.dietaryType != null && item.dietaryType == 'NON_VEG') ...[
                    StatusBadge.nonVeg(),
                    const SizedBox(width: 8),
                ],
                if (item.spiceLevel != null && item.spiceLevel != 'MILD') ...[
                    StatusBadge.spicy(level: item.spiceLevel!),
                    const SizedBox(width: 8),
                ],
            ],
          ),
          const SizedBox(height: 4),
        ],
        Text(
          item.meta.name,
          style: AppTypography.h3,
        ),
        const SizedBox(height: AppDimensions.space4),
        Text(
          item.meta.description,
          style: AppTypography.body,
          maxLines: 2,
          overflow: TextOverflow.ellipsis,
        ),
        if (item.isCustomizable) ...[
          const SizedBox(height: AppDimensions.space8),
          StatusBadge.customizable(), // Note: StatusBadge might need updates to match design
        ],
        if (!item.isInStock) ...[
          const SizedBox(height: AppDimensions.space8),
          StatusBadge.outOfStock(),
        ],
      ],
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
    if (!item.isInStock) {
      return const SizedBox.shrink(); // Hide button if out of stock, managed by badge
    }

    if (quantity > 0) {
      return QuantitySelector(
        quantity: quantity,
        onIncrement: onAddToCart,
        onDecrement: () => context.read<MenuState>().updateCartItem(
          item,
          false,
          tableId: tableId,
          restaurantId: restaurantId,
        ),
        compact: true, // Use compact mode in list
      );
    }

    return TextButton(
      onPressed: onAddToCart,
      style: TextButton.styleFrom(
        foregroundColor: AppColors.primary,
        backgroundColor: AppColors.paper,
        side: const BorderSide(color: AppColors.divider),
        shape: const RoundedRectangleBorder(
           borderRadius: BorderRadius.all(Radius.circular(AppDimensions.radiusPill)),
        ),
        padding: const EdgeInsets.symmetric(horizontal: AppDimensions.space20, vertical: AppDimensions.space6),
        minimumSize: Size.zero, 
        tapTargetSize: MaterialTapTargetSize.shrinkWrap,
      ),
      child: Text(
        'ADD',
        style: AppTypography.label.copyWith(letterSpacing: 1.0, fontWeight: FontWeight.bold),
      ),
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
  final bool Function(String subcategoryId)? isSubcategoryExpanded;
  final void Function(String subcategoryId)? onSubcategoryToggle;
  final bool showImages;

  @override
  Widget build(BuildContext context) {
    if (category.viewType == 'carousel') {
      return CategoryCarousel(
        category: category,
        items: menuItemsMap[category.id] ?? [],
        itemQuantities: itemQuantities,
        onQuantityChanged: onQuantityChanged,
        tableId: tableId,
        restaurantId: restaurantId,
      );
    }
    
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Category Header (Sticky supported by scroll view usually, but here just styled)
        Container(
          width: double.infinity,
          padding: const EdgeInsets.symmetric(
            horizontal: AppDimensions.space24, 
            vertical: AppDimensions.space16
          ),
          decoration: const BoxDecoration(
             color: AppColors.paper, // Should be sticky/opaque
             border: Border(bottom: BorderSide(color: AppColors.divider)),
          ),
          child: Row(
            children: [
              Container(width: 8, height: 2, color: AppColors.primary),
              const SizedBox(width: AppDimensions.space12),
              Text(
                category.name.toUpperCase(),
                style: AppTypography.uiSerif.copyWith( // Header serif
                  fontSize: 20, 
                  fontWeight: FontWeight.bold,
                  letterSpacing: 0.5,
                  color: AppColors.primary,
                ),
              ),
            ],
          ),
        ),
        
        if (category.subcategories.isNotEmpty)
          ..._buildSubcategorySections(context)
        else
          _buildItemsList(menuItemsMap[category.id] ?? []),
      ],
    );
  }

  List<Widget> _buildSubcategorySections(BuildContext context) {
    final sections = <Widget>[];
    
    for (final subcat in category.subcategories) {
      final subcatItems = menuItemsMap[subcat.id] ?? [];
      if (subcatItems.isEmpty) continue;
      
      final isExpanded = isSubcategoryExpanded?.call(subcat.id) ?? true;
      
      sections.add(
        InkWell(
          onTap: onSubcategoryToggle != null 
              ? () => onSubcategoryToggle!(subcat.id)
              : null,
          child: Container(
            padding: const EdgeInsets.symmetric(
              horizontal: AppDimensions.space24, 
              vertical: AppDimensions.space12
            ),
            decoration: BoxDecoration(
              color: AppColors.paperAlt.withOpacity(0.5),
            ),
            child: Row(
              children: [
                Expanded(
                  child: Text(
                    subcat.name,
                    style: AppTypography.h3.copyWith(fontSize: 16),
                  ),
                ),
                if (onSubcategoryToggle != null)
                  AnimatedRotation(
                    duration: const Duration(milliseconds: 200),
                    turns: isExpanded ? 0.5 : 0,
                    child: const Icon(
                      Icons.keyboard_arrow_down,
                      color: AppColors.primary,
                    ),
                  ),
              ],
            ),
          ),
        ),
      );
      
      sections.add(
        ClipRect(
          child: AnimatedOpacity(
            duration: const Duration(milliseconds: 150),
            opacity: isExpanded ? 1.0 : 0.0,
            child: AnimatedSize(
              duration: const Duration(milliseconds: 150),
              curve: Curves.easeOut,
              alignment: Alignment.topCenter,
              child: isExpanded 
                  ? _buildItemsList(subcatItems)
                  : const SizedBox.shrink(),
            ),
          ),
        ),
      );
    }
    
    return sections;
  }

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

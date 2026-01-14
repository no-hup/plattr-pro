// File: category_carousel.dart
import 'package:flutter/material.dart';
import 'package:flutterboilerplate/pages/menuListing/widgets/menu_customization_sheet.dart';
import 'package:flutterboilerplate/pages/menuListing/menu_response.dart';
import 'package:flutterboilerplate/pages/menuListing/menu_state.dart';
import 'package:flutterboilerplate/singletonGods/logger.dart';
import 'package:flutterboilerplate/theme/design_system/app_colors.dart';
import 'package:flutterboilerplate/theme/design_system/app_dimensions.dart';
import 'package:flutterboilerplate/theme/app_typography.dart';
import 'package:flutterboilerplate/widgets/price_display.dart';
import 'package:provider/provider.dart';

/// Horizontal carousel widget for special categories (Bestsellers, Recommended, etc.)
class CategoryCarousel extends StatelessWidget {
  const CategoryCarousel({
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
  final void Function(String itemId, bool increment) onQuantityChanged;
  final String tableId;
  final String restaurantId;

  @override
  Widget build(BuildContext context) {
    if (items.isEmpty) return const SizedBox.shrink();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Category Header
        Padding(
          padding: const EdgeInsets.symmetric(
            horizontal: AppDimensions.space24, 
            vertical: AppDimensions.space16
          ),
          child: Text(
            category.name.toUpperCase(),
            style: AppTypography.h2,
          ),
        ),
        
        // Horizontal scrolling carousel
        SizedBox(
          height: 240, // Increased height for better layout
          child: ListView.builder(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: AppDimensions.space24),
            itemCount: items.length,
            itemBuilder: (context, index) {
              final item = items[index];
              final quantity = itemQuantities[item.id] ?? 0;
              return Padding(
                padding: EdgeInsets.only(
                  right: index < items.length - 1 ? AppDimensions.space16 : 0,
                  bottom: AppDimensions.space20, // Space for shadow
                ),
                child: _CarouselItemCard(
                  item: item,
                  quantity: quantity,
                  onQuantityChanged: (increment) => onQuantityChanged(item.id, increment),
                  tableId: tableId,
                  restaurantId: restaurantId,
                ),
              );
            },
          ),
        ),
      ],
    );
  }
}

/// Individual card for carousel display
class _CarouselItemCard extends StatelessWidget {
  const _CarouselItemCard({
    required this.item,
    required this.quantity,
    required this.onQuantityChanged,
    required this.tableId,
    required this.restaurantId,
  });

  final MenuItem item;
  final int quantity;
  final void Function(bool increment) onQuantityChanged;
  final String tableId;
  final String restaurantId;

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
            '🛒 CAROUSEL: Adding customized item with variants: $selectedVariants, addons: $selectedAddons',
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
        _showCustomizationSheet(context);
      } else {
        onQuantityChanged(true);
      }
    } else {
      onQuantityChanged(true);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 180,
      decoration: BoxDecoration(
        color: AppColors.paper,
        borderRadius: BorderRadius.circular(AppDimensions.radiusMD),
        boxShadow: AppDimensions.shadowPaper,
        border: Border.all(color: AppColors.divider),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Image section
          ClipRRect(
            borderRadius: const BorderRadius.vertical(top: Radius.circular(AppDimensions.radiusMD)),
            child: Container(
              height: 100,
              width: double.infinity,
              color: AppColors.paperAlt,
              child: item.meta.image != null
                  ? Image.network(
                      item.meta.image!,
                      fit: BoxFit.cover,
                      errorBuilder: (context, error, stackTrace) {
                        return _buildPlaceholder();
                      },
                      loadingBuilder: (context, child, loadingProgress) {
                        if (loadingProgress == null) return child;
                        return const Center(
                          child: SizedBox(
                            width: 20,
                            height: 20,
                            child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.primary),
                          ),
                        );
                      },
                    )
                  : _buildPlaceholder(),
            ),
          ),
          
          // Content section
          Expanded(
            child: Padding(
              padding: const EdgeInsets.all(AppDimensions.space12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    item.meta.name,
                    style: AppTypography.h3.copyWith(fontSize: 16),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const Spacer(),
                  // Price and Add button row
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Expanded(
                        child: PriceDisplay(
                          finalPrice: item.priceInfo.finalPrice.toDouble(),
                          basePrice: item.priceInfo.discount > 0
                              ? item.priceInfo.basePrice.toDouble()
                              : null,
                          size: PriceDisplaySize.small,
                        ),
                      ),
                      _buildAddButton(context),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildPlaceholder() {
    return Center(
      child: Icon(
        Icons.restaurant_menu,
        size: 32,
        color: AppColors.inkLighter.withOpacity(0.4),
      ),
    );
  }

  Widget _buildAddButton(BuildContext context) {
    if (!item.isInStock) {
      return Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
        decoration: BoxDecoration(
          color: AppColors.paperAlt,
          borderRadius: BorderRadius.circular(AppDimensions.radiusSM),
          border: Border.all(color: AppColors.divider),
        ),
        child: Text(
          'Out',
          style: AppTypography.label.copyWith(color: AppColors.inkLight),
        ),
      );
    }

    if (quantity > 0) {
      return Container(
        decoration: const BoxDecoration(
          color: AppColors.primaryLight,
          borderRadius: BorderRadius.all(Radius.circular(AppDimensions.radiusPill)),
        ),
        padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 2),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            InkWell(
              onTap: () {
                context.read<MenuState>().updateCartItem(
                      item,
                      false,
                      tableId: tableId,
                      restaurantId: restaurantId,
                    );
              },
              child: const Padding(
                padding: EdgeInsets.all(4),
                child: Icon(Icons.remove, size: 16, color: AppColors.ink),
              ),
            ),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 4),
              child: Text(
                '$quantity',
                style: AppTypography.uiSans.copyWith(fontWeight: FontWeight.bold),
              ),
            ),
            InkWell(
              onTap: () => _handleAddToCart(context),
              child: const Padding(
                padding: EdgeInsets.all(4),
                child: Icon(Icons.add, size: 16, color: AppColors.primary),
              ),
            ),
          ],
        ),
      );
    }

    return InkWell(
      onTap: () => _handleAddToCart(context),
      borderRadius: BorderRadius.circular(AppDimensions.radiusPill),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
        decoration: BoxDecoration(
          color: AppColors.primary,
          borderRadius: BorderRadius.circular(AppDimensions.radiusPill),
        ),
        child: Text(
          'Add',
          style: AppTypography.label.copyWith(color: Colors.white),
        ),
      ),
    );
  }
}

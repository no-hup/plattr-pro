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
import 'package:flutterboilerplate/widgets/status_badge.dart';
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
class _CarouselItemCard extends StatefulWidget {
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

  @override
  State<_CarouselItemCard> createState() => _CarouselItemCardState();
}

class _CarouselItemCardState extends State<_CarouselItemCard> {
  bool _imageFailed = false;

  void _showCustomizationSheet(BuildContext context) {
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: AppColors.paper,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(AppDimensions.radiusLG)),
      ),
      builder: (context) => MenuCustomizationSheet(
        item: widget.item,
        onConfirm: (selectedVariants, selectedAddons, quantity) {
          AppLogger.log(
            '🛒 CAROUSEL: Adding customized item with variants: $selectedVariants, addons: $selectedAddons, quantity: $quantity',
          );
          context.read<MenuState>().updateCartItem(
                widget.item,
                true,
                tableId: widget.tableId,
                restaurantId: widget.restaurantId,
                selectedVariants: selectedVariants,
                selectedAddons: selectedAddons.toList(),
                quantity: quantity,
                context: context,
              );
        },
      ),
    );
  }

  void _handleAddToCart(BuildContext context) {
    final menuState = context.read<MenuState>();

    if (menuState.needsCustomization(widget.item)) {
      final storedCustomization = menuState.getStoredCustomization(widget.item.id);

      if (widget.quantity == 0 || storedCustomization == null) {
        _showCustomizationSheet(context);
      } else {
        widget.onQuantityChanged(true);
      }
    } else {
      widget.onQuantityChanged(true);
    }
  }

  @override
  Widget build(BuildContext context) {
    final hasImage = widget.item.meta.image != null && 
                     widget.item.meta.image!.isNotEmpty && 
                     !_imageFailed;
    
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
          // Image section (Conditional)
          if (hasImage)
          ClipRRect(
            borderRadius: const BorderRadius.vertical(top: Radius.circular(AppDimensions.radiusMD)),
            child: Container(
              height: 100,
              width: double.infinity,
              color: AppColors.paperAlt,
              child: Image.network(
                      widget.item.meta.image!,
                      fit: BoxFit.cover,
                      errorBuilder: (context, error, stackTrace) {
                        // Set state to hide image on next build
                        WidgetsBinding.instance.addPostFrameCallback((_) {
                          if (mounted && !_imageFailed) {
                            setState(() {
                              _imageFailed = true;
                            });
                          }
                        });
                        return const SizedBox.shrink();
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
                    ),
            ),
          ),
          
          // Content section
          Expanded(
            child: Padding(
              padding: const EdgeInsets.all(AppDimensions.space12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  if (!hasImage) ...[
                     const SizedBox(height: 4),
                  ],
                  // Name with inline dietary/spice markers
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.center,
                    children: [
                      if (widget.item.dietaryType != null) ...[
                        if (widget.item.dietaryType == 'NON_VEG') StatusBadge.nonVeg()
                        else if (widget.item.dietaryType == 'EGG') StatusBadge.egg()
                        else if (widget.item.dietaryType == 'VEG') StatusBadge.veg(),
                        const SizedBox(width: 4),
                      ],
                      if (widget.item.spiceLevel != null && widget.item.spiceLevel != 'MILD') ...[
                        StatusBadge.spicy(level: widget.item.spiceLevel!),
                        const SizedBox(width: 4),
                      ],
                      Expanded(
                        child: Text(
                          widget.item.meta.name,
                          style: AppTypography.h3.copyWith(fontSize: 16),
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    ],
                  ),
                  const Spacer(),
                  // Price and Add button row
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Expanded(
                        child: PriceDisplay(
                          finalPrice: widget.item.priceInfo.finalPrice.toDouble(),
                          basePrice: widget.item.priceInfo.discount > 0
                              ? widget.item.priceInfo.basePrice.toDouble()
                              : null,
                          size: PriceDisplaySize.small,
                          crossAxisAlignment: CrossAxisAlignment.start, // Left aligned price
                          isVertical: true,
                          reverseDiscountOrder: true,
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

  Widget _buildAddButton(BuildContext context) {
    if (!widget.item.isInStock) {
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

    if (widget.quantity > 0) {
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
                      widget.item,
                      false,
                      tableId: widget.tableId,
                      restaurantId: widget.restaurantId,
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
                '${widget.quantity}',
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


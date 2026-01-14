import 'package:flutter/material.dart';
import 'package:flutterboilerplate/pages/cart_listing/cart_listing_state.dart';
import 'package:flutterboilerplate/pages/menuListing/models/cart_item.dart';
import 'package:flutterboilerplate/pages/menuListing/models/cart_price_info.dart';
import 'package:flutterboilerplate/singletonGods/logger.dart';
import 'package:flutterboilerplate/theme/theme.dart';
import 'package:flutterboilerplate/widgets/consumer_app_bar.dart';
import 'package:flutterboilerplate/widgets/price_display.dart';
import 'package:flutterboilerplate/widgets/primary_action_button.dart';
import 'package:flutterboilerplate/widgets/quantity_selector.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

class CartPage extends StatefulWidget {
  const CartPage({
    required this.restaurantId,
    required this.tableId,
    super.key,
  });

  final String restaurantId;
  final String tableId;

  @override
  State<CartPage> createState() => _CartPageState();
}

class _CartPageState extends State<CartPage> {
  @override
  void initState() {
    super.initState();
    // Direct debug print for log testing
    print('🔍🔍🔍 TESTING LOGS - CART PAGE INIT STATE 🔍🔍🔍');

    WidgetsBinding.instance.addPostFrameCallback((_) {
      AppLogger.log(
          '🛒 CART: Initializing cart page for table ${widget.tableId}',);
      context.read<CartListingState>().fetchCart(
            tableId: widget.tableId,
            restaurantId: widget.restaurantId,
          );
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: ConsumerAppBar(
        titleWidget: Text(
          'Cart',
          style: AppTypography.uiSerif.copyWith(
            fontWeight: FontWeight.bold,
            fontSize: 20,
            color: AppColors.primary,
          ),
        ),
        onOrdersTap: () {
          AppLogger.log('🛒 CART: Navigate to orders');
          context.go('/r/${widget.restaurantId}/t/${widget.tableId}/orders');
        },
        onMenuTap: () {
          AppLogger.log('🛒 CART: Navigate back to menu');
          context.go('/r/${widget.restaurantId}/t/${widget.tableId}');
        },
      ),
      body: Consumer<CartListingState>(
        builder: (context, state, child) {
          if (state.isLoading) {
            return const Center(child: CircularProgressIndicator());
          }

          if (state.error != null) {
            return _buildErrorView(context, state.error!);
          }

          if (state.cart == null || state.cart!.items.isEmpty) {
            return _buildEmptyCartView(context);
          }

          return Column(
            children: [
              Expanded(
                child: CartItemsList(
                  items: state.cart!.items,
                  tableId: widget.tableId,
                  restaurantId: widget.restaurantId,
                ),
              ),
              CartPriceSummary(
                priceInfo: state.cart!.priceInfo,
                tableId: widget.tableId,
                restaurantId: widget.restaurantId,
              ),
            ],
          );
        },
      ),
    );
  }

  Widget _buildErrorView(BuildContext context, String error) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            Icons.error_outline,
            size: 64,
            color: Theme.of(context).colorScheme.error,
          ),
          AppSpacing.verticalLG,
          Text(
            'Oops! Something went wrong',
            style: Theme.of(context).textTheme.titleLarge,
          ),
          AppSpacing.verticalSM,
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: AppSpacing.xxl),
            child: Text(
              error,
              textAlign: TextAlign.center,
              style: Theme.of(context).textTheme.bodyMedium,
            ),
          ),
          AppSpacing.verticalXL,
          ElevatedButton(
            onPressed: () {
              AppLogger.log('🛒 CART: Retrying cart fetch');
              context.read<CartListingState>().fetchCart(
                    tableId: widget.tableId,
                    restaurantId: widget.restaurantId,
                  );
            },
            child: const Text('Try Again'),
          ),
        ],
      ),
    );
  }

  Widget _buildEmptyCartView(BuildContext context) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            Icons.shopping_cart_outlined,
            size: 64,
            color: Theme.of(context).colorScheme.outline,
          ),
          AppSpacing.verticalLG,
          Text(
            'Your cart is empty',
            style: Theme.of(context).textTheme.titleLarge,
          ),
          AppSpacing.verticalSM,
          Text(
            'Add items from the menu to get started',
            style: Theme.of(context).textTheme.bodyMedium,
          ),
          AppSpacing.verticalXL,
          ElevatedButton(
            onPressed: () {
              AppLogger.log('🛒 CART: Navigate to menu from empty cart');
              context.go('/r/${widget.restaurantId}/t/${widget.tableId}');
            },
            child: const Text('Browse Menu'),
          ),
        ],
      ),
    );
  }
}

class CartItemsList extends StatelessWidget {
  const CartItemsList({
    required this.items,
    required this.tableId,
    required this.restaurantId,
    super.key,
  });

  final List<CartItem> items;
  final String tableId;
  final String restaurantId;

  @override
  Widget build(BuildContext context) {
    return ListView.separated(
      padding: AppSpacing.pagePadding,
      itemCount: items.length,
      separatorBuilder: (context, index) => const Divider(),
      itemBuilder: (context, index) {
        final item = items[index];
        return CartItemTile(
          item: item,
          tableId: tableId,
          restaurantId: restaurantId,
        );
      },
    );
  }
}

class CartItemTile extends StatelessWidget {
  const CartItemTile({
    required this.item,
    required this.tableId,
    required this.restaurantId,
    super.key,
  });

  final CartItem item;
  final String tableId;
  final String restaurantId;

  @override
  Widget build(BuildContext context) {
    // Note: We use Theme.of(context) for some parts but AppTypography/AppColors for major styling
    // to align with the new design system
    final state = context.watch<CartListingState>();
    final menuItem = state.getMenuItemById(item.menuItemId);
    final hasMenuItem = menuItem != null;

    // Enhanced detailed logging for debugging
    AppLogger.log('💲 CART_TILE: Building tile for item ${item.menuItemId}');

    final isUsingMenuDataForDisplay =
        (item.name == null || item.name!.isEmpty) && hasMenuItem ||
            item.priceInfo == null && hasMenuItem;

    // Get pricing information with robust fallbacks
    final basePrice = item.priceInfo?.itemBasePrice.toDouble() ??
        (menuItem?.priceInfo.basePrice.toDouble() ?? (item.itemPrice ?? 0.0));

    final finalPrice = item.priceInfo?.finalPrice.toDouble() ??
        (menuItem?.priceInfo.finalPrice.toDouble() ??
            (item.totalPrice ?? basePrice));

    final discount = item.priceInfo?.discount.toDouble() ??
        (menuItem?.priceInfo.discount.toDouble() ??
            (basePrice > finalPrice ? basePrice - finalPrice : 0.0));

    // Only show strikethrough if base price is different from final price
    final showBasePriceStrikethrough = basePrice > 0 && basePrice != finalPrice;

    // Get item name with fallbacks
    final itemName = item.name ??
        (hasMenuItem ? menuItem.meta.name : 'Item ${item.menuItemId}');

    // Get description with fallbacks
    final itemDescription =
        item.description ?? (hasMenuItem ? menuItem.meta.description : null);

    return Container(
      decoration: const BoxDecoration(
        color: AppColors.paper,
        border: Border(bottom: BorderSide(color: AppColors.divider)),
      ),
      padding: const EdgeInsets.symmetric(
          vertical: AppSpacing.md, horizontal: AppSpacing.sm,),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Item Name and Price Row
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Text(
                  itemName,
                  style: AppTypography.body.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
              const SizedBox(width: 8),

              // Price display - using centralized PriceDisplay widget
              PriceDisplay(
                finalPrice: finalPrice,
                basePrice: showBasePriceStrikethrough ? basePrice : null,
                discountAmount: discount > 0 ? discount : null,
              ),
            ],
          ),

          // Item Description (if available)
          if (itemDescription != null && itemDescription.isNotEmpty) ...[
            const SizedBox(height: 4),
            Text(
              itemDescription,
              style: AppTypography.bodySmall.copyWith(
                color: AppColors.inkLight,
              ),
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
            ),
          ],

          // Add a note if we're using menu data as fallback
          if (isUsingMenuDataForDisplay) ...[
            const SizedBox(height: 8),
            Text(
              '* Using menu data to display this item',
              style: AppTypography.labelSmall.copyWith(
                fontStyle: FontStyle.italic,
                color: AppColors.primary,
              ),
            ),
          ],

          const SizedBox(height: 12),

          // Variants Section
          if (item.selectedVariants.isNotEmpty) ...[
            const SizedBox(height: 12),
            const Divider(height: 1),
            const SizedBox(height: 8),
            Padding(
              padding: const EdgeInsets.only(bottom: 4),
              child: Text(
                'Selected Variants',
                style: AppTypography.labelSmall.copyWith(
                  fontWeight: FontWeight.bold,
                  color: AppColors.primary,
                ),
              ),
            ),
            ...item.selectedVariants.map((variant) {
              final variantPrice = variant.selectedOption.price;
              final showVariantPrice = variantPrice > 0;

              return Padding(
                padding: const EdgeInsets.only(bottom: 4, left: 8),
                child: Row(
                  children: [
                    const Icon(
                      Icons.check_circle_outline,
                      size: 16,
                      color: AppColors.primary,
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        '${variant.name}: ${variant.selectedOption.name}',
                        style: AppTypography.bodySmall,
                      ),
                    ),
                    if (showVariantPrice)
                      Text(
                        '₹${variantPrice.toStringAsFixed(2)}',
                        style: AppTypography.bodySmall,
                      ),
                  ],
                ),
              );
            }),
          ],

          // Addons Section
          if (item.selectedAddons.isNotEmpty) ...[
            const SizedBox(height: 12),
            if (item.selectedVariants.isEmpty) const Divider(height: 1),
            const SizedBox(height: 8),
            Padding(
              padding: const EdgeInsets.only(bottom: 4),
              child: Text(
                'Selected Add-ons',
                style: AppTypography.labelSmall.copyWith(
                  fontWeight: FontWeight.bold,
                  color: AppColors.primary,
                ),
              ),
            ),
            ...item.selectedAddons.map((addon) {
              final addonPrice = addon.price;
              final showAddonPrice = addonPrice > 0;

              return Padding(
                padding: const EdgeInsets.only(bottom: 4, left: 8),
                child: Row(
                  children: [
                    const Icon(
                      Icons.add_circle,
                      size: 16,
                      color: AppColors.primary,
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        addon.name,
                        style: AppTypography.bodySmall,
                      ),
                    ),
                    if (showAddonPrice)
                      Text(
                        '₹${addonPrice.toStringAsFixed(2)}',
                        style: AppTypography.bodySmall.copyWith(
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                  ],
                ),
              );
            }),
          ],

          const SizedBox(height: 12),

          // Quantity Control
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              // Add remove button
              TextButton.icon(
                onPressed: context.watch<CartListingState>().isUpdatingCart
                    ? null
                    : () {
                        AppLogger.log(
                            '🛒 CART: Removing item ${item.menuItemId} from cart',);
                        if (item.quantity <= 1) {
                          _showRemoveConfirmation(context);
                        } else {
                          context.read<CartListingState>().updateCartItem(
                                item,
                                false,
                                tableId: tableId,
                                restaurantId: restaurantId,
                              );
                        }
                      },
                icon: const Icon(Icons.delete_outline, size: 20),
                label: const Text('Remove'),
                style: TextButton.styleFrom(
                  foregroundColor: AppColors.danger,
                  padding: const EdgeInsets.symmetric(horizontal: 8),
                ),
              ),
              // Quantity Control - using centralized QuantitySelector
              QuantitySelector(
                quantity: item.quantity,
                onDecrement: context.watch<CartListingState>().isUpdatingCart ||
                        item.quantity <= 1
                    ? null
                    : () {
                        AppLogger.log(
                            '🛒 CART: Decreasing quantity for ${item.menuItemId}',);
                        context.read<CartListingState>().updateCartItem(
                              item,
                              false,
                              tableId: tableId,
                              restaurantId: restaurantId,
                            );
                      },
                onIncrement: context.watch<CartListingState>().isUpdatingCart
                    ? null
                    : () {
                        AppLogger.log(
                            '🛒 CART: Increasing quantity for ${item.menuItemId}',);
                        context.read<CartListingState>().updateCartItem(
                              item,
                              true,
                              tableId: tableId,
                              restaurantId: restaurantId,
                            );
                      },
                isEnabled: !context.watch<CartListingState>().isUpdatingCart,
                minQuantity: 1,
              ),
            ],
          ),
        ],
      ),
    );
  }

  // Add a confirmation dialog for removing items
  void _showRemoveConfirmation(BuildContext context) {
    showDialog<void>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Remove Item'),
        content: const Text(
            'Are you sure you want to remove this item from your cart?',),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('CANCEL'),
          ),
          TextButton(
            onPressed: () {
              Navigator.of(context).pop();
              // Set quantity to 0 to remove the item
              context.read<CartListingState>().updateCartItem(
                    item,
                    false,
                    tableId: tableId,
                    restaurantId: restaurantId,
                  );
            },
            style: TextButton.styleFrom(
              foregroundColor: AppColors.danger,
            ),
            child: const Text('REMOVE'),
          ),
        ],
      ),
    );
  }
}

class CartPriceSummary extends StatelessWidget {
  const CartPriceSummary({
    required this.priceInfo,
    required this.tableId,
    required this.restaurantId,
    super.key,
  });

  final CartPriceInfo? priceInfo;
  final String tableId;
  final String restaurantId;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final state = context.watch<CartListingState>();

    // If priceInfo is null, use default values
    if (priceInfo == null) {
      AppLogger.log(
          '💰 CART_SUMMARY: No priceInfo available, showing empty state',);
      return const SizedBox.shrink();
    }

    // Log the cart price information
    AppLogger.log('💰 CART_SUMMARY: priceInfo data');
    AppLogger.log('💰 CART_SUMMARY: - basePrice: ${priceInfo!.basePrice}');
    AppLogger.log('💰 CART_SUMMARY: - finalPrice: ${priceInfo!.finalPrice}');
    AppLogger.log(
        '💰 CART_SUMMARY: - totalDiscountAmount: ${priceInfo!.totalDiscountAmount}',);

    // Get values directly from priceInfo with safe fallbacks
    final basePrice = priceInfo!.basePrice?.toDouble() ?? 0.0;
    final finalPrice = priceInfo!.finalPrice?.toDouble() ?? 0.0;
    final discountAmount = priceInfo!.totalDiscountAmount?.toDouble() ?? 0.0;

    // Detect if the cart is empty (has no items or all have zero prices)
    final hasNoItems = state.cart?.items.isEmpty ?? true;

    // Only show strikethrough if base price is different from final price
    final showBasePriceStrikethrough =
        basePrice > finalPrice && basePrice > 0 && finalPrice > 0;
    final hasDiscount = discountAmount > 0;

    // Hide the summary if both prices are zero or cart has no items
    if (finalPrice <= 0 || hasNoItems) {
      AppLogger.log(
          '💰 CART_SUMMARY: Hiding summary because prices are zero or cart is empty',);
      return const SizedBox.shrink();
    }

    return Container(
      padding: AppSpacing.pagePadding,
      decoration: const BoxDecoration(
        color: AppColors.paper,
        border: Border(top: BorderSide(color: AppColors.divider)),
        boxShadow: AppDimensions.shadowPaper,
      ),
      child: SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Only show subtotal if base price is different from final price
            if (showBasePriceStrikethrough)
              _buildPriceRow(
                context,
                'Subtotal:',
                '₹${basePrice.toStringAsFixed(2)}',
                valueStyle: theme.textTheme.bodyLarge?.copyWith(
                  decoration: TextDecoration.lineThrough,
                  color: theme.colorScheme.onSurfaceVariant,
                ),
              ),

            // Only show discount if there is a non-zero discount
            if (hasDiscount)
              _buildPriceRow(
                context,
                'Discount:',
                '-₹${discountAmount.toStringAsFixed(2)}',
                valueColor: theme.colorScheme.error,
              ),

            const Divider(height: 24),

            // Always show final price
            _buildPriceRow(
              context,
              'To Pay:',
              '₹${finalPrice.toStringAsFixed(2)}',
              labelStyle: AppTypography.h3,
              valueStyle: AppTypography.h3.copyWith(
                color: AppColors.primary,
              ),
            ),

            AppSpacing.verticalLG,

            SizedBox(
              width: double.infinity,
              child: PrimaryActionButton(
                label: 'PROCEED TO CHECKOUT',
                isLoading: state.isUpdatingCart,
                onPressed: state.isUpdatingCart || hasNoItems
                    ? null
                    : () async {
                        AppLogger.log('🛒 CART: Proceeding to checkout');

                        // Show loading indicator
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(
                            content: Text('Processing checkout...'),
                            duration: Duration(seconds: 2),
                          ),
                        );

                        // Call checkout method on the state provider
                        final success =
                            await context.read<CartListingState>().checkoutCart(
                                  restaurantId: restaurantId,
                                  tableId: tableId,
                                );

                        if (success) {
                          // Show success message
                          if (context.mounted) {
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(
                                content: Text('Order placed successfully!'),
                                backgroundColor: Colors.green,
                              ),
                            );

                            // Navigate to orders page to show order history
                            AppLogger.log(
                                '🛒 CART: Checkout successful, navigating to orders page',);
                            context.go('/r/$restaurantId/t/$tableId/orders');
                          }
                        } else {
                          // Show error message
                          if (context.mounted) {
                            final errorMsg =
                                context.read<CartListingState>().error ??
                                    'Failed to place order';
                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(
                                content: Text(errorMsg),
                                backgroundColor: Colors.red,
                              ),
                            );
                          }
                        }
                      },
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildPriceRow(
    BuildContext context,
    String label,
    String value, {
    TextStyle? labelStyle,
    TextStyle? valueStyle,
    Color? valueColor,
  }) {
    final theme = Theme.of(context);

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label,
            style: labelStyle ?? theme.textTheme.bodyLarge,
          ),
          Text(
            value,
            style: valueStyle ??
                theme.textTheme.bodyLarge?.copyWith(
                  color: valueColor,
                ),
          ),
        ],
      ),
    );
  }
}

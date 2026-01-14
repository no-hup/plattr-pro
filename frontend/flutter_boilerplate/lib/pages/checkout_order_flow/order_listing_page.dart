import 'package:flutter/material.dart';
import 'package:flutterboilerplate/pages/checkout_order_flow/models/order_models.dart';
import 'package:flutterboilerplate/pages/checkout_order_flow/order_listing_state.dart';
import 'package:flutterboilerplate/singletonGods/featureFlags.dart';
import 'package:flutterboilerplate/singletonGods/logger.dart';
import 'package:flutterboilerplate/theme/theme.dart';
import 'package:flutterboilerplate/widgets/consumer_app_bar.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';

class OrderListingPage extends StatefulWidget {
  const OrderListingPage({
    required this.restaurantId, required this.tableId, super.key,
    this.orderId,
  });

  final String restaurantId;
  final String tableId;
  final String? orderId;

  @override
  State<OrderListingPage> createState() => _OrderListingPageState();
}

class _OrderListingPageState extends State<OrderListingPage> {
  @override
  void initState() {
    super.initState();
    AppLogger.log('📋 ORDER_PAGE: Initializing order page for table ${widget.tableId}');
    
    WidgetsBinding.instance.addPostFrameCallback((_) {
      // Set the specific orderId if provided to the widget
      if (widget.orderId != null) {
        context.read<OrderListingState>().orderId = widget.orderId;
      }
      
      context.read<OrderListingState>().fetchOrder(
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
          widget.orderId != null ? 'Order Details' : 'Orders',
          style: AppTypography.uiSerif.copyWith(
            fontWeight: FontWeight.bold,
            fontSize: 20,
            color: AppColors.primary,
          ),
        ),
        trailingActions: [
          _buildFeatureFlagToggle(context),
        ],
        onMenuTap: () {
          AppLogger.log('📋 ORDER: Navigate back to menu');
          context.go('/r/${widget.restaurantId}/t/${widget.tableId}/menu');
        },
        onCartTap: () {
          AppLogger.log('📋 ORDER: Navigate to cart');
          context.go('/r/${widget.restaurantId}/t/${widget.tableId}/cart');
        },
      ),
      body: Consumer<OrderListingState>(
        builder: (context, state, child) {
          if (state.isLoading) {
            return const Center(child: CircularProgressIndicator());
          }

          if (state.error != null) {
            return _buildErrorView(context, state.error!);
          }

          // For multiple orders view (no specific orderId)
          if (widget.orderId == null) {
            if (state.order == null) {
              return _buildEmptyOrderView(context);
            }
            
            // If the API only returns a single order, display it directly
            return OrderDetailsView(
              orderData: state.order!,
              orderStatusText: state.getOrderStatusText(),
              orderStatusColor: state.getOrderStatusColor(),
              formattedDate: state.getFormattedOrderDate(),
            );
          }
          
          // For single order detail view (with specific orderId)
          if (state.order == null) {
            return _buildEmptyOrderView(context);
          }

          return OrderDetailsView(
            orderData: state.order!,
            orderStatusText: state.getOrderStatusText(),
            orderStatusColor: state.getOrderStatusColor(),
            formattedDate: state.getFormattedOrderDate(),
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
              AppLogger.log('📋 ORDER: Retrying order fetch');
              context.read<OrderListingState>().fetchOrder(
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

  Widget _buildEmptyOrderView(BuildContext context) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            Icons.receipt_long,
            size: 64,
            color: Theme.of(context).colorScheme.outline,
          ),
          AppSpacing.verticalLG,
          Text(
            'No orders found',
            style: Theme.of(context).textTheme.titleLarge,
          ),
          AppSpacing.verticalSM,
          Text(
            "You haven't placed any orders yet",
            style: Theme.of(context).textTheme.bodyMedium,
          ),
          AppSpacing.verticalXL,
          ElevatedButton(
            onPressed: () {
              AppLogger.log('📋 ORDER: Navigate to menu from empty orders');
              context.go('/r/${widget.restaurantId}/t/${widget.tableId}/menu');
            },
            child: const Text('Browse Menu'),
          ),
        ],
      ),
    );
  }

  Widget _buildFeatureFlagToggle(BuildContext context) {
    // Get the current state of the feature flag
    final featureFlags = FeatureFlags();
    
    return IconButton(
      tooltip: 'Toggle View Mode',
      icon: Icon(
        featureFlags.showCartLevelBreakupForOrder 
            ? Icons.view_agenda 
            : Icons.view_list,
      ),
      onPressed: () {
        // Show a dialog to toggle the feature flag
        showDialog(
          context: context,
          builder: (BuildContext dialogContext) {
            // Using StatefulBuilder to update the dialog content when the switch changes
            return StatefulBuilder(
              builder: (context, setState) {
                return AlertDialog(
                  title: const Text('Order Display Options'),
                  content: Column(
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Choose how orders are displayed:',
                        style: Theme.of(context).textTheme.bodyMedium,
                      ),
                        AppSpacing.verticalLG,
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text('Show Cart Level Breakdown'),
                          Switch(
                            value: featureFlags.showCartLevelBreakupForOrder,
                            onChanged: (bool value) {
                              setState(() {
                                // Update the feature flag
                                if (value) {
                                  featureFlags.enableCartLevelBreakup();
                                } else {
                                  featureFlags.disableCartLevelBreakup();
                                }
                              });
                              
                              // Also trigger a rebuild of the page
                              if (mounted) {
                                this.setState(() {});
                              }
                              
                              AppLogger.log('📋 ORDER: Feature flag changed to ${featureFlags.showCartLevelBreakupForOrder}');
                            },
                          ),
                        ],
                      ),
                    ],
                  ),
                  actions: [
                    TextButton(
                      onPressed: () {
                        Navigator.of(context).pop();
                      },
                      child: const Text('Close'),
                    ),
                  ],
                );
              },
            );
          },
        );
      },
    );
  }
}

class OrderDetailsView extends StatelessWidget {
  const OrderDetailsView({
    required this.orderData, required this.orderStatusText, required this.orderStatusColor, required this.formattedDate, super.key,
  });

  final OrderData orderData;
  final String orderStatusText;
  final Color orderStatusColor;
  final String formattedDate;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    // Feature flag to determine how to display order items
    final featureFlags = FeatureFlags();
    final showCartBreakup = featureFlags.showCartLevelBreakupForOrder;
    
    // Log the feature flag state for debugging
    AppLogger.log('📋 ORDERS: Using cart level breakup: $showCartBreakup');
    AppLogger.log('📋 ORDERS: Number of carts: ${orderData.carts.length}');
    
    return Column(
      children: [
        // Order header with status
        _buildOrderHeader(context),
        
        // Order items based on feature flag
        if (showCartBreakup && orderData.carts.isNotEmpty) 
          // Display the items grouped by cart
          Expanded(
            child: CartHistoryList(carts: orderData.carts),
          )
        else
          // Display flattened list of all items
          Expanded(
            child: OrderItemsList(items: orderData.items),
          ),
        
        // Order summary footer
        _buildOrderSummary(context),
      ],
    );
  }
  
  Widget _buildOrderHeader(BuildContext context) {
    final theme = Theme.of(context);
    
    return Container(
      padding: AppSpacing.pagePadding,
      decoration: const BoxDecoration(
        color: AppColors.paper,
        boxShadow: AppDimensions.shadowPaper,
        border: Border(bottom: BorderSide(color: AppColors.divider)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Order #${orderData.orderNumber}',
                style: AppTypography.h3,
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: AppSpacing.sm, vertical: 4),
                decoration: BoxDecoration(
                  color: orderStatusColor.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(AppDimensions.radiusPill),
                  border: Border.all(color: orderStatusColor.withOpacity(0.3)),
                ),
                child: Text(
                  orderStatusText.toUpperCase(),
                  style: AppTypography.labelSmall.copyWith(
                    color: orderStatusColor,
                    fontWeight: FontWeight.bold,
                    letterSpacing: 0.5,
                  ),
                ),
              ),
            ],
          ),
          AppSpacing.verticalSM,
          Text(
            'Placed on $formattedDate',
            style: AppTypography.bodySmall.copyWith(
              color: AppColors.inkLight,
            ),
          ),
          if (orderData.notes.isNotEmpty) ...[
            AppSpacing.verticalLG,
            Text(
              'Notes:',
              style: AppTypography.labelMedium.copyWith(
                fontWeight: FontWeight.bold,
                color: AppColors.ink,
              ),
            ),
            AppSpacing.verticalXS,
            Text(
              orderData.notes,
              style: AppTypography.body,
            ),
          ],
        ],
      ),
    );
  }
  
  Widget _buildOrderSummary(BuildContext context) {
    final theme = Theme.of(context);
    
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
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Total Amount:',
                  style: AppTypography.h3,
                ),
                Text(
                  '₹${orderData.total.toStringAsFixed(2)}',
                  style: AppTypography.h3.copyWith(
                    color: AppColors.primary,
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

/// Displays a list of order items
class OrderItemsList extends StatelessWidget {
  const OrderItemsList({
    required this.items, super.key,
  });

  final List<OrderItem> items;

  @override
  Widget build(BuildContext context) {
    if (items.isEmpty) {
      return Padding(
        padding: AppSpacing.pagePadding,
        child: Center(
          child: Text('No items in this order'),
        ),
      );
    }

    return ListView.separated(
      padding: AppSpacing.pagePadding,
      // Use shrinkWrap and physics when used inside another scrollable widget (like in CartHistoryCard)
      shrinkWrap: true,
      physics: const ClampingScrollPhysics(),
      itemCount: items.length,
      separatorBuilder: (context, index) => const Divider(),
      itemBuilder: (context, index) {
        final item = items[index];
        return OrderItemTile(item: item);
      },
    );
  }
}

class OrderItemTile extends StatelessWidget {
  const OrderItemTile({
    required this.item, super.key,
  });

  final OrderItem item;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    
    // Log item details for debugging
    AppLogger.log('🧾 ORDER_ITEM: Building tile for item ${item.menuItemId}');
    AppLogger.log('🧾 ORDER_ITEM: - name: ${item.name}');
    AppLogger.log('🧾 ORDER_ITEM: - quantity: ${item.quantity}');
    AppLogger.log('🧾 ORDER_ITEM: - price: ${item.price}');
    AppLogger.log('🧾 ORDER_ITEM: - variants count: ${item.variants.length}');
    AppLogger.log('🧾 ORDER_ITEM: - addons count: ${item.addons.length}');
    AppLogger.log('🧾 ORDER_ITEM: - cartItemId: ${item.cartItemId ?? "null"}');
    
    // Calculate total price (price * quantity)
    final totalPrice = item.price * item.quantity;
    
    return Container(
      decoration: const BoxDecoration(
        color: AppColors.paper,
      ),
      padding: const EdgeInsets.symmetric(vertical: AppSpacing.md, horizontal: AppSpacing.sm),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Item Name and Price Row
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Quantity indicator
              Container(
                padding: const EdgeInsets.symmetric(horizontal: AppSpacing.sm, vertical: AppSpacing.xs),
                decoration: BoxDecoration(
                  color: AppColors.primary.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(AppDimensions.radiusPill),
                ),
                child: Text(
                  '${item.quantity}x',
                  style: AppTypography.labelMedium.copyWith(
                    fontWeight: FontWeight.bold,
                    color: AppColors.primary,
                  ),
                ),
              ),
              AppSpacing.horizontalMD,
              
              // Item name and details
              Expanded(
                child: Text(
                  item.name,
                  style: AppTypography.body.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
              
              // Price
              Text(
                '₹${totalPrice.toStringAsFixed(2)}',
                style: AppTypography.body.copyWith(
                  fontWeight: FontWeight.bold,
                ),
              ),
            ],
          ),
          
          // Variants Section
          _buildVariantsSection(theme),
          
          // Addons Section
          _buildAddonsSection(theme),
        ],
      ),
    );
  }
  
  Widget _buildVariantsSection(ThemeData theme) {
    if (item.variants.isEmpty) {
      return const SizedBox.shrink();
    }
    
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        AppSpacing.verticalMD,
        const Divider(height: 1),
        AppSpacing.verticalSM,
        Padding(
          padding: const EdgeInsets.only(bottom: 4),
          child: Text(
            'Variants',
            style: theme.textTheme.bodyMedium?.copyWith(
              fontWeight: FontWeight.bold,
              color: theme.colorScheme.primary,
            ),
          ),
        ),
        ...item.variants.map((variant) {
          return Padding(
            padding: const EdgeInsets.only(bottom: 4, left: 8),
            child: Row(
              children: [
                Icon(
                  Icons.check_circle_outline,
                  size: 16,
                  color: theme.colorScheme.primary,
                ),
                AppSpacing.horizontalSM,
                Expanded(
                  child: Text(
                    variant.selected_variant_name,
                    style: theme.textTheme.bodyMedium,
                  ),
                ),
                if (variant.priceInfo.finalPrice > 0)
                  Text(
                    '₹${variant.priceInfo.finalPrice.toStringAsFixed(2)}',
                    style: theme.textTheme.bodyMedium,
                  ),
              ],
            ),
          );
        }),
      ],
    );
  }
  
  Widget _buildAddonsSection(ThemeData theme) {
    if (item.addons.isEmpty) {
      return const SizedBox.shrink();
    }
    
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        AppSpacing.verticalMD,
        if (item.variants.isEmpty) const Divider(height: 1),
        AppSpacing.verticalSM,
        Padding(
          padding: const EdgeInsets.only(bottom: 4),
          child: Text(
            'Add-ons',
            style: theme.textTheme.bodyMedium?.copyWith(
              fontWeight: FontWeight.bold,
              color: theme.colorScheme.secondary,
            ),
          ),
        ),
        ...item.addons.map((addon) {
          return Padding(
            padding: const EdgeInsets.only(bottom: 4, left: 8),
            child: Row(
              children: [
                Icon(
                  Icons.add_circle,
                  size: 16,
                  color: theme.colorScheme.secondary,
                ),
                AppSpacing.horizontalSM,
                Expanded(
                  child: Text(
                    addon.name,
                    style: theme.textTheme.bodyMedium,
                  ),
                ),
                if (addon.priceInfo.finalPrice > 0)
                  Text(
                    '₹${addon.priceInfo.finalPrice.toStringAsFixed(2)}',
                    style: theme.textTheme.bodyMedium?.copyWith(
                      fontWeight: FontWeight.w500,
                    ),
                  ),
              ],
            ),
          );
        }),
      ],
    );
  }
}

/// Widget to display a list of carts from the order history
class CartHistoryList extends StatelessWidget {

  const CartHistoryList({
    required this.carts, super.key,
  });
  final List<CartHistoryItem> carts;

  @override
  Widget build(BuildContext context) {
    if (carts.isEmpty) {
      return const Center(
        child: Text('No cart history available'),
      );
    }

    AppLogger.log('📋 CART_LIST: Building cart history list with ${carts.length} carts');

    return ListView.builder(
      padding: AppSpacing.pagePadding,
      itemCount: carts.length,
      itemBuilder: (context, index) {
        final cart = carts[index];
        return CartHistoryCard(cart: cart, index: index);
      },
    );
  }
}

/// Widget to display a single cart from the order history
class CartHistoryCard extends StatelessWidget {
  const CartHistoryCard({
    required this.cart, required this.index, super.key,
  });

  final CartHistoryItem cart;
  final int index;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final dateFormat = DateFormat('MMM d, yyyy • h:mm a');
    final checkoutTimeString = cart.checkoutTime != null 
        ? dateFormat.format(cart.checkoutTime!) 
        : 'Unknown time';

    return Container(
      margin: const EdgeInsets.only(bottom: AppSpacing.lg),
      decoration: const BoxDecoration(
        color: AppColors.paper,
        boxShadow: AppDimensions.shadowPaper,
        borderRadius: BorderRadius.all(Radius.circular(AppDimensions.radiusMD)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Cart header with checkout time
          Container(
            padding: AppSpacing.pagePadding,
            decoration: const BoxDecoration(
              color: AppColors.paperAlt,
              borderRadius: BorderRadius.only(
                topLeft: Radius.circular(AppDimensions.radiusMD),
                topRight: Radius.circular(AppDimensions.radiusMD),
              ),
              border: Border(bottom: BorderSide(color: AppColors.divider)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      'Cart #${index + 1}',
                      style: AppTypography.h3,
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: AppSpacing.sm, vertical: 4),
                      decoration: BoxDecoration(
                        color: _getStatusColor(cart.status).withOpacity(0.1),
                        borderRadius: BorderRadius.circular(AppDimensions.radiusPill),
                        border: Border.all(color: _getStatusColor(cart.status).withOpacity(0.3)),
                      ),
                      child: Text(
                        cart.status.toUpperCase(),
                        style: AppTypography.labelSmall.copyWith(
                          color: _getStatusColor(cart.status),
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 4),
                Text(
                  'Checked out on $checkoutTimeString',
                  style: AppTypography.bodySmall.copyWith(
                    color: AppColors.inkLight,
                  ),
                ),
              ],
            ),
          ),
          
          // Cart items
          OrderItemsList(items: cart.items),
          
          // Cart summary
          Padding(
            padding: AppSpacing.pagePadding,
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Cart total:',
                  style: AppTypography.body.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
                ),
                Text(
                  '₹${cart.total.toStringAsFixed(2)}',
                  style: AppTypography.h3.copyWith(
                    color: AppColors.primary,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Color _getStatusColor(String status) {
    switch (status.toLowerCase()) {
      case 'pending':
        return Colors.orange;
      case 'processing':
        return const Color(0xFF1A2E4A); // AppColors.primary (navy) for processing
      case 'confirmed':
        return Colors.green;
      case 'completed':
        return Colors.green.shade800;
      case 'cancelled':
        return Colors.red;
      default:
        return Colors.grey;
    }
  }

} 
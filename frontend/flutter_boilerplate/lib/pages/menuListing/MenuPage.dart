// ignore_for_file: slash_for_doc_comments, lines_longer_than_80_chars

import 'package:flutter/material.dart';
// ignore: unused_import
import 'package:flutterboilerplate/pages/debug_baner.dart';
import 'package:flutterboilerplate/pages/menuListing/menu_response.dart';
import 'package:flutterboilerplate/pages/menuListing/menu_state.dart';
import 'package:flutterboilerplate/pages/menuListing/menu_widgets.dart';
import 'package:flutterboilerplate/theme/theme.dart';
import 'package:flutterboilerplate/pages/menuListing/widgets/floating_menu_overlay.dart';
import 'package:flutterboilerplate/singletonGods/logger.dart';
import 'package:flutterboilerplate/widgets/category_tab_bar.dart';
import 'package:flutterboilerplate/widgets/consumer_app_bar.dart';
import 'package:flutterboilerplate/widgets/offers_carousel.dart';
import 'package:flutterboilerplate/widgets/otp_badge.dart';
import 'package:flutterboilerplate/widgets/page_state_view.dart';
import 'package:flutterboilerplate/widgets/price_summary_panel.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import 'package:scrollable_positioned_list/scrollable_positioned_list.dart';

/// Estimated height of the cart summary panel for FAB offset calculation
const double _kCartPanelHeight = 100.0;

class MenuPage extends StatelessWidget {
  const MenuPage({
    required this.restaurantId,
    required this.tableId,
    super.key,
  });

  final String restaurantId;
  final String tableId;

  @override
  Widget build(BuildContext context) {
    final menuState = context.read<MenuState>();

    return FutureBuilder<void>(
      future: menuState.fetchMenu(restaurantId, tableId: tableId),
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return Scaffold(
            body: PageStateView.loading(message: 'Loading menu...'),
          );
        }

        if (snapshot.hasError) {
          return Scaffold(
            body: PageStateView.error(
              message: snapshot.error.toString(),
              primaryAction: ElevatedButton(
                onPressed: () => menuState.fetchMenu(restaurantId, tableId: tableId),
                child: const Text('Retry'),
              ),
            ),
          );
        }

        return MenuPageContent(
          restaurantId: restaurantId,
          tableId: tableId,
        );
      },
    );
  }
}

class MenuPageContent extends StatefulWidget {
  const MenuPageContent({
    required this.restaurantId,
    required this.tableId,
    super.key,
  });

  final String restaurantId;
  final String tableId;

  @override
  State<MenuPageContent> createState() => _MenuPageContentState();
}

class _MenuPageContentState extends State<MenuPageContent> {
  // Controllers provided by scrollable_positioned_list package
  final ItemScrollController _itemScrollController = ItemScrollController();
  final ItemPositionsListener _itemPositionsListener = ItemPositionsListener.create();
  
  /// Track last active category to avoid redundant state updates
  String? _lastActiveCategoryId;

  @override
  void initState() {
    super.initState();
    _setupScrollSyncListener();
  }

  /// Setup scroll spy listener that syncs scroll position to active category
  void _setupScrollSyncListener() {
    _itemPositionsListener.itemPositions.addListener(_onScrollPositionsChanged);
  }

  /// Callback when visible item positions change
  void _onScrollPositionsChanged() {
    // Get all visible item positions
    final positions = _itemPositionsListener.itemPositions.value;
    
    // Guard against empty positions (rapid layout changes or unmount)
    if (positions.isEmpty) return;

    // Find items that are actually visible on screen
    // itemLeadingEdge < 1 means top of item is above viewport bottom
    // itemTrailingEdge > 0 means bottom of item is below viewport top
    final visibleIndices = positions
        .where((item) => item.itemLeadingEdge < 1 && item.itemTrailingEdge > 0)
        .map((item) => item.index)
        .toList()
      ..sort();

    if (visibleIndices.isEmpty) return;

    final topIndex = visibleIndices.first;
    final menuState = context.read<MenuState>();
    final categories = menuState.menuData?.categories ?? [];

    // Ensure index is within bounds
    if (topIndex >= categories.length) return;

    final newActiveId = categories[topIndex].id;

    // Use postFrameCallback to batch state updates and avoid excessive rebuilds
    if (_lastActiveCategoryId != newActiveId) {
      _lastActiveCategoryId = newActiveId;
      WidgetsBinding.instance.addPostFrameCallback((_) {
        // Double-check widget is still mounted before updating state
        if (mounted) {
          menuState.setActiveCategory(newActiveId);
        }
      });
    }
  }

  @override
  void dispose() {
    _itemPositionsListener.itemPositions.removeListener(_onScrollPositionsChanged);
    super.dispose();
  }

  /// Method to scroll to a specific category by index
  /// Uses different alignment for last category to prevent glitch when content is shorter than viewport
  void scrollToCategory(int index) {
    if (!_itemScrollController.isAttached) return;
    
    final menuState = context.read<MenuState>();
    final categories = menuState.menuData?.categories ?? [];
    final isLastCategory = index == categories.length - 1;
    
    _itemScrollController.scrollTo(
      index: index,
      duration: const Duration(milliseconds: 400),
      curve: Curves.easeInOut,
      // For last category, use a lower alignment to prevent bounce/glitch
      // when the category + items height is less than viewport
      alignment: isLastCategory ? 0.2 : 0.0,
    );
  }

  /// Method to scroll to a category by ID
  void scrollToCategoryById(String categoryId) {
    final menuState = context.read<MenuState>();
    final categories = menuState.menuData?.categories ?? [];
    final index = categories.indexWhere((c) => c.id == categoryId);
    
    if (index != -1) {
      scrollToCategory(index);
      // Update active state immediately for responsive UI
      menuState.setActiveCategory(categoryId);
      // Close floating menu if open
      menuState.closeFloatingMenu();
    }
  }

  @override
  Widget build(BuildContext context) {
    return Consumer<MenuState>(
      builder: (context, menuState, child) {
        final menuData = menuState.menuData;

        if (menuData == null || menuData.categories.isEmpty) {
          return Scaffold(
            body: PageStateView.empty(
              title: 'No menu items available',
              message: 'This restaurant has not added any items to the menu yet.',
            ),
          );
        }

        // Calculate cart item count for badge
        final cartItemCount = menuState.cart?.items.fold<int>(
          0,
          (sum, item) => sum + item.quantity,
        ) ?? 0;

        // Get table context for header (null-safe)
        final tableContext = menuData.tableContext;
        final hasTableContext = tableContext != null;

        return Scaffold(
          appBar: ConsumerAppBar(
            // Use titleWidget for rich header when tableContext is available
            titleWidget: hasTableContext
                ? _buildRichHeader(context, tableContext)
                : null,
            // Fallback to simple title when no tableContext
            title: hasTableContext ? null : 'Menu',
            onOrdersTap: () {
              AppLogger.log('🍽️ MENU: Navigate to orders');
              context.go('/r/${widget.restaurantId}/t/${widget.tableId}/orders');
            },
            onCartTap: () {
              AppLogger.log('🛒 MENU: Navigate to cart');
              context.go('/r/${widget.restaurantId}/t/${widget.tableId}/cart');
            },
            cartItemCount: cartItemCount,
          ),
          body: Stack(
            children: [
              Column(
                children: [
                  // DebugBanner hidden from UI 
                  // DebugBanner(
                  //   tableId: widget.tableId,
                  //   restaurantId: widget.restaurantId,
                  // ),
                  // Offers Carousel (Placeholder for Lumière)
                  const Padding(
                    padding: EdgeInsets.only(top: AppSpacing.sm),
                    child: OffersCarousel(),
                  ),
                  // Category Tab Bar for navigation
                  CategoryTabBar(
                    categories: menuData.categories,
                    activeCategoryId: menuState.activeCategoryId,
                    onCategoryTap: scrollToCategoryById,
                  ),
                  Expanded(
                    child: ScrollablePositionedList.builder(
                      itemCount: menuData.categories.length,
                      itemScrollController: _itemScrollController,
                      itemPositionsListener: _itemPositionsListener,
                      // Add bottom padding when cart panel is visible to prevent content hiding
                      padding: EdgeInsets.only(
                        bottom: cartItemCount > 0 ? _kCartPanelHeight : 0,
                      ),
                      itemBuilder: (context, index) {
                        final category = menuData.categories[index];

                        // Collect all items for this category (for quantity tracking)
                        final allCategoryItems = _getAllItemsForCategory(
                          category,
                          menuData.menuItems,
                        );

                        return CategorySection(
                          category: category,
                          menuItemsMap: menuData.menuItems,
                          tableId: widget.tableId,
                          restaurantId: widget.restaurantId,
                          itemQuantities: _getItemQuantities(menuState, allCategoryItems),
                          onQuantityChanged: (itemId, increment) {
                            // Find item in any subcategory or category
                            MenuItem? item;
                            for (final i in allCategoryItems) {
                              if (i.id == itemId) {
                                item = i;
                                break;
                              }
                            }
                            if (item != null) {
                              menuState.updateCartItem(
                                item,
                                increment,
                                tableId: widget.tableId,
                                restaurantId: widget.restaurantId,
                              );
                            }
                          },
                          isSubcategoryExpanded: menuState.isSubcategoryExpanded,
                          onSubcategoryToggle: menuState.toggleSubcategory,
                          showImages: menuData.tableContext?.showImages ?? false,
                        );
                      },
                    ),
                  ),
                ],
              ),
              // Cart summary panel
              _buildCartSummaryPanel(context, menuState),
              // Floating menu overlay for quick category navigation
              // Offset FAB when cart panel is visible to avoid overlap
              FloatingMenuOverlay(
                isExpanded: menuState.isFloatingMenuExpanded,
                categories: menuData.categories,
                onToggle: menuState.toggleFloatingMenu,
                onCategoryTap: scrollToCategoryById,
                bottomOffset: cartItemCount > 0 ? _kCartPanelHeight : 0,
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildCartSummaryPanel(BuildContext context, MenuState menuState) {
    final cart = menuState.cart;
    if (cart == null || cart.items.isEmpty) return const SizedBox.shrink();

    final totalItems = cart.items.fold<int>(
      0,
      (sum, item) => sum + item.quantity,
    );

    // Hide if total items is zero
    if (totalItems <= 0) return const SizedBox.shrink();

    final cartPriceInfo = cart.priceInfo;
    final finalPrice = cartPriceInfo?.finalPrice ?? 0;

    return Positioned(
      bottom: 0,
      left: 0,
      right: 0,
      child: PriceSummaryPanel(
        summaryRows: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                '$totalItems ${totalItems == 1 ? 'item' : 'items'}',
                style: Theme.of(context).textTheme.titleMedium,
              ),
              if (finalPrice > 0)
                Text(
                  '₹${finalPrice.toStringAsFixed(2)}',
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.bold,
                      ),
                ),
            ],
          ),
        ],
        primaryAction: ElevatedButton(
          onPressed: () {
            AppLogger.log('🛒 MENU: Navigate to cart');
            context.go('/r/${widget.restaurantId}/t/${widget.tableId}/cart');
          },
          child: const Text('View Cart'),
        ),
      ),
    );
  }

  /// Build rich header widget with restaurant name, table info, and OTP badge
  /// Build rich header widget with restaurant name, table info, and OTP badge
  Widget _buildRichHeader(BuildContext context, TableContextData tableContext) {
    
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        // Row 1: Restaurant name + OTP badge
        Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Flexible(
              child: Text(
                tableContext.restaurantName,
                style: AppTypography.uiSerif.copyWith(
                  fontWeight: FontWeight.bold,
                  fontSize: 18,
                  color: AppColors.primary,
                ),
                overflow: TextOverflow.ellipsis,
              ),
            ),
            if (tableContext.showOtp && tableContext.otp != null) ...[
              const SizedBox(width: AppSpacing.sm),
              OtpBadge(otp: tableContext.otp!),
            ],
          ],
        ),
        // Row 2: Table info
        if (tableContext.tableNumber != null)
          Text(
            'TABLE ${tableContext.tableNumber}',
            style: AppTypography.labelSmall.copyWith(
              color: AppColors.inkLight,
              letterSpacing: 1.0,
            ),
          ),
      ],
    );
  }

  Map<String, int> _getItemQuantities(MenuState menuState, List<MenuItem> items) {
    return Map.fromEntries(
      items.map(
        (item) => MapEntry(item.id, menuState.getItemQuantity(item.id)),
      ),
    );
  }

  /// Collect all items for a category (deduped by item id)
  /// If category has subcategories, aggregates from all subcategory IDs
  /// Otherwise falls back to category ID for legacy restaurants
  List<MenuItem> _getAllItemsForCategory(
    Category category,
    Map<String, List<MenuItem>> menuItems,
  ) {
    if (category.subcategories.isNotEmpty) {
      final itemMap = <String, MenuItem>{};
      for (final subcat in category.subcategories) {
        final subcatItems = menuItems[subcat.id] ?? [];
        for (final item in subcatItems) {
          itemMap[item.id] = item;
        }
      }
      return itemMap.values.toList();
    } else {
      return menuItems[category.id] ?? [];
    }
  }
}

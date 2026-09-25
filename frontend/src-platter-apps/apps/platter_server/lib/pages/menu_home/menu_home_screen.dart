import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:platter_core/platter_core.dart';

import '../../widgets/server_app_bar_configuration.dart';
import 'repository/menu_api_service.dart';
import 'menu_provider.dart';
import '../../widgets/menu_item_card.dart';
import '../../widgets/state_views.dart';

class MenuHomeScreen extends StatefulWidget {
  final String restaurantId;
  final String sessionId;
  final bool isActiveTab;
  final ValueChanged<ServerAppBarConfiguration>? onAppBarConfigChanged;

  const MenuHomeScreen({
    super.key,
    required this.restaurantId,
    required this.sessionId,
    this.isActiveTab = false,
    this.onAppBarConfigChanged,
  });

  @override
  State<MenuHomeScreen> createState() => _MenuHomeScreenState();
}

class _MenuHomeScreenState extends State<MenuHomeScreen> {
  late final ScrollController _scrollController;
  late final MenuProvider _menuProvider;
  Timer? _autoRefreshTimer;

  static const _autoRefreshInterval = kDebugMode
      ? Duration(seconds: 10)
      : Duration(seconds: 60);

  @override
  void initState() {
    super.initState();
    _scrollController = ScrollController();
    _menuProvider = MenuProvider(apiService: MenuApiService());

    // Listen for state changes in the provider
    _menuProvider.addListener(_handleProviderUpdate);

    // Fetch menu when screen is first loaded
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _fetchMenu();
      _updateAppBarConfig();
    });

    if (widget.isActiveTab) _startPolling();
  }

  @override
  void didUpdateWidget(covariant MenuHomeScreen oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.isActiveTab != oldWidget.isActiveTab) {
      if (widget.isActiveTab) {
        _startPolling();
        _refreshMenu();
      } else {
        _stopPolling();
      }
    }
  }

  @override
  void dispose() {
    _autoRefreshTimer?.cancel();
    _menuProvider.removeListener(_handleProviderUpdate);
    _menuProvider.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  void _startPolling() {
    _autoRefreshTimer?.cancel();
    _autoRefreshTimer = Timer.periodic(_autoRefreshInterval, (_) {
      _pollMenu();
    });
  }

  void _stopPolling() {
    _autoRefreshTimer?.cancel();
    _autoRefreshTimer = null;
  }

  /// Silent poll. Uses the refresh path: fetchRestaurantMenu() flips state
  /// to loading with isRefreshing=false, which replaces the list with a
  /// full-screen spinner every tick. On failure the list stays on screen
  /// with the error banner, so no snackbar is needed.
  Future<void> _pollMenu() => _refreshMenu();

  void _handleProviderUpdate() {
    // Force rebuild when provider state changes
    setState(() {});
  }

  void _updateAppBarConfig() {
    widget.onAppBarConfigChanged?.call(
      ServerAppBarConfiguration(
        additionalActions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _refreshMenu,
            tooltip: 'Refresh Menu',
          ),
        ],
      ),
    );
  }

  Future<void> _fetchMenu() async {
    await _menuProvider.fetchRestaurantMenu(
      restaurantId: widget.restaurantId,
      sessionId: widget.sessionId,
    );
  }

  Future<void> _refreshMenu() async {
    await _menuProvider.refreshMenu(
      restaurantId: widget.restaurantId,
      sessionId: widget.sessionId,
    );
  }

  @override
  Widget build(BuildContext context) {
    // No Scaffold - shell provides it
    return AnimatedBuilder(
      animation: _menuProvider,
      builder: (context, child) {
        return _buildContent(_menuProvider);
      },
    );
  }

  Widget _buildContent(MenuProvider provider) {
    // Handle different states
    switch (provider.state) {
      case DataState.initial:
      case DataState.loading:
        if (!provider.isRefreshing) {
          return const Center(child: CircularProgressIndicator());
        }
        // Fall through to show content with refresh indicator
        return _buildMenuList(provider, isRefreshing: true);

      case DataState.error:
        if (provider.hasMenu) {
          // Show error but still display menu
          return _buildMenuList(provider, hasError: true);
        }
        return _buildErrorState(provider.errorMessage);

      case DataState.loaded:
        if (!provider.hasMenu) {
          return _buildEmptyState();
        }
        return _buildMenuList(provider);
    }
  }

  Widget _buildMenuList(MenuProvider provider,
      {bool isRefreshing = false, bool hasError = false}) {
    return RefreshIndicator(
      onRefresh: _refreshMenu,
      child: Column(
        children: [
          if (hasError)
            Container(
              padding: const EdgeInsets.all(8.0),
              color: Colors.red.shade100,
              width: double.infinity,
              child: Text(
                'Error: ${provider.errorMessage ?? "Unknown error"}',
                style: const TextStyle(color: Colors.red),
              ),
            ),
          Expanded(
            child: ListView.builder(
              controller: _scrollController,
              physics: const AlwaysScrollableScrollPhysics(),
              itemCount: (provider.menu?.categories.length ?? 0) + 1,
              itemBuilder: (context, index) {
                if (index == 0) return _buildAddonsSection(provider.addons);
                return _buildCategorySection(provider.menu!.categories[index - 1]);
              },
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildCategorySection(MenuCategory category) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
          child: Text(
            category.name,
            style: const TextStyle(
              fontSize: 20,
              fontWeight: FontWeight.bold,
            ),
          ),
        ),
        if (category.description.isNotEmpty)
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Text(
              category.description,
              style: const TextStyle(
                fontSize: 14,
                color: Colors.grey,
              ),
            ),
          ),
        const SizedBox(height: 8),
        ...categoryDishes(_menuProvider.menu, category)
            .map((item) => _buildMenuItem(item)),
        const Divider(thickness: 1),
      ],
    );
  }

  // D6: 20:00 the kitchen runs out of raita and tells the waiter. One switch here takes Extra Raita off every
  // biryani on the guest menu (the shared add-on record), where before nobody but a developer could.
  Widget _buildAddonsSection(List<Addon> addons) {
    if (addons.isEmpty) return const SizedBox.shrink();
    final off = addons.where((a) => !a.isInStock).length;
    return ExpansionTile(
      title: Text('Add-ons (${addons.length})',
          style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
      subtitle: Text(off == 0 ? 'All in stock' : '$off out of stock'),
      children: [
        for (final addon in addons)
          ListTile(
            title: Text(addon.meta.name),
            subtitle: Text('₹${addon.priceInfo.basePrice} · every dish that offers it'),
            trailing: Semantics(
              identifier: 'stock-addon-${addon.id}',
              child: Switch(
                value: addon.isInStock,
                onChanged: (val) => _confirmAddonStock(addon, val),
              ),
            ),
          ),
      ],
    );
  }

  Future<void> _confirmAddonStock(Addon addon, bool isAvailable) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(isAvailable
            ? 'Mark ${addon.meta.name} as Available?'
            : 'Mark ${addon.meta.name} as Unavailable?'),
        content: Text(isAvailable
            ? 'Guests can add it again on every dish that offers it.'
            : 'It comes off every dish that offers it.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(false),
            child: const Text('Cancel'),
          ),
          Semantics(
            identifier: 'stock-addon-confirm',
            child: ElevatedButton(
              onPressed: () => Navigator.of(ctx).pop(true),
              child: const Text('Confirm'),
            ),
          ),
        ],
      ),
    );
    if (confirmed != true) return;
    final ok = await _menuProvider.updateAddonAvailability(
      restaurantId: widget.restaurantId,
      sessionId: widget.sessionId,
      addonId: addon.id,
      isAvailable: isAvailable,
    );
    if (!ok && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Failed to update add-on availability'),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  Widget _buildMenuItem(MenuItem item) {
    return MenuItemCard(
      item: item,
      onAvailabilityChanged: (val) async {
        final shouldUpdate = await showDialog<bool>(
          context: context,
          builder: (ctx) => AlertDialog(
            title: Text(
              val ? 'Mark item as Available?' : 'Mark item as Unavailable?',
            ),
            content: Text(val
                ? 'This item will be visible to customers.'
                : 'This item will be hidden from customers.'),
            actions: [
              TextButton(
                onPressed: () => Navigator.of(ctx).pop(false),
                child: const Text('Cancel'),
              ),
              ElevatedButton(
                onPressed: () => Navigator.of(ctx).pop(true),
                child: const Text('Confirm'),
              ),
            ],
          ),
        );
        if (shouldUpdate == true) {
          await _updateItemAvailability(item, val);
        }
      },
    );
  }

  Future<void> _updateItemAvailability(MenuItem item, bool isAvailable) async {
    final success = await _menuProvider.updateMenuItemAvailability(
      restaurantId: widget.restaurantId,
      sessionId: widget.sessionId,
      menuItemId: item.id,
      isAvailable: isAvailable,
    );

    if (!success) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Failed to update item availability'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  Widget _buildEmptyState() {
    return EmptyStateWidget(
      icon: Icons.restaurant_menu,
      title: 'No menu items available',
      subtitle: 'Menu items will appear here once added',
      onRefresh: _refreshMenu,
    );
  }

  Widget _buildErrorState(String? errorMessage) {
    return ErrorStateWidget(
      message: errorMessage ?? 'Unknown error occurred',
      onRetry: _fetchMenu,
    );
  }
}

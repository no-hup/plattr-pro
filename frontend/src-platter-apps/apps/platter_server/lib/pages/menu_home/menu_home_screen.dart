import 'package:flutter/material.dart';

import 'models/menu_item.dart';
import 'models/menu_category.dart';
import 'repository/menu_api_service.dart';
import 'menu_provider.dart';

class MenuHomeScreen extends StatefulWidget {
  final String restaurantId;
  final String sessionId;
  
  const MenuHomeScreen({
    Key? key,
    required this.restaurantId,
    required this.sessionId,
  }) : super(key: key);

  @override
  State<MenuHomeScreen> createState() => _MenuHomeScreenState();
}

class _MenuHomeScreenState extends State<MenuHomeScreen> {
  late final ScrollController _scrollController;
  late final MenuProvider _menuProvider;
  
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
    });
  }
  
  @override
  void dispose() {
    _menuProvider.removeListener(_handleProviderUpdate);
    _scrollController.dispose();
    super.dispose();
  }
  
  void _handleProviderUpdate() {
    // Force rebuild when provider state changes
    setState(() {});
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
    return Scaffold(
      appBar: AppBar(
        title: const Text('Restaurant Menu'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _refreshMenu,
          ),
        ],
      ),
      body: AnimatedBuilder(
        animation: _menuProvider,
        builder: (context, child) {
          return _buildContent(_menuProvider);
        },
      ),
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
  
  Widget _buildMenuList(MenuProvider provider, {bool isRefreshing = false, bool hasError = false}) {
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
              itemCount: provider.menu?.categories.length ?? 0,
              itemBuilder: (context, index) {
                return _buildCategorySection(provider.menu!.categories[index]);
              },
            ),
          ),
        ],
      ),
    );
  }
  
  List<MenuItem> _getMenuItemsForCategory(MenuCategory category) {
    final menu = _menuProvider.menu;
    if (menu == null) return [];
    return menu.menuItems[category.id] ?? [];
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
        ..._getMenuItemsForCategory(category).map((item) => _buildMenuItem(item)).toList(),
        const Divider(thickness: 1),
      ],
    );
  }
  
  Widget _buildMenuItem(MenuItem item) {
    return ListTile(
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      leading: SizedBox(
        width: 56,
        height: 56,
        child: ClipRRect(
          borderRadius: BorderRadius.circular(8),
          child: item.meta.image.isNotEmpty
              ? Image.network(
                  item.meta.image,
                  fit: BoxFit.cover,
                  errorBuilder: (context, error, stackTrace) {
                    return Container(
                      color: Colors.grey.shade200,
                      child: const Icon(Icons.fastfood, color: Colors.grey),
                    );
                  },
                )
              : Container(
                  color: Colors.grey.shade200,
                  child: const Icon(Icons.fastfood, color: Colors.grey),
                ),
        ),
      ),
      title: Text(
        item.meta.name,
        style: TextStyle(
          decoration: !item.isAvailable ? TextDecoration.lineThrough : null,
          color: !item.isAvailable ? Colors.grey : Colors.black,
        ),
      ),

      trailing: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(
            '₹${item.priceInfo.finalPrice.toStringAsFixed(2)}',
            style: const TextStyle(
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(width: 16),
          Switch(
            value: item.isAvailable,
            onChanged: (value) async {
              final shouldUpdate = await showDialog<bool>(
                context: context,
                builder: (ctx) => AlertDialog(
                  title: Text(
                    value ? 'Mark item as Available?' : 'Mark item as Unavailable?',
                  ),
                  content: Text(
                    value
                        ? 'This item will be visible to customers.'
                        : 'This item will be hidden from customers.'
                  ),
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
                await _updateItemAvailability(item, value);
              }
            },
          ),
        ],
      ),
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
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Icon(Icons.restaurant_menu, size: 64, color: Colors.grey),
          const SizedBox(height: 16),
          const Text(
            'No menu items available',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 8),
          const Text(
            'Menu items will appear here once added',
            style: TextStyle(color: Colors.grey),
          ),
          const SizedBox(height: 24),
          ElevatedButton(
            onPressed: _refreshMenu,
            child: const Text('Refresh'),
          ),
        ],
      ),
    );
  }
  
  Widget _buildErrorState(String? errorMessage) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Icon(Icons.error_outline, size: 64, color: Colors.red),
          const SizedBox(height: 16),
          const Text(
            'Failed to load menu',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 8),
          Text(
            errorMessage ?? 'Unknown error occurred',
            textAlign: TextAlign.center,
            style: const TextStyle(color: Colors.red),
          ),
          const SizedBox(height: 24),
          ElevatedButton(
            onPressed: _fetchMenu,
            child: const Text('Try Again'),
          ),
        ],
      ),
    );
  }
}

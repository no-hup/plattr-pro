import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:platter_core/platter_core.dart';

import 'print/print_toggle.dart';
import 'core/kitchen_repository.dart';
import 'state/kitchen_live_provider.dart';
import 'widgets/kitchen_app_bar_widget.dart';
import 'widgets/kitchen_app_bar_configuration.dart';
import 'pages/live/live_orders_screen.dart';
import 'pages/history/history_screen.dart';
import 'constants/kitchen_constants.dart';
import 'session/session_manager.dart';

/// Shell widget that provides the shared app bar for all home-level screens.
///
/// This is the main navigation container after login, hosting:
/// - Shared [KitchenAppBarWidget] with profile, restaurant/kitchen name, category filter
/// - Tab content via [IndexedStack] (Live and History)
/// - [BottomNavigationBar] for tab switching
class MainNavigation extends StatefulWidget {
  final String restaurantId;
  final String sessionId;
  final String restaurantName;
  final String kitchenName;
  final String? staffProfileImageUrl;

  /// Repository is injected so tests and alternate entry points can supply
  /// a fake implementation. Defaults to a real [KitchenRepository] bound to
  /// the shared `DioClient` singleton.
  final KitchenRepository? repository;

  /// Initial categories - in production, these should come from backend
  /// TODO: Fetch dynamic categories from backend (e.g., login config or active-carts response)
  /// TODO: Add support for subcategories inside kitchen category
  /// FLAG: Discussion point - "Should there be additional categories for certain restaurant types?"
  final List<String> initialCategories;

  const MainNavigation({
    super.key,
    required this.restaurantId,
    required this.sessionId,
    required this.restaurantName,
    required this.kitchenName,
    this.staffProfileImageUrl,
    this.repository,
    this.initialCategories = KitchenCategory.defaultCategories,
  });

  @override
  State<MainNavigation> createState() => _MainNavigationState();
}

class _MainNavigationState extends State<MainNavigation> {
  /// Current tab index - starts at 0 (Live tab) as per acceptance criteria
  int _selectedIndex = 0;

  /// Currently selected category filter
  /// This persists when switching tabs as per requirements
  String? _selectedCategory;

  /// Categories for the filter dropdown
  /// TODO: Should be fetched dynamically from backend, not hardcoded
  late List<String> _categories;

  /// Current app bar configuration (can be updated by child screens)
  KitchenAppBarConfiguration _currentAppBarConfig =
      const KitchenAppBarConfiguration();

  /// KT-5: "This tablet prints" lives in the app bar on every tab, whatever a child screen adds beside it.
  late final Widget _printToggle = PrintToggle(
      restaurantId: widget.restaurantId, sessionId: widget.sessionId);
  KitchenAppBarConfiguration _withPrintToggle(KitchenAppBarConfiguration c) =>
      c.copyWith(additionalActions: [_printToggle, ...?c.additionalActions]);

  /// Single repository instance owned by this navigation shell. Reused by
  /// both the live provider and the history screen so we never double-construct.
  late final KitchenRepository _repository;

  @override
  void initState() {
    super.initState();
    _categories = widget.initialCategories;
    _repository = widget.repository ?? KitchenRepository();
    _currentAppBarConfig = _withPrintToggle(_currentAppBarConfig);
  }

  /// Called by child screens to update the app bar configuration
  void updateAppBarConfiguration(KitchenAppBarConfiguration config) {
    if (mounted) {
      setState(() {
        _currentAppBarConfig = _withPrintToggle(config);
      });
    }
  }

  /// Shows the logout confirmation dialog
  Future<void> _showLogoutConfirmation() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Logout'),
        content: const Text('Are you sure you want to logout?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text('No'),
          ),
          TextButton(
            onPressed: () => Navigator.of(context).pop(true),
            style: TextButton.styleFrom(
              foregroundColor: Theme.of(context).colorScheme.error,
            ),
            child: const Text('Yes'),
          ),
        ],
      ),
    );

    if (confirmed == true && mounted) {
      await _performLogout();
    }
  }

  /// Performs the actual logout and navigation
  Future<void> _performLogout() async {
    await SessionManager.logout(context);
  }

  /// Handles category filter change
  void _onCategoryChanged(String? category) {
    if (category != null && !_categories.contains(category)) {
      AppLogger.warning(
        'Category selection mismatch. Received "$category" not in categories: $_categories',
      );
      // TODO(tech-debt): remove once categories are sourced from backend with strong typing.
      category = null;
    }
    setState(() {
      _selectedCategory = category;
    });
    AppLogger.info('Category filter changed to: ${category ?? "All"}');
  }

  /// Handles tab selection
  void _onTabSelected(int index) {
    setState(() {
      _selectedIndex = index;
    });
    AppLogger.info('Tab switched to: ${index == 0 ? "Live" : "History"}');
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: KitchenAppBarWidget(
        restaurantName: widget.restaurantName,
        kitchenName: widget.kitchenName,
        staffProfileImageUrl: widget.staffProfileImageUrl,
        selectedCategory: _selectedCategory,
        categories: _categories,
        onCategoryChanged: _onCategoryChanged,
        configuration: _currentAppBarConfig.copyWith(
          onLogoutTap: _showLogoutConfirmation,
        ),
      ),
      // Provide KitchenLiveProvider at this level so it persists when
      // switching tabs. Repository is injected (defaulted in initState).
      body: ChangeNotifierProvider(
        create: (_) => KitchenLiveProvider(
          repository: _repository,
          restaurantId: widget.restaurantId,
          sessionId: widget.sessionId,
        )..startPolling(),
        child: IndexedStack(
          index: _selectedIndex,
          children: [
            LiveOrdersScreen(
              restaurantId: widget.restaurantId,
              sessionId: widget.sessionId,
              repository: _repository,
              selectedCategory: _selectedCategory,
            ),
            HistoryScreen(
              restaurantId: widget.restaurantId,
              sessionId: widget.sessionId,
              selectedCategory: _selectedCategory,
            ),
          ],
        ),
      ),
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _selectedIndex,
        onTap: _onTabSelected,
        type: BottomNavigationBarType.fixed,
        items: const [
          BottomNavigationBarItem(
            icon: Icon(Icons.pending_actions_outlined),
            activeIcon: Icon(Icons.pending_actions),
            label: 'Live',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.history_outlined),
            activeIcon: Icon(Icons.history),
            label: 'History',
          ),
        ],
      ),
    );
  }
}

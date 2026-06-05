import 'package:flutter/material.dart';
import 'dart:async';

import 'core/network_connectivity_service.dart';
import 'widgets/server_app_bar_widget.dart';
import 'widgets/server_app_bar_configuration.dart';
import 'widgets/no_internet_banner_widget.dart';
import 'pages/orders_home/orders_home_screen.dart';
import 'pages/tables_home/tables_home_screen.dart';
import 'pages/menu_home/menu_home_screen.dart';

/// Shell widget that provides the shared app bar and connectivity banner
/// for all home-level (L0) screens.
///
/// This is the main navigation container after login, hosting:
/// - Shared [ServerAppBarWidget] with profile, restaurant name, notifications
/// - [NoInternetBannerWidget] for offline status
/// - Tab content via [IndexedStack]
/// - [BottomNavigationBar] for tab switching
class MainNavigation extends StatefulWidget {
  final String restaurantId;
  final String sessionId;
  final String restaurantName;
  final String serverName;
  final String? serverProfileImageUrl;

  const MainNavigation({
    super.key,
    required this.restaurantId,
    required this.sessionId,
    required this.restaurantName,
    required this.serverName,
    this.serverProfileImageUrl,
  });

  @override
  State<MainNavigation> createState() => _MainNavigationState();
}

class _MainNavigationState extends State<MainNavigation> {
  int _selectedIndex = 0;

  // Connectivity state
  StreamSubscription<bool>? _connectivitySubscription;
  bool _isOnline = true;

  // Current app bar configuration (updated by child screens)
  ServerAppBarConfiguration _currentAppBarConfig =
      const ServerAppBarConfiguration();

  @override
  void initState() {
    super.initState();
    _subscribeToConnectivity();
  }

  @override
  void dispose() {
    _connectivitySubscription?.cancel();
    super.dispose();
  }

  void _subscribeToConnectivity() {
    final service = NetworkConnectivityService();
    _isOnline = service.isOnline;

    _connectivitySubscription =
        service.onConnectivityChanged.listen((isOnline) {
      if (mounted && _isOnline != isOnline) {
        setState(() {
          _isOnline = isOnline;
        });
      }
    });
  }

  /// Called by child screens to update the app bar configuration
  void updateAppBarConfiguration(ServerAppBarConfiguration config) {
    if (mounted) {
      setState(() {
        _currentAppBarConfig = config;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: ServerAppBarWidget(
        restaurantName: widget.restaurantName,
        serverName: widget.serverName,
        serverProfileImageUrl: widget.serverProfileImageUrl,
        configuration: _currentAppBarConfig,
      ),
      body: Column(
        children: [
          // Connectivity banner (animates in/out)
          NoInternetBannerWidget(isVisible: !_isOnline),

          // Tab content
          Expanded(
            child: IndexedStack(
              index: _selectedIndex,
              children: [
                OrdersHomeScreen(
                  restaurantId: widget.restaurantId,
                  sessionId: widget.sessionId,
                  isActiveTab: _selectedIndex == 0,
                  onAppBarConfigChanged: updateAppBarConfiguration,
                ),
                TablesHomeScreen(
                  restaurantId: widget.restaurantId,
                  sessionId: widget.sessionId,
                  isActiveTab: _selectedIndex == 1,
                  onAppBarConfigChanged: updateAppBarConfiguration,
                ),
                MenuHomeScreen(
                  restaurantId: widget.restaurantId,
                  sessionId: widget.sessionId,
                  isActiveTab: _selectedIndex == 2,
                  onAppBarConfigChanged: updateAppBarConfiguration,
                ),
              ],
            ),
          ),
        ],
      ),
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _selectedIndex,
        onTap: _onItemTapped,
        items: const [
          BottomNavigationBarItem(
            icon: Icon(Icons.receipt_outlined),
            activeIcon: Icon(Icons.receipt),
            label: 'Orders',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.table_bar_outlined),
            activeIcon: Icon(Icons.table_bar),
            label: 'Tables',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.restaurant_menu_outlined),
            activeIcon: Icon(Icons.restaurant_menu),
            label: 'Menu',
          ),
        ],
      ),
    );
  }

  void _onItemTapped(int index) {
    setState(() {
      _selectedIndex = index;
    });
  }
}

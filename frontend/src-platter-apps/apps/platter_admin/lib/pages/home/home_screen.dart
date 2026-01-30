import 'package:flutter/material.dart';
import 'package:platter_core/platter_core.dart';
import '../auth/login_screen.dart';
import '../menu/menu_catalog_screen.dart';
import '../orders/orders_screen.dart';
import '../operations/operations_screen.dart';
import '../staff/staff_screen.dart';
import '../settings/settings_screen.dart';

class HomeScreen extends StatefulWidget {
  final String restaurantId;
  final String sessionId;
  final String restaurantName;
  final String staffName;

  const HomeScreen({
    super.key,
    required this.restaurantId,
    required this.sessionId,
    required this.restaurantName,
    required this.staffName,
  });

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  int _selectedIndex = 0;

  final List<String> _tabTitles = const [
    'Menu',
    'Orders',
    'Operations',
    'Staff',
    'Settings',
  ];

  Future<void> _logout(BuildContext context) async {
    final navigator = Navigator.of(context);
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
            child: const Text('Yes'),
          ),
        ],
      ),
    );

    if (confirmed == true) {
      await SessionStorage().clearSession();

      if (context.mounted) {
        navigator.pushAndRemoveUntil(
          MaterialPageRoute(builder: (context) => const LoginScreen()),
          (route) => false,
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final tabs = [
      MenuCatalogScreen(
        restaurantId: widget.restaurantId,
        sessionId: widget.sessionId,
      ),
      const OrdersScreen(),
      const OperationsScreen(),
      const StaffScreen(),
      const SettingsScreen(),
    ];

    return Scaffold(
      appBar: AppBar(
        title: Text('${widget.restaurantName} • ${_tabTitles[_selectedIndex]}'),
        actions: [
          IconButton(
            icon: const Icon(Icons.logout),
            onPressed: () => _logout(context),
            tooltip: 'Logout',
          ),
        ],
      ),
      body: IndexedStack(
        index: _selectedIndex,
        children: tabs,
      ),
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _selectedIndex,
        type: BottomNavigationBarType.fixed,
        onTap: (index) => setState(() => _selectedIndex = index),
        items: const [
          BottomNavigationBarItem(
            icon: Icon(Icons.menu_book),
            label: 'Menu',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.receipt_long),
            label: 'Orders',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.table_bar),
            label: 'Operations',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.people_alt),
            label: 'Staff',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.settings),
            label: 'Settings',
          ),
        ],
      ),
    );
  }
}

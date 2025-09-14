import 'package:flutter/material.dart';
import 'pages/orders_home/orders_home_screen.dart';
import 'pages/tables_home/tables_home_screen.dart';
import 'pages/menu_home/menu_home_screen.dart';

class MainNavigation extends StatefulWidget {
  final String restaurantId;
  final String sessionId;

  const MainNavigation({
    Key? key,
    required this.restaurantId,
    required this.sessionId,
  }) : super(key: key);

  @override
  State<MainNavigation> createState() => _MainNavigationState();
}

class _MainNavigationState extends State<MainNavigation> {
  int _selectedIndex = 0;
  
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: IndexedStack(
        index: _selectedIndex,
        children: [
          OrdersHomeScreen(
            restaurantId: widget.restaurantId,
            sessionId: widget.sessionId,
          ),
          TablesHomeScreen(
            restaurantId: widget.restaurantId,
            sessionId: widget.sessionId,
          ),
          MenuHomeScreen(
            restaurantId: widget.restaurantId,
            sessionId: widget.sessionId,
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
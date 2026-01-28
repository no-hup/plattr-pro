import 'package:flutter/material.dart';
import 'package:platter_core/platter_core.dart';
import '../auth/login_screen.dart';

class HomeScreen extends StatelessWidget {
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
    return Scaffold(
      appBar: AppBar(
        title: Text(restaurantName),
        actions: [
          IconButton(
            icon: const Icon(Icons.logout),
            onPressed: () => _logout(context),
            tooltip: 'Logout',
          ),
        ],
      ),
      drawer: Drawer(
        child: ListView(
          padding: EdgeInsets.zero,
          children: [
             UserAccountsDrawerHeader(
              accountName: Text(staffName),
              accountEmail: const Text('Admin'), 
              currentAccountPicture: const CircleAvatar(
                child: Icon(Icons.admin_panel_settings),
              ),
            ),
            ListTile(
              leading: const Icon(Icons.dashboard),
              title: const Text('Dashboard'),
              onTap: () {},
            ),
             ListTile(
              leading: const Icon(Icons.settings),
              title: const Text('Settings'),
              onTap: () {},
            ),
          ],
        ),
      ),
      body: const Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.construction, size: 64, color: Colors.grey),
            SizedBox(height: 16),
            Text(
              'Admin Dashboard Coming Soon',
              style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
            ),
            SizedBox(height: 8),
            Text('This feature is under development.'),
          ],
        ),
      ),
    );
  }
}

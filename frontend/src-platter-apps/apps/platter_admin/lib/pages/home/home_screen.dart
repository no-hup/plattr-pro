import 'package:flutter/material.dart';
import 'package:platter_core/platter_core.dart';

/// Placeholder home screen after admin login.
/// TODO: Replace with admin dashboard.
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

  /// Safe display of session ID with bounds checking
  String get _displaySessionId {
    if (sessionId.isEmpty) return '(empty)';
    if (sessionId.length <= 8) return sessionId;
    return '${sessionId.substring(0, 8)}...';
  }

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
      // Clear stored session
      await SessionStorage().clearSession();
      navigator.pushNamedAndRemoveUntil('/', (route) => false);
    }
  }


  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              restaurantName,
              style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            Text(
              'Admin Dashboard',
              style: TextStyle(
                fontSize: 14,
                color: Theme.of(context).colorScheme.onPrimary.withAlpha((0.8 * 255).round()),
              ),
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.logout),
            onPressed: () => _logout(context),
            tooltip: 'Logout',
          ),
        ],
      ),
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(
                Icons.admin_panel_settings,
                size: 100,
                color: Theme.of(context).colorScheme.primary,
              ),
              const SizedBox(height: 24),
              Text(
                'Welcome, $staffName!',
                style: Theme.of(context).textTheme.headlineMedium,
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 16),
              Text(
                'You are logged into $restaurantName Admin Portal',
                style: Theme.of(context).textTheme.bodyLarge,
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 32),
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Theme.of(context).colorScheme.primaryContainer,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Column(
                  children: [
                    Text(
                      'Admin Features Coming Soon',
                      style: Theme.of(context).textTheme.titleMedium,
                    ),
                    const SizedBox(height: 8),
                    const Text(
                      'User management, analytics, and restaurant configuration will be implemented next.',
                      textAlign: TextAlign.center,
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 32),
              // Debug info
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Session Info',
                        style: TextStyle(fontWeight: FontWeight.bold),
                      ),
                      const SizedBox(height: 8),
                      Text('Restaurant ID: $restaurantId'),
                      Text('Session ID: $_displaySessionId'),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

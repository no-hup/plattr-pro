import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:platter_core/platter_core.dart';
import 'settings_api_service.dart' as admin_settings;
import 'settings_provider.dart';

class SettingsScreen extends StatelessWidget {
  final String restaurantId;
  final String sessionId;

  const SettingsScreen({
    super.key,
    required this.restaurantId,
    required this.sessionId,
  });

  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider(
      create: (_) => SettingsProvider(
        apiService: admin_settings.AdminSettingsApiService(),
        restaurantId: restaurantId,
        sessionId: sessionId,
      )..loadSettings(),
      child: const _SettingsView(),
    );
  }
}

class _SettingsView extends StatelessWidget {
  const _SettingsView();

  @override
  Widget build(BuildContext context) {
    return Consumer<SettingsProvider>(
      builder: (context, provider, _) {
        if (provider.state == DataState.loading && provider.settings == null) {
          return const Center(child: CircularProgressIndicator());
        }

        if (provider.state == DataState.error && provider.settings == null) {
          return Center(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(Icons.error_outline, size: 48, color: Colors.red),
                const SizedBox(height: 16),
                Text(provider.errorMessage ?? 'Failed to load settings'),
                const SizedBox(height: 12),
                ElevatedButton(
                  onPressed: provider.loadSettings,
                  child: const Text('Retry'),
                ),
              ],
            ),
          );
        }

        return Stack(
          children: [
            SingleChildScrollView(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _buildHeader(context, provider),
                  const SizedBox(height: 24),
                  _buildFeatureFlagsSection(context, provider),
                  const SizedBox(height: 24),
                  _buildThemeSection(context, provider),
                  const SizedBox(height: 24),
                  _buildGeneralSection(context, provider),
                ],
              ),
            ),
            if (provider.isSaving)
              Container(
                color: Colors.black.withOpacity(0.3),
                child: const Center(child: CircularProgressIndicator()),
              ),
          ],
        );
      },
    );
  }

  Widget _buildHeader(BuildContext context, SettingsProvider provider) {
    return Row(
      children: [
        const Expanded(
          child: Text(
            'Settings',
            style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
          ),
        ),
        IconButton(
          tooltip: 'Refresh',
          onPressed: provider.loadSettings,
          icon: const Icon(Icons.refresh),
        ),
      ],
    );
  }

  Widget _buildFeatureFlagsSection(
      BuildContext context, SettingsProvider provider) {
    final settings = provider.settings;
    final featureFlags = settings?.featureFlags ?? {};

    return _SettingsSection(
      title: 'Feature Flags',
      icon: Icons.toggle_on,
      children: [
        _FeatureFlagTile(
          title: 'Dine-In Mode',
          subtitle: 'Enable in-restaurant dining experience',
          value: featureFlags['dineInEnabled'] ?? true,
          onChanged: (value) =>
              provider.updateSetting('featureFlags.dineInEnabled', value),
        ),
        _FeatureFlagTile(
          title: 'Takeout Mode',
          subtitle: 'Allow customers to order for takeout',
          value: featureFlags['takeoutEnabled'] ?? false,
          onChanged: (value) =>
              provider.updateSetting('featureFlags.takeoutEnabled', value),
        ),
        _FeatureFlagTile(
          title: 'Delivery Mode',
          subtitle: 'Enable delivery orders',
          value: featureFlags['deliveryEnabled'] ?? false,
          onChanged: (value) =>
              provider.updateSetting('featureFlags.deliveryEnabled', value),
        ),
        _FeatureFlagTile(
          title: 'QR Code Ordering',
          subtitle: 'Allow scanning QR to start ordering',
          value: featureFlags['qrOrderingEnabled'] ?? true,
          onChanged: (value) =>
              provider.updateSetting('featureFlags.qrOrderingEnabled', value),
        ),
        _FeatureFlagTile(
          title: 'Online Payments',
          subtitle: 'Accept payments through the app',
          value: featureFlags['onlinePaymentsEnabled'] ?? false,
          onChanged: (value) =>
              provider.updateSetting('featureFlags.onlinePaymentsEnabled', value),
        ),
        _FeatureFlagTile(
          title: 'Kitchen Display',
          subtitle: 'Show orders on kitchen display',
          value: featureFlags['kitchenDisplayEnabled'] ?? true,
          onChanged: (value) =>
              provider.updateSetting('featureFlags.kitchenDisplayEnabled', value),
        ),
      ],
    );
  }

  Widget _buildThemeSection(BuildContext context, SettingsProvider provider) {
    final themeConfig = provider.settings?.theme;

    return _SettingsSection(
      title: 'Theme & Branding',
      icon: Icons.palette,
      children: [
        ListTile(
          title: const Text('Primary Color'),
          subtitle: Text(themeConfig?.primaryColor ?? 'Not set'),
          trailing: Container(
            width: 32,
            height: 32,
            decoration: BoxDecoration(
              color: _parseColor(themeConfig?.primaryColor),
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: Colors.grey),
            ),
          ),
          onTap: () => _showColorPicker(
            context,
            'Primary Color',
            themeConfig?.primaryColor,
            (color) => provider.updateTheme(primaryColor: color),
          ),
        ),
        ListTile(
          title: const Text('Secondary Color'),
          subtitle: Text(themeConfig?.secondaryColor ?? 'Not set'),
          trailing: Container(
            width: 32,
            height: 32,
            decoration: BoxDecoration(
              color: _parseColor(themeConfig?.secondaryColor),
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: Colors.grey),
            ),
          ),
          onTap: () => _showColorPicker(
            context,
            'Secondary Color',
            themeConfig?.secondaryColor,
            (color) => provider.updateTheme(secondaryColor: color),
          ),
        ),
        ListTile(
          title: const Text('Accent Color'),
          subtitle: Text(themeConfig?.accentColor ?? 'Not set'),
          trailing: Container(
            width: 32,
            height: 32,
            decoration: BoxDecoration(
              color: _parseColor(themeConfig?.accentColor),
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: Colors.grey),
            ),
          ),
          onTap: () => _showColorPicker(
            context,
            'Accent Color',
            themeConfig?.accentColor,
            (color) => provider.updateTheme(accentColor: color),
          ),
        ),
        ListTile(
          title: const Text('Font Family'),
          subtitle: Text(themeConfig?.fontFamily ?? 'Default'),
          trailing: const Icon(Icons.edit),
          onTap: () => _showFontPicker(
            context,
            themeConfig?.fontFamily,
            (font) => provider.updateTheme(fontFamily: font),
          ),
        ),
      ],
    );
  }

  Widget _buildGeneralSection(
      BuildContext context, SettingsProvider provider) {
    return _SettingsSection(
      title: 'General',
      icon: Icons.settings,
      children: [
        ListTile(
          leading: const Icon(Icons.store),
          title: const Text('Restaurant ID'),
          subtitle: Text(provider.restaurantId),
          trailing: const Icon(Icons.copy),
          onTap: () {
            // Copy to clipboard
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(content: Text('Restaurant ID copied')),
            );
          },
        ),
        ListTile(
          leading: const Icon(Icons.info_outline),
          title: const Text('App Version'),
          subtitle: const Text('1.0.0'),
        ),
      ],
    );
  }

  Color _parseColor(String? colorHex) {
    if (colorHex == null || colorHex.isEmpty) return Colors.grey;
    try {
      final hex = colorHex.replaceAll('#', '');
      return Color(int.parse('FF$hex', radix: 16));
    } catch (_) {
      return Colors.grey;
    }
  }

  Future<void> _showColorPicker(
    BuildContext context,
    String title,
    String? currentColor,
    Function(String) onSave,
  ) async {
    final colors = [
      '#FF5722', // Deep Orange
      '#E91E63', // Pink
      '#9C27B0', // Purple
      '#673AB7', // Deep Purple
      '#3F51B5', // Indigo
      '#2196F3', // Blue
      '#03A9F4', // Light Blue
      '#00BCD4', // Cyan
      '#009688', // Teal
      '#4CAF50', // Green
      '#8BC34A', // Light Green
      '#CDDC39', // Lime
      '#FFC107', // Amber
      '#FF9800', // Orange
    ];

    final selected = await showDialog<String>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(title),
        content: SizedBox(
          width: 300,
          child: Wrap(
            spacing: 8,
            runSpacing: 8,
            children: colors
                .map((color) => InkWell(
                      onTap: () => Navigator.of(context).pop(color),
                      child: Container(
                        width: 48,
                        height: 48,
                        decoration: BoxDecoration(
                          color: _parseColor(color),
                          borderRadius: BorderRadius.circular(8),
                          border: currentColor == color
                              ? Border.all(color: Colors.black, width: 3)
                              : null,
                        ),
                      ),
                    ))
                .toList(),
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('Cancel'),
          ),
        ],
      ),
    );

    if (selected != null) {
      await onSave(selected);
    }
  }

  Future<void> _showTextEditor(
    BuildContext context,
    String title,
    String currentValue,
    Function(String) onSave,
  ) async {
    final controller = TextEditingController(text: currentValue);
    final result = await showDialog<String>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(title),
        content: TextField(
          controller: controller,
          decoration: InputDecoration(
            labelText: title,
            border: const OutlineInputBorder(),
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () => Navigator.of(context).pop(controller.text),
            child: const Text('Save'),
          ),
        ],
      ),
    );

    if (result != null) {
      await onSave(result);
    }
  }

  Future<void> _showFontPicker(
    BuildContext context,
    String? currentFont,
    Function(String) onSave,
  ) async {
    final fonts = [
      'Roboto',
      'Open Sans',
      'Lato',
      'Montserrat',
      'Poppins',
      'Inter',
      'Nunito',
      'Raleway',
    ];

    final selected = await showDialog<String>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Select Font'),
        content: SizedBox(
          width: 300,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: fonts
                .map((font) => ListTile(
                      title: Text(font),
                      trailing: currentFont == font
                          ? const Icon(Icons.check, color: Colors.green)
                          : null,
                      onTap: () => Navigator.of(context).pop(font),
                    ))
                .toList(),
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('Cancel'),
          ),
        ],
      ),
    );

    if (selected != null) {
      await onSave(selected);
    }
  }
}

class _SettingsSection extends StatelessWidget {
  final String title;
  final IconData icon;
  final List<Widget> children;

  const _SettingsSection({
    required this.title,
    required this.icon,
    required this.children,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                Icon(icon, color: Theme.of(context).colorScheme.primary),
                const SizedBox(width: 12),
                Text(
                  title,
                  style: const TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),
          ),
          const Divider(height: 1),
          ...children.map((child) => child),
        ],
      ),
    );
  }
}

class _FeatureFlagTile extends StatelessWidget {
  final String title;
  final String subtitle;
  final bool value;
  final ValueChanged<bool> onChanged;

  const _FeatureFlagTile({
    required this.title,
    required this.subtitle,
    required this.value,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    return SwitchListTile(
      title: Text(title),
      subtitle: Text(subtitle),
      value: value,
      onChanged: onChanged,
    );
  }
}

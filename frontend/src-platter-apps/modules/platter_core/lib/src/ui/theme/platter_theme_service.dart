import 'package:flutter/material.dart';
import '../../models/settings/restaurant_settings.dart';

class PlatterThemeService {
  static final PlatterThemeService _instance = PlatterThemeService._internal();
  factory PlatterThemeService() => _instance;
  PlatterThemeService._internal();

  ThemeConfig? _config;

  void updateConfig(ThemeConfig config) {
    _config = config;
  }

  ThemeData get themeData {
    if (_config == null) {
      return ThemeData.light(); // Default
    }

    final primary = _parseColor(_config!.primaryColor);
    final secondary = _parseColor(_config!.secondaryColor);
    final surface = _parseColor(_config!.surfaceColor);
    final background = _parseColor(_config!.backgroundColor);
    final error = _parseColor(_config!.errorColor);

    return ThemeData(
      useMaterial3: true,
      colorScheme: ColorScheme.fromSeed(
        seedColor: primary,
        primary: primary,
        secondary: secondary,
        surface: surface,
        background: background,
        error: error,
      ),
      fontFamily: _config!.fontFamily,
      // Add more overrides as needed for a "digitized" feel
    );
  }

  static Color _parseColor(String hex) {
    hex = hex.replaceAll('#', '');
    if (hex.length == 6) {
      hex = 'FF$hex';
    }
    return Color(int.parse(hex, radix: 16));
  }
}

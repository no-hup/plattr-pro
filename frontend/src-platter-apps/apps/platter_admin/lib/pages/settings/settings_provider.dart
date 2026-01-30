import 'package:flutter/foundation.dart';
import 'package:platter_core/platter_core.dart';
import 'settings_api_service.dart';

/// Provider for restaurant settings state
class SettingsProvider extends ChangeNotifier {
  final SettingsApiService _apiService;
  final String restaurantId;
  final String sessionId;

  DataState _state = DataState.initial;
  String? _errorMessage;
  RestaurantSettings? _settings;
  bool _isSaving = false;

  SettingsProvider({
    required SettingsApiService apiService,
    required this.restaurantId,
    required this.sessionId,
  }) : _apiService = apiService;

  DataState get state => _state;
  String? get errorMessage => _errorMessage;
  RestaurantSettings? get settings => _settings;
  bool get isSaving => _isSaving;

  /// Load settings
  Future<void> loadSettings() async {
    _state = DataState.loading;
    _errorMessage = null;
    notifyListeners();

    final response = await _apiService.getSettings(
      restaurantId: restaurantId,
      sessionId: sessionId,
    );

    if (response.isSuccess && response.data != null) {
      _settings = response.data;
      _state = DataState.success;
    } else {
      _errorMessage = response.errorMessage ?? 'Failed to load settings';
      _state = DataState.error;
    }
    notifyListeners();
  }

  /// Update a single setting
  Future<bool> updateSetting(String key, dynamic value) async {
    return updateSettings({key: value});
  }

  /// Update multiple settings
  Future<bool> updateSettings(Map<String, dynamic> updates) async {
    _isSaving = true;
    notifyListeners();

    final response = await _apiService.updateSettings(
      restaurantId: restaurantId,
      sessionId: sessionId,
      settings: updates,
    );

    _isSaving = false;

    if (response.isSuccess) {
      await loadSettings(); // Refresh settings
      return true;
    } else {
      _errorMessage = response.errorMessage ?? 'Failed to update settings';
      notifyListeners();
      return false;
    }
  }

  /// Toggle a boolean feature flag
  Future<bool> toggleFeatureFlag(String key, bool value) async {
    return updateSetting('featureFlags.$key', value);
  }

  /// Update theme configuration
  Future<bool> updateTheme({
    String? primaryColor,
    String? secondaryColor,
    String? logoUrl,
    String? fontFamily,
  }) async {
    final themeUpdates = <String, dynamic>{};
    if (primaryColor != null) themeUpdates['themeConfig.primaryColor'] = primaryColor;
    if (secondaryColor != null) themeUpdates['themeConfig.secondaryColor'] = secondaryColor;
    if (logoUrl != null) themeUpdates['themeConfig.logoUrl'] = logoUrl;
    if (fontFamily != null) themeUpdates['themeConfig.fontFamily'] = fontFamily;

    if (themeUpdates.isEmpty) return true;
    return updateSettings(themeUpdates);
  }
}

import 'package:flutter/foundation.dart';
import 'package:platter_core/platter_core.dart';
import 'settings_api_service.dart' as admin_settings;

/// Provider for restaurant settings state
class SettingsProvider extends ChangeNotifier {
  final admin_settings.AdminSettingsApiService _apiService;
  final String restaurantId;
  final String sessionId;

  DataState _state = DataState.initial;
  String? _errorMessage;
  RestaurantSettings? _settings;
  bool _isSaving = false;

  SettingsProvider({
    required admin_settings.AdminSettingsApiService apiService,
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

    if (response.success && response.data != null) {
      _settings = response.data;
      _state = DataState.loaded;
    } else {
      _errorMessage = response.message ?? 'Failed to load settings';
      _state = DataState.error;
    }
    notifyListeners();
  }

  /// Update a single setting with optimistic update
  Future<bool> updateSetting(String key, dynamic value) async {
    return updateSettings({key: value});
  }

  /// Update multiple settings with optimistic updates
  /// 
  /// This method updates local state immediately (optimistic update)
  /// and only re-fetches from server if the update fails.
  Future<bool> updateSettings(Map<String, dynamic> updates) async {
    if (_settings == null) return false;
    
    // Store previous settings for rollback
    final previousSettings = _settings;
    
    // Apply optimistic update locally
    _settings = _applyOptimisticUpdates(_settings!, updates);
    _isSaving = true;
    notifyListeners();

    final response = await _apiService.updateSettings(
      restaurantId: restaurantId,
      sessionId: sessionId,
      settings: updates,
    );

    _isSaving = false;

    if (response.success) {
      // Update succeeded - keep the optimistic update
      notifyListeners();
      return true;
    } else {
      // Update failed - rollback to previous settings
      _settings = previousSettings;
      _errorMessage = response.message ?? 'Failed to update settings';
      notifyListeners();
      return false;
    }
  }

  /// Apply dot-path updates to settings optimistically
  RestaurantSettings _applyOptimisticUpdates(
    RestaurantSettings current, 
    Map<String, dynamic> updates,
  ) {
    // Build updated feature flags
    final updatedFlags = Map<String, bool>.from(current.featureFlags);
    
    // Build updated theme (copy current values)
    var updatedTheme = current.theme;
    String primaryColor = updatedTheme.primaryColor;
    String secondaryColor = updatedTheme.secondaryColor;
    String accentColor = updatedTheme.accentColor;
    String backgroundColor = updatedTheme.backgroundColor;
    String surfaceColor = updatedTheme.surfaceColor;
    String errorColor = updatedTheme.errorColor;
    String fontFamily = updatedTheme.fontFamily;
    
    for (final entry in updates.entries) {
      final key = entry.key;
      final value = entry.value;
      
      if (key.startsWith('featureFlags.')) {
        final flagKey = key.substring('featureFlags.'.length);
        if (value is bool) {
          updatedFlags[flagKey] = value;
        }
      } else if (key.startsWith('theme.')) {
        final themeKey = key.substring('theme.'.length);
        if (value is String) {
          switch (themeKey) {
            case 'primaryColor':
              primaryColor = value;
              break;
            case 'secondaryColor':
              secondaryColor = value;
              break;
            case 'accentColor':
              accentColor = value;
              break;
            case 'backgroundColor':
              backgroundColor = value;
              break;
            case 'surfaceColor':
              surfaceColor = value;
              break;
            case 'errorColor':
              errorColor = value;
              break;
            case 'fontFamily':
              fontFamily = value;
              break;
          }
        }
      }
    }
    
    return RestaurantSettings(
      featureFlags: updatedFlags,
      theme: ThemeConfig(
        primaryColor: primaryColor,
        secondaryColor: secondaryColor,
        accentColor: accentColor,
        backgroundColor: backgroundColor,
        surfaceColor: surfaceColor,
        errorColor: errorColor,
        fontFamily: fontFamily,
      ),
    );
  }

  /// Toggle a boolean feature flag
  Future<bool> toggleFeatureFlag(String key, bool value) async {
    return updateSetting('featureFlags.$key', value);
  }

  /// Update theme configuration
  Future<bool> updateTheme({
    String? primaryColor,
    String? secondaryColor,
    String? accentColor,
    String? fontFamily,
  }) async {
    final themeUpdates = <String, dynamic>{};
    if (primaryColor != null) themeUpdates['theme.primaryColor'] = primaryColor;
    if (secondaryColor != null) themeUpdates['theme.secondaryColor'] = secondaryColor;
    if (accentColor != null) themeUpdates['theme.accentColor'] = accentColor;
    if (fontFamily != null) themeUpdates['theme.fontFamily'] = fontFamily;

    if (themeUpdates.isEmpty) return true;
    return updateSettings(themeUpdates);
  }
}

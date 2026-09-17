import 'package:json_annotation/json_annotation.dart';

part 'restaurant_settings.g.dart';

@JsonSerializable()
class RestaurantSettings {
  final ThemeConfig theme;
  final Map<String, bool> featureFlags;

  /// `ordering` block on `restaurants/{id}/config/settings`. A separate namespace from
  /// `featureFlags` on purpose: these change how the ordering flow BEHAVES per restaurant,
  /// alongside `approvals` (ST) and `tax` (BL) on the same document.
  ///
  /// Keys: `requireWaiterConfirmation` — a guest-placed round waits for a waiter before the
  /// kitchen is told. Absent means false, which is the behaviour every restaurant had before.
  @JsonKey(defaultValue: <String, bool>{})
  final Map<String, bool> ordering;

  RestaurantSettings({
    required this.theme,
    required this.featureFlags,
    this.ordering = const <String, bool>{},
  });

  factory RestaurantSettings.fromJson(Map<String, dynamic> json) =>
      _$RestaurantSettingsFromJson(json);
  Map<String, dynamic> toJson() => _$RestaurantSettingsToJson(this);
}

@JsonSerializable()
class ThemeConfig {
  final String primaryColor;
  final String secondaryColor;
  final String accentColor;
  final String backgroundColor;
  final String surfaceColor;
  final String errorColor;
  @JsonKey(defaultValue: 'Inter')
  final String fontFamily;

  ThemeConfig({
    required this.primaryColor,
    required this.secondaryColor,
    required this.accentColor,
    required this.backgroundColor,
    required this.surfaceColor,
    required this.errorColor,
    this.fontFamily = 'Inter',
  });

  factory ThemeConfig.fromJson(Map<String, dynamic> json) =>
      _$ThemeConfigFromJson(json);
  Map<String, dynamic> toJson() => _$ThemeConfigToJson(this);
}

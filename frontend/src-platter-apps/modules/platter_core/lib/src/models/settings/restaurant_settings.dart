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

  /// `tax` block (BL): `blocks[id] = {label, mode, collect, parts}` and `assign[categoryId] = blockId`.
  /// Read here only to label the dish editor's tax picker; the till and billing read it server-side.
  @JsonKey(defaultValue: <String, dynamic>{})
  final Map<String, dynamic> tax;

  RestaurantSettings({
    required this.theme,
    required this.featureFlags,
    this.ordering = const <String, bool>{},
    this.tax = const <String, dynamic>{},
  });

  /// Tax block id → label, for a picker. Empty when the restaurant has no blocks set up yet.
  Map<String, String> get taxBlockLabels {
    final blocks = tax['blocks'];
    if (blocks is! Map) return const {};
    return {
      for (final e in blocks.entries)
        e.key.toString(): (e.value is Map ? e.value['label']?.toString() : null) ?? e.key.toString(),
    };
  }

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

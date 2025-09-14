import 'package:json_annotation/json_annotation.dart';
import 'menu_item_meta.dart';
import 'price_info.dart';
import 'nutritional_info.dart';
import 'addon.dart';
import 'variant.dart';

part 'menu_item.g.dart';

@JsonSerializable(createToJson: true, explicitToJson: true)
class MenuItem {
  @JsonKey(name: 'menuItemId', required: true, disallowNullValue: true)
  final String id;

  @JsonKey(required: true, disallowNullValue: true)
  final MenuItemMeta meta;

  @JsonKey(required: true, disallowNullValue: true)
  final PriceInfo priceInfo;

  @JsonKey(name: 'isInStock', defaultValue: true)
  final bool isAvailable;

  @JsonKey(required: true, disallowNullValue: true)
  final String categoryId;

  @JsonKey(defaultValue: '')
  final String restaurantId;

  @JsonKey(required: true, disallowNullValue: true)
  final NutritionalInfo nutritionalInfo;

  @JsonKey(defaultValue: [])
  final List<Addon> addons;

  @JsonKey(defaultValue: false)
  final bool isCustomizable;

  @JsonKey(defaultValue: [])
  final List<String> allergenTags;

  @JsonKey(defaultValue: [])
  final List<Variant> variants;

  MenuItem({
    required this.id,
    required this.meta,
    required this.priceInfo,
    this.isAvailable = true,
    required this.categoryId,
    this.restaurantId = '',
    required this.nutritionalInfo,
    this.addons = const [],
    this.isCustomizable = false,
    this.allergenTags = const [],
    this.variants = const [],
  });

  factory MenuItem.fromJson(Map<String, dynamic> json) {
    // Patch: handle 'addons' as either List<String> or List<Map<String, dynamic>>
    var patched = Map<String, dynamic>.from(json);
    if (patched['addons'] != null && patched['addons'] is List) {
      final rawAddons = patched['addons'] as List;
      if (rawAddons.isNotEmpty && rawAddons.first is String) {
        // Convert List<String> to List<Map<String, dynamic>> with only id
        patched['addons'] = rawAddons.map((id) => {'id': id}).toList();
      }
    }
    return _$MenuItemFromJson(patched);
  }
  Map<String, dynamic> toJson() => _$MenuItemToJson(this);

  MenuItem copyWith({
    bool? isAvailable,
  }) {
    return MenuItem(
      id: id,
      meta: meta,
      priceInfo: priceInfo,
      isAvailable: isAvailable ?? this.isAvailable,
      categoryId: categoryId,
      restaurantId: restaurantId,
      nutritionalInfo: nutritionalInfo,
      addons: addons,
      isCustomizable: isCustomizable,
      allergenTags: allergenTags,
      variants: variants,
    );
  }
}


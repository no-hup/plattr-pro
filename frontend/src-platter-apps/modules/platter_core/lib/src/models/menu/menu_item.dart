import 'package:json_annotation/json_annotation.dart';
import '../../logging/app_logger.dart';
import 'menu_item_meta.dart';
import 'price_info.dart';
import 'nutritional_info.dart';
import 'addon.dart';
import 'addon_meta.dart';
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

  @JsonKey(defaultValue: null)
  final String? primarySubcategoryId;

  @JsonKey(defaultValue: [])
  final List<String> subcategoryIds;

  /// BL tax block this dish bills under (`tax.blocks` key on the restaurant config). Null means
  /// "take the category's block" (`tax.assign`) at placement; if neither answers, the bill refuses.
  final String? taxBlockId;

  @JsonKey(defaultValue: '')
  final String restaurantId;

  @JsonKey(required: true, disallowNullValue: true)
  final NutritionalInfo nutritionalInfo;

  @JsonKey(defaultValue: [], fromJson: _parseAddons)
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
    this.primarySubcategoryId,
    this.subcategoryIds = const [],
    this.taxBlockId,
    this.restaurantId = '',
    required this.nutritionalInfo,
    this.addons = const [],
    this.isCustomizable = false,
    this.allergenTags = const [],
    this.variants = const [],
  });

  factory MenuItem.fromJson(Map<String, dynamic> json) => _$MenuItemFromJson(json);

  Map<String, dynamic> toJson() => _$MenuItemToJson(this);

  /// Handle 'addons' as either List<String> or List<Map<String, dynamic>>
  static List<Addon> _parseAddons(dynamic value) {
    if (value == null) return [];
    if (value is! List) return [];
    
    return value.map((e) {
      if (e is String) {
        // Legacy format: List<String> of IDs
        return Addon(
          id: e, 
          priceInfo: PriceInfo(basePrice: 0, finalPrice: 0, discount: 0), 
          meta: const AddonMeta(name: ''),
        );
      }
      if (e is Map<String, dynamic>) {
        return Addon.fromJson(e);
      }
      
      // Log warning for unexpected type
      AppLogger.warning('Unexpected addon type in menu item: ${e.runtimeType} - $e');
      
      return Addon(
          id: '', 
          priceInfo: PriceInfo(basePrice: 0, finalPrice: 0, discount: 0), 
          meta: const AddonMeta(name: ''),
        );
    }).toList();
  }

  MenuItem copyWith({
    bool? isAvailable,
  }) {
    return MenuItem(
      id: id,
      meta: meta,
      priceInfo: priceInfo,
      isAvailable: isAvailable ?? this.isAvailable,
      categoryId: categoryId,
      primarySubcategoryId: primarySubcategoryId,
      subcategoryIds: subcategoryIds,
      taxBlockId: taxBlockId,
      restaurantId: restaurantId,
      nutritionalInfo: nutritionalInfo,
      addons: addons,
      isCustomizable: isCustomizable,
      allergenTags: allergenTags,
      variants: variants,
    );
  }
}

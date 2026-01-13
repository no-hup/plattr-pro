import 'package:freezed_annotation/freezed_annotation.dart';

part 'menu_response.freezed.dart';
part 'menu_response.g.dart';

@freezed
class MenuResponse with _$MenuResponse {
  factory MenuResponse({
    required MenuData result,
  }) = _MenuResponse;

  factory MenuResponse.fromJson(Map<String, dynamic> json) {
    try {
      // Sanitize the JSON to handle potential type mismatches and null values
      final sanitizedJson = <String, dynamic>{
        'result': json['result'] as Map<String, dynamic>? ?? {},
      };

      // Manually construct to avoid relying on generated _$*FromJson here
      return MenuResponse(
        result: MenuData.fromJson(
          sanitizedJson['result'] as Map<String, dynamic>,
        ),
      );
    } catch (e) {
      // Return a default response if parsing fails
      return MenuResponse(
        result: MenuData(
          categories: [],
          menuItems: {},
          metadata: MenuMetadata(
            totalCategories: 0,
            totalMenuItems: 0,
          ),
        ),
      );
    }
  }
}

/// 🆕 NEW MODEL: TableContextData - represents table context for display
@freezed
class TableContextData with _$TableContextData {
  factory TableContextData({
    required String restaurantName,
    String? tableNumber,
    String? otp,
    @Default(false) bool showOtp,
    @Default(false) bool showImages,
  }) = _TableContextData;

  factory TableContextData.fromJson(Map<String, dynamic> json) =>
      _$TableContextDataFromJson(json);
}

/// 🆕 NEW MODEL: ActiveMenu - represents the currently active menu
@freezed
class ActiveMenu with _$ActiveMenu {
  factory ActiveMenu({
    required String menuId,
    required String name,
    @Default(false) bool isDefault,
  }) = _ActiveMenu;

  factory ActiveMenu.fromJson(Map<String, dynamic> json) =>
      _$ActiveMenuFromJson(json);
}

/// 🆕 NEW MODEL: Subcategory - represents a subcategory within a category
@freezed
class Subcategory with _$Subcategory {
  factory Subcategory({
    required String id,
    required String name,
    String? description,
    String? image,
    String? parentCategoryId, // Made optional for backward compatibility with legacy data
    @Default(0) int order,
  }) = _Subcategory;

  factory Subcategory.fromJson(Map<String, dynamic> json) =>
      _$SubcategoryFromJson(json);
}

@freezed
class MenuData with _$MenuData {
  factory MenuData({
    required List<Category> categories,
    required Map<String, List<MenuItem>> menuItems,
    required MenuMetadata metadata,
    ActiveMenu? activeMenu,
    TableContextData? tableContext,
    String? restaurantName, // Fallback for header display
  }) = _MenuData;

  factory MenuData.fromJson(Map<String, dynamic> json) {
    try {
      // Sanitize the JSON to handle potential type mismatches and null values
      final sanitizedJson = <String, dynamic>{
        'activeMenu': json['activeMenu'] as Map<String, dynamic>?,
        'categories': json['categories'] as List<dynamic>? ?? [],
        'menuItems': json['menuItems'] as Map<String, dynamic>? ?? {},
        'metadata': json['metadata'] as Map<String, dynamic>? ?? {},
        'tableContext': json['tableContext'] as Map<String, dynamic>?,
        'restaurantName': json['restaurantName'] as String?,
      };

      // Parse activeMenu if present
      ActiveMenu? activeMenu;
      if (sanitizedJson['activeMenu'] != null) {
        activeMenu = ActiveMenu.fromJson(
          sanitizedJson['activeMenu'] as Map<String, dynamic>,
        );
      }

      // Parse tableContext if present
      TableContextData? tableContext;
      if (sanitizedJson['tableContext'] != null) {
        tableContext = TableContextData.fromJson(
          sanitizedJson['tableContext'] as Map<String, dynamic>,
        );
      }

      // Parse categories list
      final categories = (sanitizedJson['categories'] as List<dynamic>)
          .whereType<Map<String, dynamic>>()
          .map(Category.fromJson)
          .toList();

      // Parse menuItems map (grouped by subcategoryId or categoryId)
      final rawMenuItems = sanitizedJson['menuItems'] as Map<String, dynamic>;
      final parsedMenuItems = <String, List<MenuItem>>{};
      for (final entry in rawMenuItems.entries) {
        final value = entry.value;
        if (value is List) {
          parsedMenuItems[entry.key] = value
              .whereType<Map<String, dynamic>>()
              .map(MenuItem.fromJson)
              .toList();
        } else {
          parsedMenuItems[entry.key] = const <MenuItem>[];
        }
      }

      // Parse metadata
      final metadata = MenuMetadata.fromJson(
        sanitizedJson['metadata'] as Map<String, dynamic>,
      );

      return MenuData(
        activeMenu: activeMenu,
        categories: categories,
        menuItems: parsedMenuItems,
        metadata: metadata,
        tableContext: tableContext,
        restaurantName: sanitizedJson['restaurantName'] as String?,
      );
    } catch (e) {
      // Return a default MenuData if parsing fails
      return MenuData(
        categories: [],
        menuItems: {},
        metadata: MenuMetadata(
          totalCategories: 0,
          totalMenuItems: 0,
        ),
      );
    }
  }
}

@freezed
class MenuMetadata with _$MenuMetadata {
  factory MenuMetadata({
    required int totalCategories,
    required int totalMenuItems,
    @Default(0) int totalSubcategories,
    String? activeMenuId,
  }) = _MenuMetadata;

  factory MenuMetadata.fromJson(Map<String, dynamic> json) =>
      _$MenuMetadataFromJson(json);
}

@freezed
class Category with _$Category {
  factory Category({
    required String id,
    required String name,
    required String description,
    required int order,
    String? image,
    @Default([]) List<Subcategory> subcategories, // 🆕 NEW - nested subcategories
    @Default('list') String viewType, // 'list' (default) or 'carousel' for horizontal display
    @Default(true) bool defaultExpanded, // Backend-controlled: if false, subcategories start collapsed
  }) = _Category;

  factory Category.fromJson(Map<String, dynamic> json) =>
      _$CategoryFromJson(json);
}

@freezed
class MenuItem with _$MenuItem {
  factory MenuItem({
    @JsonKey(name: 'menuItemId') required String id,
    required String categoryId,
    required MenuItemMeta meta,
    required PriceInfo priceInfo,
    required bool isInStock,
    required bool isCustomizable,
    String? primarySubcategoryId,
    @Default([]) List<String> subcategoryIds,
    @Default([]) List<Variant> variants,
    @Default([]) List<Addon> addons,
    NutritionalInfo? nutritionalInfo,
    @Default([]) List<String> allergenTags,
    @Default(0) int quantity,
  }) = _MenuItem;

  factory MenuItem.fromJson(Map<String, dynamic> json) =>
      _$MenuItemFromJson(json);
}

@freezed
class MenuItemMeta with _$MenuItemMeta {
  factory MenuItemMeta({
    required String name,
    required String description,
    required String categoryName,
    String? primarySubcategoryName, // 🆕 NEW - nullable for backward compatibility
    String? image,
  }) = _MenuItemMeta;

  factory MenuItemMeta.fromJson(Map<String, dynamic> json) =>
      _$MenuItemMetaFromJson(json);
}

@freezed
class PriceInfo with _$PriceInfo {
  factory PriceInfo({
    required num basePrice,
    required num discount,
    required num finalPrice,
  }) = _PriceInfo;

  factory PriceInfo.fromJson(Map<String, dynamic> json) =>
      _$PriceInfoFromJson(json);
}

@freezed
class Variant with _$Variant {
  factory Variant({
    required String id,
    required VariantMeta meta,
    required List<VariantOption> options,
    required bool respectParentDiscount,
    required List<String> itemsAssociatedWith,
    required bool isMandatory,
    required String name,
  }) = _Variant;

  factory Variant.fromJson(Map<String, dynamic> json) =>
      _$VariantFromJson(json);
}

@freezed
class VariantOption with _$VariantOption {
  factory VariantOption({
    required String id,
    required String name,
    required PriceInfo priceInfo,
  }) = _VariantOption;

  factory VariantOption.fromJson(Map<String, dynamic> json) =>
      _$VariantOptionFromJson(json);
}

@freezed
class Addon with _$Addon {
  factory Addon({
    required String id,
    required PriceInfo priceInfo,
    required AddonMeta meta,
    required bool respectParentDiscount,
    required bool isInStock,
    required List<String> itemsAssociatedWith,
    required bool isMandatory,
  }) = _Addon;

  factory Addon.fromJson(Map<String, dynamic> json) => _$AddonFromJson(json);
}

@freezed
class NutritionalInfo with _$NutritionalInfo {
  factory NutritionalInfo({
    required int carbs,
    required int protein,
    required int fat,
    required int calories,
  }) = _NutritionalInfo;

  factory NutritionalInfo.fromJson(Map<String, dynamic> json) =>
      _$NutritionalInfoFromJson(json);
}

@freezed
class VariantMeta with _$VariantMeta {
  factory VariantMeta({
    required String name,
    required String description,
    required List<String> categoryAssociatedWith,
  }) = _VariantMeta;

  factory VariantMeta.fromJson(Map<String, dynamic> json) =>
      _$VariantMetaFromJson(json);
}

@freezed
class AddonMeta with _$AddonMeta {
  factory AddonMeta({
    required String name,
    required String description,
    required List<String> categoryAssociatedWith,
  }) = _AddonMeta;

  factory AddonMeta.fromJson(Map<String, dynamic> json) =>
      _$AddonMetaFromJson(json);
}

@freezed
class AddToCartRequest with _$AddToCartRequest {
  factory AddToCartRequest({
    required String tableId,
    required String restaurantId,
    required String menuItemId,
    required int quantity,
    Map<String, String>? selectedVariants,
    List<String>? selectedAddons,
  }) = _AddToCartRequest;

  factory AddToCartRequest.fromJson(Map<String, dynamic> json) =>
      _$AddToCartRequestFromJson(json);
}

@freezed
class RemoveFromCartRequest with _$RemoveFromCartRequest {
  factory RemoveFromCartRequest({
    required String tableId,
    required String restaurantId,
    required String menuItemId,
    required int quantity,
    Map<String, String>? selectedVariants,
    List<String>? selectedAddons,
  }) = _RemoveFromCartRequest;

  factory RemoveFromCartRequest.fromJson(Map<String, dynamic> json) =>
      _$RemoveFromCartRequestFromJson(json);
}

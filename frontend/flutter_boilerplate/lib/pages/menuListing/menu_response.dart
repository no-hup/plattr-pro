import 'package:freezed_annotation/freezed_annotation.dart';

part 'menu_response.freezed.dart';
part 'menu_response.g.dart';

@freezed
class MenuResponse with _$MenuResponse {
  factory MenuResponse({
    required MenuData result,
  }) = _MenuResponse;

  factory MenuResponse.fromJson(Map<String, dynamic> json) =>
      _$MenuResponseFromJson(json);
}

@freezed
class MenuData with _$MenuData {
  factory MenuData({
    required List<Category> categories,
    required Map<String, List<MenuItem>> menuItems,
    required MenuMetadata metadata,
  }) = _MenuData;

  factory MenuData.fromJson(Map<String, dynamic> json) =>
      _$MenuDataFromJson(json);
}

@freezed
class MenuMetadata with _$MenuMetadata {
  factory MenuMetadata({
    required int totalCategories,
    required int totalMenuItems,
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
    String? image,
    required int order,
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
    @Default([]) List<Variant> variants,
    @Default([]) List<Addon> addons,
    NutritionalInfo? nutritionalInfo,
    @Default([]) List<String> allergenTags,
    required bool isInStock,
    required bool isCustomizable,
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

  factory Addon.fromJson(Map<String, dynamic> json) =>
      _$AddonFromJson(json);
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

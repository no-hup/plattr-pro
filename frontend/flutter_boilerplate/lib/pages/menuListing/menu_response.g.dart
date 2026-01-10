// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'menu_response.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_$ActiveMenuImpl _$$ActiveMenuImplFromJson(Map<String, dynamic> json) =>
    _$ActiveMenuImpl(
      menuId: json['menuId'] as String,
      name: json['name'] as String,
      isDefault: json['isDefault'] as bool? ?? false,
    );

Map<String, dynamic> _$$ActiveMenuImplToJson(_$ActiveMenuImpl instance) =>
    <String, dynamic>{
      'menuId': instance.menuId,
      'name': instance.name,
      'isDefault': instance.isDefault,
    };

_$SubcategoryImpl _$$SubcategoryImplFromJson(Map<String, dynamic> json) =>
    _$SubcategoryImpl(
      id: json['id'] as String,
      name: json['name'] as String,
      description: json['description'] as String?,
      image: json['image'] as String?,
      parentCategoryId: json['parentCategoryId'] as String?,
      order: (json['order'] as num?)?.toInt() ?? 0,
    );

Map<String, dynamic> _$$SubcategoryImplToJson(_$SubcategoryImpl instance) =>
    <String, dynamic>{
      'id': instance.id,
      'name': instance.name,
      'description': instance.description,
      'image': instance.image,
      'parentCategoryId': instance.parentCategoryId,
      'order': instance.order,
    };

_$MenuMetadataImpl _$$MenuMetadataImplFromJson(Map<String, dynamic> json) =>
    _$MenuMetadataImpl(
      totalCategories: (json['totalCategories'] as num).toInt(),
      totalSubcategories: (json['totalSubcategories'] as num?)?.toInt() ?? 0,
      totalMenuItems: (json['totalMenuItems'] as num).toInt(),
      activeMenuId: json['activeMenuId'] as String?,
    );

Map<String, dynamic> _$$MenuMetadataImplToJson(_$MenuMetadataImpl instance) =>
    <String, dynamic>{
      'totalCategories': instance.totalCategories,
      'totalSubcategories': instance.totalSubcategories,
      'totalMenuItems': instance.totalMenuItems,
      'activeMenuId': instance.activeMenuId,
    };

_$CategoryImpl _$$CategoryImplFromJson(Map<String, dynamic> json) =>
    _$CategoryImpl(
      id: json['id'] as String,
      name: json['name'] as String,
      description: json['description'] as String,
      order: (json['order'] as num).toInt(),
      image: json['image'] as String?,
      subcategories: (json['subcategories'] as List<dynamic>?)
              ?.map((e) => Subcategory.fromJson(e as Map<String, dynamic>))
              .toList() ??
          const [],
    );

Map<String, dynamic> _$$CategoryImplToJson(_$CategoryImpl instance) =>
    <String, dynamic>{
      'id': instance.id,
      'name': instance.name,
      'description': instance.description,
      'order': instance.order,
      'image': instance.image,
      'subcategories': instance.subcategories,
    };

_$MenuItemImpl _$$MenuItemImplFromJson(Map<String, dynamic> json) =>
    _$MenuItemImpl(
      id: json['menuItemId'] as String,
      categoryId: json['categoryId'] as String,
      primarySubcategoryId: json['primarySubcategoryId'] as String?,
      subcategoryIds: (json['subcategoryIds'] as List<dynamic>?)
              ?.map((e) => e as String)
              .toList() ??
          const [],
      meta: MenuItemMeta.fromJson(json['meta'] as Map<String, dynamic>),
      priceInfo: PriceInfo.fromJson(json['priceInfo'] as Map<String, dynamic>),
      isInStock: json['isInStock'] as bool,
      isCustomizable: json['isCustomizable'] as bool,
      variants: (json['variants'] as List<dynamic>?)
              ?.map((e) => Variant.fromJson(e as Map<String, dynamic>))
              .toList() ??
          const [],
      addons: (json['addons'] as List<dynamic>?)
              ?.map((e) => Addon.fromJson(e as Map<String, dynamic>))
              .toList() ??
          const [],
      nutritionalInfo: json['nutritionalInfo'] == null
          ? null
          : NutritionalInfo.fromJson(
              json['nutritionalInfo'] as Map<String, dynamic>),
      allergenTags: (json['allergenTags'] as List<dynamic>?)
              ?.map((e) => e as String)
              .toList() ??
          const [],
      quantity: (json['quantity'] as num?)?.toInt() ?? 0,
    );

Map<String, dynamic> _$$MenuItemImplToJson(_$MenuItemImpl instance) =>
    <String, dynamic>{
      'menuItemId': instance.id,
      'categoryId': instance.categoryId,
      'primarySubcategoryId': instance.primarySubcategoryId,
      'subcategoryIds': instance.subcategoryIds,
      'meta': instance.meta,
      'priceInfo': instance.priceInfo,
      'isInStock': instance.isInStock,
      'isCustomizable': instance.isCustomizable,
      'variants': instance.variants,
      'addons': instance.addons,
      'nutritionalInfo': instance.nutritionalInfo,
      'allergenTags': instance.allergenTags,
      'quantity': instance.quantity,
    };

_$MenuItemMetaImpl _$$MenuItemMetaImplFromJson(Map<String, dynamic> json) =>
    _$MenuItemMetaImpl(
      name: json['name'] as String,
      description: json['description'] as String,
      categoryName: json['categoryName'] as String,
      primarySubcategoryName: json['primarySubcategoryName'] as String?,
      image: json['image'] as String?,
    );

Map<String, dynamic> _$$MenuItemMetaImplToJson(_$MenuItemMetaImpl instance) =>
    <String, dynamic>{
      'name': instance.name,
      'description': instance.description,
      'categoryName': instance.categoryName,
      'primarySubcategoryName': instance.primarySubcategoryName,
      'image': instance.image,
    };

_$PriceInfoImpl _$$PriceInfoImplFromJson(Map<String, dynamic> json) =>
    _$PriceInfoImpl(
      basePrice: json['basePrice'] as num,
      discount: json['discount'] as num,
      finalPrice: json['finalPrice'] as num,
    );

Map<String, dynamic> _$$PriceInfoImplToJson(_$PriceInfoImpl instance) =>
    <String, dynamic>{
      'basePrice': instance.basePrice,
      'discount': instance.discount,
      'finalPrice': instance.finalPrice,
    };

_$VariantImpl _$$VariantImplFromJson(Map<String, dynamic> json) =>
    _$VariantImpl(
      id: json['id'] as String,
      meta: VariantMeta.fromJson(json['meta'] as Map<String, dynamic>),
      options: (json['options'] as List<dynamic>)
          .map((e) => VariantOption.fromJson(e as Map<String, dynamic>))
          .toList(),
      respectParentDiscount: json['respectParentDiscount'] as bool,
      itemsAssociatedWith: (json['itemsAssociatedWith'] as List<dynamic>)
          .map((e) => e as String)
          .toList(),
      isMandatory: json['isMandatory'] as bool,
      name: json['name'] as String,
    );

Map<String, dynamic> _$$VariantImplToJson(_$VariantImpl instance) =>
    <String, dynamic>{
      'id': instance.id,
      'meta': instance.meta,
      'options': instance.options,
      'respectParentDiscount': instance.respectParentDiscount,
      'itemsAssociatedWith': instance.itemsAssociatedWith,
      'isMandatory': instance.isMandatory,
      'name': instance.name,
    };

_$VariantOptionImpl _$$VariantOptionImplFromJson(Map<String, dynamic> json) =>
    _$VariantOptionImpl(
      id: json['id'] as String,
      name: json['name'] as String,
      priceInfo: PriceInfo.fromJson(json['priceInfo'] as Map<String, dynamic>),
    );

Map<String, dynamic> _$$VariantOptionImplToJson(_$VariantOptionImpl instance) =>
    <String, dynamic>{
      'id': instance.id,
      'name': instance.name,
      'priceInfo': instance.priceInfo,
    };

_$AddonImpl _$$AddonImplFromJson(Map<String, dynamic> json) => _$AddonImpl(
      id: json['id'] as String,
      priceInfo: PriceInfo.fromJson(json['priceInfo'] as Map<String, dynamic>),
      meta: AddonMeta.fromJson(json['meta'] as Map<String, dynamic>),
      respectParentDiscount: json['respectParentDiscount'] as bool,
      isInStock: json['isInStock'] as bool,
      itemsAssociatedWith: (json['itemsAssociatedWith'] as List<dynamic>)
          .map((e) => e as String)
          .toList(),
      isMandatory: json['isMandatory'] as bool,
    );

Map<String, dynamic> _$$AddonImplToJson(_$AddonImpl instance) =>
    <String, dynamic>{
      'id': instance.id,
      'priceInfo': instance.priceInfo,
      'meta': instance.meta,
      'respectParentDiscount': instance.respectParentDiscount,
      'isInStock': instance.isInStock,
      'itemsAssociatedWith': instance.itemsAssociatedWith,
      'isMandatory': instance.isMandatory,
    };

_$NutritionalInfoImpl _$$NutritionalInfoImplFromJson(
        Map<String, dynamic> json) =>
    _$NutritionalInfoImpl(
      carbs: (json['carbs'] as num).toInt(),
      protein: (json['protein'] as num).toInt(),
      fat: (json['fat'] as num).toInt(),
      calories: (json['calories'] as num).toInt(),
    );

Map<String, dynamic> _$$NutritionalInfoImplToJson(
        _$NutritionalInfoImpl instance) =>
    <String, dynamic>{
      'carbs': instance.carbs,
      'protein': instance.protein,
      'fat': instance.fat,
      'calories': instance.calories,
    };

_$VariantMetaImpl _$$VariantMetaImplFromJson(Map<String, dynamic> json) =>
    _$VariantMetaImpl(
      name: json['name'] as String,
      description: json['description'] as String,
      categoryAssociatedWith: (json['categoryAssociatedWith'] as List<dynamic>)
          .map((e) => e as String)
          .toList(),
    );

Map<String, dynamic> _$$VariantMetaImplToJson(_$VariantMetaImpl instance) =>
    <String, dynamic>{
      'name': instance.name,
      'description': instance.description,
      'categoryAssociatedWith': instance.categoryAssociatedWith,
    };

_$AddonMetaImpl _$$AddonMetaImplFromJson(Map<String, dynamic> json) =>
    _$AddonMetaImpl(
      name: json['name'] as String,
      description: json['description'] as String,
      categoryAssociatedWith: (json['categoryAssociatedWith'] as List<dynamic>)
          .map((e) => e as String)
          .toList(),
    );

Map<String, dynamic> _$$AddonMetaImplToJson(_$AddonMetaImpl instance) =>
    <String, dynamic>{
      'name': instance.name,
      'description': instance.description,
      'categoryAssociatedWith': instance.categoryAssociatedWith,
    };

_$AddToCartRequestImpl _$$AddToCartRequestImplFromJson(
        Map<String, dynamic> json) =>
    _$AddToCartRequestImpl(
      tableId: json['tableId'] as String,
      restaurantId: json['restaurantId'] as String,
      menuItemId: json['menuItemId'] as String,
      quantity: (json['quantity'] as num).toInt(),
      selectedVariants:
          (json['selectedVariants'] as Map<String, dynamic>?)?.map(
        (k, e) => MapEntry(k, e as String),
      ),
      selectedAddons: (json['selectedAddons'] as List<dynamic>?)
          ?.map((e) => e as String)
          .toList(),
    );

Map<String, dynamic> _$$AddToCartRequestImplToJson(
        _$AddToCartRequestImpl instance) =>
    <String, dynamic>{
      'tableId': instance.tableId,
      'restaurantId': instance.restaurantId,
      'menuItemId': instance.menuItemId,
      'quantity': instance.quantity,
      'selectedVariants': instance.selectedVariants,
      'selectedAddons': instance.selectedAddons,
    };

_$RemoveFromCartRequestImpl _$$RemoveFromCartRequestImplFromJson(
        Map<String, dynamic> json) =>
    _$RemoveFromCartRequestImpl(
      tableId: json['tableId'] as String,
      restaurantId: json['restaurantId'] as String,
      menuItemId: json['menuItemId'] as String,
      quantity: (json['quantity'] as num).toInt(),
      selectedVariants:
          (json['selectedVariants'] as Map<String, dynamic>?)?.map(
        (k, e) => MapEntry(k, e as String),
      ),
      selectedAddons: (json['selectedAddons'] as List<dynamic>?)
          ?.map((e) => e as String)
          .toList(),
    );

Map<String, dynamic> _$$RemoveFromCartRequestImplToJson(
        _$RemoveFromCartRequestImpl instance) =>
    <String, dynamic>{
      'tableId': instance.tableId,
      'restaurantId': instance.restaurantId,
      'menuItemId': instance.menuItemId,
      'quantity': instance.quantity,
      'selectedVariants': instance.selectedVariants,
      'selectedAddons': instance.selectedAddons,
    };

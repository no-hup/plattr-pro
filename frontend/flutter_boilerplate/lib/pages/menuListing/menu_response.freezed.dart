// coverage:ignore-file
// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'menu_response.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

T _$identity<T>(T value) => value;

final _privateConstructorUsedError = UnsupportedError(
    'It seems like you constructed your class using `MyClass._()`. This constructor is only meant to be used by freezed and you are not supposed to need it nor use it.\nPlease check the documentation here for more information: https://github.com/rrousselGit/freezed#adding-getters-and-methods-to-our-models');

MenuResponse _$MenuResponseFromJson(Map<String, dynamic> json) {
  return _MenuResponse.fromJson(json);
}

/// @nodoc
mixin _$MenuResponse {
  MenuData get result => throw _privateConstructorUsedError;

  Map<String, dynamic> toJson() => throw _privateConstructorUsedError;
  @JsonKey(ignore: true)
  $MenuResponseCopyWith<MenuResponse> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $MenuResponseCopyWith<$Res> {
  factory $MenuResponseCopyWith(
          MenuResponse value, $Res Function(MenuResponse) then) =
      _$MenuResponseCopyWithImpl<$Res, MenuResponse>;
  @useResult
  $Res call({MenuData result});

  $MenuDataCopyWith<$Res> get result;
}

/// @nodoc
class _$MenuResponseCopyWithImpl<$Res, $Val extends MenuResponse>
    implements $MenuResponseCopyWith<$Res> {
  _$MenuResponseCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? result = null,
  }) {
    return _then(_value.copyWith(
      result: null == result
          ? _value.result
          : result // ignore: cast_nullable_to_non_nullable
              as MenuData,
    ) as $Val);
  }

  @override
  @pragma('vm:prefer-inline')
  $MenuDataCopyWith<$Res> get result {
    return $MenuDataCopyWith<$Res>(_value.result, (value) {
      return _then(_value.copyWith(result: value) as $Val);
    });
  }
}

/// @nodoc
abstract class _$$MenuResponseImplCopyWith<$Res>
    implements $MenuResponseCopyWith<$Res> {
  factory _$$MenuResponseImplCopyWith(
          _$MenuResponseImpl value, $Res Function(_$MenuResponseImpl) then) =
      __$$MenuResponseImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call({MenuData result});

  @override
  $MenuDataCopyWith<$Res> get result;
}

/// @nodoc
class __$$MenuResponseImplCopyWithImpl<$Res>
    extends _$MenuResponseCopyWithImpl<$Res, _$MenuResponseImpl>
    implements _$$MenuResponseImplCopyWith<$Res> {
  __$$MenuResponseImplCopyWithImpl(
      _$MenuResponseImpl _value, $Res Function(_$MenuResponseImpl) _then)
      : super(_value, _then);

  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? result = null,
  }) {
    return _then(_$MenuResponseImpl(
      result: null == result
          ? _value.result
          : result // ignore: cast_nullable_to_non_nullable
              as MenuData,
    ));
  }
}

/// @nodoc
@JsonSerializable()
class _$MenuResponseImpl implements _MenuResponse {
  _$MenuResponseImpl({required this.result});

  factory _$MenuResponseImpl.fromJson(Map<String, dynamic> json) =>
      _$$MenuResponseImplFromJson(json);

  @override
  final MenuData result;

  @override
  String toString() {
    return 'MenuResponse(result: $result)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$MenuResponseImpl &&
            (identical(other.result, result) || other.result == result));
  }

  @JsonKey(ignore: true)
  @override
  int get hashCode => Object.hash(runtimeType, result);

  @JsonKey(ignore: true)
  @override
  @pragma('vm:prefer-inline')
  _$$MenuResponseImplCopyWith<_$MenuResponseImpl> get copyWith =>
      __$$MenuResponseImplCopyWithImpl<_$MenuResponseImpl>(this, _$identity);

  @override
  Map<String, dynamic> toJson() {
    return _$$MenuResponseImplToJson(
      this,
    );
  }
}

abstract class _MenuResponse implements MenuResponse {
  factory _MenuResponse({required final MenuData result}) = _$MenuResponseImpl;

  factory _MenuResponse.fromJson(Map<String, dynamic> json) =
      _$MenuResponseImpl.fromJson;

  @override
  MenuData get result;
  @override
  @JsonKey(ignore: true)
  _$$MenuResponseImplCopyWith<_$MenuResponseImpl> get copyWith =>
      throw _privateConstructorUsedError;
}

MenuData _$MenuDataFromJson(Map<String, dynamic> json) {
  return _MenuData.fromJson(json);
}

/// @nodoc
mixin _$MenuData {
  List<Category> get categories => throw _privateConstructorUsedError;
  Map<String, List<MenuItem>> get menuItems =>
      throw _privateConstructorUsedError;
  MenuMetadata get metadata => throw _privateConstructorUsedError;

  Map<String, dynamic> toJson() => throw _privateConstructorUsedError;
  @JsonKey(ignore: true)
  $MenuDataCopyWith<MenuData> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $MenuDataCopyWith<$Res> {
  factory $MenuDataCopyWith(MenuData value, $Res Function(MenuData) then) =
      _$MenuDataCopyWithImpl<$Res, MenuData>;
  @useResult
  $Res call(
      {List<Category> categories,
      Map<String, List<MenuItem>> menuItems,
      MenuMetadata metadata});

  $MenuMetadataCopyWith<$Res> get metadata;
}

/// @nodoc
class _$MenuDataCopyWithImpl<$Res, $Val extends MenuData>
    implements $MenuDataCopyWith<$Res> {
  _$MenuDataCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? categories = null,
    Object? menuItems = null,
    Object? metadata = null,
  }) {
    return _then(_value.copyWith(
      categories: null == categories
          ? _value.categories
          : categories // ignore: cast_nullable_to_non_nullable
              as List<Category>,
      menuItems: null == menuItems
          ? _value.menuItems
          : menuItems // ignore: cast_nullable_to_non_nullable
              as Map<String, List<MenuItem>>,
      metadata: null == metadata
          ? _value.metadata
          : metadata // ignore: cast_nullable_to_non_nullable
              as MenuMetadata,
    ) as $Val);
  }

  @override
  @pragma('vm:prefer-inline')
  $MenuMetadataCopyWith<$Res> get metadata {
    return $MenuMetadataCopyWith<$Res>(_value.metadata, (value) {
      return _then(_value.copyWith(metadata: value) as $Val);
    });
  }
}

/// @nodoc
abstract class _$$MenuDataImplCopyWith<$Res>
    implements $MenuDataCopyWith<$Res> {
  factory _$$MenuDataImplCopyWith(
          _$MenuDataImpl value, $Res Function(_$MenuDataImpl) then) =
      __$$MenuDataImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call(
      {List<Category> categories,
      Map<String, List<MenuItem>> menuItems,
      MenuMetadata metadata});

  @override
  $MenuMetadataCopyWith<$Res> get metadata;
}

/// @nodoc
class __$$MenuDataImplCopyWithImpl<$Res>
    extends _$MenuDataCopyWithImpl<$Res, _$MenuDataImpl>
    implements _$$MenuDataImplCopyWith<$Res> {
  __$$MenuDataImplCopyWithImpl(
      _$MenuDataImpl _value, $Res Function(_$MenuDataImpl) _then)
      : super(_value, _then);

  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? categories = null,
    Object? menuItems = null,
    Object? metadata = null,
  }) {
    return _then(_$MenuDataImpl(
      categories: null == categories
          ? _value._categories
          : categories // ignore: cast_nullable_to_non_nullable
              as List<Category>,
      menuItems: null == menuItems
          ? _value._menuItems
          : menuItems // ignore: cast_nullable_to_non_nullable
              as Map<String, List<MenuItem>>,
      metadata: null == metadata
          ? _value.metadata
          : metadata // ignore: cast_nullable_to_non_nullable
              as MenuMetadata,
    ));
  }
}

/// @nodoc
@JsonSerializable()
class _$MenuDataImpl implements _MenuData {
  _$MenuDataImpl(
      {required final List<Category> categories,
      required final Map<String, List<MenuItem>> menuItems,
      required this.metadata})
      : _categories = categories,
        _menuItems = menuItems;

  factory _$MenuDataImpl.fromJson(Map<String, dynamic> json) =>
      _$$MenuDataImplFromJson(json);

  final List<Category> _categories;
  @override
  List<Category> get categories {
    if (_categories is EqualUnmodifiableListView) return _categories;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableListView(_categories);
  }

  final Map<String, List<MenuItem>> _menuItems;
  @override
  Map<String, List<MenuItem>> get menuItems {
    if (_menuItems is EqualUnmodifiableMapView) return _menuItems;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableMapView(_menuItems);
  }

  @override
  final MenuMetadata metadata;

  @override
  String toString() {
    return 'MenuData(categories: $categories, menuItems: $menuItems, metadata: $metadata)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$MenuDataImpl &&
            const DeepCollectionEquality()
                .equals(other._categories, _categories) &&
            const DeepCollectionEquality()
                .equals(other._menuItems, _menuItems) &&
            (identical(other.metadata, metadata) ||
                other.metadata == metadata));
  }

  @JsonKey(ignore: true)
  @override
  int get hashCode => Object.hash(
      runtimeType,
      const DeepCollectionEquality().hash(_categories),
      const DeepCollectionEquality().hash(_menuItems),
      metadata);

  @JsonKey(ignore: true)
  @override
  @pragma('vm:prefer-inline')
  _$$MenuDataImplCopyWith<_$MenuDataImpl> get copyWith =>
      __$$MenuDataImplCopyWithImpl<_$MenuDataImpl>(this, _$identity);

  @override
  Map<String, dynamic> toJson() {
    return _$$MenuDataImplToJson(
      this,
    );
  }
}

abstract class _MenuData implements MenuData {
  factory _MenuData(
      {required final List<Category> categories,
      required final Map<String, List<MenuItem>> menuItems,
      required final MenuMetadata metadata}) = _$MenuDataImpl;

  factory _MenuData.fromJson(Map<String, dynamic> json) =
      _$MenuDataImpl.fromJson;

  @override
  List<Category> get categories;
  @override
  Map<String, List<MenuItem>> get menuItems;
  @override
  MenuMetadata get metadata;
  @override
  @JsonKey(ignore: true)
  _$$MenuDataImplCopyWith<_$MenuDataImpl> get copyWith =>
      throw _privateConstructorUsedError;
}

MenuMetadata _$MenuMetadataFromJson(Map<String, dynamic> json) {
  return _MenuMetadata.fromJson(json);
}

/// @nodoc
mixin _$MenuMetadata {
  int get totalCategories => throw _privateConstructorUsedError;
  int get totalMenuItems => throw _privateConstructorUsedError;

  Map<String, dynamic> toJson() => throw _privateConstructorUsedError;
  @JsonKey(ignore: true)
  $MenuMetadataCopyWith<MenuMetadata> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $MenuMetadataCopyWith<$Res> {
  factory $MenuMetadataCopyWith(
          MenuMetadata value, $Res Function(MenuMetadata) then) =
      _$MenuMetadataCopyWithImpl<$Res, MenuMetadata>;
  @useResult
  $Res call({int totalCategories, int totalMenuItems});
}

/// @nodoc
class _$MenuMetadataCopyWithImpl<$Res, $Val extends MenuMetadata>
    implements $MenuMetadataCopyWith<$Res> {
  _$MenuMetadataCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? totalCategories = null,
    Object? totalMenuItems = null,
  }) {
    return _then(_value.copyWith(
      totalCategories: null == totalCategories
          ? _value.totalCategories
          : totalCategories // ignore: cast_nullable_to_non_nullable
              as int,
      totalMenuItems: null == totalMenuItems
          ? _value.totalMenuItems
          : totalMenuItems // ignore: cast_nullable_to_non_nullable
              as int,
    ) as $Val);
  }
}

/// @nodoc
abstract class _$$MenuMetadataImplCopyWith<$Res>
    implements $MenuMetadataCopyWith<$Res> {
  factory _$$MenuMetadataImplCopyWith(
          _$MenuMetadataImpl value, $Res Function(_$MenuMetadataImpl) then) =
      __$$MenuMetadataImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call({int totalCategories, int totalMenuItems});
}

/// @nodoc
class __$$MenuMetadataImplCopyWithImpl<$Res>
    extends _$MenuMetadataCopyWithImpl<$Res, _$MenuMetadataImpl>
    implements _$$MenuMetadataImplCopyWith<$Res> {
  __$$MenuMetadataImplCopyWithImpl(
      _$MenuMetadataImpl _value, $Res Function(_$MenuMetadataImpl) _then)
      : super(_value, _then);

  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? totalCategories = null,
    Object? totalMenuItems = null,
  }) {
    return _then(_$MenuMetadataImpl(
      totalCategories: null == totalCategories
          ? _value.totalCategories
          : totalCategories // ignore: cast_nullable_to_non_nullable
              as int,
      totalMenuItems: null == totalMenuItems
          ? _value.totalMenuItems
          : totalMenuItems // ignore: cast_nullable_to_non_nullable
              as int,
    ));
  }
}

/// @nodoc
@JsonSerializable()
class _$MenuMetadataImpl implements _MenuMetadata {
  _$MenuMetadataImpl(
      {required this.totalCategories, required this.totalMenuItems});

  factory _$MenuMetadataImpl.fromJson(Map<String, dynamic> json) =>
      _$$MenuMetadataImplFromJson(json);

  @override
  final int totalCategories;
  @override
  final int totalMenuItems;

  @override
  String toString() {
    return 'MenuMetadata(totalCategories: $totalCategories, totalMenuItems: $totalMenuItems)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$MenuMetadataImpl &&
            (identical(other.totalCategories, totalCategories) ||
                other.totalCategories == totalCategories) &&
            (identical(other.totalMenuItems, totalMenuItems) ||
                other.totalMenuItems == totalMenuItems));
  }

  @JsonKey(ignore: true)
  @override
  int get hashCode => Object.hash(runtimeType, totalCategories, totalMenuItems);

  @JsonKey(ignore: true)
  @override
  @pragma('vm:prefer-inline')
  _$$MenuMetadataImplCopyWith<_$MenuMetadataImpl> get copyWith =>
      __$$MenuMetadataImplCopyWithImpl<_$MenuMetadataImpl>(this, _$identity);

  @override
  Map<String, dynamic> toJson() {
    return _$$MenuMetadataImplToJson(
      this,
    );
  }
}

abstract class _MenuMetadata implements MenuMetadata {
  factory _MenuMetadata(
      {required final int totalCategories,
      required final int totalMenuItems}) = _$MenuMetadataImpl;

  factory _MenuMetadata.fromJson(Map<String, dynamic> json) =
      _$MenuMetadataImpl.fromJson;

  @override
  int get totalCategories;
  @override
  int get totalMenuItems;
  @override
  @JsonKey(ignore: true)
  _$$MenuMetadataImplCopyWith<_$MenuMetadataImpl> get copyWith =>
      throw _privateConstructorUsedError;
}

Category _$CategoryFromJson(Map<String, dynamic> json) {
  return _Category.fromJson(json);
}

/// @nodoc
mixin _$Category {
  String get id => throw _privateConstructorUsedError;
  String get name => throw _privateConstructorUsedError;
  String get description => throw _privateConstructorUsedError;
  String? get image => throw _privateConstructorUsedError;
  int get order => throw _privateConstructorUsedError;

  Map<String, dynamic> toJson() => throw _privateConstructorUsedError;
  @JsonKey(ignore: true)
  $CategoryCopyWith<Category> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $CategoryCopyWith<$Res> {
  factory $CategoryCopyWith(Category value, $Res Function(Category) then) =
      _$CategoryCopyWithImpl<$Res, Category>;
  @useResult
  $Res call(
      {String id, String name, String description, String? image, int order});
}

/// @nodoc
class _$CategoryCopyWithImpl<$Res, $Val extends Category>
    implements $CategoryCopyWith<$Res> {
  _$CategoryCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? id = null,
    Object? name = null,
    Object? description = null,
    Object? image = freezed,
    Object? order = null,
  }) {
    return _then(_value.copyWith(
      id: null == id
          ? _value.id
          : id // ignore: cast_nullable_to_non_nullable
              as String,
      name: null == name
          ? _value.name
          : name // ignore: cast_nullable_to_non_nullable
              as String,
      description: null == description
          ? _value.description
          : description // ignore: cast_nullable_to_non_nullable
              as String,
      image: freezed == image
          ? _value.image
          : image // ignore: cast_nullable_to_non_nullable
              as String?,
      order: null == order
          ? _value.order
          : order // ignore: cast_nullable_to_non_nullable
              as int,
    ) as $Val);
  }
}

/// @nodoc
abstract class _$$CategoryImplCopyWith<$Res>
    implements $CategoryCopyWith<$Res> {
  factory _$$CategoryImplCopyWith(
          _$CategoryImpl value, $Res Function(_$CategoryImpl) then) =
      __$$CategoryImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call(
      {String id, String name, String description, String? image, int order});
}

/// @nodoc
class __$$CategoryImplCopyWithImpl<$Res>
    extends _$CategoryCopyWithImpl<$Res, _$CategoryImpl>
    implements _$$CategoryImplCopyWith<$Res> {
  __$$CategoryImplCopyWithImpl(
      _$CategoryImpl _value, $Res Function(_$CategoryImpl) _then)
      : super(_value, _then);

  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? id = null,
    Object? name = null,
    Object? description = null,
    Object? image = freezed,
    Object? order = null,
  }) {
    return _then(_$CategoryImpl(
      id: null == id
          ? _value.id
          : id // ignore: cast_nullable_to_non_nullable
              as String,
      name: null == name
          ? _value.name
          : name // ignore: cast_nullable_to_non_nullable
              as String,
      description: null == description
          ? _value.description
          : description // ignore: cast_nullable_to_non_nullable
              as String,
      image: freezed == image
          ? _value.image
          : image // ignore: cast_nullable_to_non_nullable
              as String?,
      order: null == order
          ? _value.order
          : order // ignore: cast_nullable_to_non_nullable
              as int,
    ));
  }
}

/// @nodoc
@JsonSerializable()
class _$CategoryImpl implements _Category {
  _$CategoryImpl(
      {required this.id,
      required this.name,
      required this.description,
      this.image,
      required this.order});

  factory _$CategoryImpl.fromJson(Map<String, dynamic> json) =>
      _$$CategoryImplFromJson(json);

  @override
  final String id;
  @override
  final String name;
  @override
  final String description;
  @override
  final String? image;
  @override
  final int order;

  @override
  String toString() {
    return 'Category(id: $id, name: $name, description: $description, image: $image, order: $order)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$CategoryImpl &&
            (identical(other.id, id) || other.id == id) &&
            (identical(other.name, name) || other.name == name) &&
            (identical(other.description, description) ||
                other.description == description) &&
            (identical(other.image, image) || other.image == image) &&
            (identical(other.order, order) || other.order == order));
  }

  @JsonKey(ignore: true)
  @override
  int get hashCode =>
      Object.hash(runtimeType, id, name, description, image, order);

  @JsonKey(ignore: true)
  @override
  @pragma('vm:prefer-inline')
  _$$CategoryImplCopyWith<_$CategoryImpl> get copyWith =>
      __$$CategoryImplCopyWithImpl<_$CategoryImpl>(this, _$identity);

  @override
  Map<String, dynamic> toJson() {
    return _$$CategoryImplToJson(
      this,
    );
  }
}

abstract class _Category implements Category {
  factory _Category(
      {required final String id,
      required final String name,
      required final String description,
      final String? image,
      required final int order}) = _$CategoryImpl;

  factory _Category.fromJson(Map<String, dynamic> json) =
      _$CategoryImpl.fromJson;

  @override
  String get id;
  @override
  String get name;
  @override
  String get description;
  @override
  String? get image;
  @override
  int get order;
  @override
  @JsonKey(ignore: true)
  _$$CategoryImplCopyWith<_$CategoryImpl> get copyWith =>
      throw _privateConstructorUsedError;
}

MenuItem _$MenuItemFromJson(Map<String, dynamic> json) {
  return _MenuItem.fromJson(json);
}

/// @nodoc
mixin _$MenuItem {
  @JsonKey(name: 'menuItemId')
  String get id => throw _privateConstructorUsedError;
  String get categoryId => throw _privateConstructorUsedError;
  MenuItemMeta get meta => throw _privateConstructorUsedError;
  PriceInfo get priceInfo => throw _privateConstructorUsedError;
  List<Variant> get variants => throw _privateConstructorUsedError;
  List<Addon> get addons => throw _privateConstructorUsedError;
  NutritionalInfo? get nutritionalInfo => throw _privateConstructorUsedError;
  List<String> get allergenTags => throw _privateConstructorUsedError;
  bool get isInStock => throw _privateConstructorUsedError;
  bool get isCustomizable => throw _privateConstructorUsedError;
  int get quantity => throw _privateConstructorUsedError;

  Map<String, dynamic> toJson() => throw _privateConstructorUsedError;
  @JsonKey(ignore: true)
  $MenuItemCopyWith<MenuItem> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $MenuItemCopyWith<$Res> {
  factory $MenuItemCopyWith(MenuItem value, $Res Function(MenuItem) then) =
      _$MenuItemCopyWithImpl<$Res, MenuItem>;
  @useResult
  $Res call(
      {@JsonKey(name: 'menuItemId') String id,
      String categoryId,
      MenuItemMeta meta,
      PriceInfo priceInfo,
      List<Variant> variants,
      List<Addon> addons,
      NutritionalInfo? nutritionalInfo,
      List<String> allergenTags,
      bool isInStock,
      bool isCustomizable,
      int quantity});

  $MenuItemMetaCopyWith<$Res> get meta;
  $PriceInfoCopyWith<$Res> get priceInfo;
  $NutritionalInfoCopyWith<$Res>? get nutritionalInfo;
}

/// @nodoc
class _$MenuItemCopyWithImpl<$Res, $Val extends MenuItem>
    implements $MenuItemCopyWith<$Res> {
  _$MenuItemCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? id = null,
    Object? categoryId = null,
    Object? meta = null,
    Object? priceInfo = null,
    Object? variants = null,
    Object? addons = null,
    Object? nutritionalInfo = freezed,
    Object? allergenTags = null,
    Object? isInStock = null,
    Object? isCustomizable = null,
    Object? quantity = null,
  }) {
    return _then(_value.copyWith(
      id: null == id
          ? _value.id
          : id // ignore: cast_nullable_to_non_nullable
              as String,
      categoryId: null == categoryId
          ? _value.categoryId
          : categoryId // ignore: cast_nullable_to_non_nullable
              as String,
      meta: null == meta
          ? _value.meta
          : meta // ignore: cast_nullable_to_non_nullable
              as MenuItemMeta,
      priceInfo: null == priceInfo
          ? _value.priceInfo
          : priceInfo // ignore: cast_nullable_to_non_nullable
              as PriceInfo,
      variants: null == variants
          ? _value.variants
          : variants // ignore: cast_nullable_to_non_nullable
              as List<Variant>,
      addons: null == addons
          ? _value.addons
          : addons // ignore: cast_nullable_to_non_nullable
              as List<Addon>,
      nutritionalInfo: freezed == nutritionalInfo
          ? _value.nutritionalInfo
          : nutritionalInfo // ignore: cast_nullable_to_non_nullable
              as NutritionalInfo?,
      allergenTags: null == allergenTags
          ? _value.allergenTags
          : allergenTags // ignore: cast_nullable_to_non_nullable
              as List<String>,
      isInStock: null == isInStock
          ? _value.isInStock
          : isInStock // ignore: cast_nullable_to_non_nullable
              as bool,
      isCustomizable: null == isCustomizable
          ? _value.isCustomizable
          : isCustomizable // ignore: cast_nullable_to_non_nullable
              as bool,
      quantity: null == quantity
          ? _value.quantity
          : quantity // ignore: cast_nullable_to_non_nullable
              as int,
    ) as $Val);
  }

  @override
  @pragma('vm:prefer-inline')
  $MenuItemMetaCopyWith<$Res> get meta {
    return $MenuItemMetaCopyWith<$Res>(_value.meta, (value) {
      return _then(_value.copyWith(meta: value) as $Val);
    });
  }

  @override
  @pragma('vm:prefer-inline')
  $PriceInfoCopyWith<$Res> get priceInfo {
    return $PriceInfoCopyWith<$Res>(_value.priceInfo, (value) {
      return _then(_value.copyWith(priceInfo: value) as $Val);
    });
  }

  @override
  @pragma('vm:prefer-inline')
  $NutritionalInfoCopyWith<$Res>? get nutritionalInfo {
    if (_value.nutritionalInfo == null) {
      return null;
    }

    return $NutritionalInfoCopyWith<$Res>(_value.nutritionalInfo!, (value) {
      return _then(_value.copyWith(nutritionalInfo: value) as $Val);
    });
  }
}

/// @nodoc
abstract class _$$MenuItemImplCopyWith<$Res>
    implements $MenuItemCopyWith<$Res> {
  factory _$$MenuItemImplCopyWith(
          _$MenuItemImpl value, $Res Function(_$MenuItemImpl) then) =
      __$$MenuItemImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call(
      {@JsonKey(name: 'menuItemId') String id,
      String categoryId,
      MenuItemMeta meta,
      PriceInfo priceInfo,
      List<Variant> variants,
      List<Addon> addons,
      NutritionalInfo? nutritionalInfo,
      List<String> allergenTags,
      bool isInStock,
      bool isCustomizable,
      int quantity});

  @override
  $MenuItemMetaCopyWith<$Res> get meta;
  @override
  $PriceInfoCopyWith<$Res> get priceInfo;
  @override
  $NutritionalInfoCopyWith<$Res>? get nutritionalInfo;
}

/// @nodoc
class __$$MenuItemImplCopyWithImpl<$Res>
    extends _$MenuItemCopyWithImpl<$Res, _$MenuItemImpl>
    implements _$$MenuItemImplCopyWith<$Res> {
  __$$MenuItemImplCopyWithImpl(
      _$MenuItemImpl _value, $Res Function(_$MenuItemImpl) _then)
      : super(_value, _then);

  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? id = null,
    Object? categoryId = null,
    Object? meta = null,
    Object? priceInfo = null,
    Object? variants = null,
    Object? addons = null,
    Object? nutritionalInfo = freezed,
    Object? allergenTags = null,
    Object? isInStock = null,
    Object? isCustomizable = null,
    Object? quantity = null,
  }) {
    return _then(_$MenuItemImpl(
      id: null == id
          ? _value.id
          : id // ignore: cast_nullable_to_non_nullable
              as String,
      categoryId: null == categoryId
          ? _value.categoryId
          : categoryId // ignore: cast_nullable_to_non_nullable
              as String,
      meta: null == meta
          ? _value.meta
          : meta // ignore: cast_nullable_to_non_nullable
              as MenuItemMeta,
      priceInfo: null == priceInfo
          ? _value.priceInfo
          : priceInfo // ignore: cast_nullable_to_non_nullable
              as PriceInfo,
      variants: null == variants
          ? _value._variants
          : variants // ignore: cast_nullable_to_non_nullable
              as List<Variant>,
      addons: null == addons
          ? _value._addons
          : addons // ignore: cast_nullable_to_non_nullable
              as List<Addon>,
      nutritionalInfo: freezed == nutritionalInfo
          ? _value.nutritionalInfo
          : nutritionalInfo // ignore: cast_nullable_to_non_nullable
              as NutritionalInfo?,
      allergenTags: null == allergenTags
          ? _value._allergenTags
          : allergenTags // ignore: cast_nullable_to_non_nullable
              as List<String>,
      isInStock: null == isInStock
          ? _value.isInStock
          : isInStock // ignore: cast_nullable_to_non_nullable
              as bool,
      isCustomizable: null == isCustomizable
          ? _value.isCustomizable
          : isCustomizable // ignore: cast_nullable_to_non_nullable
              as bool,
      quantity: null == quantity
          ? _value.quantity
          : quantity // ignore: cast_nullable_to_non_nullable
              as int,
    ));
  }
}

/// @nodoc
@JsonSerializable()
class _$MenuItemImpl implements _MenuItem {
  _$MenuItemImpl(
      {@JsonKey(name: 'menuItemId') required this.id,
      required this.categoryId,
      required this.meta,
      required this.priceInfo,
      final List<Variant> variants = const [],
      final List<Addon> addons = const [],
      this.nutritionalInfo,
      final List<String> allergenTags = const [],
      required this.isInStock,
      required this.isCustomizable,
      this.quantity = 0})
      : _variants = variants,
        _addons = addons,
        _allergenTags = allergenTags;

  factory _$MenuItemImpl.fromJson(Map<String, dynamic> json) =>
      _$$MenuItemImplFromJson(json);

  @override
  @JsonKey(name: 'menuItemId')
  final String id;
  @override
  final String categoryId;
  @override
  final MenuItemMeta meta;
  @override
  final PriceInfo priceInfo;
  final List<Variant> _variants;
  @override
  @JsonKey()
  List<Variant> get variants {
    if (_variants is EqualUnmodifiableListView) return _variants;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableListView(_variants);
  }

  final List<Addon> _addons;
  @override
  @JsonKey()
  List<Addon> get addons {
    if (_addons is EqualUnmodifiableListView) return _addons;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableListView(_addons);
  }

  @override
  final NutritionalInfo? nutritionalInfo;
  final List<String> _allergenTags;
  @override
  @JsonKey()
  List<String> get allergenTags {
    if (_allergenTags is EqualUnmodifiableListView) return _allergenTags;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableListView(_allergenTags);
  }

  @override
  final bool isInStock;
  @override
  final bool isCustomizable;
  @override
  @JsonKey()
  final int quantity;

  @override
  String toString() {
    return 'MenuItem(id: $id, categoryId: $categoryId, meta: $meta, priceInfo: $priceInfo, variants: $variants, addons: $addons, nutritionalInfo: $nutritionalInfo, allergenTags: $allergenTags, isInStock: $isInStock, isCustomizable: $isCustomizable, quantity: $quantity)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$MenuItemImpl &&
            (identical(other.id, id) || other.id == id) &&
            (identical(other.categoryId, categoryId) ||
                other.categoryId == categoryId) &&
            (identical(other.meta, meta) || other.meta == meta) &&
            (identical(other.priceInfo, priceInfo) ||
                other.priceInfo == priceInfo) &&
            const DeepCollectionEquality().equals(other._variants, _variants) &&
            const DeepCollectionEquality().equals(other._addons, _addons) &&
            (identical(other.nutritionalInfo, nutritionalInfo) ||
                other.nutritionalInfo == nutritionalInfo) &&
            const DeepCollectionEquality()
                .equals(other._allergenTags, _allergenTags) &&
            (identical(other.isInStock, isInStock) ||
                other.isInStock == isInStock) &&
            (identical(other.isCustomizable, isCustomizable) ||
                other.isCustomizable == isCustomizable) &&
            (identical(other.quantity, quantity) ||
                other.quantity == quantity));
  }

  @JsonKey(ignore: true)
  @override
  int get hashCode => Object.hash(
      runtimeType,
      id,
      categoryId,
      meta,
      priceInfo,
      const DeepCollectionEquality().hash(_variants),
      const DeepCollectionEquality().hash(_addons),
      nutritionalInfo,
      const DeepCollectionEquality().hash(_allergenTags),
      isInStock,
      isCustomizable,
      quantity);

  @JsonKey(ignore: true)
  @override
  @pragma('vm:prefer-inline')
  _$$MenuItemImplCopyWith<_$MenuItemImpl> get copyWith =>
      __$$MenuItemImplCopyWithImpl<_$MenuItemImpl>(this, _$identity);

  @override
  Map<String, dynamic> toJson() {
    return _$$MenuItemImplToJson(
      this,
    );
  }
}

abstract class _MenuItem implements MenuItem {
  factory _MenuItem(
      {@JsonKey(name: 'menuItemId') required final String id,
      required final String categoryId,
      required final MenuItemMeta meta,
      required final PriceInfo priceInfo,
      final List<Variant> variants,
      final List<Addon> addons,
      final NutritionalInfo? nutritionalInfo,
      final List<String> allergenTags,
      required final bool isInStock,
      required final bool isCustomizable,
      final int quantity}) = _$MenuItemImpl;

  factory _MenuItem.fromJson(Map<String, dynamic> json) =
      _$MenuItemImpl.fromJson;

  @override
  @JsonKey(name: 'menuItemId')
  String get id;
  @override
  String get categoryId;
  @override
  MenuItemMeta get meta;
  @override
  PriceInfo get priceInfo;
  @override
  List<Variant> get variants;
  @override
  List<Addon> get addons;
  @override
  NutritionalInfo? get nutritionalInfo;
  @override
  List<String> get allergenTags;
  @override
  bool get isInStock;
  @override
  bool get isCustomizable;
  @override
  int get quantity;
  @override
  @JsonKey(ignore: true)
  _$$MenuItemImplCopyWith<_$MenuItemImpl> get copyWith =>
      throw _privateConstructorUsedError;
}

MenuItemMeta _$MenuItemMetaFromJson(Map<String, dynamic> json) {
  return _MenuItemMeta.fromJson(json);
}

/// @nodoc
mixin _$MenuItemMeta {
  String get name => throw _privateConstructorUsedError;
  String get description => throw _privateConstructorUsedError;
  String get categoryName => throw _privateConstructorUsedError;
  String? get image => throw _privateConstructorUsedError;

  Map<String, dynamic> toJson() => throw _privateConstructorUsedError;
  @JsonKey(ignore: true)
  $MenuItemMetaCopyWith<MenuItemMeta> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $MenuItemMetaCopyWith<$Res> {
  factory $MenuItemMetaCopyWith(
          MenuItemMeta value, $Res Function(MenuItemMeta) then) =
      _$MenuItemMetaCopyWithImpl<$Res, MenuItemMeta>;
  @useResult
  $Res call(
      {String name, String description, String categoryName, String? image});
}

/// @nodoc
class _$MenuItemMetaCopyWithImpl<$Res, $Val extends MenuItemMeta>
    implements $MenuItemMetaCopyWith<$Res> {
  _$MenuItemMetaCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? name = null,
    Object? description = null,
    Object? categoryName = null,
    Object? image = freezed,
  }) {
    return _then(_value.copyWith(
      name: null == name
          ? _value.name
          : name // ignore: cast_nullable_to_non_nullable
              as String,
      description: null == description
          ? _value.description
          : description // ignore: cast_nullable_to_non_nullable
              as String,
      categoryName: null == categoryName
          ? _value.categoryName
          : categoryName // ignore: cast_nullable_to_non_nullable
              as String,
      image: freezed == image
          ? _value.image
          : image // ignore: cast_nullable_to_non_nullable
              as String?,
    ) as $Val);
  }
}

/// @nodoc
abstract class _$$MenuItemMetaImplCopyWith<$Res>
    implements $MenuItemMetaCopyWith<$Res> {
  factory _$$MenuItemMetaImplCopyWith(
          _$MenuItemMetaImpl value, $Res Function(_$MenuItemMetaImpl) then) =
      __$$MenuItemMetaImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call(
      {String name, String description, String categoryName, String? image});
}

/// @nodoc
class __$$MenuItemMetaImplCopyWithImpl<$Res>
    extends _$MenuItemMetaCopyWithImpl<$Res, _$MenuItemMetaImpl>
    implements _$$MenuItemMetaImplCopyWith<$Res> {
  __$$MenuItemMetaImplCopyWithImpl(
      _$MenuItemMetaImpl _value, $Res Function(_$MenuItemMetaImpl) _then)
      : super(_value, _then);

  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? name = null,
    Object? description = null,
    Object? categoryName = null,
    Object? image = freezed,
  }) {
    return _then(_$MenuItemMetaImpl(
      name: null == name
          ? _value.name
          : name // ignore: cast_nullable_to_non_nullable
              as String,
      description: null == description
          ? _value.description
          : description // ignore: cast_nullable_to_non_nullable
              as String,
      categoryName: null == categoryName
          ? _value.categoryName
          : categoryName // ignore: cast_nullable_to_non_nullable
              as String,
      image: freezed == image
          ? _value.image
          : image // ignore: cast_nullable_to_non_nullable
              as String?,
    ));
  }
}

/// @nodoc
@JsonSerializable()
class _$MenuItemMetaImpl implements _MenuItemMeta {
  _$MenuItemMetaImpl(
      {required this.name,
      required this.description,
      required this.categoryName,
      this.image});

  factory _$MenuItemMetaImpl.fromJson(Map<String, dynamic> json) =>
      _$$MenuItemMetaImplFromJson(json);

  @override
  final String name;
  @override
  final String description;
  @override
  final String categoryName;
  @override
  final String? image;

  @override
  String toString() {
    return 'MenuItemMeta(name: $name, description: $description, categoryName: $categoryName, image: $image)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$MenuItemMetaImpl &&
            (identical(other.name, name) || other.name == name) &&
            (identical(other.description, description) ||
                other.description == description) &&
            (identical(other.categoryName, categoryName) ||
                other.categoryName == categoryName) &&
            (identical(other.image, image) || other.image == image));
  }

  @JsonKey(ignore: true)
  @override
  int get hashCode =>
      Object.hash(runtimeType, name, description, categoryName, image);

  @JsonKey(ignore: true)
  @override
  @pragma('vm:prefer-inline')
  _$$MenuItemMetaImplCopyWith<_$MenuItemMetaImpl> get copyWith =>
      __$$MenuItemMetaImplCopyWithImpl<_$MenuItemMetaImpl>(this, _$identity);

  @override
  Map<String, dynamic> toJson() {
    return _$$MenuItemMetaImplToJson(
      this,
    );
  }
}

abstract class _MenuItemMeta implements MenuItemMeta {
  factory _MenuItemMeta(
      {required final String name,
      required final String description,
      required final String categoryName,
      final String? image}) = _$MenuItemMetaImpl;

  factory _MenuItemMeta.fromJson(Map<String, dynamic> json) =
      _$MenuItemMetaImpl.fromJson;

  @override
  String get name;
  @override
  String get description;
  @override
  String get categoryName;
  @override
  String? get image;
  @override
  @JsonKey(ignore: true)
  _$$MenuItemMetaImplCopyWith<_$MenuItemMetaImpl> get copyWith =>
      throw _privateConstructorUsedError;
}

PriceInfo _$PriceInfoFromJson(Map<String, dynamic> json) {
  return _PriceInfo.fromJson(json);
}

/// @nodoc
mixin _$PriceInfo {
  num get basePrice => throw _privateConstructorUsedError;
  num get discount => throw _privateConstructorUsedError;
  num get finalPrice => throw _privateConstructorUsedError;

  Map<String, dynamic> toJson() => throw _privateConstructorUsedError;
  @JsonKey(ignore: true)
  $PriceInfoCopyWith<PriceInfo> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $PriceInfoCopyWith<$Res> {
  factory $PriceInfoCopyWith(PriceInfo value, $Res Function(PriceInfo) then) =
      _$PriceInfoCopyWithImpl<$Res, PriceInfo>;
  @useResult
  $Res call({num basePrice, num discount, num finalPrice});
}

/// @nodoc
class _$PriceInfoCopyWithImpl<$Res, $Val extends PriceInfo>
    implements $PriceInfoCopyWith<$Res> {
  _$PriceInfoCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? basePrice = null,
    Object? discount = null,
    Object? finalPrice = null,
  }) {
    return _then(_value.copyWith(
      basePrice: null == basePrice
          ? _value.basePrice
          : basePrice // ignore: cast_nullable_to_non_nullable
              as num,
      discount: null == discount
          ? _value.discount
          : discount // ignore: cast_nullable_to_non_nullable
              as num,
      finalPrice: null == finalPrice
          ? _value.finalPrice
          : finalPrice // ignore: cast_nullable_to_non_nullable
              as num,
    ) as $Val);
  }
}

/// @nodoc
abstract class _$$PriceInfoImplCopyWith<$Res>
    implements $PriceInfoCopyWith<$Res> {
  factory _$$PriceInfoImplCopyWith(
          _$PriceInfoImpl value, $Res Function(_$PriceInfoImpl) then) =
      __$$PriceInfoImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call({num basePrice, num discount, num finalPrice});
}

/// @nodoc
class __$$PriceInfoImplCopyWithImpl<$Res>
    extends _$PriceInfoCopyWithImpl<$Res, _$PriceInfoImpl>
    implements _$$PriceInfoImplCopyWith<$Res> {
  __$$PriceInfoImplCopyWithImpl(
      _$PriceInfoImpl _value, $Res Function(_$PriceInfoImpl) _then)
      : super(_value, _then);

  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? basePrice = null,
    Object? discount = null,
    Object? finalPrice = null,
  }) {
    return _then(_$PriceInfoImpl(
      basePrice: null == basePrice
          ? _value.basePrice
          : basePrice // ignore: cast_nullable_to_non_nullable
              as num,
      discount: null == discount
          ? _value.discount
          : discount // ignore: cast_nullable_to_non_nullable
              as num,
      finalPrice: null == finalPrice
          ? _value.finalPrice
          : finalPrice // ignore: cast_nullable_to_non_nullable
              as num,
    ));
  }
}

/// @nodoc
@JsonSerializable()
class _$PriceInfoImpl implements _PriceInfo {
  _$PriceInfoImpl(
      {required this.basePrice,
      required this.discount,
      required this.finalPrice});

  factory _$PriceInfoImpl.fromJson(Map<String, dynamic> json) =>
      _$$PriceInfoImplFromJson(json);

  @override
  final num basePrice;
  @override
  final num discount;
  @override
  final num finalPrice;

  @override
  String toString() {
    return 'PriceInfo(basePrice: $basePrice, discount: $discount, finalPrice: $finalPrice)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$PriceInfoImpl &&
            (identical(other.basePrice, basePrice) ||
                other.basePrice == basePrice) &&
            (identical(other.discount, discount) ||
                other.discount == discount) &&
            (identical(other.finalPrice, finalPrice) ||
                other.finalPrice == finalPrice));
  }

  @JsonKey(ignore: true)
  @override
  int get hashCode => Object.hash(runtimeType, basePrice, discount, finalPrice);

  @JsonKey(ignore: true)
  @override
  @pragma('vm:prefer-inline')
  _$$PriceInfoImplCopyWith<_$PriceInfoImpl> get copyWith =>
      __$$PriceInfoImplCopyWithImpl<_$PriceInfoImpl>(this, _$identity);

  @override
  Map<String, dynamic> toJson() {
    return _$$PriceInfoImplToJson(
      this,
    );
  }
}

abstract class _PriceInfo implements PriceInfo {
  factory _PriceInfo(
      {required final num basePrice,
      required final num discount,
      required final num finalPrice}) = _$PriceInfoImpl;

  factory _PriceInfo.fromJson(Map<String, dynamic> json) =
      _$PriceInfoImpl.fromJson;

  @override
  num get basePrice;
  @override
  num get discount;
  @override
  num get finalPrice;
  @override
  @JsonKey(ignore: true)
  _$$PriceInfoImplCopyWith<_$PriceInfoImpl> get copyWith =>
      throw _privateConstructorUsedError;
}

Variant _$VariantFromJson(Map<String, dynamic> json) {
  return _Variant.fromJson(json);
}

/// @nodoc
mixin _$Variant {
  String get id => throw _privateConstructorUsedError;
  VariantMeta get meta => throw _privateConstructorUsedError;
  List<VariantOption> get options => throw _privateConstructorUsedError;
  bool get respectParentDiscount => throw _privateConstructorUsedError;
  List<String> get itemsAssociatedWith => throw _privateConstructorUsedError;
  bool get isMandatory => throw _privateConstructorUsedError;
  String get name => throw _privateConstructorUsedError;

  Map<String, dynamic> toJson() => throw _privateConstructorUsedError;
  @JsonKey(ignore: true)
  $VariantCopyWith<Variant> get copyWith => throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $VariantCopyWith<$Res> {
  factory $VariantCopyWith(Variant value, $Res Function(Variant) then) =
      _$VariantCopyWithImpl<$Res, Variant>;
  @useResult
  $Res call(
      {String id,
      VariantMeta meta,
      List<VariantOption> options,
      bool respectParentDiscount,
      List<String> itemsAssociatedWith,
      bool isMandatory,
      String name});

  $VariantMetaCopyWith<$Res> get meta;
}

/// @nodoc
class _$VariantCopyWithImpl<$Res, $Val extends Variant>
    implements $VariantCopyWith<$Res> {
  _$VariantCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? id = null,
    Object? meta = null,
    Object? options = null,
    Object? respectParentDiscount = null,
    Object? itemsAssociatedWith = null,
    Object? isMandatory = null,
    Object? name = null,
  }) {
    return _then(_value.copyWith(
      id: null == id
          ? _value.id
          : id // ignore: cast_nullable_to_non_nullable
              as String,
      meta: null == meta
          ? _value.meta
          : meta // ignore: cast_nullable_to_non_nullable
              as VariantMeta,
      options: null == options
          ? _value.options
          : options // ignore: cast_nullable_to_non_nullable
              as List<VariantOption>,
      respectParentDiscount: null == respectParentDiscount
          ? _value.respectParentDiscount
          : respectParentDiscount // ignore: cast_nullable_to_non_nullable
              as bool,
      itemsAssociatedWith: null == itemsAssociatedWith
          ? _value.itemsAssociatedWith
          : itemsAssociatedWith // ignore: cast_nullable_to_non_nullable
              as List<String>,
      isMandatory: null == isMandatory
          ? _value.isMandatory
          : isMandatory // ignore: cast_nullable_to_non_nullable
              as bool,
      name: null == name
          ? _value.name
          : name // ignore: cast_nullable_to_non_nullable
              as String,
    ) as $Val);
  }

  @override
  @pragma('vm:prefer-inline')
  $VariantMetaCopyWith<$Res> get meta {
    return $VariantMetaCopyWith<$Res>(_value.meta, (value) {
      return _then(_value.copyWith(meta: value) as $Val);
    });
  }
}

/// @nodoc
abstract class _$$VariantImplCopyWith<$Res> implements $VariantCopyWith<$Res> {
  factory _$$VariantImplCopyWith(
          _$VariantImpl value, $Res Function(_$VariantImpl) then) =
      __$$VariantImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call(
      {String id,
      VariantMeta meta,
      List<VariantOption> options,
      bool respectParentDiscount,
      List<String> itemsAssociatedWith,
      bool isMandatory,
      String name});

  @override
  $VariantMetaCopyWith<$Res> get meta;
}

/// @nodoc
class __$$VariantImplCopyWithImpl<$Res>
    extends _$VariantCopyWithImpl<$Res, _$VariantImpl>
    implements _$$VariantImplCopyWith<$Res> {
  __$$VariantImplCopyWithImpl(
      _$VariantImpl _value, $Res Function(_$VariantImpl) _then)
      : super(_value, _then);

  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? id = null,
    Object? meta = null,
    Object? options = null,
    Object? respectParentDiscount = null,
    Object? itemsAssociatedWith = null,
    Object? isMandatory = null,
    Object? name = null,
  }) {
    return _then(_$VariantImpl(
      id: null == id
          ? _value.id
          : id // ignore: cast_nullable_to_non_nullable
              as String,
      meta: null == meta
          ? _value.meta
          : meta // ignore: cast_nullable_to_non_nullable
              as VariantMeta,
      options: null == options
          ? _value._options
          : options // ignore: cast_nullable_to_non_nullable
              as List<VariantOption>,
      respectParentDiscount: null == respectParentDiscount
          ? _value.respectParentDiscount
          : respectParentDiscount // ignore: cast_nullable_to_non_nullable
              as bool,
      itemsAssociatedWith: null == itemsAssociatedWith
          ? _value._itemsAssociatedWith
          : itemsAssociatedWith // ignore: cast_nullable_to_non_nullable
              as List<String>,
      isMandatory: null == isMandatory
          ? _value.isMandatory
          : isMandatory // ignore: cast_nullable_to_non_nullable
              as bool,
      name: null == name
          ? _value.name
          : name // ignore: cast_nullable_to_non_nullable
              as String,
    ));
  }
}

/// @nodoc
@JsonSerializable()
class _$VariantImpl implements _Variant {
  _$VariantImpl(
      {required this.id,
      required this.meta,
      required final List<VariantOption> options,
      required this.respectParentDiscount,
      required final List<String> itemsAssociatedWith,
      required this.isMandatory,
      required this.name})
      : _options = options,
        _itemsAssociatedWith = itemsAssociatedWith;

  factory _$VariantImpl.fromJson(Map<String, dynamic> json) =>
      _$$VariantImplFromJson(json);

  @override
  final String id;
  @override
  final VariantMeta meta;
  final List<VariantOption> _options;
  @override
  List<VariantOption> get options {
    if (_options is EqualUnmodifiableListView) return _options;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableListView(_options);
  }

  @override
  final bool respectParentDiscount;
  final List<String> _itemsAssociatedWith;
  @override
  List<String> get itemsAssociatedWith {
    if (_itemsAssociatedWith is EqualUnmodifiableListView)
      return _itemsAssociatedWith;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableListView(_itemsAssociatedWith);
  }

  @override
  final bool isMandatory;
  @override
  final String name;

  @override
  String toString() {
    return 'Variant(id: $id, meta: $meta, options: $options, respectParentDiscount: $respectParentDiscount, itemsAssociatedWith: $itemsAssociatedWith, isMandatory: $isMandatory, name: $name)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$VariantImpl &&
            (identical(other.id, id) || other.id == id) &&
            (identical(other.meta, meta) || other.meta == meta) &&
            const DeepCollectionEquality().equals(other._options, _options) &&
            (identical(other.respectParentDiscount, respectParentDiscount) ||
                other.respectParentDiscount == respectParentDiscount) &&
            const DeepCollectionEquality()
                .equals(other._itemsAssociatedWith, _itemsAssociatedWith) &&
            (identical(other.isMandatory, isMandatory) ||
                other.isMandatory == isMandatory) &&
            (identical(other.name, name) || other.name == name));
  }

  @JsonKey(ignore: true)
  @override
  int get hashCode => Object.hash(
      runtimeType,
      id,
      meta,
      const DeepCollectionEquality().hash(_options),
      respectParentDiscount,
      const DeepCollectionEquality().hash(_itemsAssociatedWith),
      isMandatory,
      name);

  @JsonKey(ignore: true)
  @override
  @pragma('vm:prefer-inline')
  _$$VariantImplCopyWith<_$VariantImpl> get copyWith =>
      __$$VariantImplCopyWithImpl<_$VariantImpl>(this, _$identity);

  @override
  Map<String, dynamic> toJson() {
    return _$$VariantImplToJson(
      this,
    );
  }
}

abstract class _Variant implements Variant {
  factory _Variant(
      {required final String id,
      required final VariantMeta meta,
      required final List<VariantOption> options,
      required final bool respectParentDiscount,
      required final List<String> itemsAssociatedWith,
      required final bool isMandatory,
      required final String name}) = _$VariantImpl;

  factory _Variant.fromJson(Map<String, dynamic> json) = _$VariantImpl.fromJson;

  @override
  String get id;
  @override
  VariantMeta get meta;
  @override
  List<VariantOption> get options;
  @override
  bool get respectParentDiscount;
  @override
  List<String> get itemsAssociatedWith;
  @override
  bool get isMandatory;
  @override
  String get name;
  @override
  @JsonKey(ignore: true)
  _$$VariantImplCopyWith<_$VariantImpl> get copyWith =>
      throw _privateConstructorUsedError;
}

VariantOption _$VariantOptionFromJson(Map<String, dynamic> json) {
  return _VariantOption.fromJson(json);
}

/// @nodoc
mixin _$VariantOption {
  String get id => throw _privateConstructorUsedError;
  String get name => throw _privateConstructorUsedError;
  PriceInfo get priceInfo => throw _privateConstructorUsedError;

  Map<String, dynamic> toJson() => throw _privateConstructorUsedError;
  @JsonKey(ignore: true)
  $VariantOptionCopyWith<VariantOption> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $VariantOptionCopyWith<$Res> {
  factory $VariantOptionCopyWith(
          VariantOption value, $Res Function(VariantOption) then) =
      _$VariantOptionCopyWithImpl<$Res, VariantOption>;
  @useResult
  $Res call({String id, String name, PriceInfo priceInfo});

  $PriceInfoCopyWith<$Res> get priceInfo;
}

/// @nodoc
class _$VariantOptionCopyWithImpl<$Res, $Val extends VariantOption>
    implements $VariantOptionCopyWith<$Res> {
  _$VariantOptionCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? id = null,
    Object? name = null,
    Object? priceInfo = null,
  }) {
    return _then(_value.copyWith(
      id: null == id
          ? _value.id
          : id // ignore: cast_nullable_to_non_nullable
              as String,
      name: null == name
          ? _value.name
          : name // ignore: cast_nullable_to_non_nullable
              as String,
      priceInfo: null == priceInfo
          ? _value.priceInfo
          : priceInfo // ignore: cast_nullable_to_non_nullable
              as PriceInfo,
    ) as $Val);
  }

  @override
  @pragma('vm:prefer-inline')
  $PriceInfoCopyWith<$Res> get priceInfo {
    return $PriceInfoCopyWith<$Res>(_value.priceInfo, (value) {
      return _then(_value.copyWith(priceInfo: value) as $Val);
    });
  }
}

/// @nodoc
abstract class _$$VariantOptionImplCopyWith<$Res>
    implements $VariantOptionCopyWith<$Res> {
  factory _$$VariantOptionImplCopyWith(
          _$VariantOptionImpl value, $Res Function(_$VariantOptionImpl) then) =
      __$$VariantOptionImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call({String id, String name, PriceInfo priceInfo});

  @override
  $PriceInfoCopyWith<$Res> get priceInfo;
}

/// @nodoc
class __$$VariantOptionImplCopyWithImpl<$Res>
    extends _$VariantOptionCopyWithImpl<$Res, _$VariantOptionImpl>
    implements _$$VariantOptionImplCopyWith<$Res> {
  __$$VariantOptionImplCopyWithImpl(
      _$VariantOptionImpl _value, $Res Function(_$VariantOptionImpl) _then)
      : super(_value, _then);

  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? id = null,
    Object? name = null,
    Object? priceInfo = null,
  }) {
    return _then(_$VariantOptionImpl(
      id: null == id
          ? _value.id
          : id // ignore: cast_nullable_to_non_nullable
              as String,
      name: null == name
          ? _value.name
          : name // ignore: cast_nullable_to_non_nullable
              as String,
      priceInfo: null == priceInfo
          ? _value.priceInfo
          : priceInfo // ignore: cast_nullable_to_non_nullable
              as PriceInfo,
    ));
  }
}

/// @nodoc
@JsonSerializable()
class _$VariantOptionImpl implements _VariantOption {
  _$VariantOptionImpl(
      {required this.id, required this.name, required this.priceInfo});

  factory _$VariantOptionImpl.fromJson(Map<String, dynamic> json) =>
      _$$VariantOptionImplFromJson(json);

  @override
  final String id;
  @override
  final String name;
  @override
  final PriceInfo priceInfo;

  @override
  String toString() {
    return 'VariantOption(id: $id, name: $name, priceInfo: $priceInfo)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$VariantOptionImpl &&
            (identical(other.id, id) || other.id == id) &&
            (identical(other.name, name) || other.name == name) &&
            (identical(other.priceInfo, priceInfo) ||
                other.priceInfo == priceInfo));
  }

  @JsonKey(ignore: true)
  @override
  int get hashCode => Object.hash(runtimeType, id, name, priceInfo);

  @JsonKey(ignore: true)
  @override
  @pragma('vm:prefer-inline')
  _$$VariantOptionImplCopyWith<_$VariantOptionImpl> get copyWith =>
      __$$VariantOptionImplCopyWithImpl<_$VariantOptionImpl>(this, _$identity);

  @override
  Map<String, dynamic> toJson() {
    return _$$VariantOptionImplToJson(
      this,
    );
  }
}

abstract class _VariantOption implements VariantOption {
  factory _VariantOption(
      {required final String id,
      required final String name,
      required final PriceInfo priceInfo}) = _$VariantOptionImpl;

  factory _VariantOption.fromJson(Map<String, dynamic> json) =
      _$VariantOptionImpl.fromJson;

  @override
  String get id;
  @override
  String get name;
  @override
  PriceInfo get priceInfo;
  @override
  @JsonKey(ignore: true)
  _$$VariantOptionImplCopyWith<_$VariantOptionImpl> get copyWith =>
      throw _privateConstructorUsedError;
}

Addon _$AddonFromJson(Map<String, dynamic> json) {
  return _Addon.fromJson(json);
}

/// @nodoc
mixin _$Addon {
  String get id => throw _privateConstructorUsedError;
  PriceInfo get priceInfo => throw _privateConstructorUsedError;
  AddonMeta get meta => throw _privateConstructorUsedError;
  bool get respectParentDiscount => throw _privateConstructorUsedError;
  bool get isInStock => throw _privateConstructorUsedError;
  List<String> get itemsAssociatedWith => throw _privateConstructorUsedError;
  bool get isMandatory => throw _privateConstructorUsedError;

  Map<String, dynamic> toJson() => throw _privateConstructorUsedError;
  @JsonKey(ignore: true)
  $AddonCopyWith<Addon> get copyWith => throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $AddonCopyWith<$Res> {
  factory $AddonCopyWith(Addon value, $Res Function(Addon) then) =
      _$AddonCopyWithImpl<$Res, Addon>;
  @useResult
  $Res call(
      {String id,
      PriceInfo priceInfo,
      AddonMeta meta,
      bool respectParentDiscount,
      bool isInStock,
      List<String> itemsAssociatedWith,
      bool isMandatory});

  $PriceInfoCopyWith<$Res> get priceInfo;
  $AddonMetaCopyWith<$Res> get meta;
}

/// @nodoc
class _$AddonCopyWithImpl<$Res, $Val extends Addon>
    implements $AddonCopyWith<$Res> {
  _$AddonCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? id = null,
    Object? priceInfo = null,
    Object? meta = null,
    Object? respectParentDiscount = null,
    Object? isInStock = null,
    Object? itemsAssociatedWith = null,
    Object? isMandatory = null,
  }) {
    return _then(_value.copyWith(
      id: null == id
          ? _value.id
          : id // ignore: cast_nullable_to_non_nullable
              as String,
      priceInfo: null == priceInfo
          ? _value.priceInfo
          : priceInfo // ignore: cast_nullable_to_non_nullable
              as PriceInfo,
      meta: null == meta
          ? _value.meta
          : meta // ignore: cast_nullable_to_non_nullable
              as AddonMeta,
      respectParentDiscount: null == respectParentDiscount
          ? _value.respectParentDiscount
          : respectParentDiscount // ignore: cast_nullable_to_non_nullable
              as bool,
      isInStock: null == isInStock
          ? _value.isInStock
          : isInStock // ignore: cast_nullable_to_non_nullable
              as bool,
      itemsAssociatedWith: null == itemsAssociatedWith
          ? _value.itemsAssociatedWith
          : itemsAssociatedWith // ignore: cast_nullable_to_non_nullable
              as List<String>,
      isMandatory: null == isMandatory
          ? _value.isMandatory
          : isMandatory // ignore: cast_nullable_to_non_nullable
              as bool,
    ) as $Val);
  }

  @override
  @pragma('vm:prefer-inline')
  $PriceInfoCopyWith<$Res> get priceInfo {
    return $PriceInfoCopyWith<$Res>(_value.priceInfo, (value) {
      return _then(_value.copyWith(priceInfo: value) as $Val);
    });
  }

  @override
  @pragma('vm:prefer-inline')
  $AddonMetaCopyWith<$Res> get meta {
    return $AddonMetaCopyWith<$Res>(_value.meta, (value) {
      return _then(_value.copyWith(meta: value) as $Val);
    });
  }
}

/// @nodoc
abstract class _$$AddonImplCopyWith<$Res> implements $AddonCopyWith<$Res> {
  factory _$$AddonImplCopyWith(
          _$AddonImpl value, $Res Function(_$AddonImpl) then) =
      __$$AddonImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call(
      {String id,
      PriceInfo priceInfo,
      AddonMeta meta,
      bool respectParentDiscount,
      bool isInStock,
      List<String> itemsAssociatedWith,
      bool isMandatory});

  @override
  $PriceInfoCopyWith<$Res> get priceInfo;
  @override
  $AddonMetaCopyWith<$Res> get meta;
}

/// @nodoc
class __$$AddonImplCopyWithImpl<$Res>
    extends _$AddonCopyWithImpl<$Res, _$AddonImpl>
    implements _$$AddonImplCopyWith<$Res> {
  __$$AddonImplCopyWithImpl(
      _$AddonImpl _value, $Res Function(_$AddonImpl) _then)
      : super(_value, _then);

  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? id = null,
    Object? priceInfo = null,
    Object? meta = null,
    Object? respectParentDiscount = null,
    Object? isInStock = null,
    Object? itemsAssociatedWith = null,
    Object? isMandatory = null,
  }) {
    return _then(_$AddonImpl(
      id: null == id
          ? _value.id
          : id // ignore: cast_nullable_to_non_nullable
              as String,
      priceInfo: null == priceInfo
          ? _value.priceInfo
          : priceInfo // ignore: cast_nullable_to_non_nullable
              as PriceInfo,
      meta: null == meta
          ? _value.meta
          : meta // ignore: cast_nullable_to_non_nullable
              as AddonMeta,
      respectParentDiscount: null == respectParentDiscount
          ? _value.respectParentDiscount
          : respectParentDiscount // ignore: cast_nullable_to_non_nullable
              as bool,
      isInStock: null == isInStock
          ? _value.isInStock
          : isInStock // ignore: cast_nullable_to_non_nullable
              as bool,
      itemsAssociatedWith: null == itemsAssociatedWith
          ? _value._itemsAssociatedWith
          : itemsAssociatedWith // ignore: cast_nullable_to_non_nullable
              as List<String>,
      isMandatory: null == isMandatory
          ? _value.isMandatory
          : isMandatory // ignore: cast_nullable_to_non_nullable
              as bool,
    ));
  }
}

/// @nodoc
@JsonSerializable()
class _$AddonImpl implements _Addon {
  _$AddonImpl(
      {required this.id,
      required this.priceInfo,
      required this.meta,
      required this.respectParentDiscount,
      required this.isInStock,
      required final List<String> itemsAssociatedWith,
      required this.isMandatory})
      : _itemsAssociatedWith = itemsAssociatedWith;

  factory _$AddonImpl.fromJson(Map<String, dynamic> json) =>
      _$$AddonImplFromJson(json);

  @override
  final String id;
  @override
  final PriceInfo priceInfo;
  @override
  final AddonMeta meta;
  @override
  final bool respectParentDiscount;
  @override
  final bool isInStock;
  final List<String> _itemsAssociatedWith;
  @override
  List<String> get itemsAssociatedWith {
    if (_itemsAssociatedWith is EqualUnmodifiableListView)
      return _itemsAssociatedWith;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableListView(_itemsAssociatedWith);
  }

  @override
  final bool isMandatory;

  @override
  String toString() {
    return 'Addon(id: $id, priceInfo: $priceInfo, meta: $meta, respectParentDiscount: $respectParentDiscount, isInStock: $isInStock, itemsAssociatedWith: $itemsAssociatedWith, isMandatory: $isMandatory)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$AddonImpl &&
            (identical(other.id, id) || other.id == id) &&
            (identical(other.priceInfo, priceInfo) ||
                other.priceInfo == priceInfo) &&
            (identical(other.meta, meta) || other.meta == meta) &&
            (identical(other.respectParentDiscount, respectParentDiscount) ||
                other.respectParentDiscount == respectParentDiscount) &&
            (identical(other.isInStock, isInStock) ||
                other.isInStock == isInStock) &&
            const DeepCollectionEquality()
                .equals(other._itemsAssociatedWith, _itemsAssociatedWith) &&
            (identical(other.isMandatory, isMandatory) ||
                other.isMandatory == isMandatory));
  }

  @JsonKey(ignore: true)
  @override
  int get hashCode => Object.hash(
      runtimeType,
      id,
      priceInfo,
      meta,
      respectParentDiscount,
      isInStock,
      const DeepCollectionEquality().hash(_itemsAssociatedWith),
      isMandatory);

  @JsonKey(ignore: true)
  @override
  @pragma('vm:prefer-inline')
  _$$AddonImplCopyWith<_$AddonImpl> get copyWith =>
      __$$AddonImplCopyWithImpl<_$AddonImpl>(this, _$identity);

  @override
  Map<String, dynamic> toJson() {
    return _$$AddonImplToJson(
      this,
    );
  }
}

abstract class _Addon implements Addon {
  factory _Addon(
      {required final String id,
      required final PriceInfo priceInfo,
      required final AddonMeta meta,
      required final bool respectParentDiscount,
      required final bool isInStock,
      required final List<String> itemsAssociatedWith,
      required final bool isMandatory}) = _$AddonImpl;

  factory _Addon.fromJson(Map<String, dynamic> json) = _$AddonImpl.fromJson;

  @override
  String get id;
  @override
  PriceInfo get priceInfo;
  @override
  AddonMeta get meta;
  @override
  bool get respectParentDiscount;
  @override
  bool get isInStock;
  @override
  List<String> get itemsAssociatedWith;
  @override
  bool get isMandatory;
  @override
  @JsonKey(ignore: true)
  _$$AddonImplCopyWith<_$AddonImpl> get copyWith =>
      throw _privateConstructorUsedError;
}

NutritionalInfo _$NutritionalInfoFromJson(Map<String, dynamic> json) {
  return _NutritionalInfo.fromJson(json);
}

/// @nodoc
mixin _$NutritionalInfo {
  int get carbs => throw _privateConstructorUsedError;
  int get protein => throw _privateConstructorUsedError;
  int get fat => throw _privateConstructorUsedError;
  int get calories => throw _privateConstructorUsedError;

  Map<String, dynamic> toJson() => throw _privateConstructorUsedError;
  @JsonKey(ignore: true)
  $NutritionalInfoCopyWith<NutritionalInfo> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $NutritionalInfoCopyWith<$Res> {
  factory $NutritionalInfoCopyWith(
          NutritionalInfo value, $Res Function(NutritionalInfo) then) =
      _$NutritionalInfoCopyWithImpl<$Res, NutritionalInfo>;
  @useResult
  $Res call({int carbs, int protein, int fat, int calories});
}

/// @nodoc
class _$NutritionalInfoCopyWithImpl<$Res, $Val extends NutritionalInfo>
    implements $NutritionalInfoCopyWith<$Res> {
  _$NutritionalInfoCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? carbs = null,
    Object? protein = null,
    Object? fat = null,
    Object? calories = null,
  }) {
    return _then(_value.copyWith(
      carbs: null == carbs
          ? _value.carbs
          : carbs // ignore: cast_nullable_to_non_nullable
              as int,
      protein: null == protein
          ? _value.protein
          : protein // ignore: cast_nullable_to_non_nullable
              as int,
      fat: null == fat
          ? _value.fat
          : fat // ignore: cast_nullable_to_non_nullable
              as int,
      calories: null == calories
          ? _value.calories
          : calories // ignore: cast_nullable_to_non_nullable
              as int,
    ) as $Val);
  }
}

/// @nodoc
abstract class _$$NutritionalInfoImplCopyWith<$Res>
    implements $NutritionalInfoCopyWith<$Res> {
  factory _$$NutritionalInfoImplCopyWith(_$NutritionalInfoImpl value,
          $Res Function(_$NutritionalInfoImpl) then) =
      __$$NutritionalInfoImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call({int carbs, int protein, int fat, int calories});
}

/// @nodoc
class __$$NutritionalInfoImplCopyWithImpl<$Res>
    extends _$NutritionalInfoCopyWithImpl<$Res, _$NutritionalInfoImpl>
    implements _$$NutritionalInfoImplCopyWith<$Res> {
  __$$NutritionalInfoImplCopyWithImpl(
      _$NutritionalInfoImpl _value, $Res Function(_$NutritionalInfoImpl) _then)
      : super(_value, _then);

  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? carbs = null,
    Object? protein = null,
    Object? fat = null,
    Object? calories = null,
  }) {
    return _then(_$NutritionalInfoImpl(
      carbs: null == carbs
          ? _value.carbs
          : carbs // ignore: cast_nullable_to_non_nullable
              as int,
      protein: null == protein
          ? _value.protein
          : protein // ignore: cast_nullable_to_non_nullable
              as int,
      fat: null == fat
          ? _value.fat
          : fat // ignore: cast_nullable_to_non_nullable
              as int,
      calories: null == calories
          ? _value.calories
          : calories // ignore: cast_nullable_to_non_nullable
              as int,
    ));
  }
}

/// @nodoc
@JsonSerializable()
class _$NutritionalInfoImpl implements _NutritionalInfo {
  _$NutritionalInfoImpl(
      {required this.carbs,
      required this.protein,
      required this.fat,
      required this.calories});

  factory _$NutritionalInfoImpl.fromJson(Map<String, dynamic> json) =>
      _$$NutritionalInfoImplFromJson(json);

  @override
  final int carbs;
  @override
  final int protein;
  @override
  final int fat;
  @override
  final int calories;

  @override
  String toString() {
    return 'NutritionalInfo(carbs: $carbs, protein: $protein, fat: $fat, calories: $calories)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$NutritionalInfoImpl &&
            (identical(other.carbs, carbs) || other.carbs == carbs) &&
            (identical(other.protein, protein) || other.protein == protein) &&
            (identical(other.fat, fat) || other.fat == fat) &&
            (identical(other.calories, calories) ||
                other.calories == calories));
  }

  @JsonKey(ignore: true)
  @override
  int get hashCode => Object.hash(runtimeType, carbs, protein, fat, calories);

  @JsonKey(ignore: true)
  @override
  @pragma('vm:prefer-inline')
  _$$NutritionalInfoImplCopyWith<_$NutritionalInfoImpl> get copyWith =>
      __$$NutritionalInfoImplCopyWithImpl<_$NutritionalInfoImpl>(
          this, _$identity);

  @override
  Map<String, dynamic> toJson() {
    return _$$NutritionalInfoImplToJson(
      this,
    );
  }
}

abstract class _NutritionalInfo implements NutritionalInfo {
  factory _NutritionalInfo(
      {required final int carbs,
      required final int protein,
      required final int fat,
      required final int calories}) = _$NutritionalInfoImpl;

  factory _NutritionalInfo.fromJson(Map<String, dynamic> json) =
      _$NutritionalInfoImpl.fromJson;

  @override
  int get carbs;
  @override
  int get protein;
  @override
  int get fat;
  @override
  int get calories;
  @override
  @JsonKey(ignore: true)
  _$$NutritionalInfoImplCopyWith<_$NutritionalInfoImpl> get copyWith =>
      throw _privateConstructorUsedError;
}

VariantMeta _$VariantMetaFromJson(Map<String, dynamic> json) {
  return _VariantMeta.fromJson(json);
}

/// @nodoc
mixin _$VariantMeta {
  String get name => throw _privateConstructorUsedError;
  String get description => throw _privateConstructorUsedError;
  List<String> get categoryAssociatedWith => throw _privateConstructorUsedError;

  Map<String, dynamic> toJson() => throw _privateConstructorUsedError;
  @JsonKey(ignore: true)
  $VariantMetaCopyWith<VariantMeta> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $VariantMetaCopyWith<$Res> {
  factory $VariantMetaCopyWith(
          VariantMeta value, $Res Function(VariantMeta) then) =
      _$VariantMetaCopyWithImpl<$Res, VariantMeta>;
  @useResult
  $Res call(
      {String name, String description, List<String> categoryAssociatedWith});
}

/// @nodoc
class _$VariantMetaCopyWithImpl<$Res, $Val extends VariantMeta>
    implements $VariantMetaCopyWith<$Res> {
  _$VariantMetaCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? name = null,
    Object? description = null,
    Object? categoryAssociatedWith = null,
  }) {
    return _then(_value.copyWith(
      name: null == name
          ? _value.name
          : name // ignore: cast_nullable_to_non_nullable
              as String,
      description: null == description
          ? _value.description
          : description // ignore: cast_nullable_to_non_nullable
              as String,
      categoryAssociatedWith: null == categoryAssociatedWith
          ? _value.categoryAssociatedWith
          : categoryAssociatedWith // ignore: cast_nullable_to_non_nullable
              as List<String>,
    ) as $Val);
  }
}

/// @nodoc
abstract class _$$VariantMetaImplCopyWith<$Res>
    implements $VariantMetaCopyWith<$Res> {
  factory _$$VariantMetaImplCopyWith(
          _$VariantMetaImpl value, $Res Function(_$VariantMetaImpl) then) =
      __$$VariantMetaImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call(
      {String name, String description, List<String> categoryAssociatedWith});
}

/// @nodoc
class __$$VariantMetaImplCopyWithImpl<$Res>
    extends _$VariantMetaCopyWithImpl<$Res, _$VariantMetaImpl>
    implements _$$VariantMetaImplCopyWith<$Res> {
  __$$VariantMetaImplCopyWithImpl(
      _$VariantMetaImpl _value, $Res Function(_$VariantMetaImpl) _then)
      : super(_value, _then);

  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? name = null,
    Object? description = null,
    Object? categoryAssociatedWith = null,
  }) {
    return _then(_$VariantMetaImpl(
      name: null == name
          ? _value.name
          : name // ignore: cast_nullable_to_non_nullable
              as String,
      description: null == description
          ? _value.description
          : description // ignore: cast_nullable_to_non_nullable
              as String,
      categoryAssociatedWith: null == categoryAssociatedWith
          ? _value._categoryAssociatedWith
          : categoryAssociatedWith // ignore: cast_nullable_to_non_nullable
              as List<String>,
    ));
  }
}

/// @nodoc
@JsonSerializable()
class _$VariantMetaImpl implements _VariantMeta {
  _$VariantMetaImpl(
      {required this.name,
      required this.description,
      required final List<String> categoryAssociatedWith})
      : _categoryAssociatedWith = categoryAssociatedWith;

  factory _$VariantMetaImpl.fromJson(Map<String, dynamic> json) =>
      _$$VariantMetaImplFromJson(json);

  @override
  final String name;
  @override
  final String description;
  final List<String> _categoryAssociatedWith;
  @override
  List<String> get categoryAssociatedWith {
    if (_categoryAssociatedWith is EqualUnmodifiableListView)
      return _categoryAssociatedWith;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableListView(_categoryAssociatedWith);
  }

  @override
  String toString() {
    return 'VariantMeta(name: $name, description: $description, categoryAssociatedWith: $categoryAssociatedWith)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$VariantMetaImpl &&
            (identical(other.name, name) || other.name == name) &&
            (identical(other.description, description) ||
                other.description == description) &&
            const DeepCollectionEquality().equals(
                other._categoryAssociatedWith, _categoryAssociatedWith));
  }

  @JsonKey(ignore: true)
  @override
  int get hashCode => Object.hash(runtimeType, name, description,
      const DeepCollectionEquality().hash(_categoryAssociatedWith));

  @JsonKey(ignore: true)
  @override
  @pragma('vm:prefer-inline')
  _$$VariantMetaImplCopyWith<_$VariantMetaImpl> get copyWith =>
      __$$VariantMetaImplCopyWithImpl<_$VariantMetaImpl>(this, _$identity);

  @override
  Map<String, dynamic> toJson() {
    return _$$VariantMetaImplToJson(
      this,
    );
  }
}

abstract class _VariantMeta implements VariantMeta {
  factory _VariantMeta(
      {required final String name,
      required final String description,
      required final List<String> categoryAssociatedWith}) = _$VariantMetaImpl;

  factory _VariantMeta.fromJson(Map<String, dynamic> json) =
      _$VariantMetaImpl.fromJson;

  @override
  String get name;
  @override
  String get description;
  @override
  List<String> get categoryAssociatedWith;
  @override
  @JsonKey(ignore: true)
  _$$VariantMetaImplCopyWith<_$VariantMetaImpl> get copyWith =>
      throw _privateConstructorUsedError;
}

AddonMeta _$AddonMetaFromJson(Map<String, dynamic> json) {
  return _AddonMeta.fromJson(json);
}

/// @nodoc
mixin _$AddonMeta {
  String get name => throw _privateConstructorUsedError;
  String get description => throw _privateConstructorUsedError;
  List<String> get categoryAssociatedWith => throw _privateConstructorUsedError;

  Map<String, dynamic> toJson() => throw _privateConstructorUsedError;
  @JsonKey(ignore: true)
  $AddonMetaCopyWith<AddonMeta> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $AddonMetaCopyWith<$Res> {
  factory $AddonMetaCopyWith(AddonMeta value, $Res Function(AddonMeta) then) =
      _$AddonMetaCopyWithImpl<$Res, AddonMeta>;
  @useResult
  $Res call(
      {String name, String description, List<String> categoryAssociatedWith});
}

/// @nodoc
class _$AddonMetaCopyWithImpl<$Res, $Val extends AddonMeta>
    implements $AddonMetaCopyWith<$Res> {
  _$AddonMetaCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? name = null,
    Object? description = null,
    Object? categoryAssociatedWith = null,
  }) {
    return _then(_value.copyWith(
      name: null == name
          ? _value.name
          : name // ignore: cast_nullable_to_non_nullable
              as String,
      description: null == description
          ? _value.description
          : description // ignore: cast_nullable_to_non_nullable
              as String,
      categoryAssociatedWith: null == categoryAssociatedWith
          ? _value.categoryAssociatedWith
          : categoryAssociatedWith // ignore: cast_nullable_to_non_nullable
              as List<String>,
    ) as $Val);
  }
}

/// @nodoc
abstract class _$$AddonMetaImplCopyWith<$Res>
    implements $AddonMetaCopyWith<$Res> {
  factory _$$AddonMetaImplCopyWith(
          _$AddonMetaImpl value, $Res Function(_$AddonMetaImpl) then) =
      __$$AddonMetaImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call(
      {String name, String description, List<String> categoryAssociatedWith});
}

/// @nodoc
class __$$AddonMetaImplCopyWithImpl<$Res>
    extends _$AddonMetaCopyWithImpl<$Res, _$AddonMetaImpl>
    implements _$$AddonMetaImplCopyWith<$Res> {
  __$$AddonMetaImplCopyWithImpl(
      _$AddonMetaImpl _value, $Res Function(_$AddonMetaImpl) _then)
      : super(_value, _then);

  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? name = null,
    Object? description = null,
    Object? categoryAssociatedWith = null,
  }) {
    return _then(_$AddonMetaImpl(
      name: null == name
          ? _value.name
          : name // ignore: cast_nullable_to_non_nullable
              as String,
      description: null == description
          ? _value.description
          : description // ignore: cast_nullable_to_non_nullable
              as String,
      categoryAssociatedWith: null == categoryAssociatedWith
          ? _value._categoryAssociatedWith
          : categoryAssociatedWith // ignore: cast_nullable_to_non_nullable
              as List<String>,
    ));
  }
}

/// @nodoc
@JsonSerializable()
class _$AddonMetaImpl implements _AddonMeta {
  _$AddonMetaImpl(
      {required this.name,
      required this.description,
      required final List<String> categoryAssociatedWith})
      : _categoryAssociatedWith = categoryAssociatedWith;

  factory _$AddonMetaImpl.fromJson(Map<String, dynamic> json) =>
      _$$AddonMetaImplFromJson(json);

  @override
  final String name;
  @override
  final String description;
  final List<String> _categoryAssociatedWith;
  @override
  List<String> get categoryAssociatedWith {
    if (_categoryAssociatedWith is EqualUnmodifiableListView)
      return _categoryAssociatedWith;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableListView(_categoryAssociatedWith);
  }

  @override
  String toString() {
    return 'AddonMeta(name: $name, description: $description, categoryAssociatedWith: $categoryAssociatedWith)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$AddonMetaImpl &&
            (identical(other.name, name) || other.name == name) &&
            (identical(other.description, description) ||
                other.description == description) &&
            const DeepCollectionEquality().equals(
                other._categoryAssociatedWith, _categoryAssociatedWith));
  }

  @JsonKey(ignore: true)
  @override
  int get hashCode => Object.hash(runtimeType, name, description,
      const DeepCollectionEquality().hash(_categoryAssociatedWith));

  @JsonKey(ignore: true)
  @override
  @pragma('vm:prefer-inline')
  _$$AddonMetaImplCopyWith<_$AddonMetaImpl> get copyWith =>
      __$$AddonMetaImplCopyWithImpl<_$AddonMetaImpl>(this, _$identity);

  @override
  Map<String, dynamic> toJson() {
    return _$$AddonMetaImplToJson(
      this,
    );
  }
}

abstract class _AddonMeta implements AddonMeta {
  factory _AddonMeta(
      {required final String name,
      required final String description,
      required final List<String> categoryAssociatedWith}) = _$AddonMetaImpl;

  factory _AddonMeta.fromJson(Map<String, dynamic> json) =
      _$AddonMetaImpl.fromJson;

  @override
  String get name;
  @override
  String get description;
  @override
  List<String> get categoryAssociatedWith;
  @override
  @JsonKey(ignore: true)
  _$$AddonMetaImplCopyWith<_$AddonMetaImpl> get copyWith =>
      throw _privateConstructorUsedError;
}

AddToCartRequest _$AddToCartRequestFromJson(Map<String, dynamic> json) {
  return _AddToCartRequest.fromJson(json);
}

/// @nodoc
mixin _$AddToCartRequest {
  String get tableId => throw _privateConstructorUsedError;
  String get restaurantId => throw _privateConstructorUsedError;
  String get menuItemId => throw _privateConstructorUsedError;
  int get quantity => throw _privateConstructorUsedError;
  Map<String, String>? get selectedVariants =>
      throw _privateConstructorUsedError;
  List<String>? get selectedAddons => throw _privateConstructorUsedError;

  Map<String, dynamic> toJson() => throw _privateConstructorUsedError;
  @JsonKey(ignore: true)
  $AddToCartRequestCopyWith<AddToCartRequest> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $AddToCartRequestCopyWith<$Res> {
  factory $AddToCartRequestCopyWith(
          AddToCartRequest value, $Res Function(AddToCartRequest) then) =
      _$AddToCartRequestCopyWithImpl<$Res, AddToCartRequest>;
  @useResult
  $Res call(
      {String tableId,
      String restaurantId,
      String menuItemId,
      int quantity,
      Map<String, String>? selectedVariants,
      List<String>? selectedAddons});
}

/// @nodoc
class _$AddToCartRequestCopyWithImpl<$Res, $Val extends AddToCartRequest>
    implements $AddToCartRequestCopyWith<$Res> {
  _$AddToCartRequestCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? tableId = null,
    Object? restaurantId = null,
    Object? menuItemId = null,
    Object? quantity = null,
    Object? selectedVariants = freezed,
    Object? selectedAddons = freezed,
  }) {
    return _then(_value.copyWith(
      tableId: null == tableId
          ? _value.tableId
          : tableId // ignore: cast_nullable_to_non_nullable
              as String,
      restaurantId: null == restaurantId
          ? _value.restaurantId
          : restaurantId // ignore: cast_nullable_to_non_nullable
              as String,
      menuItemId: null == menuItemId
          ? _value.menuItemId
          : menuItemId // ignore: cast_nullable_to_non_nullable
              as String,
      quantity: null == quantity
          ? _value.quantity
          : quantity // ignore: cast_nullable_to_non_nullable
              as int,
      selectedVariants: freezed == selectedVariants
          ? _value.selectedVariants
          : selectedVariants // ignore: cast_nullable_to_non_nullable
              as Map<String, String>?,
      selectedAddons: freezed == selectedAddons
          ? _value.selectedAddons
          : selectedAddons // ignore: cast_nullable_to_non_nullable
              as List<String>?,
    ) as $Val);
  }
}

/// @nodoc
abstract class _$$AddToCartRequestImplCopyWith<$Res>
    implements $AddToCartRequestCopyWith<$Res> {
  factory _$$AddToCartRequestImplCopyWith(_$AddToCartRequestImpl value,
          $Res Function(_$AddToCartRequestImpl) then) =
      __$$AddToCartRequestImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call(
      {String tableId,
      String restaurantId,
      String menuItemId,
      int quantity,
      Map<String, String>? selectedVariants,
      List<String>? selectedAddons});
}

/// @nodoc
class __$$AddToCartRequestImplCopyWithImpl<$Res>
    extends _$AddToCartRequestCopyWithImpl<$Res, _$AddToCartRequestImpl>
    implements _$$AddToCartRequestImplCopyWith<$Res> {
  __$$AddToCartRequestImplCopyWithImpl(_$AddToCartRequestImpl _value,
      $Res Function(_$AddToCartRequestImpl) _then)
      : super(_value, _then);

  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? tableId = null,
    Object? restaurantId = null,
    Object? menuItemId = null,
    Object? quantity = null,
    Object? selectedVariants = freezed,
    Object? selectedAddons = freezed,
  }) {
    return _then(_$AddToCartRequestImpl(
      tableId: null == tableId
          ? _value.tableId
          : tableId // ignore: cast_nullable_to_non_nullable
              as String,
      restaurantId: null == restaurantId
          ? _value.restaurantId
          : restaurantId // ignore: cast_nullable_to_non_nullable
              as String,
      menuItemId: null == menuItemId
          ? _value.menuItemId
          : menuItemId // ignore: cast_nullable_to_non_nullable
              as String,
      quantity: null == quantity
          ? _value.quantity
          : quantity // ignore: cast_nullable_to_non_nullable
              as int,
      selectedVariants: freezed == selectedVariants
          ? _value._selectedVariants
          : selectedVariants // ignore: cast_nullable_to_non_nullable
              as Map<String, String>?,
      selectedAddons: freezed == selectedAddons
          ? _value._selectedAddons
          : selectedAddons // ignore: cast_nullable_to_non_nullable
              as List<String>?,
    ));
  }
}

/// @nodoc
@JsonSerializable()
class _$AddToCartRequestImpl implements _AddToCartRequest {
  _$AddToCartRequestImpl(
      {required this.tableId,
      required this.restaurantId,
      required this.menuItemId,
      required this.quantity,
      final Map<String, String>? selectedVariants,
      final List<String>? selectedAddons})
      : _selectedVariants = selectedVariants,
        _selectedAddons = selectedAddons;

  factory _$AddToCartRequestImpl.fromJson(Map<String, dynamic> json) =>
      _$$AddToCartRequestImplFromJson(json);

  @override
  final String tableId;
  @override
  final String restaurantId;
  @override
  final String menuItemId;
  @override
  final int quantity;
  final Map<String, String>? _selectedVariants;
  @override
  Map<String, String>? get selectedVariants {
    final value = _selectedVariants;
    if (value == null) return null;
    if (_selectedVariants is EqualUnmodifiableMapView) return _selectedVariants;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableMapView(value);
  }

  final List<String>? _selectedAddons;
  @override
  List<String>? get selectedAddons {
    final value = _selectedAddons;
    if (value == null) return null;
    if (_selectedAddons is EqualUnmodifiableListView) return _selectedAddons;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableListView(value);
  }

  @override
  String toString() {
    return 'AddToCartRequest(tableId: $tableId, restaurantId: $restaurantId, menuItemId: $menuItemId, quantity: $quantity, selectedVariants: $selectedVariants, selectedAddons: $selectedAddons)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$AddToCartRequestImpl &&
            (identical(other.tableId, tableId) || other.tableId == tableId) &&
            (identical(other.restaurantId, restaurantId) ||
                other.restaurantId == restaurantId) &&
            (identical(other.menuItemId, menuItemId) ||
                other.menuItemId == menuItemId) &&
            (identical(other.quantity, quantity) ||
                other.quantity == quantity) &&
            const DeepCollectionEquality()
                .equals(other._selectedVariants, _selectedVariants) &&
            const DeepCollectionEquality()
                .equals(other._selectedAddons, _selectedAddons));
  }

  @JsonKey(ignore: true)
  @override
  int get hashCode => Object.hash(
      runtimeType,
      tableId,
      restaurantId,
      menuItemId,
      quantity,
      const DeepCollectionEquality().hash(_selectedVariants),
      const DeepCollectionEquality().hash(_selectedAddons));

  @JsonKey(ignore: true)
  @override
  @pragma('vm:prefer-inline')
  _$$AddToCartRequestImplCopyWith<_$AddToCartRequestImpl> get copyWith =>
      __$$AddToCartRequestImplCopyWithImpl<_$AddToCartRequestImpl>(
          this, _$identity);

  @override
  Map<String, dynamic> toJson() {
    return _$$AddToCartRequestImplToJson(
      this,
    );
  }
}

abstract class _AddToCartRequest implements AddToCartRequest {
  factory _AddToCartRequest(
      {required final String tableId,
      required final String restaurantId,
      required final String menuItemId,
      required final int quantity,
      final Map<String, String>? selectedVariants,
      final List<String>? selectedAddons}) = _$AddToCartRequestImpl;

  factory _AddToCartRequest.fromJson(Map<String, dynamic> json) =
      _$AddToCartRequestImpl.fromJson;

  @override
  String get tableId;
  @override
  String get restaurantId;
  @override
  String get menuItemId;
  @override
  int get quantity;
  @override
  Map<String, String>? get selectedVariants;
  @override
  List<String>? get selectedAddons;
  @override
  @JsonKey(ignore: true)
  _$$AddToCartRequestImplCopyWith<_$AddToCartRequestImpl> get copyWith =>
      throw _privateConstructorUsedError;
}

RemoveFromCartRequest _$RemoveFromCartRequestFromJson(
    Map<String, dynamic> json) {
  return _RemoveFromCartRequest.fromJson(json);
}

/// @nodoc
mixin _$RemoveFromCartRequest {
  String get tableId => throw _privateConstructorUsedError;
  String get restaurantId => throw _privateConstructorUsedError;
  String get menuItemId => throw _privateConstructorUsedError;
  int get quantity => throw _privateConstructorUsedError;
  Map<String, String>? get selectedVariants =>
      throw _privateConstructorUsedError;
  List<String>? get selectedAddons => throw _privateConstructorUsedError;

  Map<String, dynamic> toJson() => throw _privateConstructorUsedError;
  @JsonKey(ignore: true)
  $RemoveFromCartRequestCopyWith<RemoveFromCartRequest> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $RemoveFromCartRequestCopyWith<$Res> {
  factory $RemoveFromCartRequestCopyWith(RemoveFromCartRequest value,
          $Res Function(RemoveFromCartRequest) then) =
      _$RemoveFromCartRequestCopyWithImpl<$Res, RemoveFromCartRequest>;
  @useResult
  $Res call(
      {String tableId,
      String restaurantId,
      String menuItemId,
      int quantity,
      Map<String, String>? selectedVariants,
      List<String>? selectedAddons});
}

/// @nodoc
class _$RemoveFromCartRequestCopyWithImpl<$Res,
        $Val extends RemoveFromCartRequest>
    implements $RemoveFromCartRequestCopyWith<$Res> {
  _$RemoveFromCartRequestCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? tableId = null,
    Object? restaurantId = null,
    Object? menuItemId = null,
    Object? quantity = null,
    Object? selectedVariants = freezed,
    Object? selectedAddons = freezed,
  }) {
    return _then(_value.copyWith(
      tableId: null == tableId
          ? _value.tableId
          : tableId // ignore: cast_nullable_to_non_nullable
              as String,
      restaurantId: null == restaurantId
          ? _value.restaurantId
          : restaurantId // ignore: cast_nullable_to_non_nullable
              as String,
      menuItemId: null == menuItemId
          ? _value.menuItemId
          : menuItemId // ignore: cast_nullable_to_non_nullable
              as String,
      quantity: null == quantity
          ? _value.quantity
          : quantity // ignore: cast_nullable_to_non_nullable
              as int,
      selectedVariants: freezed == selectedVariants
          ? _value.selectedVariants
          : selectedVariants // ignore: cast_nullable_to_non_nullable
              as Map<String, String>?,
      selectedAddons: freezed == selectedAddons
          ? _value.selectedAddons
          : selectedAddons // ignore: cast_nullable_to_non_nullable
              as List<String>?,
    ) as $Val);
  }
}

/// @nodoc
abstract class _$$RemoveFromCartRequestImplCopyWith<$Res>
    implements $RemoveFromCartRequestCopyWith<$Res> {
  factory _$$RemoveFromCartRequestImplCopyWith(
          _$RemoveFromCartRequestImpl value,
          $Res Function(_$RemoveFromCartRequestImpl) then) =
      __$$RemoveFromCartRequestImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call(
      {String tableId,
      String restaurantId,
      String menuItemId,
      int quantity,
      Map<String, String>? selectedVariants,
      List<String>? selectedAddons});
}

/// @nodoc
class __$$RemoveFromCartRequestImplCopyWithImpl<$Res>
    extends _$RemoveFromCartRequestCopyWithImpl<$Res,
        _$RemoveFromCartRequestImpl>
    implements _$$RemoveFromCartRequestImplCopyWith<$Res> {
  __$$RemoveFromCartRequestImplCopyWithImpl(_$RemoveFromCartRequestImpl _value,
      $Res Function(_$RemoveFromCartRequestImpl) _then)
      : super(_value, _then);

  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? tableId = null,
    Object? restaurantId = null,
    Object? menuItemId = null,
    Object? quantity = null,
    Object? selectedVariants = freezed,
    Object? selectedAddons = freezed,
  }) {
    return _then(_$RemoveFromCartRequestImpl(
      tableId: null == tableId
          ? _value.tableId
          : tableId // ignore: cast_nullable_to_non_nullable
              as String,
      restaurantId: null == restaurantId
          ? _value.restaurantId
          : restaurantId // ignore: cast_nullable_to_non_nullable
              as String,
      menuItemId: null == menuItemId
          ? _value.menuItemId
          : menuItemId // ignore: cast_nullable_to_non_nullable
              as String,
      quantity: null == quantity
          ? _value.quantity
          : quantity // ignore: cast_nullable_to_non_nullable
              as int,
      selectedVariants: freezed == selectedVariants
          ? _value._selectedVariants
          : selectedVariants // ignore: cast_nullable_to_non_nullable
              as Map<String, String>?,
      selectedAddons: freezed == selectedAddons
          ? _value._selectedAddons
          : selectedAddons // ignore: cast_nullable_to_non_nullable
              as List<String>?,
    ));
  }
}

/// @nodoc
@JsonSerializable()
class _$RemoveFromCartRequestImpl implements _RemoveFromCartRequest {
  _$RemoveFromCartRequestImpl(
      {required this.tableId,
      required this.restaurantId,
      required this.menuItemId,
      required this.quantity,
      final Map<String, String>? selectedVariants,
      final List<String>? selectedAddons})
      : _selectedVariants = selectedVariants,
        _selectedAddons = selectedAddons;

  factory _$RemoveFromCartRequestImpl.fromJson(Map<String, dynamic> json) =>
      _$$RemoveFromCartRequestImplFromJson(json);

  @override
  final String tableId;
  @override
  final String restaurantId;
  @override
  final String menuItemId;
  @override
  final int quantity;
  final Map<String, String>? _selectedVariants;
  @override
  Map<String, String>? get selectedVariants {
    final value = _selectedVariants;
    if (value == null) return null;
    if (_selectedVariants is EqualUnmodifiableMapView) return _selectedVariants;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableMapView(value);
  }

  final List<String>? _selectedAddons;
  @override
  List<String>? get selectedAddons {
    final value = _selectedAddons;
    if (value == null) return null;
    if (_selectedAddons is EqualUnmodifiableListView) return _selectedAddons;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableListView(value);
  }

  @override
  String toString() {
    return 'RemoveFromCartRequest(tableId: $tableId, restaurantId: $restaurantId, menuItemId: $menuItemId, quantity: $quantity, selectedVariants: $selectedVariants, selectedAddons: $selectedAddons)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$RemoveFromCartRequestImpl &&
            (identical(other.tableId, tableId) || other.tableId == tableId) &&
            (identical(other.restaurantId, restaurantId) ||
                other.restaurantId == restaurantId) &&
            (identical(other.menuItemId, menuItemId) ||
                other.menuItemId == menuItemId) &&
            (identical(other.quantity, quantity) ||
                other.quantity == quantity) &&
            const DeepCollectionEquality()
                .equals(other._selectedVariants, _selectedVariants) &&
            const DeepCollectionEquality()
                .equals(other._selectedAddons, _selectedAddons));
  }

  @JsonKey(ignore: true)
  @override
  int get hashCode => Object.hash(
      runtimeType,
      tableId,
      restaurantId,
      menuItemId,
      quantity,
      const DeepCollectionEquality().hash(_selectedVariants),
      const DeepCollectionEquality().hash(_selectedAddons));

  @JsonKey(ignore: true)
  @override
  @pragma('vm:prefer-inline')
  _$$RemoveFromCartRequestImplCopyWith<_$RemoveFromCartRequestImpl>
      get copyWith => __$$RemoveFromCartRequestImplCopyWithImpl<
          _$RemoveFromCartRequestImpl>(this, _$identity);

  @override
  Map<String, dynamic> toJson() {
    return _$$RemoveFromCartRequestImplToJson(
      this,
    );
  }
}

abstract class _RemoveFromCartRequest implements RemoveFromCartRequest {
  factory _RemoveFromCartRequest(
      {required final String tableId,
      required final String restaurantId,
      required final String menuItemId,
      required final int quantity,
      final Map<String, String>? selectedVariants,
      final List<String>? selectedAddons}) = _$RemoveFromCartRequestImpl;

  factory _RemoveFromCartRequest.fromJson(Map<String, dynamic> json) =
      _$RemoveFromCartRequestImpl.fromJson;

  @override
  String get tableId;
  @override
  String get restaurantId;
  @override
  String get menuItemId;
  @override
  int get quantity;
  @override
  Map<String, String>? get selectedVariants;
  @override
  List<String>? get selectedAddons;
  @override
  @JsonKey(ignore: true)
  _$$RemoveFromCartRequestImplCopyWith<_$RemoveFromCartRequestImpl>
      get copyWith => throw _privateConstructorUsedError;
}

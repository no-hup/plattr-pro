// coverage:ignore-file
// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'offer.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

T _$identity<T>(T value) => value;

final _privateConstructorUsedError = UnsupportedError(
    'It seems like you constructed your class using `MyClass._()`. This constructor is only meant to be used by freezed and you are not supposed to need it nor use it.\nPlease check the documentation here for more information: https://github.com/rrousselGit/freezed#adding-getters-and-methods-to-our-models');

Offer _$OfferFromJson(Map<String, dynamic> json) {
  return _Offer.fromJson(json);
}

/// @nodoc
mixin _$Offer {
  String get id => throw _privateConstructorUsedError;
  String? get code => throw _privateConstructorUsedError;
  String get title => throw _privateConstructorUsedError;
  String get description => throw _privateConstructorUsedError;
  String? get imageUrl => throw _privateConstructorUsedError;
  String get type => throw _privateConstructorUsedError;
  String? get scope => throw _privateConstructorUsedError;
  List<String> get exclusionIds => throw _privateConstructorUsedError;
  String? get termsAndConditions => throw _privateConstructorUsedError;
  int? get priority => throw _privateConstructorUsedError;
  OfferBenefit? get benefit => throw _privateConstructorUsedError;
  bool get isApplicable => throw _privateConstructorUsedError;
  String? get reason => throw _privateConstructorUsedError;
  double get potentialSaving => throw _privateConstructorUsedError;

  Map<String, dynamic> toJson() => throw _privateConstructorUsedError;
  @JsonKey(ignore: true)
  $OfferCopyWith<Offer> get copyWith => throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $OfferCopyWith<$Res> {
  factory $OfferCopyWith(Offer value, $Res Function(Offer) then) =
      _$OfferCopyWithImpl<$Res, Offer>;
  @useResult
  $Res call(
      {String id,
      String? code,
      String title,
      String description,
      String? imageUrl,
      String type,
      String? scope,
      List<String> exclusionIds,
      String? termsAndConditions,
      int? priority,
      OfferBenefit? benefit,
      bool isApplicable,
      String? reason,
      double potentialSaving});

  $OfferBenefitCopyWith<$Res>? get benefit;
}

/// @nodoc
class _$OfferCopyWithImpl<$Res, $Val extends Offer>
    implements $OfferCopyWith<$Res> {
  _$OfferCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? id = null,
    Object? code = freezed,
    Object? title = null,
    Object? description = null,
    Object? imageUrl = freezed,
    Object? type = null,
    Object? scope = freezed,
    Object? exclusionIds = null,
    Object? termsAndConditions = freezed,
    Object? priority = freezed,
    Object? benefit = freezed,
    Object? isApplicable = null,
    Object? reason = freezed,
    Object? potentialSaving = null,
  }) {
    return _then(_value.copyWith(
      id: null == id
          ? _value.id
          : id // ignore: cast_nullable_to_non_nullable
              as String,
      code: freezed == code
          ? _value.code
          : code // ignore: cast_nullable_to_non_nullable
              as String?,
      title: null == title
          ? _value.title
          : title // ignore: cast_nullable_to_non_nullable
              as String,
      description: null == description
          ? _value.description
          : description // ignore: cast_nullable_to_non_nullable
              as String,
      imageUrl: freezed == imageUrl
          ? _value.imageUrl
          : imageUrl // ignore: cast_nullable_to_non_nullable
              as String?,
      type: null == type
          ? _value.type
          : type // ignore: cast_nullable_to_non_nullable
              as String,
      scope: freezed == scope
          ? _value.scope
          : scope // ignore: cast_nullable_to_non_nullable
              as String?,
      exclusionIds: null == exclusionIds
          ? _value.exclusionIds
          : exclusionIds // ignore: cast_nullable_to_non_nullable
              as List<String>,
      termsAndConditions: freezed == termsAndConditions
          ? _value.termsAndConditions
          : termsAndConditions // ignore: cast_nullable_to_non_nullable
              as String?,
      priority: freezed == priority
          ? _value.priority
          : priority // ignore: cast_nullable_to_non_nullable
              as int?,
      benefit: freezed == benefit
          ? _value.benefit
          : benefit // ignore: cast_nullable_to_non_nullable
              as OfferBenefit?,
      isApplicable: null == isApplicable
          ? _value.isApplicable
          : isApplicable // ignore: cast_nullable_to_non_nullable
              as bool,
      reason: freezed == reason
          ? _value.reason
          : reason // ignore: cast_nullable_to_non_nullable
              as String?,
      potentialSaving: null == potentialSaving
          ? _value.potentialSaving
          : potentialSaving // ignore: cast_nullable_to_non_nullable
              as double,
    ) as $Val);
  }

  @override
  @pragma('vm:prefer-inline')
  $OfferBenefitCopyWith<$Res>? get benefit {
    if (_value.benefit == null) {
      return null;
    }

    return $OfferBenefitCopyWith<$Res>(_value.benefit!, (value) {
      return _then(_value.copyWith(benefit: value) as $Val);
    });
  }
}

/// @nodoc
abstract class _$$OfferImplCopyWith<$Res> implements $OfferCopyWith<$Res> {
  factory _$$OfferImplCopyWith(
          _$OfferImpl value, $Res Function(_$OfferImpl) then) =
      __$$OfferImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call(
      {String id,
      String? code,
      String title,
      String description,
      String? imageUrl,
      String type,
      String? scope,
      List<String> exclusionIds,
      String? termsAndConditions,
      int? priority,
      OfferBenefit? benefit,
      bool isApplicable,
      String? reason,
      double potentialSaving});

  @override
  $OfferBenefitCopyWith<$Res>? get benefit;
}

/// @nodoc
class __$$OfferImplCopyWithImpl<$Res>
    extends _$OfferCopyWithImpl<$Res, _$OfferImpl>
    implements _$$OfferImplCopyWith<$Res> {
  __$$OfferImplCopyWithImpl(
      _$OfferImpl _value, $Res Function(_$OfferImpl) _then)
      : super(_value, _then);

  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? id = null,
    Object? code = freezed,
    Object? title = null,
    Object? description = null,
    Object? imageUrl = freezed,
    Object? type = null,
    Object? scope = freezed,
    Object? exclusionIds = null,
    Object? termsAndConditions = freezed,
    Object? priority = freezed,
    Object? benefit = freezed,
    Object? isApplicable = null,
    Object? reason = freezed,
    Object? potentialSaving = null,
  }) {
    return _then(_$OfferImpl(
      id: null == id
          ? _value.id
          : id // ignore: cast_nullable_to_non_nullable
              as String,
      code: freezed == code
          ? _value.code
          : code // ignore: cast_nullable_to_non_nullable
              as String?,
      title: null == title
          ? _value.title
          : title // ignore: cast_nullable_to_non_nullable
              as String,
      description: null == description
          ? _value.description
          : description // ignore: cast_nullable_to_non_nullable
              as String,
      imageUrl: freezed == imageUrl
          ? _value.imageUrl
          : imageUrl // ignore: cast_nullable_to_non_nullable
              as String?,
      type: null == type
          ? _value.type
          : type // ignore: cast_nullable_to_non_nullable
              as String,
      scope: freezed == scope
          ? _value.scope
          : scope // ignore: cast_nullable_to_non_nullable
              as String?,
      exclusionIds: null == exclusionIds
          ? _value._exclusionIds
          : exclusionIds // ignore: cast_nullable_to_non_nullable
              as List<String>,
      termsAndConditions: freezed == termsAndConditions
          ? _value.termsAndConditions
          : termsAndConditions // ignore: cast_nullable_to_non_nullable
              as String?,
      priority: freezed == priority
          ? _value.priority
          : priority // ignore: cast_nullable_to_non_nullable
              as int?,
      benefit: freezed == benefit
          ? _value.benefit
          : benefit // ignore: cast_nullable_to_non_nullable
              as OfferBenefit?,
      isApplicable: null == isApplicable
          ? _value.isApplicable
          : isApplicable // ignore: cast_nullable_to_non_nullable
              as bool,
      reason: freezed == reason
          ? _value.reason
          : reason // ignore: cast_nullable_to_non_nullable
              as String?,
      potentialSaving: null == potentialSaving
          ? _value.potentialSaving
          : potentialSaving // ignore: cast_nullable_to_non_nullable
              as double,
    ));
  }
}

/// @nodoc
@JsonSerializable()
class _$OfferImpl implements _Offer {
  const _$OfferImpl(
      {required this.id,
      this.code,
      required this.title,
      required this.description,
      this.imageUrl,
      required this.type,
      this.scope,
      final List<String> exclusionIds = const [],
      this.termsAndConditions,
      this.priority,
      this.benefit,
      this.isApplicable = false,
      this.reason,
      this.potentialSaving = 0})
      : _exclusionIds = exclusionIds;

  factory _$OfferImpl.fromJson(Map<String, dynamic> json) =>
      _$$OfferImplFromJson(json);

  @override
  final String id;
  @override
  final String? code;
  @override
  final String title;
  @override
  final String description;
  @override
  final String? imageUrl;
  @override
  final String type;
  @override
  final String? scope;
  final List<String> _exclusionIds;
  @override
  @JsonKey()
  List<String> get exclusionIds {
    if (_exclusionIds is EqualUnmodifiableListView) return _exclusionIds;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableListView(_exclusionIds);
  }

  @override
  final String? termsAndConditions;
  @override
  final int? priority;
  @override
  final OfferBenefit? benefit;
  @override
  @JsonKey()
  final bool isApplicable;
  @override
  final String? reason;
  @override
  @JsonKey()
  final double potentialSaving;

  @override
  String toString() {
    return 'Offer(id: $id, code: $code, title: $title, description: $description, imageUrl: $imageUrl, type: $type, scope: $scope, exclusionIds: $exclusionIds, termsAndConditions: $termsAndConditions, priority: $priority, benefit: $benefit, isApplicable: $isApplicable, reason: $reason, potentialSaving: $potentialSaving)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$OfferImpl &&
            (identical(other.id, id) || other.id == id) &&
            (identical(other.code, code) || other.code == code) &&
            (identical(other.title, title) || other.title == title) &&
            (identical(other.description, description) ||
                other.description == description) &&
            (identical(other.imageUrl, imageUrl) ||
                other.imageUrl == imageUrl) &&
            (identical(other.type, type) || other.type == type) &&
            (identical(other.scope, scope) || other.scope == scope) &&
            const DeepCollectionEquality()
                .equals(other._exclusionIds, _exclusionIds) &&
            (identical(other.termsAndConditions, termsAndConditions) ||
                other.termsAndConditions == termsAndConditions) &&
            (identical(other.priority, priority) ||
                other.priority == priority) &&
            (identical(other.benefit, benefit) || other.benefit == benefit) &&
            (identical(other.isApplicable, isApplicable) ||
                other.isApplicable == isApplicable) &&
            (identical(other.reason, reason) || other.reason == reason) &&
            (identical(other.potentialSaving, potentialSaving) ||
                other.potentialSaving == potentialSaving));
  }

  @JsonKey(ignore: true)
  @override
  int get hashCode => Object.hash(
      runtimeType,
      id,
      code,
      title,
      description,
      imageUrl,
      type,
      scope,
      const DeepCollectionEquality().hash(_exclusionIds),
      termsAndConditions,
      priority,
      benefit,
      isApplicable,
      reason,
      potentialSaving);

  @JsonKey(ignore: true)
  @override
  @pragma('vm:prefer-inline')
  _$$OfferImplCopyWith<_$OfferImpl> get copyWith =>
      __$$OfferImplCopyWithImpl<_$OfferImpl>(this, _$identity);

  @override
  Map<String, dynamic> toJson() {
    return _$$OfferImplToJson(
      this,
    );
  }
}

abstract class _Offer implements Offer {
  const factory _Offer(
      {required final String id,
      final String? code,
      required final String title,
      required final String description,
      final String? imageUrl,
      required final String type,
      final String? scope,
      final List<String> exclusionIds,
      final String? termsAndConditions,
      final int? priority,
      final OfferBenefit? benefit,
      final bool isApplicable,
      final String? reason,
      final double potentialSaving}) = _$OfferImpl;

  factory _Offer.fromJson(Map<String, dynamic> json) = _$OfferImpl.fromJson;

  @override
  String get id;
  @override
  String? get code;
  @override
  String get title;
  @override
  String get description;
  @override
  String? get imageUrl;
  @override
  String get type;
  @override
  String? get scope;
  @override
  List<String> get exclusionIds;
  @override
  String? get termsAndConditions;
  @override
  int? get priority;
  @override
  OfferBenefit? get benefit;
  @override
  bool get isApplicable;
  @override
  String? get reason;
  @override
  double get potentialSaving;
  @override
  @JsonKey(ignore: true)
  _$$OfferImplCopyWith<_$OfferImpl> get copyWith =>
      throw _privateConstructorUsedError;
}

OfferBenefit _$OfferBenefitFromJson(Map<String, dynamic> json) {
  return _OfferBenefit.fromJson(json);
}

/// @nodoc
mixin _$OfferBenefit {
  String get type => throw _privateConstructorUsedError;
  double get value => throw _privateConstructorUsedError;
  double? get maxDiscount => throw _privateConstructorUsedError;
  OfferFreeItem? get freeItem => throw _privateConstructorUsedError;

  Map<String, dynamic> toJson() => throw _privateConstructorUsedError;
  @JsonKey(ignore: true)
  $OfferBenefitCopyWith<OfferBenefit> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $OfferBenefitCopyWith<$Res> {
  factory $OfferBenefitCopyWith(
          OfferBenefit value, $Res Function(OfferBenefit) then) =
      _$OfferBenefitCopyWithImpl<$Res, OfferBenefit>;
  @useResult
  $Res call(
      {String type,
      double value,
      double? maxDiscount,
      OfferFreeItem? freeItem});

  $OfferFreeItemCopyWith<$Res>? get freeItem;
}

/// @nodoc
class _$OfferBenefitCopyWithImpl<$Res, $Val extends OfferBenefit>
    implements $OfferBenefitCopyWith<$Res> {
  _$OfferBenefitCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? type = null,
    Object? value = null,
    Object? maxDiscount = freezed,
    Object? freeItem = freezed,
  }) {
    return _then(_value.copyWith(
      type: null == type
          ? _value.type
          : type // ignore: cast_nullable_to_non_nullable
              as String,
      value: null == value
          ? _value.value
          : value // ignore: cast_nullable_to_non_nullable
              as double,
      maxDiscount: freezed == maxDiscount
          ? _value.maxDiscount
          : maxDiscount // ignore: cast_nullable_to_non_nullable
              as double?,
      freeItem: freezed == freeItem
          ? _value.freeItem
          : freeItem // ignore: cast_nullable_to_non_nullable
              as OfferFreeItem?,
    ) as $Val);
  }

  @override
  @pragma('vm:prefer-inline')
  $OfferFreeItemCopyWith<$Res>? get freeItem {
    if (_value.freeItem == null) {
      return null;
    }

    return $OfferFreeItemCopyWith<$Res>(_value.freeItem!, (value) {
      return _then(_value.copyWith(freeItem: value) as $Val);
    });
  }
}

/// @nodoc
abstract class _$$OfferBenefitImplCopyWith<$Res>
    implements $OfferBenefitCopyWith<$Res> {
  factory _$$OfferBenefitImplCopyWith(
          _$OfferBenefitImpl value, $Res Function(_$OfferBenefitImpl) then) =
      __$$OfferBenefitImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call(
      {String type,
      double value,
      double? maxDiscount,
      OfferFreeItem? freeItem});

  @override
  $OfferFreeItemCopyWith<$Res>? get freeItem;
}

/// @nodoc
class __$$OfferBenefitImplCopyWithImpl<$Res>
    extends _$OfferBenefitCopyWithImpl<$Res, _$OfferBenefitImpl>
    implements _$$OfferBenefitImplCopyWith<$Res> {
  __$$OfferBenefitImplCopyWithImpl(
      _$OfferBenefitImpl _value, $Res Function(_$OfferBenefitImpl) _then)
      : super(_value, _then);

  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? type = null,
    Object? value = null,
    Object? maxDiscount = freezed,
    Object? freeItem = freezed,
  }) {
    return _then(_$OfferBenefitImpl(
      type: null == type
          ? _value.type
          : type // ignore: cast_nullable_to_non_nullable
              as String,
      value: null == value
          ? _value.value
          : value // ignore: cast_nullable_to_non_nullable
              as double,
      maxDiscount: freezed == maxDiscount
          ? _value.maxDiscount
          : maxDiscount // ignore: cast_nullable_to_non_nullable
              as double?,
      freeItem: freezed == freeItem
          ? _value.freeItem
          : freeItem // ignore: cast_nullable_to_non_nullable
              as OfferFreeItem?,
    ));
  }
}

/// @nodoc
@JsonSerializable()
class _$OfferBenefitImpl implements _OfferBenefit {
  const _$OfferBenefitImpl(
      {required this.type, this.value = 0, this.maxDiscount, this.freeItem});

  factory _$OfferBenefitImpl.fromJson(Map<String, dynamic> json) =>
      _$$OfferBenefitImplFromJson(json);

  @override
  final String type;
  @override
  @JsonKey()
  final double value;
  @override
  final double? maxDiscount;
  @override
  final OfferFreeItem? freeItem;

  @override
  String toString() {
    return 'OfferBenefit(type: $type, value: $value, maxDiscount: $maxDiscount, freeItem: $freeItem)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$OfferBenefitImpl &&
            (identical(other.type, type) || other.type == type) &&
            (identical(other.value, value) || other.value == value) &&
            (identical(other.maxDiscount, maxDiscount) ||
                other.maxDiscount == maxDiscount) &&
            (identical(other.freeItem, freeItem) ||
                other.freeItem == freeItem));
  }

  @JsonKey(ignore: true)
  @override
  int get hashCode =>
      Object.hash(runtimeType, type, value, maxDiscount, freeItem);

  @JsonKey(ignore: true)
  @override
  @pragma('vm:prefer-inline')
  _$$OfferBenefitImplCopyWith<_$OfferBenefitImpl> get copyWith =>
      __$$OfferBenefitImplCopyWithImpl<_$OfferBenefitImpl>(this, _$identity);

  @override
  Map<String, dynamic> toJson() {
    return _$$OfferBenefitImplToJson(
      this,
    );
  }
}

abstract class _OfferBenefit implements OfferBenefit {
  const factory _OfferBenefit(
      {required final String type,
      final double value,
      final double? maxDiscount,
      final OfferFreeItem? freeItem}) = _$OfferBenefitImpl;

  factory _OfferBenefit.fromJson(Map<String, dynamic> json) =
      _$OfferBenefitImpl.fromJson;

  @override
  String get type;
  @override
  double get value;
  @override
  double? get maxDiscount;
  @override
  OfferFreeItem? get freeItem;
  @override
  @JsonKey(ignore: true)
  _$$OfferBenefitImplCopyWith<_$OfferBenefitImpl> get copyWith =>
      throw _privateConstructorUsedError;
}

OfferFreeItem _$OfferFreeItemFromJson(Map<String, dynamic> json) {
  return _OfferFreeItem.fromJson(json);
}

/// @nodoc
mixin _$OfferFreeItem {
  String get menuItemId => throw _privateConstructorUsedError;
  int get quantity => throw _privateConstructorUsedError;

  Map<String, dynamic> toJson() => throw _privateConstructorUsedError;
  @JsonKey(ignore: true)
  $OfferFreeItemCopyWith<OfferFreeItem> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $OfferFreeItemCopyWith<$Res> {
  factory $OfferFreeItemCopyWith(
          OfferFreeItem value, $Res Function(OfferFreeItem) then) =
      _$OfferFreeItemCopyWithImpl<$Res, OfferFreeItem>;
  @useResult
  $Res call({String menuItemId, int quantity});
}

/// @nodoc
class _$OfferFreeItemCopyWithImpl<$Res, $Val extends OfferFreeItem>
    implements $OfferFreeItemCopyWith<$Res> {
  _$OfferFreeItemCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? menuItemId = null,
    Object? quantity = null,
  }) {
    return _then(_value.copyWith(
      menuItemId: null == menuItemId
          ? _value.menuItemId
          : menuItemId // ignore: cast_nullable_to_non_nullable
              as String,
      quantity: null == quantity
          ? _value.quantity
          : quantity // ignore: cast_nullable_to_non_nullable
              as int,
    ) as $Val);
  }
}

/// @nodoc
abstract class _$$OfferFreeItemImplCopyWith<$Res>
    implements $OfferFreeItemCopyWith<$Res> {
  factory _$$OfferFreeItemImplCopyWith(
          _$OfferFreeItemImpl value, $Res Function(_$OfferFreeItemImpl) then) =
      __$$OfferFreeItemImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call({String menuItemId, int quantity});
}

/// @nodoc
class __$$OfferFreeItemImplCopyWithImpl<$Res>
    extends _$OfferFreeItemCopyWithImpl<$Res, _$OfferFreeItemImpl>
    implements _$$OfferFreeItemImplCopyWith<$Res> {
  __$$OfferFreeItemImplCopyWithImpl(
      _$OfferFreeItemImpl _value, $Res Function(_$OfferFreeItemImpl) _then)
      : super(_value, _then);

  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? menuItemId = null,
    Object? quantity = null,
  }) {
    return _then(_$OfferFreeItemImpl(
      menuItemId: null == menuItemId
          ? _value.menuItemId
          : menuItemId // ignore: cast_nullable_to_non_nullable
              as String,
      quantity: null == quantity
          ? _value.quantity
          : quantity // ignore: cast_nullable_to_non_nullable
              as int,
    ));
  }
}

/// @nodoc
@JsonSerializable()
class _$OfferFreeItemImpl implements _OfferFreeItem {
  const _$OfferFreeItemImpl({required this.menuItemId, this.quantity = 1});

  factory _$OfferFreeItemImpl.fromJson(Map<String, dynamic> json) =>
      _$$OfferFreeItemImplFromJson(json);

  @override
  final String menuItemId;
  @override
  @JsonKey()
  final int quantity;

  @override
  String toString() {
    return 'OfferFreeItem(menuItemId: $menuItemId, quantity: $quantity)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$OfferFreeItemImpl &&
            (identical(other.menuItemId, menuItemId) ||
                other.menuItemId == menuItemId) &&
            (identical(other.quantity, quantity) ||
                other.quantity == quantity));
  }

  @JsonKey(ignore: true)
  @override
  int get hashCode => Object.hash(runtimeType, menuItemId, quantity);

  @JsonKey(ignore: true)
  @override
  @pragma('vm:prefer-inline')
  _$$OfferFreeItemImplCopyWith<_$OfferFreeItemImpl> get copyWith =>
      __$$OfferFreeItemImplCopyWithImpl<_$OfferFreeItemImpl>(this, _$identity);

  @override
  Map<String, dynamic> toJson() {
    return _$$OfferFreeItemImplToJson(
      this,
    );
  }
}

abstract class _OfferFreeItem implements OfferFreeItem {
  const factory _OfferFreeItem(
      {required final String menuItemId,
      final int quantity}) = _$OfferFreeItemImpl;

  factory _OfferFreeItem.fromJson(Map<String, dynamic> json) =
      _$OfferFreeItemImpl.fromJson;

  @override
  String get menuItemId;
  @override
  int get quantity;
  @override
  @JsonKey(ignore: true)
  _$$OfferFreeItemImplCopyWith<_$OfferFreeItemImpl> get copyWith =>
      throw _privateConstructorUsedError;
}

OffersResponse _$OffersResponseFromJson(Map<String, dynamic> json) {
  return _OffersResponse.fromJson(json);
}

/// @nodoc
mixin _$OffersResponse {
  List<Offer> get offers => throw _privateConstructorUsedError;

  Map<String, dynamic> toJson() => throw _privateConstructorUsedError;
  @JsonKey(ignore: true)
  $OffersResponseCopyWith<OffersResponse> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $OffersResponseCopyWith<$Res> {
  factory $OffersResponseCopyWith(
          OffersResponse value, $Res Function(OffersResponse) then) =
      _$OffersResponseCopyWithImpl<$Res, OffersResponse>;
  @useResult
  $Res call({List<Offer> offers});
}

/// @nodoc
class _$OffersResponseCopyWithImpl<$Res, $Val extends OffersResponse>
    implements $OffersResponseCopyWith<$Res> {
  _$OffersResponseCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? offers = null,
  }) {
    return _then(_value.copyWith(
      offers: null == offers
          ? _value.offers
          : offers // ignore: cast_nullable_to_non_nullable
              as List<Offer>,
    ) as $Val);
  }
}

/// @nodoc
abstract class _$$OffersResponseImplCopyWith<$Res>
    implements $OffersResponseCopyWith<$Res> {
  factory _$$OffersResponseImplCopyWith(_$OffersResponseImpl value,
          $Res Function(_$OffersResponseImpl) then) =
      __$$OffersResponseImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call({List<Offer> offers});
}

/// @nodoc
class __$$OffersResponseImplCopyWithImpl<$Res>
    extends _$OffersResponseCopyWithImpl<$Res, _$OffersResponseImpl>
    implements _$$OffersResponseImplCopyWith<$Res> {
  __$$OffersResponseImplCopyWithImpl(
      _$OffersResponseImpl _value, $Res Function(_$OffersResponseImpl) _then)
      : super(_value, _then);

  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? offers = null,
  }) {
    return _then(_$OffersResponseImpl(
      offers: null == offers
          ? _value._offers
          : offers // ignore: cast_nullable_to_non_nullable
              as List<Offer>,
    ));
  }
}

/// @nodoc
@JsonSerializable()
class _$OffersResponseImpl implements _OffersResponse {
  const _$OffersResponseImpl({final List<Offer> offers = const []})
      : _offers = offers;

  factory _$OffersResponseImpl.fromJson(Map<String, dynamic> json) =>
      _$$OffersResponseImplFromJson(json);

  final List<Offer> _offers;
  @override
  @JsonKey()
  List<Offer> get offers {
    if (_offers is EqualUnmodifiableListView) return _offers;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableListView(_offers);
  }

  @override
  String toString() {
    return 'OffersResponse(offers: $offers)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$OffersResponseImpl &&
            const DeepCollectionEquality().equals(other._offers, _offers));
  }

  @JsonKey(ignore: true)
  @override
  int get hashCode =>
      Object.hash(runtimeType, const DeepCollectionEquality().hash(_offers));

  @JsonKey(ignore: true)
  @override
  @pragma('vm:prefer-inline')
  _$$OffersResponseImplCopyWith<_$OffersResponseImpl> get copyWith =>
      __$$OffersResponseImplCopyWithImpl<_$OffersResponseImpl>(
          this, _$identity);

  @override
  Map<String, dynamic> toJson() {
    return _$$OffersResponseImplToJson(
      this,
    );
  }
}

abstract class _OffersResponse implements OffersResponse {
  const factory _OffersResponse({final List<Offer> offers}) =
      _$OffersResponseImpl;

  factory _OffersResponse.fromJson(Map<String, dynamic> json) =
      _$OffersResponseImpl.fromJson;

  @override
  List<Offer> get offers;
  @override
  @JsonKey(ignore: true)
  _$$OffersResponseImplCopyWith<_$OffersResponseImpl> get copyWith =>
      throw _privateConstructorUsedError;
}

ApplyOfferResponse _$ApplyOfferResponseFromJson(Map<String, dynamic> json) {
  return _ApplyOfferResponse.fromJson(json);
}

/// @nodoc
mixin _$ApplyOfferResponse {
  Map<String, dynamic> get cart => throw _privateConstructorUsedError;
  AppliedOfferInfo? get appliedOffer => throw _privateConstructorUsedError;

  Map<String, dynamic> toJson() => throw _privateConstructorUsedError;
  @JsonKey(ignore: true)
  $ApplyOfferResponseCopyWith<ApplyOfferResponse> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $ApplyOfferResponseCopyWith<$Res> {
  factory $ApplyOfferResponseCopyWith(
          ApplyOfferResponse value, $Res Function(ApplyOfferResponse) then) =
      _$ApplyOfferResponseCopyWithImpl<$Res, ApplyOfferResponse>;
  @useResult
  $Res call({Map<String, dynamic> cart, AppliedOfferInfo? appliedOffer});

  $AppliedOfferInfoCopyWith<$Res>? get appliedOffer;
}

/// @nodoc
class _$ApplyOfferResponseCopyWithImpl<$Res, $Val extends ApplyOfferResponse>
    implements $ApplyOfferResponseCopyWith<$Res> {
  _$ApplyOfferResponseCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? cart = null,
    Object? appliedOffer = freezed,
  }) {
    return _then(_value.copyWith(
      cart: null == cart
          ? _value.cart
          : cart // ignore: cast_nullable_to_non_nullable
              as Map<String, dynamic>,
      appliedOffer: freezed == appliedOffer
          ? _value.appliedOffer
          : appliedOffer // ignore: cast_nullable_to_non_nullable
              as AppliedOfferInfo?,
    ) as $Val);
  }

  @override
  @pragma('vm:prefer-inline')
  $AppliedOfferInfoCopyWith<$Res>? get appliedOffer {
    if (_value.appliedOffer == null) {
      return null;
    }

    return $AppliedOfferInfoCopyWith<$Res>(_value.appliedOffer!, (value) {
      return _then(_value.copyWith(appliedOffer: value) as $Val);
    });
  }
}

/// @nodoc
abstract class _$$ApplyOfferResponseImplCopyWith<$Res>
    implements $ApplyOfferResponseCopyWith<$Res> {
  factory _$$ApplyOfferResponseImplCopyWith(_$ApplyOfferResponseImpl value,
          $Res Function(_$ApplyOfferResponseImpl) then) =
      __$$ApplyOfferResponseImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call({Map<String, dynamic> cart, AppliedOfferInfo? appliedOffer});

  @override
  $AppliedOfferInfoCopyWith<$Res>? get appliedOffer;
}

/// @nodoc
class __$$ApplyOfferResponseImplCopyWithImpl<$Res>
    extends _$ApplyOfferResponseCopyWithImpl<$Res, _$ApplyOfferResponseImpl>
    implements _$$ApplyOfferResponseImplCopyWith<$Res> {
  __$$ApplyOfferResponseImplCopyWithImpl(_$ApplyOfferResponseImpl _value,
      $Res Function(_$ApplyOfferResponseImpl) _then)
      : super(_value, _then);

  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? cart = null,
    Object? appliedOffer = freezed,
  }) {
    return _then(_$ApplyOfferResponseImpl(
      cart: null == cart
          ? _value._cart
          : cart // ignore: cast_nullable_to_non_nullable
              as Map<String, dynamic>,
      appliedOffer: freezed == appliedOffer
          ? _value.appliedOffer
          : appliedOffer // ignore: cast_nullable_to_non_nullable
              as AppliedOfferInfo?,
    ));
  }
}

/// @nodoc
@JsonSerializable()
class _$ApplyOfferResponseImpl implements _ApplyOfferResponse {
  const _$ApplyOfferResponseImpl(
      {required final Map<String, dynamic> cart, this.appliedOffer})
      : _cart = cart;

  factory _$ApplyOfferResponseImpl.fromJson(Map<String, dynamic> json) =>
      _$$ApplyOfferResponseImplFromJson(json);

  final Map<String, dynamic> _cart;
  @override
  Map<String, dynamic> get cart {
    if (_cart is EqualUnmodifiableMapView) return _cart;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableMapView(_cart);
  }

  @override
  final AppliedOfferInfo? appliedOffer;

  @override
  String toString() {
    return 'ApplyOfferResponse(cart: $cart, appliedOffer: $appliedOffer)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$ApplyOfferResponseImpl &&
            const DeepCollectionEquality().equals(other._cart, _cart) &&
            (identical(other.appliedOffer, appliedOffer) ||
                other.appliedOffer == appliedOffer));
  }

  @JsonKey(ignore: true)
  @override
  int get hashCode => Object.hash(
      runtimeType, const DeepCollectionEquality().hash(_cart), appliedOffer);

  @JsonKey(ignore: true)
  @override
  @pragma('vm:prefer-inline')
  _$$ApplyOfferResponseImplCopyWith<_$ApplyOfferResponseImpl> get copyWith =>
      __$$ApplyOfferResponseImplCopyWithImpl<_$ApplyOfferResponseImpl>(
          this, _$identity);

  @override
  Map<String, dynamic> toJson() {
    return _$$ApplyOfferResponseImplToJson(
      this,
    );
  }
}

abstract class _ApplyOfferResponse implements ApplyOfferResponse {
  const factory _ApplyOfferResponse(
      {required final Map<String, dynamic> cart,
      final AppliedOfferInfo? appliedOffer}) = _$ApplyOfferResponseImpl;

  factory _ApplyOfferResponse.fromJson(Map<String, dynamic> json) =
      _$ApplyOfferResponseImpl.fromJson;

  @override
  Map<String, dynamic> get cart;
  @override
  AppliedOfferInfo? get appliedOffer;
  @override
  @JsonKey(ignore: true)
  _$$ApplyOfferResponseImplCopyWith<_$ApplyOfferResponseImpl> get copyWith =>
      throw _privateConstructorUsedError;
}

AppliedOfferInfo _$AppliedOfferInfoFromJson(Map<String, dynamic> json) {
  return _AppliedOfferInfo.fromJson(json);
}

/// @nodoc
mixin _$AppliedOfferInfo {
  String get id => throw _privateConstructorUsedError;
  String get title => throw _privateConstructorUsedError;
  double get discountAmount => throw _privateConstructorUsedError;

  Map<String, dynamic> toJson() => throw _privateConstructorUsedError;
  @JsonKey(ignore: true)
  $AppliedOfferInfoCopyWith<AppliedOfferInfo> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $AppliedOfferInfoCopyWith<$Res> {
  factory $AppliedOfferInfoCopyWith(
          AppliedOfferInfo value, $Res Function(AppliedOfferInfo) then) =
      _$AppliedOfferInfoCopyWithImpl<$Res, AppliedOfferInfo>;
  @useResult
  $Res call({String id, String title, double discountAmount});
}

/// @nodoc
class _$AppliedOfferInfoCopyWithImpl<$Res, $Val extends AppliedOfferInfo>
    implements $AppliedOfferInfoCopyWith<$Res> {
  _$AppliedOfferInfoCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? id = null,
    Object? title = null,
    Object? discountAmount = null,
  }) {
    return _then(_value.copyWith(
      id: null == id
          ? _value.id
          : id // ignore: cast_nullable_to_non_nullable
              as String,
      title: null == title
          ? _value.title
          : title // ignore: cast_nullable_to_non_nullable
              as String,
      discountAmount: null == discountAmount
          ? _value.discountAmount
          : discountAmount // ignore: cast_nullable_to_non_nullable
              as double,
    ) as $Val);
  }
}

/// @nodoc
abstract class _$$AppliedOfferInfoImplCopyWith<$Res>
    implements $AppliedOfferInfoCopyWith<$Res> {
  factory _$$AppliedOfferInfoImplCopyWith(_$AppliedOfferInfoImpl value,
          $Res Function(_$AppliedOfferInfoImpl) then) =
      __$$AppliedOfferInfoImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call({String id, String title, double discountAmount});
}

/// @nodoc
class __$$AppliedOfferInfoImplCopyWithImpl<$Res>
    extends _$AppliedOfferInfoCopyWithImpl<$Res, _$AppliedOfferInfoImpl>
    implements _$$AppliedOfferInfoImplCopyWith<$Res> {
  __$$AppliedOfferInfoImplCopyWithImpl(_$AppliedOfferInfoImpl _value,
      $Res Function(_$AppliedOfferInfoImpl) _then)
      : super(_value, _then);

  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? id = null,
    Object? title = null,
    Object? discountAmount = null,
  }) {
    return _then(_$AppliedOfferInfoImpl(
      id: null == id
          ? _value.id
          : id // ignore: cast_nullable_to_non_nullable
              as String,
      title: null == title
          ? _value.title
          : title // ignore: cast_nullable_to_non_nullable
              as String,
      discountAmount: null == discountAmount
          ? _value.discountAmount
          : discountAmount // ignore: cast_nullable_to_non_nullable
              as double,
    ));
  }
}

/// @nodoc
@JsonSerializable()
class _$AppliedOfferInfoImpl implements _AppliedOfferInfo {
  const _$AppliedOfferInfoImpl(
      {required this.id, required this.title, this.discountAmount = 0});

  factory _$AppliedOfferInfoImpl.fromJson(Map<String, dynamic> json) =>
      _$$AppliedOfferInfoImplFromJson(json);

  @override
  final String id;
  @override
  final String title;
  @override
  @JsonKey()
  final double discountAmount;

  @override
  String toString() {
    return 'AppliedOfferInfo(id: $id, title: $title, discountAmount: $discountAmount)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$AppliedOfferInfoImpl &&
            (identical(other.id, id) || other.id == id) &&
            (identical(other.title, title) || other.title == title) &&
            (identical(other.discountAmount, discountAmount) ||
                other.discountAmount == discountAmount));
  }

  @JsonKey(ignore: true)
  @override
  int get hashCode => Object.hash(runtimeType, id, title, discountAmount);

  @JsonKey(ignore: true)
  @override
  @pragma('vm:prefer-inline')
  _$$AppliedOfferInfoImplCopyWith<_$AppliedOfferInfoImpl> get copyWith =>
      __$$AppliedOfferInfoImplCopyWithImpl<_$AppliedOfferInfoImpl>(
          this, _$identity);

  @override
  Map<String, dynamic> toJson() {
    return _$$AppliedOfferInfoImplToJson(
      this,
    );
  }
}

abstract class _AppliedOfferInfo implements AppliedOfferInfo {
  const factory _AppliedOfferInfo(
      {required final String id,
      required final String title,
      final double discountAmount}) = _$AppliedOfferInfoImpl;

  factory _AppliedOfferInfo.fromJson(Map<String, dynamic> json) =
      _$AppliedOfferInfoImpl.fromJson;

  @override
  String get id;
  @override
  String get title;
  @override
  double get discountAmount;
  @override
  @JsonKey(ignore: true)
  _$$AppliedOfferInfoImplCopyWith<_$AppliedOfferInfoImpl> get copyWith =>
      throw _privateConstructorUsedError;
}

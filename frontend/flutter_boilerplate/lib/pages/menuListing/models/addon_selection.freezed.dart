// coverage:ignore-file
// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'addon_selection.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

T _$identity<T>(T value) => value;

final _privateConstructorUsedError = UnsupportedError(
    'It seems like you constructed your class using `MyClass._()`. This constructor is only meant to be used by freezed and you are not supposed to need it nor use it.\nPlease check the documentation here for more information: https://github.com/rrousselGit/freezed#adding-getters-and-methods-to-our-models');

AddonSelection _$AddonSelectionFromJson(Map<String, dynamic> json) {
  return _AddonSelection.fromJson(json);
}

/// @nodoc
mixin _$AddonSelection {
  String get addonId => throw _privateConstructorUsedError;
  String get name => throw _privateConstructorUsedError;
  num get price => throw _privateConstructorUsedError;

  Map<String, dynamic> toJson() => throw _privateConstructorUsedError;
  @JsonKey(ignore: true)
  $AddonSelectionCopyWith<AddonSelection> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $AddonSelectionCopyWith<$Res> {
  factory $AddonSelectionCopyWith(
          AddonSelection value, $Res Function(AddonSelection) then) =
      _$AddonSelectionCopyWithImpl<$Res, AddonSelection>;
  @useResult
  $Res call({String addonId, String name, num price});
}

/// @nodoc
class _$AddonSelectionCopyWithImpl<$Res, $Val extends AddonSelection>
    implements $AddonSelectionCopyWith<$Res> {
  _$AddonSelectionCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? addonId = null,
    Object? name = null,
    Object? price = null,
  }) {
    return _then(_value.copyWith(
      addonId: null == addonId
          ? _value.addonId
          : addonId // ignore: cast_nullable_to_non_nullable
              as String,
      name: null == name
          ? _value.name
          : name // ignore: cast_nullable_to_non_nullable
              as String,
      price: null == price
          ? _value.price
          : price // ignore: cast_nullable_to_non_nullable
              as num,
    ) as $Val);
  }
}

/// @nodoc
abstract class _$$AddonSelectionImplCopyWith<$Res>
    implements $AddonSelectionCopyWith<$Res> {
  factory _$$AddonSelectionImplCopyWith(_$AddonSelectionImpl value,
          $Res Function(_$AddonSelectionImpl) then) =
      __$$AddonSelectionImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call({String addonId, String name, num price});
}

/// @nodoc
class __$$AddonSelectionImplCopyWithImpl<$Res>
    extends _$AddonSelectionCopyWithImpl<$Res, _$AddonSelectionImpl>
    implements _$$AddonSelectionImplCopyWith<$Res> {
  __$$AddonSelectionImplCopyWithImpl(
      _$AddonSelectionImpl _value, $Res Function(_$AddonSelectionImpl) _then)
      : super(_value, _then);

  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? addonId = null,
    Object? name = null,
    Object? price = null,
  }) {
    return _then(_$AddonSelectionImpl(
      addonId: null == addonId
          ? _value.addonId
          : addonId // ignore: cast_nullable_to_non_nullable
              as String,
      name: null == name
          ? _value.name
          : name // ignore: cast_nullable_to_non_nullable
              as String,
      price: null == price
          ? _value.price
          : price // ignore: cast_nullable_to_non_nullable
              as num,
    ));
  }
}

/// @nodoc

@JsonSerializable(explicitToJson: true)
class _$AddonSelectionImpl implements _AddonSelection {
  const _$AddonSelectionImpl(
      {required this.addonId, required this.name, required this.price});

  factory _$AddonSelectionImpl.fromJson(Map<String, dynamic> json) =>
      _$$AddonSelectionImplFromJson(json);

  @override
  final String addonId;
  @override
  final String name;
  @override
  final num price;

  @override
  String toString() {
    return 'AddonSelection(addonId: $addonId, name: $name, price: $price)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$AddonSelectionImpl &&
            (identical(other.addonId, addonId) || other.addonId == addonId) &&
            (identical(other.name, name) || other.name == name) &&
            (identical(other.price, price) || other.price == price));
  }

  @JsonKey(ignore: true)
  @override
  int get hashCode => Object.hash(runtimeType, addonId, name, price);

  @JsonKey(ignore: true)
  @override
  @pragma('vm:prefer-inline')
  _$$AddonSelectionImplCopyWith<_$AddonSelectionImpl> get copyWith =>
      __$$AddonSelectionImplCopyWithImpl<_$AddonSelectionImpl>(
          this, _$identity);

  @override
  Map<String, dynamic> toJson() {
    return _$$AddonSelectionImplToJson(
      this,
    );
  }
}

abstract class _AddonSelection implements AddonSelection {
  const factory _AddonSelection(
      {required final String addonId,
      required final String name,
      required final num price}) = _$AddonSelectionImpl;

  factory _AddonSelection.fromJson(Map<String, dynamic> json) =
      _$AddonSelectionImpl.fromJson;

  @override
  String get addonId;
  @override
  String get name;
  @override
  num get price;
  @override
  @JsonKey(ignore: true)
  _$$AddonSelectionImplCopyWith<_$AddonSelectionImpl> get copyWith =>
      throw _privateConstructorUsedError;
}

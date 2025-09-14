// coverage:ignore-file
// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'variant_selection.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

T _$identity<T>(T value) => value;

final _privateConstructorUsedError = UnsupportedError(
    'It seems like you constructed your class using `MyClass._()`. This constructor is only meant to be used by freezed and you are not supposed to need it nor use it.\nPlease check the documentation here for more information: https://github.com/rrousselGit/freezed#adding-getters-and-methods-to-our-models');

VariantSelection _$VariantSelectionFromJson(Map<String, dynamic> json) {
  return _VariantSelection.fromJson(json);
}

/// @nodoc
mixin _$VariantSelection {
  String get variantId => throw _privateConstructorUsedError;
  String get optionId => throw _privateConstructorUsedError;
  String get name => throw _privateConstructorUsedError;
  VariantOption get selectedOption => throw _privateConstructorUsedError;

  Map<String, dynamic> toJson() => throw _privateConstructorUsedError;
  @JsonKey(ignore: true)
  $VariantSelectionCopyWith<VariantSelection> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $VariantSelectionCopyWith<$Res> {
  factory $VariantSelectionCopyWith(
          VariantSelection value, $Res Function(VariantSelection) then) =
      _$VariantSelectionCopyWithImpl<$Res, VariantSelection>;
  @useResult
  $Res call(
      {String variantId,
      String optionId,
      String name,
      VariantOption selectedOption});

  $VariantOptionCopyWith<$Res> get selectedOption;
}

/// @nodoc
class _$VariantSelectionCopyWithImpl<$Res, $Val extends VariantSelection>
    implements $VariantSelectionCopyWith<$Res> {
  _$VariantSelectionCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? variantId = null,
    Object? optionId = null,
    Object? name = null,
    Object? selectedOption = null,
  }) {
    return _then(_value.copyWith(
      variantId: null == variantId
          ? _value.variantId
          : variantId // ignore: cast_nullable_to_non_nullable
              as String,
      optionId: null == optionId
          ? _value.optionId
          : optionId // ignore: cast_nullable_to_non_nullable
              as String,
      name: null == name
          ? _value.name
          : name // ignore: cast_nullable_to_non_nullable
              as String,
      selectedOption: null == selectedOption
          ? _value.selectedOption
          : selectedOption // ignore: cast_nullable_to_non_nullable
              as VariantOption,
    ) as $Val);
  }

  @override
  @pragma('vm:prefer-inline')
  $VariantOptionCopyWith<$Res> get selectedOption {
    return $VariantOptionCopyWith<$Res>(_value.selectedOption, (value) {
      return _then(_value.copyWith(selectedOption: value) as $Val);
    });
  }
}

/// @nodoc
abstract class _$$VariantSelectionImplCopyWith<$Res>
    implements $VariantSelectionCopyWith<$Res> {
  factory _$$VariantSelectionImplCopyWith(_$VariantSelectionImpl value,
          $Res Function(_$VariantSelectionImpl) then) =
      __$$VariantSelectionImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call(
      {String variantId,
      String optionId,
      String name,
      VariantOption selectedOption});

  @override
  $VariantOptionCopyWith<$Res> get selectedOption;
}

/// @nodoc
class __$$VariantSelectionImplCopyWithImpl<$Res>
    extends _$VariantSelectionCopyWithImpl<$Res, _$VariantSelectionImpl>
    implements _$$VariantSelectionImplCopyWith<$Res> {
  __$$VariantSelectionImplCopyWithImpl(_$VariantSelectionImpl _value,
      $Res Function(_$VariantSelectionImpl) _then)
      : super(_value, _then);

  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? variantId = null,
    Object? optionId = null,
    Object? name = null,
    Object? selectedOption = null,
  }) {
    return _then(_$VariantSelectionImpl(
      variantId: null == variantId
          ? _value.variantId
          : variantId // ignore: cast_nullable_to_non_nullable
              as String,
      optionId: null == optionId
          ? _value.optionId
          : optionId // ignore: cast_nullable_to_non_nullable
              as String,
      name: null == name
          ? _value.name
          : name // ignore: cast_nullable_to_non_nullable
              as String,
      selectedOption: null == selectedOption
          ? _value.selectedOption
          : selectedOption // ignore: cast_nullable_to_non_nullable
              as VariantOption,
    ));
  }
}

/// @nodoc

@JsonSerializable(explicitToJson: true)
class _$VariantSelectionImpl implements _VariantSelection {
  const _$VariantSelectionImpl(
      {required this.variantId,
      required this.optionId,
      required this.name,
      required this.selectedOption});

  factory _$VariantSelectionImpl.fromJson(Map<String, dynamic> json) =>
      _$$VariantSelectionImplFromJson(json);

  @override
  final String variantId;
  @override
  final String optionId;
  @override
  final String name;
  @override
  final VariantOption selectedOption;

  @override
  String toString() {
    return 'VariantSelection(variantId: $variantId, optionId: $optionId, name: $name, selectedOption: $selectedOption)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$VariantSelectionImpl &&
            (identical(other.variantId, variantId) ||
                other.variantId == variantId) &&
            (identical(other.optionId, optionId) ||
                other.optionId == optionId) &&
            (identical(other.name, name) || other.name == name) &&
            (identical(other.selectedOption, selectedOption) ||
                other.selectedOption == selectedOption));
  }

  @JsonKey(ignore: true)
  @override
  int get hashCode =>
      Object.hash(runtimeType, variantId, optionId, name, selectedOption);

  @JsonKey(ignore: true)
  @override
  @pragma('vm:prefer-inline')
  _$$VariantSelectionImplCopyWith<_$VariantSelectionImpl> get copyWith =>
      __$$VariantSelectionImplCopyWithImpl<_$VariantSelectionImpl>(
          this, _$identity);

  @override
  Map<String, dynamic> toJson() {
    return _$$VariantSelectionImplToJson(
      this,
    );
  }
}

abstract class _VariantSelection implements VariantSelection {
  const factory _VariantSelection(
      {required final String variantId,
      required final String optionId,
      required final String name,
      required final VariantOption selectedOption}) = _$VariantSelectionImpl;

  factory _VariantSelection.fromJson(Map<String, dynamic> json) =
      _$VariantSelectionImpl.fromJson;

  @override
  String get variantId;
  @override
  String get optionId;
  @override
  String get name;
  @override
  VariantOption get selectedOption;
  @override
  @JsonKey(ignore: true)
  _$$VariantSelectionImplCopyWith<_$VariantSelectionImpl> get copyWith =>
      throw _privateConstructorUsedError;
}

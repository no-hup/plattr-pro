// coverage:ignore-file
// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'variant_option.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

T _$identity<T>(T value) => value;

final _privateConstructorUsedError = UnsupportedError(
    'It seems like you constructed your class using `MyClass._()`. This constructor is only meant to be used by freezed and you are not supposed to need it nor use it.\nPlease check the documentation here for more information: https://github.com/rrousselGit/freezed#adding-getters-and-methods-to-our-models');

VariantOption _$VariantOptionFromJson(Map<String, dynamic> json) {
  return _VariantOption.fromJson(json);
}

/// @nodoc
mixin _$VariantOption {
  String get id => throw _privateConstructorUsedError;
  String get name => throw _privateConstructorUsedError;
  num get price => throw _privateConstructorUsedError;

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
  $Res call({String id, String name, num price});
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
    Object? price = null,
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
      price: null == price
          ? _value.price
          : price // ignore: cast_nullable_to_non_nullable
              as num,
    ) as $Val);
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
  $Res call({String id, String name, num price});
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
    Object? price = null,
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
      price: null == price
          ? _value.price
          : price // ignore: cast_nullable_to_non_nullable
              as num,
    ));
  }
}

/// @nodoc

@JsonSerializable(explicitToJson: true)
class _$VariantOptionImpl implements _VariantOption {
  const _$VariantOptionImpl(
      {required this.id, required this.name, required this.price});

  factory _$VariantOptionImpl.fromJson(Map<String, dynamic> json) =>
      _$$VariantOptionImplFromJson(json);

  @override
  final String id;
  @override
  final String name;
  @override
  final num price;

  @override
  String toString() {
    return 'VariantOption(id: $id, name: $name, price: $price)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$VariantOptionImpl &&
            (identical(other.id, id) || other.id == id) &&
            (identical(other.name, name) || other.name == name) &&
            (identical(other.price, price) || other.price == price));
  }

  @JsonKey(ignore: true)
  @override
  int get hashCode => Object.hash(runtimeType, id, name, price);

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
  const factory _VariantOption(
      {required final String id,
      required final String name,
      required final num price}) = _$VariantOptionImpl;

  factory _VariantOption.fromJson(Map<String, dynamic> json) =
      _$VariantOptionImpl.fromJson;

  @override
  String get id;
  @override
  String get name;
  @override
  num get price;
  @override
  @JsonKey(ignore: true)
  _$$VariantOptionImplCopyWith<_$VariantOptionImpl> get copyWith =>
      throw _privateConstructorUsedError;
}

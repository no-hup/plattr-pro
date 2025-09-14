// coverage:ignore-file
// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'timestamp.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

T _$identity<T>(T value) => value;

final _privateConstructorUsedError = UnsupportedError(
    'It seems like you constructed your class using `MyClass._()`. This constructor is only meant to be used by freezed and you are not supposed to need it nor use it.\nPlease check the documentation here for more information: https://github.com/rrousselGit/freezed#adding-getters-and-methods-to-our-models');

Timestamp _$TimestampFromJson(Map<String, dynamic> json) {
  return _Timestamp.fromJson(json);
}

/// @nodoc
mixin _$Timestamp {
  @JsonKey(name: '_seconds')
  int get seconds => throw _privateConstructorUsedError;
  @JsonKey(name: '_nanoseconds')
  int get nanoseconds => throw _privateConstructorUsedError;

  Map<String, dynamic> toJson() => throw _privateConstructorUsedError;
  @JsonKey(ignore: true)
  $TimestampCopyWith<Timestamp> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $TimestampCopyWith<$Res> {
  factory $TimestampCopyWith(Timestamp value, $Res Function(Timestamp) then) =
      _$TimestampCopyWithImpl<$Res, Timestamp>;
  @useResult
  $Res call(
      {@JsonKey(name: '_seconds') int seconds,
      @JsonKey(name: '_nanoseconds') int nanoseconds});
}

/// @nodoc
class _$TimestampCopyWithImpl<$Res, $Val extends Timestamp>
    implements $TimestampCopyWith<$Res> {
  _$TimestampCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? seconds = null,
    Object? nanoseconds = null,
  }) {
    return _then(_value.copyWith(
      seconds: null == seconds
          ? _value.seconds
          : seconds // ignore: cast_nullable_to_non_nullable
              as int,
      nanoseconds: null == nanoseconds
          ? _value.nanoseconds
          : nanoseconds // ignore: cast_nullable_to_non_nullable
              as int,
    ) as $Val);
  }
}

/// @nodoc
abstract class _$$TimestampImplCopyWith<$Res>
    implements $TimestampCopyWith<$Res> {
  factory _$$TimestampImplCopyWith(
          _$TimestampImpl value, $Res Function(_$TimestampImpl) then) =
      __$$TimestampImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call(
      {@JsonKey(name: '_seconds') int seconds,
      @JsonKey(name: '_nanoseconds') int nanoseconds});
}

/// @nodoc
class __$$TimestampImplCopyWithImpl<$Res>
    extends _$TimestampCopyWithImpl<$Res, _$TimestampImpl>
    implements _$$TimestampImplCopyWith<$Res> {
  __$$TimestampImplCopyWithImpl(
      _$TimestampImpl _value, $Res Function(_$TimestampImpl) _then)
      : super(_value, _then);

  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? seconds = null,
    Object? nanoseconds = null,
  }) {
    return _then(_$TimestampImpl(
      seconds: null == seconds
          ? _value.seconds
          : seconds // ignore: cast_nullable_to_non_nullable
              as int,
      nanoseconds: null == nanoseconds
          ? _value.nanoseconds
          : nanoseconds // ignore: cast_nullable_to_non_nullable
              as int,
    ));
  }
}

/// @nodoc

@JsonSerializable(explicitToJson: true)
class _$TimestampImpl implements _Timestamp {
  _$TimestampImpl(
      {@JsonKey(name: '_seconds') required this.seconds,
      @JsonKey(name: '_nanoseconds') required this.nanoseconds});

  factory _$TimestampImpl.fromJson(Map<String, dynamic> json) =>
      _$$TimestampImplFromJson(json);

  @override
  @JsonKey(name: '_seconds')
  final int seconds;
  @override
  @JsonKey(name: '_nanoseconds')
  final int nanoseconds;

  @override
  String toString() {
    return 'Timestamp(seconds: $seconds, nanoseconds: $nanoseconds)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$TimestampImpl &&
            (identical(other.seconds, seconds) || other.seconds == seconds) &&
            (identical(other.nanoseconds, nanoseconds) ||
                other.nanoseconds == nanoseconds));
  }

  @JsonKey(ignore: true)
  @override
  int get hashCode => Object.hash(runtimeType, seconds, nanoseconds);

  @JsonKey(ignore: true)
  @override
  @pragma('vm:prefer-inline')
  _$$TimestampImplCopyWith<_$TimestampImpl> get copyWith =>
      __$$TimestampImplCopyWithImpl<_$TimestampImpl>(this, _$identity);

  @override
  Map<String, dynamic> toJson() {
    return _$$TimestampImplToJson(
      this,
    );
  }
}

abstract class _Timestamp implements Timestamp {
  factory _Timestamp(
          {@JsonKey(name: '_seconds') required final int seconds,
          @JsonKey(name: '_nanoseconds') required final int nanoseconds}) =
      _$TimestampImpl;

  factory _Timestamp.fromJson(Map<String, dynamic> json) =
      _$TimestampImpl.fromJson;

  @override
  @JsonKey(name: '_seconds')
  int get seconds;
  @override
  @JsonKey(name: '_nanoseconds')
  int get nanoseconds;
  @override
  @JsonKey(ignore: true)
  _$$TimestampImplCopyWith<_$TimestampImpl> get copyWith =>
      throw _privateConstructorUsedError;
}

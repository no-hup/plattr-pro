import 'package:freezed_annotation/freezed_annotation.dart';

part 'variant_option.freezed.dart';
part 'variant_option.g.dart';

@freezed
class VariantOption with _$VariantOption {
  @JsonSerializable(explicitToJson: true)
  const factory VariantOption({
    required String id,
    required String name,
    required num price,
  }) = _VariantOption;

  factory VariantOption.fromJson(Map<String, dynamic> json) =>
      _$VariantOptionFromJson(json);
} 
import 'package:freezed_annotation/freezed_annotation.dart';
import 'variant_option.dart';

part 'variant_selection.freezed.dart';
part 'variant_selection.g.dart';

@freezed
class VariantSelection with _$VariantSelection {
  @JsonSerializable(explicitToJson: true)
  const factory VariantSelection({
    required String variantId,
    required String optionId,
    required String name,
    required VariantOption selectedOption,
  }) = _VariantSelection;

  factory VariantSelection.fromJson(Map<String, dynamic> json) =>
      _$VariantSelectionFromJson(json);
} 
import 'package:freezed_annotation/freezed_annotation.dart';

part 'addon_selection.freezed.dart';
part 'addon_selection.g.dart';

@freezed
class AddonSelection with _$AddonSelection {
  @JsonSerializable(explicitToJson: true)
  const factory AddonSelection({
    required String addonId,
    required String name,
    required num price,
  }) = _AddonSelection;

  factory AddonSelection.fromJson(Map<String, dynamic> json) =>
      _$AddonSelectionFromJson(json);
} 
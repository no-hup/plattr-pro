import 'package:json_annotation/json_annotation.dart';

part 'nutritional_info.g.dart';

@JsonSerializable(createToJson: true)
class NutritionalInfo {
  @JsonKey(defaultValue: 0)
  final num carbs;

  @JsonKey(defaultValue: 0)
  final num protein;

  @JsonKey(defaultValue: 0)
  final num fat;

  @JsonKey(defaultValue: 0)
  final num calories;

  const NutritionalInfo({
    this.carbs = 0,
    this.protein = 0,
    this.fat = 0,
    this.calories = 0,
  });

  factory NutritionalInfo.fromJson(Map<String, dynamic> json) => _$NutritionalInfoFromJson(json);
  Map<String, dynamic> toJson() => _$NutritionalInfoToJson(this);
}

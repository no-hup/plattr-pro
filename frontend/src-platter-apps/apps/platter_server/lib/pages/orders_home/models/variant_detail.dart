import 'package:json_annotation/json_annotation.dart';

part 'variant_detail.g.dart';

@JsonSerializable()
class VariantDetail {
  final String id;
  final bool isMandatory;
  final bool respectParentDiscount;

  VariantDetail({
    required this.id,
    required this.isMandatory,
    required this.respectParentDiscount,
  });

  factory VariantDetail.fromJson(Map<String, dynamic> json) => _$VariantDetailFromJson(json);

  Map<String, dynamic> toJson() => _$VariantDetailToJson(this);
}

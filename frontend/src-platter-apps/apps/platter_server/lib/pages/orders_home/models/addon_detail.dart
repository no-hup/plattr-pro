import 'package:json_annotation/json_annotation.dart';

part 'addon_detail.g.dart';

@JsonSerializable()
class AddonDetail {
  final String id;
  final String name;
  final num? price;

  AddonDetail({
    required this.id,
    required this.name,
    required this.price,
  });

  factory AddonDetail.fromJson(Map<String, dynamic> json) => _$AddonDetailFromJson(json);

  Map<String, dynamic> toJson() => _$AddonDetailToJson(this);
}

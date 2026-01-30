import 'package:json_annotation/json_annotation.dart';

part 'update_menu_item_availability_response.g.dart';

@JsonSerializable()
class UpdateMenuItemAvailabilityResponse {
  @JsonKey(required: true, disallowNullValue: true)
  final String menuItemId;

  @JsonKey(required: true, disallowNullValue: true)
  final bool isAvailable;

  UpdateMenuItemAvailabilityResponse({
    required this.menuItemId,
    required this.isAvailable,
  });

  factory UpdateMenuItemAvailabilityResponse.fromJson(Map<String, dynamic> json) =>
      _$UpdateMenuItemAvailabilityResponseFromJson(json);

  Map<String, dynamic> toJson() => _$UpdateMenuItemAvailabilityResponseToJson(this);
}

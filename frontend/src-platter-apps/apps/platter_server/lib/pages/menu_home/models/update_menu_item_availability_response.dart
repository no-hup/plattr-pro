import 'package:json_annotation/json_annotation.dart';
import 'menu_item.dart';

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

  factory UpdateMenuItemAvailabilityResponse.fromJson(
          Map<String, dynamic> json) =>
      UpdateMenuItemAvailabilityResponse(
        menuItemId: json['menuItemId'] as String,
        isAvailable: json['isAvailable'] as bool,
      );

  Map<String, dynamic> toJson() => {
        'menuItemId': menuItemId,
        'isAvailable': isAvailable,
      };
}

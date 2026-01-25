import 'package:json_annotation/json_annotation.dart';

part 'ui_flags.g.dart';

/// UI configuration flags returned from the backend to control
/// the appearance and behavior of the Orders Home screen.
@JsonSerializable()
class UiFlags {
  /// Whether to show the "All Orders" tab.
  /// Note: Currently All Orders == My Orders (scoped server-side).
  @JsonKey(defaultValue: true)
  final bool showAllOrdersTab;

  /// Maximum number of items to display in each order card.
  /// Items beyond this count will be indicated with "..." or similar.
  @JsonKey(defaultValue: 3)
  final int maxItemsInOrderCard;

  /// Whether to show a confirmation dialog before marking a cart as served.
  @JsonKey(defaultValue: true)
  final bool confirmServeCartAction;

  UiFlags({
    required this.showAllOrdersTab,
    required this.maxItemsInOrderCard,
    required this.confirmServeCartAction,
  });

  factory UiFlags.fromJson(Map<String, dynamic> json) => _$UiFlagsFromJson(json);

  Map<String, dynamic> toJson() => _$UiFlagsToJson(this);
  
  /// Default UiFlags when not provided by backend
  factory UiFlags.defaults() => UiFlags(
    showAllOrdersTab: true,
    maxItemsInOrderCard: 3,
    confirmServeCartAction: true,
  );
}

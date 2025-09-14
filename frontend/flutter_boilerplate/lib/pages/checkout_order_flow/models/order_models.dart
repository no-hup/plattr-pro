import 'package:freezed_annotation/freezed_annotation.dart';
import '../../../singletonGods/logger.dart';


part 'order_models.freezed.dart';
part 'order_models.g.dart';

// --- Orders Response Models ---

@freezed
class OrderResponse with _$OrderResponse {
  const factory OrderResponse({
    required String status,
    String? message,
    OrderData? data,
  }) = _OrderResponse;

  factory OrderResponse.fromJson(Map<String, dynamic> json) => _$OrderResponseFromJson(json);
}

// Extension for error state
extension OrderResponseErrorState on OrderResponse {
  static OrderResponse createErrorState() => const OrderResponse(
    status: 'error',
    message: 'Error parsing response',
    data: null,
  );
}

@freezed
class OrderData with _$OrderData {
  const factory OrderData({
    required String id,
    required String orderNumber,
    required String orderStatus,
    @TimestampConverter() DateTime? createdAt,
    @TimestampConverter() DateTime? updatedAt,
    required String tableId,
    required String restaurantId,
    required String sessionId,
    @Default(0.0) double total,
    @Default([]) List<OrderItem> items,
    @Default('') String notes,
    @Default([]) @JsonKey(name: 'carts', defaultValue: []) List<CartHistoryItem> carts,
  }) = _OrderData;

  factory OrderData.fromJson(Map<String, dynamic> json) => _$OrderDataFromJson(json);
}

// Extension for error state
extension OrderDataErrorState on OrderData {
  static OrderData createErrorState() => OrderData(
    id: '',
    orderNumber: '',
    orderStatus: '',
    tableId: '',
    restaurantId: '',
    sessionId: '',
  );
}

// Cart history item model
@freezed
class CartHistoryItem with _$CartHistoryItem {
  const factory CartHistoryItem({
    @Default('') String id,
    @Default('pending') String status,
    @JsonKey(name: 'checkoutTime') @TimestampConverter() DateTime? checkoutTime,
    @Default(0.0) double total,
    @JsonKey(name: 'priceInfo') CartPriceInfoDetail? priceInfo,
    @Default([]) List<OrderItem> items,
    String? notes,
    int? estimatedPrepTime,
  }) = _CartHistoryItem;

  factory CartHistoryItem.fromJson(Map<String, dynamic> json) => _$CartHistoryItemFromJson(json);
}

// Detailed price info for a cart
@freezed
class CartPriceInfoDetail with _$CartPriceInfoDetail {
  const factory CartPriceInfoDetail({
    @Default(0.0) double basePrice,
    @Default(0.0) double finalPrice,
    @Default(0.0) double discount,
    @Default(0.0) double totalDiscountAmount,
    @Default(0.0) double totalVariantBasePrice,
    @Default(0.0) double totalAddonBasePrice,
  }) = _CartPriceInfoDetail;

  factory CartPriceInfoDetail.fromJson(Map<String, dynamic> json) => _$CartPriceInfoDetailFromJson(json);
}

@freezed
class OrderItem with _$OrderItem {
  const factory OrderItem({
    required String menuItemId,
    required String name,
    @Default(1) int quantity,
    @Default(0.0) double price,
    @Default([]) List<OrderVariant> variants,
    @Default([]) List<OrderAddon> addons,
    String? cartItemId,
  }) = _OrderItem;

  factory OrderItem.fromJson(Map<String, dynamic> json) => _$OrderItemFromJson(json);
}

// Extension for error state
extension OrderItemErrorState on OrderItem {
  static OrderItem createErrorState() => const OrderItem(
    menuItemId: '',
    name: '',
  );
}

@freezed
class OrderVariant with _$OrderVariant {
  const factory OrderVariant({
    required String id,
    @Default(false) bool isMandatory,
    @Default(true) bool respectParentDiscount,
    required String selected_variant_id,
    required String selected_variant_name,
    required PriceInfo priceInfo,
  }) = _OrderVariant;

  factory OrderVariant.fromJson(Map<String, dynamic> json) => _$OrderVariantFromJson(json);
}

// Extension for error state
extension OrderVariantErrorState on OrderVariant {
  static OrderVariant createErrorState() => OrderVariant(
    id: '',
    selected_variant_id: '',
    selected_variant_name: '',
    priceInfo: const PriceInfo(),
  );
}

@freezed
class OrderAddon with _$OrderAddon {
  const factory OrderAddon({
    required String id,
    required String name,
    required PriceInfo priceInfo,
    @Default(true) bool respectParentDiscount,
  }) = _OrderAddon;

  factory OrderAddon.fromJson(Map<String, dynamic> json) => _$OrderAddonFromJson(json);
}

// Extension for error state
extension OrderAddonErrorState on OrderAddon {
  static OrderAddon createErrorState() => OrderAddon(
    id: '',
    name: '',
    priceInfo: const PriceInfo(),
  );
}

@freezed
class PriceInfo with _$PriceInfo {
  const factory PriceInfo({
    @Default(0.0) double basePrice,
    @Default(0.0) double finalPrice,
    @Default(0.0) double discount,
  }) = _PriceInfo;

  factory PriceInfo.fromJson(Map<String, dynamic> json) => _$PriceInfoFromJson(json);
}

// Helper for date time parsing - used by Freezed's JsonKey converters
class TimestampConverter implements JsonConverter<DateTime?, Map<String, dynamic>?> {
  const TimestampConverter();

  @override
  DateTime? fromJson(Map<String, dynamic>? json) {
    if (json == null) return null;
    
    try {
      if (json.containsKey('_seconds')) {
        final seconds = json['_seconds'] as int;
        return DateTime.fromMillisecondsSinceEpoch(seconds * 1000);
      }
    } catch (e) {
      AppLogger.log('❌ Error parsing timestamp: $e');
    }
    
    return null;
  }

  @override
  Map<String, dynamic>? toJson(DateTime? date) {
    if (date == null) return null;
    return {
      '_seconds': date.millisecondsSinceEpoch ~/ 1000,
      '_nanoseconds': 0
    };
  }
}

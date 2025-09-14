import 'package:freezed_annotation/freezed_annotation.dart';
import '../../../core/converters/firestore_timestamp_converter.dart';
import '../../../singletonGods/logger.dart';
import 'order_models.dart'; // Reuse PriceInfo from here

part 'get_order_models.freezed.dart';
part 'get_order_models.g.dart';

// --- Helper Functions for explicit toJson (Add if build fails) ---
// Uncomment if needed:
// Map<String, dynamic> _getOrderDataToJson(GetOrderData data) => data.toJson();
// List<Map<String, dynamic>> _orderItemListToJson(List<OrderItem> data) => data.map((e) => e.toJson()).toList();
// List<Map<String, dynamic>> _orderVariantListToJson(List<OrderVariant> data) => data.map((e) => e.toJson()).toList();
// List<Map<String, dynamic>> _orderAddonListToJson(List<OrderAddon> data) => data.map((e) => e.toJson()).toList();

/// Top-level API response parser for get order endpoint
class GetOrderApiParser {
  /// Parses a raw API response and determines if it's a success or error
  static GetOrderApiResult parseResponse(Map<String, dynamic> json) {
    if (json.containsKey('result') && json['result'] is Map<String, dynamic>) {
      try {
        final result = json['result'] as Map<String, dynamic>;
        
        // Parse status and message
        final status = result['status'] as String? ?? 'unknown';
        final message = result['message'] as String? ?? '';
        
        // Try to parse data if available
        if (result.containsKey('data') && result['data'] is Map<String, dynamic>) {
          final data = GetOrderData.fromJson(result['data'] as Map<String, dynamic>);
          return GetOrderApiResult.success(
            status: status,
            message: message,
            data: data,
          );
        } else {
          AppLogger.log('❌ GetOrderApiParser: Missing data in response: $result');
          return GetOrderApiResult.error(
            errorMessage: 'Missing data in order response',
          );
        }
      } catch (e, s) {
        AppLogger.log('❌ GetOrderApiParser: Error parsing success response: $e\n$s');
        return GetOrderApiResult.error(
          errorMessage: 'Failed to parse order response: $e',
        );
      }
    } else {
      AppLogger.log('❌ GetOrderApiParser: Unknown response structure: $json');
      return GetOrderApiResult.error(
        errorMessage: 'Received unknown response structure from order API',
      );
    }
  }
}

/// Top-Level Wrapper to handle different response types 
@freezed
class GetOrderApiResult with _$GetOrderApiResult {
  /// Success response containing order data
  const factory GetOrderApiResult.success({
    required String status,
    required String message,
    required GetOrderData data,
  }) = _GetOrderApiResultSuccess;
  
  /// Error response when API call fails
  const factory GetOrderApiResult.error({
    required String errorMessage,
  }) = _GetOrderApiResultError;
}

/// Order details within the "data" block
@freezed
class GetOrderData with _$GetOrderData {
  @JsonSerializable(explicitToJson: true)
  const factory GetOrderData({
    required String id,
    required String orderNumber,
    required String orderStatus,
    @FirestoreTimestampConverter() required DateTime createdAt,
    @FirestoreTimestampConverter() required DateTime updatedAt,
    required String tableId,
    required String restaurantId,
    required String sessionId,
    @Default(0) num total,
    @Default([]) List<GetOrderItem> items,
    String? notes,
  }) = _GetOrderData;
  
  factory GetOrderData.fromJson(Map<String, dynamic> json) => _$GetOrderDataFromJson(json);
}

/// Item model for items in a GetOrder response
@freezed
class GetOrderItem with _$GetOrderItem {
  @JsonSerializable(explicitToJson: true)
  const factory GetOrderItem({
    required String menuItemId,
    required String name,
    @Default(1) int quantity,
    @Default(0) num price,
    @Default([]) List<GetOrderVariant> variants,
    @Default([]) List<GetOrderAddon> addons,
  }) = _GetOrderItem;
  
  factory GetOrderItem.fromJson(Map<String, dynamic> json) => _$GetOrderItemFromJson(json);
}

/// Variant model for variants within an item
@freezed
class GetOrderVariant with _$GetOrderVariant {
  @JsonSerializable(explicitToJson: true)
  const factory GetOrderVariant({
    required String id,
    @Default(false) bool isMandatory,
    @Default(false) bool respectParentDiscount,
    @JsonKey(name: 'selected_variant_id') required String selectedVariantId,
    @JsonKey(name: 'selected_variant_name') required String selectedVariantName,
    required PriceInfo priceInfo,
  }) = _GetOrderVariant;
  
  factory GetOrderVariant.fromJson(Map<String, dynamic> json) => _$GetOrderVariantFromJson(json);
}

/// Addon model for addons within an item
@freezed
class GetOrderAddon with _$GetOrderAddon {
  @JsonSerializable(explicitToJson: true)
  const factory GetOrderAddon({
    required String id,
    required String name,
    @Default(false) bool respectParentDiscount,
    required PriceInfo priceInfo,
  }) = _GetOrderAddon;
  
  factory GetOrderAddon.fromJson(Map<String, dynamic> json) => _$GetOrderAddonFromJson(json);
} 
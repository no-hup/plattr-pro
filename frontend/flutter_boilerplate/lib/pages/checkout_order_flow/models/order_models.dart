import 'package:freezed_annotation/freezed_annotation.dart';

import '../../../singletonGods/logger.dart';

part 'order_models.freezed.dart';
part 'order_models.g.dart';

// --- Orders Response Models ---

@freezed
@JsonSerializable(explicitToJson: true, anyMap: true)
class OrderResponse with _$OrderResponse {
  const factory OrderResponse({
    required String status,
    String? message,
    OrderData? data,
  }) = _OrderResponse;

  const OrderResponse._();

  factory OrderResponse.fromJson(Map<String, dynamic> json) {
    try {
      // Handle the actual API response structure where result contains status, message, data
      if (json.containsKey('status') && json.containsKey('data')) {
        // Direct structure: { status, message, data }
        return _$OrderResponseFromJson(json);
      } else {
        // Fallback: create a response with the data directly
        AppLogger.log(
          '🔄 ORDER_MODEL: Using fallback parsing for response structure',
        );
        return OrderResponse(
          status: 'success',
          message: 'Order retrieved successfully',
          data: json.containsKey('data')
              ? OrderData.fromJson(json['data'] as Map<String, dynamic>)
              : null,
        );
      }
    } catch (e) {
      AppLogger.log('❌ ORDER_MODEL: Error parsing OrderResponse: $e');
      return OrderResponseErrorState.createErrorState();
    }
  }

  // Ensure instance-level toJson is available for generated serializers
  Map<String, dynamic> toJson() => _$OrderResponseToJson(this);
}

// Extension for error state
extension OrderResponseErrorState on OrderResponse {
  static OrderResponse createErrorState() => const OrderResponse(
        status: 'error',
        message: 'Error parsing response',
      );
}

@freezed
@JsonSerializable(explicitToJson: true, anyMap: true)
class OrderData with _$OrderData {
  const factory OrderData({
    required String id,
    required String orderNumber,
    required String orderStatus,
    required String tableId,
    required String restaurantId,
    required String sessionId,
    @TimestampConverter() DateTime? createdAt,
    @TimestampConverter() DateTime? updatedAt,
    @Default(0.0) double total,
    @Default([]) List<OrderItem> items,
    @Default('') String notes,
    @Default([])
    @JsonKey(name: 'carts', defaultValue: [])
    List<CartHistoryItem> carts,
  }) = _OrderData;

  const OrderData._();

  factory OrderData.fromJson(Map<String, dynamic> json) {
    try {
      AppLogger.log('🔄 ORDER_DATA: Starting to parse order data');
      AppLogger.log('🔄 ORDER_DATA: JSON keys: ${json.keys.toList()}');

      // Sanitize the JSON to handle potential type mismatches
      final sanitizedJson = <String, dynamic>{
        'id': json['id'] as String? ?? '',
        'orderNumber': json['orderNumber'] as String? ?? '',
        'orderStatus': json['orderStatus'] as String? ?? 'unknown',
        'createdAt': _coerceToTimestampMap(json['createdAt']),
        'updatedAt': _coerceToTimestampMap(json['updatedAt']),
        'tableId': json['tableId'] as String? ?? '',
        'restaurantId': json['restaurantId'] as String? ?? '',
        'sessionId': json['sessionId'] as String? ?? '',
        'total':
            (json['total'] is num) ? (json['total'] as num).toDouble() : 0.0,
        'items': json['items'] as List<dynamic>? ?? [],
        'notes': json['notes'] as String? ?? '',
        'carts': json['carts'] as List<dynamic>? ?? [],
      };

      AppLogger.log(
        '🔄 ORDER_DATA: Parsing order with ${sanitizedJson['items'].length} items and ${sanitizedJson['carts'].length} carts',
      );

      // Try to parse each item individually to identify issues
      for (var i = 0; i < (sanitizedJson['items'] as List).length; i++) {
        try {
          final item = (sanitizedJson['items'] as List)[i];
          if (item is Map<String, dynamic>) {
            AppLogger.log(
              '🔄 ORDER_DATA: Item $i - ${item['name']} (${item['quantity']}x)',
            );
          }
        } catch (e) {
          AppLogger.log('❌ ORDER_DATA: Error parsing item $i: $e');
        }
      }

      return _$OrderDataFromJson(sanitizedJson);
    } catch (e, stackTrace) {
      AppLogger.log('❌ ORDER_DATA: Error parsing OrderData: $e');
      AppLogger.log('❌ ORDER_DATA: Stack trace: $stackTrace');
      return OrderDataErrorState.createErrorState();
    }
  }

  Map<String, dynamic> toJson() => _$OrderDataToJson(this);
}

// Extension for error state
extension OrderDataErrorState on OrderData {
  static OrderData createErrorState() => const OrderData(
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
@JsonSerializable(explicitToJson: true, anyMap: true)
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

  const CartHistoryItem._();

  factory CartHistoryItem.fromJson(Map<String, dynamic> json) {
    try {
      // Sanitize the JSON to handle the actual API structure
      final sanitizedJson = <String, dynamic>{
        'id': json['cartId'] as String? ?? json['id'] as String? ?? '',
        'status': json['status'] as String? ?? 'pending',
        'checkoutTime': _coerceToTimestampMap(json['checkoutTime']),
        'total': (json['priceInfo'] is Map<String, dynamic>)
            ? ((json['priceInfo'] as Map<String, dynamic>)['finalPrice']
                        as num?)
                    ?.toDouble() ??
                0.0
            : 0.0,
        'priceInfo': json['priceInfo'],
        'items': _sanitizeCartItems(json['items'] as List<dynamic>? ?? []),
        'notes': json['notes'] as String?,
        'estimatedPrepTime': (json['estimatedPrepTime'] is num)
            ? (json['estimatedPrepTime'] as num).toInt()
            : null,
      };

      return _$CartHistoryItemFromJson(sanitizedJson);
    } catch (e) {
      AppLogger.log('❌ CART_HISTORY: Error parsing CartHistoryItem: $e');
      return const CartHistoryItem();
    }
  }

  Map<String, dynamic> toJson() => _$CartHistoryItemToJson(this);

  // Helper method to sanitize cart items for parsing
  static List<Map<String, dynamic>> _sanitizeCartItems(List<dynamic> items) {
    return items.map((item) {
      if (item is Map<String, dynamic>) {
        // Convert the cart item structure to match OrderItem structure
        return <String, dynamic>{
          'menuItemId': item['menuItemId'] as String? ?? '',
          'name': item['menuItem']?['meta']?['name'] as String? ??
              item['name'] as String? ??
              'Unknown Item',
          'quantity':
              (item['quantity'] is num) ? (item['quantity'] as num).toInt() : 1,
          'price':
              (item['price'] is num) ? (item['price'] as num).toDouble() : 0.0,
          'variants': _sanitizeVariants(
            item['selectedVariantsDetails'] as List<dynamic>? ?? [],
          ),
          'addons': _sanitizeAddons(
            item['selectedAddonsDetails'] as List<dynamic>? ?? [],
          ),
          'cartItemId': item['cartItemId']?.toString(),
        };
      }
      return <String, dynamic>{};
    }).toList();
  }

  // Helper method to sanitize variants
  static List<Map<String, dynamic>> _sanitizeVariants(List<dynamic> variants) {
    return variants.map((variant) {
      if (variant is Map<String, dynamic>) {
        return <String, dynamic>{
          'id': variant['id'] as String? ?? '',
          'isMandatory': variant['isMandatory'] as bool? ?? false,
          'respectParentDiscount':
              variant['respectParentDiscount'] as bool? ?? true,
          'selected_variant_id':
              variant['selected_variant_id'] as String? ?? '',
          'selected_variant_name':
              variant['selected_variant_name'] as String? ?? '',
          'priceInfo': variant['priceInfo'] as Map<String, dynamic>? ?? {},
        };
      }
      return <String, dynamic>{};
    }).toList();
  }

  // Helper method to sanitize addons
  static List<Map<String, dynamic>> _sanitizeAddons(List<dynamic> addons) {
    return addons.map((addon) {
      if (addon is Map<String, dynamic>) {
        return <String, dynamic>{
          'id': addon['id'] as String? ?? '',
          'name': addon['name'] as String? ?? '',
          'priceInfo': addon['priceInfo'] as Map<String, dynamic>? ?? {},
          'respectParentDiscount':
              addon['respectParentDiscount'] as bool? ?? true,
        };
      }
      return <String, dynamic>{};
    }).toList();
  }
}

// Detailed price info for a cart
@freezed
@JsonSerializable(explicitToJson: true, anyMap: true)
class CartPriceInfoDetail with _$CartPriceInfoDetail {
  const factory CartPriceInfoDetail({
    @Default(0.0) double basePrice,
    @Default(0.0) double finalPrice,
    @Default(0.0) double discount,
    @Default(0.0) double totalDiscountAmount,
    @Default(0.0) double totalVariantBasePrice,
    @Default(0.0) double totalAddonBasePrice,
  }) = _CartPriceInfoDetail;

  const CartPriceInfoDetail._();

  factory CartPriceInfoDetail.fromJson(Map<String, dynamic> json) {
    try {
      // Sanitize the JSON to handle the actual API structure
      final sanitizedJson = <String, dynamic>{
        'basePrice': (json['basePrice'] is num)
            ? (json['basePrice'] as num).toDouble()
            : 0.0,
        'finalPrice': (json['finalPrice'] is num)
            ? (json['finalPrice'] as num).toDouble()
            : 0.0,
        'discount': (json['totalDiscount'] is num)
            ? (json['totalDiscount'] as num).toDouble()
            : 0.0,
        'totalDiscountAmount': (json['totalDiscountAmount'] is num)
            ? (json['totalDiscountAmount'] as num).toDouble()
            : 0.0,
        'totalVariantBasePrice': (json['totalVariantBasePrice'] is num)
            ? (json['totalVariantBasePrice'] as num).toDouble()
            : 0.0,
        'totalAddonBasePrice': (json['totalAddonBasePrice'] is num)
            ? (json['totalAddonBasePrice'] as num).toDouble()
            : 0.0,
      };

      return _$CartPriceInfoDetailFromJson(sanitizedJson);
    } catch (e) {
      AppLogger.log('❌ CART_PRICE_INFO: Error parsing CartPriceInfoDetail: $e');
      return const CartPriceInfoDetail();
    }
  }

  Map<String, dynamic> toJson() => _$CartPriceInfoDetailToJson(this);
}

@freezed
@JsonSerializable(explicitToJson: true, anyMap: true)
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

  const OrderItem._();

  factory OrderItem.fromJson(Map<String, dynamic> json) {
    try {
      // Sanitize the JSON to handle the actual API structure
      final sanitizedJson = <String, dynamic>{
        'menuItemId': json['menuItemId'] as String? ?? '',
        'name': json['name'] as String? ?? 'Unknown Item',
        'quantity':
            (json['quantity'] is num) ? (json['quantity'] as num).toInt() : 1,
        'price':
            (json['price'] is num) ? (json['price'] as num).toDouble() : 0.0,
        'variants': json['variants'] as List<dynamic>? ?? [],
        'addons': json['addons'] as List<dynamic>? ?? [],
        'cartItemId': json['cartItemId']?.toString(),
      };

      return _$OrderItemFromJson(sanitizedJson);
    } catch (e) {
      AppLogger.log('❌ ORDER_ITEM: Error parsing OrderItem: $e');
      return OrderItemErrorState.createErrorState();
    }
  }

  Map<String, dynamic> toJson() => _$OrderItemToJson(this);
}

// Extension for error state
extension OrderItemErrorState on OrderItem {
  static OrderItem createErrorState() => const OrderItem(
        menuItemId: '',
        name: '',
      );
}

@freezed
@JsonSerializable(explicitToJson: true, anyMap: true)
class OrderVariant with _$OrderVariant {
  const factory OrderVariant({
    required String id,
    required String selected_variant_id,
    required String selected_variant_name,
    required PriceInfo priceInfo,
    @Default(false) bool isMandatory,
    @Default(true) bool respectParentDiscount,
  }) = _OrderVariant;

  const OrderVariant._();

  factory OrderVariant.fromJson(Map<String, dynamic> json) {
    try {
      // Sanitize the JSON to handle the actual API structure
      final sanitizedJson = <String, dynamic>{
        'id': json['id'] as String? ?? '',
        'isMandatory': json['isMandatory'] as bool? ?? false,
        'respectParentDiscount': json['respectParentDiscount'] as bool? ?? true,
        'selected_variant_id': json['selected_variant_id'] as String? ?? '',
        'selected_variant_name': json['selected_variant_name'] as String? ?? '',
        'priceInfo': json['priceInfo'] as Map<String, dynamic>? ?? {},
      };

      return _$OrderVariantFromJson(sanitizedJson);
    } catch (e) {
      AppLogger.log('❌ ORDER_VARIANT: Error parsing OrderVariant: $e');
      return OrderVariantErrorState.createErrorState();
    }
  }

  Map<String, dynamic> toJson() => _$OrderVariantToJson(this);
}

// Extension for error state
extension OrderVariantErrorState on OrderVariant {
  static OrderVariant createErrorState() => const OrderVariant(
        id: '',
        selected_variant_id: '',
        selected_variant_name: '',
        priceInfo: PriceInfo(),
      );
}

@freezed
@JsonSerializable(explicitToJson: true, anyMap: true)
class OrderAddon with _$OrderAddon {
  const factory OrderAddon({
    required String id,
    required String name,
    required PriceInfo priceInfo,
    @Default(true) bool respectParentDiscount,
  }) = _OrderAddon;

  const OrderAddon._();

  factory OrderAddon.fromJson(Map<String, dynamic> json) {
    try {
      // Sanitize the JSON to handle the actual API structure
      final sanitizedJson = <String, dynamic>{
        'id': json['id'] as String? ?? '',
        'name': json['name'] as String? ?? '',
        'priceInfo': json['priceInfo'] as Map<String, dynamic>? ?? {},
        'respectParentDiscount': json['respectParentDiscount'] as bool? ?? true,
      };

      return _$OrderAddonFromJson(sanitizedJson);
    } catch (e) {
      AppLogger.log('❌ ORDER_ADDON: Error parsing OrderAddon: $e');
      return OrderAddonErrorState.createErrorState();
    }
  }

  Map<String, dynamic> toJson() => _$OrderAddonToJson(this);
}

// Extension for error state
extension OrderAddonErrorState on OrderAddon {
  static OrderAddon createErrorState() => const OrderAddon(
        id: '',
        name: '',
        priceInfo: PriceInfo(),
      );
}

@freezed
@JsonSerializable(explicitToJson: true, anyMap: true)
class PriceInfo with _$PriceInfo {
  const factory PriceInfo({
    @Default(0.0) double basePrice,
    @Default(0.0) double finalPrice,
    @Default(0.0) double discount,
  }) = _PriceInfo;

  const PriceInfo._();

  factory PriceInfo.fromJson(Map<String, dynamic> json) {
    try {
      // Sanitize the JSON to handle the actual API structure
      final sanitizedJson = <String, dynamic>{
        'basePrice': (json['basePrice'] is num)
            ? (json['basePrice'] as num).toDouble()
            : 0.0,
        'finalPrice': (json['finalPrice'] is num)
            ? (json['finalPrice'] as num).toDouble()
            : 0.0,
        'discount': (json['discount'] is num)
            ? (json['discount'] as num).toDouble()
            : 0.0,
      };

      return _$PriceInfoFromJson(sanitizedJson);
    } catch (e) {
      AppLogger.log('❌ PRICE_INFO: Error parsing PriceInfo: $e');
      return const PriceInfo();
    }
  }

  Map<String, dynamic> toJson() => _$PriceInfoToJson(this);
}

// Helper for date time parsing - used by Freezed's JsonKey converters
class TimestampConverter
    implements JsonConverter<DateTime?, Map<String, dynamic>?> {
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
      '_nanoseconds': 0,
    };
  }
}

// Coerce various timestamp shapes into the Firestore-like map expected by TimestampConverter
Map<String, dynamic>? _coerceToTimestampMap(dynamic value) {
  try {
    if (value == null) return null;
    if (value is Map<String, dynamic>) {
      if (value.containsKey('_seconds')) return value;
      // Support Firestore Timestamp JSON format {seconds, nanoseconds}
      if (value.containsKey('seconds')) {
        final seconds = value['seconds'];
        final nanos = value['nanoseconds'] ?? 0;
        if (seconds is int || seconds is num) {
          return {
            '_seconds': (seconds as num).toInt(),
            '_nanoseconds': (nanos as num?)?.toInt() ?? 0,
          };
        }
      }
      return null;
    }
    if (value is int) {
      return {'_seconds': value, '_nanoseconds': 0};
    }
    if (value is num) {
      return {'_seconds': value.toInt(), '_nanoseconds': 0};
    }
    if (value is String && value.isNotEmpty) {
      final dt = DateTime.tryParse(value);
      if (dt != null) {
        return {
          '_seconds': dt.millisecondsSinceEpoch ~/ 1000,
          '_nanoseconds': 0,
        };
      }
    }
  } catch (_) {}
  return null;
}

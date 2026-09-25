import 'package:dio/dio.dart';
import 'package:platter_core/platter_core.dart';

/// TD-141: the backend sends UTC; the owner reads the restaurant's own clock (the device's).
DateTime? localTime(String? iso) => iso == null ? null : DateTime.tryParse(iso)?.toLocal();

/// API service for historical orders
class OrdersApiService {
  final Dio _dio = DioClient().dio;

  /// Get historical orders with pagination and date filtering
  Future<ApiResponse<HistoricalOrdersResponse>> getHistoricalOrders({
    required String restaurantId,
    required String sessionId,
    String? startDate,
    String? endDate,
    int pageSize = 20,
    String? cursor,
  }) async {
    try {
      final response = await _dio.post(
        '/admin-getHistoricalOrders',
        data: {
          'data': {
            'restaurantId': restaurantId,
            'sessionId': sessionId,
            if (startDate != null) 'startDate': startDate,
            if (endDate != null) 'endDate': endDate,
            'pageSize': pageSize,
            if (cursor != null) 'cursor': cursor,
          }
        },
      );

      return ResponseParser.parse<HistoricalOrdersResponse>(
        response,
        (json) => HistoricalOrdersResponse.fromJson(json as Map<String, dynamic>),
      );
    } on DioException catch (e) {
      final (code, msg) =
          DioClient.handleDioError(e, context: 'getHistoricalOrders');
      return ApiResponse.error(msg, errorCode: code);
    } catch (e) {
      return ApiResponse.error(e.toString(), errorCode: 'parsing_error');
    }
  }

  /// Get detailed order information
  Future<ApiResponse<OrderDetails>> getOrderDetails({
    required String restaurantId,
    required String sessionId,
    required String orderId,
  }) async {
    try {
      final response = await _dio.post(
        '/admin-getOrderDetails',
        data: {
          'data': {
            'restaurantId': restaurantId,
            'sessionId': sessionId,
            'orderId': orderId,
          }
        },
      );

      return ResponseParser.parse<OrderDetails>(
        response,
        (json) => OrderDetails.fromJson(
            (json['order'] as Map<String, dynamic>?) ?? json as Map<String, dynamic>),
      );
    } on DioException catch (e) {
      final (code, msg) =
          DioClient.handleDioError(e, context: 'getOrderDetails');
      return ApiResponse.error(msg, errorCode: code);
    } catch (e) {
      return ApiResponse.error(e.toString(), errorCode: 'parsing_error');
    }
  }
}

/// Response for historical orders list
class HistoricalOrdersResponse {
  final String restaurantId;
  final List<OrderSummary> orders;
  final int count;
  final bool hasMore;
  final String? nextCursor;

  HistoricalOrdersResponse({
    required this.restaurantId,
    required this.orders,
    required this.count,
    required this.hasMore,
    this.nextCursor,
  });

  factory HistoricalOrdersResponse.fromJson(Map<String, dynamic> json) {
    return HistoricalOrdersResponse(
      restaurantId: json['restaurantId'] as String? ?? '',
      orders: ((json['orders'] as List<dynamic>?) ?? [])
          .map((o) => OrderSummary.fromJson(o as Map<String, dynamic>))
          .toList(),
      count: json['count'] as int? ?? 0,
      hasMore: json['hasMore'] as bool? ?? false,
      nextCursor: json['nextCursor'] as String?,
    );
  }
}

/// Summary of an order for list view
class OrderSummary {
  final String id;
  final String? tableId;
  final String? tableNumber;
  final String status;
  final String paymentStatus;
  final double totalAmount;
  final int itemCount;
  final String? customerName;
  final String? customerPhone;
  final String? createdAt;
  final String? updatedAt;
  final int cartCount;

  OrderSummary({
    required this.id,
    this.tableId,
    this.tableNumber,
    required this.status,
    required this.paymentStatus,
    required this.totalAmount,
    required this.itemCount,
    this.customerName,
    this.customerPhone,
    this.createdAt,
    this.updatedAt,
    required this.cartCount,
  });

  factory OrderSummary.fromJson(Map<String, dynamic> json) {
    return OrderSummary(
      id: json['id'] as String? ?? '',
      tableId: json['tableId'] as String?,
      tableNumber: json['tableNumber'] as String?,
      status: json['status'] as String? ?? 'unknown',
      paymentStatus: json['paymentStatus'] as String? ?? 'pending',
      totalAmount: (json['totalAmount'] as num?)?.toDouble() ?? 0.0,
      itemCount: json['itemCount'] as int? ?? 0,
      customerName: json['customerName'] as String?,
      customerPhone: json['customerPhone'] as String?,
      createdAt: json['createdAt'] as String?,
      updatedAt: json['updatedAt'] as String?,
      cartCount: json['cartCount'] as int? ?? 0,
    );
  }

  DateTime? get createdAtDateTime => localTime(createdAt);
}

/// Detailed order information
class OrderDetails {
  final String id;
  final String? tableId;
  final String? tableNumber;
  final String status;
  final String paymentStatus;
  final String? customerName;
  final String? customerPhone;
  final String? createdAt;
  final String? updatedAt;
  final List<CartDetails> carts;
  /// TD-142: the order's own total, the same number as the list card (the carts carry no total).
  final double totalAmount;

  OrderDetails({
    required this.id,
    this.tableId,
    this.tableNumber,
    required this.status,
    required this.paymentStatus,
    this.customerName,
    this.customerPhone,
    this.createdAt,
    this.updatedAt,
    required this.carts,
    required this.totalAmount,
  });

  factory OrderDetails.fromJson(Map<String, dynamic> json) {
    return OrderDetails(
      id: json['id'] as String? ?? '',
      tableId: json['tableId'] as String?,
      tableNumber: json['tableNumber'] as String?,
      status: json['status'] as String? ?? 'unknown',
      paymentStatus: json['paymentStatus'] as String? ?? 'pending',
      customerName: json['customerName'] as String?,
      customerPhone: json['customerPhone'] as String?,
      createdAt: json['createdAt'] as String?,
      updatedAt: json['updatedAt'] as String?,
      carts: ((json['carts'] as List<dynamic>?) ?? [])
          .map((c) => CartDetails.fromJson(c as Map<String, dynamic>))
          .toList(),
      totalAmount: (json['totalAmount'] as num).toDouble(),
    );
  }

  int get totalItems {
    int count = 0;
    for (final cart in carts) {
      count += cart.items.fold(0, (sum, item) => sum + item.quantity);
    }
    return count;
  }
}

/// Cart details within an order
class CartDetails {
  final int cartNumber;
  final String status;
  final String? submittedAt;
  final String? servedAt;
  final Map<String, dynamic>? total;
  final List<CartItemDetails> items;

  CartDetails({
    required this.cartNumber,
    required this.status,
    this.submittedAt,
    this.servedAt,
    this.total,
    required this.items,
  });

  factory CartDetails.fromJson(Map<String, dynamic> json) {
    return CartDetails(
      cartNumber: json['cartNumber'] as int? ?? 1,
      status: json['status'] as String? ?? 'unknown',
      submittedAt: json['submittedAt'] as String?,
      servedAt: json['servedAt'] as String?,
      total: json['total'] as Map<String, dynamic>?,
      items: ((json['items'] as List<dynamic>?) ?? [])
          .map((i) => CartItemDetails.fromJson(i as Map<String, dynamic>))
          .toList(),
    );
  }
}

/// Item details within a cart
class CartItemDetails {
  final String id;
  final String name;
  final int quantity;
  final double price;
  final String? notes;
  final Map<String, dynamic>? selectedVariant;
  final List<dynamic> selectedAddons;

  CartItemDetails({
    required this.id,
    required this.name,
    required this.quantity,
    required this.price,
    this.notes,
    this.selectedVariant,
    required this.selectedAddons,
  });

  factory CartItemDetails.fromJson(Map<String, dynamic> json) {
    return CartItemDetails(
      id: json['id'] as String? ?? '',
      name: json['name'] as String? ?? 'Unknown Item',
      quantity: json['quantity'] as int? ?? 1,
      price: (json['price'] as num?)?.toDouble() ?? 0.0,
      notes: json['notes'] as String?,
      selectedVariant: json['selectedVariant'] as Map<String, dynamic>?,
      selectedAddons: (json['selectedAddons'] as List<dynamic>?) ?? [],
    );
  }
}

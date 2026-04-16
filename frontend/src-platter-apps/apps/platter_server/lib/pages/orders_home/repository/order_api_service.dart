import 'package:dio/dio.dart';
import '../models/order_list_response.dart';
import '../models/order_detail_response.dart';
import '../models/served_cart.dart';
import 'package:platter_core/platter_core.dart' hide DioClient;
import '../../../network/api_constants.dart';
import '../../../network/dio_client.dart';

class OrderApiService {
  final Dio _dio = DioClient().dio;

  /// Fetches active orders for a restaurant
  ///
  /// Returns a list of active orders for the given restaurant.
  /// Orders are filtered server-side to include only those:
  /// - Assigned to the current server
  /// - OR unassigned (no server)
  /// - OR with carts assigned to the current server
  Future<ApiResponse<OrderListResponse>> getActiveOrdersForRestaurant({
    required String restaurantId,
    required String sessionId,
    String? serverId,
  }) async {
    try {
      final response = await _dio.post(
        ApiConstants.getActiveOrdersForRestaurant,
        data: {
          'data': {
            'restaurantId': restaurantId,
            'sessionId': sessionId,
            if (serverId != null) 'serverId': serverId,
          }
        },
      );
      return ResponseParser.parse<OrderListResponse>(
        response,
        (jsonData) =>
            OrderListResponse.fromJson(jsonData as Map<String, dynamic>),
      );
    } on DioException catch (e) {
      final (code, msg) = DioClient.handleDioError(
        e,
        context: 'getActiveOrdersForRestaurant',
      );
      return ApiResponse<OrderListResponse>.error(
        msg,
        errorCode: code,
      );
    } catch (e) {
      return ApiResponse<OrderListResponse>.error(
        'Unexpected error while fetching orders: $e',
        errorCode: 'parsing_error',
      );
    }
  }

  /// Fetches server-enriched details for a specific order
  ///
  /// Returns detailed information about the order with [orderId]
  /// from the restaurant with [restaurantId], including server name.
  Future<ApiResponse<OrderDetailResponse>> getOrder({
    required String restaurantId,
    required String orderId,
  }) async {
    try {
      final response = await _dio.post(
        ApiConstants.getOrderDetails,
        data: {
          'data': {
            'restaurantId': restaurantId,
            'orderId': orderId,
          }
        },
      );
      return ResponseParser.parse<OrderDetailResponse>(
        response,
        (jsonData) =>
            OrderDetailResponse.fromJson(jsonData as Map<String, dynamic>),
      );
    } on DioException catch (e) {
      final (code, msg) = DioClient.handleDioError(
        e,
        context: 'getOrder',
      );
      return ApiResponse<OrderDetailResponse>.error(
        msg,
        errorCode: code,
      );
    } catch (e) {
      return ApiResponse<OrderDetailResponse>.error(
        'Unexpected error while fetching order details: $e',
        errorCode: 'parsing_error',
      );
    }
  }

  /// Mark a specific item as served (server-only endpoint)
  ///
  /// Requires [menuItemId] and optionally [cartItemId] for precise matching.
  Future<ApiResponse<bool>> markItemAsServed({
    required String restaurantId,
    required String orderId,
    required String menuItemId,
    int? cartItemId,
  }) async {
    try {
      final response = await _dio.post(
        ApiConstants.markItemServed,
        data: {
          'data': {
            'restaurantId': restaurantId,
            'orderId': orderId,
            'menuItemId': menuItemId,
            if (cartItemId != null) 'cartItemId': cartItemId,
          }
        },
      );

      return ResponseParser.parse<bool>(
        response,
        (_) => true,
      );
    } on DioException catch (e) {
      final (code, msg) = DioClient.handleDioError(
        e,
        context: 'markItemAsServed',
      );
      return ApiResponse<bool>.error(
        msg,
        errorCode: code,
      );
    } catch (e) {
      return ApiResponse<bool>.error(
        'Unexpected error while marking item as served: $e',
        errorCode: 'parsing_error',
      );
    }
  }

  /// Updates the status of an order (e.g., marking as COMPLETED)
  ///
  /// Changes the status of the order with [orderId] to [newStatus].
  /// Valid statuses: PENDING, IN_PROGRESS, COMPLETED, CANCELLED
  Future<ApiResponse<bool>> updateOrderStatus({
    required String restaurantId,
    required String orderId,
    required String orderStatus,
    required String sessionId,
  }) async {
    try {
      final response = await _dio.post(
        ApiConstants.updateOrderStatus,
        data: {
          'data': {
            'restaurantId': restaurantId,
            'orderId': orderId,
            'orderStatus': orderStatus,
            'sessionId': sessionId,
          }
        },
      );

      return ResponseParser.parse<bool>(
        response,
        (_) => true,
      );
    } on DioException catch (e) {
      final (code, msg) = DioClient.handleDioError(
        e,
        context: 'updateOrderStatus',
      );
      return ApiResponse<bool>.error(
        msg,
        errorCode: code,
      );
    } catch (e) {
      return ApiResponse<bool>.error(
        'Unexpected error while updating order status: $e',
        errorCode: 'parsing_error',
      );
    }
  }

  /// Updates the status of a cart within an order
  ///
  /// Used to mark cart items as delivered (SERVED), preparing, etc.
  /// Valid transitions: PENDING → PREPARING → READY → SERVED
  ///
  /// [cartIndex] is the zero-based index of the cart in the order's carts array.
  /// [newStatus] should be one of: PENDING, PREPARING, READY, SERVED, CANCELLED, RETURNED
  Future<ApiResponse<bool>> updateCartStatus({
    required String restaurantId,
    required String orderId,
    required int cartIndex,
    required String newStatus,
    String? sessionId,
    String? notes,
  }) async {
    try {
      final response = await _dio.post(
        ApiConstants.updateCartStatus,
        data: {
          'data': {
            'restaurantId': restaurantId,
            'orderId': orderId,
            'cartIndex': cartIndex,
            'newStatus': newStatus,
            if (sessionId != null) 'sessionId': sessionId,
            if (notes != null) 'notes': notes,
          }
        },
      );

      return ResponseParser.parse<bool>(
        response,
        (_) => true,
      );
    } on DioException catch (e) {
      final (code, msg) = DioClient.handleDioError(
        e,
        context: 'updateCartStatus',
      );
      return ApiResponse<bool>.error(
        msg,
        errorCode: code,
      );
    } catch (e) {
      return ApiResponse<bool>.error(
        'Unexpected error while updating cart status: $e',
        errorCode: 'parsing_error',
      );
    }
  }

  /// Mark a cart as served using the dedicated endpoint
  ///
  /// This endpoint:
  /// - Updates cart status to SERVED
  /// - Assigns the current server to the cart (for served tab filtering)
  /// - Marks all non-cancelled items as SERVED
  /// - Updates status history
  Future<ApiResponse<bool>> markCartAsServed({
    required String restaurantId,
    required String orderId,
    required int cartIndex,
    required String sessionId,
  }) async {
    try {
      final response = await _dio.post(
        ApiConstants.markCartAsServed,
        data: {
          'data': {
            'restaurantId': restaurantId,
            'orderId': orderId,
            'cartIndex': cartIndex,
            'sessionId': sessionId,
          }
        },
      );

      return ResponseParser.parse<bool>(
        response,
        (_) => true,
      );
    } on DioException catch (e) {
      final (code, msg) = DioClient.handleDioError(
        e,
        context: 'markCartAsServed',
      );
      return ApiResponse<bool>.error(
        msg,
        errorCode: code,
      );
    } catch (e) {
      return ApiResponse<bool>.error(
        'Unexpected error while marking cart as served: $e',
        errorCode: 'parsing_error',
      );
    }
  }

  /// Fetch served carts for the current server
  ///
  /// Returns carts that were served by or assigned to the current server
  /// within the last 6 hours (configurable via SERVED_CARTS_LOOKBACK_HOURS).
  Future<ApiResponse<ServedCartsResponse>> getServedCartsForServer({
    required String restaurantId,
    required String sessionId,
  }) async {
    try {
      final response = await _dio.post(
        ApiConstants.getServedCartsForServer,
        data: {
          'data': {
            'restaurantId': restaurantId,
            'sessionId': sessionId,
          }
        },
      );

      return ResponseParser.parse<ServedCartsResponse>(
        response,
        (jsonData) =>
            ServedCartsResponse.fromJson(jsonData as Map<String, dynamic>),
      );
    } on DioException catch (e) {
      final (code, msg) = DioClient.handleDioError(
        e,
        context: 'getServedCartsForServer',
      );
      return ApiResponse<ServedCartsResponse>.error(
        msg,
        errorCode: code,
      );
    } catch (e) {
      return ApiResponse<ServedCartsResponse>.error(
        'Unexpected error while fetching served carts: $e',
        errorCode: 'parsing_error',
      );
    }
  }

  /// Convenience method to mark a cart as delivered (SERVED)
  /// @deprecated Use markCartAsServed instead for better served tab tracking
  Future<ApiResponse<bool>> markCartAsDelivered({
    required String restaurantId,
    required String orderId,
    required int cartIndex,
    String? sessionId,
  }) {
    return updateCartStatus(
      restaurantId: restaurantId,
      orderId: orderId,
      cartIndex: cartIndex,
      newStatus: 'SERVED',
      sessionId: sessionId,
    );
  }

  /// Convenience method to mark an order as completed
  Future<ApiResponse<bool>> markOrderAsDone({
    required String restaurantId,
    required String orderId,
    required String sessionId,
  }) {
    return updateOrderStatus(
      restaurantId: restaurantId,
      orderId: orderId,
      orderStatus: 'COMPLETED',
      sessionId: sessionId,
    );
  }
}

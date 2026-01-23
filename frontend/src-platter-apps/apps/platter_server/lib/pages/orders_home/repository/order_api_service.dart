import 'package:dio/dio.dart';
import '../models/order_list_response.dart';
import '../models/order_detail_response.dart';
import '../../../network/api_constants.dart';
import '../../../network/response_parser.dart';
import '../../../network/api_response.dart';
import '../../../network/dio_client.dart';

class OrderApiService {
  final Dio _dio = DioClient().dio;

  /// Fetches active orders for a restaurant
  /// 
  /// Returns a list of active orders for the given restaurant.
  /// If [serverId] is provided, returns only orders assigned to that server.
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
        (jsonData) => OrderListResponse.fromJson(jsonData as Map<String, dynamic>),
        dataExtractor: (envelope) => {'orders': envelope['data']},
      );
    } on DioException catch (e) {
      final code = e.response?.statusCode?.toString() ?? 'dio_error';
      final msg = e.message ?? 'Failed to fetch orders';
      return ApiResponse<OrderListResponse>.error(
        'Network error: $msg', 
        errorCode: code,
      );
    } catch (e) {
      return ApiResponse<OrderListResponse>.error(
        'Unexpected error while fetching orders: $e', 
        errorCode: 'parsing_error',
      );
    }
  }

  /// Fetches details for a specific order
  /// 
  /// Returns detailed information about the order with [orderId]
  /// from the restaurant with [restaurantId].
  Future<ApiResponse<OrderDetailResponse>> getOrder({
    required String restaurantId,
    required String orderId,
  }) async {
    try {
      final response = await _dio.post(
        ApiConstants.getOrder,
        data: {
          'data': {
            'restaurantId': restaurantId,
            'orderId': orderId,
          }
        },
      );
      return ResponseParser.parse<OrderDetailResponse>(
        response,
        (jsonData) => OrderDetailResponse.fromJson(jsonData as Map<String, dynamic>),
      );
    } on DioException catch (e) {
      final code = e.response?.statusCode?.toString() ?? 'dio_error';
      final msg = e.message ?? 'Failed to fetch order details';
      return ApiResponse<OrderDetailResponse>.error(
        'Network error: $msg',
        errorCode: code,
      );
    } catch (e) {
      return ApiResponse<OrderDetailResponse>.error(
        'Unexpected error while fetching order details: $e',
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
      final code = e.response?.statusCode?.toString() ?? 'dio_error';
      final msg = e.message ?? 'Failed to update order status';
      return ApiResponse<bool>.error(
        'Network error: $msg',
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
      final code = e.response?.statusCode?.toString() ?? 'dio_error';
      final msg = e.message ?? 'Failed to update cart status';
      return ApiResponse<bool>.error(
        'Network error: $msg',
        errorCode: code,
      );
    } catch (e) {
      return ApiResponse<bool>.error(
        'Unexpected error while updating cart status: $e',
        errorCode: 'parsing_error',
      );
    }
  }

  /// Convenience method to mark a cart as delivered (SERVED)
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

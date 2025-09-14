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
  
  /// Updates the status of an order
  /// 
  /// Changes the status of the order with [orderId] to [newStatus].
  /// Returns the updated order details on success.
  Future<ApiResponse<bool>> updateOrderStatus({
    required String restaurantId,
    required String orderId,
    required String newStatus,
    required String sessionId,
  }) async {
    try {
      // Note: This is a placeholder for the actual API endpoint
      // Implement when the backend endpoint is available
      final response = await _dio.post(
        ApiConstants.getOrder, // Replace with actual endpoint
        data: {
          'data': {
            'restaurantId': restaurantId,
            'orderId': orderId,
            'status': newStatus,
            'sessionId': sessionId,
          }
        },
      );
      
      // Simplified response handling for the placeholder
      if (response.statusCode == 200 || response.statusCode == 201) {
        return ApiResponse<bool>.success(true, message: 'Order status updated successfully');
      } else {
        return ApiResponse<bool>.error('Failed to update order status', errorCode: 'api_error');
      }
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
}

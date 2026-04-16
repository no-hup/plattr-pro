import 'package:dio/dio.dart';
import 'package:platter_core/platter_core.dart';

import 'api_constants.dart';

/// Network-facing service for kitchen order operations.
///
/// Two endpoints only in this phase:
///  - `getActiveCartsForKitchen` — read-only list of active carts
///  - `updateCartStatus`         — cart-level mutation (used for Mark Ready)
///
/// Kept deliberately small: no history wiring, no item-level operations.
class KitchenOrderApiService {
  KitchenOrderApiService({Dio? dio}) : _dio = dio ?? DioClient().dio;

  final Dio _dio;

  /// Fetches all active (non-completed) orders for the kitchen, with their
  /// non-served carts. The backend enforces kitchen-role access via the
  /// session; the frontend does not need to forward a role.
  ///
  /// Returns the raw envelope `{ uiFlags, orders }` as a `Map<String, dynamic>`
  /// so the repository can do the flattening into `ActiveKitchenCart[]`.
  Future<ApiResponse<Map<String, dynamic>>> getActiveCartsForKitchen({
    required String restaurantId,
    required String sessionId,
  }) async {
    try {
      final response = await _dio.post(
        KitchenApiConstants.getActiveCartsForKitchen,
        data: {
          'data': {
            'restaurantId': restaurantId,
            'sessionId': sessionId,
          }
        },
      );
      return ResponseParser.parse<Map<String, dynamic>>(
        response,
        (jsonData) => jsonData as Map<String, dynamic>,
      );
    } on DioException catch (e) {
      final (code, msg) =
          DioClient.handleDioError(e, context: 'getActiveCartsForKitchen');
      return ApiResponse<Map<String, dynamic>>.error(msg, errorCode: code);
    } catch (e) {
      return ApiResponse<Map<String, dynamic>>.error(
        'Unexpected error while fetching kitchen carts: $e',
        errorCode: 'parsing_error',
      );
    }
  }

  /// Mutates a cart's status via the shared `cart-updateCartStatus` endpoint.
  /// Kitchen's only production use in this phase: `newStatus == 'READY'`.
  ///
  /// The backend enforces valid transitions (see
  /// `backend/src-plattr/functions/cart/updateCartStatus.js`). Invalid
  /// transitions surface here as an error `ApiResponse`.
  Future<ApiResponse<bool>> updateCartStatus({
    required String restaurantId,
    required String orderId,
    required int cartIndex,
    required String newStatus,
    required String sessionId,
    String? notes,
  }) async {
    try {
      final response = await _dio.post(
        KitchenApiConstants.updateCartStatus,
        data: {
          'data': {
            'restaurantId': restaurantId,
            'orderId': orderId,
            'cartIndex': cartIndex,
            'newStatus': newStatus,
            'sessionId': sessionId,
            if (notes != null) 'notes': notes,
          }
        },
      );
      return ResponseParser.parse<bool>(response, (_) => true);
    } on DioException catch (e) {
      final (code, msg) =
          DioClient.handleDioError(e, context: 'updateCartStatus');
      return ApiResponse<bool>.error(msg, errorCode: code);
    } catch (e) {
      return ApiResponse<bool>.error(
        'Unexpected error while updating cart status: $e',
        errorCode: 'parsing_error',
      );
    }
  }
}

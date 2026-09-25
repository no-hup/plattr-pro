import 'package:dio/dio.dart';
import 'package:flutterboilerplate/models/api_response.dart';
import 'package:flutterboilerplate/models/api_response_freezed.dart';
import 'package:flutterboilerplate/networking/dio_client.dart';
import 'package:flutterboilerplate/pages/checkout_order_flow/checkout_repository.dart';
import 'package:flutterboilerplate/pages/checkout_order_flow/models/checkout_models.dart';
import 'package:flutterboilerplate/pages/menuListing/models/cart_operation_response.dart';
import 'package:flutterboilerplate/singletonGods/api_constants.dart';
import 'package:flutterboilerplate/singletonGods/logger.dart';

class CartListingRepository {
  factory CartListingRepository() => _instance;

  CartListingRepository._internal()
      : _dio = DioClient().dio,
        _checkoutRepository = CheckoutRepository();
        
  static final CartListingRepository _instance = CartListingRepository._internal();
  final Dio _dio;
  final CheckoutRepository _checkoutRepository;

  Future<ApiResponse<CartOperationResponse>> fetchCart({
    required String tableId,
    required String restaurantId,
  }) async {
    try {
      AppLogger.log('🌐 API: Fetching cart');
      
      final payload = {
        'data': {
          'tableId': tableId,
          'restaurantId': restaurantId,
        },
      };
      AppLogger.log('📦 Request Payload: $payload');

      final response = await _dio.post(
        ApiConfig.fetchCartEndpoint,
        data: payload,
      );

      AppLogger.log('📡 API Response Status: ${response.statusCode}');
      AppLogger.log('📡 API Response Data: ${response.data}');

      if (response.statusCode == 200) {
        if (response.data is Map<String, dynamic>) {
          final jsonResponse = CartOperationResponse.fromJson(response.data as Map<String, dynamic>);
          return ApiResponse.success(jsonResponse);
        }
      }

      // Handle non-200 responses
      var errorMessage = 'Failed to fetch cart';
      var errorCode = 'HTTP_${response.statusCode}';

      if (response.data is Map<String, dynamic>) {
        final jsonResponse = response.data as Map<String, dynamic>;
        errorMessage = jsonResponse['message']?.toString() ?? errorMessage;
        errorCode = jsonResponse['errorCode']?.toString() ?? errorCode;
      }

      return ApiResponse.error(
        errorMessage,
        errorCode: errorCode,
      );

    } on DioException catch (e) {
      AppLogger.log('❌ Dio Error: $e');
      
      String errorMessage;
      String errorCode;
      
      switch (e.type) {
        case DioExceptionType.connectionTimeout:
        case DioExceptionType.sendTimeout:
        case DioExceptionType.receiveTimeout:
          errorMessage = 'Request timed out';
          errorCode = 'TIMEOUT_ERROR';
        case DioExceptionType.connectionError:
          errorMessage = 'No internet connection';
          errorCode = 'CONNECTION_ERROR';
        default:
          errorMessage = 'Network error: ${e.message}';
          errorCode = 'NETWORK_ERROR';
      }

      return ApiResponse.error(
        errorMessage,
        errorCode: errorCode,
      );
      
    } catch (e) {
      AppLogger.log('❌ General Error: $e');
      return ApiResponse.error(
        'Failed to fetch cart: $e',
        errorCode: 'UNKNOWN_ERROR',
      );
    }
  }

  /// Processes checkout of the current cart
  /// Returns ApiResponseFreezed<CheckoutResponse> with checkout details on success,
  /// or error information on failure
  Future<ApiResponseFreezed<CheckoutResponse>> checkoutCart({
    required String restaurantId,
    required String tableId, 
    required String sessionId,
    String? notes,
    String? requestId,
    List<int>? cartItemIds,
  }) async {
    AppLogger.log('🛒 CART REPO: Checking out cart for table $tableId in restaurant $restaurantId');
    
    // Delegate to the CheckoutRepository
    return _checkoutRepository.checkoutCart(
      restaurantId: restaurantId,
      tableId: tableId,
      sessionId: sessionId,
      notes: notes,
      requestId: requestId,
      cartItemIds: cartItemIds,
    );
  }
}

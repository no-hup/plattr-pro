import 'package:dio/dio.dart';
import 'package:flutterboilerplate/models/api_response.dart';
import 'package:flutterboilerplate/pages/menuListing/add_cart_response.dart' as legacy;
import 'package:flutterboilerplate/pages/menuListing/menu_response.dart';
import 'package:flutterboilerplate/pages/menuListing/models/cart_operation_response.dart';
import 'package:flutterboilerplate/pages/menuListing/response_parser.dart';
import 'package:flutterboilerplate/singletonGods/api_constants.dart';
import 'package:flutterboilerplate/singletonGods/logger.dart';

class MenuRepository {
  factory MenuRepository() => _instance;
  
  MenuRepository._internal() : _dio = Dio(BaseOptions(
    baseUrl: ApiConfig.baseUrl,
    connectTimeout: const Duration(seconds: 5),
    receiveTimeout: const Duration(seconds: 3),
    validateStatus: (status) => true,
  ));
  static final MenuRepository _instance = MenuRepository._internal();  
  final Dio _dio;

Future<ApiResponse<CartOperationResponse>> addItemToCart(    
  legacy.AddToCartRequest request, {
    required String tableId,
    required String restaurantId,
  }) async {
    try {
      AppLogger.log('🌐 API: Adding item to cart');
      AppLogger.log('📦 Request Payload: ${request.toJson()}');

      final payload = {
        'data': request.toJson(),
      };

      final response = await _dio.post(
        ApiConfig.addItemToCartEndpoint,
        data: payload,
      );

      AppLogger.log('📡 API Response Status: ${response.statusCode}');
      AppLogger.log('📡 API Response Data: ${response.data}');

      return ResponseParser.parseCartOperation(response);
    } on DioException catch (e) {
      AppLogger.log('❌ Dio Error: ${e.toString()}');
      
      // Handle specific Dio errors
      String errorMessage;
      String errorCode;
      
      switch (e.type) {
        case DioExceptionType.connectionTimeout:
        case DioExceptionType.sendTimeout:
        case DioExceptionType.receiveTimeout:
          errorMessage = 'Request timed out';
          errorCode = 'TIMEOUT_ERROR';
          break;
        case DioExceptionType.connectionError:
          errorMessage = 'No internet connection';
          errorCode = 'CONNECTION_ERROR';
          break;
        default:
          errorMessage = 'Network error: ${e.message}';
          errorCode = 'NETWORK_ERROR';
      }

      return ApiResponse.error(
        errorMessage,
        errorCode: errorCode,
      );
      
    } catch (e) {
      AppLogger.log('❌ General Error: ${e.toString()}');
      return ApiResponse.error(
        'Failed to add item to cart: $e',
        errorCode: 'UNKNOWN_ERROR',
      );
    }
  }

  Future<ApiResponse<MenuData>> fetchMenu({
    required String restaurantId,
    bool inStock = true,
  }) async {
    try {
      AppLogger.log('🌐 API: Fetching menu PARAMS: restaurantId=$restaurantId, inStock=$inStock');

      final payload = {
        'data': {
          'restaurantId': restaurantId,
          'inStock': inStock,
        }
      };
      AppLogger.log('📦 Request Payload: $payload');

      final response = await _dio.post(
        ApiConfig.menuFetch,
        data: payload,
      );

      AppLogger.log('📡 API Response Status: ${response.statusCode}');
      AppLogger.log('📡 API Response Data: ${response.data}');

      return ResponseParser.parseMenuResponse(response);
    } on DioException catch (e) {
      AppLogger.log('❌ Dio Error: ${e.toString()}');
      return ApiResponse.error(
        'Network error: ${e.message}',
        errorCode: 'NETWORK_ERROR',
      );
    } catch (e) {
      AppLogger.log('❌ General Error: ${e.toString()}');
      return ApiResponse.error(
        'Failed to fetch menu: $e',
        errorCode: 'UNKNOWN_ERROR',
      );
    }
  }

  // Helper method to process category IDs
  MenuData _processCategoryIds(MenuData menuData) {
    final processedMenuItems = Map<String, List<MenuItem>>.from(
      menuData.menuItems.map((categoryId, items) {
        final processedItems = items.map((item) {
          // Add categoryId to each menu item
          return item.copyWith(categoryId: categoryId);
        }).toList();
        return MapEntry(categoryId, processedItems);
      }),
    );
    return menuData.copyWith(menuItems: processedMenuItems);
  }

Future<ApiResponse<CartOperationResponse>> removeItemFromCart(
  legacy.RemoveFromCartRequest request, {
  required String tableId,
  required String restaurantId,
}) async {
  try {
    AppLogger.log('🌐 API: Removing item from cart');
    AppLogger.log('📦 Request Payload: ${request.toJson()}');

    final payload = {
      'data': request.toJson(),
    };

    final response = await _dio.post(
      ApiConfig.removeItemFromCartEndpoint,
      data: payload,
    );

    AppLogger.log('📡 API Response Status: ${response.statusCode}');
    AppLogger.log('📡 API Response Data: ${response.data}');

    return ResponseParser.parseCartOperation(response);
  } on DioException catch (e) {
    AppLogger.log('❌ Dio Error: ${e.toString()}');
    
    String errorMessage;
    String errorCode;
    
    switch (e.type) {
      case DioExceptionType.connectionTimeout:
      case DioExceptionType.sendTimeout:
      case DioExceptionType.receiveTimeout:
        errorMessage = 'Request timed out';
        errorCode = 'TIMEOUT_ERROR';
        break;
      case DioExceptionType.connectionError:
        errorMessage = 'No internet connection';
        errorCode = 'CONNECTION_ERROR';
        break;
      default:
        errorMessage = 'Network error: ${e.message}';
        errorCode = 'NETWORK_ERROR';
    }

    return ApiResponse.error(
      errorMessage,
      errorCode: errorCode,
    );
    
  } catch (e) {
    AppLogger.log('❌ General Error: ${e.toString()}');
    return ApiResponse.error(
      'Failed to remove item from cart: $e',
      errorCode: 'UNKNOWN_ERROR',
    );
  }
}

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
        }
      };
      AppLogger.log('📦 Request Payload: $payload');

      final response = await _dio.post(
        ApiConfig.fetchCartEndpoint,
        data: payload,
      );

      AppLogger.log('📡 API Response Status: ${response.statusCode}');
      
      // Log the complete structure for debugging
      if (response.data is Map<String, dynamic>) {
        final data = response.data as Map<String, dynamic>;
        AppLogger.log('📡 API Response Data Keys: ${data.keys.toList()}');
        AppLogger.log('📡 FULL API Response RAW: ${response.data}');
        
        // Log specific parts if they exist
        if (data.containsKey('data')) {
          AppLogger.log('📡 data field type: ${data['data']?.runtimeType}');
          
          if (data['data'] is Map<String, dynamic>) {
            final innerData = data['data'] as Map<String, dynamic>;
            AppLogger.log('📡 inner data keys: ${innerData.keys.toList()}');
            
            if (innerData.containsKey('cart')) {
              AppLogger.log('📡 cart field type: ${innerData['cart']?.runtimeType}');
              AppLogger.log('📡 cart field content: ${innerData['cart']}');
              
              if (innerData['cart'] is Map<String, dynamic>) {
                final cartData = innerData['cart'] as Map<String, dynamic>;
                AppLogger.log('📡 cart keys: ${cartData.keys.toList()}');
                
                if (cartData.containsKey('items')) {
                  AppLogger.log('📡 items field type: ${cartData['items']?.runtimeType}');
                  AppLogger.log('📡 items count: ${cartData['items'] is List ? (cartData['items'] as List).length : 'not a list'}');
                  AppLogger.log('📡 items content: ${cartData['items']}');
                } else {
                  AppLogger.log('⚠️ No "items" key found in cart!');
                }
              }
            } else {
              AppLogger.log('⚠️ No "cart" key found in data!');
            }
          }
        } else {
          AppLogger.log('📡 API Response Data Type: ${response.data?.runtimeType}');
          AppLogger.log('📡 API Response Data: ${response.data}');
        }
      } else {
        AppLogger.log('📡 API Response Data Type: ${response.data?.runtimeType}');
        AppLogger.log('📡 API Response Data: ${response.data}');
      }

      // Parse the cart operation response
      final parsedResponse = ResponseParser.parseCartOperation(response);
      
      // Additional logging on the result
      AppLogger.log('📡 Parsed response success: ${parsedResponse.success}');
      if (parsedResponse.data != null) {
        AppLogger.log('📡 CartOperationResponse has data: true');
        if (parsedResponse.data!.data != null) {
          AppLogger.log('📡 CartResponseData exists: true');
          AppLogger.log('📡 Cart exists: ${parsedResponse.data!.data!.cart != null}');
          AppLogger.log('📡 Cart items count: ${parsedResponse.data!.data!.cart.items.length}');
          AppLogger.log('📡 Cart items content: ${parsedResponse.data!.data!.cart.items}');
        } else {
          AppLogger.log('📡 CartResponseData is null');
        }
      } else {
        AppLogger.log('📡 CartOperationResponse data is null');
      }
      
      return parsedResponse;
    } on DioException catch (e) {
      AppLogger.log('❌ Dio Error: ${e.toString()}');
      
      // Handle specific Dio errors
      String errorMessage;
      String errorCode;
      
      switch (e.type) {
        case DioExceptionType.connectionTimeout:
        case DioExceptionType.sendTimeout:
        case DioExceptionType.receiveTimeout:
          errorMessage = 'Request timed out';
          errorCode = 'TIMEOUT_ERROR';
          break;
        case DioExceptionType.connectionError:
          errorMessage = 'No internet connection';
          errorCode = 'CONNECTION_ERROR';
          break;
        default:
          errorMessage = 'Network error: ${e.message}';
          errorCode = 'NETWORK_ERROR';
      }

      return ApiResponse.error(
        errorMessage,
        errorCode: errorCode,
      );
      
    } catch (e) {
      AppLogger.log('❌ General Error: ${e.toString()}');
      return ApiResponse.error(
        'Failed to fetch cart: $e',
        errorCode: 'UNKNOWN_ERROR',
      );
    }
  }
}
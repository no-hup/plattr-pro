import 'package:dio/dio.dart';
import 'package:platter_core/platter_core.dart';

class AdminMenuApiService {
  final Dio _dio = DioClient().dio;

  Future<ApiResponse<FullRestaurantMenuResponse>> getRestaurantMenu({
    required String restaurantId,
    required String sessionId,
  }) async {
    try {
      final response = await _dio.post(
        '/menu-getRestaurantMenu',
        data: {
          'data': {
            'restaurantId': restaurantId,
            'sessionId': sessionId,
          }
        },
      );

      return ResponseParser.parse<FullRestaurantMenuResponse>(
        response,
        (json) => FullRestaurantMenuResponse.fromJson(
          json as Map<String, dynamic>,
        ),
      );
    } on DioException catch (e) {
      final (code, msg) =
          DioClient.handleDioError(e, context: 'getRestaurantMenu');
      return ApiResponse.error(msg, errorCode: code);
    } catch (e) {
      return ApiResponse.error(e.toString(), errorCode: 'parsing_error');
    }
  }

  Future<ApiResponse<void>> addCategory({
    required String restaurantId,
    required String sessionId,
    required Map<String, dynamic> category,
  }) async {
    try {
      final response = await _dio.post(
        '/admin-addCategory',
        data: {
          'data': {
            'restaurantId': restaurantId,
            'sessionId': sessionId,
            'category': category,
          }
        },
      );

      return ResponseParser.parse<void>(response, (_) => null);
    } on DioException catch (e) {
      final (code, msg) = DioClient.handleDioError(e, context: 'addCategory');
      return ApiResponse.error(msg, errorCode: code);
    } catch (e) {
      return ApiResponse.error(e.toString(), errorCode: 'parsing_error');
    }
  }

  Future<ApiResponse<void>> updateCategory({
    required String restaurantId,
    required String sessionId,
    required String categoryId,
    required Map<String, dynamic> updateData,
  }) async {
    try {
      final response = await _dio.post(
        '/admin-updateCategory',
        data: {
          'data': {
            'restaurantId': restaurantId,
            'sessionId': sessionId,
            'categoryId': categoryId,
            'updateData': updateData,
          }
        },
      );

      return ResponseParser.parse<void>(response, (_) => null);
    } on DioException catch (e) {
      final (code, msg) =
          DioClient.handleDioError(e, context: 'updateCategory');
      return ApiResponse.error(msg, errorCode: code);
    } catch (e) {
      return ApiResponse.error(e.toString(), errorCode: 'parsing_error');
    }
  }

  Future<ApiResponse<void>> deleteCategory({
    required String restaurantId,
    required String sessionId,
    required String categoryId,
  }) async {
    try {
      final response = await _dio.post(
        '/admin-deleteCategory',
        data: {
          'data': {
            'restaurantId': restaurantId,
            'sessionId': sessionId,
            'categoryId': categoryId,
          }
        },
      );

      return ResponseParser.parse<void>(response, (_) => null);
    } on DioException catch (e) {
      final (code, msg) =
          DioClient.handleDioError(e, context: 'deleteCategory');
      return ApiResponse.error(msg, errorCode: code);
    } catch (e) {
      return ApiResponse.error(e.toString(), errorCode: 'parsing_error');
    }
  }

  Future<ApiResponse<void>> addSubcategory({
    required String restaurantId,
    required String sessionId,
    required Map<String, dynamic> subcategory,
  }) async {
    try {
      final response = await _dio.post(
        '/admin-addSubcategory',
        data: {
          'data': {
            'restaurantId': restaurantId,
            'sessionId': sessionId,
            'subcategory': subcategory,
          }
        },
      );

      return ResponseParser.parse<void>(response, (_) => null);
    } on DioException catch (e) {
      final (code, msg) =
          DioClient.handleDioError(e, context: 'addSubcategory');
      return ApiResponse.error(msg, errorCode: code);
    } catch (e) {
      return ApiResponse.error(e.toString(), errorCode: 'parsing_error');
    }
  }

  Future<ApiResponse<void>> updateSubcategory({
    required String restaurantId,
    required String sessionId,
    required String subcategoryId,
    required Map<String, dynamic> updateData,
  }) async {
    try {
      final response = await _dio.post(
        '/admin-updateSubcategory',
        data: {
          'data': {
            'restaurantId': restaurantId,
            'sessionId': sessionId,
            'subcategoryId': subcategoryId,
            'updateData': updateData,
          }
        },
      );

      return ResponseParser.parse<void>(response, (_) => null);
    } on DioException catch (e) {
      final (code, msg) =
          DioClient.handleDioError(e, context: 'updateSubcategory');
      return ApiResponse.error(msg, errorCode: code);
    } catch (e) {
      return ApiResponse.error(e.toString(), errorCode: 'parsing_error');
    }
  }

  Future<ApiResponse<void>> deleteSubcategory({
    required String restaurantId,
    required String sessionId,
    required String subcategoryId,
  }) async {
    try {
      final response = await _dio.post(
        '/admin-deleteSubcategory',
        data: {
          'data': {
            'restaurantId': restaurantId,
            'sessionId': sessionId,
            'subcategoryId': subcategoryId,
          }
        },
      );

      return ResponseParser.parse<void>(response, (_) => null);
    } on DioException catch (e) {
      final (code, msg) =
          DioClient.handleDioError(e, context: 'deleteSubcategory');
      return ApiResponse.error(msg, errorCode: code);
    } catch (e) {
      return ApiResponse.error(e.toString(), errorCode: 'parsing_error');
    }
  }

  Future<ApiResponse<void>> addMenuItem({
    required String restaurantId,
    required String sessionId,
    required Map<String, dynamic> menuItemData,
  }) async {
    try {
      final response = await _dio.post(
        '/menu-addMenuItem',
        data: {
          'data': {
            'restaurantId': restaurantId,
            'sessionId': sessionId,
            'menuItemData': menuItemData,
          }
        },
      );

      return ResponseParser.parse<void>(response, (_) => null);
    } on DioException catch (e) {
      final (code, msg) =
          DioClient.handleDioError(e, context: 'addMenuItem');
      return ApiResponse.error(msg, errorCode: code);
    } catch (e) {
      return ApiResponse.error(e.toString(), errorCode: 'parsing_error');
    }
  }

  Future<ApiResponse<void>> updateMenuItem({
    required String restaurantId,
    required String sessionId,
    required String menuItemId,
    required Map<String, dynamic> updateData,
  }) async {
    try {
      final response = await _dio.post(
        '/menu-updateMenuItem',
        data: {
          'data': {
            'restaurantId': restaurantId,
            'sessionId': sessionId,
            'menuItemId': menuItemId,
            'updateData': updateData,
          }
        },
      );

      return ResponseParser.parse<void>(response, (_) => null);
    } on DioException catch (e) {
      final (code, msg) =
          DioClient.handleDioError(e, context: 'updateMenuItem');
      return ApiResponse.error(msg, errorCode: code);
    } catch (e) {
      return ApiResponse.error(e.toString(), errorCode: 'parsing_error');
    }
  }

  Future<ApiResponse<void>> deleteMenuItem({
    required String restaurantId,
    required String sessionId,
    required String menuItemId,
  }) async {
    try {
      final response = await _dio.post(
        '/menu-deleteMenuItem',
        data: {
          'data': {
            'restaurantId': restaurantId,
            'sessionId': sessionId,
            'menuItemId': menuItemId,
          }
        },
      );

      return ResponseParser.parse<void>(response, (_) => null);
    } on DioException catch (e) {
      final (code, msg) =
          DioClient.handleDioError(e, context: 'deleteMenuItem');
      return ApiResponse.error(msg, errorCode: code);
    } catch (e) {
      return ApiResponse.error(e.toString(), errorCode: 'parsing_error');
    }
  }

  Future<ApiResponse<UpdateMenuItemAvailabilityResponse>>
      updateMenuItemAvailability({
    required String restaurantId,
    required String sessionId,
    required String menuItemId,
    required bool isAvailable,
  }) async {
    try {
      final response = await _dio.post(
        '/menu-updateMenuItemAvailability',
        data: {
          'restaurantId': restaurantId,
          'sessionId': sessionId,
          'menuItemId': menuItemId,
          'isAvailable': isAvailable,
        },
      );

      return ResponseParser.parse<UpdateMenuItemAvailabilityResponse>(
        response,
        (json) => UpdateMenuItemAvailabilityResponse.fromJson(
          json as Map<String, dynamic>,
        ),
      );
    } on DioException catch (e) {
      final (code, msg) = DioClient.handleDioError(
        e,
        context: 'updateMenuItemAvailability',
      );
      return ApiResponse.error(msg, errorCode: code);
    } catch (e) {
      return ApiResponse.error(e.toString(), errorCode: 'parsing_error');
    }
  }
}

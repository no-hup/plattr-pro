import 'package:dio/dio.dart';
import 'package:platter_core/platter_core.dart' hide DioClient;
import '../../../network/api_constants.dart';
import '../../../network/dio_client.dart';

/// Service for handling menu-related API requests
class MenuApiService {
  final Dio _dio = DioClient().dio;

  /// Fetches the full restaurant menu
  Future<ApiResponse<FullRestaurantMenuResponse>> getRestaurantMenu({
    required String restaurantId,
    required String sessionId,
  }) async {
    try {
      AppLogger.log('⬆️ Sending request to ${ApiConstants.getRestaurantMenu}');

      final response = await _dio.post(
        ApiConstants.getRestaurantMenu,
        data: {
          'data': {
            'restaurantId': restaurantId,
            'sessionId': sessionId,
          }
        },
      );

      AppLogger.log('⬇️ Response received. Status: ${response.statusCode}');

      // Extract the response data using a direct approach
      try {
        // Step 1: Get and validate top-level response
        final rawData = response.data as Map<String, dynamic>;
        AppLogger.log('Response keys: ${rawData.keys}');

        // Step 2: Get and validate result object
        if (!rawData.containsKey('result')) {
          return ApiResponse<FullRestaurantMenuResponse>.error(
            'API response missing result field',
            errorCode: 'missing_result',
          );
        }

        final result = rawData['result'] as Map<String, dynamic>;
        AppLogger.log('Result keys: ${result.keys}');

        // Get the success flag and message
        // The backend is not consistent: ResponseBuilder.success() (used by
        // menu-getRestaurantMenu) returns {status: 'success'}, while a few
        // hand-rolled handlers return {success: true}. Accept either, the way
        // table_api_service.dart and platter_core's ResponseParser already do.
        final statusValue = result['status'];
        final success = statusValue is String
            ? statusValue.toLowerCase() == 'success'
            : result['success'] as bool? ?? false;
        final message = result['message'] as String?;

        if (!success) {
          return ApiResponse<FullRestaurantMenuResponse>.error(
            message ?? 'API returned failure',
            errorCode: 'api_failure',
          );
        }

        // Step 3: Get and validate data object
        if (!result.containsKey('data')) {
          return ApiResponse<FullRestaurantMenuResponse>.error(
            'API result missing data field',
            errorCode: 'missing_data',
          );
        }

        final data = result['data'] as Map<String, dynamic>;
        AppLogger.log('API data keys: ${data.keys}');

        // Step 4: Direct manual mapping of the response
        try {
          // Process categories
          final List<MenuCategory> categories = [];
          if (data.containsKey('categories') && data['categories'] is List) {
            final categoriesJson = data['categories'] as List;
            AppLogger.log('📚 Processing ${categoriesJson.length} categories');

            for (var categoryJson in categoriesJson) {
              try {
                if (categoryJson is Map<String, dynamic>) {
                  final category = MenuCategory(
                    id: categoryJson['id'] as String,
                    name: categoryJson['name'] as String,
                    description: categoryJson['description'] as String? ?? '',
                    image: categoryJson['image'] as String? ?? '',
                    order: categoryJson['order'] as int? ?? 0,
                  );
                  categories.add(category);
                }
              } catch (e) {
                AppLogger.log('⚠️ Error processing category: $e');
                // Continue with next category
              }
            }
          }
          AppLogger.log(
              '✅ Processed ${categories.length} categories successfully');

          // Process menuItems
          final Map<String, List<MenuItem>> menuItems = {};
          if (data.containsKey('menuItems') && data['menuItems'] is Map) {
            final menuItemsJson = data['menuItems'] as Map<String, dynamic>;
            AppLogger.log(
                '🍽 Processing menu items for ${menuItemsJson.keys.length} categories');

            menuItemsJson.forEach((categoryId, itemsList) {
              try {
                if (itemsList is List) {
                  final List<MenuItem> categoryItems = [];
                  for (var itemJson in itemsList) {
                    try {
                      if (itemJson is Map<String, dynamic>) {
                        // Extract meta field and create a MenuItemMeta object
                        final metaMap =
                            itemJson['meta'] as Map<String, dynamic>? ?? {};
                        final itemMeta = MenuItemMeta(
                          name: metaMap['name'] as String? ?? '',
                          description: metaMap['description'] as String? ?? '',
                          categoryName:
                              metaMap['categoryName'] as String? ?? '',
                          image: metaMap['image'] as String? ?? '',
                        );

                        // Extract price from priceInfo
                        // Extract priceInfo and nutritionalInfo

                        final item = MenuItem(
                          id: itemJson['menuItemId'] as String,
                          categoryId: categoryId,
                          meta: itemMeta,
                          priceInfo: PriceInfo.fromJson(
                              itemJson['priceInfo'] as Map<String, dynamic>? ??
                                  {}),
                          nutritionalInfo: NutritionalInfo.fromJson(
                              itemJson['nutritionalInfo']
                                      as Map<String, dynamic>? ??
                                  {}),
                          addons: (itemJson['addons'] as List<dynamic>? ?? [])
                              .map((a) =>
                                  Addon.fromJson(a as Map<String, dynamic>))
                              .toList(),
                          isCustomizable:
                              itemJson['isCustomizable'] as bool? ?? false,
                          allergenTags:
                              (itemJson['allergenTags'] as List<dynamic>? ?? [])
                                  .map((t) => t as String)
                                  .toList(),
                          variants: (itemJson['variants'] as List<dynamic>? ??
                                  [])
                              .map((v) =>
                                  Variant.fromJson(v as Map<String, dynamic>))
                              .toList(),
                          restaurantId:
                              itemJson['restaurantId'] as String? ?? '',
                          isAvailable: itemJson['isInStock'] as bool? ?? true,
                        );
                        categoryItems.add(item);
                      }
                    } catch (e) {
                      AppLogger.log('⚠️ Error processing menu item: $e');
                      // Continue with next item
                    }
                  }

                  if (categoryItems.isNotEmpty) {
                    menuItems[categoryId] = categoryItems;
                  }
                }
              } catch (e) {
                AppLogger.log(
                    '⚠️ Error processing items for category "$categoryId": $e');
                // Continue with next category
              }
            });
          }
          AppLogger.log(
              '✅ Processed items for ${menuItems.keys.length} categories successfully');

          // Process metadata
          Map<String, dynamic>? metadata;
          if (data.containsKey('metadata') && data['metadata'] is Map) {
            metadata = (data['metadata'] as Map).cast<String, dynamic>();
          }

          // Create the response model
          final menuResponse = FullRestaurantMenuResponse(
            categories: categories,
            menuItems: menuItems,
            metadata: metadata,
          );

          AppLogger.log('✅ Successfully built complete menu model with '
              '${categories.length} categories, '
              'items for ${menuItems.keys.length} categories, '
              'and ${metadata?.keys.length ?? 0} metadata entries');

          return ApiResponse<FullRestaurantMenuResponse>.success(
            menuResponse,
            message: message,
          );
        } catch (e, stack) {
          AppLogger.log('❌ Error constructing model: $e');
          AppLogger.log('Stack trace: $stack');
          return ApiResponse<FullRestaurantMenuResponse>.error(
            'Failed to construct menu model: $e',
            errorCode: 'model_construction_error',
          );
        }
      } catch (e) {
        AppLogger.log('❌ Error parsing API response: $e');
        return ApiResponse<FullRestaurantMenuResponse>.error(
          'Failed to parse API response: $e',
          errorCode: 'json_parsing_error',
        );
      }
    } on DioException catch (e) {
      final (code, msg) =
          DioClient.handleDioError(e, context: 'getRestaurantMenu');
      return ApiResponse<FullRestaurantMenuResponse>.error(msg,
          errorCode: code);
    } catch (e) {
      return ApiResponse<FullRestaurantMenuResponse>.error(
        'Failed to parse restaurant menu: ${e.toString()}',
        errorCode: 'parsing_error',
      );
    }
  }

  /// Updates a menu item's availability status
  Future<ApiResponse<UpdateMenuItemAvailabilityResponse>>
      updateMenuItemAvailability({
    required String restaurantId,
    required String sessionId,
    required String menuItemId,
    required bool isAvailable,
  }) async {
    try {
      final response = await _dio.post(
        ApiConstants.updateMenuItemAvailability,
        data: {
          'restaurantId': restaurantId,
          'sessionId': sessionId,
          'menuItemId': menuItemId,
          'isAvailable': isAvailable,
        },
      );

      return ResponseParser.parse<UpdateMenuItemAvailabilityResponse>(
        response,
        (jsonData) => UpdateMenuItemAvailabilityResponse.fromJson(jsonData),
      );
    } on DioException catch (e) {
      final (code, msg) =
          DioClient.handleDioError(e, context: 'updateMenuItemAvailability');
      return ApiResponse<UpdateMenuItemAvailabilityResponse>.error(msg,
          errorCode: code);
    } catch (e) {
      return ApiResponse<UpdateMenuItemAvailabilityResponse>.error(
        'Failed to update menu item availability: ${e.toString()}',
        errorCode: 'parsing_error',
      );
    }
  }

  /// D6: switches a shared add-on (Extra Raita) in or out of stock on every dish that offers it.
  Future<ApiResponse<void>> updateAddonAvailability({
    required String restaurantId,
    required String sessionId,
    required String addonId,
    required bool isAvailable,
  }) async {
    try {
      final response = await _dio.post(
        ApiConstants.updateMenuItemAvailability,
        data: {
          'restaurantId': restaurantId,
          'sessionId': sessionId,
          'addonId': addonId,
          'isAvailable': isAvailable,
        },
      );
      return ResponseParser.parse<void>(response, (_) {});
    } on DioException catch (e) {
      final (code, msg) =
          DioClient.handleDioError(e, context: 'updateAddonAvailability');
      return ApiResponse<void>.error(msg, errorCode: code);
    } catch (e) {
      return ApiResponse<void>.error(e.toString(), errorCode: 'parsing_error');
    }
  }
}

import 'package:dio/dio.dart';
import 'package:flutterboilerplate/home/models/restaurant_summary.dart';
import 'package:flutterboilerplate/models/api_response.dart';
import 'package:flutterboilerplate/networking/dio_client.dart';
import 'package:flutterboilerplate/singletonGods/api_constants.dart';
import 'package:flutterboilerplate/singletonGods/logger.dart';

class HomeRepository {
  HomeRepository({Dio? dio}) : _dio = dio ?? DioClient().dio;

  final Dio _dio;

  Future<ApiResponse<List<RestaurantSummary>>> fetchRestaurants() async {
    try {
      AppLogger.log('🌐 API: Fetching restaurant list (dev)');
      final response = await _dio.post(
        ApiConfig.listRestaurantsDevEndpoint,
        data: const {
          'data': {},
        },
      );

      final payload = response.data;
      if (payload is! Map<String, dynamic>) {
        AppLogger.log('❌ Invalid response payload for restaurants: $payload');
        return ApiResponse.error('Invalid response while fetching restaurants');
      }

      final envelope = payload['result'] is Map<String, dynamic>
          ? payload['result'] as Map<String, dynamic>
          : payload;

      if (envelope['status'] != 'success') {
        final message = (envelope['message'] ?? 'Failed to fetch restaurants').toString();
        AppLogger.log('❌ Restaurant fetch returned error: $message');
        return ApiResponse.error(message);
      }

      final data = envelope['data'];
      final restaurantsJson = data is Map<String, dynamic> ? data['restaurants'] : null;
      final restaurants = <RestaurantSummary>[];
      if (restaurantsJson is List) {
        for (final item in restaurantsJson) {
          if (item is Map<String, dynamic>) {
            restaurants.add(RestaurantSummary.fromJson(item));
          }
        }
      }

      return ApiResponse.success(restaurants);
    } on DioException catch (error) {
      final (code, message) = DioClient.handleDioException(error, context: 'fetchRestaurants');
      return ApiResponse.error(message, errorCode: code);
    } catch (error, stackTrace) {
      AppLogger.log('❌ Unexpected error fetching restaurants: $error\n$stackTrace');
      return ApiResponse.error('Unexpected error fetching restaurants');
    }
  }
}
